import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { setCurrentAnalysis } from '../src/store';
import { useLang } from './LangContext';
import { t } from './i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CHIP_ICONS = [
  'sleep', 'head-flash-outline', 'stomach', 'bone', 'weather-night',
  'lightning-bolt-outline', 'thermometer', 'hand-front-right-outline', 'human', 'head-cog-outline',
];

// ==================== DISCLAIMER SCREEN ====================
function DisclaimerView({ onAccept, lang, setLang }: { onAccept: () => void; lang: any; setLang: any }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.disclaimerContainer}>
        {/* Language Switcher */}
        <View style={styles.langSwitcher}>
          <TouchableOpacity
            data-testid="lang-de-btn"
            style={[styles.langBtn, lang === 'de' && styles.langBtnActive]}
            onPress={() => setLang('de')}
          >
            <Text style={[styles.langBtnText, lang === 'de' && styles.langBtnTextActive]}>DE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            data-testid="lang-it-btn"
            style={[styles.langBtn, lang === 'it' && styles.langBtnActive]}
            onPress={() => setLang('it')}
          >
            <Text style={[styles.langBtnText, lang === 'it' && styles.langBtnTextActive]}>IT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.disclaimerIconWrap}>
          <MaterialCommunityIcons name="shield-check" size={56} color="#4A8B71" />
        </View>
        <Text style={styles.disclaimerTitle}>{t(lang, 'disclaimer_title')}</Text>
        <Text style={styles.disclaimerSubtitle}>{lang === 'de' ? 'Bitte lesen Sie vor der Nutzung' : 'Si prega di leggere prima dell\'uso'}</Text>

        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerRow}>
            <MaterialCommunityIcons name="medical-bag" size={22} color="#D9534F" />
            <Text style={styles.disclaimerBold}>{t(lang, 'disclaimer_1_title')}</Text>
          </View>
          <Text style={styles.disclaimerText}>{t(lang, 'disclaimer_1_text')}</Text>

          <View style={[styles.disclaimerRow, { marginTop: 16 }]}>
            <MaterialCommunityIcons name="information-outline" size={22} color="#2C5F78" />
            <Text style={styles.disclaimerBold}>{t(lang, 'disclaimer_2_title')}</Text>
          </View>
          <Text style={styles.disclaimerText}>{t(lang, 'disclaimer_2_text')}</Text>

          <View style={[styles.disclaimerRow, { marginTop: 16 }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#D9534F" />
            <Text style={styles.disclaimerBold}>{t(lang, 'disclaimer_3_title')}</Text>
          </View>
          <Text style={styles.disclaimerText}>{t(lang, 'disclaimer_3_text')}</Text>
        </View>

        <TouchableOpacity
          testID="disclaimer-accept-btn"
          style={styles.primaryBtn}
          activeOpacity={0.7}
          onPress={onAccept}
        >
          <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>  {t(lang, 'disclaimer_accept')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== MAIN HOME SCREEN ====================
export default function HomeScreen() {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean | null>(null);
  const [symptomText, setSymptomText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const chipLabels = t(lang, 'symptom_chips') as string[];

  useEffect(() => {
    AsyncStorage.getItem('disclaimer_accepted').then(val => {
      setDisclaimerAccepted(val === 'true');
    }).catch(() => setDisclaimerAccepted(false));
  }, []);

  const acceptDisclaimer = useCallback(async () => {
    await AsyncStorage.setItem('disclaimer_accepted', 'true');
    setDisclaimerAccepted(true);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const analyzeSymptoms = useCallback(async () => {
    if (!symptomText.trim() && selectedTags.length === 0) {
      Alert.alert(
        lang === 'de' ? 'Hinweis' : 'Avviso',
        lang === 'de'
          ? 'Bitte beschreiben Sie Ihre Symptome oder wählen Sie Bereiche aus.'
          : 'Si prega di descrivere i sintomi o selezionare le aree.'
      );
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/symptoms/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: symptomText, tags: selectedTags, lang }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || (lang === 'de' ? 'Analyse fehlgeschlagen' : 'Analisi fallita'));
      }
      const data = await res.json();
      setCurrentAnalysis(data);
      router.push('/results');
    } catch (e: any) {
      Alert.alert(
        lang === 'de' ? 'Fehler' : 'Errore',
        e.message || (lang === 'de' ? 'Die Analyse konnte nicht durchgeführt werden.' : 'L\'analisi non ha potuto essere eseguita.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [symptomText, selectedTags, router, lang]);

  // Loading state
  if (disclaimerAccepted === null) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator testID="loading-indicator" color="#4A8B71" size="large" />
      </SafeAreaView>
    );
  }

  // Disclaimer
  if (!disclaimerAccepted) {
    return <DisclaimerView onAccept={acceptDisclaimer} lang={lang} setLang={setLang} />;
  }

  // Symptom Input
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Lang Switcher */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={{ width: 80 }} />
              <View style={styles.logoRow}>
                <MaterialCommunityIcons name="leaf" size={28} color="#4A8B71" />
                <Text style={styles.logoText}>VitaGuide</Text>
              </View>
              <View style={styles.langSwitcherSmall}>
                <TouchableOpacity
                  data-testid="lang-de-home"
                  style={[styles.langBtnSm, lang === 'de' && styles.langBtnSmActive]}
                  onPress={() => { setLang('de'); setSelectedTags([]); }}
                >
                  <Text style={[styles.langBtnSmText, lang === 'de' && styles.langBtnSmTextActive]}>DE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  data-testid="lang-it-home"
                  style={[styles.langBtnSm, lang === 'it' && styles.langBtnSmActive]}
                  onPress={() => { setLang('it'); setSelectedTags([]); }}
                >
                  <Text style={[styles.langBtnSmText, lang === 'it' && styles.langBtnSmTextActive]}>IT</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>{t(lang, 'home_subtitle')}</Text>
          </View>

          {/* Diary Button */}
          <TouchableOpacity
            testID="diary-btn"
            style={styles.diaryButton}
            activeOpacity={0.7}
            onPress={() => router.push('/diary')}
          >
            <View style={styles.diaryIconWrap}>
              <MaterialCommunityIcons name="book-open-variant" size={22} color="#2C5F78" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.diaryBtnTitle}>{t(lang, 'diary_btn')}</Text>
              <Text style={styles.diaryBtnSub}>
                {lang === 'de' ? 'Tracken Sie Befinden, Schlaf, Stress & mehr' : 'Monitora umore, sonno, stress e altro'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#8FA39B" />
          </TouchableOpacity>

          {/* Input Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {lang === 'de' ? 'Was beschäftigt Sie?' : 'Cosa ti preoccupa?'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {lang === 'de'
                ? 'Beschreiben Sie Ihre Symptome oder wählen Sie Bereiche aus'
                : 'Descrivi i tuoi sintomi o seleziona le aree'}
            </Text>
            <TextInput
              testID="symptom-text-input"
              style={styles.textInput}
              placeholder={t(lang, 'symptom_placeholder')}
              placeholderTextColor="#8FA39B"
              multiline
              numberOfLines={4}
              value={symptomText}
              onChangeText={setSymptomText}
              textAlignVertical="top"
            />
          </View>

          {/* Chips */}
          <Text style={styles.chipsTitle}>
            {lang === 'de' ? 'Häufige Bereiche' : 'Aree comuni'}
          </Text>
          <View style={styles.chipsWrap}>
            {chipLabels.map((label: string, idx: number) => {
              const selected = selectedTags.includes(label);
              return (
                <TouchableOpacity
                  key={label}
                  testID={`symptom-chip-${label.toLowerCase()}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleTag(label)}
                >
                  <MaterialCommunityIcons
                    name={(CHIP_ICONS[idx] || 'circle') as any}
                    size={16}
                    color={selected ? '#FFFFFF' : '#2C5F78'}
                  />
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Submit */}
          <TouchableOpacity
            testID="analyze-btn"
            style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
            activeOpacity={0.7}
            onPress={analyzeSymptoms}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.primaryBtnText}>  {t(lang, 'analyzing')}</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>  {t(lang, 'analyze_btn')}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footerWrap}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#8FA39B" />
            <Text style={styles.footerText}>{t(lang, 'disclaimer_footer')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9F6' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },

  // Header
  header: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 28, fontWeight: '700', color: '#1A2D26' },
  headerSubtitle: { fontSize: 15, color: '#5C7A6F', marginTop: 4 },
  langSwitcherSmall: { flexDirection: 'row', gap: 4, width: 80, justifyContent: 'flex-end' },
  langBtnSm: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12,
    backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#D4E7DC',
  },
  langBtnSmActive: { backgroundColor: '#2C5F78', borderColor: '#2C5F78' },
  langBtnSmText: { fontSize: 13, fontWeight: '700', color: '#2C5F78' },
  langBtnSmTextActive: { color: '#FFFFFF' },

  // Diary Button
  diaryButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14, marginBottom: 20, gap: 12,
    borderWidth: 1, borderColor: '#D4E7DC',
  },
  diaryIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#E3F0F7',
    justifyContent: 'center', alignItems: 'center',
  },
  diaryBtnTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  diaryBtnSub: { fontSize: 13, color: '#5C7A6F', marginTop: 2 },

  // Card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#5C7A6F', marginBottom: 12 },
  textInput: {
    backgroundColor: '#F7F9F6', borderRadius: 12, padding: 14, fontSize: 15,
    color: '#1A2D26', minHeight: 100, borderWidth: 1, borderColor: '#E0E6E2',
  },

  // Chips
  chipsTitle: { fontSize: 16, fontWeight: '600', color: '#1A2D26', marginBottom: 12 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9',
    borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14,
    marginRight: 8, marginBottom: 8, gap: 6,
  },
  chipSelected: { backgroundColor: '#2C5F78' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#2C5F78' },
  chipTextSelected: { color: '#FFFFFF' },

  // Buttons
  primaryBtn: {
    backgroundColor: '#4A8B71', borderRadius: 24, paddingVertical: 16,
    paddingHorizontal: 24, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
    shadowRadius: 4, elevation: 3,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  btnRow: { flexDirection: 'row', alignItems: 'center' },

  // Footer
  footerWrap: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 20, paddingHorizontal: 8, gap: 6,
  },
  footerText: { fontSize: 12, color: '#8FA39B', flex: 1, lineHeight: 18 },

  // Disclaimer
  disclaimerContainer: { padding: 24, paddingTop: 48, alignItems: 'center' },
  disclaimerIconWrap: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  disclaimerTitle: { fontSize: 26, fontWeight: '700', color: '#1A2D26', marginBottom: 4 },
  disclaimerSubtitle: { fontSize: 15, color: '#5C7A6F', marginBottom: 24 },
  disclaimerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%',
    marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  disclaimerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  disclaimerBold: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  disclaimerText: { fontSize: 14, color: '#5C7A6F', lineHeight: 22, paddingLeft: 30 },
});
