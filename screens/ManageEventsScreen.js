import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  StatusBar,
  Image
} from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '../context/EventsContext';
import { formatCount } from '../utils/formatNumbers';
import { useAuth } from '../context/AuthContext';
import CustomNavBar from '../components/CustomNavBar';

const { width } = Dimensions.get('window');

const ManageEventsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { events, deleteEvent, getLiveEvents, getUpcomingEvents, getPastEvents, triggerStatusUpdate } = useEvents();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [fadeAnim] = useState(new Animated.Value(0));

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
      // Trigger immediate status update when screen is focused
      triggerStatusUpdate();
    });

    return unsubscribe;
  }, [navigation, triggerStatusUpdate]);

  // Add automatic tab switching when events go live
  useEffect(() => {
    const checkForLiveEvents = () => {
      const userLiveEvents = getLiveEvents().filter(event => event.organizer?.id === user?.id);
      if (userLiveEvents.length > 0 && activeTab !== 'live') {
        setActiveTab('live');
      }
    };

    // Check immediately and then every minute
    checkForLiveEvents();
    const intervalId = setInterval(checkForLiveEvents, 60000);

    return () => clearInterval(intervalId);
  }, [events, user?.id]);

  const renderEventCard = (event) => {
    // Use the event's status property which is automatically updated by EventsContext
    const isPastEvent = event.status === 'completed';
    const isLiveEvent = event.status === 'live';
    const isUpcomingEvent = event.status === 'upcoming';
    
    // Get startTime for display purposes
    const eventStartTime = new Date(event.startTime);
    
    let statusConfig = {
      color: '',
      text: '',
      icon: '',
      gradient: []
    };
    
    if (isLiveEvent) {
      statusConfig = {
        color: '#4CAF50',
        text: 'LIVE NOW',
        icon: 'radio',
        gradient: ['#4CAF50', '#45a049']
      };
    } else if (isPastEvent) {
      statusConfig = {
        color: '#9E9E9E',
        text: 'PAST',
        icon: 'clock',
        gradient: ['#9E9E9E', '#757575']
      };
    } else {
      statusConfig = {
        color: '#FFFFFF',
        text: 'UPCOMING',
        icon: 'calendar',
        gradient: ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)']
      };
    }

    const CardWrapper = ({ children }) => (
      <TouchableOpacity 
        onPress={() => {
          if (isPastEvent) {
            navigation.navigate('EventStats', { event });
          } else if (isLiveEvent) {
            navigation.navigate('LiveEventStats', { event });
          } else {
            navigation.navigate('Create', { 
              viewMode: true, 
              event,
              editMode: false 
            });
          }
        }}
        activeOpacity={0.7}
        style={styles.cardTouchable}
      >
        {children}
      </TouchableOpacity>
    );

    return (
      <Animated.View 
        key={event.id}
        style={[
          styles.eventCard,
          { 
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          }
        ]}
      >
        <CardWrapper>
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
            style={styles.eventCardContent}
          >
            {/* Event Image with Overlay Content */}
            <View style={styles.eventImageSection}>
              {(event.coverImage || event.flyers?.[0] || event.image) ? (
                <Image
                  source={{ uri: event.coverImage || event.flyers?.[0] || event.image }}
                  style={styles.eventImagePlaceholder}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.eventImagePlaceholder}>
                  <Icon 
                    name="image" 
                    type="feather" 
                    size={32} 
                    color="rgba(255,255,255,0.4)" 
                  />
                </View>
              )}
              
              {/* Gradient overlay for text readability */}
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                style={styles.imageOverlay}
              />
              
              {/* Status badge */}
              <LinearGradient
                colors={statusConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.statusBadge}
              >
                <Icon 
                  name={statusConfig.icon} 
                  type="feather" 
                  size={12} 
                  color="#FFFFFF" 
                  style={styles.statusIcon}
                />
                <Text style={styles.statusText}>{statusConfig.text}</Text>
              </LinearGradient>
              
              {/* Content overlay on image */}
              <View style={styles.eventContentOverlay}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  <View style={styles.attendeeChip}>
                    <Icon name="users" type="feather" size={12} color="#FFFFFF" />
                    <Text style={styles.attendeeText}>{formatCount(event.bookedSpots || 0)}</Text>
                  </View>
                </View>

                <View style={styles.eventDetails}>
                  <View style={styles.detailRow}>
                    <Icon name="calendar" type="feather" size={14} color={statusConfig.color} />
                    <Text style={[styles.detailText, { color: 'rgba(255,255,255,0.9)' }]}>
                      {new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Icon name="clock" type="feather" size={14} color={statusConfig.color} />
                    <Text style={[styles.detailText, { color: 'rgba(255,255,255,0.9)' }]}>
                      {new Date(eventStartTime).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Icon name="map-pin" type="feather" size={14} color={statusConfig.color} />
                    <Text style={[styles.detailText, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>
                      {event.venue || event.location || 'Location TBD'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons for Upcoming Events */}
                {!isPastEvent && !isLiveEvent && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.editButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('Create', { editMode: true, event });
                      }}
                    >
                      <Icon name="edit-2" type="feather" size={14} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        deleteEvent(event.id);
                      }}
                    >
                      <Icon name="trash-2" type="feather" size={14} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Live Indicator */}
                {isLiveEvent && (
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Event is live now</Text>
                    <Icon name="external-link" type="feather" size={14} color="#4CAF50" />
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        </CardWrapper>
      </Animated.View>
    );
  };

  // Calculate live events count for badge (always show correct count regardless of active tab)
  const userLiveEventsCount = (() => {
    return getLiveEvents().filter(event => event.organizer?.id === user?.id).length;
  })();

  const filteredEvents = (() => {
    const userEvents = events?.filter(event => event.organizer?.id === user?.id) || [];
    
    switch (activeTab) {
      case 'live':
        return getLiveEvents().filter(event => event.organizer?.id === user?.id);
      case 'past':
        return getPastEvents().filter(event => event.organizer?.id === user?.id);
      case 'upcoming':
      default:
        return getUpcomingEvents().filter(event => event.organizer?.id === user?.id);
    }
  })();

  const renderEmptyState = () => {
    const emptyStateConfig = {
      upcoming: {
        title: 'No Upcoming Events'
      },
      live: {
        title: 'No Live Events'
      },
      past: {
        title: 'No Past Events'
      }
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
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={styles.headerTitle}>My Events</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => navigation.navigate('Create')}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
              style={styles.createButtonGradient}
            >
              <Icon name="plus" type="feather" size={18} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Event</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Tab Navigation */}
        <Animated.View style={[styles.tabContainer, { opacity: fadeAnim }]}>
          {['upcoming', 'live', 'past'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={activeTab === tab 
                  ? ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)'] 
                  : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
                }
                style={styles.tabGradient}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === tab ? '#FFFFFF' : 'rgba(255,255,255,0.6)' }
                ]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {tab === 'live' && userLiveEventsCount > 0 && (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>{userLiveEventsCount}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Events List */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredEvents.length > 0 ? (
            <View style={styles.eventsGrid}>
              {filteredEvents.map(renderEventCard)}
            </View>
          ) : (
            renderEmptyState()
          )}
        </ScrollView>
      </SafeAreaView>

      <CustomNavBar activeScreen="ManageEvents" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabText: {
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
    paddingBottom: 100,
  },
  eventsGrid: {
    gap: 16,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardTouchable: {
    width: '100%',
  },
  eventCardContent: {
    padding: 0,
  },
  eventImageSection: {
    position: 'relative',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventImagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
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
    padding: 16,
    justifyContent: 'space-between',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
  },
  attendeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  attendeeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  liveText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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