import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { pickImageFromLibrary, pickImageFromCamera } from '../utils/pickImage';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { useLanguage } from '../context/LanguageContext';
import { getGoogleMapsApiKey } from '../config/env';

const TOTAL_STEPS = 7;

const STEP_PROMPT_KEYS = {
  1: 'becomeProvider.prompt.orgName',
  2: 'becomeProvider.prompt.about',
  3: 'becomeProvider.prompt.businessEmail',
  4: 'becomeProvider.prompt.businessPhone',
  5: 'becomeProvider.prompt.venueAddress',
  6: 'becomeProvider.prompt.website',
  7: 'becomeProvider.prompt.logo',
};

const SimpleStepDots = ({ current, total }) => (
  <View style={styles.dotsRow}>
    {Array.from({ length: total }, (_, i) => (
      <View
        key={i}
        style={[styles.dot, i + 1 <= current ? styles.dotActive : styles.dotInactive]}
      />
    ))}
  </View>
);

const BecomeProviderScreen = ({ navigation }) => {
  const { becomeProvider, user } = useAuth();
  const { updateEventsWithOrganizationNames } = useEvents();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Core fields
  const [organizationName, setOrganizationName] = useState('');
  const [description, setDescription] = useState('');
  const [partyEmail, setPartyEmail] = useState(user?.email || '');
  const [partyPhone, setPartyPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [partyLogo, setPartyLogo] = useState(null);
  const [businessAddress, setBusinessAddress] = useState({
    street: '', city: '', state: '', zipCode: '', country: 'United States',
  });

  // Address autocomplete state (step 5 only)
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressSearching, setAddressSearching] = useState(false);

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
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // ── Google Places address search ──────────────────────────────────────────
  const searchAddress = async (text) => {
    setBusinessAddress(p => ({ ...p, street: text }));
    if (text.trim().length < 2) {
      setAddressSuggestions([]);
      return;
    }
    setAddressSearching(true);
    try {
      const GOOGLE_KEY = getGoogleMapsApiKey();
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=address&language=en&key=${GOOGLE_KEY}`
      );
      const data = await response.json();
      setAddressSuggestions((data.predictions ?? []).map(item => ({
        id: item.place_id,
        display: item.description,
        street: item.structured_formatting?.main_text || item.description.split(',')[0],
        city: item.terms?.[1]?.value || '',
        state: item.terms?.[2]?.value || '',
        zipCode: '',
      })));
    } catch (e) {
      setAddressSuggestions([]);
    } finally {
      setAddressSearching(false);
    }
  };

  const selectAddress = (suggestion) => {
    setBusinessAddress({
      street: suggestion.display,
      city: suggestion.city,
      state: suggestion.state,
      zipCode: suggestion.zipCode,
      country: 'United States',
    });
    setAddressSuggestions([]);
    Keyboard.dismiss();
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!organizationName.trim()) { Alert.alert(t('common.required.title'), t('becomeProvider.error.orgName')); return false; }
        return true;
      case 2:
        if (!description.trim()) { Alert.alert(t('common.required.title'), t('becomeProvider.error.description')); return false; }
        return true;
      case 3:
        if (!partyEmail.trim()) { Alert.alert(t('common.required.title'), t('becomeProvider.error.businessEmail')); return false; }
        return true;
      case 4:
        if (!partyPhone.trim()) { Alert.alert(t('common.required.title'), t('becomeProvider.error.businessPhone')); return false; }
        return true;
      case 5:
        if (!businessAddress.street.trim()) { Alert.alert(t('common.required.title'), t('becomeProvider.error.address')); return false; }
        return true;
      case 6: // website — optional
      case 7: // logo — optional
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < TOTAL_STEPS) setCurrentStep(s => s + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
    else navigation.goBack();
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const providerData = {
        organizationName,
        description,
        partyEmail,
        partyPhone,
        website,
        businessAddress: { ...businessAddress, addressLine2: '' },
        partyLogo,
      };
      const result = await becomeProvider(providerData);
      if (result.success) {
        await updateEventsWithOrganizationNames(providerData, user?.id);
        Alert.alert(
          t('becomeProvider.alert.submitted.title'),
          t('becomeProvider.alert.submitted.message'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(t('common.error'), result.message || t('becomeProvider.error.submitFailed'));
      }
    } catch {
      Alert.alert(t('common.error'), t('common.errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const renderInput = (props) => (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        placeholderTextColor="rgba(255,255,255,0.5)"
        selectionColor="#FF4B8C"
        {...props}
      />
    </View>
  );

  const pickPartyLogo = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setPartyLogo(uri);
  };

  const renderPhotoCircle = (uri, onPress) => (
    <TouchableOpacity style={styles.photoButton} onPress={onPress}>
      {uri ? (
        <Image source={{ uri }} style={styles.photo} />
      ) : (
        <Icon name="image" type="feather" size={40} color="rgba(255,255,255,0.4)" />
      )}
    </TouchableOpacity>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderInput({
          placeholder: t('becomeProvider.placeholder.orgName'),
          value: organizationName,
          onChangeText: setOrganizationName,
          autoCapitalize: 'words',
          autoFocus: true,
          onSubmitEditing: handleNext,
        });
      case 2:
        return (
          <View style={styles.textAreaWrap}>
            <TextInput
              style={styles.textArea}
              placeholder={t('becomeProvider.placeholder.about')}
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
              autoFocus
              selectionColor="#FF4B8C"
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>
        );
      case 3:
        return renderInput({
          placeholder: t('becomeProvider.placeholder.businessEmail'),
          value: partyEmail,
          onChangeText: setPartyEmail,
          keyboardType: 'email-address',
          autoCapitalize: 'none',
          autoFocus: true,
          onSubmitEditing: handleNext,
        });
      case 4:
        return renderInput({
          placeholder: t('becomeProvider.placeholder.businessPhone'),
          value: partyPhone,
          onChangeText: setPartyPhone,
          keyboardType: 'phone-pad',
          autoFocus: true,
          onSubmitEditing: handleNext,
        });
      case 5:
        return (
          <View style={styles.addressWrap}>
            <View style={styles.inputContainer}>
              <Icon name="map-pin" type="feather" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder={t('becomeProvider.placeholder.address')}
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={businessAddress.street}
                onChangeText={searchAddress}
                autoFocus
                selectionColor="#FF4B8C"
              />
              {addressSearching
                ? <ActivityIndicator size="small" color="#FF4B8C" style={{ marginRight: 4 }} />
                : businessAddress.street.length > 0 && (
                  <TouchableOpacity onPress={() => { setBusinessAddress(p => ({ ...p, street: '', city: '', state: '', zipCode: '' })); setAddressSuggestions([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="x" type="feather" size={16} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                )
              }
            </View>

            {addressSuggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {addressSuggestions.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.suggestionItem}
                    onPress={() => selectAddress(item)}
                    activeOpacity={0.7}
                  >
                    <Icon name="map-pin" type="feather" size={14} color="#FF4B8C" style={{ marginRight: 10, flexShrink: 0 }} />
                    <Text style={styles.suggestionText} numberOfLines={2}>{item.display}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Confirmed address pill */}
            {businessAddress.city && !addressSuggestions.length && (
              <View style={styles.confirmedPill}>
                <Icon name="check-circle" type="feather" size={14} color="#4ade80" style={{ marginRight: 6 }} />
                <Text style={styles.confirmedText} numberOfLines={1}>
                  {[businessAddress.city, businessAddress.state, businessAddress.zipCode].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
          </View>
        );
      case 6:
        return (
          <View style={styles.photoStep}>
            {renderInput({
              placeholder: t('becomeProvider.placeholder.website'),
              value: website,
              onChangeText: setWebsite,
              keyboardType: 'url',
              autoCapitalize: 'none',
              autoFocus: true,
              onSubmitEditing: handleNext,
            })}
            <TouchableOpacity onPress={handleNext} style={styles.skipLink}>
              <Text style={styles.skipText}>{t('common.skipForNow')}</Text>
            </TouchableOpacity>
          </View>
        );
      case 7:
        return (
          <View style={styles.photoStep}>
            {renderPhotoCircle(partyLogo, pickPartyLogo)}
            <TouchableOpacity onPress={handleNext} style={styles.skipLink}>
              <Text style={styles.skipText}>{t('common.skipForNow')}</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

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
          <Text style={styles.stepCount}>{t('becomeProvider.stepCount', { current: currentStep, total: TOTAL_STEPS })}</Text>
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
          <TouchableOpacity style={styles.actionButton} onPress={handleNext} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#0c162d" />
            ) : (
              <Text style={styles.actionButtonText}>
                {currentStep === TOTAL_STEPS ? t('becomeProvider.button.submit') : t('common.continue')}
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
  backgroundGradient: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 16 },
  scrollContentKeyboard: { justifyContent: 'flex-start', paddingTop: 4 },
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
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotActive: { backgroundColor: '#FFFFFF' },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  stepCount: {
    width: 44,
    textAlign: 'right',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  main: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  mainKeyboardOpen: { paddingTop: 0, paddingBottom: 8 },
  brand: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 48,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-condensed',
  },
  brandCompact: { fontSize: 32, marginBottom: 16 },
  prompt: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldWrap: { width: '100%' },
  inputContainer: {
    width: '100%',
    backgroundColor: 'rgba(40,40,40,0.8)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: { flex: 1, height: 56, color: '#FFFFFF', fontSize: 16 },
  textAreaWrap: { width: '100%' },
  textArea: {
    width: '100%',
    minHeight: 120,
    backgroundColor: 'rgba(40,40,40,0.8)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    textAlignVertical: 'top',
  },
  charCount: { color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'right', marginTop: 8 },
  // Address autocomplete
  addressWrap: { width: '100%' },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
  },
  confirmedText: {
    flex: 1,
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '500',
  },
  suggestionsList: {
    marginTop: 6,
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  suggestionText: { flex: 1, color: '#FFFFFF', fontSize: 13, lineHeight: 18 },
  // Photo
  photoStep: { alignItems: 'center', width: '100%' },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(40,40,40,0.8)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photo: { width: 120, height: 120, borderRadius: 60 },
  skipLink: { marginTop: 20, padding: 8 },
  skipText: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  // Footer
  footer: { paddingHorizontal: 24, paddingTop: 8 },
  actionButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: { color: '#0c162d', fontSize: 18, fontWeight: '700' },
});

export default BecomeProviderScreen;
