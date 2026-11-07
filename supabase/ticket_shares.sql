-- Ticket sharing between Samba users (run AFTER tickets.sql)
-- Safe to re-run.

alter table public.tickets
  add column if not exists holder_user_id uuid references public.profiles (id) on delete set null;

create index if not exists tickets_holder_user_id_idx on public.tickets (holder_user_id);

-- ── Share invites ─────────────────────────────────────────────────────────────
create table if not exists public.ticket_shares (
  id text primary key,
  ticket_id text not null references public.tickets (id) on delete cascade,
  order_id text not null,
  event_id text not null references public.events (id) on delete cascade,
  sharer_user_id uuid not null references public.profiles (id) on delete cascade,
  recipient_user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'revoked')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create unique index if not exists ticket_shares_one_pending_per_ticket
  on public.ticket_shares (ticket_id)
  where status = 'pending';

create index if not exists ticket_shares_sharer_idx on public.ticket_shares (sharer_user_id);
create index if not exists ticket_shares_recipient_idx on public.ticket_shares (recipient_user_id);
create index if not exists ticket_shares_order_idx on public.ticket_shares (order_id);

alter table public.ticket_shares enable row level security;

drop policy if exists "Sharers read own ticket shares" on public.ticket_shares;
create policy "Sharers read own ticket shares"
  on public.ticket_shares for select
  using (auth.uid() = sharer_user_id or auth.uid() = recipient_user_id);

drop policy if exists "Recipients read claimed shares" on public.ticket_shares;
-- covered above

-- Holders can read tickets assigned to them
drop policy if exists "Holders read assigned tickets" on public.tickets;
create policy "Holders read assigned tickets"
  on public.tickets for select
  using (holder_user_id = auth.uid());

-- Share partners can view basic profile info
drop policy if exists "Profiles viewable by ticket share partners" on public.profiles;
create policy "Profiles viewable by ticket share partners"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.ticket_shares ts
      where ts.status in ('pending', 'claimed')
        and (
          (ts.sharer_user_id = auth.uid() and ts.recipient_user_id = profiles.id)
          or (ts.recipient_user_id = auth.uid() and ts.sharer_user_id = profiles.id)
        )
    )
  );

grant select on public.ticket_shares to authenticated;

-- ── Backfill holder on purchase (optional — call from app after login purchase) ─
create or replace function public.assign_ticket_holder(
  p_ticket_id text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets%rowtype;
  v_email text;
begin
  if p_user_id is null then return; end if;

  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then return; end if;

  select lower(email) into v_email from public.profiles where id = p_user_id;
  if v_email is null then return; end if;

  if lower(v_ticket.buyer_email) = v_email and v_ticket.holder_user_id is null then
    update public.tickets set holder_user_id = p_user_id where id = p_ticket_id;
  end if;
end;
$$;

grant execute on function public.assign_ticket_holder(text, uuid) to authenticated;

-- ── Create a share link for one ticket ────────────────────────────────────────
create or replace function public.create_ticket_share(p_ticket_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ticket public.tickets%rowtype;
  v_share_id text;
begin
  if v_uid is null then
    raise exception 'Sign in to share tickets';
  end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;

  if v_ticket.status <> 'upcoming' then
    raise exception 'Only upcoming tickets can be shared';
  end if;

  if v_ticket.holder_user_id is distinct from v_uid then
    raise exception 'You can only share tickets assigned to you';
  end if;

  if exists (
    select 1 from public.ticket_shares
    where ticket_id = p_ticket_id and status = 'pending'
  ) then
    select id into v_share_id
    from public.ticket_shares
    where ticket_id = p_ticket_id and status = 'pending'
    limit 1;

    return jsonb_build_object('shareToken', v_share_id, 'ticketId', p_ticket_id, 'reused', true);
  end if;

  v_share_id := public._random_id();

  insert into public.ticket_shares (
    id, ticket_id, order_id, event_id, sharer_user_id, status
  ) values (
    v_share_id, p_ticket_id, v_ticket.order_id, v_ticket.event_id, v_uid, 'pending'
  );

  return jsonb_build_object(
    'shareToken', v_share_id,
    'ticketId', p_ticket_id,
    'eventId', v_ticket.event_id,
    'orderId', v_ticket.order_id,
    'reused', false
  );
end;
$$;

grant execute on function public.create_ticket_share(text) to authenticated;

-- ── Claim a shared ticket ─────────────────────────────────────────────────────
create or replace function public.claim_ticket_share(p_share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_share public.ticket_shares%rowtype;
  v_ticket public.tickets%rowtype;
  v_event public.events%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in to claim this ticket';
  end if;

  select * into v_share
  from public.ticket_shares
  where id = p_share_token
  for update;

  if not found then
    raise exception 'Share link not found or expired';
  end if;

  if v_share.status = 'revoked' then
    raise exception 'This share link was revoked';
  end if;

  if v_share.status = 'claimed' then
    if v_share.recipient_user_id = v_uid then
      -- idempotent re-fetch
      null;
    else
      raise exception 'This ticket was already claimed by someone else';
    end if;
  else
    select * into v_ticket from public.tickets where id = v_share.ticket_id for update;
    if not found then
      raise exception 'Ticket not found';
    end if;

    if v_ticket.status <> 'upcoming' then
      raise exception 'This ticket is no longer valid';
    end if;

    if v_share.sharer_user_id = v_uid then
      raise exception 'You cannot claim your own share link';
    end if;

    update public.ticket_shares
    set status = 'claimed',
        recipient_user_id = v_uid,
        claimed_at = now()
    where id = p_share_token;

    update public.tickets
    set holder_user_id = v_uid
    where id = v_share.ticket_id;

    select * into v_share from public.ticket_shares where id = p_share_token;
  end if;

  select * into v_ticket from public.tickets where id = v_share.ticket_id;
  select * into v_event from public.events where id = v_share.event_id;

  return jsonb_build_object(
    'success', true,
    'share', jsonb_build_object(
      'id', v_share.id,
      'status', v_share.status,
      'sharerUserId', v_share.sharer_user_id,
      'recipientUserId', v_share.recipient_user_id
    ),
    'ticket', jsonb_build_object(
      'id', v_ticket.id,
      'orderId', v_ticket.order_id,
      'ticketNumber', v_ticket.ticket_number,
      'ticketType', v_ticket.ticket_type,
      'price', v_ticket.price,
      'isFree', v_ticket.is_free,
      'qrCode', v_ticket.qr_code,
      'status', v_ticket.status,
      'buyerName', v_ticket.buyer_name,
      'buyerEmail', v_ticket.buyer_email
    ),
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'date', v_event.date,
      'startTime', v_event.start_time,
      'venue', v_event.venue,
      'coverImage', v_event.cover_image
    )
  );
end;
$$;

grant execute on function public.claim_ticket_share(text) to authenticated;

-- ── Companions on shared orders (for Shared Tickets UI) ───────────────────────
create or replace function public.get_order_share_companions(p_order_id text)
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
    select jsonb_agg(distinct companion order by companion->>'name')
    from (
      select jsonb_build_object(
        'userId', p.id,
        'name', coalesce(p.name, split_part(p.email, '@', 1)),
        'avatar', p.profile_picture_url,
        'role', case when p.id = v_uid then 'self' when p.id = ts.sharer_user_id then 'sharer' else 'recipient' end
      ) as companion
      from public.ticket_shares ts
      join public.profiles p
        on p.id in (ts.sharer_user_id, ts.recipient_user_id)
      where ts.order_id = p_order_id
        and ts.status = 'claimed'
        and v_uid in (ts.sharer_user_id, ts.recipient_user_id)
    ) sub
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_order_share_companions(text) to authenticated;

-- ── Preview share link (public token lookup — minimal info) ───────────────────
create or replace function public.preview_ticket_share(p_share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share public.ticket_shares%rowtype;
  v_event public.events%rowtype;
begin
  select * into v_share from public.ticket_shares where id = p_share_token;
  if not found then
    raise exception 'Share link not found';
  end if;

  if v_share.status = 'revoked' then
    raise exception 'Share link expired';
  end if;

  select * into v_event from public.events where id = v_share.event_id;

  return jsonb_build_object(
    'status', v_share.status,
    'eventTitle', v_event.title,
    'eventDate', v_event.date,
    'eventImage', v_event.cover_image,
    'alreadyClaimed', v_share.status = 'claimed'
  );
end;
$$;

grant execute on function public.preview_ticket_share(text) to anon, authenticated;
