import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Dimensions, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useLang } from '../../src/LangContext';
import { useGuide } from '../../src/GuideContext';
import { eventBus } from '../../src/eventBus';
import { setCurrentAnalysis } from '../../src/store';
import { DisclaimerScreen } from '../../components/home/DisclaimerScreen';
import { SymptomInput } from '../../components/home/SymptomInput';
import { SymptomChips } from '../../components/home/SymptomChips';
import { AnalyzeButton } from '../../components/home/AnalyzeButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const SIDE_PAD = 16;
const CARD_W = (SCREEN_WIDTH - SIDE_PAD * 2 - CARD_GAP) / 2;

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// VERO mascot images
const VERO_HALLO = require('../../assets/images/vero-hallo.png');
const VERO_DASHBOARD = require('../../assets/images/vero-dashboard.png');

export default function DashboardHome() {
  const router = useRouter();
  const { lang } = useLang();
  const guide = useGuide();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [achievements, setAchievements] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [symptomText, setSymptomText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Disclaimer check
  useEffect(() => {
    AsyncStorage.getItem('disclaimer_accepted').then(val => {
      setDisclaimerAccepted(val === 'true');
    }).catch(() => setDisclaimerAccepted(false));
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      setHasProfile(!!profileId);
      if (profileId) {
        // Load profile name
        const profileRes = await fetch(`${API_URL}/api/health-profile/${profileId}`);
        if (profileRes.ok) {
          const d = await profileRes.json();
          setFirstName(d.profile?.first_name || null);
        }
        // Load health score
        const scoreRes = await fetch(`${API_URL}/api/health-score/${profileId}?lang=${lang}`);
        if (scoreRes.ok) {
          const d = await scoreRes.json();
          setHealthScore(d.score ?? null);
        }
        // Check supplement plan
        const planRes = await fetch(`${API_URL}/api/supplement-plan/${profileId}`);
        setHasPlan(planRes.ok);
        // Load achievements
        const achRes = await fetch(`${API_URL}/api/achievements/${profileId}?lang=${lang}`);
        if (achRes.ok) {
          const d = await achRes.json();
          setAchievements(d);
        }
      }
    } catch {}
    // Load recipes
    try {
      setLoadingRecipes(true);
      const res = await fetch(`${API_URL}/api/recipes?lang=${lang}&limit=4`);
      if (res.ok) {
        const d = await res.json();
        setRecipes(Array.isArray(d) ? d : (d.recipes || []));
      }
    } catch {} finally {
      setLoadingRecipes(false);
    }
  }, [lang]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    eventBus.on('profileUpdated', loadData);
    return () => eventBus.off('profileUpdated', loadData);
  }, [loadData]);

  const acceptDisclaimer = useCallback(async () => {
    await AsyncStorage.setItem('disclaimer_accepted', 'true');
    setDisclaimerAccepted(true);
    guide.setDisclaimerAccepted(true);
  }, [guide]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  const analyzeSymptoms = useCallback(async () => {
    const allSymptoms = [symptomText, ...selectedTags].filter(Boolean).join(', ');
    if (!allSymptoms.trim()) {
      Alert.alert(lang === 'de' ? 'Hinweis' : 'Avviso', lang === 'de' ? 'Bitte beschreiben Sie Ihre Symptome.' : 'Descrivete i vostri sintomi.');
      return;
    }
    setIsAnalyzing(true);
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      const res = await fetch(`${API_URL}/api/symptoms/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: allSymptoms, lang, profile_id: profileId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentAnalysis(data);
        await AsyncStorage.setItem('saved_analysis', JSON.stringify(data));
        router.push('/results' as any);
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setIsAnalyzing(false);
    }
  }, [symptomText, selectedTags, lang, router]);

  if (disclaimerAccepted === null) return <View style={s.loadingContainer}><ActivityIndicator size="large" color="#2E7D52" /></View>;
  if (!disclaimerAccepted) return <DisclaimerScreen lang={lang} onAccept={acceptDisclaimer} />;

  const greeting = firstName
    ? (lang === 'de' ? `Hallo ${firstName},` : `Ciao ${firstName},`)
    : (lang === 'de' ? 'Willkommen!' : 'Benvenuto!');
  const subtitle = lang === 'de' ? 'Willkommen zurueck!' : 'Bentornato!';
  const earnedCount = achievements?.earned?.length || 0;

  return (
    <View style={s.container}>
      {/* Background gradient */}
      <LinearGradient colors={['#E8F5E9', '#F1F8F3', '#F5F7FA']} style={s.bgGradient} />
      {/* Header with gradient */}
      <LinearGradient colors={['#1B6B45', '#2E9E6B', '#43C68A']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.logoText}><Text style={s.logoVita}>Vita</Text>Guide<Text style={s.logoPlus}>+</Text></Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting + VERO + Cards */}
        <View style={s.heroSection}>
          {/* VERO behind cards */}
          <Image source={VERO_DASHBOARD} style={s.heroMascot} resizeMode="contain" />
          {/* Greeting text */}
          <View style={s.greetingRow}>
            <Text style={s.greetingName}>{greeting}</Text>
            <Text style={s.greetingSub}>{subtitle}</Text>
          </View>
          {/* Two Feature Cards */}
          <View style={s.cardsRow}>
          {/* Supplement Plan Card */}
          <TouchableOpacity
            style={[s.featureCard]}
            activeOpacity={0.85}
            onPress={() => hasPlan ? router.push('/(tabs)/plan' as any) : (hasProfile ? router.push('/(tabs)/plan' as any) : router.push('/onboarding' as any))}
            data-testid="supplement-plan-card"
          >
            <LinearGradient colors={['#1B8A5A', '#2EAD6E']} style={s.featureGradient}>
              <Text style={s.featureTitle}>{lang === 'de' ? 'Dein\nSupplement Plan' : 'Il tuo\nPiano Integratori'}</Text>
              <MaterialCommunityIcons name="pill" size={40} color="rgba(255,255,255,0.3)" style={s.featureIcon} />
              <Text style={s.featureStat}>
                {hasPlan ? (lang === 'de' ? 'Plan aktiv' : 'Piano attivo') : (lang === 'de' ? 'Plan erstellen' : 'Crea piano')}
              </Text>
              <View style={s.featureCta}>
                <Text style={s.featureCtaText}>{lang === 'de' ? 'Zum Plan' : 'Al piano'}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#1B6B45" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Progress Card */}
          <TouchableOpacity
            style={[s.featureCard]}
            activeOpacity={0.85}
            onPress={() => router.push('/progress' as any)}
            data-testid="progress-card"
          >
            <LinearGradient colors={['#E8820C', '#F5A623']} style={s.featureGradient}>
              <Text style={s.featureTitle}>{lang === 'de' ? 'Deine\nFortschritte' : 'I tuoi\nProgressi'}</Text>
              <MaterialCommunityIcons name="chart-line" size={40} color="rgba(255,255,255,0.3)" style={s.featureIcon} />
              <Text style={s.featureStat}>
                {earnedCount > 0
                  ? (lang === 'de' ? `${earnedCount} Ziele erreicht!` : `${earnedCount} obiettivi!`)
                  : (lang === 'de' ? 'Fortschritt tracken' : 'Traccia progressi')}
              </Text>
              <View style={s.featureCta}>
                <Text style={[s.featureCtaText, { color: '#9E5500' }]}>{lang === 'de' ? 'Ansehen' : 'Visualizza'}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#9E5500" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        </View>

        {/* Recipes Section */}
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.sectionTitle}>{lang === 'de' ? 'Passende Rezepte fuer dich' : 'Ricette adatte a te'}</Text>
            <Text style={s.sectionSub}>{lang === 'de' ? 'Gesund & lecker' : 'Sano e gustoso'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/recipes-catalog' as any)} data-testid="recipes-see-all">
            <MaterialCommunityIcons name="chevron-right" size={28} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.recipesScroll} contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}>
          {loadingRecipes ? (
            <ActivityIndicator size="small" color="#2E7D52" style={{ marginRight: 20 }} />
          ) : recipes.length > 0 ? (
            recipes.map((r: any, i: number) => (
              <TouchableOpacity
                key={r.id || i}
                style={s.recipeCard}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/recipe', params: { id: r.id } } as any)}
                data-testid={`recipe-card-${i}`}
              >
                {r.image_url ? (
                  <Image source={{ uri: r.image_url }} style={s.recipeImg} />
                ) : (
                  <View style={[s.recipeImg, { backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="food-variant" size={32} color="#2E7D52" />
                  </View>
                )}
                <View style={s.recipeInfo}>
                  <Text style={s.recipeName} numberOfLines={1}>{r[`title_${lang}`] || r.title_de || r.title}</Text>
                  <Text style={s.recipeTag} numberOfLines={1}>{r[`category_${lang}`] || r.category_de || ''}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: '#9CA3AF', padding: 12 }}>{lang === 'de' ? 'Keine Rezepte vorhanden' : 'Nessuna ricetta'}</Text>
          )}
        </ScrollView>

        {/* Symptom Analysis Section */}
        <TouchableOpacity
          style={s.analysisCard}
          activeOpacity={0.85}
          onPress={() => setShowAnalysis(!showAnalysis)}
          data-testid="analysis-card"
        >
          <View style={s.analysisLeft}>
            <MaterialCommunityIcons name="magnify" size={28} color="#2E7D52" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={s.analysisTitle}>{lang === 'de' ? 'Symptom-Analyse' : 'Analisi sintomi'}</Text>
              <Text style={s.analysisSub}>{lang === 'de' ? 'Beschreibe deine Symptome' : 'Descrivi i tuoi sintomi'}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name={showAnalysis ? 'chevron-up' : 'chevron-down'} size={24} color="#2E7D52" />
        </TouchableOpacity>
        {showAnalysis && (
          <View style={s.analysisExpanded}>
            <SymptomInput lang={lang} value={symptomText} onChangeText={setSymptomText} />
            <SymptomChips lang={lang} selectedTags={selectedTags} onToggleTag={toggleTag} />
            <AnalyzeButton lang={lang} isLoading={isAnalyzing} onPress={analyzeSymptoms} />
          </View>
        )}

        {/* Info Cards Row */}
        <View style={s.infoRow}>
          {/* Health Status */}
          <TouchableOpacity
            style={s.infoCard}
            activeOpacity={0.85}
            onPress={() => hasProfile ? router.push('/health-profile' as any) : router.push('/onboarding' as any)}
            data-testid="health-status-card"
          >
            <View style={[s.infoIconWrap, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="heart-pulse" size={22} color="#2E7D52" />
            </View>
            <Text style={s.infoTitle}>{lang === 'de' ? 'Dein\nGesundheitsstatus' : 'Il tuo\nStato di salute'}</Text>
            {healthScore !== null && (
              <Text style={[s.infoScore, { color: '#2E7D52' }]}>{healthScore}/100</Text>
            )}
            <View style={s.infoCta}>
              <Text style={[s.infoCtaText, { color: '#2E7D52' }]}>{lang === 'de' ? 'Profil ansehen' : 'Vedi profilo'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#2E7D52" />
            </View>
          </TouchableOpacity>

          {/* Nutrition Tips */}
          <TouchableOpacity
            style={s.infoCard}
            activeOpacity={0.85}
            onPress={() => router.push('/videos' as any)}
            data-testid="nutrition-tips-card"
          >
            <View style={[s.infoIconWrap, { backgroundColor: '#FFF3E0' }]}>
              <MaterialCommunityIcons name="book-open-variant" size={22} color="#E8820C" />
            </View>
            <Text style={s.infoTitle}>{lang === 'de' ? 'Ernaehrungs-\nTipps' : 'Consigli\nnutrizionali'}</Text>
            <View style={s.infoCta}>
              <Text style={[s.infoCtaText, { color: '#E8820C' }]}>{lang === 'de' ? 'Nuetzliche Infos' : 'Info utili'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#E8820C" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Tracking Card */}
        <TouchableOpacity
          style={s.trackingCard}
          activeOpacity={0.85}
          onPress={() => router.push('/tracking' as any)}
          data-testid="tracking-card"
        >
          <MaterialCommunityIcons name="notebook-outline" size={24} color="#6366F1" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={s.trackingTitle}>{lang === 'de' ? 'Tagebuch & Tracking' : 'Diario & Tracking'}</Text>
            <Text style={s.trackingSub}>{lang === 'de' ? 'Schlaf, Energie & Wohlbefinden' : 'Sonno, energia & benessere'}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#6366F1" />
        </TouchableOpacity>

        {/* Version link to admin */}
        <TouchableOpacity
          onPress={() => router.push('/admin' as any)}
          style={s.versionLink}
          data-testid="version-link"
        >
          <Text style={s.versionText}>V. 1.0</Text>
        </TouchableOpacity>

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 28,
    paddingHorizontal: SIDE_PAD,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: { alignItems: 'center', justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 28, fontWeight: '800', color: '#FFD700', letterSpacing: -0.5 },
  logoVita: { color: '#FFFFFF', fontWeight: '800' },
  logoPlus: { color: '#FFD700', fontWeight: '800' },
  settingsBtn: { padding: 6 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 20 },
  heroSection: {
    position: 'relative',
    paddingTop: 8,
    marginBottom: 24,
  },
  heroMascot: {
    position: 'absolute',
    right: SIDE_PAD,
    top: -30,
    width: 120,
    height: 120,
    zIndex: 0,
  },
  greetingRow: {
    paddingHorizontal: SIDE_PAD,
    marginBottom: 16,
    zIndex: 1,
  },
  greetingName: { fontSize: 28, fontWeight: '800', color: '#1A2E35', letterSpacing: -0.5 },
  greetingSub: { fontSize: 16, color: '#6B7280', marginTop: 2 },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: SIDE_PAD,
    gap: CARD_GAP,
    zIndex: 2,
  },
  featureCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  featureGradient: {
    padding: 10,
    minHeight: 65,
    justifyContent: 'space-between',
  },
  featureTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', lineHeight: 18 },
  featureIcon: { position: 'absolute', right: 12, top: 12 },
  featureStat: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 8 },
  featureCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    gap: 4,
  },
  featureCtaText: { fontSize: 13, fontWeight: '700', color: '#1B6B45' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIDE_PAD,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#1A2E35' },
  sectionSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  recipesScroll: { marginBottom: 20 },
  recipeCard: {
    width: 180,
    marginRight: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  recipeImg: { width: '100%', height: 110, backgroundColor: '#E8F5E9' },
  recipeInfo: { padding: 10 },
  recipeName: { fontSize: 14, fontWeight: '700', color: '#1A2E35' },
  recipeTag: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  analysisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: SIDE_PAD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D52',
  },
  analysisLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  analysisTitle: { fontSize: 15, fontWeight: '700', color: '#1A2E35' },
  analysisSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  analysisExpanded: {
    marginHorizontal: SIDE_PAD,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: -8,
    marginBottom: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: SIDE_PAD,
    gap: CARD_GAP,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1A2E35', lineHeight: 19 },
  infoScore: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  infoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  infoCtaText: { fontSize: 12, fontWeight: '600' },
  trackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: SIDE_PAD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  trackingTitle: { fontSize: 15, fontWeight: '700', color: '#1A2E35' },
  trackingSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  versionLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  versionText: {
    fontSize: 11,
    color: '#C0C5CB',
    letterSpacing: 0.5,
  },
});
