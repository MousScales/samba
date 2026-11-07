import { supabase } from '../config/supabase';
import {
  mapAppEventToRow,
  syncEventForShare as syncEventForShareImpl,
} from './shareService';

export { mapAppEventToRow } from './shareService';

const parseDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const mapEventRowToAppEvent = (row) => {
  if (!row) return null;

  const flyers = Array.isArray(row.flyers) ? row.flyers : [];
  const tickets = Array.isArray(row.tickets) ? row.tickets : [];
  const organizer = row.organizer || {};

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    date: parseDate(row.date),
    startTime: parseDate(row.start_time),
    endTime: parseDate(row.end_time),
    hasEndTime: row.has_end_time ?? false,
    venue: row.venue || '',
    address: row.address || {},
    coverImage: row.cover_image || flyers[0] || null,
    flyers,
    tickets,
    organizer,
    organizerId: row.organizer_id || organizer.id,
    status: row.status || 'upcoming',
    ticketSalesOpen: row.ticket_sales_open !== false,
    showOnExplore: row.show_on_explore !== false,
    totalSpots: row.total_spots ?? 0,
    spotsLeft: row.spots_left ?? 0,
    bookedSpots: row.booked_spots ?? 0,
    verificationCode: row.verification_code,
    category: row.category || 'Event',
    audioUrl: row.audio_url || null,
    createdAt: parseDate(row.created_at) || new Date(),
    updatedAt: parseDate(row.updated_at) || new Date(),
    scannedTickets: 0,
    actualAttendees: 0,
    source: 'supabase',
  };
};

export const fetchEventById = async (eventId) => {
  if (!eventId) return null;

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (error) {
      console.warn('fetchEventById failed:', error.message);
      return null;
    }

    return mapEventRowToAppEvent(data);
  } catch (err) {
    console.warn('fetchEventById:', err?.message || err);
    return null;
  }
};

export const purchaseTicketsViaSupabase = async ({
  eventId,
  tickets,
  buyerName,
  buyerEmail,
  joinGuestList = true,
  paymentId = null,
  paymentStatus = 'demo_completed',
  source = 'app',
}) => {
  const { data, error } = await supabase.rpc('purchase_tickets', {
    p_event_id: eventId,
    p_tickets: tickets,
    p_buyer_name: buyerName,
    p_buyer_email: buyerEmail,
    p_join_guest_list: joinGuestList,
    p_payment_id: paymentId,
    p_payment_status: paymentStatus,
    p_source: source,
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error('Purchase failed');
  return data;
};

export const lookupTicketsViaSupabase = async (orderId, buyerEmail) => {
  const { data, error } = await supabase.rpc('lookup_tickets', {
    p_order_id: orderId,
    p_buyer_email: buyerEmail,
  });

  if (error) throw new Error(error.message);
  return data;
};

export const scanTicketByQrViaSupabase = async (qrCode, eventId = null) => {
  const { data, error } = await supabase.rpc('scan_ticket_by_qr', {
    p_qr_code: qrCode,
    p_event_id: eventId,
  });

  if (error) throw new Error(error.message);
  return data;
};

export const syncEventForSharing = async (event, organizerUserId) => {
  if (organizerUserId) {
    return syncEventForShareImpl(event, organizerUserId);
  }
  const row = mapAppEventToRow(event);
  if (!row) return { ok: false, error: 'Invalid event' };

  try {
    const { error } = await supabase
      .from('events')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('syncEventForSharing failed:', error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    console.warn('syncEventForSharing:', err?.message || err);
    return { ok: false, error: err?.message || 'Sync failed' };
  }
};

export const fetchExploreEvents = async () => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('show_on_explore', true)
      .order('date', { ascending: true });

    if (error) {
      console.warn(
        'Supabase explore events failed:',
        error.message,
        '— Run supabase/schema.sql then supabase/seed-events-only.sql in the SQL Editor.'
      );
      return [];
    }

    if (!data?.length) {
      console.warn(
        'No events in Supabase. Run supabase/seed-events-only.sql in your project SQL Editor.'
      );
    }

    const mapped = (data || []).map(mapEventRowToAppEvent);
    const valid = mapped.filter((e) => e?.date && e?.startTime);
    if (mapped.length > 0 && valid.length === 0) {
      console.warn('Events returned from Supabase but date fields could not be parsed.');
    }
    return valid;
  } catch (err) {
    console.warn('fetchExploreEvents:', err?.message || err);
    return [];
  }
};

export default {
  fetchExploreEvents,
  fetchEventById,
  syncEventForSharing,
  purchaseTicketsViaSupabase,
  lookupTicketsViaSupabase,
  scanTicketByQrViaSupabase,
  mapEventRowToAppEvent,
  mapAppEventToRow,
};
