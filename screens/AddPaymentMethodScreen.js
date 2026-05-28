import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Text, Button, Input, Icon, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const AddPaymentMethodScreen = ({ navigation }) => {
  const { theme } = useTheme();
  
  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  
  // Error states
  const [errors, setErrors] = useState({
    cardNumber: '',
    cardholderName: '',
    expiry: '',
    cvv: '',
  });
  
  // Format card number with spaces
  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const chunks = [];
    
    for (let i = 0; i < cleaned.length; i += 4) {
      chunks.push(cleaned.substring(i, i + 4));
    }
    
    return chunks.join(' ').trim();
  };
  
  // Format expiry date with slash
  const formatExpiry = (text) => {
    const cleaned = text.replace(/[^0-9]/gi, '');
    
    if (cleaned.length >= 3) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    
    return cleaned;
  };
  
  // Card number input handler
  const handleCardNumberChange = (text) => {
    const formatted = formatCardNumber(text);
    if (formatted.replace(/\s+/g, '').length <= 16) {
      setCardNumber(formatted);
    }
  };
  
  // Expiry input handler
  const handleExpiryChange = (text) => {
    const formatted = formatExpiry(text);
    if (formatted.length <= 5) {
      setExpiry(formatted);
    }
  };
  
  // CVV input handler
  const handleCvvChange = (text) => {
    const cleaned = text.replace(/[^0-9]/gi, '');
    if (cleaned.length <= 4) {
      setCvv(cleaned);
    }
  };
  
  // Detect card type from number
  const getCardType = () => {
    const number = cardNumber.replace(/\s+/g, '');
    
    if (/^4/.test(number)) return 'Visa';
    if (/^5[1-5]/.test(number)) return 'Mastercard';
    if (/^3[47]/.test(number)) return 'Amex';
    if (/^6(?:011|5)/.test(number)) return 'Discover';
    
    return 'Card';
  };
  
  // Validate form
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      cardNumber: '',
      cardholderName: '',
      expiry: '',
      cvv: '',
    };
    
    // Validate card number
    if (!cardNumber) {
      newErrors.cardNumber = 'Card number is required';
      valid = false;
    } else if (cardNumber.replace(/\s+/g, '').length < 15) {
      newErrors.cardNumber = 'Invalid card number';
      valid = false;
    }
    
    // Validate cardholder name
    if (!cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
      valid = false;
    }
    
    // Validate expiry
    if (!expiry) {
      newErrors.expiry = 'Expiry date is required';
      valid = false;
    } else if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      newErrors.expiry = 'Invalid expiry date';
      valid = false;
    } else {
      const [month, year] = expiry.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (parseInt(month) < 1 || parseInt(month) > 12) {
        newErrors.expiry = 'Invalid month';
        valid = false;
      } else if (
        parseInt(year) < currentYear || 
        (parseInt(year) === currentYear && parseInt(month) < currentMonth)
      ) {
        newErrors.expiry = 'Card expired';
        valid = false;
      }
    }
    
    // Validate CVV
    if (!cvv) {
      newErrors.cvv = 'CVV is required';
      valid = false;
    } else if (cvv.length < 3) {
      newErrors.cvv = 'Invalid CVV';
      valid = false;
    }
    
    setErrors(newErrors);
    return valid;
  };
  
  // Handle form submission
  const handleSave = () => {
    if (validateForm()) {
      // In a real app, this would send data to your backend
      Alert.alert(
        'Success',
        'Payment method added successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <LinearGradient
          colors={['rgba(50, 50, 50, 0.4)', 'transparent']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>Add Payment Method</Text>
          
          <View style={styles.formContainer}>
            <Input
              placeholder="Card Number"
              value={cardNumber}
              onChangeText={handleCardNumberChange}
              keyboardType="number-pad"
              leftIcon={
                <Icon name="credit-card" type="feather" size={20} color={theme.colors.textSecondary} />
              }
              inputContainerStyle={[
                styles.inputContainer, 
                { backgroundColor: theme.colors.inputBackground || 'rgba(255, 255, 255, 0.1)' }
              ]}
              inputStyle={{ color: theme.colors.text }}
              placeholderTextColor={theme.colors.textSecondary}
              errorStyle={{ color: theme.colors.error }}
              errorMessage={errors.cardNumber}
              label={
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Card Number
                </Text>
              }
            />
            
            <Input
              placeholder="Cardholder Name"
              value={cardholderName}
              onChangeText={setCardholderName}
              leftIcon={
                <Icon name="user" type="feather" size={20} color={theme.colors.textSecondary} />
              }
              inputContainerStyle={[
                styles.inputContainer, 
                { backgroundColor: theme.colors.inputBackground || 'rgba(255, 255, 255, 0.1)' }
              ]}
              inputStyle={{ color: theme.colors.text }}
              placeholderTextColor={theme.colors.textSecondary}
              errorStyle={{ color: theme.colors.error }}
              errorMessage={errors.cardholderName}
              label={
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Cardholder Name
                </Text>
              }
            />
            
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  placeholder="MM/YY"
                  value={expiry}
                  onChangeText={handleExpiryChange}
                  keyboardType="number-pad"
                  leftIcon={
                    <Icon name="calendar" type="feather" size={20} color={theme.colors.textSecondary} />
                  }
                  inputContainerStyle={[
                    styles.inputContainer, 
                    { backgroundColor: theme.colors.inputBackground || 'rgba(255, 255, 255, 0.1)' }
                  ]}
                  inputStyle={{ color: theme.colors.text }}
                  placeholderTextColor={theme.colors.textSecondary}
                  errorStyle={{ color: theme.colors.error }}
                  errorMessage={errors.expiry}
                  label={
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      Expiry Date
                    </Text>
                  }
                />
              </View>
              
              <View style={styles.halfInput}>
                <Input
                  placeholder="CVV"
                  value={cvv}
                  onChangeText={handleCvvChange}
                  keyboardType="number-pad"
                  secureTextEntry
                  leftIcon={
                    <Icon name="lock" type="feather" size={20} color={theme.colors.textSecondary} />
                  }
                  inputContainerStyle={[
                    styles.inputContainer, 
                    { backgroundColor: theme.colors.inputBackground || 'rgba(255, 255, 255, 0.1)' }
                  ]}
                  inputStyle={{ color: theme.colors.text }}
                  placeholderTextColor={theme.colors.textSecondary}
                  errorStyle={{ color: theme.colors.error }}
                  errorMessage={errors.cvv}
                  label={
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      CVV
                    </Text>
                  }
                />
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setMakeDefault(!makeDefault)}
            >
              <View style={[
                styles.checkbox, 
                makeDefault && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
              ]}>
                {makeDefault && <Icon name="check" type="feather" size={14} color="white" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                Make this my default payment method
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        <View style={styles.bottomContainer}>
          <Button
            title="Save Card"
            buttonStyle={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            containerStyle={styles.buttonContainer}
            onPress={handleSave}
          />
          <Button
            title="Cancel"
            buttonStyle={[styles.cancelButton, { backgroundColor: 'transparent' }]}
            containerStyle={styles.buttonContainer}
            titleStyle={{ color: theme.colors.text }}
            onPress={() => navigation.goBack()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  formContainer: {
    marginTop: 16,
  },
  inputContainer: {
    borderBottomWidth: 0,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 50,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginLeft: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonContainer: {
    marginBottom: 10,
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
  },
  cancelButton: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default AddPaymentMethodScreen; 