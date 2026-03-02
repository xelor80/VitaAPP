import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface HistoryEntry { date: string; score: number; }
interface Props { lang: string; }

const BAR_HEIGHT = 120;

function barColor(s: number): string {
  if (s >= 71) return '#22C55E';
  if (s >= 41) return '#EAB308';
  return '#EF4444';
}

export function ScoreHistoryChart({ lang }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const pid = await AsyncStorage.getItem('health_profile_id');
        if (!pid) return;
        const res = await fetch(`${API_URL}/api/health-score/${pid}/history?weeks=12`);
        if (res.ok) {
          const d = await res.json();
          if (d.history?.length > 1) setHistory(d.history);
        }
      } catch {}
    })();
  }, [lang]);

  if (history.length < 2) return null;

  const scores = history.map(e => e.score);
  const first = scores[0];
  const last = scores[scores.length - 1];
  const diff = last - first;
  const improving = diff >= 0;

  const fmt = (d: string) => {
    const p = d.split('-');
    return `${p[2]}.${p[1]}`;
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {lang === 'de' ? 'Score-Verlauf' : 'Andamento Score'}
        </Text>
        {diff !== 0 && (
          <View style={[styles.badge, { backgroundColor: improving ? '#DCFCE7' : '#FEE2E2' }]}>
            <MaterialCommunityIcons
              name={improving ? 'trending-up' : 'trending-down'}
              size={14}
              color={improving ? '#16A34A' : '#DC2626'}
            />
            <Text style={[styles.badgeText, { color: improving ? '#16A34A' : '#DC2626' }]}>
              {improving ? '+' : ''}{diff} {lang === 'de' ? 'Pkt' : 'Pts'}
            </Text>
          </View>
        )}
      </View>

      {/* Bar chart */}
      <View style={styles.chartArea}>
        {/* Y-axis reference lines */}
        <View style={styles.refLines}>
          <View style={styles.refLine}>
            <Text style={styles.refLabel}>100</Text>
            <View style={styles.refDash} />
          </View>
          <View style={styles.refLine}>
            <Text style={styles.refLabel}>70</Text>
            <View style={[styles.refDash, { borderColor: '#22C55E40' }]} />
          </View>
          <View style={styles.refLine}>
            <Text style={styles.refLabel}>40</Text>
            <View style={[styles.refDash, { borderColor: '#EAB30840' }]} />
          </View>
          <View style={styles.refLine}>
            <Text style={styles.refLabel}>0</Text>
            <View style={styles.refDash} />
          </View>
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {history.map((entry, i) => {
            const h = (entry.score / 100) * BAR_HEIGHT;
            const color = barColor(entry.score);
            const isLast = i === history.length - 1;
            return (
              <View key={entry.date} style={styles.barCol}>
                <View style={styles.barWrap}>
                  {isLast && (
                    <Text style={[styles.barValue, { color }]}>{entry.score}</Text>
                  )}
                  <View style={[styles.bar, {
                    height: h,
                    backgroundColor: color,
                    opacity: isLast ? 1 : 0.5 + (i / history.length) * 0.5,
                  }]} />
                </View>
                <Text style={styles.barDate}>{fmt(entry.date)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { c: '#22C55E', t: lang === 'de' ? '71-100 Gut' : '71-100 Buono' },
          { c: '#EAB308', t: lang === 'de' ? '41-70 Mittel' : '41-70 Medio' },
          { c: '#EF4444', t: lang === 'de' ? '0-40 Niedrig' : '0-40 Basso' },
        ].map(z => (
          <View key={z.c} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: z.c }]} />
            <Text style={styles.legendText}>{z.t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  chartArea: {
    position: 'relative',
    paddingLeft: 30,
    marginBottom: 12,
  },
  refLines: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 20,
    width: '100%',
    justifyContent: 'space-between',
  },
  refLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refLabel: {
    fontSize: 9,
    color: '#94A3B8',
    width: 24,
    textAlign: 'right',
    marginRight: 6,
  },
  refDash: {
    flex: 1,
    height: 0,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: BAR_HEIGHT + 24,
    paddingTop: 20,
    gap: 6,
  },
  barCol: {
    alignItems: 'center',
    width: 32,
  },
  barWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: BAR_HEIGHT + 20,
  },
  bar: {
    width: 20,
    borderRadius: 10,
    minHeight: 4,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },
  barDate: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 5,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
});
