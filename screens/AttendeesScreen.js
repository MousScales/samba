import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Dimensions, Animated, StatusBar } from 'react-native';
import { Text, useTheme, Icon } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '../context/EventsContext';
import { formatCount } from '../utils/formatNumbers';

const { width } = Dimensions.get('window');
const GRID_PADDING = 20;
const NUM_COLUMNS = 3;
const PROFILE_SIZE = (width - (GRID_PADDING * 2) - ((NUM_COLUMNS - 1) * 10)) / NUM_COLUMNS;

// TODO: Replace with real attendees from backend
const ATTENDEES_DATA = [];

const FloatingProfile = ({ attendee, index }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // Create a more dynamic floating effect with random values
    const floatDuration = 2000 + (Math.random() * 1500);
    const floatDistance = -5 - (Math.random() * 5);
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: floatDuration,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: floatDuration,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [floatAnim, scaleAnim, opacityAnim, index]);
  
  // Calculate animations
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5 - (index % 3)],
  });
  
  // Create a pulse effect when pressed
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.profileContainer,
        {
          transform: [
            { translateY },
            { scale: scaleAnim }
          ],
          opacity: opacityAnim,
        }
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.profileTouchable}
        >
          <Image
            source={{ uri: attendee.avatar }}
          style={styles.profileImage}
        />
        <View style={styles.profileGlow} />
        <Text style={styles.attendeeName} numberOfLines={1}>
          {attendee.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

function AttendeesScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { getUserTickets } = useEvents();
  const { eventId } = route.params || {};
  const [attendeesData, setAttendeesData] = useState([]);
  
  useEffect(() => {
    // Hide the default header
    navigation.setOptions({
      headerShown: false,
    });
    
    // Get attendees from tickets
    const loadAttendees = async () => {
      if (eventId) {
        try {
          const allTickets = await getUserTickets('all');
          
          // Ensure allTickets is an array
          if (!Array.isArray(allTickets)) {
            console.warn('allTickets is not an array:', allTickets);
            setAttendeesData([]);
            return;
          }
          
          const eventTickets = allTickets.filter(ticket => ticket.eventId === eventId);
          
          // Create unique attendees list from tickets
          const uniqueAttendees = [];
          const seenEmails = new Set();
          
          eventTickets.forEach(ticket => {
            if (!seenEmails.has(ticket.buyerEmail)) {
              seenEmails.add(ticket.buyerEmail);
              uniqueAttendees.push({
                id: ticket.buyerEmail,
                name: ticket.buyerName,
                email: ticket.buyerEmail,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(ticket.buyerName)}&background=random&color=fff&size=200`,
                ticketType: ticket.ticketType,
                purchaseDate: ticket.purchaseDate
              });
            }
          });
          
          console.log('📋 Attendees for event:', eventId, {
            totalTickets: eventTickets.length,
            uniqueAttendees: uniqueAttendees.length,
            attendees: uniqueAttendees.map(a => ({ name: a.name, email: a.email }))
          });
          
          setAttendeesData(uniqueAttendees);
        } catch (error) {
          console.error('Error loading attendees:', error);
          setAttendeesData([]);
        }
      }
    };
    
    loadAttendees();
  }, [navigation, eventId, getUserTickets]);

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Icon
        name="users"
        type="feather"
        size={64}
        color="rgba(255,255,255,0.3)"
        style={styles.emptyStateIcon}
      />
      <Text style={styles.emptyStateTitle}>No Attendees Yet</Text>
      <Text style={styles.emptyStateMessage}>
        Be the first to join this event!
      </Text>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1E1E2A', '#121218']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back-ios" color="#fff" size={20} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Guestlist</Text>
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.attendeeCount}>
              {formatCount(attendeesData.length)} people attending
            </Text>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {attendeesData.length > 0 ? (
                <View style={styles.profileGrid}>
                  {attendeesData.map((attendee, index) => (
                    <FloatingProfile
                      key={attendee.id}
                      attendee={attendee}
                      index={index}
                    />
                  ))}
                </View>
              ) : (
                renderEmptyState()
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: -4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 40, // Offset for the back button to center the title
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: GRID_PADDING,
    paddingTop: 20,
  },
  attendeeCount: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginVertical: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    paddingTop: 15,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  profileContainer: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE + 30,
    alignItems: 'center',
    marginBottom: 15,
  },
  profileTouchable: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  profileGlow: {
    position: 'absolute',
    width: PROFILE_SIZE + 10,
    height: PROFILE_SIZE + 10,
    borderRadius: (PROFILE_SIZE + 10) / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: -1,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  attendeeName: {
    marginTop: 8,
    paddingHorizontal: 4,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});

export default AttendeesScreen; 