import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Linking, Alert, StyleSheet, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
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

export default function SupplementPlanScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const params = useLocalSearchParams<{ profileId: string }>();
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(params.profileId || null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'stack' | 'schedule' | 'phases' | 'interactions'>('stack');
  const [reminders, setReminders] = useState({ enabled: false, morning_time: '08:00', noon_time: '12:00', evening_time: '20:00' });
  const [showReminders, setShowReminders] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const stopAudio = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) { /* ignore */ }
      soundRef.current = null;
    }
    setTtsPlaying(false);
  };

  const playTTS = async (text: string) => {
    if (ttsPlaying) {
      await stopAudio();
      return;
    }
    setTtsLoading(true);
    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      }
      const res = await fetch(`${API_URL}/api/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const data = await res.json();

      if (Platform.OS === 'web') {
        // Web: use HTML5 Audio
        const audioSrc = `data:audio/mp3;base64,${data.audio_base64}`;
        const audio = new window.Audio(audioSrc);
        audio.onended = () => setTtsPlaying(false);
        audio.play();
        setTtsPlaying(true);
        // Store ref for stop
        (soundRef as any).current = { stopAsync: () => { audio.pause(); audio.currentTime = 0; return Promise.resolve(); }, unloadAsync: () => Promise.resolve() };
      } else {
        // Native: use expo-av
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/mp3;base64,${data.audio_base64}` },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        setTtsPlaying(true);
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setTtsPlaying(false);
            sound.unloadAsync();
            soundRef.current = null;
          }
        });
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
      // Save to backend
      await fetch(`${API_URL}/api/supplement-plan/${currentProfileId}/reminders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminders)
      });

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

  if (!plan) {
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {lang === 'de' ? 'Ihr Mikronaehrstoff-Plan' : 'Il tuo piano micronutrienti'}
            </Text>
            <Text style={styles.subtitle}>
              {lang === 'de' ? `${plan.total_supplements} Supplements - 8 Wochen` : `${plan.total_supplements} supplementi - 8 settimane`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowReminders(!showReminders)} style={styles.reminderBtn}>
            <MaterialCommunityIcons name={reminders.enabled ? 'bell-ring' : 'bell-outline'} size={24} color={reminders.enabled ? '#4A8B71' : '#8FA39B'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowEmailModal(true)} style={styles.reminderBtn} data-testid="email-export-btn">
            <MaterialCommunityIcons name="email-fast-outline" size={24} color="#4A8B71" />
          </TouchableOpacity>
        </View>

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
        {showReminders && (
          <View style={styles.reminderCard}>
            <Text style={styles.reminderTitle}>
              <MaterialCommunityIcons name="bell-cog" size={18} color="#4A8B71" />
              {' '}{lang === 'de' ? 'Erinnerungen' : 'Promemoria'}
            </Text>
            <TouchableOpacity
              style={styles.reminderToggle}
              onPress={() => setReminders({ ...reminders, enabled: !reminders.enabled })}
            >
              <MaterialCommunityIcons
                name={reminders.enabled ? 'toggle-switch' : 'toggle-switch-off'}
                size={40} color={reminders.enabled ? '#4A8B71' : '#8FA39B'}
              />
              <Text style={styles.reminderToggleText}>
                {reminders.enabled
                  ? (lang === 'de' ? 'Aktiviert' : 'Attivato')
                  : (lang === 'de' ? 'Deaktiviert' : 'Disattivato')}
              </Text>
            </TouchableOpacity>
            {reminders.enabled && (
              <View style={styles.reminderTimes}>
                {[
                  { key: 'morning_time', icon: 'weather-sunny', label: lang === 'de' ? 'Morgens' : 'Mattina' },
                  { key: 'noon_time', icon: 'weather-partly-cloudy', label: lang === 'de' ? 'Mittags' : 'Mezzogiorno' },
                  { key: 'evening_time', icon: 'weather-night', label: lang === 'de' ? 'Abends' : 'Sera' },
                ].map(({ key, icon, label }) => (
                  <View key={key} style={styles.reminderTimeRow}>
                    <MaterialCommunityIcons name={icon as any} size={20} color="#4A8B71" />
                    <Text style={styles.reminderTimeLabel}>{label}</Text>
                    <TextInput
                      style={styles.reminderTimeInput}
                      value={(reminders as any)[key]}
                      onChangeText={v => setReminders({ ...reminders, [key]: v })}
                      placeholder="HH:MM"
                      placeholderTextColor="#8FA39B"
                    />
                  </View>
                ))}
                <TouchableOpacity 
                  style={[styles.reminderSaveBtn, { backgroundColor: '#6B7280', marginTop: 12, marginBottom: 8 }]} 
                  onPress={() => sendTestNotification(lang)}
                  testID="test-notification-btn"
                >
                  <MaterialCommunityIcons name="bell-ring" size={18} color="#FFFFFF" />
                  <Text style={[styles.reminderSaveBtnText, { marginLeft: 8 }]}>
                    {lang === 'de' ? 'Test-Benachrichtigung' : 'Notifica di prova'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.reminderSaveBtn} onPress={saveReminders}>
              <Text style={styles.reminderSaveBtnText}>{lang === 'de' ? 'Speichern' : 'Salva'}</Text>
            </TouchableOpacity>
          </View>
        )}

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
                  <MaterialCommunityIcons name="shopping-outline" size={16} color="#FFF" />
                  <Text style={ms.primaryCtaText}>{lang === 'de' ? 'Empfohlenes Produkt anzeigen' : 'Mostra prodotto consigliato'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  data-testid={`compare-cta-${s.id}`}
                  style={ms.secondaryCta}
                  onPress={() => router.push({
                    pathname: '/product-comparison',
                    params: { nutrient: s.id, risk: s.risk_level }
                  })}
                >
                  <Text style={ms.secondaryCtaText}>
                    {lang === 'de' ? 'Qualitaetsgepruefte Optionen vergleichen' : 'Confronta opzioni certificate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <View>
            {['morning', 'noon', 'evening'].map(timing => {
              const section = plan.weekly_schedule?.[timing];
              const items = section?.items || [];
              if (items.length === 0) return null;
              return (
                <View key={timing} style={styles.scheduleSection}>
                  <View style={styles.scheduleHeader}>
                    <MaterialCommunityIcons name={TIMING_ICONS[timing] as any} size={28} color="#4A8B71" />
                    <Text style={styles.scheduleTitle}>{section.label}</Text>
                    <Text style={styles.scheduleCount}>{items.length}</Text>
                  </View>
                  {items.map((item: any) => {
                    const measurableUnits = ['mg', 'mcg', 'IE', 'UI', 'ml', 'g', 'Mrd. KBE', 'mld. UFC'];
                    const showBracket = item.form_label && measurableUnits.includes(item.unit);
                    const displayName = item.product_name || item.name;
                    return (
                    <View key={item.id} style={styles.scheduleItem}>
                      <MaterialCommunityIcons name="pill" size={18} color="#5C7A6F" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scheduleItemName}>{displayName}</Text>
                        {item.product_name && (
                          <Text style={{ fontSize: 11, color: '#8FA39B', marginTop: 1 }}>
                            {item.name}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.scheduleItemDose}>
                          {item.form_label || `${item.dosage} ${item.unit}`}
                        </Text>
                        {showBracket && (
                          <Text style={{ fontSize: 11, color: '#8FA39B' }}>
                            ({item.dosage} {item.unit})
                          </Text>
                        )}
                      </View>
                    </View>
                    );
                  })}
                  <Text style={styles.scheduleNote}>
                    {items[0]?.with_food
                      ? (lang === 'de' ? 'Mit Mahlzeit einnehmen' : 'Assumere con pasto')
                      : (lang === 'de' ? 'Nuechtern einnehmen' : 'Assumere a digiuno')}
                  </Text>
                </View>
              );
            })}
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
