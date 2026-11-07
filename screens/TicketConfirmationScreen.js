import React, { useLayoutEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import {
  StyleSheet, View, ScrollView, TouchableOpacity,
  Image, StatusBar, Platform, Dimensions,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const TICKET_W  = width - 48;
const NOTCH_R   = 18;

const TicketConfirmationScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();
  const {
    event, tickets, totalAmount, email, paymentId,
    orderId, ticketNumber, purchasedTickets = [], isGuest,
  } = route.params;
  const safeTotal  = typeof totalAmount === 'number' ? totalAmount : parseFloat(totalAmount) || 0;
  const confirmId  = (orderId || ticketNumber || paymentId || `SAMBA-${Date.now()}`).toString().slice(-8).toUpperCase();
  const coverImage = event.coverImage || event.image || event.flyers?.[0];
  const ticketEntries = Object.entries(tickets || {}).filter(([, count]) => count > 0);
  const qrTickets = purchasedTickets.length > 0
    ? purchasedTickets
    : ticketEntries.flatMap(([type, count]) =>
        Array.from({ length: count }, (_, i) => ({ ticketType: type, qrCode: `SAMBA:${event.id}:${confirmId}:${i}` }))
      );

  const formatDate = (d) => {
    if (!d) return t('common.tba');
    try {
      const dt = new Date(d);
      if (isNaN(dt)) return typeof d === 'string' ? d : t('common.tba');
      return dt.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return t('common.tba'); }
  };

  const formatTime = (time) => {
    if (!time) return t('common.tba');
    try {
      const dt = new Date(time);
      if (isNaN(dt)) return typeof time === 'string' ? time : t('common.tba');
      return dt.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return t('common.tba'); }
  };

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  const goHome = () => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
  const goMyTickets = () => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Profile' }] }));
  const goLookup = () => navigation.navigate('TicketLookup', { email, orderId });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 110 }]}
      >
        {/* ── Success mark ── */}
        <View style={styles.successWrap}>
          <View style={styles.successRing}>
            <Icon name="check" type="feather" size={32} color="#4ade80" />
          </View>
          <Text style={styles.successTitle}>{t('ticketConfirmation.success.title')}</Text>
          <Text style={styles.successSub}>
            {isGuest
              ? t('ticketConfirmation.success.guestSubtitle', { email })
              : t('ticketConfirmation.success.subtitle', { email })}
          </Text>
          {isGuest && orderId ? (
            <Text style={styles.orderIdText}>
              {t('ticketConfirmation.orderId', { orderId })}
            </Text>
          ) : null}
        </View>

        {/* ══════════════════════════════════════
            TICKET CARD
        ══════════════════════════════════════ */}
        <View style={styles.ticketOuter}>

          {/* ── TOP HALF: event image + name ── */}
          <View style={styles.ticketTop}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.ticketImg} resizeMode="cover" />
            ) : (
              <View style={[styles.ticketImg, styles.ticketImgPlaceholder]}>
                <Icon name="music" type="feather" size={36} color="rgba(255,255,255,0.15)" />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(15,15,15,0.96)']}
              style={styles.ticketImgGrad}
            >
              <Text style={styles.ticketEventTitle} numberOfLines={2}>{event.title}</Text>
              {event.venue ? <Text style={styles.ticketVenue}>{event.venue}</Text> : null}
            </LinearGradient>
          </View>

          {/* ── NOTCH DIVIDER ── */}
          <View style={styles.notchRow}>
            <View style={styles.notchLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.notchRight} />
          </View>

          {/* ── BOTTOM HALF: details ── */}
          <View style={styles.ticketBottom}>
            <View style={styles.infoGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoCellLabel}>{t('ticketConfirmation.label.date')}</Text>
                <Text style={styles.infoCellValue}>{formatDate(event.date)}</Text>
              </View>
              <View style={[styles.infoCell, styles.infoCellBorder]}>
                <Text style={styles.infoCellLabel}>{t('ticketConfirmation.label.time')}</Text>
                <Text style={styles.infoCellValue}>{formatTime(event.startTime)}</Text>
              </View>
              <View style={[styles.infoCell, styles.infoCellBorder]}>
                <Text style={styles.infoCellLabel}>{t('ticketConfirmation.label.tickets')}</Text>
                <Text style={styles.infoCellValue}>
                  {ticketEntries.reduce((s, [, c]) => s + c, 0)}
                </Text>
              </View>
            </View>

            {ticketEntries.length > 0 && (
              <View style={styles.ticketTypes}>
                {ticketEntries.map(([type, count]) => (
                  <View key={type} style={styles.ticketTypeRow}>
                    <Text style={styles.ticketTypeName}>{type}</Text>
                    <Text style={styles.ticketTypeCount}>×{count}</Text>
                  </View>
                ))}
                <View style={styles.totalLineRow}>
                  <Text style={styles.totalLineLabel}>{t('common.total')}</Text>
                  <Text style={styles.totalLineAmount}>${safeTotal.toFixed(2)}</Text>
                </View>
              </View>
            )}

            <View style={styles.qrSection}>
              {qrTickets.map((ticket, index) => (
                <View key={ticket.id || index} style={styles.qrTicketBlock}>
                  {qrTickets.length > 1 ? (
                    <Text style={styles.qrTicketLabel}>{ticket.ticketType}</Text>
                  ) : null}
                  <View style={styles.qrWrap}>
                    <QRCode
                      value={ticket.qrCode || ticket.id}
                      size={120}
                      backgroundColor="transparent"
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              ))}
              <Text style={styles.confirmId}>{t('ticketConfirmation.confirmId', { confirmId })}</Text>
              <Text style={styles.confirmHint}>{t('ticketConfirmation.qrHint')}</Text>
            </View>
          </View>

        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={isGuest ? goLookup : goMyTickets}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#FF4B8C', '#e0356a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.primaryBtnGrad}>
            <Text style={styles.primaryBtnText}>
              {isGuest ? t('ticketConfirmation.button.lookupTickets') : t('ticketConfirmation.button.viewTickets')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={goHome} activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>{t('ticketConfirmation.button.backHome')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { paddingHorizontal: 24, alignItems: 'center' },

  successWrap: { alignItems: 'center', marginBottom: 32 },
  successRing: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2, borderColor: '#4ade80',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(74,222,128,0.08)',
    marginBottom: 16,
  },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  successSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  orderIdText: { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 8, fontWeight: '600' },

  ticketOuter: {
    width: TICKET_W,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#FF4B8C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },

  ticketTop: { width: '100%', height: 200, position: 'relative' },
  ticketImg: { width: '100%', height: '100%' },
  ticketImgPlaceholder: { backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center' },
  ticketImgGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 18,
  },
  ticketEventTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 3, textTransform: 'uppercase' },
  ticketVenue: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  notchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616',
    marginVertical: 0,
  },
  notchLeft: {
    width: NOTCH_R * 2, height: NOTCH_R * 2, borderRadius: NOTCH_R,
    backgroundColor: '#0a0a0a',
    marginLeft: -NOTCH_R,
  },
  notchRight: {
    width: NOTCH_R * 2, height: NOTCH_R * 2, borderRadius: NOTCH_R,
    backgroundColor: '#0a0a0a',
    marginRight: -NOTCH_R,
  },
  dashedLine: {
    flex: 1, height: 1,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    marginHorizontal: 4,
  },

  ticketBottom: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 },

  infoGrid: { flexDirection: 'row', marginBottom: 18 },
  infoCell: { flex: 1, alignItems: 'center' },
  infoCellBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
  infoCellLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  infoCellValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },

  ticketTypes: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  ticketTypeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  ticketTypeName: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  ticketTypeCount: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },
  totalLineRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  totalLineLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  totalLineAmount: { fontSize: 18, color: '#FFFFFF', fontWeight: '800' },

  qrSection: { alignItems: 'center', gap: 10 },
  qrTicketBlock: { alignItems: 'center', marginBottom: 12 },
  qrTicketLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  qrWrap: {
    padding: 16, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  confirmId: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 2 },
  confirmHint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },

  primaryBtn: { width: TICKET_W, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  primaryBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  secondaryBtn: { paddingVertical: 10 },
  secondaryBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
});

export default TicketConfirmationScreen;
