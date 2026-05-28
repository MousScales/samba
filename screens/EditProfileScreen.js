import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform, Animated, Dimensions, Alert } from 'react-native';
import { Text, Input, Button, Icon, Avatar, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function EditProfileScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { user, updateUser, isLoading, userLocation } = useAuth();
  
  const [profileData, setProfileData] = useState({
    name: '',
    location: '',
    email: '',
    phone: '',
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const animatedOpacity = new Animated.Value(0);
  const animatedTranslateY = new Animated.Value(20);

  useEffect(() => {
    // Initialize profile data with actual user data
    console.log('User data in EditProfile:', user);
    console.log('User location in EditProfile:', userLocation);
    
    if (user && !isInitialized) {
      // Use actual user location from GPS if available, otherwise fall back to stored address
      let locationDisplay = '';
      
      if (userLocation?.city && userLocation?.state) {
        locationDisplay = `${userLocation.city}, ${userLocation.state}`;
      } else if (userLocation?.city) {
        locationDisplay = userLocation.city;
      } else if (userLocation?.state) {
        locationDisplay = userLocation.state;
      } else {
        // Fallback to stored address
        const address = user.address || {};
        const city = address.city || '';
        const state = address.state || '';
        locationDisplay = city && state ? `${city}, ${state}` : city || state || '';
      }
      
      console.log('Initializing profile data with:', {
        name: user.name,
        location: locationDisplay,
        email: user.email,
        phone: user.phoneNumber || user.phone
      });
      
      setProfileData({
        name: user.name || '',
        location: locationDisplay,
        email: user.email || '',
        phone: user.phoneNumber || user.phone || '',
      });
      setIsInitialized(true);
    }
  }, [user, userLocation, isInitialized]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(animatedTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSave = async () => {
    try {
      // Parse the location back into city and state
      const locationParts = profileData.location.split(', ');
      const city = locationParts[0] || '';
      const state = locationParts[1] || '';

      const updatedUserData = {
        name: profileData.name,
        email: profileData.email,
        phoneNumber: profileData.phone,
        address: {
          ...(user?.address || {}),
          city: city,
          state: state,
        }
      };

      const result = await updateUser(updatedUserData);
      
      if (result.success) {
        navigation.goBack();
      } else {
        // Handle error - you might want to show an alert here
        console.error('Failed to update profile:', result.message);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to change your profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Update user data with new profile picture
        const newProfilePicture = result.assets[0].uri;
        const updateResult = await updateUser({ profilePicture: newProfilePicture });
        
        if (!updateResult.success) {
          Alert.alert('Error', 'Failed to update profile picture. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const createAnimatedStyle = (delay) => {
    return {
      opacity: 1,
      transform: [{ translateY: 0 }],
    };
  };

  const inputProps = {
    style: { color: theme.colors.text, fontWeight: '500' },
    inputContainerStyle: {
      borderBottomColor: 'rgba(255,255,255,0.15)',
      borderBottomWidth: 1,
      paddingBottom: 8,
    },
    labelStyle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
  };

  // Show loading state if user data is not available
  if (!user && isLoading) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['bottom', 'left', 'right']}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['bottom', 'left', 'right']}
    >
      <LinearGradient
        colors={['rgba(50, 50, 50, 0.4)', 'rgba(0, 0, 0, 0)']}
        style={styles.backgroundGradient}
      />
      
      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: 'rgba(30, 30, 30, 0.8)' }]} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" type="feather" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#FFFFFF', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
          >
            <Text style={[styles.saveButtonText, { color: '#0c162d' }]}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Animated.View style={[createAnimatedStyle(0)]}>
          <View style={[styles.avatarContainer]}>
            <LinearGradient
              colors={['rgba(45, 45, 45, 0.9)', 'rgba(25, 25, 25, 0.7)']}
              style={styles.avatarGradient}
            >
              <TouchableOpacity onPress={pickImage} style={styles.avatarTouchable} activeOpacity={0.8}>
                <Avatar
                  size={120}
                  rounded
                  source={user?.profilePicture ? { uri: user.profilePicture } : undefined}
                  title={!user?.profilePicture ? (profileData.name ? profileData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U') : ''}
                  titleStyle={{ fontSize: 36, fontWeight: 'bold' }}
                  containerStyle={styles.avatar}
                />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animated.View>

        <Animated.View style={[createAnimatedStyle(100)]}>
          <View style={[styles.inputSection, { backgroundColor: 'rgba(30, 30, 30, 0.8)' }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information</Text>
          
          <Input
            {...inputProps}
            label="Full Name"
            value={profileData.name}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))}
              leftIcon={
                <Icon name="user" type="feather" size={20} color="#FFFFFF" style={styles.inputIcon} />
              }
          />

          <Input
            {...inputProps}
            label="Location"
            value={profileData.location}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, location: text }))}
              leftIcon={
                <Icon name="map-pin" type="feather" size={20} color="#FFFFFF" style={styles.inputIcon} />
              }
            rightIcon={
                <TouchableOpacity style={styles.locationPickerButton}>
                  <Icon 
                    name="navigation" 
                    type="feather" 
                    size={18} 
                    color={theme.colors.textSecondary} 
                  />
                </TouchableOpacity>
            }
          />
        </View>
        </Animated.View>

        <Animated.View style={[createAnimatedStyle(200)]}>
          <View style={[styles.inputSection, { backgroundColor: 'rgba(30, 30, 30, 0.8)' }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact Information</Text>
          
          <Input
            {...inputProps}
            label="Email"
            value={profileData.email}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, email: text }))}
            keyboardType="email-address"
            autoCapitalize="none"
              leftIcon={
                <Icon name="mail" type="feather" size={20} color="#FFFFFF" style={styles.inputIcon} />
              }
            rightIcon={
                <TouchableOpacity style={styles.verifiedBadge}>
                  <Icon 
                    name="check-circle" 
                    type="feather" 
                    size={18} 
                    color="#4CAF50" 
                  />
                </TouchableOpacity>
            }
          />

          <Input
            {...inputProps}
            label="Phone Number"
            value={profileData.phone}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
            keyboardType="phone-pad"
              leftIcon={
                <Icon name="phone" type="feather" size={20} color="#FFFFFF" style={styles.inputIcon} />
            }
          />
        </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  formContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  saveButton: {
    borderRadius: 25,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FF416C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  saveButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarGradient: {
    padding: 24,
    borderRadius: 30,
    alignItems: 'center',
    width: width - 40,
    marginHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  avatar: {
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  avatarTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 30,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  inputIcon: {
    marginRight: 10,
  },
  locationPickerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    paddingHorizontal: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
  },
}); 