-- Run this in the Supabase SQL editor for your project.
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  name text,
  phone_number text,
  date_of_birth text,
  address jsonb default '{}'::jsonb,
  profile_picture_url text,
  role text not null default 'attendee',
  current_mode text not null default 'attendee',
  provider_info jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Login screen email check (no sensitive fields returned)
create or replace function public.email_exists(email_input text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where lower(email) = lower(email_input)
  );
$$;

grant execute on function public.email_exists(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Events (explore feed + organizer events)
create table if not exists public.events (
  id text primary key,
  organizer_id uuid references public.profiles (id) on delete set null,
  title text not null,
  description text,
  date timestamptz not null,
  start_time timestamptz not null,
  end_time timestamptz,
  has_end_time boolean not null default false,
  venue text,
  address jsonb not null default '{}'::jsonb,
  cover_image text,
  flyers jsonb not null default '[]'::jsonb,
  tickets jsonb not null default '[]'::jsonb,
  organizer jsonb not null default '{}'::jsonb,
  status text not null default 'upcoming',
  ticket_sales_open boolean not null default true,
  show_on_explore boolean not null default true,
  total_spots int not null default 0,
  spots_left int not null default 0,
  booked_spots int not null default 0,
  verification_code text,
  category text default 'Event',
  audio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events add column if not exists audio_url text;

create index if not exists events_organizer_id_idx on public.events (organizer_id);
create index if not exists events_date_idx on public.events (date);
create index if not exists events_show_on_explore_idx on public.events (show_on_explore) where show_on_explore = true;

alter table public.events enable row level security;

drop policy if exists "Explore events are public" on public.events;
create policy "Explore events are public"
  on public.events for select
  using (show_on_explore = true);

drop policy if exists "Organizers manage own events" on public.events;
create policy "Organizers manage own events"
  on public.events for all
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

-- Storage buckets for profile photos, event flyers, and provider assets.
-- Safe to re-run in SQL editor.
insert into storage.buckets (id, name, public)
values ('app-assets', 'app-assets', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('provider-assets', 'provider-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read app assets" on storage.objects;
create policy "Public read app assets"
  on storage.objects for select
  to public
  using (bucket_id in ('app-assets', 'provider-assets'));

drop policy if exists "Users upload own app assets" on storage.objects;
create policy "Users upload own app assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('app-assets', 'provider-assets')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users update own app assets" on storage.objects;
create policy "Users update own app assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('app-assets', 'provider-assets')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own app assets" on storage.objects;
create policy "Users delete own app assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('app-assets', 'provider-assets')
    and auth.uid()::text = (storage.foldername(name))[1]
  );
