import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Animated,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
// import * as Clipboard from 'expo-clipboard';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, {
  Path, Defs, LinearGradient as SvgGradient, Stop,
  Rect, Circle, G, Line, Text as SvgText,
} from 'react-native-svg';
import { useEvents } from '../context/EventsContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCount } from '../utils/formatNumbers';
import { getPersonAvatar, resolveAvatarSource } from '../assets/avatars';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 40;

const sr = (seed) => {
  let s = seed % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
};

const smooth = (pts) => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
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

const buildCheckInTrend = (checkedIn, seed = 42) => {
  const rng = sr(seed);
  const buckets = 12;
  if (checkedIn <= 0) return Array(buckets).fill(0);
  return Array.from({ length: buckets }, (_, i) => {
    if (i === buckets - 1) return checkedIn;
    const progress = (i + 1) / buckets;
    return Math.max(0, Math.round(checkedIn * progress * (0.8 + rng() * 0.2)));
  });
};

const buildScanBars = (rate, seed = 11) => {
  const rng = sr(seed);
  return Array.from({ length: 8 }, (_, i) => {
    if (i === 7) return Math.max(1, rate);
    return Math.max(1, Math.round(rate * (0.35 + rng() * 1.1)));
  });
};

const fmtRevenue = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
};

const AreaChart = ({ data, labels, w, h = 130, color = '#4ade80', formatY = (v) => formatCount(Math.round(v)) }) => {
  if (!data || data.length < 2) return null;
  const inner = { l: 40, r: 8, t: 8, b: 24 };
  const cw = w - inner.l - inner.r;
  const ch = h - inner.t - inner.b;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: inner.l + (i / (data.length - 1)) * cw,
    y: inner.t + (1 - v / max) * ch,
  }));
  const line = smooth(pts);
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(inner.t + ch).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(inner.t + ch).toFixed(1)} Z`;
  const ticks = [0, 0.5, 1].map((f) => ({ v: f * max, y: inner.t + (1 - f) * ch }));
  const shownLabels = labels
    ? [0, Math.floor(labels.length / 2), labels.length - 1].map((i) => ({ i, label: labels[i] }))
    : [];

  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgGradient id="liveArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.28" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      {ticks.map((tick, i) => (
        <G key={i}>
          <Line x1={inner.l} y1={tick.y} x2={inner.l + cw} y2={tick.y}
            stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
          <SvgText x={inner.l - 4} y={tick.y + 4} fontSize={9} fill="rgba(255,255,255,0.3)"
            textAnchor="end">{formatY(tick.v)}</SvgText>
        </G>
      ))}
      {shownLabels.map(({ i, label }) => (
        <SvgText key={i} x={pts[i]?.x ?? 0} y={h - 4} fontSize={9}
          fill="rgba(255,255,255,0.3)" textAnchor="middle">{label}</SvgText>
      ))}
      <Path d={area} fill="url(#liveArea)" />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill={color} />
    </Svg>
  );
};

const BarChart = ({ data, labels, w, h = 100, color = '#60a5fa' }) => {
  if (!data?.length) return null;
  const max = Math.max(...data, 1);
  const slotW = (w - 16) / data.length;
  const barW = Math.max(6, slotW - 6);

  return (
    <Svg width={w} height={h}>
      {data.map((v, i) => {
        const barH = (v / max) * (h - 28);
        const x = 8 + i * slotW + (slotW - barW) / 2;
        return (
          <G key={i}>
            <Rect
              x={x}
              y={h - 22 - barH}
              width={barW}
              height={barH}
              rx={3}
              fill={color}
              opacity={i === data.length - 1 ? 1 : 0.65}
            />
            {labels?.[i] && (
              <SvgText x={x + barW / 2} y={h - 6} fontSize={8}
                fill="rgba(255,255,255,0.3)" textAnchor="middle">{labels[i]}</SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
};

const formatElapsed = (startTime) => {
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  if (Number.isNaN(start.getTime())) return '0:00';
  const diff = Math.max(0, Date.now() - start.getTime());
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const NOTIF_VISIBLE_MS = 4500;
const NOTIF_DEMO_INTERVAL_MS = 3200;

const getAvatarUrl = (name, avatar) => getPersonAvatar(name, avatar);

const DEMO_SCANNERS = [
  { id: 'demo-1', name: 'Alex Rivera', scanCount: 47 },
  { id: 'demo-2', name: 'Jordan Lee', scanCount: 31 },
  { id: 'demo-3', name: 'Sam Ortiz', scanCount: 22 },
];

const DEMO_RECENT_CHECKINS = [
  { name: 'Marcus Chen', ticketType: 'General Admission', minsAgo: 0 },
  { name: 'Priya Sharma', ticketType: 'VIP', minsAgo: 1 },
  { name: 'Riley Adams', ticketType: 'Early Bird', minsAgo: 2 },
  { name: 'Chris Park', ticketType: 'VIP', minsAgo: 3 },
  { name: 'Dana Ortiz', ticketType: 'General Admission', minsAgo: 4 },
];

const formatTimeAgo = (mins, t) => {
  if (mins <= 0) return t('liveDashboard.time.justNow');
  if (mins === 1) return t('liveDashboard.time.oneMinAgo');
  return t('liveDashboard.time.minsAgo', { count: mins });
};

const formatActivityTime = (timestamp, t) => {
  if (!timestamp) return t('liveDashboard.time.justNow');
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  return formatTimeAgo(mins, t);
};

const getEventAvatar = (meta) => meta?.eventImage || getAvatarUrl(meta?.hostName, meta?.hostAvatar);

const buildNotification = (item, t, meta = {}) => {
  const hostName = item.hostName || meta.hostName || 'Host';
  const eventTitle = meta.eventTitle || 'Your Event';

  switch (item.type) {
    case 'ticket_scanned':
      return {
        title: item.attendeeName || item.name || 'Guest',
        body: item.ticketType
          ? t('liveDashboard.notifications.checkedInWithType', { ticketType: item.ticketType })
          : t('liveDashboard.notifications.checkedIn'),
        avatar: getAvatarUrl(item.attendeeName || item.name, item.avatar),
      };
    case 'scanner_added':
      return {
        title: item.scannerName || item.name || 'Scanner',
        body: t('liveDashboard.notifications.scannerAdded'),
        avatar: getAvatarUrl(item.scannerName || item.name, item.avatar),
      };
    case 'ticket_purchased':
      return {
        title: item.purchaserName || item.name || 'Guest',
        body: t('liveDashboard.notifications.ticketsPurchased', {
          count: item.ticketCount || item.count || 1,
        }),
        avatar: getAvatarUrl(item.purchaserName || item.name, item.avatar),
      };
    case 'event_started':
      return {
        title: hostName,
        body: t('liveDashboard.notifications.eventStartedEarly'),
        avatar: getAvatarUrl(hostName, item.avatar || meta.hostAvatar),
      };
    case 'guest_list_join':
      return {
        title: item.name || 'Guest',
        body: t('liveDashboard.notifications.guestListJoin'),
        avatar: getAvatarUrl(item.name, item.avatar),
      };
    case 'milestone_checkin':
      return {
        title: eventTitle,
        body: t('liveDashboard.notifications.milestoneCheckin', { percent: item.percent }),
        avatar: getEventAvatar(meta),
      };
    case 'milestone_capacity':
      return {
        title: eventTitle,
        body: t('liveDashboard.notifications.milestoneCapacity', { percent: item.percent }),
        avatar: getEventAvatar(meta),
      };
    case 'milestone_revenue':
      return {
        title: eventTitle,
        body: t('liveDashboard.notifications.milestoneRevenue', { amount: item.amount }),
        avatar: getEventAvatar(meta),
      };
    case 'bulk_checkin':
      return {
        title: eventTitle,
        body: t('liveDashboard.notifications.bulkCheckin', { count: item.count }),
        avatar: getEventAvatar(meta),
      };
    case 'last_ticket':
      return {
        title: eventTitle,
        body: t('liveDashboard.notifications.lastTicket', { ticketType: item.ticketType }),
        avatar: getEventAvatar(meta),
      };
    case 'event_peak':
      return {
        title: eventTitle,
        body: t('liveDashboard.notifications.eventPeak', { count: item.count }),
        avatar: getEventAvatar(meta),
      };
    case 'vip_arrival':
      return {
        title: item.name || 'VIP Guest',
        body: t('liveDashboard.notifications.vipArrival'),
        avatar: getAvatarUrl(item.name, item.avatar),
      };
    case 'scanner_removed':
      return {
        title: item.name || 'Scanner',
        body: t('liveDashboard.notifications.scannerRemoved'),
        avatar: getAvatarUrl(item.name, item.avatar),
      };
    default:
      return {
        title: item.title || eventTitle,
        body: item.body || item.text || '',
        avatar: item.avatar ? getAvatarUrl(item.name, item.avatar) : getEventAvatar(meta),
      };
  }
};

const activityToNotification = (activity, t, meta) => buildNotification(activity, t, meta);

const buildDemoNotifications = (hostName) => [
  { type: 'event_started', hostName },
  { type: 'ticket_scanned', name: 'Marcus Chen', ticketType: 'General Admission' },
  { type: 'ticket_purchased', name: 'Sofia Martinez', count: 2 },
  { type: 'scanner_added', name: 'Alex Rivera' },
  { type: 'vip_arrival', name: 'Jamie Okonkwo' },
  { type: 'milestone_checkin', percent: 25 },
  { type: 'ticket_scanned', name: 'Priya Sharma', ticketType: 'VIP' },
  { type: 'guest_list_join', name: 'Casey Nguyen' },
  { type: 'ticket_purchased', name: 'Taylor Brooks', count: 1 },
  { type: 'bulk_checkin', count: 5 },
  { type: 'scanner_added', name: 'Jordan Lee' },
  { type: 'ticket_scanned', name: 'Riley Adams', ticketType: 'Early Bird' },
  { type: 'milestone_capacity', percent: 85 },
  { type: 'ticket_purchased', name: 'Dana Ortiz', count: 3 },
  { type: 'ticket_scanned', name: 'Morgan Blake', ticketType: null },
  { type: 'last_ticket', ticketType: 'General Admission' },
  { type: 'scanner_added', name: 'Sam Ortiz' },
  { type: 'milestone_revenue', amount: '2,500' },
  { type: 'ticket_scanned', name: 'Chris Park', ticketType: 'VIP' },
  { type: 'event_peak', count: 142 },
  { type: 'milestone_checkin', percent: 75 },
  { type: 'ticket_purchased', name: 'Elena Vasquez', count: 1 },
  { type: 'scanner_removed', name: 'Jordan Lee' },
  { type: 'ticket_scanned', name: 'Noah Kim', ticketType: 'General Admission' },
  { type: 'milestone_capacity', percent: 95 },
];

const AppleNotification = ({ notification, onDismiss }) => {
  const translateY = useRef(new Animated.Value(110)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 72,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 90,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    const dismissTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 130, duration: 320, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.94, duration: 320, useNativeDriver: true }),
      ]).start(() => onDismiss(notification.id));
    }, NOTIF_VISIBLE_MS);

    return () => clearTimeout(dismissTimer);
  }, [notification.id, onDismiss, opacity, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.appleNotifWrap,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      <BlurView intensity={85} tint="dark" style={styles.appleNotifBlur}>
        <View style={styles.appleNotifInner}>
          {notification.avatar ? (
            <Image source={resolveAvatarSource(notification.avatar)} style={styles.appleNotifIcon} />
          ) : (
            <View style={[styles.appleNotifIcon, styles.appleNotifIconFallback]}>
              <Icon name="bell" type="feather" size={18} color="#4ade80" />
            </View>
          )}
          <View style={styles.appleNotifContent}>
            <View style={styles.appleNotifTitleRow}>
              <Text style={styles.appleNotifTitle} numberOfLines={1}>
                {notification.title}
              </Text>
              <Text style={styles.appleNotifTime}>now</Text>
            </View>
            <Text style={styles.appleNotifBody} numberOfLines={2}>
              {notification.body}
            </Text>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
};

const useAppleNotifications = (activities, eventId, t, meta) => {
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null);
  const seenRef = useRef(new Set());
  const demoIndexRef = useRef(0);
  const demoListRef = useRef(buildDemoNotifications(meta?.hostName || 'Host'));

  const enqueue = useCallback((item) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setQueue((prev) => [...prev, { ...item, id }]);
  }, []);

  useEffect(() => {
    seenRef.current = new Set();
    setQueue([]);
    setActive(null);
    demoIndexRef.current = 0;
    demoListRef.current = buildDemoNotifications(meta?.hostName || 'Host');
  }, [eventId, meta?.hostName]);

  useEffect(() => {
    const incoming = activities.filter((a) => !seenRef.current.has(a.id));
    incoming.forEach((a) => {
      seenRef.current.add(a.id);
      enqueue(activityToNotification(a, t, meta));
    });
  }, [activities, enqueue, t, meta]);

  useEffect(() => {
    const pushDemo = () => {
      const demos = demoListRef.current;
      const demo = demos[demoIndexRef.current % demos.length];
      demoIndexRef.current += 1;
      enqueue(buildNotification(demo, t, meta));
    };

    const firstTimer = setTimeout(pushDemo, 2000);
    const interval = setInterval(pushDemo, NOTIF_DEMO_INTERVAL_MS);
    return () => {
      clearTimeout(firstTimer);
      clearInterval(interval);
    };
  }, [enqueue, t, meta]);

  useEffect(() => {
    if (active || queue.length === 0) return;
    setActive(queue[0]);
    setQueue((prev) => prev.slice(1));
  }, [active, queue]);

  const dismiss = useCallback((id) => {
    setActive((current) => (current?.id === id ? null : current));
  }, []);

  return { active, dismiss };
};

const Card = ({ children, style, fade }) => (
  <Animated.View style={[styles.card, style, fade != null && { opacity: fade }]}>
    {children}
  </Animated.View>
);

const HeroStat = ({ label, value, suffix = '', accent, fade }) => (
  <View style={styles.grid3Cell}>
    <Card fade={fade} style={styles.heroStat}>
      <Text style={[styles.heroStatValue, accent && { color: accent }]} numberOfLines={1}>
        {value}{suffix}
      </Text>
      <Text style={styles.heroStatLabel} numberOfLines={2}>{label}</Text>
    </Card>
  </View>
);

const ChartCard = ({ title, subtitle, children, fade }) => (
  <Card fade={fade} style={styles.chartCard}>
    <View style={styles.chartHeader}>
      <Text style={styles.chartTitle}>{title}</Text>
      {subtitle ? <Text style={styles.chartSubtitle}>{subtitle}</Text> : null}
    </View>
    {children}
  </Card>
);

const SectionLabel = ({ children, right, fade }) => (
  <Animated.View style={[styles.sectionLabelRow, fade != null && { opacity: fade }]}>
    <Text style={styles.sectionLabel}>{children}</Text>
    {right}
  </Animated.View>
);

const LiveEventStats = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { updateEvent, getEventActivities, getEventById } = useEvents();
  const paramEvent = route.params?.event;
  const event = (paramEvent?.id ? getEventById(paramEvent.id) : null) || paramEvent;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [elapsed, setElapsed] = useState(() => formatElapsed(event?.startTime));
  const [simScansPerMin, setSimScansPerMin] = useState(8);

  const imgUri = event?.coverImage || event?.flyers?.[0] || event?.image;
  const attendeeCount = event?.bookedSpots || 0;
  const checkedInCount = event?.scannedTickets || 0;
  const checkInPct = attendeeCount > 0 ? Math.round((checkedInCount / attendeeCount) * 100) : 0;

  const revenueAmount = useMemo(() => {
    if (!event?.tickets?.length) return 0;
    return event.tickets.reduce((total, ticket) => {
      const sold = ticket.sold || 0;
      const price = parseFloat(ticket.price) || 0;
      return total + sold * price;
    }, 0);
  }, [event?.tickets]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const tick = () => setElapsed(formatElapsed(event?.startTime));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [event?.startTime]);

  const handleCopyCode = async () => {
    const code = event?.verificationCode;
    if (!code) return;
    // await Clipboard.setStringAsync(code);
    Alert.alert(t('liveDashboard.code.title'), code);
  };

  const handleEndEvent = () => {
    Alert.alert(
      t('liveDashboard.end.title'),
      t('liveDashboard.end.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('liveDashboard.end.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const now = new Date();
              await updateEvent(event.id, { endTime: now, status: 'completed', updatedAt: now });
              Alert.alert(t('liveDashboard.end.successTitle'), t('liveDashboard.end.successMessage'), [
                { text: t('common.ok'), onPress: () => navigation.navigate('ManageEvents') },
              ]);
            } catch {
              Alert.alert(t('common.error'), t('liveDashboard.end.failed'));
            }
          },
        },
      ],
    );
  };

  const activities = getEventActivities(event?.id) || [];

  const liveMetrics = useMemo(() => {
    const totalSpots = event?.totalSpots || 0;
    const booked = event?.bookedSpots || 0;
    const checkedIn = event?.scannedTickets || 0;
    const remaining = totalSpots > 0 ? Math.max(0, totalSpots - booked) : null;
    const capacityPct = totalSpots > 0 ? Math.round((booked / totalSpots) * 100) : 0;
    const notArrived = Math.max(0, booked - checkedIn);
    const totalSold = (event?.tickets || []).reduce((s, tk) => s + (tk.sold || 0), 0);
    const avgTicket = totalSold > 0 ? revenueAmount / totalSold : 0;

    const realScanners = event?.activeScanners || [];
    const scanners = realScanners.length > 0
      ? realScanners.map((s, i) => ({
          ...s,
          scanCount: s.scanCount || DEMO_SCANNERS[i % DEMO_SCANNERS.length]?.scanCount || 0,
        }))
      : DEMO_SCANNERS;

    const oneMinAgo = Date.now() - 60000;
    const realScansPerMin = activities.filter(
      (a) => a.type === 'ticket_scanned' && new Date(a.timestamp || 0).getTime() > oneMinAgo,
    ).length;

    const peakFromActivity = activities
      .filter((a) => a.type === 'event_peak')
      .reduce((max, a) => Math.max(max, a.count || 0), 0);
    const peakInside = Math.max(checkedIn, peakFromActivity);

    const ticketBreakdown = (event?.tickets || []).map((tk) => ({
      name: tk.name || tk.type || 'Ticket',
      sold: tk.sold || 0,
      total: tk.quantity || tk.availableQuantity || tk.sold || 0,
      price: parseFloat(tk.price) || 0,
    }));

    const realCheckIns = activities
      .filter((a) => a.type === 'ticket_scanned')
      .slice(0, 5)
      .map((a) => ({
        name: a.attendeeName || a.name || 'Guest',
        ticketType: a.ticketType || null,
        timestamp: a.timestamp,
        avatar: getPersonAvatar(a.attendeeName || a.name, a.avatar),
      }));

    const recentCheckIns = (realCheckIns.length > 0
      ? realCheckIns
      : DEMO_RECENT_CHECKINS.map((c) => ({
          ...c,
          avatar: getPersonAvatar(c.name, null),
        }))
    ).slice(0, 5);

    return {
      remaining,
      capacityPct,
      notArrived,
      totalSold,
      avgTicket,
      scanners,
      activeScannerCount: scanners.length,
      scansPerMin: realScansPerMin > 0 ? realScansPerMin : null,
      peakInside,
      ticketBreakdown,
      recentCheckIns,
      totalSpots,
    };
  }, [event, activities, revenueAmount]);

  useEffect(() => {
    if (liveMetrics.scansPerMin != null) return undefined;
    const id = setInterval(() => {
      setSimScansPerMin((prev) => Math.max(2, Math.min(24, prev + Math.floor(Math.random() * 5) - 2)));
    }, 3500);
    return () => clearInterval(id);
  }, [liveMetrics.scansPerMin]);

  const scansPerMinDisplay = liveMetrics.scansPerMin ?? simScansPerMin;

  const chartData = useMemo(() => {
    const checkInSeries = buildCheckInTrend(checkedInCount, (event?.id || '').length + checkedInCount);
    const scanSeries = buildScanBars(scansPerMinDisplay, scansPerMinDisplay + (event?.id || '').length);
    const elapsedMins = Math.max(1, Math.floor(
      (Date.now() - new Date(event?.startTime || Date.now()).getTime()) / 60000,
    ));
    const checkInLabels = Array.from({ length: 12 }, (_, i) => {
      const mins = Math.round((elapsedMins * i) / 11);
      return i === 0 ? 'Start' : i === 11 ? 'Now' : `${mins}m`;
    });
    const scanLabels = ['-35', '-30', '-25', '-20', '-15', '-10', '-5', 'Now'];
    return { checkInSeries, scanSeries, checkInLabels, scanLabels };
  }, [checkedInCount, scansPerMinDisplay, event?.id, event?.startTime]);

  const notifMeta = useMemo(() => ({
    hostName: event?.organizer?.name || event?.organizerName || event?.host || 'Host',
    hostAvatar: event?.organizer?.profilePicture || event?.organizerAvatar || null,
    eventTitle: event?.title || 'Your Event',
    eventImage: imgUri || null,
  }), [event, imgUri]);
  const { active: activeNotif, dismiss: dismissNotif } = useAppleNotifications(
    activities, event?.id, t, notifMeta,
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {imgUri ? (
        <>
          <Image source={{ uri: imgUri }} style={styles.bgImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(10,10,10,0.45)', 'rgba(10,10,10,0.82)', '#0a0a0a']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <LinearGradient colors={['#1A1A1A', '#0a0a0a']} style={StyleSheet.absoluteFill} />
      )}

      {/* Lip header */}
      <Animated.View style={[styles.lip, { paddingTop: insets.top + 10, opacity: fadeAnim }]}>
        <View style={styles.lipRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('ManageEvents', { initialTab: 'live' })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-left" type="feather" color="#FFFFFF" size={22} />
          </TouchableOpacity>

          <View style={styles.lipCenter}>
            <Text style={styles.elapsed}>{elapsed}</Text>
          </View>

          <TouchableOpacity style={styles.endBtn} onPress={handleEndEvent} activeOpacity={0.75}>
            <Icon name="square" type="feather" size={14} color="#FF6B6B" />
            <Text style={styles.endBtnText}>{t('liveDashboard.end.button')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        <Animated.Text style={[styles.eventTitle, { opacity: fadeAnim }]} numberOfLines={3}>
          {event?.title}
        </Animated.Text>

        <Animated.View style={[styles.liveBadgeRow, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.liveDotPulse, { opacity: pulseAnim }]} />
          <Text style={styles.liveBadgeText}>{t('liveDashboard.liveNow')}</Text>
          <Text style={styles.liveBadgeSep}>·</Text>
          <Text style={styles.liveBadgeSub}>
            {t('liveDashboard.stats.elapsed', { time: elapsed })}
          </Text>
        </Animated.View>

        {/* Top 3 headline stats */}
        <Animated.View style={[styles.grid3, { opacity: fadeAnim }]}>
          <HeroStat
            label={t('liveDashboard.stats.revenue')}
            value={fmtRevenue(revenueAmount)}
            accent="#FF4B8C"
            fade={fadeAnim}
          />
          <HeroStat
            label={t('liveDashboard.stats.checkedIn')}
            value={formatCount(checkedInCount)}
            accent="#4ade80"
            fade={fadeAnim}
          />
          <HeroStat
            label={t('liveDashboard.stats.checkInRate')}
            value={`${checkInPct}`}
            suffix="%"
            fade={fadeAnim}
          />
        </Animated.View>

        <ChartCard
          fade={fadeAnim}
          title={t('liveDashboard.charts.checkInTrend')}
        >
          <AreaChart
            data={chartData.checkInSeries}
            labels={chartData.checkInLabels}
            w={CHART_W - 32}
            color="#4ade80"
          />
        </ChartCard>

        <ChartCard
          fade={fadeAnim}
          title={t('liveDashboard.charts.doorActivity')}
          subtitle={t('liveDashboard.charts.avgScansPerMin', { count: formatCount(scansPerMinDisplay) })}
        >
          <BarChart
            data={chartData.scanSeries}
            labels={chartData.scanLabels}
            w={CHART_W - 32}
            color="#60a5fa"
          />
        </ChartCard>

        {/* Ticket breakdown — 2-column grid */}
        {liveMetrics.ticketBreakdown.length > 0 && (
          <>
            <SectionLabel fade={fadeAnim}>{t('liveDashboard.ticketBreakdown.title')}</SectionLabel>
            <Animated.View style={[styles.grid2, { opacity: fadeAnim }]}>
              {liveMetrics.ticketBreakdown.map((tk, i) => {
                const pct = tk.total > 0 ? Math.round((tk.sold / tk.total) * 100) : 0;
                const singleTicket = liveMetrics.ticketBreakdown.length === 1;
                return (
                  <View key={tk.name + i} style={singleTicket ? styles.grid2CellFull : styles.grid2Cell}>
                    <Card fade={fadeAnim} style={styles.ticketCardGrid}>
                      <Text style={styles.ticketName} numberOfLines={1}>{tk.name}</Text>
                      <Text style={styles.ticketCount}>
                        {formatCount(tk.sold)}{tk.total > 0 ? ` / ${formatCount(tk.total)}` : ''}
                      </Text>
                      <View style={styles.ticketBarTrack}>
                        <View style={[styles.ticketBarFill, { width: `${Math.min(pct, 100)}%` }]} />
                      </View>
                      {tk.price > 0 && (
                        <Text style={styles.ticketPrice}>
                          ${tk.price.toFixed(0)} {t('liveDashboard.ticketBreakdown.each')}
                        </Text>
                      )}
                    </Card>
                  </View>
                );
              })}
            </Animated.View>
          </>
        )}

        {/* Active scanners — multi-column grid, centered content */}
        <Animated.View style={[styles.sectionLabelCentered, { opacity: fadeAnim }]}>
          <Text style={styles.sectionLabel}>{t('liveDashboard.scanners.title')}</Text>
          <View style={styles.sectionBadge}>
            <View style={styles.sectionBadgeDot} />
            <Text style={styles.sectionBadgeText}>
              {t('liveDashboard.scanners.online', { count: liveMetrics.activeScannerCount })}
            </Text>
          </View>
        </Animated.View>
        <Animated.View style={[styles.scannerGrid, { opacity: fadeAnim }]}>
          {liveMetrics.scanners.map((scanner) => (
            <View key={scanner.id || scanner.name} style={styles.scannerGridCell}>
              <Card style={styles.scannerCard}>
                <View style={styles.scannerCentered}>
                  <View style={styles.scannerAvatarWrap}>
                    <Image
                      source={resolveAvatarSource(getPersonAvatar(scanner.name, scanner.profilePicture))}
                      style={styles.scannerAvatar}
                    />
                    <View style={styles.scannerOnlineDot} />
                  </View>
                  <Text style={styles.scannerName} numberOfLines={1}>{scanner.name}</Text>
                  <Text style={styles.scannerScans} numberOfLines={1}>
                    {t('liveDashboard.scanners.scans', { count: scanner.scanCount || 0 })}
                  </Text>
                  <View style={styles.scannerLivePill}>
                    <View style={styles.sectionBadgeDot} />
                    <Text style={styles.scannerLiveText}>{t('liveDashboard.activity.live')}</Text>
                  </View>
                </View>
              </Card>
            </View>
          ))}
        </Animated.View>

        {/* Scanner code + scan action */}
        <Animated.View style={[styles.inlineActionRow, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.codeTextWrap}
            onPress={handleCopyCode}
            activeOpacity={0.75}
            disabled={!event?.verificationCode}
          >
            <Text style={styles.codeInlineLabel}>{t('liveDashboard.code.title')}</Text>
            <Text style={styles.codeInlineValue}>{event?.verificationCode || '——'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.textActionBtn}
            onPress={() => navigation.navigate('TicketScanner', { event })}
            activeOpacity={0.7}
          >
            <Icon name="maximize" type="feather" size={14} color="#4ade80" />
            <Text style={styles.textActionScan}>{t('liveDashboard.scan.title')}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent check-ins — one card each */}
        <SectionLabel
          fade={fadeAnim}
          right={(
            <TouchableOpacity
              style={styles.textActionBtn}
              onPress={() => navigation.navigate('Attendees', { event, managerMode: true })}
              activeOpacity={0.7}
            >
              <Icon name="users" type="feather" size={14} color="#FFFFFF" />
              <Text style={styles.textActionGuest}>{t('manageEvents.guestList')}</Text>
            </TouchableOpacity>
          )}
        >
          {t('liveDashboard.recentCheckIns.title')}
        </SectionLabel>
        {liveMetrics.recentCheckIns.map((checkIn, i) => (
          <Card key={`${checkIn.name}-${i}`} fade={fadeAnim}>
            <View style={styles.checkInRow}>
              <Image
                source={resolveAvatarSource(checkIn.avatar || getPersonAvatar(checkIn.name))}
                style={styles.checkInAvatar}
              />
              <View style={styles.checkInInfo}>
                <Text style={styles.checkInName}>{checkIn.name}</Text>
                <Text style={styles.checkInType}>
                  {checkIn.ticketType || t('liveDashboard.recentCheckIns.generalAdmission')}
                </Text>
              </View>
              <Text style={styles.checkInTime}>
                {checkIn.timestamp
                  ? formatActivityTime(checkIn.timestamp, t)
                  : formatTimeAgo(checkIn.minsAgo, t)}
              </Text>
            </View>
          </Card>
        ))}

      </ScrollView>

      {/* Apple-style bottom notifications */}
      {activeNotif && (
        <View
          style={[styles.notifOverlay, { bottom: insets.bottom + 10 }]}
          pointerEvents="box-none"
        >
          <AppleNotification notification={activeNotif} onDismiss={dismissNotif} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  lip: {
    backgroundColor: 'rgba(26,26,26,0.88)',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  lipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lipCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  elapsed: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,80,80,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.25)',
  },
  endBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  eventTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    lineHeight: 30,
    letterSpacing: -0.4,
    textAlign: 'left',
    alignSelf: 'flex-start',
    maxWidth: '92%',
    marginBottom: 4,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  liveDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4ade80',
    letterSpacing: 1.2,
  },
  liveBadgeSep: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  },
  liveBadgeSub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    fontVariant: ['tabular-nums'],
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(22,22,22,0.92)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  grid2Cell: {
    width: '48%',
  },
  grid2CellFull: {
    width: '100%',
  },
  grid3: {
    flexDirection: 'row',
    gap: 8,
  },
  grid3Cell: {
    flex: 1,
    minWidth: 0,
  },
  heroStat: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  heroStatLabel: {
    fontSize: 7,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  chartCard: {
    gap: 10,
    paddingVertical: 16,
  },
  chartHeader: {
    gap: 3,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  chartSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    fontVariant: ['tabular-nums'],
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: -4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  sectionLabelCentered: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: -4,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(74,222,128,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4ade80',
  },
  scannerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  scannerGridCell: {
    width: '31%',
    minWidth: 100,
  },
  scannerCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  scannerCentered: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  scannerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
  },
  scannerScans: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    width: '100%',
  },
  scannerLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(74,222,128,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scannerLiveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4ade80',
    letterSpacing: 0.5,
  },
  scannerAvatarWrap: {
    position: 'relative',
  },
  scannerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(74,222,128,0.3)',
  },
  scannerOnlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: '#161616',
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkInAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  checkInInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  checkInName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkInType: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  checkInTime: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
  },
  ticketCardGrid: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 6,
  },
  ticketName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
  },
  ticketCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  ticketBarTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  ticketBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FF4B8C',
  },
  ticketPrice: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '500',
    textAlign: 'center',
  },
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  codeTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  codeInlineLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  codeInlineValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4ade80',
    letterSpacing: 6,
    fontVariant: ['tabular-nums'],
  },
  textActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingLeft: 8,
  },
  textActionScan: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ade80',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  textActionGuest: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  notifOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
  },
  appleNotifWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  },
  appleNotifBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: Platform.OS === 'android' ? 'rgba(28,28,30,0.94)' : 'transparent',
  },
  appleNotifInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  appleNotifIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
  },
  appleNotifIconFallback: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleNotifContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  appleNotifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  appleNotifTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  appleNotifTime: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.45)',
  },
  appleNotifBody: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
});

export default LiveEventStats;
