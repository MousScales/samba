import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  FlatList,
  Animated,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, useTheme, Icon } from '@rneui/themed';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomNavBar from '../components/CustomNavBar';
import PortraitEventCard from '../components/PortraitEventCard';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCount } from '../utils/formatNumbers';
import { useSubtleEntrance } from '../utils/useSubtleEntrance';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 52;
const NAV_RESERVED = 110;

const CATEGORIES = [
  { id: 'Discover', key: 'home.category.discover', emoji: '🌐' },
  { id: 'Sports',   key: 'home.category.sports',   emoji: '⚽' },
  { id: 'Music',    key: 'home.category.music',    emoji: '🎵' },
  { id: 'Shows',    key: 'home.category.shows',    emoji: '🎭' },
  { id: 'Food',     key: 'home.category.food',     emoji: '🍔' },
  { id: 'Arts',     key: 'home.category.arts',     emoji: '🎨' },
  { id: 'Nightlife',key: 'home.category.nightlife',emoji: '🌙' },
];

const CATEGORY_KEYS = {
  Discover: 'home.category.discover',
  Sports: 'home.category.sports',
  Music: 'home.category.music',
  Shows: 'home.category.shows',
  Food: 'home.category.food',
  Arts: 'home.category.arts',
  Nightlife: 'home.category.nightlife',
};

const TimeFilter = ({ title, isActive, onPress }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { 
          backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(42, 42, 42, 0.8)',
          borderWidth: isActive ? 0 : 1,
          borderColor: isActive ? 'transparent' : theme.colors.border,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterText,
          { color: isActive ? '#FFFFFF' : theme.colors.textSecondary }
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const PriceFilter = ({ title, isActive, onPress }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { 
          backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(42, 42, 42, 0.8)',
          borderWidth: isActive ? 0 : 1,
          borderColor: isActive ? 'transparent' : theme.colors.border,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterText,
          { color: isActive ? '#FFFFFF' : theme.colors.textSecondary }
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const CARD_WIDTH = width - 32;

const EventCard = ({ event, onPress, animatedValue, cardWidth = CARD_WIDTH, aspectRatio = 1.32, bottomMargin = 14 }) => {
  const { t } = useLanguage();
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const isSoldOut = event.spotsLeft === 0;
  const isLive = event.originalEvent?.status === 'live';

  const spotsBadge = (
    <Text style={[styles.spotsText, isSoldOut && styles.spotsTextSoldOut]}>
      {event.spotsLeft === '∞' ? t('home.spots.unlimitedLeft') :
       isSoldOut ? t('home.spots.soldOut') :
       t('home.spots.left', { count: event.spotsLeft })}
    </Text>
  );

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        alignSelf: 'center',
        width: cardWidth,
      }}
    >
      <PortraitEventCard
        variant="attendee"
        width={cardWidth}
        aspectRatio={aspectRatio}
        title={event.title}
        imageUri={event.image}
        dateLabel={event.date}
        timeLabel={event.time || null}
        venue={event.location || t('common.venueTbd')}
        meta={event.category?.toUpperCase()}
        price={event.price}
        isLive={isLive}
        liveLabel={t('home.liveNow')}
        isSoldOut={isSoldOut}
        onPress={isSoldOut ? undefined : onPress}
        topRight={spotsBadge}
        bottomMargin={bottomMargin}
      />
    </Animated.View>
  );
};

// Enhanced organizer card for followed organizers
const FollowedOrganizerCard = ({ organizer, theme, onPress, animatedValue }) => {
  const { t } = useLanguage();
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Generate avatar initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Generate a consistent color based on name
  const getAvatarColor = (name) => {
    if (!name) return '#FF4B8C';
    const colors = ['#FF4B8C', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Clean up the organizer name (remove hash if it looks like one)
  const getDisplayName = (name) => {
    if (!name) return t('home.organizer.unknown');
    // If it's a long hash-like string, extract a more readable name
    if (name.length > 20 && name.includes('b') && name.includes('f')) {
      return t('common.eventOrganizer');
    }
    return name;
  };

  const displayName = getDisplayName(organizer.name);
  const avatarColor = getAvatarColor(displayName);
  const initials = getInitials(displayName);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity
        style={styles.followedOrganizerCard}
        activeOpacity={0.8}
        onPress={() => onPress(organizer)}
      >
        {/* Avatar section */}
        <View style={styles.organizerAvatarSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        </View>
        
        {/* Organizer info */}
        <View style={styles.organizerInfo}>
          <Text style={styles.organizerName} numberOfLines={1}>
            {displayName}
                </Text>
        </View>


      </TouchableOpacity>
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, locale } = useLanguage();
  const insets = useSafeAreaInsets();
  const { userLocation, locationPermission, requestLocationPermission } = useAuth();
  const { getUpcomingEvents, getLiveEvents, events, loading, followedOrganizers, isFollowingOrganizer, organizerFollowers, getEventsNearUser, getEventsByState } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);

  // Location panel state
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const locationSearchTimeout = useRef(null);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const feedListRef = useRef(null);
  const isLoopJumpingRef = useRef(false);

  const openLocationSheet = () => {
    setLocationOpen(true);
    Animated.spring(panelAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  };

  const closeLocationSheet = () => {
    Animated.spring(panelAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start(() => {
      setLocationOpen(false);
      setLocationSearch('');
      setLocationSuggestions([]);
    });
  };

  const toggleLocationSheet = () => {
    if (locationOpen) {
      closeLocationSheet();
    } else {
      openLocationSheet();
    }
  };

  // Category filter state
  const [activeCategory, setActiveCategory] = useState('Discover');

  const { fadeAnim, slideAnim } = useSubtleEntrance();

  const feedItemHeight = SCREEN_HEIGHT - insets.top - HEADER_HEIGHT - NAV_RESERVED;
  const feedCardWidth = width - 32;
  const feedCardAspect = (feedItemHeight - 20) / feedCardWidth;

  const formatEventsForDisplay = (events) => {
    if (!events) return [];
    
    return events.map(event => {
      // Calculate total spots left (available spots)
      const totalSpots = event.tickets.reduce((sum, ticket) => {
        if (ticket.isUnlimited) return '∞';
        // Use availableQuantity if it exists, otherwise use original quantity
        const availableCount = ticket.availableQuantity !== undefined ? ticket.availableQuantity : (ticket.quantity || 0);
        return sum === '∞' ? '∞' : sum + availableCount;
      }, 0);

      // Calculate price display
      const lowestPrice = event.tickets
        .filter(t => !t.isFree)
        .reduce((min, t) => Math.min(min, t.price || Infinity), Infinity);
      
      const hasUnlimitedFree = event.tickets.some(t => t.isFree && t.isUnlimited);
      const hasFreeTickets = event.tickets.some(t => t.isFree);
      
      let priceDisplay = t('common.free');
      if (!hasFreeTickets && lowestPrice !== Infinity) {
        priceDisplay = t('home.priceFrom', { price: lowestPrice });
      } else if (hasFreeTickets && lowestPrice !== Infinity) {
        priceDisplay = t('home.priceFreeToPaid', { price: lowestPrice });
      }

      const dateObj = event.date ? (event.date instanceof Date ? event.date : new Date(event.date)) : null;
      const validDate = dateObj && !isNaN(dateObj.getTime());

      return {
        id: event.id,
        title: event.title,
        date: validDate ? dateObj.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' }) : t('common.eventDate'),
        time: validDate ? dateObj.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
        location: event.venue || event.address?.formatted,
        category: event.category || t('common.event'),
        price: priceDisplay,
        spotsLeft: totalSpots,
        image: event.coverImage || event.flyers[0] || 'https://via.placeholder.com/300x200',
        organizer: event.organizer,
        originalEvent: event
      };
    });
  };

  // Get both upcoming and live events for the Featured Events section
  const upcomingEvents = getUpcomingEvents();
  const liveEvents = getLiveEvents();
  const featuredEvents = [...upcomingEvents, ...liveEvents]
    .filter(event => event.showOnExplore !== false) // Only show events that are set to appear on explore
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const displayEvents = formatEventsForDisplay(featuredEvents.slice(0, 10));

  // Get events near user's location
  const nearbyEvents = userLocation ? getEventsNearUser(userLocation, 50) : [];
  const displayNearbyEvents = formatEventsForDisplay(nearbyEvents.slice(0, 10));

  // Get events in user's state (fallback if no location)
  const stateEvents = userLocation?.state ? getEventsByState(userLocation.state) : [];
  const displayStateEvents = formatEventsForDisplay(stateEvents.slice(0, 10));

  // Get events by time periods
  const getTodayEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return [...upcomingEvents, ...liveEvents].filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    });
  };

  const getTomorrowEvents = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    
    return [...upcomingEvents, ...liveEvents].filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === tomorrow.getTime();
    });
  };

  const getThisWeekEvents = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return [...upcomingEvents, ...liveEvents].filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
  };

  const getFreeEvents = () => {
    return [...upcomingEvents, ...liveEvents].filter(event => 
      event.tickets && event.tickets.some(ticket => ticket.isFree)
    );
  };

  const getPaidEvents = () => {
    return [...upcomingEvents, ...liveEvents].filter(event => 
      event.tickets && event.tickets.some(ticket => !ticket.isFree)
    );
  };

  // Format events for different sections
  const todayEvents = formatEventsForDisplay(getTodayEvents().slice(0, 10));
  const tomorrowEvents = formatEventsForDisplay(getTomorrowEvents().slice(0, 10));
  const thisWeekEvents = formatEventsForDisplay(getThisWeekEvents().slice(0, 10));
  const freeEvents = formatEventsForDisplay(getFreeEvents().slice(0, 10));
  const paidEvents = formatEventsForDisplay(getPaidEvents().slice(0, 10));

  const feedEvents = useMemo(() => {
    const all = formatEventsForDisplay([...getUpcomingEvents(), ...getLiveEvents()]
      .filter(e => e.showOnExplore !== false)
      .sort((a, b) => new Date(a.date) - new Date(b.date)));
    if (activeCategory === 'Discover') return all;
    return all.filter(e =>
      e.category?.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [events, activeCategory, locale, t]);

  const feedLoopCount = feedEvents.length;
  const endlessFeedEvents = useMemo(() => {
    if (feedLoopCount <= 1) return feedEvents;
    return [...feedEvents, ...feedEvents, ...feedEvents];
  }, [feedEvents, feedLoopCount]);

  useEffect(() => {
    if (feedLoopCount <= 1 || !feedListRef.current) return undefined;
    const timer = setTimeout(() => {
      feedListRef.current?.scrollToOffset({
        offset: feedLoopCount * feedItemHeight,
        animated: false,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [activeCategory, feedLoopCount, feedItemHeight]);

  const handleFeedScrollEnd = (e) => {
    if (feedLoopCount <= 1 || isLoopJumpingRef.current) return;

    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / feedItemHeight);
    let jumpToIndex = null;

    if (index < feedLoopCount) {
      jumpToIndex = index + feedLoopCount;
    } else if (index >= feedLoopCount * 2) {
      jumpToIndex = index - feedLoopCount;
    }

    if (jumpToIndex == null) return;

    isLoopJumpingRef.current = true;
    feedListRef.current?.scrollToOffset({
      offset: jumpToIndex * feedItemHeight,
      animated: false,
    });
    requestAnimationFrame(() => {
      isLoopJumpingRef.current = false;
    });
  };

  // Debug logging
  console.log('🏠 HomeScreen Location Debug:', {
    locationPermission,
    userLocation,
    nearbyEvents: nearbyEvents.length,
    stateEvents: stateEvents.length,
    totalEvents: events.length,
    todayEvents: todayEvents.length,
    tomorrowEvents: tomorrowEvents.length,
    thisWeekEvents: thisWeekEvents.length,
    freeEvents: freeEvents.length,
    paidEvents: paidEvents.length,
  });

  // Location permission prompt
  const handleLocationRequest = async () => {
    if (locationPermission === null) {
      const result = await requestLocationPermission();
      if (!result.granted) {
        Alert.alert(
          t('home.alert.location.title'),
          t('home.alert.location.message'),
          [{ text: t('common.ok') }]
        );
      }
    }
  };

  const searchCities = async (query) => {
    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    setLocationSearching(true);
    try {
      const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&language=en&key=${GOOGLE_KEY}`
      );
      const data = await response.json();
      const seen = new Set();
      const cities = (data.predictions ?? [])
        .map(item => {
          const parts = item.description.split(', ');
          const city  = parts[0];
          const state = parts[1];
          const country = parts[parts.length - 1];
          return { id: item.place_id, city, state, country, display: item.description };
        })
        .filter(item => {
          if (!item.city || seen.has(item.city)) return false;
          seen.add(item.city);
          return true;
        });
      setLocationSuggestions(cities);
    } catch (e) {
      setLocationSuggestions([]);
    } finally {
      setLocationSearching(false);
    }
  };

  const handleLocationSearchChange = (text) => {
    setLocationSearch(text);
    if (locationSearchTimeout.current) clearTimeout(locationSearchTimeout.current);
    locationSearchTimeout.current = setTimeout(() => searchCities(text), 350);
  };

  const handleSelectCity = (suggestion) => {
    setSelectedCity(suggestion.city);
    closeLocationSheet();
  };

  const handleUseCurrentLocation = async () => {
    closeLocationSheet();
    setSelectedCity(null);
    await requestLocationPermission();
  };

  const displayCity = selectedCity || userLocation?.city || t('home.location.yourCity');

  const handleSearch = (text) => {
    setSearchQuery(text);
    // Filter events based on search query
    if (text) {
      const filtered = displayEvents.filter(event => 
        event.title.toLowerCase().includes(text.toLowerCase()) ||
        event.location.toLowerCase().includes(text.toLowerCase()) ||
        event.organizer.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents([]);
    }
  };

  const handleEventPress = (event) => {
    const eventData = event.originalEvent || event;
    navigation.navigate('EventDetails', { event: eventData });
  };

  const handleOrganizerPress = (organizer) => {
    navigation.navigate('OrganizerProfile', { 
      organizerId: organizer.id,
      organizerName: organizer.name 
    });
  };

  const handleSeeAllEvents = (filter = {}) => {
    navigation.navigate('Explore', { filter });
  };

  const renderEventCard = ({ item: event }) => (
    <EventCard
      event={event}
      onPress={() => handleEventPress(event)}
      animatedValue={fadeAnim}
      cardWidth={(width - 48) / 2}
    />
  );

  const EventSection = ({ title, events, onSeeAll, emptyMessage, emptySubtext }) => {
    const { t: tSection } = useLanguage();
    // Only render the section if there are events
    if (!events || events.length === 0) {
      return null;
    }

  return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={onSeeAll}
          >
            <Text style={[styles.seeAllText, { color: theme.colors.textSecondary }]}>
              {tSection('common.seeAll')}
            </Text>
            <Icon
              name="chevron-right"
              type="feather"
              size={16}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <FlatList
          data={events}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventsList}
          ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={[]}>
      <StatusBar barStyle="light-content" />

      {/* Always-visible status bar fill — keeps the top dark edge-to-edge */}
      <View style={{ height: insets.top, backgroundColor: '#1a1a1a' }} />

      {/* Location search panel — expands below status bar, pushes header + content down */}
      <Animated.View
        style={[
          styles.locationPanel,
          {
            maxHeight: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 400] }),
            opacity: panelAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          },
        ]}
        pointerEvents={locationOpen ? 'auto' : 'none'}
      >
        {/* Search input */}
        <View style={styles.locationSearchBar}>
          <Icon name="search" type="feather" size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.locationSearchInput}
            placeholder={t('home.location.searchPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={locationSearch}
            onChangeText={handleLocationSearchChange}
            autoFocus={locationOpen}
          />
          {locationSearching && <ActivityIndicator size="small" color="#FF4B8C" />}
        </View>

        {/* Suggestions */}
        {locationSuggestions.length > 0 && (
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {locationSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectCity(item)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionCity}>{item.city}</Text>
                  <Text style={styles.suggestionSub} numberOfLines={1}>{item.display}</Text>
                </View>
                <Icon name="arrow-up-right" type="feather" size={14} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Use Current Location */}
        <TouchableOpacity style={styles.useCurrentLocation} onPress={handleUseCurrentLocation} activeOpacity={0.7}>
          <Icon name="crosshair" type="feather" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.useCurrentLocationText}>{t('home.location.useCurrent')}</Text>
        </TouchableOpacity>

        {/* Pull handle */}
        <View style={styles.sheetHandle} />
      </Animated.View>

      {/* Header — always paddingTop: 12, panel above handles the safe area */}
      <View style={[styles.header, { paddingTop: 12 }]}>
        <Text style={styles.appNameText}>{t('brand.name')}</Text>

        {/* Location picker - right side */}
        <TouchableOpacity
          style={styles.locationPicker}
          activeOpacity={0.7}
          onPress={toggleLocationSheet}
        >
          <Text style={styles.locationCity}>{displayCity}</Text>
          <Icon
            name={locationOpen ? 'chevron-up' : 'chevron-down'}
            type="feather"
            size={14}
            color="#FF4B8C"
            style={{ marginLeft: 2 }}
          />
        </TouchableOpacity>
      </View>

      {/* TikTok-style feed — one event per screen, endless loop */}
      <FlatList
        ref={feedListRef}
        data={endlessFeedEvents}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        initialScrollIndex={feedLoopCount > 1 ? feedLoopCount : 0}
        pagingEnabled
        snapToInterval={feedItemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
        overScrollMode="never"
        onMomentumScrollEnd={handleFeedScrollEnd}
        onScrollEndDrag={handleFeedScrollEnd}
        getItemLayout={(_, index) => ({
          length: feedItemHeight,
          offset: feedItemHeight * index,
          index,
        })}
        renderItem={({ item: event }) => (
          <View style={[styles.feedPage, { height: feedItemHeight }]}>
            <EventCard
              event={event}
              onPress={() => handleEventPress(event)}
              animatedValue={fadeAnim}
              cardWidth={feedCardWidth}
              aspectRatio={feedCardAspect}
              bottomMargin={0}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyStateContainer, { height: feedItemHeight }]}>
            <Text style={[styles.emptyStateTitle, { color: '#FFFFFF', marginTop: 60 }]}>
              {activeCategory === 'Discover'
                ? t('home.empty.noEvents')
                : t('home.empty.noCategoryEvents', { category: t(CATEGORY_KEYS[activeCategory]) })}
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 }]}>
              {t('home.empty.checkBackSoon')}
            </Text>
          </View>
        }
      />
      
      <CustomNavBar activeScreen="Home" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  scrollView: {
    flex: 1,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 24,
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 71, 87, 0.5)', 
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed',
  },
  welcomeText: {
    fontSize: 16,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    paddingHorizontal: 24,
  },
  filtersSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  filtersRow: {
    paddingLeft: 16,
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 8,
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(64, 224, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  eventsList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  eventCard: {
    width: width - 32,
    height: 320,
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  eventImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  eventContentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    justifyContent: 'space-between',
  },
  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateBadge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  spotsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  spotsTextSoldOut: {
    color: 'rgba(255,255,255,0.7)',
  },
  eventBottomContent: {
    gap: 6,
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  eventDateTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  eventFooterOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  eventHeader: {
    marginBottom: 6,
  },
  eventDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textTransform: 'uppercase',
  },
  eventDetails: {},
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    marginRight: 6,
  },
  detailText: {
    fontSize: 12,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  spotsContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryPrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  organizerInfoContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  organizerAvatarContainer: {
    marginRight: 8,
  },
  organizerAvatarBorder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  organizerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  organizerName: {
    color: '#FFD700', // Yellow color for organizer names
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 18,
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  appNameText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  locationPicker: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationCity: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF4B8C',
    letterSpacing: 0.3,
    marginRight: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  locationPanel: {
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  locationSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  locationSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  suggestionsList: {
    maxHeight: 360,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  suggestionCity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  suggestionSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  useCurrentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  useCurrentLocationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 700,
  },
  categoriesScroll: {
    flexShrink: 0,
    marginTop: 4,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 10,
  },
  categoryPillActive: {
    backgroundColor: 'rgba(255,75,140,0.18)',
    borderColor: '#FF4B8C',
  },
  categoryEmoji: {
    fontSize: 15,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  categoryLabelActive: {
    color: '#FF4B8C',
  },
  eventsListVertical: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 120,
  },
  feedPage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateCard: {
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyIconContainer: {
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
  },
  noEventsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 90, // Account for navigation bar height
    justifyContent: 'center',
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  organizersList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  followedOrganizerCard: {
    width: 100,
    height: 120,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  organizerCardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  organizerCardHeader: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerAvatarSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  organizerInfo: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  organizerName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  organizerTitle: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  organizerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  followIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerCoverImage: {
    width: '100%',
    height: 180,
  },
  followedOrganizerInfo: {
    padding: 16,
    alignItems: 'center',
  },
  organizerEventCount: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  locationButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default HomeScreen; 