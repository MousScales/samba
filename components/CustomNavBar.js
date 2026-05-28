import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Icon, Text, Avatar, useTheme } from '@rneui/themed';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const CustomNavBar = ({ activeScreen }) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const currentMode = user?.currentMode || 'attendee';
  
  const getIconColor = (screenName) => {
    return activeScreen === screenName ? '#E0E0E0' : '#9E9E9E';
  };
  
  const navigateTo = (screenName) => {
    if (activeScreen === screenName) return;
    
    // Use replace for initial navigation to prevent stack buildup
    if (!activeScreen) {
      navigation.replace(screenName);
    } else {
      navigation.navigate(screenName);
    }
  };

  const renderAttendeeNavBar = () => (
    <View style={[styles.tabBarContainer, { backgroundColor: 'rgba(50, 50, 50, 0.7)' }]}>
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => navigateTo('Home')}
      >
        <Icon 
          name="compact-disc" 
          type="font-awesome-5" 
          size={22} 
          color={getIconColor('Home')} 
        />
        <Text style={[styles.tabLabel, { color: getIconColor('Home') }]}>Events</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => navigateTo('Explore')}
      >
        <Icon 
          name="zap" 
          type="feather" 
          size={22} 
          color={getIconColor('Explore')} 
        />
        <Text style={[styles.tabLabel, { color: getIconColor('Explore') }]}>Explore</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => navigateTo('Profile')}
      >
                  <Avatar
            size={26}
            rounded
            source={user?.profilePicture ? { uri: user.profilePicture } : undefined}
            title={!user?.profilePicture ? (user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U') : undefined}
            titleStyle={{ fontSize: 12, fontWeight: 'bold' }}
          />
        <Text style={[styles.tabLabel, { color: getIconColor('Profile') }]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHostNavBar = () => {
    // Get organization profile data for host mode
    const organizationAvatar = user?.providerInfo?.avatar || user?.providerInfo?.profilePicture;
    const organizationName = user?.providerInfo?.organizationName || user?.name;
    
    return (
      <View style={[styles.tabBarContainer, { backgroundColor: 'rgba(50, 50, 50, 0.7)' }]}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => navigateTo('ManageEvents')}
        >
          <Icon 
            name="list" 
            type="feather" 
            size={22} 
            color={getIconColor('ManageEvents')} 
          />
          <Text style={[styles.tabLabel, { color: getIconColor('ManageEvents') }]}>My Events</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabItem, styles.createEventButton]}
          onPress={() => navigateTo('Create')}
        >
          <Icon 
            name="plus" 
            type="feather" 
            size={24} 
            color="#FFFFFF"
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => navigateTo('Profile')}
        >
          <Avatar
            size={26}
            rounded
            source={organizationAvatar ? { uri: organizationAvatar } : undefined}
            title={!organizationAvatar ? (organizationName ? organizationName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'EH') : undefined}
            titleStyle={{ fontSize: 12, fontWeight: 'bold' }}
          />
          <Text style={[styles.tabLabel, { color: getIconColor('Profile') }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <View style={styles.tabBarWrapper}>
      {currentMode === 'provider' ? renderHostNavBar() : renderAttendeeNavBar()}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(50, 50, 50, 0.7)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  createEventButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: -24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  }
});

export default CustomNavBar; 