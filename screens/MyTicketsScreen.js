import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Dimensions, Platform, Animated, StatusBar } from 'react-native';
import { Text, useTheme, Icon } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import CustomNavBar from '../components/CustomNavBar';
import { useEvents } from '../context/EventsContext';
import { formatCount } from '../utils/formatNumbers';
import { useLanguage } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

// Enhanced Animated Ticket Card Component
const TicketCard = ({ ticket, onPress, index, scrollY, isPast }) => {
  const { theme } = useTheme();
  const { t, locale } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const delay = index * 150;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const Container = isPast ? View : TouchableOpacity;

  return (
    <Animated.View
      style={[
        styles.ticketCardWrapper,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
        },
      ]}
    >
      <Container
        style={[styles.ticketCard, isPast && styles.pastTicketCard]}
        {...(!isPast && {
          onPress,
          activeOpacity: 0.9
        })}
      >
        {/* Glassmorphism Background */}
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.1)',
            'rgba(255, 255, 255, 0.05)',
            'rgba(255, 255, 255, 0.02)'
          ]}
          style={styles.ticketGlassBackground}
        />
        
        {/* Ticket Content Container */}
        <View style={styles.ticketContentContainer}>
          {/* Image Section with Enhanced Overlays */}
          <View style={styles.ticketImageSection}>
            <Image 
              source={{ uri: ticket.eventImage }} 
              style={styles.ticketImage}
              resizeMode="cover"
            />
            
            {/* Gradient Overlay */}
            <LinearGradient
              colors={[
                'transparent',
                'rgba(0,0,0,0.3)',
                'rgba(0,0,0,0.8)'
              ]}
              style={styles.imageGradientOverlay}
            />
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, isPast && styles.pastStatusBadge]}>
              <BlurView intensity={80} style={styles.statusBlur}>
                <View style={styles.statusContent}>
                  <Icon
                    name={
                      ticket.status === 'missed' ? "x-circle" :
                      ticket.status === 'used' || ticket.isScanned ? "check-circle" :
                      isPast ? "clock" : "calendar"
                    }
                    type="feather"
                    size={12}
                    color={
                      ticket.status === 'missed' ? "#FF6B6B" :
                      ticket.status === 'used' || ticket.isScanned ? "#4CAF50" :
                      isPast ? "#FF6B6B" : "#4ECDC4"
                    }
                    style={styles.statusIcon}
                  />
                  <Text style={[
                    styles.statusText, 
                    isPast && styles.pastStatusText,
                    ticket.status === 'missed' && styles.missedStatusText,
                    (ticket.status === 'used' || ticket.isScanned) && styles.attendedStatusText
                  ]}>
                    {
                      ticket.status === 'missed' ? t('myTickets.status.missed') :
                      ticket.status === 'used' || ticket.isScanned ? t('myTickets.status.attended') :
                      isPast ? t('myTickets.status.pastEvent') : t('myTickets.status.upcoming')
                    }
                  </Text>
                </View>
              </BlurView>
            </View>

            {/* Price Badge */}
            <View style={styles.priceBadge}>
              <BlurView intensity={60} style={styles.priceBlur}>
                <Text style={styles.priceText}>
                  {ticket.isFree ? t('createEvent.ticket.free') : `$${ticket.price}`}
                </Text>
              </BlurView>
            </View>

            {/* Attendee Count Badge */}
            <View style={styles.attendeeCountBadge}>
              <BlurView intensity={60} style={styles.attendeeCountBlur}>
                <Icon 
                  name="users" 
                  type="feather" 
                  size={14} 
                  color="#FFFFFF" 
                  style={{ marginRight: 4 }} 
                />
                <Text style={styles.attendeeCountText}>
                  {formatCount(ticket.attendeeCount || 0)}
                </Text>
              </BlurView>
            </View>
          </View>

          {/* Enhanced Content Section */}
          <View style={styles.ticketInfo}>
            <View style={styles.ticketHeader}>
              <Text style={[styles.ticketTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {ticket.eventTitle}
              </Text>
              {!isPast && (
                <View style={styles.chevronContainer}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.chevronBackground}
                  >
                    <Icon
                      name="chevron-right"
                      type="feather"
                      size={16}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Enhanced Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)']}
                    style={styles.detailIconBG}
                  >
                    <Icon
                      name="calendar"
                      type="feather"
                      size={14}
                      color="#FFD700"
                    />
                  </LinearGradient>
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('myTickets.label.date')}</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {new Date(ticket.eventDate).toLocaleDateString(locale, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <LinearGradient
                    colors={['rgba(78, 205, 196, 0.2)', 'rgba(78, 205, 196, 0.1)']}
                    style={styles.detailIconBG}
                  >
                    <Icon
                      name="map-pin"
                      type="feather"
                      size={14}
                      color="#4ECDC4"
                    />
                  </LinearGradient>
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('myTickets.label.location')}</Text>
                  <Text 
                    style={[styles.detailValue, { color: theme.colors.text }]} 
                    numberOfLines={1}
                  >
                    {ticket.eventLocation}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <LinearGradient
                    colors={['rgba(255, 107, 107, 0.2)', 'rgba(255, 107, 107, 0.1)']}
                    style={styles.detailIconBG}
                  >
                    <Icon
                      name="tag"
                      type="feather"
                      size={14}
                      color="#FF6B6B"
                    />
                  </LinearGradient>
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{t('myTickets.label.type')}</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {ticket.ticketType}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Shimmer Effect for Interactive Cards */}
        {!isPast && (
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.1)',
              'transparent'
            ]}
            start={{ x: -1, y: 0 }}
            end={{ x: 2, y: 0 }}
            style={styles.shimmerOverlay}
          />
        )}
      </Container>
    </Animated.View>
  );
};

// Enhanced Empty State Component
const EmptyState = ({ activeTab, navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.emptyStateContainer}>
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.08)',
          'rgba(255, 255, 255, 0.04)',
          'rgba(255, 255, 255, 0.02)'
        ]}
        style={styles.emptyStateCard}
      >
        {/* Animated Icon */}
        <Animated.View
          style={[
            styles.emptyIconContainer,
            {
              transform: [
                { scale: pulseAnim },
                { translateY: floatAnim }
              ],
            },
          ]}
        >
          <LinearGradient
            colors={activeTab === 'upcoming' ? ['#FFD700', '#FFA500'] : ['#FF6B6B', '#FF8E53']}
            style={styles.emptyIconBackground}
          >
            <Icon
              name={activeTab === 'upcoming' ? "ticket" : "clock"}
              type="feather"
              size={48}
              color="#FFFFFF"
            />
          </LinearGradient>
          
          {/* Pulse Ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.1],
                  outputRange: [0.3, 0]
                })
              }
            ]}
          />
        </Animated.View>

        <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
          {activeTab === 'upcoming' ? t('myTickets.empty.upcoming.title') : t('myTickets.empty.past.title')}
        </Text>

        <View style={styles.emptyStateDivider}>
          <LinearGradient
            colors={['transparent', '#FFD700', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dividerGradient}
          />
        </View>

        <Text style={[styles.emptyStateMessage, { color: theme.colors.textSecondary }]}>
          {activeTab === 'upcoming'
            ? t('myTickets.empty.upcoming.message')
            : t('myTickets.empty.past.message')}
        </Text>

        {activeTab === 'upcoming' && (
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Explore')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.exploreButtonGradient}
            >
              <Icon
                name="compass"
                type="feather"
                size={20}
                color="#FFFFFF"
                style={styles.exploreButtonIcon}
              />
              <Text style={styles.exploreButtonText}>{t('myTickets.empty.exploreButton')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Feature Highlights */}
        <View style={styles.featureHighlights}>
          {[
            { icon: 'calendar', text: t('myTickets.empty.features.browse'), color: '#4ECDC4' },
            { icon: 'map-pin', text: t('myTickets.empty.features.findLocal'), color: '#FF6B6B' },
            { icon: 'heart', text: t('myTickets.empty.features.saveFavorites'), color: '#FFD700' }
          ].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <LinearGradient
                colors={[`${feature.color}20`, `${feature.color}10`]}
                style={styles.featureIconBG}
              >
                <Icon 
                  name={feature.icon} 
                  type="feather" 
                  size={16} 
                  color={feature.color} 
                />
              </LinearGradient>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const MyTicketsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { getUserTickets, events, getUserTickets: getAllUserTickets } = useEvents();
  const [activeTab, setActiveTab] = useState(route?.params?.tab || 'all');
  const [upcomingTickets, setUpcomingTickets] = useState([]);
  const [pastTickets, setPastTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  const currentTickets = activeTab === 'all'
    ? [...upcomingTickets, ...pastTickets]
    : activeTab === 'upcoming' ? upcomingTickets : pastTickets;

  // Helper function to get attendee count for an event
  const getAttendeeCountForEvent = async (eventId) => {
    try {
      const allTickets = await getAllUserTickets('all');
      const eventTickets = allTickets.filter(ticket => ticket.eventId === eventId);
      
      // Count unique attendees (different emails)
      const uniqueAttendees = new Set();
      eventTickets.forEach(ticket => {
        if (ticket.buyerEmail) {
          uniqueAttendees.add(ticket.buyerEmail);
        }
      });
      
      return uniqueAttendees.size;
    } catch (error) {
      console.error('Error getting attendee count for event:', eventId, error);
      return 0;
    }
  };

  // Load tickets on component mount and when tab changes
  const loadTickets = async () => {
    try {
      setLoading(true);
      const [upcoming, past] = await Promise.all([
        getUserTickets('upcoming'),
        getUserTickets('past')
      ]);
      
      // Enhance tickets with attendee count data
      const enhanceTicketsWithAttendeeCount = async (tickets) => {
        const enhancedTickets = await Promise.all(
          tickets.map(async (ticket) => {
            const attendeeCount = await getAttendeeCountForEvent(ticket.eventId);
            return {
              ...ticket,
              attendeeCount: attendeeCount
            };
          })
        );
        return enhancedTickets;
      };

      const [enhancedUpcoming, enhancedPast] = await Promise.all([
        enhanceTicketsWithAttendeeCount(upcoming),
        enhanceTicketsWithAttendeeCount(past)
      ]);

      setUpcomingTickets(enhancedUpcoming);
      setPastTickets(enhancedPast);
      
      console.log('🎫 MyTicketsScreen Debug Info:');
      console.log('Active tab:', activeTab);
      console.log('Upcoming tickets:', enhancedUpcoming?.length || 0);
      console.log('Past tickets:', enhancedPast?.length || 0);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Refresh tickets when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTickets();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    console.log('Current tickets:', currentTickets?.length || 0);
  }, [activeTab, currentTickets]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Dynamic Background */}
      <LinearGradient
        colors={[
          '#0c162d',
          '#1a2a4a', 
          '#2a3f5f',
          '#0c162d'
        ]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Enhanced Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <BlurView intensity={60} style={styles.backButtonBlur}>
              <Icon name="arrow-left" type="feather" size={24} color="#FFFFFF" />
            </BlurView>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('myTickets.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('myTickets.subtitle', { count: currentTickets.length, tab: t(`myTickets.tab.${activeTab}`) })}
            </Text>
          </View>
          
          <View style={styles.headerRight} />
        </Animated.View>

        {/* Enhanced Tab Navigation */}
        <View style={styles.tabSection}>
          <BlurView intensity={40} style={styles.tabContainer}>
            <View style={styles.tabContent}>
              {['all', 'upcoming', 'past'].map((tab) => {
                const iconName = tab === 'all' ? 'layers' : tab === 'upcoming' ? 'calendar' : 'clock';
                const label = t(`myTickets.tab.${tab}`);
                return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.activeTab]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  {activeTab === tab && (
                    <LinearGradient
                      colors={['rgba(255, 215, 0, 0.3)', 'rgba(255, 215, 0, 0.1)']}
                      style={styles.activeTabBackground}
                    />
                  )}
                  <Icon
                    name={iconName}
                    type="feather"
                    size={18}
                    color={activeTab === tab ? '#FFD700' : 'rgba(255,255,255,0.6)'}
                    style={styles.tabIcon}
                  />
                  <Text style={[
                    styles.tabText,
                    { color: activeTab === tab ? '#FFD700' : 'rgba(255,255,255,0.6)' }
                  ]}>
                    {label}
                  </Text>
                  {activeTab === tab && (
                    <View style={styles.tabIndicator} />
                  )}
                </TouchableOpacity>
                );
              })}
            </View>
          </BlurView>
        </View>

        {/* Content Area */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={true}
        >
          {currentTickets.length > 0 ? (
            currentTickets.map((ticket, index) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                index={index}
                scrollY={scrollY}
                isPast={activeTab === 'past' || (activeTab === 'all' && pastTickets.some(p => p.id === ticket.id))}
                onPress={() => navigation.navigate('TicketDetails', { ticket })}
              />
            ))
          ) : (
            <EmptyState activeTab={activeTab} navigation={navigation} />
          )}
        </ScrollView>
      </SafeAreaView>

      <CustomNavBar activeScreen="Profile" />
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
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  backButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },
  tabSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  tabContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabContent: {
    flexDirection: 'row',
    padding: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  activeTabBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  tabIcon: {
    marginRight: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 3,
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  
  // Ticket Card Styles
  ticketCardWrapper: {
    marginBottom: 24,
  },
  ticketCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pastTicketCard: {
    opacity: 0.8,
  },
  ticketGlassBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ticketContentContainer: {
    position: 'relative',
  },
  ticketImageSection: {
    height: 200,
    position: 'relative',
  },
  ticketImage: {
    width: '100%',
    height: '100%',
  },
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  pastStatusBadge: {
    // Additional styles for past events
  },
  statusBlur: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  pastStatusText: {
    color: '#FF6B6B',
  },
  missedStatusText: {
    color: '#FF6B6B',
  },
  attendedStatusText: {
    color: '#4CAF50',
  },
  priceBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  priceBlur: {
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  attendeeCountBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  attendeeCountBlur: {
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  attendeeCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  ticketInfo: {
    padding: 24,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  ticketTitle: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    marginRight: 16,
    lineHeight: 28,
    textTransform: 'uppercase',
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chevronBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconContainer: {
    marginRight: 16,
  },
  detailIconBG: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  ticketTypesBreakdown: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ticketTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  ticketTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  ticketTypePriceText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  
  // Empty State Styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: 500,
  },
  emptyStateCard: {
    padding: 40,
    borderRadius: 32,
    alignItems: 'center',
    maxWidth: 350,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  emptyIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  emptyStateTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyStateDivider: {
    width: 80,
    height: 2,
    marginVertical: 24,
    borderRadius: 1,
    overflow: 'hidden',
  },
  dividerGradient: {
    flex: 1,
  },
  emptyStateMessage: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.8,
  },
  exploreButton: {
    alignSelf: 'stretch',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  exploreButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  exploreButtonIcon: {
    marginRight: 12,
  },
  exploreButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  featureHighlights: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  featureIconBG: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
});

export default MyTicketsScreen; 