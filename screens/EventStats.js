import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '../context/EventsContext';
import { formatCount } from '../utils/formatNumbers';

const { width } = Dimensions.get('window');

const EventStats = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { getUserTickets } = useEvents();
  const { event } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);

  useEffect(() => {
    const loadEventStats = async () => {
      try {
        if (!event) {
          setLoading(false);
          return;
        }

        // Get real ticket data for this event
        const allTickets = await getUserTickets('all');
        const eventTickets = Array.isArray(allTickets) ? allTickets.filter(ticket => ticket.eventId === event.id) : [];
        
        console.log('📊 EventStats for event:', event.id, {
          eventTitle: event.title,
          allTicketsCount: allTickets?.length || 0,
          eventTicketsCount: eventTickets.length,
          eventTickets: eventTickets.map(t => ({
            id: t.id,
            eventId: t.eventId,
            price: t.price,
            isFree: t.isFree,
            ticketType: t.ticketType,
            isScanned: t.isScanned,
            status: t.status,
            purchaseDate: t.purchaseDate
          })),
          eventTicketTypes: event.tickets?.map(tt => ({
            name: tt.name,
            price: tt.price,
            isFree: tt.isFree
          }))
        });
        
        // Calculate real stats from actual tickets
        const ticketsSold = eventTickets.length; // Total tickets sold for this event
        const scannedTickets = eventTickets.filter(ticket => ticket.isScanned || ticket.status === 'used').length; // People who successfully scanned in
        
        // Calculate revenue from actual ticket sales (total amount spent by users)
        const totalRevenue = eventTickets.reduce((total, ticket) => {
          // Handle different price field possibilities
          let price = 0;
          if (ticket.price !== undefined && ticket.price !== null) {
            price = parseFloat(ticket.price) || 0;
          } else if (ticket.amount !== undefined && ticket.amount !== null) {
            price = parseFloat(ticket.amount) || 0;
          } else if (ticket.cost !== undefined && ticket.cost !== null) {
            price = parseFloat(ticket.cost) || 0;
          }
          
          console.log('💰 Processing ticket price:', {
            ticketId: ticket.id,
            rawPrice: ticket.price,
            amount: ticket.amount,
            cost: ticket.cost,
            finalPrice: price,
            ticketType: ticket.ticketType,
            isFree: ticket.isFree
          });
          return total + price;
        }, 0);
        
        console.log('📈 Calculated stats:', {
          ticketsSold,
          scannedTickets,
          totalRevenue
        });
        
        // Check if event has unlimited tickets
        const hasUnlimitedTickets = event.tickets?.some(t => t.isUnlimited) || event.isUnlimited || false;
        
        // Calculate actual capacity based on the total number of tickets available for sale
        const calculateCapacity = () => {
          console.log('🎫 Calculating capacity for event:', event.id, {
            hasUnlimitedTickets,
            eventTickets: event.tickets?.map(t => ({
              name: t.name,
              quantity: t.quantity,
              isUnlimited: t.isUnlimited
            })),
            eventCapacity: event.capacity,
            eventTotalSpots: event.totalSpots
          });
          
          if (hasUnlimitedTickets) {
            console.log('♾️ Event has unlimited tickets - capacity is Infinity');
            return Infinity;
          }
          
          if (event.tickets && event.tickets.length > 0) {
            const calculatedCapacity = event.tickets.reduce((total, ticket) => {
              const ticketQuantity = ticket.quantity || 0;
              console.log(`📊 Adding ticket type "${ticket.name}": ${ticketQuantity} spots`);
              return total + ticketQuantity;
            }, 0);
            
            console.log(`✅ Total capacity from ticket types: ${calculatedCapacity}`);
            return calculatedCapacity;
          }
          
          // Fallback to event-level capacity settings
          const fallbackCapacity = event.capacity || event.totalSpots || 100;
          console.log(`⚠️ No ticket types found, using fallback capacity: ${fallbackCapacity}`);
          return fallbackCapacity;
        };
        
        const capacity = calculateCapacity();
        
        const calculatedStatsData = {
          title: event.title || event.name || 'Past Event',
          date: formatDate(event.date),
          venue: event.venue || event.location || 'Venue not available',
          image: event.image || event.coverImage || event.flyers?.[0] || 'https://via.placeholder.com/400x300',
          totalAttendees: scannedTickets, // Real scanned tickets count
          totalRevenue: totalRevenue, // Real revenue from ticket sales
          ticketsSold: ticketsSold, // Real tickets sold count
          capacity: capacity, // Real ticket capacity
          category: event.category || 'Event',
          status: 'completed'
        };

        setStatsData(calculatedStatsData);
      } catch (error) {
        console.error('Error loading event stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEventStats();
  }, [event]);

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" type="feather" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Event Stats</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            Event data not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Format the date properly to avoid React child error
  const formatDate = (date) => {
    if (!date) return 'Date not available';
    if (typeof date === 'string') return date;
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return 'Date not available';
  };

  // Show loading state while data is being fetched
  if (loading || !statsData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={['#1A1A1A', '#000000']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" type="feather" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Event Stats</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading event statistics...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const StatCard = ({ title, value, subtitle, icon, color = theme.colors.primary }) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.statHeader}>
        <Icon name={icon} type="feather" size={24} color={color} />
        <Text style={[styles.statTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#1A1A1A', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" type="feather" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Event Stats</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Header */}
        <View style={styles.eventHeader}>
          <View style={styles.eventImageContainer}>
            <Image 
              source={{ uri: statsData.image }} 
              style={styles.eventImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.imageOverlay}
            />
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>COMPLETED</Text>
            </View>
          </View>
          
          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: theme.colors.text }]}>
              {statsData.title}
            </Text>
            
            <View style={styles.eventDetails}>
              <View style={styles.detailRow}>
                <Icon name="calendar" type="feather" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                  {statsData.date}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Icon name="map-pin" type="feather" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                  {statsData.venue}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Icon name="tag" type="feather" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                  {statsData.category}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Event Performance
          </Text>
          
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Attendees"
              value={formatCount(statsData.totalAttendees)}
              subtitle={statsData.capacity === Infinity 
                ? "Scanned tickets" 
                : `${statsData.totalAttendees > 0 ? ((statsData.totalAttendees / statsData.capacity) * 100).toFixed(1) : 0}% capacity`
              }
              icon="users"
              color="#4CAF50"
            />
            
            <StatCard
              title="Tickets Sold"
              value={formatCount(statsData.ticketsSold)}
              subtitle="Total sales"
              icon="credit-card"
              color="#FF4757"
            />
            
            <StatCard
              title="Revenue"
              value={`$${statsData.totalRevenue.toLocaleString()}`}
              subtitle="Total earnings"
              icon="dollar-sign"
              color="#FFD700"
            />
            
            <StatCard
              title="Capacity"
              value={statsData.capacity === Infinity ? "∞" : formatCount(statsData.capacity)}
              subtitle={statsData.capacity === Infinity ? "Unlimited" : "Max attendees"}
              icon="home"
              color="#9C88FF"
            />
          </View>
        </View>

        {/* Additional Insights */}
        <View style={styles.insightsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Event Insights
          </Text>
          
          <View style={[styles.insightCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.insightHeader}>
              <Icon name="trending-up" type="feather" size={20} color="#4CAF50" />
              <Text style={[styles.insightTitle, { color: theme.colors.text }]}>
                Event Success
              </Text>
            </View>
            <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
              {statsData.totalAttendees > 0 
                ? `Great turnout! ${formatCount(statsData.totalAttendees)} people attended your event (${formatCount(statsData.ticketsSold)} tickets were sold).`
                : statsData.ticketsSold > 0 
                  ? `${formatCount(statsData.ticketsSold)} tickets were sold, but no attendees were scanned in yet.`
                  : 'Event completed successfully.'
              }
            </Text>
          </View>

          <View style={[styles.insightCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.insightHeader}>
              <Icon name="clock" type="feather" size={20} color="#FF6B6B" />
              <Text style={[styles.insightTitle, { color: theme.colors.text }]}>
                Event Status
              </Text>
            </View>
            <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
              This event has ended and all data has been finalized.
            </Text>
          </View>
        </View>


      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  eventHeader: {
    marginBottom: 24,
  },
  eventImageContainer: {
    position: 'relative',
    height: 200,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 12,
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
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
  },
  insightsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default EventStats;
