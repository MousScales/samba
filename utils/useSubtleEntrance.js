import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

const DURATION = 220;
const SLIDE = 8;

export function useSubtleEntrance() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SLIDE)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return { fadeAnim, slideAnim };
}

export function useSubtleFadeEntrance(...animatedValues) {
  useEffect(() => {
    animatedValues.forEach((value) => value.setValue(0));

    Animated.parallel(
      animatedValues.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: DURATION,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start();
    // Animated values are stable refs — run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
