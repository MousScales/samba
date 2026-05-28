import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Alert,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { Text, Icon, useTheme, Button } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const StepIndicator = ({ currentStep, totalSteps, theme }) => {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor: i < currentStep ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                borderColor: i === currentStep - 1 ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                borderWidth: i === currentStep - 1 ? 2 : 1,
              }
            ]}
          >
            {i < currentStep - 1 ? (
              <Icon name="check" type="feather" size={14} color="#1A1A1A" />
            ) : (
              <Text style={[styles.stepNumber, { 
                color: i === currentStep - 1 ? '#1A1A1A' : 'rgba(255,255,255,0.7)',
                fontWeight: i === currentStep - 1 ? '700' : '500'
              }]}>
                {i + 1}
              </Text>
            )}
          </View>
          {i < totalSteps - 1 && (
            <View style={[styles.stepLine, {
              backgroundColor: i < currentStep - 1 ? '#FFFFFF' : 'rgba(255,255,255,0.2)'
            }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const RegisterScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { register } = useAuth();
  
  // Get email from navigation params
  const prefilledEmail = route.params?.email || '';
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Step 1: Profile Picture & Basic Info
  const [profilePicture, setProfilePicture] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Step 2: Contact Information
  const [email, setEmail] = useState(prefilledEmail);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1)); // Default to Jan 1, 2000
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Step 3: Location Information (simplified)
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
  // Step 4: Account Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  // Function to calculate age from date of birth
  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Handle date picker change
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!firstName.trim()) {
          Alert.alert('Required Field', 'Please enter your first name');
          return false;
        }
        if (!lastName.trim()) {
          Alert.alert('Required Field', 'Please enter your last name');
          return false;
        }
        return true;
      
      case 2:
        if (!email.trim()) {
          Alert.alert('Required Field', 'Please enter your email address');
          return false;
        }
        if (!email.includes('@') || !email.includes('.')) {
          Alert.alert('Invalid Email', 'Please enter a valid email address');
          return false;
        }
        if (!phoneNumber.trim()) {
          Alert.alert('Required Field', 'Please enter your phone number');
          return false;
        }
        if (!dateOfBirth) {
          Alert.alert('Required Field', 'Please select your date of birth');
          return false;
        }
        
        const age = calculateAge(dateOfBirth);
        if (age < 18) {
          Alert.alert('Age Requirement', 'You must be at least 18 years old to create an account');
          return false;
        }
        
        return true;
      
      case 3:
        if (!city.trim()) {
          Alert.alert('Required Field', 'Please enter your city');
          return false;
        }
        if (!state.trim()) {
          Alert.alert('Required Field', 'Please enter your state');
          return false;
        }
        return true;
      
      case 4:
        if (!password.trim()) {
          Alert.alert('Required Field', 'Please enter a password');
          return false;
        }
        if (password.length < 8) {
          Alert.alert('Password Too Short', 'Password must be at least 8 characters long');
          return false;
        }
        if (!/[A-Z]/.test(password)) {
          Alert.alert('Password Requirements', 'Password must contain at least one uppercase letter');
          return false;
        }
        if (!/[a-z]/.test(password)) {
          Alert.alert('Password Requirements', 'Password must contain at least one lowercase letter');
          return false;
        }
        if (!/[0-9]/.test(password)) {
          Alert.alert('Password Requirements', 'Password must contain at least one number');
          return false;
        }
        if (password !== confirmPassword) {
          Alert.alert('Password Mismatch', 'Passwords do not match');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleRegister();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleRegister = async () => {
    if (!validateCurrentStep()) return;
    
    setIsLoading(true);
    
    try {
      const userData = {
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        dateOfBirth: formatDate(dateOfBirth),
        address: {
          city: city.trim(),
          state: state.trim(),
        },
        password: password,
        profilePicture: profilePicture || null,
      };
      
      const result = await register(userData);
      
      if (!result.success) {
        Alert.alert(
          'Registration Failed',
          result.message || 'Unable to create account. Please try again.'
        );
      }
      // If successful, navigation will be handled by the auth context
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
        error.message || 'Unable to create account. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: '#FFFFFF' }]}>
        Let's Get Started
      </Text>
      <Text style={[styles.stepSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
        Tell us about yourself
      </Text>
      
      <View style={styles.profilePictureContainer}>
        <TouchableOpacity style={styles.profilePictureButton} onPress={pickImage}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
          ) : (
            <View style={styles.profilePicturePlaceholder}>
              <Icon name="camera" type="feather" size={32} color="rgba(255,255,255,0.7)" />
            </View>
          )}
          <Text style={[styles.addPhotoText, { color: 'rgba(255,255,255,0.7)' }]}>
            Add Photo
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={[styles.inputLabel, { color: '#FFFFFF' }]}>First Name</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              borderColor: 'rgba(255,255,255,0.2)'
            }]}
            placeholder="Enter first name"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={[styles.inputLabel, { color: '#FFFFFF' }]}>Last Name</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              borderColor: 'rgba(255,255,255,0.2)'
            }]}
            placeholder="Enter last name"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: '#FFFFFF' }]}>
        Contact Information
      </Text>
      <Text style={[styles.stepSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
        How can we reach you?
      </Text>
      
      <Text style={[styles.inputLabel, { color: '#FFFFFF' }]}>Email Address</Text>
      <TextInput
        style={[styles.input, { 
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#FFFFFF',
          borderColor: 'rgba(255,255,255,0.2)'
        }]}
        placeholder="Enter email address"
        placeholderTextColor="rgba(255,255,255,0.5)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <Text style={[styles.inputLabel, { color: '#FFFFFF' }]}>Phone Number</Text>
      <TextInput
        style={[styles.input, { 
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#FFFFFF',
          borderColor: 'rgba(255,255,255,0.2)'
        }]}
        placeholder="Enter phone number"
        placeholderTextColor="rgba(255,255,255,0.5)"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      
      <Text style={[styles.inputLabel, { color: '#FFFFFF' }]}>Date of Birth</Text>
      <TouchableOpacity
        style={[styles.input, styles.datePickerButton, { 
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderColor: 'rgba(255,255,255,0.2)'
        }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={[styles.datePickerText, { color: '#FFFFFF' }]}>
          {formatDate(dateOfBirth)}
        </Text>
        <Icon name="calendar" type="feather" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
      
      <Text style={[styles.helperText, { color: 'rgba(255,255,255,0.5)' }]}>
        You must be at least 18 years old
      </Text>

      {/* Date Picker Modal for iOS */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={[styles.modalButtonText, { fontWeight: '600' }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                textColor="#FFFFFF"
                themeVariant="dark"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker for Android */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={dateOfBirth}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: '#FFFFFF' }]}>
        Your Location
      </Text>
      <Text style={[styles.stepSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
        Help us recommend local events
      </Text>
      
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={[styles.inputLabel, { color: '#FFFFFF' }]}>City</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              borderColor: 'rgba(255,255,255,0.2)'
            }]}
            placeholder="Enter city"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={[styles.inputLabel, { color: '#FFFFFF' }]}>State</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              borderColor: 'rgba(255,255,255,0.2)'
            }]}
            placeholder="Enter state"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={state}
            onChangeText={setState}
            autoCapitalize="characters"
          />
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: '#FFFFFF' }]}>
        Account Security
      </Text>
      <Text style={[styles.stepSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
        Create a secure password
      </Text>
      
      <Text style={[styles.inputLabel, { color: '#FFFFFF' }]}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, { 
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#FFFFFF',
            borderColor: 'rgba(255,255,255,0.2)'
          }]}
          placeholder="Enter password"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Icon
            name={showPassword ? "eye-off" : "eye"}
            type="feather"
            size={20}
            color="rgba(255,255,255,0.7)"
          />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.inputLabel, { color: '#FFFFFF' }]}>Confirm Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, { 
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#FFFFFF',
            borderColor: 'rgba(255,255,255,0.2)'
          }]}
          placeholder="Confirm password"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Icon
            name={showConfirmPassword ? "eye-off" : "eye"}
            type="feather"
            size={20}
            color="rgba(255,255,255,0.7)"
          />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.passwordRequirements, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
        <Text style={[styles.requirementsTitle, { color: '#FFFFFF' }]}>
          Password Requirements:
        </Text>
        
        {[
          { text: 'At least 8 characters', met: password.length >= 8 },
          { text: 'One uppercase letter', met: /[A-Z]/.test(password) },
          { text: 'One lowercase letter', met: /[a-z]/.test(password) },
          { text: 'One number', met: /[0-9]/.test(password) },
          { text: 'Passwords match', met: password === confirmPassword && password.length > 0 }
        ].map((requirement, index) => (
          <View key={index} style={styles.requirementRow}>
            <Icon
              name={requirement.met ? "check-circle" : "circle"}
              type="feather"
              size={16}
              color={requirement.met ? '#4CAF50' : 'rgba(255,255,255,0.3)'}
              style={styles.requirementIcon}
            />
            <Text style={[styles.requirement, { 
              color: requirement.met ? '#4CAF50' : 'rgba(255,255,255,0.5)' 
            }]}>
              {requirement.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#2A2A2A', '#1A1A1A']}
        style={styles.backgroundGradient}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-left" type="feather" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Create Account
          </Text>
          <View style={styles.headerRight}>
            <Text style={styles.stepCounter}>
              {currentStep}/{totalSteps}
            </Text>
          </View>
        </Animated.View>

        {/* Step Indicator */}
        <Animated.View style={[styles.stepIndicatorContainer, { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} theme={theme} />
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.content, { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderCurrentStep()}
          </ScrollView>
        </Animated.View>

        {/* Bottom Navigation */}
        <Animated.View style={[styles.bottomNav, { opacity: fadeAnim }]}>
          <Button
            title={currentStep === totalSteps ? "Create Account" : "Continue"}
            buttonStyle={styles.nextButton}
            titleStyle={styles.nextButtonText}
            onPress={handleNext}
            loading={isLoading}
            disabled={isLoading}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  stepIndicatorContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepLine: {
    width: 40,
    height: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profilePictureButton: {
    alignItems: 'center',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    borderWidth: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  passwordRequirements: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementIcon: {
    marginRight: 8,
  },
  requirement: {
    fontSize: 14,
    flex: 1,
  },
  bottomNav: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  nextButton: {
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  // Date Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButton: {
    padding: 8,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default RegisterScreen; 