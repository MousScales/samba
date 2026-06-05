import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet, View, ScrollView, TouchableOpacity,
  Dimensions, Platform, StatusBar,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated } from 'react-native';
import Svg, {
  Path, Defs, LinearGradient as SvgGradient, Stop,
  Rect, Circle, G, Line, Text as SvgText,
} from 'react-native-svg';
import CustomNavBar from '../components/CustomNavBar';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { formatCount } from '../utils/formatNumbers';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const CARD_PAD  = 20;
const CARD_W    = width - 40;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt$ = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
};
const pct = (a, b) => (b === 0 ? '0%' : `${Math.round((a / b) * 100)}%`);

const PERIODS = [
  { key: 'day' }, { key: 'week' },
  { key: 'month' }, { key: 'year' },
  { key: 'all' },
];

// ── SVG chart helpers ─────────────────────────────────────────────────────────
const smooth = (pts) => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]; const curr = pts[i];
    const cpx = ((prev.x + curr.x) / 2).toFixed(1);
    d += ` C ${cpx} ${prev.y.toFixed(1)}, ${cpx} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }
  return d;
};
const toPoints = (data, w, h, pad = 4) => {
  const max = Math.max(...data, 1);
  return data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + (1 - v / max) * (h - pad * 2),
  }));
};
const buildArea = (data, w, h) => {
  const pts  = toPoints(data, w, h);
  const line = smooth(pts);
  return `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${h} L ${pts[0].x.toFixed(1)} ${h} Z`;
};

// Seeded pseudo-random so charts look consistent
const sr = (seed) => {
  let s = seed % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
};
const mockRevSeries = (base, n, seed = 42) => {
  const rng = sr(seed); let acc = base * 0.4;
  return Array.from({ length: n }, (_, i) => {
    acc += (rng() - 0.35) * base * 0.3 + (i / n) * base * 0.04;
    return Math.max(0, acc);
  });
};

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionTitle = ({ children, style }) => (
  <Text style={[styles.sectionTitle, style]}>{children}</Text>
);

/** Sparkline used in the revenue card */
const Sparkline = ({ data, w, h = 54, color = '#FF4B8C' }) => {
  if (!data || data.length < 2) return null;
  const area = buildArea(data, w, h);
  const pts  = toPoints(data, w, h);
  const line = smooth(pts);
  const id   = 'spk';
  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Path d={area} fill={`url(#${id})`} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3.5} fill={color} />
    </Svg>
  );
};

/** Full area chart with grid + labels */
const AreaChart = ({ data, labels, w, h = 140, color = '#FF4B8C', formatY = (v) => fmt$(v) }) => {
  if (!data || data.length < 2) return null;
  const inner = { l: 46, r: 8, t: 10, b: 28 };
  const cw    = w - inner.l - inner.r;
  const ch    = h - inner.t - inner.b;
  const max   = Math.max(...data, 1);
  const pts   = data.map((v, i) => ({
    x: inner.l + (i / (data.length - 1)) * cw,
    y: inner.t + (1 - v / max) * ch,
  }));
  const line = smooth(pts);
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(inner.t + ch).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(inner.t + ch).toFixed(1)} Z`;
  const ticks = [0, 0.5, 1].map(f => ({ v: f * max, y: inner.t + (1 - f) * ch }));
  const shownLabels = labels ? [0, Math.floor(labels.length / 2), labels.length - 1].map(i => ({ i, label: labels[i] })) : [];
  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.28" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      {ticks.map((t, i) => (
        <G key={i}>
          <Line x1={inner.l} y1={t.y} x2={inner.l + cw} y2={t.y}
            stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
          <SvgText x={inner.l - 4} y={t.y + 4} fontSize={9} fill="rgba(255,255,255,0.3)"
            textAnchor="end">{formatY(t.v)}</SvgText>
        </G>
      ))}
      {shownLabels.map(({ i, label }) => (
        <SvgText key={i}
          x={pts[i]?.x ?? 0} y={h - 4}
          fontSize={9} fill="rgba(255,255,255,0.3)" textAnchor="middle">{label}</SvgText>
      ))}
      <Path d={area} fill="url(#ag)" />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill={color} />
    </Svg>
  );
};

/** Donut / ring chart */
const Donut = ({ segments, size = 130, thick = 18 }) => {
  const r      = (size - thick) / 2;
  const cx     = size / 2; const cy = size / 2;
  const circ   = 2 * Math.PI * r;
  const total  = segments.reduce((s, g) => s + g.value, 0) || 1;
  let offset   = 0;
  const gap    = 3; // degrees gap between segments
  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${cx},${cy}`}>
        {segments.map((seg, i) => {
          const frac    = seg.value / total;
          const gapFrac = gap / 360;
          const dash    = Math.max(0, (frac - gapFrac)) * circ;
          const space   = circ - dash;
          const el = (
            <Circle key={i}
              cx={cx} cy={cy} r={r}
              stroke={seg.color} strokeWidth={thick}
              fill="none"
              strokeDasharray={`${dash} ${space}`}
              strokeDashoffset={-offset * circ}
              strokeLinecap="round"
            />
          );
          offset += frac;
          return el;
        })}
      </G>
    </Svg>
  );
};

/** Horizontal bar row */
const HBar = ({ label, value, maxValue, color = '#FF4B8C', subLabel, barW }) => {
  const pct = maxValue > 0 ? value / maxValue : 0;
  const fill = Math.max(4, pct * barW);
  return (
    <View style={styles.hbarRow}>
      <Text style={styles.hbarLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.hbarTrack}>
        <View style={[styles.hbarFill, { width: fill, backgroundColor: color }]} />
      </View>
      <Text style={styles.hbarValue}>{subLabel ?? value}</Text>
    </View>
  );
};

/** Toggle switch */
const PermissionRow = ({ label, description, enabled, onToggle }) => (
  <TouchableOpacity style={styles.permRow} onPress={onToggle} activeOpacity={0.7}>
    <View style={styles.permInfo}>
      <Text style={styles.permLabel}>{label}</Text>
      <Text style={styles.permDesc}>{description}</Text>
    </View>
    <View style={[styles.toggle, enabled && styles.toggleOn]}>
      <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
    </View>
  </TouchableOpacity>
);

// ── Main screen ───────────────────────────────────────────────────────────────
const DashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user }                                     = useAuth();
  const { events, getLiveEvents, getUpcomingEvents, getPastEvents } = useEvents();

  const [activeSection, setActiveSection]   = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [periodOpen, setPeriodOpen]         = useState(false);
  const [displayValue, setDisplayValue]     = useState(0);
  const [permissions, setPermissions]       = useState({
    guestCheckIn: true, scanTickets: true, refundTickets: false,
    editEvents: false, viewRevenue: false, manageGuestList: true,
  });

  // RAF animation
  const rafRef     = useRef(null);
  const displayRef = useRef(0);
  const animateTo  = useCallback((target) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = displayRef.current; const DURATION = 500; const startTime = performance.now();
    const tick = (now) => {
      const t = Math.min((now - startTime) / DURATION, 1);
      const v = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      displayRef.current = v; setDisplayValue(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // Period picker animation
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const pillAnims   = useRef(PERIODS.map(() => ({
    opacity: new Animated.Value(0), tx: new Animated.Value(-12), scale: new Animated.Value(0.85),
  }))).current;

  const openPeriod = () => {
    setPeriodOpen(true);
    Animated.timing(chevronAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    PERIODS.forEach((_, i) => {
      Animated.spring(pillAnims[i].opacity, { toValue: 1, delay: i * 35, useNativeDriver: true }).start();
      Animated.spring(pillAnims[i].tx,      { toValue: 0, delay: i * 35, tension: 60, friction: 10, useNativeDriver: true }).start();
      Animated.spring(pillAnims[i].scale,   { toValue: 1, delay: i * 35, tension: 60, friction: 10, useNativeDriver: true }).start();
    });
  };
  const closePeriod = (cb) => {
    Animated.timing(chevronAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    [...PERIODS].reverse().forEach((p, i) => {
      const idx = PERIODS.findIndex(x => x.key === p.key);
      Animated.timing(pillAnims[idx].opacity, { toValue: 0, delay: i * 25, duration: 140, useNativeDriver: true }).start();
      Animated.timing(pillAnims[idx].tx,      { toValue: -12, delay: i * 25, duration: 140, useNativeDriver: true }).start();
      Animated.timing(pillAnims[idx].scale,   { toValue: 0.85, delay: i * 25, duration: 140, useNativeDriver: true }).start();
    });
    setTimeout(() => { setPeriodOpen(false); if (cb) cb(); }, 200);
  };
  const switchPeriod = (key) => {
    if (key === selectedPeriod) { closePeriod(); return; }
    closePeriod(() => setSelectedPeriod(key));
  };

  // Events data
  const myEvents        = useMemo(() => events.filter(e => e.organizer?.id === user?.id || e.organizerId === user?.id), [events, user]);
  const liveEvents      = useMemo(() => getLiveEvents().filter(e => e.organizer?.id === user?.id || e.organizerId === user?.id), [events]);
  const upcomingEvents  = useMemo(() => getUpcomingEvents().filter(e => e.organizer?.id === user?.id || e.organizerId === user?.id), [events]);
  const pastEvents      = useMemo(() => getPastEvents().filter(e => e.organizer?.id === user?.id || e.organizerId === user?.id), [events]);
  const totalTicketsSold = useMemo(() => myEvents.reduce((s, e) => s + (e.bookedSpots || 0), 0), [myEvents]);
  const totalCapacity    = useMemo(() => myEvents.reduce((s, e) => s + (e.tickets?.reduce((tc, t) => tc + (t.quantity || 0), 0) || 0), 0), [myEvents]);

  // Revenue per period
  const getRevenueForPeriod = useCallback((period) => {
    const now = new Date(); let start = null;
    if (period === 'day')   start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === 'week')  { start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0); }
    if (period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'year')  start = new Date(now.getFullYear(), 0, 1);
    return myEvents.reduce((sum, e) => {
      const rev = e.totalRevenue || 0;
      if (period === 'all' || !start) return sum + rev;
      return new Date(e.date) >= start ? sum + rev : sum;
    }, 0);
  }, [myEvents]);

  const revenueValue = useMemo(() => getRevenueForPeriod(selectedPeriod), [getRevenueForPeriod, selectedPeriod]);
  useEffect(() => { animateTo(revenueValue); }, [revenueValue]);

  // Chart data: use real total as seed for realistic-looking mock series
  const totalRevenue = myEvents.reduce((s, e) => s + (e.totalRevenue || 0), 0);
  const seed = Math.max(totalRevenue, myEvents.length * 100, 800);

  const sparkData   = useMemo(() => mockRevSeries(seed, 7, 7),   [seed]);
  const trend30     = useMemo(() => mockRevSeries(seed, 30, 30),  [seed]);
  const weeklyData  = useMemo(() => mockRevSeries(seed, 8,  8),   [seed]);

  const trend30Labels = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - 29 + i);
      return `${d.getMonth()+1}/${d.getDate()}`;
    });
  }, []);

  // Tickets by event (top 5)
  const topEvents = useMemo(() =>
    [...myEvents].sort((a, b) => (b.bookedSpots||0) - (a.bookedSpots||0)).slice(0, 5),
  [myEvents]);
  const maxTickets = Math.max(...topEvents.map(e => e.bookedSpots || 0), 1);

  // Revenue by event (top 5)
  const topRevEvents = useMemo(() =>
    [...myEvents].sort((a, b) => (b.totalRevenue||0) - (a.totalRevenue||0)).slice(0, 5),
  [myEvents]);
  const maxRev = Math.max(...topRevEvents.map(e => e.totalRevenue || 0), 1);

  // Donut segments
  const donutSegs = [
    { label: t('dashboard.legend.live'),      value: liveEvents.length,     color: '#4ade80' },
    { label: t('dashboard.legend.upcoming'),  value: upcomingEvents.length,  color: '#FF4B8C' },
    { label: t('dashboard.legend.past'),      value: pastEvents.length,      color: 'rgba(255,255,255,0.2)' },
  ].filter(s => s.value > 0);
  const donutTotal = donutSegs.reduce((s, g) => s + g.value, 0) || 1;

  // Guest mock
  const topReturners = useMemo(() => [
    { id: 0, name: 'Jordan Lee',    events: 8, ticketType: 'VIP',     spent: 640,  streak: 3 },
    { id: 1, name: 'Alex Rivera',   events: 6, ticketType: 'General', spent: 300,  streak: 2 },
    { id: 2, name: 'Morgan Chen',   events: 5, ticketType: 'VIP',     spent: 400,  streak: 5 },
    { id: 3, name: 'Taylor Kim',    events: 4, ticketType: 'General', spent: 200,  streak: 1 },
    { id: 4, name: 'Sam Patel',     events: 3, ticketType: 'VIP',     spent: 240,  streak: 0 },
    { id: 5, name: 'Casey Brooks',  events: 2, ticketType: 'General', spent: 100,  streak: 0 },
  ], []);

  const ticketTypeData = useMemo(() => {
    const base = Math.max(totalTicketsSold, 20);
    return [
      { label: t('dashboard.ticketTypes.general'),  count: Math.round(base * 0.52), color: '#FF4B8C' },
      { label: t('dashboard.ticketTypes.vip'),      count: Math.round(base * 0.28), color: '#a78bfa' },
      { label: t('dashboard.ticketTypes.student'),  count: Math.round(base * 0.14), color: '#4ade80' },
      { label: t('dashboard.ticketTypes.free'),     count: Math.round(base * 0.06), color: 'rgba(255,255,255,0.25)' },
    ];
  }, [totalTicketsSold, t]);

  const attendanceByEvent = useMemo(() =>
    [...myEvents]
      .sort((a, b) => (b.bookedSpots || 0) - (a.bookedSpots || 0))
      .slice(0, 5)
      .map(e => ({
        title: e.title || t('common.untitled'),
        sold: e.bookedSpots || 0,
        cap:  e.tickets?.reduce((s, t) => s + (t.quantity || 0), 0) || 0,
      })),
  [myEvents, t]);

  const togglePermission = (key) => setPermissions(p => ({ ...p, [key]: !p[key] }));
  const chevronRotate = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const BAR_W = CARD_W - CARD_PAD * 2 - 80;

  const sections = [
    { key: 'overview',    label: t('dashboard.tab.overview'),    icon: 'bar-chart-2' },
    { key: 'guests',      label: t('dashboard.tab.guests'),      icon: 'users' },
    { key: 'permissions', label: t('dashboard.tab.permissions'), icon: 'shield' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Lip */}
      <View style={[styles.lip, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.lipTitle}>{t('dashboard.title')}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {sections.map(s => (
          <TouchableOpacity key={s.key}
            style={[styles.tab, activeSection === s.key && styles.tabActive]}
            onPress={() => setActiveSection(s.key)} activeOpacity={0.7}>
            <Icon name={s.icon} type="feather" size={15}
              color={activeSection === s.key ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} />
            <Text style={[styles.tabText, activeSection === s.key && styles.tabTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled">

        {/* ════════════ OVERVIEW ════════════ */}
        {activeSection === 'overview' && (
          <>
            {/* ── Revenue card ── */}
            <View style={styles.card}>
              <TouchableOpacity style={styles.periodTrigger}
                onPress={periodOpen ? closePeriod : openPeriod} activeOpacity={0.7}>
                <Text style={styles.periodTriggerLabel}>
                  {t(`dashboard.period.${selectedPeriod}`)}
                </Text>
                <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                  <Icon name="chevron-right" type="feather" size={13} color="rgba(255,255,255,0.45)" />
                </Animated.View>
              </TouchableOpacity>

              {periodOpen && (
                <View style={styles.periodPills}>
                  {PERIODS.map((p, i) => (
                    <Animated.View key={p.key} style={{
                      opacity: pillAnims[i].opacity,
                      transform: [{ translateX: pillAnims[i].tx }, { scale: pillAnims[i].scale }],
                    }}>
                      <TouchableOpacity
                        style={[styles.periodPill, selectedPeriod === p.key && styles.periodPillActive]}
                        onPress={() => switchPeriod(p.key)} activeOpacity={0.7}>
                        <Text style={[styles.periodPillText, selectedPeriod === p.key && styles.periodPillTextActive]}>
                          {t(`dashboard.period.${p.key}`)}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                </View>
              )}

              <Text style={styles.revenueAmount}>{fmt$(displayValue)}</Text>
              <Text style={styles.revenueLabel}>
                {selectedPeriod === 'all'
                  ? t('dashboard.revenue.allTime')
                  : t('dashboard.revenue.thisPeriod', { period: t(`dashboard.period.${selectedPeriod}`) })}
              </Text>

              {/* Sparkline */}
              <View style={styles.sparkWrap}>
                <Sparkline data={sparkData} w={CARD_W - CARD_PAD * 2} h={58} color="#FF4B8C" />
              </View>

              {/* Mini stat row */}
              <View style={styles.miniStatRow}>
                {[
                  { label: t('dashboard.stats.events'), value: formatCount(myEvents.length) },
                  { label: t('dashboard.stats.tickets'), value: formatCount(totalTicketsSold) },
                  { label: t('dashboard.stats.fillRate'), value: pct(totalTicketsSold, totalCapacity) },
                ].map((s, i) => (
                  <View key={i} style={[styles.miniStat, i > 0 && styles.miniStatBorder]}>
                    <Text style={styles.miniStatValue}>{s.value}</Text>
                    <Text style={styles.miniStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Live pulse ── */}
            {liveEvents.length > 0 && (
              <View style={styles.liveCard}>
                <View style={styles.liveDot} />
                <Text style={styles.liveCardText}>
                  {t('dashboard.live.eventsLive', { count: liveEvents.length })}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('ManageEvents')} activeOpacity={0.7}>
                  <Text style={styles.liveCardLink}>{t('dashboard.live.viewLink')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── 30-day trend ── */}
            <View style={styles.card}>
              <SectionTitle style={styles.cardTitle}>{t('dashboard.chart.revenueTrend')}</SectionTitle>
              <AreaChart data={trend30} labels={trend30Labels}
                w={CARD_W - CARD_PAD * 2} h={150} color="#FF4B8C" />
            </View>

            {/* ── Weekly check-ins + event breakdown ── */}
            <View style={styles.rowCards}>
              {/* Weekly bars */}
              <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.cardTitle}>{t('dashboard.chart.weeklyCheckins')}</Text>
                <View style={{ marginTop: 10 }}>
                  <AreaChart data={weeklyData}
                    labels={['S','M','T','W','T','F','S','S']}
                    w={(CARD_W - 12) / 2 - CARD_PAD * 2}
                    h={90} color="#4ade80"
                    formatY={(v) => Math.round(v)} />
                </View>
              </View>

              {/* Donut */}
              <View style={[styles.card, styles.halfCard, { alignItems: 'center' }]}>
                <Text style={styles.cardTitle}>{t('dashboard.chart.events')}</Text>
                <View style={{ marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                  {donutSegs.length > 0 ? (
                    <>
                      <Donut segments={donutSegs} size={100} thick={16} />
                      <View style={{ position: 'absolute' }}>
                        <Text style={styles.donutCenter}>{myEvents.length}</Text>
                        <Text style={styles.donutSub}>{t('dashboard.chart.total')}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.donutEmpty}>
                      <Text style={styles.donutEmptyText}>{t('dashboard.chart.noEvents')}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.donutLegend}>
                  {donutSegs.map(s => (
                    <View key={s.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                      <Text style={styles.legendLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* ── Top events by tickets ── */}
            {topEvents.length > 0 && (
              <View style={styles.card}>
                <SectionTitle style={styles.cardTitle}>{t('dashboard.section.topTickets')}</SectionTitle>
                {topEvents.map((e, i) => (
                  <HBar key={e.id || i}
                    label={e.title || t('common.untitled')} value={e.bookedSpots || 0}
                    maxValue={maxTickets} color="#FF4B8C" barW={BAR_W} />
                ))}
              </View>
            )}

            {/* ── Top events by revenue ── */}
            {topRevEvents.length > 0 && (
              <View style={styles.card}>
                <SectionTitle style={styles.cardTitle}>{t('dashboard.section.topRevenue')}</SectionTitle>
                {topRevEvents.map((e, i) => (
                  <HBar key={e.id || i}
                    label={e.title || t('common.untitled')} value={e.totalRevenue || 0}
                    maxValue={maxRev} color="#a78bfa"
                    subLabel={fmt$(e.totalRevenue || 0)} barW={BAR_W} />
                ))}
              </View>
            )}

            {/* ── Capacity fill rings ── */}
            <View style={styles.card}>
              <SectionTitle style={styles.cardTitle}>{t('dashboard.section.capacity')}</SectionTitle>
              <View style={styles.fillRow}>
                {[
                  { label: t('dashboard.capacity.fillRate'),    value: totalCapacity > 0 ? totalTicketsSold / totalCapacity : 0, color: '#FF4B8C' },
                  { label: t('dashboard.capacity.liveEvents'),  value: myEvents.length > 0 ? liveEvents.length / myEvents.length : 0, color: '#4ade80' },
                  { label: t('dashboard.capacity.pastEvents'),  value: myEvents.length > 0 ? pastEvents.length / myEvents.length : 0, color: 'rgba(255,255,255,0.35)' },
                ].map(({ label, value, color }) => (
                  <View key={label} style={styles.fillItem}>
                    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                      <Donut segments={[
                        { value, color },
                        { value: Math.max(0, 1 - value), color: 'rgba(255,255,255,0.06)' },
                      ]} size={72} thick={10} />
                      <View style={{ position: 'absolute' }}>
                        <Text style={styles.fillPct}>{Math.round(value * 100)}%</Text>
                      </View>
                    </View>
                    <Text style={styles.fillLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ════════════ GUESTS ════════════ */}
        {activeSection === 'guests' && (
          <>
            {/* ── Pulse row ── */}
            <View style={styles.card}>
              <SectionTitle style={styles.cardTitle}>{t('dashboard.guests.pulse')}</SectionTitle>
              <View style={styles.pulseRow}>
                {[
                  { label: t('dashboard.guests.stats.totalGuests'),   value: formatCount(Math.max(totalTicketsSold, topReturners.reduce((s,g)=>s+g.events,0))), color: '#FFFFFF' },
                  { label: t('dashboard.guests.stats.returning'),       value: topReturners.filter(g => g.events > 1).length, color: '#a78bfa' },
                  { label: t('dashboard.guests.stats.checkinRate'),   value: '78%', color: '#4ade80' },
                  { label: t('dashboard.guests.stats.avgPerEvent'),   value: myEvents.length > 0 ? formatCount(Math.round(totalTicketsSold / Math.max(myEvents.length,1))) : '—', color: '#FF4B8C' },
                ].map(s => (
                  <View key={s.label} style={styles.pulseStat}>
                    <Text style={[styles.pulseStatValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={styles.pulseStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── New vs Returning ── */}
            <View style={styles.card}>
              <SectionTitle style={styles.cardTitle}>{t('dashboard.guests.newVsReturning')}</SectionTitle>
              <View style={styles.splitBar}>
                <View style={[styles.splitFill, { flex: 0.38, backgroundColor: '#FF4B8C' }]} />
                <View style={[styles.splitFill, { flex: 0.62, backgroundColor: '#a78bfa' }]} />
              </View>
              <View style={styles.splitLegend}>
                <View style={styles.splitLegendItem}>
                  <View style={[styles.splitDot, { backgroundColor: '#FF4B8C' }]} />
                  <Text style={styles.splitLegendLabel}>{t('dashboard.guests.legend.new')}  </Text>
                  <Text style={styles.splitLegendPct}>38%</Text>
                </View>
                <View style={styles.splitLegendItem}>
                  <View style={[styles.splitDot, { backgroundColor: '#a78bfa' }]} />
                  <Text style={styles.splitLegendLabel}>{t('dashboard.guests.legend.returning')}  </Text>
                  <Text style={styles.splitLegendPct}>62%</Text>
                </View>
              </View>
              <Text style={styles.splitInsight}>
                {t('dashboard.guests.insight')}
              </Text>
            </View>

            {/* ── Top Returners leaderboard ── */}
            <View style={styles.card}>
              <SectionTitle style={styles.cardTitle}>{t('dashboard.guests.topReturners')}</SectionTitle>
              {topReturners.map((g, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const barPct = g.events / topReturners[0].events;
                const avatarColors = ['#FF4B8C','#a78bfa','#4ade80','#FFD700','#60a5fa','#f97316'];
                return (
                  <View key={g.id} style={styles.returnerRow}>
                    <Text style={styles.returnerRank}>{medals[i] ?? `#${i+1}`}</Text>
                    <View style={[styles.returnerAvatar, { backgroundColor: `${avatarColors[i]}22` }]}>
                      <Text style={[styles.returnerAvatarText, { color: avatarColors[i] }]}>{g.name[0]}</Text>
                    </View>
                    <View style={styles.returnerInfo}>
                      <View style={styles.returnerNameRow}>
                        <Text style={styles.returnerName}>{g.name}</Text>
                        {g.streak >= 2 && (
                          <View style={styles.streakBadge}>
                            <Text style={styles.streakText}>🔥 {g.streak}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.returnerBarTrack}>
                        <View style={[styles.returnerBarFill, { width: `${barPct * 100}%`, backgroundColor: avatarColors[i] }]} />
                      </View>
                    </View>
                    <View style={styles.returnerRight}>
                      <Text style={styles.returnerEvents}>{g.events}</Text>
                      <Text style={styles.returnerEventsLabel}>{t('dashboard.guests.eventsLabel')}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ── Ticket type breakdown ── */}
            <View style={styles.card}>
              <SectionTitle style={styles.cardTitle}>{t('dashboard.guests.ticketTypes')}</SectionTitle>
              {ticketTypeData.map(t => {
                const total = ticketTypeData.reduce((s, x) => s + x.count, 0);
                const barPct = t.count / total;
                return (
                  <View key={t.label} style={styles.typeRow}>
                    <View style={[styles.typeDot, { backgroundColor: t.color }]} />
                    <Text style={styles.typeLabel}>{t.label}</Text>
                    <View style={styles.typeTrack}>
                      <View style={[styles.typeFill, { width: `${barPct * 100}%`, backgroundColor: t.color }]} />
                    </View>
                    <Text style={styles.typeCount}>{t.count}</Text>
                    <Text style={styles.typePct}>{Math.round(barPct * 100)}%</Text>
                  </View>
                );
              })}
            </View>

            {/* ── Attendance by event ── */}
            {attendanceByEvent.length > 0 && (
              <View style={styles.card}>
                <SectionTitle style={styles.cardTitle}>{t('dashboard.guests.attendanceByEvent')}</SectionTitle>
                {attendanceByEvent.map((e, i) => {
                  const maxSold = Math.max(...attendanceByEvent.map(x => x.sold), 1);
                  const fillPct = e.sold / maxSold;
                  const capPct  = e.cap > 0 ? e.sold / e.cap : 0;
                  return (
                    <View key={i} style={styles.attRow}>
                      <Text style={styles.attTitle} numberOfLines={1}>{e.title}</Text>
                      <View style={styles.attTrack}>
                        <View style={[styles.attFill, { width: `${fillPct * 100}%` }]} />
                        {e.cap > 0 && (
                          <View style={[styles.attCapLine, { left: `${capPct * 100}%` }]} />
                        )}
                      </View>
                      <Text style={styles.attCount}>{e.sold}{e.cap > 0 ? `/${e.cap}` : ''}</Text>
                    </View>
                  );
                })}
                <Text style={styles.attCapNote}>{t('dashboard.guests.capacityMarker')}</Text>
              </View>
            )}
          </>
        )}

        {/* ════════════ PERMISSIONS ════════════ */}
        {activeSection === 'permissions' && (
          <>
            <Text style={styles.permIntro}>
              {t('dashboard.permissions.intro')}
            </Text>
            <View style={styles.card}>
              {[
                { key: 'guestCheckIn',    label: t('dashboard.permissions.guestCheckIn'),    desc: t('dashboard.permissions.desc.guestCheckIn') },
                { key: 'scanTickets',     label: t('dashboard.permissions.scanTickets'),       desc: t('dashboard.permissions.desc.scanTickets') },
                { key: 'manageGuestList', label: t('dashboard.permissions.manageGuestList'),  desc: t('dashboard.permissions.desc.manageGuestList') },
                { key: 'refundTickets',   label: t('dashboard.permissions.issueRefunds'),      desc: t('dashboard.permissions.desc.issueRefunds') },
                { key: 'editEvents',      label: t('dashboard.permissions.editEventDetails'), desc: t('dashboard.permissions.desc.editEventDetails') },
                { key: 'viewRevenue',     label: t('dashboard.permissions.viewRevenue'),       desc: t('dashboard.permissions.desc.viewRevenue') },
              ].map((p, i, arr) => (
                <View key={p.key}>
                  <PermissionRow label={p.label} description={p.desc}
                    enabled={permissions[p.key]} onToggle={() => togglePermission(p.key)} />
                  {i < arr.length - 1 && <View style={styles.permDivider} />}
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.inviteBtn} activeOpacity={0.8}>
              <Icon name="user-plus" type="feather" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.inviteBtnText}>{t('dashboard.permissions.inviteStaff')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <CustomNavBar activeScreen="Dashboard" />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const COL = (CARD_W - 12) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  lip: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 22, paddingBottom: 18,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  lipTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },

  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.13)' },
  tabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  tabTextActive: { color: '#FFFFFF' },

  scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 14 },

  card: {
    backgroundColor: '#161616',
    borderRadius: 20, padding: CARD_PAD,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  rowCards: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1 },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  // Period picker
  periodTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8,
  },
  periodTriggerLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  periodPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  periodPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)' },
  periodPillActive: { backgroundColor: '#FFFFFF' },
  periodPillText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  periodPillTextActive: { color: '#000000' },

  // Revenue
  revenueAmount: { fontSize: 46, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1.5, marginTop: 2 },
  revenueLabel: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 14, fontWeight: '500' },
  sparkWrap: { marginBottom: 16, marginHorizontal: -4 },

  miniStatRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 14 },
  miniStat: { flex: 1, alignItems: 'center' },
  miniStatBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.07)' },
  miniStatValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  miniStatLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Live pulse
  liveCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', gap: 10,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  liveCardText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#4ade80' },
  liveCardLink: { fontSize: 13, fontWeight: '700', color: '#4ade80' },

  // Donut
  donutCenter: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  donutSub: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontWeight: '600', textTransform: 'uppercase' },
  donutEmpty: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  donutEmptyText: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  donutLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },

  // H-bars
  hbarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  hbarLabel: { width: 70, fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  hbarTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  hbarFill: { height: 6, borderRadius: 3 },
  hbarValue: { width: 36, fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'right', fontWeight: '600' },

  // Capacity rings
  fillRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  fillItem: { alignItems: 'center', gap: 8 },
  fillPct: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  fillLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  // Guest Pulse
  pulseRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  pulseStat: { alignItems: 'center', minWidth: '22%' },
  pulseStatValue: { fontSize: 22, fontWeight: '800', marginBottom: 3 },
  pulseStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  // New vs Returning split
  splitBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, marginBottom: 12 },
  splitFill: { height: 10 },
  splitLegend: { flexDirection: 'row', gap: 20, marginBottom: 10 },
  splitLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  splitDot: { width: 8, height: 8, borderRadius: 4 },
  splitLegendLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  splitLegendPct: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },
  splitInsight: { fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 18, fontStyle: 'italic', marginTop: 4 },

  // Top Returners leaderboard
  returnerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  returnerRank: { fontSize: 18, width: 28, textAlign: 'center' },
  returnerAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  returnerAvatarText: { fontSize: 15, fontWeight: '800' },
  returnerInfo: { flex: 1 },
  returnerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  returnerName: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  streakBadge: { backgroundColor: 'rgba(255,140,0,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  streakText: { fontSize: 10, fontWeight: '700', color: '#FFA500' },
  returnerBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' },
  returnerBarFill: { height: 4, borderRadius: 2 },
  returnerRight: { alignItems: 'center' },
  returnerEvents: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  returnerEventsLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.4 },

  // Ticket type breakdown
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  typeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  typeLabel: { width: 58, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  typeTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  typeFill: { height: 6, borderRadius: 3 },
  typeCount: { width: 28, fontSize: 12, color: '#FFFFFF', fontWeight: '700', textAlign: 'right' },
  typePct: { width: 32, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'right' },

  // Attendance by event
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  attTitle: { width: 80, fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  attTrack: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'visible', position: 'relative' },
  attFill: { height: 8, borderRadius: 4, backgroundColor: '#FF4B8C' },
  attCapLine: { position: 'absolute', top: -3, width: 1.5, height: 14, backgroundColor: 'rgba(255,255,255,0.4)' },
  attCount: { width: 44, fontSize: 11, color: '#FFFFFF', fontWeight: '700', textAlign: 'right' },
  attCapNote: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Permissions
  permIntro: { fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 20 },
  permRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  permInfo: { flex: 1 },
  permLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  permDesc: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  permDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: '#4ade80' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

export default DashboardScreen;
