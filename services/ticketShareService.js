import { supabase } from '../config/supabase';

export const createTicketShare = async (ticketId) => {
  const { data, error } = await supabase.rpc('create_ticket_share', {
    p_ticket_id: ticketId,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const claimTicketShare = async (shareToken) => {
  const { data, error } = await supabase.rpc('claim_ticket_share', {
    p_share_token: shareToken,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const previewTicketShare = async (shareToken) => {
  const { data, error } = await supabase.rpc('preview_ticket_share', {
    p_share_token: shareToken,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const getOrderShareCompanions = async (orderId) => {
  if (!orderId) return [];
  const { data, error } = await supabase.rpc('get_order_share_companions', {
    p_order_id: orderId,
  });
  if (error) {
    console.warn('getOrderShareCompanions:', error.message);
    return [];
  }
  return Array.isArray(data) ? data : (data ? [data] : []);
};

export const assignTicketHolder = async (ticketId, userId) => {
  if (!ticketId || !userId) return;
  const { error } = await supabase.rpc('assign_ticket_holder', {
    p_ticket_id: ticketId,
    p_user_id: userId,
  });
  if (error) console.warn('assignTicketHolder:', error.message);
};

export const fetchHeldTicketsFromSupabase = async (userId) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      id, order_id, event_id, ticket_number, ticket_type, price, is_free,
      qr_code, status, buyer_name, buyer_email, holder_user_id,
      events ( id, title, date, start_time, venue, cover_image )
    `)
    .eq('holder_user_id', userId)
    .eq('status', 'upcoming');

  if (error) {
    console.warn('fetchHeldTicketsFromSupabase:', error.message);
    return [];
  }

  return (data || []).map((row) => {
    const ev = row.events || {};
    const eventDate = ev.date ? new Date(ev.date) : new Date();
    const startTime = ev.start_time ? new Date(ev.start_time) : null;
    if (startTime) {
      eventDate.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());
    }
    return {
      id: row.id,
      ticketNumber: row.ticket_number,
      orderId: row.order_id,
      eventId: row.event_id,
      eventTitle: ev.title || 'Event',
      eventDate,
      eventTime: ev.start_time,
      eventLocation: ev.venue,
      eventImage: ev.cover_image,
      ticketType: row.ticket_type,
      price: Number(row.price) || 0,
      isFree: row.is_free,
      buyerName: row.buyer_name,
      buyerEmail: row.buyer_email,
      status: row.status,
      qrCode: row.qr_code,
      source: 'supabase',
      holderUserId: row.holder_user_id,
      isSharedTicket: true,
    };
  });
};
