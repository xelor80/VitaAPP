import React, { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, SafeAreaView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { setCurrentAnalysis, getCurrentAnalysis } from '../src/store';
import { useLang } from '../src/LangContext';
import { DisclaimerScreen } from '../components/home/DisclaimerScreen';
import { HomeHeader } from '../components/home/HomeHeader';
import { SymptomInput } from '../components/home/SymptomInput';
import { SymptomChips } from '../components/home/SymptomChips';
import { AnalyzeButton } from '../components/home/AnalyzeButton';
import { OnboardingButton } from '../components/home/OnboardingButton';
import { SupplementPlanButton } from '../components/home/SupplementPlanButton';
import { ProgressButton } from '../components/home/ProgressButton';
import { RecipeCatalogButton } from '../components/home/RecipeCatalogButton';
import { HealthScoreCard } from '../components/home/HealthScoreCard';
import { ScoreHistoryChart } from '../components/home/ScoreHistoryChart';
import { FooterDisclaimer } from '../components/home/FooterDisclaimer';
import { SavedAnalysisButtons } from '../components/home/SavedAnalysisButtons';
import { DailyTasks } from '../components/home/DailyTasks';
import { styles } from '../components/home/homeStyles';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean | null>(null);
  const [symptomText, setSymptomText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSaved, setHasSaved] = useState(() => getCurrentAnalysis() !== null);
  const scrollRef = React.useRef<ScrollView>(null);
  const inputYRef = React.useRef(0);

  useEffect(() => {
    AsyncStorage.getItem('disclaimer_accepted').then(val => {
      setDisclaimerAccepted(val === 'true');
    }).catch(() => setDisclaimerAccepted(false));
    // Check for saved analysis (fallback for cold start / page refresh)
    AsyncStorage.getItem('saved_analysis').then(val => {
      if (val) setHasSaved(true);
    }).catch(() => {});
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

  const clearTags = useCallback(() => {
    setSelectedTags([]);
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
      // Get profile_id for personalized analysis
      const profileId = await AsyncStorage.getItem('health_profile_id');
      
      const res = await fetch(`${API_URL}/api/symptoms/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: symptomText, 
          tags: selectedTags, 
          lang,
          profile_id: profileId || undefined
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || (lang === 'de' ? 'Analyse fehlgeschlagen' : 'Analisi fallita'));
      }
      const data = await res.json();
      setCurrentAnalysis(data);
      setHasSaved(true);
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
    return <DisclaimerScreen onAccept={acceptDisclaimer} lang={lang} setLang={setLang} />;
  }

  // Main Home Screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <HomeHeader lang={lang} setLang={setLang} onLangChange={clearTags} />
          <OnboardingButton
            lang={lang}
            onPress={() => router.push('/onboarding')}
            onProfilePress={() => router.push('/health-profile')}
          />
          <SupplementPlanButton
            lang={lang}
            onPress={() => router.push('/supplement-plan')}
            onNoProfile={() => router.push('/onboarding')}
          />
          <ProgressButton
            lang={lang}
            onPress={() => router.push('/tracking')}
          />
          <RecipeCatalogButton
            lang={lang}
            onPress={() => router.push('/recipes-catalog')}
          />
          <DailyTasks lang={lang} onNavigate={(route) => router.push(route as any)} />
          <HealthScoreCard lang={lang} />
          <ScoreHistoryChart lang={lang} />
          <SymptomInput lang={lang} value={symptomText} onChangeText={setSymptomText} onLayout={(e: any) => { inputYRef.current = e.nativeEvent.layout.y; }} />
          <SymptomChips lang={lang} selectedTags={selectedTags} onToggleTag={toggleTag} />
          {hasSaved && (
            <SavedAnalysisButtons
              lang={lang}
              isLoading={isLoading}
              onShowAnalysis={() => router.push('/results')}
              onNewAnalysis={() => {
                if (!symptomText.trim() && selectedTags.length === 0) {
                  const msg = lang === 'de'
                    ? 'Bitte beschreiben Sie Ihre Symptome oder wählen Sie Bereiche aus.'
                    : 'Si prega di descrivere i sintomi o selezionare le aree.';
                  if (typeof window !== 'undefined') window.alert(msg);
                  return;
                }
                setHasSaved(false);
                setTimeout(analyzeSymptoms, 50);
              }}
            />
          )}
          {!hasSaved && <AnalyzeButton lang={lang} isLoading={isLoading} onPress={analyzeSymptoms} />}
          <FooterDisclaimer lang={lang} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
