import { SITE_URL } from '../config/web';

export const buildEventShareUrl = (eventId) => {
  if (!eventId) return SITE_URL;
  return `${SITE_URL}/events/${encodeURIComponent(eventId)}`;
};

export const buildTicketShareUrl = (shareToken) => {
  if (!shareToken) return SITE_URL;
  return `${SITE_URL}/tickets/share/${encodeURIComponent(shareToken)}`;
};

export const buildScannerInviteUrl = (inviteToken) => {
  if (!inviteToken) return SITE_URL;
  return `${SITE_URL}/scanners/join/${encodeURIComponent(inviteToken)}`;
};

/** Scanner crew invite for share sheets */
export const buildScannerInviteMessage = ({ event, t, inviteToken, includeUrl = true }) => {
  const title = event?.title || event?.eventTitle || t('common.event');
  const lines = [
    t('dashboard.permissions.scannerInvite.message', { title }),
    includeUrl ? buildScannerInviteUrl(inviteToken) : null,
  ].filter(Boolean);
  return lines.join('\n');
};

/** Ticket share message for share sheets */
export const buildTicketShareMessage = ({ eventTitle, t, shareToken, includeUrl = true }) => {
  const lines = [
    t('myTickets.share.message', { title: eventTitle || t('common.event') }),
    includeUrl ? buildTicketShareUrl(shareToken) : null,
  ].filter(Boolean);
  return lines.join('\n');
};

/** Event blurb for share sheets. Pass includeUrl: false on iOS when url is sent separately. */
export const buildEventShareMessage = ({ event, t, locale, includeUrl = true }) => {
  const title = event?.title || 'Event';

  const formatDate = (date) => {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (time) => {
    if (!time) return null;
    if (typeof time === 'string') return time;
    const d = time instanceof Date ? time : new Date(time);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const dateStr = formatDate(event?.date);
  const timeStr = formatTime(event?.startTime);
  const venue = event?.venue || event?.address?.formatted || event?.address?.city || null;

  const lines = [
    t('eventDetails.share.message', { title }),
    dateStr && timeStr ? `📅 ${dateStr} · ${timeStr}` : dateStr ? `📅 ${dateStr}` : null,
    venue ? `📍 ${venue}` : null,
    includeUrl ? buildEventShareUrl(event?.id) : null,
  ].filter((line) => line !== null && line !== '');

  return lines.join('\n');
};
