import { supabase } from '../config/supabase';

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

export default { fetchExploreEvents, mapEventRowToAppEvent };
