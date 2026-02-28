import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Linking
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '../src/LangContext';
import { planStyles as styles } from '../components/supplement/planStyles';

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
  const [activeTab, setActiveTab] = useState<'stack' | 'schedule' | 'phases'>('stack');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [reminders, setReminders] = useState({ enabled: false, morning_time: '08:00', noon_time: '12:00', evening_time: '20:00' });
  const [showReminders, setShowReminders] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

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

  const loadPlan = async () => {
    try {
      const res = await fetch(`${API_URL}/api/supplement-plan/${profileId}`);
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
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/supplement-plan/${profileId}?lang=${lang}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
      }
    } catch (e) {
      console.error('Generate plan error:', e);
    } finally {
      setGenerating(false);
    }
  };

  const saveReminders = async () => {
    try {
      await fetch(`${API_URL}/api/supplement-plan/${profileId}/reminders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminders)
      });
      if (reminders.enabled && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          scheduleNotifications();
        }
      }
    } catch (e) {
      console.error('Save reminders error:', e);
    }
    setShowReminders(false);
  };

  const scheduleNotifications = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const schedule = plan?.weekly_schedule;
    if (!schedule) return;

    const timings = [
      { key: 'morning', time: reminders.morning_time },
      { key: 'noon', time: reminders.noon_time },
      { key: 'evening', time: reminders.evening_time },
    ];

    timings.forEach(({ key, time }) => {
      const items = schedule[key]?.items || [];
      if (items.length === 0) return;

      const [h, m] = time.split(':').map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      const delay = target.getTime() - now.getTime();
      const names = items.map((i: any) => i.name).join(', ');
      const label = schedule[key]?.label || key;

      setTimeout(() => {
        new Notification(`VitaGuide - ${label}`, {
          body: `${lang === 'de' ? 'Zeit fuer' : 'Ora di'}: ${names}`,
          icon: '/favicon.png'
        });
      }, delay);
    });
  };

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
        </View>

        {/* Personal Summary */}
        {plan.personal_summary && (
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons name="account-heart" size={24} color="#4A8B71" />
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
            { key: 'stack' as const, label: lang === 'de' ? 'Supplement-Stack' : 'Stack', icon: 'pill' },
            { key: 'schedule' as const, label: lang === 'de' ? 'Tagesplan' : 'Piano giornaliero', icon: 'clock-outline' },
            { key: 'phases' as const, label: lang === 'de' ? 'Wochenplan' : 'Piano settimanale', icon: 'calendar-week' },
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

        {/* Stack Tab */}
        {activeTab === 'stack' && plan.stack?.map((s: any) => (
          <TouchableOpacity
            key={s.id}
            style={styles.supplementCard}
            onPress={() => setExpandedItem(expandedItem === s.id ? null : s.id)}
            activeOpacity={0.8}
          >
            <View style={styles.supplementHeader}>
              <View style={[styles.riskDot, { backgroundColor: RISK_COLORS[s.risk_level] || '#10B981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.supplementName}>{s.name}</Text>
                <Text style={styles.supplementDosage}>{s.dosage} {s.unit} - {s.timing_label} - {s.with_food_label}</Text>
              </View>
              <MaterialCommunityIcons name={expandedItem === s.id ? 'chevron-up' : 'chevron-down'} size={24} color="#8FA39B" />
            </View>

            {expandedItem === s.id && (
              <View style={styles.supplementDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="flask" size={16} color="#4A8B71" />
                  <Text style={styles.detailLabel}>{lang === 'de' ? 'Warum empfohlen' : 'Perche raccomandato'}</Text>
                </View>
                <Text style={styles.detailText}>{s.reason}</Text>

                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="school" size={16} color="#4A8B71" />
                  <Text style={styles.detailLabel}>{lang === 'de' ? 'Evidenz' : 'Evidenza'}</Text>
                </View>
                <Text style={styles.detailText}>{s.evidence_label}</Text>

                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="timer-sand" size={16} color="#4A8B71" />
                  <Text style={styles.detailLabel}>{lang === 'de' ? 'Wirkungseintritt' : 'Inizio effetto'}</Text>
                </View>
                <Text style={styles.detailText}>{s.onset_label}</Text>

                {s.synergies?.length > 0 && (
                  <>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="link-variant" size={16} color="#4A8B71" />
                      <Text style={styles.detailLabel}>{lang === 'de' ? 'Synergien mit' : 'Sinergie con'}</Text>
                    </View>
                    <Text style={styles.detailText}>{s.synergies.join(', ')}</Text>
                  </>
                )}

                {s.side_effects?.length > 0 && (
                  <>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#F59E0B" />
                      <Text style={styles.detailLabel}>{lang === 'de' ? 'Moegliche Nebenwirkungen' : 'Possibili effetti collaterali'}</Text>
                    </View>
                    {s.side_effects.map((se: string, i: number) => (
                      <Text key={i} style={styles.sideEffectText}>{se}</Text>
                    ))}
                  </>
                )}

                {s.med_warnings?.length > 0 && (
                  <>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="medical-bag" size={16} color="#DC2626" />
                      <Text style={[styles.detailLabel, { color: '#DC2626' }]}>
                        {lang === 'de' ? 'Medikamenten-Interaktion' : 'Interazione farmacologica'}
                      </Text>
                    </View>
                    {s.med_warnings.map((mw: any, i: number) => (
                      <Text key={i} style={styles.medWarningText}>{mw.warning_de}</Text>
                    ))}
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}

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
                  {items.map((item: any) => (
                    <View key={item.id} style={styles.scheduleItem}>
                      <MaterialCommunityIcons name="pill" size={18} color="#5C7A6F" />
                      <Text style={styles.scheduleItemName}>{item.name}</Text>
                      <Text style={styles.scheduleItemDose}>{item.dosage} {item.unit}</Text>
                    </View>
                  ))}
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

        {/* Disclaimer */}
        <Text style={styles.disclaimerText}>
          {lang === 'de'
            ? 'Dieser Plan ersetzt keine aerztliche Beratung. Bei Beschwerden oder Unsicherheiten konsultieren Sie bitte einen Arzt oder Apotheker.'
            : 'Questo piano non sostituisce una consulenza medica. In caso di disturbi o dubbi consultare un medico o farmacista.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
