import React, { useState, useLayoutEffect } from 'react';
import {
  StyleSheet, View, ScrollView, TouchableOpacity,
  Image, StatusBar, TextInput, Alert, Platform, Switch,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { purchaseTicketsViaSupabase, syncEventForSharing } from '../services/eventsService';
import { isSupabaseConfigured } from '../config/supabase';

const fmt = (n) => `$${Number(n).toFixed(2)}`;

const CheckoutScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { saveTicketsFromPurchase } = useEvents();
  const { user, isAuthenticated } = useAuth();
  const { t, locale } = useLanguage();
  const { tickets, totalTickets, event, ticketTypes } = route.params;

  const formatEventDate = (date) => {
    if (!date) return t('common.eventDate');
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d)) return typeof date === 'string' ? date : t('common.eventDate');
      return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return t('common.eventDate'); }
  };

  const formatTime = (time) => {
    if (!time) return '';
    if (typeof time === 'string') return time;
    return time.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const [email,         setEmail]         = useState(user?.email || '');
  const [name,          setName]          = useState(user?.name || '');
  const [isLoading,     setIsLoading]     = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [joinGuestList, setJoinGuestList] = useState(true);

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  const selectedTickets = ticketTypes.filter(t => {
    const n = t.name || t.type;
    return tickets[n] && tickets[n] > 0;
  });

  const subtotal   = selectedTickets.reduce((s, t) => s + (tickets[t.name || t.type] || 0) * (t.price || 0), 0);
  const serviceFee = subtotal * 0.1;
  const finalTotal = subtotal + serviceFee;

  const handleCompletePurchase = async () => {
    if (!email.trim()) { Alert.alert(t('checkout.alert.missingInfo.title'), t('checkout.error.emailRequired')); return; }
    if (!name.trim())  { Alert.alert(t('checkout.alert.missingInfo.title'), t('checkout.error.nameRequired')); return; }
    if (!agreedToTerms) { Alert.alert(t('checkout.alert.termsRequired.title'), t('checkout.alert.termsRequired.message')); return; }
    if (!isSupabaseConfigured()) {
      Alert.alert(
        t('checkout.alert.purchaseFailed.title'),
        t('checkout.alert.configMissing'),
      );
      return;
    }

    setIsLoading(true);
    const demoPaymentId = `demo_${Date.now()}`;
    try {
      await syncEventForSharing(event, user?.id);

      const purchaseResult = await purchaseTicketsViaSupabase({
        eventId: event.id,
        tickets,
        buyerName: name.trim(),
        buyerEmail: email.trim(),
        joinGuestList,
        paymentId: demoPaymentId,
        paymentStatus: 'demo_completed',
        source: 'app',
      });

      if (isAuthenticated) {
        await saveTicketsFromPurchase(event, purchaseResult, {
          name: name.trim(),
          email: email.trim(),
          profilePicture: user?.profilePicture || null,
        });
      }

      navigation.navigate('TicketConfirmation', {
        event: {
          id: event.id, title: event.title,
          date:      event.date      ? new Date(event.date).toISOString()      : null,
          startTime: event.startTime ? new Date(event.startTime).toISOString() : null,
          venue: event.venue, address: event.address,
          coverImage: event.coverImage, flyers: event.flyers, image: event.image,
        },
        tickets, totalAmount: Number(finalTotal),
        email: email.trim(),
        orderId: purchaseResult.orderId,
        ticketNumber: purchaseResult.ticketNumber,
        purchasedTickets: purchaseResult.tickets || [],
        paymentId: demoPaymentId,
        isGuest: !isAuthenticated,
      });
    } catch (error) {
      Alert.alert(t('checkout.alert.purchaseFailed.title'), error.message || t('checkout.alert.purchaseFailed.message'));
    } finally {
      setIsLoading(false);
    }
  };

  const coverImage = event.coverImage || event.image || event.flyers?.[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Icon name="chevron-left" type="feather" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('checkout.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}>

        {/* ── Event preview ── */}
        <View style={styles.eventCard}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.eventImg} resizeMode="cover" />
          ) : (
            <View style={[styles.eventImg, styles.eventImgPlaceholder]}>
              <Icon name="image" type="feather" size={32} color="rgba(255,255,255,0.2)" />
            </View>
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.eventImgGrad}>
            <Text style={styles.eventCardTitle} numberOfLines={2}>{event.title}</Text>
            <Text style={styles.eventCardSub}>
              {formatEventDate(event.date)}
              {event.startTime ? `  ·  ${formatTime(event.startTime)}` : ''}
              {event.venue ? `\n${event.venue}` : ''}
            </Text>
          </LinearGradient>
        </View>

        {/* ── Guest + demo notice ── */}
        <View style={styles.demoCard}>
          <Icon name="mail" type="feather" size={15} color="#FF4B8C" />
          <Text style={styles.demoText}>
            {isAuthenticated ? t('checkout.demoNotice') : t('checkout.guestNotice')}
          </Text>
        </View>

        {/* ── Order summary ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('checkout.section.orderSummary')}</Text>

          {selectedTickets.map((ticket, i) => {
            const name    = ticket.name || ticket.type;
            const qty     = tickets[name] || 0;
            const price   = ticket.isFree ? 0 : (ticket.price || 0);
            const lineAmt = qty * price;
            return (
              <View key={i} style={[styles.ticketRow, i > 0 && styles.ticketRowBorder]}>
                <View style={styles.ticketRowLeft}>
                  <Text style={styles.ticketRowName}>{name}</Text>
                  <Text style={styles.ticketRowPrice}>{ticket.isFree ? t('common.free') : t('checkout.priceEach', { price: fmt(price) })}</Text>
                  {(ticket.includes || ticket.perks || []).filter(Boolean).map((item, j) => (
                    <Text key={j} style={styles.ticketInclude}>· {item}</Text>
                  ))}
                  {ticket.instructions?.trim() ? (
                    <Text style={styles.ticketInstruction}>{ticket.instructions}</Text>
                  ) : null}
                </View>
                <View style={styles.ticketRowRight}>
                  <Text style={styles.ticketQty}>{qty}×</Text>
                  <Text style={styles.ticketLineAmt}>{ticket.isFree ? t('common.free') : fmt(lineAmt)}</Text>
                </View>
              </View>
            );
          })}

          <View style={styles.sep} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('checkout.label.subtotal')}</Text>
            <Text style={styles.summaryValue}>{fmt(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelMuted}>{t('checkout.label.serviceFee')}</Text>
            <Text style={styles.summaryValueMuted}>{fmt(serviceFee)}</Text>
          </View>

          <View style={styles.sep} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('common.total')}</Text>
            <Text style={styles.totalAmount}>{fmt(finalTotal)}</Text>
          </View>
        </View>

        {/* ── Contact info ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('checkout.section.contactInfo')}</Text>

          <Text style={styles.fieldLabel}>{t('checkout.label.fullName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('checkout.placeholder.fullName')}
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{t('checkout.label.email')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('checkout.placeholder.email')}
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* ── Guest list toggle ── */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{t('checkout.guestList.label')}</Text>
              <Text style={styles.toggleDesc}>
                {t('checkout.guestList.description')}
              </Text>
            </View>
            <Switch
              value={joinGuestList}
              onValueChange={setJoinGuestList}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#FF4B8C' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ── Terms ── */}
        <TouchableOpacity style={styles.termsRow} onPress={() => setAgreedToTerms(v => !v)} activeOpacity={0.7}>
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Icon name="check" type="feather" size={13} color="#FFFFFF" />}
          </View>
          <Text style={styles.termsText}>{t('checkout.terms.agree')}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Bottom bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.purchaseBtn, (!agreedToTerms || isLoading) && { opacity: 0.5 }]}
          onPress={handleCompletePurchase}
          disabled={isLoading || !agreedToTerms}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#FF4B8C', '#e0356a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.purchaseBtnGradient}>
            <Text style={styles.purchaseBtnText}>
              {isLoading ? t('checkout.button.processing') : t('checkout.button.completePurchase', { total: fmt(finalTotal) })}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },

  // Event preview
  eventCard: { height: 160, borderRadius: 18, overflow: 'hidden', backgroundColor: '#161616' },
  eventImg: { width: '100%', height: '100%' },
  eventImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  eventImgGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 40, paddingBottom: 14,
  },
  eventCardTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 4, textTransform: 'uppercase' },
  eventCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },

  // Demo banner
  demoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(255,75,140,0.08)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,75,140,0.2)',
  },
  demoText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },

  // Cards
  card: {
    backgroundColor: '#161616', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16,
  },

  // Ticket rows
  ticketRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  ticketRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  ticketRowLeft: { flex: 1 },
  ticketRowName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  ticketRowPrice: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  ticketInclude: { fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 18 },
  ticketInstruction: { fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', marginTop: 4 },
  ticketRowRight: { alignItems: 'flex-end', gap: 2 },
  ticketQty: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  ticketLineAmt: { fontSize: 16, fontWeight: '700', color: '#FF4B8C' },

  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 12 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  summaryValue: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  summaryLabelMuted: { fontSize: 13, color: 'rgba(255,255,255,0.35)' },
  summaryValueMuted: { fontSize: 13, color: 'rgba(255,255,255,0.35)' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  totalAmount: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },

  // Contact inputs
  fieldLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#FFFFFF',
  },

  // Guest list toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  toggleDesc: { fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 18 },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#FF4B8C', borderColor: '#FF4B8C' },
  termsText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  purchaseBtn: { borderRadius: 16, overflow: 'hidden' },
  purchaseBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  purchaseBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
});

export default CheckoutScreen;
