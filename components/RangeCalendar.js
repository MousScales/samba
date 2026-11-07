import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const DAY_KEYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const CAL_CELL = (width - 40 - 16) / 7;

export const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isDateInRange = (date, range) => {
  if (!range?.start || !date) return true;
  const t = startOfDay(date).getTime();
  const start = startOfDay(range.start).getTime();
  const end = startOfDay(range.end || range.start).getTime();
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  return t >= lo && t <= hi;
};

export const hasActiveRange = (range) => !!range?.start;

export const formatDateRangeLabel = (range, locale, t) => {
  if (!range?.start) return '';
  const fmt = (d) => d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  if (!range.end || sameDay(range.start, range.end)) {
    return fmt(range.start);
  }
  return t('explore.calendar.rangeLabel', { start: fmt(range.start), end: fmt(range.end) });
};

const getDayVisualState = (dayDate, range) => {
  if (!range?.start) {
    return { inRange: false, isStart: false, isEnd: false };
  }
  const t = startOfDay(dayDate).getTime();
  const start = startOfDay(range.start).getTime();
  const end = startOfDay(range.end || range.start).getTime();
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const inRange = t >= lo && t <= hi;
  return {
    inRange,
    isStart: t === lo,
    isEnd: range.end != null && t === hi,
  };
};

/**
 * Inline calendar with start + end date range selection.
 * First tap sets start, second tap sets end (auto-swaps if needed).
 */
export default function RangeCalendar({ range, onChange, onRangeComplete, locale }) {
  const { t } = useLanguage();
  const today = new Date();
  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth());

  const prevMo = () => (mo === 0 ? (setMo(11), setYr((y) => y - 1)) : setMo((m) => m - 1));
  const nextMo = () => (mo === 11 ? (setMo(0), setYr((y) => y + 1)) : setMo((m) => m + 1));

  const first = new Date(yr, mo, 1).getDay();
  const days = new Date(yr, mo + 1, 0).getDate();
  const cells = Array(first).fill(null).concat(Array.from({ length: days }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayPress = (day) => {
    const picked = new Date(yr, mo, day);
    if (!range?.start || (range.start && range.end)) {
      onChange({ start: picked, end: null });
      return;
    }
    const start = range.start;
    if (picked.getTime() < start.getTime()) {
      onChange({ start: picked, end: start });
    } else {
      onChange({ start, end: picked });
    }
    onRangeComplete?.();
  };

  const hint = !range?.start
    ? t('explore.calendar.selectStart')
    : !range.end
      ? t('explore.calendar.selectEnd')
      : formatDateRangeLabel(range, locale, t);

  return (
    <View style={styles.cal}>
      <Text style={styles.hint}>{hint}</Text>
      <View style={styles.nav}>
        <TouchableOpacity onPress={prevMo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-left" type="feather" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.label}>{t(`calendar.months.${MONTH_KEYS[mo]}`)} {yr}</Text>
        <TouchableOpacity onPress={nextMo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-right" type="feather" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        {DAY_KEYS.map((d) => (
          <Text key={d} style={styles.dayH}>{t(`calendar.daysShort.${d}`)}</Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={styles.row}>
          {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
            if (!d) {
              return <View key={i} style={styles.cell} />;
            }
            const dayDate = new Date(yr, mo, d);
            const { inRange, isStart, isEnd } = getDayVisualState(dayDate, range);
            const isToday = d === today.getDate() && mo === today.getMonth() && yr === today.getFullYear();
            const endpoint = isStart || isEnd;

            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.cell,
                  inRange && styles.rangeCell,
                  endpoint && styles.endpointCell,
                ]}
                onPress={() => handleDayPress(d)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.cellTxt,
                  isToday && !endpoint && styles.todayTxt,
                  endpoint && styles.endpointTxt,
                ]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      {hasActiveRange(range) && (
        <TouchableOpacity style={styles.clear} onPress={() => onChange({ start: null, end: null })}>
          <Text style={styles.clearTxt}>{t('explore.calendar.clearFilter')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cal: { paddingTop: 8, paddingBottom: 8 },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginBottom: 10,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  label: { fontSize: 14, fontWeight: '700', color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  dayH: {
    width: CAL_CELL,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
  },
  cell: {
    width: CAL_CELL,
    height: CAL_CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CAL_CELL / 2,
  },
  rangeCell: {
    backgroundColor: 'rgba(255, 75, 140, 0.18)',
    borderRadius: 8,
  },
  endpointCell: {
    backgroundColor: '#FF4B8C',
    borderRadius: CAL_CELL / 2,
  },
  cellTxt: { fontSize: 13, fontWeight: '500', color: '#fff' },
  todayTxt: { color: '#FF4B8C', fontWeight: '700' },
  endpointTxt: { color: '#fff', fontWeight: '700' },
  clear: { alignSelf: 'center', marginTop: 8, paddingVertical: 6, paddingHorizontal: 16 },
  clearTxt: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
});
