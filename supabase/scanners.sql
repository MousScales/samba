-- Scanner role + event assignments (run AFTER schema.sql)
-- Safe to re-run.

alter table public.profiles
  add column if not exists scanner_info jsonb not null default '{}'::jsonb;

create table if not exists public.event_scanners (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  registered_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists event_scanners_user_idx on public.event_scanners (user_id);
create index if not exists event_scanners_event_idx on public.event_scanners (event_id);

alter table public.event_scanners enable row level security;

drop policy if exists "Scanners read own assignments" on public.event_scanners;
create policy "Scanners read own assignments"
  on public.event_scanners for select
  using (auth.uid() = user_id);

drop policy if exists "Scanners insert own assignments" on public.event_scanners;
create policy "Scanners insert own assignments"
  on public.event_scanners for insert
  with check (auth.uid() = user_id);

drop policy if exists "Scanners read assigned events" on public.events;
create policy "Scanners read assigned events"
  on public.events for select
  using (
    exists (
      select 1 from public.event_scanners es
      where es.event_id = events.id and es.user_id = auth.uid()
    )
  );

grant select, insert on public.event_scanners to authenticated;

-- ── Register scanner to an event via host verification code ───────────────────
create or replace function public.register_scanner_for_event(p_verification_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in to join as a scanner';
  end if;

  if p_verification_code is null or length(trim(p_verification_code)) < 4 then
    raise exception 'Invalid verification code';
  end if;

  select * into v_event
  from public.events
  where verification_code = trim(p_verification_code)
  limit 1;

  if not found then
    raise exception 'No event found with this verification code';
  end if;

  insert into public.event_scanners (event_id, user_id)
  values (v_event.id, v_uid)
  on conflict (event_id, user_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'eventId', v_event.id,
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'date', v_event.date,
      'startTime', v_event.start_time,
      'endTime', v_event.end_time,
      'venue', v_event.venue,
      'coverImage', v_event.cover_image,
      'status', v_event.status,
      'verificationCode', v_event.verification_code
    )
  );
end;
$$;

grant execute on function public.register_scanner_for_event(text) to authenticated;

-- ── Events this user is assigned to scan ──────────────────────────────────────
create or replace function public.get_my_scanner_events()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(row order by (row->>'date') asc)
    from (
      select jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'date', e.date,
        'startTime', e.start_time,
        'endTime', e.end_time,
        'venue', e.venue,
        'coverImage', e.cover_image,
        'status', e.status,
        'verificationCode', e.verification_code,
        'registeredAt', es.registered_at
      ) as row
      from public.event_scanners es
      join public.events e on e.id = es.event_id
      where es.user_id = v_uid
        and e.status in ('upcoming', 'live')
    ) sub
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_my_scanner_events() to authenticated;

-- ── Scanner invite links (organizers share → scanners with accounts claim) ────
create table if not exists public.scanner_invites (
  id text primary key,
  event_id text not null references public.events (id) on delete cascade,
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  created_at timestamptz not null default now()
);

create unique index if not exists scanner_invites_one_active_per_event
  on public.scanner_invites (event_id)
  where status = 'active';

create index if not exists scanner_invites_organizer_idx on public.scanner_invites (organizer_id);

alter table public.scanner_invites enable row level security;

drop policy if exists "Organizers read own scanner invites" on public.scanner_invites;
create policy "Organizers read own scanner invites"
  on public.scanner_invites for select
  using (auth.uid() = organizer_id);

grant select on public.scanner_invites to authenticated;

create or replace function public.create_scanner_invite(p_event_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events%rowtype;
  v_invite_id text;
begin
  if v_uid is null then
    raise exception 'Sign in to create scanner invites';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'Event not found';
  end if;

  if v_event.organizer_id is distinct from v_uid then
    raise exception 'Only the event host can invite scanners';
  end if;

  if v_event.status not in ('upcoming', 'live') then
    raise exception 'Scanner invites are only available for upcoming or live events';
  end if;

  if exists (
    select 1 from public.scanner_invites
    where event_id = p_event_id and status = 'active'
  ) then
    select id into v_invite_id
    from public.scanner_invites
    where event_id = p_event_id and status = 'active'
    limit 1;

    return jsonb_build_object(
      'inviteToken', v_invite_id,
      'eventId', p_event_id,
      'reused', true
    );
  end if;

  v_invite_id := public._random_id();

  insert into public.scanner_invites (id, event_id, organizer_id, status)
  values (v_invite_id, p_event_id, v_uid, 'active');

  return jsonb_build_object(
    'inviteToken', v_invite_id,
    'eventId', p_event_id,
    'reused', false
  );
end;
$$;

grant execute on function public.create_scanner_invite(text) to authenticated;

create or replace function public.preview_scanner_invite(p_invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.scanner_invites%rowtype;
  v_event public.events%rowtype;
  v_org public.profiles%rowtype;
begin
  select * into v_invite from public.scanner_invites where id = p_invite_token;
  if not found or v_invite.status <> 'active' then
    raise exception 'Invite link not found or expired';
  end if;

  select * into v_event from public.events where id = v_invite.event_id;
  select * into v_org from public.profiles where id = v_invite.organizer_id;

  return jsonb_build_object(
    'eventTitle', v_event.title,
    'eventDate', v_event.date,
    'eventImage', v_event.cover_image,
    'eventVenue', v_event.venue,
    'organizerName', coalesce(v_org.name, split_part(v_org.email, '@', 1)),
    'eventStatus', v_event.status
  );
end;
$$;

grant execute on function public.preview_scanner_invite(text) to anon, authenticated;

create or replace function public.claim_scanner_invite(p_invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.scanner_invites%rowtype;
  v_event public.events%rowtype;
  v_scanner_info jsonb;
begin
  if v_uid is null then
    raise exception 'Sign in to accept this scanner invite';
  end if;

  select scanner_info into v_scanner_info from public.profiles where id = v_uid;
  if coalesce(v_scanner_info->>'status', '') <> 'active' then
    raise exception 'Complete scanner signup in the Samba app before accepting invites';
  end if;

  select * into v_invite
  from public.scanner_invites
  where id = p_invite_token and status = 'active';

  if not found then
    raise exception 'Invite link not found or expired';
  end if;

  select * into v_event from public.events where id = v_invite.event_id;
  if not found then
    raise exception 'Event not found';
  end if;

  if v_event.status not in ('upcoming', 'live') then
    raise exception 'This event is no longer accepting scanners';
  end if;

  insert into public.event_scanners (event_id, user_id)
  values (v_invite.event_id, v_uid)
  on conflict (event_id, user_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'eventId', v_event.id,
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'date', v_event.date,
      'startTime', v_event.start_time,
      'venue', v_event.venue,
      'coverImage', v_event.cover_image,
      'status', v_event.status
    )
  );
end;
$$;

grant execute on function public.claim_scanner_invite(text) to authenticated;
