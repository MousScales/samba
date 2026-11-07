-- Ticket purchases + web share links
-- Run AFTER schema.sql in the Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS.

-- ── Shared event links (website can load any event open for sale) ─────────────
drop policy if exists "Shared events readable for purchase" on public.events;
create policy "Shared events readable for purchase"
  on public.events for select
  using (ticket_sales_open = true);

alter table public.events add column if not exists guest_list jsonb not null default '[]'::jsonb;

-- ── Orders (one row per checkout) ─────────────────────────────────────────────
create table if not exists public.ticket_orders (
  id text primary key,
  event_id text not null references public.events (id) on delete cascade,
  ticket_number text not null,
  buyer_name text not null,
  buyer_email text not null,
  join_guest_list boolean not null default true,
  subtotal numeric(10, 2) not null default 0,
  service_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  payment_id text,
  payment_status text not null default 'demo_completed',
  source text not null default 'web',
  created_at timestamptz not null default now()
);

create index if not exists ticket_orders_event_id_idx on public.ticket_orders (event_id);
create index if not exists ticket_orders_buyer_email_idx on public.ticket_orders (lower(buyer_email));

-- ── Individual tickets (one row per ticket — each has its own QR code) ────────
create table if not exists public.tickets (
  id text primary key,
  order_id text not null references public.ticket_orders (id) on delete cascade,
  event_id text not null references public.events (id) on delete cascade,
  ticket_number text not null,
  ticket_type text not null,
  ticket_type_id text,
  price numeric(10, 2) not null default 0,
  is_free boolean not null default false,
  buyer_name text not null,
  buyer_email text not null,
  qr_code text not null unique,
  status text not null default 'upcoming',
  scanned_at timestamptz,
  scanned_by uuid references public.profiles (id) on delete set null,
  payment_id text,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  constraint tickets_status_check check (status in ('upcoming', 'used', 'cancelled', 'refunded'))
);

create index if not exists tickets_event_id_idx on public.tickets (event_id);
create index if not exists tickets_order_id_idx on public.tickets (order_id);
create index if not exists tickets_qr_code_idx on public.tickets (qr_code);
create index if not exists tickets_buyer_email_idx on public.tickets (lower(buyer_email));

alter table public.ticket_orders enable row level security;
alter table public.tickets enable row level security;

-- Organizers can read orders + tickets for their events
drop policy if exists "Organizers read own event orders" on public.ticket_orders;
create policy "Organizers read own event orders"
  on public.ticket_orders for select
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_orders.event_id
        and e.organizer_id = auth.uid()
    )
  );

drop policy if exists "Organizers read own event tickets" on public.tickets;
create policy "Organizers read own event tickets"
  on public.tickets for select
  using (
    exists (
      select 1 from public.events e
      where e.id = tickets.event_id
        and e.organizer_id = auth.uid()
    )
  );

drop policy if exists "Organizers update own event tickets" on public.tickets;
create policy "Organizers update own event tickets"
  on public.tickets for update
  using (
    exists (
      select 1 from public.events e
      where e.id = tickets.event_id
        and e.organizer_id = auth.uid()
    )
  );

grant select on public.ticket_orders to authenticated;
grant select, update on public.tickets to authenticated;

-- ── Helpers ───────────────────────────────────────────────────────────────────
create or replace function public._random_id()
returns text
language sql
volatile
as $$
  select encode(gen_random_bytes(12), 'hex');
$$;

-- ── Purchase tickets (guest checkout — no account required) ───────────────────
-- Called from the website API route (service role) or directly with anon key.
-- p_tickets example: {"General Admission": 2, "VIP Table": 1}
create or replace function public.purchase_tickets(
  p_event_id text,
  p_tickets jsonb,
  p_buyer_name text,
  p_buyer_email text,
  p_join_guest_list boolean default true,
  p_payment_id text default null,
  p_payment_status text default 'demo_completed',
  p_source text default 'web'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_ticket_key text;
  v_qty int;
  v_type jsonb;
  v_type_name text;
  v_available int;
  v_total_requested int := 0;
  v_subtotal numeric(10, 2) := 0;
  v_service_fee numeric(10, 2);
  v_total numeric(10, 2);
  v_order_id text;
  v_ticket_number text;
  v_new_tickets jsonb := '[]'::jsonb;
  v_updated_tickets jsonb;
  v_guest_list jsonb;
  v_guest_idx int;
  v_i int;
  v_ticket_id text;
  v_qr_code text;
  v_price numeric(10, 2);
  v_is_free boolean;
begin
  if p_event_id is null or p_tickets is null or jsonb_typeof(p_tickets) <> 'object' then
    raise exception 'Invalid purchase payload';
  end if;

  if coalesce(trim(p_buyer_name), '') = '' or coalesce(trim(p_buyer_email), '') = '' then
    raise exception 'Buyer name and email are required';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found';
  end if;

  if v_event.ticket_sales_open is not true then
    raise exception 'Ticket sales are closed for this event';
  end if;

  if v_event.status = 'completed' then
    raise exception 'This event has ended';
  end if;

  -- Validate quantities and compute subtotal
  for v_ticket_key, v_qty in
    select key, value::int
    from jsonb_each_text(p_tickets)
    where value::int > 0
  loop
    v_type := null;
    for v_type in
      select t
      from jsonb_array_elements(v_event.tickets) t
      where t->>'name' = v_ticket_key
      limit 1
    loop
      exit;
    end loop;

    if v_type is null then
      raise exception 'Ticket type "%" not found', v_ticket_key;
    end if;

    if coalesce((v_type->>'isUnlimited')::boolean, false) is not true then
      v_available := coalesce((v_type->>'availableQuantity')::int, (v_type->>'quantity')::int, 0);
      if v_qty > v_available then
        raise exception 'Only % tickets available for "%"', v_available, v_ticket_key;
      end if;
    end if;

    v_is_free := coalesce((v_type->>'isFree')::boolean, false);
    v_price := case when v_is_free then 0 else coalesce((v_type->>'price')::numeric, 0) end;
    v_subtotal := v_subtotal + (v_price * v_qty);
    v_total_requested := v_total_requested + v_qty;
  end loop;

  if v_total_requested = 0 then
    raise exception 'No tickets selected';
  end if;

  if v_event.total_spots > 0 and v_total_requested > coalesce(v_event.spots_left, 0) then
    raise exception 'Only % spots left for this event', coalesce(v_event.spots_left, 0);
  end if;

  v_service_fee := round(v_subtotal * 0.10, 2);
  v_total := v_subtotal + v_service_fee;
  v_order_id := public._random_id();
  v_ticket_number := to_char(extract(epoch from now()) * 1000, 'FM999999999999') || substr(public._random_id(), 1, 4);

  insert into public.ticket_orders (
    id, event_id, ticket_number, buyer_name, buyer_email,
    join_guest_list, subtotal, service_fee, total,
    payment_id, payment_status, source
  ) values (
    v_order_id, p_event_id, v_ticket_number, trim(p_buyer_name), lower(trim(p_buyer_email)),
    coalesce(p_join_guest_list, true), v_subtotal, v_service_fee, v_total,
    p_payment_id, coalesce(p_payment_status, 'demo_completed'), coalesce(p_source, 'web')
  );

  -- Create individual ticket rows
  for v_ticket_key, v_qty in
    select key, value::int
    from jsonb_each_text(p_tickets)
    where value::int > 0
  loop
    select t into v_type
    from jsonb_array_elements(v_event.tickets) t
    where t->>'name' = v_ticket_key
    limit 1;

    v_is_free := coalesce((v_type->>'isFree')::boolean, false);
    v_price := case when v_is_free then 0 else coalesce((v_type->>'price')::numeric, 0) end;

    for v_i in 1..v_qty loop
      v_ticket_id := public._random_id();
      v_qr_code := 'ticket_' || extract(epoch from now())::bigint || '_' || substr(public._random_id(), 1, 9) || '_' || (v_i - 1);

      insert into public.tickets (
        id, order_id, event_id, ticket_number, ticket_type, ticket_type_id,
        price, is_free, buyer_name, buyer_email, qr_code, payment_id, source
      ) values (
        v_ticket_id, v_order_id, p_event_id, v_ticket_number, v_ticket_key, v_type->>'id',
        v_price, v_is_free, trim(p_buyer_name), lower(trim(p_buyer_email)), v_qr_code, p_payment_id, coalesce(p_source, 'web')
      );

      v_new_tickets := v_new_tickets || jsonb_build_array(
        jsonb_build_object(
          'id', v_ticket_id,
          'ticketType', v_ticket_key,
          'price', v_price,
          'isFree', v_is_free,
          'qrCode', v_qr_code,
          'status', 'upcoming'
        )
      );
    end loop;
  end loop;

  -- Update ticket availability on the event
  v_updated_tickets := (
    select coalesce(jsonb_agg(
      case
        when coalesce((t->>'isUnlimited')::boolean, false) then
          t || jsonb_build_object(
            'sold', coalesce((t->>'sold')::int, 0) + coalesce((p_tickets->>(t->>'name'))::int, 0)
          )
        else
          t || jsonb_build_object(
            'availableQuantity', greatest(
              0,
              coalesce((t->>'availableQuantity')::int, (t->>'quantity')::int, 0)
                - coalesce((p_tickets->>(t->>'name'))::int, 0)
            ),
            'sold', coalesce((t->>'sold')::int, 0) + coalesce((p_tickets->>(t->>'name'))::int, 0)
          )
      end
    ), '[]'::jsonb)
    from jsonb_array_elements(v_event.tickets) t
  );

  -- Guest list
  v_guest_list := coalesce(v_event.guest_list, '[]'::jsonb);
  if coalesce(p_join_guest_list, true) then
    v_guest_idx := (
      select ordinality - 1
      from jsonb_array_elements(v_guest_list) with ordinality g
      where lower(g->>'email') = lower(trim(p_buyer_email))
      limit 1
    );

    if v_guest_idx is null then
      v_guest_list := v_guest_list || jsonb_build_array(
        jsonb_build_object(
          'id', public._random_id(),
          'name', trim(p_buyer_name),
          'email', lower(trim(p_buyer_email)),
          'joinedAt', now(),
          'ticketCount', v_total_requested
        )
      );
    else
      v_guest_list := jsonb_set(
        v_guest_list,
        array[v_guest_idx::text, 'ticketCount'],
        to_jsonb(coalesce((v_guest_list->v_guest_idx->>'ticketCount')::int, 0) + v_total_requested)
      );
    end if;
  end if;

  update public.events
  set
    tickets = v_updated_tickets,
    spots_left = case
      when total_spots > 0 then greatest(0, coalesce(spots_left, total_spots) - v_total_requested)
      else spots_left
    end,
    booked_spots = coalesce(booked_spots, 0) + v_total_requested,
    guest_list = v_guest_list,
    updated_at = now()
  where id = p_event_id;

  return jsonb_build_object(
    'success', true,
    'orderId', v_order_id,
    'ticketNumber', v_ticket_number,
    'subtotal', v_subtotal,
    'serviceFee', v_service_fee,
    'total', v_total,
    'ticketCount', v_total_requested,
    'tickets', v_new_tickets
  );
end;
$$;

grant execute on function public.purchase_tickets(text, jsonb, text, text, boolean, text, text, text) to anon, authenticated, service_role;

-- ── Lookup tickets after purchase (no account — email + order id) ─────────────
create or replace function public.lookup_tickets(
  p_order_id text,
  p_buyer_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.ticket_orders%rowtype;
  v_event public.events%rowtype;
  v_tickets jsonb;
begin
  select * into v_order
  from public.ticket_orders
  where id = p_order_id
    and lower(buyer_email) = lower(trim(p_buyer_email));

  if not found then
    raise exception 'Order not found';
  end if;

  select * into v_event from public.events where id = v_order.event_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'ticketType', t.ticket_type,
      'price', t.price,
      'isFree', t.is_free,
      'qrCode', t.qr_code,
      'status', t.status,
      'scannedAt', t.scanned_at
    )
    order by t.created_at
  ), '[]'::jsonb)
  into v_tickets
  from public.tickets t
  where t.order_id = p_order_id;

  return jsonb_build_object(
    'orderId', v_order.id,
    'ticketNumber', v_order.ticket_number,
    'buyerName', v_order.buyer_name,
    'buyerEmail', v_order.buyer_email,
    'subtotal', v_order.subtotal,
    'serviceFee', v_order.service_fee,
    'total', v_order.total,
    'paymentStatus', v_order.payment_status,
    'createdAt', v_order.created_at,
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'date', v_event.date,
      'startTime', v_event.start_time,
      'venue', v_event.venue,
      'coverImage', v_event.cover_image
    ),
    'tickets', v_tickets
  );
end;
$$;

grant execute on function public.lookup_tickets(text, text) to anon, authenticated, service_role;

-- ── Scan ticket by QR code (organizer check-in) ───────────────────────────────
create or replace function public.scan_ticket_by_qr(
  p_qr_code text,
  p_event_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets%rowtype;
  v_event public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_ticket
  from public.tickets
  where qr_code = p_qr_code
  for update;

  if not found then
    raise exception 'Ticket not found';
  end if;

  if p_event_id is not null and v_ticket.event_id <> p_event_id then
    raise exception 'Ticket is for a different event';
  end if;

  select * into v_event from public.events where id = v_ticket.event_id;

  if v_event.organizer_id is distinct from auth.uid() then
    raise exception 'Not authorized to scan tickets for this event';
  end if;

  if v_ticket.status = 'used' then
    raise exception 'Ticket has already been scanned';
  end if;

  if v_ticket.status <> 'upcoming' then
    raise exception 'Ticket is not valid for check-in';
  end if;

  update public.tickets
  set
    status = 'used',
    scanned_at = now(),
    scanned_by = auth.uid()
  where id = v_ticket.id;

  return jsonb_build_object(
    'success', true,
    'ticket', jsonb_build_object(
      'id', v_ticket.id,
      'ticketType', v_ticket.ticket_type,
      'buyerName', v_ticket.buyer_name,
      'buyerEmail', v_ticket.buyer_email,
      'qrCode', v_ticket.qr_code,
      'status', 'used',
      'scannedAt', now()
    ),
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title
    )
  );
end;
$$;

grant execute on function public.scan_ticket_by_qr(text, text) to authenticated, service_role;
