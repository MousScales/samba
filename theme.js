import { Platform } from 'react-native';

import { samba } from './theme/samba';

export const colors = {
  primary: samba.pink,
  background: samba.bgDeep,
  surface: '#2A2A2A',
  surfaceLight: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  border: '#404040',
  error: '#FF6B6B',
  success: '#4CAF50',
  warning: '#FFC107',
  inactive: '#666666',
  cardBackground: '#2A2A2A',
  inputBackground: '#333333',
};

// Font configuration
export const fonts = {
  regular: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontWeight: 'normal',
  },
  medium: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontWeight: '500',
  },
  light: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontWeight: '300',
  },
  thin: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    fontWeight: '100',
  },
};

export const theme = {
  dark: true,
  colors: {
    ...colors,
    notification: colors.primary,
  },
  fonts: fonts,
};

export const paperTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    disabled: colors.inactive,
    placeholder: colors.textSecondary,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: colors.primary,
  },
  fonts: fonts,
}; 