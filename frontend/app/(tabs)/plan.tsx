import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLang } from '../../src/LangContext';
import { eventBus } from '../../src/eventBus';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PlanTab() {
  const router = useRouter();
  const { lang } = useLang();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [dailyPlan, setDailyPlan] = useState<any>(null);
  const [medCount, setMedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    setProfileId(pid);
    setHasProfile(!!pid);
    if (!pid) { setLoading(false); return; }
    try {
      const [planRes, medRes] = await Promise.all([
        fetch(`${API_URL}/api/medications/${pid}/daily-plan?lang=${lang}`),
        fetch(`${API_URL}/api/medications/${pid}`),
      ]);
      if (planRes.ok) setDailyPlan(await planRes.json());
      if (medRes.ok) {
        const d = await medRes.json();
        setMedCount((d.medications || []).length);
      }
    } catch {} finally { setLoading(false); }
  }, [lang]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => {
    eventBus.on('profileUpdated', loadData);
    return () => eventBus.off('profileUpdated', loadData);
  }, [loadData]);

  if (hasProfile === null || loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2E7D52" /></View>;
  }

  if (!hasProfile) {
    return (
      <View style={s.container}>
        <LinearGradient colors={['#1B6B45', '#2E9E6B', '#43C68A']} style={s.header}>
          <Text style={s.headerTitle}>{lang === 'de' ? 'Mein Plan' : 'Il mio piano'}</Text>
        </LinearGradient>
        <View style={s.emptyState}>
          <MaterialCommunityIcons name="pill" size={80} color="#D1D5DB" />
          <Text style={s.emptyTitle}>{lang === 'de' ? 'Kein Plan vorhanden' : 'Nessun piano presente'}</Text>
          <Text style={s.emptyText}>
            {lang === 'de'
              ? 'Erstelle zuerst dein Gesundheitsprofil.'
              : 'Crea prima il tuo profilo salute.'}
          </Text>
          <TouchableOpacity style={s.createBtn} onPress={() => router.push('/onboarding' as any)} data-testid="create-plan-btn">
            <Text style={s.createBtnText}>{lang === 'de' ? 'Profil erstellen' : 'Crea profilo'}</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pct = dailyPlan?.percentage || 0;
  const checked = dailyPlan?.checked_items || 0;
  const total = dailyPlan?.total_items || 0;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#1B6B45', '#2E9E6B', '#43C68A']} style={s.header}>
        <Text style={s.headerTitle}>{lang === 'de' ? 'Mein Plan' : 'Il mio piano'}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Daily Progress Card */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/daily-plan' as any)}
            data-testid="daily-plan-card"
          >
            <LinearGradient colors={['#F0FDF4', '#ECFDF5', '#FFF']} style={s.dailyCard}>
              <View style={s.dailyTop}>
                <View>
                  <Text style={s.dailyTitle}>{lang === 'de' ? 'Tagesplan' : 'Piano giornaliero'}</Text>
                  <Text style={s.dailySub}>{lang === 'de' ? 'Supplements & Medikamente' : 'Integratori & Farmaci'}</Text>
                </View>
                <View style={s.dailyPct}>
                  <Text style={s.dailyPctNum}>{pct}%</Text>
                </View>
              </View>
              <View style={s.dailyProgressBg}>
                <View style={[s.dailyProgressFill, { width: `${Math.min(pct, 100)}%` as any }]} />
              </View>
              <Text style={s.dailyLabel}>{checked} / {total} {lang === 'de' ? 'erledigt' : 'completati'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Navigation Cards */}
        <View style={s.cardsRow}>
          {/* Supplement Plan */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={s.cardHalf}>
            <TouchableOpacity
              style={s.navCard}
              activeOpacity={0.85}
              onPress={() => router.push('/supplement-plan' as any)}
              data-testid="supplement-plan-card"
            >
              <View style={[s.navIcon, { backgroundColor: '#ECFDF5' }]}>
                <MaterialCommunityIcons name="leaf" size={24} color="#4A8B71" />
              </View>
              <Text style={s.navTitle}>{lang === 'de' ? 'Supplement\nPlan' : 'Piano\nIntegratori'}</Text>
              <Text style={s.navSub}>{lang === 'de' ? '8-Wochen Plan' : 'Piano 8 settimane'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" style={s.navArrow} />
            </TouchableOpacity>
          </Animated.View>

          {/* Medications */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={s.cardHalf}>
            <TouchableOpacity
              style={s.navCard}
              activeOpacity={0.85}
              onPress={() => router.push('/medications' as any)}
              data-testid="medications-card"
            >
              <View style={[s.navIcon, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="pill" size={24} color="#3B82F6" />
              </View>
              <Text style={s.navTitle}>{lang === 'de' ? 'Medikamente' : 'Farmaci'}</Text>
              <Text style={s.navSub}>
                {medCount > 0
                  ? `${medCount} ${lang === 'de' ? 'aktiv' : 'attivi'}`
                  : (lang === 'de' ? 'Verwalten' : 'Gestisci')}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" style={s.navArrow} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Quick overview of today's plan */}
        {dailyPlan?.plan?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(300)} style={s.quickSection}>
            <Text style={s.quickTitle}>{lang === 'de' ? 'Heute offen' : 'Aperti oggi'}</Text>
            {dailyPlan.plan.map((group: any) => {
              const open = group.items.filter((i: any) => !i.checked);
              if (open.length === 0) return null;
              return (
                <View key={group.timing} style={s.quickGroup}>
                  <Text style={s.quickTiming}>{group.label}</Text>
                  {open.slice(0, 4).map((item: any) => (
                    <View key={`${item.id}-${item.timing}`} style={s.quickItem}>
                      <MaterialCommunityIcons
                        name={item.type === 'medication' ? 'pill' : 'leaf'}
                        size={14}
                        color={item.type === 'medication' ? '#3B82F6' : '#4A8B71'}
                      />
                      <Text style={s.quickItemText}>{item.name}</Text>
                      <Text style={s.quickItemDose}>{item.dosage}</Text>
                    </View>
                  ))}
                  {open.length > 4 && (
                    <Text style={s.quickMore}>+{open.length - 4} {lang === 'de' ? 'weitere' : 'altri'}</Text>
                  )}
                </View>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 20, paddingHorizontal: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  // Daily card
  dailyCard: { borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#D1FAE5' },
  dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dailyTitle: { fontSize: 18, fontWeight: '800', color: '#1A3C34' },
  dailySub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  dailyPct: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  dailyPctNum: { fontSize: 16, fontWeight: '800', color: '#1B6B45' },
  dailyProgressBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  dailyProgressFill: { height: 8, backgroundColor: '#4A8B71', borderRadius: 4 },
  dailyLabel: { fontSize: 12, color: '#6B7280', marginTop: 8 },
  // Cards row
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  cardHalf: { flex: 1 },
  navCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, minHeight: 140, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  navIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', lineHeight: 20 },
  navSub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  navArrow: { position: 'absolute', top: 16, right: 16 },
  // Quick overview
  quickSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  quickTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  quickGroup: { marginBottom: 12 },
  quickTiming: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  quickItemText: { fontSize: 14, color: '#374151', flex: 1 },
  quickItemDose: { fontSize: 12, color: '#94A3B8' },
  quickMore: { fontSize: 12, color: '#3B82F6', marginTop: 4 },
  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A2E35', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2E7D52', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, marginTop: 24 },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
