import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const CHART_WIDTH = Math.min(Dimensions.get('window').width - 64, 400);

interface HistoryEntry {
  date: string;
  score: number;
}

interface Props {
  lang: string;
}

export function ScoreHistoryChart({ lang }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    loadHistory();
  }, [lang]);

  const loadHistory = async () => {
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      if (!profileId) return;
      const res = await fetch(`${API_URL}/api/health-score/${profileId}/history?weeks=12`);
      if (res.ok) {
        const d = await res.json();
        if (d.history?.length > 1) setHistory(d.history);
      }
    } catch { /* silent */ }
  };

  if (history.length < 2) return null;

  const labels = history.map(e => {
    const d = new Date(e.date);
    return `${d.getDate()}.${d.getMonth() + 1}`;
  });
  const scores = history.map(e => e.score);
  const first = scores[0];
  const last = scores[scores.length - 1];
  const diff = last - first;
  const improving = diff >= 0;

  return (
    <View style={styles.card} data-testid="score-history-chart">
      <View style={styles.header}>
        <Text style={styles.title}>
          {lang === 'de' ? 'Score-Verlauf' : 'Andamento Score'}
        </Text>
        {diff !== 0 && (
          <View style={[styles.diffBadge, { backgroundColor: improving ? '#DCFCE7' : '#FEE2E2' }]}>
            <Text style={[styles.diffText, { color: improving ? '#16A34A' : '#DC2626' }]}>
              {improving ? '+' : ''}{diff} {lang === 'de' ? 'Punkte' : 'Punti'}
            </Text>
          </View>
        )}
      </View>

      <LineChart
        data={{
          labels: labels.length > 6
            ? labels.filter((_, i) => i === 0 || i === labels.length - 1 || i % Math.ceil(labels.length / 5) === 0)
            : labels,
          datasets: [{
            data: scores,
            color: () => improving ? '#22C55E' : '#EAB308',
            strokeWidth: 3,
          }, {
            data: [0],   // min
            withDots: false,
            color: () => 'transparent',
          }, {
            data: [100], // max
            withDots: false,
            color: () => 'transparent',
          }],
        }}
        width={CHART_WIDTH}
        height={160}
        withShadow={false}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero={false}
        segments={3}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: '#FFFFFF',
          backgroundGradientTo: '#FFFFFF',
          decimalPlaces: 0,
          color: () => '#CBD5E1',
          labelColor: () => '#94A3B8',
          propsForLabels: { fontSize: 10 },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: improving ? '#22C55E' : '#EAB308',
            fill: '#FFFFFF',
          },
          propsForHorizontalLabels: { fontSize: 10 },
        }}
        style={styles.chart}
        bezier
      />

      <View style={styles.zones}>
        <View style={styles.zone}>
          <View style={[styles.zoneDot, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.zoneText}>71-100 {lang === 'de' ? 'Gut' : 'Buono'}</Text>
        </View>
        <View style={styles.zone}>
          <View style={[styles.zoneDot, { backgroundColor: '#EAB308' }]} />
          <Text style={styles.zoneText}>41-70 {lang === 'de' ? 'Mittel' : 'Medio'}</Text>
        </View>
        <View style={styles.zone}>
          <View style={[styles.zoneDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.zoneText}>0-40 {lang === 'de' ? 'Niedrig' : 'Basso'}</Text>
        </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chart: {
    marginLeft: -12,
    borderRadius: 12,
  },
  zones: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  zone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
