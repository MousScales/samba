import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, useTheme } from '@rneui/themed';
import { Video } from 'expo-av';
import { useEvents } from '../context/EventsContext';

const VerificationCodeScreen = ({ route, navigation }) => {
  const { event } = route.params || {}; // Make event optional
  const { theme } = useTheme();
  const { events } = useEvents(); // Get events from context
  const [code, setCode] = useState('');
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlideAnim = useRef(new Animated.Value(-50)).current;
  const backButtonAnim = useRef(new Animated.Value(0)).current;
  const codeBoxesAnim = useRef(new Animated.Value(0)).current;
  
  // Video reference
  const videoRef = useRef(null);
  
  useEffect(() => {
    // Start animations when component mounts
    Animated.sequence([
      // First animate the background fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      
      // Then animate title and back button together
      Animated.parallel([
        Animated.timing(titleFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(backButtonAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      
      // Finally animate the code input boxes with bounce effect
      Animated.spring(codeBoxesAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Load and play video in background
    loadVideo();
  }, []);
  
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
  
  const handleContinue = () => {
    if (event) {
      // If we have a specific event, verify against its code
      if (code === event.verificationCode) {
        navigation.navigate('TicketScanner', { event });
      } else {
        Alert.alert(
          'Invalid Code',
          'The verification code you entered is incorrect. Please check the code and try again.',
          [{ text: 'OK', onPress: () => setCode('') }]
        );
      }
    } else {
      // If no specific event, search all events for matching verification code
      const matchingEvent = events.find(e => e.verificationCode === code);
      
      if (matchingEvent) {
        // Found an event with matching verification code
        navigation.navigate('TicketScanner', { 
          event: matchingEvent,
          eventId: matchingEvent.id 
        });
      } else {
        // No event found with this verification code
        Alert.alert(
          'Invalid Code',
          'No event found with this verification code. Please check the code and try again.',
          [{ text: 'OK', onPress: () => setCode('') }]
        );
      }
    }
  };
  
  const handleBackPress = () => {
    // Clear any keyboard and navigate back
    Keyboard.dismiss();
    navigation.goBack();
  };
  
  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (code.length === 6) {
      handleContinue();
    }
  }, [code]);
  
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
      
      {/* Dark overlay */}
      <View style={styles.overlay} />
      
      {/* Header with back button and title */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: backButtonAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Icon name="arrow-left" type="feather" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
      
      {/* Centered Title Section */}
      <Animated.View 
        style={[
          styles.titleSection,
          {
            opacity: titleFadeAnim,
            transform: [{ translateY: titleSlideAnim }]
          }
        ]}
      >
        <Text style={styles.appTitle}>Scanner Verification</Text>
        <Text style={styles.subtitle}>Enter the event's verification code to continue</Text>
      </Animated.View>
      
      {/* Centered Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: codeBoxesAnim }
              ]
            }
          ]}
        >
          <View style={styles.codeContainer}>
            <View style={styles.codeBoxesContainer}>
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const digit = code[index] || '';
                const isActive = index === code.length;
                return (
                  <View 
                    key={index}
                    style={styles.codeInputContainer}
                  >
                    <Text style={[
                      styles.codeDigit,
                      digit ? styles.filledDigit : null
                    ]}>
                      {digit}
                    </Text>
                    <View style={[
                      styles.codeLine,
                      isActive ? styles.activeCodeLine : null,
                      digit ? styles.filledCodeLine : null
                    ]} />
                  </View>
                );
              })}
            </View>
            <TextInput
              style={styles.hiddenInput}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={true}
            />
          </View>
        </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Much darker overlay
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleSection: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 0,
    right: 0,
    zIndex: 5,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  codeContainer: {
    width: '100%',
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '80%',
  },
  codeInputContainer: {
    width: 40,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    minHeight: 30,
  },
  filledDigit: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  codeLine: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 5,
  },
  activeCodeLine: {
    backgroundColor: '#FFFFFF',
  },
  filledCodeLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 44,
    justifyContent: 'flex-start',
  },
  headerSpacer: {
    flex: 1,
  },
});

export default VerificationCodeScreen; 