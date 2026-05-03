import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '../src/LangContext';
import { SmartProductBlock } from '../components/SmartProductBlock';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const VERO = require('../assets/images/vero-hallo.png');

const CAT_COLORS: Record<string, string> = {
  breathing: '#3B82F6', mini: '#8B5CF6', sleep: '#6366F1', focus: '#F59E0B', movement: '#10B981',
};
const CAT_ICONS: Record<string, string> = {
  breathing: 'weather-windy', mini: 'timer-sand', sleep: 'moon-waning-crescent', focus: 'target', movement: 'human-handsup',
};

export default function StressScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const t = useCallback((de: string, it: string) => lang === 'it' ? it : de, [lang]);

  const [exercises, setExercises] = useState<any[]>([]);
  const [categories, setCategories] = useState<any>({});
  const [recommendation, setRecommendation] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [stressLevel, setStressLevel] = useState(5);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    setProfileId(pid);
    try {
      const [exRes, recRes, stRes] = await Promise.all([
        fetch(`${API_URL}/api/stress/exercises?lang=${lang}`),
        pid ? fetch(`${API_URL}/api/stress/recommend/${pid}?lang=${lang}`) : null,
        pid ? fetch(`${API_URL}/api/stress/sessions/${pid}/stats`) : null,
      ]);
      if (exRes.ok) {
        const d = await exRes.json();
        setExercises(d.exercises);
        setCategories(d.categories);
      }
      if (recRes?.ok) {
        const d = await recRes.json();
        setRecommendation(d.recommendation);
        setReason(d.reason);
        setStressLevel(d.stress_level);
      }
      if (stRes?.ok) setStats(await stRes.json());
    } catch {}
    setLoading(false);
  };

  const startExercise = (exercise: any) => {
    router.push({ pathname: '/stress-player' as any, params: { exerciseId: exercise.id } });
  };

  const startSOS = () => {
    const sos = exercises.find(e => e.id === 'breath_calm') || exercises.find(e => e.category === 'breathing');
    if (sos) startExercise(sos);
  };

  const filteredExercises = selectedCat
    ? exercises.filter(e => e.category === selectedCat)
    : exercises;

  const quickExercises = exercises.filter(e => e.duration_seconds <= 180);

  if (loading) return (
    <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color="#2E7D52" /></View></SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header} data-testid="stress-header">
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={s.title}>{t('Stress & Entspannung', 'Stress & Rilassamento')}</Text>
        </View>

        {/* SOS Button */}
        <TouchableOpacity style={s.sosCard} activeOpacity={0.85} onPress={startSOS} data-testid="stress-sos-button">
          <LinearGradient colors={['#EF4444', '#DC2626']} style={s.sosGradient}>
            <MaterialCommunityIcons name="flash" size={28} color="#fff" />
            <View style={s.sosText}>
              <Text style={s.sosTitle}>{t('Ich bin gerade gestresst', 'Sono stressato adesso')}</Text>
              <Text style={s.sosSub}>{t('Sofort-Uebung starten (2 Min)', 'Esercizio immediato (2 min)')}</Text>
            </View>
            <MaterialCommunityIcons name="play-circle" size={32} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Recommendation */}
        {recommendation && (
          <View style={s.recCard} data-testid="stress-recommendation">
            <View style={s.recHeader}>
              <Image source={VERO} style={s.recVero} />
              <View style={{ flex: 1 }}>
                <Text style={s.recLabel}>{t('Heute empfohlen', 'Consigliato oggi')}</Text>
                <Text style={s.recReason} numberOfLines={2}>{reason}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.recExercise, { borderLeftColor: CAT_COLORS[recommendation.category] || '#2E7D52' }]}
              onPress={() => startExercise(recommendation)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={(CAT_ICONS[recommendation.category] || 'meditation') as any}
                size={24} color={CAT_COLORS[recommendation.category] || '#2E7D52'}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.recName}>{recommendation.name}</Text>
                <Text style={s.recMeta}>
                  {Math.ceil(recommendation.duration_seconds / 60)} min
                  {' | '}{recommendation.difficulty === 'easy' ? t('Einfach', 'Facile') : t('Mittel', 'Medio')}
                </Text>
              </View>
              <View style={s.playBtn}>
                <MaterialCommunityIcons name="play" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Stats */}
        {stats && stats.total_sessions > 0 && (
          <View style={s.statsRow} data-testid="stress-stats">
            <View style={s.statCard}>
              <Text style={s.statNum}>{stats.total_sessions}</Text>
              <Text style={s.statLabel}>{t('Uebungen', 'Esercizi')}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{stats.avg_improvement > 0 ? `-${stats.avg_improvement}` : '0'}</Text>
              <Text style={s.statLabel}>{t('Stress-Verbesserung', 'Miglioramento')}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{Math.round(stats.total_minutes)}</Text>
              <Text style={s.statLabel}>{t('Minuten', 'Minuti')}</Text>
            </View>
          </View>
        )}

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catRow}>
          <TouchableOpacity
            style={[s.catChip, !selectedCat && s.catChipActive]}
            onPress={() => setSelectedCat(null)}
          >
            <Text style={[s.catChipText, !selectedCat && s.catChipTextActive]}>{t('Alle', 'Tutti')}</Text>
          </TouchableOpacity>
          {Object.entries(categories).map(([key, meta]: [string, any]) => (
            <TouchableOpacity
              key={key}
              style={[s.catChip, selectedCat === key && { backgroundColor: CAT_COLORS[key] + '18', borderColor: CAT_COLORS[key] }]}
              onPress={() => setSelectedCat(selectedCat === key ? null : key)}
            >
              <MaterialCommunityIcons name={(CAT_ICONS[key] || 'dots-horizontal') as any} size={16} color={CAT_COLORS[key]} />
              <Text style={[s.catChipText, selectedCat === key && { color: CAT_COLORS[key] }]}>
                {lang === 'de' ? meta.label_de : meta.label_it}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick exercises section */}
        {!selectedCat && quickExercises.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{t('Kurze Uebungen unter 3 Min', 'Esercizi brevi sotto 3 min')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
              {quickExercises.slice(0, 6).map(ex => (
                <TouchableOpacity key={ex.id} style={s.quickCard} onPress={() => startExercise(ex)} activeOpacity={0.8}>
                  <View style={[s.quickIcon, { backgroundColor: (CAT_COLORS[ex.category] || '#2E7D52') + '14' }]}>
                    <MaterialCommunityIcons name={(CAT_ICONS[ex.category] || 'meditation') as any} size={22} color={CAT_COLORS[ex.category]} />
                  </View>
                  <Text style={s.quickName} numberOfLines={2}>{ex.name}</Text>
                  <Text style={s.quickDur}>{Math.ceil(ex.duration_seconds / 60)} min</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* All exercises list */}
        <Text style={s.sectionTitle}>
          {selectedCat ? (lang === 'de' ? categories[selectedCat]?.label_de : categories[selectedCat]?.label_it) : t('Alle Uebungen', 'Tutti gli esercizi')}
        </Text>
        {filteredExercises.map(ex => (
          <TouchableOpacity
            key={ex.id} style={s.exCard} onPress={() => startExercise(ex)} activeOpacity={0.8}
            data-testid={`exercise-card-${ex.id}`}
          >
            <View style={[s.exIcon, { backgroundColor: (CAT_COLORS[ex.category] || '#2E7D52') + '14' }]}>
              <MaterialCommunityIcons name={(CAT_ICONS[ex.category] || 'meditation') as any} size={24} color={CAT_COLORS[ex.category]} />
            </View>
            <View style={s.exInfo}>
              <Text style={s.exName}>{ex.name}</Text>
              <Text style={s.exDesc} numberOfLines={1}>{ex.description}</Text>
              <View style={s.exMeta}>
                <MaterialCommunityIcons name="clock-outline" size={13} color="#9CA3AF" />
                <Text style={s.exMetaText}>{Math.ceil(ex.duration_seconds / 60)} min</Text>
                <View style={[s.exGoalDot, { backgroundColor: CAT_COLORS[ex.category] || '#9CA3AF' }]} />
                <Text style={s.exMetaText}>{ex.primary_goal}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#D1D5DB" />
          </TouchableOpacity>
        ))}

        {/* Smart product suggestion (stress context) */}
        <SmartProductBlock context="stress" profileId={profileId} limit={1} testIdPrefix="stress-smart-prod" />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A2D26' },
  // SOS
  sosCard: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, overflow: 'hidden', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  sosGradient: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  sosText: { flex: 1 },
  sosTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sosSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  // Recommendation
  recCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  recHeader: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'center' },
  recVero: { width: 36, height: 36, borderRadius: 18 },
  recLabel: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  recReason: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 17 },
  recExercise: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderLeftWidth: 3 },
  recName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  recMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2E7D52', justifyContent: 'center', alignItems: 'center' },
  // Stats
  statsRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  statNum: { fontSize: 20, fontWeight: '700', color: '#1A2D26' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  // Categories
  catScroll: { marginTop: 20 },
  catRow: { paddingHorizontal: 20, gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  catChipActive: { backgroundColor: '#2E7D52', borderColor: '#2E7D52' },
  catChipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  catChipTextActive: { color: '#fff' },
  // Quick
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
  quickRow: { paddingHorizontal: 20, gap: 10 },
  quickCard: { width: 120, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  quickIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickName: { fontSize: 13, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
  quickDur: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  // Exercise list
  exCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8, backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  exIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  exInfo: { flex: 1 },
  exName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  exDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  exMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  exMetaText: { fontSize: 11, color: '#9CA3AF' },
  exGoalDot: { width: 4, height: 4, borderRadius: 2, marginLeft: 4 },
});
