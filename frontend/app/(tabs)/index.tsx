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
      setProfileId(profileId);
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
        // Load water tracking
        try {
          const waterRes = await fetch(`${API_URL}/api/water-tracking/${profileId}/today?lang=${lang}`);
          if (waterRes.ok) setWaterData(await waterRes.json());
        } catch {}
        // Load reward balance and grant daily checkin
        try {
          // Grant daily check-in points (anti-abuse: only once/day)
          const checkinRes = await fetch(`${API_URL}/api/rewards/grant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile_id: profileId, action: 'daily_checkin' }),
          });
          const checkinData = checkinRes.ok ? await checkinRes.json() : null;
          // Show VERO tip if check-in was granted (= first visit today)
          if (checkinData?.granted) setShowVeroRewardTip(true);

          const rewardRes = await fetch(`${API_URL}/api/rewards/${profileId}/today?lang=${lang}`);
          if (rewardRes.ok) {
            const rd = await rewardRes.json();
            setRewardBalance(rd.current_balance ?? 0);
            setRewardStreak(rd.current_streak ?? 0);
          }
        } catch {}
      }
    } catch {}
    // Load recipes (personalized if profile exists)
    // Note: use local profileId variable (fetched above), not state variable
    const localProfileId = await AsyncStorage.getItem('health_profile_id');
    try {
      setLoadingRecipes(true);
      const recipeUrl = localProfileId
        ? `${API_URL}/api/recipes/personalized/${localProfileId}?lang=${lang}`
        : `${API_URL}/api/recipes?lang=${lang}&limit=4`;
      const res = await fetch(recipeUrl);
      if (res.ok) {
        const d = await res.json();
        const list = d.recipes || (Array.isArray(d) ? d : []);
        setRecipes(list.slice(0, 4));
      }
    } catch {} finally {
      setLoadingRecipes(false);
    }
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
                <View style={s.rewardsStreakBadge}>
                  <MaterialCommunityIcons name="fire" size={14} color="#F59E0B" />
                  <Text style={s.rewardsStreakText}>{rewardStreak}</Text>
                </View>
              )}
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
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
            onNavigate={() => router.push('/water-tracking' as any)}
          />
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
});
