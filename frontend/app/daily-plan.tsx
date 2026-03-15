import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useLang } from '../src/LangContext';
import { tx } from '../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const TIMING_ICONS: Record<string, string> = {
  morning: 'weather-sunny',
  noon: 'weather-partly-cloudy',
  evening: 'weather-night',
};
const TIMING_COLORS: Record<string, string[]> = {
  morning: ['#FEF3C7', '#F59E0B'],
  noon: ['#FEE2E2', '#EF4444'],
  evening: ['#EDE9FE', '#7C3AED'],
};

export default function DailyPlanScreen() {
  const { lang } = useLang();
  const router = useRouter();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = useCallback(async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    setProfileId(pid);
    if (!pid) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/api/medications/${pid}/daily-plan?lang=${lang}`);
      if (res.ok) setPlan(await res.json());
    } catch {} finally { setLoading(false); }
  }, [lang]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  const toggleItem = async (item: any) => {
    if (!profileId) return;
    if (item.type === 'medication') {
      await fetch(`${API_URL}/api/medications/${profileId}/${item.id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timing: item.timing }),
      });
    } else {
      // Supplement check-in
      await fetch(`${API_URL}/api/supplements/quick-check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, supplement_ids: [item.id], timing: item.timing }),
      });
    }
    loadPlan();
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#4A8B71" /></View>;

  const pct = plan?.percentage || 0;

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#1A3C34', '#2D6A4F', '#40916C']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{tx(lang, { de: 'Tagesplan', it: 'Piano giornaliero', en: 'Tagesplan' })}</Text>
          <Text style={s.headerSub}>{plan?.date || ''}</Text>
        </View>
        <View style={s.pctBadge}>
          <Text style={s.pctText}>{pct}%</Text>
        </View>
      </LinearGradient>

      {/* Progress bar */}
      <View style={s.progressWrap}>
        <View style={s.progressBg}>
          <Animated.View entering={FadeIn.duration(500)} style={[s.progressFill, { width: `${Math.min(pct, 100)}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>
          {plan?.checked_items || 0} / {plan?.total_items || 0} {tx(lang, { de: 'erledigt', it: 'completati', en: 'erledigt' })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {(!plan?.plan || plan.plan.length === 0) ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="calendar-check" size={50} color="#D1D5DB" />
            <Text style={s.emptyText}>{tx(lang, { de: 'Keine Einnahmen fuer heute geplant.', it: 'Nessuna assunzione pianificata per oggi.', en: 'Keine Einnahmen fuer heute geplant.' })}</Text>
          </View>
        ) : (
          plan.plan.map((group: any, gi: number) => (
            <Animated.View key={group.timing} entering={FadeInDown.delay(gi * 100).duration(300)} style={s.timingGroup}>
              {/* Timing header */}
              <View style={[s.timingHeader, { backgroundColor: TIMING_COLORS[group.timing]?.[0] || '#F3F4F6' }]}>
                <MaterialCommunityIcons name={TIMING_ICONS[group.timing] as any || 'clock'} size={20} color={TIMING_COLORS[group.timing]?.[1] || '#6B7280'} />
                <Text style={[s.timingLabel, { color: TIMING_COLORS[group.timing]?.[1] || '#6B7280' }]}>{group.label}</Text>
                <Text style={s.timingCount}>{group.items.filter((i: any) => i.checked).length}/{group.items.length}</Text>
              </View>

              {/* Items */}
              {group.items.map((item: any, ii: number) => (
                <TouchableOpacity
                  key={`${item.id}-${item.timing}-${ii}`}
                  style={[s.itemRow, item.checked && s.itemChecked]}
                  activeOpacity={0.7}
                  onPress={() => toggleItem(item)}
                  data-testid={`daily-plan-item-${item.id}`}
                >
                  {/* Checkbox */}
                  <View style={[s.checkbox, item.checked && s.checkboxChecked, item.type === 'medication' && !item.checked && s.checkboxMed]}>
                    {item.checked && <MaterialCommunityIcons name="check" size={14} color="#FFF" />}
                  </View>

                  {/* Type indicator */}
                  <View style={[s.typeIcon, item.type === 'medication' ? s.typeIconMed : s.typeIconSupp]}>
                    <MaterialCommunityIcons
                      name={item.type === 'medication' ? 'pill' : 'leaf'}
                      size={14}
                      color={item.type === 'medication' ? '#3B82F6' : '#4A8B71'}
                    />
                  </View>

                  {/* Info */}
                  <View style={s.itemInfo}>
                    <Text style={[s.itemName, item.checked && s.itemNameChecked]}>{item.name}</Text>
                    <Text style={s.itemDosage}>
                      {item.dosage}
                      {item.meal_relation ? ` · ${item.meal_relation}` : ''}
                    </Text>
                  </View>

                  {/* Type badge */}
                  <View style={[s.typeBadge, item.type === 'medication' ? s.typeBadgeMed : s.typeBadgeSupp]}>
                    <Text style={[s.typeBadgeText, item.type === 'medication' ? s.typeBadgeTextMed : s.typeBadgeTextSupp]}>
                      {item.type === 'medication' ? (tx(lang, { de: 'Med', it: 'Farm', en: 'Med' })) : (tx(lang, { de: 'Supp', it: 'Int', en: 'Supp' }))}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAF9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 10 : 40, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  pctBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  pctText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  progressWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  progressBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#4A8B71', borderRadius: 4 },
  progressLabel: { fontSize: 12, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 12, textAlign: 'center' },
  timingGroup: { marginBottom: 20 },
  timingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 8 },
  timingLabel: { fontSize: 15, fontWeight: '700', flex: 1 },
  timingCount: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 6, gap: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  itemChecked: { opacity: 0.65 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#4A8B71', borderColor: '#4A8B71' },
  checkboxMed: { borderColor: '#93C5FD' },
  typeIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  typeIconSupp: { backgroundColor: '#ECFDF5' },
  typeIconMed: { backgroundColor: '#EFF6FF' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#94A3B8' },
  itemDosage: { fontSize: 12, color: '#64748B', marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeSupp: { backgroundColor: '#ECFDF5' },
  typeBadgeMed: { backgroundColor: '#EFF6FF' },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  typeBadgeTextSupp: { color: '#4A8B71' },
  typeBadgeTextMed: { color: '#3B82F6' },
});
