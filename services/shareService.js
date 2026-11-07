import { supabase } from '../config/supabase';

const toIso = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const sanitizeTicketsForJson = (tickets) => {
  if (!Array.isArray(tickets)) return [];

  return tickets.map((ticket) => {
    const t = { ...ticket };

    if (t.isUnlimited) {
      return {
        ...t,
        quantity: 0,
        isUnlimited: true,
        availableQuantity: null,
        sold: Number.isFinite(t.sold) ? t.sold : 0,
      };
    }

    const qty = Number.isFinite(t.quantity) ? t.quantity : 0;
    let available = t.availableQuantity;
    if (available === Infinity || available == null || !Number.isFinite(available)) {
      available = qty;
    }

    return {
      ...t,
      quantity: qty,
      isUnlimited: false,
      availableQuantity: available,
      sold: Number.isFinite(t.sold) ? t.sold : 0,
    };
  });
};

export const isOrganizerOwnedEvent = (event, organizerUserId) => {
  if (!event?.id || !organizerUserId) return false;
  if (String(event.id).startsWith('mock_')) return false;

  const orgId = event.organizerId || event.organizer?.id;
  if (orgId === organizerUserId) return true;
  if (!orgId) return true;
  return false;
};

export const prepareEventForCloudSync = (event, organizerUserId) => {
  if (!event?.id || !organizerUserId) return null;
  if (String(event.id).startsWith('mock_')) return null;

  const organizer = {
    ...(typeof event.organizer === 'object' ? event.organizer : {}),
    id: organizerUserId,
  };

  const tickets = sanitizeTicketsForJson(event.tickets);

  const totalSpots = event.totalSpots ?? tickets.reduce(
    (sum, t) => sum + (t.isUnlimited ? 0 : (t.quantity || t.availableQuantity || 0)),
    0,
  );
  const spotsLeft = event.spotsLeft ?? tickets.reduce(
    (sum, t) => sum + (t.isUnlimited ? 0 : (t.availableQuantity ?? t.quantity ?? 0)),
    0,
  );

  return {
    ...event,
    organizerId: organizerUserId,
    organizer,
    tickets,
    totalSpots,
    spotsLeft,
  };
};

export const mapAppEventToRow = (event) => {
  if (!event?.id) return null;

  const tickets = sanitizeTicketsForJson(event.tickets);
  const flyers = Array.isArray(event.flyers) ? event.flyers : [];
  const totalSpots = event.totalSpots ?? tickets.reduce(
    (sum, t) => sum + (t.isUnlimited ? 0 : (t.quantity || t.availableQuantity || 0)),
    0,
  );
  const spotsLeft = event.spotsLeft ?? tickets.reduce(
    (sum, t) => sum + (t.isUnlimited ? 0 : (t.availableQuantity ?? t.quantity ?? 0)),
    0,
  );

  return {
    id: event.id,
    organizer_id: event.organizerId || event.organizer?.id || null,
    title: event.title,
    description: event.description || '',
    date: toIso(event.date),
    start_time: toIso(event.startTime),
    end_time: event.hasEndTime ? toIso(event.endTime) : null,
    has_end_time: !!event.hasEndTime,
    venue: event.venue || '',
    address: event.address || {},
    cover_image: event.coverImage || flyers[0] || null,
    flyers,
    tickets,
    organizer: event.organizer || {},
    status: event.status || 'upcoming',
    ticket_sales_open: event.ticketSalesOpen !== false,
    show_on_explore: event.showOnExplore !== false,
    total_spots: totalSpots,
    spots_left: spotsLeft,
    booked_spots: event.bookedSpots ?? 0,
    verification_code: event.verificationCode || null,
    category: event.category || 'Event',
    audio_url: event.audioUrl || null,
    updated_at: new Date().toISOString(),
  };
};

export const syncEventForShare = async (event, organizerUserId) => {
  const prepared = prepareEventForCloudSync(event, organizerUserId);
  if (!prepared) return { ok: false, error: 'Invalid event or mock event' };

  const row = mapAppEventToRow(prepared);
  if (!row?.organizer_id) {
    return { ok: false, error: 'Missing organizer_id' };
  }

  try {
    const { error } = await supabase
      .from('events')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn(`Cloud sync failed for ${event.id}:`, error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    console.warn(`Cloud sync failed for ${event.id}:`, err?.message || err);
    return { ok: false, error: err?.message || 'Sync failed' };
  }
};

export const deleteSyncedEvent = async (eventId) => {
  if (!eventId || String(eventId).startsWith('mock_')) {
    return { ok: true, skipped: true };
  }

  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.warn(`Cloud delete failed for ${eventId}:`, error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    console.warn(`Cloud delete failed for ${eventId}:`, err?.message || err);
    return { ok: false, error: err?.message || 'Delete failed' };
  }
};

export const syncMyEventsToCloud = async (localEvents, organizerUserId) => {
  if (!organizerUserId) {
    return { ok: 0, total: 0, errors: [] };
  }

  const owned = (localEvents || []).filter((e) => isOrganizerOwnedEvent(e, organizerUserId));
  if (!owned.length) {
    console.log('Cloud sync done: 0/0 events');
    return { ok: 0, total: 0, errors: [] };
  }

  let ok = 0;
  const errors = [];

  for (const event of owned) {
    const result = await syncEventForShare(event, organizerUserId);
    if (result.ok) {
      ok += 1;
    } else {
      errors.push({ id: event.id, title: event.title, error: result.error });
    }
  }

  console.log(`Cloud sync done: ${ok}/${owned.length} events`);
  if (errors.length) {
    console.warn('Cloud sync errors:', errors);
  }

  return { ok, total: owned.length, errors };
};

export default {
  sanitizeTicketsForJson,
  isOrganizerOwnedEvent,
  prepareEventForCloudSync,
  mapAppEventToRow,
  syncEventForShare,
  deleteSyncedEvent,
  syncMyEventsToCloud,
};
