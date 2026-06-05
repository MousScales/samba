import React, { useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, Image, TouchableOpacity, Platform, Animated,
} from 'react-native';
import { Icon } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';

const PulsingLiveDot = () => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.12] });

  return (
    <View style={s.liveDotWrap}>
      <Animated.View
        style={[
          s.liveDotGlow,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      />
      <Animated.View
        style={[
          s.liveDotIndicator,
          { transform: [{ scale: dotScale }] },
        ]}
      />
    </View>
  );
};

/**
 * Event card — full-bleed image, category top-left, title + venue/date overlay at bottom.
 */
export default function PortraitEventCard({
  width,
  title,
  imageUri,
  subtitle,
  dateLabel = null,
  timeLabel = null,
  venue,
  meta,
  topLeft = null,
  price,
  onPress,
  isLive = false,
  liveDotOnly = false,
  liveLabel = 'Live Now',
  variant = 'default',
  isSoldOut = false,
  topRight = null,
  footer = null,
  footerFaded = false,
  aspectRatio = 1.32,
  bottomMargin = 14,
}) {
  const cardH = Math.round(width * aspectRatio);
  const compact = width < 200;
  const titleSize = compact ? 14 : 18;
  const isAttendee = variant === 'attendee';
  const showTopRightLiveDot = isLive && !isAttendee;

  return (
    <TouchableOpacity
      style={[s.wrap, { width, height: cardH, marginBottom: bottomMargin }, isSoldOut && { opacity: 0.55 }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress || isSoldOut}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.imgFallback]}>
          <Icon name="image" type="feather" size={20} color="rgba(255,255,255,0.15)" />
        </View>
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[s.overlay, footer && s.overlayWithFooter]} pointerEvents="box-none">
        {/* Top — category pill + spots */}
        <View style={s.topRow}>
          <View style={s.topLeft}>
            {topLeft || (meta ? (
              <Text style={s.catText} numberOfLines={1}>{meta}</Text>
            ) : null)}
          </View>
          <View style={s.topRightWrap}>
            {showTopRightLiveDot && <PulsingLiveDot />}
            {!liveDotOnly && topRight}
          </View>
        </View>

        {/* Bottom — title, then venue | date/time */}
        <View style={s.bottomContent}>
          {isAttendee ? (
            <View style={s.titleRow}>
              <Text
                style={[s.title, s.titleInline, { fontSize: titleSize, lineHeight: titleSize + 4 }]}
                numberOfLines={2}
              >
                {title}
              </Text>
              {isLive && (
                <View style={s.liveTitleBadge}>
                  <PulsingLiveDot />
                  <Text style={s.liveNowText}>{liveLabel}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={[s.title, { fontSize: titleSize, lineHeight: titleSize + 4 }]} numberOfLines={2}>
              {title}
            </Text>
          )}

          {isAttendee ? (
            <View style={s.metaRow}>
              {venue ? (
                <View style={s.metaItem}>
                  <Icon name="map-pin" type="feather" size={11} color="rgba(255,255,255,0.85)" />
                  <Text style={s.metaText} numberOfLines={1}>{venue}</Text>
                </View>
              ) : null}
              {venue && (dateLabel || timeLabel) ? (
                <Text style={s.metaSep}>·</Text>
              ) : null}
              {dateLabel ? (
                <Text style={s.metaText} numberOfLines={1}>{dateLabel}</Text>
              ) : null}
              {dateLabel && timeLabel ? (
                <Text style={s.metaSep}>·</Text>
              ) : null}
              {timeLabel ? (
                <Text style={s.metaText} numberOfLines={1}>{timeLabel}</Text>
              ) : null}
              {price ? (
                <>
                  <Text style={s.metaSep}>·</Text>
                  <Text style={[s.metaText, s.metaPrice]} numberOfLines={1}>{price}</Text>
                </>
              ) : null}
            </View>
          ) : (
            <View style={s.bottomRow}>
              {venue ? (
                <View style={s.venueRow}>
                  <Icon name="map-pin" type="feather" size={11} color="rgba(255,255,255,0.85)" />
                  <Text style={s.venue} numberOfLines={1}>{venue}</Text>
                </View>
              ) : (
                <View style={{ flex: 1 }} />
              )}

              <View style={s.rightCol}>
                {subtitle ? (
                  <Text style={s.dateTime} numberOfLines={1}>{subtitle}</Text>
                ) : null}
                {price ? (
                  <Text style={s.price} numberOfLines={1}>{price}</Text>
                ) : null}
              </View>
            </View>
          )}
        </View>
      </View>

      {footer ? (
        <View style={[s.footer, footerFaded && s.footerFaded]} pointerEvents="box-none">
          {footer}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    backgroundColor: '#141414',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  imgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1c',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  overlayWithFooter: {
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  topRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  liveDotWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotGlow: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
  },
  liveDotIndicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#4ade80',
    ...Platform.select({
      ios: {
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  catText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomContent: {
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  liveTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  liveNowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4ade80',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 22,
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  titleInline: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '55%',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    flexShrink: 1,
  },
  metaSep: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginHorizontal: 1,
  },
  metaPrice: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  venueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  venue: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 2,
  },
  dateTime: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },
  price: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  footerFaded: {
    opacity: 0.55,
  },
});
