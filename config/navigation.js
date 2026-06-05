import { Platform } from 'react-native';
import { DarkTheme } from '@react-navigation/native';
import { colors } from '../theme';

export const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

/** Standard push/pop — slide from the right, swipe back enabled */
export const defaultStackScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  gestureEnabled: true,
  fullScreenGestureEnabled: Platform.OS === 'ios',
  contentStyle: {
    backgroundColor: colors.background,
  },
};

/** Modals — slide up from bottom */
export const modalStackScreenOptions = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
  gestureEnabled: true,
  contentStyle: {
    backgroundColor: colors.background,
  },
};

/** Bottom nav roots — no transition; tabs should feel instant */
export const tabStackScreenOptions = {
  headerShown: false,
  animation: 'none',
  gestureEnabled: false,
  fullScreenGestureEnabled: false,
  contentStyle: {
    backgroundColor: colors.background,
  },
};

/** Quick cross-fade (confirmations, etc.) */
export const fadeStackScreenOptions = {
  animation: 'fade',
  animationDuration: 200,
  gestureEnabled: true,
  contentStyle: {
    backgroundColor: colors.background,
  },
};
