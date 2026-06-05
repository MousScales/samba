import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  Pressable,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { isValidEmailFormat } from '../utils/validateEmail';
import { pickImageFromLibrary } from '../utils/pickImage';

const TOTAL_STEPS = 10;

const STEP_PROMPT_KEYS = {
  1: 'register.prompt.firstName',
  2: 'register.prompt.lastName',
  3: 'register.prompt.profilePhoto',
  4: 'register.prompt.email',
  5: 'register.prompt.phoneNumber',
  6: 'register.prompt.dateOfBirth',
  7: 'register.prompt.city',
  8: 'register.prompt.state',
  9: 'register.prompt.password',
  10: 'register.prompt.confirmPassword',
};

const SimpleStepDots = ({ current, total }) => (
  <View style={styles.dotsRow}>
    {Array.from({ length: total }, (_, i) => (
      <View
        key={i}
        style={[
          styles.dot,
          i + 1 <= current ? styles.dotActive : styles.dotInactive,
        ]}
      />
    ))}
  </View>
);

const RegisterScreen = ({ navigation, route }) => {
  const { register } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const prefilledEmail = route.params?.email || '';

  const [currentStep, setCurrentStep] = useState(1);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(prefilledEmail);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scrollRef = useRef(null);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [currentStep]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDateOfBirth(selectedDate);
  };

  const pickImage = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setProfilePicture(uri);
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!firstName.trim()) {
          Alert.alert(t('common.required.title'), t('register.error.firstNameRequired'));
          return false;
        }
        return true;
      case 2:
        if (!lastName.trim()) {
          Alert.alert(t('common.required.title'), t('register.error.lastNameRequired'));
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        if (!isValidEmailFormat(email)) {
          Alert.alert(t('common.invalidEmail.title'), t('common.invalidEmail.message'));
          return false;
        }
        return true;
      case 5:
        if (!phoneNumber.trim()) {
          Alert.alert(t('common.required.title'), t('register.error.phoneRequired'));
          return false;
        }
        return true;
      case 6:
        if (calculateAge(dateOfBirth) < 18) {
          Alert.alert(t('register.alert.ageRequirement.title'), t('register.alert.ageRequirement.message'));
          return false;
        }
        return true;
      case 7:
        if (!city.trim()) {
          Alert.alert(t('common.required.title'), t('register.error.cityRequired'));
          return false;
        }
        return true;
      case 8:
        if (!state.trim()) {
          Alert.alert(t('common.required.title'), t('register.error.stateRequired'));
          return false;
        }
        return true;
      case 9:
        if (password.length < 8) {
          Alert.alert(t('register.alert.password.title'), t('register.error.passwordMinLength'));
          return false;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
          Alert.alert(t('register.alert.password.title'), t('register.error.passwordComplexity'));
          return false;
        }
        return true;
      case 10:
        if (password !== confirmPassword) {
          Alert.alert(t('register.alert.password.title'), t('register.error.passwordMismatch'));
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    } else {
      handleRegister();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
    else navigation.goBack();
  };

  const handleRegister = async () => {
    if (!validateCurrentStep()) return;
    setIsLoading(true);
    try {
      const result = await register({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        dateOfBirth: formatDate(dateOfBirth),
        address: { city: city.trim(), state: state.trim() },
        password,
        profilePicture: profilePicture || null,
      });
      if (!result.success) {
        Alert.alert(t('register.alert.failed.title'), result.message || t('register.alert.failed.message'));
      }
    } catch (error) {
      Alert.alert(t('register.alert.failed.title'), error.message || t('register.alert.failed.message'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (props) => (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        placeholderTextColor="rgba(255,255,255,0.5)"
        {...props}
      />
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderInput({
          placeholder: t('register.placeholder.firstName'),
          value: firstName,
          onChangeText: setFirstName,
          autoCapitalize: 'words',
          autoFocus: true,
          onSubmitEditing: handleNext,
        });
      case 2:
        return renderInput({
          placeholder: t('register.placeholder.lastName'),
          value: lastName,
          onChangeText: setLastName,
          autoCapitalize: 'words',
          autoFocus: true,
          onSubmitEditing: handleNext,
        });
      case 3:
        return (
          <View style={styles.photoStep}>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.photo} />
              ) : (
                <Icon name="user" type="feather" size={40} color="rgba(255,255,255,0.4)" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} style={styles.skipLink}>
              <Text style={styles.skipText}>{t('common.skipForNow')}</Text>
            </TouchableOpacity>
          </View>
        );
      case 4:
        return renderInput({
          placeholder: t('register.placeholder.email'),
          value: email,
          onChangeText: setEmail,
          keyboardType: 'email-address',
          autoCapitalize: 'none',
          autoFocus: true,
          editable: !prefilledEmail,
          onSubmitEditing: handleNext,
        });
      case 5:
        return renderInput({
          placeholder: t('register.placeholder.phoneNumber'),
          value: phoneNumber,
          onChangeText: setPhoneNumber,
          keyboardType: 'phone-pad',
          autoFocus: true,
          onSubmitEditing: handleNext,
        });
      case 6:
        return (
          <>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>{formatDate(dateOfBirth)}</Text>
              <Icon name="calendar" type="feather" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            {Platform.OS === 'ios' && (
              <Modal visible={showDatePicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                  <View style={styles.dateModal}>
                    <View style={styles.dateModalHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.dateModalBtn}>{t('common.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={dateOfBirth}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                      themeVariant="dark"
                    />
                  </View>
                </View>
              </Modal>
            )}
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
          </>
        );
      case 7:
        return renderInput({
          placeholder: t('register.placeholder.city'),
          value: city,
          onChangeText: setCity,
          autoCapitalize: 'words',
          autoFocus: true,
          onSubmitEditing: handleNext,
        });
      case 8:
        return renderInput({
          placeholder: t('register.placeholder.state'),
          value: state,
          onChangeText: setState,
          autoCapitalize: 'characters',
          autoFocus: true,
          onSubmitEditing: handleNext,
        });
      case 9:
        return (
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { paddingRight: 48 }]}
              placeholder={t('register.placeholder.password')}
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoFocus
              onSubmitEditing={handleNext}
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? 'eye-off' : 'eye'} type="feather" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        );
      case 10:
        return (
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { paddingRight: 48 }]}
              placeholder={t('register.placeholder.confirmPassword')}
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoFocus
              onSubmitEditing={handleRegister}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Icon
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                type="feather"
                size={20}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === TOTAL_STEPS;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0c162d', '#1a2a4a', '#0c162d']} style={styles.backgroundGradient} />
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="arrow-left" type="feather" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <SimpleStepDots current={currentStep} total={TOTAL_STEPS} />
          <Text style={styles.stepCount}>{t('register.stepCount', { current: currentStep, total: TOTAL_STEPS })}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardVisible && styles.scrollContentKeyboard,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Pressable onPress={Keyboard.dismiss}>
            <Animated.View
              style={[
                styles.main,
                keyboardVisible && styles.mainKeyboardOpen,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={[styles.brand, keyboardVisible && styles.brandCompact]}>{t('brand.name')}</Text>
              <Text style={styles.prompt}>{t(STEP_PROMPT_KEYS[currentStep])}</Text>
              <View style={styles.fieldWrap}>{renderStepContent()}</View>
            </Animated.View>
          </Pressable>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0c162d" />
            ) : (
              <Text style={styles.actionButtonText}>
                {isLastStep ? t('register.button.createAccount') : t('common.continue')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  scrollContentKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: { width: 40, padding: 4 },
  dotsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: { backgroundColor: '#FFFFFF' },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  stepCount: {
    width: 40,
    textAlign: 'right',
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  main: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  mainKeyboardOpen: {
    paddingTop: 0,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 48,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed',
  },
  brandCompact: {
    fontSize: 32,
    marginBottom: 16,
  },
  prompt: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldWrap: {
    width: '100%',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    height: 56,
    color: '#FFFFFF',
    fontSize: 16,
  },
  dateText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeButton: { padding: 8 },
  photoStep: { alignItems: 'center' },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photo: { width: 120, height: 120, borderRadius: 60 },
  skipLink: { marginTop: 20, padding: 8 },
  skipText: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  actionButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#0c162d',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  dateModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dateModalHeader: {
    alignItems: 'flex-end',
    padding: 16,
  },
  dateModalBtn: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default RegisterScreen;
