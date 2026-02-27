import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLang } from '../src/LangContext';
import { t } from '../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type TabKey = 'entry' | 'trends';

const MOOD_ICONS = ['emoticon-sad-outline', 'emoticon-confused-outline', 'emoticon-neutral-outline', 'emoticon-happy-outline', 'emoticon-excited-outline'];
const MOOD_COLORS = ['#D9534F', '#E8845C', '#F5C842', '#8BC34A', '#4CAF50'];

const EXERCISE_OPTIONS = [0, 15, 30, 45, 60, 90, 120];

// ==================== RATING ROW ====================
function RatingRow({ label, icon, value, onChange, labels, icons, colors }: {
  label: string; icon: string; value: number; onChange: (v: number) => void;
  labels: string[]; icons?: string[]; colors?: string[];
}) {
  return (
    <View style={styles.ratingSection}>
      <View style={styles.ratingHeader}>
        <MaterialCommunityIcons name={icon as any} size={20} color="#2C5F78" />
        <Text style={styles.ratingLabel}>{label}</Text>
        <Text style={styles.ratingValue}>{labels[value - 1]}</Text>
      </View>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(v => {
          const active = v === value;
          const color = colors ? colors[v - 1] : '#4A8B71';
          return (
            <TouchableOpacity
              key={v}
              testID={`rating-${label.toLowerCase()}-${v}`}
              style={[styles.ratingCircle, active && { backgroundColor: color, borderColor: color }]}
              activeOpacity={0.7}
              onPress={() => onChange(v)}
            >
              {icons ? (
                <MaterialCommunityIcons name={icons[v - 1] as any} size={22} color={active ? '#FFF' : '#5C7A6F'} />
              ) : (
                <Text style={[styles.ratingNumber, active && { color: '#FFF' }]}>{v}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ==================== TREND BAR ====================
function TrendBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={styles.trendBarWrap}>
      <Text style={styles.trendBarLabel}>{label}</Text>
      <View style={styles.trendBarBg}>
        <View style={[styles.trendBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.trendBarValue}>{value}</Text>
    </View>
  );
}

// ==================== MAIN SCREEN ====================
export default function DiaryScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState<TabKey>('entry');

  // Entry state
  const [mood, setMood] = useState(3);
  const [sleep, setSleep] = useState(3);
  const [stress, setStress] = useState(3);
  const [water, setWater] = useState(4);
  const [exercise, setExercise] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Trends state
  const [trends, setTrends] = useState<any>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);

  const moodLabels = t(lang, 'mood_labels') as string[];
  const sleepLabels = t(lang, 'sleep_labels') as string[];
  const stressLabels = t(lang, 'stress_labels') as string[];
  const locale = lang === 'it' ? 'it-IT' : 'de-DE';

  // Load today's entry
  useEffect(() => {
    loadTodayEntry();
  }, []);

  const loadTodayEntry = async () => {
    try {
      const res = await fetch(`${API_URL}/api/diary?days=1`);
      const data = await res.json();
      const today = new Date().toISOString().split('T')[0];
      const entry = data.find((e: any) => e.date === today);
      if (entry) {
        setMood(entry.mood);
        setSleep(entry.sleep);
        setStress(entry.stress);
        setWater(entry.water);
        setExercise(entry.exercise);
        setNotes(entry.notes || '');
        setSaved(true);
      }
    } catch {}
  };

  const saveEntry = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/diary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, sleep, stress, water, exercise, notes }),
      });
      if (res.ok) {
        setSaved(true);
        Alert.alert(t(lang, 'diary_saved'), t(lang, 'diary_saved_alert'));
      }
    } catch {
      Alert.alert(lang === 'de' ? 'Fehler' : 'Errore', t(lang, 'diary_error_save'));
    } finally {
      setSaving(false);
    }
  }, [mood, sleep, stress, water, exercise, notes, lang]);

  const loadTrends = useCallback(async () => {
    setLoadingTrends(true);
    try {
      const res = await fetch(`${API_URL}/api/diary/trends`);
      const data = await res.json();
      setTrends(data);
    } catch {
      Alert.alert(lang === 'de' ? 'Fehler' : 'Errore', t(lang, 'diary_error_trends'));
    } finally {
      setLoadingTrends(false);
    }
  }, [lang]);

  useEffect(() => {
    if (activeTab === 'trends' && !trends) {
      loadTrends();
    }
  }, [activeTab, trends, loadTrends]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity testID="diary-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(lang, 'diary_header')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          testID="diary-tab-entry"
          style={[styles.tab, activeTab === 'entry' && styles.tabActive]}
          onPress={() => setActiveTab('entry')}
        >
          <MaterialCommunityIcons name="pencil-outline" size={18} color={activeTab === 'entry' ? '#FFF' : '#5C7A6F'} />
          <Text style={[styles.tabText, activeTab === 'entry' && styles.tabTextActive]}>{t(lang, 'diary_tab_entry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="diary-tab-trends"
          style={[styles.tab, activeTab === 'trends' && styles.tabActive]}
          onPress={() => setActiveTab('trends')}
        >
          <MaterialCommunityIcons name="chart-line" size={18} color={activeTab === 'trends' ? '#FFF' : '#5C7A6F'} />
          <Text style={[styles.tabText, activeTab === 'trends' && styles.tabTextActive]}>{t(lang, 'diary_tab_trends')}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'entry' ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Date */}
            <View style={styles.dateCard}>
              <MaterialCommunityIcons name="calendar-today" size={20} color="#4A8B71" />
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              {saved && (
                <View style={styles.savedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={14} color="#4CAF50" />
                  <Text style={styles.savedText}>{t(lang, 'diary_saved')}</Text>
                </View>
              )}
            </View>

            {/* Mood */}
            <RatingRow label={t(lang, 'diary_mood')} icon="emoticon-outline" value={mood} onChange={v => { setMood(v); setSaved(false); }}
              labels={moodLabels} icons={MOOD_ICONS} colors={MOOD_COLORS} />

            {/* Sleep */}
            <RatingRow label={t(lang, 'diary_sleep')} icon="sleep" value={sleep} onChange={v => { setSleep(v); setSaved(false); }}
              labels={sleepLabels} colors={['#D9534F', '#E8845C', '#F5C842', '#8BC34A', '#4CAF50']} />

            {/* Stress */}
            <RatingRow label={t(lang, 'diary_stress')} icon="lightning-bolt-outline" value={stress} onChange={v => { setStress(v); setSaved(false); }}
              labels={stressLabels} colors={['#D9534F', '#E8845C', '#F5C842', '#8BC34A', '#4CAF50']} />

            {/* Water */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingHeader}>
                <MaterialCommunityIcons name="cup-water" size={20} color="#2C5F78" />
                <Text style={styles.ratingLabel}>{lang === 'de' ? 'Wasser' : 'Acqua'}</Text>
                <Text style={styles.ratingValue}>{water} {t(lang, 'diary_glasses')}</Text>
              </View>
              <View style={styles.waterRow}>
                <TouchableOpacity testID="water-minus" style={styles.waterBtn} onPress={() => { setWater(Math.max(0, water - 1)); setSaved(false); }}>
                  <MaterialCommunityIcons name="minus" size={22} color="#1A2D26" />
                </TouchableOpacity>
                <View style={styles.waterDisplay}>
                  {Array.from({ length: Math.min(water, 12) }).map((_, i) => (
                    <MaterialCommunityIcons key={i} name="water" size={18} color="#2196F3" />
                  ))}
                  {water === 0 && <Text style={styles.waterEmpty}>0</Text>}
                </View>
                <TouchableOpacity testID="water-plus" style={styles.waterBtn} onPress={() => { setWater(Math.min(12, water + 1)); setSaved(false); }}>
                  <MaterialCommunityIcons name="plus" size={22} color="#1A2D26" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Exercise */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingHeader}>
                <MaterialCommunityIcons name="run" size={20} color="#2C5F78" />
                <Text style={styles.ratingLabel}>{lang === 'de' ? 'Bewegung' : 'Attività'}</Text>
                <Text style={styles.ratingValue}>{exercise} Min.</Text>
              </View>
              <View style={styles.exerciseRow}>
                {EXERCISE_OPTIONS.map(min => (
                  <TouchableOpacity
                    key={min}
                    testID={`exercise-${min}`}
                    style={[styles.exerciseChip, exercise === min && styles.exerciseChipActive]}
                    onPress={() => { setExercise(min); setSaved(false); }}
                  >
                    <Text style={[styles.exerciseChipText, exercise === min && styles.exerciseChipTextActive]}>
                      {min === 0 ? t(lang, 'diary_no_exercise') : `${min}'`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingHeader}>
                <MaterialCommunityIcons name="note-text-outline" size={20} color="#2C5F78" />
                <Text style={styles.ratingLabel}>{t(lang, 'diary_notes')}</Text>
              </View>
              <TextInput
                testID="diary-notes-input"
                style={styles.notesInput}
                placeholder={t(lang, 'diary_notes_placeholder')}
                placeholderTextColor="#8FA39B"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={txt => { setNotes(txt); setSaved(false); }}
                textAlignVertical="top"
              />
            </View>

            {/* Save */}
            <TouchableOpacity
              testID="diary-save-btn"
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              activeOpacity={0.7}
              onPress={saveEntry}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <View style={styles.btnRow}>
                  <MaterialCommunityIcons name="content-save-outline" size={20} color="#FFF" />
                  <Text style={styles.saveBtnText}>  {t(lang, 'diary_save')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loadingTrends ? (
            <View style={styles.centered}>
              <ActivityIndicator testID="trends-loading" color="#4A8B71" size="large" />
              <Text style={styles.loadingText}>{t(lang, 'diary_analyzing_trends')}</Text>
            </View>
          ) : trends ? (
            <TrendsView trends={trends} onRefresh={loadTrends} lang={lang} />
          ) : (
            <View style={styles.centered}>
              <MaterialCommunityIcons name="chart-line" size={48} color="#8FA39B" />
              <Text style={styles.emptyText}>{t(lang, 'diary_no_data')}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ==================== TRENDS VIEW ====================
function TrendsView({ trends, onRefresh, lang }: { trends: any; onRefresh: () => void; lang: string }) {
  const entries = trends.entries || [];
  const sortedEntries = [...entries].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const locale = lang === 'it' ? 'it-IT' : 'de-DE';

  const avg = (field: string) => {
    if (entries.length === 0) return 0;
    return (entries.reduce((s: number, e: any) => s + (e[field] || 0), 0) / entries.length).toFixed(1);
  };

  return (
    <View>
      {/* Summary */}
      {trends.summary ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="chart-line" size={20} color="#4A8B71" />
            <Text style={styles.cardTitle}>{t(lang, 'diary_trend_summary')}</Text>
          </View>
          <Text style={styles.cardBody}>{trends.summary}</Text>
        </View>
      ) : null}

      {/* Stats Overview */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="emoticon-outline" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{avg('mood')}</Text>
          <Text style={styles.statLabel}>{t(lang, 'diary_mood')}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="sleep" size={24} color="#2196F3" />
          <Text style={styles.statValue}>{avg('sleep')}</Text>
          <Text style={styles.statLabel}>{t(lang, 'diary_sleep')}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="lightning-bolt-outline" size={24} color="#FF9800" />
          <Text style={styles.statValue}>{avg('stress')}</Text>
          <Text style={styles.statLabel}>{t(lang, 'diary_stress')}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="cup-water" size={24} color="#03A9F4" />
          <Text style={styles.statValue}>{avg('water')}</Text>
          <Text style={styles.statLabel}>{lang === 'de' ? 'Wasser' : 'Acqua'}</Text>
        </View>
      </View>

      {/* Mini Chart - Last entries */}
      {sortedEntries.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="calendar-range" size={20} color="#4A8B71" />
            <Text style={styles.cardTitle}>{t(lang, 'diary_last_days')} {sortedEntries.length} {t(lang, 'diary_days')}</Text>
          </View>
          {sortedEntries.slice(-7).map((e: any, i: number) => {
            const dayLabel = new Date(e.date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
            return (
              <View key={i} style={styles.dayRow}>
                <Text style={styles.dayLabel}>{dayLabel}</Text>
                <View style={styles.dayBars}>
                  <TrendBar value={e.mood} max={5} color={MOOD_COLORS[e.mood - 1] || '#8FA39B'} label="" />
                </View>
                <View style={styles.dayIcons}>
                  <MaterialCommunityIcons name="sleep" size={12} color="#2196F3" />
                  <Text style={styles.daySmall}>{e.sleep}</Text>
                  <MaterialCommunityIcons name="cup-water" size={12} color="#03A9F4" />
                  <Text style={styles.daySmall}>{e.water}</Text>
                  <MaterialCommunityIcons name="run" size={12} color="#FF9800" />
                  <Text style={styles.daySmall}>{e.exercise}'</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Patterns */}
      {trends.patterns?.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="eye-outline" size={20} color="#4A8B71" />
            <Text style={styles.cardTitle}>{t(lang, 'diary_patterns')}</Text>
          </View>
          {trends.patterns.map((p: any, i: number) => (
            <View key={i} style={styles.patternRow}>
              <MaterialCommunityIcons
                name={p.trend === 'aufwärts' ? 'trending-up' : p.trend === 'abwärts' ? 'trending-down' : 'trending-neutral'}
                size={20}
                color={p.trend === 'aufwärts' ? '#4CAF50' : p.trend === 'abwärts' ? '#D9534F' : '#FF9800'}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.patternArea}>{p.area}</Text>
                <Text style={styles.patternNote}>{p.note}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Lifestyle Tips */}
      {trends.tips?.length > 0 && (
        <View style={styles.tipsCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#4A8B71" />
            <Text style={styles.cardTitle}>{t(lang, 'diary_lifestyle_tips')}</Text>
          </View>
          {trends.tips.map((tip: string, i: number) => (
            <View key={i} style={styles.tipItem}>
              <View style={styles.tipBullet}>
                <Text style={styles.tipBulletText}>{i + 1}</Text>
              </View>
              <Text style={styles.tipItemText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Refresh */}
      <TouchableOpacity testID="trends-refresh-btn" style={styles.refreshBtn} onPress={onRefresh}>
        <MaterialCommunityIcons name="refresh" size={18} color="#4A8B71" />
        <Text style={styles.refreshBtnText}>  {t(lang, 'diary_refresh')}</Text>
      </TouchableOpacity>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <MaterialCommunityIcons name="information-outline" size={14} color="#8FA39B" />
        <Text style={styles.disclaimerText}>{t(lang, 'diary_disclaimer')}</Text>
      </View>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F9F6' },
  centered: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  content: { padding: 16, paddingBottom: 40 },

  // Header
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E6E2',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16,
    paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E0E6E2',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 20, backgroundColor: '#F7F9F6', gap: 6,
  },
  tabActive: { backgroundColor: '#4A8B71' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#5C7A6F' },
  tabTextActive: { color: '#FFFFFF' },

  // Date card
  dateCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  dateText: { fontSize: 15, fontWeight: '600', color: '#1A2D26', flex: 1 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedText: { fontSize: 12, fontWeight: '600', color: '#4CAF50' },

  // Rating
  ratingSection: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12,
  },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  ratingLabel: { fontSize: 16, fontWeight: '700', color: '#1A2D26', flex: 1 },
  ratingValue: { fontSize: 13, fontWeight: '600', color: '#5C7A6F' },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  ratingCircle: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#E0E6E2',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9F6',
  },
  ratingNumber: { fontSize: 16, fontWeight: '700', color: '#5C7A6F' },

  // Water
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  waterDisplay: {
    flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    minHeight: 30, alignItems: 'center',
  },
  waterEmpty: { fontSize: 16, color: '#8FA39B', fontWeight: '600' },

  // Exercise
  exerciseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exerciseChip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16,
    backgroundColor: '#F7F9F6', borderWidth: 1, borderColor: '#E0E6E2',
  },
  exerciseChipActive: { backgroundColor: '#2C5F78', borderColor: '#2C5F78' },
  exerciseChipText: { fontSize: 14, fontWeight: '600', color: '#5C7A6F' },
  exerciseChipTextActive: { color: '#FFFFFF' },

  // Notes
  notesInput: {
    backgroundColor: '#F7F9F6', borderRadius: 12, padding: 12, fontSize: 15,
    color: '#1A2D26', minHeight: 70, borderWidth: 1, borderColor: '#E0E6E2',
  },

  // Save button
  saveBtn: {
    backgroundColor: '#4A8B71', borderRadius: 24, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnRow: { flexDirection: 'row', alignItems: 'center' },

  loadingText: { fontSize: 15, color: '#5C7A6F', marginTop: 8 },
  emptyText: { fontSize: 15, color: '#8FA39B' },

  // Cards
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', flex: 1 },
  cardBody: { fontSize: 15, color: '#1A2D26', lineHeight: 22 },

  // Stats grid
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1A2D26' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#5C7A6F' },

  // Day rows
  dayRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0F4F1',
  },
  dayLabel: { fontSize: 12, fontWeight: '600', color: '#5C7A6F', width: 72 },
  dayBars: { flex: 1, marginHorizontal: 8 },
  dayIcons: { flexDirection: 'row', alignItems: 'center', gap: 3, width: 90 },
  daySmall: { fontSize: 11, color: '#5C7A6F', marginRight: 4 },

  // Trend bars
  trendBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendBarLabel: { fontSize: 11, color: '#5C7A6F', width: 0 },
  trendBarBg: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#E8F5E9' },
  trendBarFill: { height: 10, borderRadius: 5 },
  trendBarValue: { fontSize: 11, fontWeight: '700', color: '#1A2D26', width: 0 },

  // Patterns
  patternRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  patternArea: { fontSize: 14, fontWeight: '700', color: '#1A2D26' },
  patternNote: { fontSize: 13, color: '#5C7A6F', lineHeight: 18 },

  // Tips
  tipsCard: {
    backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipBullet: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#4A8B71',
    justifyContent: 'center', alignItems: 'center',
  },
  tipBulletText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  tipItemText: { fontSize: 14, color: '#1A2D26', flex: 1, lineHeight: 20 },

  // Refresh
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, marginBottom: 12,
  },
  refreshBtnText: { fontSize: 14, fontWeight: '600', color: '#4A8B71' },

  // Disclaimer
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 8 },
  disclaimerText: { fontSize: 12, color: '#8FA39B', flex: 1, lineHeight: 18 },
});
