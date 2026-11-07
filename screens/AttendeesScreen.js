import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, View, FlatList, TouchableOpacity, Image,
  TextInput, Platform, StatusBar,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '../context/EventsContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCount } from '../utils/formatNumbers';

function buildGuestList(freshEvent, eventTickets) {
  const map = new Map();

  eventTickets.forEach(ticket => {
    const key = (ticket.buyerEmail || ticket.buyerName || ticket.id).toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: ticket.buyerName || 'Guest',
        email: ticket.buyerEmail || '',
        ticketCount: 0,
        checkedIn: 0,
        ticketTypes: [],
        onGuestList: false,
      });
    }
    const g = map.get(key);
    g.ticketCount += 1;
    if (ticket.isScanned || ticket.status === 'used') g.checkedIn += 1;
    if (ticket.ticketType && !g.ticketTypes.includes(ticket.ticketType)) {
      g.ticketTypes.push(ticket.ticketType);
    }
    if (ticket.joinedGuestList) g.onGuestList = true;
  });

  (freshEvent?.guestList || []).forEach(entry => {
    const key = (entry.email || entry.name || entry.id).toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        id: entry.id || key,
        name: entry.name || 'Guest',
        email: entry.email || '',
        ticketCount: entry.ticketCount || 0,
        checkedIn: 0,
        ticketTypes: [],
        onGuestList: true,
      });
    } else {
      const g = map.get(key);
      g.onGuestList = true;
      if ((entry.ticketCount || 0) > g.ticketCount) g.ticketCount = entry.ticketCount;
    }
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const FloatingProfile = ({ attendee }) => (
  <View style={styles.profileContainer}>
    <Image
      source={{ uri: attendee.avatar }}
      style={styles.profileImage}
    />
    <Text style={styles.attendeeName} numberOfLines={1}>{attendee.name}</Text>
  </View>
);

const ManagerGuestRow = ({ guest, t }) => {
  const initial = (guest.name || '?').charAt(0).toUpperCase();
  const allCheckedIn = guest.ticketCount > 0 && guest.checkedIn >= guest.ticketCount;

  return (
    <View style={styles.guestRow}>
      <View style={styles.guestAvatar}>
        <Text style={styles.guestInitial}>{initial}</Text>
      </View>
      <View style={styles.guestInfo}>
        <Text style={styles.guestName} numberOfLines={1}>{guest.name}</Text>
        {guest.email ? (
          <Text style={styles.guestEmail} numberOfLines={1}>{guest.email}</Text>
        ) : null}
        <View style={styles.guestMeta}>
          {guest.ticketCount > 0 && (
            <Text style={styles.guestMetaTxt}>
              {t('guestListScreen.tickets', { count: guest.ticketCount })}
              {guest.ticketTypes.length > 0 ? ` · ${guest.ticketTypes.join(', ')}` : ''}
            </Text>
          )}
          {guest.onGuestList && (
            <View style={styles.listBadge}>
              <Text style={styles.listBadgeTxt}>{t('guestListScreen.onList')}</Text>
            </View>
          )}
        </View>
      </View>
      {guest.ticketCount > 0 && (
        <View style={[styles.checkBadge, allCheckedIn && styles.checkBadgeDone]}>
          <Icon
            name={allCheckedIn ? 'check' : 'clock'}
            type="feather"
            size={11}
            color={allCheckedIn ? '#4ade80' : 'rgba(255,255,255,0.45)'}
          />
          <Text style={[styles.checkBadgeTxt, allCheckedIn && styles.checkBadgeTxtDone]}>
            {t('guestListScreen.checkedIn', { checked: guest.checkedIn, total: guest.ticketCount })}
          </Text>
        </View>
      )}
    </View>
  );
};

function AttendeesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { getUserTickets, getEventById } = useEvents();
  const { event, eventId: paramEventId, managerMode } = route.params || {};
  const resolvedEventId = event?.id || paramEventId;

  const [guests, setGuests] = useState([]);
  const [eventTitle, setEventTitle] = useState(event?.title || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    if (!managerMode) {
      navigation.goBack();
    }
  }, [navigation, managerMode]);

  useEffect(() => {
    const load = async () => {
      if (!resolvedEventId) {
        setGuests([]);
        setLoading(false);
        return;
      }
      try {
        const freshEvent = getEventById(resolvedEventId) || event;
        setEventTitle(freshEvent?.title || '');
        const allTickets = await getUserTickets('all');
        const eventTickets = Array.isArray(allTickets)
          ? allTickets.filter(ticket => ticket.eventId === resolvedEventId)
          : [];
        setGuests(buildGuestList(freshEvent, eventTickets));
      } catch (err) {
        console.error('Error loading guest list:', err);
        setGuests([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resolvedEventId, event, getUserTickets, getEventById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(g =>
      g.name.toLowerCase().includes(q) ||
      (g.email || '').toLowerCase().includes(q)
    );
  }, [guests, search]);

  const attendeeGridData = useMemo(() =>
    guests.map(g => ({
      id: g.id,
      name: g.name,
      email: g.email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=FF4B8C&color=fff&size=200`,
    })),
  [guests]);

  const title = managerMode ? t('guestListScreen.title') : t('screens.attendees');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1A1A1A', '#000000']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-left" type="feather" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{title}</Text>
          {managerMode && eventTitle ? (
            <Text style={styles.headerSub} numberOfLines={1}>{eventTitle}</Text>
          ) : null}
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Count + search (manager) */}
      {managerMode && (
        <View style={styles.searchSection}>
          <Text style={styles.countTxt}>
            {t('guestListScreen.count', { count: formatCount(guests.length) })}
          </Text>
          <View style={styles.searchBar}>
            <Icon name="search" type="feather" size={15} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('guestListScreen.searchPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="x" type="feather" size={14} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptySub}>{t('guestListScreen.loading')}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Icon name="users" type="feather" size={48} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTitle}>{t('guestListScreen.empty')}</Text>
          <Text style={styles.emptySub}>{t('guestListScreen.emptySub')}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ManagerGuestRow guest={item} t={t} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2, textTransform: 'uppercase' },
  headerRight: { width: 36 },
  searchSection: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 10 },
  countTxt: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#fff', padding: 0 },
  attendeeCount: {
    fontSize: 15, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', marginVertical: 16, fontWeight: '500',
  },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  guestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  guestAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,75,140,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,75,140,0.35)',
  },
  guestInitial: { fontSize: 16, fontWeight: '700', color: '#FF4B8C' },
  guestInfo: { flex: 1, gap: 2 },
  guestName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  guestEmail: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  guestMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  guestMetaTxt: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  listBadge: {
    backgroundColor: 'rgba(255,75,140,0.15)',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  listBadgeTxt: { fontSize: 10, fontWeight: '600', color: '#FF4B8C' },
  checkBadge: {
    alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  checkBadgeDone: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderColor: 'rgba(74,222,128,0.25)',
  },
  checkBadgeTxt: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  checkBadgeTxtDone: { color: '#4ade80' },
  gridContent: { paddingHorizontal: 20, paddingTop: 8 },
  gridRow: { justifyContent: 'flex-start', gap: 10, marginBottom: 15 },
  profileContainer: { width: '30%', alignItems: 'center', marginBottom: 8 },
  profileImage: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  attendeeName: {
    marginTop: 8, color: '#fff', fontSize: 12,
    fontWeight: '600', textAlign: 'center',
  },
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  emptySub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 },
});

export default AttendeesScreen;
