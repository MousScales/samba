-- Full mock data for Samba (run AFTER schema.sql in Supabase SQL Editor)
-- Re-runnable: uses fixed IDs and ON CONFLICT / DELETE for mock rows only.
--
-- Only need events for Home/Explore? Use seed-events-only.sql instead (simpler).
--
-- Demo logins (password for all): SambaDemo123!
--   organizer1@samba.test  — Samba Nights (provider)
--   organizer2@samba.test  — Pulse Events (provider)
--   demo@samba.test        — Demo attendee

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Mock auth users + identities
-- ---------------------------------------------------------------------------
do $$
declare
  inst_id uuid;
  mock_password text := crypt('SambaDemo123!', gen_salt('bf'));
begin
  select id into inst_id from auth.instances limit 1;

  if inst_id is null then
    raise exception 'No auth instance found. Create a user in Auth first, then re-run seed.';
  end if;

  -- Organizer 1
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    inst_id,
    'a1111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'organizer1@samba.test', mock_password, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Samba Nights"}'::jsonb,
    now(), now(), '', '', '', ''
  ) on conflict (id) do update set
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, now());

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    'a1111111-1111-1111-1111-111111111112',
    'a1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    '{"sub":"a1111111-1111-1111-1111-111111111111","email":"organizer1@samba.test"}'::jsonb,
    'email', now(), now(), now()
  ) on conflict (id) do nothing;

  -- Organizer 2
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    inst_id,
    'a2222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'organizer2@samba.test', mock_password, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Pulse Events"}'::jsonb,
    now(), now(), '', '', '', ''
  ) on conflict (id) do update set
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, now());

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    'a2222222-2222-2222-2222-222222222223',
    'a2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    '{"sub":"a2222222-2222-2222-2222-222222222222","email":"organizer2@samba.test"}'::jsonb,
    'email', now(), now(), now()
  ) on conflict (id) do nothing;

  -- Demo attendee
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    inst_id,
    'a3333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated',
    'demo@samba.test', mock_password, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Alex Rivera"}'::jsonb,
    now(), now(), '', '', '', ''
  ) on conflict (id) do update set
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, now());

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    'a3333333-3333-3333-3333-333333333334',
    'a3333333-3333-3333-3333-333333333333',
    'a3333333-3333-3333-3333-333333333333',
    '{"sub":"a3333333-3333-3333-3333-333333333333","email":"demo@samba.test"}'::jsonb,
    'email', now(), now(), now()
  ) on conflict (id) do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- Mock profiles (trigger may have created rows; enrich them here)
-- ---------------------------------------------------------------------------
update public.profiles set
  name = 'Samba Nights',
  phone_number = '+1 (305) 555-0101',
  date_of_birth = '1990-06-15',
  profile_picture_url = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
  role = 'provider',
  current_mode = 'provider',
  provider_info = jsonb_build_object(
    'organizationName', 'Samba Nights',
    'description', 'Miami''s hottest Latin & house parties. Weekly rooftop sessions.',
    'partyEmail', 'hello@sambanights.test',
    'partyPhone', '+1 (305) 555-0101',
    'partyLogo', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
    'website', 'https://sambanights.test',
    'stats', jsonb_build_object('followers', 1284)
  ),
  address = jsonb_build_object(
    'city', 'Miami', 'state', 'FL', 'country', 'United States'
  ),
  updated_at = now()
where id = 'a1111111-1111-1111-1111-111111111111';

update public.profiles set
  name = 'Pulse Events',
  phone_number = '+1 (404) 555-0202',
  date_of_birth = '1988-03-22',
  profile_picture_url = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
  role = 'provider',
  current_mode = 'provider',
  provider_info = jsonb_build_object(
    'organizationName', 'Pulse Events',
    'description', 'Live music, festivals, and curated nightlife across the Southeast.',
    'partyEmail', 'bookings@pulseevents.test',
    'partyPhone', '+1 (404) 555-0202',
    'partyLogo', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
    'website', 'https://pulseevents.test',
    'stats', jsonb_build_object('followers', 892)
  ),
  address = jsonb_build_object(
    'city', 'Atlanta', 'state', 'GA', 'country', 'United States'
  ),
  updated_at = now()
where id = 'a2222222-2222-2222-2222-222222222222';

update public.profiles set
  name = 'Alex Rivera',
  phone_number = '+1 (786) 555-0303',
  date_of_birth = '1995-11-08',
  profile_picture_url = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
  role = 'attendee',
  current_mode = 'attendee',
  provider_info = '{}'::jsonb,
  address = jsonb_build_object(
    'city', 'Miami', 'state', 'FL', 'country', 'United States'
  ),
  updated_at = now()
where id = 'a3333333-3333-3333-3333-333333333333';

-- ---------------------------------------------------------------------------
-- Mock events (id prefix mock_ for safe re-seed)
-- ---------------------------------------------------------------------------
delete from public.events where id like 'mock_%';

insert into public.events (
  id, organizer_id, title, description, date, start_time, end_time, has_end_time,
  venue, address, cover_image, flyers, tickets, organizer, status,
  ticket_sales_open, show_on_explore, total_spots, spots_left, booked_spots,
  verification_code, category
) values
(
  'mock_rooftop_salsa',
  'a1111111-1111-1111-1111-111111111111',
  'Rooftop Salsa Sunset',
  'Open-air salsa night with live band, cocktails, and beginner dance lessons at 8 PM.',
  '2026-06-14 00:00:00+00',
  '2026-06-14 20:00:00+00',
  '2026-06-15 02:00:00+00',
  true,
  'Skyline Terrace',
  jsonb_build_object(
    'street', '100 Biscayne Blvd',
    'city', 'Miami',
    'state', 'FL',
    'zipCode', '33132',
    'formatted', '100 Biscayne Blvd, Miami, FL 33132',
    'coordinates', jsonb_build_object('latitude', 25.7743, 'longitude', -80.1887)
  ),
  'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800',
  '["https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800"]'::jsonb,
  '[
    {"id":"t1","name":"General Admission","price":35,"isFree":false,"quantity":120,"isUnlimited":false,"availableQuantity":120,"sold":0,"instructions":"21+ only","includes":["Entry","Welcome drink"]},
    {"id":"t2","name":"VIP Table","price":120,"isFree":false,"quantity":20,"isUnlimited":false,"availableQuantity":20,"sold":0,"instructions":"Reserved seating","includes":["Bottle service","Priority entry"]}
  ]'::jsonb,
  jsonb_build_object(
    'id', 'a1111111-1111-1111-1111-111111111111',
    'name', 'Samba Nights',
    'organizationName', 'Samba Nights',
    'profilePicture', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
    'description', 'Miami''s hottest Latin & house parties.',
    'contactEmail', 'hello@sambanights.test',
    'contactPhone', '+1 (305) 555-0101'
  ),
  'upcoming', true, true, 140, 140, 0, 'SALSA26', 'Nightlife'
),
(
  'mock_summer_house',
  'a1111111-1111-1111-1111-111111111111',
  'Summer House Pool Party',
  'Day-to-night pool party with international DJs and food trucks.',
  '2026-07-04 00:00:00+00',
  '2026-07-04 14:00:00+00',
  '2026-07-04 23:00:00+00',
  true,
  'Ocean Drive Pavilion',
  jsonb_build_object(
    'street', '1200 Ocean Dr',
    'city', 'Miami Beach',
    'state', 'FL',
    'zipCode', '33139',
    'formatted', '1200 Ocean Dr, Miami Beach, FL 33139',
    'coordinates', jsonb_build_object('latitude', 25.7825, 'longitude', -80.1300)
  ),
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
  '["https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800"]'::jsonb,
  '[
    {"id":"t1","name":"Early Bird","price":25,"isFree":false,"quantity":80,"isUnlimited":false,"availableQuantity":80,"sold":0,"instructions":"","includes":["Pool access"]},
    {"id":"t2","name":"Door","price":40,"isFree":false,"quantity":200,"isUnlimited":false,"availableQuantity":200,"sold":0,"instructions":"","includes":["Pool access"]},
    {"id":"t3","name":"Guest List","price":0,"isFree":true,"quantity":50,"isUnlimited":false,"availableQuantity":50,"sold":0,"instructions":"RSVP required","includes":["Entry before 4 PM"]}
  ]'::jsonb,
  jsonb_build_object(
    'id', 'a1111111-1111-1111-1111-111111111111',
    'name', 'Samba Nights',
    'organizationName', 'Samba Nights',
    'profilePicture', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400'
  ),
  'upcoming', true, true, 330, 330, 0, 'POOL26', 'Festival'
),
(
  'mock_indie_live',
  'a2222222-2222-2222-2222-222222222222',
  'Indie Live at The Loft',
  'Three rising indie bands, full bar, and merch pop-up.',
  '2026-06-21 00:00:00+00',
  '2026-06-21 19:00:00+00',
  '2026-06-21 23:30:00+00',
  true,
  'The Loft ATL',
  jsonb_build_object(
    'street', '55 Trinity Ave SW',
    'city', 'Atlanta',
    'state', 'GA',
    'zipCode', '30303',
    'formatted', '55 Trinity Ave SW, Atlanta, GA 30303',
    'coordinates', jsonb_build_object('latitude', 33.7490, 'longitude', -84.3880)
  ),
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
  '["https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800"]'::jsonb,
  '[
    {"id":"t1","name":"Standing","price":28,"isFree":false,"quantity":150,"isUnlimited":false,"availableQuantity":150,"sold":0,"instructions":"","includes":[]},
    {"id":"t2","name":"Balcony","price":45,"isFree":false,"quantity":40,"isUnlimited":false,"availableQuantity":40,"sold":0,"instructions":"","includes":["Elevated view"]}
  ]'::jsonb,
  jsonb_build_object(
    'id', 'a2222222-2222-2222-2222-222222222222',
    'name', 'Pulse Events',
    'organizationName', 'Pulse Events',
    'profilePicture', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
    'contactEmail', 'bookings@pulseevents.test'
  ),
  'upcoming', true, true, 190, 190, 0, 'INDIE26', 'Live Music'
),
(
  'mock_brunch_beats',
  'a2222222-2222-2222-2222-222222222222',
  'Brunch & Beats',
  'Sunday brunch with live DJ, mimosa bar, and outdoor seating.',
  '2026-06-08 00:00:00+00',
  '2026-06-08 11:00:00+00',
  '2026-06-08 15:00:00+00',
  true,
  'Midtown Garden',
  jsonb_build_object(
    'street', '950 W Peachtree St NW',
    'city', 'Atlanta',
    'state', 'GA',
    'zipCode', '30309',
    'formatted', '950 W Peachtree St NW, Atlanta, GA 30309',
    'coordinates', jsonb_build_object('latitude', 33.7782, 'longitude', -84.3871)
  ),
  'https://images.unsplash.com/photo-1415201364774-f6f0ff38f28b?w=800',
  '["https://images.unsplash.com/photo-1415201364774-f6f0ff38f28b?w=800"]'::jsonb,
  '[
    {"id":"t1","name":"Brunch Seat","price":55,"isFree":false,"quantity":60,"isUnlimited":false,"availableQuantity":60,"sold":0,"instructions":"Includes entree + 2 drinks","includes":["Brunch plate","Mimosas"]}
  ]'::jsonb,
  jsonb_build_object(
    'id', 'a2222222-2222-2222-2222-222222222222',
    'name', 'Pulse Events',
    'organizationName', 'Pulse Events'
  ),
  'upcoming', true, true, 60, 60, 0, 'BRUNCH26', 'Food & Drink'
),
(
  'mock_latin_friday',
  'a1111111-1111-1111-1111-111111111111',
  'Friday Latin Social',
  'Social dancing, multiple rooms (salsa, bachata, reggaeton), no partner required.',
  '2026-06-06 00:00:00+00',
  '2026-06-06 21:00:00+00',
  null,
  false,
  'Warehouse 54',
  jsonb_build_object(
    'street', '54 NW 26th St',
    'city', 'Miami',
    'state', 'FL',
    'zipCode', '33127',
    'formatted', '54 NW 26th St, Miami, FL 33127',
    'coordinates', jsonb_build_object('latitude', 25.8010, 'longitude', -80.1995)
  ),
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
  '["https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800"]'::jsonb,
  '[
    {"id":"t1","name":"Entry","price":20,"isFree":false,"quantity":0,"isUnlimited":true,"availableQuantity":null,"sold":0,"instructions":"","includes":["All rooms"]}
  ]'::jsonb,
  jsonb_build_object(
    'id', 'a1111111-1111-1111-1111-111111111111',
    'name', 'Samba Nights',
    'organizationName', 'Samba Nights'
  ),
  'upcoming', true, true, 0, 0, 0, 'LATIN26', 'Nightlife'
);
