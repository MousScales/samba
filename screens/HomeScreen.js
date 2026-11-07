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
  Easing,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomNavBar from '../components/CustomNavBar';
import SambaBackground from '../components/SambaBackground';
import { samba } from '../theme/samba';
import PortraitEventCard from '../components/PortraitEventCard';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { getGoogleMapsApiKey } from '../config/env';
import { useLanguage } from '../context/LanguageContext';
import { useSubtleEntrance } from '../utils/useSubtleEntrance';

const { width } = Dimensions.get('window');
const ACCENT = samba.pink;
const SECONDARY = samba.green;
const FEATURED_WIDTH = width - 32;
const FEATURED_HEIGHT = 300;
const TRENDING_CARD_WIDTH = Math.round(width * 0.42);

const CARD_WIDTH = width - 32;

const TICKER_KEYS = [
  'home.ticker.discover',
  'home.ticker.tickets',
  'home.ticker.nightOut',
  'home.ticker.city',
  'home.ticker.variety',
  'home.ticker.secure',
  'home.ticker.local',
];

const TICKER_SEPARATOR = '          •          ';

const PromoTicker = () => {
  const { t } = useLanguage();
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);

  const tickerLine = useMemo(() => {
    const messages = TICKER_KEYS.map((key) => t(key));
    return messages.join(TICKER_SEPARATOR);
  }, [t]);

  useEffect(() => {
    if (!segmentWidth) return undefined;

    scrollAnim.setValue(0);
    const anim = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -segmentWidth,
        duration: segmentWidth * 18,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [segmentWidth, scrollAnim, tickerLine]);

  return (
    <View style={styles.tickerWrap}>
      <Animated.View
        style={[styles.tickerTrack, { transform: [{ translateX: scrollAnim }] }]}
      >
        <View
          style={styles.tickerSegment}
          onLayout={(e) => setSegmentWidth(e.nativeEvent.layout.width)}
        >
          <Text style={styles.tickerText} numberOfLines={1}>{tickerLine}</Text>
        </View>
        <View style={styles.tickerSegment}>
          <Text style={styles.tickerText} numberOfLines={1}>{tickerLine}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const FeaturedCard = ({ event, onPress }) => {
  const { t } = useLanguage();
  const isSoldOut = event.spotsLeft === 0;
  const spotsLabel = event.spotsLeft === '∞'
    ? t('home.spots.unlimitedLeft')
    : isSoldOut
      ? t('home.spots.soldOut')
      : t('home.spots.left', { count: event.spotsLeft });

  return (
    <TouchableOpacity
      style={[styles.featuredCard, { width: FEATURED_WIDTH, height: FEATURED_HEIGHT }]}
      onPress={isSoldOut ? undefined : onPress}
      activeOpacity={0.9}
      disabled={isSoldOut}
    >
      <Image source={{ uri: event.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.featuredContent}>
        <View style={styles.featuredTopRow}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>{t('home.featured').toUpperCase()}</Text>
          </View>
          <Text style={[styles.spotsText, isSoldOut && styles.spotsTextSoldOut]}>
            {spotsLabel}
          </Text>
        </View>

        <View style={styles.featuredBottom}>
          <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.featuredMetaRow}>
            <Icon name="map-pin" type="feather" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={styles.featuredMetaText} numberOfLines={1}>
              {(event.location || t('common.venueTbd')).toUpperCase()}
            </Text>
          </View>
          <View style={styles.featuredMetaRow}>
            <Icon name="calendar" type="feather" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={styles.featuredMetaText} numberOfLines={1}>
              {[event.date, event.time].filter(Boolean).join(' · ').toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.featuredCta, isSoldOut && styles.featuredCtaDisabled]}
            onPress={isSoldOut ? undefined : onPress}
            activeOpacity={0.85}
            disabled={isSoldOut}
          >
            <Text style={styles.featuredCtaText}>
              {isSoldOut ? t('home.spots.soldOut') : t('eventDetails.button.getTickets')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const FeaturedCarousel = ({ events, onEventPress, activeIndex, onIndexChange }) => {
  if (!events?.length) return null;

  return (
    <View style={styles.featuredSection}>
      <FlatList
        data={events}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={FEATURED_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.featuredList}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (FEATURED_WIDTH + 12));
          onIndexChange(Math.min(index, events.length - 1));
        }}
        keyExtractor={(item) => `featured-${item.id}`}
        renderItem={({ item }) => (
          <FeaturedCard event={item} onPress={() => onEventPress(item)} />
        )}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
      {events.length > 1 && (
        <View style={styles.carouselDots}>
          {events.map((_, i) => (
            <View
              key={i}
              style={[styles.carouselDot, i === activeIndex && styles.carouselDotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

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

const HomeScreen = ({ navigation }) => {
  const { t, locale } = useLanguage();
  const insets = useSafeAreaInsets();
  const { userLocation, locationPermission, requestLocationPermission, getCurrentLocation, updateUserLocation } = useAuth();
  const { getUpcomingEvents, getLiveEvents } = useEvents();
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Location panel state
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const locationSearchTimeout = useRef(null);
  const panelAnim = useRef(new Animated.Value(0)).current;
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

  const { fadeAnim } = useSubtleEntrance();

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
  const allDisplayEvents = formatEventsForDisplay(featuredEvents);

  const featuredDisplayEvents = allDisplayEvents.slice(0, 5);
  const trendingDisplayEvents = allDisplayEvents;

  const searchCities = async (query) => {
    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    setLocationSearching(true);
    try {
      const GOOGLE_KEY = getGoogleMapsApiKey();
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

  const handleSelectCity = async (suggestion) => {
    closeLocationSheet();
    try {
      const GOOGLE_KEY = getGoogleMapsApiKey();
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.id}&fields=geometry&key=${GOOGLE_KEY}`
      );
      const data = await res.json();
      const loc = data.result?.geometry?.location;
      await updateUserLocation({
        city: suggestion.city,
        state: suggestion.state,
        country: suggestion.country,
        latitude: loc?.lat,
        longitude: loc?.lng,
        source: 'manual',
      });
    } catch {
      await updateUserLocation({
        city: suggestion.city,
        state: suggestion.state,
        country: suggestion.country,
        source: 'manual',
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    closeLocationSheet();
    if (locationPermission !== true) {
      await requestLocationPermission();
    } else {
      await getCurrentLocation();
    }
  };

  const displayCity = userLocation?.city || t('home.location.yourCity');

  const handleEventPress = (event) => {
    const eventData = event.originalEvent || event;
    navigation.navigate('EventDetails', { event: eventData });
  };

  const handleSeeAllEvents = (filter = {}) => {
    navigation.navigate('Explore', { filter });
  };

  const renderTrendingCard = ({ item: event }) => (
    <EventCard
      event={event}
      onPress={() => handleEventPress(event)}
      animatedValue={fadeAnim}
      cardWidth={TRENDING_CARD_WIDTH}
      aspectRatio={1.45}
      bottomMargin={0}
    />
  );

  const EventSection = ({ title, events, onSeeAll }) => {
    const { t: tSection } = useLanguage();
    if (!events?.length) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>{tSection('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={events}
          renderItem={renderTrendingCard}
          keyExtractor={(item) => `trending-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventsList}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: samba.bgDeep }]} edges={[]}>
      <SambaBackground />
      <StatusBar barStyle="light-content" />

      <View style={{ height: insets.top, backgroundColor: samba.lip }} />

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

      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 }]}>
        <Text style={styles.appNameText} pointerEvents="none">{t('brand.name')}</Text>

        <TouchableOpacity
          style={styles.headerLocation}
          onPress={toggleLocationSheet}
          activeOpacity={0.7}
        >
          <Text style={styles.locationHeaderText} numberOfLines={1}>{displayCity}</Text>
          <Icon
            name={locationOpen ? 'chevron-up' : 'chevron-down'}
            type="feather"
            size={13}
            color="rgba(255,255,255,0.5)"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Featured carousel */}
        {featuredDisplayEvents.length > 0 ? (
          <FeaturedCarousel
            events={featuredDisplayEvents}
            onEventPress={handleEventPress}
            activeIndex={featuredIndex}
            onIndexChange={setFeaturedIndex}
          />
        ) : (
          <View style={styles.emptyFeatured}>
            <Text style={styles.emptyStateTitle}>{t('home.empty.noEvents')}</Text>
            <Text style={styles.emptyStateSubtext}>{t('home.empty.checkBackSoon')}</Text>
          </View>
        )}

        <PromoTicker />

        {/* Trending events */}
        <EventSection
          title={t('home.trending')}
          events={trendingDisplayEvents}
          onSeeAll={() => handleSeeAllEvents()}
        />

      </ScrollView>
      
      <CustomNavBar activeScreen="Home" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: samba.bgDeep,
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
    textShadowColor: 'rgba(255, 75, 140, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
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
    color: SECONDARY,
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: samba.lip,
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
  headerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  locationHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 110,
  },
  appNameText: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  featuredSection: {
    marginBottom: 8,
  },
  tickerWrap: {
    overflow: 'hidden',
    paddingVertical: 12,
    marginBottom: 4,
  },
  tickerTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickerSegment: {
    flexShrink: 0,
    paddingRight: 0,
  },
  tickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: SECONDARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  featuredList: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  featuredContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredBadge: {
    backgroundColor: SECONDARY,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  featuredBottom: {
    gap: 8,
  },
  featuredTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  featuredMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredMetaText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.3,
  },
  featuredCta: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: ACCENT,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  featuredCtaDisabled: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  featuredCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  carouselDotActive: {
    width: 18,
    backgroundColor: ACCENT,
  },
  emptyFeatured: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 32,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  locationPanel: {
    backgroundColor: samba.lip,
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
    paddingBottom: 130,
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