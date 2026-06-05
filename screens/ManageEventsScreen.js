import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '../context/EventsContext';
import { formatCount } from '../utils/formatNumbers';
import { useAuth } from '../context/AuthContext';
import CustomNavBar from '../components/CustomNavBar';
import PortraitEventCard from '../components/PortraitEventCard';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const formatElapsed = (startTime) => {
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  if (Number.isNaN(start.getTime())) return '0:00';
  const diff = Math.max(0, Date.now() - start.getTime());
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const LiveTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(() => formatElapsed(startTime));

  useEffect(() => {
    const tick = () => setElapsed(formatElapsed(startTime));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return <Text style={liveTimerStyles.text}>{elapsed}</Text>;
};

const liveTimerStyles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ade80',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

const isUserEvent = (event, userId) =>
  event.organizer?.id === userId || event.organizerId === userId;

const ManageEventsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, locale } = useLanguage();
  const {
    events, deleteEvent, getLiveEvents, getUpcomingEvents, getPastEvents,
    triggerStatusUpdate, getEventStatus, getEventLiveStartTime,
  } = useEvents();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [filterOpen, setFilterOpen] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // widthAnim drives the container width (no native driver — layout prop)
  const widthAnim = useRef(new Animated.Value(0)).current;
  // slideAnim: 0 = pills off to the right, 1 = pills in place, -1 = pills off to the left
  const slideAnim = useRef(new Animated.Value(0)).current;

  const PILL_W = 94;
  const GAP = 8;
  const OPEN_W = PILL_W * 3 + GAP * 2;

  const openFilter = () => {
    setFilterOpen(true);
    Animated.parallel([
      Animated.spring(widthAnim, { toValue: 1, useNativeDriver: false, tension: 55, friction: 10 }),
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 55, friction: 10 }),
    ]).start();
  };

  const selectTab = (tab) => {
    Animated.parallel([
      Animated.spring(widthAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 14 }),
      Animated.spring(slideAnim, { toValue: -1, useNativeDriver: true, tension: 80, friction: 14 }),
    ]).start(() => {
      setActiveTab(tab);
      setFilterOpen(false);
      slideAnim.setValue(0);
    });
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Trigger status update when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      triggerStatusUpdate();
      if (route.params?.initialTab) {
        setActiveTab(route.params.initialTab);
        navigation.setParams({ initialTab: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, triggerStatusUpdate, route.params?.initialTab]);

  // Add automatic tab switching when events go live
  useEffect(() => {
    const checkForLiveEvents = () => {
      const userLiveEvents = getLiveEvents().filter(event => isUserEvent(event, user?.id));
      if (userLiveEvents.length > 0 && activeTab !== 'live') {
        setActiveTab('live');
      }
    };

    // Check immediately and then every minute
    checkForLiveEvents();
    const intervalId = setInterval(checkForLiveEvents, 60000);

    return () => clearInterval(intervalId);
  }, [events, user?.id]);

  const userLiveEventsCount = getLiveEvents().filter(event => isUserEvent(event, user?.id)).length;

  const filteredEvents = (() => {
    switch (activeTab) {
      case 'live':
        return getLiveEvents().filter(event => isUserEvent(event, user?.id));
      case 'past':
        return getPastEvents().filter(event => isUserEvent(event, user?.id));
      case 'upcoming':
      default:
        return getUpcomingEvents().filter(event => isUserEvent(event, user?.id));
    }
  })();

  const multiEvent = filteredEvents.length > 1;
  const gridCols   = multiEvent ? 2 : 1;
  const cardWidth  = multiEvent ? (width - 48) / 2 : width - 40;

  const renderEventCard = ({ item: event }) => {
    const status = getEventStatus(event);
    const isPast = status === 'completed';
    const isLive = status === 'live';
    const imgUri  = event.coverImage || event.flyers?.[0] || event.image;
    const dateStr = new Date(event.date).toLocaleDateString(locale, { day:'numeric', month:'short' });
    const timeStr = new Date(event.startTime).toLocaleTimeString(locale, { hour:'numeric', minute:'2-digit', hour12:true });
    const venue   = event.venue || event.location || t('common.locationTbd');
    const booked  = formatCount(event.bookedSpots || 0);
    const liveStart = getEventLiveStartTime(event);

    const onPress = () => {
      if (isPast) return navigation.navigate('EventStats', { event });
      if (isLive) return navigation.navigate('LiveEventStats', { event });
      navigation.navigate('EditEvent', { event });
    };

    const openGuestList = () => navigation.navigate('Attendees', { event, managerMode: true });

    const topRightActions = !isLive ? (
      <View style={styles.topRightActions}>
        <TouchableOpacity style={styles.topRightIconBtn} onPress={openGuestList} activeOpacity={0.75}>
          <Icon name="users" type="feather" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        {!isPast && (
          <TouchableOpacity style={styles.topRightIconBtn} onPress={() => deleteEvent(event.id)} activeOpacity={0.75}>
            <Icon name="trash-2" type="feather" size={16} color="#FF5050" />
          </TouchableOpacity>
        )}
      </View>
    ) : null;

    return (
      <Animated.View style={{
        width: cardWidth,
        opacity: fadeAnim,
        transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}>
        <PortraitEventCard
          width={cardWidth}
          aspectRatio={multiEvent ? 1.22 : 1.32}
          title={event.title}
          imageUri={imgUri}
          subtitle={`${dateStr} | ${timeStr}`}
          venue={venue}
          meta={isLive ? null : `${booked} booked`}
          topLeft={isLive && liveStart ? <LiveTimer startTime={liveStart} /> : null}
          price={null}
          isLive={isLive}
          liveDotOnly={isLive}
          onPress={onPress}
          topRight={topRightActions}
        />
      </Animated.View>
    );
  };

  const renderEmptyState = () => {
    const emptyStateConfig = {
      upcoming: { title: t('manageEvents.empty.upcoming') },
      live: { title: t('manageEvents.empty.live') },
      past: { title: t('manageEvents.empty.past') },
    };

    const config = emptyStateConfig[activeTab];

    return (
      <Animated.View style={[styles.emptyStateContainer, { opacity: fadeAnim }]}>
        <Text style={styles.emptyStateTitle}>{config.title}</Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1A1A1A', '#000000']} style={StyleSheet.absoluteFill} />

      {/* ── Lip header ── */}
      <Animated.View style={[styles.lip, { paddingTop: insets.top + 14, opacity: fadeAnim }]}>
        {/* Title row with New button inline */}
        <View style={styles.lipTitleRow}>
          <Text style={styles.headerTitle}>{t('manageEvents.title')}</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('Create')} activeOpacity={0.8}>
            <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']} style={styles.createButtonGradient}>
              <Icon name="plus" type="feather" size={16} color="#FFFFFF" />
              <Text style={styles.createButtonText}>{t('manageEvents.button.new')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Horizontal sliding filter pills */}
        <View style={styles.filterRow}>
          <View style={{ overflow: 'hidden' }}>
            <Animated.View style={[styles.filterPillsRow, {
              width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: [PILL_W, OPEN_W] }),
            }]}>
              <TouchableOpacity style={[styles.filterPill, styles.filterPillActive]} onPress={openFilter} activeOpacity={0.7}>
                <Text style={styles.filterPillTextActive}>
                  {t(`manageEvents.filter.${activeTab}`)}
                </Text>
              </TouchableOpacity>

              {['upcoming', 'live', 'past'].filter(t => t !== activeTab).map((tab, i) => (
                <Animated.View key={tab} style={{
                  transform: [{ translateX: slideAnim.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [-(i + 1) * (PILL_W + GAP), (i + 1) * (PILL_W + GAP), 0],
                  }) }],
                  opacity: slideAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, 1] }),
                }}>
                  <TouchableOpacity style={styles.filterPill} onPress={() => selectTab(tab)} activeOpacity={0.7}>
                    <Text style={styles.filterPillText}>{t(`manageEvents.filter.${tab}`)}</Text>
                    {tab === 'live' && userLiveEventsCount > 0 && (
                      <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>{userLiveEventsCount}</Text></View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      {/* Events list — 2-col grid when multiple, single portrait when one */}
      <FlatList
        key={`grid-${gridCols}`}
        data={filteredEvents}
        keyExtractor={item => item.id}
        renderItem={renderEventCard}
        numColumns={gridCols}
        columnWrapperStyle={multiEvent ? styles.gridRow : undefined}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />

      <CustomNavBar activeScreen="ManageEvents" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lip: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 22,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  lipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    width: 94,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  filterPillTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  liveBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 100,
    flexGrow: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topRightIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateCard: {
    width: '100%',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createEventButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createEventButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  createEventButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManageEventsScreen; 