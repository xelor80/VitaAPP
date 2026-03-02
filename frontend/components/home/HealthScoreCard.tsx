import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const RADIUS = 58;
const STROKE = 10;
const SIZE = (RADIUS + STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(s: number): string {
  if (s >= 71) return '#22C55E';
  if (s >= 41) return '#EAB308';
  return '#EF4444';
}

function scoreBg(s: number): string {
  if (s >= 71) return '#DCFCE7';
  if (s >= 41) return '#FEF9C3';
  return '#FEE2E2';
}

function catIcon(key: string): string {
  const map: Record<string, string> = {
    'mikronährstoff_risiko': 'pill',
    'schlaf': 'weather-night',
    'stress': 'head-snowflake-outline',
    'energie': 'lightning-bolt',
  };
  return map[key] || 'circle';
}

function catLabel(key: string, lang: string): string {
  const labels: Record<string, Record<string, string>> = {
    'mikronährstoff_risiko': { de: 'Mikronährstoffe', it: 'Micronutrienti' },
    'schlaf': { de: 'Schlaf', it: 'Sonno' },
    'stress': { de: 'Stress', it: 'Stress' },
    'energie': { de: 'Energie', it: 'Energia' },
  };
  return labels[key]?.[lang] || key;
}

function catStatus(val: number, lang: string): { text: string; color: string } {
  if (val >= 70) return { text: lang === 'de' ? 'Gut' : 'Buono', color: '#22C55E' };
  if (val >= 40) return { text: lang === 'de' ? 'Mittel' : 'Medio', color: '#EAB308' };
  return { text: lang === 'de' ? 'Niedrig' : 'Basso', color: '#EF4444' };
}

interface Props {
  lang: string;
  onPress?: () => void;
}

export function HealthScoreCard({ lang, onPress }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadScore();
  }, []);

  const loadScore = async () => {
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      if (!profileId) { setLoading(false); return; }
      const res = await fetch(`${API_URL}/api/health-score/${profileId}?lang=${lang}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        Animated.timing(animVal, {
          toValue: d.score / 100,
          duration: 1200,
          useNativeDriver: false,
        }).start();
      }
    } catch (e) {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) return null;

  const score = data.score;
  const color = scoreColor(score);
  const offset = CIRCUMFERENCE * (1 - score / 100);
  const categories = data.categories || {};
  const catKeys = Object.keys(categories);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      data-testid="health-score-card"
    >
      {/* Top Row: Circle + Categories */}
      <View style={styles.topRow}>
        {/* Circle */}
        <View style={styles.circleWrap}>
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <LinearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={score >= 41 ? '#22C55E' : '#EF4444'} />
                <Stop offset="100%" stopColor={color} />
              </LinearGradient>
            </Defs>
            {/* Background */}
            <Circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              stroke="#E5E7EB" strokeWidth={STROKE} fill="none"
            />
            {/* Score arc */}
            <Circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              stroke="url(#scoreGrad)" strokeWidth={STROKE} fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              strokeLinecap="round"
              rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          </Svg>
          {/* Center text */}
          <View style={styles.circleCenter}>
            <Text style={[styles.scoreNum, { color }]}>{score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.catCol}>
          {catKeys.map((key) => {
            const val = categories[key];
            const status = catStatus(val, lang);
            return (
              <View key={key} style={styles.catRow} data-testid={`health-cat-${key}`}>
                <MaterialCommunityIcons name={catIcon(key) as any} size={18} color="#64748B" />
                <Text style={styles.catName}>{catLabel(key, lang)}</Text>
                <View style={[styles.catBadge, { backgroundColor: status.color + '20' }]}>
                  <Text style={[styles.catBadgeText, { color: status.color }]}>{status.text}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Label + Trend */}
      <View style={[styles.labelRow, { backgroundColor: scoreBg(score) }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.labelText, { color }]} data-testid="health-score-label">
            {data.label}
          </Text>
          {data.recommendation ? (
            <Text style={styles.recText}>{data.recommendation}</Text>
          ) : null}
        </View>
        {data.trend_change !== null && (
          <View style={styles.trendBox} data-testid="health-score-trend">
            <MaterialCommunityIcons
              name={data.trend_change >= 0 ? 'trending-up' : 'trending-down'}
              size={20}
              color={data.trend_change >= 0 ? '#22C55E' : '#EF4444'}
            />
            <Text style={[styles.trendText, { color: data.trend_change >= 0 ? '#22C55E' : '#EF4444' }]}>
              {data.trend_change >= 0 ? '+' : ''}{data.trend_change}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  circleWrap: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreNum: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
  },
  scoreMax: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: -2,
  },
  catCol: {
    flex: 1,
    gap: 10,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  recText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  trendBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
