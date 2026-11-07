/** User has completed scanner onboarding */
export const isActiveScanner = (user) => user?.scannerInfo?.status === 'active';

/**
 * Scan Tickets entry: scanner home if onboarded, otherwise scanner onboarding.
 */
export const navigateToScanTickets = (navigation, { user, isAuthenticated } = {}) => {
  if (isAuthenticated && isActiveScanner(user)) {
    navigation.navigate('ScannerEvents');
    return;
  }
  navigation.navigate('BecomeScanner');
};
