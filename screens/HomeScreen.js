import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Text, useTheme, Icon } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomNavBar from '../components/CustomNavBar';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { formatCount } from '../utils/formatNumbers';

const { width } = Dimensions.get('window');

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

const EventCard = ({ event, theme, onPress, index, animatedValue }) => {
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  // Check if event is sold out
  const isSoldOut = event.spotsLeft === 0;
  
  // Use View instead of TouchableOpacity for sold out events
  const CardComponent = isSoldOut ? View : TouchableOpacity;

  return (
    <Animated.View
      style={{
        opacity: isSoldOut ? 0.6 : opacity, // Reduce opacity for sold out events
        transform: [{ translateY }, { scale }],
      }}
    >
  <CardComponent
        style={[
          styles.eventCard, 
          { 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
          },
          isSoldOut && { borderColor: 'rgba(255, 59, 48, 0.3)', borderWidth: 1 } // Add border for sold out events
        ]}
    activeOpacity={isSoldOut ? 1 : 0.7}
    onPress={isSoldOut ? undefined : onPress}
  >
    <Image
      source={{ uri: event.image }}
      style={styles.eventImage}
      resizeMode="cover"
    />
    
    {/* Gradient overlay for better text readability */}
    <LinearGradient
      colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
      style={styles.imageOverlay}
    />
    
    {/* Content overlay */}
    <View style={styles.eventContentOverlay}>
      {/* Top row - Date and Category */}
      <View style={styles.eventTopRow}>
        <View style={styles.dateBadge}>
          <Text style={styles.eventDate}>
          {event.date}
        </Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            {event.category}
        </Text>
        </View>
      </View>
      
      {/* Bottom content */}
      <View style={styles.eventBottomContent}>
        <Text style={styles.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>
        
        <View style={styles.eventLocationRow}>
          <Icon
            name="map-pin"
            type="feather"
            size={14}
            color="rgba(255,255,255,0.8)"
            style={styles.detailIcon}
          />
          <Text style={styles.eventLocation} numberOfLines={1}>
            {event.venue || event.location || 'Venue TBD'}
          </Text>
        </View>

        <View style={styles.eventFooterOverlay}>
          <View style={[
            styles.spotsContainer, 
            { backgroundColor: event.spotsLeft === 0 ? 'rgba(255, 59, 48, 0.9)' : 'rgba(76, 175, 80, 0.9)' }
          ]}>
            <Text style={[
              styles.spotsText, 
              { color: '#FFFFFF' }
            ]}>
              {event.spotsLeft === '∞' ? '∞ spots available' : 
               event.spotsLeft === 0 ? 'Sold Out' : 
               `${event.spotsLeft} spots left`}
            </Text>
          </View>

          <Text style={styles.priceText}>
              {event.price}
            </Text>
          </View>
        </View>
      </View>
  </CardComponent>
    </Animated.View>
);
};

// Enhanced organizer card for followed organizers
const FollowedOrganizerCard = ({ organizer, theme, onPress, animatedValue }) => {
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
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
    if (!name) return 'Unknown Organizer';
    // If it's a long hash-like string, extract a more readable name
    if (name.length > 20 && name.includes('b') && name.includes('f')) {
      return 'Event Organizer';
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
        transform: [{ translateY }, { scale }],
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
  const { userLocation, locationPermission, requestLocationPermission } = useAuth();
  const { getUpcomingEvents, getLiveEvents, events, loading, followedOrganizers, isFollowingOrganizer, organizerFollowers, getEventsNearUser, getEventsByState } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
      
      let priceDisplay = 'Free';
      if (!hasFreeTickets && lowestPrice !== Infinity) {
        priceDisplay = `$${lowestPrice}`;
      } else if (hasFreeTickets && lowestPrice !== Infinity) {
        priceDisplay = `Free - $${lowestPrice}`;
      }

      return {
        id: event.id,
        title: event.title,
        date: (() => {
          try {
            if (!event.date) return 'Event Date';
            const dateObj = event.date instanceof Date ? event.date : new Date(event.date);
            return isNaN(dateObj.getTime()) ? 'Event Date' : dateObj.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
            });
          } catch (error) {
            return 'Event Date';
          }
        })(),
        location: event.venue || event.address?.formatted,
        category: event.category || 'Event',
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
          'Location Access',
          'To show events near you, please enable location access in your device settings.',
          [{ text: 'OK' }]
        );
      }
    }
  };

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

  const renderEventCard = ({ item: event, index }) => (
    <EventCard 
      event={event} 
      theme={theme} 
      onPress={() => handleEventPress(event)}
      index={index}
      animatedValue={fadeAnim}
    />
  );

  const EventSection = ({ title, events, onSeeAll, emptyMessage, emptySubtext }) => {
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
              See All
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
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Samba</Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Bar */}
        <Animated.View 
          style={[
            styles.searchContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
            <Icon
              name="search"
              type="feather"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search events, organizers..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </Animated.View>

        {/* Followed Organizers Section - Community feature at top */}
        {Array.isArray(followedOrganizers) && followedOrganizers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              👥 Followed Organizers
            </Text>
            {Array.isArray(followedOrganizers) && followedOrganizers.length > 0 && (
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={[styles.seeAllText, { color: theme.colors.textSecondary }]}>
                  View All
              </Text>
            </TouchableOpacity>
            )}
          </View>

          {Array.isArray(followedOrganizers) && followedOrganizers.length > 0 ? (
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.organizersList}
          >
              {/* Debug logging */}
              {console.log('🐛 HomeScreen Debug:', {
                followedOrganizers,
                followedOrganizersType: typeof followedOrganizers,
                followedOrganizersLength: followedOrganizers?.length,
                firstFollowed: followedOrganizers?.[0],
                totalEvents: events.length,
                sampleEvents: events.slice(0, 3).map(e => ({
                  title: e.title,
                  organizer: e.organizer,
                  organizerId: e.organizerId
                }))
              })}
              {followedOrganizers.map((organizerKey, index) => {
                console.log('🔍 Processing followed organizer:', organizerKey);
                
                // Find events by this organizer with comprehensive matching
                const organizerEvents = events.filter(event => {
                  const eventOrganizerName = typeof event.organizer === 'string' 
                    ? event.organizer 
                    : event.organizer?.name || event.organizer?.organizationName;
                  const eventOrganizerId = event.organizerId || event.organizer?.id;
                  
                  // Multiple matching criteria
                  const matches = eventOrganizerName === organizerKey || 
                         eventOrganizerId === organizerKey ||
                         event.organizer?.organizationName === organizerKey ||
                         (typeof event.organizer === 'object' && event.organizer?.name === organizerKey) ||
                         // Case insensitive matching
                         (eventOrganizerName && eventOrganizerName.toLowerCase() === organizerKey.toLowerCase());
                  
                  if (matches) {
                    console.log('✅ Found matching event:', event.title, 'for organizer:', organizerKey);
                  }
                  
                  return matches;
                });

                console.log('📊 Found', organizerEvents.length, 'events for organizer:', organizerKey);

                // Get organizer info from first event or try to find from all events
                const firstEvent = organizerEvents[0];
                let organizerInfo = firstEvent?.organizer || {};
                
                // If no events found, try to find organizer info from other events
                if (organizerEvents.length === 0) {
                  console.log('⚠️ No events found for organizer, searching all events...');
                  const allOrganizerInstances = events
                    .map(event => event.organizer)
                    .filter(org => org && (
                      (typeof org === 'string' && org === organizerKey) ||
                      (typeof org === 'object' && (org.name === organizerKey || org.organizationName === organizerKey || org.id === organizerKey))
                    ));
                  
                  if (allOrganizerInstances.length > 0) {
                    organizerInfo = allOrganizerInstances[0];
                    console.log('🔍 Found organizer info from other events:', organizerInfo);
                  }
                }
                
                // Create robust organizer data
                const organizerName = typeof organizerInfo === 'string' 
                  ? organizerInfo 
                  : organizerInfo.organizationName || organizerInfo.name || organizerKey;
                
                // Don't show generic fallback data if we can't find the real organizer
                if (organizerName === organizerKey && organizerEvents.length === 0 && (
                    organizerKey.includes('Event Organizer') || 
                    organizerKey === 'Event Organizer' ||
                    organizerKey.length > 20 // Likely a hash
                  )) {
                  console.log('❌ Skipping generic organizer:', organizerKey);
                  return null;
                }
                
                const organizerData = {
                  id: organizerKey,
                  name: organizerName,
                  eventCount: organizerEvents.length,
                  followers: organizerFollowers[organizerKey] || 0, // Real follower count
                  verified: organizerEvents.length > 0,
                  avatar: organizerInfo.profilePicture || organizerInfo.avatar || organizerInfo.partyLogo,
                  coverImage: firstEvent?.coverImage || firstEvent?.flyers?.[0]
                };
                
                console.log('📋 Final organizer data:', organizerData);
                
                return (
                  <FollowedOrganizerCard
                    key={organizerKey}
                    organizer={organizerData}
                    onPress={() => handleOrganizerPress(organizerData)}
                    theme={theme}
                    animatedValue={fadeAnim}
                  />
                );
              }).filter(Boolean)}
          </ScrollView>
          ) : (
            <View style={styles.emptyStateContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.emptyStateCard}
              >
                <View style={styles.emptyIconContainer}>
                  <Icon
                    name="users"
                    type="feather"
                    size={40}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={[styles.emptyStateTitle, { color: '#FFFFFF' }]}>
                  No followed organizers
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: 'rgba(255,255,255,0.7)' }]}>
                  Discover and follow event organizers!
                </Text>
              </LinearGradient>
            </View>
          )}
        </View>
        )}

        {/* Events Near You Section - Most relevant to user */}
        {(locationPermission !== null && (
          (locationPermission === true && displayNearbyEvents.length > 0) ||
          (locationPermission === false && displayStateEvents.length > 0)
        )) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {locationPermission === true && displayNearbyEvents.length > 0 
                ? '📍 Events Near You' 
                : locationPermission === false && displayStateEvents.length > 0
                ? `📍 Events in ${userLocation?.state || 'Your State'}`
                : '📍 Events Near You'}
            </Text>
            {locationPermission === null ? (
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={handleLocationRequest}
              >
                <Text style={[styles.locationButtonText, { color: theme.colors.textSecondary }]}>
                  Enable Location
                </Text>
                <Icon
                  name="map-pin"
                  type="feather"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => handleSeeAllEvents({ locationFilter: 'nearMe' })}
              >
                <Text style={[styles.seeAllText, { color: theme.colors.textSecondary }]}>
                  See All
                </Text>
                <Icon
                  name="chevron-right"
                  type="feather"
                  size={16}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {locationPermission === null ? (
            <View style={styles.emptyStateContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.emptyStateCard}
              >
                <View style={styles.emptyIconContainer}>
                  <Icon
                    name="map-pin"
                    type="feather"
                    size={40}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={[styles.emptyStateTitle, { color: '#FFFFFF' }]}>
                  Share Your Location
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: 'rgba(255,255,255,0.7)' }]}>
                  Allow location access to discover events happening near you!
                </Text>
              </LinearGradient>
            </View>
          ) : (locationPermission === true && displayNearbyEvents.length > 0) || 
                (locationPermission === false && displayStateEvents.length > 0) ? (
            <FlatList
              data={locationPermission === true ? displayNearbyEvents : displayStateEvents}
              renderItem={renderEventCard}
              keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventsList}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
              />
          ) : (
            <View style={styles.emptyStateContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.emptyStateCard}
              >
                <View style={styles.emptyIconContainer}>
                  <Icon
                    name="map-pin"
                    type="feather"
                    size={40}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={[styles.emptyStateTitle, { color: '#FFFFFF' }]}>
                  {locationPermission === true ? 'No events near you yet' : 'No events in your area yet'}
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: 'rgba(255,255,255,0.7)' }]}>
                  {locationPermission === true 
                    ? 'Events within 50 miles will appear here once created!'
                    : 'Events in your state will appear here once created!'}
                </Text>
              </LinearGradient>
            </View>
          )}
        </View>
        )}

        {/* Today's Events Section - High urgency */}
        <EventSection
          title="🔥 Happening Today"
          events={todayEvents}
          onSeeAll={() => handleSeeAllEvents({ timeFilter: 'today' })}
          emptyMessage="No events today"
          emptySubtext="Check out tomorrow's events or create one for today!"
        />

        {/* Free Events Section - High appeal, barrier-free */}
        <EventSection
          title="🆓 Free Events"
          events={freeEvents}
          onSeeAll={() => handleSeeAllEvents({ priceFilter: 'free' })}
          emptyMessage="No free events available"
          emptySubtext="All current events require tickets, but check back soon!"
        />

        {/* Tomorrow's Events Section - Planning ahead */}
        <EventSection
          title="🌅 Tomorrow"
          events={tomorrowEvents}
          onSeeAll={() => handleSeeAllEvents({ timeFilter: 'tomorrow' })}
          emptyMessage="No events tomorrow"
          emptySubtext="Plan ahead and create an event for tomorrow!"
        />

        {/* This Week's Events Section - Weekly planning */}
        <EventSection
          title="📅 This Week"
          events={thisWeekEvents}
          onSeeAll={() => handleSeeAllEvents({ timeFilter: 'thisWeek' })}
          emptyMessage="No events this week"
          emptySubtext="This week is looking quiet, perfect time to create an event!"
        />

        {/* Featured Events Section - General discovery */}
        {(searchQuery ? filteredEvents : displayEvents).length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Featured Events
            </Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={handleSeeAllEvents}
            >
              <Text style={[styles.seeAllText, { color: theme.colors.textSecondary }]}>
                See All
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
            data={searchQuery ? filteredEvents : displayEvents}
            renderItem={renderEventCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsList}
            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
          />
        </View>
        )}

        {/* Paid Events Section - Premium experiences */}
        <EventSection
          title="💰 Premium Events"
          events={paidEvents}
          onSeeAll={() => handleSeeAllEvents({ priceFilter: 'paid' })}
          emptyMessage="No premium events available"
          emptySubtext="All current events are free, check out the free section!"
        />

        {/* No Events Available Fallback */}
        {!searchQuery && 
         (!Array.isArray(followedOrganizers) || followedOrganizers.length === 0) &&
         !(locationPermission !== null && (
           (locationPermission === true && displayNearbyEvents.length > 0) ||
           (locationPermission === false && displayStateEvents.length > 0)
         )) &&
         todayEvents.length === 0 &&
         freeEvents.length === 0 &&
         tomorrowEvents.length === 0 &&
         thisWeekEvents.length === 0 &&
         displayEvents.length === 0 &&
         paidEvents.length === 0 && (
          <View style={styles.noEventsContainer}>
            <Text style={styles.noEventsText}>No Events Available</Text>
          </View>
        )}

      </ScrollView>
      
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
    width: width * 0.55,
    height: 200,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.4)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventBottomContent: {
    gap: 4,
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
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
  spotsText: {
    fontSize: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 700, // Reduced padding for nav bar
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