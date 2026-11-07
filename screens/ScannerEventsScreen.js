import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import SambaBackground from '../components/SambaBackground';
import CustomNavBar from '../components/CustomNavBar';
import { samba } from '../theme/samba';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchMyScannerEvents,
  getLocalScannerEventIds,
  mapRemoteScannerEvent,
} from '../services/scannerService';

export default function ScannerEventsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const {
    events, getEventStatus, getEventLiveStartTime,
    registerEventScanner, triggerStatusUpdate,
  } = useEvents();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const resolveLocalEvents = async (remoteRows) => {
    const remoteIds = new Set((remoteRows || []).map((r) => r.id));
    const localIds = await getLocalScannerEventIds(user?.id);
    const mergedIds = new Set([...remoteIds, ...localIds]);

    return [...mergedIds].map((id) => {
      const remote = remoteRows?.find((r) => r.id === id);
      if (remote) return mapRemoteScannerEvent(remote);
      const local = events.find((e) => e.id === id);
      if (!local) return null;
      return {
        id: local.id,
        title: local.title,
        date: local.date,
        startTime: local.startTime,
        endTime: local.endTime,
        venue: local.venue || local.address?.formatted,
        coverImage: local.coverImage || local.flyers?.[0],
        status: getEventStatus(local),
        verificationCode: local.verificationCode,
        _local: local,
      };
    }).filter(Boolean);
  };

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      await triggerStatusUpdate();
      const remote = await fetchMyScannerEvents();
      const rows = remote ?? [];
      const resolved = await resolveLocalEvents(rows);
      const upcomingOrLive = resolved.filter((ev) => {
        const status = ev._local ? getEventStatus(ev._local) : ev.status;
        return status === 'upcoming' || status === 'live';
      });
      upcomingOrLive.sort((a, b) => new Date(a.date) - new Date(b.date));
      setAssignments(upcomingOrLive);
    } catch (e) {
      console.warn('loadAssignments:', e);
    } finally {
      setLoading(false);
    }
  }, [events, user?.id]);

  useFocusEffect(useCallback(() => {
    loadAssignments();
  }, [loadAssignments]));

  const openScanner = async (item) => {
    const eventObj = item._local || events.find((e) => e.id === item.id);
    if (!eventObj) {
      Alert.alert(t('common.error'), t('scannerEvents.error.eventNotFound'));
      return;
    }

    const status = getEventStatus(eventObj);
    if (status !== 'live') {
      Alert.alert(
        t('scannerEvents.alert.notLive.title'),
        t('scannerEvents.alert.notLive.message'),
      );
      return;
    }

    await registerEventScanner(eventObj.id, {
      id: user?.id,
      name: user?.name || user?.email?.split('@')[0] || 'Scanner',
      email: user?.email,
      profilePicture: user?.profilePicture,
    });
    navigation.navigate('TicketScanner', { event: eventObj });
  };

  const formatDate = (ev) => {
    const d = ev.date instanceof Date ? ev.date : new Date(ev.date);
    if (Number.isNaN(d.getTime())) return t('common.tba');
    return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (ev) => {
    const tVal = ev.startTime;
    if (!tVal) return '';
    const d = tVal instanceof Date ? tVal : new Date(tVal);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const renderEvent = ({ item }) => {
    const eventObj = item._local || events.find((e) => e.id === item.id);
    const status = eventObj ? getEventStatus(eventObj) : item.status;
    const isLive = status === 'live';
    const img = item.coverImage;

    return (
      <TouchableOpacity
        style={[styles.card, !isLive && styles.cardUpcoming]}
        onPress={() => openScanner(item)}
        activeOpacity={isLive ? 0.85 : 0.7}
      >
        {img ? (
          <Image source={{ uri: img }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImageFallback]}>
            <Icon name="calendar" type="feather" size={28} color="rgba(255,255,255,0.2)" />
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.cardOverlay} />
        <View style={styles.cardContent}>
          <View style={[styles.statusPill, isLive ? styles.statusLive : styles.statusUpcoming]}>
            {isLive && <View style={styles.liveDot} />}
            <Text style={[styles.statusText, isLive && styles.statusTextLive]}>
              {isLive ? t('manageEvents.filter.live') : t('manageEvents.filter.upcoming')}
            </Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardMeta}>{formatDate(item)}{formatTime(item) ? ` · ${formatTime(item)}` : ''}</Text>
          {item.venue ? <Text style={styles.cardVenue} numberOfLines={1}>{item.venue}</Text> : null}
          {isLive ? (
            <View style={styles.scanCta}>
              <Icon name="maximize" type="feather" size={16} color="#FFF" />
              <Text style={styles.scanCtaText}>{t('scannerEvents.tapToScan')}</Text>
            </View>
          ) : (
            <Text style={styles.waitHint}>{t('scannerEvents.waitForStart')}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SambaBackground />

      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.title}>{t('scannerEvents.title')}</Text>
        <Text style={styles.subtitle}>{t('scannerEvents.subtitle')}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('VerificationCode', { returnTo: 'ScannerEvents' })}
          activeOpacity={0.85}
        >
          <Icon name="plus" type="feather" size={18} color="#FFF" />
          <Text style={styles.addBtnText}>{t('scannerEvents.addEvent')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={samba.pink} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <View style={styles.empty}>
              <Icon name="calendar" type="feather" size={40} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyTitle}>{t('scannerEvents.empty.title')}</Text>
              <Text style={styles.emptyMsg}>{t('scannerEvents.empty.message')}</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('VerificationCode', { returnTo: 'ScannerEvents' })}
              >
                <Text style={styles.emptyBtnText}>{t('scannerEvents.empty.button')}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <CustomNavBar activeScreen="ScannerEvents" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: samba.bgDeep },
  header: { paddingHorizontal: 22, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  subtitle: { fontSize: 14, color: samba.textMuted, marginBottom: 14 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: samba.pinkFaint,
    borderWidth: 1,
    borderColor: samba.pinkBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: samba.pink },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardUpcoming: { opacity: 0.92 },
  cardImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardImageFallback: { backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  cardOverlay: { ...StyleSheet.absoluteFillObject },
  cardContent: { padding: 18, minHeight: 200, justifyContent: 'flex-end' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
    gap: 6,
  },
  statusLive: { backgroundColor: 'rgba(74, 222, 128, 0.2)' },
  statusUpcoming: { backgroundColor: 'rgba(255,255,255,0.12)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: samba.green },
  statusText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  statusTextLive: { color: samba.green },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', textTransform: 'uppercase', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: samba.textMuted, marginBottom: 2 },
  cardVenue: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 10 },
  scanCta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  scanCtaText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  waitHint: { fontSize: 12, color: samba.textMuted, fontStyle: 'italic', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 16, marginBottom: 8 },
  emptyMsg: { fontSize: 14, color: samba.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: samba.pinkFaint,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: samba.pinkBorder,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: samba.pink },
});
