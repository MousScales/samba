import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Dimensions, Platform, Animated, Alert, Modal } from 'react-native';
import { Text, useTheme, Icon, Avatar } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomNavBar from '../components/CustomNavBar';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { formatCount } from '../utils/formatNumbers';

const { width } = Dimensions.get('window');

const AnimatedSectionTitle = ({ title, animatedValue }) => {
  const { theme } = useTheme();
  
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });
  
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateX }],
        marginBottom: 16,
      }}
    >
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
    </Animated.View>
);
};

const ProfileButton = ({ title, onPress, animatedValue, width = '100%', marginHorizontal = 0 }) => {
  const { theme } = useTheme();
  
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });
  
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        width,
        marginHorizontal,
      }}
    >
  <TouchableOpacity
        style={[styles.profileButton, { width: '100%' }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.profileButtonText}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const EventItem = ({ event, onPress, animatedValue, isPast = false, isEditable = false, userRole }) => {
  const { theme } = useTheme();
  
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  // For past events, still use TouchableOpacity but only for hosted events (userRole === 'provider')
  const EventContainer = (isPast && userRole !== 'provider') ? View : TouchableOpacity;
  
  // Apply different styles for past events in carousel
  const itemWidth = isPast ? width / 2.5 - 16 : width / 4 - 16;
  
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <EventContainer 
        style={[
          styles.eventItem,
          isPast && { width: itemWidth, marginRight: 12 }
        ]} 
        onPress={(isPast && userRole !== 'provider') ? undefined : onPress}
        activeOpacity={0.7}
      >
        <View style={[
          styles.eventImageContainer,
          isPast && { width: itemWidth, height: itemWidth }
        ]}>
          <Image
            source={{ uri: event.image }}
            style={styles.eventImage}
            resizeMode="cover"
          />
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>
              {(() => {
                try {
                  if (!event.date) return 'TBD';
                  if (typeof event.date === 'string') return event.date;
                  const dateObj = event.date instanceof Date ? event.date : new Date(event.date);
                  return isNaN(dateObj.getTime()) ? 'TBD' : dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  });
                } catch (error) {
                  return 'TBD';
                }
              })()}
            </Text>
          </View>
          
          {/* Show attendee count only for non-past events */}
          {!isPast && (
            <View style={styles.attendeeCountBadge}>
              <Icon name="users" type="feather" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
              <Text style={styles.attendeeCountText}>{formatCount(event.attendees || 0)}</Text>
            </View>
          )}
          
          {isPast && (
            <View style={styles.pastEventBadge}>
              <Text style={styles.pastEventText}>Past Event</Text>
            </View>
          )}
        </View>
        <Text style={[
          styles.eventName, 
          { color: theme.colors.text },
          isPast && { color: 'rgba(255,255,255,0.7)' }
        ]} numberOfLines={2}>
          {event.name}
        </Text>
        
        {/* Only show location for non-past events */}
        {!isPast && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}
      </EventContainer>
    </Animated.View>
  );
};

const CreateEventButton = ({ onPress, animatedValue }) => {
  const { theme } = useTheme();
  
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });
  
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity 
        style={styles.createEventButton} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.createEventIcon}>
          <Icon name="plus" type="feather" size={30} color={theme.colors.textSecondary} />
    </View>
        <Text style={[styles.createEventText, { color: theme.colors.textSecondary }]}>
          Create Event
        </Text>
  </TouchableOpacity>
    </Animated.View>
);
};

// New component for organizer items
const OrganizerItem = ({ organizer, onPress, animatedValue }) => {
  const { theme } = useTheme();
  
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });
  
  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity 
        style={styles.organizerCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Background Image */}
        <Image
          source={{ uri: organizer.coverImage }}
          style={styles.organizerCardBackground}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
          style={styles.organizerCardOverlay}
        />
        
        {/* Content */}
        <View style={styles.organizerCardContent}>
          {/* Avatar */}
          <View style={styles.organizerAvatarContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.organizerAvatarBorder}
            >
              <Image
                source={{ uri: organizer.avatar }}
                style={styles.organizerAvatar}
                resizeMode="cover"
              />
            </LinearGradient>
          </View>
          
          {/* Info */}
          <View style={styles.organizerInfo}>
            <Text style={styles.organizerCardName} numberOfLines={1}>
              {organizer.name}
            </Text>
            <Text style={styles.organizerCardTitle} numberOfLines={1}>
              {organizer.title}
            </Text>
            
            {/* Stats */}
            <View style={styles.organizerStats}>
              <View style={styles.organizerStat}>
                <Icon name="calendar" type="feather" size={12} color="#FFD700" />
                <Text style={styles.organizerStatText}>
                  {formatCount(organizer.upcomingEventsCount || 0)} upcoming
                </Text>
              </View>
              <View style={styles.organizerStat}>
                <Icon name="users" type="feather" size={12} color="#4CAF50" />
                <Text style={styles.organizerStatText}>
                  {formatCount(organizer.totalEvents || 0)} total events
                </Text>
              </View>
            </View>
          </View>
          
          {/* Action Icon */}
          <View style={styles.organizerActionIcon}>
            <Icon name="chevron-right" type="feather" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ProfileScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, switchMode } = useAuth();
  const { followedOrganizers, events, getUserTickets, getEventsByOrganizer, getPastEvents, getUpcomingEvents, getLiveEvents, loading } = useEvents();
  const profileAnimation = useRef(new Animated.Value(0)).current;
  const upcomingEventsAnimation = useRef(new Animated.Value(0)).current;
  const pastEventsAnimation = useRef(new Animated.Value(0)).current;
  const organizerStatsAnimation = useRef(new Animated.Value(0)).current;
  const organizersAnimation = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState('tickets');
  const roleToggleAnim = useRef(new Animated.Value(1)).current;
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const isProvider = user?.role === 'provider';
  const currentMode = user?.currentMode || 'attendee';

  // Debug logging for followedOrganizers
  console.log('🔍 ProfileScreen Debug:', {
    loading,
    followedOrganizers,
    followedOrganizersType: typeof followedOrganizers,
    isArray: Array.isArray(followedOrganizers),
    length: followedOrganizers?.length
  });

  // Get actual tickets from EventsContext
  const [upcomingTickets, setUpcomingTickets] = useState([]);
  const [pastTickets, setPastTickets] = useState([]);

  // Load tickets asynchronously
  useEffect(() => {
    const loadTickets = async () => {
      try {
        const [upcoming, past] = await Promise.all([
          getUserTickets('upcoming'),
          getUserTickets('past')
        ]);
        setUpcomingTickets(upcoming);
        setPastTickets(past);
      } catch (error) {
        console.error('Error loading tickets in ProfileScreen:', error);
        setUpcomingTickets([]);
        setPastTickets([]);
      }
    };

    loadTickets();
  }, [getUserTickets]);

  // Get events created by this user/organizer
  const userCreatedEvents = events?.filter(event => 
    event.organizer?.id === user?.id || 
    event.organizerId === user?.id ||
    event.createdBy === user?.id
  ) || [];

  // Helper function to check if an event is live
  const isEventLive = (event) => {
    const now = new Date();
    const eventDateTime = new Date(event.date);
    eventDateTime.setHours(
      event.startTime.getHours(),
      event.startTime.getMinutes()
    );
    
    // If event has end time, check if current time is between start and end
    if (event.endTime) {
      const eventEndDateTime = new Date(event.date);
      eventEndDateTime.setHours(
        event.endTime.getHours(),
        event.endTime.getMinutes()
      );
      return now >= eventDateTime && now <= eventEndDateTime;
    }
    
    // If no end time, event is considered live for 4 hours after start time
    const eventEndDateTime = new Date(eventDateTime.getTime() + (4 * 60 * 60 * 1000));
    return now >= eventDateTime && now <= eventEndDateTime;
  };

  // Separate upcoming and past created events (excluding live events from upcoming)
  const userUpcomingEvents = userCreatedEvents.filter(event => {
    const now = new Date();
    const eventDate = new Date(event.date);
    const eventStartTime = new Date(event.startTime);
    
    eventDate.setHours(
      eventStartTime.getHours(),
      eventStartTime.getMinutes()
    );
    
    let eventEndDateTime;
    if (event.endTime) {
      const eventEndTime = new Date(event.endTime);
      eventEndDateTime = new Date(eventDate);
      eventEndDateTime.setHours(
        eventEndTime.getHours(),
        eventEndTime.getMinutes()
      );
    } else {
      eventEndDateTime = new Date(eventDate.getTime() + (4 * 60 * 60 * 1000));
    }
    
    // Event is upcoming if it hasn't ended yet AND is not currently live
    return eventEndDateTime >= now && !isEventLive(event);
  });

  const userPastEvents = userCreatedEvents.filter(event => {
    const now = new Date();
    const eventDate = new Date(event.date);
    const eventStartTime = new Date(event.startTime);
    
    eventDate.setHours(
      eventStartTime.getHours(),
      eventStartTime.getMinutes()
    );
    
    let eventEndDateTime;
    if (event.endTime) {
      const eventEndTime = new Date(event.endTime);
      eventEndDateTime = new Date(eventDate);
      eventEndDateTime.setHours(
        eventEndTime.getHours(),
        eventEndTime.getMinutes()
      );
    } else {
      eventEndDateTime = new Date(eventDate.getTime() + (4 * 60 * 60 * 1000));
    }
    
    return eventEndDateTime < now;
  });

  // Convert events to the format expected by EventItem component
  const formatEventForDisplay = (event) => {
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    return {
      id: event.id,
      name: event.title,
      title: event.title,
      date: formattedDate,
      location: event.venue || event.address?.formatted || 'Location TBD',
      image: event.coverImage || event.flyers?.[0] || 'https://via.placeholder.com/300x200',
      attendees: event.bookedSpots || 0,
      hasTicket: false
    };
  };

  // Convert tickets to events format for display
  const getTicketEvents = (tickets) => {
    return tickets.map(ticket => {
      // Format the date properly
      const eventDate = new Date(ticket.eventDate);
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      // Format the time properly
      const eventTime = new Date(ticket.eventTime);
      const formattedTime = eventTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      return {
        id: ticket.id,
        name: ticket.eventTitle, // EventItem expects 'name' not 'title'
        title: ticket.eventTitle,
        date: formattedDate, // Now a string
        time: formattedTime, // Now a string
        location: ticket.eventLocation,
        image: ticket.eventImage,
        hasTicket: true,
        ticketType: ticket.ticketType,
        ticketId: ticket.id,
        // Include organizer information from the ticket
        organizer: ticket.organizer,
        organizerId: ticket.organizer?.id || ticket.organizer,
        eventId: ticket.eventId // Include original event ID for lookup
      };
    });
  };
  
  // Create followed organizers data from actual followed organizers and events
  const getFollowedOrganizersData = () => {
    // Ensure followedOrganizers exists and is an array before proceeding
    const safeFollowedOrganizers = followedOrganizers || [];
    
    if (!Array.isArray(safeFollowedOrganizers) || safeFollowedOrganizers.length === 0) {
      console.log('⚠️ No followed organizers or not an array:', { 
        followedOrganizers, 
        safeFollowedOrganizers,
        type: typeof followedOrganizers,
        isArray: Array.isArray(followedOrganizers)
      });
      return [];
    }

    console.log('🔍 Debug getFollowedOrganizersData:', {
      followedOrganizers,
      safeFollowedOrganizers,
      followedOrganizersType: typeof followedOrganizers,
      isArray: Array.isArray(followedOrganizers),
      totalEvents: events.length,
      eventSample: events.slice(0, 3).map(e => ({
        title: e.title,
        organizer: e.organizer,
        organizerId: e.organizerId,
        createdBy: e.createdBy
      }))
    });

    const organizersData = safeFollowedOrganizers.map(organizerKey => {
      console.log(`🔍 Processing organizer: ${organizerKey}`);
      
      // Find events by this organizer with more flexible matching
      const organizerEvents = events.filter(event => {
        const matches = (
          event.organizer === organizerKey || 
          event.organizerId === organizerKey ||
          event.organizer?.name === organizerKey ||
          event.organizer?.id === organizerKey ||
          event.createdBy === organizerKey ||
          // Additional matching patterns
          (typeof event.organizer === 'string' && event.organizer === organizerKey) ||
          (typeof event.organizer === 'object' && (
            event.organizer?.name === organizerKey ||
            event.organizer?.organizationName === organizerKey
          ))
        );
        
        if (matches) {
          console.log(`✅ Found matching event: ${event.title} for organizer ${organizerKey}`);
        }
        
        return matches;
      });

      console.log(`📊 Organizer ${organizerKey} has ${organizerEvents.length} total events`);

      // Filter for upcoming events only (exclude live events)
      const upcomingEvents = organizerEvents.filter(event => {
        const now = new Date();
        const eventDateTime = new Date(event.date);
        if (event.startTime) {
          eventDateTime.setHours(
            event.startTime.getHours(),
            event.startTime.getMinutes()
          );
        }
        
        // Exclude live events from upcoming count
        const isLive = isEventLive(event);
        const isUpcoming = eventDateTime >= now && !isLive;
        
        if (isUpcoming) {
          console.log(`📅 Upcoming event: ${event.title} for organizer ${organizerKey}`);
        }
        
        return isUpcoming;
      });

      console.log(`🗓️ Organizer ${organizerKey} has ${upcomingEvents.length} upcoming events`);

      // Use the first event's data to get organizer info, or create basic info
      const firstEvent = organizerEvents[0];
      const organizerInfo = firstEvent?.organizer || {};
      
      const organizerData = {
        id: organizerKey,
        name: organizerInfo.organizationName || organizerInfo.name || organizerKey,
        title: organizerInfo.description || organizerInfo.bio || firstEvent?.organizerBio || "Event Organizer",
        avatar: organizerInfo.profilePicture || organizerInfo.avatar || organizerInfo.partyLogo || firstEvent?.organizerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(organizerKey)}&background=FF4B8C&color=fff&size=200`,
        upcomingEventsCount: upcomingEvents.length,
        totalEvents: organizerEvents.length,
        coverImage: firstEvent?.coverImage || firstEvent?.flyers?.[0] || firstEvent?.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        location: organizerInfo.location || firstEvent?.venue || 'Event Organizer',
        followers: organizerInfo.followers || 0
      };
      
      console.log('📋 Final organizer data:', organizerData);
      return organizerData;
    });

    // Sort by upcoming events count (most active first)
    const sortedData = organizersData.sort((a, b) => b.upcomingEventsCount - a.upcomingEventsCount);
    console.log('📊 Final sorted organizers data:', sortedData);
    return sortedData;
  };
  
  // Use real user data or fallback to basic structure
  const userData = {
    name: user?.name || 'User',
    bio: user?.bio || 'Add a bio to tell others about yourself!',
    avatar: user?.profilePicture || user?.providerInfo?.partyLogo,
    location: user?.location || 'Add your location',
    stats: {
      friends: user?.stats?.friendsCount || 0,
      eventsAttended: user?.stats?.eventsAttended || 0,
      following: user?.stats?.followingCount || 0,
    },
    // Use actual upcoming tickets converted to events format
    upcomingEvents: getTicketEvents(upcomingTickets),
    
    // Use actual past tickets converted to events format
    pastEvents: getTicketEvents(pastTickets),
    
    // Use actual followed organizers from EventsContext - only if data is loaded
    followedOrganizers: loading ? [] : getFollowedOrganizersData(),
    
    organizer: {
      name: user?.providerInfo?.organizationName || user?.name || 'Event Organization',
      title: user?.providerInfo?.description || 'Event Organizer',
      avatar: user?.profilePicture || user?.providerInfo?.partyLogo,
      bio: user?.providerInfo?.description || 'Professional event organizer creating amazing experiences.',
      stats: {
        events: userCreatedEvents.length,
        attendees: userCreatedEvents.reduce((sum, event) => sum + (event.bookedSpots || 0), 0),
        followers: user?.providerInfo?.stats?.followers || 0,
      },
      balance: user?.providerInfo?.balance || 0,
      // Use actual created events from EventsContext
      createdEvents: userUpcomingEvents.map(formatEventForDisplay),
      pastCreatedEvents: userPastEvents.map(formatEventForDisplay)
    }
  };
  
  // Debug logging
  useEffect(() => {
    console.log('ProfileScreen - User data:', {
      profilePicture: user?.profilePicture,
      partyLogo: user?.providerInfo?.partyLogo,
      currentMode,
      attendeeAvatar: userData.avatar,
      organizerAvatar: userData.organizer.avatar
    });
    
    console.log('ProfileScreen - Followed organizers data:', {
      followedOrganizers: followedOrganizers,
      followedOrganizersData: userData.followedOrganizers,
      eventsCount: events.length,
      detailedOrganizerData: userData.followedOrganizers?.map(org => ({
        name: org.name,
        upcomingEventsCount: org.upcomingEventsCount,
        totalEvents: org.totalEvents
      }))
    });

    console.log('ProfileScreen - Tickets data:', {
      upcomingTickets: upcomingTickets.length,
      pastTickets: pastTickets.length,
      upcomingEvents: userData.upcomingEvents.length,
      pastEvents: userData.pastEvents.length
    });
  }, [user, currentMode, followedOrganizers, events, upcomingTickets, pastTickets]);
  
  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(profileAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(organizerStatsAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(upcomingEventsAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(organizersAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(pastEventsAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Toggle between attendee and provider modes with animation
  const toggleUserRole = async () => {
    if (!isProvider) {
      Alert.alert(
        'Not a Provider',
        'You need to sign up as an event provider first. Go to Settings to become a provider.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') }
        ]
      );
      return;
    }

    // First scale down
    Animated.timing(roleToggleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start(async () => {
      try {
        const newMode = currentMode === 'attendee' ? 'provider' : 'attendee';
        const result = await switchMode(newMode);
        
        if (result.success) {
          // Scale back up after successful mode switch
      Animated.timing(roleToggleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
        } else {
          Alert.alert('Error', result.message);
          // Scale back up even on error
          Animated.timing(roleToggleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }).start();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to switch mode');
        // Scale back up on error
        Animated.timing(roleToggleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }
    });
  };

  // For attendees, show only first 3 tickets for preview
  const filteredUpcomingEvents = userData.upcomingEvents || [];
  const previewUpcomingEvents = filteredUpcomingEvents.slice(0, 3);
  const hasMoreTickets = filteredUpcomingEvents.length > 3;

  const handleEventPress = (event) => {
    if (event.hasTicket) {
      navigation.navigate('TicketDetails', { 
        ticketId: event.ticketId,
        ticket: {
          id: event.ticketId,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          eventImage: event.image,
          ticketType: event.ticketType
        }
      });
    } else {
      navigation.navigate('EventDetails', { event });
    }
  };

  // Handle edit for organizer events
  const handleEditEvent = (event) => {
    navigation.navigate('Create', { editMode: true, event });
  };

  // Handle create new event
  const handleCreateEvent = () => {
    navigation.navigate('Create');
  };

  // Handle navigation to different edit screens based on user role
  const handleEditProfile = () => {
    if (currentMode === 'attendee') {
      navigation.navigate('EditProfile', { 
        profileData: { name: userData.name, avatar: userData.avatar }
      });
    } else {
      // Navigate to EditOrganizationScreen for organization editing
      navigation.navigate('EditOrganization', { 
        organizer: userData.organizer
      });
    }
  };

  // Handle organizer profile navigation
  const handleOrganizerPress = (organizer) => {
    navigation.navigate('OrganizerProfile', { 
      organizerId: organizer.id,
      organizerName: organizer.name 
    });
  };

  // Handle upcoming event press with popup
  const handleUpcomingEventPress = (event) => {
    setSelectedEvent(event);
    setShowEventPopup(true);
  };

  // Handle edit from popup
  const handleEditFromPopup = () => {
    setShowEventPopup(false);
    if (selectedEvent) {
      // Find the actual event object from events array
      const actualEvent = events.find(e => e.id === selectedEvent.id);
      if (actualEvent) {
        navigation.navigate('Create', { editMode: true, event: actualEvent });
      }
    }
  };

  // Handle stats from popup
  const handleStatsFromPopup = () => {
    setShowEventPopup(false);
    if (selectedEvent) {
      // Find the actual event object from events array
      const actualEvent = events.find(e => e.id === selectedEvent.id);
      if (actualEvent) {
        navigation.navigate('EventStats', { event: actualEvent });
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
      {/* Role toggle in the top left - only show if user is a provider */}
      {isProvider && (
      <Animated.View 
        style={[
          styles.roleToggleContainer,
          {
            transform: [{ scale: roleToggleAnim }],
              backgroundColor: currentMode === 'attendee' ? 'rgba(42, 42, 42, 0.8)' : 'rgba(255, 215, 0, 0.2)',
              borderColor: currentMode === 'attendee' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.6)',
          }
        ]}
      >
        <TouchableOpacity
          style={styles.roleToggleButton}
          onPress={toggleUserRole}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.roleToggleText,
              { color: currentMode === 'attendee' ? '#FFFFFF' : '#FFD700' }
          ]}>
              {currentMode === 'attendee' ? 'Attendee' : 'Event Host'}
          </Text>
          <Icon
            name="chevron-down" 
            type="feather"
            size={16} 
            color="#FFD700" 
            style={styles.roleToggleIcon}
          />
        </TouchableOpacity>
      </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: isProvider ? 60 : 20 } // Add padding only if role toggle is shown
        ]}
      >
        <Animated.View style={{
          opacity: profileAnimation,
          transform: [{
            translateY: profileAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            })
          }]
        }}>
        <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {(currentMode === 'attendee' ? userData.avatar : userData.organizer.avatar) ? (
              <Avatar
                size={120}
                rounded
                  source={{ uri: currentMode === 'attendee' ? userData.avatar : userData.organizer.avatar }}
                containerStyle={styles.avatar}
          />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {(currentMode === 'attendee' ? userData.name : userData.organizer.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          <Text style={[styles.userName, { color: theme.colors.text }]}>
              {currentMode === 'attendee' ? userData.name : userData.organizer.name}
            </Text>
            
            {currentMode === 'provider' && (
              <Text style={styles.organizerTitle}>
                {userData.organizer.title}
          </Text>
            )}
            
            <View style={styles.buttonRow}>
              <ProfileButton 
                title={currentMode === 'attendee' ? "Edit Profile" : "Edit Organization"}
                onPress={handleEditProfile}
                animatedValue={profileAnimation}
                width="49%"
                marginHorizontal={0}
              />
              <ProfileButton 
                title="Settings" 
                onPress={() => navigation.navigate('Settings')}
                animatedValue={profileAnimation}
                width="49%"
                marginHorizontal={0}
              />
            </View>
          </View>
        </Animated.View>

        {/* Followed Organizers Section - only visible in attendee mode */}
        {currentMode === 'attendee' && (
          <View style={styles.eventsSection}>
            <View style={styles.sectionHeaderRow}>
              <AnimatedSectionTitle 
                title="Followed Organizers" 
                animatedValue={organizersAnimation} 
              />
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.organizersCarousel}
            >
              {userData.followedOrganizers?.length > 0 ? (
                userData.followedOrganizers.map((organizer) => (
                <OrganizerItem
                  key={organizer.id}
                  organizer={organizer}
                  onPress={() => handleOrganizerPress(organizer)}
                  animatedValue={organizersAnimation}
                />
                ))
              ) : (
                <View style={styles.emptyCarouselState}>
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                    No followed organizers yet
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                    Discover and follow event organizers!
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Organizer Stats Section - only visible in provider mode */}
        {currentMode === 'provider' && (
          <Animated.View style={{
            opacity: organizerStatsAnimation,
            transform: [{
              translateY: organizerStatsAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              })
            }]
          }}>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <TouchableOpacity style={styles.withdrawButton}>
                  <Text style={styles.withdrawText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.balanceAmount}>
                ${userData.organizer.balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </Text>
              <View style={styles.balanceInfo}>
                <Icon
                  name="info"
                  type="feather"
                  size={12}
                  color="rgba(255, 255, 255, 0.6)"
                  style={styles.infoIcon}
                />
                <Text style={styles.balanceInfoText}>
                  Earnings from your ticket sales. Withdrawals take 1-2 business days.
                </Text>
              </View>
            </View>
            
            <View style={styles.statsSection}>
              <View style={styles.statItem}>
                <Icon
                  name="calendar"
                  type="feather"
                  size={24}
                  color="#FF4B8C"
                  style={styles.statIcon}
                />
                <Text style={styles.statCount}>{formatCount(userData.organizer.stats.events)}+</Text>
                <Text style={styles.statLabel}>Events</Text>
        </View>

              <View style={styles.statItem}>
                <Icon
                  name="users"
                  type="feather"
                  size={24}
                  color="#4A00E0"
                  style={styles.statIcon}
                />
                <Text style={styles.statCount}>{formatCount(userData.organizer.stats.attendees)}+</Text>
                <Text style={styles.statLabel}>Attendees</Text>
        </View>

              <View style={styles.statItem}>
                <Icon
                  name="heart"
                  type="feather"
                  size={24}
                  color="#FF4757"
                  style={styles.statIcon}
                />
                <Text style={styles.statCount}>{formatCount(userData.organizer.stats.followers)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Events Section - content changes based on role */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeaderRow}>
            <AnimatedSectionTitle 
              title={currentMode === 'attendee' ? "My Tickets" : "Upcoming Events"} 
              animatedValue={upcomingEventsAnimation} 
            />
            {currentMode === 'attendee' && hasMoreTickets && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('My Tickets')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>View All ({filteredUpcomingEvents.length})</Text>
                <Icon
                  name="chevron-right"
                  type="feather"
                  size={16}
                  color="#FFD700"
                />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.eventsContainer}>
            {currentMode === 'attendee' ? (
              previewUpcomingEvents.length > 0 ? (
              // Show tickets for attendee (preview of first 3)
              previewUpcomingEvents.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  onPress={() => handleEventPress(event)}
                  animatedValue={upcomingEventsAnimation}
                    userRole={currentMode}
                />
              ))
            ) : (
                // Show message when no tickets
                <View style={styles.emptyStateContainer}>
                  <Icon
                    name="confirmation-number"
                    type="material"
                    size={48}
                    color="rgba(255,255,255,0.3)"
                    style={styles.emptyStateIcon}
                  />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                    No tickets yet
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                    Start exploring events to get your first tickets!
                  </Text>
                </View>
              )
            ) : (
              userData.organizer.createdEvents?.length > 0 ? (
                // Show created events for provider
                userData.organizer.createdEvents.map((event) => (
                <EventItem
                key={event.id}
                event={event}
                  onPress={() => handleUpcomingEventPress(event)}
                  animatedValue={upcomingEventsAnimation}
                  isEditable={true}
                    userRole={currentMode}
                  />
                ))
              ) : (
                // Show create event prompt
                <View style={styles.emptyStateContainer}>
                  <Icon
                    name="calendar"
                    type="feather"
                    size={48}
                    color="rgba(255,255,255,0.3)"
                    style={styles.emptyStateIcon}
              />
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                    No events created yet
                  </Text>
                  <TouchableOpacity
                    style={styles.createEventPrompt}
                    onPress={handleCreateEvent}
                  >
                    <Text style={styles.createEventPromptText}>
                      Create Your First Event
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>
        </View>
        
        {/* Past Events Section */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeaderRow}>
            <AnimatedSectionTitle 
              title={currentMode === 'attendee' ? "Past Tickets" : "Past Hosted Events"} 
              animatedValue={pastEventsAnimation} 
            />
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pastEventsCarousel}
          >
            {currentMode === 'attendee' ? (
              userData.pastEvents?.length > 0 ? (
              // Show past attended events
                userData.pastEvents.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  onPress={() => {}} // No navigation for past events
                  animatedValue={pastEventsAnimation}
                  isPast={true}
                    userRole={currentMode}
                />
              ))
            ) : (
                <View style={styles.emptyCarouselState}>
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                    No past events
                  </Text>
                </View>
              )
            ) : (
              userData.organizer.pastCreatedEvents?.length > 0 ? (
              // Show past hosted events - display only, not editable
                userData.organizer.pastCreatedEvents.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  onPress={() => navigation.navigate('EventStats', { event })}
                  animatedValue={pastEventsAnimation}
                  isPast={true}
                  isEditable={false}
                    userRole={currentMode}
                />
              ))
              ) : (
                <View style={styles.emptyCarouselState}>
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                    No past events
                  </Text>
                </View>
              )
            )}
          </ScrollView>
        </View>
      </ScrollView>

      <CustomNavBar activeScreen="Profile" />

      {/* Event Action Popup */}
      <Modal
        visible={showEventPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEventPopup(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEventPopup(false)}
        >
          <View style={styles.popupContainer}>
            <TouchableOpacity
              style={styles.popupContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.popupHeader}>
                <Text style={styles.popupTitle}>
                  {selectedEvent?.name || 'Event Options'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowEventPopup(false)}
                >
                  <Icon name="x" type="feather" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.popupActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleEditFromPopup}
                >
                  <Icon name="edit-2" type="feather" size={20} color="#FFD700" />
                  <Text style={styles.actionButtonText}>Edit Event</Text>
                  <Text style={styles.actionButtonSubtext}>Modify event details</Text>
                </TouchableOpacity>

                <View style={styles.actionDivider} />

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleStatsFromPopup}
                >
                  <Icon name="bar-chart-2" type="feather" size={20} color="#4CAF50" />
                  <Text style={styles.actionButtonText}>View Stats</Text>
                  <Text style={styles.actionButtonSubtext}>See ticket sales & revenue</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Much darker background
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra padding for the floating tab bar
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  avatarContainer: {
    padding: 4,
    marginBottom: 16,
    borderRadius: 60,
  },
  avatar: {
    borderWidth: 0,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  friendCount: {
    fontSize: 36,
    fontWeight: '700',
  },
  friendsLabel: {
    fontSize: 16,
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  profileButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    backgroundColor: '#2A2A2A',
  },
  profileButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    marginRight: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  viewAllText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
    marginRight: 4,
  },
  eventsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  pastEventsCarousel: {
    paddingVertical: 12,
    paddingLeft: 8,
    paddingRight: 24,
    gap: 16,
  },
  eventItem: {
    width: width / 4 - 16,
    alignItems: 'center',
  },
  eventImageContainer: {
    position: 'relative',
    width: width / 4 - 16,
    height: width / 4 - 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventName: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  dateBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FF416C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  ticketBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFD700',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketAvailableBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  ticketInfoContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  ticketTypeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
  },
  createEventButton: {
    width: width / 4 - 16,
    alignItems: 'center',
  },
  createEventIcon: {
    width: width / 4 - 16,
    height: width / 4 - 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(170, 170, 170, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  createEventText: {
    fontSize: 14,
    textAlign: 'center',
  },
  roleToggleContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleToggleIcon: {
    marginLeft: 4,
  },
  organizerTitle: {
    fontSize: 16,
    color: '#FFD700',
    marginBottom: 16,
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  editBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4A00E0',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeeCountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  locationContainer: {
    marginTop: 4,
  },
  locationText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  balanceCard: {
    backgroundColor: 'rgba(74, 0, 224, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#4A00E0',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  withdrawButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  withdrawText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 6,
  },
  balanceInfoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
  },
  organizersCarousel: {
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 24,
  },
  organizerCard: {
    width: width * 0.75,
    height: 160,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  organizerCardBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  organizerCardOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  organizerCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  organizerAvatarContainer: {
    alignSelf: 'flex-start',
  },
  organizerAvatarBorder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  organizerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  organizerInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  organizerCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  organizerCardTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  organizerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  organizerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flex: 0.48,
  },
  organizerStatText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  organizerActionIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  createEventPrompt: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  createEventPromptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyCarouselState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderWidth: 0,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pastEventBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pastEventText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  pastEventDetails: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  pastEventDetailText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  // Popup styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    width: width * 0.85,
    maxWidth: 300,
  },
  popupContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    overflow: 'hidden',
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: 4,
  },
  popupActions: {
    padding: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 12,
    marginTop: 2,
  },
  actionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
});

export default ProfileScreen; 