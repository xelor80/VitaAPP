import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useLang } from '../../src/LangContext';
import { eventBus } from '../../src/eventBus';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const VERO = require('../../assets/images/vero-dashboard.png');
const { width: SW } = Dimensions.get('window');

const TIMING_META: Record<string, { icon: string; gradient: string[]; accent: string }> = {
  morning: { icon: 'weather-sunny', gradient: ['#FEF9C3', '#FEF3C7'], accent: '#D97706' },
  noon: { icon: 'white-balance-sunny', gradient: ['#FEE2E2', '#FDE8E8'], accent: '#DC2626' },
  evening: { icon: 'weather-night', gradient: ['#EDE9FE', '#E8E0FD'], accent: '#7C3AED' },
  all_day: { icon: 'clock-outline', gradient: ['#DBEAFE', '#E0EDFF'], accent: '#2563EB' },
  flexible: { icon: 'tune-vertical', gradient: ['#F0FDF4', '#E8F5E9'], accent: '#059669' },
};

const TYPE_COLORS: Record<string, string> = {
  supplement: '#2E7D52',
  medication: '#3B82F6',
  water: '#0EA5E9',
  stress: '#8B5CF6',
  diary: '#F59E0B',
};

export default function MyDayScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const t = useCallback((de: string, it: string) => lang === 'it' ? it : de, [lang]);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    setProfileId(pid);
    if (!pid) { setLoading(false); return; }
    try {
      const [planRes, weeklyRes] = await Promise.all([
        fetch(`${API_URL}/api/daily-plan/${pid}?lang=${lang}`),
        fetch(`${API_URL}/api/daily-plan/${pid}/weekly?lang=${lang}`),
      ]);
      if (planRes.ok) setPlan(await planRes.json());
      if (weeklyRes.ok) setWeekly(await weeklyRes.json());
    } catch {} finally { setLoading(false); }
  }, [lang]);

  useEffect(() => { loadPlan(); }, [loadPlan]);
  useEffect(() => {
    eventBus.on('waterUpdated', loadPlan);
    eventBus.on('profileUpdated', loadPlan);
    return () => { eventBus.off('waterUpdated', loadPlan); eventBus.off('profileUpdated', loadPlan); };
  }, [loadPlan]);

  const toggleTask = async (task: any) => {
    if (!profileId || task.done || completing) return;
    setCompleting(task.id);
    try {
      if (task.type === 'supplement') {
        await fetch(`${API_URL}/api/medications/${profileId}/supplement-check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplement_id: task.related_id, timing: task.timing }),
        });
      } else if (task.type === 'medication') {
        await fetch(`${API_URL}/api/medications/${profileId}/${task.related_id}/check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timing: task.timing }),
        });
      } else if (task.type === 'water') {
        router.push('/water-tracking' as any);
        setCompleting(null);
        return;
      } else if (task.type === 'stress') {
        router.push('/stress' as any);
        setCompleting(null);
        return;
      } else if (task.type === 'diary') {
        router.push('/tracking' as any);
        setCompleting(null);
        return;
      }
      await loadPlan();
    } catch {}
    setCompleting(null);
  };

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><ActivityIndicator size="large" color="#2E7D52" /></View>
    </SafeAreaView>
  );

  if (!profileId) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <MaterialCommunityIcons name="calendar-check-outline" size={64} color="#D1D5DB" />
        <Text style={s.emptyTitle}>{t('Profil erforderlich', 'Profilo necessario')}</Text>
        <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/onboarding' as any)}>
          <Text style={s.ctaBtnText}>{t('Profil erstellen', 'Crea profilo')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const pct = plan?.completion_pct || 0;
  const level = plan?.level || {};
  const vero = plan?.vero || {};

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A2D26', '#2E4A3E', '#3D6B56']} style={s.header}>
          <Text style={s.headerTitle}>{t('Dein Tag', 'Il tuo giorno')}</Text>
          <Text style={s.headerDate}>
            {new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>

          {/* Progress bar */}
          <View style={s.progressWrap}>
            <View style={s.progressBar}>
              <Animated.View entering={FadeIn.duration(600)} style={[s.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={s.progressText}>{pct}%</Text>
          </View>
          <Text style={s.progressLabel}>
            {plan?.completed_tasks || 0}/{plan?.total_tasks || 0} {t('erledigt', 'completati')}
          </Text>

          {/* Level badge */}
          <View style={s.levelRow}>
            <View style={s.levelBadge}>
              <MaterialCommunityIcons name={(level.icon || 'seed-outline') as any} size={14} color="#A7F3D0" />
              <Text style={s.levelText}>Lv. {level.level || 1} {level.title || 'Start'}</Text>
            </View>
            <View style={s.levelProgress}>
              <View style={[s.levelProgressFill, { width: `${level.progress_pct || 0}%` }]} />
            </View>
          </View>
        </LinearGradient>

        {/* VERO message */}
        {vero.text && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.veroCard}>
            <Image source={VERO} style={s.veroImg} resizeMode="contain" />
            <Text style={s.veroText}>{vero.text}</Text>
          </Animated.View>
        )}

        {/* Task sections */}
        {(plan?.sections || []).map((section: any, si: number) => {
          const meta = TIMING_META[section.timing] || TIMING_META.flexible;
          const allDone = section.tasks.every((t: any) => t.done);
          return (
            <Animated.View key={section.timing} entering={FadeInDown.delay(150 + si * 80).duration(400)} style={s.section}>
              <View style={[s.sectionHeader, { backgroundColor: meta.gradient[0] }]}>
                <MaterialCommunityIcons name={meta.icon as any} size={18} color={meta.accent} />
                <Text style={[s.sectionLabel, { color: meta.accent }]}>{section.label}</Text>
                {allDone && <MaterialCommunityIcons name="check-circle" size={18} color="#22C55E" />}
              </View>
              {section.tasks.map((task: any) => (
                <TouchableOpacity
                  key={task.id}
                  style={[s.taskCard, task.done && s.taskDone]}
                  activeOpacity={0.7}
                  onPress={() => toggleTask(task)}
                >
                  {/* Checkbox */}
                  <View style={[s.checkbox, task.done && s.checkboxDone, { borderColor: TYPE_COLORS[task.type] || '#9CA3AF' }]}>
                    {task.done && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                    {completing === task.id && <ActivityIndicator size="small" color={TYPE_COLORS[task.type]} />}
                  </View>

                  {/* Icon */}
                  <View style={[s.taskIcon, { backgroundColor: (TYPE_COLORS[task.type] || '#9CA3AF') + '14' }]}>
                    <MaterialCommunityIcons name={(task.icon || 'checkbox-blank-circle') as any} size={18} color={TYPE_COLORS[task.type] || '#9CA3AF'} />
                  </View>

                  {/* Content */}
                  <View style={s.taskContent}>
                    <Text style={[s.taskName, task.done && s.taskNameDone]}>{task.name}</Text>
                    {task.detail ? <Text style={s.taskDetail}>{task.detail}</Text> : null}
                    {/* Water progress */}
                    {task.type === 'water' && !task.done && (
                      <View style={s.waterBar}>
                        <View style={[s.waterFill, { width: `${task.progress || 0}%` }]} />
                      </View>
                    )}
                  </View>

                  {/* Navigate indicator for nav-tasks */}
                  {(task.type === 'water' || task.type === 'stress' || task.type === 'diary') && !task.done && (
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" />
                  )}
                </TouchableOpacity>
              ))}
            </Animated.View>
          );
        })}

        {/* Weekly overview */}
        {weekly && (
          <Animated.View entering={FadeInDown.delay(500).duration(400)} style={s.weekCard}>
            <Text style={s.weekTitle}>{t('Diese Woche', 'Questa settimana')}</Text>
            <Text style={s.weekSummary}>{weekly.summary}</Text>
            <View style={s.weekRow}>
              {(weekly.days || []).map((day: any) => {
                const filled = day.score / day.max_score;
                return (
                  <View key={day.date} style={s.weekDay}>
                    <View style={[s.weekDot,
                      filled >= 0.8 && s.weekDotFull,
                      filled > 0 && filled < 0.8 && s.weekDotPartial,
                      day.is_today && s.weekDotToday,
                    ]}>
                      {filled >= 0.8 && <MaterialCommunityIcons name="check" size={10} color="#fff" />}
                    </View>
                    <Text style={[s.weekDayLabel, day.is_today && s.weekDayLabelToday]}>{day.day_label}</Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity
              style={s.weekReportBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/weekly-report' as any)}
            >
              <MaterialCommunityIcons name="chart-bar" size={16} color="#2E7D52" />
              <Text style={s.weekReportBtnText}>{t('Wochenbericht ansehen', 'Vedi report settimanale')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#2E7D52" />
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  scroll: { flex: 1 },
  content: { paddingBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  ctaBtn: { backgroundColor: '#2E7D52', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, marginTop: 20 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#E8F5E9', letterSpacing: -0.5 },
  headerDate: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  progressBar: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#4ADE80', borderRadius: 4 },
  progressText: { fontSize: 16, fontWeight: '800', color: '#4ADE80', width: 42, textAlign: 'right' },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(167,243,208,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  levelText: { fontSize: 12, fontWeight: '600', color: '#A7F3D0' },
  levelProgress: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  levelProgressFill: { height: 3, backgroundColor: '#A7F3D0', borderRadius: 2 },

  // VERO
  veroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 16, backgroundColor: '#F0FDF4',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#D1FAE5',
  },
  veroImg: { width: 40, height: 48 },
  veroText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 18, fontWeight: '500' },

  // Sections
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    marginBottom: 6,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', flex: 1 },

  // Task cards
  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  taskDone: { opacity: 0.55 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  taskIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  taskContent: { flex: 1 },
  taskName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  taskNameDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  taskDetail: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  waterBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  waterFill: { height: 4, backgroundColor: '#0EA5E9', borderRadius: 2 },

  // Week
  weekCard: {
    marginHorizontal: 16, marginTop: 20, backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  weekTitle: { fontSize: 15, fontWeight: '700', color: '#1A2D26' },
  weekSummary: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  weekDay: { alignItems: 'center', gap: 4 },
  weekDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB',
  },
  weekDotFull: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  weekDotPartial: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  weekDotToday: { borderColor: '#2E7D52', borderWidth: 2.5 },
  weekDayLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  weekDayLabelToday: { color: '#2E7D52', fontWeight: '700' },
  weekReportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#D1FAE5',
  },
  weekReportBtnText: { fontSize: 13, fontWeight: '600', color: '#2E7D52' },
});
