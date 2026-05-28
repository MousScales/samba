import React from 'react';
import { StyleSheet, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, Icon, Button, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatCount } from '../utils/formatNumbers';

// TODO: Replace with real past events from backend
const PAST_EVENTS_DATA = [];

const AttendeeProfileScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { attendee } = route.params;

  // Add default bio if not provided
  const bio = attendee.bio || "Event enthusiast and music lover with a passion for connecting with others through shared experiences.";

  const renderPastEvent = (event) => (
    <TouchableOpacity 
      key={event.id}
      style={[styles.pastEventCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => navigation.navigate('EventDetails', { event })}
    >
      <Image source={{ uri: event.imageUrl }} style={styles.pastEventImage} />
      <View style={styles.pastEventInfo}>
        <Text style={[styles.pastEventTitle, { color: theme.colors.text }]}>
          {event.title}
        </Text>
        <Text style={[styles.pastEventDate, { color: theme.colors.textSecondary }]}>
          {new Date(event.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyPastEvents = () => (
    <View style={styles.emptyStateContainer}>
      <Icon
        name="calendar"
        type="feather"
        size={48}
        color="rgba(255,255,255,0.3)"
        style={styles.emptyStateIcon}
      />
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
        No past events
      </Text>
      <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
        Events attended will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" type="feather" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: attendee.avatar }}
            style={styles.profileImage}
          />
          <Text style={[styles.profileName, { color: theme.colors.text }]}>
            {attendee.name}
          </Text>
          <Text style={[styles.profileBio, { color: theme.colors.textSecondary }]}>
            {bio}
          </Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatCount(attendee.stats?.eventsAttended || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Events
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatCount(attendee.stats?.following || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Following
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Message"
              buttonStyle={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              titleStyle={styles.actionButtonText}
              onPress={() => {/* TODO: Implement messaging */}}
            />
            <Button
              title="Follow"
              buttonStyle={[styles.actionButton, styles.followButton]}
              titleStyle={[styles.actionButtonText, styles.followButtonText]}
              onPress={() => {/* TODO: Implement follow functionality */}}
            />
          </View>
        </View>

        {/* Past Events Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Past Events Attended
          </Text>
          
          {PAST_EVENTS_DATA.length > 0 ? (
            <View style={styles.pastEventsGrid}>
              {PAST_EVENTS_DATA.map(renderPastEvent)}
            </View>
          ) : (
            renderEmptyPastEvents()
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationIcon: {
    marginRight: 4,
  },
  location: {
    fontSize: 16,
  },
  bioContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  bio: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  statDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  pastEventsList: {
    gap: 12,
  },
  pastEventCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  pastEventImage: {
    width: 80,
    height: 80,
  },
  pastEventInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  pastEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pastEventDate: {
    fontSize: 14,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    padding: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  followButton: {
    backgroundColor: '#FF6B3D',
  },
  followButtonText: {
    color: '#FF6B3D',
  },
  pastEventsGrid: {
    gap: 12,
  },
});

export default AttendeeProfileScreen; 