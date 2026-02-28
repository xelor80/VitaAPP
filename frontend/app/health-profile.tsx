import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/onboarding')}>
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {lang === 'de' ? 'Gesundheitsprofil' : 'Profilo salute'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Bio Card */}
        <View style={styles.bioCard}>
          <View style={styles.bioRow}>
            <View style={styles.bioItem}>
              <MaterialCommunityIcons name="account" size={20} color="#4A8B71" />
              <Text style={styles.bioValue}>{profile.age}</Text>
              <Text style={styles.bioLabel}>{lang === 'de' ? 'Jahre' : 'Anni'}</Text>
            </View>
            <View style={styles.bioItem}>
              <MaterialCommunityIcons name="human" size={20} color="#4A8B71" />
              <Text style={styles.bioValue}>{genderLabels[profile.gender]?.[lang] || profile.gender}</Text>
              <Text style={styles.bioLabel}>{lang === 'de' ? 'Geschlecht' : 'Genere'}</Text>
            </View>
            <View style={styles.bioItem}>
              <MaterialCommunityIcons name="food-apple" size={20} color="#4A8B71" />
              <Text style={styles.bioValue}>{dietLabels[profile.diet]?.[lang] || profile.diet}</Text>
              <Text style={styles.bioLabel}>{lang === 'de' ? 'Ernaehrung' : 'Dieta'}</Text>
            </View>
          </View>
          <View style={[styles.bioRow, { marginTop: 12 }]}>
            <View style={styles.bioItem}>
              <MaterialCommunityIcons name="scale-bathroom" size={20} color={bmiColor} />
              <Text style={[styles.bioValue, { color: bmiColor }]}>{bmi}</Text>
              <Text style={styles.bioLabel}>BMI - {bmiCategory}</Text>
            </View>
            <View style={styles.bioItem}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#F59E0B" />
              <Text style={styles.bioValue}>{profile.stress_level}/10</Text>
              <Text style={styles.bioLabel}>{lang === 'de' ? 'Stress' : 'Stress'}</Text>
            </View>
            <View style={styles.bioItem}>
              <MaterialCommunityIcons name="power-sleep" size={20} color="#6366F1" />
              <Text style={styles.bioValue}>{profile.sleep_quality}/10</Text>
              <Text style={styles.bioLabel}>{lang === 'de' ? 'Schlaf' : 'Sonno'}</Text>
            </View>
          </View>
        </View>

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

        {/* Deficiency Cards */}
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
