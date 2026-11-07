import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { samba } from '../theme/samba';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Layered pink & green glow pools on near-black — Samba premium dark background.
 * Place as the first child inside a flex:1 screen container.
 */
export default function SambaBackground() {
  return (
    <View style={styles.base} pointerEvents="none">
      <View style={styles.glowTop} />
      <View style={styles.glowRight} />
      <View style={styles.glowLeft} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: samba.bgDeep,
    overflow: 'hidden',
    zIndex: 0,
  },
  glowTop: {
    position: 'absolute',
    top: -SCREEN_H * 0.12,
    left: SCREEN_W * 0.1,
    width: SCREEN_W * 0.8,
    height: SCREEN_H * 0.38,
    borderRadius: SCREEN_W * 0.4,
    backgroundColor: samba.glowTop,
  },
  glowRight: {
    position: 'absolute',
    top: SCREEN_H * 0.1,
    right: -SCREEN_W * 0.18,
    width: SCREEN_W * 0.52,
    height: SCREEN_W * 0.52,
    borderRadius: SCREEN_W * 0.26,
    backgroundColor: samba.glowRight,
  },
  glowLeft: {
    position: 'absolute',
    bottom: SCREEN_H * 0.12,
    left: -SCREEN_W * 0.14,
    width: SCREEN_W * 0.58,
    height: SCREEN_W * 0.58,
    borderRadius: SCREEN_W * 0.29,
    backgroundColor: samba.glowLeft,
  },
});
