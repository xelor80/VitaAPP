import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLang } from '../src/LangContext';
import { tx } from '../src/i18n';
import { eventBus } from '../src/eventBus';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const fmtTime = (sec: number) => {
  if (sec <= 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export function WeightMetabolismCard({ profileId }: { profileId: string }) {
  const router = useRouter();
  const { lang } = useLang();
  const [data, setData] = useState<any>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!profileId) return;
    try {
      const res = await fetch(`${API_URL}/api/weight-metabolism/${profileId}/summary`);
      if (res.ok) setData(await res.json());
    } catch {}
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    eventBus.on('weight_metabolism_changed', handler);
    return () => eventBus.off('weight_metabolism_changed', handler);
  }, [load]);

  // Tick when fasting active
  useEffect(() => {
    if (!data?.fasting_active) return;
    const id = setInterval(() => setTick(t => t + 1), 30000); // refresh every 30s for the card
    return () => clearInterval(id);
  }, [data?.fasting_active]);

  if (!data) return null;

  const calsPct = data.calories_pct || 0;
  const proPct = data.protein_pct || 0;

  return (
    <TouchableOpacity
      style={st.card}
      activeOpacity={0.85}
      onPress={() => router.push('/weight-metabolism' as any)}
      data-testid="dashboard-weight-metabolism-card"
    >
      <View style={st.headerRow}>
        <View style={st.iconWrap}>
          <MaterialCommunityIcons name="scale-balance" size={22} color="#2E7D52" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>{tx(lang, { de: 'Gewicht & Stoffwechsel', it: 'Peso & metabolismo', en: 'Weight & metabolism' })}</Text>
          <Text style={st.sub}>{tx(lang, { de: 'Kalorien, Protein, Fasten', it: 'Calorie, proteine, digiuno', en: 'Calories, protein, fasting' })}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
      </View>

      <View style={st.metricRow}>
        <View style={st.metric}>
          <Text style={st.metricLabel}>{tx(lang, { de: 'Kalorien', it: 'Calorie', en: 'Calories' })}</Text>
          <Text style={st.metricValue}>{data.calories} / {data.calories_goal}</Text>
          <View style={st.bar}>
            <View style={[st.barFill, { width: `${Math.min(100, calsPct)}%`, backgroundColor: '#2E7D52' }]} />
          </View>
        </View>
        <View style={st.metric}>
          <Text style={st.metricLabel}>{tx(lang, { de: 'Protein', it: 'Proteine', en: 'Protein' })}</Text>
          <Text style={st.metricValue}>{data.protein_g}g / {data.protein_goal}g</Text>
          <View style={st.bar}>
            <View style={[st.barFill, { width: `${Math.min(100, proPct)}%`, backgroundColor: '#E8820C' }]} />
          </View>
        </View>
      </View>

      {data.fasting_active && (
        <View style={st.fastBanner}>
          <MaterialCommunityIcons name="timer-sand" size={14} color="#6D28D9" />
          <Text style={st.fastText}>
            {tx(lang, { de: 'Fasten aktiv', it: 'Digiuno attivo', en: 'Fasting' })} ·{' '}
            {data.fasting_remaining_seconds > 0
              ? `${fmtTime(data.fasting_remaining_seconds)} ${tx(lang, { de: 'verbleibend', it: 'rimanenti', en: 'left' })}`
              : tx(lang, { de: 'Ziel erreicht', it: 'Obiettivo raggiunto', en: 'Goal reached' })}
            {' '}({data.fasting_progress_pct}%)
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.04)' as any },
    }),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  sub: { fontSize: 11, color: '#6B7280', marginTop: 1 },

  metricRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  metricValue: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginTop: 2 },
  bar: { height: 5, backgroundColor: '#F1F5F2', borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  fastBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F2',
  },
  fastText: { fontSize: 12, color: '#6D28D9', fontWeight: '600' },
});

export default WeightMetabolismCard;
