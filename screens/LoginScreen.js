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
  ActivityIndicator,
} from 'react-native';
import { Text, Icon, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { login, checkEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(null);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const passwordFieldAnim = useRef(new Animated.Value(0)).current;
  
  // Video reference
  const videoRef = useRef(null);
  
  // Debounce timer for email checking
  const emailCheckTimeoutRef = useRef(null);
  
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
    
    // Load and play video in background
    loadVideo();
  }, []);

  useEffect(() => {
    if (showPasswordField) {
      Animated.timing(passwordFieldAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showPasswordField]);

  // Auto-check email with debounce
  useEffect(() => {
    // Clear existing timeout
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    // Don't check if email is already checked or if email is empty
    if (emailChecked || !email.trim()) {
      return;
    }

    // Check if email format is valid
    if (email.includes('@') && email.includes('.')) {
      // Set timeout for debounced email check
      emailCheckTimeoutRef.current = setTimeout(() => {
        handleEmailCheck();
      }, 2000); // Wait 2 seconds after user stops typing
    }

    // Cleanup timeout on unmount or email change
    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, [email, emailChecked]);
  
  const loadVideo = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.loadAsync(require('../assets/videos/homebackground.mov'), {}, false)
          .then(status => {
            if (status.isLoaded) {
              setVideoLoaded(true);
              videoRef.current.playAsync();
              videoRef.current.setIsLoopingAsync(true);
              videoRef.current.setVolumeAsync(0);
            } else {
              setVideoError(true);
            }
          })
          .catch(() => {
            setVideoError(true);
          });
      }
    } catch (error) {
      console.log("Video loading error:", error);
      setVideoError(true);
    }
  };
  
  const handleEmailCheck = async () => {
    if (!email.trim() || !email.includes('@')) {
      return;
    }

    setIsCheckingEmail(true);

    try {
      const result = await checkEmail(email.trim());

      if (result.success) {
        setEmailExists(result.exists);
        setEmailChecked(true);

        if (result.exists) {
          // Email exists, show password field
          setShowPasswordField(true);
        } else {
          // Email doesn't exist, redirect to registration
          Alert.alert(
            'Create Account',
            'This email isn\'t registered yet. Would you like to create a new account?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setEmailChecked(false);
                  setEmailExists(null);
                }
              },
              {
                text: 'Sign Up',
                onPress: () => navigation.navigate('Register', { email: email.trim() }),
              },
            ]
          );
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to verify email');
      }
    } catch (error) {
      console.error('Email check error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleLogin = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        // Success! Navigate to profile
    navigation.reset({
      index: 0,
      routes: [{ name: 'Profile' }],
    });
      } else {
        // Show error
        Alert.alert('Login Failed', result.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setEmailChecked(false);
    setEmailExists(null);
    setShowPasswordField(false);
    setPassword('');
    passwordFieldAnim.setValue(0);
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    // Reset states if user changes email after it was checked
    if (emailChecked) {
      setEmailChecked(false);
      setEmailExists(null);
      setShowPasswordField(false);
      setPassword('');
      passwordFieldAnim.setValue(0);
    }
  };
  
  const handleQRScan = () => {
    // Navigate to verification code screen
    navigation.navigate('VerificationCode');
  };

  const handleSignUp = () => {
    navigation.navigate('Register', { email: email.trim() });
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Background */}
      {!videoError ? (
        <Video
          ref={videoRef}
          style={styles.backgroundVideo}
          resizeMode="cover"
          shouldPlay={false}
          isLooping={true}
          isMuted={true}
          onError={() => setVideoError(true)}
        />
      ) : (
        <LinearGradient
          colors={['#0c162d', '#1a2a4a', '#0c162d']}
          style={styles.backgroundGradient}
        />
      )}
      
      <View style={styles.overlay} />
      
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.title}>Samba</Text>
          <Text style={styles.subtitle}></Text>
        </Animated.View>
        
        {/* Login Form */}
        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.form}>
            <Text style={styles.formTitle}>Login or Sign Up</Text>
          
            {/* Email Input */}
            <View style={[styles.inputContainer, emailChecked && styles.inputChecked]}>
              <TextInput
                style={[styles.input, emailChecked && styles.inputDisabled]}
                placeholder="Email address"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!emailChecked}
              />
              {isCheckingEmail && (
                <ActivityIndicator 
                  size="small" 
                  color="#FFFFFF" 
                  style={styles.loadingIndicator}
                />
              )}
              {emailChecked && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleBackToEmail}
                >
                  <Icon
                    name="edit-2"
                    type="feather"
                    size={18}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Password Input - Animated */}
            {showPasswordField && (
              <Animated.View 
                style={[
                  styles.inputContainer,
                  {
                    opacity: passwordFieldAnim,
                    transform: [{
                      translateY: passwordFieldAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      })
                    }]
                  }
                ]}
              >
            <TextInput
                  style={[styles.input, { paddingRight: 50 }]}
                  placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleLogin}
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
              </Animated.View>
            )}
            
            {/* Sign In Button - Only show when password field is visible */}
            {showPasswordField && (
          <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLogin}
                disabled={isLoading}
          >
                <View style={styles.actionGradient}>
                  <Text style={styles.actionButtonText}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </View>
          </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Floating QR Code Button */}
      <TouchableOpacity 
          style={styles.qrFloatingButton}
        onPress={handleQRScan}
      >
          <Icon
            name="qr-code-scanner"
            type="material"
            size={28}
            color="#FFFFFF"
          />
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Black overlay
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputChecked: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputDisabled: {
    color: 'rgba(255,255,255,0.7)',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  editButton: {
    padding: 8,
  },
  eyeButton: {
    padding: 8,
  },
  actionButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: {
    color: '#0c162d',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qrFloatingButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    right: 24,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen; 