import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Linking, Alert, StyleSheet, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio'; // kept for potential future use
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useLang } from '../src/LangContext';
import { tx } from '../src/i18n';
import { planStyles as styles } from '../components/supplement/planStyles';
import { InteractionAnalysis } from '../components/supplement/InteractionAnalysis';
import { EmailExportModal } from '../components/supplement/EmailExportModal';

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
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const { lang } = useLang();
  const params = useLocalSearchParams<{ profileId: string }>();
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(params.profileId || null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'stack' | 'phases' | 'interactions'>('stack');
  const [products, setProducts] = useState<any[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [pricingMap, setPricingMap] = useState<Record<string, { avg_per_day: number; min_per_day: number; max_per_day: number; product_count: number }>>({});

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
            {tx(lang, { de: 'Supplement-Plan erstellen', it: 'Crea piano integratori', en: 'Create supplement plan', tr: 'Takviye plani olustur', fr: 'Creer un plan de supplements', es: 'Crear plan de suplementos', ru: 'Sozdat plan dobavok' })}
          </Text>
          <Text style={styles.emptySubtitle}>
            {tx(lang, { de: 'Basierend auf Ihrem Gesundheitsprofil erstellen wir Ihren personalisierten 8-Wochen-Plan.', it: 'In base al tuo profilo salute creiamo il tuo piano personalizzato di 8 settimane.', en: 'Based on your health profile we create your personalized 8-week plan.', tr: 'Saglik profilinize gore 8 haftalik kisisel planinizi olusturuyoruz.', fr: 'Sur la base de votre profil sante nous creons votre plan personnalise de 8 semaines.', es: 'Basandonos en su perfil de salud creamos su plan personalizado de 8 semanas.', ru: 'Na osnove vashego profilya zdorovya my sozdaem vash personalnyj 8-nedelnij plan.' })}
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
                  {tx(lang, { de: 'Plan generieren', it: 'Genera piano', en: 'Generate plan', tr: 'Plan olustur', fr: 'Generer le plan', es: 'Generar plan', ru: 'Sgenerirovat plan' })}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {canGoBack && (
            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>{tx(lang, { de: 'Zurueck', it: 'Indietro', en: 'Back', tr: 'Geri', fr: 'Retour', es: 'Atras', ru: 'Nazad' })}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#1B6B45', '#2E9E6B', '#43C68A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ns.gradientHeader}
        >
          {canGoBack && (
            <TouchableOpacity onPress={() => router.back()} style={ns.headerBackBtn} testID="plan-back-btn">
              <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={ns.headerGreeting}>
              {firstName
                ? (tx(lang, { de: `Hallo ${firstName}`, it: `Ciao ${firstName}`, en: `Hello ${firstName}`, tr: `Merhaba ${firstName}`, fr: `Bonjour ${firstName}`, es: `Hola ${firstName}`, ru: `Privet ${firstName}` }))
                : (tx(lang, { de: 'Hallo', it: 'Ciao', en: 'Hello', tr: 'Merhaba', fr: 'Bonjour', es: 'Hola', ru: 'Privet' }))}
            </Text>
            <Text style={ns.headerSubtitle}>
              {tx(lang, { de: 'Dein Supplement-Plan fuer heute', it: 'Il tuo piano integratori per oggi', en: 'Your supplement plan for today', tr: 'Bugunun takviye plani', fr: 'Votre plan de supplements pour aujourd'hui', es: 'Tu plan de suplementos para hoy', ru: 'Vash plan dobavok na segodnya' })}
            </Text>
          </View>
          <MaterialCommunityIcons name="white-balance-sunny" size={36} color="#FFD54F" />
          <TouchableOpacity onPress={() => setShowEmailModal(true)} style={ns.headerIconBtn} testID="email-export-btn">
            <MaterialCommunityIcons name="email-fast-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Personal Summary */}
        {plan.personal_summary && (
          <View style={styles.summaryCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="account-heart" size={24} color="#4A8B71" />
            </View>
            <Text style={styles.summaryText}>{plan.personal_summary}</Text>
          </View>
        )}

        {/* Warnings */}
        {plan.warnings?.length > 0 && (
          <View style={styles.warningsCard}>
            <Text style={styles.warningsTitle}>
              <MaterialCommunityIcons name="alert" size={18} color="#DC2626" />
              {' '}{tx(lang, { de: 'Wichtige Hinweise', it: 'Note importanti', en: 'Important notes', tr: 'Onemli notlar', fr: 'Notes importantes', es: 'Notas importantes', ru: 'Vazhnye zamechaniya' })}
            </Text>
            {plan.warnings.map((w: string, i: number) => (
              <Text key={i} style={styles.warningText}>{w}</Text>
            ))}
          </View>
        )}

        {/* Reminder Settings */}
        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: 'stack' as const, label: tx(lang, { de: 'Stack', it: 'Stack', en: 'Stack', tr: 'Stack', fr: 'Stack', es: 'Stack', ru: 'Stack' }), icon: 'pill' },
            { key: 'phases' as const, label: tx(lang, { de: 'Wochen', it: 'Settimane', en: 'Weeks', tr: 'Hafta', fr: 'Semaines', es: 'Semanas', ru: 'Nedel' }), icon: 'calendar-week' },
            { key: 'interactions' as const, label: tx(lang, { de: 'Analyse', it: 'Analisi', en: 'Analysis', tr: 'Analiz', fr: 'Analyse', es: 'Analisis', ru: 'Analiz' }), icon: 'shield-search' },
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
            ? (tx(lang, { de: 'HOCH', it: 'ALTO', en: 'HIGH', tr: 'YUKSEK', fr: 'ELEVE', es: 'ALTO', ru: 'VYSOKIJ' }))
            : s.risk_level === 'medium' ? (tx(lang, { de: 'MITTEL', it: 'MEDIO', en: 'MEDIUM', tr: 'ORTA', fr: 'MOYEN', es: 'MEDIO', ru: 'SREDNIJ' }))
            : (tx(lang, { de: 'NIEDRIG', it: 'BASSO', en: 'LOW', tr: 'DUSUK', fr: 'FAIBLE', es: 'BAJO', ru: 'NIZKIJ' }));
          const evColor = s.evidence_level === 'high' ? '#16A34A' : s.evidence_level === 'medium' ? '#D97706' : '#EA580C';
          const evBg = s.evidence_level === 'high' ? '#DCFCE7' : s.evidence_level === 'medium' ? '#FEF3C7' : '#FFEDD5';
          const evIcon = s.evidence_level === 'high' ? 'check-decagram' : s.evidence_level === 'medium' ? 'flask-outline' : 'magnify';
          const evLabel = s.evidence_level === 'high'
            ? (tx(lang, { de: 'Hohe Evidenz', it: 'Alta evidenza', en: 'High evidence', tr: 'Yuksek kanit', fr: 'Evidence elevee', es: 'Alta evidencia', ru: 'Vysokie dokazatelstva' }))
            : s.evidence_level === 'medium'
            ? (tx(lang, { de: 'Mittlere Evidenz', it: 'Media evidenza', en: 'Moderate evidence', tr: 'Orta kanit', fr: 'Evidence moderee', es: 'Evidencia moderada', ru: 'Srednie dokazatelstva' }))
            : (tx(lang, { de: 'Explorativ', it: 'Esplorativo', en: 'Exploratory', tr: 'Kesfedici', fr: 'Exploratoire', es: 'Exploratorio', ru: 'Issledovatelskij' }));
          const timingIcon = s.timing === 'morning' ? 'weather-sunny' : s.timing === 'evening' ? 'weather-night' : 'weather-partly-cloudy';

          return (
            <View key={s.id} style={ms.card} data-testid={`supplement-card-${s.id}`}>
              {/* 1. Header: Name + Status */}
              <View style={ms.cardHeader}>
                <View style={[ms.statusStripe, { backgroundColor: riskColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={ms.supplementNum}>{tx(lang, { de: `Supplement ${idx + 1}/${plan.stack.length}`, it: `Supplemento ${idx + 1}/${plan.stack.length}`, en: `Supplement ${idx + 1}/${plan.stack.length}`, tr: `Takviye ${idx + 1}/${plan.stack.length}`, fr: `Supplement ${idx + 1}/${plan.stack.length}`, es: `Suplemento ${idx + 1}/${plan.stack.length}`, ru: `Dobavka ${idx + 1}/${plan.stack.length}` })}</Text>
                  <Text style={ms.supplementName}>{s.name}</Text>
                </View>
                <View style={[ms.statusBadge, { backgroundColor: riskBg, borderColor: riskColor }]}>
                  <View style={[ms.statusDot, { backgroundColor: riskColor }]} />
                  <Text style={[ms.statusText, { color: riskColor }]}>{riskLabel}</Text>
                </View>
              </View>

              {/* 2. Wirkung */}
              <View style={ms.section}>
                <Text style={ms.sectionLabel}>{tx(lang, { de: 'WIRKUNG', it: 'EFFETTO', en: 'EFFECT', tr: 'ETKI', fr: 'EFFET', es: 'EFECTO', ru: 'DEJSTVIE' })}</Text>
                <Text style={ms.effectText}>{s.reason}</Text>
              </View>

              {/* 3. Warum empfohlen */}
              {s.recommendation_reasons?.length > 0 && (
                <View style={ms.section}>
                  <Text style={ms.sectionLabel}>{tx(lang, { de: 'WARUM EMPFOHLEN', it: 'PERCHE CONSIGLIATO', en: 'WHY RECOMMENDED', tr: 'NEDEN ONERILIYOR', fr: 'POURQUOI RECOMMANDE', es: 'POR QUE RECOMENDADO', ru: 'POCHEMU REKOMENDOVANO' })}</Text>
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
                  <Text style={ms.dataCellLabel}>{tx(lang, { de: 'Dosierung', it: 'Dosaggio', en: 'Dosage', tr: 'Dozaj', fr: 'Dosage', es: 'Dosis', ru: 'Dozirovka' })}</Text>
                  <Text style={ms.dataCellValue}>{s.dosage} {s.unit}</Text>
                </View>
                {/* Einnahmezeitpunkt */}
                <View style={ms.dataCell}>
                  <MaterialCommunityIcons name={timingIcon as any} size={16} color="#4A8B71" />
                  <Text style={ms.dataCellLabel}>{tx(lang, { de: 'Einnahme', it: 'Assunzione', en: 'Intake', tr: 'Alim', fr: 'Prise', es: 'Toma', ru: 'Priem' })}</Text>
                  <Text style={ms.dataCellValue}>{s.timing_label}</Text>
                  <Text style={ms.dataCellSub}>{s.with_food_label}</Text>
                </View>
                {/* Evidenz */}
                <View style={[ms.dataCell, { backgroundColor: evBg }]}>
                  <MaterialCommunityIcons name={evIcon as any} size={16} color={evColor} />
                  <Text style={ms.dataCellLabel}>{tx(lang, { de: 'Evidenz', it: 'Evidenza', en: 'Evidence', tr: 'Kanit', fr: 'Evidence', es: 'Evidencia', ru: 'Dokazatelstva' })}</Text>
                  <Text style={[ms.dataCellValue, { color: evColor }]}>{evLabel}</Text>
                </View>
                {/* Wirkungseintritt */}
                <View style={ms.dataCell}>
                  <MaterialCommunityIcons name="timer-sand" size={16} color="#4A8B71" />
                  <Text style={ms.dataCellLabel}>{tx(lang, { de: 'Wirkung ab', it: 'Effetto da', en: 'Effect from', tr: 'Etki baslangici', fr: 'Effet a partir de', es: 'Efecto desde', ru: 'Dejstvie s' })}</Text>
                  <Text style={ms.dataCellValue}>{s.onset_weeks} {tx(lang, { de: 'Wo.', it: 'Sett.', en: 'Wk.', tr: 'Hf.', fr: 'Sem.', es: 'Sem.', ru: 'Ned.' })}</Text>
                </View>
              </View>

              {/* 5. Synergies */}
              {s.synergies?.length > 0 && (
                <View style={ms.synRow}>
                  <MaterialCommunityIcons name="link-variant" size={14} color="#4A8B71" />
                  <Text style={ms.synLabel}>{tx(lang, { de: 'Synergie:', it: 'Sinergia:', en: 'Synergy:', tr: 'Sinerji:', fr: 'Synergie:', es: 'Sinergia:', ru: 'Sinergiya:' })}</Text>
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
                      ? (tx(lang, { de: `Optimale ${s.name?.split(' ')[0] || s.id}-Quelle finden`, it: `Trova fonte ottimale di ${s.name?.split(' ')[0] || s.id}`, en: `Optimale ${s.name?.split(' ')[0] || s.id}-Quelle finden` }))
                      : (tx(lang, { de: 'Qualitaetsgepruefte Optionen vergleichen', it: 'Confronta opzioni verificate', en: 'Compare quality-checked options', tr: 'Kalite kontrollu secenekleri karsilastir', fr: 'Comparer les options verifiees', es: 'Comparar opciones verificadas', ru: 'Sravnit proverennye varianty' }))
                  }</Text>
                </TouchableOpacity>
                {pricingMap[s.id] && (
                  <Text data-testid={`price-per-day-${s.id}`} style={ms.pricePerDay}>
                    {tx(lang, { de: `Preis pro Tag: ca. ${pricingMap[s.id].avg_per_day.toFixed(2).replace('.', ',')} \u20AC`, it: `Prezzo al giorno: ca. ${pricingMap[s.id].avg_per_day.toFixed(2).replace('.', ',')} \u20AC`, en: `Preis pro Tag: ca. ${pricingMap[s.id].avg_per_day.toFixed(2).replace('.', ',')} \u20AC` })}
                    {pricingMap[s.id].product_count > 1
                      ? ` (${pricingMap[s.id].product_count} ${tx(lang, { de: 'Produkte verglichen', it: 'Prodotti confrontati', en: 'Products compared', tr: 'Urunler karsilastirildi', fr: 'Produits compares', es: 'Productos comparados', ru: 'Produkty sravneny' })})`
                      : ''}
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        {/* Schedule Tab - New Tagesplan Design */}

        {/* Phases Tab */}
        {activeTab === 'phases' && plan.phases?.map((phase: any, i: number) => (
          <View key={i} style={styles.phaseCard}>
            <View style={styles.phaseHeader}>
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseBadgeText}>
                  {tx(lang, { de: `Woche ${phase.weeks}`, it: `Settimana ${phase.weeks}`, en: `Week ${phase.weeks}`, tr: `Hafta ${phase.weeks}`, fr: `Semaine ${phase.weeks}`, es: `Semana ${phase.weeks}`, ru: `Nedelya ${phase.weeks}` })}
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
          {tx(lang, { de: 'Dieser Plan ersetzt keine aerztliche Beratung. Bei Beschwerden oder Unsicherheiten konsultieren Sie bitte einen Arzt oder Apotheker.', it: 'Questo piano non sostituisce il consulto medico. In caso di disturbi consultare un medico o farmacista.', en: 'This plan does not replace medical advice. If in doubt please consult a doctor or pharmacist.', tr: 'Bu plan tibbi tavsiyenin yerini almaz. Sikayetleriniz varsa lutfen bir doktora veya eczaciya danisin.', fr: 'Ce plan ne remplace pas un avis medical. En cas de doute consultez un medecin ou pharmacien.', es: 'Este plan no reemplaza el consejo medico. En caso de dudas consulte a un medico o farmaceutico.', ru: 'Etot plan ne zamenyaet meditsinskuyu konsultatsiyu. Pri somnenii obratites k vrachu ili farmatsevtu.' })}
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
  reminderTimeText: { fontSize: 28, fontWeight: '800', color: '#1B6B45' },
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
    width: 70, fontSize: 16, fontWeight: '700', color: '#1B6B45',
    textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#1B6B45',
    paddingVertical: 4,
  },
  settingsBtnRow: { flexDirection: 'row', gap: 10 },
  settingsTestBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F0F4F2', borderRadius: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#1B6B45',
  },
  settingsTestBtnText: { fontSize: 13, fontWeight: '600', color: '#1B6B45' },
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
  timeValue: { fontSize: 15, fontWeight: '600', color: '#1B6B45' },
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
    backgroundColor: '#1B6B45', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    marginHorizontal: 14, marginBottom: 14,
  },
  showAllBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
});
