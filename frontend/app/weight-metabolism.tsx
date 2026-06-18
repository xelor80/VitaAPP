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
import { AbnehmGuideModal } from '../components/AbnehmGuideModal';

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
      <Polyline points={pts} fill="none" stroke="#C2272F" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {entries.map((e, i) => {
        const x = pad + i * xStep;
        const y = pad + (h - pad * 2) * (1 - (e.weight_kg - min) / range);
        return <Circle key={i} cx={x} cy={y} r={3} fill="#C2272F" />;
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
  const [dayPlan, setDayPlan] = useState<any>(null);

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

  // VERO info modal (Abnehm-Erklaerung)
  const [veroInfoModal, setVeroInfoModal] = useState(false);

  // Abnehm-Guide modal (Phase 1: 6-card educational carousel)
  const [guideModal, setGuideModal] = useState(false);

  // Achievements (streak, badges)
  const [achievements, setAchievements] = useState<any>(null);

  // Phase 2: collapsible sections (Mahlzeiten, Gewicht, Empfehlungen)
  const [collapsedMeals, setCollapsedMeals] = useState(false);
  const [collapsedWeight, setCollapsedWeight] = useState(false);
  const [collapsedReco, setCollapsedReco] = useState(true);

  // Weight-history modal (Verlauf einsehen + einzeln loeschen + reset)
  const [historyModal, setHistoryModal] = useState(false);

  // Schedule modal - now uses fast_start + duration (14/15/16h)
  const [scheduleModal, setScheduleModal] = useState(false);
  const [fastStart, setFastStart] = useState('20:00');
  const [fastDuration, setFastDuration] = useState<'14' | '15' | '16'>('16');

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
      const [tRes, gRes, schedRes, wRes, favRes, dpRes, achRes] = await Promise.all([
        fetch(`${API_URL}/api/weight-metabolism/${pid}/today`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/goals`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/schedule`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/weight/history?days=30`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/favorites`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/day-plan`),
        fetch(`${API_URL}/api/weight-metabolism/${pid}/achievements`),
      ]);
      if (tRes.ok) setToday(await tRes.json());
      if (gRes.ok) setGoals(await gRes.json());
      if (schedRes.ok) setSchedule(await schedRes.json());
      if (wRes.ok) setWeight(await wRes.json());
      if (favRes.ok) { const d = await favRes.json(); setFavorites(d.items || []); }
      if (dpRes.ok) setDayPlan(await dpRes.json());
      if (achRes.ok) setAchievements(await achRes.json());
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
    // Refresh day-plan (which depends on schedule)
    if (profileId) {
      fetch(`${API_URL}/api/weight-metabolism/${profileId}/day-plan`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setDayPlan(d); })
        .catch(() => {});
    }
  }, [schedule?.active, schedule?.eating_window_start, schedule?.eating_window_hours, schedule?.reminders_enabled, lang, profileId]);

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
      // Auto-show Abnehm-Guide on first visit (one-time)
      try {
        const seen = await AsyncStorage.getItem('abnehm_guide_seen');
        if (!seen) {
          setTimeout(() => setGuideModal(true), 800);
          AsyncStorage.setItem('abnehm_guide_seen', '1').catch(() => {});
        }
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

  // ── Phase 3: contextual product hints per timeline event ──
  const productHintFor = (eventKey: string): { de: string; it: string; en: string } => {
    const map: Record<string, { de: string; it: string; en: string }> = {
      shake1: {
        de: 'Passend: Protein-Mix für deinen Start',
        it: 'Consigliato: mix proteico per iniziare',
        en: 'Match: protein mix for your start',
      },
      shake2: {
        de: 'Passend: Sättigender Protein-Boost',
        it: 'Consigliato: boost proteico saziante',
        en: 'Match: filling protein boost',
      },
      small_meal: {
        de: 'Passend: Proteinreiche Snack-Idee',
        it: 'Consigliato: snack proteico',
        en: 'Match: protein-rich snack idea',
      },
      large_meal: {
        de: 'Passend: Elektrolyt-Komplex für Wasser',
        it: 'Consigliato: complesso elettrolitico',
        en: 'Match: electrolyte complex for water',
      },
    };
    return map[eventKey] || map.shake1;
  };

  const openRecommendations = () => {
    setCollapsedReco(false);
    // Wait for state then scroll-hint isn't trivial in RN web; just expand
  };

  // ── Hunger-prevention coach lines (static, per timeline event) ──
  const coachLineFor = (eventKey: string): string => {
    const map: Record<string, { de: string; it: string; en: string }> = {
      shake1: {
        de: 'Dein erster Shake hilft dir, stabil in den Tag zu starten.',
        it: 'Il primo shake ti dà un avvio stabile.',
        en: 'Your first shake helps you start the day stable.',
      },
      shake2: {
        de: 'Die zweite Proteinphase hilft gegen spätere Snacks.',
        it: 'La seconda fase proteica evita snack tardivi.',
        en: 'The second protein step prevents late-day snacks.',
      },
      small_meal: {
        de: 'Die kleine Mahlzeit verhindert extremes Abendessen.',
        it: 'Il pasto piccolo evita una cena troppo abbondante.',
        en: 'The small meal prevents an oversized dinner.',
      },
      large_meal: {
        de: 'Gönn dir hier eine sättigende, eiweißreiche Mahlzeit.',
        it: 'Concediti un pasto saziante e ricco di proteine.',
        en: 'Enjoy a satiating, protein-rich meal here.',
      },
    };
    const entry = map[eventKey] || map.shake1;
    return tx(lang, entry);
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

  // ── Phase 3: Routine-Mahlzeit-Templates (1-Klick Quick-Add) ──
  const MEAL_TEMPLATES = [
    { id: 'std_shake', name: { de: 'Standard Shake', it: 'Shake standard', en: 'Standard shake' }, calories: 320, protein_g: 35, type: 'shake' as const, icon: 'cup', color: '#6D28D9' },
    { id: 'protein_bowl', name: { de: 'Protein Bowl', it: 'Protein bowl', en: 'Protein bowl' }, calories: 480, protein_g: 38, type: 'lunch' as const, icon: 'bowl-mix-outline', color: '#C2272F' },
    { id: 'chicken_rice', name: { de: 'Hähnchen Reis', it: 'Pollo riso', en: 'Chicken rice' }, calories: 620, protein_g: 45, type: 'dinner' as const, icon: 'food-drumstick-outline', color: '#D97706' },
    { id: 'skyr_snack', name: { de: 'Skyr Snack', it: 'Snack Skyr', en: 'Skyr snack' }, calories: 180, protein_g: 22, type: 'snack' as const, icon: 'food-apple-outline', color: '#0EA5E9' },
  ];

  const quickAddTemplate = async (tpl: typeof MEAL_TEMPLATES[number]) => {
    if (!profileId) return;
    setMealPicker(false);
    const name = tpl.name[lang as 'de' | 'it' | 'en'] || tpl.name.de;
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, calories: tpl.calories, protein_g: tpl.protein_g, meal_type: tpl.type,
        }),
      });
      showActionToast(tx(lang, { de: `${name} eingetragen`, it: `${name} aggiunto`, en: `${name} added` }), 'success');
      reload();
      eventBus.emit('weight_metabolism_changed');
      showCoachComment({ name, calories: tpl.calories, protein_g: tpl.protein_g, meal_type: tpl.type });
    } catch (e) { console.warn(e); }
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

  const deleteWeightEntry = async (entryId: string) => {
    if (!profileId) return;
    Alert.alert(
      tx(lang, { de: 'Eintrag loeschen?', it: 'Eliminare voce?', en: 'Delete entry?' }),
      tx(lang, { de: 'Dieser Gewichtseintrag wird entfernt.', it: 'Questa voce verra rimossa.', en: 'This entry will be removed.' }),
      [
        { text: tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' }), style: 'cancel' },
        {
          text: tx(lang, { de: 'Loeschen', it: 'Elimina', en: 'Delete' }), style: 'destructive', onPress: async () => {
            try {
              await fetch(`${API_URL}/api/weight-metabolism/${profileId}/weight/${entryId}`, { method: 'DELETE' });
              try { showActionToast(tx(lang, { de: 'Eintrag entfernt', it: 'Voce rimossa', en: 'Entry removed' }), 'info'); } catch {}
              reload();
            } catch {}
          }
        },
      ]
    );
  };

  const resetWeightHistory = async () => {
    if (!profileId) return;
    Alert.alert(
      tx(lang, { de: 'Verlauf zuruecksetzen?', it: 'Azzerare lo storico?', en: 'Reset history?' }),
      tx(lang, {
        de: 'Alle Gewichtseintraege werden geloescht. Diese Aktion kann nicht rueckgaengig gemacht werden.',
        it: 'Tutte le voci di peso saranno eliminate. Questa azione non puo essere annullata.',
        en: 'All weight entries will be deleted. This cannot be undone.',
      }),
      [
        { text: tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' }), style: 'cancel' },
        {
          text: tx(lang, { de: 'Alles loeschen', it: 'Elimina tutto', en: 'Delete all' }), style: 'destructive', onPress: async () => {
            try {
              await fetch(`${API_URL}/api/weight-metabolism/${profileId}/weight`, { method: 'DELETE' });
              try { showActionToast(tx(lang, { de: 'Verlauf zurueckgesetzt', it: 'Storico azzerato', en: 'History reset' }), 'info'); } catch {}
              setHistoryModal(false);
              reload();
            } catch {}
          }
        },
      ]
    );
  };

  // Schedule
  const openScheduleModal = () => {
    setFastStart(schedule?.fast_start || '20:00');
    const dur = schedule?.fast_duration_hours;
    if (dur === 14) setFastDuration('14');
    else if (dur === 15) setFastDuration('15');
    else setFastDuration('16');
    setScheduleModal(true);
  };

  const saveSchedule = async () => {
    if (!profileId) return;
    if (!/^\d{1,2}:\d{2}$/.test(fastStart)) { Alert.alert('Format HH:MM'); return; }
    const duration = parseInt(fastDuration, 10);
    try {
      await fetch(`${API_URL}/api/weight-metabolism/${profileId}/schedule`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fast_start: fastStart,
          fast_duration_hours: duration,
          daily_recurring: true,
          reminders_enabled: true,
        }),
      });
      setScheduleModal(false);
      try {
        const hours = 24 - duration;
        // Map fast-start to eating_window_start for notifications
        const [h, m] = fastStart.split(':').map(x => parseInt(x, 10));
        const ewMin = ((h * 60 + m + duration * 60) % 1440);
        const ewStart = `${String(Math.floor(ewMin / 60)).padStart(2, '0')}:${String(ewMin % 60).padStart(2, '0')}`;
        const ok = await scheduleFastingReminders({
          eating_window_start: ewStart,
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

  const toggleEventCheck = async (eventKey: string, currentlyChecked: boolean) => {
    if (!profileId) return;
    // Optimistic UI
    setDayPlan((prev: any) => {
      if (!prev) return prev;
      const events = prev.events.map((e: any) =>
        e.key === eventKey ? { ...e, checked: !currentlyChecked } : e
      );
      const done = events.filter((e: any) => e.checked).length;
      return { ...prev, events, done_count: done, progress_pct: Math.round(done / events.length * 100) };
    });
    try {
      const res = await fetch(`${API_URL}/api/weight-metabolism/${profileId}/day-plan/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_key: eventKey, done: !currentlyChecked }),
      });
      if (res.ok) setDayPlan(await res.json());
      if (!currentlyChecked) {
        try { showActionToast('Gut gemacht!', 'success'); } catch {}
      }
    } catch (e) { console.warn(e); reload(); }
  };

  const stopSchedule = async () => {
    if (!profileId) return;
    Alert.alert(
      'Protein-Routine beenden?',
      'Dein taeglicher Plan wird entfernt.',
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
  const [aiAge, setAiAge] = useState('');
  const [aiHeight, setAiHeight] = useState('');
  const [aiWeight, setAiWeight] = useState('');

  const openGoalModal = () => {
    setGoalCal(String(goals?.daily_calories ?? ''));
    setGoalProt(String(goals?.daily_protein ?? ''));
    setGoalWeight(String(goals?.target_weight_kg ?? ''));
    // Pre-fill AI inputs from existing data so user just adjusts/clicks calculate
    const profile = today?.profile || {};
    if (profile.gender === 'male' || profile.gender === 'female') setAiGender(profile.gender);
    if (profile.activity_level) {
      const al = String(profile.activity_level).toLowerCase();
      if (['sedentary', 'light', 'moderate', 'active', 'very_active'].includes(al)) setAiActivity(al as any);
    }
    setAiAge(profile.age ? String(profile.age) : '');
    setAiHeight(profile.height ? String(profile.height) : '');
    setAiWeight(weight?.current_kg ? String(weight.current_kg) : (profile.weight ? String(profile.weight) : ''));
    setAiSuggestion(null);
    setGoalModal(true);
  };

  const runAiCalculation = async () => {
    if (!profileId) return;
    // Validate inputs
    const ageNum = parseInt(aiAge, 10);
    const heightNum = parseFloat(aiHeight.replace(',', '.'));
    const weightNum = parseFloat(aiWeight.replace(',', '.'));
    if (isNaN(ageNum) || ageNum < 14 || ageNum > 100) {
      Alert.alert(tx(lang, { de: 'Alter', it: 'Età', en: 'Age' }), tx(lang, { de: 'Bitte Alter (14-100) eingeben.', it: 'Inserisci età (14-100).', en: 'Please enter age (14-100).' }));
      return;
    }
    if (isNaN(heightNum) || heightNum < 120 || heightNum > 230) {
      Alert.alert(tx(lang, { de: 'Größe', it: 'Altezza', en: 'Height' }), tx(lang, { de: 'Bitte Körpergröße in cm (120-230) eingeben.', it: 'Inserisci altezza in cm (120-230).', en: 'Please enter height in cm (120-230).' }));
      return;
    }
    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      Alert.alert(tx(lang, { de: 'Gewicht', it: 'Peso', en: 'Weight' }), tx(lang, { de: 'Bitte aktuelles Gewicht in kg (30-300) eingeben.', it: 'Inserisci peso attuale in kg (30-300).', en: 'Please enter current weight in kg (30-300).' }));
      return;
    }
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const res = await fetch(`${API_URL}/api/weight-metabolism/${profileId}/ai-calculate-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: aiGender,
          current_weight_kg: weightNum,
          height_cm: heightNum,
          age: ageNum,
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
      // Refresh today/weight in background so deficit card updates
      reload();
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
        <ActivityIndicator size="large" color="#C2272F" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  // Live schedule progress (client-side tick)
  let sched = schedule;
  if (schedule?.active) {
    const remaining = Math.max(0, (schedule.remaining_seconds || 0) - tick);
    sched = { ...schedule, remaining_seconds: remaining };
  }

  // Contextual VERO hint (plan-aware)
  const remainingPro = Math.max(0, (today?.goals?.daily_protein || 0) - (today?.totals?.protein_g || 0));
  let veroHint: string | null = null;
  if (dayPlan?.active && dayPlan?.next_event) {
    const ne = dayPlan.next_event;
    const neLabel = lang === 'it' ? ne.label_it : lang === 'en' ? ne.label_en : ne.label_de;
    if (ne.status === 'now') {
      veroHint = `Jetzt dran: ${neLabel} · ${ne.time}`;
    } else if (dayPlan.done_count === 0) {
      veroHint = `Naechster Schritt: ${neLabel} um ${ne.time}`;
    } else if (dayPlan.done_count === dayPlan.total_count) {
      veroHint = 'Perfekt – du hast heute alles erledigt!';
    } else {
      veroHint = `Du bist im Plan. Naechster: ${neLabel} · ${ne.time}`;
    }
  }
  if (!veroHint && sched?.active) {
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
        <TouchableOpacity onPress={() => canGoBack ? router.back() : router.push('/(tabs)' as any)} testID="wm-back-btn" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#1F2937" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>{tx(lang, { de: 'Abnehm-Guide', it: 'Guida dimagrante', en: 'Slim guide' })}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity onPress={() => setGuideModal(true)} testID="wm-guide-btn" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={22} color="#6D28D9" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openGoalModal} testID="wm-goal-btn" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialCommunityIcons name="cog-outline" size={22} color="#C2272F" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* VERO Hint */}
        {veroHint && (
          <Animated.View entering={FadeIn.duration(300)} style={st.veroCard} testID="wm-vero-hint">
            <Image source={VERO_HALLO} style={st.veroImg} resizeMode="contain" />
            <Text style={st.veroText}>{veroHint}</Text>
          </Animated.View>
        )}

        {/* Fasten Schedule Card */}
        <View style={st.fastCard} testID="wm-fasting-card">
          <View style={st.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="clock-outline" size={22} color={sched?.active && sched.phase === 'eating' ? '#C2272F' : '#6D28D9'} />
              <Text style={st.cardTitle}>{tx(lang, { de: 'Protein-Routine', it: 'Routine proteica', en: 'Protein routine' })}</Text>
            </View>
            <TouchableOpacity onPress={openScheduleModal} testID="wm-schedule-edit-btn">
              <MaterialCommunityIcons name={sched?.active ? 'pencil-outline' : 'plus-circle-outline'} size={22} color="#C2272F" />
            </TouchableOpacity>
          </View>

          {sched?.active ? (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity
                style={st.fastTimerWrap}
                onPress={() => setVeroInfoModal(true)}
                activeOpacity={0.85}
                testID="wm-fast-circle-info"
              >
                <Svg width={200} height={200}>
                  <G rotation="-90" origin="100, 100">
                    <Circle cx="100" cy="100" r="88" stroke="#EEF1EF" strokeWidth={12} fill="none" />
                    <Circle cx="100" cy="100" r="88"
                      stroke={sched.phase === 'eating' ? '#C2272F' : '#6D28D9'}
                      strokeWidth={12}
                      strokeDasharray={`${2 * Math.PI * 88 * (sched.progress_pct || 0) / 100} ${2 * Math.PI * 88}`}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </G>
                </Svg>
                <View style={st.fastTimerCenter}>
                  <View style={[st.phaseBadge, { backgroundColor: sched.phase === 'eating' ? '#FEE2E2' : '#F3E8FF' }]}>
                    <MaterialCommunityIcons
                      name={sched.phase === 'eating' ? 'silverware-fork-knife' : 'timer-sand'}
                      size={12}
                      color={sched.phase === 'eating' ? '#C2272F' : '#6D28D9'}
                    />
                    <Text style={[st.phaseBadgeText, { color: sched.phase === 'eating' ? '#C2272F' : '#6D28D9' }]}>
                      {sched.phase === 'eating'
                        ? tx(lang, { de: 'Essensfenster', it: 'Finestra cibo', en: 'Eating window' })
                        : tx(lang, { de: 'Proteinphase', it: 'Fase proteica', en: 'Protein phase' })}
                    </Text>
                  </View>
                  <Text style={st.fastTimerValue}>{fmtCountdown(sched.remaining_seconds || 0)}</Text>
                  <Text style={st.fastTimerSub}>
                    {sched.phase === 'eating'
                      ? tx(lang, { de: 'bis Tagesabschluss', it: 'fine giornata', en: 'until day end' })
                      : tx(lang, { de: 'bis Routine-Start', it: "all'avvio routine", en: 'until start' })}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVeroInfoModal(true)} style={st.circleInfoHint} testID="wm-circle-info-hint">
                <MaterialCommunityIcons name="information-outline" size={14} color="#6D28D9" />
                <Text style={st.circleInfoHintText}>
                  {tx(lang, { de: 'Tippe für VERO-Erklärung', it: 'Tocca per la guida VERO', en: 'Tap for VERO guide' })}
                </Text>
              </TouchableOpacity>
              <View style={st.phaseCardsWrap}>
                <View style={[st.phaseCard, { backgroundColor: '#F3E8FF', borderLeftColor: '#6D28D9' }]}>
                  <View style={st.phaseCardHead}>
                    <MaterialCommunityIcons name="timer-sand" size={16} color="#6D28D9" />
                    <Text style={[st.phaseCardTitle, { color: '#6D28D9' }]}>
                      {tx(lang, { de: 'Proteinphase', it: 'Fase proteica', en: 'Protein phase' })}
                    </Text>
                    <Text style={st.phaseCardTime}>
                      {sched.fast_start || sched.eating_window_end} – {sched.eating_window_start}
                    </Text>
                  </View>
                  <Text style={st.phaseCardText}>
                    {tx(lang, {
                      de: 'In dieser Phase liegt der Fokus auf Struktur, Wasser und geplanten Proteinzeiten.',
                      it: 'In questa fase: struttura, acqua e fasi proteiche pianificate.',
                      en: 'This phase focuses on structure, water and planned protein steps.',
                    })}
                  </Text>
                </View>
                <View style={[st.phaseCard, { backgroundColor: '#FEE2E2', borderLeftColor: '#C2272F' }]}>
                  <View style={st.phaseCardHead}>
                    <MaterialCommunityIcons name="silverware-fork-knife" size={16} color="#C2272F" />
                    <Text style={[st.phaseCardTitle, { color: '#C2272F' }]}>
                      {tx(lang, { de: 'Essensfenster', it: 'Finestra cibo', en: 'Eating window' })}
                    </Text>
                    <Text style={st.phaseCardTime}>
                      {sched.eating_window_start} – {sched.eating_window_end}
                    </Text>
                  </View>
                  <Text style={st.phaseCardText}>
                    {tx(lang, {
                      de: 'Hier finden deine geplanten Mahlzeiten und Shakes statt.',
                      it: 'Qui i tuoi pasti e shake pianificati.',
                      en: 'Your planned meals and shakes happen here.',
                    })}
                  </Text>
                </View>
              </View>

              {/* TIMELINE: Auto-generated daily plan */}
              {dayPlan?.active && dayPlan?.events?.length > 0 && (
                <View style={st.timelineBox} testID="wm-timeline">
                  <View style={st.timelineHeader}>
                    <Text style={st.timelineTitle}>
                      {tx(lang, { de: 'Dein Tagesplan', it: 'Il tuo piano', en: 'Your plan' })}
                    </Text>
                    <Text style={st.timelineProgress}>
                      {dayPlan.done_count}/{dayPlan.total_count}
                    </Text>
                  </View>
                  {/* Progress bar */}
                  <View style={st.timelineBar}>
                    <View style={[st.timelineBarFill, { width: `${dayPlan.progress_pct}%` }]} />
                  </View>
                  {/* Events */}
                  {dayPlan.events.map((ev: any, idx: number) => (
                    <TouchableOpacity
                      key={ev.key}
                      style={[st.timelineEvent, ev.checked && st.timelineEventDone]}
                      onPress={() => {
                        if (ev.kind === 'meal' && !ev.checked) {
                          // Open meal picker for meals
                          setMealPicker(true);
                        } else {
                          toggleEventCheck(ev.key, ev.checked);
                        }
                      }}
                      activeOpacity={0.7}
                      testID={`wm-timeline-event-${ev.key}`}
                    >
                      <View style={st.timelineDotCol}>
                        <View style={[
                          st.timelineDot,
                          ev.checked && st.timelineDotDone,
                          ev.status === 'now' && !ev.checked && st.timelineDotNow,
                        ]}>
                          {ev.checked ? (
                            <Animated.View
                              key={`done-${ev.key}`}
                              entering={ZoomIn.duration(350).springify()}
                              testID={`wm-check-anim-${ev.key}`}
                            >
                              <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                            </Animated.View>
                          ) : (
                            <MaterialCommunityIcons name={ev.icon} size={14} color={ev.status === 'now' ? '#FFFFFF' : '#6B7280'} />
                          )}
                        </View>
                        {idx < dayPlan.events.length - 1 && (
                          <View style={[st.timelineLine, ev.checked && { backgroundColor: '#FCA5A5' }]} />
                        )}
                      </View>
                      <View style={{ flex: 1, paddingBottom: idx === dayPlan.events.length - 1 ? 0 : 14 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[st.timelineEventLabel, ev.checked && { textDecorationLine: 'line-through', color: '#9CA3AF' }]}>
                            {lang === 'it' ? ev.label_it : lang === 'en' ? ev.label_en : ev.label_de}
                          </Text>
                          <Text style={[st.timelineEventTime, ev.status === 'now' && { color: '#6D28D9', fontWeight: '800' }]}>
                            {ev.time}
                          </Text>
                        </View>
                        {/* Budget chips */}
                        {!ev.checked && (
                          <View style={st.budgetRow}>
                            {ev.target_calories > 0 && (
                              <View style={st.budgetChip}>
                                <Text style={st.budgetChipText}>~{ev.target_calories} kcal</Text>
                              </View>
                            )}
                            {ev.target_protein_g > 0 && (
                              <View style={[st.budgetChip, { backgroundColor: '#FEF3C7' }]}>
                                <Text style={[st.budgetChipText, { color: '#B45309' }]}>{ev.target_protein_g}g Protein</Text>
                              </View>
                            )}
                          </View>
                        )}
                        {/* Hunger-prevention coach hint */}
                        {!ev.checked && ev.status !== 'upcoming' && (
                          <View style={st.coachLineRow} testID={`wm-coach-line-${ev.key}`}>
                            <MaterialCommunityIcons name="lightbulb-on-outline" size={11} color="#6D28D9" />
                            <Text style={st.coachLineText}>{coachLineFor(ev.key)}</Text>
                          </View>
                        )}
                        {/* Phase 3: per-step product hint (taps opens recommendations) */}
                        {!ev.checked && ev.status === 'now' && (
                          <TouchableOpacity
                            style={st.stepProductChip}
                            onPress={(e) => { e.stopPropagation?.(); openRecommendations(); }}
                            activeOpacity={0.7}
                            testID={`wm-step-product-${ev.key}`}
                          >
                            <MaterialCommunityIcons name="store-outline" size={11} color="#0EA5E9" />
                            <Text style={st.stepProductText} numberOfLines={1}>{tx(lang, productHintFor(ev.key))}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={12} color="#0EA5E9" />
                          </TouchableOpacity>
                        )}
                        <View style={st.timelineMeta}>
                          <MaterialCommunityIcons name="cup-water" size={12} color="#0EA5E9" />
                          <Text style={st.timelineMetaText}>+{ev.water_ml}ml {tx(lang, { de: 'Wasser', it: 'acqua', en: 'water' })}</Text>
                          {ev.status === 'now' && !ev.checked && (
                            <View style={st.timelineNowBadge}>
                              <Text style={st.timelineNowText}>{tx(lang, { de: 'Jetzt', it: 'Ora', en: 'Now' })}</Text>
                            </View>
                          )}
                        </View>
                        {/* Step-specific action button */}
                        {!ev.checked && ev.status !== 'upcoming' && (
                          <View style={st.stepActionRow}>
                            {ev.kind === 'drink' ? (
                              <TouchableOpacity
                                style={st.drinkBtn}
                                onPress={(e) => { e.stopPropagation?.(); toggleEventCheck(ev.key, false); }}
                                testID={`wm-drink-${ev.key}`}
                              >
                                <MaterialCommunityIcons name="check-circle-outline" size={14} color="#FFFFFF" />
                                <Text style={st.drinkBtnText}>{tx(lang, { de: 'Getrunken', it: 'Bevuto', en: 'Drunk' })}</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={st.mealBtn}
                                onPress={(e) => { e.stopPropagation?.(); setMealPicker(true); }}
                                testID={`wm-meal-log-${ev.key}`}
                              >
                                <MaterialCommunityIcons name="plus-circle-outline" size={14} color="#FFFFFF" />
                                <Text style={st.drinkBtnText}>{tx(lang, { de: 'Mahlzeit eintragen', it: 'Registra pasto', en: 'Log meal' })}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity style={st.removeBtn} onPress={stopSchedule} testID="wm-schedule-stop-btn">
                <Text style={st.removeBtnText}>{tx(lang, { de: 'Plan entfernen', it: 'Rimuovi piano', en: 'Remove plan' })}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text style={st.fastIdleText}>
                {tx(lang, {
                  de: 'Waehle deinen Routine-Start + Fastendauer (14/15/16h). Wir erstellen deinen Tagesplan mit Shakes und Mahlzeiten.',
                  it: 'Scegli avvio routine + durata. Creiamo il piano.',
                  en: 'Choose start + fasting hours. We build your plan.',
                })}
              </Text>
              <Text style={st.medDisclaimer}>
                {tx(lang, {
                  de: 'Diese Funktion ersetzt keine medizinische Beratung.',
                  it: 'Questa funzione non sostituisce un consulto medico.',
                  en: 'This feature is not medical advice.',
                })}
              </Text>
              <TouchableOpacity style={st.bigPrimaryBtn} onPress={openScheduleModal} testID="wm-schedule-create-btn">
                <MaterialCommunityIcons name="clock-plus-outline" size={20} color="#FFFFFF" />
                <Text style={st.bigPrimaryBtnText}>
                  {tx(lang, { de: 'Protein-Routine starten', it: 'Avvia routine', en: 'Start routine' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Today summary rings */}
        <View style={st.summaryCard} testID="wm-today-summary">
          <View style={st.summaryRings}>
            <Ring
              pct={today?.progress?.calories_pct || 0}
              color="#C2272F"
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

          {/* Daily Deficit / Surplus Indicator */}
          {(() => {
            const goal = today?.goals?.daily_calories || 0;
            const consumed = today?.totals?.calories || 0;
            if (!goal) return null;
            const diff = goal - consumed; // positive = deficit (good for losing weight)
            const inDeficit = diff > 0;
            const inSurplus = diff < -50;
            const color = inDeficit ? '#C2272F' : inSurplus ? '#DC2626' : '#6B7280';
            const bg = inDeficit ? '#FEE2E2' : inSurplus ? '#FEE2E2' : '#F3F4F6';
            const label = inDeficit
              ? tx(lang, { de: 'Tagesdefizit', it: 'Deficit giornaliero', en: 'Daily deficit' })
              : inSurplus
                ? tx(lang, { de: 'Überschuss', it: 'Surplus', en: 'Surplus' })
                : tx(lang, { de: 'Im Ziel', it: 'In linea', en: 'On target' });
            const sub = inDeficit
              ? tx(lang, {
                  de: `Abnehm-Tempo: ca. ${(diff / 7700 * 7).toFixed(2)} kg / Woche`,
                  it: `Velocità: ca. ${(diff / 7700 * 7).toFixed(2)} kg / settimana`,
                  en: `Loss rate: ~${(diff / 7700 * 7).toFixed(2)} kg / week`,
                })
              : inSurplus
                ? tx(lang, { de: 'Du bist über deinem Tagesziel.', it: 'Sei sopra l\'obiettivo.', en: 'You are over your daily target.' })
                : tx(lang, { de: 'Du bist genau im Ziel.', it: 'Sei in linea.', en: 'You are right on target.' });
            return (
              <View style={[st.deficitCard, { backgroundColor: bg }]} testID="wm-deficit-card">
                <View style={{ flex: 1 }}>
                  <Text style={[st.deficitLabel, { color }]}>{label}</Text>
                  <Text style={st.deficitSub}>{sub}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[st.deficitValue, { color }]}>
                    {inDeficit ? '−' : (inSurplus ? '+' : '')}{Math.abs(diff)}
                  </Text>
                  <Text style={st.deficitUnit}>kcal</Text>
                </View>
              </View>
            );
          })()}

          <TouchableOpacity style={st.bigPrimaryBtn} onPress={openMealPicker} testID="wm-add-meal-btn">
            <MaterialCommunityIcons name="plus-circle" size={22} color="#FFFFFF" />
            <Text style={st.bigPrimaryBtnText}>
              {tx(lang, { de: 'Mahlzeit hinzufuegen', it: 'Aggiungi pasto', en: 'Add meal' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Achievements (Phase 1: streak + badges) */}
        {achievements && (
          <View style={st.achievementCard} testID="wm-achievements">
            <View style={st.achHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="trophy-outline" size={20} color="#D97706" />
                <Text style={st.cardTitle}>
                  {tx(lang, { de: 'Deine Erfolge', it: 'I tuoi traguardi', en: 'Your wins' })}
                </Text>
              </View>
              {achievements.current_streak > 0 && (
                <View style={st.streakBadge}>
                  <MaterialCommunityIcons name="fire" size={14} color="#DC2626" />
                  <Text style={st.streakBadgeText}>{achievements.current_streak}</Text>
                </View>
              )}
            </View>
            <Text style={st.achSub}>
              {achievements.current_streak > 0
                ? tx(lang, {
                    de: `${achievements.current_streak} Tag${achievements.current_streak === 1 ? '' : 'e'} in Folge dabei!`,
                    it: `${achievements.current_streak} giorni di fila!`,
                    en: `${achievements.current_streak} day${achievements.current_streak === 1 ? '' : 's'} in a row!`,
                  })
                : tx(lang, {
                    de: 'Hake heute den ersten Schritt ab und starte deine Serie.',
                    it: 'Spunta il primo passo per iniziare la serie.',
                    en: 'Check off your first step and start your streak.',
                  })}
            </Text>
            <View style={st.badgeGrid}>
              {achievements.badges?.map((b: any) => {
                const label = lang === 'it' ? b.label_it : lang === 'en' ? b.label_en : b.label_de;
                return (
                  <View
                    key={b.id}
                    style={[st.badgeTile, b.achieved ? st.badgeTileOn : st.badgeTileOff]}
                    testID={`wm-badge-${b.id}`}
                  >
                    <View style={[st.badgeIcon, { backgroundColor: b.achieved ? '#FEF3C7' : '#F3F4F6' }]}>
                      <MaterialCommunityIcons
                        name={b.icon as any}
                        size={20}
                        color={b.achieved ? '#D97706' : '#9CA3AF'}
                      />
                    </View>
                    <Text style={[st.badgeLabel, !b.achieved && { color: '#9CA3AF' }]} numberOfLines={2}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Mahlzeiten (collapsible) */}
        {today?.meals?.length > 0 && (
          <View style={st.mealsCard}>
            <TouchableOpacity
              style={st.collapseHeader}
              onPress={() => setCollapsedMeals(v => !v)}
              activeOpacity={0.7}
              testID="wm-meals-toggle"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={18} color="#C2272F" />
                <Text style={st.cardTitle}>{tx(lang, { de: 'Mahlzeiten', it: 'Pasti', en: 'Meals' })}</Text>
                <View style={st.countPill}><Text style={st.countPillText}>{today.meals.length}</Text></View>
              </View>
              <MaterialCommunityIcons name={collapsedMeals ? 'chevron-down' : 'chevron-up'} size={22} color="#6B7280" />
            </TouchableOpacity>
            {!collapsedMeals && today.meals.map((m: any) => (
              <View key={m.id} style={st.mealRow} testID={`wm-meal-${m.id}`}>
                <View style={[st.mealIcon, { backgroundColor: mealColor(m.meal_type) + '20' }]}>
                  <MaterialCommunityIcons name={mealIcon(m.meal_type) as any} size={18} color={mealColor(m.meal_type)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.mealName} numberOfLines={1}>{m.name}</Text>
                  <Text style={st.mealMeta}>{fmt(m.calories)} kcal · {fmt(m.protein_g)}g</Text>
                </View>
                <TouchableOpacity onPress={() => deleteMeal(m.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} testID={`wm-delete-meal-${m.id}`}>
                  <MaterialCommunityIcons name="delete-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <SmartProductBlock context="fasting" profileId={profileId} limit={1} testIdPrefix="wm-smart-fast" />

        {/* Gewicht (collapsible) — with Phase 2 Weekly Insights */}
        <View style={st.weightCard} testID="wm-weight-card">
          <TouchableOpacity
            style={st.collapseHeader}
            onPress={() => setCollapsedWeight(v => !v)}
            activeOpacity={0.7}
            testID="wm-weight-toggle"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <MaterialCommunityIcons name="scale-bathroom" size={20} color="#C2272F" />
              <Text style={st.cardTitle}>{tx(lang, { de: 'Gewicht', it: 'Peso', en: 'Weight' })}</Text>
              {weight?.current_kg ? (
                <Text style={st.collapseHeaderHint}>{weight.current_kg.toFixed(1)} kg</Text>
              ) : null}
            </View>
            <MaterialCommunityIcons name={collapsedWeight ? 'chevron-down' : 'chevron-up'} size={22} color="#6B7280" />
          </TouchableOpacity>
          {!collapsedWeight && (
            <>
              <View style={st.weightActionRow}>
                <TouchableOpacity onPress={() => setHistoryModal(true)} style={st.smallBtnGhost} testID="wm-history-btn">
                  <MaterialCommunityIcons name="history" size={16} color="#6B7280" />
                  <Text style={st.smallBtnGhostText}>{tx(lang, { de: 'Verlauf', it: 'Storico', en: 'History' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setWeightModal(true)} style={st.smallBtn} testID="wm-add-weight-btn">
                  <MaterialCommunityIcons name="plus" size={16} color="#C2272F" />
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
                  <Text style={[st.weightStatValue, { color: weight?.delta_kg && weight.delta_kg > 0 ? '#DC2626' : '#C2272F' }]}>
                    {weight?.delta_kg !== null && weight?.delta_kg !== undefined ? `${weight.delta_kg > 0 ? '+' : ''}${weight.delta_kg.toFixed(1)} kg` : '–'}
                  </Text>
                </View>
                <View style={st.weightStat}>
                  <Text style={st.weightStatLabel}>{tx(lang, { de: 'Ziel', it: 'Obiettivo', en: 'Target' })}</Text>
                  <Text style={st.weightStatValue}>{weight?.target_kg ? `${weight.target_kg.toFixed(1)} kg` : '–'}</Text>
                </View>
              </View>

              {/* Phase 2: Weekly Insights */}
              {weight?.week_avg_kg !== null && weight?.week_avg_kg !== undefined && (
                <View style={st.weeklyInsight} testID="wm-weekly-insight">
                  <View style={st.weeklyTop}>
                    <View style={st.weeklyLeft}>
                      <Text style={st.weeklyLabel}>{tx(lang, { de: '7-Tage Ø', it: 'Media 7 gg', en: '7-day avg' })}</Text>
                      <Text style={st.weeklyValue}>{weight.week_avg_kg.toFixed(1)} kg</Text>
                    </View>
                    {weight.week_delta_kg !== null && weight.week_delta_kg !== undefined && (
                      <View style={[
                        st.trendChip,
                        weight.trend === 'down' && st.trendChipDown,
                        weight.trend === 'up' && st.trendChipUp,
                        weight.trend === 'stable' && st.trendChipStable,
                      ]}>
                        <MaterialCommunityIcons
                          name={weight.trend === 'down' ? 'trending-down' : weight.trend === 'up' ? 'trending-up' : 'trending-neutral'}
                          size={14}
                          color={weight.trend === 'down' ? '#C2272F' : weight.trend === 'up' ? '#DC2626' : '#6B7280'}
                        />
                        <Text style={[
                          st.trendChipText,
                          { color: weight.trend === 'down' ? '#C2272F' : weight.trend === 'up' ? '#DC2626' : '#6B7280' },
                        ]}>
                          {weight.week_delta_kg > 0 ? '+' : ''}{weight.week_delta_kg.toFixed(1)} kg
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={st.weeklyHint}>
                    {weight.hint_key === 'good_progress' && tx(lang, {
                      de: 'Schöner Trend – konstanz schlägt einzelne Tage.',
                      it: 'Bel trend – la costanza batte i singoli giorni.',
                      en: 'Nice trend – consistency beats single days.',
                    })}
                    {weight.hint_key === 'stay_consistent' && tx(lang, {
                      de: 'Kleine Schwankungen sind normal. Bleib am Plan dran.',
                      it: 'Piccole oscillazioni sono normali. Resta sul piano.',
                      en: 'Small fluctuations are normal. Stay with the plan.',
                    })}
                    {weight.hint_key === 'stable_is_normal' && tx(lang, {
                      de: 'Gewicht ist stabil – das ist ein gutes Plateau.',
                      it: 'Peso stabile – è un buon plateau.',
                      en: 'Weight stable – this is a healthy plateau.',
                    })}
                    {weight.hint_key === 'more_data_needed' && tx(lang, {
                      de: 'Trage diese Woche regelmäßig ein für eine bessere Trend-Analyse.',
                      it: 'Inserisci voci regolari per un trend più chiaro.',
                      en: 'Log entries this week for a clearer trend.',
                    })}
                  </Text>
                </View>
              )}

              <WeightChart entries={weight?.entries || []} />
            </>
          )}
        </View>

        {/* Empfehlungen (collapsible, consolidated) */}
        <View style={st.recoCard} testID="wm-reco-card">
          <TouchableOpacity
            style={st.collapseHeader}
            onPress={() => setCollapsedReco(v => !v)}
            activeOpacity={0.7}
            testID="wm-reco-toggle"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <MaterialCommunityIcons name="store-outline" size={20} color="#6D28D9" />
              <Text style={st.cardTitle}>{tx(lang, { de: 'Empfehlungen', it: 'Consigli', en: 'Recommendations' })}</Text>
            </View>
            <MaterialCommunityIcons name={collapsedReco ? 'chevron-down' : 'chevron-up'} size={22} color="#6B7280" />
          </TouchableOpacity>
          {!collapsedReco && (
            <View style={{ marginTop: 4 }}>
              <SmartProductBlock context="weight" profileId={profileId} limit={1} testIdPrefix="wm-smart-weight" />
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Meal source picker modal */}
      <Modal visible={mealPicker} transparent animationType="slide" onRequestClose={() => setMealPicker(false)}>
        <View style={st.sheetBg}>
          <Animated.View entering={ZoomIn.duration(250)} style={st.sheetCard} testID="wm-meal-picker">
            <Text style={st.sheetTitle}>{tx(lang, { de: 'Wie moechtest du hinzufuegen?', it: 'Come vuoi aggiungere?', en: 'How do you want to add?' })}</Text>

            {/* Phase 3: Quick Templates */}
            <Text style={st.templatesTitle}>{tx(lang, { de: 'Schnellzugriff', it: 'Accesso rapido', en: 'Quick add' })}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4, paddingBottom: 12 }} testID="wm-templates-row">
              {MEAL_TEMPLATES.map((tpl) => {
                const label = tpl.name[lang as 'de' | 'it' | 'en'] || tpl.name.de;
                return (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[st.templateChip, { borderColor: tpl.color + '40' }]}
                    onPress={() => quickAddTemplate(tpl)}
                    activeOpacity={0.7}
                    testID={`wm-template-${tpl.id}`}
                  >
                    <View style={[st.templateChipIcon, { backgroundColor: tpl.color + '15' }]}>
                      <MaterialCommunityIcons name={tpl.icon as any} size={20} color={tpl.color} />
                    </View>
                    <Text style={st.templateChipLabel} numberOfLines={1}>{label}</Text>
                    <Text style={st.templateChipMeta}>{tpl.calories} kcal · {tpl.protein_g}g</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={[st.sourceTile, { backgroundColor: '#FEE2E2' }]} onPress={pickPhoto} testID="wm-source-photo">
              <MaterialCommunityIcons name="camera-plus-outline" size={36} color="#C2272F" />
              <View style={{ flex: 1 }}>
                <Text style={st.sourceTitle}>{tx(lang, { de: 'Foto aufnehmen', it: 'Scatta foto', en: 'Take photo' })}</Text>
                <Text style={st.sourceSub}>{tx(lang, { de: 'KI erkennt & schaetzt', it: 'IA riconosce & stima', en: 'AI detects & estimates' })}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#C2272F" />
            </TouchableOpacity>
            <TouchableOpacity style={[st.sourceTile, { backgroundColor: '#FEF3C7' }]} onPress={pickManual} testID="wm-source-manual">
              <MaterialCommunityIcons name="pencil-outline" size={36} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={st.sourceTitle}>{tx(lang, { de: 'Manuell eingeben', it: 'Inserisci manualmente', en: 'Manual entry' })}</Text>
                <Text style={st.sourceSub}>{tx(lang, { de: 'Name, kcal, Protein', it: 'Nome, kcal, proteine', en: 'Name, kcal, protein' })}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#D97706" />
            </TouchableOpacity>
            <TouchableOpacity style={[st.sourceTile, { backgroundColor: '#E0F2FE' }]} onPress={pickFavorites} testID="wm-source-favorites">
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
          <View style={[st.modalCard, { maxHeight: '90%' }]} testID="wm-photo-modal">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={st.modalTitle}>{tx(lang, { de: 'Foto-Analyse', it: 'Analisi foto', en: 'Photo analysis' })}</Text>
              {photoUri && (
                <Image source={{ uri: photoUri }} style={st.photoPreview} />
              )}
              {analyzing && (
                <View style={{ alignItems: 'center', padding: 18 }}>
                  <ActivityIndicator color="#C2272F" />
                  <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 13 }}>
                    {tx(lang, { de: 'KI analysiert dein Essen ...', it: "L'IA sta analizzando ...", en: 'AI analyzing ...' })}
                  </Text>
                </View>
              )}
              {analysisResult && !analyzing && (
                <View testID="wm-photo-result">
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
                  {/* Phase 2: coach line based on remaining protein goal */}
                  {analysisResult.coach_line ? (
                    <View style={st.photoCoachLine} testID="wm-photo-coach-line">
                      <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color="#6D28D9" />
                      <Text style={st.photoCoachText}>{analysisResult.coach_line}</Text>
                    </View>
                  ) : null}
                  {/* Phase 2: macro breakdown */}
                  <View style={st.macroRow}>
                    <View style={st.macroChip}>
                      <Text style={st.macroChipLabel}>{tx(lang, { de: 'KH', it: 'Carb', en: 'Carb' })}</Text>
                      <Text style={st.macroChipValue}>{Math.round(analysisResult.carbs_g || 0)}g</Text>
                    </View>
                    <View style={st.macroChip}>
                      <Text style={st.macroChipLabel}>{tx(lang, { de: 'Fett', it: 'Grassi', en: 'Fat' })}</Text>
                      <Text style={st.macroChipValue}>{Math.round(analysisResult.fat_g || 0)}g</Text>
                    </View>
                    {analysisResult.confidence && (
                      <View style={[st.macroChip, { backgroundColor: analysisResult.confidence === 'high' ? '#FEE2E2' : analysisResult.confidence === 'low' ? '#FEE2E2' : '#FEF3C7' }]}>
                        <Text style={st.macroChipLabel}>{tx(lang, { de: 'Sicherheit', it: 'Affid.', en: 'Conf.' })}</Text>
                        <Text style={st.macroChipValue}>{analysisResult.confidence}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={st.modalLabel}>{tx(lang, { de: 'Name', it: 'Nome', en: 'Name' })}</Text>
                  <TextInput style={st.input} value={mealName} onChangeText={setMealName} testID="wm-photo-name" />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.modalLabel}>kcal</Text>
                      <TextInput style={st.input} value={mealKcal} onChangeText={setMealKcal} keyboardType="numeric" testID="wm-photo-kcal" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.modalLabel}>Protein g</Text>
                      <TextInput style={st.input} value={mealProt} onChangeText={setMealProt} keyboardType="numeric" testID="wm-photo-prot" />
                    </View>
                  </View>
                  <View style={st.mealTypeRow}>
                    {(['breakfast', 'lunch', 'dinner', 'snack', 'shake'] as const).map(t => (
                      <TouchableOpacity key={t} style={[st.mealTypeChip, mealType === t && st.mealTypeChipActive]} onPress={() => setMealType(t)}>
                        <Text style={[st.mealTypeText, mealType === t && { color: '#FFFFFF' }]}>{mealLabel(t, lang)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={st.favToggle} onPress={() => setSaveAsFavorite(!saveAsFavorite)} testID="wm-photo-fav-toggle">
                    <MaterialCommunityIcons name={saveAsFavorite ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color="#C2272F" />
                    <Text style={st.favToggleText}>{tx(lang, { de: 'Als Favorit speichern', it: 'Salva come preferito', en: 'Save as favorite' })}</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={st.modalRow}>
                <TouchableOpacity style={st.modalCancel} onPress={closePhotoModal}>
                  <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.modalConfirm, (analyzing || !analysisResult) && { opacity: 0.5 }]}
                  disabled={analyzing || !analysisResult} onPress={savePhotoMeal} testID="wm-photo-save">
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
          <View style={st.modalCard} testID="wm-manual-modal">
            <Text style={st.modalTitle}>{tx(lang, { de: 'Manuell hinzufuegen', it: 'Aggiungi manualmente', en: 'Add manually' })}</Text>
            <View style={st.mealTypeRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack', 'shake'] as const).map(t => (
                <TouchableOpacity key={t} style={[st.mealTypeChip, mealType === t && st.mealTypeChipActive]} onPress={() => setMealType(t)}>
                  <Text style={[st.mealTypeText, mealType === t && { color: '#FFFFFF' }]}>{mealLabel(t, lang)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={st.input} placeholder={tx(lang, { de: 'Name', it: 'Nome', en: 'Name' })}
              placeholderTextColor="#9CA3AF" value={mealName} onChangeText={setMealName} testID="wm-manual-name" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput style={[st.input, { flex: 1 }]} placeholder="kcal" placeholderTextColor="#9CA3AF"
                keyboardType="numeric" value={mealKcal} onChangeText={setMealKcal} testID="wm-manual-kcal" />
              <TextInput style={[st.input, { flex: 1 }]} placeholder="Protein g" placeholderTextColor="#9CA3AF"
                keyboardType="numeric" value={mealProt} onChangeText={setMealProt} testID="wm-manual-prot" />
            </View>
            <TouchableOpacity style={st.favToggle} onPress={() => setSaveAsFavorite(!saveAsFavorite)} testID="wm-manual-fav-toggle">
              <MaterialCommunityIcons name={saveAsFavorite ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color="#C2272F" />
              <Text style={st.favToggleText}>{tx(lang, { de: 'Als Favorit speichern', it: 'Salva come preferito', en: 'Save as favorite' })}</Text>
            </TouchableOpacity>
            <View style={st.modalRow}>
              <TouchableOpacity style={st.modalCancel} onPress={() => { setManualModal(false); setSaveAsFavorite(false); }}>
                <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirm} onPress={addMealManual} testID="wm-manual-save">
                <Text style={st.modalConfirmText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Favorites modal */}
      <Modal visible={favModal} transparent animationType="slide" onRequestClose={() => setFavModal(false)}>
        <View style={st.modalBg}>
          <View style={[st.modalCard, { maxHeight: '85%' }]} testID="wm-favorites-modal">
            <View style={st.cardHeader}>
              <Text style={st.modalTitle}>{tx(lang, { de: 'Meine Mahlzeiten', it: 'I miei pasti', en: 'My meals' })}</Text>
              <TouchableOpacity onPress={() => setShowFavAdd(!showFavAdd)}>
                <MaterialCommunityIcons name={showFavAdd ? 'close' : 'plus'} size={24} color="#C2272F" />
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
                  <View key={f.id} style={st.favRow} testID={`wm-fav-${f.id}`}>
                    <View style={[st.mealIcon, { backgroundColor: mealColor(f.category) + '20' }]}>
                      <MaterialCommunityIcons name={mealIcon(f.category) as any} size={18} color={mealColor(f.category)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.favName} numberOfLines={1}>{f.name}</Text>
                      <Text style={st.favMeta}>{f.calories} kcal · {f.protein_g}g Protein · {f.used_count}x</Text>
                    </View>
                    <TouchableOpacity style={st.favUseBtn} onPress={() => useFavorite(f.id)} testID={`wm-fav-use-${f.id}`}>
                      <MaterialCommunityIcons name="plus-circle" size={26} color="#C2272F" />
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
          <View style={st.modalCard} testID="wm-schedule-modal">
            <Text style={st.modalTitle}>{tx(lang, { de: 'Deine Protein-Routine', it: 'La tua routine proteica', en: 'Your protein routine' })}</Text>
            <Text style={st.modalSub}>
              {tx(lang, {
                de: 'Wir erstellen automatisch deinen Tagesplan mit Shakes und Mahlzeiten.',
                it: 'Creiamo automaticamente il tuo piano giornaliero.',
                en: 'We auto-generate your daily plan with shakes and meals.',
              })}
            </Text>
            <Text style={st.modalLabel}>{tx(lang, { de: 'Routine-Start (HH:MM)', it: 'Avvio routine', en: 'Routine start' })}</Text>
            <View style={st.presetRow}>
              {['18:00', '19:00', '20:00', '21:00'].map(t => (
                <TouchableOpacity key={t} style={[st.presetChip, fastStart === t && st.presetChipActive]} onPress={() => setFastStart(t)} testID={`wm-fast-start-${t}`}>
                  <Text style={[st.presetText, fastStart === t && { color: '#FFFFFF' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={st.input} value={fastStart} onChangeText={setFastStart} placeholder="20:00" placeholderTextColor="#9CA3AF" testID="wm-schedule-start" />
            <Text style={st.modalLabel}>{tx(lang, { de: 'Fastendauer', it: 'Durata digiuno', en: 'Fasting duration' })}</Text>
            <View style={st.presetRow}>
              {(['14', '15', '16'] as const).map(h => (
                <TouchableOpacity key={h} style={[st.presetChip, fastDuration === h && st.presetChipActive]} onPress={() => setFastDuration(h)} testID={`wm-fast-duration-${h}`}>
                  <Text style={[st.presetText, fastDuration === h && { color: '#FFFFFF' }]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={st.scheduleSummary}>
              {(() => {
                const [h, m] = fastStart.split(':').map(x => parseInt(x, 10));
                const dur = parseInt(fastDuration, 10);
                if (isNaN(h) || isNaN(m)) return null;
                const ewStartMin = (h * 60 + m + dur * 60) % 1440;
                const ew = `${String(Math.floor(ewStartMin / 60)).padStart(2, '0')}:${String(ewStartMin % 60).padStart(2, '0')}`;
                return (
                  <Text style={st.scheduleSummaryText}>
                    Fasten {fastStart} – {ew} · Essen {ew} – {fastStart}
                  </Text>
                );
              })()}
            </View>
            <View style={st.modalRow}>
              <TouchableOpacity style={st.modalCancel} onPress={() => setScheduleModal(false)}>
                <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirm} onPress={saveSchedule} testID="wm-schedule-save">
                <Text style={st.modalConfirmText}>{tx(lang, { de: 'Plan aktivieren', it: 'Attiva piano', en: 'Activate' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weight modal */}
      <Modal visible={weightModal} transparent animationType="fade" onRequestClose={() => setWeightModal(false)}>
        <View style={st.modalBg}>
          <View style={st.modalCard} testID="wm-weight-modal">
            <Text style={st.modalTitle}>{tx(lang, { de: 'Gewicht eintragen', it: 'Inserisci peso', en: 'Log weight' })}</Text>
            <TextInput style={st.input} placeholder="kg" placeholderTextColor="#9CA3AF" keyboardType="numeric"
              value={weightInput} onChangeText={setWeightInput} autoFocus testID="wm-weight-input" />
            <View style={st.modalRow}>
              <TouchableOpacity style={st.modalCancel} onPress={() => setWeightModal(false)}>
                <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirm} onPress={addWeight} testID="wm-weight-confirm">
                <Text style={st.modalConfirmText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Goals modal */}
      <Modal visible={goalModal} transparent animationType="slide" onRequestClose={() => setGoalModal(false)}>
        <View style={st.modalBg}>
          <View style={[st.modalCard, { maxHeight: '90%' }]} testID="wm-goal-modal">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={st.modalTitle}>{tx(lang, { de: 'Ziele anpassen', it: 'Imposta obiettivi', en: 'Goals' })}</Text>

              {/* AI Calculator Section */}
              <View style={st.aiSection} testID="wm-ai-section">
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
                  <TouchableOpacity style={[st.aiChip, aiGender === 'male' && st.aiChipActive]} onPress={() => setAiGender('male')} testID="wm-ai-gender-male">
                    <MaterialCommunityIcons name="gender-male" size={14} color={aiGender === 'male' ? '#FFFFFF' : '#6B7280'} />
                    <Text style={[st.aiChipText, aiGender === 'male' && { color: '#FFFFFF' }]}>{tx(lang, { de: 'Mann', it: 'Uomo', en: 'Male' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.aiChip, aiGender === 'female' && st.aiChipActive]} onPress={() => setAiGender('female')} testID="wm-ai-gender-female">
                    <MaterialCommunityIcons name="gender-female" size={14} color={aiGender === 'female' ? '#FFFFFF' : '#6B7280'} />
                    <Text style={[st.aiChipText, aiGender === 'female' && { color: '#FFFFFF' }]}>{tx(lang, { de: 'Frau', it: 'Donna', en: 'Female' })}</Text>
                  </TouchableOpacity>
                </View>

                {/* Age / Height / Weight inputs */}
                <View style={st.aiInputRow}>
                  <View style={st.aiInputCol}>
                    <Text style={st.aiMiniLabel}>{tx(lang, { de: 'Alter', it: 'Età', en: 'Age' })}</Text>
                    <TextInput
                      value={aiAge}
                      onChangeText={setAiAge}
                      keyboardType="number-pad"
                      placeholder="35"
                      placeholderTextColor="#9CA3AF"
                      style={st.aiInputField}
                      testID="wm-ai-age-input"
                    />
                  </View>
                  <View style={st.aiInputCol}>
                    <Text style={st.aiMiniLabel}>{tx(lang, { de: 'Größe (cm)', it: 'Altezza (cm)', en: 'Height (cm)' })}</Text>
                    <TextInput
                      value={aiHeight}
                      onChangeText={setAiHeight}
                      keyboardType="numeric"
                      placeholder="170"
                      placeholderTextColor="#9CA3AF"
                      style={st.aiInputField}
                      testID="wm-ai-height-input"
                    />
                  </View>
                  <View style={st.aiInputCol}>
                    <Text style={st.aiMiniLabel}>{tx(lang, { de: 'Gewicht (kg)', it: 'Peso (kg)', en: 'Weight (kg)' })}</Text>
                    <TextInput
                      value={aiWeight}
                      onChangeText={setAiWeight}
                      keyboardType="numeric"
                      placeholder="75"
                      placeholderTextColor="#9CA3AF"
                      style={st.aiInputField}
                      testID="wm-ai-weight-input"
                    />
                  </View>
                </View>

                {/* Activity */}
                <Text style={st.aiMiniLabel}>{tx(lang, { de: 'Aktivitaet', it: 'Attivita', en: 'Activity' })}</Text>
                <View style={st.aiRow}>
                  {(['sedentary', 'moderate', 'active', 'very_active'] as const).map(a => (
                    <TouchableOpacity key={a} style={[st.aiChipSmall, aiActivity === a && st.aiChipActive]} onPress={() => setAiActivity(a)} testID={`wm-ai-activity-${a}`}>
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
                    <TouchableOpacity key={g} style={[st.aiChipSmall, aiGoal === g && st.aiChipActive]} onPress={() => setAiGoal(g)} testID={`wm-ai-goal-${g}`}>
                      <Text style={[st.aiChipTextSmall, aiGoal === g && { color: '#FFFFFF' }]}>
                        {g === 'lose' ? tx(lang, { de: 'Abnehmen', it: 'Dimagrire', en: 'Lose' })
                          : g === 'maintain' ? tx(lang, { de: 'Halten', it: 'Mantenere', en: 'Keep' })
                          : g === 'gain' ? tx(lang, { de: 'Zunehmen', it: 'Aumentare', en: 'Gain' })
                          : tx(lang, { de: 'Muskeln', it: 'Muscoli', en: 'Muscle' })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={st.aiBtn} onPress={runAiCalculation} disabled={aiLoading} testID="wm-ai-run-btn">
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
                  <View style={st.aiResult} testID="wm-ai-result">
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
                            <View style={[st.deltaBadge, { backgroundColor: up ? '#DCFCE7' : '#FEF3C7' }]} testID="wm-ai-delta-cal">
                              <MaterialCommunityIcons
                                name={up ? 'trending-up' : 'trending-down'}
                                size={11}
                                color={up ? '#991B1B' : '#B45309'}
                              />
                              <Text style={[st.deltaText, { color: up ? '#991B1B' : '#B45309' }]}>
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
                            <View style={[st.deltaBadge, { backgroundColor: up ? '#DCFCE7' : '#FEF3C7' }]} testID="wm-ai-delta-prot">
                              <MaterialCommunityIcons
                                name={up ? 'trending-up' : 'trending-down'}
                                size={11}
                                color={up ? '#991B1B' : '#B45309'}
                              />
                              <Text style={[st.deltaText, { color: up ? '#991B1B' : '#B45309' }]}>
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
              <TextInput style={st.input} keyboardType="numeric" value={goalCal} onChangeText={setGoalCal} placeholderTextColor="#9CA3AF" testID="wm-goal-cal" />
              <Text style={st.modalLabel}>{tx(lang, { de: 'Protein (g)', it: 'Proteine (g)', en: 'Protein (g)' })}</Text>
              <TextInput style={st.input} keyboardType="numeric" value={goalProt} onChangeText={setGoalProt} placeholderTextColor="#9CA3AF" testID="wm-goal-prot" />
              <Text style={st.modalLabel}>{tx(lang, { de: 'Zielgewicht (kg)', it: 'Peso target', en: 'Target weight' })}</Text>
              <TextInput style={st.input} keyboardType="numeric" value={goalWeight} onChangeText={setGoalWeight} placeholderTextColor="#9CA3AF" testID="wm-goal-weight" />
              <View style={st.modalRow}>
                <TouchableOpacity style={st.modalCancel} onPress={() => setGoalModal(false)}>
                  <Text style={st.modalCancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.modalConfirm} onPress={saveGoals} testID="wm-goal-save">
                  <Text style={st.modalConfirmText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save' })}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* VERO Info Modal: Abnehm-Erklaerung */}
      <Modal visible={veroInfoModal} transparent animationType="fade" onRequestClose={() => setVeroInfoModal(false)}>
        <View style={st.modalBg}>
          <Animated.View entering={ZoomIn.duration(220)} style={st.modalCard} testID="wm-vero-info-modal">
            <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Image source={VERO_HALLO} style={{ width: 56, height: 56 }} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={st.modalTitle}>
                    {tx(lang, { de: 'So funktioniert dein Abnehm-Plan', it: 'Come funziona il tuo piano', en: 'How your weight-loss plan works' })}
                  </Text>
                  <Text style={st.modalSub}>
                    {tx(lang, { de: 'VERO erklärt dir die Protein-Routine', it: 'VERO spiega la routine proteica', en: 'VERO explains the protein routine' })}
                  </Text>
                </View>
              </View>

              <View style={st.veroSection}>
                <Text style={st.veroSectionTitle}>
                  {tx(lang, { de: '1. Warum 4 feste Schritte?', it: '1. Perché 4 passi fissi?', en: '1. Why 4 fixed steps?' })}
                </Text>
                <Text style={st.veroSectionText}>
                  {tx(lang, {
                    de: 'Dein Tag besteht aus zwei Shakes und zwei Mahlzeiten. So bekommt dein Körper über den Tag verteilt genug Protein, dein Stoffwechsel bleibt stabil und du vermeidest Heißhunger.',
                    it: 'La tua giornata ha due frullati e due pasti. Il corpo riceve proteine ben distribuite, il metabolismo resta stabile e niente attacchi di fame.',
                    en: 'Your day has two shakes and two meals. Protein stays evenly spread, your metabolism stays stable, and cravings disappear.',
                  })}
                </Text>
              </View>

              <View style={st.veroSection}>
                <Text style={st.veroSectionTitle}>
                  {tx(lang, { de: '2. Warum Protein im Vordergrund?', it: '2. Perché proteine?', en: '2. Why protein first?' })}
                </Text>
                <Text style={st.veroSectionText}>
                  {tx(lang, {
                    de: 'Protein sättigt länger als Kohlenhydrate, schützt deine Muskeln und sorgt dafür, dass du Fett verlierst – nicht Muskelmasse. Genau das macht den Unterschied zu klassischen Diäten.',
                    it: 'Le proteine saziano più dei carboidrati, proteggono i muscoli e ti aiutano a perdere grasso, non massa muscolare.',
                    en: 'Protein keeps you fuller than carbs, protects your muscles and helps you lose fat — not muscle.',
                  })}
                </Text>
              </View>

              <View style={st.veroSection}>
                <Text style={st.veroSectionTitle}>
                  {tx(lang, { de: '3. Was bringt das Essensfenster?', it: '3. La finestra alimentare', en: '3. The eating window' })}
                </Text>
                <Text style={st.veroSectionText}>
                  {tx(lang, {
                    de: 'Zwischen deinen Mahlzeiten gönnst du dem Körper eine Pause (14–16 Stunden). In dieser Zeit greift er auf Fettreserven zu. Du musst nichts zählen – nur den Plan befolgen.',
                    it: 'Tra i pasti il corpo riposa (14–16 ore) e attinge alle riserve di grasso. Niente conteggi: segui solo il piano.',
                    en: 'Between meals your body rests (14–16h) and taps into fat reserves. No counting — just follow the plan.',
                  })}
                </Text>
              </View>

              <View style={st.veroSection}>
                <Text style={st.veroSectionTitle}>
                  {tx(lang, { de: '4. Wasser & Schritte', it: '4. Acqua e passi', en: '4. Water & steps' })}
                </Text>
                <Text style={st.veroSectionText}>
                  {tx(lang, {
                    de: 'Bei jedem abgehakten Schritt wird automatisch Wasser mitgezählt (300–400 ml). Trinken kurbelt deinen Stoffwechsel an und verstärkt das Sättigungsgefühl.',
                    it: 'Ogni passo completato aggiunge acqua (300–400 ml). L\'idratazione accelera il metabolismo e aumenta il senso di sazietà.',
                    en: 'Each completed step auto-logs water (300–400 ml). Hydration boosts your metabolism and satiety.',
                  })}
                </Text>
              </View>

              <View style={st.veroSection}>
                <Text style={st.veroSectionTitle}>
                  {tx(lang, { de: '5. Dein Tagesziel', it: '5. Il tuo obiettivo', en: '5. Your daily target' })}
                </Text>
                <Text style={st.veroSectionText}>
                  {tx(lang, {
                    de: 'Ich rechne deine Kalorien- und Proteinziele aus deinem Gewicht, Geschlecht und Aktivitätslevel aus. Du kannst sie jederzeit über das Zahnrad oben anpassen.',
                    it: 'Calcolo calorie e proteine in base a peso, sesso e attività. Puoi modificare tutto con l\'icona ingranaggio.',
                    en: 'I calculate calories and protein from your weight, gender and activity. Adjust anytime via the gear icon.',
                  })}
                </Text>
              </View>

              <View style={st.veroTipBox}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#92400E" />
                <Text style={st.veroTipText}>
                  {tx(lang, {
                    de: 'Tipp: Bleib eine Woche dran, ohne dich zu wiegen. Erst dann zeigt sich, was die Routine wirklich kann.',
                    it: 'Suggerimento: segui la routine una settimana senza pesarti. Solo dopo si vede l\'effetto reale.',
                    en: 'Tip: Stick with it for a week without weighing yourself — then check the real result.',
                  })}
                </Text>
              </View>
            </ScrollView>
            <TouchableOpacity style={[st.modalConfirm, { marginTop: 16 }]} onPress={() => setVeroInfoModal(false)} testID="wm-vero-info-close">
              <Text style={st.modalConfirmText}>{tx(lang, { de: 'Verstanden', it: 'Ho capito', en: 'Got it' })}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Weight History Modal */}
      <Modal visible={historyModal} transparent animationType="slide" onRequestClose={() => setHistoryModal(false)}>
        <View style={st.modalBg}>
          <Animated.View entering={ZoomIn.duration(220)} style={st.modalCard} testID="wm-history-modal">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={st.modalTitle}>{tx(lang, { de: 'Gewicht-Verlauf', it: 'Storico peso', en: 'Weight history' })}</Text>
              <TouchableOpacity onPress={() => setHistoryModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={st.modalSub}>
              {tx(lang, {
                de: 'Tippe auf einen Eintrag, um ihn zu löschen.',
                it: 'Tocca una voce per eliminarla.',
                en: 'Tap an entry to delete it.',
              })}
            </Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {(weight?.entries || []).length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <MaterialCommunityIcons name="scale-bathroom" size={32} color="#D1D5DB" />
                  <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 8 }}>
                    {tx(lang, { de: 'Noch keine Einträge', it: 'Nessuna voce', en: 'No entries yet' })}
                  </Text>
                </View>
              ) : (
                [...(weight?.entries || [])].reverse().map((e: any) => (
                  <View key={e.id} style={st.historyRow} testID={`wm-history-entry-${e.id}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.historyDate}>{e.date}</Text>
                      <Text style={st.historyKg}>{e.weight_kg.toFixed(1)} kg</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteWeightEntry(e.id)}
                      style={st.historyDeleteBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      testID={`wm-history-delete-${e.id}`}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            {(weight?.entries || []).length > 0 && (
              <TouchableOpacity onPress={resetWeightHistory} style={st.historyResetBtn} testID="wm-history-reset">
                <MaterialCommunityIcons name="refresh" size={16} color="#DC2626" />
                <Text style={st.historyResetText}>
                  {tx(lang, { de: 'Verlauf komplett zurücksetzen', it: 'Azzera tutto lo storico', en: 'Reset entire history' })}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Abnehm-Guide Modal (Phase 1: educational carousel) */}
      <AbnehmGuideModal visible={guideModal} onClose={() => setGuideModal(false)} />
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
    : t === 'lunch' ? '#C2272F'
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
    borderBottomWidth: 1, borderBottomColor: '#FDF4F4',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1, textAlign: 'center' },

  veroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, marginBottom: 0, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 14,
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
  fastIdleText: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 8 },
  medDisclaimer: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', marginBottom: 12 },

  fastTimerWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  fastTimerCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 6 },
  phaseBadgeText: { fontSize: 11, fontWeight: '700' },
  fastTimerValue: { fontSize: 26, fontWeight: '800', color: '#1F2937', fontVariant: ['tabular-nums'] },
  fastTimerSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  scheduleInfo: { width: '100%', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#FDF4F4' },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  scheduleLabel: { fontSize: 13, color: '#6B7280' },
  scheduleValue: { fontSize: 13, fontWeight: '700', color: '#1F2937' },

  // Phase 1 — Phase explanation cards under fasting circle
  phaseCardsWrap: { width: '100%', marginTop: 16, gap: 8 },
  phaseCard: {
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  phaseCardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  phaseCardTitle: { fontSize: 13, fontWeight: '800', flex: 1 },
  phaseCardTime: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  phaseCardText: { fontSize: 12, color: '#4B5563', lineHeight: 17 },

  // Phase 1 — Hunger-prevention coach line under timeline events
  coachLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#FAF5FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  coachLineText: { flex: 1, fontSize: 11, color: '#6D28D9', lineHeight: 15, fontStyle: 'italic' },

  // Phase 1 — Achievements card
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' as any },
    }),
  },
  achHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  achSub: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakBadgeText: { fontSize: 13, fontWeight: '800', color: '#DC2626' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeTile: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeTileOn: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  badgeTileOff: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  badgeIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: '#1F2937' },

  // Phase 2 — Collapsible section header
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  collapseHeaderHint: { fontSize: 13, color: '#9CA3AF', fontWeight: '600', marginLeft: 4 },
  countPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  countPillText: { fontSize: 11, fontWeight: '800', color: '#C2272F' },

  // Phase 2 — Weight section actions row (replaces old cardHeader buttons)
  weightActionRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 4, justifyContent: 'flex-end' },

  // Phase 2 — Weekly insight card
  weeklyInsight: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#C2272F',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  weeklyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  weeklyLeft: { flexDirection: 'column' },
  weeklyLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  weeklyValue: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginTop: 2 },
  trendChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  trendChipDown: { backgroundColor: '#FEE2E2' },
  trendChipUp: { backgroundColor: '#FEE2E2' },
  trendChipStable: { backgroundColor: '#F3F4F6' },
  trendChipText: { fontSize: 12, fontWeight: '800' },
  weeklyHint: { fontSize: 12, color: '#4B5563', lineHeight: 17 },

  // Phase 2 — Recommendations card (consolidated)
  recoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' as any },
    }),
  },

  // Phase 2 — Photo coach line + macro chips
  photoCoachLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 8,
  },
  photoCoachText: { flex: 1, fontSize: 12, color: '#6D28D9', lineHeight: 16, fontWeight: '600' },
  macroRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  macroChip: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  macroChipLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  macroChipValue: { fontSize: 13, fontWeight: '800', color: '#1F2937', marginTop: 1 },

  // Phase 3 — Templates row inside meal picker
  templatesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 6,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  templateChip: {
    width: 130,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  templateChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  templateChipLabel: { fontSize: 12, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  templateChipMeta: { fontSize: 10, color: '#6B7280', fontWeight: '500' },

  // Phase 3 — Per-step product hint chip
  stepProductChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#0EA5E9',
  },
  stepProductText: { flex: 1, fontSize: 11, color: '#0369A1', fontWeight: '600' },

  removeBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  removeBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },

  bigPrimaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#C2272F', borderRadius: 14, paddingVertical: 16, marginTop: 8,
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
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FDF4F4' },
  mealIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mealName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  mealMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  weightCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  smallBtnText: { color: '#C2272F', fontWeight: '700', fontSize: 12 },
  smallBtnGhost: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  smallBtnGhostText: { color: '#6B7280', fontWeight: '700', fontSize: 12 },
  weightStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  weightStat: { alignItems: 'center', flex: 1 },
  weightStatLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  weightStatValue: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  chartEmpty: { backgroundColor: '#FAFBFA', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 16 },
  chartEmptyText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },

  // History modal rows
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  historyDate: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  historyKg: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  historyDeleteBtn: { padding: 8, borderRadius: 10, backgroundColor: '#FEF2F2' },
  historyResetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  historyResetText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },

  // VERO info modal
  veroSection: { marginTop: 12 },
  veroSectionTitle: { fontSize: 14, fontWeight: '800', color: '#6D28D9', marginBottom: 4 },
  veroSectionText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  veroTipBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#FDE68A' },
  veroTipText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17, fontWeight: '600' },

  // Circle info hint (under fasting timer)
  circleInfoHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#F3E8FF' },
  circleInfoHintText: { fontSize: 11, color: '#6D28D9', fontWeight: '700' },

  // Daily deficit / surplus card
  deficitCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginTop: 14, marginBottom: 6 },
  deficitLabel: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  deficitSub: { fontSize: 11, color: '#6B7280' },
  deficitValue: { fontSize: 26, fontWeight: '900', lineHeight: 28 },
  deficitUnit: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  // AI Goal Modal — Age/Height/Weight inputs
  aiInputRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  aiInputCol: { flex: 1 },
  aiInputField: { borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, color: '#1F2937', backgroundColor: '#FFFFFF', marginTop: 4 },

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
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#FDF4F4' },
  modalCancelText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  modalConfirm: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#C2272F' },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  mealTypeRow: { flexDirection: 'row', gap: 6, marginVertical: 10, flexWrap: 'wrap' },
  mealTypeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#FDF4F4' },
  mealTypeChipActive: { backgroundColor: '#C2272F' },
  mealTypeText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  presetRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  presetChip: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#FDF4F4', alignItems: 'center' },
  presetChipActive: { backgroundColor: '#C2272F' },
  presetText: { fontWeight: '700', color: '#6B7280' },

  scheduleSummary: { marginTop: 10, padding: 10, backgroundColor: '#F3E8FF', borderRadius: 10 },
  scheduleSummaryText: { fontSize: 12, color: '#6D28D9', fontWeight: '600', textAlign: 'center' },

  photoPreview: { width: '100%', height: 200, borderRadius: 12, marginVertical: 12, backgroundColor: '#FDF4F4' },
  warnBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginBottom: 10 },
  warnText: { flex: 1, fontSize: 12, color: '#92400E' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#FEE2E2' },
  tagText: { fontSize: 11, color: '#C2272F', fontWeight: '600' },
  favToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  favToggleText: { fontSize: 13, color: '#374151' },

  favAddBox: { backgroundColor: '#F7FAF8', padding: 12, borderRadius: 12, marginTop: 8 },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FDF4F4' },
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

  // Timeline
  timelineBox: {
    width: '100%', marginTop: 18, padding: 14, backgroundColor: '#F7FAF8',
    borderRadius: 14, borderWidth: 1, borderColor: '#E6EAE7',
  },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timelineTitle: { fontSize: 14, fontWeight: '800', color: '#1F2937' },
  timelineProgress: { fontSize: 13, fontWeight: '700', color: '#C2272F' },
  timelineBar: { height: 6, backgroundColor: '#E6EAE7', borderRadius: 3, overflow: 'hidden', marginBottom: 14 },
  timelineBarFill: { height: '100%', backgroundColor: '#C2272F', borderRadius: 3 },
  timelineEvent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineEventDone: { opacity: 0.8 },
  timelineDotCol: { alignItems: 'center', width: 30 },
  timelineDot: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: '#C2272F', borderColor: '#C2272F' },
  timelineDotNow: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E6EAE7', minHeight: 28, marginTop: 2 },
  timelineEventLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1 },
  timelineEventTime: { fontSize: 13, fontWeight: '700', color: '#6B7280', fontVariant: ['tabular-nums'] },
  timelineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  timelineMetaText: { fontSize: 11, color: '#6B7280' },
  timelineNowBadge: {
    marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#6D28D9',
  },
  timelineNowText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

  budgetRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  budgetChip: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, backgroundColor: '#FEE2E2',
  },
  budgetChipText: { fontSize: 11, fontWeight: '700', color: '#991B1B' },

  stepActionRow: { flexDirection: 'row', marginTop: 8 },
  drinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#C2272F', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10,
  },
  mealBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0EA5E9', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10,
  },
  drinkBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

});
