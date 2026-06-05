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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Button, Input, Icon, useTheme, Divider } from '@rneui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickImageFromLibrary } from '../utils/pickImage';
import { uploadImages } from '../services/imageService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Menu, TouchableRipple } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import CustomNavBar from '../components/CustomNavBar';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { useLanguage } from '../context/LanguageContext';

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
  viewMode,
  toggleTicketFree,
}) => {
  const { t } = useLanguage();
  const free = isTicketFree(ticket);
  const [priceAnimation] = useState(new Animated.Value(free ? 1 : 0));
  const [quantityAnimation] = useState(new Animated.Value(ticket.isUnlimited ? 1 : 0));

  useEffect(() => {
    Animated.timing(priceAnimation, {
      toValue: isTicketFree(ticket) ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [ticket.isFree, ticket.price]);

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
          placeholder={t('createEvent.ticket.placeholder.type')}
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={ticket.type}
          onChangeText={(text) => updateTicketType(index, 'type', text)}
          style={styles.ticketTypeInput}
          editable={!viewMode}
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
          <Text style={styles.sectionLabel}>{t('createEvent.ticket.label.price')}</Text>
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
              <Text style={styles.overlayText}>{t('createEvent.ticket.free')}</Text>
            </Animated.View>
            {!free ? (
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  placeholder={t('createEvent.ticket.placeholder.price')}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={ticket.price === 'Free' ? '' : String(ticket.price ?? '')}
                  onChangeText={(text) => updateTicketType(index, 'price', text)}
                  keyboardType="numeric"
                  style={styles.priceInput}
                  editable={!free && !viewMode}
                />
              </View>
            ) : null}
          </View>
        </View>
        
        <View style={styles.quantitySection}>
          <Text style={styles.sectionLabel}>{t('createEvent.ticket.label.quantity')}</Text>
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
              <Text style={styles.overlayText}>{t('common.unlimited')}</Text>
            </Animated.View>
            {!ticket.isUnlimited ? (
              <TextInput
                placeholder={t('createEvent.ticket.placeholder.price')}
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
          onPress={() => toggleTicketFree(index)}
          disabled={viewMode}
        >
          <Icon 
            name={free ? "check-square" : "square"} 
            type="feather" 
            size={18} 
            color="#FFFFFF" 
          />
          <Text style={styles.ticketOptionText}>{t('createEvent.ticket.option.free')}</Text>
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
          <Text style={styles.ticketOptionText}>{t('createEvent.ticket.option.unlimited')}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Special Instructions */}
      <View style={styles.detailContainer}>
        <Text style={styles.sectionLabel}>{t('createEvent.ticket.label.instructions')}</Text>
        <TextInput
          placeholder={t('createEvent.ticket.placeholder.instructions')}
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
        <Text style={styles.sectionLabel}>{t('createEvent.ticket.label.includes')}</Text>
        
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
              placeholder={t('createEvent.ticket.placeholder.includeItem')}
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
          <Text style={styles.addIncludeText}>{t('createEvent.ticket.button.addInclude')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const isTicketFree = (ticket) =>
  !!ticket?.isFree || ticket?.price === 'Free' || ticket?.price === 0 || ticket?.price === '0';

const normalizeTicketForForm = (ticket) => {
  const free = isTicketFree(ticket);
  const unlimited = !!ticket?.isUnlimited || ticket?.quantity === Infinity;
  return {
    id: ticket?.id,
    type: ticket?.type || ticket?.name || '',
    price: free ? 'Free' : String(ticket?.price ?? ''),
    isFree: free,
    quantity: unlimited ? '' : String(ticket?.quantity ?? ticket?.availableQuantity ?? ''),
    isUnlimited: unlimited,
    instructions: ticket?.instructions || '',
    includes: ticket?.includes || [],
  };
};

const initialTicketType = {
  type: '',
  price: '',
  isFree: false,
  quantity: '',
  isUnlimited: false,
  instructions: '',
  includes: [],
};

const CreateEventScreen = ({ navigation, route, forcedMode = null }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { addEvent, updateEvent, startEventLive, logActivity, getEventById } = useEvents();
  const { t, locale } = useLanguage();
  const scrollViewRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;

  const editMode = forcedMode === 'edit' || route.params?.editMode || false;
  const viewMode = forcedMode === 'edit' ? false : (forcedMode === 'view' || route.params?.viewMode || false);
  const paramEvent = route.params?.event || null;
  const existingEvent = (paramEvent?.id ? getEventById(paramEvent.id) : null) || paramEvent;
  const isUpcoming = existingEvent
    && existingEvent.status !== 'live'
    && existingEvent.status !== 'completed'
    && !existingEvent.startedEarly
    && !existingEvent.liveStartedAt;
  
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
  const [addrSuggestions, setAddrSuggestions] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrInputLayout, setAddrInputLayout] = useState(null);
  const addrInputRef = useRef(null);
  const [description, setDescription] = useState(existingEvent?.description || '');
  const [flyers, setFlyers] = useState(existingEvent?.flyers || []);
  const [hasEndTime, setHasEndTime] = useState(existingEvent?.endTime ? true : false);
  const [showOnExplore, setShowOnExplore] = useState(existingEvent?.showOnExplore !== false); // Default to true for new events
  
  // Ticket data
  const [ticketTypes, setTicketTypes] = useState(() =>
    existingEvent?.tickets?.length
      ? existingEvent.tickets.map(normalizeTicketForForm)
      : [{ ...initialTicketType }]
  );

  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const formReady = useRef(false);
  const savingRef = useRef(false);
  const saveTimerRef = useRef(null);
  const skipSaveOnLeaveRef = useRef(false);
  const savedTimerRef = useRef(null);
  const lastGeocodedAddress = useRef('');

  const showSaved = () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSaveStatus('saved');
    savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // Re-hydrate form when opening a different event to edit
  useEffect(() => {
    if (!editMode || !existingEvent?.id) return;
    formReady.current = false;
    setEventTitle(existingEvent.title || '');
    setEventDate(existingEvent.date ? new Date(existingEvent.date) : new Date());
    setStartTime(existingEvent.startTime ? new Date(existingEvent.startTime) : new Date());
    setEndTime(existingEvent.endTime ? new Date(existingEvent.endTime) : new Date());
    setVenue(existingEvent.venue || '');
    setStreet(existingEvent.address?.street || '');
    setCity(existingEvent.address?.city || '');
    setState(existingEvent.address?.state || '');
    setZipCode(existingEvent.address?.zipCode || '');
    setDescription(existingEvent.description || '');
    setFlyers(existingEvent.flyers || []);
    setHasEndTime(!!existingEvent.endTime);
    setShowOnExplore(existingEvent.showOnExplore !== false);
    setTicketTypes(
      existingEvent.tickets?.length
        ? existingEvent.tickets.map(normalizeTicketForForm)
        : [{ ...initialTicketType }]
    );
    lastGeocodedAddress.current = [
      existingEvent.address?.street,
      existingEvent.address?.city,
      existingEvent.address?.state,
      existingEvent.address?.zipCode,
    ].filter(Boolean).join(', ');
    const readyTimer = setTimeout(() => { formReady.current = true; }, 450);
    return () => clearTimeout(readyTimer);
  }, [editMode, existingEvent?.id]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    clearInterval(typewriterRef.current);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

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
    const uri = await pickImageFromLibrary();
    if (uri) {
      setFlyers((currentFlyers) => [...currentFlyers, uri]);
    }
  };

  // Format time to display
  const formatTime = (date) => {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (date) => {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(locale, options);
  };
  
  const formatEndTimeText = (endTime) => {
    if (!endTime) return t('createEvent.label.setTime');
    return formatTime(endTime);
  };

  // Ticket management functions
  const addTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      { ...initialTicketType },
    ]);
  };

  const updateTicketType = (index, field, value) => {
    setTicketTypes(prev => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      if (field === 'price' && value !== 'Free' && value !== '') {
        updated.isFree = false;
      }
      next[index] = updated;
      return next;
    });
  };

  const toggleTicketFree = (index) => {
    setTicketTypes(prev => {
      const next = [...prev];
      const ticket = next[index];
      const makingFree = !isTicketFree(ticket);
      next[index] = {
        ...ticket,
        isFree: makingFree,
        price: makingFree ? 'Free' : '',
      };
      return next;
    });
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
  
  // ── Address autocomplete ─────────────────────────────────────────────────────
  const searchAddress = async (text) => {
    setStreet(text);
    // Keep position accurate as the user types
    addrInputRef.current?.measureInWindow((x, y, w, h) => {
      setAddrInputLayout({ x, y, w, h });
    });
    if (text.trim().length < 2) { setAddrSuggestions([]); return; }
    setAddrLoading(true);
    try {
      const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const res  = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=address&language=en&key=${GOOGLE_KEY}`
      );
      const data = await res.json();
      setAddrSuggestions(data.predictions ?? []);
    } catch {
      setAddrSuggestions([]);
    } finally {
      setAddrLoading(false);
    }
  };

  const typewriterRef = useRef(null);

  const selectAddress = async (prediction) => {
    setAddrSuggestions([]);

    // Full human-readable address to type out
    const fullAddr = prediction.description || prediction.structured_formatting?.main_text || '';

    // Typewriter animation — adds one character every 18ms
    setStreet('');
    let i = 0;
    clearInterval(typewriterRef.current);
    typewriterRef.current = setInterval(() => {
      i++;
      setStreet(fullAddr.slice(0, i));
      if (i >= fullAddr.length) clearInterval(typewriterRef.current);
    }, 18);

    // Fetch full address components in background to split later
    try {
      const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const res  = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=address_components&key=${GOOGLE_KEY}`
      );
      const data = await res.json();
      const comps = data.result?.address_components ?? [];
      const get   = (type) => comps.find(c => c.types.includes(type));
      setCity(get('locality')?.long_name || get('sublocality')?.long_name || get('administrative_area_level_2')?.long_name || '');
      setState(get('administrative_area_level_1')?.short_name || '');
      setZipCode(get('postal_code')?.long_name || '');
    } catch { /* keep full address string, split later */ }
  };

  const formatTicketsForSave = (strict = true) =>
    ticketTypes
      .filter(ticket => {
        if (!(ticket.type || '').trim() && !ticket.id) return false;
        if (!strict) return true;
        return (
          (ticket.type || '').trim() &&
          (isTicketFree(ticket) || String(ticket.price ?? '').trim())
        );
      })
      .map(ticket => {
        const free = isTicketFree(ticket);
        const qty = ticket.isUnlimited
          ? Infinity
          : (parseInt(ticket.quantity, 10) || 0);
        const existing = existingEvent?.tickets?.find(et =>
          (ticket.id && et.id === ticket.id) ||
          et.name === (ticket.type || '').trim()
        );
        const sold = existing?.sold || 0;
        const name = (ticket.type || '').trim() || existing?.name || 'Ticket';
        return {
          id: ticket.id || existing?.id || `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name,
          price: free ? 0 : (parseFloat(ticket.price) || 0),
          isFree: free,
          quantity: qty,
          isUnlimited: ticket.isUnlimited,
          availableQuantity: ticket.isUnlimited ? Infinity : Math.max(0, qty - sold),
          sold,
          instructions: (ticket.instructions || '').trim(),
          includes: (ticket.includes || []).filter(item => item.trim()),
        };
      });

  const buildEventData = async ({ strict = true, geocode = true } = {}) => {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedTickets = formatTicketsForSave(strict);

    let coordinates = existingEvent?.address?.coordinates || null;
    const fullAddress = `${street.trim()}, ${city.trim()}, ${state.trim()} ${zipCode.trim()}`.trim();
    if (geocode && street.trim() && fullAddress !== lastGeocodedAddress.current) {
      try {
        const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_KEY}`
        );
        const geoData = await geoRes.json();
        const loc = geoData.results?.[0]?.geometry?.location;
        if (loc) {
          coordinates = { latitude: loc.lat, longitude: loc.lng };
          lastGeocodedAddress.current = fullAddress;
        }
      } catch (error) {
        console.warn('⚠️ Failed to geocode address:', error);
      }
    }

    const eventId = existingEvent?.id || `${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    const persistedFlyers = await uploadImages(flyers, {
      userId: user?.id,
      folder: `events/${eventId}`,
    });

    const totalSpots = formattedTickets.reduce((total, ticket) =>
      total + (ticket.isUnlimited ? 0 : ticket.quantity), 0);
    const bookedSpots = existingEvent?.bookedSpots || 0;
    const latestEvent = eventId ? getEventById(eventId) : null;
    const persisted = latestEvent || existingEvent;
    const isLiveEvent = persisted?.status === 'live' || persisted?.startedEarly || persisted?.liveStartedAt;

    return {
      id: eventId,
      title: eventTitle.trim(),
      date: eventDate,
      startTime: isLiveEvent && persisted?.startTime ? new Date(persisted.startTime) : startTime,
      endTime: hasEndTime ? endTime : null,
      hasEndTime,
      venue: venue.trim(),
      address: {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        formatted: fullAddress,
        coordinates,
      },
      description: description.trim(),
      coverImage: persistedFlyers[0],
      flyers: persistedFlyers,
      tickets: formattedTickets,
      organizer: existingEvent?.organizer || {
        id: user?.id,
        name: user?.providerInfo?.organizationName || user?.name,
        organizationName: user?.providerInfo?.organizationName,
        profilePicture: user?.providerInfo?.partyLogo,
        description: user?.providerInfo?.description,
        contactEmail: user?.providerInfo?.partyEmail,
        contactPhone: user?.providerInfo?.partyPhone,
      },
      organizerId: user?.id,
      createdAt: existingEvent?.createdAt || new Date(),
      updatedAt: new Date(),
      status: isLiveEvent ? 'live' : (persisted?.status || 'upcoming'),
      startedEarly: isLiveEvent ? true : (persisted?.startedEarly ?? false),
      ...(isLiveEvent ? { liveStartedAt: persisted?.liveStartedAt || persisted?.startTime } : {}),
      ticketSalesOpen: existingEvent?.ticketSalesOpen ?? true,
      showOnExplore,
      totalSpots,
      spotsLeft: Math.max(0, totalSpots - bookedSpots),
      bookedSpots,
      verificationCode: existingEvent?.verificationCode || verificationCode,
      guestList: existingEvent?.guestList,
    };
  };

  const saveEditEvent = async () => {
    if (!editMode || !existingEvent?.id || savingRef.current) return;
    if (!eventTitle.trim()) return;

    const latest = getEventById(existingEvent.id);
    if (latest?.status === 'live' || latest?.startedEarly || latest?.liveStartedAt) return;

    savingRef.current = true;
    setSaveStatus('saving');
    try {
      const eventData = await buildEventData({ strict: false, geocode: true });
      await updateEvent(existingEvent.id, eventData);
      showSaved();
    } catch (error) {
      console.error('Error auto-saving event:', error);
      setSaveStatus('error');
    } finally {
      savingRef.current = false;
    }
  };

  // Auto-save while editing (debounced) — never while event is live
  useEffect(() => {
    if (!editMode || !formReady.current) return undefined;

    const latest = existingEvent?.id ? getEventById(existingEvent.id) : null;
    if (latest?.status === 'live' || latest?.startedEarly || latest?.liveStartedAt) return undefined;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveEditEvent();
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    editMode,
    eventTitle,
    eventDate,
    startTime,
    endTime,
    hasEndTime,
    venue,
    street,
    city,
    state,
    zipCode,
    description,
    flyers,
    showOnExplore,
    ticketTypes,
  ]);

  // Flush save when leaving edit screen (skip if event was just started live)
  useEffect(() => {
    if (!editMode) return undefined;
    const unsub = navigation.addListener('beforeRemove', () => {
      if (skipSaveOnLeaveRef.current) return;
      const latest = existingEvent?.id ? getEventById(existingEvent.id) : null;
      if (latest?.status === 'live' || latest?.startedEarly || latest?.liveStartedAt) return;
      if (formReady.current && eventTitle.trim()) {
        saveEditEvent();
      }
    });
    return unsub;
  }, [navigation, editMode, eventTitle]);

  const handleCreateEvent = async () => {
    const requiredFields = [];

    if (!eventTitle.trim()) requiredFields.push(t('createEvent.validation.eventTitle'));
    if (!venue.trim()) requiredFields.push(t('createEvent.validation.venue'));
    if (!street.trim()) requiredFields.push(t('createEvent.validation.street'));
    if (flyers.length === 0) requiredFields.push(t('createEvent.validation.flyer'));

    const hasValidTicket = ticketTypes.some(ticket =>
      (ticket.type || '').trim() &&
      (isTicketFree(ticket) || String(ticket.price ?? '').trim()) &&
      (ticket.isUnlimited || String(ticket.quantity ?? '').trim())
    );

    if (!hasValidTicket) requiredFields.push(t('createEvent.validation.ticket'));

    if (requiredFields.length > 0) {
      Alert.alert(
        t('createEvent.alert.missing.title'),
        t('createEvent.alert.missing.message', { fields: requiredFields.join('\n') }),
        [{ text: t('common.ok') }]
      );
      return;
    }

    try {
      const eventData = await buildEventData({ strict: true, geocode: true });
      const newEvent = await addEvent(eventData);
      navigation.navigate('EventConfirmation', { eventData: newEvent });
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert(
        t('common.error'),
        t('createEvent.alert.createFailed'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const handleStartEarly = () => {
    if (!existingEvent || !isUpcoming) return;

    Alert.alert(
      t('createEvent.alert.startEarly.title'),
      t('createEvent.alert.startEarly.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('createEvent.alert.startEarly.confirm'),
          onPress: async () => {
            try {
              if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
              skipSaveOnLeaveRef.current = true;

              const liveEvent = await startEventLive(existingEvent.id);
              await logActivity(existingEvent.id, {
                type: 'event_started',
                icon: 'play',
                text: 'Event started early by host',
                hostName: user?.providerInfo?.organizationName || user?.name || 'Host',
                avatar: user?.providerInfo?.partyLogo || user?.profilePicture || null,
              });
              navigation.reset({
                index: 1,
                routes: [
                  { name: 'ManageEvents', params: { initialTab: 'live' } },
                  { name: 'LiveEventStats', params: { event: liveEvent } },
                ],
              });
            } catch (error) {
              console.error('Error starting event early:', error);
              Alert.alert(t('common.error'), t('createEvent.alert.startEarly.failed'));
            }
          },
        },
      ],
    );
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
          <View style={styles.headerSide}>
            <TouchableOpacity
              onPress={() => (editMode || viewMode ? navigation.goBack() : navigation.navigate('ManageEvents'))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.cancelButton}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {editMode
                ? t('createEvent.header.editTitle')
                : viewMode
                  ? t('createEvent.header.viewTitle')
                  : t('createEvent.header.newEvent')}
            </Text>
            {editMode && saveStatus !== 'idle' && (
              <View style={styles.saveIndicator}>
                {saveStatus === 'saving' && (
                  <>
                    <ActivityIndicator size="small" color="#4ade80" />
                    <Text style={styles.saveText}>{t('editProfile.saving')}</Text>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Icon name="check" type="feather" size={12} color="#4ade80" />
                    <Text style={[styles.saveText, styles.saveTextSuccess]}>{t('editProfile.saved')}</Text>
                  </>
                )}
                {saveStatus === 'error' && (
                  <Text style={[styles.saveText, styles.saveTextError]}>{t('editProfile.saveError')}</Text>
                )}
              </View>
            )}
          </View>

          <View style={[styles.headerSide, styles.headerSideRight]}>
            {editMode && isUpcoming && (
              <TouchableOpacity
                style={styles.headerStartEarly}
                onPress={handleStartEarly}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.headerStartEarlyText}>{t('createEvent.button.start')}</Text>
              </TouchableOpacity>
            )}
          </View>
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
                    <Text style={styles.editText}>{t('createEvent.image.edit')}</Text>
              </TouchableOpacity>
            </View>
              ) : (
              <TouchableOpacity 
                  style={styles.addImageContainer}
                onPress={pickImage}
              >
                  <Icon name="image" type="feather" size={40} color="#FFFFFF" />
                  <Text style={styles.addImageText}>{t('createEvent.image.addCover')}</Text>
              </TouchableOpacity>
              )}
              
              <View style={styles.hostInfoContainer}>
                <View style={styles.hostInfo}>
                  {user?.providerInfo?.partyLogo ? (
                    <Image 
                      source={{ uri: user.providerInfo.partyLogo }}
                      style={styles.hostAvatar}
                    />
                  ) : (
                    <View style={[styles.hostAvatar, styles.initialsContainer]}>
                      <Text style={styles.initialsText}>
                        {(user?.providerInfo?.organizationName || user?.name || 'A')
                          .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.hostedByText}>
                    {t('createEvent.hostedBy', {
                      name: user?.providerInfo?.organizationName || user?.name || t('createEvent.host.anonymous'),
                    })}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Event Title */}
            <View style={styles.inputSection}>
              <TextInput
                style={styles.titleInput}
                placeholder={t('createEvent.placeholder.title')}
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
                  <Text style={styles.dateTimeLabel}>{t('createEvent.label.date')}</Text>
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
                      <Text style={styles.dateTimeLabel}>{t('createEvent.label.startTime')}</Text>
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
                          <Text style={styles.dateTimeLabel}>{t('createEvent.label.endTime')}</Text>
                          <Text style={styles.dateTimeValue}>
                            {endTime ? formatTime(endTime) : t('createEvent.label.setTime')}
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
                      {hasEndTime ? t('createEvent.toggle.noEndTime') : t('createEvent.toggle.setEndTime')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            
            {/* Additional Details Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{t('createEvent.section.details')}</Text>
              
              <View style={styles.detailContainer}>
                <Text style={styles.detailLabel}>{t('createEvent.label.venue')}</Text>
                <TextInput
                  style={styles.detailInput}
                  placeholder={t('createEvent.placeholder.venue')}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={venue}
                  onChangeText={setVenue}
                />
              </View>

              <View style={styles.detailContainer}>
                <Text style={styles.detailLabel}>{t('createEvent.label.address')}</Text>
                <TextInput
                  ref={addrInputRef}
                  style={styles.detailInput}
                  placeholder={t('createEvent.placeholder.address')}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={street}
                  onChangeText={searchAddress}
                  autoCorrect={false}
                  onLayout={() => {
                    addrInputRef.current?.measureInWindow((x, y, w, h) => {
                      setAddrInputLayout({ x, y, w, h });
                    });
                  }}
                  onFocus={() => {
                    // Re-measure after KAV animation settles (~350ms)
                    setTimeout(() => {
                      addrInputRef.current?.measureInWindow((x, y, w, h) => {
                        setAddrInputLayout({ x, y, w, h });
                      });
                    }, 380);
                  }}
                />
              </View>

              {/* placeholder — suggestions rendered outside ScrollView below */}

            </View>

            {/* Description Section */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>{t('createEvent.label.description')}</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder={t('createEvent.placeholder.description')}
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Event Visibility Section */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>{t('createEvent.label.visibility')}</Text>
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
                  <Text style={styles.visibilityOptionTitle}>{t('createEvent.visibility.showOnExplore')}</Text>
                  <Text style={styles.visibilityOptionDescription}>
                    {t('createEvent.visibility.description')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Tickets Section */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>{t('createEvent.section.tickets')}</Text>
              {ticketTypes.map((ticket, index) => (
                <TicketTypeItem
                  key={ticket.id || `ticket-${index}`}
                  ticket={ticket}
                  index={index}
                  updateTicketType={updateTicketType}
                  removeTicketType={removeTicketType}
                  ticketTypes={ticketTypes}
                  addIncludeItem={addIncludeItem}
                  updateIncludeItem={updateIncludeItem}
                  removeIncludeItem={removeIncludeItem}
                  viewMode={viewMode}
                  toggleTicketFree={toggleTicketFree}
                />
              ))}
              
              {(editMode || !viewMode) && (
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
                  <Text style={styles.addTicketText}>{t('createEvent.ticket.button.addType')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {editMode && (
              <Text style={styles.autoSaveHint}>{t('createEvent.autoSaveHint')}</Text>
            )}

            {!viewMode && !editMode && (
              <TouchableOpacity style={styles.nextButton} onPress={handleCreateEvent}>
                <Text style={styles.nextButtonText}>{t('common.next')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Address autocomplete dropdown — floats above form, keyboard stays up */}
      {addrSuggestions.length > 0 && addrInputLayout && (
        <View
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
        >
          <View style={[styles.addrDropdown, {
            position: 'absolute',
            top: addrInputLayout.y + addrInputLayout.h + 6,
            left: addrInputLayout.x,
            width: addrInputLayout.w,
          }]}>
            <ScrollView
              keyboardShouldPersistTaps="always"
              scrollEnabled
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 220 }}
            >
              {addrSuggestions.map((p, i) => (
                <TouchableOpacity
                  key={p.place_id}
                  style={[styles.addrRow, i > 0 && styles.addrRowBorder]}
                  onPress={() => selectAddress(p)}
                  activeOpacity={0.6}
                >
                  <View style={styles.addrDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addrMain} numberOfLines={1}>
                      {p.structured_formatting?.main_text || p.description.split(',')[0]}
                    </Text>
                    <Text style={styles.addrSub} numberOfLines={1}>
                      {p.structured_formatting?.secondary_text || ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

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
                  {showDatePicker ? t('createEvent.picker.selectDate') : (showStartTimePicker ? t('createEvent.picker.selectStartTime') : t('createEvent.picker.selectEndTime'))}
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
                title={t('common.confirm')}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerSide: {
    width: 80,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  saveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  saveText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  saveTextSuccess: {
    color: '#4ade80',
  },
  saveTextError: {
    color: '#f87171',
  },
  autoSaveHint: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
  headerStartEarly: {
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  headerStartEarlyText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
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
  addrDropdown: {
    backgroundColor: 'rgba(28,28,28,0.97)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  addrRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  addrDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4B8C',
    flexShrink: 0,
  },
  addrMain: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  addrSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
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
