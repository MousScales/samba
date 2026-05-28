import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { Text, Icon, Avatar, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const PastEventDetailsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const event = route.params?.event || {};

  // Use fallback data if event data is incomplete
  const eventData = {
    title: event.title || 'Past Event',
    date: event.date || 'Date not available',
    time: event.time || 'Time not available',
    venue: {
      name: event.venue?.name || event.location || 'Venue not available',
      address: event.venue?.address || 'Address not available',
      coordinates: event.venue?.coordinates || { lat: 0, lng: 0 }
    },
    photos: event.photos || [event.image] || [],
    ticketType: event.ticketType || 'General Admission',
    ticketPrice: event.ticketPrice || 'Free',
    organizer: {
      id: event.organizer?.id || '1',
      name: event.organizer?.name || 'Event Organizer',
      avatar: event.organizer?.avatar || 'https://randomuser.me/api/portraits/men/75.jpg'
    }
  };

  const handleOrganizerPress = () => {
    navigation.navigate('OrganizerProfile', { 
      organizerId: eventData.organizer.id,
      organizerName: eventData.organizer.name 
    });
  };

  const renderEmptyPhotos = () => (
    <View style={styles.emptyPhotosContainer}>
      <Icon
        name="image"
        type="feather"
        size={48}
        color="rgba(255,255,255,0.3)"
        style={styles.emptyPhotosIcon}
      />
      <Text style={styles.emptyPhotosText}>No photos available</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" type="feather" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Event Photos */}
        {eventData.photos.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.photoScroll}
            contentContainerStyle={styles.photoContainer}
          >
            {eventData.photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo }}
                style={styles.eventPhoto}
              />
            ))}
          </ScrollView>
        ) : (
          renderEmptyPhotos()
        )}

        {/* Event Details */}
        <View style={styles.eventDetails}>
          <Text style={[styles.eventTitle, { color: theme.colors.text }]}>
            {eventData.title}
          </Text>

          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Icon
                name="calendar"
                type="feather"
                size={20}
                color={theme.colors.primary}
                style={styles.detailIcon}
              />
              <View>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Date & Time
                </Text>
                <Text style={[styles.detailText, { color: theme.colors.text }]}>
                  {eventData.date}
                </Text>
                <Text style={[styles.detailSubtext, { color: theme.colors.textSecondary }]}>
                  {eventData.time}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon
                name="map-pin"
                type="feather"
                size={20}
                color={theme.colors.primary}
                style={styles.detailIcon}
              />
              <View>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Venue
                </Text>
                <Text style={[styles.detailText, { color: theme.colors.text }]}>
                  {eventData.venue.name}
                </Text>
                <Text style={[styles.detailSubtext, { color: theme.colors.textSecondary }]}>
                  {eventData.venue.address}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon
                name="confirmation-number"
                type="material"
                size={20}
                color={theme.colors.primary}
                style={styles.detailIcon}
              />
              <View>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                  Ticket Type
                </Text>
                <Text style={[styles.detailText, { color: theme.colors.text }]}>
                  {eventData.ticketType}
                </Text>
                <Text style={[styles.detailSubtext, { color: theme.colors.textSecondary }]}>
                  {eventData.ticketPrice}
                </Text>
              </View>
            </View>
          </View>

          {/* Organizer Section */}
          <TouchableOpacity
            style={[styles.organizerSection, { backgroundColor: theme.colors.surface }]}
            onPress={handleOrganizerPress}
          >
            <Avatar
              size={50}
              rounded
              source={{ uri: eventData.organizer.avatar }}
              containerStyle={styles.organizerAvatar}
            />
            <View style={styles.organizerInfo}>
              <Text style={[styles.organizerLabel, { color: theme.colors.textSecondary }]}>
                Organized by
              </Text>
              <Text style={[styles.organizerName, { color: theme.colors.text }]}>
                {eventData.organizer.name}
              </Text>
            </View>
            <Icon
              name="chevron-right"
              type="feather"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
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
  header: {
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  photoScroll: {
    height: 200,
  },
  photoContainer: {
    padding: 16,
    gap: 12,
  },
  eventPhoto: {
    width: 300,
    height: 180,
    borderRadius: 16,
  },
  eventDetails: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 16,
  },
  detailSubtext: {
    fontSize: 14,
  },
  organizerSection: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  organizerAvatar: {
    marginRight: 16,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  organizerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyPhotosContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPhotosIcon: {
    marginBottom: 16,
  },
  emptyPhotosText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PastEventDetailsScreen; 