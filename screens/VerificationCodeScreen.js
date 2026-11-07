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
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { registerScannerForEvent, addLocalScannerEventId } from '../services/scannerService';

const VerificationCodeScreen = ({ route, navigation }) => {
  const { event, returnTo } = route.params || {};
  const { theme } = useTheme();
  const { events, registerEventScanner, getEventStatus } = useEvents();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlideAnim = useRef(new Animated.Value(-50)).current;
  const backButtonAnim = useRef(new Animated.Value(0)).current;
  const codeBoxesAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
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
      Animated.spring(codeBoxesAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const goToScanner = async (targetEvent, verificationCode) => {
    const status = getEventStatus(targetEvent);
    const isScannerUser = user?.scannerInfo?.status === 'active';
    const vCode = verificationCode || targetEvent.verificationCode;

    try {
      if (vCode) {
        await registerScannerForEvent(vCode);
      }
      if (user?.id) await addLocalScannerEventId(user.id, targetEvent.id);
    } catch {
      if (user?.id) await addLocalScannerEventId(user.id, targetEvent.id);
    }

    if (status !== 'live') {
      Alert.alert(
        t('scannerEvents.alert.notLive.title'),
        t('scannerEvents.alert.registered.message'),
        [{
          text: t('common.ok'),
          onPress: () => {
            if (returnTo === 'ScannerEvents' || isScannerUser) {
              navigation.replace('ScannerEvents');
            } else {
              navigation.goBack();
            }
          },
        }],
      );
      return;
    }

    await registerEventScanner(targetEvent.id, {
      id: user?.id,
      name: user?.name || user?.email?.split('@')[0] || 'Scanner',
      email: user?.email,
      profilePicture: user?.profilePicture,
    });

    navigation.navigate('TicketScanner', { event: targetEvent });
  };

  const handleContinue = () => {
    if (event) {
      if (code === event.verificationCode) {
        goToScanner(event, code);
      } else {
        Alert.alert(
          t('scannerVerification.alert.invalidTitle'),
          t('scannerVerification.alert.incorrectMessage'),
          [{ text: t('common.ok'), onPress: () => setCode('') }]
        );
      }
    } else {
      const matchingEvent = events.find(e => e.verificationCode === code);
      
      if (matchingEvent) {
        goToScanner(matchingEvent, code);
      } else {
        Alert.alert(
          t('scannerVerification.alert.invalidTitle'),
          t('scannerVerification.alert.noEventMessage'),
          [{ text: t('common.ok'), onPress: () => setCode('') }]
        );
      }
    }
  };
  
  const handleBackPress = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };
  
  useEffect(() => {
    if (code.length === 6) {
      handleContinue();
    }
  }, [code]);
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0c162d', '#1a2a4a', '#0c162d']}
        style={styles.backgroundGradient}
      />
      
      <View style={styles.overlay} />
      
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
      
      <Animated.View 
        style={[
          styles.titleSection,
          {
            opacity: titleFadeAnim,
            transform: [{ translateY: titleSlideAnim }]
          }
        ]}
      >
        <Text style={styles.appTitle}>{t('scannerVerification.title')}</Text>
        <Text style={styles.subtitle}>{t('scannerVerification.subtitle')}</Text>
      </Animated.View>
      
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
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
