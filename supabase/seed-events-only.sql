-- Quick mock events (no demo users required)
-- Run AFTER schema.sql in Supabase SQL Editor.
-- Safe to re-run: deletes mock_* rows first.

delete from public.events where id like 'mock_%';

insert into public.events (
  id, organizer_id, title, description, date, start_time, end_time, has_end_time,
  venue, address, cover_image, flyers, tickets, organizer, status,
  ticket_sales_open, show_on_explore, total_spots, spots_left, booked_spots,
  verification_code, category
) values
(
  'mock_rooftop_salsa',
  null,
  'Rooftop Salsa Sunset',
  'Open-air salsa night with live band, cocktails, and beginner dance lessons at 8 PM.',
  (current_date + interval '14 days')::date + time '20:00',
  (current_date + interval '14 days')::date + time '20:00',
  (current_date + interval '15 days')::date + time '02:00',
  true,
  'Skyline Terrace',
  '{"street":"100 Biscayne Blvd","city":"Miami","state":"FL","zipCode":"33132","formatted":"100 Biscayne Blvd, Miami, FL 33132","coordinates":{"latitude":25.7743,"longitude":-80.1887}}'::jsonb,
  'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800',
  '["https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800"]'::jsonb,
  '[{"id":"t1","name":"General Admission","price":35,"isFree":false,"quantity":120,"isUnlimited":false,"availableQuantity":120,"sold":0,"instructions":"21+ only","includes":["Entry","Welcome drink"]},{"id":"t2","name":"VIP Table","price":120,"isFree":false,"quantity":20,"isUnlimited":false,"availableQuantity":20,"sold":0,"instructions":"Reserved seating","includes":["Bottle service","Priority entry"]}]'::jsonb,
  '{"id":"mock-org-1","name":"Samba Nights","organizationName":"Samba Nights","profilePicture":"https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400","contactEmail":"hello@sambanights.test"}'::jsonb,
  'upcoming', true, true, 140, 140, 0, 'SALSA26', 'Nightlife'
),
(
  'mock_summer_house',
  null,
  'Summer House Pool Party',
  'Day-to-night pool party with international DJs and food trucks.',
  (current_date + interval '30 days')::date + time '14:00',
  (current_date + interval '30 days')::date + time '14:00',
  (current_date + interval '30 days')::date + time '23:00',
  true,
  'Ocean Drive Pavilion',
  '{"street":"1200 Ocean Dr","city":"Miami Beach","state":"FL","zipCode":"33139","formatted":"1200 Ocean Dr, Miami Beach, FL 33139","coordinates":{"latitude":25.7825,"longitude":-80.1300}}'::jsonb,
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
  '["https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800"]'::jsonb,
  '[{"id":"t1","name":"Early Bird","price":25,"isFree":false,"quantity":80,"isUnlimited":false,"availableQuantity":80,"sold":0,"instructions":"","includes":["Pool access"]},{"id":"t2","name":"Door","price":40,"isFree":false,"quantity":200,"isUnlimited":false,"availableQuantity":200,"sold":0,"instructions":"","includes":["Pool access"]}]'::jsonb,
  '{"id":"mock-org-1","name":"Samba Nights","organizationName":"Samba Nights"}'::jsonb,
  'upcoming', true, true, 280, 280, 0, 'POOL26', 'Festival'
),
(
  'mock_indie_live',
  null,
  'Indie Live at The Loft',
  'Three rising indie bands, full bar, and merch pop-up.',
  (current_date + interval '21 days')::date + time '19:00',
  (current_date + interval '21 days')::date + time '19:00',
  (current_date + interval '21 days')::date + time '23:30',
  true,
  'The Loft ATL',
  '{"street":"55 Trinity Ave SW","city":"Atlanta","state":"GA","zipCode":"30303","formatted":"55 Trinity Ave SW, Atlanta, GA 30303","coordinates":{"latitude":33.7490,"longitude":-84.3880}}'::jsonb,
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
  '["https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800"]'::jsonb,
  '[{"id":"t1","name":"Standing","price":28,"isFree":false,"quantity":150,"isUnlimited":false,"availableQuantity":150,"sold":0,"instructions":"","includes":[]},{"id":"t2","name":"Balcony","price":45,"isFree":false,"quantity":40,"isUnlimited":false,"availableQuantity":40,"sold":0,"instructions":"","includes":["Elevated view"]}]'::jsonb,
  '{"id":"mock-org-2","name":"Pulse Events","organizationName":"Pulse Events","profilePicture":"https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400"}'::jsonb,
  'upcoming', true, true, 190, 190, 0, 'INDIE26', 'Live Music'
),
(
  'mock_brunch_beats',
  null,
  'Brunch & Beats',
  'Sunday brunch with live DJ, mimosa bar, and outdoor seating.',
  (current_date + interval '10 days')::date + time '11:00',
  (current_date + interval '10 days')::date + time '11:00',
  (current_date + interval '10 days')::date + time '15:00',
  true,
  'Midtown Garden',
  '{"street":"950 W Peachtree St NW","city":"Atlanta","state":"GA","zipCode":"30309","formatted":"950 W Peachtree St NW, Atlanta, GA 30309","coordinates":{"latitude":33.7782,"longitude":-84.3871}}'::jsonb,
  'https://images.unsplash.com/photo-1415201364774-f6f0ff38f28b?w=800',
  '["https://images.unsplash.com/photo-1415201364774-f6f0ff38f28b?w=800"]'::jsonb,
  '[{"id":"t1","name":"Brunch Seat","price":55,"isFree":false,"quantity":60,"isUnlimited":false,"availableQuantity":60,"sold":0,"instructions":"Includes entree + 2 drinks","includes":["Brunch plate","Mimosas"]}]'::jsonb,
  '{"id":"mock-org-2","name":"Pulse Events","organizationName":"Pulse Events"}'::jsonb,
  'upcoming', true, true, 60, 60, 0, 'BRUNCH26', 'Food & Drink'
),
(
  'mock_latin_friday',
  null,
  'Friday Latin Social',
  'Social dancing, multiple rooms (salsa, bachata, reggaeton).',
  (current_date + interval '7 days')::date + time '21:00',
  (current_date + interval '7 days')::date + time '21:00',
  null,
  false,
  'Warehouse 54',
  '{"street":"54 NW 26th St","city":"Miami","state":"FL","zipCode":"33127","formatted":"54 NW 26th St, Miami, FL 33127","coordinates":{"latitude":25.8010,"longitude":-80.1995}}'::jsonb,
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
  '["https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800"]'::jsonb,
  '[{"id":"t1","name":"Entry","price":20,"isFree":false,"quantity":0,"isUnlimited":true,"availableQuantity":null,"sold":0,"instructions":"","includes":["All rooms"]}]'::jsonb,
  '{"id":"mock-org-1","name":"Samba Nights","organizationName":"Samba Nights"}'::jsonb,
  'upcoming', true, true, 0, 0, 0, 'LATIN26', 'Nightlife'
);

-- ── Connecticut / New England events ─────────────────────────────────────────
delete from public.events where id like 'mock_ct_%';

insert into public.events (
  id, organizer_id, title, description, date, start_time, end_time, has_end_time,
  venue, address, cover_image, flyers, tickets, organizer, status,
  ticket_sales_open, show_on_explore, total_spots, spots_left, booked_spots,
  verification_code, category
) values
(
  'mock_ct_latin_night',
  null,
  'New London Latin Night',
  'Live salsa band, bachata DJ, and beginner lessons. Right on the waterfront.',
  (current_date + interval '5 days')::date + time '20:00',
  (current_date + interval '5 days')::date + time '20:00',
  (current_date + interval '6 days')::date + time '01:00',
  true,
  'Oasis Waterfront Bar',
  '{"street":"1 Golden St","city":"New London","state":"CT","zipCode":"06320","formatted":"1 Golden St, New London, CT 06320","coordinates":{"latitude":41.3557,"longitude":-72.0995}}'::jsonb,
  'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800',
  '["https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800"]'::jsonb,
  '[{"id":"t1","name":"General","price":18,"isFree":false,"quantity":120,"isUnlimited":false,"availableQuantity":120,"sold":0,"instructions":"","includes":["Entry","Beginner lesson"]},{"id":"t2","name":"VIP","price":45,"isFree":false,"quantity":20,"isUnlimited":false,"availableQuantity":20,"sold":0,"instructions":"","includes":["Priority entry","Drink token"]}]'::jsonb,
  '{"id":"mock-org-1","name":"Samba Nights","organizationName":"Samba Nights"}'::jsonb,
  'upcoming', true, true, 140, 140, 0, 'CTSALSA26', 'Nightlife'
),(
  'mock_ct_mystic_rooftop',
  null,
  'Mystic Rooftop Sessions',
  'Sunset DJ set overlooking Mystic Harbor. Craft cocktails and local food trucks.',
  (current_date + interval '9 days')::date + time '17:00',
  (current_date + interval '9 days')::date + time '17:00',
  (current_date + interval '9 days')::date + time '22:00',
  true,
  'Steamboat Wharf',
  '{"street":"1 Holmes St","city":"Mystic","state":"CT","zipCode":"06355","formatted":"1 Holmes St, Mystic, CT 06355","coordinates":{"latitude":41.3543,"longitude":-71.9665}}'::jsonb,
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
  '["https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800"]'::jsonb,
  '[{"id":"t1","name":"Admission","price":22,"isFree":false,"quantity":200,"isUnlimited":false,"availableQuantity":200,"sold":0,"instructions":"","includes":["Entry"]}]'::jsonb,
  '{"id":"mock-org-2","name":"Pulse Events","organizationName":"Pulse Events"}'::jsonb,
  'upcoming', true, true, 200, 200, 0, 'MYSTIC26', 'Festival'
),(
  'mock_ct_groton_brunch',
  null,
  'Groton Beats & Brunch',
  'Sunday brunch with a live DJ, bottomless mimosas, and harbor views.',
  (current_date + interval '3 days')::date + time '11:00',
  (current_date + interval '3 days')::date + time '11:00',
  (current_date + interval '3 days')::date + time '15:00',
  true,
  'Thames Club',
  '{"street":"100 Thames St","city":"Groton","state":"CT","zipCode":"06340","formatted":"100 Thames St, Groton, CT 06340","coordinates":{"latitude":41.3501,"longitude":-72.0784}}'::jsonb,
  'https://images.unsplash.com/photo-1415201364774-f6f0ff38f28b?w=800',
  '["https://images.unsplash.com/photo-1415201364774-f6f0ff38f28b?w=800"]'::jsonb,
  '[{"id":"t1","name":"Brunch Seat","price":48,"isFree":false,"quantity":60,"isUnlimited":false,"availableQuantity":60,"sold":0,"instructions":"Includes entree + 2 drinks","includes":["Brunch","Mimosas"]}]'::jsonb,
  '{"id":"mock-org-1","name":"Samba Nights","organizationName":"Samba Nights"}'::jsonb,
  'upcoming', true, true, 60, 60, 0, 'GROTON26', 'Food & Drink'
),(
  'mock_ct_newhaven_indie',
  null,
  'New Haven Indie Night',
  'Three local indie acts at a historic venue near Yale. Full bar, merch pop-up.',
  (current_date + interval '12 days')::date + time '19:00',
  (current_date + interval '12 days')::date + time '19:00',
  (current_date + interval '12 days')::date + time '23:30',
  true,
  'Toad''s Place',
  '{"street":"300 York St","city":"New Haven","state":"CT","zipCode":"06511","formatted":"300 York St, New Haven, CT 06511","coordinates":{"latitude":41.3083,"longitude":-72.9279}}'::jsonb,
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
  '["https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800"]'::jsonb,
  '[{"id":"t1","name":"Standing","price":25,"isFree":false,"quantity":150,"isUnlimited":false,"availableQuantity":150,"sold":0,"instructions":"","includes":[]},{"id":"t2","name":"Balcony","price":40,"isFree":false,"quantity":40,"isUnlimited":false,"availableQuantity":40,"sold":0,"instructions":"","includes":["Elevated view"]}]'::jsonb,
  '{"id":"mock-org-2","name":"Pulse Events","organizationName":"Pulse Events"}'::jsonb,
  'upcoming', true, true, 190, 190, 0, 'NHAVEN26', 'Live Music'
);

-- Verify (should return 9 rows)
select id, title, date, show_on_explore from public.events where id like 'mock_%' order by date;
