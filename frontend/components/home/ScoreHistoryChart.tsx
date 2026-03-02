import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface HistoryEntry { date: string; score: number; }
interface Props { lang: string; }

const W = Math.min(Dimensions.get('window').width - 64, 420);
const H = 150;
const PAD = { top: 10, right: 12, bottom: 28, left: 32 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function scoreColor(s: number): string {
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
      } catch { /* silent */ }
    })();
  }, [lang]);

  if (history.length < 2) return null;

  const scores = history.map(e => e.score);
  const minS = Math.max(0, Math.min(...scores) - 10);
  const maxS = Math.min(100, Math.max(...scores) + 10);
  const range = maxS - minS || 1;

  const x = (i: number) => PAD.left + (i / (history.length - 1)) * CW;
  const y = (s: number) => PAD.top + CH - ((s - minS) / range) * CH;

  // Build smooth path
  const pts = history.map((e, i) => ({ x: x(i), y: y(e.score) }));
  let pathD = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx1 = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.4;
    const cpx2 = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.4;
    pathD += ` C ${cpx1} ${pts[i - 1].y}, ${cpx2} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
  }

  // Fill area
  const fillD = `${pathD} L ${pts[pts.length - 1].x} ${PAD.top + CH} L ${pts[0].x} ${PAD.top + CH} Z`;

  const first = scores[0];
  const last = scores[scores.length - 1];
  const diff = last - first;
  const improving = diff >= 0;

  // Y-axis labels (3 ticks)
  const yTicks = [minS, Math.round((minS + maxS) / 2), maxS];

  // X-axis labels (first, mid, last)
  const fmt = (d: string) => { const p = d.split('-'); return `${p[2]}.${p[1]}`; };
  const mid = Math.floor(history.length / 2);
  const xLabels = [
    { i: 0, text: fmt(history[0].date) },
    { i: mid, text: fmt(history[mid].date) },
    { i: history.length - 1, text: fmt(history[history.length - 1].date) },
  ];

  return (
    <View style={styles.card} data-testid="score-history-chart">
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

      <Svg width={W} height={H}>
        {/* Y grid lines */}
        {yTicks.map(t => (
          <Line key={t} x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} stroke="#F1F5F9" strokeWidth={1} />
        ))}
        {/* Y labels */}
        {yTicks.map(t => (
          <SvgText key={`yl-${t}`} x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fill="#94A3B8" fontSize={10}>{t}</SvgText>
        ))}
        {/* Fill gradient area */}
        <Path d={fillD} fill={improving ? '#22C55E' : '#EAB308'} opacity={0.1} />
        {/* Line */}
        <Path d={pathD} fill="none" stroke={improving ? '#22C55E' : '#EAB308'} strokeWidth={2.5} strokeLinecap="round" />
        {/* Dots */}
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#FFF" stroke={scoreColor(scores[i])} strokeWidth={2} />
        ))}
        {/* X labels */}
        {xLabels.map(l => (
          <SvgText key={`xl-${l.i}`} x={x(l.i)} y={H - 4} textAnchor="middle" fill="#94A3B8" fontSize={10}>{l.text}</SvgText>
        ))}
      </Svg>

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
});
