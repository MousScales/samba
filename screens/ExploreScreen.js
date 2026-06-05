import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
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
import CustomNavBar from '../components/CustomNavBar';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

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
const GOOGLE_KEY   = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Bottom sheet snap positions (translateY from top of screen)
const SNAP_PEEK = SCREEN_H * 0.62;
const SNAP_HALF = SCREEN_H * 0.42;
const SNAP_FULL = 110;

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
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

// ─── Mini calendar ────────────────────────────────────────────────────────────
const DAY_KEYS   = ['su','mo','tu','we','th','fr','sa'];
const MONTH_KEYS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const CAL_CELL   = (width - 40 - 16) / 7;

const InlineCalendar = ({ selected, onSelect }) => {
  const { t } = useLanguage();
  const today = new Date();
  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth());

  const prevMo = () => mo === 0  ? (setMo(11), setYr(y=>y-1)) : setMo(m=>m-1);
  const nextMo = () => mo === 11 ? (setMo(0),  setYr(y=>y+1)) : setMo(m=>m+1);
  const first  = new Date(yr, mo, 1).getDay();
  const days   = new Date(yr, mo+1, 0).getDate();
  const cells  = Array(first).fill(null).concat(Array.from({length:days},(_,i)=>i+1));
  while (cells.length % 7 !== 0) cells.push(null);
  const isSel  = d => selected && selected.getDate()===d && selected.getMonth()===mo && selected.getFullYear()===yr;
  const isTdy  = d => d===today.getDate() && mo===today.getMonth() && yr===today.getFullYear();

  return (
    <View style={calSt.cal}>
      <View style={calSt.nav}>
        <TouchableOpacity onPress={prevMo} hitSlop={{top:10,bottom:10,left:10,right:10}}>
          <Icon name="chevron-left" type="feather" size={20} color="#FFF"/>
        </TouchableOpacity>
        <Text style={calSt.label}>{t(`calendar.months.${MONTH_KEYS[mo]}`)} {yr}</Text>
        <TouchableOpacity onPress={nextMo} hitSlop={{top:10,bottom:10,left:10,right:10}}>
          <Icon name="chevron-right" type="feather" size={20} color="#FFF"/>
        </TouchableOpacity>
      </View>
      <View style={calSt.row}>
        {DAY_KEYS.map(d => <Text key={d} style={calSt.dayH}>{t(`calendar.daysShort.${d}`)}</Text>)}
      </View>
      {Array.from({length:cells.length/7},(_,r)=>(
        <View key={r} style={calSt.row}>
          {cells.slice(r*7,r*7+7).map((d,i)=>(
            <TouchableOpacity key={i} style={[calSt.cell,d&&isSel(d)&&calSt.selCell]}
              onPress={()=>d&&onSelect(new Date(yr,mo,d))} disabled={!d} activeOpacity={d?0.7:1}>
              {d ? <Text style={[calSt.cellTxt,isTdy(d)&&calSt.todayTxt,isSel(d)&&calSt.selTxt]}>{d}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      ))}
      {selected && (
        <TouchableOpacity style={calSt.clear} onPress={()=>onSelect(null)}>
          <Text style={calSt.clearTxt}>{t('explore.calendar.clearFilter')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
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
  const { userLocation }  = useAuth();
  const { getUpcomingEvents, getLiveEvents } = useEvents();
  const mapRef = useRef(null);

  const [query,       setQuery]      = useState('');
  const [dateFilter,  setDateFilter] = useState(null);
  const [calOpen,     setCalOpen]    = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const calAnim = useRef(new Animated.Value(0)).current;

  // ── Sheet drag ──────────────────────────────────────────────────────────────
  const sheetY    = useRef(new Animated.Value(SNAP_PEEK)).current;
  const sheetYVal = useRef(SNAP_PEEK);
  sheetY.addListener(({ value }) => { sheetYVal.current = value; });

  const snapTo = (y) =>
    Animated.spring(sheetY, { toValue:y, tension:60, friction:14, useNativeDriver:true }).start();

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

  // ── Map initial region — center on user, zoom to show nearby pins ──────────
  const initialRegion = useMemo(() => {
    const baseLat = userLocation?.latitude  ?? 40.7128;
    const baseLng = userLocation?.longitude ?? -74.006;

    // Find pins within ~100 miles of user
    const nearby = pinEvents.filter(e => {
      const dlat = e._coords.latitude  - baseLat;
      const dlng = e._coords.longitude - baseLng;
      return Math.sqrt(dlat * dlat + dlng * dlng) < 2; // ~140 miles
    });

    if (nearby.length > 0) {
      const lats = nearby.map(e => e._coords.latitude);
      const lngs = nearby.map(e => e._coords.longitude);
      const minLat = Math.min(...lats, baseLat);
      const maxLat = Math.max(...lats, baseLat);
      const minLng = Math.min(...lngs, baseLng);
      const maxLng = Math.max(...lngs, baseLng);
      return {
        latitude:       (minLat + maxLat) / 2,
        longitude:      (minLng + maxLng) / 2,
        latitudeDelta:  Math.max((maxLat - minLat) * 1.4, 0.08),
        longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.08),
      };
    }

    return { latitude: baseLat, longitude: baseLng, latitudeDelta: 0.15, longitudeDelta: 0.15 };
  }, [userLocation, pinEvents]);

  // When user location becomes available, animate map there
  useEffect(() => {
    if (userLocation?.latitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude:       userLocation.latitude,
        longitude:      userLocation.longitude,
        latitudeDelta:  0.12,
        longitudeDelta: 0.12,
      }, 800);
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allEvents.filter(ev => {
      if (dateFilter && ev.rawDate && !sameDay(ev.rawDate, dateFilter)) return false;
      if (!q) return true;
      return ev.title.toLowerCase().includes(q) ||
        (ev.location||'').toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q) ||
        ev.date.toLowerCase().includes(q);
    });
  }, [allEvents, query, dateFilter]);

  const handleEventPress = ev => navigation.navigate('EventDetails', { event: ev.originalEvent });

  const openCal  = () => { setCalOpen(true);  Animated.spring(calAnim,{toValue:1,useNativeDriver:false,tension:55,friction:10}).start(); };
  const closeCal = () => { Animated.spring(calAnim,{toValue:0,useNativeDriver:false,tension:70,friction:12}).start(()=>setCalOpen(false)); };

  const selectedEvent = selectedPin ? allEvents.find(e => e.id === selectedPin) : null;

  const renderItem = useCallback(({ item }) => (
    <SmallEventCard event={item} onPress={() => handleEventPress(item)} />
  ), []);

  return (
    <View style={{ flex:1, backgroundColor:'#000' }}>
      <StatusBar barStyle="light-content" />

      {/* ── Map: Leaflet (iOS/Expo Go) or react-native-maps (Android native) ── */}
      {useNativeMap ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          customMapStyle={DARK_MAP}
          initialRegion={initialRegion}
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
        // Leaflet via WebView — works in Expo Go and iOS without Google Maps SDK compiled in
        <LeafletMap
          ref={mapRef}
          initialRegion={initialRegion}
          pinEvents={pinEvents}
          selectedPin={selectedPin}
          onMarkerPress={id => setSelectedPin(prev => prev === id ? null : id)}
          onMapPress={() => setSelectedPin(null)}
          userLocation={userLocation}
        />
      )}

      {/* Gradient fade at bottom toward sheet */}
      <LinearGradient
        colors={['transparent','transparent','rgba(0,0,0,0.4)','#000']}
        style={[StyleSheet.absoluteFill, { pointerEvents:'none' }]}
      />

      {/* Selected event card floats above the sheet */}
      {selectedEvent && (
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
      {userLocation?.latitude && (
        <TouchableOpacity
          style={[mapSt.locBtn, { top: insets.top + 14 }]}
          onPress={() => mapRef.current?.animateToRegion?.({
            latitude:      userLocation.latitude,
            longitude:     userLocation.longitude,
            latitudeDelta: 0.08,
            longitudeDelta:0.08,
          }, 500)}
          activeOpacity={0.8}
        >
          <Icon name="crosshair" type="feather" size={15} color="#fff"/>
        </TouchableOpacity>
      )}

      {/* ── Draggable bottom sheet ───────────────────────────────────────── */}
      <Animated.View style={[sheetSt.sheet, { transform:[{ translateY: sheetY }] }]}>
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={sheetSt.handleArea}>
          <View style={sheetSt.handle}/>
        </View>

        {/* Search + calendar */}
        <View style={sheetSt.searchRow}>
          <View style={sheetSt.searchBar}>
            <Icon name="search" type="feather" size={16} color="rgba(255,255,255,0.4)" style={{marginRight:8}}/>
            <TextInput
              style={sheetSt.searchInput}
              placeholder="Search events…"
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
            style={[sheetSt.calBtn, (calOpen||dateFilter) && sheetSt.calBtnActive]}
            onPress={calOpen ? closeCal : openCal}
            activeOpacity={0.8}
          >
            <Icon name="calendar" type="feather" size={16} color={(calOpen||dateFilter)?'#FF4B8C':'rgba(255,255,255,0.6)'}/>
          </TouchableOpacity>
        </View>

        {/* Inline calendar */}
        <Animated.View style={{
          maxHeight: calAnim.interpolate({inputRange:[0,1],outputRange:[0,300]}),
          opacity:   calAnim.interpolate({inputRange:[0,0.3,1],outputRange:[0,1,1]}),
          overflow:'hidden', paddingHorizontal:20,
        }} pointerEvents={calOpen ? 'auto' : 'none'}>
          <InlineCalendar selected={dateFilter} onSelect={d=>{ setDateFilter(d); if(d) closeCal(); }}/>
        </Animated.View>

        {/* Active date chip */}
        {dateFilter && !calOpen && (
          <View style={sheetSt.dateChip}>
            <Icon name="calendar" type="feather" size={11} color="#FF4B8C" style={{marginRight:4}}/>
            <Text style={sheetSt.dateChipTxt}>
              {dateFilter.toLocaleDateString(locale,{month:'short',day:'numeric',year:'numeric'})}
            </Text>
            <TouchableOpacity onPress={()=>setDateFilter(null)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Icon name="x" type="feather" size={12} color="rgba(255,255,255,0.5)" style={{marginLeft:6}}/>
            </TouchableOpacity>
          </View>
        )}

        <View style={sheetSt.countRow}>
          <Text style={sheetSt.countTxt}>{filtered.length} event{filtered.length !== 1 ? 's' : ''}</Text>
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
              <Text style={{fontSize:16,color:'rgba(255,255,255,0.3)',marginTop:14,fontWeight:'600'}}>No events found</Text>
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
    backgroundColor:'#0d0d0d',
    borderTopLeftRadius:28, borderTopRightRadius:28,
    ...Platform.select({
      ios:{ shadowColor:'#000', shadowOffset:{width:0,height:-6}, shadowOpacity:0.5, shadowRadius:20 },
      android:{ elevation:20 },
    }),
  },
  handleArea:   { paddingVertical:12, alignItems:'center' },
  handle:       { width:36, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.18)' },
  searchRow:    { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:16, marginBottom:10 },
  searchBar:    { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.07)', borderRadius:14, borderWidth:1, borderColor:'rgba(255,255,255,0.1)', paddingHorizontal:12, height:42 },
  searchInput:  { flex:1, fontSize:14, color:'#fff', fontWeight:'500' },
  calBtn:       { width:42, height:42, borderRadius:14, backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.1)', alignItems:'center', justifyContent:'center' },
  calBtnActive: { backgroundColor:'rgba(255,75,140,0.15)', borderColor:'rgba(255,75,140,0.3)' },
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

// ─── Calendar styles ──────────────────────────────────────────────────────────
const calSt = StyleSheet.create({
  cal:     { paddingTop:8, paddingBottom:8 },
  nav:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  label:   { fontSize:14, fontWeight:'700', color:'#fff' },
  row:     { flexDirection:'row', justifyContent:'space-around', marginBottom:4 },
  dayH:    { width:CAL_CELL, textAlign:'center', fontSize:11, fontWeight:'600', color:'rgba(255,255,255,0.3)' },
  cell:    { width:CAL_CELL, height:CAL_CELL, alignItems:'center', justifyContent:'center', borderRadius:CAL_CELL/2 },
  selCell: { backgroundColor:'#FF4B8C' },
  cellTxt: { fontSize:13, fontWeight:'500', color:'#fff' },
  todayTxt:{ color:'#FF4B8C', fontWeight:'700' },
  selTxt:  { color:'#fff', fontWeight:'700' },
  clear:   { alignSelf:'center', marginTop:8, paddingVertical:6, paddingHorizontal:16 },
  clearTxt:{ fontSize:13, color:'rgba(255,255,255,0.35)', fontWeight:'500' },
});
