import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet, View, ScrollView, TouchableOpacity,
  Image, Dimensions, Platform, StatusBar, Animated, Share, Linking,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCount } from '../utils/formatNumbers';
import { useLanguage } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');
const HERO_H = height * 0.46;

const EventDetailsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();
  const { event } = route.params;

  const ticketTypes = event.tickets || event.ticketTypes || [];
  const coverImage  = event.coverImage || event.image || event.flyers?.[0] || null;

  const [ticketCounts,   setTicketCounts]   = useState({});
  const [showTicketModal, setShowTicketModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [fadeAnim]));

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const spotsLeft = (() => {
    if (!ticketTypes.length) return 200;
    if (ticketTypes.some(t => t.isUnlimited)) return t('common.unlimited');
    return ticketTypes.reduce((s, t) => s + (t.availableQuantity || t.quantity || 0), 0);
  })();

  const calculateTotals = () => {
    let total = 0; let ticketCount = 0;
    ticketTypes.forEach(t => {
      const name  = t.name || t.type;
      const count = ticketCounts[name] || 0;
      total += count * (t.isFree ? 0 : (t.price || 0));
      ticketCount += count;
    });
    return { total, ticketCount };
  };

  const lowestPrice = ticketTypes.length
    ? ticketTypes.filter(t => !t.isFree).reduce((min, t) => Math.min(min, t.price || 0), Infinity)
    : null;
  const priceLabel = ticketTypes.some(t => t.isFree && ticketTypes.length === 1)
    ? t('common.free')
    : lowestPrice === Infinity || lowestPrice == null
      ? t('eventDetails.price.tickets')
      : t('eventDetails.price.from', { price: lowestPrice });

  const formatDate = (date) => {
    if (!date) return { day: '—', month: '—', weekday: '—', full: '—' };
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d)) return { day: date, month: '', weekday: '', full: date };
    return {
      day:     d.getDate(),
      month:   d.toLocaleDateString(locale, { month: 'short' }),
      weekday: d.toLocaleDateString(locale, { weekday: 'long' }),
      full:    d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  };

  const formatTime = (time) => {
    if (!time) return '—';
    if (typeof time === 'string') return time;
    return time.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const dateInfo  = formatDate(event.date);
  const startTime = formatTime(event.startTime);
  const endTime   = event.endTime ? formatTime(event.endTime) : null;
  const timeLabel = endTime ? `${startTime} – ${endTime}` : startTime;

  const handleOrganizerPress = () => {
    const organizerId   = event.organizerId || event.organizer?.id;
    const organizerName = typeof event.organizer === 'string' ? event.organizer : event.organizer?.name;
    if (!organizerId && !organizerName) return;
    navigation.navigate('OrganizerProfile', { organizerId, organizerName, organizerData: event.organizerData });
  };

  const openMaps = () => {
    const query = encodeURIComponent(
      event.address?.formatted ||
      [event.address?.street, event.address?.city, event.address?.state].filter(Boolean).join(', ') ||
      event.venue ||
      event.location ||
      ''
    );
    if (!query) return;
    const url = Platform.OS === 'ios'
      ? `maps://?q=${query}`
      : `geo:0,0?q=${query}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: t('eventDetails.share.message', { title: event.title }) });
    } catch {}
  };

  const handleCheckout = () => {
    const { total, ticketCount } = calculateTotals();
    navigation.navigate('Checkout', {
      tickets: ticketCounts, totalAmount: total, totalTickets: ticketCount,
      event, ticketTypes,
    });
  };

  const organizerName = typeof event.organizer === 'string'
    ? event.organizer
    : event.organizer?.name || t('common.eventOrganizer');

  const initials = organizerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Floating nav row ── */}
      <View style={[styles.floatNav, { top: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backTextBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="chevron-left" type="feather" size={18} color="#FFFFFF" />
          <Text style={styles.backTextLabel}>{t('eventDetails.backLabel')}</Text>
        </TouchableOpacity>

        {/* Absolutely centered so it ignores sibling widths */}
        {event.category ? (
          <Text style={styles.categoryText}>{event.category.toUpperCase()}</Text>
        ) : null}

        <TouchableOpacity onPress={handleShare} activeOpacity={0.8}>
          <Icon name="share" type="feather" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        {/* ── Hero image ── */}
        <View style={styles.hero}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Icon name="image" type="feather" size={48} color="rgba(255,255,255,0.2)" />
            </View>
          )}
          {/* Gradient + title at bottom of hero */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.97)']}
            style={styles.heroGradient}
          >
          <Text style={styles.eventTitle} numberOfLines={3}>{event.title}</Text>

          {/* Hosted by — inline, no card */}
          <TouchableOpacity style={styles.hostedByRow} onPress={handleOrganizerPress} activeOpacity={0.7}>
            <Text style={styles.hostedByLabel}>{t('eventDetails.hostedBy')}</Text>
            {event.organizer?.profilePicture ? (
              <Image source={{ uri: event.organizer.profilePicture }} style={styles.hostedByAvatar} />
            ) : (
              <View style={styles.hostedByAvatarPlaceholder}>
                <Text style={styles.hostedByInitials}>{initials}</Text>
              </View>
            )}
            <Text style={styles.hostedByName}>{organizerName}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

        {/* ── Info card ── */}
        <View style={styles.infoCard}>
          {/* Venue — tappable to open maps */}
          <TouchableOpacity style={styles.infoBlock} onPress={openMaps} activeOpacity={0.7}>
            <Text style={styles.infoBlockLabel}>{t('eventDetails.label.venue')}</Text>
            <Text style={styles.infoBlockValue} numberOfLines={2}>
              {event.venue || event.location || t('common.tba')}
            </Text>
            {event.address?.formatted || event.address?.city ? (
              <Text style={styles.infoBlockSub} numberOfLines={1}>
                {event.address.formatted || event.address.city}
              </Text>
            ) : null}
            <Text style={styles.infoBlockMapHint}>{t('eventDetails.openInMaps')}</Text>
          </TouchableOpacity>

          <View style={styles.infoSep} />

          {/* Date */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockLabel}>{t('eventDetails.label.date')}</Text>
            <Text style={styles.infoBlockBig}>{dateInfo.day}</Text>
            <Text style={styles.infoBlockValue}>{dateInfo.month}</Text>
          </View>

          <View style={styles.infoSep} />

          {/* Time + weekday */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoBlockLabel}>{t('eventDetails.label.time')}</Text>
            <Text style={styles.infoBlockValue}>{timeLabel}</Text>
            <Text style={styles.infoBlockSub}>{dateInfo.weekday}</Text>
          </View>
        </View>

        {/* ── Attendance strip ── */}
        <View style={styles.attendStrip}>
          <Text style={styles.attendText}>
            {t('eventDetails.attending', { count: formatCount(event.bookedSpots || 0) })}
          </Text>
          <View style={styles.attendDot} />
          <Text style={styles.attendText}>
            {t('eventDetails.spotsLeft', {
              count: spotsLeft === t('common.unlimited') ? t('common.unlimited') : formatCount(spotsLeft),
            })}
          </Text>
        </View>

        {/* ── About ── */}
        {event.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('eventDetails.section.about')}</Text>
            <Text style={styles.descText}>{event.description}</Text>
          </View>
        ) : null}


        {/* ── Available Tickets ── */}
        {ticketTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('eventDetails.section.tickets')}</Text>
            {ticketTypes.map((ticket, i) => {
              const name  = ticket.name || ticket.type;
              const spots = ticket.isUnlimited ? t('common.unlimited') : (ticket.availableQuantity || ticket.quantity || 0);
              const price = ticket.isFree ? t('common.free') : `$${ticket.price}`;
              return (
                <View key={i} style={[styles.ticketCard, i > 0 && { marginTop: 10 }]}>
                  <View style={styles.ticketCardTop}>
                    <Text style={styles.ticketName}>{name}</Text>
                    <Text style={styles.ticketPrice}>{price}</Text>
                  </View>
                  {((ticket.includes?.length > 0) || (ticket.perks?.length > 0)) && (
                    <View style={styles.ticketIncludes}>
                      {(ticket.includes || ticket.perks).filter(Boolean).map((item, j) => (
                        <Text key={j} style={styles.ticketIncludeItem}>· {item}</Text>
                      ))}
                    </View>
                  )}
                  <Text style={styles.spotsText}>
                    {spots === t('common.unlimited')
                      ? t('eventDetails.spots.unlimited')
                      : t('eventDetails.spots.remaining', { count: spots })}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Animated.ScrollView>

      {/* ── Bottom bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.getTicketsBtn} onPress={() => setShowTicketModal(true)} activeOpacity={0.85}>
          <LinearGradient
            colors={['#FF4B8C', '#e0356a']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.getTicketsGradient}
          >
            <Text style={styles.getTicketsText}>
              {lowestPrice != null && lowestPrice !== Infinity
                ? t('eventDetails.button.getTicketsWithPrice', { price: lowestPrice })
                : t('eventDetails.button.getTickets')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Ticket selection modal ── */}
      {showTicketModal && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowTicketModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('eventDetails.modal.title')}</Text>
              <TouchableOpacity onPress={() => setShowTicketModal(false)} activeOpacity={0.7}>
                <Icon name="x" type="feather" size={22} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
              {ticketTypes.map((ticket, i) => {
                const name  = ticket.name || ticket.type;
                const count = ticketCounts[name] || 0;
                const max   = ticket.isUnlimited ? 99 : (ticket.availableQuantity || ticket.quantity || 0);
                const price = ticket.isFree ? t('common.free') : `$${ticket.price}`;

                const updateCount = (delta) => {
                  const next = Math.max(0, Math.min(max, count + delta));
                  setTicketCounts(prev => ({ ...prev, [name]: next }));
                };

                return (
                  <View key={i} style={[styles.modalTicketRow, i > 0 && styles.modalTicketBorder]}>
                    <View style={styles.modalTicketInfo}>
                      <Text style={styles.modalTicketName}>{name}</Text>
                      <Text style={styles.modalTicketPrice}>{price}</Text>
                      {((ticket.includes?.length) || (ticket.perks?.length)) ? (
                        <View style={styles.modalIncludes}>
                          {(ticket.includes || ticket.perks).filter(Boolean).slice(0, 3).map((item, j) => (
                            <Text key={j} style={styles.modalIncludeText}>· {item}</Text>
                          ))}
                        </View>
                      ) : null}
                      {ticket.instructions?.trim() ? (
                        <Text style={styles.modalInstruction}>{ticket.instructions}</Text>
                      ) : null}
                    </View>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity style={[styles.qtyBtn, count === 0 && styles.qtyBtnDisabled]}
                        onPress={() => updateCount(-1)} disabled={count === 0} activeOpacity={0.7}>
                        <Icon name="minus" type="feather" size={14} color={count === 0 ? 'rgba(255,255,255,0.2)' : '#FFFFFF'} />
                      </TouchableOpacity>
                      <Text style={styles.qtyCount}>{count}</Text>
                      <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnAdd, count >= max && styles.qtyBtnDisabled]}
                        onPress={() => updateCount(1)} disabled={count >= max} activeOpacity={0.7}>
                        <Icon name="plus" type="feather" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.modalTotal}>
                <Text style={styles.modalTotalLabel}>{t('common.total')}</Text>
                <Text style={styles.modalTotalAmount}>${calculateTotals().total}</Text>
              </View>
              <TouchableOpacity
                style={[styles.checkoutBtn, calculateTotals().ticketCount === 0 && styles.checkoutBtnDisabled]}
                disabled={calculateTotals().ticketCount === 0}
                onPress={() => { setShowTicketModal(false); handleCheckout(); }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={calculateTotals().ticketCount === 0 ? ['#333', '#222'] : ['#FF4B8C', '#e0356a']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.checkoutGradient}
                >
                  <Text style={styles.checkoutText}>
                    {calculateTotals().ticketCount === 0
                      ? t('eventDetails.modal.selectTickets')
                      : t('eventDetails.modal.proceedCheckout')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  // Nav buttons floating over hero
  floatNav: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, zIndex: 20,
  },
  // Remove the old navBtn circle — share button is now bare icon
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  backTextBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backTextLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  categoryText: {
    position: 'absolute', left: 0, right: 0, textAlign: 'center',
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.8, textTransform: 'uppercase',
  },

  // Hero
  hero: { width, height: HERO_H, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 60, paddingHorizontal: 22, paddingBottom: 24,
  },
  eventTitle: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', lineHeight: 36, letterSpacing: -0.5, textTransform: 'uppercase' },

  // Info card
  infoCard: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: '#161616',
    marginHorizontal: 20, marginTop: 16, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  infoBlock: { flex: 1, padding: 16, justifyContent: 'center' },
  infoBlockLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  infoBlockBig: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', lineHeight: 34 },
  infoBlockValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', lineHeight: 20 },
  infoBlockSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  infoBlockMapHint: { fontSize: 10, color: '#FF4B8C', fontWeight: '600', marginTop: 5 },
  infoSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 14 },

  // Attendance strip
  attendStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 10,
  },
  attendText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  attendHighlight: { color: '#FFFFFF', fontWeight: '700' },
  attendDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  descText: { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 24 },

  // Hosted by (inline under title)
  hostedByRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  hostedByLabel: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  hostedByAvatar: { width: 24, height: 24, borderRadius: 12 },
  hostedByAvatarPlaceholder: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,75,140,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  hostedByInitials: { fontSize: 10, fontWeight: '700', color: '#FF4B8C' },
  hostedByName: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Ticket cards
  ticketCard: {
    backgroundColor: '#161616', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  ticketCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  ticketPrice: { fontSize: 18, fontWeight: '800', color: '#FF4B8C' },
  ticketIncludes: { marginBottom: 8, gap: 2 },
  ticketIncludeItem: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  spotsText: { fontSize: 12, color: '#4ade80', fontWeight: '500' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  getTicketsBtn: { borderRadius: 16, overflow: 'hidden' },
  getTicketsGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  getTicketsText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

  // Modal
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#111111',
    borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  modalTicketRow: { paddingHorizontal: 22, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalTicketBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  modalTicketInfo: { flex: 1 },
  modalTicketName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  modalTicketPrice: { fontSize: 16, fontWeight: '800', color: '#FF4B8C', marginBottom: 4 },
  modalIncludes: { gap: 2, marginBottom: 4 },
  modalIncludeText: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  modalInstruction: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginTop: 4 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  qtyBtnAdd: { backgroundColor: '#FF4B8C' },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyCount: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', minWidth: 20, textAlign: 'center' },

  modalFooter: { paddingHorizontal: 22, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  modalTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTotalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  modalTotalAmount: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  checkoutBtn: { borderRadius: 14, overflow: 'hidden' },
  checkoutBtnDisabled: { opacity: 0.5 },
  checkoutGradient: { paddingVertical: 15, alignItems: 'center' },
  checkoutText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});

export default EventDetailsScreen;
