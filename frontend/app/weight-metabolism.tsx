import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
  SafeAreaView, ActivityIndicator, TextInput, Modal, Dimensions, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import Svg, { Path, Circle, G, Line, Polyline } from 'react-native-svg';
import { useLang } from '../src/LangContext';
import { tx } from '../src/i18n';
import { eventBus } from '../src/eventBus';
import { SmartProductBlock } from '../components/SmartProductBlock';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_W } = Dimensions.get('window');

// ── Helpers ──
const fmt = (n: number) => Math.round(n).toString();
const fmtTime = (sec: number) => {
  if (sec <= 0) return '0:00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// ── Ring (SVG) ──
function Ring({
  size = 110, stroke = 9, pct, color, label, value, sub,
}: { size?: number; stroke?: number; pct: number; color: string; label: string; value: string; sub?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(100, Math.max(0, pct)) / 100;
  return (
    <View style={{ alignItems: 'center', width: size + 16 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF1EF" strokeWidth={stroke} fill="none" />
            <Circle
              cx={size / 2} cy={size / 2} r={r}
              stroke={color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
              fill="none"
            />
          </G>
        </Svg>
        <View style={st.ringCenter}>
          <Text style={st.ringValue}>{value}</Text>
          {sub ? <Text style={st.ringSub}>{sub}</Text> : null}
        </View>
      </View>
      <Text style={st.ringLabel}>{label}</Text>
    </View>
  );
}

// ── Weight Chart ──
function WeightChart({ entries }: { entries: { date: string; weight_kg: number }[] }) {
  const w = SCREEN_W - 64;
  const h = 140;
  const pad = 24;
  if (!entries || entries.length < 2) {
    return (
      <View style={[st.chartEmpty, { height: h }]}>
        <Text style={st.chartEmptyText}>
          Trage mindestens 2 Werte ein, um deinen Verlauf zu sehen.
        </Text>
      </View>
    );
  }
  const min = Math.min(...entries.map(e => e.weight_kg));
  const max = Math.max(...entries.map(e => e.weight_kg));
  const range = Math.max(0.1, max - min);
  const xStep = (w - pad * 2) / (entries.length - 1);
  const pts = entries.map((e, i) => {
    const x = pad + i * xStep;
    const y = pad + (h - pad * 2) * (1 - (e.weight_kg - min) / range);
    return `${x},${y}`;
  }).join(' ');
  const last = entries[entries.length - 1];
  return (
    <View style={{ marginTop: 8 }}>
      <Svg width={w} height={h}>
        <Line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#E6E9E7" strokeWidth={1} />
        <Line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#E6E9E7" strokeWidth={1} />
        <Polyline points={pts} fill="none" stroke="#2E7D52" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {entries.map((e, i) => {
          const x = pad + i * xStep;
          const y = pad + (h - pad * 2) * (1 - (e.weight_kg - min) / range);
          return <Circle key={i} cx={x} cy={y} r={3} fill="#2E7D52" />;
        })}
      </Svg>
      <View style={st.chartLegend}>
        <Text style={st.chartLegendTxt}>{min.toFixed(1)} kg</Text>
        <Text style={[st.chartLegendTxt, { fontWeight: '700', color: '#1F2937' }]}>{last.weight_kg.toFixed(1)} kg</Text>
        <Text style={st.chartLegendTxt}>{max.toFixed(1)} kg</Text>
      </View>
    </View>
  );
}

export default function WeightMetabolismScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const { lang } = useLang();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [today, setToday] = useState<any>(null);
  const [goals, setGoals] = useState<any>(null);
  const [fasting, setFasting] = useState<any>(null);
  const [weight, setWeight] = useState<any>(null);

  // Modals
  const [mealModal, setMealModal] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealKcal, setMealKcal] = useState('');
  const [mealProt, setMealProt] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');

  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const [fastingModal, setFastingModal] = useState(false);
  const [fastingTarget, setFastingTarget] = useState('16');

  const [goalModal, setGoalModal] = useState(false);
  const [goalCal, setGoalCal] = useState('');
  const [goalProt, setGoalProt] = useState('');
  const [goalWeight, setGoalWeight] = useState('');

  // Live timer tick
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!fasting?.active_session) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [fasting?.active_session]);

  const loadAll = useCallback(async (pid: string) => {
    try {
      const [tRes, gRes, fRes, wRes] = await Promise.all([
        fetch(`${API_URL}/api/weight-metabolism/${pid}/today`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/goals`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/fasting/state`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/weight/history?days=30`),
      ]);
      if (tRes.ok) setToday(await tRes.json());
      if (gRes.ok) setGoals(await gRes.json());
      if (fRes.ok) setFasting(await fRes.json());
      if (wRes.ok) setWeight(await wRes.json());
    } catch (e) { console.warn('weight-metabolism load', e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('health_profile_id').then(pid => {
      if (!pid) { setLoading(false); return; }
      setProfileId(pid);
      loadAll(pid);
    });
  }, [loadAll]);

  const reload = () => { if (profileId) loadAll(profileId); };

  // Add meal
  const addMeal = async () => {
    if (!profileId) return;
    const kcal = parseInt(mealKcal, 10);
    const prot = parseFloat(mealProt) || 0;
    if (!mealName.trim() || isNaN(kcal) || kcal < 0) {
      Alert.alert(tx(lang, { de: 'Ungueltig', it: 'Non valido', en: 'Invalid' }), tx(lang, { de: 'Bitte Name und Kalorien eingeben.', it: 'Inserisci nome e calorie.', en: 'Please enter name and calories.' }));
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/weight-metabolism/${profileId}/meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mealName.trim(), calories: kcal, protein_g: prot, meal_type: mealType,
        }),
      });
      if (res.ok) {
        setMealModal(false); setMealName(''); setMealKcal(''); setMealProt('');
        reload();
        eventBus.emit('weight_metabolism_changed');
      }
    } catch (e) { console.warn(e); }
  };

  const deleteMeal = async (mealId: string) => {
    if (!profileId) return;
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/meal/${mealId}`, { method: 'DELETE' });
      reload();
      eventBus.emit('weight_metabolism_changed');
    } catch {}
  };

  // Weight
  const addWeight = async () => {
    if (!profileId) return;
    const kg = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(kg) || kg < 30 || kg > 300) {
      Alert.alert(tx(lang, { de: 'Ungueltig', it: 'Non valido', en: 'Invalid' }), '30-300 kg');
      return;
    }
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg: kg }),
      });
      setWeightModal(false); setWeightInput('');
      reload();
    } catch (e) { console.warn(e); }
  };

  // Fasting
  const startFasting = async () => {
    if (!profileId) return;
    const target = parseFloat(fastingTarget.replace(',', '.'));
    if (isNaN(target) || target < 4 || target > 48) {
      Alert.alert(tx(lang, { de: 'Ungueltig', it: 'Non valido', en: 'Invalid' }), '4-48 h');
      return;
    }
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/fasting/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_hours: target }),
      });
      setFastingModal(false);
      reload();
    } catch (e) { console.warn(e); }
  };

  const stopFasting = async () => {
    if (!profileId) return;
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/fasting/stop`, { method: 'POST' });
      reload();
    } catch {}
  };

  // Goals
  const openGoalModal = () => {
    setGoalCal(String(goals?.daily_calories ?? ''));
    setGoalProt(String(goals?.daily_protein ?? ''));
    setGoalWeight(String(goals?.target_weight_kg ?? ''));
    setGoalModal(true);
  };

  const saveGoals = async () => {
    if (!profileId) return;
    const body: any = { auto_calculated: false };
    const cal = parseInt(goalCal, 10);
    const prot = parseInt(goalProt, 10);
    const tgt = parseFloat(goalWeight.replace(',', '.'));
    if (!isNaN(cal)) body.daily_calories = cal;
    if (!isNaN(prot)) body.daily_protein = prot;
    if (!isNaN(tgt)) body.target_weight_kg = tgt;
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/goals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setGoalModal(false);
      reload();
    } catch (e) { console.warn(e); }
  };

  // Live fasting countdown
  let fastingProgress = fasting?.progress;
  if (fasting?.active_session && fastingProgress) {
    const elapsedSec = Math.floor((Date.now() - new Date(fasting.active_session.started_at).getTime()) / 1000);
    const targetSec = fastingProgress.target_hours * 3600;
    const remainingSec = Math.max(0, targetSec - elapsedSec);
    fastingProgress = {
      ...fastingProgress,
      elapsed_seconds: elapsedSec,
      remaining_seconds: remainingSec,
      progress_pct: Math.min(100, Math.round(elapsedSec / targetSec * 100)),
      is_complete: elapsedSec >= targetSec,
    };
  }

  if (loading) {
    return (
      <SafeAreaView style={st.page}>
        <ActivityIndicator size="large" color="#2E7D52" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.page}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => canGoBack ? router.back() : router.push('/(tabs)' as any)} data-testid="wm-back-btn">
          <MaterialCommunityIcons name="arrow-left" size={26} color="#1F2937" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>{tx(lang, { de: 'Gewicht & Stoffwechsel', it: 'Peso & metabolismo', en: 'Weight & metabolism' })}</Text>
        <TouchableOpacity onPress={openGoalModal} data-testid="wm-goal-btn">
          <MaterialCommunityIcons name="cog-outline" size={22} color="#2E7D52" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Today summary - 2 rings */}
        <Animated.View entering={FadeIn.duration(300)} style={st.summaryCard} data-testid="wm-today-summary">
          <View style={st.summaryRings}>
            <Ring
              pct={today?.progress?.calories_pct || 0}
              color="#2E7D52"
              label={tx(lang, { de: 'Kalorien', it: 'Calorie', en: 'Calories' })}
              value={`${fmt(today?.totals?.calories || 0)}`}
              sub={`/ ${today?.goals?.daily_calories || 0}`}
            />
            <Ring
              pct={today?.progress?.protein_pct || 0}
              color="#E8820C"
              label={tx(lang, { de: 'Protein', it: 'Proteine', en: 'Protein' })}
              value={`${fmt(today?.totals?.protein_g || 0)}g`}
              sub={`/ ${today?.goals?.daily_protein || 0}g`}
            />
          </View>
          <TouchableOpacity style={st.addMealBtn} onPress={() => setMealModal(true)} data-testid="wm-add-meal-btn">
            <MaterialCommunityIcons name="plus-circle" size={18} color="#FFFFFF" />
            <Text style={st.addMealBtnText}>
              {tx(lang, { de: 'Mahlzeit hinzufuegen', it: 'Aggiungi pasto', en: 'Add meal' })}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Meals list */}
        {today?.meals?.length > 0 && (
          <View style={st.mealsCard} data-testid="wm-meals-list">
            <Text style={st.cardTitle}>{tx(lang, { de: 'Heutige Mahlzeiten', it: 'Pasti di oggi', en: "Today's meals" })}</Text>
            {today.meals.map((m: any) => (
              <View key={m.id} style={st.mealRow} data-testid={`wm-meal-${m.id}`}>
                <View style={[st.mealIcon, { backgroundColor: mealColor(m.meal_type) + '20' }]}>
                  <MaterialCommunityIcons name={mealIcon(m.meal_type) as any} size={18} color={mealColor(m.meal_type)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.mealName} numberOfLines={1}>{m.name}</Text>
                  <Text style={st.mealMeta}>{fmt(m.calories)} kcal · {fmt(m.protein_g)}g {tx(lang, { de: 'Protein', it: 'proteine', en: 'protein' })}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteMeal(m.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} data-testid={`wm-delete-meal-${m.id}`}>
                  <MaterialCommunityIcons name="delete-outline" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Fasting timer */}
        <View style={st.fastCard} data-testid="wm-fasting-card">
          <View style={st.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="timer-sand" size={20} color="#6D28D9" />
              <Text style={st.cardTitle}>{tx(lang, { de: 'Intervallfasten', it: 'Digiuno intermittente', en: 'Intermittent fasting' })}</Text>
            </View>
          </View>

          {fasting?.active_session && fastingProgress ? (
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <View style={st.fastTimerWrap}>
                <Svg width={180} height={180}>
                  <G rotation="-90" origin="90, 90">
                    <Circle cx="90" cy="90" r="78" stroke="#EEF1EF" strokeWidth={10} fill="none" />
                    <Circle
                      cx="90" cy="90" r="78"
                      stroke={fastingProgress.is_complete ? '#2E7D52' : '#6D28D9'}
                      strokeWidth={10}
                      strokeDasharray={`${2 * Math.PI * 78 * fastingProgress.progress_pct / 100} ${2 * Math.PI * 78}`}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </G>
                </Svg>
                <View style={st.fastTimerCenter}>
                  <Text style={st.fastTimerLabel}>
                    {fastingProgress.is_complete
                      ? tx(lang, { de: 'Ziel erreicht', it: 'Obiettivo raggiunto', en: 'Goal reached' })
                      : tx(lang, { de: 'verbleibend', it: 'rimanente', en: 'remaining' })}
                  </Text>
                  <Text style={st.fastTimerValue}>
                    {fastingProgress.is_complete
                      ? fmtTime(fastingProgress.elapsed_seconds)
                      : fmtTime(fastingProgress.remaining_seconds)}
                  </Text>
                  <Text style={st.fastTimerSub}>{fastingProgress.progress_pct}% · {fastingProgress.target_hours}h</Text>
                </View>
              </View>
              <TouchableOpacity style={st.stopBtn} onPress={stopFasting} data-testid="wm-stop-fast-btn">
                <MaterialCommunityIcons name="stop-circle-outline" size={18} color="#FFFFFF" />
                <Text style={st.stopBtnText}>
                  {tx(lang, { de: 'Fasten beenden', it: 'Termina digiuno', en: 'End fasting' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Text style={st.fastIdleText}>
                {tx(lang, {
                  de: 'Konfiguriere deine Fasten-Zeit frei. Starte, wann es passt - egal ob 14:10, 16:8, 18:6 oder 20:4.',
                  it: 'Configura liberamente la durata del digiuno. Avvia quando vuoi.',
                  en: 'Configure your fasting duration freely. Start whenever it suits.',
                })}
              </Text>
              <TouchableOpacity style={st.startBtn} onPress={() => setFastingModal(true)} data-testid="wm-start-fast-btn">
                <MaterialCommunityIcons name="play-circle-outline" size={18} color="#FFFFFF" />
                <Text style={st.startBtnText}>
                  {tx(lang, { de: 'Fasten starten', it: 'Avvia digiuno', en: 'Start fasting' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {fasting?.history?.length > 0 && (
            <View style={st.fastHistory}>
              <Text style={st.fastHistoryTitle}>
                {tx(lang, { de: 'Letzte Sessions', it: 'Ultime sessioni', en: 'Recent sessions' })}
              </Text>
              {fasting.history.slice(0, 3).map((h: any, i: number) => (
                <View key={i} style={st.fastHistoryRow}>
                  <MaterialCommunityIcons
                    name={h.actual_hours >= h.target_hours ? 'check-circle' : 'circle-outline'}
                    size={14}
                    color={h.actual_hours >= h.target_hours ? '#2E7D52' : '#9CA3AF'}
                  />
                  <Text style={st.fastHistoryText}>
                    {(h.actual_hours || 0).toFixed(1)}h / {h.target_hours}h · {(h.started_at || '').slice(0, 10)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Smart product suggestion (fasting context) */}
        <SmartProductBlock context="fasting" profileId={profileId} limit={1} testIdPrefix="wm-smart-fast" />

        {/* Weight log */}
        <View style={st.weightCard} data-testid="wm-weight-card">
          <View style={st.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="scale-bathroom" size={20} color="#2E7D52" />
              <Text style={st.cardTitle}>{tx(lang, { de: 'Gewichtsverlauf', it: 'Andamento peso', en: 'Weight progress' })}</Text>
            </View>
            <TouchableOpacity onPress={() => setWeightModal(true)} style={st.smallBtn} data-testid="wm-add-weight-btn">
              <MaterialCommunityIcons name="plus" size={16} color="#2E7D52" />
              <Text style={st.smallBtnText}>{tx(lang, { de: 'Eintrag', it: 'Voce', en: 'Entry' })}</Text>
            </TouchableOpacity>
          </View>
          <View style={st.weightStatsRow}>
            <View style={st.weightStat}>
              <Text style={st.weightStatLabel}>{tx(lang, { de: 'Aktuell', it: 'Attuale', en: 'Current' })}</Text>
              <Text style={st.weightStatValue}>
                {weight?.current_kg ? `${weight.current_kg.toFixed(1)} kg` : '–'}
              </Text>
            </View>
            <View style={st.weightStat}>
              <Text style={st.weightStatLabel}>30 {tx(lang, { de: 'Tage', it: 'giorni', en: 'days' })}</Text>
              <Text style={[st.weightStatValue, { color: weight?.delta_kg && weight.delta_kg > 0 ? '#DC2626' : '#2E7D52' }]}>
                {weight?.delta_kg !== null && weight?.delta_kg !== undefined
                  ? `${weight.delta_kg > 0 ? '+' : ''}${weight.delta_kg.toFixed(1)} kg` : '–'}
              </Text>
            </View>
            <View style={st.weightStat}>
              <Text style={st.weightStatLabel}>{tx(lang, { de: 'Ziel', it: 'Obiettivo', en: 'Target' })}</Text>
              <Text style={st.weightStatValue}>
                {weight?.target_kg ? `${weight.target_kg.toFixed(1)} kg` : '–'}
              </Text>
            </View>
          </View>
          <WeightChart entries={weight?.entries || []} />
        </View>

        {/* Smart product suggestion (weight context) */}
        <SmartProductBlock context="weight" profileId={profileId} limit={1} testIdPrefix="wm-smart-weight" />

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Add meal modal */}
      <Modal visible={mealModal} transparent animationType="slide" onRequestClose={() => setMealModal(false)}>
        <View style={st.modalBg}>
          <View style={st.modalCard} data-testid="wm-meal-modal">
            <Text style={st.modalTitle}>{tx(lang, { de: 'Mahlzeit hinzufuegen', it: 'Aggiungi pasto', en: 'Add meal' })}</Text>
            <View style={st.mealTypeRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[st.mealTypeChip, mealType === t && st.mealTypeChipActive]}
                  onPress={() => setMealType(t)}
                  data-testid={`wm-meal-type-${t}`}
                >
                  <MaterialCommunityIcons name={mealIcon(t) as any} size={14} color={mealType === t ? '#FFFFFF' : '#6B7280'} />
                  <Text style={[st.mealTypeText, mealType === t && { color: '#FFFFFF' }]}>{mealLabel(t, lang)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={st.input}
              placeholder={tx(lang, { de: 'Name (z.B. Hafer mit Beeren)', it: 'Nome', en: 'Name' })}
              placeholderTextColor="#9CA3AF"
              value={mealName}
              onChangeText={setMealName}
              data-testid="wm-meal-name-input"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[st.input, { flex: 1 }]}
                placeholder="kcal"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={mealKcal}
                onChangeText={setMealKcal}
                data-testid="wm-meal-kcal-input"
              />
              <TextInput
                style={[st.input, { flex: 1 }]}
                placeholder={tx(lang, { de: 'Protein g', it: 'Proteine g', en: 'Protein g' })}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={mealProt}
                onChangeText={setMealProt}
                data-testid="wm-meal-prot-input"
              />
            </View>
            <View style={st.modalRow}>
              <TouchableOpacity style={st.modalCancel} onPress={() => setMealModal(false)}>
                <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirm} onPress={addMeal} data-testid="wm-meal-confirm">
                <Text style={st.modalConfirmText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weight modal */}
      <Modal visible={weightModal} transparent animationType="fade" onRequestClose={() => setWeightModal(false)}>
        <View style={st.modalBg}>
          <View style={st.modalCard} data-testid="wm-weight-modal">
            <Text style={st.modalTitle}>{tx(lang, { de: 'Gewicht eintragen', it: 'Inserisci peso', en: 'Log weight' })}</Text>
            <TextInput
              style={st.input}
              placeholder="kg"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
              data-testid="wm-weight-input"
            />
            <View style={st.modalRow}>
              <TouchableOpacity style={st.modalCancel} onPress={() => setWeightModal(false)}>
                <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirm} onPress={addWeight} data-testid="wm-weight-confirm">
                <Text style={st.modalConfirmText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fasting start modal */}
      <Modal visible={fastingModal} transparent animationType="fade" onRequestClose={() => setFastingModal(false)}>
        <View style={st.modalBg}>
          <View style={st.modalCard} data-testid="wm-fasting-modal">
            <Text style={st.modalTitle}>{tx(lang, { de: 'Fasten starten', it: 'Avvia digiuno', en: 'Start fasting' })}</Text>
            <Text style={st.modalSub}>{tx(lang, { de: 'Wie lange willst du fasten?', it: 'Per quanto tempo?', en: 'How long do you want to fast?' })}</Text>
            <View style={st.presetRow}>
              {['14', '16', '18', '20'].map(h => (
                <TouchableOpacity
                  key={h}
                  style={[st.presetChip, fastingTarget === h && st.presetChipActive]}
                  onPress={() => setFastingTarget(h)}
                  data-testid={`wm-fasting-preset-${h}`}
                >
                  <Text style={[st.presetText, fastingTarget === h && { color: '#FFFFFF' }]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={st.input}
              placeholder={tx(lang, { de: 'Stunden (4-48)', it: 'Ore (4-48)', en: 'Hours (4-48)' })}
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={fastingTarget}
              onChangeText={setFastingTarget}
              data-testid="wm-fasting-hours-input"
            />
            <View style={st.modalRow}>
              <TouchableOpacity style={st.modalCancel} onPress={() => setFastingModal(false)}>
                <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirm} onPress={startFasting} data-testid="wm-fasting-confirm">
                <Text style={st.modalConfirmText}>{tx(lang, { de: 'Starten', it: 'Avvia', en: 'Start' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Goals modal */}
      <Modal visible={goalModal} transparent animationType="slide" onRequestClose={() => setGoalModal(false)}>
        <View style={st.modalBg}>
          <View style={st.modalCard} data-testid="wm-goal-modal">
            <Text style={st.modalTitle}>{tx(lang, { de: 'Ziele anpassen', it: 'Imposta obiettivi', en: 'Adjust goals' })}</Text>
            <Text style={st.modalLabel}>{tx(lang, { de: 'Tageskalorien (kcal)', it: 'Calorie giornaliere', en: 'Daily calories' })}</Text>
            <TextInput style={st.input} keyboardType="numeric" value={goalCal} onChangeText={setGoalCal} placeholderTextColor="#9CA3AF" data-testid="wm-goal-cal" />
            <Text style={st.modalLabel}>{tx(lang, { de: 'Protein (g)', it: 'Proteine (g)', en: 'Protein (g)' })}</Text>
            <TextInput style={st.input} keyboardType="numeric" value={goalProt} onChangeText={setGoalProt} placeholderTextColor="#9CA3AF" data-testid="wm-goal-prot" />
            <Text style={st.modalLabel}>{tx(lang, { de: 'Zielgewicht (kg, optional)', it: 'Peso target (kg)', en: 'Target weight (kg)' })}</Text>
            <TextInput style={st.input} keyboardType="numeric" value={goalWeight} onChangeText={setGoalWeight} placeholderTextColor="#9CA3AF" data-testid="wm-goal-weight" />
            <View style={st.modalRow}>
              <TouchableOpacity style={st.modalCancel} onPress={() => setGoalModal(false)}>
                <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirm} onPress={saveGoals} data-testid="wm-goal-save">
                <Text style={st.modalConfirmText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function mealIcon(t: string) {
  return t === 'breakfast' ? 'coffee-outline'
    : t === 'lunch' ? 'food-outline'
    : t === 'dinner' ? 'food-turkey'
    : 'food-apple-outline';
}
function mealColor(t: string) {
  return t === 'breakfast' ? '#F59E0B'
    : t === 'lunch' ? '#2E7D52'
    : t === 'dinner' ? '#6D28D9'
    : '#0EA5E9';
}
function mealLabel(t: string, lang: string) {
  const map: any = {
    breakfast: { de: 'Fruehstueck', it: 'Colazione', en: 'Breakfast' },
    lunch: { de: 'Mittag', it: 'Pranzo', en: 'Lunch' },
    dinner: { de: 'Abend', it: 'Cena', en: 'Dinner' },
    snack: { de: 'Snack', it: 'Snack', en: 'Snack' },
  };
  return tx(lang, map[t]);
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F7FAF8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F2',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', flex: 1, textAlign: 'center' },

  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    margin: 16, marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.04)' as any },
    }),
  },
  summaryRings: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    marginVertical: 8,
  },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  ringSub: { fontSize: 11, color: '#9CA3AF' },
  ringLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 6, textAlign: 'center' },

  addMealBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2E7D52', borderRadius: 12, paddingVertical: 12, marginTop: 12,
  },
  addMealBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },

  mealsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16,
  },
  mealRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F2',
  },
  mealIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mealName: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  mealMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  fastCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16,
  },
  fastIdleText: { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 12 },
  fastTimerWrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  fastTimerCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  fastTimerLabel: { fontSize: 11, color: '#6B7280' },
  fastTimerValue: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginTop: 2, fontVariant: ['tabular-nums'] },
  fastTimerSub: { fontSize: 11, color: '#6D28D9', marginTop: 2, fontWeight: '600' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#6D28D9', borderRadius: 12, paddingVertical: 12,
  },
  startBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#DC2626', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginTop: 12,
  },
  stopBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  fastHistory: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F2' },
  fastHistoryTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  fastHistoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  fastHistoryText: { fontSize: 12, color: '#6B7280' },

  weightCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16,
  },
  smallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  smallBtnText: { color: '#2E7D52', fontWeight: '700', fontSize: 12 },
  weightStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  weightStat: { alignItems: 'center', flex: 1 },
  weightStatLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  weightStatValue: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  chartEmpty: { backgroundColor: '#FAFBFA', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 16 },
  chartEmptyText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  chartLegend: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24 },
  chartLegendTxt: { fontSize: 10, color: '#9CA3AF' },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  modalLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1F2937', marginVertical: 6,
  },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#F1F5F2' },
  modalCancelText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  modalConfirm: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#2E7D52' },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  mealTypeRow: { flexDirection: 'row', gap: 6, marginVertical: 10, flexWrap: 'wrap' },
  mealTypeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F2',
  },
  mealTypeChipActive: { backgroundColor: '#2E7D52' },
  mealTypeText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  presetRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  presetChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F2', alignItems: 'center',
  },
  presetChipActive: { backgroundColor: '#6D28D9' },
  presetText: { fontWeight: '700', color: '#6B7280' },
});
