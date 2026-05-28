import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Animated,
  Alert,
  KeyboardAvoidingView,
  TextInput
} from 'react-native';
import { Text, useTheme, Icon, Button, Input, CheckBox } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';

const { width } = Dimensions.get('window');

const BecomeProviderScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { becomeProvider, user } = useAuth();
  const { updateEventsWithOrganizationNames } = useEvents();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 1: Party Information
  const [partyLogo, setPartyLogo] = useState(null);
  const [organizationName, setOrganizationName] = useState('');
  const [description, setDescription] = useState('');
  
  // Step 2: Contact Information
  const [partyEmail, setPartyEmail] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [businessAddress, setBusinessAddress] = useState({
    street: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });
  
  // Step 3: Tax Information
  const [businessType, setBusinessType] = useState('individual');
  const [taxId, setTaxId] = useState('');
  const [taxIdType, setTaxIdType] = useState('ssn');
  
  // Step 4: Identity Verification
  const [idFrontImage, setIdFrontImage] = useState(null);
  const [idBackImage, setIdBackImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [idType, setIdType] = useState('driver_license');
  
  // Step 5: Bank Account Information
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(user?.name || '');
  const [accountType, setAccountType] = useState('checking');
  
  // Legal agreements
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [agreeToStripeTerms, setAgreeToStripeTerms] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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
  }, [currentStep]);

  const totalSteps = 5;

  const pickPartyLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to upload your party logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPartyLogo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking party logo:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const pickIdDocument = async (type) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera permissions to capture your ID document.');
        return;
      }

      Alert.alert(
        'Capture Document',
        'Would you like to take a photo or select from gallery?',
        [
          { text: 'Camera', onPress: () => captureWithCamera(type) },
          { text: 'Gallery', onPress: () => selectFromGallery(type) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Unable to access camera.');
    }
  };

  const captureWithCamera = async (type) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'selfie' ? [1, 1] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        switch (type) {
          case 'front':
            setIdFrontImage(result.assets[0].uri);
            break;
          case 'back':
            setIdBackImage(result.assets[0].uri);
            break;
          case 'selfie':
            setSelfieImage(result.assets[0].uri);
            break;
        }
      }
    } catch (error) {
      console.error('Error capturing with camera:', error);
      Alert.alert('Error', 'Unable to capture photo.');
    }
  };

  const selectFromGallery = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'selfie' ? [1, 1] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        switch (type) {
          case 'front':
            setIdFrontImage(result.assets[0].uri);
            break;
          case 'back':
            setIdBackImage(result.assets[0].uri);
            break;
          case 'selfie':
            setSelfieImage(result.assets[0].uri);
            break;
        }
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      Alert.alert('Error', 'Unable to select photo.');
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!organizationName.trim()) {
          Alert.alert('Required Field', 'Organization name is required.');
          return false;
        }
        if (!description.trim()) {
          Alert.alert('Required Field', 'Party description is required.');
          return false;
        }
        return true;
      case 2:
        if (!partyEmail.trim()) {
          Alert.alert('Required Field', 'Party email is required.');
          return false;
        }
        if (!partyPhone.trim()) {
          Alert.alert('Required Field', 'Party phone is required.');
          return false;
        }
        if (!businessAddress.street.trim() || !businessAddress.city.trim() || 
            !businessAddress.state.trim() || !businessAddress.zipCode.trim()) {
          Alert.alert('Required Fields', 'Complete business address is required.');
          return false;
        }
        return true;
      case 3:
        if (!taxId.trim()) {
          Alert.alert('Required Field', `${taxIdType === 'ssn' ? 'Social Security Number' : 'Employer Identification Number'} is required.`);
          return false;
        }
        if (taxIdType === 'ssn' && taxId.replace(/\D/g, '').length !== 9) {
          Alert.alert('Invalid SSN', 'Please enter a valid 9-digit Social Security Number.');
          return false;
        }
        if (taxIdType === 'ein' && taxId.replace(/\D/g, '').length !== 9) {
          Alert.alert('Invalid EIN', 'Please enter a valid 9-digit Employer Identification Number.');
          return false;
        }
        return true;
      case 4:
        if (!idFrontImage) {
          Alert.alert('Required Document', 'Please capture the front of your ID document.');
          return false;
        }
        if (idType === 'driver_license' && !idBackImage) {
          Alert.alert('Required Document', 'Please capture the back of your driver\'s license.');
          return false;
        }
        if (!selfieImage) {
          Alert.alert('Required Photo', 'Please take a selfie for identity verification.');
          return false;
        }
        return true;
      case 5:
        if (!routingNumber.trim() || routingNumber.length !== 9) {
          Alert.alert('Required Field', 'Please enter a valid 9-digit routing number.');
          return false;
        }
        if (!accountNumber.trim()) {
          Alert.alert('Required Field', 'Account number is required.');
          return false;
        }
        if (accountNumber !== confirmAccountNumber) {
          Alert.alert('Account Numbers Don\'t Match', 'Please ensure both account numbers match.');
          return false;
        }
        if (!accountHolderName.trim()) {
          Alert.alert('Required Field', 'Account holder name is required.');
          return false;
        }
        if (!agreeToTerms || !agreeToStripeTerms) {
          Alert.alert('Agreement Required', 'Please agree to the terms of service and Stripe Connect terms.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      const providerData = {
        organizationName,
        description,
        partyEmail,
        partyPhone,
        website,
        businessAddress,
        partyLogo,
        taxInfo: {
          businessType,
          taxId,
          taxIdType,
        },
        bankAccountInfo: {
          routingNumber,
          accountNumber,
          accountHolderName,
          accountType,
        },
        identityVerification: {
          idType,
          idFrontImage,
          idBackImage,
          selfieImage,
          submittedAt: new Date(),
        },
      };

      const result = await becomeProvider(providerData);
      
      if (result.success) {
        // Update existing events with the new organization name
        await updateEventsWithOrganizationNames(providerData, user?.id);
        
        Alert.alert(
          'Application Submitted!', 
          'Your provider application has been submitted! We\'ll verify your information and identity documents, then set up your payment account. You\'ll be notified when the process is complete.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to submit application. Please try again.');
      }
    } catch (error) {
      console.error('Provider application error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View key={index} style={styles.stepIndicatorContainer}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor: index + 1 <= currentStep ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
              },
            ]}
          >
            {index + 1 < currentStep ? (
              <Icon name="check" type="feather" size={16} color="#333333" />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  { color: index + 1 <= currentStep ? '#333333' : '#FFFFFF' },
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
          {index < totalSteps - 1 && (
            <View
              style={[
                styles.stepLine,
                { backgroundColor: index + 1 < currentStep ? '#FFFFFF' : 'rgba(255,255,255,0.3)' },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Party Information</Text>
        <Text style={styles.stepSubtitle}>Tell us about your party organization</Text>
      </View>

      <View style={styles.logoContainer}>
        <TouchableOpacity style={styles.logoUpload} onPress={pickPartyLogo}>
          {partyLogo ? (
            <Image source={{ uri: partyLogo }} style={styles.logoImage} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Icon name="image" type="feather" size={40} color="rgba(255,255,255,0.5)" />
              <Text style={styles.logoPlaceholderText}>Party Logo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Input
        label="Organization Name *"
        value={organizationName}
        onChangeText={setOrganizationName}
        placeholder="Your Party Organization Name"
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="briefcase" type="feather" size={20} color="#FFFFFF" />}
      />

      <View style={styles.textAreaContainer}>
        <Text style={styles.inputLabel}>Party Description *</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your party organization and the types of events you plan to host..."
          multiline
          numberOfLines={4}
          style={styles.textArea}
          placeholderTextColor="rgba(255,255,255,0.5)"
          maxLength={500}
        />
        <Text style={styles.characterCount}>{description.length}/500</Text>
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Contact & Address</Text>
        <Text style={styles.stepSubtitle}>Business contact information</Text>
      </View>

      <Input
        label="Business Email *"
        value={partyEmail}
        onChangeText={setPartyEmail}
        placeholder="business@organization.com"
        keyboardType="email-address"
        autoCapitalize="none"
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="mail" type="feather" size={20} color="#FFFFFF" />}
      />

      <Input
        label="Business Phone *"
        value={partyPhone}
        onChangeText={setPartyPhone}
        placeholder="(555) 123-4567"
        keyboardType="phone-pad"
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="phone" type="feather" size={20} color="#FFFFFF" />}
      />

      <Input
        label="Website (Optional)"
        value={website}
        onChangeText={setWebsite}
        placeholder="https://yourwebsite.com"
        keyboardType="url"
        autoCapitalize="none"
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="globe" type="feather" size={20} color="#FFFFFF" />}
      />

      <Input
        label="Business Address *"
        value={businessAddress.street}
        onChangeText={(text) => setBusinessAddress(prev => ({ ...prev, street: text }))}
        placeholder="123 Main Street"
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="map-pin" type="feather" size={20} color="#FFFFFF" />}
      />

      <Input
        label="Address Line 2 (Optional)"
        value={businessAddress.addressLine2}
        onChangeText={(text) => setBusinessAddress(prev => ({ ...prev, addressLine2: text }))}
        placeholder="Suite, Apartment, etc."
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="home" type="feather" size={20} color="#FFFFFF" />}
      />

      <View style={styles.addressRow}>
        <Input
          label="City *"
          value={businessAddress.city}
          onChangeText={(text) => setBusinessAddress(prev => ({ ...prev, city: text }))}
          placeholder="City"
          inputStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          containerStyle={[styles.inputContainer, styles.halfWidth]}
        />
        <Input
          label="State *"
          value={businessAddress.state}
          onChangeText={(text) => setBusinessAddress(prev => ({ ...prev, state: text }))}
          placeholder="State"
          inputStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          containerStyle={[styles.inputContainer, styles.halfWidth]}
        />
      </View>

      <View style={styles.addressRow}>
        <Input
          label="ZIP Code *"
          value={businessAddress.zipCode}
          onChangeText={(text) => setBusinessAddress(prev => ({ ...prev, zipCode: text }))}
          placeholder="12345"
          keyboardType="numeric"
          inputStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          containerStyle={[styles.inputContainer, styles.halfWidth]}
        />
        <Input
          label="Country *"
          value={businessAddress.country}
          onChangeText={(text) => setBusinessAddress(prev => ({ ...prev, country: text }))}
          placeholder="Country"
          inputStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          containerStyle={[styles.inputContainer, styles.halfWidth]}
        />
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Tax Information</Text>
        <Text style={styles.stepSubtitle}>Required for payment processing</Text>
      </View>

      <View style={styles.radioContainer}>
        <Text style={styles.inputLabel}>Business Type *</Text>
        {[
          { value: 'individual', label: 'Individual/Sole Proprietor' },
          { value: 'company', label: 'Company/LLC' },
          { value: 'non_profit', label: 'Non-Profit Organization' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.radioOption}
            onPress={() => setBusinessType(option.value)}
          >
            <Icon
              name={businessType === option.value ? "radio-button-on" : "radio-button-off"}
              type="ionicon"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.radioLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.radioContainer}>
        <Text style={styles.inputLabel}>Tax ID Type *</Text>
        {[
          { value: 'ssn', label: 'Social Security Number (SSN)' },
          { value: 'ein', label: 'Employer Identification Number (EIN)' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.radioOption}
            onPress={() => setTaxIdType(option.value)}
          >
            <Icon
              name={taxIdType === option.value ? "radio-button-on" : "radio-button-off"}
              type="ionicon"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.radioLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input
        label={`${taxIdType === 'ssn' ? 'Social Security Number' : 'Employer Identification Number'} *`}
        value={taxId}
        onChangeText={setTaxId}
        placeholder={taxIdType === 'ssn' ? 'XXX-XX-XXXX' : 'XX-XXXXXXX'}
        keyboardType="numeric"
        secureTextEntry={taxIdType === 'ssn'}
        maxLength={taxIdType === 'ssn' ? 11 : 10}
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="shield" type="feather" size={20} color="#FFFFFF" />}
      />

      <View style={styles.infoBox}>
        <Icon name="info" type="feather" size={16} color="rgba(255,255,255,0.7)" />
        <Text style={styles.infoText}>
          Your tax information is securely encrypted and used only for payment processing and tax reporting purposes.
        </Text>
      </View>
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Identity Verification</Text>
        <Text style={styles.stepSubtitle}>Verify your identity to prevent fraud</Text>
      </View>

      <View style={styles.radioContainer}>
        <Text style={styles.inputLabel}>ID Document Type *</Text>
        {[
          { value: 'driver_license', label: 'Driver\'s License' },
          { value: 'passport', label: 'Passport' },
          { value: 'state_id', label: 'State ID Card' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.radioOption}
            onPress={() => setIdType(option.value)}
          >
            <Icon
              name={idType === option.value ? "radio-button-on" : "radio-button-off"}
              type="ionicon"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.radioLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.documentSection}>
        <Text style={styles.documentSectionTitle}>Document Photos *</Text>
        
        <View style={styles.documentGrid}>
          <TouchableOpacity 
            style={styles.documentUpload} 
            onPress={() => pickIdDocument('front')}
          >
            {idFrontImage ? (
              <Image source={{ uri: idFrontImage }} style={styles.documentImage} />
            ) : (
              <View style={styles.documentPlaceholder}>
                <Icon name="credit-card" type="feather" size={30} color="rgba(255,255,255,0.5)" />
                <Text style={styles.documentPlaceholderText}>Front of ID</Text>
              </View>
            )}
          </TouchableOpacity>

          {idType === 'driver_license' && (
            <TouchableOpacity 
              style={styles.documentUpload} 
              onPress={() => pickIdDocument('back')}
            >
              {idBackImage ? (
                <Image source={{ uri: idBackImage }} style={styles.documentImage} />
              ) : (
                <View style={styles.documentPlaceholder}>
                  <Icon name="credit-card" type="feather" size={30} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.documentPlaceholderText}>Back of License</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.documentSection}>
        <Text style={styles.documentSectionTitle}>Selfie Verification *</Text>
        
        <TouchableOpacity 
          style={styles.selfieUpload} 
          onPress={() => pickIdDocument('selfie')}
        >
          {selfieImage ? (
            <Image source={{ uri: selfieImage }} style={styles.selfieImage} />
          ) : (
            <View style={styles.selfiePlaceholder}>
              <Icon name="user" type="feather" size={40} color="rgba(255,255,255,0.5)" />
              <Text style={styles.selfiePlaceholderText}>Take Selfie</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Icon name="shield" type="feather" size={16} color="rgba(255,255,255,0.7)" />
        <Text style={styles.infoText}>
          Your identity documents are encrypted and used only for verification purposes. This helps prevent multiple accounts and ensures platform security.
        </Text>
      </View>
    </Animated.View>
  );

  const renderStep5 = () => (
    <Animated.View
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Bank Account</Text>
        <Text style={styles.stepSubtitle}>Where you'll receive payments</Text>
      </View>

      <Input
        label="Account Holder Name *"
        value={accountHolderName}
        onChangeText={setAccountHolderName}
        placeholder="Full name on account"
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="user" type="feather" size={20} color="#FFFFFF" />}
      />

      <Input
        label="Routing Number *"
        value={routingNumber}
        onChangeText={setRoutingNumber}
        placeholder="9-digit routing number"
        keyboardType="numeric"
        maxLength={9}
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="hash" type="feather" size={20} color="#FFFFFF" />}
      />

      <Input
        label="Account Number *"
        value={accountNumber}
        onChangeText={setAccountNumber}
        placeholder="Account number"
        keyboardType="numeric"
        secureTextEntry
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="credit-card" type="feather" size={20} color="#FFFFFF" />}
      />

      <Input
        label="Confirm Account Number *"
        value={confirmAccountNumber}
        onChangeText={setConfirmAccountNumber}
        placeholder="Re-enter account number"
        keyboardType="numeric"
        secureTextEntry
        inputStyle={styles.inputText}
        labelStyle={styles.inputLabel}
        containerStyle={styles.inputContainer}
        leftIcon={<Icon name="check-circle" type="feather" size={20} color="#FFFFFF" />}
      />

      <View style={styles.radioContainer}>
        <Text style={styles.inputLabel}>Account Type *</Text>
        {[
          { value: 'checking', label: 'Checking' },
          { value: 'savings', label: 'Savings' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.radioOption}
            onPress={() => setAccountType(option.value)}
          >
            <Icon
              name={accountType === option.value ? "radio-button-on" : "radio-button-off"}
              type="ionicon"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.radioLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.agreementContainer}>
        <CheckBox
          checked={agreeToTerms}
          onPress={() => setAgreeToTerms(!agreeToTerms)}
          iconType="material-community"
          checkedIcon="checkbox-marked"
          uncheckedIcon="checkbox-blank-outline"
          checkedColor="#FFFFFF"
          uncheckedColor="rgba(255,255,255,0.5)"
          containerStyle={styles.checkboxContainer}
        />
        <Text style={styles.agreementText}>
          I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </View>

      <View style={styles.agreementContainer}>
        <CheckBox
          checked={agreeToStripeTerms}
          onPress={() => setAgreeToStripeTerms(!agreeToStripeTerms)}
          iconType="material-community"
          checkedIcon="checkbox-marked"
          uncheckedIcon="checkbox-blank-outline"
          checkedColor="#FFFFFF"
          uncheckedColor="rgba(255,255,255,0.5)"
          containerStyle={styles.checkboxContainer}
        />
        <Text style={styles.agreementText}>
          I agree to the <Text style={styles.linkText}>Stripe Connected Account Agreement</Text>
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Icon name="lock" type="feather" size={16} color="rgba(255,255,255,0.7)" />
        <Text style={styles.infoText}>
          Your banking information is securely encrypted and processed by Stripe. We receive a 10% service fee, and you keep 90% of all ticket sales.
        </Text>
      </View>
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return renderStep1();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['rgba(50, 50, 50, 0.4)', 'rgba(0, 0, 0, 0)']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" type="feather" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Provider</Text>
        <Text style={styles.stepCounter}>{currentStep}/{totalSteps}</Text>
      </View>

      {renderStepIndicator()}

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
              <Text style={styles.previousButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, { flex: currentStep === 1 ? 1 : 0.7 }]}
            onPress={handleNext}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F0F0F0']}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {isLoading ? 'Submitting...' : currentStep === totalSteps ? 'Submit Application' : 'Continue'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
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
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  logoImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  logoPlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  textAreaContainer: {
    marginBottom: 20,
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  radioContainer: {
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
  },
  documentSection: {
    marginBottom: 24,
  },
  documentSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  documentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  documentUpload: {
    flex: 1,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  documentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  documentPlaceholder: {
    alignItems: 'center',
  },
  documentPlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  selfieUpload: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    alignSelf: 'center',
  },
  selfieImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  selfiePlaceholder: {
    alignItems: 'center',
  },
  selfiePlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  agreementContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  checkboxContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    marginRight: 10,
  },
  agreementText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  linkText: {
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  previousButton: {
    flex: 0.3,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  previousButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default BecomeProviderScreen; 