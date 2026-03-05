import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, StyleSheet
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useLang } from '../src/LangContext';
import { profileStyles as styles } from '../components/profile/profileStyles';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const RISK_COLORS: Record<string, string> = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
const RISK_BG: Record<string, string> = { high: '#FEF2F2', medium: '#FFFBEB', low: '#F0FDF4' };
const NUTRIENT_ICONS: Record<string, string> = {
  iron: 'water', zinc: 'shield-outline', omega3: 'fish',
  vitamin_d: 'white-balance-sunny', vitamin_b12: 'lightning-bolt',
  vitamin_c: 'fruit-citrus', magnesium: 'flash', calcium: 'bone',
  folate: 'leaf', iodine: 'flask', selenium: 'atom',
  b_vitamins: 'pill', vitamin_k2: 'heart-pulse', vitamin_e: 'shield-star',
  coq10: 'battery-charging', probiotics: 'bacteria',
};

const NUTRIENT_NAMES: Record<string, Record<string, string>> = {
  iron: { de: 'Eisen', it: 'Ferro' },
  zinc: { de: 'Zink', it: 'Zinco' },
  omega3: { de: 'Omega-3', it: 'Omega-3' },
  vitamin_d: { de: 'Vitamin D', it: 'Vitamina D' },
  vitamin_b12: { de: 'Vitamin B12', it: 'Vitamina B12' },
  vitamin_c: { de: 'Vitamin C', it: 'Vitamina C' },
  magnesium: { de: 'Magnesium', it: 'Magnesio' },
  calcium: { de: 'Calcium', it: 'Calcio' },
  folate: { de: 'Folat', it: 'Folato' },
  iodine: { de: 'Jod', it: 'Iodio' },
  selenium: { de: 'Selen', it: 'Selenio' },
  b_vitamins: { de: 'B-Vitamine', it: 'Vitamine B' },
  vitamin_k2: { de: 'Vitamin K2', it: 'Vitamina K2' },
  vitamin_e: { de: 'Vitamin E', it: 'Vitamina E' },
  coq10: { de: 'Coenzym Q10', it: 'Coenzima Q10' },
  probiotics: { de: 'Probiotika', it: 'Probiotici' },
};

const PRIORITY_NAMES: Record<string, Record<string, string>> = {
  sleep: { de: 'Schlaf', it: 'Sonno' },
  stress: { de: 'Stress', it: 'Stress' },
  nutrition: { de: 'Ernaehrung', it: 'Alimentazione' },
  exercise: { de: 'Bewegung', it: 'Esercizio' },
  hydration: { de: 'Fluessigkeit', it: 'Idratazione' },
};

/* ── SVG helpers ── */
function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  // sweep=0 since going from higher angle to lower angle through top
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

/* ── BMI Gauge Component ── */
function BMIGauge({ bmi }: { bmi: number }) {
  const size = 130;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const r = 48;
  const sw = 10;

  // BMI 15-35 mapped to 180°-0° (left to right, through top)
  const bmiToAngle = (v: number) => 180 - ((Math.max(15, Math.min(35, v)) - 15) / 20) * 180;

  // Segment boundaries
  const segments = [
    { from: 15, to: 18.5, color: '#F59E0B' },   // underweight - amber
    { from: 18.5, to: 25, color: '#10B981' },    // normal - green
    { from: 25, to: 30, color: '#F59E0B' },      // overweight - amber
    { from: 30, to: 35, color: '#EF4444' },      // obese - red
  ];

  const needleAngle = bmiToAngle(bmi);
  const needleTip = polarToXY(cx, cy, r - 6, needleAngle);
  const needleBase = polarToXY(cx, cy, 8, needleAngle);

  return (
    <Svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
      {/* Background arc */}
      <Path
        d={arcPath(cx, cy, r, 180, 0)}
        stroke="#E8EDEA"
        strokeWidth={sw + 2}
        fill="none"
        strokeLinecap="round"
      />
      {/* Colored segments */}
      {segments.map((seg, i) => (
        <Path
          key={i}
          d={arcPath(cx, cy, r, bmiToAngle(seg.from), bmiToAngle(seg.to))}
          stroke={seg.color}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      {/* Needle */}
      <Path
        d={`M ${needleBase.x} ${needleBase.y} L ${needleTip.x} ${needleTip.y}`}
        stroke="#1A2D26"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Center dot */}
      <SvgCircle cx={cx} cy={cy} r={4} fill="#1A2D26" />
    </Svg>
  );
}

/* ── Gradient Slider Component ── */
function GradientSlider({
  value,
  max,
  colors,
  leftLabel,
  rightLabel,
}: {
  value: number;
  max: number;
  colors: string[];
  leftLabel: string;
  rightLabel: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <View style={styles.sliderWrap}>
      <View style={styles.sliderTrack}>
        <LinearGradient
          colors={colors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 8, borderRadius: 4 }}
        />
        <View style={[styles.sliderHandle, { left: `${Math.max(2, Math.min(92, pct))}%` as any }]} />
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{leftLabel}</Text>
        <Text style={styles.sliderLabel}>{rightLabel}</Text>
      </View>
    </View>
  );
}

/* ── Status helpers ── */
function getStressStatus(level: number, lang: string) {
  if (level <= 3) return { label: lang === 'de' ? 'Niedrig' : 'Basso', color: '#10B981', bg: '#F0FDF4', icon: 'emoticon-happy-outline' as const };
  if (level <= 6) return { label: lang === 'de' ? 'Mittel' : 'Medio', color: '#F59E0B', bg: '#FFFBEB', icon: 'emoticon-neutral-outline' as const };
  return { label: lang === 'de' ? 'Hoch' : 'Alto', color: '#EF4444', bg: '#FEF2F2', icon: 'emoticon-sad-outline' as const };
}

function getSleepStatus(quality: number, lang: string) {
  if (quality <= 3) return { label: lang === 'de' ? 'Schlecht' : 'Scarso', color: '#EF4444', bg: '#FEF2F2', icon: 'weather-night' as const };
  if (quality <= 6) return { label: lang === 'de' ? 'Mittel' : 'Medio', color: '#F59E0B', bg: '#FFFBEB', icon: 'moon-waning-crescent' as const };
  return { label: lang === 'de' ? 'Gut' : 'Buono', color: '#10B981', bg: '#F0FDF4', icon: 'moon-waning-crescent' as const };
}

/* ── Main Screen ── */
export default function HealthProfileScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const id = await AsyncStorage.getItem('health_profile_id');
      if (!id) { setLoading(false); return; }
      setProfileId(id);
      const [profRes, planRes] = await Promise.all([
        fetch(`${API_URL}/api/health-profile/${id}`),
        fetch(`${API_URL}/api/supplement-plan/${id}`),
      ]);
      if (profRes.ok) {
        const data = await profRes.json();
        setProfile(data.profile);
        setAssessment(data.assessment);
      }
      setHasPlan(planRes.ok);
    } catch (e) {
      console.error('Load profile error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4A8B71" />
      </SafeAreaView>
    );
  }

  if (!profile || !assessment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="account-heart-outline" size={64} color="#8FA39B" />
          <Text style={styles.emptyTitle}>
            {lang === 'de' ? 'Kein Profil vorhanden' : 'Nessun profilo disponibile'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {lang === 'de' ? 'Starten Sie den Gesundheits-Check, um Ihr persoenliches Profil zu erstellen.' : 'Avvia il check salute per creare il tuo profilo personale.'}
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/onboarding')} data-testid="start-onboarding-btn">
            <Text style={styles.ctaBtnText}>{lang === 'de' ? 'Gesundheits-Check starten' : 'Avvia check salute'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const bmi = assessment.bmi;
  const bmiCategory = bmi < 18.5 ? (lang === 'de' ? 'Untergewicht' : 'Sottopeso')
    : bmi < 25 ? (lang === 'de' ? 'Normalgewicht' : 'Normopeso')
    : bmi < 30 ? (lang === 'de' ? 'Uebergewicht' : 'Sovrappeso')
    : (lang === 'de' ? 'Adipositas' : 'Obesita');
  const bmiColor = bmi < 18.5 ? '#F59E0B' : bmi < 25 ? '#10B981' : bmi < 30 ? '#F59E0B' : '#EF4444';

  const dietLabels: Record<string, Record<string, string>> = {
    omnivore: { de: 'Mischkost', it: 'Onnivoro' },
    vegetarian: { de: 'Vegetarisch', it: 'Vegetariano' },
    vegan: { de: 'Vegan', it: 'Vegano' },
    pescatarian: { de: 'Pescetarisch', it: 'Pescetariano' },
    keto: { de: 'Ketogen', it: 'Chetogenica' },
    paleo: { de: 'Paleo', it: 'Paleo' },
    mediterranean: { de: 'Mediterran', it: 'Mediterranea' },
  };

  const genderLabels: Record<string, Record<string, string>> = {
    male: { de: 'Maennlich', it: 'Maschio' },
    female: { de: 'Weiblich', it: 'Femmina' },
    diverse: { de: 'Divers', it: 'Diverso' },
  };

  const deficiencies = (assessment.deficiencies || []).sort((a: any, b: any) => b.score - a.score);
  const highRisk = deficiencies.filter((d: any) => d.risk_level === 'high');
  const medRisk = deficiencies.filter((d: any) => d.risk_level === 'medium');
  const lowRisk = deficiencies.filter((d: any) => d.risk_level === 'low');

  const stressStatus = getStressStatus(profile.stress_level || 5, lang);
  const sleepStatus = getSleepStatus(profile.sleep_quality || 5, lang);
  const initials = (profile.first_name || 'U').charAt(0).toUpperCase();

  // Nutrition quality segments (visual representation)
  const nutritionColors = ['#EF4444', '#F59E0B', '#FBBF24', '#84CC16', '#10B981'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} data-testid="back-btn">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {lang === 'de' ? 'Gesundheitsprofil' : 'Profilo salute'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ═══ 2x2 Card Grid ═══ */}

        {/* Row 1: Profile + BMI */}
        <View style={styles.gridRow}>
          {/* Card 1: Gesundheitsprofil */}
          <View style={styles.gridCard} data-testid="profile-card">
            <Text style={styles.gridCardTitle}>
              {lang === 'de' ? 'Gesundheitsprofil' : 'Profilo salute'}
            </Text>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
            <View style={styles.profileInfoRow}>
              <View style={styles.profileInfoIcon}>
                <MaterialCommunityIcons name="account" size={14} color="#4A8B71" />
              </View>
              <Text style={styles.profileInfoText}>
                {lang === 'de' ? 'Alter' : 'Eta'}: {profile.age} {lang === 'de' ? 'Jahre' : 'Anni'}
              </Text>
            </View>
            <View style={styles.profileInfoRow}>
              <View style={styles.profileInfoIcon}>
                <MaterialCommunityIcons name="human" size={14} color="#4A8B71" />
              </View>
              <Text style={styles.profileInfoText}>
                {genderLabels[profile.gender]?.[lang] || profile.gender}
              </Text>
            </View>
            <View style={styles.profileInfoRow}>
              <View style={styles.profileInfoIcon}>
                <MaterialCommunityIcons name="food-apple" size={14} color="#10B981" />
              </View>
              <Text style={styles.profileInfoText}>
                {dietLabels[profile.diet]?.[lang] || profile.diet}
              </Text>
            </View>
            <View style={styles.nutritionBarWrap}>
              <Text style={styles.nutritionLabel}>
                {lang === 'de' ? 'Ernaehrung' : 'Alimentazione'}
              </Text>
              <View style={styles.nutritionBar}>
                {nutritionColors.map((c, i) => (
                  <View key={i} style={[styles.nutritionSeg, { backgroundColor: c, opacity: i < 3 ? 1 : 0.4 }]} />
                ))}
              </View>
            </View>
          </View>

          {/* Card 2: BMI Wert */}
          <View style={styles.gridCard} data-testid="bmi-card">
            <Text style={styles.gridCardTitle}>BMI Wert</Text>
            <View style={styles.bmiGaugeWrap}>
              <BMIGauge bmi={bmi} />
            </View>
            <Text style={styles.bmiValue}>{bmi}</Text>
            <View style={styles.bmiCategoryRow}>
              <Text style={[styles.bmiCatLabel, bmi < 18.5 && styles.bmiCatLabelActive]}>
                {lang === 'de' ? 'Zu niedrig' : 'Troppo basso'}
              </Text>
              <Text style={[styles.bmiCatLabel, bmi >= 18.5 && bmi < 25 && styles.bmiCatLabelActive, { color: bmi >= 18.5 && bmi < 25 ? '#10B981' : '#8FA39B' }]}>
                Normal
              </Text>
              <Text style={[styles.bmiCatLabel, bmi >= 25 && styles.bmiCatLabelActive]}>
                {lang === 'de' ? 'Zu hoch' : 'Troppo alto'}
              </Text>
            </View>
            <View style={[styles.bmiBadge, { backgroundColor: bmiColor + '15' }]}>
              <MaterialCommunityIcons name="shield-check" size={14} color={bmiColor} />
              <Text style={[styles.bmiBadgeText, { color: bmiColor }]}>{bmiCategory}</Text>
            </View>
          </View>
        </View>

        {/* Row 2: Stress + Sleep */}
        <View style={styles.gridRow}>
          {/* Card 3: Stresslevel */}
          <View style={styles.gridCard} data-testid="stress-card">
            <Text style={styles.gridCardTitle}>Stresslevel</Text>
            <View style={styles.statusIconWrap}>
              <MaterialCommunityIcons name={stressStatus.icon} size={44} color={stressStatus.color} />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: stressStatus.color }]}>
              <Text style={styles.statusBadgeText}>{stressStatus.label}</Text>
            </View>
            <GradientSlider
              value={profile.stress_level || 5}
              max={10}
              colors={['#10B981', '#84CC16', '#FBBF24', '#F59E0B', '#EF4444']}
              leftLabel={lang === 'de' ? 'Niedrig' : 'Basso'}
              rightLabel={lang === 'de' ? 'Hoch' : 'Alto'}
            />
          </View>

          {/* Card 4: Schlafqualitaet */}
          <View style={styles.gridCard} data-testid="sleep-card">
            <Text style={styles.gridCardTitle}>
              {lang === 'de' ? 'Schlafqualitaet' : 'Qualita del sonno'}
            </Text>
            <View style={styles.statusIconWrap}>
              <MaterialCommunityIcons name={sleepStatus.icon} size={44} color={sleepStatus.color} />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: sleepStatus.color }]}>
              <Text style={styles.statusBadgeText}>{sleepStatus.label}</Text>
            </View>
            <GradientSlider
              value={profile.sleep_quality || 5}
              max={10}
              colors={['#EF4444', '#F59E0B', '#FBBF24', '#84CC16', '#10B981']}
              leftLabel={lang === 'de' ? 'Schlecht' : 'Scarso'}
              rightLabel={lang === 'de' ? 'Gut' : 'Buono'}
            />
          </View>
        </View>

        {/* ═══ Existing Sections ═══ */}

        {/* Warnings */}
        {assessment.warnings?.length > 0 && (
          <View style={styles.warningCard}>
            <MaterialCommunityIcons name="alert" size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              {assessment.warnings.map((w: string, i: number) => (
                <Text key={i} style={styles.warningText}>{w}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Risk Overview */}
        <View style={styles.riskOverview}>
          <Text style={styles.sectionTitle}>
            {lang === 'de' ? 'Naehrstoff-Risikobewertung' : 'Valutazione rischio nutrienti'}
          </Text>
          <View style={styles.riskSummary}>
            <View style={[styles.riskBadge, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.riskBadgeNum, { color: '#EF4444' }]}>{highRisk.length}</Text>
              <Text style={styles.riskBadgeLabel}>{lang === 'de' ? 'Hoch' : 'Alto'}</Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: '#FFFBEB' }]}>
              <Text style={[styles.riskBadgeNum, { color: '#F59E0B' }]}>{medRisk.length}</Text>
              <Text style={styles.riskBadgeLabel}>{lang === 'de' ? 'Mittel' : 'Medio'}</Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[styles.riskBadgeNum, { color: '#10B981' }]}>{lowRisk.length}</Text>
              <Text style={styles.riskBadgeLabel}>{lang === 'de' ? 'Niedrig' : 'Basso'}</Text>
            </View>
          </View>
        </View>

        {/* Deficiency Cards with CTAs */}
        {deficiencies.map((d: any) => (
          <View key={d.nutrient} style={[styles.defCard, { backgroundColor: RISK_BG[d.risk_level] || '#F0FDF4', borderLeftColor: RISK_COLORS[d.risk_level] || '#10B981' }]}>
            <View style={styles.defHeader}>
              <MaterialCommunityIcons name={(NUTRIENT_ICONS[d.nutrient] || 'circle') as any} size={22} color={RISK_COLORS[d.risk_level] || '#10B981'} />
              <Text style={styles.defName}>{NUTRIENT_NAMES[d.nutrient]?.[lang] || d.nutrient_name || d.nutrient}</Text>
              <View style={[styles.defRiskTag, { backgroundColor: RISK_COLORS[d.risk_level] || '#10B981' }]}>
                <Text style={styles.defRiskText}>
                  {d.risk_level === 'high' ? (lang === 'de' ? 'HOCH' : 'ALTO')
                    : d.risk_level === 'medium' ? (lang === 'de' ? 'MITTEL' : 'MEDIO')
                    : (lang === 'de' ? 'NIEDRIG' : 'BASSO')}
                </Text>
              </View>
            </View>
            {d.reasons?.length > 0 && (
              <Text style={styles.defReason}>{d.reasons.join(', ')}</Text>
            )}
            {(d.risk_level === 'high' || d.risk_level === 'medium') && (
              <View style={ctaStyles.ctaWrap}>
                <TouchableOpacity
                  data-testid={`cta-plan-${d.nutrient}`}
                  style={[ctaStyles.primaryBtn, { backgroundColor: d.risk_level === 'high' ? '#EF4444' : '#F59E0B' }]}
                  onPress={() => router.push({ pathname: '/supplement-plan', params: { profileId: profileId || '' } })}
                >
                  <MaterialCommunityIcons name="clipboard-check-outline" size={15} color="#FFF" />
                  <Text style={ctaStyles.primaryBtnText}>
                    {lang === 'de' ? 'Optimierungsplan anzeigen' : 'Mostra piano ottimizzazione'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  data-testid={`cta-products-${d.nutrient}`}
                  style={[ctaStyles.secondaryBtn, { borderColor: d.risk_level === 'high' ? '#EF4444' : '#F59E0B' }]}
                  onPress={() => router.push({ pathname: '/product-comparison', params: { nutrient: d.nutrient, risk: d.risk_level } })}
                >
                  <MaterialCommunityIcons name="shopping-outline" size={15} color={d.risk_level === 'high' ? '#EF4444' : '#F59E0B'} />
                  <Text style={[ctaStyles.secondaryBtnText, { color: d.risk_level === 'high' ? '#EF4444' : '#F59E0B' }]}>
                    {d.risk_level === 'high'
                      ? (lang === 'de' ? `Optimale ${NUTRIENT_NAMES[d.nutrient]?.[lang] || d.nutrient}-Quelle finden` : `Trova fonte ottimale di ${NUTRIENT_NAMES[d.nutrient]?.[lang] || d.nutrient}`)
                      : (lang === 'de' ? 'Qualitaetsgepruefte Optionen vergleichen' : 'Confronta opzioni certificate')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Priority Areas */}
        {assessment.priority_areas?.length > 0 && (
          <View style={styles.prioritySection}>
            <Text style={styles.sectionTitle}>
              {lang === 'de' ? 'Handlungsfelder' : 'Aree di azione'}
            </Text>
            {assessment.priority_areas.map((area: any, i: number) => (
              <View key={i} style={styles.priorityCard}>
                <MaterialCommunityIcons name="target" size={20} color="#4A8B71" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.priorityTitle}>{PRIORITY_NAMES[area.area]?.[lang] || area.area}</Text>
                  {area.recommendation && (
                    <Text style={styles.priorityDesc}>{area.recommendation}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {hasPlan ? (
            <TouchableOpacity
              data-testid="view-supplement-plan-btn"
              style={styles.ctaBtn}
              onPress={() => router.push({ pathname: '/supplement-plan', params: { profileId: profileId || '' } })}
            >
              <MaterialCommunityIcons name="pill" size={20} color="#FFFFFF" />
              <Text style={styles.ctaBtnText}>
                {'  '}{lang === 'de' ? 'Supplement-Plan anzeigen' : 'Mostra piano supplementi'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              data-testid="create-supplement-plan-btn"
              style={styles.ctaBtn}
              onPress={() => router.push({ pathname: '/supplement-plan', params: { profileId: profileId || '' } })}
            >
              <MaterialCommunityIcons name="creation" size={20} color="#FFFFFF" />
              <Text style={styles.ctaBtnText}>
                {'  '}{lang === 'de' ? 'Supplement-Plan erstellen' : 'Crea piano supplementi'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            data-testid="redo-onboarding-btn"
            style={styles.secondaryBtn}
            onPress={() => router.push('/onboarding')}
          >
            <MaterialCommunityIcons name="refresh" size={18} color="#4A8B71" />
            <Text style={styles.secondaryBtnText}>
              {'  '}{lang === 'de' ? 'Gesundheits-Check wiederholen' : 'Ripeti check salute'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimerText}>
          {lang === 'de'
            ? 'Diese Analyse ersetzt keine aerztliche Beratung. Bei Beschwerden konsultieren Sie bitte einen Arzt.'
            : 'Questa analisi non sostituisce una consulenza medica. In caso di disturbi consultare un medico.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const ctaStyles = StyleSheet.create({
  ctaWrap: { marginTop: 10, gap: 8 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
  },
  primaryBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: '#FFF', borderWidth: 1.5,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600' },
});
