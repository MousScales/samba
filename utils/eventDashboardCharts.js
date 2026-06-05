import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Text } from '@rneui/themed';
import Svg, {
  Path, Defs, LinearGradient as SvgGradient, Stop,
  Rect, Circle, G, Line, Text as SvgText,
} from 'react-native-svg';
import { Dimensions } from 'react-native';
import { formatCount } from './formatNumbers';

export const CHART_W = Dimensions.get('window').width - 40;

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

export const buildCheckInTrend = (checkedIn, seed = 42) => {
  const rng = sr(seed);
  const buckets = 12;
  if (checkedIn <= 0) return Array(buckets).fill(0);
  return Array.from({ length: buckets }, (_, i) => {
    if (i === buckets - 1) return checkedIn;
    const progress = (i + 1) / buckets;
    return Math.max(0, Math.round(checkedIn * progress * (0.8 + rng() * 0.2)));
  });
};

export const buildSalesTrend = (total, seed = 99) => {
  const rng = sr(seed);
  const buckets = 8;
  if (total <= 0) return Array(buckets).fill(0);
  return Array.from({ length: buckets }, (_, i) => {
    if (i === buckets - 1) return total;
    const progress = (i + 1) / buckets;
    return Math.max(0, Math.round(total * progress * (0.75 + rng() * 0.25)));
  });
};

export const fmtRevenue = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
};

export const AreaChart = ({ data, labels, w, h = 130, color = '#4ade80', formatY = (v) => formatCount(Math.round(v)), gradId = 'areaGrad' }) => {
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
        <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
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
      <Path d={area} fill={`url(#${gradId})`} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill={color} />
    </Svg>
  );
};

export const BarChart = ({ data, labels, w, h = 100, color = '#60a5fa' }) => {
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

export const Card = ({ children, style, fade }) => (
  <Animated.View style={[dashStyles.card, style, fade != null && { opacity: fade }]}>
    {children}
  </Animated.View>
);

export const HeroStat = ({ label, value, suffix = '', accent, fade }) => (
  <View style={dashStyles.grid3Cell}>
    <Card fade={fade} style={dashStyles.heroStat}>
      <Text style={[dashStyles.heroStatValue, accent && { color: accent }]} numberOfLines={1}>
        {value}{suffix}
      </Text>
      <Text style={dashStyles.heroStatLabel} numberOfLines={2}>{label}</Text>
    </Card>
  </View>
);

export const ChartCard = ({ title, subtitle, children, fade }) => (
  <Card fade={fade} style={dashStyles.chartCard}>
    <View style={dashStyles.chartHeader}>
      <Text style={dashStyles.chartTitle}>{title}</Text>
      {subtitle ? <Text style={dashStyles.chartSubtitle}>{subtitle}</Text> : null}
    </View>
    {children}
  </Card>
);

export const SectionLabel = ({ children, right, fade }) => (
  <Animated.View style={[dashStyles.sectionLabelRow, fade != null && { opacity: fade }]}>
    <Text style={dashStyles.sectionLabel}>{children}</Text>
    {right}
  </Animated.View>
);

export const dashStyles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: 'rgba(22,22,22,0.92)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
  textActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingLeft: 8,
  },
  textActionGuest: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
