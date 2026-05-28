import React from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  StatusBar
} from 'react-native';
import { Text, Button, Icon, Divider, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const TicketConfirmationScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { event, tickets, totalAmount, email } = route.params;
  
  // Ensure totalAmount is a number
  const safeTotal = typeof totalAmount === 'number' ? totalAmount : parseFloat(totalAmount) || 0;
  
  const handleViewTickets = () => {
    navigation.navigate('My Tickets');
  };
  
  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.successIconContainer}>
            <View style={[styles.successIcon, { backgroundColor: theme.colors.primary }]}>
              <Icon name="check" type="feather" size={48} color="#FFFFFF" />
            </View>
          </View>
          
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Purchase Successful!
          </Text>
          
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Your tickets have been sent to {email}
          </Text>
          
          <View style={[styles.eventCard, { backgroundColor: theme.colors.surface }]}>
            <Image 
              source={{ uri: event.coverImage || event.flyers?.[0] || event.image || 'https://via.placeholder.com/400x200' }} 
              style={styles.eventImage}
              resizeMode="cover" 
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.eventImageOverlay}
            />
            <View style={styles.eventInfo}>
              <Text style={[styles.eventTitle, { color: theme.colors.text }]}>
                {event.title}
              </Text>
              <Text style={[styles.eventDetails, { color: theme.colors.textSecondary }]}>
                {(() => {
                  try {
                    if (!event.date) return 'Date TBD';
                    const date = new Date(event.date);
                    if (isNaN(date.getTime())) return 'Date TBD';
                    return date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    });
                  } catch (error) {
                    return 'Date TBD';
                  }
                })()} • {(() => {
                  try {
                    if (!event.startTime) return 'Time TBD';
                    const time = new Date(event.startTime);
                    if (isNaN(time.getTime())) return 'Time TBD';
                    return time.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                  } catch (error) {
                    return 'Time TBD';
                  }
                })()}
              </Text>
              <Text style={[styles.eventDetails, { color: theme.colors.textSecondary }]}>
                {event.address?.formatted || event.venue || event.location}
              </Text>
            </View>
          </View>
          
          <View style={[styles.ticketSummary, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Order Summary
            </Text>
            
            <View style={styles.ticketDetails}>
              {Object.entries(tickets).map(([type, count]) => (
                count > 0 && (
                  <View key={type} style={styles.ticketItem}>
                    <View style={styles.ticketItemInfo}>
                      <Text style={[styles.ticketType, { color: theme.colors.text }]}>
                        {type}
                      </Text>
                      <Text style={[styles.ticketCount, { color: theme.colors.textSecondary }]}>
                        Qty: {count}
                      </Text>
                    </View>
                  </View>
                )
              ))}
            </View>
            
            <Divider style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                Total Amount
              </Text>
              <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
                ${safeTotal.toFixed(2)}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoSection}>
            <Icon 
              name="info" 
              type="feather" 
              size={20} 
              color={theme.colors.primary} 
              containerStyle={styles.infoIcon}
            />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              You can access your tickets anytime from the My Tickets section
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.background }]}>
        <Button
          title="View My Tickets"
          onPress={handleViewTickets}
          buttonStyle={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          containerStyle={styles.buttonContainer}
        />
        <Button
          title="Go to Home"
          onPress={handleGoHome}
          buttonStyle={[styles.secondaryButton, { backgroundColor: 'transparent', borderColor: theme.colors.border }]}
          containerStyle={[styles.buttonContainer, { marginTop: 12 }]}
          titleStyle={{ color: theme.colors.text }}
        />
      </View>
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
  content: {
    padding: 24,
  },
  successIconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  eventImage: {
    width: '100%',
    height: 120,
  },
  eventImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 120,
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  eventDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  ticketSummary: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  ticketDetails: {
    marginBottom: 16,
  },
  ticketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ticketItemInfo: {
    flex: 1,
  },
  ticketType: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  ticketCount: {
    fontSize: 14,
  },
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    height: 50,
    borderRadius: 25,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
  },
});

export default TicketConfirmationScreen; 