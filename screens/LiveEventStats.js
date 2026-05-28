import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  Animated,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Text, Icon, useTheme, Button } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '../context/EventsContext';
import { formatCount } from '../utils/formatNumbers';

const { width } = Dimensions.get('window');

const LiveEventStats = ({ route, navigation }) => {
  const { event } = route.params;
  const { theme } = useTheme();
  const { updateEvent, getEventActivities } = useEvents();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Calculate real stats from event data
  const attendeeCount = event.bookedSpots || 0;
  const checkedInCount = event.scannedTickets || 0;
  const revenueAmount = (() => {
    if (!event.tickets || event.tickets.length === 0) return 0;
    return event.tickets.reduce((total, ticket) => {
      const sold = ticket.sold || 0;
      const price = parseFloat(ticket.price) || 0;
      return total + (sold * price);
    }, 0);
  })();

  // Pulse animation for "Live" indicator
  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse).start();
  }, []);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleEndEvent = () => {
    Alert.alert(
      'End Event',
      'Are you sure you want to end this event early? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Event',
          style: 'destructive',
          onPress: async () => {
            try {
              // Create a new Date object for the end time
              const now = new Date();
              
              // Update the event with end time and status
              await updateEvent(event.id, {
                endTime: now,
                status: 'completed',
                updatedAt: now
              });
              
              // Show success message
              Alert.alert(
                'Event Ended',
                'The event has been successfully ended.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('ManageEvents', { screen: 'past' })
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to end the event. Please try again.');
            }
          },
        },
      ]
    );
  };

  const StatCard = ({ icon, title, value, color, suffix = '' }) => (
    <Animated.View style={[styles.statCard, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        style={styles.statCardContent}
      >
        <View style={styles.statIconContainer}>
          <Icon name={icon} type="feather" size={24} color={color} />
        </View>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}{suffix}</Text>
        {title === 'Time Elapsed' && (
          <Text style={styles.timeRemaining}>
            {event.endTime 
              ? `${getTimeRemaining(event.endTime)} remaining`
              : 'No end time selected'}
          </Text>
        )}
      </LinearGradient>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" type="feather" color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>{event.title}</Text>
          <View style={styles.liveIndicatorContainer}>
            <Animated.View
              style={[
                styles.liveDot,
                { transform: [{ scale: pulseAnim }] }
              ]}
            />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.endEventButton}
          onPress={handleEndEvent}
        >
          <LinearGradient
            colors={['#FF4757', '#FF6B81']}
            style={styles.endEventGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Icon name="power" type="feather" size={18} color="#FFFFFF" />
            <Text style={styles.endEventText}>End Event</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <StatCard
            icon="users"
            title="Total Attendees"
            value={formatCount(attendeeCount)}
            color="#4CAF50"
          />
          <StatCard
            icon="user-check"
            title="Checked In"
            value={formatCount(checkedInCount)}
            color="#2196F3"
          />
          <StatCard
            icon="dollar-sign"
            title="Revenue"
            value={revenueAmount.toFixed(2)}
            color="#FFD700"
            suffix="$"
          />
          <StatCard
            icon="clock"
            title="Time Elapsed"
            value={getTimeElapsed(event.startTime)}
            color="#FF4B8C"
          />
        </View>

        {/* Verification Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scanner Verification Code</Text>
          <View style={styles.verificationContainer}>
            <Text style={styles.verificationCode}>{event.verificationCode}</Text>
            <Text style={styles.verificationDescription}>
              Share this code with ticket scanners to validate tickets for this event.
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => navigation.navigate('VerificationCode', { event })}
            >
              <LinearGradient
                colors={['#4CAF50', '#45A049']}
                style={styles.scanButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="maximize" type="feather" size={20} color="#FFFFFF" style={styles.scanIcon} />
                <Text style={styles.scanButtonText}>Start Scanning</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityFeed}>
            {(() => {
              const activities = getEventActivities(event.id);
              if (activities.length === 0) {
                return (
                  <View style={styles.emptyActivityState}>
                    <Icon name="activity" type="feather" size={32} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyActivityText}>No activity yet</Text>
                    <Text style={styles.emptyActivitySubtext}>
                      Activity will appear here when tickets are scanned or purchased
                    </Text>
                  </View>
                );
              }

              return activities.slice(0, 10).map((activity, index) => (
                <Animated.View
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    {
                      opacity: fadeAnim,
                      transform: [{
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      }],
                    },
                  ]}
                >
                  <Icon name={activity.icon} type="feather" size={16} color={activity.color} />
                  <Text style={styles.activityText}>{activity.text}</Text>
                  <Text style={styles.activityTime}>
                    {getTimeAgo(activity.timestamp)}
                  </Text>
                </Animated.View>
              ));
            })()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper function to get time elapsed
const getTimeElapsed = (startTime) => {
  const start = new Date(startTime);
  const now = new Date();
  const diff = now - start;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// Helper function to get relative time
const getTimeAgo = (timestamp) => {
  const now = new Date();
  const diff = now - new Date(timestamp);
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// Helper function to get time remaining
const getTimeRemaining = (endTime) => {
  if (!endTime) return 'No end time selected';
  
  const end = new Date(endTime);
  const now = new Date();
  const diff = end - now;
  
  if (diff <= 0) return '0h 0m';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m remaining`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: {
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  liveText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
    alignItems: 'flex-start', // Align cards to the top
  },
  statCard: {
    width: (width - 60) / 2,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 140, // Ensure minimum height for all cards
  },
  statCardContent: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    minHeight: 140, // Match the card minimum height
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  activityFeed: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 16,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  activityText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
  },
  activityTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  emptyActivityState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyActivityText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyActivitySubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  endEventButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 16,
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
  endEventGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  endEventText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  verificationContainer: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  verificationCode: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4CAF50',
    letterSpacing: 8,
    marginBottom: 16,
  },
  verificationDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  scanButton: {
    width: '100%',
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
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
  scanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  scanIcon: {
    marginRight: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timeRemaining: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4, // Add horizontal padding to prevent text cutoff
  },
});

export default LiveEventStats; 