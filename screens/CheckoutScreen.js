import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  StatusBar,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { Text, Button, Icon, Divider, CheckBox, useTheme } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { useEvents } from '../context/EventsContext';
import stripeService from '../services/stripeService';
import { getStripePublishableKey } from '../config/stripe';

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit Card', icon: 'credit-card' },
  { id: 'apple', name: 'Apple Pay', icon: 'apple' },
  { id: 'paypal', name: 'PayPal', icon: 'paypal' },
];

// Get Stripe publishable key from config
const STRIPE_PUBLISHABLE_KEY = getStripePublishableKey();

// Safe date formatting utility
const formatEventDate = (date) => {
  try {
    if (!date) return "Event Date";
    if (typeof date === 'string') return date;
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    // Try to convert to Date if it's not already
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "Event Date";
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return "Event Date";
  }
};

const CheckoutContent = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { purchaseTickets } = useEvents();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { tickets, totalAmount, totalTickets, event, ticketTypes } = route.params;
  
  const [activeStep, setActiveStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [joinGuestList, setJoinGuestList] = useState(true); // Default to true for better networking
  const [paymentIntentClientSecret, setPaymentIntentClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');

  // Get the tickets that were selected
  const getSelectedTickets = () => {
    return ticketTypes.filter(ticket => {
      const ticketName = ticket.name || ticket.type;
      return tickets[ticketName] && tickets[ticketName] > 0;
    });
  };

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
  };

  const validateStep1 = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (paymentMethod === 'card') {
      if (!cardNumber.trim()) {
        Alert.alert('Error', 'Please enter your card number');
        return false;
      }
      if (!expiry.trim()) {
        Alert.alert('Error', 'Please enter your card expiry date');
        return false;
      }
      if (!cvv.trim()) {
        Alert.alert('Error', 'Please enter your card CVV');
        return false;
      }
    }
    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions');
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (validateStep1()) {
      // Immediately initiate Stripe payment
      await initializeAndPresentPayment();
    }
  };

  // Combined function to initialize and present payment sheet
  const initializeAndPresentPayment = async () => {
    setIsLoading(true);
    
    try {
      // Calculate total with service fee
      const subtotal = getSelectedTickets().reduce((sum, ticket) => {
        const ticketName = ticket.name || ticket.type;
        const ticketQuantity = tickets[ticketName];
        return sum + (ticketQuantity * ticket.price);
      }, 0);
      const serviceFee = subtotal * 0.1; // 10% service fee
      const finalTotal = subtotal + serviceFee;
      
      // Create payment intent
      const calculatedTotalTickets = totalTickets || Object.values(tickets).reduce((sum, count) => sum + count, 0);
      const metadata = {
        event_id: event.id,
        event_title: event.title,
        customer_name: name,
        customer_email: email,
        ticket_count: calculatedTotalTickets.toString(),
        subtotal: subtotal.toFixed(2),
        service_fee: serviceFee.toFixed(2),
        total_with_fee: finalTotal.toFixed(2)
      };

      console.log('💳 Creating payment intent for amount:', finalTotal);
      const { clientSecret, paymentIntentId: piId } = await stripeService.createPaymentIntent(
        finalTotal,
        metadata,
        event.organizer?.id || event.organizerId // Pass provider ID for payment splitting
      );

      setPaymentIntentClientSecret(clientSecret);
      setPaymentIntentId(piId);

      // Initialize the payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Samba Events',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: name,
          email: email,
        },
      });

      if (initError) {
        console.error('Error initializing payment sheet:', initError);
        setIsLoading(false);
        Alert.alert('Payment Setup Error', initError.message);
        return;
      }

      // Immediately present the payment sheet
      console.log('🎨 Presenting payment sheet...');
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        console.error('Payment sheet error:', presentError);
        setIsLoading(false);
        
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', presentError.message);
        }
        return;
      }

      // Payment was successful
      console.log('✅ Payment successful!');
      
      try {
        // Confirm payment on backend
        const confirmationResult = await stripeService.confirmPayment(piId, event.organizer?.id || event.organizerId);
        
        if (confirmationResult.success) {
          // Purchase tickets using the context
          const purchasedTickets = await purchaseTickets(event, tickets, { 
            name, 
            email,
            paymentId: piId,
            paymentStatus: 'completed',
            joinGuestList: joinGuestList
          });
          
          console.log('✅ Tickets purchased successfully:', purchasedTickets);
          
          // Ensure we pass clean data to confirmation screen
          const cleanEventData = {
            id: event.id,
            title: event.title,
            date: event.date ? new Date(event.date).toISOString() : null,
            startTime: event.startTime ? new Date(event.startTime).toISOString() : null,
            venue: event.venue,
            address: event.address,
            coverImage: event.coverImage,
            flyers: event.flyers,
            image: event.image
          };
          
          setIsLoading(false);
          navigation.navigate('TicketConfirmation', {
            event: cleanEventData,
            tickets,
            totalAmount: Number(finalTotal),
            email,
            purchasedTickets,
            paymentId: piId
          });
        } else {
          throw new Error('Payment confirmation failed');
        }
      } catch (error) {
        console.error('Error in post-payment processing:', error);
        throw error;
      }

    } catch (error) {
      console.error('Payment failed:', error);
      setIsLoading(false);
      Alert.alert('Payment Failed', error.message || 'Payment processing failed. Please try again.');
    }
  };

  const initializePaymentSheet = async () => {
    try {
      // Create payment intent
      const calculatedTotalTickets = totalTickets || Object.values(tickets).reduce((sum, count) => sum + count, 0);
      const metadata = {
        event_id: event.id,
        event_title: event.title,
        customer_name: name,
        customer_email: email,
        ticket_count: calculatedTotalTickets.toString()
      };

      const { clientSecret, paymentIntentId: piId } = await stripeService.createPaymentIntent(
        totalAmount,
        metadata,
        event.organizer?.id || event.organizerId // Pass provider ID for payment splitting
      );

      setPaymentIntentClientSecret(clientSecret);
      setPaymentIntentId(piId);

      // Initialize the payment sheet
      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Samba Events',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: name,
          email: email,
        },
      });

      if (error) {
        console.error('Error initializing payment sheet:', error);
        Alert.alert('Payment Setup Error', error.message);
      }
    } catch (error) {
      console.error('Error setting up payment:', error);
      Alert.alert('Payment Setup Error', 'Failed to setup payment. Please try again.');
    }
  };

  const handleStripePayment = async () => {
    if (!paymentIntentClientSecret) {
      Alert.alert('Error', 'Payment not initialized. Please try again.');
      return;
    }

    setIsLoading(true);

    try {
      // Present the payment sheet
      const { error } = await presentPaymentSheet();

      if (error) {
        console.error('Payment sheet error:', error);
        setIsLoading(false);
        
        if (error.code !== 'Canceled') {
          Alert.alert('Payment Failed', error.message);
        }
        return;
      }

      // Payment was successful
      console.log('✅ Payment successful!');
      
      // Confirm payment on backend
      const confirmationResult = await stripeService.confirmPayment(paymentIntentId, event.organizer?.id || event.organizerId);
      
      if (confirmationResult.success) {
        // Purchase tickets using the context
        const purchasedTickets = await purchaseTickets(event, tickets, { 
          name, 
          email,
          paymentId: paymentIntentId,
          paymentStatus: 'completed'
        });
        
        console.log('✅ Tickets purchased successfully:', purchasedTickets);
        
        // Ensure we pass clean data to confirmation screen
        const cleanEventData = {
          id: event.id,
          title: event.title,
          date: event.date ? new Date(event.date).toISOString() : null,
          startTime: event.startTime ? new Date(event.startTime).toISOString() : null,
          venue: event.venue,
          address: event.address,
          coverImage: event.coverImage,
          flyers: event.flyers,
          image: event.image
        };
        
        setIsLoading(false);
        navigation.navigate('TicketConfirmation', {
          event: cleanEventData,
          tickets,
          totalAmount: Number(totalAmount),
          email,
          purchasedTickets,
          paymentId: paymentIntentId
        });
      } else {
        throw new Error('Payment confirmation failed');
      }

    } catch (error) {
      console.error('Payment failed:', error);
      setIsLoading(false);
      Alert.alert('Payment Failed', error.message || 'Payment processing failed. Please try again.');
    }
  };

  const handlePurchase = async () => {
    if (paymentMethod === 'card') {
      await handleStripePayment();
    } else {
      // Handle other payment methods (Apple Pay, PayPal, etc.)
      Alert.alert('Coming Soon', `${paymentMethod} integration coming soon!`);
    }
  };

  const formatCardNumber = (value) => {
    const formatted = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
    return formatted;
  };

  const formatExpiry = (value) => {
    const formatted = value.replace(/\s/g, '').replace(/(\d{2})(\d{2})/, '$1/$2');
    return formatted;
  };

  const renderTicketSummary = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ticket Summary</Text>
      
      {getSelectedTickets().map((ticket, index) => {
        const ticketName = ticket.name || ticket.type;
        const ticketQuantity = tickets[ticketName];
        
        return (
          <View key={index} style={styles.ticketRow}>
            <View style={styles.ticketInfo}>
              <Text style={[styles.ticketType, { color: theme.colors.text }]}>
                {ticketName}
              </Text>
              <Text style={[styles.ticketPrice, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                ${ticket.price} each
              </Text>
              
              {/* What's Included */}
              {((ticket.includes && ticket.includes.length > 0) || (ticket.perks && ticket.perks.length > 0)) && (
                <View style={styles.includesContainer}>
                  <Text style={[styles.includesLabel, { color: theme.colors.textSecondary }]}>
                    Includes:
                  </Text>
                  {(ticket.includes || ticket.perks || []).map((item, includeIndex) => (
                    item && item.trim() && (
                      <View key={includeIndex} style={styles.includeItem}>
                        <Icon 
                          name="check" 
                          type="feather" 
                          size={12} 
                          color="rgba(255, 255, 255, 0.8)" 
                          style={styles.includeIcon}
                        />
                        <Text style={[styles.includeText, { color: theme.colors.textSecondary }]}>
                          {item}
                        </Text>
                      </View>
                    )
                  ))}
                </View>
              )}
            </View>
            <View style={styles.ticketQuantity}>
              <Text style={[styles.quantityText, { color: theme.colors.text }]}>
                {ticketQuantity} × ${ticket.price}
              </Text>
              <Text style={[styles.subtotalText, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                ${(ticketQuantity * ticket.price).toFixed(2)}
              </Text>
            </View>
          </View>
        );
      })}
      
      <Divider style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      
      {/* Calculate subtotal and fees */}
      {(() => {
        const subtotal = getSelectedTickets().reduce((sum, ticket) => {
          const ticketName = ticket.name || ticket.type;
          const ticketQuantity = tickets[ticketName];
          return sum + (ticketQuantity * ticket.price);
        }, 0);
        
        const serviceFee = subtotal * 0.1; // 10% service fee
        const finalTotal = subtotal + serviceFee;
        
        return (
          <>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.text }]}>Subtotal</Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>
                ${subtotal.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Service Fee (10%)</Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.textSecondary }]}>
                ${serviceFee.toFixed(2)}
              </Text>
            </View>
            
            <Divider style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                ${finalTotal.toFixed(2)}
              </Text>
            </View>
          </>
        );
      })()}
    </View>
  );

  // New function to render special instructions
  const renderSpecialInstructions = () => {
    const ticketsWithInstructions = getSelectedTickets().filter(ticket => 
      ticket.instructions && ticket.instructions.trim()
    );

    if (ticketsWithInstructions.length === 0) {
      return null;
    }

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Special Instructions</Text>
        
        {ticketsWithInstructions.map((ticket, index) => {
          const ticketName = ticket.name || ticket.type;
          
          return (
            <View key={index} style={styles.instructionItem}>
              <View style={styles.instructionHeader}>
                <Icon 
                  name="info" 
                  type="feather" 
                  size={16} 
                  color="rgba(255, 255, 255, 0.8)" 
                  style={styles.instructionIcon}
                />
                <Text style={[styles.instructionTicketType, { color: theme.colors.text }]}>
                  {ticketName}
                </Text>
              </View>
              <Text style={[styles.instructionText, { color: theme.colors.textSecondary }]}>
                {ticket.instructions}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderContactInfo = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact Information</Text>
      
      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Email</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border
            }
          ]}
          placeholder="Enter your email"
          placeholderTextColor={theme.colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Full Name</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border
            }
          ]}
          placeholder="Enter your full name"
          placeholderTextColor={theme.colors.textSecondary}
          value={name}
          onChangeText={setName}
        />
      </View>
    </View>
  );

  const renderGuestListOption = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Event Networking</Text>
      
      <TouchableOpacity
        style={styles.guestListOption}
        onPress={() => setJoinGuestList(!joinGuestList)}
      >
        <View style={styles.guestListContent}>
          <View style={styles.guestListHeader}>
            <Icon 
              name="users" 
              type="feather" 
              size={20} 
              color="rgba(255, 255, 255, 0.8)" 
              style={styles.guestListIcon}
            />
            <Text style={[styles.guestListTitle, { color: theme.colors.text }]}>
              Join Event Guest List
            </Text>
          </View>
          <Text style={[styles.guestListDescription, { color: theme.colors.textSecondary }]}>
            allow other users to see
            Your name and profile picture on the guest list.
          </Text>
        </View>
        
        <View style={styles.guestListCheckbox}>
          <Icon 
            name={joinGuestList ? "check-square" : "square"} 
            type="feather" 
            size={24} 
            color={joinGuestList ? 'rgba(255, 255, 255, 0.9)' : theme.colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderPaymentMethods = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payment Method</Text>
      
      <View style={styles.paymentOptions}>
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              paymentMethod === method.id && styles.paymentMethodActive,
              { 
                backgroundColor: theme.colors.background,
                borderColor: paymentMethod === method.id ? 'rgba(255, 255, 255, 0.5)' : theme.colors.border
              }
            ]}
            onPress={() => handlePaymentMethodSelect(method.id)}
          >
            <Icon 
              name={method.icon} 
              type={method.id === 'apple' ? 'font-awesome' : 'font-awesome-5'} 
              size={24} 
              color={paymentMethod === method.id ? 'rgba(255, 255, 255, 0.9)' : theme.colors.textSecondary} 
            />
            <Text 
              style={[
                styles.paymentMethodText, 
                { 
                  color: paymentMethod === method.id ? 'rgba(255, 255, 255, 0.9)' : theme.colors.textSecondary 
                }
              ]}
            >
              {method.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {paymentMethod === 'card' && (
        <View style={styles.cardDetailsContainer}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Card Number</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }
              ]}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={theme.colors.textSecondary}
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              keyboardType="number-pad"
              maxLength={19}
            />
          </View>
          
          <View style={styles.cardDetailsRow}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Expiry Date</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }
                ]}
                placeholder="MM/YY"
                placeholderTextColor={theme.colors.textSecondary}
                value={expiry}
                onChangeText={(text) => {
                  // Only allow numbers
                  const cleaned = text.replace(/[^0-9]/g, '');
                  if (cleaned.length <= 4) {
                    setExpiry(formatExpiry(cleaned));
                  }
                }}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
            
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>CVV</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border
                  }
                ]}
                placeholder="123"
                placeholderTextColor={theme.colors.textSecondary}
                value={cvv}
                onChangeText={(text) => {
                  // Only allow numbers
                  const cleaned = text.replace(/[^0-9]/g, '');
                  if (cleaned.length <= 3) {
                    setCvv(cleaned);
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
                secureTextEntry
              />
            </View>
          </View>
          
          <CheckBox
            title="Save payment method for future purchases"
            checked={savePaymentMethod}
            onPress={() => setSavePaymentMethod(!savePaymentMethod)}
            containerStyle={[
              styles.checkboxContainer, 
              { 
                backgroundColor: 'transparent', 
                borderWidth: 0 
              }
            ]}
            textStyle={{ color: theme.colors.text }}
            checkedColor="rgba(255, 255, 255, 0.8)"
          />
        </View>
      )}
      
      <CheckBox
        title="I agree to the terms and conditions"
        checked={agreedToTerms}
        onPress={() => setAgreedToTerms(!agreedToTerms)}
        containerStyle={[
          styles.checkboxContainer, 
          { 
            backgroundColor: 'transparent', 
            borderWidth: 0 
          }
        ]}
        textStyle={{ color: theme.colors.text }}
        checkedColor="rgba(255, 255, 255, 0.8)"
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.eventPreview}>
            <Image 
              source={{ uri: event.image || event.coverImage || event.flyers?.[0] || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80' }} 
              style={styles.eventImage} 
              resizeMode="cover" 
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.eventImageOverlay}
            />
            <View style={styles.eventInfo}>
              <Text style={[styles.eventTitle, { color: 'white' }]} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={[styles.eventDetails, { color: 'rgba(255,255,255,0.8)' }]}>
                {formatEventDate(event.date)} • {event.time || "Event Time"}
              </Text>
            </View>
          </View>
          
          {renderTicketSummary()}
          
          {renderSpecialInstructions()}
          
          {renderContactInfo()}
          
          {renderGuestListOption()}
        </View>
      </ScrollView>
      
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.background }]}>
        <Button
          title={isLoading ? "Processing Payment..." : "Continue to Payment"}
          loading={isLoading}
          onPress={handleContinue}
          buttonStyle={[styles.primaryButton, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}
          titleStyle={{ color: '#000000', fontWeight: '600' }}
          containerStyle={styles.buttonContainer}
          disabled={isLoading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  progressContainer: {
    flexDirection: 'row',
    height: 4,
    marginBottom: 16,
  },
  progressStep: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  eventPreview: {
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  eventInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 14,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  ticketPrice: {
    fontSize: 14,
  },
  ticketQuantity: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: 16,
    marginBottom: 2,
  },
  subtotalText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentMethod: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  paymentMethodActive: {
    borderWidth: 2,
  },
  paymentMethodText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  cardDetailsContainer: {
    marginTop: 8,
  },
  cardDetailsRow: {
    flexDirection: 'row',
  },
  checkboxContainer: {
    marginTop: 8,
    marginLeft: 0,
    marginRight: 0,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    height: 50,
    borderRadius: 25,
  },
  includesContainer: {
    marginTop: 8,
  },
  includesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  includeIcon: {
    marginRight: 8,
  },
  includeText: {
    fontSize: 14,
  },
  instructionItem: {
    marginBottom: 16,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionIcon: {
    marginRight: 8,
  },
  instructionTicketType: {
    fontSize: 16,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
  },
  guestListOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  guestListContent: {
    flex: 1,
  },
  guestListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guestListIcon: {
    marginRight: 8,
  },
  guestListTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  guestListDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  guestListCheckbox: {
    marginLeft: 12,
    marginTop: 2,
  },
});

// Main CheckoutScreen component wrapped with StripeProvider
const CheckoutScreen = (props) => {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <CheckoutContent {...props} />
    </StripeProvider>
  );
};

export default CheckoutScreen;
