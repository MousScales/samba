import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Platform, 
  TextInput,
  KeyboardAvoidingView,
  Modal,
  Dimensions,
  FlatList,
  Animated,
  Alert
} from 'react-native';
import { Text, Button, Input, Icon, useTheme, Divider } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Menu, TouchableRipple } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import CustomNavBar from '../components/CustomNavBar';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';

const EVENT_CATEGORIES = [
  { label: 'Music & Concerts', value: 'music', icon: 'music' },
  { label: 'Sports & Fitness', value: 'sports', icon: 'activity' },
  { label: 'Business & Professional', value: 'business', icon: 'briefcase' },
  { label: 'Food & Drink', value: 'food', icon: 'coffee' },
  { label: 'Arts & Culture', value: 'arts', icon: 'feather' },
  { label: 'Community & Charity', value: 'community', icon: 'heart' },
  { label: 'Education & Learning', value: 'education', icon: 'book' },
  { label: 'Fashion & Beauty', value: 'fashion', icon: 'shopping-bag' },
  { label: 'Health & Wellness', value: 'health', icon: 'heart' },
  { label: 'Science & Technology', value: 'tech', icon: 'cpu' },
  { label: 'Travel & Outdoor', value: 'travel', icon: 'map' },
  { label: 'Film & Media', value: 'film', icon: 'film' },
  { label: 'Gaming & eSports', value: 'gaming', icon: 'monitor' },
  { label: 'Other', value: 'other', icon: 'more-horizontal' }
];

const StepIndicator = ({ currentStep, totalSteps, theme }) => {
  return (
    <View style={[
      styles.stepIndicatorContainer, 
      { backgroundColor: theme.colors.background }
    ]}>
      {[...Array(totalSteps)].map((_, index) => (
        <View key={index} style={styles.stepRow}>
          <View style={[
            styles.stepDot,
            { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            },
            currentStep === index + 1 && { 
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            },
            index < currentStep - 1 && { 
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary 
            }
          ]}>
            <Text style={[
              styles.stepNumber,
              { color: theme.colors.textSecondary },
              (currentStep === index + 1 || index < currentStep - 1) && { 
                color: theme.colors.text,
                fontWeight: '700'
              }
            ]}>
              {index + 1}
            </Text>
          </View>
          {index < totalSteps - 1 && (
            <View style={[
              styles.stepLine,
              { backgroundColor: theme.colors.border },
              index < currentStep - 1 && { 
                backgroundColor: theme.colors.primary,
                height: 3
              }
            ]} />
          )}
        </View>
      ))}
    </View>
  );
};

const TicketTypeItem = ({ 
  ticket, 
  index, 
  updateTicketType, 
  removeTicketType, 
  ticketTypes,
  addIncludeItem,
  updateIncludeItem,
  removeIncludeItem,
  viewMode
}) => {
  const [priceAnimation] = useState(new Animated.Value(ticket.price === 'Free' ? 1 : 0));
  const [quantityAnimation] = useState(new Animated.Value(ticket.isUnlimited ? 1 : 0));

  useEffect(() => {
    Animated.timing(priceAnimation, {
      toValue: ticket.price === 'Free' ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [ticket.price]);

  useEffect(() => {
    Animated.timing(quantityAnimation, {
      toValue: ticket.isUnlimited ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [ticket.isUnlimited]);

  return (
    <View style={styles.ticketContainer}>
      <View style={styles.ticketHeader}>
        <TextInput
          placeholder="Ticket Type (e.g., VIP, Early Bird)"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={ticket.type}
          onChangeText={(text) => updateTicketType(index, 'type', text)}
          style={styles.ticketTypeInput}
        />
        
        {ticketTypes.length > 1 && (
          <TouchableOpacity 
            style={styles.removeTicketButton}
            onPress={() => removeTicketType(index)}
          >
            <Icon name="trash-2" type="feather" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.ticketDetailsContainer}>
        <View style={styles.priceSection}>
          <Text style={styles.sectionLabel}>Price</Text>
          <View style={styles.priceInputContainer}>
            <Animated.View style={[
              styles.freeOverlay,
              {
                opacity: priceAnimation,
                transform: [{
                  translateY: priceAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              },
            ]}>
              <Text style={styles.overlayText}>FREE</Text>
            </Animated.View>
            {!ticket.price || ticket.price !== 'Free' ? (
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={ticket.price === 'Free' ? '' : ticket.price}
                  onChangeText={(text) => updateTicketType(index, 'price', text)}
                  keyboardType="numeric"
                  style={styles.priceInput}
                  editable={ticket.price !== 'Free'}
                />
              </View>
            ) : null}
          </View>
        </View>
        
        <View style={styles.quantitySection}>
          <Text style={styles.sectionLabel}>Quantity</Text>
          <View style={styles.quantityInputContainer}>
            <Animated.View style={[
              styles.unlimitedOverlay,
              {
                opacity: quantityAnimation,
                transform: [{
                  translateY: quantityAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              },
            ]}>
              <Text style={styles.overlayText}>∞</Text>
            </Animated.View>
            {!ticket.isUnlimited ? (
              <TextInput
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={ticket.quantity}
                onChangeText={(text) => updateTicketType(index, 'quantity', text)}
                keyboardType="numeric"
                style={styles.quantityInput}
              />
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.ticketOptionsContainer}>
        <TouchableOpacity 
          style={styles.ticketOption}
          onPress={() => {
            const newValue = ticket.price === 'Free' ? '' : 'Free';
            updateTicketType(index, 'price', newValue);
          }}
        >
          <Icon 
            name={ticket.price === 'Free' ? "check-square" : "square"} 
            type="feather" 
            size={18} 
            color="#FFFFFF" 
          />
          <Text style={styles.ticketOptionText}>Free Ticket</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.ticketOption}
          onPress={() => updateTicketType(index, 'isUnlimited', !ticket.isUnlimited)}
        >
          <Icon 
            name={ticket.isUnlimited ? "check-square" : "square"} 
            type="feather" 
            size={18} 
            color="#FFFFFF" 
          />
          <Text style={styles.ticketOptionText}>Unlimited Quantity</Text>
        </TouchableOpacity>
      </View>
      
      {/* Special Instructions */}
      <View style={styles.detailContainer}>
        <Text style={styles.sectionLabel}>Special Instructions</Text>
        <TextInput
          placeholder="Requirements, dress code, perks, etc."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={ticket.instructions}
          onChangeText={(text) => updateTicketType(index, 'instructions', text)}
          multiline
          numberOfLines={2}
          style={[styles.detailInput, styles.instructionsInput]}
        />
      </View>
      
      {/* What's Included Section */}
      <View style={styles.includesContainer}>
        <Text style={styles.sectionLabel}>What's Included</Text>
        
        {ticket.includes && ticket.includes.map((item, itemIndex) => (
          <View key={itemIndex} style={styles.includeItemRow}>
            <Icon 
              name="check-circle" 
              type="feather" 
              size={16} 
              color="#FFFFFF"
              containerStyle={{ marginRight: 10 }}
            />
            <TextInput
              placeholder="Add item that's included with this ticket"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={item}
              onChangeText={(text) => updateIncludeItem(index, itemIndex, text)}
              style={styles.includeItemInput}
            />
            <TouchableOpacity
              onPress={() => removeIncludeItem(index, itemIndex)}
              style={styles.removeItemButton}
            >
              <Icon name="x" type="feather" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}
        
        <TouchableOpacity
          style={styles.addIncludeButton}
          onPress={() => addIncludeItem(index)}
        >
          <Icon 
            name="plus" 
            type="feather" 
            size={16} 
            color="#FFFFFF"
            containerStyle={{ marginRight: 8 }}
          />
          <Text style={styles.addIncludeText}>Add Included Item</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const initialTicketType = {
  type: '',
  price: '',
  quantity: '',
  isUnlimited: false,
  instructions: '',
  includes: [],
};

const CreateEventScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { addEvent } = useEvents();
  const scrollViewRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;
  
  // Get view mode and event data from route params
  const viewMode = route.params?.viewMode || false;
  const existingEvent = route.params?.event || null;
  
  // Event data state
  const [eventTitle, setEventTitle] = useState(existingEvent?.title || '');
  const [eventDate, setEventDate] = useState(existingEvent?.date ? new Date(existingEvent.date) : new Date());
  const [startTime, setStartTime] = useState(existingEvent?.startTime ? new Date(existingEvent.startTime) : new Date());
  const [endTime, setEndTime] = useState(existingEvent?.endTime ? new Date(existingEvent.endTime) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());
  const [venue, setVenue] = useState(existingEvent?.venue || '');
  const [street, setStreet] = useState(existingEvent?.address?.street || '');
  const [city, setCity] = useState(existingEvent?.address?.city || '');
  const [state, setState] = useState(existingEvent?.address?.state || '');
  const [zipCode, setZipCode] = useState(existingEvent?.address?.zipCode || '');
  const [description, setDescription] = useState(existingEvent?.description || '');
  const [flyers, setFlyers] = useState(existingEvent?.flyers || []);
  const [hasEndTime, setHasEndTime] = useState(existingEvent?.endTime ? true : false);
  const [showOnExplore, setShowOnExplore] = useState(existingEvent?.showOnExplore !== false); // Default to true for new events
  
  // Ticket data
  const [ticketTypes, setTicketTypes] = useState(
    existingEvent?.tickets || [{ ...initialTicketType }]
  );

  // Update header title based on mode
  useEffect(() => {
    navigation.setOptions({
      headerTitle: viewMode ? 'Event Details' : 'Create Event',
      headerRight: () => viewMode ? null : (
        <TouchableOpacity onPress={handleCreateEvent}>
          <Text style={styles.headerButton}>Create</Text>
        </TouchableOpacity>
      )
    });
  }, [navigation, viewMode]);

  // Common input props for view mode
  const getInputProps = (value) => ({
    value: value,
    editable: !viewMode,
    style: [
      styles.input,
      viewMode && styles.viewModeInput
    ]
  });

  // Date and time picker handlers
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        setEventDate(selectedDate);
      }
    } else {
      // For iOS, update the temp date which will be confirmed by the modal
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        setStartTime(selectedTime);
      }
    } else {
      // For iOS, update the temp time which will be confirmed by the modal
      if (selectedTime) {
        setTempStartTime(selectedTime);
      }
    }
  };
  
  const handleEndTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        setEndTime(selectedTime);
      }
    } else {
      // For iOS, update the temp time which will be confirmed by the modal
      if (selectedTime) {
        setTempEndTime(selectedTime);
      }
    }
  };
  
  // Image picker
  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to upload a flyer!');
        return;
      }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
    });

    if (!result.canceled) {
        // Add the new image to the array
        setFlyers(currentFlyers => [...currentFlyers, result.assets[0].uri]);
    }
    } catch (error) {
      console.log('Error picking image:', error);
      alert('There was a problem selecting the image. Please try again.');
    }
  };
  
  // Format time to display
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date to display
  const formatDate = (date) => {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    return date.toLocaleDateString([], options);
  };
  
  // Update the text formatting for end time to make it shorter
  const formatEndTimeText = (endTime) => {
    if (!endTime) return 'End (optional)';
    return formatTime(endTime);
  };

  // Ticket management functions
  const addTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      { type: '', price: '', quantity: '', instructions: '', includes: [], isUnlimited: false }
    ]);
  };

  const updateTicketType = (index, field, value) => {
    const newTicketTypes = [...ticketTypes];
    newTicketTypes[index] = { ...newTicketTypes[index], [field]: value };
    setTicketTypes(newTicketTypes);
  };
  
  const removeTicketType = (index) => {
    const newTicketTypes = [...ticketTypes];
    newTicketTypes.splice(index, 1);
    setTicketTypes(newTicketTypes);
  };

  const addIncludeItem = (ticketIndex) => {
    const updatedTickets = [...ticketTypes];
    if (!updatedTickets[ticketIndex].includes) {
      updatedTickets[ticketIndex].includes = [];
    }
    updatedTickets[ticketIndex].includes.push('');
    setTicketTypes(updatedTickets);
  };
  
  const updateIncludeItem = (ticketIndex, itemIndex, text) => {
    const updatedTickets = [...ticketTypes];
    updatedTickets[ticketIndex].includes[itemIndex] = text;
    setTicketTypes(updatedTickets);
  };

  const removeIncludeItem = (ticketIndex, itemIndex) => {
    const updatedTickets = [...ticketTypes];
    updatedTickets[ticketIndex].includes.splice(itemIndex, 1);
    setTicketTypes(updatedTickets);
  };
  
  // Function to remove a flyer
  const removeFlyer = (index) => {
    setFlyers(currentFlyers => {
      const newFlyers = [...currentFlyers];
      newFlyers.splice(index, 1);
      return newFlyers;
    });
  };
  
  // Toggle end time handler
  const toggleEndTime = () => {
    setHasEndTime(!hasEndTime);
    if (hasEndTime) {
      // If we're switching to "No End Time", clear the end time
      setEndTime(null);
      setTempEndTime(null);
    } else {
      // If we're switching back to having an end time, set a default end time
      // 2 hours after start time
      const newEndTime = new Date(startTime);
      newEndTime.setHours(newEndTime.getHours() + 2);
      setEndTime(newEndTime);
      setTempEndTime(newEndTime);
    }
  };
  
  // Handle create event
  const handleCreateEvent = async () => {
    // Validate and submit event data
    const requiredFields = [];
    
    if (!eventTitle.trim()) requiredFields.push('Event Title');
    if (!venue.trim()) requiredFields.push('Venue Name');
    if (!street.trim()) requiredFields.push('Street Address');
    if (!city.trim()) requiredFields.push('City');
    if (!state.trim()) requiredFields.push('State');
    if (!zipCode.trim()) requiredFields.push('ZIP Code');
    if (flyers.length === 0) requiredFields.push('At least one flyer image');
    
    // Check if at least one ticket type has all required information
    const hasValidTicket = ticketTypes.some(ticket => 
      ticket.type.trim() && 
      (ticket.price.trim() || ticket.price === 'Free') && 
      (ticket.isUnlimited || ticket.quantity.trim())
    );
    
    if (!hasValidTicket) requiredFields.push('At least one complete ticket type');
    
    if (requiredFields.length > 0) {
      Alert.alert(
        "Missing Information",
        `Please fill in the following required fields:\n${requiredFields.join('\n')}`,
        [{ text: "OK" }]
      );
      return;
    }

    // Generate a random 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Format tickets data
    const formattedTickets = ticketTypes
      .filter(ticket => ticket.type.trim() && (ticket.price.trim() || ticket.price === 'Free'))
      .map(ticket => ({
        name: ticket.type.trim(),
        price: ticket.price === 'Free' ? 0 : parseFloat(ticket.price),
        isFree: ticket.price === 'Free',
        quantity: ticket.isUnlimited ? Infinity : parseInt(ticket.quantity, 10),
        isUnlimited: ticket.isUnlimited,
        availableQuantity: ticket.isUnlimited ? Infinity : parseInt(ticket.quantity, 10),
        sold: 0,
        instructions: ticket.instructions.trim(),
        includes: ticket.includes.filter(item => item.trim()),
      }));

    // Geocode the address to get coordinates
    let coordinates = null;
    try {
      const fullAddress = `${street.trim()}, ${city.trim()}, ${state.trim()} ${zipCode.trim()}`;
      const geocodedLocation = await Location.geocodeAsync(fullAddress);
      
      if (geocodedLocation && geocodedLocation.length > 0) {
        coordinates = {
          latitude: geocodedLocation[0].latitude,
          longitude: geocodedLocation[0].longitude,
        };
        console.log('📍 Geocoded event address:', fullAddress, coordinates);
      }
    } catch (error) {
      console.warn('⚠️ Failed to geocode address:', error);
      // Continue without coordinates - event will still work but won't appear in location-based searches
    }

    // Prepare the event data
    const eventData = {
      title: eventTitle.trim(),
      date: eventDate,
      startTime: startTime,
      endTime: hasEndTime ? endTime : null,
      hasEndTime: hasEndTime,
      venue: venue.trim(),
      address: {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        formatted: `${street.trim()}, ${city.trim()}, ${state.trim()} ${zipCode.trim()}`,
        coordinates: coordinates
      },
      description: description.trim(),
      coverImage: flyers[0],
      flyers: flyers,
      tickets: formattedTickets,
      organizer: {
        id: user?.id,
        name: user?.providerInfo?.organizationName || user?.name,
        organizationName: user?.providerInfo?.organizationName,
        profilePicture: user?.profilePicture || user?.providerInfo?.partyLogo,
        description: user?.providerInfo?.description,
        contactEmail: user?.providerInfo?.partyEmail,
        contactPhone: user?.providerInfo?.partyPhone
      },
      organizerId: user?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'upcoming',
      ticketSalesOpen: true,
      showOnExplore: showOnExplore, // Add visibility option for Explore page
      totalSpots: formattedTickets.reduce((total, ticket) => 
        total + (ticket.isUnlimited ? 0 : ticket.quantity), 0),
      spotsLeft: formattedTickets.reduce((total, ticket) => 
        total + (ticket.isUnlimited ? 0 : ticket.quantity), 0),
      bookedSpots: 0,
      verificationCode: verificationCode // Add verification code to event data
    };
    
    try {
      // Add event using the context function
      const newEvent = await addEvent(eventData);
      
      // Navigate to confirmation screen with event data
      navigation.navigate('EventConfirmation', { eventData: newEvent });
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert(
        "Error",
        "There was a problem creating your event. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

    return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1a1a', '#232323', '#2c2c2c', '#1f1f1f']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>New Event</Text>
          
          <View style={styles.headerRight} />
        </View>
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Event Image Section - Moved to top */}
            <View style={styles.eventImageSection}>
              {flyers.length > 0 ? (
                <View style={styles.eventImageContainer}>
                  <Image 
                    source={{ uri: flyers[0] }} 
                    style={styles.eventImage} 
                    resizeMode="cover"
                  />
              <TouchableOpacity
                    style={styles.editImageButton}
                    onPress={pickImage}
              >
                    <Icon name="edit-2" type="feather" size={16} color="#FFFFFF" />
                    <Text style={styles.editText}>edit</Text>
              </TouchableOpacity>
            </View>
              ) : (
              <TouchableOpacity 
                  style={styles.addImageContainer}
                onPress={pickImage}
              >
                  <Icon name="image" type="feather" size={40} color="#FFFFFF" />
                  <Text style={styles.addImageText}>Add Cover Image</Text>
              </TouchableOpacity>
              )}
              
              <View style={styles.hostInfoContainer}>
                <View style={styles.hostInfo}>
                  {user?.profilePicture ? (
                    <Image 
                      source={{ uri: user.profilePicture }}
                      style={styles.hostAvatar}
                    />
                  ) : (
                    <View style={[styles.hostAvatar, styles.initialsContainer]}>
                      <Text style={styles.initialsText}>
                        {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'A'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.hostedByText}>
                    Hosted by {user?.providerInfo?.organizationName || user?.name || 'Anonymous'}
                  </Text>
                  <Icon name="chevron-down" type="feather" size={16} color="#FFFFFF" />
                </View>
              </View>
            </View>
            
            {/* Event Title */}
            <View style={styles.inputSection}>
              <TextInput
                style={styles.titleInput}
                placeholder="Event Title"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={eventTitle}
                onChangeText={setEventTitle}
        />
      </View>

            {/* Date and Time Section */}
            <View style={styles.inputSection}>
              {/* Date Selection */}
              <TouchableOpacity 
                style={styles.dateTimeContainer}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon 
                  name="calendar" 
                  type="feather" 
                  size={24} 
                  color="#FFFFFF"
                  containerStyle={styles.inputIcon} 
                />
                <View style={styles.dateTimeContent}>
                  <Text style={styles.dateTimeLabel}>Date</Text>
                  <Text style={styles.dateTimeValue}>{formatDate(eventDate)}</Text>
                </View>
              </TouchableOpacity>

              {/* Time Selection */}
              <View style={styles.timeContainer}>
                <View style={styles.timeSelectionRow}>
                  {/* Start Time */}
                  <TouchableOpacity 
                    style={styles.timeSelection}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Icon 
                      name="clock" 
                      type="feather" 
                      size={24} 
                      color="#FFFFFF"
                      containerStyle={styles.inputIcon} 
                    />
                    <View style={styles.timeContent}>
                      <Text style={styles.dateTimeLabel}>Start Time</Text>
                      <Text style={styles.dateTimeValue}>
                        {formatTime(startTime)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* End Time */}
                  {hasEndTime && (
                    <>
                      <View style={styles.timeDivider}>
                        <Icon 
                          name="arrow-right" 
                          type="feather" 
                          size={20} 
                          color="rgba(255,255,255,0.5)" 
                        />
                      </View>
                      <TouchableOpacity 
                        style={styles.timeSelection}
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <View style={styles.timeContent}>
                          <Text style={styles.dateTimeLabel}>End Time</Text>
                          <Text style={styles.dateTimeValue}>
                            {endTime ? formatTime(endTime) : 'Set Time'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* End Time Toggle */}
                <View style={styles.endTimeToggleContainer}>
                  <View style={styles.spacer} />
                  <TouchableOpacity 
                    style={styles.noEndTimeToggle}
                    onPress={toggleEndTime}
                  >
                    <Icon 
                      name={hasEndTime ? "x" : "clock"} 
                      type="feather" 
                      size={16} 
                      color="#FFFFFF" 
                      style={styles.endTimeIcon}
                    />
                    <Text style={styles.noEndTimeText}>
                      {hasEndTime ? "No End Time" : "Set End Time"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Location Section */}
            <View style={styles.inputSection}>
              <TouchableOpacity style={styles.locationContainer} onPress={() => {}}>
                <Icon 
                  name="map-pin" 
                  type="feather" 
                  size={24} 
                  color="#FFFFFF" 
                  containerStyle={styles.inputIcon}
                />
                <View style={styles.locationContent}>
                  <Text style={styles.locationLabel}>Set Address</Text>
                  <Text style={styles.locationValue}>
                    {street || city || state || zipCode ? (
                      <>
                        {[
                          street,
                          [city, state].filter(Boolean).join(', '),
                          zipCode
                        ].filter(Boolean).join(' • ')}
                      </>
                    ) : (
                      <Text style={styles.placeholderText}>Enter address details below</Text>
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Additional Details Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Event Details</Text>
              
              <View style={styles.detailContainer}>
                <Text style={styles.detailLabel}>Venue</Text>
                <TextInput
                  style={styles.detailInput}
                  placeholder="Venue Name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={venue}
                  onChangeText={setVenue}
                />
              </View>

              <View style={styles.detailContainer}>
                <Text style={styles.detailLabel}>Street Address</Text>
                <TextInput
                  style={styles.detailInput}
                  placeholder="Enter street address"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={street}
                  onChangeText={setStreet}
                />
              </View>

              <View style={styles.addressRow}>
                <View style={styles.cityContainer}>
                  <Text style={styles.detailLabel}>City</Text>
                  <TextInput
                    style={styles.detailInput}
                    placeholder="City"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>

                <View style={styles.stateContainer}>
                  <Text style={styles.detailLabel}>State</Text>
                  <TextInput
                    style={styles.detailInput}
                    placeholder="State"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={state}
                    onChangeText={setState}
                  />
                </View>

                <View style={styles.zipContainer}>
                  <Text style={styles.detailLabel}>ZIP</Text>
                  <TextInput
                    style={styles.detailInput}
                    placeholder="ZIP"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={zipCode}
                    onChangeText={setZipCode}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Description Section */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>Description</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Tell attendees what they can expect from your event"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Event Visibility Section */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>Event Visibility</Text>
              <TouchableOpacity 
                style={styles.visibilityOption}
                onPress={() => setShowOnExplore(!showOnExplore)}
              >
                <Icon 
                  name={showOnExplore ? "check-square" : "square"} 
                  type="feather" 
                  size={20} 
                  color="#FFFFFF" 
                />
                <View style={styles.visibilityOptionContent}>
                  <Text style={styles.visibilityOptionTitle}>Show on Explore page</Text>
                  <Text style={styles.visibilityOptionDescription}>
                    Allow users to discover your event on the main Explore page. 
                    If disabled, only people with a direct link can find your event.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Tickets Section */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>Tickets</Text>
              {ticketTypes.map((ticket, index) => (
                <TicketTypeItem
                  key={index}
                  ticket={ticket}
                  index={index}
                  updateTicketType={updateTicketType}
                  removeTicketType={removeTicketType}
                  ticketTypes={ticketTypes}
                  addIncludeItem={addIncludeItem}
                  updateIncludeItem={updateIncludeItem}
                  removeIncludeItem={removeIncludeItem}
                  viewMode={viewMode}
                />
              ))}
              
              {!viewMode && (
                <TouchableOpacity 
                  style={styles.addTicketButton}
                  onPress={addTicketType}
                >
                  <Icon 
                    name="plus" 
                    type="feather" 
                    size={20} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.addTicketText}>Add Another Ticket Type</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Next Button */}
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleCreateEvent}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Date/Time Pickers */}
      {Platform.OS === 'ios' && (showDatePicker || showStartTimePicker || showEndTimePicker) && (
        <Modal
          visible={showDatePicker || showStartTimePicker || showEndTimePicker}
          transparent={true}
          animationType="slide"
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => {
              setShowDatePicker(false);
              setShowStartTimePicker(false);
              setShowEndTimePicker(false);
            }}
          >
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  {showDatePicker ? 'Select Date' : (showStartTimePicker ? 'Select Start Time' : 'Select End Time')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowStartTimePicker(false);
                    setShowEndTimePicker(false);
                  }}
                >
                  <Icon name="x" type="feather" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              {showDatePicker && (
                <DateTimePicker
                  testID="datePicker"
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedValue) => {
                    if (selectedValue) {
                      setTempDate(selectedValue);
                    }
                  }}
                  themeVariant="dark"
                  textColor="#FFFFFF"
                />
              )}
              
              {showStartTimePicker && (
                <DateTimePicker
                  testID="startTimePicker"
                  value={tempStartTime}
                  mode="time"
                  display="spinner"
                  onChange={(event, selectedValue) => {
                    if (selectedValue) {
                      setTempStartTime(selectedValue);
                    }
                  }}
                  themeVariant="dark"
                  textColor="#FFFFFF"
                />
              )}
              
              {showEndTimePicker && hasEndTime && (
                <DateTimePicker
                  testID="endTimePicker"
                  value={tempEndTime}
                  mode="time"
                  display="spinner"
                  onChange={(event, selectedValue) => {
                    if (selectedValue) {
                      setTempEndTime(selectedValue);
                    }
                  }}
                  themeVariant="dark"
                  textColor="#FFFFFF"
                />
              )}
              
              <Button
                title="Confirm"
                onPress={() => {
                  if (showDatePicker) {
                    setEventDate(tempDate);
                    setShowDatePicker(false);
                  } else if (showStartTimePicker) {
                    setStartTime(tempStartTime);
                    setShowStartTimePicker(false);
                  } else if (showEndTimePicker && hasEndTime) {
                    setEndTime(tempEndTime);
                    setShowEndTimePicker(false);
                  }
                }}
                buttonStyle={styles.confirmButton}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      
      {/* Android Date/Time Pickers */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          testID="androidDatePicker"
          value={eventDate}
          mode="date"
          onChange={handleDateChange}
        />
      )}
      
      {Platform.OS === 'android' && showStartTimePicker && (
        <DateTimePicker
          testID="androidStartTimePicker"
          value={startTime}
          mode="time"
          onChange={handleStartTimeChange}
        />
      )}
      
      {Platform.OS === 'android' && showEndTimePicker && hasEndTime && (
        <DateTimePicker
          testID="androidEndTimePicker"
          value={endTime || new Date()}
          mode="time"
          onChange={handleEndTimeChange}
        />
      )}
    </View>
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
    height: Dimensions.get('window').height,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cancelButton: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 70, // Match the width of the Cancel button for balance
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 50,
  },
  eventImageSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  eventImageContainer: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').width - 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 10,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    color: '#FFFFFF',
    marginLeft: 4,
    fontSize: 14,
  },
  addImageContainer: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').width - 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  addImageText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  hostInfoContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  hostedByText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8,
  },
  inputSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  titleInput: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 0,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 16,
  },
  dateTimeContent: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    flexWrap: 'wrap',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  nextButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  pickerContainer: {
    width: '90%',
    backgroundColor: 'rgba(50, 50, 50, 0.9)',
    borderRadius: 16,
    padding: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmButton: {
    backgroundColor: '#FF4757',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  detailContainer: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  detailInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  descriptionInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  ticketContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketTypeInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  removeTicketButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,0,0,0.2)',
  },
  ticketDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  priceSection: {
    flex: 1,
    marginRight: 10,
  },
  quantitySection: {
    flex: 1,
    marginLeft: 10,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  priceInputContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    height: 44,
  },
  quantityInputContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    height: 44,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
  },
  currencySymbol: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    padding: 0,
  },
  quantityInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 12,
    height: '100%',
  },
  freeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  unlimitedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ticketOptionsContainer: {
    marginTop: 15,
  },
  ticketOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  ticketOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  timeContainer: {
    marginTop: 20,
  },
  timeSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeSelection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  timeDivider: {
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeContent: {
    flex: 1,
  },
  endTimeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 5,
  },
  spacer: {
    flex: 1,
  },
  noEndTimeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  endTimeIcon: {
    marginRight: 6,
  },
  noEndTimeText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  cityContainer: {
    flex: 2,
    marginRight: 10,
  },
  stateContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  zipContainer: {
    flex: 1,
    marginLeft: 10,
  },
  initialsContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionsInput: {
    minHeight: 60,
  },
  includesContainer: {
    marginTop: 16,
  },
  includeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  includeItemInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 8,
  },
  removeItemButton: {
    padding: 4,
    marginLeft: 8,
  },
  addIncludeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  addIncludeText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  addTicketText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  addTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  addTicketIcon: {
    marginRight: 8,
  },
  viewModeInput: {
    opacity: 0.7,
    color: '#FFFFFF',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  visibilityOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  visibilityOptionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  visibilityOptionDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default CreateEventScreen; 