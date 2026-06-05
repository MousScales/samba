import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Animated,
  TouchableOpacity,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvents } from '../context/EventsContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCount } from '../utils/formatNumbers';
import { getPersonAvatar, resolveAvatarSource } from '../assets/avatars';
import {
  CHART_W,
  buildCheckInTrend,
  buildSalesTrend,
  fmtRevenue,
  AreaChart,
  BarChart,
  Card,
  HeroStat,
  ChartCard,
  SectionLabel,
  dashStyles,
} from '../utils/eventDashboardCharts';

const formatEventDate = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime || Date.now());
  if (Number.isNaN(start.getTime())) return '—';
  const diff = Math.max(0, end.getTime() - start.getTime());
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const formatTimeAgo = (timestamp, t) => {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins <= 0) return t('liveDashboard.time.justNow');
  if (mins === 1) return t('liveDashboard.time.oneMinAgo');
  return t('liveDashboard.time.minsAgo', { count: mins });
};

const EventStats = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { getUserTickets, getEventById } = useEvents();
  const paramEvent = route.params?.event;
  const event = (paramEvent?.id ? getEventById(paramEvent.id) : null) || paramEvent;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [eventTickets, setEventTickets] = useState([]);

  const imgUri = event?.coverImage || event?.flyers?.[0] || event?.image;
  const eventDate = formatEventDate(event?.date || event?.startTime);
  const duration = formatDuration(event?.startTime, event?.endTime);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const load = async () => {
      if (!event?.id) {
        setLoading(false);
        return;
      }
      try {
        const allTickets = await getUserTickets('all');
        const filtered = Array.isArray(allTickets)
          ? allTickets.filter((ticket) => ticket.eventId === event.id)
          : [];
        setEventTickets(filtered);
      } catch (error) {
        console.error('Error loading event stats:', error);
        setEventTickets([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [event?.id, getUserTickets]);

  const metrics = useMemo(() => {
    const ticketsSoldFromEvent = (event?.tickets || []).reduce((s, tk) => s + (tk.sold || 0), 0);
    const ticketsSold = ticketsSoldFromEvent || eventTickets.length || event?.bookedSpots || 0;
    const checkedInFromEvent = event?.scannedTickets || 0;
    const checkedInFromTickets = eventTickets.filter(
      (tk) => tk.isScanned || tk.status === 'used',
    ).length;
    const checkedInCount = Math.max(checkedInFromEvent, checkedInFromTickets);

    const revenueFromTickets = eventTickets.reduce((total, ticket) => {
      const price = parseFloat(ticket.price ?? ticket.amount ?? ticket.cost ?? 0) || 0;
      return total + price;
    }, 0);
    const revenueFromEvent = (event?.tickets || []).reduce((total, tk) => {
      const sold = tk.sold || 0;
      const price = parseFloat(tk.price) || 0;
      return total + sold * price;
    }, 0);
    const revenueAmount = Math.max(revenueFromTickets, revenueFromEvent);

    const checkInPct = ticketsSold > 0 ? Math.round((checkedInCount / ticketsSold) * 100) : 0;

    const ticketBreakdown = (event?.tickets || []).map((tk) => {
      const soldFromTickets = eventTickets.filter(
        (et) => et.ticketType === tk.name || et.ticketId === tk.id,
      ).length;
      return {
        name: tk.name || tk.type || 'Ticket',
        sold: tk.sold || soldFromTickets || 0,
        total: tk.quantity || tk.availableQuantity || tk.sold || 0,
        price: parseFloat(tk.price) || 0,
      };
    });

    const recentCheckIns = eventTickets
      .filter((tk) => tk.isScanned || tk.status === 'used')
      .sort((a, b) => new Date(b.scannedAt || b.purchaseDate || 0) - new Date(a.scannedAt || a.purchaseDate || 0))
      .slice(0, 5)
      .map((tk) => ({
        name: tk.purchaserName || tk.buyerName || 'Guest',
        ticketType: tk.ticketType || tk.name || null,
        timestamp: tk.scannedAt || tk.purchaseDate,
        avatar: getPersonAvatar(tk.purchaserName || tk.buyerName, null),
      }));

    const checkInSeries = buildCheckInTrend(checkedInCount, (event?.id || '').length + checkedInCount);
    const salesSeries = buildSalesTrend(ticketsSold, ticketsSold + 17);
    const checkInLabels = ['Start', '', '', '', '', '', '', '', '', '', '', 'End'];
    const salesLabels = ['Early', '', '', '', '', '', '', 'Final'];

    return {
      ticketsSold,
      checkedInCount,
      revenueAmount,
      checkInPct,
      ticketBreakdown,
      recentCheckIns,
      checkInSeries,
      salesSeries,
      checkInLabels,
      salesLabels,
    };
  }, [event, eventTickets]);

  if (!event) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1A1A1A', '#0a0a0a']} style={StyleSheet.absoluteFill} />
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>{t('eventStats.notFound')}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" type="feather" color="#FFFFFF" size={22} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1A1A1A', '#0a0a0a']} style={StyleSheet.absoluteFill} />
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.loadingText}>{t('eventStats.loading')}</Text>
        </View>
      </View>
    );
  }

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

      <Animated.View style={[styles.lip, { paddingTop: insets.top + 10, opacity: fadeAnim }]}>
        <View style={styles.lipRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('ManageEvents', { initialTab: 'past' })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-left" type="feather" color="#FFFFFF" size={22} />
          </TouchableOpacity>
          <View style={styles.lipCenter}>
            <Text style={styles.lipDuration}>{duration}</Text>
          </View>
          <View style={styles.lipSpacer} />
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        <Animated.Text style={[styles.eventTitle, { opacity: fadeAnim }]} numberOfLines={3}>
          {event.title}
        </Animated.Text>

        <Animated.View style={[styles.completedBadgeRow, { opacity: fadeAnim }]}>
          <View style={styles.completedDot} />
          <Text style={styles.completedBadgeText}>{t('eventStats.completed')}</Text>
          {eventDate ? (
            <>
              <Text style={styles.completedSep}>·</Text>
              <Text style={styles.completedDate}>{eventDate}</Text>
            </>
          ) : null}
        </Animated.View>

        {(event.venue || event.location) && (
          <Animated.View style={[styles.venueRow, { opacity: fadeAnim }]}>
            <Icon name="map-pin" type="feather" size={12} color="rgba(255,255,255,0.35)" />
            <Text style={styles.venueText} numberOfLines={1}>
              {event.venue || event.location}
            </Text>
          </Animated.View>
        )}

        <Animated.View style={[dashStyles.grid3, { opacity: fadeAnim }]}>
          <HeroStat
            label={t('liveDashboard.stats.revenue')}
            value={fmtRevenue(metrics.revenueAmount)}
            accent="#FF4B8C"
            fade={fadeAnim}
          />
          <HeroStat
            label={t('liveDashboard.stats.checkedIn')}
            value={formatCount(metrics.checkedInCount)}
            accent="#4ade80"
            fade={fadeAnim}
          />
          <HeroStat
            label={t('liveDashboard.stats.checkInRate')}
            value={`${metrics.checkInPct}`}
            suffix="%"
            fade={fadeAnim}
          />
        </Animated.View>

        <ChartCard fade={fadeAnim} title={t('liveDashboard.charts.checkInTrend')}>
          <AreaChart
            data={metrics.checkInSeries}
            labels={metrics.checkInLabels}
            w={CHART_W - 32}
            color="#4ade80"
            gradId="pastCheckInArea"
          />
        </ChartCard>

        <ChartCard
          fade={fadeAnim}
          title={t('eventStats.charts.ticketSales')}
          subtitle={t('eventStats.charts.totalSold', { count: formatCount(metrics.ticketsSold) })}
        >
          <BarChart
            data={metrics.salesSeries}
            labels={metrics.salesLabels}
            w={CHART_W - 32}
            color="#FF4B8C"
          />
        </ChartCard>

        {metrics.ticketBreakdown.length > 0 && (
          <>
            <SectionLabel fade={fadeAnim}>{t('liveDashboard.ticketBreakdown.title')}</SectionLabel>
            <Animated.View style={[dashStyles.grid2, { opacity: fadeAnim }]}>
              {metrics.ticketBreakdown.map((tk, i) => {
                const pct = tk.total > 0 ? Math.round((tk.sold / tk.total) * 100) : 0;
                const singleTicket = metrics.ticketBreakdown.length === 1;
                return (
                  <View key={tk.name + i} style={singleTicket ? dashStyles.grid2CellFull : dashStyles.grid2Cell}>
                    <Card fade={fadeAnim} style={dashStyles.ticketCardGrid}>
                      <Text style={dashStyles.ticketName} numberOfLines={1}>{tk.name}</Text>
                      <Text style={dashStyles.ticketCount}>
                        {formatCount(tk.sold)}{tk.total > 0 ? ` / ${formatCount(tk.total)}` : ''}
                      </Text>
                      <View style={dashStyles.ticketBarTrack}>
                        <View style={[dashStyles.ticketBarFill, { width: `${Math.min(pct, 100)}%` }]} />
                      </View>
                      {tk.price > 0 && (
                        <Text style={dashStyles.ticketPrice}>
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

        <SectionLabel
          fade={fadeAnim}
          right={(
            <TouchableOpacity
              style={dashStyles.textActionBtn}
              onPress={() => navigation.navigate('Attendees', { event, managerMode: true })}
              activeOpacity={0.7}
            >
              <Icon name="users" type="feather" size={14} color="#FFFFFF" />
              <Text style={dashStyles.textActionGuest}>{t('manageEvents.guestList')}</Text>
            </TouchableOpacity>
          )}
        >
          {t('liveDashboard.recentCheckIns.title')}
        </SectionLabel>

        {metrics.recentCheckIns.length > 0 ? (
          metrics.recentCheckIns.map((checkIn, i) => (
            <Card key={`${checkIn.name}-${i}`} fade={fadeAnim}>
              <View style={dashStyles.checkInRow}>
                <Image
                  source={resolveAvatarSource(checkIn.avatar)}
                  style={dashStyles.checkInAvatar}
                />
                <View style={dashStyles.checkInInfo}>
                  <Text style={dashStyles.checkInName}>{checkIn.name}</Text>
                  <Text style={dashStyles.checkInType}>
                    {checkIn.ticketType || t('liveDashboard.recentCheckIns.generalAdmission')}
                  </Text>
                </View>
                {checkIn.timestamp ? (
                  <Text style={dashStyles.checkInTime}>{formatTimeAgo(checkIn.timestamp, t)}</Text>
                ) : null}
              </View>
            </Card>
          ))
        ) : (
          <Card fade={fadeAnim}>
            <Text style={styles.emptyCheckIns}>{t('eventStats.noCheckIns')}</Text>
          </Card>
        )}
      </ScrollView>
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
  lipDuration: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  lipSpacer: {
    width: 36,
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
    alignSelf: 'flex-start',
    maxWidth: '92%',
    marginBottom: 4,
  },
  completedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  completedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
  },
  completedSep: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  },
  completedDate: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  venueText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },
  emptyCheckIns: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default EventStats;
