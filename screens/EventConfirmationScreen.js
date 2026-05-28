import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
  Platform
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const EventConfirmationScreen = ({ navigation, route }) => {
  const { eventData } = route.params;
  
  // Format time to display
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date to display
  const formatDate = (date) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString([], options);
  };

  // Handle share event
  const handleShareEvent = async () => {
    try {
      const paidTickets = eventData.tickets.filter(t => !t.isFree);
      const lowestPrice = paidTickets.length > 0 ? Math.min(...paidTickets.map(t => t.price)) : null;
      
      const priceText = lowestPrice ? `🎫 Starting at $${lowestPrice.toFixed(2)}` : '🎫 Free event!';
      
      const shareMessage = `🎉 Check out this event: ${eventData.title}
📅 ${formatDate(new Date(eventData.date))} at ${formatTime(new Date(eventData.startTime))}
📍 ${eventData.address.formatted}
${priceText}

Created with Samba!`;

      await Share.share({
        message: shareMessage,
        title: eventData.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Handle view event details
  const handleViewEvent = () => {
    navigation.navigate('EventDetails', { event: eventData });
  };

  // Handle return to profile
  const handleReturnToProfile = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Profile' }],
    });
  };

  // Calculate ticket summary
  const ticketSummary = {
    types: eventData.tickets.length,
    total: eventData.tickets.some(t => t.isUnlimited) ? 'Unlimited' : 
      eventData.tickets.reduce((sum, t) => sum + (t.isUnlimited ? 0 : (t.quantity || 0)), 0),
    freeTickets: eventData.tickets.filter(t => t.isFree && !t.isUnlimited).reduce((sum, t) => sum + (t.quantity || 0), 0),
    paidTickets: eventData.tickets.filter(t => !t.isFree && !t.isUnlimited).reduce((sum, t) => sum + (t.quantity || 0), 0),
    hasUnlimitedFree: eventData.tickets.some(t => t.isFree && t.isUnlimited),
    hasUnlimitedPaid: eventData.tickets.some(t => !t.isFree && t.isUnlimited),
    hasUnlimited: eventData.tickets.some(t => t.isUnlimited),
    lowestPrice: eventData.tickets.filter(t => !t.isFree).length > 0 
      ? Math.min(...eventData.tickets.filter(t => !t.isFree).map(t => t.price))
      : 0
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1a1a', '#232323']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleReturnToProfile}>
            <Icon name="x" type="feather" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Event Created!</Text>
          
          <TouchableOpacity onPress={handleShareEvent}>
            <Icon name="share" type="feather" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Success Animation/Icon */}
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Icon name="check" type="feather" size={40} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Event Created Successfully!</Text>
            <Text style={styles.successSubtitle}>Your event is now live and ready for attendees</Text>
          </View>

          {/* Event Preview Card */}
          <TouchableOpacity 
            style={styles.eventCard}
            onPress={handleViewEvent}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: eventData.coverImage }}
              style={styles.eventImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.imageOverlay}
            />
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{eventData.title}</Text>
              <View style={styles.eventDetails}>
                <View style={styles.detailRow}>
                  <Icon name="calendar" type="feather" size={16} color="#FFD700" />
                  <Text style={styles.detailText}>
                    {formatDate(new Date(eventData.date))}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="clock" type="feather" size={16} color="#FFD700" />
                  <Text style={styles.detailText}>
                    {formatTime(new Date(eventData.startTime))}
                    {eventData.hasEndTime && ` - ${formatTime(new Date(eventData.endTime))}`}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="map-pin" type="feather" size={16} color="#FFD700" />
                  <Text style={styles.detailText}>
                    {eventData.address.formatted}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Ticket Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Ticket Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Ticket Types:</Text>
              <Text style={styles.summaryValue}>{ticketSummary.types}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Tickets Available:</Text>
              <Text style={styles.summaryValue}>
                {typeof ticketSummary.total === 'string' ? ticketSummary.total : ticketSummary.total.toLocaleString()}
              </Text>
            </View>
            
            {ticketSummary.freeTickets > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Free Tickets:</Text>
                <Text style={styles.summaryValue}>{ticketSummary.freeTickets}</Text>
              </View>
            )}
            
            {ticketSummary.hasUnlimitedFree && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Free Tickets:</Text>
                <Text style={styles.summaryValue}>Unlimited</Text>
              </View>
            )}
            
            {ticketSummary.paidTickets > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Paid Tickets:</Text>
                <Text style={styles.summaryValue}>{ticketSummary.paidTickets}</Text>
              </View>
            )}
            
            {ticketSummary.hasUnlimitedPaid && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Paid Tickets:</Text>
                <Text style={styles.summaryValue}>Unlimited</Text>
              </View>
            )}
            
            {ticketSummary.lowestPrice > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Starting Price:</Text>
                <Text style={styles.summaryValue}>${ticketSummary.lowestPrice.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Organizer Info */}
          <View style={styles.organizerCard}>
            <Text style={styles.summaryTitle}>Event Organizer</Text>
            
            <View style={styles.organizerInfo}>
              {eventData.organizer.avatar ? (
                <Image 
                  source={{ uri: eventData.organizer.avatar }} 
                  style={styles.organizerAvatar}
                />
              ) : (
                <View style={[styles.organizerAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {(eventData.organizer.name || 'O').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              
              <View style={styles.organizerDetails}>
                <Text style={styles.organizerName}>{eventData.organizer.name}</Text>
                {eventData.organizer.description && (
                  <Text style={styles.organizerDescription}>{eventData.organizer.description}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Verification Code Section */}
          <View style={styles.verificationCard}>
            <Text style={styles.summaryTitle}>Event Verification Code</Text>
            <View style={styles.verificationContent}>
              <Text style={styles.verificationCode}>{eventData.verificationCode}</Text>
              <Text style={styles.verificationDescription}>
                Share this code with your ticket scanners. They will need it to validate tickets at the event.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShareEvent}
            >
              <Icon name="share-2" type="feather" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Share Event</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={handleViewEvent}
            >
              <Icon name="eye" type="feather" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>View Details</Text>
            </TouchableOpacity>
          </View>

          {/* Return to Profile Button */}
          <TouchableOpacity 
            style={styles.returnButton}
            onPress={handleReturnToProfile}
          >
            <Text style={styles.returnButtonText}>Return to Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
    marginBottom: 24,
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  eventContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    opacity: 0.9,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  organizerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  organizerDetails: {
    flex: 1,
  },
  organizerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  organizerDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  verificationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  verificationContent: {
    alignItems: 'center',
    marginTop: 16,
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
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  returnButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  returnButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
});

export default EventConfirmationScreen; 