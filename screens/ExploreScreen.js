import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  TextInput,
  Animated,
  PanResponder,
  StatusBar,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import LeafletMap from '../components/LeafletMap';
import RangeCalendar, {
  hasActiveRange,
  isDateInRange,
  formatDateRangeLabel,
} from '../components/RangeCalendar';
import { useFocusEffect } from '@react-navigation/native';
import CustomNavBar from '../components/CustomNavBar';
import SambaBackground from '../components/SambaBackground';
import { samba } from '../theme/samba';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getGoogleMapsApiKey } from '../config/env';

// ─── Environment detection ────────────────────────────────────────────────────
// react-native-maps with PROVIDER_GOOGLE requires native Google Maps SDK compiled in.
// Fall back to Leaflet (WebView) for Expo Go and iOS until dev client is rebuilt.
let MapView = null, Marker = null, PROVIDER_GOOGLE = null;
let nativeMapsAvailable = false;
try {
  const RNMaps   = require('react-native-maps');
  MapView        = RNMaps.default;
  Marker         = RNMaps.Marker;
  PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE;
  // Verify the native module is actually linked (not just JS stub)
  nativeMapsAvailable = !!MapView?.render || typeof MapView === 'function';
} catch (_) {}

// Google Maps SDK on iOS needs a special compiled build — use Leaflet there for now
const useNativeMap = nativeMapsAvailable && Platform.OS === 'android';

const { width, height: SCREEN_H } = Dimensions.get('window');
const CARD_WIDTH   = (width - 48) / 2;
const GOOGLE_KEY   = getGoogleMapsApiKey();

// Bottom sheet snap positions (translateY from top of screen)
const SNAP_PEEK = SCREEN_H * 0.62;
const SNAP_HALF = SCREEN_H * 0.42;
const SNAP_FULL = 110;
const USER_MAP_DELTA = 0.1;

// ─── Dark map style ───────────────────────────────────────────────────────────
const DARK_MAP = [
  { elementType:'geometry',           stylers:[{ color:'#141414' }] },
  { elementType:'labels.text.stroke', stylers:[{ color:'#141414' }] },
  { elementType:'labels.text.fill',   stylers:[{ color:'#555' }] },
  { featureType:'road',               elementType:'geometry',       stylers:[{ color:'#2c2c2c' }] },
  { featureType:'road.arterial',      elementType:'geometry',       stylers:[{ color:'#333' }] },
  { featureType:'road.highway',       elementType:'geometry',       stylers:[{ color:'#3d3d3d' }] },
  { featureType:'water',              elementType:'geometry',       stylers:[{ color:'#080808' }] },
  { featureType:'poi',                stylers:[{ visibility:'off' }] },
  { featureType:'transit',            stylers:[{ visibility:'off' }] },
  { featureType:'administrative',     elementType:'geometry',       stylers:[{ color:'#1f1f1f' }] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EXPLORE_CATEGORIES = [
  { key: 'all', patterns: null },
  { key: 'music', patterns: ['music', 'concert'] },
  { key: 'nightlife', patterns: ['nightlife'] },
  { key: 'food', patterns: ['food', 'drink'] },
  { key: 'arts', patterns: ['arts', 'culture'] },
  { key: 'sports', patterns: ['sport', 'fitness'] },
  { key: 'festivals', patterns: ['festival'] },
  { key: 'comedy', patterns: ['comedy'] },
  { key: 'tech', patterns: ['tech', 'technology', 'science'] },
  { key: 'outdoor', patterns: ['outdoor', 'travel'] },
];

const matchesCategory = (category, patterns) => {
  if (!patterns) return true;
  const value = (category || '').toLowerCase();
  return patterns.some((pattern) => value.includes(pattern));
};

// ─── Small event card ─────────────────────────────────────────────────────────
const SmallEventCard = ({ event, onPress }) => {
  const { t } = useLanguage();
  return (
    <TouchableOpacity style={cardSt.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: event.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover"/>
      <LinearGradient colors={['transparent','rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill}/>
      <Text style={cardSt.cat}>{event.category?.toUpperCase()}</Text>
      <View style={cardSt.bottom}>
        <Text style={cardSt.title} numberOfLines={2}>{event.title}</Text>
        <View style={cardSt.row}>
          <Icon name="map-pin" type="feather" size={10} color="rgba(255,255,255,0.7)" style={{marginRight:3}}/>
          <Text style={cardSt.sub} numberOfLines={1}>{event.location || t('common.venueTbd')}</Text>
        </View>
        <Text style={cardSt.date}>{event.date}{event.time ? `  ·  ${event.time}` : ''}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── ExploreScreen ────────────────────────────────────────────────────────────
export default function ExploreScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();
  const {
    userLocation,
    locationPermission,
    getCurrentLocation,
    requestLocationPermission,
  } = useAuth();
  const { getUpcomingEvents, getLiveEvents } = useEvents();
  const mapRef = useRef(null);
  const locationBootstrapped = useRef(false);
  const initialMapRegion = useRef(null);

  const centerMapOnUser = useCallback((lat, lng) => {
    if (!lat || !lng || !mapRef.current?.animateToRegion) return;
    mapRef.current.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: USER_MAP_DELTA,
      longitudeDelta: USER_MAP_DELTA,
    }, 500);
  }, []);

  // Fetch location once if we don't have coords yet — never auto-recenter after that
  useFocusEffect(
    useCallback(() => {
      if (locationBootstrapped.current) return;
      if (userLocation?.latitude && userLocation?.longitude) {
        locationBootstrapped.current = true;
        return;
      }

      locationBootstrapped.current = true;
      (async () => {
        if (locationPermission === true) {
          await getCurrentLocation();
        } else if (locationPermission !== false) {
          await requestLocationPermission();
        }
      })();
    }, [locationPermission, getCurrentLocation, requestLocationPermission, userLocation?.latitude, userLocation?.longitude]),
  );

  const [query,           setQuery]          = useState('');
  const [dateRange,       setDateRange]      = useState({ start: null, end: null });
  const [categoryFilter,  setCategoryFilter] = useState('all');
  const [calOpen,         setCalOpen]        = useState(false);
  const [selectedPin,     setSelectedPin]    = useState(null);
  const calAnim = useRef(new Animated.Value(0)).current;

  const showMap = !!(userLocation?.latitude && userLocation?.longitude);

  // ── Sheet drag ──────────────────────────────────────────────────────────────
  const sheetY    = useRef(new Animated.Value(SNAP_PEEK)).current;
  const sheetYVal = useRef(SNAP_PEEK);
  sheetY.addListener(({ value }) => { sheetYVal.current = value; });

  const snapTo = (y) =>
    Animated.spring(sheetY, { toValue:y, tension:60, friction:14, useNativeDriver:true }).start();

  useEffect(() => {
    if (!showMap) {
      sheetY.setValue(0);
      setSelectedPin(null);
      return;
    }
    if (sheetYVal.current === 0) {
      snapTo(SNAP_PEEK);
    }
  }, [showMap, sheetY]);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant:   ()    => sheetY.setOffset(sheetYVal.current),
    onPanResponderMove:    (_, g) => sheetY.setValue(g.dy),
    onPanResponderRelease: (_, g) => {
      sheetY.flattenOffset();
      const cur = sheetYVal.current;
      if (g.vy < -0.5 || cur < (SNAP_HALF + SNAP_PEEK) / 2)
        snapTo(cur < (SNAP_FULL + SNAP_HALF) / 2 ? SNAP_FULL : SNAP_HALF);
      else
        snapTo(cur < (SNAP_PEEK + SNAP_HALF) / 2 ? SNAP_HALF : SNAP_PEEK);
    },
  })).current;

  // ── Events ──────────────────────────────────────────────────────────────────
  const allEvents = useMemo(() => {
    const raw = [...getUpcomingEvents(), ...getLiveEvents()]
      .filter(e => e.showOnExplore !== false)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return raw.map(event => {
      const paidTickets = event.tickets.filter(t => !t.isFree);
      const freeTickets = event.tickets.filter(t => t.isFree);
      let price = t('common.free');
      if (freeTickets.length > 0 && paidTickets.length > 0)
        price = t('home.priceFreeToPaid', { price: Math.min(...paidTickets.map(tk => tk.price)) });
      else if (paidTickets.length > 0)
        price = t('home.priceFrom', { price: Math.min(...paidTickets.map(tk => tk.price)) });

      const dateObj   = event.date ? (event.date instanceof Date ? event.date : new Date(event.date)) : null;
      const validDate = dateObj && !isNaN(dateObj.getTime());
      return {
        id:        event.id,
        title:     event.title,
        category:  event.category || t('common.event'),
        location:  event.venue || event.address?.formatted,
        price,
        date:  validDate ? dateObj.toLocaleDateString(locale,{weekday:'short',month:'short',day:'numeric'}) : t('common.dateTbd'),
        time:  validDate ? dateObj.toLocaleTimeString(locale,{hour:'numeric',minute:'2-digit',hour12:true}) : '',
        rawDate: dateObj,
        image: event.coverImage || event.flyers?.[0] || 'https://via.placeholder.com/300x200',
        originalEvent: event,
      };
    });
  }, [getUpcomingEvents, getLiveEvents, t, locale]);

  // ── Geocoding (Google Geocoding API) for events without coords ──────────────
  const geocacheRef = useRef({});
  const [geocodedCoords, setGeocodedCoords] = useState({});

  useEffect(() => {
    if (!allEvents.length) return;
    let cancelled = false;
    const geocodeOne = async (ev) => {
      if (ev.originalEvent?.address?.coordinates?.latitude) return;
      if (geocacheRef.current[ev.id]) return;
      const query =
        ev.originalEvent?.address?.formatted ||
        (ev.originalEvent?.address?.street
          ? `${ev.originalEvent.address.street}, ${ev.originalEvent.address.city || ''}, ${ev.originalEvent.address.state || ''}`
          : null) ||
        ev.originalEvent?.venue || ev.location;
      if (!query) return;
      try {
        const res  = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_KEY}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results?.[0]) {
          const { lat, lng } = data.results[0].geometry.location;
          geocacheRef.current[ev.id] = { latitude: lat, longitude: lng };
          if (!cancelled) setGeocodedCoords(p => ({ ...p, [ev.id]: { latitude: lat, longitude: lng } }));
        }
      } catch { /* skip */ }
    };
    allEvents.forEach((ev, i) => setTimeout(() => { if (!cancelled) geocodeOne(ev); }, i * 120));
    return () => { cancelled = true; };
  }, [allEvents]);

  // ── Pin events (events with resolved coords) ────────────────────────────────
  const pinEvents = useMemo(() =>
    allEvents.map(e => {
      const has = e.originalEvent?.address?.coordinates?.latitude;
      const c   = has ? e.originalEvent.address.coordinates : (geocodedCoords[e.id] ?? geocacheRef.current[e.id]);
      return c ? { ...e, _coords: c } : null;
    }).filter(Boolean).slice(0, 20),
  [allEvents, geocodedCoords]);

  const mapRegion = useMemo(() => {
    if (!userLocation?.latitude || !userLocation?.longitude) return null;
    if (!initialMapRegion.current) {
      initialMapRegion.current = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: USER_MAP_DELTA,
        longitudeDelta: USER_MAP_DELTA,
      };
    }
    return initialMapRegion.current;
  }, [userLocation?.latitude, userLocation?.longitude]);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const categoryPatterns = EXPLORE_CATEGORIES.find((c) => c.key === categoryFilter)?.patterns ?? null;
    return allEvents.filter(ev => {
      if (hasActiveRange(dateRange) && ev.rawDate && !isDateInRange(ev.rawDate, dateRange)) return false;
      if (!matchesCategory(ev.category, categoryPatterns)) return false;
      if (!q) return true;
      return ev.title.toLowerCase().includes(q) ||
        (ev.location||'').toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q) ||
        ev.date.toLowerCase().includes(q);
    });
  }, [allEvents, query, dateRange, categoryFilter]);

  const handleEventPress = ev => navigation.navigate('EventDetails', { event: ev.originalEvent });

  const openCal  = () => { setCalOpen(true);  Animated.spring(calAnim,{toValue:1,useNativeDriver:false,tension:55,friction:10}).start(); };
  const closeCal = () => { Animated.spring(calAnim,{toValue:0,useNativeDriver:false,tension:70,friction:12}).start(()=>setCalOpen(false)); };

  const selectedEvent = selectedPin ? allEvents.find(e => e.id === selectedPin) : null;

  const renderItem = useCallback(({ item }) => (
    <SmallEventCard event={item} onPress={() => handleEventPress(item)} />
  ), []);

  return (
    <View style={{ flex:1, backgroundColor: samba.bgDeep }}>
      <SambaBackground />
      <StatusBar barStyle="light-content" />

      {/* ── Map (only when user location is available) ── */}
      {showMap && mapRegion && (useNativeMap ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          customMapStyle={DARK_MAP}
          initialRegion={mapRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          toolbarEnabled={false}
          onPress={() => setSelectedPin(null)}
        >
          {pinEvents.map(ev => (
            <Marker
              key={ev.id}
              coordinate={{ latitude: ev._coords.latitude, longitude: ev._coords.longitude }}
              onPress={(e) => { e.stopPropagation(); setSelectedPin(ev.id); }}
            >
              <View style={mapSt.markerWrap}>
                <View style={[mapSt.markerBubble, selectedPin === ev.id && mapSt.markerBubbleSel]}>
                  <Icon name="calendar" type="feather" size={10} color="#fff"/>
                </View>
                <View style={[mapSt.markerTip, selectedPin === ev.id && mapSt.markerTipSel]}/>
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <LeafletMap
          ref={mapRef}
          initialRegion={mapRegion}
          pinEvents={pinEvents}
          selectedPin={selectedPin}
          onMarkerPress={id => setSelectedPin(prev => prev === id ? null : id)}
          onMapPress={() => setSelectedPin(null)}
          userLocation={userLocation}
        />
      ))}

      {showMap && (
        <LinearGradient
          colors={['transparent','transparent','rgba(0,0,0,0.4)','#000']}
          style={[StyleSheet.absoluteFill, { pointerEvents:'none' }]}
        />
      )}

      {/* Selected event card floats above the sheet */}
      {showMap && selectedEvent && (
        <TouchableOpacity
          style={[mapSt.pinCard, { bottom: SCREEN_H - SNAP_PEEK + 16 }]}
          onPress={() => { setSelectedPin(null); handleEventPress(selectedEvent); }}
          activeOpacity={0.9}
        >
          <Image source={{ uri: selectedEvent.image }} style={mapSt.pinCardImg} resizeMode="cover"/>
          <View style={mapSt.pinCardBody}>
            <Text style={mapSt.pinCardTitle} numberOfLines={1}>{selectedEvent.title}</Text>
            <Text style={mapSt.pinCardSub}   numberOfLines={1}>{selectedEvent.location || selectedEvent.date}</Text>
            <Text style={mapSt.pinCardPrice}>{selectedEvent.price}</Text>
          </View>
          <View style={mapSt.pinCardArrow}>
            <Icon name="arrow-right" type="feather" size={14} color="#FF4B8C"/>
          </View>
        </TouchableOpacity>
      )}

      {/* My location button — re-centers map to user location */}
      {showMap && userLocation?.latitude && (
        <TouchableOpacity
          style={[mapSt.locBtn, { top: insets.top + 14 }]}
          onPress={() => centerMapOnUser(userLocation.latitude, userLocation.longitude)}
          activeOpacity={0.8}
        >
          <Icon name="crosshair" type="feather" size={15} color="#fff"/>
        </TouchableOpacity>
      )}

      {/* ── Events panel — full page without map, draggable sheet with map ── */}
      <Animated.View style={[
        sheetSt.sheet,
        !showMap && sheetSt.sheetFullPage,
        { transform:[{ translateY: showMap ? sheetY : 0 }], paddingTop: showMap ? 0 : insets.top },
      ]}>
        {showMap && (
          <View {...panResponder.panHandlers} style={sheetSt.handleArea}>
            <View style={sheetSt.handle}/>
          </View>
        )}

        {!showMap && (
          <View style={sheetSt.listHeader}>
            <Text style={sheetSt.listHeaderTitle}>{t('nav.explore')}</Text>
          </View>
        )}

        {/* Search + calendar */}
        <View style={sheetSt.searchRow}>
          <View style={sheetSt.searchBar}>
            <Icon name="search" type="feather" size={16} color="rgba(255,255,255,0.4)" style={{marginRight:8}}/>
            <TextInput
              style={sheetSt.searchInput}
              placeholder={t('explore.searchPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Icon name="x" type="feather" size={14} color="rgba(255,255,255,0.4)"/>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[sheetSt.calBtn, (calOpen || hasActiveRange(dateRange)) && sheetSt.calBtnActive]}
            onPress={calOpen ? closeCal : openCal}
            activeOpacity={0.8}
          >
            <Icon name="calendar" type="feather" size={16} color={(calOpen || hasActiveRange(dateRange)) ? '#FF4B8C' : 'rgba(255,255,255,0.6)'}/>
          </TouchableOpacity>
        </View>

        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={sheetSt.categoriesScroll}
          contentContainerStyle={sheetSt.categoriesContent}
          keyboardShouldPersistTaps="handled"
        >
          {EXPLORE_CATEGORIES.map(({ key }) => {
            const active = categoryFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[sheetSt.categoryPill, active && sheetSt.categoryPillActive]}
                onPress={() => setCategoryFilter(key)}
                activeOpacity={0.75}
              >
                <Text style={[sheetSt.categoryLabel, active && sheetSt.categoryLabelActive]}>
                  {t(`explore.categories.${key}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Inline calendar */}
        <Animated.View style={{
          maxHeight: calAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 360] }),
          opacity:   calAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          overflow:'hidden', paddingHorizontal:20,
        }} pointerEvents={calOpen ? 'auto' : 'none'}>
          <RangeCalendar
            range={dateRange}
            onChange={setDateRange}
            onRangeComplete={closeCal}
            locale={locale}
          />
        </Animated.View>

        {/* Active date range chip */}
        {hasActiveRange(dateRange) && !calOpen && (
          <View style={sheetSt.dateChip}>
            <Icon name="calendar" type="feather" size={11} color="#FF4B8C" style={{marginRight:4}}/>
            <Text style={sheetSt.dateChipTxt}>
              {formatDateRangeLabel(dateRange, locale, t)}
            </Text>
            <TouchableOpacity onPress={() => setDateRange({ start: null, end: null })} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Icon name="x" type="feather" size={12} color="rgba(255,255,255,0.5)" style={{marginLeft:6}}/>
            </TouchableOpacity>
          </View>
        )}

        <View style={sheetSt.countRow}>
          <Text style={sheetSt.countTxt}>
            {t('explore.eventCount', { count: filtered.length })}
          </Text>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ justifyContent:'space-between', marginBottom:14 }}
          contentContainerStyle={{ paddingHorizontal:16, paddingTop:8, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={{alignItems:'center', marginTop:60}}>
              <Icon name="search" type="feather" size={36} color="rgba(255,255,255,0.15)"/>
              <Text style={{fontSize:16,color:'rgba(255,255,255,0.3)',marginTop:14,fontWeight:'600'}}>
                {t('explore.empty.title')}
              </Text>
              <Text style={{fontSize:13,color:'rgba(255,255,255,0.2)',marginTop:6,textAlign:'center'}}>
                {t('explore.empty.subtitle')}
              </Text>
            </View>
          }
        />
      </Animated.View>

      <CustomNavBar activeScreen="Explore"/>
    </View>
  );
}

// ─── Map marker styles ────────────────────────────────────────────────────────
const mapSt = StyleSheet.create({
  markerWrap:      { alignItems:'center' },
  markerBubble:    { width:28, height:28, borderRadius:14, backgroundColor:'#FF4B8C', alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:'#fff' },
  markerBubbleSel: { backgroundColor:'#c0305a', transform:[{scale:1.2}] },
  markerTip:       { width:0, height:0, borderLeftWidth:5, borderRightWidth:5, borderTopWidth:7, borderLeftColor:'transparent', borderRightColor:'transparent', borderTopColor:'#FF4B8C', marginTop:-1 },
  markerTipSel:    { borderTopColor:'#c0305a' },
  pinCard: {
    position:'absolute', left:16, right:16,
    flexDirection:'row', alignItems:'center', gap:10,
    backgroundColor:'rgba(18,18,18,0.97)',
    borderRadius:16, padding:12,
    borderWidth:1, borderColor:'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios:{ shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12 },
      android:{ elevation:8 },
    }),
  },
  pinCardImg:   { width:50, height:50, borderRadius:10, backgroundColor:'#222' },
  pinCardBody:  { flex:1 },
  pinCardTitle: { fontSize:13, fontWeight:'700', color:'#fff', marginBottom:2 },
  pinCardSub:   { fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:3 },
  pinCardPrice: { fontSize:12, fontWeight:'700', color:'#FF4B8C' },
  pinCardArrow: { width:28, height:28, borderRadius:14, backgroundColor:'rgba(255,75,140,0.15)', alignItems:'center', justifyContent:'center' },
  locBtn: {
    position:'absolute', right:14,
    width:36, height:36, borderRadius:10,
    backgroundColor:'rgba(0,0,0,0.65)',
    alignItems:'center', justifyContent:'center',
    borderWidth:1, borderColor:'rgba(255,255,255,0.15)',
  },
});

// ─── Sheet styles ─────────────────────────────────────────────────────────────
const sheetSt = StyleSheet.create({
  sheet: {
    position:'absolute', left:0, right:0,
    height: SCREEN_H + 40,
    backgroundColor: samba.bg,
    borderTopLeftRadius:28, borderTopRightRadius:28,
    ...Platform.select({
      ios:{ shadowColor:'#000', shadowOffset:{width:0,height:-6}, shadowOpacity:0.5, shadowRadius:20 },
      android:{ elevation:20 },
    }),
  },
  sheetFullPage: {
    top: 0,
    height: SCREEN_H,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    ...Platform.select({
      ios: { shadowOpacity: 0, shadowRadius: 0 },
      android: { elevation: 0 },
    }),
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listHeaderTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  handleArea:   { paddingVertical:12, alignItems:'center' },
  handle:       { width:36, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.18)' },
  searchRow:    { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:16, marginBottom:10 },
  searchBar:    { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.07)', borderRadius:14, borderWidth:1, borderColor:'rgba(255,255,255,0.1)', paddingHorizontal:12, height:42 },
  searchInput:  { flex:1, fontSize:14, color:'#fff', fontWeight:'500' },
  calBtn:       { width:42, height:42, borderRadius:14, backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)', alignItems:'center', justifyContent:'center' },
  calBtnActive: { backgroundColor:'rgba(255,75,140,0.15)', borderColor:'rgba(255,75,140,0.3)' },
  categoriesScroll: { flexGrow: 0, marginBottom: 6 },
  categoriesContent: { paddingHorizontal: 16, paddingBottom: 4, alignItems: 'center' },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: 'rgba(255,75,140,0.18)',
    borderColor: '#FF4B8C',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  categoryLabelActive: {
    color: '#FF4B8C',
  },
  dateChip:     { flexDirection:'row', alignItems:'center', alignSelf:'flex-start', marginHorizontal:16, marginBottom:8, backgroundColor:'rgba(255,75,140,0.12)', borderRadius:20, paddingHorizontal:12, paddingVertical:5, borderWidth:1, borderColor:'rgba(255,75,140,0.3)' },
  dateChipTxt:  { fontSize:12, fontWeight:'600', color:'#FF4B8C' },
  countRow:     { paddingHorizontal:16, marginBottom:4 },
  countTxt:     { fontSize:12, color:'rgba(255,255,255,0.3)', fontWeight:'500' },
});

// ─── Card styles ──────────────────────────────────────────────────────────────
const cardSt = StyleSheet.create({
  card:  { width:CARD_WIDTH, height:CARD_WIDTH*1.35, borderRadius:18, overflow:'hidden', backgroundColor:'#1a1a1a', ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.25, shadowRadius:8 }, android:{ elevation:6 } }) },
  cat:   { position:'absolute', top:10, left:10, fontSize:9, fontWeight:'700', color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:0.8 },
  bottom:{ position:'absolute', bottom:0, left:0, right:0, padding:10 },
  title: { fontSize:13, fontWeight:'700', color:'#fff', lineHeight:17, marginBottom:4, textTransform:'uppercase' },
  row:   { flexDirection:'row', alignItems:'center', marginBottom:2 },
  sub:   { fontSize:10, color:'rgba(255,255,255,0.7)', flex:1 },
  date:  { fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:'500' },
});
