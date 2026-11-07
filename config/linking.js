import { SITE_URL } from './web';

const linkingHost = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return 'samba-site-woad.vercel.app';
  }
})();

export const LINKING_HOST = linkingHost;

/** React Navigation deep link config — matches shared web URLs */
export const linking = {
  prefixes: [`samba://`, `https://${LINKING_HOST}`],
  config: {
    screens: {
      Home: '',
      Explore: 'explore',
      EventDetails: 'events/:eventId',
      TicketShareClaim: 'tickets/share/:shareToken',
      ScannerInviteClaim: 'scanners/join/:inviteToken',
    },
  },
};

export default linking;
