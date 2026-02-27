import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { setCurrentAnalysis } from '../src/store';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const SYMPTOM_CHIPS = [
  { label: 'Müdigkeit', icon: 'sleep' },
  { label: 'Kopfschmerzen', icon: 'head-flash-outline' },
  { label: 'Verdauung', icon: 'stomach' },
  { label: 'Gelenkschmerzen', icon: 'bone' },
  { label: 'Schlafprobleme', icon: 'weather-night' },
  { label: 'Stress', icon: 'lightning-bolt-outline' },
  { label: 'Erkältung', icon: 'thermometer' },
  { label: 'Hautprobleme', icon: 'hand-front-right-outline' },
  { label: 'Rückenschmerzen', icon: 'human' },
  { label: 'Konzentration', icon: 'head-cog-outline' },
];

// ==================== DISCLAIMER SCREEN ====================
function DisclaimerView({ onAccept }: { onAccept: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.disclaimerContainer}>
        <View style={styles.disclaimerIconWrap}>
          <MaterialCommunityIcons name="shield-check" size={56} color="#4A8B71" />
        </View>
        <Text style={styles.disclaimerTitle}>Wichtiger Hinweis</Text>
        <Text style={styles.disclaimerSubtitle}>Bitte lesen Sie vor der Nutzung</Text>

        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerRow}>
            <MaterialCommunityIcons name="medical-bag" size={22} color="#D9534F" />
            <Text style={styles.disclaimerBold}>Kein Medizinprodukt</Text>
          </View>
          <Text style={styles.disclaimerText}>
            VitaGuide ersetzt keine ärztliche Beratung, stellt keine Diagnosen und gibt keine personalisierten medizinischen Behandlungsanweisungen.
          </Text>

          <View style={[styles.disclaimerRow, { marginTop: 16 }]}>
            <MaterialCommunityIcons name="information-outline" size={22} color="#2C5F78" />
            <Text style={styles.disclaimerBold}>Allgemeine Informationen</Text>
          </View>
          <Text style={styles.disclaimerText}>
            Die App liefert ausschließlich allgemeine, nicht-verbindliche Informationsvorschläge zu Ernährung und Nahrungsergänzungsmitteln.
          </Text>

          <View style={[styles.disclaimerRow, { marginTop: 16 }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#D9534F" />
            <Text style={styles.disclaimerBold}>Bei ernsthaften Beschwerden</Text>
          </View>
          <Text style={styles.disclaimerText}>
            Wenden Sie sich bei Notfällen, ernsthaften oder anhaltenden Beschwerden immer an einen Arzt oder eine medizinische Fachstelle.
          </Text>
        </View>

        <TouchableOpacity
          testID="disclaimer-accept-btn"
          style={styles.primaryBtn}
          activeOpacity={0.7}
          onPress={onAccept}
        >
          <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>  Verstanden & Zustimmen</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== MAIN HOME SCREEN ====================
export default function HomeScreen() {
  const router = useRouter();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean | null>(null);
  const [symptomText, setSymptomText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      Alert.alert('Hinweis', 'Bitte beschreiben Sie Ihre Symptome oder wählen Sie Bereiche aus.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/symptoms/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: symptomText, tags: selectedTags }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Analyse fehlgeschlagen');
      }
      const data = await res.json();
      setCurrentAnalysis(data);
      router.push('/results');
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Die Analyse konnte nicht durchgeführt werden.');
    } finally {
      setIsLoading(false);
    }
  }, [symptomText, selectedTags, router]);

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
    return <DisclaimerView onAccept={acceptDisclaimer} />;
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <MaterialCommunityIcons name="leaf" size={28} color="#4A8B71" />
              <Text style={styles.logoText}>VitaGuide</Text>
            </View>
            <Text style={styles.headerSubtitle}>Ihr Ernährungs- & Gesundheitsassistent</Text>
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
              <Text style={styles.diaryBtnTitle}>Symptom-Tagebuch</Text>
              <Text style={styles.diaryBtnSub}>Tracken Sie Befinden, Schlaf, Stress & mehr</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#8FA39B" />
          </TouchableOpacity>

          {/* Input Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Was beschäftigt Sie?</Text>
            <Text style={styles.cardSubtitle}>
              Beschreiben Sie Ihre Symptome oder wählen Sie Bereiche aus
            </Text>
            <TextInput
              testID="symptom-text-input"
              style={styles.textInput}
              placeholder="z.B. Ich fühle mich seit einer Woche müde und habe Kopfschmerzen..."
              placeholderTextColor="#8FA39B"
              multiline
              numberOfLines={4}
              value={symptomText}
              onChangeText={setSymptomText}
              textAlignVertical="top"
            />
          </View>

          {/* Chips */}
          <Text style={styles.chipsTitle}>Häufige Bereiche</Text>
          <View style={styles.chipsWrap}>
            {SYMPTOM_CHIPS.map(chip => {
              const selected = selectedTags.includes(chip.label);
              return (
                <TouchableOpacity
                  key={chip.label}
                  testID={`symptom-chip-${chip.label.toLowerCase()}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleTag(chip.label)}
                >
                  <MaterialCommunityIcons
                    name={chip.icon as any}
                    size={16}
                    color={selected ? '#FFFFFF' : '#2C5F78'}
                  />
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {chip.label}
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
                <Text style={styles.primaryBtnText}>  Analysiere...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>  Analyse starten</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footerWrap}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#8FA39B" />
            <Text style={styles.footerText}>
              Diese App ersetzt keine ärztliche Beratung. Bei ernsthaften Beschwerden wenden Sie sich an einen Arzt.
            </Text>
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
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 28, fontWeight: '700', color: '#1A2D26' },
  headerSubtitle: { fontSize: 15, color: '#5C7A6F', marginTop: 4 },

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
