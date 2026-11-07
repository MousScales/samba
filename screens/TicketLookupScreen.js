import React, { useState, useLayoutEffect } from 'react';
import {
  StyleSheet, View, ScrollView, TouchableOpacity,
  TextInput, Alert, StatusBar, Platform, Image, KeyboardAvoidingView,
} from 'react-native';
import { Text } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { lookupTicketsViaSupabase } from '../services/eventsService';
import { useLanguage } from '../context/LanguageContext';

const TicketLookupScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();
  const [email, setEmail] = useState(route.params?.email || '');
  const [orderId, setOrderId] = useState(route.params?.orderId || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  const formatDate = (d) => {
    if (!d) return t('common.tba');
    try {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return t('common.tba');
      return dt.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return t('common.tba'); }
  };

  const formatTime = (time) => {
    if (!time) return t('common.tba');
    try {
      const dt = new Date(time);
      if (Number.isNaN(dt.getTime())) return t('common.tba');
      return dt.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return t('common.tba'); }
  };

  const handleLookup = async () => {
    if (!email.trim()) {
      Alert.alert(t('ticketLookup.alert.missingEmail.title'), t('ticketLookup.alert.missingEmail.message'));
      return;
    }
    if (!orderId.trim()) {
      Alert.alert(t('ticketLookup.alert.missingOrder.title'), t('ticketLookup.alert.missingOrder.message'));
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await lookupTicketsViaSupabase(orderId.trim(), email.trim());
      setResult(data);
    } catch (error) {
      Alert.alert(t('ticketLookup.alert.notFound.title'), error.message || t('ticketLookup.alert.notFound.message'));
    } finally {
      setLoading(false);
    }
  };

  const tickets = Array.isArray(result?.tickets) ? result.tickets : [];
  const coverImage = result?.event?.coverImage;
  const confirmId = (result?.orderId || result?.ticketNumber || '').toString().slice(-8).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={styles.backLabel}>{t('ticketLookup.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ticketLookup.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>{t('ticketLookup.subtitle')}</Text>

          <View style={styles.block}>
            <Text style={styles.blockLabel}>{t('ticketLookup.label.email')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('ticketLookup.placeholder.email')}
              placeholderTextColor="rgba(255,255,255,0.22)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.block}>
            <Text style={styles.blockLabel}>{t('ticketLookup.label.orderId')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('ticketLookup.placeholder.orderId')}
              placeholderTextColor="rgba(255,255,255,0.22)"
              value={orderId}
              onChangeText={setOrderId}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.lookupBtn, loading && { opacity: 0.5 }]}
            onPress={handleLookup}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FF4B8C', '#e0356a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.lookupBtnGrad}
            >
              <Text style={styles.lookupBtnText}>
                {loading ? t('ticketLookup.button.loading') : t('ticketLookup.button.find')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {result && (
            <>
              <View style={styles.block}>
                {coverImage ? (
                  <Image source={{ uri: coverImage }} style={styles.eventImage} resizeMode="cover" />
                ) : (
                  <View style={styles.eventImagePlaceholder} />
                )}
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {result.event?.title || t('common.event')}
                </Text>
                {result.event?.venue ? (
                  <Text style={styles.eventVenue}>{result.event.venue}</Text>
                ) : null}
                <View style={styles.metaRow}>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>{t('ticketConfirmation.label.date')}</Text>
                    <Text style={styles.metaValue}>{formatDate(result.event?.date)}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>{t('ticketConfirmation.label.time')}</Text>
                    <Text style={styles.metaValue}>{formatTime(result.event?.startTime)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.block}>
                <Text style={styles.blockLabel}>{t('ticketLookup.section.order')}</Text>
                {confirmId ? (
                  <Text style={styles.orderId}>{t('ticketConfirmation.confirmId', { confirmId })}</Text>
                ) : null}
                <Text style={styles.orderMeta}>
                  {t('ticketLookup.ticketCount', { count: tickets.length })}
                </Text>
                {tickets.map((ticket, index) => (
                  <View
                    key={ticket.id || index}
                    style={[styles.ticketRow, index > 0 && styles.ticketRowBorder]}
                  >
                    <Text style={styles.ticketRowName}>{ticket.ticketType}</Text>
                    <Text style={[
                      styles.ticketRowStatus,
                      ticket.status === 'used' && styles.ticketRowStatusUsed,
                    ]}>
                      {ticket.status === 'used' ? t('ticketLookup.status.used') : t('ticketLookup.status.valid')}
                    </Text>
                  </View>
                ))}
              </View>

              {tickets.map((ticket, index) => (
                <View key={ticket.id || index} style={styles.block}>
                  <Text style={styles.blockLabel}>
                    {tickets.length > 1 ? ticket.ticketType : t('ticketLookup.section.qr')}
                  </Text>
                  <View style={styles.qrCenter}>
                    <QRCode
                      value={ticket.qrCode || ticket.id}
                      size={128}
                      backgroundColor="transparent"
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.qrHint}>{t('ticketConfirmation.qrHint')}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  backBtn: { minWidth: 56 },
  backLabel: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  scroll: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },

  lead: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.38)',
    lineHeight: 21,
    marginBottom: 4,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  block: {
    backgroundColor: '#141414',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  lookupBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  lookupBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  lookupBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },

  eventImage: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    marginBottom: 16,
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  eventVenue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.42)',
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  metaCell: { flex: 1, alignItems: 'center' },
  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  orderId: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  orderMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.38)',
    marginBottom: 14,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  ticketRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  ticketRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  ticketRowStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4ade80',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ticketRowStatusUsed: {
    color: 'rgba(255,255,255,0.35)',
  },

  qrCenter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  qrHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.28)',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
});

export default TicketLookupScreen;
