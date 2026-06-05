import React, { useState, useLayoutEffect, useMemo, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Image, Platform, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { Text, Icon, useTheme, Button } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '../context/EventsContext';
import { formatCount } from '../utils/formatNumbers';

const { width } = Dimensions.get('window');

const EventCard = ({ event, theme, onPress, isPastEvent = false, isOrganizerView = true, onTicketSalesToggle }) => {
  const isSoldOut = event.spotsLeft === 0;
  const ticketSalesClosed = event.ticketSalesOpen === false;
  const canManageTicketSales = isOrganizerView && !event.hasEndTime && !isPastEvent;
  const isClickable = !isPastEvent && !isSoldOut && event.ticketSalesOpen !== false;
  
  const CardComponent = isClickable ? TouchableOpacity : View;
  
  return (
    <CardComponent
      style={[styles.eventCard, { backgroundColor: theme.colors.surface }]}
      activeOpacity={0.7}
      onPress={isClickable ? onPress : undefined}
    >
      <View style={styles.eventImageContainer}>
        <Image
          source={{ uri: event.image }}
          style={styles.eventImage}
          resizeMode="cover"
        />
        
        {/* Gradient overlay for text readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
          style={styles.imageOverlay}
        />
        
        {/* Top badges */}
        <View style={styles.topBadgesRow}>
          {/* Attendee count badge */}
          <View style={styles.attendeeBadge}>
            <Icon
              name="users"
              type="feather"
              size={12}
              color="#FFFFFF"
              style={styles.attendeeIcon}
            />
            <Text style={styles.attendeeCount}>{formatCount(event.bookedSpots)}</Text>
          </View>
          
          {/* Category badge */}
          <View style={styles.categoryBadgeOverlay}>
            <Text style={styles.categoryTextOverlay}>{event.category}</Text>
          </View>
        </View>
        
        {/* Content overlay */}
        <View style={styles.eventContentOverlay}>
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

            <View style={styles.eventFooterRow}>
              <View style={styles.eventDateBadge}>
                <Text style={styles.eventDateText}>
                  {new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
              </View>

              {!isPastEvent && (
                event.spotsLeft > 0 && !ticketSalesClosed ? (
                  <View style={[styles.spotsContainer, { backgroundColor: 'rgba(76, 175, 80, 0.9)' }]}>
                    <Text style={[styles.spotsText, { color: '#FFFFFF' }]}>
                      {event.spotsLeft > 99999 ? '∞ spots available' : `${event.spotsLeft} spots left`}
                    </Text>
                  </View>
                ) : ticketSalesClosed ? (
                  <View style={[styles.spotsContainer, { backgroundColor: 'rgba(255, 152, 0, 0.9)' }]}>
                    <Text style={[styles.spotsText, { color: '#FFFFFF' }]}>
                      Sales Closed
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.spotsContainer, { backgroundColor: 'rgba(255, 59, 48, 0.9)' }]}>
                    <Text style={[styles.spotsText, { color: '#FFFFFF' }]}>
                      Sold out
                    </Text>
                  </View>
                )
              )}

              <Text style={styles.priceText}>
                {event.price === 'Free' ? 'Free' : `$${event.price}`}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Status overlays for unavailable events */}
        {(isPastEvent || isSoldOut || ticketSalesClosed) && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>
              {isPastEvent ? 'Past Event' : isSoldOut ? 'Sold Out' : 'Sales Closed'}
            </Text>
          </View>
        )}
      </View>
    </CardComponent>
  );
};

const OrganizerProfileScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { 
    events, 
    followOrganizer, 
    unfollowOrganizer, 
    isFollowingOrganizer, 
    getOrganizerStats,
    updateEventTicketSales
  } = useEvents();
  const { organizerId, organizerName, organizerData: passedOrganizerData } = route.params;
  
  console.log('🏢 OrganizerProfile params:', { 
    organizerId, 
    organizerName, 
    organizerNameType: typeof organizerName,
    passedOrganizerData: passedOrganizerData ? 'exists' : 'undefined' 
  });

  // Extract string value safely - no fallbacks to avoid wrong organizer data
  const safeOrganizerName = (() => {
    if (typeof organizerName === 'string') return organizerName;
    if (typeof organizerName === 'object' && organizerName?.name) return organizerName.name;
    return null; // Return null instead of fallback
  })();

  const safeOrganizerId = (() => {
    if (typeof organizerId === 'string') return organizerId;
    if (typeof organizerId === 'object' && organizerId?.id) return organizerId.id;
    return null; // Return null instead of fallback
  })();

  // If we don't have valid organizer data, show error or go back
  if (!safeOrganizerName && !safeOrganizerId) {
    console.error('❌ OrganizerProfile: No valid organizer data provided', { organizerName, organizerId });
    // Navigate back since we can't show organizer profile without valid data
    React.useEffect(() => {
      navigation.goBack();
    }, []);
    return null;
  }

  // Get real follow status from context
  const [isFollowing, setIsFollowing] = useState(
    isFollowingOrganizer(safeOrganizerName, safeOrganizerId)
  );

  // Get real organizer statistics - recalculate when follow status changes
  const statistics = useMemo(() => {
    return getOrganizerStats(safeOrganizerName, safeOrganizerId);
  }, [safeOrganizerName, safeOrganizerId, isFollowing, getOrganizerStats, events]);

  // Filter events by organizer
  const organizerEvents = useMemo(() => {
    console.log('🔍 Filtering events for organizer:', { organizerName: safeOrganizerName, organizerId: safeOrganizerId });
    console.log('📋 Total events available:', events.length);
    
    // Debug: Log all events to see their organizer structure
    events.forEach((event, index) => {
      console.log(`📄 Event ${index}:`, {
        title: event.title,
        organizer: event.organizer,
        organizerType: typeof event.organizer,
        organizerId: event.organizerId,
        organizerName: event.organizer?.name
      });
    });
    
    const filtered = events.filter(event => {
      console.log('🎫 Checking event:', {
        title: event.title,
        organizer: event.organizer,
        organizerId: event.organizerId,
        organizerName: event.organizer?.name
      });
      
      // Helper function to safely get organizer name as string
      const getOrganizerName = (organizer) => {
        if (typeof organizer === 'string') {
          return organizer;
        }
        if (typeof organizer === 'object' && organizer?.name) {
          return organizer.name;
        }
        return null;
      };
      
      const eventOrganizerName = getOrganizerName(event.organizer);
      
      // Multiple ways to match organizer
      const matches = 
        event.organizer === safeOrganizerName || 
        event.organizerId === safeOrganizerId ||
        event.organizer?.name === safeOrganizerName ||
        event.organizerData?.name === safeOrganizerName ||
        eventOrganizerName === safeOrganizerName ||
        // Case insensitive matching - only call toLowerCase on strings
        (typeof event.organizer === 'string' && event.organizer.toLowerCase() === safeOrganizerName?.toLowerCase()) ||
        (eventOrganizerName && eventOrganizerName.toLowerCase() === safeOrganizerName?.toLowerCase()) ||
        (event.organizer?.name && typeof event.organizer.name === 'string' && event.organizer.name.toLowerCase() === safeOrganizerName?.toLowerCase()) ||
        (event.organizerData?.name && typeof event.organizerData.name === 'string' && event.organizerData.name.toLowerCase() === safeOrganizerName?.toLowerCase());
      
      console.log('✅ Event matches:', matches, 'for organizer:', safeOrganizerName);
      return matches;
    });
    
    console.log('🎯 Filtered events found:', filtered.length);
    return filtered;
  }, [events, safeOrganizerName, safeOrganizerId]);

  // Separate upcoming and past events
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const past = [];

    organizerEvents.forEach(event => {
      const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
      const eventStartTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      
      // Create full event start datetime
      const eventStartDateTime = new Date(eventDate);
      eventStartDateTime.setHours(
        eventStartTime.getHours(),
        eventStartTime.getMinutes(),
        eventStartTime.getSeconds()
      );
      
      // If event has end time, use that; otherwise assume event lasts 4 hours
      let eventEndDateTime;
      if (event.endTime) {
        const eventEndTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
        eventEndDateTime = new Date(eventDate);
        eventEndDateTime.setHours(
          eventEndTime.getHours(),
          eventEndTime.getMinutes(),
          eventEndTime.getSeconds()
        );
      } else {
        // Default: assume event lasts 4 hours if no end time
        eventEndDateTime = new Date(eventStartDateTime.getTime() + (4 * 60 * 60 * 1000));
      }
      
      // Format event for display
      const formattedEvent = {
        ...event,
        id: event.id,
        title: event.title,
        date: eventDate,
        location: event.address?.formatted || event.venue,
        image: event.coverImage || event.flyers?.[0] || 'https://via.placeholder.com/400x300',
        category: event.category || 'Event',
        bookedSpots: event.bookedSpots || 0,
        spotsLeft: event.tickets?.some(t => t.isUnlimited) 
          ? 999999 
          : event.tickets?.reduce((total, t) => total + (t.availableQuantity || 0), 0) || 0,
        price: event.tickets?.length > 0 
          ? (event.tickets.some(t => t.isFree) && event.tickets.every(t => t.isFree))
            ? 'Free'
            : event.tickets.some(t => !t.isFree)
              ? `${Math.min(...event.tickets.filter(t => !t.isFree).map(t => t.price))}`
              : 'Free'
          : '0',
        eventStartDateTime,
        eventEndDateTime,
        hasEndTime: !!event.endTime
      };

      // Event is past only if it has actually ended
      if (eventEndDateTime < now) {
        past.push(formattedEvent);
      } else {
        upcoming.push(formattedEvent);
      }
    });

    // Sort events by date
    upcoming.sort((a, b) => a.eventStartDateTime - b.eventStartDateTime);
    past.sort((a, b) => b.eventStartDateTime - a.eventStartDateTime);

    return {
      upcomingEvents: upcoming,
      pastEvents: past
    };
  }, [organizerEvents]);

  // Define organizer data structure
  const organizerData = useMemo(() => {
    return passedOrganizerData || {
      id: safeOrganizerId,
      name: safeOrganizerName || "Unknown Organizer",
      title: "Event Organizer",
      avatar: null,
      profilePicture: null,
      bio: `Professional event organizer with ${statistics.totalEvents} events and ${statistics.totalAttendees} happy attendees.`
    };
  }, [passedOrganizerData, safeOrganizerId, safeOrganizerName, statistics]);

  // Add useLayoutEffect to hide the header when component mounts
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, // This hides the default navigation header
    });
  }, [navigation]);

  // Note: Removed auto-creation of sample events to prevent unwanted organizer data

  const handleEventPress = (event) => {
    console.log('🎫 Event pressed:', {
      title: event.title,
      spotsLeft: event.spotsLeft,
      ticketSalesOpen: event.ticketSalesOpen,
      eventStartDateTime: event.eventStartDateTime,
      now: new Date()
    });

    // Check if tickets are available and sales are open
    const hasSpots = event.spotsLeft > 0 || event.spotsLeft === '∞' || event.spotsLeft > 99999;
    const salesOpen = event.ticketSalesOpen !== false;
    const isUpcoming = event.eventStartDateTime ? 
      event.eventStartDateTime > new Date() : 
      new Date(event.date) > new Date();

    console.log('🎫 Navigation checks:', { hasSpots, salesOpen, isUpcoming });

    if (hasSpots && salesOpen && isUpcoming) {
      console.log('✅ Navigating to EventDetails');
    navigation.navigate('EventDetails', { event });
    } else {
      console.log('❌ Navigation blocked - no spots, sales closed, or past event');
    }
  };

  const handleFollowPress = async () => {
    try {
      if (isFollowing) {
        await unfollowOrganizer(safeOrganizerName, safeOrganizerId);
        setIsFollowing(false);
      } else {
        await followOrganizer(safeOrganizerName, safeOrganizerId);
        setIsFollowing(true);
      }
      
      // Verify the follow status after the operation
      const newFollowStatus = isFollowingOrganizer(safeOrganizerName, safeOrganizerId);
      console.log('🔄 Follow status updated:', { 
        organizer: safeOrganizerName, 
        isFollowing: newFollowStatus 
      });
      
    } catch (error) {
      console.error('Error updating follow status:', error);
      // Revert the UI state if the operation failed
    setIsFollowing(!isFollowing);
    }
  };

  const handleTicketSalesToggle = async (eventId, newSalesStatus) => {
    try {
      await updateEventTicketSales(eventId, newSalesStatus);
    } catch (error) {
      console.error('Error updating ticket sales:', error);
    }
  };

  const renderStat = (icon, value, label) => (
    <View style={styles.statItem}>
      <Icon name={icon} type="feather" size={24} color={theme.colors.textSecondary} />
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Decorative Top Gradient */}
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topGradient}
      />
      
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Single header with navigation */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" type="feather" color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organizer Profile</Text>
          <TouchableOpacity style={styles.shareButton}>
            <Icon name="share" type="feather" color="#fff" size={24} />
          </TouchableOpacity>
        </View>
      
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.profileImageContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.imageGradientBorder}
            >
              {organizerData?.avatar || organizerData?.profilePicture ? (
          <Image
                  source={{ uri: organizerData.avatar || organizerData.profilePicture }}
            style={styles.profileImage}
          />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Text style={styles.placeholderText}>
                    {(() => {
                      const name = organizerData?.name || safeOrganizerName || 'U';
                      return typeof name === 'string' && name.length > 0 
                        ? name.charAt(0).toUpperCase() 
                        : 'U';
                    })()}
                  </Text>
                </View>
              )}
            </LinearGradient>
        </View>

          <View style={styles.profileContent}>
            <Text style={[styles.organizerName, { color: theme.colors.text }]}>
              {safeOrganizerName || "City Events"}
            </Text>
            <Text style={[styles.organizerType, { color: theme.colors.textSecondary }]}>
              Event Organizer
            </Text>

            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing ? styles.followingButton : {}
              ]}
              onPress={handleFollowPress}
            >
              {isFollowing ? (
                <Text style={styles.followingText}>Following</Text>
              ) : (
                <LinearGradient
                  colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.followGradient}
                >
                  <Text style={styles.followText}>Follow</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
              {renderStat('calendar', statistics.totalEvents > 0 ? formatCount(statistics.totalEvents) : '0', 'Events')}
              {renderStat('users', statistics.totalAttendees > 0 ? formatCount(statistics.totalAttendees) : '0', 'Attendees')}
              {renderStat('heart', formatCount(statistics.followers), 'Followers')}
        </View>

            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming Events</Text>
              {upcomingEvents.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Icon name="calendar" type="feather" size={48} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyStateText}>No upcoming events</Text>
        </View>
              ) : (
                upcomingEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
                    theme={theme}
              onPress={() => handleEventPress(event)}
              isOrganizerView={true}
              onTicketSalesToggle={handleTicketSalesToggle}
            />
                ))
              )}
        </View>

            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Past Events</Text>
              {pastEvents.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Icon name="calendar" type="feather" size={48} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyStateText}>No past events</Text>
                </View>
              ) : (
                pastEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
                    theme={theme}
              onPress={() => handleEventPress(event)}
                    isPastEvent={true}
              isOrganizerView={true}
              onTicketSalesToggle={handleTicketSalesToggle}
            />
                ))
              )}
            </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  imageGradientBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  profileImage: {
    width: 114,
    height: 114,
    borderRadius: 57,
  },
  profileContent: {
    paddingHorizontal: 20,
  },
  organizerName: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  organizerType: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  followButton: {
    width: 120,
    height: 40,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  followGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  followingText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 38,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginTop: 12,
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  eventImageContainer: {
    position: 'relative',
    height: 200,
  },
  eventImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBadgesRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  attendeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryTextOverlay: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  eventContentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  eventBottomContent: {
    gap: 6,
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocation: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  eventFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  eventDateBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  eventDateText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  attendeeIcon: {
    marginRight: 4,
  },
  attendeeCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    marginBottom: 12,
  },
  eventDate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textTransform: 'uppercase',
  },
  eventDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  leftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotsContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spotsText: {
    fontSize: 11,
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
    borderRadius: 4,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ticketSalesControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  controlLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  salesToggleButton: {
    padding: 8,
    borderRadius: 4,
  },
  salesToggleText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  placeholderImage: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 24,
    fontWeight: '700',
  },
});

export default OrganizerProfileScreen; 