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
import { tx } from '../../src/i18n';
import { useGuide } from '../../src/GuideContext';
import { useAuth } from '../../src/AuthContext';
import { eventBus } from '../../src/eventBus';
import { setCurrentAnalysis } from '../../src/store';
import { DisclaimerScreen } from '../../components/home/DisclaimerScreen';
import { SymptomInput } from '../../components/home/SymptomInput';
import { SymptomChips } from '../../components/home/SymptomChips';
import { AnalyzeButton } from '../../components/home/AnalyzeButton';
import { WaterTrackerCard } from '../../components/WaterTrackerCard';

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
  const { lang, setLang } = useLang();
  const guide = useGuide();
  const { user } = useAuth();
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
  const [waterData, setWaterData] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [rewardBalance, setRewardBalance] = useState<number>(0);
  const [rewardStreak, setRewardStreak] = useState<number>(0);
  const [showVeroRewardTip, setShowVeroRewardTip] = useState<boolean>(false);
  const [focusData, setFocusData] = useState<any>(null);
  const [levelData, setLevelData] = useState<any>(null);
  const [coachData, setCoachData] = useState<any>(null);

  // Disclaimer check
  useEffect(() => {
    AsyncStorage.getItem('disclaimer_accepted').then(val => {
      setDisclaimerAccepted(val === 'true');
    }).catch(() => setDisclaimerAccepted(false));
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    setHasProfile(!!pid);
    setProfileId(pid);
    if (!pid) return;

    // 1. Show cached data instantly
    try {
      const cached = await AsyncStorage.getItem('dashboard_cache');
      if (cached) {
        const c = JSON.parse(cached);
        if (c.firstName) setFirstName(c.firstName);
        if (c.healthScore !== undefined) setHealthScore(c.healthScore);
        if (c.hasPlan !== undefined) setHasPlan(c.hasPlan);
        if (c.waterData) setWaterData(c.waterData);
        if (c.achievements) setAchievements(c.achievements);
        if (c.rewardBalance !== undefined) setRewardBalance(c.rewardBalance);
        if (c.rewardStreak !== undefined) setRewardStreak(c.rewardStreak);
        if (c.recipes) { setRecipes(c.recipes); setLoadingRecipes(false); }
      }
    } catch {}

    // 2. Fetch all data in parallel
    try {
      const [profileRes, scoreRes, planRes, achRes, waterRes, checkinRes, recipeRes] = await Promise.all([
        fetch(`${API_URL}/api/health-profile/${pid}`).catch(() => null),
        fetch(`${API_URL}/api/health-score/${pid}?lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/api/supplement-plan/${pid}`).catch(() => null),
        fetch(`${API_URL}/api/achievements/${pid}?lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/api/water-tracking/${pid}/today?lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/api/rewards/grant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: pid, action: 'daily_checkin' }),
        }).catch(() => null),
        fetch(`${API_URL}/api/recipes/personalized/${pid}?lang=${lang}`).catch(() => null),
      ]);

      let cFirstName = null, cScore = null, cHasPlan = false;
      let cWater = null, cAch = null, cBalance = 0, cStreak = 0, cRecipes: any = null;

      if (profileRes?.ok) {
        const d = await profileRes.json();
        cFirstName = d.profile?.first_name || null;
        setFirstName(cFirstName);
      }
      if (scoreRes?.ok) {
        const d = await scoreRes.json();
        cScore = d.score ?? null;
        setHealthScore(cScore);
      }
      if (planRes) { cHasPlan = planRes.ok; setHasPlan(cHasPlan); }
      if (achRes?.ok) { cAch = await achRes.json(); setAchievements(cAch); }
      if (waterRes?.ok) { cWater = await waterRes.json(); setWaterData(cWater); }

      if (checkinRes?.ok) {
        const cd = await checkinRes.json();
        if (cd?.granted) setShowVeroRewardTip(true);
      }

      // Rewards (after checkin so balance is up to date)
      try {
        const [rewardRes, focusRes, levelRes] = await Promise.all([
          fetch(`${API_URL}/api/rewards/${pid}/today?lang=${lang}`),
          fetch(`${API_URL}/api/daily-plan/${pid}/focus?lang=${lang}`),
          fetch(`${API_URL}/api/level/${pid}?lang=${lang}`),
        ]);
        if (rewardRes.ok) {
          const rd = await rewardRes.json();
          cBalance = rd.current_balance ?? 0; setRewardBalance(cBalance);
          cStreak = rd.current_streak ?? 0; setRewardStreak(cStreak);
        }
        if (focusRes.ok) setFocusData(await focusRes.json());
        if (levelRes.ok) setLevelData(await levelRes.json());
      } catch {}

      // Coach insights (lower priority, separate call)
      try {
        const coachRes = await fetch(`${API_URL}/api/coach/${pid}?lang=${lang}`);
        if (coachRes.ok) setCoachData(await coachRes.json());
      } catch {}

      if (recipeRes?.ok) {
        const d = await recipeRes.json();
        const list = d.recipes || (Array.isArray(d) ? d : []);
        cRecipes = list.slice(0, 4);
        setRecipes(cRecipes);
      }
      setLoadingRecipes(false);

      // 3. Cache for next cold start
      AsyncStorage.setItem('dashboard_cache', JSON.stringify({
        firstName: cFirstName, healthScore: cScore, hasPlan: cHasPlan,
        waterData: cWater, achievements: cAch, rewardBalance: cBalance,
        rewardStreak: cStreak, recipes: cRecipes, cachedAt: Date.now(),
      })).catch(() => {});

    } catch {}
  }, [lang]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    eventBus.on('profileUpdated', loadData);
    eventBus.on('waterUpdated', loadData);
    return () => {
      eventBus.off('profileUpdated', loadData);
      eventBus.off('waterUpdated', loadData);
    };
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
    if (!symptomText.trim() && selectedTags.length === 0) {
      Alert.alert(
        tx(lang, { de: 'Hinweis', it: 'Avviso', en: 'Notice', tr: 'Uyari', fr: 'Avis', es: 'Aviso', ru: 'Уведомление' }),
        tx(lang, { de: 'Bitte beschreiben Sie Ihre Symptome oder waehlen Sie einen Bereich aus.', it: 'Descrivete i vostri sintomi o selezionate un area.', en: 'Please describe your symptoms or select an area.', tr: 'Lutfen belirtilerinizi tanimlayin veya bir alan secin.', fr: 'Veuillez decrire vos symptomes ou selectionner un domaine.', es: 'Por favor describa sus sintomas o seleccione un area.', ru: 'Пожалуйста, опишите свои симптомы или выберите область.' })
      );
      return;
    }
    setIsAnalyzing(true);
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      const res = await fetch(`${API_URL}/api/symptoms/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: symptomText, tags: selectedTags, lang, profile_id: profileId }),
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
  if (!disclaimerAccepted) return <DisclaimerScreen lang={lang} setLang={setLang} onAccept={acceptDisclaimer} />;

  const greeting = firstName
    ? (tx(lang, { de: `Hallo ${firstName},`, it: `Ciao ${firstName},`, en: `Hello ${firstName},`, tr: `Merhaba ${firstName},`, fr: `Bonjour ${firstName},`, es: `Hola ${firstName},`, ru: `Привет ${firstName},` }))
    : (tx(lang, { de: 'Willkommen!', it: 'Benvenuto!', en: 'Welcome!', tr: 'Hosgeldiniz!', fr: 'Bienvenue!', es: 'Bienvenido!', ru: 'Добro pozhalovat!' }));
  const subtitle = tx(lang, { de: 'Willkommen zurueck!', it: 'Bentornato!', en: 'Welcome back!', tr: 'Tekrar hosgeldiniz!', fr: 'Bon retour!', es: 'Bienvenido de nuevo!', ru: 'С возвращением!' });
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
              <Text style={s.featureTitle}>{tx(lang, { de: 'Dein\nEinnahme Plan', it: 'Il tuo\nPiano Assunzione', en: 'Your\nIntake Plan', tr: 'Alım\nPlanın', fr: 'Votre\nPlan de Prise', es: 'Tu\nPlan de Toma', ru: 'Ваш\nПлан Приема' })}</Text>
              <MaterialCommunityIcons name="pill" size={40} color="rgba(255,255,255,0.3)" style={s.featureIcon} />
              <Text style={s.featureStat}>
                {hasPlan ? (tx(lang, { de: 'Plan aktiv', it: 'Piano attivo', en: 'Plan active', tr: 'Plan aktif', fr: 'Plan actif', es: 'Plan activo', ru: 'План активен' })) : (tx(lang, { de: 'Plan erstellen', it: 'Crea piano', en: 'Create plan', tr: 'Plan olustur', fr: 'Creer un plan', es: 'Crear plan', ru: 'Создать план' }))}
              </Text>
              <View style={s.featureCta}>
                <Text style={s.featureCtaText}>{tx(lang, { de: 'Zum Plan', it: 'Al piano', en: 'To plan', tr: 'Plana git', fr: 'Au plan', es: 'Al plan', ru: 'К плану' })}</Text>
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
              <Text style={s.featureTitle}>{tx(lang, { de: 'Deine\nFortschritte', it: 'I tuoi\nProgressi', en: 'Your\nProgress', tr: 'İlerleme\nDurumun', fr: 'Vos\nProgres', es: 'Tu\nProgreso', ru: 'Ваш\nПрогресс' })}</Text>
              <MaterialCommunityIcons name="chart-line" size={40} color="rgba(255,255,255,0.3)" style={s.featureIcon} />
              <Text style={s.featureStat}>
                {earnedCount > 0
                  ? (tx(lang, { de: `${earnedCount} Ziele erreicht!`, it: `${earnedCount} obiettivi!`, en: `${earnedCount} goals reached!`, tr: `${earnedCount} hedef ulasildi!`, fr: `${earnedCount} objectifs atteints!`, es: `${earnedCount} objetivos alcanzados!`, ru: `${earnedCount} целей достигнуто!` }))
                  : (tx(lang, { de: 'Fortschritt tracken', it: 'Traccia progressi', en: 'Track progress', tr: 'Ilerlemeyi takip et', fr: 'Suivre les progres', es: 'Seguir progreso', ru: 'Отслеживать прогресс' }))}
              </Text>
              <View style={s.featureCta}>
                <Text style={[s.featureCtaText, { color: '#9E5500' }]}>{tx(lang, { de: 'Ansehen', it: 'Visualizza', en: 'View', tr: 'Goruntule', fr: 'Voir', es: 'Ver', ru: 'Просмотр' })}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#9E5500" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        </View>

        {/* Rewards Points Card */}
        {hasProfile && (

          <>
          {/* DEIN HEUTIGER FOKUS */}
          {focusData && focusData.items?.length > 0 && (
            <View style={s.focusCard} data-testid="daily-focus-card">
              {/* VERO Coach Message */}
              {focusData.vero_message && (
                <View style={s.focusVeroRow}>
                  <Image source={VERO_HALLO} style={s.focusVeroImg} resizeMode="contain" />
                  <Text style={s.focusVeroText}>{focusData.vero_message}</Text>
                </View>
              )}
              <Text style={s.focusTitle}>{tx(lang, { de: 'Dein heutiger Fokus', it: 'Il tuo focus di oggi', en: 'Your daily focus' })}</Text>
              {focusData.items.slice(0, 3).map((item: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={s.focusItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.action === 'plan') router.push('/(tabs)/plan' as any);
                    else if (item.action === 'medications') router.push('/medications' as any);
                    else if (item.action === 'water-tracking') router.push('/water-tracking' as any);
                    else if (item.action === 'stress') router.push('/stress' as any);
                    else if (item.action === 'tracking') router.push('/tracking' as any);
                  }}
                  data-testid={`focus-item-${item.type}`}
                >
                  <View style={[s.focusIconWrap, { backgroundColor: item.color + '14' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={s.focusItemText}>{item.text}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STRESS SMART TRIGGER BANNER */}
          {focusData?.stress_trigger && (
            <TouchableOpacity
              style={s.stressTrigger}
              activeOpacity={0.8}
              onPress={() => router.push('/stress' as any)}
              data-testid="stress-trigger-banner"
            >
              <LinearGradient colors={['#4C1D95', '#6D28D9']} style={s.stressTriggerGradient}>
                <MaterialCommunityIcons name="meditation" size={28} color="#E9D5FF" />
                <View style={{ flex: 1 }}>
                  <Text style={s.stressTriggerTitle}>{tx(lang, { de: 'Du brauchst gerade eine Pause', it: 'Hai bisogno di una pausa', en: 'You need a break' })}</Text>
                  <Text style={s.stressTriggerSub}>{focusData.trigger_reason}</Text>
                </View>
                <View style={s.stressTriggerCta}>
                  <Text style={s.stressTriggerCtaText}>{tx(lang, { de: '2 Min Reset', it: '2 min reset', en: '2 min reset' })}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={s.rewardsCard}
            activeOpacity={0.85}
            onPress={() => router.push('/rewards' as any)}
            data-testid="rewards-dashboard-card"
          >
            <View style={s.rewardsLeft}>
              <MaterialCommunityIcons name="star-four-points" size={24} color="#F59E0B" />
              <View style={s.rewardsInfo}>
                <Text style={s.rewardsLabel}>{tx(lang, { de: 'Deine Punkte', it: 'I tuoi punti', en: 'Your Points' })}</Text>
                <Text style={s.rewardsValue} data-testid="dashboard-points-value">{rewardBalance}</Text>
              </View>
            </View>
            <View style={s.rewardsRight}>
              {rewardStreak > 0 && (
                <View style={s.rewardsStreakBig}>
                  <MaterialCommunityIcons name="fire" size={22} color="#F59E0B" />
                  <Text style={s.rewardsStreakBigText}>{rewardStreak} {tx(lang, { de: 'Tage', it: 'giorni', en: 'days' })}</Text>
                </View>
              )}
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Level Progress + Daily Goal */}
          {levelData && (
            <View style={s.levelHomeCard}>
              <View style={s.levelHomeRow}>
                <MaterialCommunityIcons name={(levelData.icon || 'seed-outline') as any} size={18} color="#2E7D52" />
                <Text style={s.levelHomeTitle}>Lv. {levelData.level} {levelData.title}</Text>
                <Text style={s.levelHomePts}>{levelData.points_to_next > 0 ? `${levelData.points_to_next} ${tx(lang, { de: 'bis Lv.', it: 'per Lv.', en: 'to Lv.' })} ${levelData.level + 1}` : 'MAX'}</Text>
              </View>
              <View style={s.levelHomeBar}>
                <View style={[s.levelHomeFill, { width: `${levelData.progress_pct}%` }]} />
              </View>
            </View>
          )}
          </>
        )}

        {/* VERO Reward Tip */}
        {showVeroRewardTip && hasProfile && (
          <View style={s.veroTipCard} data-testid="vero-reward-tip">
            <Image source={VERO_HALLO} style={s.veroTipAvatar} resizeMode="contain" />
            <View style={s.veroTipContent}>
              <Text style={s.veroTipTitle}>{tx(lang, { de: 'VERO Tipp', it: 'Consiglio VERO', en: 'VERO Tip' })}</Text>
              <Text style={s.veroTipText}>
                {tx(lang, {
                  de: 'Sammle Punkte fuer deine Gesundheit! Du erhaeltst Punkte fuer: Wasser trinken, Supplements einnehmen, Medikamente bestaetigen, Tagebuch fuehren und deinen taeglichen Check-in. Loesche deine Punkte gegen tolle Praemien ein!',
                  it: 'Raccogli punti per la tua salute! Guadagni punti per: bere acqua, assumere integratori, confermare farmaci, compilare il diario e il check-in giornaliero. Riscatta i tuoi punti per fantastici premi!',
                  en: 'Earn points for your health! You get points for: drinking water, taking supplements, confirming medications, journaling and your daily check-in. Redeem your points for great rewards!',
                })}
              </Text>
              <TouchableOpacity
                style={s.veroTipClose}
                onPress={() => setShowVeroRewardTip(false)}
                data-testid="vero-tip-close"
              >
                <Text style={s.veroTipCloseText}>{tx(lang, { de: 'Verstanden', it: 'Capito', en: 'Got it' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
              <Text style={s.analysisTitle}>{tx(lang, { de: 'Symptom-Analyse', it: 'Analisi sintomi', en: 'Symptom Analysis', tr: 'Semptom Анализi', fr: 'Analyse des symptomes', es: 'Analisis de sintomas', ru: 'Анализ simptomov' })}</Text>
              <Text style={s.analysisSub}>{tx(lang, { de: 'Beschreibe deine Symptome', it: 'Descrivi i tuoi sintomi', en: 'Describe your symptoms', tr: 'Belirtilerinizi tanimlayin', fr: 'Decrivez vos symptomes', es: 'Describa sus sintomas', ru: 'Опишите свои симптомы' })}</Text>
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

        {/* Water Tracking Card - Animated */}
        {hasProfile && (
          <WaterTrackerCard
            profileId={profileId}
            lang={lang}
            waterData={waterData}
            onDataUpdate={loadData}
            onWaterUpdate={setWaterData}
            onNavigate={() => router.push('/water-tracking' as any)}
          />
        )}

        {/* Stress Management Card */}
        {hasProfile && (
          <TouchableOpacity
            style={s.stressCard}
            activeOpacity={0.85}
            onPress={() => router.push('/stress' as any)}
            data-testid="stress-dashboard-card"
          >
            <LinearGradient colors={['#1A2D26', '#2E4A3E']} style={s.stressGradient}>
              <View style={s.stressLeft}>
                <View style={s.stressIconWrap}>
                  <MaterialCommunityIcons name="weather-windy" size={22} color="#A7F3D0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.stressTitle}>{tx(lang, { de: 'Stress & Entspannung', it: 'Stress & Rilassamento', en: 'Stress & Relaxation' })}</Text>
                  <Text style={s.stressSub}>{tx(lang, { de: 'Atemuebungen, Mini-Pausen & mehr', it: 'Esercizi di respirazione, mini-pause e altro', en: 'Breathing exercises, mini-breaks & more' })}</Text>
                </View>
              </View>
              <View style={s.stressCta}>
                <Text style={s.stressCtaText}>{tx(lang, { de: 'Starten', it: 'Inizia', en: 'Start' })}</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color="#A7F3D0" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}


        {/* VERO Smart Coach Insights */}
        {coachData?.insights?.length > 0 && hasProfile && (
          <View style={s.coachSection}>
            <Text style={s.coachSectionTitle}>{tx(lang, { de: 'VERO empfiehlt', it: 'VERO consiglia', en: 'VERO recommends' })}</Text>
            {coachData.insights.slice(0, 2).map((insight: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={[s.coachCard, { borderLeftColor: insight.color }]}
                activeOpacity={0.8}
                onPress={() => insight.action && router.push(
                  (insight.action === 'plan' ? '/(tabs)/plan' :
                  insight.action === 'water-tracking' ? '/water-tracking' :
                  insight.action === 'stress' ? '/stress' : '/tracking') as any
                )}
              >
                <View style={[s.coachIconWrap, { backgroundColor: insight.color + '14' }]}>
                  <MaterialCommunityIcons name={insight.icon as any} size={18} color={insight.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.coachTitle}>{insight.title}</Text>
                  <Text style={s.coachText} numberOfLines={2}>{insight.text}</Text>
                </View>
                {insight.action && <MaterialCommunityIcons name="chevron-right" size={16} color="#D1D5DB" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recipes Section */}
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.sectionTitle}>{tx(lang, { de: 'Passende Rezepte fuer dich', it: 'Ricette adatte a te', en: 'Recipes for you', tr: 'Senin icin tarifler', fr: 'Recettes pour vous', es: 'Recetas para ti', ru: 'Рецепты для вас' })}</Text>
            <Text style={s.sectionSub}>{tx(lang, { de: 'Gesund & lecker', it: 'Sano e gustoso', en: 'Healthy & delicious', tr: 'Saglikli ve lezzetli', fr: 'Sain et delicieux', es: 'Saludable y delicioso', ru: 'Полезно и вкусно' })}</Text>
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
                  {r.recommendation_reason ? (
                    <Text style={s.recipeReason} numberOfLines={2}>{r.recommendation_reason}</Text>
                  ) : r.relevance_tags?.length > 0 ? (
                    <Text style={s.recipeRelevance} numberOfLines={1}>{r.relevance_tags[0]}</Text>
                  ) : (
                    <Text style={s.recipeTag} numberOfLines={1}>{r[`category_${lang}`] || r.category_de || ''}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: '#9CA3AF', padding: 12 }}>{tx(lang, { de: 'Keine Rezepte vorhanden', it: 'Nessuna ricetta disponibile', en: 'No recipes available', tr: 'Tarif bulunamadi', fr: 'Aucune recette disponible', es: 'No hay recetas disponibles', ru: 'Нет доступных рецептов' })}</Text>
          )}
        </ScrollView>


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
            <Text style={s.infoTitle}>{tx(lang, { de: 'Dein\nGesundheitsstatus', it: 'Il tuo\nStato di Salute', en: 'Your\nHealth Status', tr: 'Saglik\nDurumun', fr: 'Votre\nEtat de Sante', es: 'Tu\nEstado de Salud', ru: 'Ваше\nЗдоровье' })}</Text>
            {healthScore !== null && (
              <Text style={[s.infoScore, { color: '#2E7D52' }]}>{healthScore}/100</Text>
            )}
            <View style={s.infoCta}>
              <Text style={[s.infoCtaText, { color: '#2E7D52' }]}>{tx(lang, { de: 'Profil ansehen', it: 'Vedi profilo', en: 'View profile', tr: 'Profili gor', fr: 'Voir le profil', es: 'Ver perfil', ru: 'Смотреть профиль' })}</Text>
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
            <Text style={s.infoTitle}>{tx(lang, { de: 'Gesundheits-\nTipps', it: 'Consigli\nSalute', en: 'Health\nTips', tr: 'Sağlık\nİpuçları', fr: 'Conseils\nSante', es: 'Consejos\nSalud', ru: 'Советы\nЗдоровье' })}</Text>
            <View style={s.infoCta}>
              <Text style={[s.infoCtaText, { color: '#E8820C' }]}>{tx(lang, { de: 'Nuetzliche Infos', it: 'Info utili', en: 'Useful Info', tr: 'Faydali Bilgiler', fr: 'Infos utiles', es: 'Informacion util', ru: 'Полезная информация' })}</Text>
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
            <Text style={s.trackingTitle}>{tx(lang, { de: 'Tagebuch & Tracking', it: 'Diario & Tracking', en: 'Diary & Tracking', tr: 'Gunce ve Takip', fr: 'Journal & Suivi', es: 'Diario & Seguimiento', ru: 'Дневник и Отслеживание' })}</Text>
            <Text style={s.trackingSub}>{tx(lang, { de: 'Schlaf, Energie & Wohlbefinden', it: 'Sonno, Energia & Benessere', en: 'Sleep, Energy & Wellbeing', tr: 'Uyku, Enerji ve Saglik', fr: 'Sommeil, Energie & Bien-etre', es: 'Sueno, Energia y Bienestar', ru: 'Сон, Энергия и Самочувствие' })}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#6366F1" />
        </TouchableOpacity>

        {/* Language Switcher */}
        <View style={s.langSection} data-testid="language-switcher">
          <Text style={s.langTitle}>{
            lang === 'de' ? 'Sprache' :
            lang === 'it' ? 'Lingua' :
            lang === 'en' ? 'Language' :
            lang === 'tr' ? 'Dil' :
            lang === 'fr' ? 'Langue' :
            lang === 'es' ? 'Idioma' :
            'Язык'
          }</Text>
          <View style={s.langRow}>
            {([
              { code: 'de' as const, flag: '\u{1F1E9}\u{1F1EA}', label: 'Deutsch' },
              { code: 'it' as const, flag: '\u{1F1EE}\u{1F1F9}', label: 'Italiano' },
              { code: 'en' as const, flag: '\u{1F1EC}\u{1F1E7}', label: 'English' },
            ]).map(item => (
              <TouchableOpacity
                key={item.code}
                style={[s.langBtn, lang === item.code && s.langBtnActive]}
                onPress={() => setLang(item.code)}
                data-testid={`lang-${item.code}-btn`}
              >
                <Text style={s.langFlag}>{item.flag}</Text>
                <Text style={[s.langBtnText, lang === item.code && s.langBtnTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* VERO Account Recommendation + Registration (when not logged in) */}
        {!user && (
          <View style={s.accountSection} data-testid="dashboard-account-section">
            {/* VERO explains why to register */}
            <View style={s.veroAccountTip}>
              <Image source={VERO_HALLO} style={s.veroAccountAvatar} resizeMode="contain" />
              <View style={s.veroAccountContent}>
                <Text style={s.veroAccountTitle}>{tx(lang, { de: 'VERO empfiehlt', it: 'VERO consiglia', en: 'VERO recommends' })}</Text>
                <Text style={s.veroAccountText}>
                  {tx(lang, {
                    de: 'Erstelle ein kostenloses Konto, damit deine Gesundheitsdaten, Punkte und Fortschritte sicher gespeichert werden. So kannst du auch bei einem Geraetewechsel nahtlos weitermachen!',
                    it: 'Crea un account gratuito per salvare in sicurezza i tuoi dati sanitari, punti e progressi. Cosi puoi continuare senza interruzioni anche cambiando dispositivo!',
                    en: 'Create a free account to securely save your health data, points and progress. This way you can seamlessly continue even when switching devices!',
                  })}
                </Text>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={s.accountBanner}
              activeOpacity={0.85}
              onPress={() => router.push('/login' as any)}
              data-testid="dashboard-register-banner"
            >
              <LinearGradient colors={['#1B5E3B', '#2E7D52']} style={s.accountBannerGradient}>
                <View style={s.accountBannerIcon}>
                  <MaterialCommunityIcons name="shield-account-outline" size={28} color="#fff" />
                </View>
                <View style={s.accountBannerText}>
                  <Text style={s.accountBannerTitle}>
                    {tx(lang, { de: 'Konto erstellen oder anmelden', it: 'Crea account o accedi', en: 'Create account or sign in' })}
                  </Text>
                  <Text style={s.accountBannerSub}>
                    {tx(lang, { de: 'Daten sichern, synchronisieren & auf allen Geraeten nutzen', it: 'Proteggi, sincronizza e usa i dati su tutti i dispositivi', en: 'Secure, sync & use your data on all devices' })}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Floating Reset Button */}
      {hasProfile && (
        <TouchableOpacity
          style={s.floatingBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/stress-player?exerciseId=breath_calm' as any)}
          data-testid="floating-reset-btn"
        >
          <LinearGradient colors={['#6D28D9', '#8B5CF6']} style={s.floatingBtnGradient}>
            <MaterialCommunityIcons name="meditation" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 48 : 32,
    paddingBottom: 8,
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
  scrollContent: { paddingTop: 35 },
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
  recipeRelevance: { fontSize: 11, color: '#2E9E6B', fontWeight: '600', marginTop: 3 },
  recipeReason: { fontSize: 11, color: '#1B6B45', fontStyle: 'italic', marginTop: 3, lineHeight: 14 },
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
  // Water Card (REMOVED - now using WaterTrackerCard component)
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
  langSection: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
  },
  langTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2D26',
    marginBottom: 10,
  },
  langRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E0E7E3',
    backgroundColor: '#F8FAF9',
  },
  langBtnActive: {
    borderColor: '#1B6B45',
    backgroundColor: '#E8F5E9',
  },
  langFlag: {
    fontSize: 14,
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8FA39B',
  },
  langBtnTextActive: {
    color: '#1B6B45',
  },
  // Rewards card styles
  rewardsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SIDE_PAD,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  rewardsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rewardsInfo: {},
  rewardsLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  rewardsValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  rewardsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardsStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  rewardsStreakText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  // VERO Reward Tip
  veroTipCard: {
    flexDirection: 'row',
    marginHorizontal: SIDE_PAD,
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 10,
  },
  veroTipAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  veroTipContent: {
    flex: 1,
  },
  veroTipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  veroTipText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 17,
  },
  veroTipClose: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#2E7D52',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  veroTipCloseText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Stress Card
  stressCard: {
    marginHorizontal: SIDE_PAD,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  stressGradient: {
    padding: 16,
  },
  stressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stressIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(167,243,208,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E8F5E9',
  },
  stressSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  stressCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 8,
  },
  stressCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  // Focus Card
  focusCard: {
    marginHorizontal: SIDE_PAD, marginBottom: 12, backgroundColor: '#fff',
    borderRadius: 16, padding: 14, borderLeftWidth: 4, borderLeftColor: '#2E7D52',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
  },
  focusVeroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 8 },
  focusVeroImg: { width: 32, height: 38 },
  focusVeroText: { flex: 1, fontSize: 13, color: '#065F46', fontWeight: '500', lineHeight: 17 },
  focusTitle: { fontSize: 15, fontWeight: '700', color: '#1A2D26', marginBottom: 8 },
  focusItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  focusIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  focusItemText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' },
  // Stress Trigger Banner
  stressTrigger: { marginHorizontal: SIDE_PAD, marginBottom: 12, borderRadius: 14, overflow: 'hidden' },
  stressTriggerGradient: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  stressTriggerTitle: { fontSize: 14, fontWeight: '700', color: '#F3E8FF' },
  stressTriggerSub: { fontSize: 12, color: 'rgba(243,232,255,0.7)', marginTop: 2 },
  stressTriggerCta: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  stressTriggerCtaText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  // Floating Reset Button
  floatingBtn: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 76, right: 16,
    width: 52, height: 52, borderRadius: 26, overflow: 'hidden',
    elevation: 8, shadowColor: '#6D28D9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    zIndex: 100,
  },
  floatingBtnGradient: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  // Smart Coach
  coachSection: { marginHorizontal: SIDE_PAD, marginBottom: 12 },
  coachSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A2D26', marginBottom: 8 },
  coachCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6,
    borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  coachIconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  coachTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  coachText: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 16 },
  // Rewards streak - bigger
  rewardsStreakBig: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  rewardsStreakBigText: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  // Level Home Card
  levelHomeCard: {
    marginHorizontal: SIDE_PAD, marginTop: -4, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 10, paddingHorizontal: 14,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3,
  },
  levelHomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelHomeTitle: { fontSize: 13, fontWeight: '700', color: '#1A2D26', flex: 1 },
  levelHomePts: { fontSize: 11, color: '#6B7280' },
  levelHomeBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  levelHomeFill: { height: 4, backgroundColor: '#2E7D52', borderRadius: 2 },
  accountBanner: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  accountBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  accountBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountBannerText: {
    flex: 1,
  },
  accountBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  accountBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
  },
  accountSection: {
    marginHorizontal: SIDE_PAD,
    marginTop: 20,
    gap: 12,
  },
  veroAccountTip: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  veroAccountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  veroAccountContent: {
    flex: 1,
  },
  veroAccountTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  veroAccountText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
});
