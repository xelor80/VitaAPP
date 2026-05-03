import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
  SafeAreaView, ActivityIndicator, TextInput, Modal, Dimensions, Alert, Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Polyline } from 'react-native-svg';
import { useLang } from '../src/LangContext';
import { tx } from '../src/i18n';
import { eventBus } from '../src/eventBus';
import { SmartProductBlock } from '../components/SmartProductBlock';
import { scheduleFastingReminders, cancelFastingReminders, getDeviceTimezone } from '../src/services/FastingReminderService';
import { showActionToast } from '../components/ActionToast';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_W } = Dimensions.get('window');

const VERO_HALLO = require('../assets/images/vero-hallo.png');

const fmt = (n: number) => Math.round(n).toString();
const fmtHMS = (sec: number) => {
  if (sec <= 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const fmtCountdown = (sec: number) => {
  if (sec <= 0) return '0:00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// ── Rings ──
function Ring({
  size = 120, stroke = 10, pct, color, label, value, sub,
}: { size?: number; stroke?: number; pct: number; color: string; label: string; value: string; sub?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(100, Math.max(0, pct)) / 100;
  return (
    <View style={{ alignItems: 'center', width: size + 20 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF1EF" strokeWidth={stroke} fill="none" />
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${c}`} strokeLinecap="round" fill="none" />
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

function WeightChart({ entries }: { entries: { date: string; weight_kg: number }[] }) {
  const w = SCREEN_W - 64;
  const h = 120;
  const pad = 24;
  if (!entries || entries.length < 2) {
    return (
      <View style={[st.chartEmpty, { height: h }]}>
        <Text style={st.chartEmptyText}>Trage mindestens 2 Werte ein.</Text>
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
  return (
    <Svg width={w} height={h}>
      <Line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#E6E9E7" strokeWidth={1} />
      <Polyline points={pts} fill="none" stroke="#2E7D52" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {entries.map((e, i) => {
        const x = pad + i * xStep;
        const y = pad + (h - pad * 2) * (1 - (e.weight_kg - min) / range);
        return <Circle key={i} cx={x} cy={y} r={3} fill="#2E7D52" />;
      })}
    </Svg>
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
  const [schedule, setSchedule] = useState<any>(null);
  const [weight, setWeight] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);

  // Meal source picker
  const [mealPicker, setMealPicker] = useState(false);
  // Meal manual modal
  const [manualModal, setManualModal] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealKcal, setMealKcal] = useState('');
  const [mealProt, setMealProt] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | 'shake'>('snack');
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);

  // Photo analysis
  const [photoModal, setPhotoModal] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Favorites modal
  const [favModal, setFavModal] = useState(false);
  const [showFavAdd, setShowFavAdd] = useState(false);

  // Weight modal
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  // Schedule modal
  const [scheduleModal, setScheduleModal] = useState(false);
  const [winStart, setWinStart] = useState('12:00');
  const [winHours, setWinHours] = useState('8');

  // Goals modal
  const [goalModal, setGoalModal] = useState(false);
  const [goalCal, setGoalCal] = useState('');
  const [goalProt, setGoalProt] = useState('');
  const [goalWeight, setGoalWeight] = useState('');

  // Live tick
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!schedule?.active) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [schedule?.active]);

  const loadAll = useCallback(async (pid: string) => {
    try {
      const [tRes, gRes, schedRes, wRes, favRes] = await Promise.all([
        fetch(`${API_URL}/api/weight-metabolism/${pid}/today`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/goals`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/schedule`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/weight/history?days=30`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/favorites`),
      ]);
      if (tRes.ok) setToday(await tRes.json());
      if (gRes.ok) setGoals(await gRes.json());
      if (schedRes.ok) setSchedule(await schedRes.json());
      if (wRes.ok) setWeight(await wRes.json());
      if (favRes.ok) { const d = await favRes.json(); setFavorites(d.items || []); }
    } catch (e) { console.warn(e); }
    setLoading(false);
  }, []);

  // Re-schedule local reminders if schedule is active (keeps device in sync after app restart)
  const lastScheduledKey = useRef<string | null>(null);
  useEffect(() => {
    if (!schedule?.active) return;
    const key = `${schedule.eating_window_start}|${schedule.eating_window_hours}|${schedule.reminders_enabled}`;
    if (lastScheduledKey.current === key) return;
    lastScheduledKey.current = key;
    scheduleFastingReminders({
      eating_window_start: schedule.eating_window_start,
      eating_window_hours: schedule.eating_window_hours,
      reminders_enabled: !!schedule.reminders_enabled,
    }, lang).catch(() => {});
  }, [schedule?.active, schedule?.eating_window_start, schedule?.eating_window_hours, schedule?.reminders_enabled, lang]);

  useEffect(() => {
    AsyncStorage.getItem('health_profile_id').then(async pid => {
      if (!pid) { setLoading(false); return; }
      setProfileId(pid);
      loadAll(pid);
      // Send device timezone to backend (best-effort)
      try {
        const { tz, offset } = await getDeviceTimezone();
        fetch(`${API_URL}/api/weight-metabolism/${pid}/timezone`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timezone: tz, offset_minutes: offset }),
        }).catch(() => {});
      } catch {}
    });
  }, [loadAll]);

  const reload = () => { if (profileId) loadAll(profileId); };

  // ── VERO post-meal coach comment (gpt-4o-mini, cached on backend) ──
  const showCoachComment = async (meal: { name: string; calories: number; protein_g: number; meal_type?: string }) => {
    if (!profileId) return;
    try {
      const res = await fetch(`${API_URL}/api/weight-metabolism/${profileId}/coach-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: meal.name, calories: meal.calories, protein_g: meal.protein_g, meal_type: meal.meal_type || 'snack',
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.comment) {
        try { showActionToast(`VERO: ${data.comment}`, data.tone === 'positive' ? 'success' : 'info'); } catch {}
      }
    } catch {}
  };

  // ── Meal source picker ──
  const openMealPicker = () => setMealPicker(true);
  const pickManual = () => { setMealPicker(false); setManualModal(true); };
  const pickFavorites = () => { setMealPicker(false); setFavModal(true); };
  const pickPhoto = async () => {
    setMealPicker(false);
    Alert.alert(
      tx(lang, { de: 'Foto-Quelle', it: 'Sorgente foto', en: 'Photo source' }),
      tx(lang, { de: 'Woher moechtest du das Bild?', it: 'Da dove vuoi scegliere?', en: 'Where from?' }),
      [
        { text: tx(lang, { de: 'Kamera', it: 'Fotocamera', en: 'Camera' }), onPress: () => launchCamera() },
        { text: tx(lang, { de: 'Galerie', it: 'Galleria', en: 'Library' }), onPress: () => launchLibrary() },
        { text: tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' }), style: 'cancel' },
      ]
    );
  };

  const handleImageResult = async (result: any) => {
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 || null);
    setPhotoModal(true);
    setAnalysisResult(null);
    if (asset.base64) await analyzePhoto(asset.base64);
  };

  const launchCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Kamera-Zugriff benoetigt'); return; }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    await handleImageResult(res);
  };

  const launchLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Galerie-Zugriff benoetigt'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    await handleImageResult(res);
  };

  const analyzePhoto = async (b64: string) => {
    if (!profileId) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_URL}/api/weight-metabolism/${profileId}/analyze-meal-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: b64 }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
        setMealName(data.name || '');
        setMealKcal(String(data.calories || 0));
        setMealProt(String(data.protein_g || 0));
      } else {
        Alert.alert('Analyse fehlgeschlagen');
      }
    } catch (e) {
      Alert.alert('Netzwerkfehler');
    }
    setAnalyzing(false);
  };

  const savePhotoMeal = async () => {
    if (!profileId) return;
    const kcal = parseInt(mealKcal, 10);
    const prot = parseFloat(mealProt) || 0;
    if (!mealName.trim() || isNaN(kcal)) {
      Alert.alert('Bitte Name und Kalorien pruefen');
      return;
    }
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mealName.trim(), calories: kcal, protein_g: prot, meal_type: mealType,
        }),
      });
      if (saveAsFavorite) {
        await fetch(`${API_URL}/api/weight-metabolism/${profileId}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: mealName.trim(), calories: kcal, protein_g: prot, category: mealType }),
        });
      }
      closePhotoModal();
      reload();
      eventBus.emit('weight_metabolism_changed');
      showCoachComment({ name: mealName.trim(), calories: kcal, protein_g: prot, meal_type: mealType });
    } catch (e) { console.warn(e); }
  };

  const closePhotoModal = () => {
    setPhotoModal(false); setPhotoUri(null); setPhotoBase64(null);
    setAnalysisResult(null); setMealName(''); setMealKcal(''); setMealProt('');
    setSaveAsFavorite(false);
  };

  const addMealManual = async () => {
    if (!profileId) return;
    const kcal = parseInt(mealKcal, 10);
    const prot = parseFloat(mealProt) || 0;
    if (!mealName.trim() || isNaN(kcal) || kcal < 0) {
      Alert.alert(tx(lang, { de: 'Name und kcal eingeben', it: 'Inserisci nome e kcal', en: 'Enter name and kcal' }));
      return;
    }
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: mealName.trim(), calories: kcal, protein_g: prot, meal_type: mealType }),
      });
      if (saveAsFavorite) {
        await fetch(`${API_URL}/api/weight-metabolism/${profileId}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: mealName.trim(), calories: kcal, protein_g: prot, category: mealType }),
        });
      }
      setManualModal(false); setMealName(''); setMealKcal(''); setMealProt(''); setSaveAsFavorite(false);
      reload();
      eventBus.emit('weight_metabolism_changed');
      showCoachComment({ name: mealName.trim(), calories: kcal, protein_g: prot, meal_type: mealType });
    } catch (e) { console.warn(e); }
  };

  const useFavorite = async (favId: string) => {
    if (!profileId) return;
    try {
      const res = await fetch(`${API_URL}/api/weight-metabolism/${profileId}/favorites/${favId}/use`, { method: 'POST' });
      setFavModal(false);
      reload();
      eventBus.emit('weight_metabolism_changed');
      if (res.ok) {
        const meal = await res.json();
        showCoachComment({ name: meal.name, calories: meal.calories, protein_g: meal.protein_g, meal_type: meal.meal_type });
      }
    } catch {}
  };

  const addFavorite = async () => {
    if (!profileId) return;
    const kcal = parseInt(mealKcal, 10);
    const prot = parseFloat(mealProt) || 0;
    if (!mealName.trim() || isNaN(kcal)) { Alert.alert('Daten pruefen'); return; }
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: mealName.trim(), calories: kcal, protein_g: prot, category: mealType }),
      });
      setMealName(''); setMealKcal(''); setMealProt('');
      setShowFavAdd(false);
      reload();
    } catch (e) { console.warn(e); }
  };

  const deleteFavorite = async (favId: string) => {
    if (!profileId) return;
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/favorites/${favId}`, { method: 'DELETE' });
      reload();
    } catch {}
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
    if (isNaN(kg) || kg < 30 || kg > 300) { Alert.alert('30-300 kg'); return; }
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/weight`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg: kg }),
      });
      setWeightModal(false); setWeightInput('');
      reload();
    } catch {}
  };

  // Schedule
  const openScheduleModal = () => {
    setWinStart(schedule?.eating_window_start || '12:00');
    setWinHours(String(schedule?.eating_window_hours || 8));
    setScheduleModal(true);
  };

  const saveSchedule = async () => {
    if (!profileId) return;
    const hours = parseFloat(winHours.replace(',', '.'));
    if (isNaN(hours) || hours < 1 || hours > 14) { Alert.alert('1-14 Stunden'); return; }
    if (!/^\d{1,2}:\d{2}$/.test(winStart)) { Alert.alert('Format HH:MM'); return; }
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/schedule`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eating_window_start: winStart,
          eating_window_hours: hours,
          daily_recurring: true,
          reminders_enabled: true,
        }),
      });
      setScheduleModal(false);
      // Schedule local push reminders (native only)
      try {
        const ok = await scheduleFastingReminders({
          eating_window_start: winStart,
          eating_window_hours: hours,
          reminders_enabled: true,
        }, lang);
        if (ok) {
          try { showActionToast('VERO erinnert dich automatisch', 'success'); } catch {}
        }
      } catch (e) { console.warn('fasting reminder schedule', e); }
      reload();
      eventBus.emit('weight_metabolism_changed');
    } catch (e) { console.warn(e); }
  };

  const stopSchedule = async () => {
    if (!profileId) return;
    Alert.alert(
      'Fasten-Plan beenden?',
      'Dein taeglicher Fasten-Plan wird entfernt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen', style: 'destructive', onPress: async () => {
            await fetch(`${API_URL}/api/weight-metabolism/${profileId}/schedule`, { method: 'DELETE' });
            try { await cancelFastingReminders(); } catch {}
            reload();
          }
        },
      ]
    );
  };

  // Goals
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [aiGender, setAiGender] = useState<'male' | 'female'>('male');
  const [aiGoal, setAiGoal] = useState<'maintain' | 'lose' | 'gain' | 'build_muscle'>('maintain');
  const [aiActivity, setAiActivity] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('moderate');

  const openGoalModal = () => {
    setGoalCal(String(goals?.daily_calories ?? ''));
    setGoalProt(String(goals?.daily_protein ?? ''));
    setGoalWeight(String(goals?.target_weight_kg ?? ''));
    setAiSuggestion(null);
    setGoalModal(true);
  };

  const runAiCalculation = async () => {
    if (!profileId) return;
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      // Pull current weight from state (already loaded)
      const curKg = weight?.current_kg || null;
      const res = await fetch(`${API_URL}/api/weight-metabolism/${profileId}/ai-calculate-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: aiGender,
          current_weight_kg: curKg || undefined,
          activity_level: aiActivity,
          goal: aiGoal,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Fehler' }));
        Alert.alert('KI-Berechnung', err.detail || 'Bitte aktuelles Gewicht eintragen.');
        setAiLoading(false);
        return;
      }
      const data = await res.json();
      setAiSuggestion(data);
      setGoalCal(String(data.daily_calories));
      setGoalProt(String(data.daily_protein));
    } catch {
      Alert.alert('KI-Berechnung', 'Netzwerkfehler');
    }
    setAiLoading(false);
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
    await fetch(`${API_URL}/api/weight-metabolism/${profileId}/goals`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setGoalModal(false);
    reload();
  };

  if (loading) {
    return (
      <SafeAreaView style={st.page}>
        <ActivityIndicator size="large" color="#2E7D52" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  // Live schedule progress (client-side tick)
  let sched = schedule;
  if (schedule?.active) {
    const remaining = Math.max(0, (schedule.remaining_seconds || 0) - tick);
    sched = { ...schedule, remaining_seconds: remaining };
  }

  // Contextual VERO hint
  const remainingPro = Math.max(0, (today?.goals?.daily_protein || 0) - (today?.totals?.protein_g || 0));
  let veroHint: string | null = null;
  if (sched?.active) {
    const mins = Math.round((sched.remaining_seconds || 0) / 60);
    if (sched.phase === 'fasting' && mins <= 30 && mins > 0) {
      veroHint = `Dein Essensfenster startet in ${mins} Min`;
    } else if (sched.phase === 'eating' && mins <= 60 && mins > 0) {
      veroHint = `Fasten beginnt in ${mins} Min`;
    }
  }
  if (!veroHint && remainingPro > 20 && (today?.totals?.calories || 0) > 0) {
    veroHint = `Noch ${Math.round(remainingPro)}g Protein offen`;
  }

  return (
    <SafeAreaView style={st.page}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => canGoBack ? router.back() : router.push('/(tabs)' as any)} data-testid="wm-back-btn" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#1F2937" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>{tx(lang, { de: 'Gewicht & Stoffwechsel', it: 'Peso & metabolismo', en: 'Weight & metabolism' })}</Text>
        <TouchableOpacity onPress={openGoalModal} data-testid="wm-goal-btn" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialCommunityIcons name="cog-outline" size={22} color="#2E7D52" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* VERO Hint */}
        {veroHint && (
          <Animated.View entering={FadeIn.duration(300)} style={st.veroCard} data-testid="wm-vero-hint">
            <Image source={VERO_HALLO} style={st.veroImg} resizeMode="contain" />
            <Text style={st.veroText}>{veroHint}</Text>
          </Animated.View>
        )}

        {/* Fasten Schedule Card */}
        <View style={st.fastCard} data-testid="wm-fasting-card">
          <View style={st.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="clock-outline" size={22} color={sched?.active && sched.phase === 'eating' ? '#2E7D52' : '#6D28D9'} />
              <Text style={st.cardTitle}>{tx(lang, { de: 'Fasten-Rhythmus', it: 'Ritmo digiuno', en: 'Fasting rhythm' })}</Text>
            </View>
            <TouchableOpacity onPress={openScheduleModal} data-testid="wm-schedule-edit-btn">
              <MaterialCommunityIcons name={sched?.active ? 'pencil-outline' : 'plus-circle-outline'} size={22} color="#2E7D52" />
            </TouchableOpacity>
          </View>

          {sched?.active ? (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <View style={st.fastTimerWrap}>
                <Svg width={200} height={200}>
                  <G rotation="-90" origin="100, 100">
                    <Circle cx="100" cy="100" r="88" stroke="#EEF1EF" strokeWidth={12} fill="none" />
                    <Circle cx="100" cy="100" r="88"
                      stroke={sched.phase === 'eating' ? '#2E7D52' : '#6D28D9'}
                      strokeWidth={12}
                      strokeDasharray={`${2 * Math.PI * 88 * (sched.progress_pct || 0) / 100} ${2 * Math.PI * 88}`}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </G>
                </Svg>
                <View style={st.fastTimerCenter}>
                  <View style={[st.phaseBadge, { backgroundColor: sched.phase === 'eating' ? '#E8F5E9' : '#F3E8FF' }]}>
                    <MaterialCommunityIcons
                      name={sched.phase === 'eating' ? 'silverware-fork-knife' : 'timer-sand'}
                      size={12}
                      color={sched.phase === 'eating' ? '#2E7D52' : '#6D28D9'}
                    />
                    <Text style={[st.phaseBadgeText, { color: sched.phase === 'eating' ? '#2E7D52' : '#6D28D9' }]}>
                      {sched.phase === 'eating'
                        ? tx(lang, { de: 'Essensfenster', it: 'Finestra cibo', en: 'Eating window' })
                        : tx(lang, { de: 'Fasten', it: 'Digiuno', en: 'Fasting' })}
                    </Text>
                  </View>
                  <Text style={st.fastTimerValue}>{fmtCountdown(sched.remaining_seconds || 0)}</Text>
                  <Text style={st.fastTimerSub}>
                    {sched.phase === 'eating'
                      ? tx(lang, { de: 'bis Fasten startet', it: 'al digiuno', en: 'until fasting' })
                      : tx(lang, { de: 'bis Fenster oeffnet', it: "all'apertura", en: 'until opens' })}
                  </Text>
                </View>
              </View>
              <View style={st.scheduleInfo}>
                <View style={st.scheduleRow}>
                  <Text style={st.scheduleLabel}>Fenster</Text>
                  <Text style={st.scheduleValue}>{sched.eating_window_start} – {sched.eating_window_end}</Text>
                </View>
                <View style={st.scheduleRow}>
                  <Text style={st.scheduleLabel}>Fasten</Text>
                  <Text style={st.scheduleValue}>{sched.fasting_hours}h</Text>
                </View>
              </View>
              <TouchableOpacity style={st.removeBtn} onPress={stopSchedule} data-testid="wm-schedule-stop-btn">
                <Text style={st.removeBtnText}>{tx(lang, { de: 'Plan entfernen', it: 'Rimuovi piano', en: 'Remove plan' })}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text style={st.fastIdleText}>
                {tx(lang, {
                  de: 'Lege dein Essensfenster fest. Wir kuemmern uns um den Rest - automatisch, jeden Tag.',
                  it: 'Imposta la finestra, noi pensiamo al resto.',
                  en: 'Set your eating window, we handle the rest.',
                })}
              </Text>
              <TouchableOpacity style={st.bigPrimaryBtn} onPress={openScheduleModal} data-testid="wm-schedule-create-btn">
                <MaterialCommunityIcons name="clock-plus-outline" size={20} color="#FFFFFF" />
                <Text style={st.bigPrimaryBtnText}>
                  {tx(lang, { de: 'Fasten-Plan erstellen', it: 'Crea piano', en: 'Create plan' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Today summary rings */}
        <View style={st.summaryCard} data-testid="wm-today-summary">
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
          <TouchableOpacity style={st.bigPrimaryBtn} onPress={openMealPicker} data-testid="wm-add-meal-btn">
            <MaterialCommunityIcons name="plus-circle" size={22} color="#FFFFFF" />
            <Text style={st.bigPrimaryBtnText}>
              {tx(lang, { de: 'Mahlzeit hinzufuegen', it: 'Aggiungi pasto', en: 'Add meal' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today meals */}
        {today?.meals?.length > 0 && (
          <View style={st.mealsCard}>
            <Text style={st.cardTitle}>{tx(lang, { de: 'Heutige Mahlzeiten', it: 'Pasti di oggi', en: "Today's meals" })}</Text>
            {today.meals.map((m: any) => (
              <View key={m.id} style={st.mealRow} data-testid={`wm-meal-${m.id}`}>
                <View style={[st.mealIcon, { backgroundColor: mealColor(m.meal_type) + '20' }]}>
                  <MaterialCommunityIcons name={mealIcon(m.meal_type) as any} size={18} color={mealColor(m.meal_type)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.mealName} numberOfLines={1}>{m.name}</Text>
                  <Text style={st.mealMeta}>{fmt(m.calories)} kcal · {fmt(m.protein_g)}g</Text>
                </View>
                <TouchableOpacity onPress={() => deleteMeal(m.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} data-testid={`wm-delete-meal-${m.id}`}>
                  <MaterialCommunityIcons name="delete-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <SmartProductBlock context="fasting" profileId={profileId} limit={1} testIdPrefix="wm-smart-fast" />

        {/* Weight */}
        <View style={st.weightCard} data-testid="wm-weight-card">
          <View style={st.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="scale-bathroom" size={20} color="#2E7D52" />
              <Text style={st.cardTitle}>{tx(lang, { de: 'Gewicht', it: 'Peso', en: 'Weight' })}</Text>
            </View>
            <TouchableOpacity onPress={() => setWeightModal(true)} style={st.smallBtn} data-testid="wm-add-weight-btn">
              <MaterialCommunityIcons name="plus" size={16} color="#2E7D52" />
              <Text style={st.smallBtnText}>{tx(lang, { de: 'Eintrag', it: 'Voce', en: 'Entry' })}</Text>
            </TouchableOpacity>
          </View>
          <View style={st.weightStatsRow}>
            <View style={st.weightStat}>
              <Text style={st.weightStatLabel}>{tx(lang, { de: 'Aktuell', it: 'Attuale', en: 'Current' })}</Text>
              <Text style={st.weightStatValue}>{weight?.current_kg ? `${weight.current_kg.toFixed(1)} kg` : '–'}</Text>
            </View>
            <View style={st.weightStat}>
              <Text style={st.weightStatLabel}>30 {tx(lang, { de: 'Tage', it: 'giorni', en: 'days' })}</Text>
              <Text style={[st.weightStatValue, { color: weight?.delta_kg && weight.delta_kg > 0 ? '#DC2626' : '#2E7D52' }]}>
                {weight?.delta_kg !== null && weight?.delta_kg !== undefined ? `${weight.delta_kg > 0 ? '+' : ''}${weight.delta_kg.toFixed(1)} kg` : '–'}
              </Text>
            </View>
            <View style={st.weightStat}>
              <Text style={st.weightStatLabel}>{tx(lang, { de: 'Ziel', it: 'Obiettivo', en: 'Target' })}</Text>
              <Text style={st.weightStatValue}>{weight?.target_kg ? `${weight.target_kg.toFixed(1)} kg` : '–'}</Text>
            </View>
          </View>
          <WeightChart entries={weight?.entries || []} />
        </View>

        <SmartProductBlock context="weight" profileId={profileId} limit={1} testIdPrefix="wm-smart-weight" />

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Meal source picker modal */}
      <Modal visible={mealPicker} transparent animationType="slide" onRequestClose={() => setMealPicker(false)}>
        <View style={st.sheetBg}>
          <Animated.View entering={ZoomIn.duration(250)} style={st.sheetCard} data-testid="wm-meal-picker">
            <Text style={st.sheetTitle}>{tx(lang, { de: 'Wie moechtest du hinzufuegen?', it: 'Come vuoi aggiungere?', en: 'How do you want to add?' })}</Text>
            <TouchableOpacity style={[st.sourceTile, { backgroundColor: '#E8F5E9' }]} onPress={pickPhoto} data-testid="wm-source-photo">
              <MaterialCommunityIcons name="camera-plus-outline" size={36} color="#2E7D52" />
              <View style={{ flex: 1 }}>
                <Text style={st.sourceTitle}>{tx(lang, { de: 'Foto aufnehmen', it: 'Scatta foto', en: 'Take photo' })}</Text>
                <Text style={st.sourceSub}>{tx(lang, { de: 'KI erkennt & schaetzt', it: 'IA riconosce & stima', en: 'AI detects & estimates' })}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#2E7D52" />
            </TouchableOpacity>
            <TouchableOpacity style={[st.sourceTile, { backgroundColor: '#FEF3C7' }]} onPress={pickManual} data-testid="wm-source-manual">
              <MaterialCommunityIcons name="pencil-outline" size={36} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={st.sourceTitle}>{tx(lang, { de: 'Manuell eingeben', it: 'Inserisci manualmente', en: 'Manual entry' })}</Text>
                <Text style={st.sourceSub}>{tx(lang, { de: 'Name, kcal, Protein', it: 'Nome, kcal, proteine', en: 'Name, kcal, protein' })}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#D97706" />
            </TouchableOpacity>
            <TouchableOpacity style={[st.sourceTile, { backgroundColor: '#E0F2FE' }]} onPress={pickFavorites} data-testid="wm-source-favorites">
              <MaterialCommunityIcons name="heart-outline" size={36} color="#0284C7" />
              <View style={{ flex: 1 }}>
                <Text style={st.sourceTitle}>{tx(lang, { de: 'Meine Mahlzeiten', it: 'I miei pasti', en: 'My meals' })}</Text>
                <Text style={st.sourceSub}>
                  {favorites.length > 0
                    ? `${favorites.length} ${tx(lang, { de: 'gespeichert', it: 'salvati', en: 'saved' })}`
                    : tx(lang, { de: 'Noch keine Favoriten', it: 'Nessun preferito', en: 'No favorites yet' })}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#0284C7" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMealPicker(false)} style={st.sheetCancel}>
              <Text style={st.sheetCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Photo analysis modal */}
      <Modal visible={photoModal} transparent animationType="slide" onRequestClose={closePhotoModal}>
        <View style={st.modalBg}>
          <View style={[st.modalCard, { maxHeight: '90%' }]} data-testid="wm-photo-modal">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={st.modalTitle}>{tx(lang, { de: 'Foto-Analyse', it: 'Analisi foto', en: 'Photo analysis' })}</Text>
              {photoUri && (
                <Image source={{ uri: photoUri }} style={st.photoPreview} />
              )}
              {analyzing && (
                <View style={{ alignItems: 'center', padding: 18 }}>
                  <ActivityIndicator color="#2E7D52" />
                  <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 13 }}>
                    {tx(lang, { de: 'KI analysiert dein Essen ...', it: "L'IA sta analizzando ...", en: 'AI analyzing ...' })}
                  </Text>
                </View>
              )}
              {analysisResult && !analyzing && (
                <View data-testid="wm-photo-result">
                  {analysisResult.confidence === 'low' && (
                    <View style={st.warnBanner}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#D97706" />
                      <Text style={st.warnText}>{analysisResult.note || 'Nicht eindeutig erkannt. Bitte anpassen.'}</Text>
                    </View>
                  )}
                  {analysisResult.items?.length > 0 && (
                    <View style={st.tagsRow}>
                      {analysisResult.items.map((it: string, i: number) => (
                        <View key={i} style={st.tag}><Text style={st.tagText}>{it}</Text></View>
                      ))}
                    </View>
                  )}
                  <Text style={st.modalLabel}>{tx(lang, { de: 'Name', it: 'Nome', en: 'Name' })}</Text>
                  <TextInput style={st.input} value={mealName} onChangeText={setMealName} data-testid="wm-photo-name" />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.modalLabel}>kcal</Text>
                      <TextInput style={st.input} value={mealKcal} onChangeText={setMealKcal} keyboardType="numeric" data-testid="wm-photo-kcal" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.modalLabel}>Protein g</Text>
                      <TextInput style={st.input} value={mealProt} onChangeText={setMealProt} keyboardType="numeric" data-testid="wm-photo-prot" />
                    </View>
                  </View>
                  <View style={st.mealTypeRow}>
                    {(['breakfast', 'lunch', 'dinner', 'snack', 'shake'] as const).map(t => (
                      <TouchableOpacity key={t} style={[st.mealTypeChip, mealType === t && st.mealTypeChipActive]} onPress={() => setMealType(t)}>
                        <Text style={[st.mealTypeText, mealType === t && { color: '#FFFFFF' }]}>{mealLabel(t, lang)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={st.favToggle} onPress={() => setSaveAsFavorite(!saveAsFavorite)} data-testid="wm-photo-fav-toggle">
                    <MaterialCommunityIcons name={saveAsFavorite ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color="#2E7D52" />
                    <Text style={st.favToggleText}>{tx(lang, { de: 'Als Favorit speichern', it: 'Salva come preferito', en: 'Save as favorite' })}</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={st.modalRow}>
                <TouchableOpacity style={st.modalCancel} onPress={closePhotoModal}>
                  <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.modalConfirm, (analyzing || !analysisResult) && { opacity: 0.5 }]}
                  disabled={analyzing || !analysisResult} onPress={savePhotoMeal} data-testid="wm-photo-save">
                  <Text style={st.modalConfirmText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save' })}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manual modal */}
      <Modal visible={manualModal} transparent animationType="slide" onRequestClose={() => setManualModal(false)}>
        <View style={st.modalBg}>
          <View style={st.modalCard} data-testid="wm-manual-modal">
            <Text style={st.modalTitle}>{tx(lang, { de: 'Manuell hinzufuegen', it: 'Aggiungi manualmente', en: 'Add manually' })}</Text>
            <View style={st.mealTypeRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack', 'shake'] as const).map(t => (
                <TouchableOpacity key={t} style={[st.mealTypeChip, mealType === t && st.mealTypeChipActive]} onPress={() => setMealType(t)}>
                  <Text style={[st.mealTypeText, mealType === t && { color: '#FFFFFF' }]}>{mealLabel(t, lang)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={st.input} placeholder={tx(lang, { de: 'Name', it: 'Nome', en: 'Name' })}
              placeholderTextColor="#9CA3AF" value={mealName} onChangeText={setMealName} data-testid="wm-manual-name" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput style={[st.input, { flex: 1 }]} placeholder="kcal" placeholderTextColor="#9CA3AF"
                keyboardType="numeric" value={mealKcal} onChangeText={setMealKcal} data-testid="wm-manual-kcal" />
              <TextInput style={[st.input, { flex: 1 }]} placeholder="Protein g" placeholderTextColor="#9CA3AF"
                keyboardType="numeric" value={mealProt} onChangeText={setMealProt} data-testid="wm-manual-prot" />
            </View>
            <TouchableOpacity style={st.favToggle} onPress={() => setSaveAsFavorite(!saveAsFavorite)} data-testid="wm-manual-fav-toggle">
              <MaterialCommunityIcons name={saveAsFavorite ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color="#2E7D52" />
              <Text style={st.favToggleText}>{tx(lang, { de: 'Als Favorit speichern', it: 'Salva come preferito', en: 'Save as favorite' })}</Text>
            </TouchableOpacity>
            <View style={st.modalRow}>
              <TouchableOpacity style={st.modalCancel} onPress={() => { setManualModal(false); setSaveAsFavorite(false); }}>
                <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirm} onPress={addMealManual} data-testid="wm-manual-save">
                <Text style={st.modalConfirmText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Favorites modal */}
      <Modal visible={favModal} transparent animationType="slide" onRequestClose={() => setFavModal(false)}>
        <View style={st.modalBg}>
          <View style={[st.modalCard, { maxHeight: '85%' }]} data-testid="wm-favorites-modal">
            <View style={st.cardHeader}>
              <Text style={st.modalTitle}>{tx(lang, { de: 'Meine Mahlzeiten', it: 'I miei pasti', en: 'My meals' })}</Text>
              <TouchableOpacity onPress={() => setShowFavAdd(!showFavAdd)}>
                <MaterialCommunityIcons name={showFavAdd ? 'close' : 'plus'} size={24} color="#2E7D52" />
              </TouchableOpacity>
            </View>
            {showFavAdd && (
              <View style={st.favAddBox}>
                <View style={st.mealTypeRow}>
                  {(['breakfast', 'lunch', 'dinner', 'snack', 'shake'] as const).map(t => (
                    <TouchableOpacity key={t} style={[st.mealTypeChip, mealType === t && st.mealTypeChipActive]} onPress={() => setMealType(t)}>
                      <Text style={[st.mealTypeText, mealType === t && { color: '#FFFFFF' }]}>{mealLabel(t, lang)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={st.input} placeholder="Name" placeholderTextColor="#9CA3AF" value={mealName} onChangeText={setMealName} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput style={[st.input, { flex: 1 }]} placeholder="kcal" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={mealKcal} onChangeText={setMealKcal} />
                  <TextInput style={[st.input, { flex: 1 }]} placeholder="Protein g" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={mealProt} onChangeText={setMealProt} />
                </View>
                <TouchableOpacity style={st.bigPrimaryBtn} onPress={addFavorite}>
                  <Text style={st.bigPrimaryBtnText}>{tx(lang, { de: 'Favorit speichern', it: 'Salva preferito', en: 'Save favorite' })}</Text>
                </TouchableOpacity>
              </View>
            )}
            <ScrollView style={{ maxHeight: 400, marginTop: 10 }}>
              {favorites.length === 0 ? (
                <View style={st.emptyFav}>
                  <MaterialCommunityIcons name="heart-outline" size={40} color="#D1D5DB" />
                  <Text style={st.emptyFavText}>
                    {tx(lang, { de: 'Noch keine Favoriten. Speichere haeufig gegessene Mahlzeiten fuer schnelles Hinzufuegen.', it: 'Nessun preferito.', en: 'No favorites yet.' })}
                  </Text>
                </View>
              ) : (
                favorites.map(f => (
                  <View key={f.id} style={st.favRow} data-testid={`wm-fav-${f.id}`}>
                    <View style={[st.mealIcon, { backgroundColor: mealColor(f.category) + '20' }]}>
                      <MaterialCommunityIcons name={mealIcon(f.category) as any} size={18} color={mealColor(f.category)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.favName} numberOfLines={1}>{f.name}</Text>
                      <Text style={st.favMeta}>{f.calories} kcal · {f.protein_g}g Protein · {f.used_count}x</Text>
                    </View>
                    <TouchableOpacity style={st.favUseBtn} onPress={() => useFavorite(f.id)} data-testid={`wm-fav-use-${f.id}`}>
                      <MaterialCommunityIcons name="plus-circle" size={26} color="#2E7D52" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteFavorite(f.id)} style={{ marginLeft: 6 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="delete-outline" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={st.modalCancel} onPress={() => { setFavModal(false); setShowFavAdd(false); }}>
              <Text style={st.modalCancelText}>{tx(lang, { de: 'Schliessen', it: 'Chiudi', en: 'Close' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Schedule modal */}
      <Modal visible={scheduleModal} transparent animationType="slide" onRequestClose={() => setScheduleModal(false)}>
        <View style={st.modalBg}>
          <View style={st.modalCard} data-testid="wm-schedule-modal">
            <Text style={st.modalTitle}>{tx(lang, { de: 'Essensfenster festlegen', it: 'Imposta finestra', en: 'Set eating window' })}</Text>
            <Text style={st.modalSub}>
              {tx(lang, { de: 'Wir berechnen die Fastenphase automatisch.', it: 'Calcoliamo il digiuno automaticamente.', en: 'Fasting auto-computed.' })}
            </Text>
            <Text style={st.modalLabel}>{tx(lang, { de: 'Fensterbeginn (HH:MM)', it: 'Inizio (HH:MM)', en: 'Start (HH:MM)' })}</Text>
            <View style={st.presetRow}>
              {['08:00', '10:00', '12:00', '14:00'].map(t => (
                <TouchableOpacity key={t} style={[st.presetChip, winStart === t && st.presetChipActive]} onPress={() => setWinStart(t)}>
                  <Text style={[st.presetText, winStart === t && { color: '#FFFFFF' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={st.input} value={winStart} onChangeText={setWinStart} placeholder="12:00" placeholderTextColor="#9CA3AF" data-testid="wm-schedule-start" />
            <Text style={st.modalLabel}>{tx(lang, { de: 'Dauer (h)', it: 'Durata (h)', en: 'Duration (h)' })}</Text>
            <View style={st.presetRow}>
              {['6', '8', '10', '12'].map(h => (
                <TouchableOpacity key={h} style={[st.presetChip, winHours === h && st.presetChipActive]} onPress={() => setWinHours(h)}>
                  <Text style={[st.presetText, winHours === h && { color: '#FFFFFF' }]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={st.input} value={winHours} onChangeText={setWinHours} keyboardType="numeric" data-testid="wm-schedule-hours" />
            <View style={st.scheduleSummary}>
              <Text style={st.scheduleSummaryText}>
                {tx(lang, { de: `Fasten: ${Math.max(0, 24 - parseFloat(winHours || '0'))}h taeglich`, it: `Digiuno: ${Math.max(0, 24 - parseFloat(winHours || '0'))}h`, en: `Fasting: ${Math.max(0, 24 - parseFloat(winHours || '0'))}h` })}
              </Text>
            </View>
            <View style={st.modalRow}>
              <TouchableOpacity style={st.modalCancel} onPress={() => setScheduleModal(false)}>
                <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirm} onPress={saveSchedule} data-testid="wm-schedule-save">
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
            <TextInput style={st.input} placeholder="kg" placeholderTextColor="#9CA3AF" keyboardType="numeric"
              value={weightInput} onChangeText={setWeightInput} autoFocus data-testid="wm-weight-input" />
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

      {/* Goals modal */}
      <Modal visible={goalModal} transparent animationType="slide" onRequestClose={() => setGoalModal(false)}>
        <View style={st.modalBg}>
          <View style={[st.modalCard, { maxHeight: '90%' }]} data-testid="wm-goal-modal">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={st.modalTitle}>{tx(lang, { de: 'Ziele anpassen', it: 'Imposta obiettivi', en: 'Goals' })}</Text>

              {/* AI Calculator Section */}
              <View style={st.aiSection} data-testid="wm-ai-section">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <MaterialCommunityIcons name="creation" size={16} color="#6D28D9" />
                  <Text style={st.aiSectionTitle}>
                    {tx(lang, { de: 'KI-Berechnung', it: 'Calcolo IA', en: 'AI calculation' })}
                  </Text>
                </View>
                <Text style={st.aiSectionSub}>
                  {tx(lang, {
                    de: 'Basierend auf Geschlecht, aktuellem Gewicht und Ziel.',
                    it: 'Basato su genere, peso e obiettivo.',
                    en: 'Based on gender, weight & goal.',
                  })}
                </Text>
                {/* Gender */}
                <View style={st.aiRow}>
                  <TouchableOpacity style={[st.aiChip, aiGender === 'male' && st.aiChipActive]} onPress={() => setAiGender('male')} data-testid="wm-ai-gender-male">
                    <MaterialCommunityIcons name="gender-male" size={14} color={aiGender === 'male' ? '#FFFFFF' : '#6B7280'} />
                    <Text style={[st.aiChipText, aiGender === 'male' && { color: '#FFFFFF' }]}>{tx(lang, { de: 'Mann', it: 'Uomo', en: 'Male' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.aiChip, aiGender === 'female' && st.aiChipActive]} onPress={() => setAiGender('female')} data-testid="wm-ai-gender-female">
                    <MaterialCommunityIcons name="gender-female" size={14} color={aiGender === 'female' ? '#FFFFFF' : '#6B7280'} />
                    <Text style={[st.aiChipText, aiGender === 'female' && { color: '#FFFFFF' }]}>{tx(lang, { de: 'Frau', it: 'Donna', en: 'Female' })}</Text>
                  </TouchableOpacity>
                </View>
                {/* Activity */}
                <Text style={st.aiMiniLabel}>{tx(lang, { de: 'Aktivitaet', it: 'Attivita', en: 'Activity' })}</Text>
                <View style={st.aiRow}>
                  {(['sedentary', 'moderate', 'active', 'very_active'] as const).map(a => (
                    <TouchableOpacity key={a} style={[st.aiChipSmall, aiActivity === a && st.aiChipActive]} onPress={() => setAiActivity(a)} data-testid={`wm-ai-activity-${a}`}>
                      <Text style={[st.aiChipTextSmall, aiActivity === a && { color: '#FFFFFF' }]}>
                        {a === 'sedentary' ? tx(lang, { de: 'Ruhig', it: 'Bassa', en: 'Low' })
                          : a === 'moderate' ? tx(lang, { de: 'Mittel', it: 'Media', en: 'Med' })
                          : a === 'active' ? tx(lang, { de: 'Aktiv', it: 'Alta', en: 'High' })
                          : tx(lang, { de: 'Sport+', it: 'Sport+', en: 'Sport+' })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Goal */}
                <Text style={st.aiMiniLabel}>{tx(lang, { de: 'Ziel', it: 'Obiettivo', en: 'Goal' })}</Text>
                <View style={st.aiRow}>
                  {(['lose', 'maintain', 'gain', 'build_muscle'] as const).map(g => (
                    <TouchableOpacity key={g} style={[st.aiChipSmall, aiGoal === g && st.aiChipActive]} onPress={() => setAiGoal(g)} data-testid={`wm-ai-goal-${g}`}>
                      <Text style={[st.aiChipTextSmall, aiGoal === g && { color: '#FFFFFF' }]}>
                        {g === 'lose' ? tx(lang, { de: 'Abnehmen', it: 'Dimagrire', en: 'Lose' })
                          : g === 'maintain' ? tx(lang, { de: 'Halten', it: 'Mantenere', en: 'Keep' })
                          : g === 'gain' ? tx(lang, { de: 'Zunehmen', it: 'Aumentare', en: 'Gain' })
                          : tx(lang, { de: 'Muskeln', it: 'Muscoli', en: 'Muscle' })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={st.aiBtn} onPress={runAiCalculation} disabled={aiLoading} data-testid="wm-ai-run-btn">
                  {aiLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="auto-fix" size={16} color="#FFFFFF" />
                      <Text style={st.aiBtnText}>
                        {tx(lang, { de: 'KI berechnen', it: 'Calcola con IA', en: 'Calculate with AI' })}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {aiSuggestion && (
                  <View style={st.aiResult} data-testid="wm-ai-result">
                    <View style={st.aiResultRow}>
                      <View style={st.aiResultBox}>
                        <Text style={st.aiResultLabel}>kcal</Text>
                        <Text style={st.aiResultValue}>{aiSuggestion.daily_calories}</Text>
                        {(() => {
                          const cur = goals?.daily_calories || 0;
                          const diff = aiSuggestion.daily_calories - cur;
                          if (!cur || diff === 0) return null;
                          const up = diff > 0;
                          return (
                            <View style={[st.deltaBadge, { backgroundColor: up ? '#DCFCE7' : '#FEF3C7' }]} data-testid="wm-ai-delta-cal">
                              <MaterialCommunityIcons
                                name={up ? 'trending-up' : 'trending-down'}
                                size={11}
                                color={up ? '#15803D' : '#B45309'}
                              />
                              <Text style={[st.deltaText, { color: up ? '#15803D' : '#B45309' }]}>
                                {up ? '+' : ''}{diff} ggü. bisher
                              </Text>
                            </View>
                          );
                        })()}
                      </View>
                      <View style={st.aiResultBox}>
                        <Text style={st.aiResultLabel}>Protein</Text>
                        <Text style={st.aiResultValue}>{aiSuggestion.daily_protein}g</Text>
                        {(() => {
                          const cur = goals?.daily_protein || 0;
                          const diff = aiSuggestion.daily_protein - cur;
                          if (!cur || diff === 0) return null;
                          const up = diff > 0;
                          return (
                            <View style={[st.deltaBadge, { backgroundColor: up ? '#DCFCE7' : '#FEF3C7' }]} data-testid="wm-ai-delta-prot">
                              <MaterialCommunityIcons
                                name={up ? 'trending-up' : 'trending-down'}
                                size={11}
                                color={up ? '#15803D' : '#B45309'}
                              />
                              <Text style={[st.deltaText, { color: up ? '#15803D' : '#B45309' }]}>
                                {up ? '+' : ''}{diff}g ggü. bisher
                              </Text>
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                    {aiSuggestion.note ? (
                      <Text style={st.aiNote}>{aiSuggestion.note}</Text>
                    ) : null}
                  </View>
                )}
              </View>

              <Text style={st.modalLabel}>{tx(lang, { de: 'Kalorien', it: 'Calorie', en: 'Calories' })}</Text>
              <TextInput style={st.input} keyboardType="numeric" value={goalCal} onChangeText={setGoalCal} placeholderTextColor="#9CA3AF" data-testid="wm-goal-cal" />
              <Text style={st.modalLabel}>{tx(lang, { de: 'Protein (g)', it: 'Proteine (g)', en: 'Protein (g)' })}</Text>
              <TextInput style={st.input} keyboardType="numeric" value={goalProt} onChangeText={setGoalProt} placeholderTextColor="#9CA3AF" data-testid="wm-goal-prot" />
              <Text style={st.modalLabel}>{tx(lang, { de: 'Zielgewicht (kg)', it: 'Peso target', en: 'Target weight' })}</Text>
              <TextInput style={st.input} keyboardType="numeric" value={goalWeight} onChangeText={setGoalWeight} placeholderTextColor="#9CA3AF" data-testid="wm-goal-weight" />
              <View style={st.modalRow}>
                <TouchableOpacity style={st.modalCancel} onPress={() => setGoalModal(false)}>
                  <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.modalConfirm} onPress={saveGoals} data-testid="wm-goal-save">
                  <Text style={st.modalConfirmText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save' })}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    : t === 'shake' ? 'cup'
    : 'food-apple-outline';
}
function mealColor(t: string) {
  return t === 'breakfast' ? '#F59E0B'
    : t === 'lunch' ? '#2E7D52'
    : t === 'dinner' ? '#6D28D9'
    : t === 'shake' ? '#0EA5E9'
    : '#0284C7';
}
function mealLabel(t: string, lang: string) {
  const map: any = {
    breakfast: { de: 'Fruehstueck', it: 'Colazione', en: 'Breakfast' },
    lunch: { de: 'Mittag', it: 'Pranzo', en: 'Lunch' },
    dinner: { de: 'Abend', it: 'Cena', en: 'Dinner' },
    snack: { de: 'Snack', it: 'Snack', en: 'Snack' },
    shake: { de: 'Shake', it: 'Shake', en: 'Shake' },
  };
  return tx(lang, map[t] || map.snack);
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F7FAF8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F2',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1, textAlign: 'center' },

  veroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, marginBottom: 0, padding: 12, backgroundColor: '#E8F5E9', borderRadius: 14,
  },
  veroImg: { width: 36, height: 36 },
  veroText: { flex: 1, fontSize: 13, color: '#1F5937', fontWeight: '600' },

  fastCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, margin: 16, marginBottom: 8, padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' as any },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  fastIdleText: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 14 },

  fastTimerWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  fastTimerCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 6 },
  phaseBadgeText: { fontSize: 11, fontWeight: '700' },
  fastTimerValue: { fontSize: 26, fontWeight: '800', color: '#1F2937', fontVariant: ['tabular-nums'] },
  fastTimerSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  scheduleInfo: { width: '100%', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F2' },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  scheduleLabel: { fontSize: 13, color: '#6B7280' },
  scheduleValue: { fontSize: 13, fontWeight: '700', color: '#1F2937' },

  removeBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  removeBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },

  bigPrimaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#2E7D52', borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  bigPrimaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, marginHorizontal: 16, marginVertical: 8, padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' as any },
    }),
  },
  summaryRings: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 8 },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  ringSub: { fontSize: 11, color: '#9CA3AF' },
  ringLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginTop: 8, textAlign: 'center' },

  mealsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F2' },
  mealIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mealName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  mealMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  weightCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  smallBtnText: { color: '#2E7D52', fontWeight: '700', fontSize: 12 },
  weightStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  weightStat: { alignItems: 'center', flex: 1 },
  weightStatLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  weightStatValue: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  chartEmpty: { backgroundColor: '#FAFBFA', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 16 },
  chartEmptyText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },

  // Bottom sheet meal source picker
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  sourceTile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16, marginBottom: 10 },
  sourceTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  sourceSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sheetCancel: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  sheetCancelText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, width: '100%', maxWidth: 440 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1F2937' },
  modalSub: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 10 },
  modalLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F2937', marginVertical: 4 },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#F1F5F2' },
  modalCancelText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  modalConfirm: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#2E7D52' },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  mealTypeRow: { flexDirection: 'row', gap: 6, marginVertical: 10, flexWrap: 'wrap' },
  mealTypeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F1F5F2' },
  mealTypeChipActive: { backgroundColor: '#2E7D52' },
  mealTypeText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  presetRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  presetChip: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F1F5F2', alignItems: 'center' },
  presetChipActive: { backgroundColor: '#2E7D52' },
  presetText: { fontWeight: '700', color: '#6B7280' },

  scheduleSummary: { marginTop: 10, padding: 10, backgroundColor: '#F3E8FF', borderRadius: 10 },
  scheduleSummaryText: { fontSize: 12, color: '#6D28D9', fontWeight: '600', textAlign: 'center' },

  photoPreview: { width: '100%', height: 200, borderRadius: 12, marginVertical: 12, backgroundColor: '#F1F5F2' },
  warnBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginBottom: 10 },
  warnText: { flex: 1, fontSize: 12, color: '#92400E' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#E8F5E9' },
  tagText: { fontSize: 11, color: '#2E7D52', fontWeight: '600' },
  favToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  favToggleText: { fontSize: 13, color: '#374151' },

  favAddBox: { backgroundColor: '#F7FAF8', padding: 12, borderRadius: 12, marginTop: 8 },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F2' },
  favName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  favMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  favUseBtn: { padding: 4 },
  emptyFav: { alignItems: 'center', padding: 40 },
  emptyFavText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 10, lineHeight: 20 },

  // AI goals calculator section
  aiSection: {
    backgroundColor: '#F3E8FF',
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  aiSectionTitle: { fontSize: 14, fontWeight: '800', color: '#6D28D9' },
  aiSectionSub: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  aiMiniLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 8, marginBottom: 4 },
  aiRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  aiChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  aiChipSmall: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  aiChipActive: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' },
  aiChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  aiChipTextSmall: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#6D28D9', paddingVertical: 12, borderRadius: 12, marginTop: 12,
  },
  aiBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  aiResult: {
    marginTop: 12, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E9D5FF',
  },
  aiResultRow: { flexDirection: 'row', gap: 10 },
  aiResultBox: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  aiResultLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  aiResultValue: { fontSize: 20, fontWeight: '800', color: '#6D28D9', marginTop: 2 },
  aiNote: { fontSize: 12, color: '#4C1D95', marginTop: 8, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },
  deltaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 10, marginTop: 6,
  },
  deltaText: { fontSize: 10, fontWeight: '700' },
});
