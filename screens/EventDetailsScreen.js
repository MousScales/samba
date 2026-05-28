import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  PanResponder,
  ImageBackground,
  Blur,
} from 'react-native';
import { Text, Button, Icon, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCount } from '../utils/formatNumbers';

const { width, height } = Dimensions.get('window');
const BOOKING_SECTION_MIN_HEIGHT = 100;
const BOOKING_SECTION_MAX_HEIGHT = height * 0.7;
const INITIAL_BOOKING_SECTION_HEIGHT = 100;

const EventDetailsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { event } = route.params;
  
  // Use event data or fallback to default values
  const eventImages = event.images || [event.coverImage] || [event.flyers?.[0]] || ['https://via.placeholder.com/400x300'];
  const ticketTypes = event.tickets || event.ticketTypes || [];
  
  const [ticketCounts, setTicketCounts] = useState({});
  const [selectedTicketType, setSelectedTicketType] = useState(ticketTypes[0] || null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const flatListRef = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const detailsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations when the component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(detailsAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, []);

  // Calculate spots left
  const calculateSpotsLeft = () => {
    if (!ticketTypes || ticketTypes.length === 0) return 200; // fallback
    
    const hasUnlimitedTickets = ticketTypes.some(ticket => ticket.isUnlimited);
    if (hasUnlimitedTickets) return "∞";
    
    return ticketTypes.reduce((total, ticket) => {
      return total + (ticket.availableQuantity || ticket.quantity || 0);
    }, 0);
  };

  const spotsLeft = calculateSpotsLeft();

  // Add animation and pan responder logic
  const pan = useRef(new Animated.ValueXY({ x: 0, y: BOOKING_SECTION_MAX_HEIGHT - INITIAL_BOOKING_SECTION_HEIGHT })).current;
  const lastGestureDy = useRef(BOOKING_SECTION_MAX_HEIGHT - INITIAL_BOOKING_SECTION_HEIGHT);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: 0,
          y: lastGestureDy.current,
        });
      },
      onPanResponderMove: (_, gesture) => {
        const newY = gesture.dy;
        const projectedY = lastGestureDy.current + newY;
        if (projectedY <= BOOKING_SECTION_MAX_HEIGHT - INITIAL_BOOKING_SECTION_HEIGHT && 
            projectedY >= 0) {
          pan.y.setValue(newY);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        lastGestureDy.current = pan.y._value;

        // Snap to positions
        const currentPosition = lastGestureDy.current;
        const midPoint = (BOOKING_SECTION_MAX_HEIGHT - INITIAL_BOOKING_SECTION_HEIGHT) / 2;
        const shouldSnapToTop = gesture.vy < -0.5 || 
          (gesture.vy >= -0.5 && gesture.vy <= 0.5 && currentPosition < midPoint);

        Animated.spring(pan.y, {
          toValue: shouldSnapToTop ? 0 : BOOKING_SECTION_MAX_HEIGHT - INITIAL_BOOKING_SECTION_HEIGHT,
          useNativeDriver: false,
          bounciness: 4,
        }).start(() => {
          lastGestureDy.current = shouldSnapToTop ? 
            0 : BOOKING_SECTION_MAX_HEIGHT - INITIAL_BOOKING_SECTION_HEIGHT;
          setIsExpanded(shouldSnapToTop);
        });
      },
    })
  ).current;

  const handleShare = () => {
    // Implement share functionality
  };

  const handleBooking = () => {
    // Implement booking functionality
  };

  const handleOrganizerPress = () => {
    // Only navigate if we have valid organizer data
    const organizerId = event.organizerId || event.organizer?.id;
    const organizerName = typeof event.organizer === 'string' ? event.organizer : event.organizer?.name;
    
    if (!organizerId && !organizerName) {
      console.warn('⚠️ Cannot navigate to organizer profile: No valid organizer data');
      return;
    }
    
    navigation.navigate('OrganizerProfile', { 
      organizerId,
      organizerName,
      organizerData: event.organizerData
    });
  };

  const renderImageItem = ({ item }) => (
    <Image
      source={{ uri: item }}
      style={styles.carouselImage}
      resizeMode="cover"
    />
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      {eventImages.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            { backgroundColor: index === activeImageIndex ? theme.colors.primary : 'rgba(255,255,255,0.5)' },
            index === activeImageIndex && { width: 24 }
          ]}
        />
      ))}
    </View>
  );

  const onScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setActiveImageIndex(roundIndex);
  };

  // Calculate total price and number of tickets
  const calculateTotals = () => {
    let total = 0;
    let ticketCount = 0;
    
    ticketTypes.forEach(ticket => {
      const ticketName = ticket.name || ticket.type;
      const count = ticketCounts[ticketName] || 0;
      const ticketPrice = ticket.isFree ? 0 : ticket.price;
      total += count * ticketPrice;
      ticketCount += count;
    });
    
    return { total, ticketCount };
  };

  // Get selected ticket summary
  const getTicketSummary = () => {
    const selectedTypes = ticketTypes.filter(
      ticket => {
        const ticketName = ticket.name || ticket.type;
        return (ticketCounts[ticketName] || 0) > 0;
      }
    );
    if (selectedTypes.length === 0) return 'No tickets selected';
    
    if (selectedTypes.length === 1) {
      const ticket = selectedTypes[0];
      const ticketName = ticket.name || ticket.type;
      const count = ticketCounts[ticketName];
      return `${count}x ${ticketName}`;
    }
    
    const { ticketCount } = calculateTotals();
    return `${ticketCount} tickets selected`;
  };

  const handleShowTickets = () => {
    setShowTicketModal(true);
  };

  const handleCheckout = () => {
    const { total, ticketCount } = calculateTotals();
    // Navigate to checkout screen with selected tickets
    navigation.navigate('Checkout', {
      tickets: ticketCounts,
      totalAmount: total,
      totalTickets: ticketCount,
      event: event,
      ticketTypes: ticketTypes
    });
  };

  // Ticket selection component with animation
  const TicketTypeCard = ({ ticket, index }) => {
    const ticketName = ticket.name || ticket.type; // Support both field names
    const count = ticketCounts[ticketName] || 0;
    const spotsRemaining = ticket.isUnlimited 
      ? 999999 // High number for unlimited tickets  
      : (ticket.availableQuantity || ticket.quantity || 0);
    const isSelected = count > 0;
    
    const scaleInterpolate = detailsAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.95, 1],
    });
    
    const opacityInterpolate = detailsAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });
    
    const translateYInterpolate = detailsAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    });

  return (
      <Animated.View
        style={{
          opacity: opacityInterpolate,
          transform: [
            { scale: scaleInterpolate },
            { translateY: translateYInterpolate }
          ],
        }}
    >
        <TouchableOpacity
        style={[
            styles.ticketTypeCard,
            { 
              backgroundColor: isSelected ? 'rgba(255, 71, 87, 0.1)' : theme.colors.surface,
              borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            }
          ]}
          activeOpacity={0.7}
          onPress={() => setSelectedTicketType(ticket)}
        >
          <View style={styles.ticketTypeHeader}>
            <View>
              <Text style={[styles.ticketTypeName, { color: theme.colors.text }]}>
                {ticketName}
            </Text>
              <Text style={[styles.ticketTypePrice, { color: theme.colors.primary }]}>
                {ticket.isFree ? 'Free' : `$${ticket.price}`}
              </Text>
          </View>

            <View style={styles.ticketQuantityContainer}>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                  count === 0 && { opacity: 0.5 }
                ]}
                disabled={count === 0}
                onPress={() => {
                  if (count > 0) {
                    setTicketCounts({
                      ...ticketCounts,
                      [ticketName]: count - 1
                    });
                  }
                }}
              >
                <Icon name="minus" type="feather" size={16} color={theme.colors.text} />
              </TouchableOpacity>
              
              <Text style={[styles.quantityText, { color: theme.colors.text }]}>
                {count}
                </Text>
              
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                  count >= spotsRemaining && { opacity: 0.5 }
                ]}
                disabled={count >= spotsRemaining}
                onPress={() => {
                  if (count < spotsRemaining) {
                    setTicketCounts({
                      ...ticketCounts,
                      [ticketName]: count + 1
                    });
                  }
                }}
              >
                <Icon name="plus" type="feather" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              </View>
            </View>

          {ticket.perks && (
            <View style={styles.perksContainer}>
              {ticket.perks.map((perk, idx) => (
                <View key={idx} style={styles.perkItem}>
                  <Icon
                    name="check"
                    type="feather"
                    size={14}
                    color={theme.colors.primary}
                    style={styles.perkIcon}
                  />
                  <Text style={[styles.perkText, { color: theme.colors.textSecondary }]}>
                    {perk}
                </Text>
              </View>
              ))}
            </View>
          )}

          <View style={styles.spotsRemainingContainer}>
            <Text
              style={[
                styles.spotsRemainingText,
                { color: spotsRemaining < 10 ? '#ff6b6b' : '#4CAF50' }
              ]}
            >
              {ticket.isUnlimited 
                ? '∞ spots available' 
                : `${spotsRemaining} spots remaining`}
            </Text>
              </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Format date and time functions
  const formatDate = (date) => {
    if (!date) return "Sat, Jun 15";
    if (typeof date === 'string') return date;
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (time) => {
    // Handle different time sources
    const timeToFormat = time || event.startTime;
    if (!timeToFormat) return "6:30 PM";
    if (typeof timeToFormat === 'string') return timeToFormat;
    return timeToFormat.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background image with blur effect */}
      <ImageBackground 
        source={{ uri: event.image }}
        style={styles.backgroundImage}
        blurRadius={15}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
          style={StyleSheet.absoluteFill}
        />
        {/* Additional black overlay for pure black background */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
      </ImageBackground>
      

      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Category Tag */}
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>
            {event.category || "Music"}
              </Text>
        </View>
        
        {/* Event Title */}
        <Animated.Text 
                  style={[
            styles.eventTitle,
            { opacity: titleFadeAnim }
          ]}
        >
          {event.title || "Summer Sunset Concert Series"}
        </Animated.Text>
        
        {/* Date and Time with modern styling */}
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeItem}>
            <View style={styles.iconContainer}>
              <Icon name="calendar" type="feather" size={18} color="#FFD700" />
            </View>
            <Text style={styles.dateTimeText}>
              {formatDate(event.date)}
                    </Text>
          </View>
          
          <View style={styles.dateTimeItem}>
            <View style={styles.iconContainer}>
              <Icon name="clock" type="feather" size={18} color="#FFD700" />
            </View>
            <Text style={styles.dateTimeText}>
              {formatTime(event.startTime)}
                    </Text>
          </View>
        </View>
        
        {/* Location Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Icon name="map-pin" type="feather" size={20} color="#FFD700" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Venue Name</Text>
              <Text style={styles.infoText}>
                {event.venue || event.location || "Lighthouse Point Park"}
              </Text>
              <Text style={styles.infoSubtext}>
                {event.address?.formatted || event.venue?.address || "New Haven"}
              </Text>
                  </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Icon name="users" type="feather" size={20} color="#FFD700" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Attendees</Text>
              <Text style={styles.infoText}>
                <Text style={styles.highlightText}>{formatCount(event.bookedSpots || 0)}</Text> attending • <Text style={styles.highlightText}>{spotsLeft === "∞" ? "∞" : formatCount(spotsLeft || 200)}</Text> spots left
                    </Text>
                  </View>
            </View>
        </View>

          {/* About Section */}
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Event</Text>
          <Text style={styles.descriptionText}>
            {event.description || "Experience live music as the sun sets over the water. Food trucks, local vendors, and family-friendly activities included!"}
            </Text>
          </View>

          {/* Organizer Section */}
          <TouchableOpacity 
          style={styles.organizerCard}
            onPress={handleOrganizerPress}
          >
          <Text style={styles.organizerTitle}>Organized by</Text>
          
          <View style={styles.organizerContent}>
            <View style={styles.organizerImageContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.organizerImageBorder}
              >
              {event.organizer?.profilePicture ? (
              <Image 
                  source={{ uri: event.organizer.profilePicture }}
                style={styles.organizerImage}
              />
              ) : (
                <View style={[styles.organizerImage, styles.organizerImagePlaceholder]}>
                  <Text style={styles.organizerInitials}>
                    {(event.organizer?.name || 'Event Organizer')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                </View>
              )}
              </LinearGradient>
            </View>
            
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerName}>
                {event.organizer?.name || "City Events"}
                </Text>
              <Text style={styles.organizerSubtext}>Event Organizer</Text>
              </View>
            
            <Icon 
              name="chevron-right" 
              type="feather" 
              color="rgba(255,255,255,0.5)" 
              size={24}
            />
            </View>
          </TouchableOpacity>

        {/* Ticket Types */}
        <View style={styles.ticketSection}>
          <Text style={styles.sectionTitle}>Available Tickets</Text>
          
          {ticketTypes.map((ticket, index) => {
            // Calculate spots properly
            const spotsLeft = ticket.isUnlimited 
              ? '∞' 
              : (ticket.availableQuantity || ticket.quantity || 0);
            
            // Format price properly
            const priceDisplay = ticket.isFree ? 'Free' : `$${ticket.price}`;
            const ticketName = ticket.name || ticket.type;
            
            return (
              <View key={index} style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketType}>{ticketName}</Text>
                  <Text style={styles.ticketPrice}>{priceDisplay}</Text>
                </View>

                <View style={styles.ticketFooter}>
                  <View style={styles.spotsContainer}>
                    <Text style={styles.spotsText}>
                      {spotsLeft === '∞' ? '∞ spots available' : `${spotsLeft} spots left`}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      
      {/* Bottom Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Icon name="share-2" type="feather" color="#FFFFFF" size={20} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.getTicketsButton}
          onPress={handleShowTickets}
        >
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ticketButtonGradient}
          >
                          <Icon 
              name="credit-card" 
              type="feather" 
              color="#000000" 
              size={18} 
              style={styles.ticketIcon}
                          />
            <Text style={styles.getTicketsText}>Get Tickets</Text>
          </LinearGradient>
        </TouchableOpacity>
                        </View>

      {/* Ticket Modal */}
      {showTicketModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setShowTicketModal(false)}
          />
          <Animated.View style={styles.ticketModalContainer}>
            <View style={styles.ticketModalHeader}>
              <Text style={styles.ticketModalTitle}>Select Tickets</Text>
              <TouchableOpacity onPress={() => setShowTicketModal(false)}>
                <Icon name="x" type="feather" color="#FFFFFF" size={24} />
              </TouchableOpacity>
                    </View>

            <ScrollView style={styles.ticketModalScrollView}>
              {ticketTypes.map((ticket, index) => {
                const ticketName = ticket.name || ticket.type;
                const count = ticketCounts[ticketName] || 0;
                const spotsRemaining = ticket.isUnlimited 
                  ? 999999 // High number for unlimited tickets
                  : (ticket.availableQuantity || ticket.quantity || 0);
                const priceDisplay = ticket.isFree ? 'Free' : `$${ticket.price}`;
                
                return (
                  <View key={index} style={styles.ticketModalItem}>
                    <View style={styles.ticketModalItemHeader}>
                      <View>
                        <Text style={styles.ticketModalItemType}>{ticketName}</Text>
                        <Text style={styles.ticketModalItemPrice}>{priceDisplay}</Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={[
                          styles.addTicketButton,
                          count > 0 && styles.addTicketButtonActive
                        ]}
                        onPress={() => {
                            setTicketCounts({
                              ...ticketCounts,
                            [ticketName]: count > 0 ? 0 : 1
                          });
                        }}
                      >
                        <Text style={[
                          styles.addTicketButtonText,
                          count > 0 && styles.addTicketButtonTextActive
                        ]}>
                          {count > 0 ? 'Selected ✓' : 'Add Ticket'}
                        </Text>
                      </TouchableOpacity>
                  </View>
                    
                    {/* What's Included Section */}
                    {((ticket.includes && ticket.includes.length > 0) || (ticket.perks && ticket.perks.length > 0)) && (
                    <View style={styles.ticketInfoSection}>
                      <Text style={styles.ticketInfoLabel}>Includes:</Text>
                        {(ticket.includes || ticket.perks || []).map((item, i) => (
                          item && item.trim() && (
                        <View key={i} style={styles.perkRow}>
                          <Icon name="check" type="feather" size={14} color="#FFD700" style={styles.perkIcon} />
                              <Text style={styles.perkText}>{item}</Text>
                </View>
                          )
              ))}
                    </View>
                    )}

                    {/* Special Instructions Section */}
                    {ticket.instructions && ticket.instructions.trim() && (
                      <View style={styles.ticketInfoSection}>
                        <View style={styles.instructionHeader}>
                          <Icon name="info" type="feather" size={16} color="#FFD700" style={styles.instructionIcon} />
                          <Text style={styles.ticketInfoLabel}>Special Instructions:</Text>
                        </View>
                        <Text style={styles.instructionText}>{ticket.instructions}</Text>
                      </View>
                    )}

                    <View style={styles.spotsRemainingRow}>
                      <Text style={styles.spotsRemainingText}>
                        {ticket.isUnlimited 
                          ? '∞ spots available' 
                          : `${spotsRemaining} spots remaining`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            
            <View style={styles.ticketModalFooter}>
              <View style={styles.ticketSummary}>
                <Text style={styles.summaryLabel}>Total:</Text>
                <Text style={styles.summaryAmount}>${calculateTotals().total}</Text>
              </View>
              
          <TouchableOpacity 
                style={[
                  styles.checkoutButton,
                  calculateTotals().ticketCount === 0 && styles.disabledButton
                ]}
                disabled={calculateTotals().ticketCount === 0}
            onPress={() => {
                  setShowTicketModal(false);
                  handleCheckout();
                }}
              >
                <LinearGradient
                  colors={calculateTotals().ticketCount === 0 ? ['#555555', '#333333'] : ['#FFD700', '#FFA500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.checkoutButtonGradient}
                >
                  <Text style={styles.checkoutButtonText}>
                    {calculateTotals().ticketCount === 0 ? 'Select Tickets' : 'Proceed to Checkout'}
                </Text>
                </LinearGradient>
              </TouchableOpacity>
              </View>
          </Animated.View>
            </View>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 50 : 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
    marginTop: 80,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  categoryText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 32,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dateTimeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
      },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginBottom: 4,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  infoSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },
  highlightText: {
    color: '#FFD700',
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
  },
  organizerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  organizerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  organizerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerImageContainer: {
    marginRight: 16,
  },
  organizerImageBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  organizerImagePlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  organizerSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  ticketSection: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  ticketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
      },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketType: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  ticketPrice: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '700',
  },
  ticketFooter: {
    alignItems: 'center',
  },
  spotsContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  spotsText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(18, 18, 24, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  shareButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  getTicketsButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  ticketButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketIcon: {
    marginRight: 8,
  },
  getTicketsText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  ticketModalContainer: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: '80%',
  },
  ticketModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  ticketModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  ticketModalScrollView: {
    maxHeight: '70%',
  },
  ticketModalItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  ticketModalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketModalItemType: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketModalItemPrice: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '700',
  },
  addTicketButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  addTicketButtonActive: {
    backgroundColor: '#FFD700',
  },
  addTicketButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  addTicketButtonTextActive: {
    color: '#000000',
  },
  ticketInfoSection: {
    marginBottom: 16,
  },
  ticketInfoLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginBottom: 8,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  perkIcon: {
    marginRight: 8,
  },
  perkText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionIcon: {
    marginRight: 8,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  spotsRemainingRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  spotsRemainingText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  ticketModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  ticketSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryAmount: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '700',
  },
  checkoutButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.7,
  },
  checkoutButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EventDetailsScreen; 