import React, { useLayoutEffect } from 'react';
import {
  StyleSheet, View, ScrollView, TouchableOpacity,
  Image, Dimensions, Share, Platform,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { buildEventShareMessage, buildEventShareUrl } from '../utils/shareLinks';
import { syncEventForSharing } from '../services/eventsService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const { width, height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_H * 0.48);

const EventConfirmationScreen = ({ navigation, route }) => {
  const { eventData } = route.params;
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmt = (date, opts) =>
    date instanceof Date && !isNaN(date)
      ? date.toLocaleString(locale, opts)
      : '—';

  const dateStr = fmt(new Date(eventData.date), { weekday:'short', month:'short', day:'numeric' });
  const yearStr = fmt(new Date(eventData.date), { year:'numeric' });
  const timeStr = fmt(new Date(eventData.startTime), { hour:'numeric', minute:'2-digit', hour12:true });
  const endStr  = eventData.hasEndTime && eventData.endTime
    ? fmt(new Date(eventData.endTime), { hour:'numeric', minute:'2-digit', hour12:true })
    : null;

  const venue   = eventData.venue || eventData.address?.city || '—';
  const address = eventData.address?.formatted || eventData.address?.city || '';
  const heroImg = eventData.coverImage || eventData.flyers?.[0];

  // Ticket summary
  const paidTix    = eventData.tickets.filter(t => !t.isFree);
  const freeTix    = eventData.tickets.filter(t => t.isFree);
  const hasUnlim   = eventData.tickets.some(t => t.isUnlimited);
  const totalSpots = hasUnlim ? '∞' : eventData.tickets.reduce((s, t) => s + (t.quantity || 0), 0);
  const lowestPrice = paidTix.length > 0 ? Math.min(...paidTix.map(t => t.price)) : null;

  const handleShare = async () => {
    try {
      await syncEventForSharing(eventData, user?.id);
      const url = buildEventShareUrl(eventData.id);
      const message = buildEventShareMessage({
        event: eventData, t, locale, includeUrl: Platform.OS !== 'ios',
      });
      await Share.share(
        Platform.OS === 'ios'
          ? { message, url, title: eventData.title }
          : { message, title: eventData.title },
      );
    } catch {}
  };

  const handleViewEvent = () => navigation.navigate('EventDetails', { event: eventData });

  const handleDashboard = () =>
    navigation.reset({ index: 0, routes: [{ name: 'Profile' }] });

  return (
    <View style={st.root}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        bounces
      >
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <View style={[st.hero, { height: HERO_H }]}>
          {heroImg ? (
            <Image source={{ uri: heroImg }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1a1a' }]} />
          )}

          {/* Dark gradient over image */}
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)', '#0a0a0a']}
            style={StyleSheet.absoluteFill}
          />

          {/* Floating nav */}
          <View style={[st.nav, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={st.navBtn} onPress={handleDashboard} activeOpacity={0.8}>
              <Icon name="x" type="feather" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} activeOpacity={0.7} hitSlop={{top:10,bottom:10,left:10,right:10}}>
              <Icon name="share" type="feather" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Hero text */}
          <View style={st.heroText}>
            <Text style={st.heroTitle} numberOfLines={3}>{eventData.title}</Text>
            <View style={st.heroSubRow}>
              <Text style={st.heroSub}>Your event is published and ready for attendees</Text>
              <View style={st.greenCheck}>
                <Icon name="check" type="feather" size={11} color="#fff" />
              </View>
            </View>
          </View>
        </View>

        {/* ── Info strip (3-column, matches EventDetails) ────────────────── */}
        <View style={st.infoCard}>
          <TouchableOpacity style={st.infoBlock} onPress={() => {}} activeOpacity={0.7}>
            <Text style={st.infoLabel}>VENUE</Text>
            <Text style={st.infoBig} numberOfLines={1}>{venue}</Text>
            {!!address && <Text style={st.infoSub} numberOfLines={1}>{address}</Text>}
          </TouchableOpacity>
          <View style={st.infoSep} />
          <View style={st.infoBlock}>
            <Text style={st.infoLabel}>DATE</Text>
            <Text style={st.infoBig}>{dateStr}</Text>
            <Text style={st.infoSub}>{yearStr}</Text>
          </View>
          <View style={st.infoSep} />
          <View style={st.infoBlock}>
            <Text style={st.infoLabel}>TIME</Text>
            <Text style={st.infoBig}>{timeStr}</Text>
            {endStr && <Text style={st.infoSub}>ends {endStr}</Text>}
          </View>
        </View>

        {/* ── Ticket summary ─────────────────────────────────────────────── */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Ticket Summary</Text>
          <View style={st.card}>
            {eventData.tickets.map((tix, i) => (
              <View key={tix.id} style={[st.tixRow, i > 0 && st.tixRowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={st.tixName}>{tix.name}</Text>
                  <Text style={st.tixMeta}>
                    {tix.isUnlimited ? 'Unlimited' : `${tix.quantity} spots`}
                  </Text>
                </View>
                <Text style={st.tixPrice}>
                  {tix.isFree ? 'Free' : `$${Number(tix.price).toFixed(2)}`}
                </Text>
              </View>
            ))}
            <View style={st.tixFooter}>
              <Text style={st.tixFooterLabel}>Total capacity</Text>
              <Text style={st.tixFooterVal}>{String(totalSpots)}</Text>
            </View>
            {lowestPrice !== null && (
              <View style={[st.tixFooter, { marginTop: 4 }]}>
                <Text style={st.tixFooterLabel}>Starting at</Text>
                <Text style={[st.tixFooterVal, { color: '#FF4B8C' }]}>${lowestPrice.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Verification code ──────────────────────────────────────────── */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Check-in Code</Text>
          <View style={st.card}>
            <Text style={st.codeHint}>Give this to your security — they enter it to start scanning attendee tickets at the door</Text>
            <View style={st.codeWrap}>
              <Text style={st.code}>{eventData.verificationCode}</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      <View style={[st.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={st.primaryBtn} onPress={handleViewEvent} activeOpacity={0.85}>
          <LinearGradient
            colors={['#FF4B8C', '#d63072']}
            style={st.primaryGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={st.primaryBtnTxt}>View Event</Text>
            <Icon name="arrow-right" type="feather" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CARD_BG   = '#141414';
const BORDER    = 'rgba(255,255,255,0.08)';
const LABEL_CLR = 'rgba(255,255,255,0.4)';

const st = StyleSheet.create({
  root: { flex:1, backgroundColor:'#0a0a0a' },

  // Hero
  hero:      { width, position:'relative' },
  nav:       { position:'absolute', top:0, left:0, right:0, flexDirection:'row', justifyContent:'space-between', paddingHorizontal:16, zIndex:10 },
  navBtn:    { width:36, height:36, borderRadius:12, backgroundColor:'rgba(0,0,0,0.45)', alignItems:'center', justifyContent:'center' },
  heroText:  { position:'absolute', bottom:0, left:0, right:0, padding:20 },
  heroTitle:   { fontSize:28, fontWeight:'800', color:'#fff', lineHeight:34, marginBottom:8, textTransform:'uppercase' },
  heroSubRow:  { flexDirection:'row', alignItems:'center', gap:8 },
  heroSub:     { fontSize:13, color:'rgba(255,255,255,0.55)', fontWeight:'500', flex:1 },
  greenCheck:  {
    width:22, height:22, borderRadius:11,
    backgroundColor:'#22c55e',
    alignItems:'center', justifyContent:'center',
    flexShrink:0,
    ...Platform.select({ ios:{ shadowColor:'#22c55e', shadowOffset:{width:0,height:0}, shadowOpacity:0.6, shadowRadius:6 }, android:{ elevation:4 } }),
  },

  // Info strip
  infoCard: {
    flexDirection:'row', marginHorizontal:16, marginTop:16, marginBottom:8,
    backgroundColor:CARD_BG, borderRadius:16,
    borderWidth:1, borderColor:BORDER,
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:8 }, android:{ elevation:4 } }),
  },
  infoBlock: { flex:1, paddingVertical:16, paddingHorizontal:14 },
  infoLabel: { fontSize:9, fontWeight:'700', color:LABEL_CLR, letterSpacing:0.8, textTransform:'uppercase', marginBottom:5 },
  infoBig:   { fontSize:13, fontWeight:'700', color:'#fff', marginBottom:2 },
  infoSub:   { fontSize:11, color:LABEL_CLR },
  infoSep:   { width:1, backgroundColor:BORDER, marginVertical:14 },

  // Sections
  section:      { paddingHorizontal:16, marginTop:20 },
  sectionTitle: { fontSize:13, fontWeight:'700', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 },
  card: {
    backgroundColor:CARD_BG, borderRadius:16, padding:16,
    borderWidth:1, borderColor:BORDER,
  },

  // Ticket rows
  tixRow:       { flexDirection:'row', alignItems:'center', paddingVertical:12 },
  tixRowBorder: { borderTopWidth:1, borderTopColor:BORDER },
  tixName:      { fontSize:14, fontWeight:'600', color:'#fff', marginBottom:2 },
  tixMeta:      { fontSize:12, color:LABEL_CLR },
  tixPrice:     { fontSize:15, fontWeight:'700', color:'#fff' },
  tixFooter:    { flexDirection:'row', justifyContent:'space-between', borderTopWidth:1, borderTopColor:BORDER, paddingTop:12, marginTop:4 },
  tixFooterLabel: { fontSize:13, color:LABEL_CLR },
  tixFooterVal:   { fontSize:13, fontWeight:'700', color:'#fff' },

  // Code
  codeHint:  { fontSize:13, color:LABEL_CLR, marginBottom:14, textAlign:'center' },
  codeWrap:  { backgroundColor:'rgba(255,255,255,0.05)', borderRadius:12, paddingVertical:18, alignItems:'center', borderWidth:1, borderColor:BORDER },
  code:      { fontSize:30, fontWeight:'800', color:'#fff', letterSpacing:10 },

  // Bottom bar
  bottomBar: {
    position:'absolute', bottom:0, left:0, right:0,
    flexDirection:'row', gap:10, paddingHorizontal:16, paddingTop:14,
    backgroundColor:'rgba(10,10,10,0.97)',
    borderTopWidth:1, borderTopColor:BORDER,
  },
  primaryBtn:  { flex:1, borderRadius:14, overflow:'hidden' },
  primaryGrad: { height:52, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 },
  primaryBtnTxt: { fontSize:16, fontWeight:'700', color:'#fff' },
});

export default EventConfirmationScreen;
