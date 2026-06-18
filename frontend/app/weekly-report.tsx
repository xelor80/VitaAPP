import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLang } from '../src/LangContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const VERO = require('../assets/images/vero-super.png');

export default function WeeklyReportScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const t = useCallback((de: string, it: string) => lang === 'it' ? it : de, [lang]);

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const pid = await AsyncStorage.getItem('health_profile_id');
      if (!pid) { setLoading(false); return; }
      try {
        const res = await fetch(`${API_URL}/api/weekly-report/${pid}?lang=${lang}`);
        if (res.ok) setReport(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, [lang]);

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><ActivityIndicator size="large" color="#C2272F" /></View>
    </SafeAreaView>
  );

  if (!report) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <Text style={s.emptyText}>{t('Keine Daten verfuegbar', 'Nessun dato disponibile')}</Text>
      </View>
    </SafeAreaView>
  );

  const ov = report.overview;
  const lv = report.level;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <LinearGradient colors={['#1A2D26', '#2E4A3E']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#FEE2E2" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{t('Deine Woche', 'La tua settimana')}</Text>
            <Text style={s.headerSub}>{report.period}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Overview Ring */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={s.overviewCard}>
          <View style={s.ringWrap}>
            <View style={s.ringBg}>
              <View style={[s.ringFill, { height: `${ov.week_completion_pct}%` }]} />
            </View>
            <Text style={s.ringPct}>{ov.week_completion_pct}%</Text>
          </View>
          <View style={s.overviewStats}>
            <StatRow icon="calendar-check" color="#C2272F" label={t('Aktive Tage', 'Giorni attivi')} value={`${ov.active_days}/7`} />
            <StatRow icon="check-circle" color="#3B82F6" label={t('Plan erledigt', 'Piano completato')} value={`${ov.plan_full_days}/7`} />
            <StatRow icon="star" color="#F59E0B" label={t('Punkte', 'Punti')} value={`${ov.total_points}`} />
          </View>
        </Animated.View>

        {/* Level Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.levelCard}>
          <View style={s.levelRow}>
            <View style={s.levelIcon}>
              <MaterialCommunityIcons name={(lv.icon || 'seed-outline') as any} size={24} color="#C2272F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.levelTitle}>Level {lv.level} - {lv.title}</Text>
              <View style={s.levelBar}>
                <View style={[s.levelBarFill, { width: `${lv.progress_pct}%` }]} />
              </View>
              <Text style={s.levelSub}>
                {lv.points_to_next > 0
                  ? t(`Noch ${lv.points_to_next} Punkte bis Level ${lv.level + 1}`, `Ancora ${lv.points_to_next} punti per il Level ${lv.level + 1}`)
                  : t('Max Level erreicht!', 'Livello massimo raggiunto!')}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Supplements */}
        {report.supplements && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <AreaCard
              icon="pill" color="#C2272F" bg="#FEF2F2"
              title={t('Supplements', 'Integratori')}
              pct={report.supplements.adherence_pct}
              detail={t(
                `${report.supplements.taken}/${report.supplements.expected} eingenommen, ${report.supplements.days_good} Tage komplett`,
                `${report.supplements.taken}/${report.supplements.expected} assunti, ${report.supplements.days_good} giorni completi`
              )}
            />
          </Animated.View>
        )}

        {/* Medications */}
        {report.medications && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <AreaCard
              icon="medical-bag" color="#3B82F6" bg="#EFF6FF"
              title={t('Medikamente', 'Farmaci')}
              pct={report.medications.adherence_pct}
              detail={t(
                `${report.medications.taken}/${report.medications.expected} eingenommen, ${report.medications.days_good} Tage komplett`,
                `${report.medications.taken}/${report.medications.expected} assunti, ${report.medications.days_good} giorni completi`
              )}
            />
          </Animated.View>
        )}

        {/* Water */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <AreaCard
            icon="water" color="#0EA5E9" bg="#F0F9FF"
            title={t('Wasser', 'Acqua')}
            pct={Math.round(report.water.days_reached / 7 * 100)}
            detail={t(
              `${report.water.days_reached}/7 Ziel erreicht, ${(report.water.avg_ml / 1000).toFixed(1)} L Durchschnitt`,
              `${report.water.days_reached}/7 obiettivo, ${(report.water.avg_ml / 1000).toFixed(1)} L media`
            )}
          />
        </Animated.View>

        {/* Stress */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <View style={[s.areaCard, { borderLeftColor: '#8B5CF6' }]}>
            <View style={s.areaHeader}>
              <View style={[s.areaIcon, { backgroundColor: '#F5F3FF' }]}>
                <MaterialCommunityIcons name="weather-windy" size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.areaTitle}>{t('Stressmanagement', 'Gestione stress')}</Text>
                <Text style={s.areaDetail}>
                  {report.stress.sessions > 0
                    ? t(
                        `${report.stress.sessions} Uebungen, Verbesserung: ${report.stress.improvement > 0 ? '-' : ''}${Math.abs(report.stress.improvement)} Punkte`,
                        `${report.stress.sessions} esercizi, Miglioramento: ${report.stress.improvement > 0 ? '-' : ''}${Math.abs(report.stress.improvement)} punti`
                      )
                    : t('Noch keine Uebungen diese Woche', 'Nessun esercizio questa settimana')}
                </Text>
              </View>
              {report.stress.sessions > 0 && report.stress.improvement > 0 && (
                <View style={s.improveBadge}>
                  <MaterialCommunityIcons name="trending-down" size={14} color="#DC2626" />
                  <Text style={s.improveText}>-{report.stress.improvement}</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Diary */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <View style={[s.areaCard, { borderLeftColor: '#F59E0B' }]}>
            <View style={s.areaHeader}>
              <View style={[s.areaIcon, { backgroundColor: '#FFFBEB' }]}>
                <MaterialCommunityIcons name="notebook-outline" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.areaTitle}>{t('Tagebuch', 'Diario')}</Text>
                <Text style={s.areaDetail}>
                  {t(`${report.diary.entries}/7 Eintraege`, `${report.diary.entries}/7 voci`)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Week days */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={s.weekCard}>
          <Text style={s.weekTitle}>{t('Tagesueberblick', 'Panoramica giornaliera')}</Text>
          <View style={s.weekRow}>
            {(report.days || []).map((day: any) => {
              const pct = day.tasks_total > 0 ? day.tasks_done / day.tasks_total : 0;
              return (
                <View key={day.date} style={s.dayCol}>
                  <View style={[s.dayDot,
                    pct >= 0.8 && { backgroundColor: '#DC2626', borderColor: '#DC2626' },
                    pct > 0 && pct < 0.8 && { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
                    day.is_today && { borderColor: '#1A2D26', borderWidth: 2.5 },
                  ]}>
                    {pct >= 0.8 && <MaterialCommunityIcons name="check" size={10} color="#fff" />}
                  </View>
                  <Text style={[s.dayLabel, day.is_today && { color: '#1A2D26', fontWeight: '700' }]}>{day.label}</Text>
                  <Text style={s.dayScore}>{day.tasks_done}/{day.tasks_total}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* VERO recommendation */}
        <Animated.View entering={FadeInDown.delay(450).duration(400)} style={s.veroCard}>
          <Image source={VERO} style={s.veroImg} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={s.veroLabel}>{t('VERO empfiehlt', 'VERO consiglia')}</Text>
            <Text style={s.veroText}>{report.vero.text}</Text>
          </View>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <View style={s.statRow}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function AreaCard({ icon, color, bg, title, pct, detail }: { icon: string; color: string; bg: string; title: string; pct: number; detail: string }) {
  return (
    <View style={[s.areaCard, { borderLeftColor: color }]}>
      <View style={s.areaHeader}>
        <View style={[s.areaIcon, { backgroundColor: bg }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.areaTitle}>{title}</Text>
          <Text style={s.areaDetail}>{detail}</Text>
        </View>
        <View style={[s.pctBadge, pct >= 80 ? s.pctGood : pct >= 40 ? s.pctMid : s.pctLow]}>
          <Text style={[s.pctText, pct >= 80 ? { color: '#065F46' } : pct >= 40 ? { color: '#92400E' } : { color: '#991B1B' }]}>{pct}%</Text>
        </View>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280' },
  scroll: { flex: 1 },
  content: { paddingBottom: 16 },

  header: { paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FEE2E2' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 1 },

  overviewCard: {
    flexDirection: 'row', gap: 16, marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  ringWrap: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },
  ringBg: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3F4F6', overflow: 'hidden', justifyContent: 'flex-end' },
  ringFill: { width: '100%', backgroundColor: '#4ADE80', borderRadius: 36 },
  ringPct: { position: 'absolute', fontSize: 18, fontWeight: '800', color: '#1A2D26' },
  overviewStats: { flex: 1, justifyContent: 'center', gap: 6 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statLabel: { flex: 1, fontSize: 13, color: '#6B7280' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#1F2937' },

  levelCard: {
    marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  levelTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  levelBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  levelBarFill: { height: 6, backgroundColor: '#C2272F', borderRadius: 3 },
  levelSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  areaCard: {
    marginHorizontal: 16, marginTop: 10, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  areaHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  areaIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  areaTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  areaDetail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  barTrack: { height: 5, backgroundColor: '#F3F4F6', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },

  pctBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pctGood: { backgroundColor: '#D1FAE5' },
  pctMid: { backgroundColor: '#FEF3C7' },
  pctLow: { backgroundColor: '#FEE2E2' },
  pctText: { fontSize: 13, fontWeight: '700' },

  improveBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  improveText: { fontSize: 13, fontWeight: '700', color: '#065F46' },

  weekCard: {
    marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  weekTitle: { fontSize: 14, fontWeight: '700', color: '#1A2D26', marginBottom: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4 },
  dayDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB',
  },
  dayLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  dayScore: { fontSize: 10, color: '#D1D5DB' },

  veroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#D1FAE5',
  },
  veroImg: { width: 44, height: 52 },
  veroLabel: { fontSize: 12, fontWeight: '700', color: '#065F46', marginBottom: 2 },
  veroText: { fontSize: 13, color: '#065F46', lineHeight: 18 },
});
