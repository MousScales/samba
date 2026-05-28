import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  Platform, 
  TextInput,
  Animated,
  ScrollView,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { Text, useTheme, Icon, Button } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomNavBar from '../components/CustomNavBar';
import { StatusBar } from 'expo-status-bar';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const FullScreenEvent = React.memo(({ event, index, scrollY, onPress }) => {
  const { theme } = useTheme();
  // Calculate position safely to avoid NaN values
  const itemPosition = index * height;
  
  // Optimization: Memoize interpolation to reduce calculations
  const scale = useMemo(() => {
    return scrollY.interpolate({
      inputRange: [
        itemPosition - height, 
        itemPosition, 
        itemPosition + height
      ],
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp'
    });
  }, [scrollY, itemPosition]);

  return (
    <Animated.View 
      style={[
        styles.fullEventContainer,
        { transform: [{ scale }] }
      ]}
    >
      <Image
        source={{ uri: event.image }}
        style={styles.fullEventImage}
        resizeMode="cover"
      />
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
        style={styles.fullEventOverlay}
      />
      
      <SafeAreaView style={styles.eventContentContainer}>
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventCategory}>{event.category}</Text>
            <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
            <Text style={styles.eventOrganizer}>By {event.organizer}</Text>
          </View>
          
          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Icon
                name="calendar"
                type="feather"
                size={16}
                color="#FFD700"
                style={styles.detailIcon}
              />
              <Text style={styles.detailText} numberOfLines={1}>
                {event.date} at {event.time}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Icon
                name="map-pin"
                type="feather"
                size={16}
                color="#FFD700"
                style={styles.detailIcon}
              />
              <Text style={styles.detailText} numberOfLines={2}>
                {event.location}
              </Text>
            </View>

            <Text style={styles.eventDescription} numberOfLines={3}>{event.description}</Text>
          </View>

          <View style={styles.eventFooter}>
            <View style={styles.footerTopRow}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Price</Text>
                <Text style={styles.priceValue} numberOfLines={1}>{event.price}</Text>
              </View>
              
              <View style={styles.spotsContainer}>
                <Text style={[
                  styles.spotsText, 
                  event.spotsLeft === 0 && { color: '#FF3B30' }
                ]} numberOfLines={1}>
                  {event.spotsLeft === '∞' ? '∞ spots available' : 
                   event.spotsLeft === 0 ? 'Sold Out' : 
                   `${event.spotsLeft} spots left`}
                </Text>
              </View>
            </View>
            
            <View style={styles.footerBottomRow}>
              <Button
                title={event.spotsLeft === 0 ? "Sold Out" : "Get Tickets"}
                buttonStyle={[
                  styles.ticketButton,
                  event.spotsLeft === 0 && { backgroundColor: 'rgba(255, 59, 48, 0.8)' }
                ]}
                containerStyle={styles.ticketButtonContainer}
                onPress={event.spotsLeft === 0 ? undefined : () => onPress(event)}
                disabled={event.spotsLeft === 0}
                icon={event.spotsLeft === 0 ? undefined : {
                  name: 'ticket',
                  type: 'font-awesome',
                  size: 16,
                  color: 'white',
                  style: { marginRight: 10 }
                }}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
});

const FilterOption = ({ title, isActive, onPress, animatedValue }) => {
  const opacity = animatedValue ? animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  }) : 1;
  
  const translateX = animatedValue ? animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  }) : 0;
  
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateX }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.filterOption,
          isActive ? styles.activeFilterOption : {}
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={isActive ? styles.activeFilterText : styles.inactiveFilterText}>
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ExploreHeader = ({ 
  onSearch, 
  fadeAnim, 
  slideAnim, 
  activeTimeFilter, 
  activePriceFilter, 
  activeLocationFilter,
  onTimeFilterChange, 
  onPriceFilterChange,
  onLocationFilterChange,
  onClearFilters 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { theme } = useTheme();
  
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (onSearch) onSearch(text);
  };
  
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const closeFilters = () => {
    if (showFilters) {
      setShowFilters(false);
    }
  };
  
  const titleOpacity = fadeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });
  
  const searchBarTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  return (
    <TouchableWithoutFeedback onPress={closeFilters}>
      <SafeAreaView style={styles.exploreHeader}>
        <Animated.View style={[styles.headerTop, { opacity: titleOpacity }]}>
          <Text style={styles.headerTitle}>Discover</Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.searchContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: searchBarTranslateY }]
            }
          ]}
        >
          <Icon
            name="search"
            type="feather"
            size={20}
            color="rgba(255,255,255,0.6)"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity 
            style={styles.filterMenuButton}
            onPress={toggleFilters}
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>
        </Animated.View>
        
        {showFilters && (
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.filtersDropdown}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>When</Text>
                <View style={styles.filterOptions}>
                  <FilterOption 
                    title="All"
                    isActive={activeTimeFilter === 'all'} 
                    onPress={() => onTimeFilterChange('all')} 
                    animatedValue={fadeAnim}
                  />
                  <FilterOption 
                    title="Today" 
                    isActive={activeTimeFilter === 'today'} 
                    onPress={() => onTimeFilterChange('today')} 
                    animatedValue={fadeAnim}
                  />
                  <FilterOption 
                    title="Tomorrow" 
                    isActive={activeTimeFilter === 'tomorrow'} 
                    onPress={() => onTimeFilterChange('tomorrow')} 
                    animatedValue={fadeAnim}
                  />
                  <FilterOption 
                    title="This Week" 
                    isActive={activeTimeFilter === 'thisWeek'} 
                    onPress={() => onTimeFilterChange('thisWeek')} 
                    animatedValue={fadeAnim}
                  />
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Price</Text>
                <View style={styles.filterOptions}>
                  <FilterOption 
                    title="Any Price" 
                    isActive={activePriceFilter === 'any'} 
                    onPress={() => onPriceFilterChange('any')} 
                    animatedValue={fadeAnim}
                  />
                  <FilterOption 
                    title="Free" 
                    isActive={activePriceFilter === 'free'} 
                    onPress={() => onPriceFilterChange('free')} 
                    animatedValue={fadeAnim}
                  />
                  <FilterOption 
                    title="Paid" 
                    isActive={activePriceFilter === 'paid'} 
                    onPress={() => onPriceFilterChange('paid')} 
                    animatedValue={fadeAnim}
                  />
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Location</Text>
                <View style={styles.filterOptions}>
                  <FilterOption 
                    title="All Locations" 
                    isActive={activeLocationFilter === 'all'} 
                    onPress={() => onLocationFilterChange('all')} 
                    animatedValue={fadeAnim}
                  />
                  <FilterOption 
                    title="Near Me" 
                    isActive={activeLocationFilter === 'nearMe'} 
                    onPress={() => onLocationFilterChange('nearMe')} 
                    animatedValue={fadeAnim}
                  />
                </View>
              </View>

              {(activeTimeFilter !== 'all' || activePriceFilter !== 'any' || activeLocationFilter !== 'all') && (
                <TouchableOpacity 
                  style={styles.clearFiltersButton}
                  onPress={onClearFilters}
                >
                  <Text style={styles.clearFiltersText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const ExploreScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { userLocation } = useAuth();
  const { getUpcomingEvents, getLiveEvents, events, loading, getEventsNearUser, getEventsByState } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTimeFilter, setActiveTimeFilter] = useState('all');
  const [activePriceFilter, setActivePriceFilter] = useState('any');
  const [activeLocationFilter, setActiveLocationFilter] = useState('all');
  const [filteredEvents, setFilteredEvents] = useState([]);

  // Handle incoming filters from HomeScreen
  useEffect(() => {
    if (route.params?.filter) {
      const { timeFilter, priceFilter, category, locationFilter } = route.params.filter;
      if (timeFilter) setActiveTimeFilter(timeFilter);
      if (priceFilter) setActivePriceFilter(priceFilter);
      if (category) setActiveCategory(category);
      if (locationFilter) setActiveLocationFilter(locationFilter);
    }
  }, [route.params?.filter]);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Animation for list appearance
  const listOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });
  
  const listTranslateY = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -5],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Helper functions for filtering
  const applyTimeFilter = (events, timeFilter) => {
    if (timeFilter === 'all') return events;
    
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    switch (timeFilter) {
      case 'today':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return events.filter(event => {
          const eventDate = new Date(event.originalEvent.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });
        
      case 'tomorrow':
        const tomorrowDate = new Date(today);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        return events.filter(event => {
          const eventDate = new Date(event.originalEvent.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === tomorrowDate.getTime();
        });
        
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        return events.filter(event => {
          const eventDate = new Date(event.originalEvent.date);
          return eventDate >= startOfWeek && eventDate <= endOfWeek;
        });
        
      default:
        return events;
    }
  };

  const applyPriceFilter = (events, priceFilter) => {
    if (priceFilter === 'any') return events;
    
    switch (priceFilter) {
      case 'free':
        return events.filter(event => 
          event.originalEvent.tickets && 
          event.originalEvent.tickets.some(ticket => ticket.isFree)
        );
        
      case 'paid':
        return events.filter(event => 
          event.originalEvent.tickets && 
          event.originalEvent.tickets.some(ticket => !ticket.isFree)
        );
        
      default:
        return events;
    }
  };

  const applyLocationFilter = (events, locationFilter) => {
    if (locationFilter === 'all') return events;
    
    switch (locationFilter) {
      case 'nearMe':
        if (!userLocation?.latitude || !userLocation?.longitude) {
          // If no location, fallback to state-based filtering
          return events.filter(event => {
            if (!userLocation?.state) return true;
            return event.originalEvent?.address?.state === userLocation.state;
          });
        }
        
        // Calculate distance for each event and filter within 50 miles
        return events.filter(event => {
          const eventAddress = event.originalEvent?.address;
          if (!eventAddress?.coordinates?.latitude || !eventAddress?.coordinates?.longitude) {
            return false;
          }
          
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            eventAddress.coordinates.latitude,
            eventAddress.coordinates.longitude
          );
          
          return distance <= 50; // 50 mile radius
        });
        
      default:
        return events;
    }
  };

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    // Filter events based on search, category, time, price, and location
    let filtered = allFormattedEvents;
    
    if (searchQuery) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (activeCategory !== 'all') {
      filtered = filtered.filter(event => 
        event.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }
    
    // Apply time filter
    filtered = applyTimeFilter(filtered, activeTimeFilter);
    
    // Apply price filter
    filtered = applyPriceFilter(filtered, activePriceFilter);
    
    // Apply location filter
    filtered = applyLocationFilter(filtered, activeLocationFilter);
    
    setFilteredEvents(filtered);
  }, [searchQuery, activeCategory, activeTimeFilter, activePriceFilter, activeLocationFilter, allFormattedEvents, userLocation]);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const handleEventPress = (event) => {
    const eventData = event.originalEvent || event;
    navigation.navigate('EventDetails', { event: eventData });
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const handleTimeFilterChange = (timeFilter) => {
    setActiveTimeFilter(timeFilter);
  };

  const handlePriceFilterChange = (priceFilter) => {
    setActivePriceFilter(priceFilter);
  };

  const handleLocationFilterChange = (locationFilter) => {
    setActiveLocationFilter(locationFilter);
  };

  const handleClearFilters = () => {
    setActiveTimeFilter('all');
    setActivePriceFilter('any');
    setActiveLocationFilter('all');
    setActiveCategory('all');
  };

  const renderItem = useCallback(({ item, index }) => (
    <FullScreenEvent
      event={item}
      index={index}
      scrollY={scrollY}
      onPress={handleEventPress}
    />
  ), [scrollY]);

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
        style={styles.emptyStateCard}
      >
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={['rgba(255,215,0,0.2)', 'rgba(255,107,61,0.2)']}
            style={styles.emptyIconBackground}
          >
            <Icon
              name="search"
              type="feather"
              size={40}
              color="#FFFFFF"
            />
          </LinearGradient>
        </View>
        
        <Text style={styles.emptyStateTitle}>
          {searchQuery || activeCategory !== 'all' 
            ? 'No Events Found'
            : 'No Events Available'}
        </Text>
        
        <Text style={styles.emptyStateMessage}>
          {searchQuery || activeCategory !== 'all' 
            ? 'Try adjusting your search terms or category filters to find the events you\'re looking for.'
            : 'Events will appear here once organizers start creating them. Check back soon for exciting new experiences!'}
        </Text>
        
        {(searchQuery || activeCategory !== 'all') && (
          <TouchableOpacity 
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F0F0F0']}
              style={styles.clearFiltersGradient}
            >
              <Icon
                name="refresh-cw"
                type="feather"
                size={16}
                color="#333333"
                style={styles.clearFiltersIcon}
              />
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );

  // Format events for explore display
  const formatEventsForExplore = (events) => {
    return events.map(event => {
      // Calculate spots left properly
      const hasUnlimitedTickets = event.tickets.some(ticket => ticket.isUnlimited);
      let totalSpots;
      
      if (hasUnlimitedTickets) {
        totalSpots = '∞';
      } else {
        const availableSpots = event.tickets.reduce((total, ticket) => {
          // Use availableQuantity if it exists, otherwise use original quantity
          const availableCount = ticket.availableQuantity !== undefined ? ticket.availableQuantity : (ticket.quantity || 0);
          return total + availableCount;
        }, 0);
        totalSpots = availableSpots;
      }

      // Calculate price properly
      const freeTickets = event.tickets.filter(t => t.isFree);
      const paidTickets = event.tickets.filter(t => !t.isFree);
      
      let priceDisplay;
      if (freeTickets.length > 0 && paidTickets.length === 0) {
        // Only free tickets
        priceDisplay = 'Free';
      } else if (freeTickets.length > 0 && paidTickets.length > 0) {
        // Mix of free and paid tickets
        const lowestPaidPrice = Math.min(...paidTickets.map(t => t.price));
        priceDisplay = `Free - $${lowestPaidPrice}`;
      } else if (paidTickets.length > 0) {
        // Only paid tickets
        const lowestPrice = Math.min(...paidTickets.map(t => t.price));
        priceDisplay = `$${lowestPrice}`;
      } else {
        priceDisplay = 'Free';
      }

      return {
        id: event.id,
        title: event.title,
        date: (() => {
          try {
            if (!event.date) return 'Event Date';
            const dateObj = event.date instanceof Date ? event.date : new Date(event.date);
            return isNaN(dateObj.getTime()) ? 'Event Date' : dateObj.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            });
          } catch (error) {
            return 'Event Date';
          }
        })(),
        time: (() => {
          try {
            if (!event.startTime) return 'Event Time';
            const timeObj = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
            return isNaN(timeObj.getTime()) ? 'Event Time' : timeObj.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
          } catch (error) {
            return 'Event Time';
          }
        })(),
        location: event.address?.formatted || event.venue,
        category: 'Event',
        price: priceDisplay,
        spotsLeft: totalSpots,
        image: event.coverImage || event.flyers[0] || 'https://via.placeholder.com/400x600',
        organizer: event.organizer?.name || 'Event Organizer',
        description: event.description || 'Join us for this amazing event!',
        originalEvent: event
      };
    });
  };

  // Get both upcoming and live events for the Explore screen
  const upcomingEvents = getUpcomingEvents();
  const liveEvents = getLiveEvents();
  
  // Get location-based events if user has location
  const nearbyEvents = userLocation ? getEventsNearUser(userLocation, 100) : []; // 100 mile radius for explore
  const stateEvents = userLocation?.state ? getEventsByState(userLocation.state) : [];
  
  // Combine all events with priority: nearby -> state -> all others
  let allEvents = [...upcomingEvents, ...liveEvents]
    .filter(event => event.showOnExplore !== false); // Only show events that are set to appear on explore
  
  // Sort events to prioritize location-based ones
  if (userLocation) {
    allEvents = allEvents.sort((a, b) => {
      const aIsNearby = nearbyEvents.some(ne => ne.id === a.id);
      const bIsNearby = nearbyEvents.some(ne => ne.id === b.id);
      const aIsInState = stateEvents.some(se => se.id === a.id);
      const bIsInState = stateEvents.some(se => se.id === b.id);
      
      // Prioritize nearby events first
      if (aIsNearby && !bIsNearby) return -1;
      if (!aIsNearby && bIsNearby) return 1;
      
      // Then prioritize state events
      if (aIsInState && !bIsInState) return -1;
      if (!aIsInState && bIsInState) return 1;
      
      // Finally sort by date
      return new Date(a.date) - new Date(b.date);
    });
  } else {
    // If no location, just sort by date
    allEvents = allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  
  const allFormattedEvents = formatEventsForExplore(allEvents);

  if (allFormattedEvents.length === 0 && !searchQuery && activeCategory === 'all') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0c162d', '#1a2a4a', '#0c162d']}
          style={styles.backgroundGradient}
        />
        
        <ExploreHeader 
          onSearch={handleSearch}
          fadeAnim={fadeAnim}
          slideAnim={slideAnim}
          activeTimeFilter={activeTimeFilter}
          activePriceFilter={activePriceFilter}
          activeLocationFilter={activeLocationFilter}
          onTimeFilterChange={handleTimeFilterChange}
          onPriceFilterChange={handlePriceFilterChange}
          onLocationFilterChange={handleLocationFilterChange}
          onClearFilters={handleClearFilters}
        />
        
        <View style={styles.mainEmptyStateContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.03)']}
            style={styles.mainEmptyStateCard}
          >
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={['rgba(255,215,0,0.3)', 'rgba(255,107,61,0.3)']}
                style={styles.mainEmptyIconBackground}
              >
                <Icon
                  name="calendar"
                  type="feather"
                  size={48}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </View>
            
            <Text style={styles.mainEmptyStateTitle}>Discover Amazing Events</Text>
            <Text style={styles.mainEmptyStateSubtitle}>Coming Soon</Text>
            
            <View style={styles.emptyStateDivider} />
            
            <Text style={styles.mainEmptyStateMessage}>
              Event organizers are preparing incredible experiences for you. 
              Check back soon to discover concerts, workshops, conferences, and more!
            </Text>
            
            <View style={styles.emptyStateFeatures}>
              <View style={styles.featureItem}>
                <Icon name="music" type="feather" size={20} color="#FFD700" />
                <Text style={styles.featureText}>Concerts & Shows</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="users" type="feather" size={20} color="#FFD700" />
                <Text style={styles.featureText}>Workshops</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="briefcase" type="feather" size={20} color="#FFD700" />
                <Text style={styles.featureText}>Conferences</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        
        <CustomNavBar activeScreen="Explore" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0c162d', '#1a2a4a', '#0c162d']}
        style={styles.backgroundGradient}
      />
      
      <ExploreHeader 
        onSearch={handleSearch}
        fadeAnim={fadeAnim}
        slideAnim={slideAnim}
        activeTimeFilter={activeTimeFilter}
        activePriceFilter={activePriceFilter}
        activeLocationFilter={activeLocationFilter}
        onTimeFilterChange={handleTimeFilterChange}
        onPriceFilterChange={handlePriceFilterChange}
        onLocationFilterChange={handleLocationFilterChange}
        onClearFilters={handleClearFilters}
      />
      
      {filteredEvents.length > 0 ? (
        <Animated.FlatList
          data={filteredEvents}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          onScroll={onScroll}
          style={{
            opacity: listOpacity,
            transform: [{ translateY: listTranslateY }]
          }}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={true}
          initialNumToRender={2}
        />
      ) : (
        renderEmptyState()
      )}
      
      <CustomNavBar activeScreen="Explore" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  exploreHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 44,
    marginBottom: -80,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    height: '100%',
  },
  filterMenuButton: {
    width: 24,
    height: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 4,
  },
  menuLine: {
    width: 16,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 1,
  },
  filtersDropdown: {
    backgroundColor: 'rgba(30, 30, 40, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeFilterOption: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  inactiveFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  fullEventContainer: {
    width,
    height,
    position: 'relative',
  },
  fullEventImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  fullEventOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  eventContentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  eventContent: {
    padding: 20,
    paddingBottom: 120, // Increased space for the navbar and better layout
  },
  eventHeader: {
    marginBottom: 16, // Reduced margin
  },
  eventCategory: {
    fontSize: 12, // Slightly smaller
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 6, // Reduced margin
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 28, // Reduced from 32 to prevent cutoff
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6, // Reduced margin
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    lineHeight: 32, // Better line spacing
  },
  eventOrganizer: {
    fontSize: 14, // Slightly smaller
    color: '#FFFFFF',
    opacity: 0.8,
  },
  eventDetails: {
    marginBottom: 20, // Reduced margin
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed to flex-start for better text alignment
    marginBottom: 10, // Reduced margin
  },
  detailIcon: {
    marginRight: 8, // Reduced margin
    marginTop: 2, // Small top margin for better alignment
  },
  detailText: {
    fontSize: 14, // Reduced font size
    color: '#FFFFFF',
    flex: 1, // Take available space
    flexWrap: 'wrap',
  },
  eventDescription: {
    fontSize: 14, // Reduced font size
    color: '#FFFFFF',
    lineHeight: 20, // Better line spacing
    marginTop: 12,
    opacity: 0.9,
  },
  eventFooter: {
    gap: 12, // Space between rows
  },
  footerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  priceLabel: {
    fontSize: 12, // Smaller label
    color: '#FFFFFF',
    opacity: 0.7,
  },
  priceValue: {
    fontSize: 18, // Reduced from 22
    fontWeight: '700',
    color: '#FFFFFF',
  },
  spotsContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    flex: 1,
    marginLeft: 12,
  },
  spotsText: {
    fontSize: 12, // Reduced font size
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  ticketButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 14, // Slightly larger button
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 150, // Minimum width
  },
  ticketButtonContainer: {
    borderRadius: 25,
    width: '100%', // Take full width
  },
  footerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the button
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 200 : 180,
  },
  emptyStateCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  clearFiltersButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  clearFiltersGradient: {
    padding: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearFiltersIcon: {
    marginRight: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mainEmptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 220 : 200,
  },
  mainEmptyStateCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: 350,
  },
  mainEmptyIconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainEmptyStateTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  mainEmptyStateSubtitle: {
    fontSize: 16,
    color: '#FFD700',
    opacity: 0.9,
    fontWeight: '600',
    marginBottom: 20,
  },
  emptyStateDivider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,215,0,0.4)',
    marginVertical: 20,
  },
  mainEmptyStateMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateFeatures: {
    alignSelf: 'stretch',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 12,
  },
});

export default ExploreScreen; 