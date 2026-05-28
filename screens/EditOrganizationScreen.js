import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Platform, TextInput, Dimensions, Animated, Alert } from 'react-native';
import { Text, Icon, useTheme, Button } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';

const { width } = Dimensions.get('window');

const EditOrganizationScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { user, updateUser } = useAuth();
  const { updateEventsWithOrganizationNames } = useEvents();
  
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [image, setImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load data from user's provider info
    if (user?.providerInfo) {
      setName(user.providerInfo.organizationName || '');
      setTitle(user.providerInfo.description || '');
      setImage(user.providerInfo.partyLogo || user.profilePicture || '');
    }
  }, [user]);
  
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Organization name is required');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Organization description is required');
      return;
    }

    setIsLoading(true);
    
    try {
      // Update user's provider info
      const updatedProviderInfo = {
        ...user.providerInfo,
        organizationName: name.trim(),
        description: title.trim(),
        partyLogo: image
      };

      const updatedUser = {
        ...user,
        profilePicture: image, // Ensure it's saved to main profile
        providerInfo: updatedProviderInfo
      };

      console.log('Updating user with:', {
        profilePicture: image,
        organizationName: updatedProviderInfo.organizationName,
        description: updatedProviderInfo.description,
        partyLogo: updatedProviderInfo.partyLogo
      });

      // Update the user context
      const result = await updateUser(updatedUser);
      
      if (result.success) {
        console.log('Organization profile updated successfully');
        
        // Update existing events with the new organization name
        await updateEventsWithOrganizationNames(updatedProviderInfo, user.id);
        
        Alert.alert(
          'Success', 
          'Organization profile updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        console.error('Failed to update user:', result.message);
        Alert.alert('Error', result.message || 'Failed to update organization profile.');
      }
      
    } catch (error) {
      console.error('Error updating organization profile:', error);
      Alert.alert('Error', 'Failed to update organization profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Decorative Top Gradient */}
      <LinearGradient
        colors={['#E0E0E0', '#A0A0A0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topGradient}
      />
      
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="x" type="feather" color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Organization</Text>
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <LinearGradient
              colors={isLoading ? ['rgba(224, 224, 224, 0.5)', 'rgba(160, 160, 160, 0.5)'] : ['#E0E0E0', '#A0A0A0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveText}>{isLoading ? 'Saving...' : 'Save'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageSection}>
            <TouchableOpacity 
              style={styles.imageOuterContainer}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(224, 224, 224, 0.2)', 'rgba(160, 160, 160, 0.2)']}
                style={styles.imageGradientBorder}
              >
                <View style={styles.imageContainer}>
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={[styles.profileImage, styles.placeholderImage]}>
                      <Text style={styles.placeholderText}>
                        {(name || user?.name || 'O').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Organization Name</Text>
              <View style={styles.inputContainer}>
                <Icon
                  name="briefcase"
                  type="feather"
                  size={18}
                  color="rgba(255,255,255,0.5)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  selectionColor="#E0E0E0"
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Organization Description</Text>
              <View style={styles.inputContainer}>
                <Icon
                  name="award"
                  type="feather"
                  size={18}
                  color="rgba(255,255,255,0.5)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Describe your organization..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  selectionColor="#E0E0E0"
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
            
            <View style={styles.tipContainer}>
              <Icon
                name="info"
                type="feather"
                size={16}
                color="rgba(255,255,255,0.7)"
                style={styles.tipIcon}
              />
              <Text style={styles.tipText}>
                Your organization name and description will be visible to all event attendees
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  saveText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  imageOuterContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGradientBorder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 67,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  editImageGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 14,
  },
  tipContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 0, 224, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4A00E0',
  },
  tipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  placeholderImage: {
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 24,
    fontWeight: '600',
  },
});

export default EditOrganizationScreen; 