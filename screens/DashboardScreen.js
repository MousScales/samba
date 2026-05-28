import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Text, useTheme, Icon, Button } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomNavBar from '../components/CustomNavBar';
import { useEvents } from '../context/EventsContext';

const { width } = Dimensions.get('window');

const StatCard = ({ title, value, icon, color }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Icon name={icon} type="feather" size={24} color="#FFFFFF" />
      </View>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );
};

const DashboardScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { events, getEventsByOrganizer } = useEvents();
  const [timeRange, setTimeRange] = useState('week'); // week, month, year
  
  // Calculate statistics
  const stats = {
    totalEvents: events.length,
    upcomingEvents: events.filter(e => new Date(e.date) > new Date()).length,
    totalAttendees: events.reduce((sum, event) => sum + (event.attendees || 0), 0),
    totalRevenue: events.reduce((sum, event) => {
      const ticketPrice = event.price || 0;
      const attendees = event.attendees || 0;
      return sum + (ticketPrice * attendees);
    }, 0),
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.headerGradient}
      />
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Dashboard
        </Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => {/* Implement refresh */}}
        >
          <Icon name="refresh-cw" type="feather" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === 'week' && styles.activeTimeRange
          ]}
          onPress={() => setTimeRange('week')}
        >
          <Text style={[
            styles.timeRangeText,
            { color: timeRange === 'week' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Week
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === 'month' && styles.activeTimeRange
          ]}
          onPress={() => setTimeRange('month')}
        >
          <Text style={[
            styles.timeRangeText,
            { color: timeRange === 'month' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Month
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === 'year' && styles.activeTimeRange
          ]}
          onPress={() => setTimeRange('year')}
        >
          <Text style={[
            styles.timeRangeText,
            { color: timeRange === 'year' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Year
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Events"
            value={stats.totalEvents}
            icon="calendar"
            color="#4CAF50"
          />
          
          <StatCard
            title="Upcoming Events"
            value={stats.upcomingEvents}
            icon="clock"
            color="#2196F3"
          />
          
          <StatCard
            title="Total Attendees"
            value={stats.totalAttendees}
            icon="users"
            color="#9C27B0"
          />
          
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon="dollar-sign"
            color="#FF9800"
          />
        </View>
        
        {/* Add more sections like charts, recent activity, etc. */}
      </ScrollView>
      
      <CustomNavBar activeScreen="Dashboard" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  timeRangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
  },
  activeTimeRange: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
  },
});

export default DashboardScreen; 