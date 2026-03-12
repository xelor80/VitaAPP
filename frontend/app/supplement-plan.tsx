import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Linking, Alert, StyleSheet, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useLang } from '../src/LangContext';
import { planStyles as styles } from '../components/supplement/planStyles';
import { InteractionAnalysis } from '../components/supplement/InteractionAnalysis';
import { EmailExportModal } from '../components/supplement/EmailExportModal';
import {
  scheduleSupplementReminders,
  sendTestNotification,
  cancelAllReminders,
  getNotificationPermissionStatus,
  ReminderSettings,
  WeeklySchedule
} from '../src/services/NotificationService';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const TIMING_ICONS: Record<string, string> = {
  morning: 'weather-sunny',
  noon: 'weather-partly-cloudy',
  evening: 'weather-night',
};

const RISK_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

// Mapping: supplement ID -> product search tags
const SUPPLEMENT_PRODUCT_TAGS: Record<string, string[]> = {
  vitamin_d: ['vitamin-d', 'knochen'],
  vitamin_k2: ['vitamin-d', 'knochen'],
  magnesium: ['magnesium', 'schlaf', 'muskeln'],
  omega3: ['omega-3'],
  vitamin_b12: ['b-vitamine', 'energie'],
  iron: ['eisen'],
  zinc: ['zink'],
  vitamin_c: ['vitamin-c', 'immunsystem'],
  b_vitamins: ['b-vitamine', 'energie', 'nerven'],
  calcium: ['calcium', 'knochen'],
  folate: ['b-vitamine'],
  coq10: ['q10', 'energie'],
  probiotics: ['probiotika', 'darm', 'verdauung'],
  ashwagandha: ['stress', 'schlaf'],
  iodine: ['mineralstoffe', 'stoffwechsel'],
  selenium: ['mineralstoffe', 'immunsystem'],
  vitamin_e: ['antioxidantien'],
};

/* ── Pill icon styles per supplement ── */
const PILL_STYLES: Record<string, { bg: string; icon: string; accent: string }> = {
  vitamin_d: { bg: '#FFF3E0', icon: 'water-outline', accent: '#FF9800' },
  omega3: { bg: '#FFF8E1', icon: 'pill', accent: '#F9A825' },
  magnesium: { bg: '#E3F2FD', icon: 'pill', accent: '#2196F3' },
  probiotics: { bg: '#E8F5E9', icon: 'pill', accent: '#66BB6A' },
  zinc: { bg: '#EDE7F6', icon: 'pill', accent: '#7E57C2' },
  iron: { bg: '#FBE9E7', icon: 'pill', accent: '#E53935' },
  vitamin_b12: { bg: '#FCE4EC', icon: 'pill', accent: '#EC407A' },
  vitamin_c: { bg: '#FFFDE7', icon: 'fruit-citrus', accent: '#FBC02D' },
  calcium: { bg: '#EFEBE9', icon: 'bone', accent: '#8D6E63' },
  folate: { bg: '#E8F5E9', icon: 'leaf', accent: '#43A047' },
  b_vitamins: { bg: '#FFF3E0', icon: 'lightning-bolt', accent: '#FF9800' },
  coq10: { bg: '#FBE9E7', icon: 'heart-pulse', accent: '#EF5350' },
  selenium: { bg: '#F3E5F5', icon: 'atom', accent: '#AB47BC' },
  iodine: { bg: '#E0F2F1', icon: 'flask', accent: '#26A69A' },
  ashwagandha: { bg: '#F1F8E9', icon: 'flower', accent: '#7CB342' },
  vitamin_k2: { bg: '#E8F5E9', icon: 'heart-pulse', accent: '#388E3C' },
  vitamin_e: { bg: '#FFFDE7', icon: 'shield-star', accent: '#F9A825' },
  melatonin: { bg: '#E8EAF6', icon: 'moon-waning-crescent', accent: '#5C6BC0' },
  _default: { bg: '#F0F4F2', icon: 'pill', accent: '#4A8B71' },
};

function PillIcon({ id, size = 48 }: { id: string; size?: number }) {
  const s = PILL_STYLES[id] || PILL_STYLES._default;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: s.bg, justifyContent: 'center', alignItems: 'center' }}>
      <MaterialCommunityIcons name={s.icon as any} size={size * 0.5} color={s.accent} />
    </View>
  );
}

function getCurrentTimeSlot(): 'morning' | 'noon' | 'evening' {
  const h = new Date().getHours();
  if (h < 11) return 'morning';
  if (h < 16) return 'noon';
  return 'evening';
}

function getActiveTimeSlot(schedule: any): 'morning' | 'noon' | 'evening' {
  const preferred = getCurrentTimeSlot();
  const order: ('morning' | 'noon' | 'evening')[] = [preferred, 'morning', 'noon', 'evening'];
  for (const slot of order) {
    if (schedule?.[slot]?.items?.length > 0) return slot;
  }
  return preferred;
}

function abbreviateName(name: string, id: string): string {
  if (!name) return id;
  // For vitamins, keep the full name (e.g. "Vitamin D3", "Vitamin B12")
  if (name.toLowerCase().startsWith('vitamin')) return name.length > 12 ? name.slice(0, 12) : name;
  if (name.toLowerCase().startsWith('omega')) return name.length > 10 ? name.slice(0, 10) : name;
  // For others, first word is usually enough
  const first = name.split(' ')[0];
  return first.length > 12 ? first.slice(0, 11) + '.' : first;
}

const TIME_LABELS: Record<string, Record<string, string>> = {
  morning: { de: 'Morgens', it: 'Mattina' },
  noon: { de: 'Mittags', it: 'Mezzogiorno' },
  evening: { de: 'Abends', it: 'Sera' },
};

export default function SupplementPlanScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const params = useLocalSearchParams<{ profileId: string }>();
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(params.profileId || null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'stack' | 'schedule' | 'phases' | 'interactions'>('schedule');
  const [reminders, setReminders] = useState({ enabled: false, morning_time: '08:00', noon_time: '12:00', evening_time: '20:00' });
  const [showReminders, setShowReminders] = useState(true);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [workType, setWorkType] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<string | null>(null);
  const [shiftCycle, setShiftCycle] = useState<string[]>([]);
  const [cycleStartDate, setCycleStartDate] = useState('');
  const [todayShift, setTodayShift] = useState<any>(null);
  const [todayCompliance, setTodayCompliance] = useState<Record<string, boolean>>({});
  const [pricingMap, setPricingMap] = useState<Record<string, { avg_per_day: number; min_per_day: number; max_per_day: number; product_count: number }>>({});
  const playerRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);

  const stopAudio = () => {
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current.currentTime = 0;
        webAudioRef.current = null;
      }
    } else {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current = null;
      }
    }
    setTtsPlaying(false);
  };

  const playTTS = async (text: string) => {
    if (ttsPlaying) {
      stopAudio();
      return;
    }
    setTtsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const data = await res.json();

      if (Platform.OS === 'web') {
        const audio = new window.Audio(`data:audio/mp3;base64,${data.audio_base64}`);
        audio.onended = () => setTtsPlaying(false);
        audio.play();
        webAudioRef.current = audio;
        setTtsPlaying(true);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}tts_plan_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(fileUri, data.audio_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const player = createAudioPlayer(fileUri);
        player.addListener('playbackStatusUpdate', (status: any) => {
          if (status.playing === false && status.currentTime > 0) {
            setTtsPlaying(false);
            playerRef.current = null;
          }
        });
        playerRef.current = player;
        player.play();
        setTtsPlaying(true);
      }
    } catch (e) {
      console.error('TTS error:', e);
      Alert.alert(
        lang === 'de' ? 'Fehler' : 'Errore',
        lang === 'de' ? 'Audio konnte nicht generiert werden.' : 'Impossibile generare l\'audio.'
      );
    } finally {
      setTtsLoading(false);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => { stopAudio(); };
  }, []);

  // Fetch pricing when plan stack is available
  useEffect(() => {
    if (!plan || !plan.stack?.length) return;
    const nutrients = plan.stack.map((s: any) => s.id).join(',');
    fetch(`${API_URL}/api/products/pricing-summary?nutrients=${nutrients}&lang=${lang}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.pricing) setPricingMap(data.pricing); })
      .catch(() => {});
  }, [plan, lang]);

  useEffect(() => {
    const init = async () => {
      let pid = params.profileId;
      if (!pid) {
        pid = (await AsyncStorage.getItem('health_profile_id')) || undefined;
      }
      if (pid) {
        setCurrentProfileId(pid);
        await loadPlan(pid);
        await loadProducts();
        // Load first name for personalization
        try {
          const profileRes = await fetch(`${API_URL}/api/health-profile/${pid}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.profile?.first_name) setFirstName(profileData.profile.first_name);
            if (profileData.profile?.work_type) setWorkType(profileData.profile.work_type);
            if (profileData.profile?.current_shift) setActiveShift(profileData.profile.current_shift);
          }
        } catch {}

        // Load shift cycle from reminders & fetch today's shift
        try {
          const remDoc = await fetch(`${API_URL}/api/supplement-plan/${pid}/reminders`);
          if (remDoc.ok) {
            const remData = await remDoc.json();
            if (remData.shift_cycle?.pattern) {
              setShiftCycle(remData.shift_cycle.pattern);
              setCycleStartDate(remData.shift_cycle.start_date || '');
            }
          }
          const shiftRes = await fetch(`${API_URL}/api/supplement-plan/${pid}/today-shift?lang=${lang}`);
          if (shiftRes.ok) {
            const shiftData = await shiftRes.json();
            if (shiftData.shift) setTodayShift(shiftData);
          }
        } catch {}

        // Load today's compliance status
        try {
          const compRes = await fetch(`${API_URL}/api/tracking/compliance/today/${pid}`);
          if (compRes.ok) {
            const compData = await compRes.json();
            const taken: Record<string, boolean> = {};
            for (const id of (compData.taken_ids || [])) { taken[id] = true; }
            setTodayCompliance(taken);
          }
        } catch {}

        // Load pricing after plan is loaded (needs nutrient IDs from plan)
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/products?lang=${lang}`);
      if (res.ok) setProducts(await res.json());
    } catch (e) { console.error('Products error:', e); }
  };

  const getMatchingProducts = (supplementId: string): any[] => {
    const tags = SUPPLEMENT_PRODUCT_TAGS[supplementId] || [];
    if (tags.length === 0) return [];
    return products.filter(p =>
      (p.tags || []).some((t: string) => tags.includes(t))
    ).slice(0, 2);
  };

  const trackClick = async (productId: string) => {
    try {
      await fetch(`${API_URL}/api/track/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId })
      });
    } catch (e) { console.error('Track error:', e); }
  };

  const loadPlan = async (pid: string) => {
    try {
      const res = await fetch(`${API_URL}/api/supplement-plan/${pid}`);
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        if (data.reminders) setReminders(data.reminders);
      }
    } catch (e) {
      console.error('Load plan error:', e);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    if (!currentProfileId) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/supplement-plan/${currentProfileId}?lang=${lang}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        await loadProducts();
      }
    } catch (e) {
      console.error('Generate plan error:', e);
    } finally {
      setGenerating(false);
    }
  };

  const saveReminders = async () => {
    try {
      const payload: any = { ...reminders };
      if (shiftCycle.length > 0 && cycleStartDate) {
        payload.shift_cycle = { pattern: shiftCycle, start_date: cycleStartDate };
      }
      // Save to backend
      await fetch(`${API_URL}/api/supplement-plan/${currentProfileId}/reminders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Also mark supplements as taken (compliance tracking)
      if (plan?.stack) {
        const ids = plan.stack.map((s: any) => s.id);
        await fetch(`${API_URL}/api/daily-tasks/complete-supplements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: currentProfileId, supplement_ids: ids })
        });
        const updated: Record<string, boolean> = { ...todayCompliance };
        for (const id of ids) updated[id] = true;
        setTodayCompliance(updated);
      }

      if (reminders.enabled && plan?.weekly_schedule) {
        // Schedule notifications using the new service
        const success = await scheduleSupplementReminders(
          reminders as ReminderSettings,
          plan.weekly_schedule as WeeklySchedule,
          lang
        );

        if (success) {
          // Send test notification to confirm
          await sendTestNotification(lang);
          Alert.alert(
            lang === 'de' ? 'Erinnerungen aktiviert' : 'Promemoria attivati',
            lang === 'de' 
              ? 'Sie erhalten täglich Benachrichtigungen zu den eingestellten Zeiten.'
              : 'Riceverai notifiche giornaliere agli orari impostati.'
          );
        } else {
          Alert.alert(
            lang === 'de' ? 'Berechtigung erforderlich' : 'Autorizzazione richiesta',
            lang === 'de'
              ? 'Bitte erlauben Sie Benachrichtigungen in den Einstellungen.'
              : 'Per favore consenti le notifiche nelle impostazioni.'
          );
        }
      } else {
        // Disable notifications
        await cancelAllReminders();
      }
    } catch (e) {
      console.error('Save reminders error:', e);
      Alert.alert(
        lang === 'de' ? 'Fehler' : 'Errore',
        lang === 'de' ? 'Erinnerungen konnten nicht gespeichert werden.' : 'Impossibile salvare i promemoria.'
      );
    }
    setShowReminders(false);
  };

  // Remove the old scheduleNotifications function - now handled by NotificationService

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4A8B71" />
      </SafeAreaView>
    );
  }

  if (!plan || !plan.stack || plan.stack.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="pill" size={64} color="#4A8B71" />
          <Text style={styles.emptyTitle}>
            {lang === 'de' ? 'Supplement-Plan erstellen' : 'Crea piano supplementi'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {lang === 'de'
              ? 'Basierend auf Ihrem Gesundheitsprofil erstellen wir Ihren personalisierten 8-Wochen-Plan.'
              : 'In base al tuo profilo di salute creeremo il tuo piano personalizzato di 8 settimane.'}
          </Text>
          <TouchableOpacity
            data-testid="generate-plan-btn"
            style={styles.generateButton}
            onPress={generatePlan}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="creation" size={20} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>
                  {lang === 'de' ? 'Plan generieren' : 'Genera piano'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>{lang === 'de' ? 'Zurueck' : 'Indietro'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#2C8C99', '#4EAAB5', '#6EC4CE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ns.gradientHeader}
        >
          <TouchableOpacity onPress={() => router.back()} style={ns.headerBackBtn} testID="plan-back-btn">
            <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={ns.headerGreeting}>
              {firstName
                ? (lang === 'de' ? `Hallo ${firstName}` : `Ciao ${firstName}`)
                : (lang === 'de' ? 'Hallo' : 'Ciao')}
            </Text>
            <Text style={ns.headerSubtitle}>
              {lang === 'de' ? 'Dein Supplement-Plan fuer heute' : 'Il tuo piano supplementi per oggi'}
            </Text>
          </View>
          <MaterialCommunityIcons name="white-balance-sunny" size={36} color="#FFD54F" />
          <View style={{ flexDirection: 'row', gap: 4, marginLeft: 8 }}>
            <TouchableOpacity onPress={() => setShowReminders(!showReminders)} style={ns.headerIconBtn}>
              <MaterialCommunityIcons name={reminders.enabled ? 'bell-ring' : 'bell-outline'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEmailModal(true)} style={ns.headerIconBtn} testID="email-export-btn">
              <MaterialCommunityIcons name="email-fast-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Personal Summary */}
        {plan.personal_summary && (
          <View style={styles.summaryCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <MaterialCommunityIcons name="account-heart" size={24} color="#4A8B71" />
              <TouchableOpacity
                testID="tts-play-btn"
                onPress={() => playTTS(plan.personal_summary)}
                disabled={ttsLoading}
                style={ttsStyles.playBtn}
              >
                {ttsLoading ? (
                  <ActivityIndicator size="small" color="#4A8B71" />
                ) : (
                  <MaterialCommunityIcons
                    name={ttsPlaying ? 'stop-circle' : 'play-circle'}
                    size={32}
                    color="#4A8B71"
                  />
                )}
                <Text style={ttsStyles.playLabel}>
                  {ttsPlaying
                    ? (lang === 'de' ? 'Stopp' : 'Stop')
                    : (lang === 'de' ? 'Vorlesen' : 'Ascolta')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.summaryText}>{plan.personal_summary}</Text>
          </View>
        )}

        {/* Warnings */}
        {plan.warnings?.length > 0 && (
          <View style={styles.warningsCard}>
            <Text style={styles.warningsTitle}>
              <MaterialCommunityIcons name="alert" size={18} color="#DC2626" />
              {' '}{lang === 'de' ? 'Wichtige Hinweise' : 'Avvisi importanti'}
            </Text>
            {plan.warnings.map((w: string, i: number) => (
              <Text key={i} style={styles.warningText}>{w}</Text>
            ))}
          </View>
        )}

        {/* Reminder Settings */}
        {showReminders && plan.weekly_schedule && (() => {
          const activeSlot = getActiveTimeSlot(plan.weekly_schedule);
          const activeItems = plan.weekly_schedule?.[activeSlot]?.items || [];
          const activeTimeStr = activeSlot === 'morning' ? reminders.morning_time
            : activeSlot === 'noon' ? reminders.noon_time : reminders.evening_time;
          const slotName = TIME_LABELS[activeSlot]?.[lang] || '';
          if (activeItems.length === 0) return null;
          return (
          <View style={ns.reminderCard} testID="reminder-card">
            <LinearGradient
              colors={['#2C8C99', '#4EAAB5']}
              style={ns.reminderHeader}
            >
              <Text style={ns.reminderHeaderTitle}>
                {lang === 'de' ? 'Erinnerung' : 'Promemoria'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setShowReminderSettings(!showReminderSettings)} testID="reminder-settings-btn">
                  <MaterialCommunityIcons name={showReminderSettings ? 'close' : 'cog'} size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#FFFFFF" />
              </View>
            </LinearGradient>

            {/* Settings Panel */}
            {showReminderSettings ? (
              <View style={ns.settingsBody}>
                <Text style={ns.settingsTitle}>
                  {lang === 'de' ? 'Benachrichtigungen einstellen' : 'Imposta notifiche'}
                </Text>
                <TouchableOpacity
                  style={ns.settingsToggleRow}
                  onPress={() => setReminders({ ...reminders, enabled: !reminders.enabled })}
                  testID="reminder-toggle-btn"
                >
                  <MaterialCommunityIcons
                    name={reminders.enabled ? 'toggle-switch' : 'toggle-switch-off'}
                    size={44} color={reminders.enabled ? '#2C8C99' : '#C4CEC8'}
                  />
                  <Text style={[ns.settingsToggleText, { color: reminders.enabled ? '#1A2D26' : '#8FA39B' }]}>
                    {reminders.enabled
                      ? (lang === 'de' ? 'Push-Benachrichtigungen aktiv' : 'Notifiche push attive')
                      : (lang === 'de' ? 'Push-Benachrichtigungen aus' : 'Notifiche push disattivate')}
                  </Text>
                </TouchableOpacity>
                {reminders.enabled && (
                  <View style={ns.settingsTimeRows}>
                    {/* Shift selector for shift/night workers */}
                    {(workType === 'shift_work' || workType === 'night_work') && (
                      <View style={{ marginBottom: 14, padding: 12, backgroundColor: '#EDF6FF', borderRadius: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A2D26', marginBottom: 8 }}>
                          <MaterialCommunityIcons name="clock-fast" size={15} color="#2C8C99" />
                          {' '}{lang === 'de' ? 'Schicht-Vorlage' : 'Modello turno'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {([
                            { key: 'early', icon: 'weather-sunset-up', label: lang === 'de' ? 'Frueh' : 'Mattina', times: { morning_time: '05:00', noon_time: '11:30', evening_time: '20:00' } },
                            { key: 'late', icon: 'weather-sunset-down', label: lang === 'de' ? 'Spaet' : 'Pomeriggio', times: { morning_time: '09:30', noon_time: '15:30', evening_time: '23:00' } },
                            { key: 'night', icon: 'weather-night', label: lang === 'de' ? 'Nacht' : 'Notte', times: { morning_time: '14:30', noon_time: '20:00', evening_time: '03:00' } },
                          ] as const).map(shift => (
                            <TouchableOpacity
                              key={shift.key}
                              data-testid={`shift-preset-${shift.key}`}
                              style={{
                                flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4,
                                padding: 10, borderRadius: 10, borderWidth: 2,
                                borderColor: activeShift === shift.key ? '#2C8C99' : '#D1E5EB',
                                backgroundColor: activeShift === shift.key ? '#D7F0F5' : '#FFFFFF',
                              }}
                              onPress={() => {
                                setActiveShift(shift.key);
                                setReminders({ ...reminders, ...shift.times });
                              }}
                            >
                              <MaterialCommunityIcons name={shift.icon} size={22} color={activeShift === shift.key ? '#2C8C99' : '#8FA39B'} />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: activeShift === shift.key ? '#2C8C99' : '#5C7A6F' }}>
                                {shift.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <Text style={{ fontSize: 11, color: '#5C7A6F', marginTop: 6 }}>
                          {lang === 'de'
                            ? 'Waehle deine aktuelle Schicht - die Zeiten passen sich automatisch an.'
                            : 'Seleziona il turno attuale - gli orari si adatteranno automaticamente.'}
                        </Text>
                      </View>
                    )}

                    {/* Shift Cycle Rotator - only for shift/night workers */}
                    {(workType === 'shift_work' || workType === 'night_work') && (
                      <View style={{ marginBottom: 14, padding: 12, backgroundColor: '#F0F7FF', borderRadius: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A2D26', marginBottom: 10 }}>
                          <MaterialCommunityIcons name="calendar-sync" size={15} color="#5C6BC0" />
                          {' '}{lang === 'de' ? 'Schichtzyklus-Rotator' : 'Rotatore turni'}
                        </Text>

                        {/* Today's shift indicator */}
                        {todayShift?.shift && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, padding: 8, backgroundColor: '#E8F5E9', borderRadius: 8 }}>
                            <MaterialCommunityIcons
                              name={todayShift.shift === 'early' ? 'weather-sunset-up' : todayShift.shift === 'late' ? 'weather-sunset-down' : todayShift.shift === 'night' ? 'weather-night' : 'sofa'}
                              size={20} color="#2E7D32"
                            />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#2E7D32' }}>
                              {lang === 'de' ? `Heute: ${todayShift.label}` : `Oggi: ${todayShift.label}`}
                              {' '}({lang === 'de' ? `Tag ${todayShift.cycle_day}` : `Giorno ${todayShift.cycle_day}`})
                            </Text>
                          </View>
                        )}

                        {/* Preset templates */}
                        <Text style={{ fontSize: 12, color: '#5C7A6F', marginBottom: 6 }}>
                          {lang === 'de' ? 'Vorlage waehlen:' : 'Scegli modello:'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                          {([
                            { label: 'VK 4x4', pattern: ['early','early','early','early','late','late','late','late','night','night','night','night','off','off','off','off'] },
                            { label: lang === 'de' ? '3-Schicht' : '3 turni', pattern: ['early','early','late','late','night','night','off'] },
                            { label: 'FFSSNN--', pattern: ['early','early','late','late','night','night','off','off'] },
                            { label: lang === 'de' ? '2-Schicht' : '2 turni', pattern: ['early','early','early','late','late','late','off'] },
                          ]).map(tpl => (
                            <TouchableOpacity
                              key={tpl.label}
                              testID={`cycle-tpl-${tpl.label}`}
                              style={{
                                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
                                borderWidth: 1.5,
                                borderColor: JSON.stringify(shiftCycle) === JSON.stringify(tpl.pattern) ? '#5C6BC0' : '#D1D5DB',
                                backgroundColor: JSON.stringify(shiftCycle) === JSON.stringify(tpl.pattern) ? '#EDE7F6' : '#FFF',
                              }}
                              onPress={() => {
                                setShiftCycle(tpl.pattern);
                                if (!cycleStartDate) setCycleStartDate(new Date().toISOString().split('T')[0]);
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: JSON.stringify(shiftCycle) === JSON.stringify(tpl.pattern) ? '#5C6BC0' : '#5C7A6F' }}>
                                {tpl.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Visual cycle editor */}
                        {shiftCycle.length > 0 && (
                          <>
                            <Text style={{ fontSize: 12, color: '#5C7A6F', marginBottom: 6 }}>
                              {lang === 'de' ? 'Zyklus bearbeiten (tippen zum aendern):' : 'Modifica ciclo (tocca per cambiare):'}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                              {shiftCycle.map((shift, i) => {
                                const cfg: Record<string, { bg: string; fg: string; lbl: string }> = {
                                  early: { bg: '#FFF3E0', fg: '#E65100', lbl: 'F' },
                                  late: { bg: '#E3F2FD', fg: '#1565C0', lbl: 'S' },
                                  night: { bg: '#EDE7F6', fg: '#4527A0', lbl: 'N' },
                                  off: { bg: '#F5F5F5', fg: '#9E9E9E', lbl: '-' },
                                };
                                const c = cfg[shift] || cfg.off;
                                const isToday = todayShift?.day_index === i;
                                return (
                                  <TouchableOpacity
                                    key={i}
                                    testID={`cycle-day-${i}`}
                                    style={{
                                      width: 32, height: 32, borderRadius: 8,
                                      backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center',
                                      borderWidth: isToday ? 2.5 : 0, borderColor: '#2E7D32',
                                    }}
                                    onPress={() => {
                                      const order = ['early', 'late', 'night', 'off'];
                                      const next = order[(order.indexOf(shift) + 1) % order.length];
                                      const updated = [...shiftCycle];
                                      updated[i] = next;
                                      setShiftCycle(updated);
                                    }}
                                  >
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: c.fg }}>{c.lbl}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                              {[
                                { lbl: 'F', desc: lang === 'de' ? 'Frueh' : 'Matt.', bg: '#FFF3E0', fg: '#E65100' },
                                { lbl: 'S', desc: lang === 'de' ? 'Spaet' : 'Pom.', bg: '#E3F2FD', fg: '#1565C0' },
                                { lbl: 'N', desc: lang === 'de' ? 'Nacht' : 'Notte', bg: '#EDE7F6', fg: '#4527A0' },
                                { lbl: '-', desc: lang === 'de' ? 'Frei' : 'Libero', bg: '#F5F5F5', fg: '#9E9E9E' },
                              ].map(l => (
                                <View key={l.lbl} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                  <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: l.bg, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: l.fg }}>{l.lbl}</Text>
                                  </View>
                                  <Text style={{ fontSize: 10, color: '#5C7A6F' }}>{l.desc}</Text>
                                </View>
                              ))}
                            </View>

                            {/* Start date */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              <MaterialCommunityIcons name="calendar-start" size={16} color="#5C6BC0" />
                              <Text style={{ fontSize: 12, color: '#5C7A6F' }}>
                                {lang === 'de' ? 'Startdatum:' : 'Data inizio:'}
                              </Text>
                              <TextInput
                                testID="cycle-start-date"
                                style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#1A2D26', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', paddingVertical: 2 }}
                                value={cycleStartDate}
                                onChangeText={setCycleStartDate}
                                placeholder="JJJJ-MM-TT"
                                placeholderTextColor="#C4CEC8"
                              />
                            </View>
                          </>
                        )}
                      </View>
                    )}
                    {[
                      { key: 'morning_time', icon: 'weather-sunny', label: lang === 'de' ? 'Morgens' : 'Mattina', color: '#FF9800' },
                      { key: 'noon_time', icon: 'weather-partly-cloudy', label: lang === 'de' ? 'Mittags' : 'Mezzogiorno', color: '#4EAAB5' },
                      { key: 'evening_time', icon: 'weather-night', label: lang === 'de' ? 'Abends' : 'Sera', color: '#5C6BC0' },
                    ].map(({ key, icon, label, color }) => (
                      <View key={key} style={ns.settingsTimeRow}>
                        <View style={[ns.settingsTimeIcon, { backgroundColor: color + '18' }]}>
                          <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                        </View>
                        <Text style={ns.settingsTimeLabel}>{label}</Text>
                        <TextInput
                          style={ns.settingsTimeInput}
                          value={(reminders as any)[key]}
                          onChangeText={v => setReminders({ ...reminders, [key]: v })}
                          placeholder="HH:MM"
                          placeholderTextColor="#C4CEC8"
                          testID={`reminder-time-${key}`}
                        />
                      </View>
                    ))}
                  </View>
                )}
                <View style={ns.settingsBtnRow}>
                  <TouchableOpacity
                    style={ns.settingsTestBtn}
                    onPress={() => sendTestNotification(lang)}
                    testID="test-notification-btn"
                  >
                    <MaterialCommunityIcons name="bell-ring" size={16} color="#2C8C99" />
                    <Text style={ns.settingsTestBtnText}>
                      {lang === 'de' ? 'Testen' : 'Prova'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={ns.settingsSaveBtn} onPress={() => { saveReminders(); setShowReminderSettings(false); }} testID="save-reminders-btn">
                    <LinearGradient colors={['#2C8C99', '#4EAAB5']} style={ns.settingsSaveGradient}>
                      <MaterialCommunityIcons name="content-save" size={16} color="#FFFFFF" />
                      <Text style={ns.settingsSaveBtnText}>
                        {lang === 'de' ? 'Speichern' : 'Salva'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Notification Card Body */
              <View style={ns.reminderBody}>
                <Text style={ns.reminderSubtitle}>
                  {lang === 'de'
                    ? `Zeit fuer deine ${slotName}einnahme!`
                    : `E' ora della tua assunzione ${slotName}!`}
                </Text>
                <View style={ns.reminderClockRow}>
                  <MaterialCommunityIcons name="clock-outline" size={52} color="#2C8C99" />
                  <Text style={ns.reminderTimeText}>{activeTimeStr} Uhr</Text>
                </View>
                {activeItems.slice(0, 3).map((item: any) => (
                  <View key={item.id} style={ns.reminderItem}>
                    <PillIcon id={item.id} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={ns.reminderItemName}>{item.name}</Text>
                      <Text style={ns.reminderItemDose}>
                        {item.form_label || `${item.dosage} ${item.unit}`} – {lang === 'de' ? 'einnehmen' : 'assumere'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="check-circle" size={22} color="#10B981" />
                  </View>
                ))}
                <View style={ns.reminderActions}>
                  <TouchableOpacity style={ns.laterBtn} onPress={() => setShowReminders(false)} testID="later-remind-btn">
                    <Text style={ns.laterBtnText}>
                      {lang === 'de' ? 'Spaeter erinnern' : 'Ricorda dopo'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={ns.takeNowBtn} onPress={saveReminders} testID="take-now-btn">
                    <LinearGradient colors={['#2C8C99', '#4EAAB5']} style={ns.takeNowGradient}>
                      <Text style={ns.takeNowBtnText}>
                        {lang === 'de' ? 'Jetzt einnehmen' : 'Assumi ora'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          );
        })()}

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: 'stack' as const, label: lang === 'de' ? 'Stack' : 'Stack', icon: 'pill' },
            { key: 'schedule' as const, label: lang === 'de' ? 'Tagesplan' : 'Piano', icon: 'clock-outline' },
            { key: 'phases' as const, label: lang === 'de' ? 'Wochen' : 'Settimane', icon: 'calendar-week' },
            { key: 'interactions' as const, label: lang === 'de' ? 'Analyse' : 'Analisi', icon: 'shield-search' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialCommunityIcons name={tab.icon as any} size={18} color={activeTab === tab.key ? '#FFFFFF' : '#5C7A6F'} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stack Tab - Structured Medical Report Style */}
        {activeTab === 'stack' && plan.stack?.map((s: any, idx: number) => {
          const riskColor = RISK_COLORS[s.risk_level] || '#10B981';
          const riskBg = s.risk_level === 'high' ? '#FEF2F2' : s.risk_level === 'medium' ? '#FFFBEB' : '#F0FDF4';
          const riskLabel = s.risk_level === 'high'
            ? (lang === 'de' ? 'HOCH' : 'ALTO')
            : s.risk_level === 'medium' ? (lang === 'de' ? 'MITTEL' : 'MEDIO')
            : (lang === 'de' ? 'NIEDRIG' : 'BASSO');
          const evColor = s.evidence_level === 'high' ? '#16A34A' : s.evidence_level === 'medium' ? '#D97706' : '#EA580C';
          const evBg = s.evidence_level === 'high' ? '#DCFCE7' : s.evidence_level === 'medium' ? '#FEF3C7' : '#FFEDD5';
          const evIcon = s.evidence_level === 'high' ? 'check-decagram' : s.evidence_level === 'medium' ? 'flask-outline' : 'magnify';
          const evLabel = s.evidence_level === 'high'
            ? (lang === 'de' ? 'Hohe Evidenz' : 'Alta evidenza')
            : s.evidence_level === 'medium'
            ? (lang === 'de' ? 'Mittlere Evidenz' : 'Evidenza media')
            : (lang === 'de' ? 'Explorativ' : 'Esplorativo');
          const timingIcon = s.timing === 'morning' ? 'weather-sunny' : s.timing === 'evening' ? 'weather-night' : 'weather-partly-cloudy';

          return (
            <View key={s.id} style={ms.card} data-testid={`supplement-card-${s.id}`}>
              {/* 1. Header: Name + Status */}
              <View style={ms.cardHeader}>
                <View style={[ms.statusStripe, { backgroundColor: riskColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={ms.supplementNum}>{lang === 'de' ? `Supplement ${idx + 1}/${plan.stack.length}` : `Supplemento ${idx + 1}/${plan.stack.length}`}</Text>
                  <Text style={ms.supplementName}>{s.name}</Text>
                </View>
                <View style={[ms.statusBadge, { backgroundColor: riskBg, borderColor: riskColor }]}>
                  <View style={[ms.statusDot, { backgroundColor: riskColor }]} />
                  <Text style={[ms.statusText, { color: riskColor }]}>{riskLabel}</Text>
                </View>
              </View>

              {/* 2. Wirkung */}
              <View style={ms.section}>
                <Text style={ms.sectionLabel}>{lang === 'de' ? 'WIRKUNG' : 'EFFETTO'}</Text>
                <Text style={ms.effectText}>{s.reason}</Text>
              </View>

              {/* 3. Warum empfohlen */}
              {s.recommendation_reasons?.length > 0 && (
                <View style={ms.section}>
                  <Text style={ms.sectionLabel}>{lang === 'de' ? 'WARUM EMPFOHLEN' : 'PERCHE RACCOMANDATO'}</Text>
                  <View style={ms.reasonsList}>
                    {s.recommendation_reasons.map((r: string, ri: number) => (
                      <View key={ri} style={ms.reasonItem}>
                        <MaterialCommunityIcons name="checkbox-marked-circle" size={14} color={riskColor} />
                        <Text style={ms.reasonText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 4. Structured Data Grid */}
              <View style={ms.dataGrid}>
                {/* Dosierung */}
                <View style={ms.dataCell}>
                  <MaterialCommunityIcons name="pill" size={16} color="#4A8B71" />
                  <Text style={ms.dataCellLabel}>{lang === 'de' ? 'Dosierung' : 'Dosaggio'}</Text>
                  <Text style={ms.dataCellValue}>{s.dosage} {s.unit}</Text>
                </View>
                {/* Einnahmezeitpunkt */}
                <View style={ms.dataCell}>
                  <MaterialCommunityIcons name={timingIcon as any} size={16} color="#4A8B71" />
                  <Text style={ms.dataCellLabel}>{lang === 'de' ? 'Einnahme' : 'Assunzione'}</Text>
                  <Text style={ms.dataCellValue}>{s.timing_label}</Text>
                  <Text style={ms.dataCellSub}>{s.with_food_label}</Text>
                </View>
                {/* Evidenz */}
                <View style={[ms.dataCell, { backgroundColor: evBg }]}>
                  <MaterialCommunityIcons name={evIcon as any} size={16} color={evColor} />
                  <Text style={ms.dataCellLabel}>{lang === 'de' ? 'Evidenz' : 'Evidenza'}</Text>
                  <Text style={[ms.dataCellValue, { color: evColor }]}>{evLabel}</Text>
                </View>
                {/* Wirkungseintritt */}
                <View style={ms.dataCell}>
                  <MaterialCommunityIcons name="timer-sand" size={16} color="#4A8B71" />
                  <Text style={ms.dataCellLabel}>{lang === 'de' ? 'Wirkung ab' : 'Effetto da'}</Text>
                  <Text style={ms.dataCellValue}>{s.onset_weeks} {lang === 'de' ? 'Wo.' : 'sett.'}</Text>
                </View>
              </View>

              {/* 5. Synergies */}
              {s.synergies?.length > 0 && (
                <View style={ms.synRow}>
                  <MaterialCommunityIcons name="link-variant" size={14} color="#4A8B71" />
                  <Text style={ms.synLabel}>{lang === 'de' ? 'Synergie:' : 'Sinergia:'}</Text>
                  <Text style={ms.synText}>{s.synergies.join(', ')}</Text>
                </View>
              )}

              {/* 6. Warnings (compact) */}
              {s.side_effects?.length > 0 && (
                <View style={ms.warnRow}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#F59E0B" />
                  <Text style={ms.warnText}>{s.side_effects.join(' | ')}</Text>
                </View>
              )}
              {s.med_warnings?.length > 0 && (
                <View style={[ms.warnRow, { backgroundColor: '#FEF2F2' }]}>
                  <MaterialCommunityIcons name="medical-bag" size={14} color="#DC2626" />
                  <Text style={[ms.warnText, { color: '#991B1B' }]}>{s.med_warnings.map((w: any) => w.warning_de || w.warning).join(' | ')}</Text>
                </View>
              )}

              {/* 7. CTAs */}
              <View style={ms.ctaWrap}>
                <TouchableOpacity
                  data-testid={`product-cta-${s.id}`}
                  style={[ms.primaryCta, { backgroundColor: riskColor }]}
                  onPress={() => router.push({
                    pathname: '/product-comparison',
                    params: { nutrient: s.id, risk: s.risk_level }
                  })}
                >
                  <MaterialCommunityIcons name="shield-search" size={16} color="#FFF" />
                  <Text style={ms.primaryCtaText}>{
                    s.risk_level === 'high'
                      ? (lang === 'de' ? `Optimale ${s.name?.split(' ')[0] || s.id}-Quelle finden` : `Trova fonte ottimale di ${s.name?.split(' ')[0] || s.id}`)
                      : (lang === 'de' ? 'Qualitaetsgepruefte Optionen vergleichen' : 'Confronta opzioni certificate')
                  }</Text>
                </TouchableOpacity>
                {pricingMap[s.id] && (
                  <Text data-testid={`price-per-day-${s.id}`} style={ms.pricePerDay}>
                    {lang === 'de'
                      ? `Preis pro Tag: ca. ${pricingMap[s.id].avg_per_day.toFixed(2).replace('.', ',')} \u20AC`
                      : `Prezzo al giorno: ca. ${pricingMap[s.id].avg_per_day.toFixed(2).replace('.', ',')} \u20AC`}
                    {pricingMap[s.id].product_count > 1
                      ? ` (${pricingMap[s.id].product_count} ${lang === 'de' ? 'Produkte verglichen' : 'prodotti confrontati'})`
                      : ''}
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        {/* Schedule Tab - New Tagesplan Design */}
        {activeTab === 'schedule' && (
          <View>
            {['morning', 'noon', 'evening'].map(timing => {
              const section = plan.weekly_schedule?.[timing];
              const items = section?.items || [];
              if (items.length === 0) return null;
              const timeStr = timing === 'morning' ? reminders.morning_time
                : timing === 'noon' ? reminders.noon_time
                : reminders.evening_time;
              const timeName = TIME_LABELS[timing]?.[lang] || timing;
              const timingIcon = timing === 'morning' ? 'weather-sunny' : timing === 'noon' ? 'weather-partly-cloudy' : 'weather-night';
              const timingColor = timing === 'morning' ? '#FF9800' : timing === 'noon' ? '#4EAAB5' : '#5C6BC0';

              return (
                <View key={timing} style={ns.timeCard}>
                  <View style={ns.timeCardHeader}>
                    <MaterialCommunityIcons name={timingIcon as any} size={22} color={timingColor} />
                    <Text style={ns.timeLabel}>{timeName}</Text>
                    <Text style={ns.timeValue}>{timeStr}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={ns.timeCount}>{items.length} {lang === 'de' ? 'Supplements' : 'supplementi'}</Text>
                  </View>
                  <View style={ns.pillGrid}>
                    {items.map((item: any) => {
                      const displayName = abbreviateName(item.name || '', item.id);
                      const formLabel = item.form_label || `${item.dosage} ${item.unit}`;
                      const isTaken = todayCompliance[item.id] === true;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[ns.pillItem, isTaken && { opacity: 0.5 }]}
                          activeOpacity={0.7}
                          data-testid={`pill-shop-${item.id}`}
                          onPress={() => router.push({
                            pathname: '/product-comparison',
                            params: { nutrient: item.id, risk: item.risk_level || 'medium' }
                          })}
                        >
                          <View>
                            <PillIcon id={item.id} />
                            {isTaken && (
                              <View style={{ position: 'absolute', right: -4, top: -4, backgroundColor: '#22C55E', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                                <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                              </View>
                            )}
                          </View>
                          <Text style={[ns.pillName, isTaken && { textDecorationLine: 'line-through', color: '#8FA39B' }]} numberOfLines={1}>{displayName}</Text>
                          <Text style={ns.pillDose} numberOfLines={1}>{formLabel}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={ns.mealNote}>
                    <MaterialCommunityIcons name="information-outline" size={12} color="#8FA39B" />
                    {' '}{items[0]?.with_food
                      ? (lang === 'de' ? 'Mit Mahlzeit einnehmen' : 'Assumere con pasto')
                      : (lang === 'de' ? 'Nuechtern einnehmen' : 'Assumere a digiuno')}
                  </Text>
                </View>
              );
            })}

            {/* Einnahme abgehakt Button */}
            <TouchableOpacity style={ns.completionBtn} testID="intake-complete-btn">
              <LinearGradient colors={['#2C8C99', '#4EAAB5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ns.completionGradient}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
                <Text style={ns.completionBtnText}>
                  {lang === 'de' ? 'Einnahme abgehakt' : 'Assunzione confermata'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Supplement Uebersicht Card */}
            <View style={ns.overviewCard}>
              <LinearGradient colors={['#2C8C99', '#4EAAB5', '#6BB5A0']} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={ns.overviewHeader}>
                <View>
                  <Text style={ns.overviewTitle}>
                    {lang === 'de' ? 'Supplement Uebersicht' : 'Panoramica supplementi'}
                  </Text>
                  <Text style={ns.overviewSubtitle}>
                    {plan.total_supplements} {lang === 'de' ? 'Supplements' : 'supplementi'} - 8 {lang === 'de' ? 'Wochen' : 'settimane'}
                  </Text>
                </View>
              </LinearGradient>
              <View style={ns.overviewGrid}>
                {plan.stack?.slice(0, 4).map((s: any) => (
                  <TouchableOpacity
                    key={s.id}
                    style={ns.overviewItem}
                    activeOpacity={0.7}
                    data-testid={`overview-shop-${s.id}`}
                    onPress={() => router.push({
                      pathname: '/product-comparison',
                      params: { nutrient: s.id, risk: s.risk_level || 'medium' }
                    })}
                  >
                    <PillIcon id={s.id} size={36} />
                    <Text style={ns.overviewItemName} numberOfLines={1}>{s.name?.split(' ')[0] || s.id}</Text>
                    <Text style={ns.overviewItemDose}>{s.dosage} {s.unit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {(plan.stack?.length || 0) > 4 && (
                <TouchableOpacity style={ns.showAllBtn} onPress={() => setActiveTab('stack')} testID="show-all-supplements-btn">
                  <Text style={ns.showAllBtnText}>
                    {lang === 'de' ? 'ALLE ANZEIGEN' : 'MOSTRA TUTTI'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Phases Tab */}
        {activeTab === 'phases' && plan.phases?.map((phase: any, i: number) => (
          <View key={i} style={styles.phaseCard}>
            <View style={styles.phaseHeader}>
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseBadgeText}>
                  {lang === 'de' ? `Woche ${phase.weeks}` : `Settimana ${phase.weeks}`}
                </Text>
              </View>
              <Text style={styles.phaseTitle}>{phase.title}</Text>
            </View>
            <Text style={styles.phaseDescription}>{phase.description}</Text>
            <Text style={styles.phaseNote}>
              <MaterialCommunityIcons name="information" size={14} color="#4A8B71" /> {phase.note}
            </Text>
          </View>
        ))}

        {/* Interactions Tab */}
        {activeTab === 'interactions' && currentProfileId && (
          <InteractionAnalysis profileId={currentProfileId} lang={lang} />
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimerText}>
          {lang === 'de'
            ? 'Dieser Plan ersetzt keine aerztliche Beratung. Bei Beschwerden oder Unsicherheiten konsultieren Sie bitte einen Arzt oder Apotheker.'
            : 'Questo piano non sostituisce una consulenza medica. In caso di disturbi o dubbi consultare un medico o farmacista.'}
        </Text>
      </ScrollView>

      {/* Email Export Modal */}
      {currentProfileId && (
        <EmailExportModal
          visible={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          profileId={currentProfileId}
          lang={lang}
        />
      )}
    </SafeAreaView>
  );
}


const ms = StyleSheet.create({
  card: {
    backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  statusStripe: { width: 4, height: 48, borderRadius: 2 },
  supplementNum: { fontSize: 11, color: '#8FA39B', fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase' },
  supplementName: { fontSize: 17, fontWeight: '700', color: '#1A2D26', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#8FA39B',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
  },
  effectText: { fontSize: 14, color: '#374151', lineHeight: 21 },

  reasonsList: { gap: 6 },
  reasonItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  reasonText: { fontSize: 13, color: '#374151', lineHeight: 20, flex: 1 },

  dataGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, marginBottom: 12,
  },
  dataCell: {
    flex: 1, minWidth: '45%' as any, backgroundColor: '#F8FAF9',
    borderRadius: 10, padding: 10, gap: 3,
  },
  dataCellLabel: { fontSize: 10, color: '#8FA39B', fontWeight: '600', letterSpacing: 0.3 },
  dataCellValue: { fontSize: 15, color: '#1A2D26', fontWeight: '700' },
  dataCellSub: { fontSize: 11, color: '#5C7A6F' },

  synRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, marginBottom: 8,
    backgroundColor: '#F0FDF4', marginHorizontal: 16, borderRadius: 8, padding: 8,
  },
  synLabel: { fontSize: 12, fontWeight: '600', color: '#4A8B71' },
  synText: { fontSize: 12, color: '#374151', flex: 1 },

  warnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', marginHorizontal: 16, borderRadius: 8, padding: 8, marginBottom: 6,
  },
  warnText: { fontSize: 11, color: '#92400E', flex: 1, lineHeight: 16 },

  ctaWrap: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: '#F0F4F2', marginTop: 4 },
  primaryCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 10, paddingVertical: 12,
  },
  primaryCtaText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  pricePerDay: { fontSize: 12, color: '#8FA39B', textAlign: 'center', marginTop: 2, fontWeight: '400' },
  secondaryCta: { alignItems: 'center', paddingVertical: 6 },
  secondaryCtaText: { color: '#6B7280', fontSize: 12, fontWeight: '500', textDecorationLine: 'underline' },
});

const ttsStyles = StyleSheet.create({
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D7EDDF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  playLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D5A3F',
  },
});


const ns = StyleSheet.create({
  /* ── Gradient Header ── */
  gradientHeader: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 20,
    padding: 20, paddingTop: 16, paddingBottom: 16, marginBottom: 16, gap: 12,
  },
  headerBackBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerGreeting: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  /* ── Reminder Card ── */
  reminderCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#1A2D26', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  reminderHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  reminderHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  reminderBody: { padding: 18, gap: 14 },
  reminderSubtitle: { fontSize: 15, fontWeight: '600', color: '#1A2D26', textAlign: 'center' },
  reminderClockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  reminderTimeText: { fontSize: 28, fontWeight: '800', color: '#2C8C99' },
  reminderItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8FAF9', borderRadius: 14, padding: 12,
  },
  reminderItemName: { fontSize: 14, fontWeight: '700', color: '#1A2D26' },
  reminderItemDose: { fontSize: 12, color: '#5C7A6F', marginTop: 2 },
  reminderActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  laterBtn: {
    flex: 1, backgroundColor: '#F0F4F2', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  laterBtnText: { fontSize: 14, fontWeight: '600', color: '#5C7A6F' },
  takeNowBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  takeNowGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: 14 },
  takeNowBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  /* ── Settings Panel (within Reminder Card) ── */
  settingsBody: { padding: 18, gap: 16 },
  settingsTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', textAlign: 'center' },
  settingsToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsToggleText: { fontSize: 14, fontWeight: '600' },
  settingsTimeRows: { gap: 10 },
  settingsTimeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8FAF9', borderRadius: 14, padding: 12,
  },
  settingsTimeIcon: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  settingsTimeLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A2D26' },
  settingsTimeInput: {
    width: 70, fontSize: 16, fontWeight: '700', color: '#2C8C99',
    textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#2C8C99',
    paddingVertical: 4,
  },
  settingsBtnRow: { flexDirection: 'row', gap: 10 },
  settingsTestBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F0F4F2', borderRadius: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#2C8C99',
  },
  settingsTestBtnText: { fontSize: 13, fontWeight: '600', color: '#2C8C99' },
  settingsSaveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  settingsSaveGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14,
  },
  settingsSaveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  /* ── Time Cards (Tagesplan) ── */
  timeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#1A2D26', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  timeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  timeLabel: { fontSize: 17, fontWeight: '700', color: '#1A2D26' },
  timeValue: { fontSize: 15, fontWeight: '600', color: '#2C8C99' },
  timeCount: { fontSize: 12, color: '#8FA39B', fontWeight: '500' },
  pillGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  pillItem: { alignItems: 'center', width: 72, gap: 6 },
  pillName: { fontSize: 12, fontWeight: '600', color: '#1A2D26', textAlign: 'center' },
  pillDose: { fontSize: 10, color: '#8FA39B', textAlign: 'center' },
  mealNote: { fontSize: 11, color: '#8FA39B', marginTop: 12, fontStyle: 'italic' },

  /* ── Completion Button ── */
  completionBtn: { marginBottom: 16, borderRadius: 14, overflow: 'hidden' },
  completionGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  completionBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  /* ── Overview Card ── */
  overviewCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#1A2D26', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  overviewHeader: { padding: 18 },
  overviewTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  overviewSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  overviewGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 10,
  },
  overviewItem: {
    width: '46%' as any, backgroundColor: '#F8FAF9', borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 6,
  },
  overviewItemName: { fontSize: 13, fontWeight: '600', color: '#1A2D26', textAlign: 'center' },
  overviewItemDose: { fontSize: 11, color: '#8FA39B' },
  showAllBtn: {
    backgroundColor: '#2C8C99', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    marginHorizontal: 14, marginBottom: 14,
  },
  showAllBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
});
