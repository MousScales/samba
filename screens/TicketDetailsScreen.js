import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Platform, Dimensions, Animated, StatusBar, FlatList } from 'react-native';
import { Text, useTheme, Icon, Button } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const TicketDetailsScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { ticket } = route.params;
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);
  const ticketScrollRef = useRef(null);
  
  // Simple single ticket - no grouping, no multiple QR codes
  const tickets = [ticket]; // Always just one ticket
  const ticketQuantity = 1; // Always 1
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const qrScaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Run entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(qrScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Hide default header
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  const handleTicketScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / width);
    setActiveTicketIndex(newIndex);
  };

  const handleAddToWallet = () => {
    // Here you would implement Apple Wallet integration
    console.log('Adding ticket to wallet:', ticket);
  };

  const renderTicket = ({ item, index }) => (
    <View style={styles.ticketSlide}>
      <View style={styles.ticketOuterContainer}>
          <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ticketBackground}
        >
          <View style={styles.ticketContent}>
            {/* Top part of ticket */}
            <View style={styles.ticketQrContainer}>
              <View style={styles.qrInner}>
            <QRCode
                  value={ticket.qrCode || ticket.id || "TICKET12345"}
                  size={180}
              backgroundColor="white"
              color="black"
            />
          </View>
            </View>
            
            {/* Perforated line */}
            <View style={styles.perforatedLine}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View key={i} style={styles.perforation} />
              ))}
            </View>
            
            {/* Ticket stub - small info section */}
            <View style={styles.ticketStub}>
              <Text style={styles.ticketEventName} numberOfLines={1}>
                {ticket.eventTitle || item.eventTitle || "Summer Music Festival"}
              </Text>
              <Text style={styles.ticketDate}>
                {ticket.eventDate ? (() => {
                  try {
                    const date = new Date(ticket.eventDate);
                    return isNaN(date.getTime()) ? "Date TBD" : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                  } catch {
                    return "Date TBD";
                  }
                })() : "Jun 25, 2025"}
              </Text>
              <Text style={styles.ticketType}>
                {ticket.ticketType || "General Admission"}
              </Text>
              <Text style={styles.ticketNumberText}>
                #{ticket.ticketNumber || (ticket.id ? ticket.id.substring(0, 8).toUpperCase() : "N/A")}
              </Text>
            </View>
          </View>
        </LinearGradient>
        
        {/* Ticket edge shadow */}
        <View style={styles.ticketShadow} />
      </View>
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
          {/* Custom Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back-ios" color="#fff" size={20} />
              <Text style={styles.backText}>My Tickets</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              {/* QR Code Section - Now scrollable */}
              <Animated.View 
                style={[
                  styles.qrContainer, 
                  { transform: [{ scale: qrScaleAnim }] }
                ]}
              >
                {renderTicket({ item: ticket, index: 0 })}
                

              </Animated.View>

              {/* Event Title */}
              <Text style={styles.eventTitle}>
                {ticket.eventTitle || "Summer Music Festival"}
              </Text>

              {/* Event Details Card */}
              <View style={styles.detailsCard}>
          {/* Date & Time */}
          <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
            <Icon
              name="calendar"
              type="feather"
                      size={18}
                      color="#FF4B8C"
            />
                  </View>
            <View>
                    <Text style={styles.detailText}>
                      {ticket.eventDate ? (() => {
                        try {
                          const date = new Date(ticket.eventDate);
                          return isNaN(date.getTime()) ? "Date TBD" : date.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          });
                        } catch {
                          return "Date TBD";
                        }
                      })() : "Sunday, May 19, 2024"}
              </Text>
                    <Text style={styles.detailSubtext}>
                      {ticket.eventTime ? (() => {
                        try {
                          const time = new Date(ticket.eventTime);
                          return isNaN(time.getTime()) ? "Time TBD" : time.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            hour12: true 
                          });
                        } catch {
                          return "Time TBD";
                        }
                      })() : "9:00 AM"}
              </Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.detailRow}>
                  <View style={styles.iconContainer}>
            <Icon
              name="map-pin"
              type="feather"
                      size={18}
                      color="#4A00E0"
            />
                  </View>
            <View style={styles.locationContainer}>
                    <Text style={styles.detailText} numberOfLines={1}>
                      {(() => {
                        const location = ticket.eventLocation || "Central Park, NYC";
                        // Truncate long addresses to fit in the box
                        if (location.length > 35) {
                          return location.substring(0, 32) + "...";
                        }
                        return location;
                      })()}
              </Text>
            </View>
          </View>

                {/* Ticket Info */}
                <View style={styles.ticketInfoContainer}>
                  <View style={styles.ticketInfoItem}>
                    <Text style={styles.sectionLabel}>
              Ticket Type
            </Text>
                    <Text style={styles.sectionValue}>
                      {ticket.ticketType || "Main"}
            </Text>
          </View>

                  <View style={styles.ticketInfoDivider} />
                  
                  <View style={styles.ticketInfoItem}>
                    <Text style={styles.sectionLabel}>
              Ticket Number
            </Text>
                    <Text style={styles.sectionValue}>
                      #{ticket.ticketNumber || (ticket.id ? ticket.id.substring(0, 12).toUpperCase() : "N/A")}
            </Text>
                  </View>
                </View>
          </View>

          {/* View Attendees Button */}
          <TouchableOpacity
                style={styles.attendeesButton}
            onPress={() => navigation.navigate('Attendees', { eventId: ticket.eventId })}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.attendeesGradient}
          >
            <View style={styles.attendeesContent}>
              <View>
                      <Text style={styles.attendeesTitle}>
                        View Guestlist
                </Text>
                      <Text style={styles.attendeesSubtitle}>
                  See who else is going
                </Text>
              </View>
              <Icon
                name="chevron-right"
                type="feather"
                      size={22}
                      color="rgba(255,255,255,0.6)"
              />
            </View>
                </LinearGradient>
          </TouchableOpacity>
            </Animated.View>
      </ScrollView>

      {/* Bottom Action Button */}
          <View style={styles.bottomButtons}>
        <TouchableOpacity
              style={[styles.walletButton, styles.singleButton]}
          onPress={handleAddToWallet}
        >
          <Icon
            name="credit-card"
            type="feather"
            size={20}
                color="#fff"
            style={styles.buttonIcon}
          />
              <Text style={styles.walletButtonText}>
            Add to Wallet
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
      </LinearGradient>
    </>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    width: '100%',
  },
  ticketOuterContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4A00E0',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  ticketBackground: {
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  ticketContent: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 15,
  },
  ticketQrContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    margin: 15,
    marginBottom: 10,
  },
  qrInner: {
    backgroundColor: 'white',
  },
  perforatedLine: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  perforation: {
    width: 6,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 1,
  },
  ticketStub: {
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  ticketEventName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  ticketDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  ticketType: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  ticketShadow: {
    position: 'absolute',
    bottom: -8,
    height: 8,
    width: '85%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    zIndex: -1,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  detailSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  locationContainer: {
    flex: 1,
  },
  ticketInfoContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  ticketInfoItem: {
    flex: 1,
  },
  ticketInfoDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 15,
  },
  sectionLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  attendeesButton: {
    width: '100%',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
      },
  attendeesGradient: {
    padding: 20,
  },
  attendeesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendeesTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  attendeesSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  walletButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  singleButton: {
    marginRight: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  walletButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  ticketCarousel: {
    width: width,
  },
  ticketSlide: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4B8C',
  },
  ticketCounter: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  ticketNumberText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginTop: 1,
    fontWeight: '400',
    textAlign: 'center',
  },
  ticketTypesContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  ticketTypesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  ticketTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  ticketTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  },
  ticketTypePrice: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
});

export default TicketDetailsScreen; 