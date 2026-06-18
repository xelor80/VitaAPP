import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '../src/LangContext';
import { onboardingStyles as styles } from '../components/onboarding/onboardingStyles';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const STEPS = ['basic', 'lifestyle', 'stress', 'health', 'complaints', 'lab'];
const STEP_TITLES = {
  de: ['Basisdaten', 'Lebensstil', 'Stress & Energie', 'Gesundheit', 'Beschwerden', 'Labor (optional)'],
  it: ['Dati base', 'Stile di vita', 'Stress ed Energia', 'Salute', 'Disturbi', 'Laboratorio (opzionale)']
};

interface ProfileData {
  first_name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  diet: string;
  activity_level: string;
  work_type: string;
  shift_model: string;
  current_shift: string;
  sleep_quality: number;
  sleep_duration: string;
  sleep_issues: string[];
  stress_level: number;
  stress_type: string[];
  energy_level: number;
  conditions: string[];
  medications: string[];
  allergies: string[];
  complaints: { name: string; intensity: number }[];
  known_deficiencies: string[];
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '', age: '', gender: '', height: '', weight: '',
    diet: '', activity_level: '', work_type: '', shift_model: '', current_shift: '',
    sleep_quality: 7, sleep_duration: '7', sleep_issues: [],
    stress_level: 5, stress_type: [], energy_level: 5,
    conditions: [], medications: [], allergies: [],
    complaints: [], known_deficiencies: []
  });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/onboarding/options?lang=${lang}`);
      const data = await res.json();
      setOptions(data);
    } catch (e) {
      console.error('Error loading options:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (key: keyof ProfileData, value: string) => {
    const arr = profile[key] as string[];
    if (arr.includes(value)) {
      setProfile({ ...profile, [key]: arr.filter(v => v !== value) });
    } else {
      setProfile({ ...profile, [key]: [...arr, value] });
    }
  };

  const toggleComplaint = (name: string) => {
    const existing = profile.complaints.find(c => c.name === name);
    if (existing) {
      setProfile({ ...profile, complaints: profile.complaints.filter(c => c.name !== name) });
    } else {
      setProfile({ ...profile, complaints: [...profile.complaints, { name, intensity: 5 }] });
    }
  };

  const setComplaintIntensity = (name: string, intensity: number) => {
    setProfile({
      ...profile,
      complaints: profile.complaints.map(c => c.name === name ? { ...c, intensity } : c)
    });
  };

  const submitProfile = async () => {
    setSubmitting(true);
    try {
      const payload = {
        first_name: profile.first_name || null,
        age: parseInt(profile.age) || null,
        gender: profile.gender || null,
        height: parseFloat(profile.height) || null,
        weight: parseFloat(profile.weight) || null,
        diet: profile.diet || null,
        activity_level: profile.activity_level || null,
        sleep_quality: profile.sleep_quality,
        sleep_duration: parseFloat(profile.sleep_duration) || null,
        sleep_issues: profile.sleep_issues,
        stress_level: profile.stress_level,
        stress_type: profile.stress_type,
        energy_level: profile.energy_level,
        conditions: profile.conditions,
        medications: profile.medications,
        allergies: profile.allergies,
        complaints: profile.complaints,
        known_deficiencies: profile.known_deficiencies,
        work_type: profile.work_type || null,
        shift_model: profile.shift_model || null,
        current_shift: profile.current_shift || null,
        lang
      };

      const res = await fetch(`${API_URL}/api/health-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to submit profile');
      
      const data = await res.json();
      await AsyncStorage.setItem('health_profile_id', data.profile_id);
      setProfileId(data.profile_id);
      setAssessment(data.assessment);
      setStep(STEPS.length); // Show assessment

      // Link profile to user account if logged in
      try {
        const authToken = await AsyncStorage.getItem('auth_token');
        if (authToken) {
          await fetch(`${API_URL}/api/auth/link-profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ profile_id: data.profile_id }),
          });
        }
      } catch {}

      // Notify home screen about profile update
      const { eventBus } = require('../src/eventBus');
      eventBus.emit('profileUpdated');
    } catch (e) {
      Alert.alert(
        lang === 'de' ? 'Fehler' : 'Errore',
        lang === 'de' ? 'Profil konnte nicht gespeichert werden' : 'Impossibile salvare il profilo'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getLabel = (item: any) => item[`label_${lang}`] || item.label_de;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D14953" />
      </SafeAreaView>
    );
  }

  // Assessment Results
  if (step === STEPS.length && assessment) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.assessmentContainer}>
          <View style={styles.assessmentHeader}>
            <MaterialCommunityIcons name="clipboard-check" size={48} color="#D14953" />
            <Text style={styles.assessmentTitle}>
              {lang === 'de' ? 'Ihre Analyse' : 'La tua analisi'}
            </Text>
            <Text style={styles.assessmentSubtitle}>
              {lang === 'de' 
                ? 'Basierend auf Ihren Angaben haben wir folgende Einschätzung erstellt'
                : 'Sulla base dei tuoi dati abbiamo creato la seguente valutazione'}
            </Text>
          </View>

          {/* BMI */}
          {assessment.bmi && (
            <View style={styles.bmiCard}>
              <Text style={styles.bmiValue}>{assessment.bmi}</Text>
              <Text style={styles.bmiLabel}>BMI</Text>
              <Text style={styles.bmiCategory}>
                {assessment.bmi_category === 'underweight' && (lang === 'de' ? 'Untergewicht' : 'Sottopeso')}
                {assessment.bmi_category === 'normal' && (lang === 'de' ? 'Normalgewicht' : 'Normopeso')}
                {assessment.bmi_category === 'overweight' && (lang === 'de' ? 'Übergewicht' : 'Sovrappeso')}
                {assessment.bmi_category === 'obese' && (lang === 'de' ? 'Adipositas' : 'Obesità')}
              </Text>
            </View>
          )}

          {/* Warnings */}
          {assessment.warnings?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <MaterialCommunityIcons name="alert" size={18} color="#DC2626" />
                {' '}{lang === 'de' ? 'Wichtige Hinweise' : 'Avvisi importanti'}
              </Text>
              {assessment.warnings.map((w: string, i: number) => (
                <View key={i} style={styles.warningCard}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
                  <Text style={styles.warningText}>{w}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Priority Areas */}
          {assessment.priority_areas?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {lang === 'de' ? 'Priorisierte Handlungsfelder' : 'Aree di azione prioritarie'}
              </Text>
              {assessment.priority_areas.map((p: any, i: number) => (
                <View key={i} style={styles.priorityCard}>
                  <View style={styles.priorityIcon}>
                    <MaterialCommunityIcons 
                      name={p.area === 'sleep' ? 'sleep' : p.area === 'stress' ? 'head-flash' : 'run'} 
                      size={20} color="#D14953" 
                    />
                  </View>
                  <Text style={styles.priorityTitle}>{p.title}</Text>
                  <Text style={[
                    styles.priorityBadge,
                    p.priority === 'high' ? styles.priorityBadgeHigh : styles.priorityBadgeMedium
                  ]}>
                    {p.priority === 'high' ? (lang === 'de' ? 'Hoch' : 'Alto') : (lang === 'de' ? 'Mittel' : 'Medio')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Deficiencies */}
          <Text style={[styles.cardTitle, { marginTop: 16, marginBottom: 12 }]}>
            {lang === 'de' ? 'Mögliche Nährstoffdefizite' : 'Possibili carenze nutrizionali'}
          </Text>
          {assessment.deficiencies?.map((d: any, i: number) => (
            <View key={i} style={[
              styles.deficiencyCard,
              d.risk_level === 'high' ? styles.deficiencyHigh : 
              d.risk_level === 'medium' ? styles.deficiencyMedium : styles.deficiencyLow
            ]}>
              <View style={styles.deficiencyHeader}>
                <Text style={styles.deficiencyName}>{d.name}</Text>
                <Text style={[
                  styles.deficiencyRisk,
                  d.risk_level === 'high' ? styles.deficiencyRiskHigh :
                  d.risk_level === 'medium' ? styles.deficiencyRiskMedium : styles.deficiencyRiskLow
                ]}>
                  {d.risk_level === 'high' ? (lang === 'de' ? 'Hoch' : 'Alto') :
                   d.risk_level === 'medium' ? (lang === 'de' ? 'Mittel' : 'Medio') :
                   (lang === 'de' ? 'Niedrig' : 'Basso')}
                </Text>
              </View>
              <Text style={styles.deficiencyWhy}>{d.why}</Text>
              {d.food_sources?.length > 0 && (
                <Text style={styles.deficiencyFoods}>
                  {lang === 'de' ? 'Quellen: ' : 'Fonti: '}{d.food_sources.join(', ')}
                </Text>
              )}
            </View>
          ))}

          <TouchableOpacity 
            testID="supplement-plan-btn"
            style={[styles.completeButton, { backgroundColor: '#2D8B5F', marginBottom: 10 }]}
            onPress={() => router.push({ pathname: '/supplement-plan', params: { profileId: profileId || '' } })}
          >
            <MaterialCommunityIcons name="pill" size={20} color="#FFFFFF" />
            <Text style={styles.completeButtonText}>
              {lang === 'de' ? '  Supplement-Plan erstellen' : '  Crea piano supplementi'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.completeButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.completeButtonText}>
              {lang === 'de' ? 'Zur Symptom-Analyse' : 'Vai all\'analisi dei sintomi'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimerText}>
            {lang === 'de' 
              ? 'Diese Einschätzung ersetzt keine ärztliche Diagnose. Bei Beschwerden konsultieren Sie bitte einen Arzt.'
              : 'Questa valutazione non sostituisce una diagnosi medica. In caso di disturbi consultare un medico.'}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
        <View style={styles.stepIndicator}>
          {STEPS.map((_, i) => (
            <View key={i} style={[
              styles.stepDot,
              i === step && styles.stepDotActive,
              i < step && styles.stepDotCompleted
            ]} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.stepTitle}>{STEP_TITLES[lang]?.[step] || STEP_TITLES.de[step]}</Text>
          <Text style={styles.stepSubtitle}>
            {lang === 'de' ? `Schritt ${step + 1} von ${STEPS.length}` : `Passo ${step + 1} di ${STEPS.length}`}
          </Text>
        </View>

        {/* Step 1: Basic Data */}
        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>{lang === 'de' ? 'Vorname' : 'Nome'}</Text>
            <TextInput
              style={styles.input}
              value={profile.first_name}
              onChangeText={v => setProfile({ ...profile, first_name: v })}
              placeholder={lang === 'de' ? 'Ihr Vorname' : 'Il tuo nome'}
              placeholderTextColor="#8FA39B"
              testID="onboarding-first-name"
            />
            <View style={[styles.inputRow, { marginTop: 16 }]}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>{lang === 'de' ? 'Alter' : 'Età'}</Text>
                <TextInput
                  style={styles.input}
                  value={profile.age}
                  onChangeText={v => setProfile({ ...profile, age: v })}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor="#8FA39B"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>{lang === 'de' ? 'Geschlecht' : 'Sesso'}</Text>
                <View style={styles.optionsGrid}>
                  {options?.genders?.map((g: any) => (
                    <TouchableOpacity
                      key={g.value}
                      style={[styles.optionButton, profile.gender === g.value && styles.optionButtonSelected]}
                      onPress={() => setProfile({ ...profile, gender: g.value })}
                    >
                      <Text style={[styles.optionText, profile.gender === g.value && styles.optionTextSelected]}>
                        {getLabel(g)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={[styles.inputRow, { marginTop: 16 }]}>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>{lang === 'de' ? 'Größe (cm)' : 'Altezza (cm)'}</Text>
                <TextInput
                  style={styles.input}
                  value={profile.height}
                  onChangeText={v => setProfile({ ...profile, height: v })}
                  keyboardType="numeric"
                  placeholder="175"
                  placeholderTextColor="#8FA39B"
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.label}>{lang === 'de' ? 'Gewicht (kg)' : 'Peso (kg)'}</Text>
                <TextInput
                  style={styles.input}
                  value={profile.weight}
                  onChangeText={v => setProfile({ ...profile, weight: v })}
                  keyboardType="numeric"
                  placeholder="70"
                  placeholderTextColor="#8FA39B"
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Lifestyle */}
        {step === 1 && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === 'de' ? 'Ernährungsform' : 'Tipo di alimentazione'}</Text>
              <View style={styles.chipContainer}>
                {options?.diets?.map((d: any) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.chip, profile.diet === d.value && styles.chipSelected]}
                    onPress={() => setProfile({ ...profile, diet: d.value })}
                  >
                    <Text style={[styles.chipText, profile.diet === d.value && styles.chipTextSelected]}>
                      {getLabel(d)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === 'de' ? 'Aktivitätslevel' : 'Livello di attività'}</Text>
              {options?.activity_levels?.map((a: any) => (
                <TouchableOpacity
                  key={a.value}
                  style={[styles.optionButton, { marginBottom: 8, width: '100%' }, profile.activity_level === a.value && styles.optionButtonSelected]}
                  onPress={() => setProfile({ ...profile, activity_level: a.value })}
                >
                  <Text style={[styles.optionText, profile.activity_level === a.value && styles.optionTextSelected]}>
                    {getLabel(a)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Work Type */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === 'de' ? 'Beruf / Arbeitsform' : 'Tipo di lavoro'}</Text>
              <View style={styles.chipContainer}>
                {options?.work_types?.map((w: any) => (
                  <TouchableOpacity
                    key={w.value}
                    testID={`work-type-${w.value}`}
                    style={[styles.chip, profile.work_type === w.value && styles.chipSelected]}
                    onPress={() => setProfile({ ...profile, work_type: w.value, shift_model: '', current_shift: '' })}
                  >
                    <MaterialCommunityIcons name={w.icon || 'briefcase'} size={16} color={profile.work_type === w.value ? '#fff' : '#D14953'} />
                    <Text style={[styles.chipText, { marginLeft: 4 }, profile.work_type === w.value && styles.chipTextSelected]}>
                      {getLabel(w)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Shift details - only for shift/night work */}
              {(profile.work_type === 'shift_work' || profile.work_type === 'night_work') && (
                <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#E5F0EA', paddingTop: 16 }}>
                  {profile.work_type === 'shift_work' && (
                    <>
                      <Text style={[styles.label, { marginBottom: 8 }]}>{lang === 'de' ? 'Schichtmodell' : 'Modello turni'}</Text>
                      <View style={styles.chipContainer}>
                        {options?.shift_models?.map((m: any) => (
                          <TouchableOpacity
                            key={m.value}
                            testID={`shift-model-${m.value}`}
                            style={[styles.chip, profile.shift_model === m.value && styles.chipSelected]}
                            onPress={() => setProfile({ ...profile, shift_model: m.value })}
                          >
                            <Text style={[styles.chipText, profile.shift_model === m.value && styles.chipTextSelected]}>
                              {getLabel(m)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  <Text style={[styles.label, { marginTop: 12, marginBottom: 8 }]}>
                    {lang === 'de' ? 'Aktuelle Schicht' : 'Turno attuale'}
                  </Text>
                  <View style={styles.chipContainer}>
                    {options?.shift_types?.map((s: any) => (
                      <TouchableOpacity
                        key={s.value}
                        testID={`shift-type-${s.value}`}
                        style={[styles.chip, profile.current_shift === s.value && styles.chipSelected]}
                        onPress={() => setProfile({ ...profile, current_shift: s.value })}
                      >
                        <MaterialCommunityIcons name={s.icon || 'clock'} size={16} color={profile.current_shift === s.value ? '#fff' : '#D14953'} />
                        <Text style={[styles.chipText, { marginLeft: 4 }, profile.current_shift === s.value && styles.chipTextSelected]}>
                          {getLabel(s)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ marginTop: 10, padding: 10, backgroundColor: '#FFF9E6', borderRadius: 10 }}>
                    <Text style={{ fontSize: 12, color: '#92700C' }}>
                      <MaterialCommunityIcons name="information" size={13} color="#92700C" />
                      {' '}{lang === 'de'
                        ? 'Schichtarbeit beeinflusst Schlaf, Stress und Naehrstoffbedarf. Ihr Supplement-Plan wird entsprechend angepasst.'
                        : 'Il lavoro a turni influisce su sonno, stress e fabbisogno di nutrienti. Il piano di supplementi sara adattato di conseguenza.'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === 'de' ? 'Schlafqualität' : 'Qualità del sonno'}</Text>
              <View style={styles.sliderContainer}>
                <View style={styles.sliderLabel}>
                  <Text style={styles.label}>{lang === 'de' ? 'Wie gut schlafen Sie?' : 'Quanto bene dormi?'}</Text>
                  <Text style={styles.sliderValue}>{profile.sleep_quality}/10</Text>
                </View>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${profile.sleep_quality * 10}%` }]} />
                </View>
                <View style={styles.sliderDots}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <TouchableOpacity key={n} style={[styles.sliderDot, profile.sleep_quality === n && styles.sliderDotActive]} onPress={() => setProfile({ ...profile, sleep_quality: n })}>
                      <Text style={[styles.sliderDotText, profile.sleep_quality === n && styles.sliderDotTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={[styles.label, { marginTop: 16 }]}>{lang === 'de' ? 'Schlafdauer (Stunden)' : 'Durata del sonno (ore)'}</Text>
              <TextInput
                style={styles.input}
                value={profile.sleep_duration}
                onChangeText={v => setProfile({ ...profile, sleep_duration: v })}
                keyboardType="numeric"
                placeholder="7"
                placeholderTextColor="#8FA39B"
              />
              <Text style={[styles.label, { marginTop: 16 }]}>{lang === 'de' ? 'Schlafprobleme' : 'Problemi di sonno'}</Text>
              <View style={styles.chipContainer}>
                {options?.sleep_issues?.map((s: any) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.chip, profile.sleep_issues.includes(s.value) && styles.chipSelected]}
                    onPress={() => toggleArrayItem('sleep_issues', s.value)}
                  >
                    <Text style={[styles.chipText, profile.sleep_issues.includes(s.value) && styles.chipTextSelected]}>
                      {getLabel(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Step 3: Stress & Energy */}
        {step === 2 && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === 'de' ? 'Stresslevel' : 'Livello di stress'}</Text>
              <View style={styles.sliderContainer}>
                <View style={styles.sliderLabel}>
                  <Text style={styles.label}>{lang === 'de' ? 'Wie gestresst fühlen Sie sich?' : 'Quanto ti senti stressato?'}</Text>
                  <Text style={styles.sliderValue}>{profile.stress_level}/10</Text>
                </View>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${profile.stress_level * 10}%`, backgroundColor: profile.stress_level >= 7 ? '#EF4444' : '#D14953' }]} />
                </View>
                <View style={styles.sliderDots}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <TouchableOpacity key={n} style={[styles.sliderDot, profile.stress_level === n && styles.sliderDotActive, profile.stress_level === n && profile.stress_level >= 7 && { backgroundColor: '#EF4444', borderColor: '#EF4444' }]} onPress={() => setProfile({ ...profile, stress_level: n })}>
                      <Text style={[styles.sliderDotText, profile.stress_level === n && styles.sliderDotTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={[styles.label, { marginTop: 16 }]}>{lang === 'de' ? 'Stressquellen' : 'Fonti di stress'}</Text>
              <View style={styles.chipContainer}>
                {options?.stress_types?.map((s: any) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.chip, profile.stress_type.includes(s.value) && styles.chipSelected]}
                    onPress={() => toggleArrayItem('stress_type', s.value)}
                  >
                    <Text style={[styles.chipText, profile.stress_type.includes(s.value) && styles.chipTextSelected]}>
                      {getLabel(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === 'de' ? 'Energielevel' : 'Livello di energia'}</Text>
              <View style={styles.sliderContainer}>
                <View style={styles.sliderLabel}>
                  <Text style={styles.label}>{lang === 'de' ? 'Wie ist Ihr Energielevel?' : 'Com\'è il tuo livello di energia?'}</Text>
                  <Text style={styles.sliderValue}>{profile.energy_level}/10</Text>
                </View>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${profile.energy_level * 10}%` }]} />
                </View>
                <View style={styles.sliderDots}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <TouchableOpacity key={n} style={[styles.sliderDot, profile.energy_level === n && styles.sliderDotActive]} onPress={() => setProfile({ ...profile, energy_level: n })}>
                      <Text style={[styles.sliderDotText, profile.energy_level === n && styles.sliderDotTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}

        {/* Step 4: Health */}
        {step === 3 && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === 'de' ? 'Vorerkrankungen' : 'Condizioni pregresse'}</Text>
              <View style={styles.chipContainer}>
                {options?.conditions?.map((c: any) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.chip, profile.conditions.includes(c.value) && styles.chipSelected]}
                    onPress={() => toggleArrayItem('conditions', c.value)}
                  >
                    <Text style={[styles.chipText, profile.conditions.includes(c.value) && styles.chipTextSelected]}>
                      {getLabel(c)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === 'de' ? 'Medikamente' : 'Farmaci'}</Text>
              <View style={styles.chipContainer}>
                {options?.medications?.map((m: any) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.chip, profile.medications.includes(m.value) && styles.chipSelected]}
                    onPress={() => toggleArrayItem('medications', m.value)}
                  >
                    <Text style={[styles.chipText, profile.medications.includes(m.value) && styles.chipTextSelected]}>
                      {getLabel(m)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === 'de' ? 'Allergien / Unverträglichkeiten' : 'Allergie / Intolleranze'}</Text>
              <TextInput
                style={styles.input}
                value={profile.allergies.join(', ')}
                onChangeText={v => setProfile({ ...profile, allergies: v.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder={lang === 'de' ? 'z.B. Laktose, Gluten, Nüsse' : 'es. Lattosio, Glutine, Noci'}
                placeholderTextColor="#8FA39B"
              />
            </View>
          </>
        )}

        {/* Step 5: Complaints */}
        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {lang === 'de' ? 'Welche Beschwerden haben Sie?' : 'Quali disturbi hai?'}
            </Text>
            <Text style={[styles.label, { marginBottom: 16 }]}>
              {lang === 'de' ? 'Tippen Sie zum Auswählen, halten Sie zum Anpassen der Intensität' : 'Tocca per selezionare'}
            </Text>
            {options?.complaints?.map((c: any) => {
              const selected = profile.complaints.find(comp => comp.name === c.value);
              return (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.complaintItem, selected && styles.complaintItemSelected]}
                  onPress={() => toggleComplaint(c.value)}
                >
                  <MaterialCommunityIcons 
                    name={selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} 
                    size={24} 
                    color={selected ? '#D14953' : '#8FA39B'} 
                  />
                  <Text style={styles.complaintName}>{getLabel(c)}</Text>
                  {selected && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity onPress={() => setComplaintIntensity(c.value, Math.max(1, selected.intensity - 1))}>
                        <MaterialCommunityIcons name="minus-circle" size={24} color="#8FA39B" />
                      </TouchableOpacity>
                      <View style={styles.intensityBadge}>
                        <Text style={styles.intensityText}>{selected.intensity}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setComplaintIntensity(c.value, Math.min(10, selected.intensity + 1))}>
                        <MaterialCommunityIcons name="plus-circle" size={24} color="#D14953" />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 6: Lab Values */}
        {step === 5 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {lang === 'de' ? 'Bekannte Mängel (optional)' : 'Carenze note (opzionale)'}
            </Text>
            <Text style={[styles.label, { marginBottom: 16 }]}>
              {lang === 'de' 
                ? 'Falls bei Ihnen bereits Mängel festgestellt wurden, können Sie diese hier angeben.'
                : 'Se sono già state rilevate carenze, puoi indicarle qui.'}
            </Text>
            <View style={styles.chipContainer}>
              {options?.known_deficiencies?.map((d: any) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.chip, profile.known_deficiencies.includes(d.value) && styles.chipSelected]}
                  onPress={() => toggleArrayItem('known_deficiencies', d.value)}
                >
                  <Text style={[styles.chipText, profile.known_deficiencies.includes(d.value) && styles.chipTextSelected]}>
                    {getLabel(d)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navContainer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.backButtonText}>{lang === 'de' ? 'Zurück' : 'Indietro'}</Text>
          </TouchableOpacity>
        )}
        {step === 0 && (
          <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
            <Text style={styles.skipButtonText}>{lang === 'de' ? 'Überspringen' : 'Salta'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={() => step < STEPS.length - 1 ? setStep(step + 1) : submitProfile()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {step < STEPS.length - 1 
                  ? (lang === 'de' ? 'Weiter' : 'Avanti')
                  : (lang === 'de' ? 'Analyse starten' : 'Avvia analisi')}
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
