import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Dimensions, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../../src/LangContext';
import { tx } from '../../src/i18n';
import { useBrand } from '../../src/BrandContext';
import { useGuide } from '../../src/GuideContext';
import { useAuth } from '../../src/AuthContext';
import { eventBus } from '../../src/eventBus';
import { setCurrentAnalysis } from '../../src/store';
import { DisclaimerScreen } from '../../components/home/DisclaimerScreen';
import { FeaturedProductsSlider } from '../../components/FeaturedProductsSlider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDE_PAD = 16;

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const VERO_HALLO = require('../../assets/images/vero-hallo.png');
const VERO_DASHBOARD = require('../../assets/images/vero-dashboard.png');

// Category card config
const CATEGORIES = [
  {
    key: 'supplements',
    icon: 'pill' as const,
    color: '#C2272F',
    bg: '#FEE2E2',
    label_de: 'Vitamine & Gesundheit',
    label_it: 'Vitamine & Salute',
    label_en: 'Vitamins & Health',
    sub_de: 'Plan, Einnahmen, Medikamente',
    sub_it: 'Piano, assunzioni',
    sub_en: 'Plan, intake, meds',
    route: '/(tabs)/plan',
  },
  {
    key: 'stress',
    icon: 'meditation' as const,
    color: '#6D28D9',
    bg: '#F3E8FF',
    label_de: 'Stress & Entspannung',
    label_it: 'Stress & Relax',
    label_en: 'Stress & Relax',
    sub_de: 'Atemübungen, Pausen',
    sub_it: 'Respirazione, pause',
    sub_en: 'Breathing, breaks',
    route: '/stress',
  },
  {
    key: 'weight',
    icon: 'scale-balance' as const,
    color: '#E8820C',
    bg: '#FEF3C7',
    label_de: 'Gewicht & Stoffwechsel',
    label_it: 'Peso & Metabolismo',
    label_en: 'Weight & Metabolism',
    sub_de: 'Fasten, Kalorien, Tagesplan',
    sub_it: 'Digiuno, calorie',
    sub_en: 'Fasting, calories',
    route: '/weight-metabolism',
  },
  {
    key: 'recipes',
    icon: 'silverware-fork-knife' as const,
    color: '#0EA5E9',
    bg: '#E0F2FE',
    label_de: 'Ernährung & Rezepte',
    label_it: 'Nutrizione & Ricette',
    label_en: 'Nutrition & Recipes',
    sub_de: 'Personalisiert für dich',
    sub_it: 'Per te',
    sub_en: 'For you',
    route: '/(tabs)/recipes',
  },
];

export default function DashboardHome() {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const { brand, appName } = useBrand();
  const insets = useSafeAreaInsets();
  const guide = useGuide();
  const { user } = useAuth();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [waterData, setWaterData] = useState<any>(null);
  const [rewardStreak, setRewardStreak] = useState<number>(0);
  const [focusData, setFocusData] = useState<any>(null);
  const [levelData, setLevelData] = useState<any>(null);
  const [coachData, setCoachData] = useState<any>(null);
  const [todayCollapsed, setTodayCollapsed] = useState(true);

  // Disclaimer
  useEffect(() => {
    AsyncStorage.getItem('disclaimer_accepted')
      .then(val => setDisclaimerAccepted(val === 'true'))
      .catch(() => setDisclaimerAccepted(false));
  }, []);

  const loadData = useCallback(async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    setHasProfile(!!pid);
    setProfileId(pid);
    if (!pid) return;

    // Cached
    try {
      const cached = await AsyncStorage.getItem('dashboard_cache_v2');
      if (cached) {
        const c = JSON.parse(cached);
        if (c.firstName) setFirstName(c.firstName);
        if (c.hasPlan !== undefined) setHasPlan(c.hasPlan);
        if (c.waterData) setWaterData(c.waterData);
        if (c.rewardStreak !== undefined) setRewardStreak(c.rewardStreak);
      }
    } catch {}

    // Fetch
    try {
      const [profileRes, planRes, waterRes, focusRes, levelRes, rewardRes, coachRes] = await Promise.all([
        fetch(`${API_URL}/api/health-profile/${pid}`).catch(() => null),
        fetch(`${API_URL}/api/supplement-plan/${pid}`).catch(() => null),
        fetch(`${API_URL}/api/water-tracking/${pid}/today?lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/api/daily-plan/${pid}/focus?lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/api/level/${pid}?lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/api/rewards/${pid}/today?lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/api/coach/${pid}?lang=${lang}`).catch(() => null),
      ]);

      let cFN: string | null = null;
      let cHasPlan = false;
      let cWater: any = null;
      let cStreak = 0;

      if (profileRes?.ok) {
        const d = await profileRes.json();
        cFN = d.profile?.first_name || null;
        setFirstName(cFN);
      }
      if (planRes) { cHasPlan = planRes.ok; setHasPlan(cHasPlan); }
      if (waterRes?.ok) { cWater = await waterRes.json(); setWaterData(cWater); }
      if (focusRes?.ok) setFocusData(await focusRes.json());
      if (levelRes?.ok) setLevelData(await levelRes.json());
      if (rewardRes?.ok) {
        const rd = await rewardRes.json();
        cStreak = rd.current_streak ?? 0;
        setRewardStreak(cStreak);
      }
      if (coachRes?.ok) setCoachData(await coachRes.json());

      AsyncStorage.setItem('dashboard_cache_v2', JSON.stringify({
        firstName: cFN, hasPlan: cHasPlan, waterData: cWater, rewardStreak: cStreak,
      })).catch(() => {});
    } catch {}
  }, [lang]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-expand "Heute" card when there are many open tasks (urgent)
  useEffect(() => {
    if (focusData?.total_open >= 5) setTodayCollapsed(false);
  }, [focusData?.total_open]);
  useEffect(() => {
    eventBus.on('profileUpdated', loadData);
    eventBus.on('waterUpdated', loadData);
    eventBus.on('weight_metabolism_changed', loadData);
    return () => {
      eventBus.off('profileUpdated', loadData);
      eventBus.off('waterUpdated', loadData);
      eventBus.off('weight_metabolism_changed', loadData);
    };
  }, [loadData]);

  // Lightweight refresh — only re-fetches the focus + water + reward endpoints so the "Heute fuer dich"
  // list updates instantly when the user comes back from completing a task.
  const refreshFocus = useCallback(async () => {
    const pid = profileId || await AsyncStorage.getItem('health_profile_id');
    if (!pid) return;
    try {
      const [focusRes, waterRes, rewardRes] = await Promise.all([
        fetch(`${API_URL}/api/daily-plan/${pid}/focus?lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/api/water-tracking/${pid}/today?lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/api/rewards/${pid}/today?lang=${lang}`).catch(() => null),
      ]);
      if (focusRes?.ok) setFocusData(await focusRes.json());
      if (waterRes?.ok) setWaterData(await waterRes.json());
      if (rewardRes?.ok) {
        const rd = await rewardRes.json();
        setRewardStreak(rd.current_streak ?? 0);
      }
    } catch {}
  }, [profileId, lang]);

  // Reload focus list every time the home-tab gains focus (e.g. after returning from a sub-screen
  // where the user completed a task). This guarantees an instant update of "Heute fuer dich".
  useFocusEffect(
    useCallback(() => {
      refreshFocus();
    }, [refreshFocus])
  );

  const acceptDisclaimer = useCallback(async () => {
    await AsyncStorage.setItem('disclaimer_accepted', 'true');
    setDisclaimerAccepted(true);
    guide.setDisclaimerAccepted(true);
  }, [guide]);

  if (disclaimerAccepted === null) {
    return <View style={s.loadingContainer}><ActivityIndicator size="large" color="#C2272F" /></View>;
  }
  if (!disclaimerAccepted) {
    return <DisclaimerScreen lang={lang} setLang={setLang} onAccept={acceptDisclaimer} />;
  }

  const greeting = firstName
    ? tx(lang, { de: `Hallo ${firstName}`, it: `Ciao ${firstName}`, en: `Hello ${firstName}` })
    : tx(lang, { de: 'Hallo', it: 'Ciao', en: 'Hello' });

  // Top 3 priority items for "Heute fuer dich"
  const todayItems = (focusData?.items || []).slice(0, 3);
  const totalOpen = focusData?.total_open || 0;
  const veroMessage = focusData?.vero_message;

  // Coach recommendations: top 2-3 smart insights
  const coachInsights = (coachData?.insights || []).slice(0, 3);

  const handleQuickAction = () => {
    if (todayItems.length === 0) return;
    const first = todayItems[0];
    if (first.action === 'plan') router.push('/(tabs)/plan' as any);
    else if (first.action === 'medications') router.push('/medications' as any);
    else if (first.action === 'water-tracking') router.push('/water-tracking' as any);
    else if (first.action === 'stress') router.push('/stress' as any);
    else if (first.action === 'tracking') router.push('/tracking' as any);
  };

  const handleItemTap = (action: string, item?: any) => {
    // Optimistic UI: remove the tapped item from the local list immediately so it
    // visually disappears even before the user has actually completed the task on
    // the target screen. When useFocusEffect fires on return, the real server
    // state will be re-synced.
    if (item && focusData?.items) {
      setFocusData((prev: any) => {
        if (!prev) return prev;
        const filtered = (prev.items || []).filter((it: any) => it !== item);
        return {
          ...prev,
          items: filtered,
          total_open: Math.max(0, (prev.total_open || 0) - 1),
        };
      });
    }
    if (action === 'plan') router.push('/(tabs)/plan' as any);
    else if (action === 'medications') router.push('/medications' as any);
    else if (action === 'water-tracking') router.push('/water-tracking' as any);
    else if (action === 'stress') router.push('/stress' as any);
    else if (action === 'tracking') router.push('/tracking' as any);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#FEE2E2', '#F1F8F3', '#F5F7FA']} style={s.bgGradient} />

      {/* Header bar (slim, no clutter) — brand aware + safe-area aware */}
      {brand.is_default ? (
        <LinearGradient
          colors={['#8B1A20', '#DC3540', '#EF4456']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[s.header, { paddingTop: insets.top + 12 }]}
        >
          <Text style={s.logoText} testID="header-brand-name">
            <Text style={s.logoVita}>Vita</Text>Guide<Text style={s.logoPlus}>+</Text>
          </Text>
        </LinearGradient>
      ) : (
        <View
          style={{
            paddingTop: insets.top + 0,
            paddingBottom: 4,
            paddingHorizontal: SIDE_PAD,
            backgroundColor: brand.primary_color,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          <Text
            style={{
              flex: 1,
              textAlign: 'right',
              color: '#E5E5E5',
              fontSize: 20,
              fontWeight: '300',
              letterSpacing: 3,
              fontFamily: Platform.select({ ios: 'Didot', android: 'serif', default: 'Didot, Georgia, serif' }),
              paddingRight: 10,
            }}
            testID="header-brand-prefix"
          >
            JOACHIM
          </Text>
          {brand.logo_url ? (
            <Image
              source={{ uri: brand.logo_url }}
              style={{ width: 52, height: 52, resizeMode: 'contain' }}
              testID="header-brand-logo"
            />
          ) : (
            <Text
              style={[s.logoText, { color: '#FFFFFF', fontSize: 22 }]}
              testID="header-brand-name"
            >
              {appName(lang)}
            </Text>
          )}
          <Text
            style={{
              flex: 1,
              textAlign: 'left',
              color: '#E5E5E5',
              fontSize: 20,
              fontWeight: '300',
              letterSpacing: 3,
              fontFamily: Platform.select({ ios: 'Didot', android: 'serif', default: 'Didot, Georgia, serif' }),
              paddingLeft: 10,
            }}
            testID="header-brand-suffix"
          >
            KAESER
          </Text>
        </View>
      )}

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ────────────── 1) HERO ────────────── */}
        <View style={s.hero}>
          <Image source={VERO_DASHBOARD} style={s.heroMascot} resizeMode="contain" />
          <View style={s.heroText}>
            <Text style={s.heroGreeting}>{greeting}</Text>
            <Text style={s.heroSub}>
              {tx(lang, { de: 'Bereit fuer heute?', it: 'Pronto per oggi?', en: 'Ready for today?' })}
            </Text>
          </View>
          <View style={s.heroCtaRow}>
            <TouchableOpacity
              style={[s.heroCta, { backgroundColor: '#C2272F' }]}
              activeOpacity={0.85}
              onPress={() => hasPlan ? router.push('/(tabs)/plan' as any) : router.push(hasProfile ? ('/(tabs)/plan' as any) : ('/onboarding' as any))}
              testID="hero-plan-btn"
            >
              <MaterialCommunityIcons name="calendar-check-outline" size={18} color="#FFFFFF" />
              <Text style={s.heroCtaText}>{tx(lang, { de: 'Mein Plan', it: 'Piano', en: 'Plan' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.heroCta, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' }]}
              activeOpacity={0.85}
              onPress={() => router.push('/progress' as any)}
              testID="hero-progress-btn"
            >
              <MaterialCommunityIcons name="chart-line" size={18} color="#C2272F" />
              <Text style={[s.heroCtaText, { color: '#C2272F' }]}>{tx(lang, { de: 'Fortschritt', it: 'Progressi', en: 'Progress' })}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured products slider (admin-managed) */}
        <FeaturedProductsSlider profileId={profileId} limit={8} />

        {/* ────────────── 2) HEUTE FUER DICH (collapsible) ────────────── */}
        {hasProfile && totalOpen > 0 && (
          <Animated.View entering={FadeInDown.duration(300)} style={s.todayCard} testID="today-card">
            <TouchableOpacity
              onPress={() => setTodayCollapsed(c => !c)}
              activeOpacity={0.7}
              style={s.todayHeader}
              testID="today-collapse-toggle"
            >
              <View style={{ flex: 1 }}>
                <Text style={s.todayTitle}>{tx(lang, { de: 'Heute fuer dich', it: 'Oggi per te', en: 'For you today' })}</Text>
                {todayCollapsed ? (
                  <Text style={s.todaySub}>
                    {totalOpen} {tx(lang, { de: 'Aufgaben offen', it: 'compiti aperti', en: 'tasks open' })}
                  </Text>
                ) : (
                  veroMessage ? <Text style={s.todaySub}>{veroMessage}</Text> : null
                )}
              </View>
              <View style={s.todayBadge}>
                <Text style={s.todayBadgeText}>{totalOpen}</Text>
              </View>
              <MaterialCommunityIcons name={todayCollapsed ? 'chevron-down' : 'chevron-up'} size={22} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Mini progress bar (always visible) */}
            <View style={s.todayMiniBar}>
              <View style={[s.todayMiniBarFill, { width: `${Math.min(100, ((focusData?.total_done || 0) / Math.max(1, (focusData?.total_done || 0) + totalOpen)) * 100)}%` }]} />
            </View>

            {!todayCollapsed && (
              <>
                <View style={s.todayList}>
                  {todayItems.map((item: any, i: number) => (
                    <TouchableOpacity
                      key={i}
                      style={s.todayRow}
                      activeOpacity={0.7}
                      onPress={() => handleItemTap(item.action, item)}
                      testID={`today-item-${item.type}`}
                    >
                      <View style={[s.todayDot, { backgroundColor: item.color + '22' }]}>
                        <MaterialCommunityIcons name={item.icon as any} size={16} color={item.color} />
                      </View>
                      <Text style={s.todayItemText} numberOfLines={1}>{item.text}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#D1D5DB" />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={s.todayCta}
                  activeOpacity={0.85}
                  onPress={handleQuickAction}
                  testID="today-cta-btn"
                >
                  <Text style={s.todayCtaText}>{tx(lang, { de: 'Jetzt starten', it: 'Inizia ora', en: 'Start now' })}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        )}

        {/* All done state */}
        {hasProfile && totalOpen === 0 && focusData && (
          <Animated.View entering={FadeInDown.duration(300)} style={[s.todayCard, s.todayCardDone]}>
            <View style={s.todayDoneRow}>
              <MaterialCommunityIcons name="check-circle" size={28} color="#B91C1C" />
              <View style={{ flex: 1 }}>
                <Text style={s.todayTitle}>
                  {tx(lang, { de: 'Alles erledigt!', it: 'Tutto fatto!', en: 'All done!' })}
                </Text>
                <Text style={s.todaySub}>
                  {tx(lang, { de: 'Starker Tag. Kategorien unten erkunden.', it: 'Esplora le categorie.', en: 'Great day. Explore below.' })}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ────────────── 3) KATEGORIEN ────────────── */}
        <Text style={s.sectionTitle}>
          {tx(lang, { de: 'Bereiche', it: 'Aree', en: 'Areas' })}
        </Text>
        <View style={s.catGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={s.catCard}
              activeOpacity={0.85}
              onPress={() => router.push(cat.route as any)}
              testID={`category-${cat.key}`}
            >
              <View style={[s.catIcon, { backgroundColor: cat.bg }]}>
                <MaterialCommunityIcons name={cat.icon} size={28} color={cat.color} />
              </View>
              <Text style={s.catLabel} numberOfLines={2}>
                {lang === 'it' ? cat.label_it : lang === 'en' ? cat.label_en : cat.label_de}
              </Text>
              <Text style={s.catSub} numberOfLines={1}>
                {lang === 'it' ? cat.sub_it : lang === 'en' ? cat.sub_en : cat.sub_de}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ────────────── 4) FORTSCHRITT (kompakt) ────────────── */}
        {hasProfile && (levelData || rewardStreak > 0) && (
          <TouchableOpacity
            style={s.progressCard}
            activeOpacity={0.85}
            onPress={() => router.push('/progress' as any)}
            testID="progress-summary-card"
          >
            <View style={s.progressTop}>
              <View style={s.progressStat}>
                <MaterialCommunityIcons
                  name={(levelData?.icon || 'seed-outline') as any}
                  size={20}
                  color="#C2272F"
                />
                <View>
                  <Text style={s.progressLabel}>{tx(lang, { de: 'Level', it: 'Livello', en: 'Level' })}</Text>
                  <Text style={s.progressValue}>
                    {levelData ? `${levelData.level} · ${levelData.title || ''}` : '–'}
                  </Text>
                </View>
              </View>
              {rewardStreak > 0 && (
                <View style={s.progressStat}>
                  <MaterialCommunityIcons name="fire" size={20} color="#F59E0B" />
                  <View>
                    <Text style={s.progressLabel}>{tx(lang, { de: 'Streak', it: 'Streak', en: 'Streak' })}</Text>
                    <Text style={s.progressValue}>
                      {rewardStreak} {tx(lang, { de: 'Tage', it: 'gg', en: 'd' })}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            {levelData && (
              <View style={s.progressBar}>
                <View style={[s.progressBarFill, { width: `${levelData.progress_pct || 0}%` }]} />
              </View>
            )}
            <View style={s.progressFooter}>
              <Text style={s.progressDetailText}>
                {tx(lang, { de: 'Details ansehen', it: 'Dettagli', en: 'See details' })}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        )}

        {/* ────────────── 5) VERO EMPFEHLUNGEN ────────────── */}
        {coachInsights.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <View style={s.recHeader}>
              <Image source={VERO_HALLO} style={s.recVeroImg} resizeMode="contain" />
              <Text style={s.sectionTitleInline}>
                {tx(lang, { de: 'VERO empfiehlt', it: 'VERO consiglia', en: 'VERO suggests' })}
              </Text>
            </View>
            {coachInsights.map((ins: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={s.recCard}
                activeOpacity={0.85}
                onPress={() => {
                  if (ins.action === 'water-tracking') router.push('/water-tracking' as any);
                  else if (ins.action === 'stress') router.push('/stress' as any);
                  else if (ins.action === 'plan') router.push('/(tabs)/plan' as any);
                  else if (ins.action === 'weight') router.push('/weight-metabolism' as any);
                }}
                testID={`coach-insight-${i}`}
              >
                <View style={[s.recIcon, { backgroundColor: (ins.color || '#C2272F') + '18' }]}>
                  <MaterialCommunityIcons name={(ins.icon || 'lightbulb-outline') as any} size={18} color={ins.color || '#C2272F'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.recTitle} numberOfLines={1}>{ins.title}</Text>
                  {ins.text ? <Text style={s.recText} numberOfLines={2}>{ins.text}</Text> : null}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No profile state */}
        {!hasProfile && (
          <TouchableOpacity
            style={s.onboardCta}
            activeOpacity={0.9}
            onPress={() => router.push('/onboarding' as any)}
            testID="onboarding-cta"
          >
            <LinearGradient colors={['#8B1A20', '#DC3540']} style={s.onboardGradient}>
              <MaterialCommunityIcons name="account-plus-outline" size={28} color="#FFFFFF" />
              <View style={{ flex: 1 }}>
                <Text style={s.onboardTitle}>
                  {tx(lang, { de: 'Lege los in 2 Minuten', it: 'Inizia in 2 minuti', en: 'Get started in 2 min' })}
                </Text>
                <Text style={s.onboardSub}>
                  {tx(lang, { de: 'Personalisiere deine Gesundheit', it: 'Personalizza salute', en: 'Personalize health' })}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },

  header: {
    paddingBottom: 18,
    paddingHorizontal: SIDE_PAD,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  logoText: { fontSize: 26, fontWeight: '800', color: '#FFD700', letterSpacing: -0.5 },
  logoVita: { color: '#FFFFFF', fontWeight: '800' },
  logoPlus: { color: '#FFD700', fontWeight: '800' },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 24, paddingBottom: 16 },

  // 1. Hero
  hero: {
    paddingHorizontal: SIDE_PAD,
    paddingTop: 8,
    paddingBottom: 20,
    position: 'relative',
  },
  heroMascot: {
    position: 'absolute',
    right: 8,
    top: -20,
    width: 110,
    height: 110,
    zIndex: 0,
    opacity: 0.95,
  },
  heroText: { zIndex: 1, marginRight: 110 },
  heroGreeting: { fontSize: 30, fontWeight: '800', color: '#1A2E35', letterSpacing: -0.6 },
  heroSub: { fontSize: 15, color: '#6B7280', marginTop: 4 },
  heroCtaRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  heroCta: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' as any },
    }),
  },
  heroCtaText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // 2. Heute
  todayCard: {
    marginHorizontal: SIDE_PAD,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' as any },
    }),
  },
  todayCardDone: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  todayDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14,
  },
  todayTitle: { fontSize: 17, fontWeight: '800', color: '#1A2E35' },
  todaySub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  todayBadge: {
    backgroundColor: '#FEF3C7',
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  todayBadgeText: { fontSize: 14, fontWeight: '800', color: '#B45309' },
  todayList: { gap: 10 },
  todayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 6,
  },
  todayDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  todayItemText: { flex: 1, fontSize: 14, color: '#1F2937', fontWeight: '600' },
  todayCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 14,
    backgroundColor: '#C2272F', paddingVertical: 13, borderRadius: 12,
  },
  todayCtaText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  todayMiniBar: {
    height: 5, backgroundColor: '#FDF4F4', borderRadius: 3,
    marginTop: 10, marginBottom: 4, overflow: 'hidden',
  },
  todayMiniBarFill: { height: '100%', backgroundColor: '#C2272F', borderRadius: 3 },

  // 3. Kategorien
  sectionTitle: {
    fontSize: 18, fontWeight: '800', color: '#1A2E35',
    paddingHorizontal: SIDE_PAD, marginBottom: 12, marginTop: 4,
  },
  sectionTitleInline: { fontSize: 16, fontWeight: '800', color: '#1A2E35' },
  catGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SIDE_PAD,
    gap: 10,
    marginBottom: 18,
  },
  catCard: {
    width: (SCREEN_WIDTH - SIDE_PAD * 2 - 10) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    minHeight: 110,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' as any },
    }),
  },
  catIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  catLabel: { fontSize: 14, fontWeight: '800', color: '#1A2E35', lineHeight: 18 },
  catSub: { fontSize: 11, color: '#6B7280', marginTop: 4 },

  // 4. Fortschritt
  progressCard: {
    marginHorizontal: SIDE_PAD, marginBottom: 20,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' as any },
    }),
  },
  progressTop: { flexDirection: 'row', gap: 18, marginBottom: 12 },
  progressStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  progressValue: { fontSize: 14, fontWeight: '800', color: '#1A2E35', marginTop: 1 },
  progressBar: {
    height: 6, backgroundColor: '#FDF4F4', borderRadius: 3,
    overflow: 'hidden', marginBottom: 10,
  },
  progressBarFill: { height: '100%', backgroundColor: '#C2272F', borderRadius: 3 },
  progressFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 },
  progressDetailText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },

  // 5. VERO Empfehlungen
  recHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SIDE_PAD, marginBottom: 10, marginTop: 4,
  },
  recVeroImg: { width: 28, height: 28 },
  recCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: SIDE_PAD, marginBottom: 8,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' as any },
    }),
  },
  recIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  recTitle: { fontSize: 13, fontWeight: '700', color: '#1A2E35' },
  recText: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Onboarding CTA
  onboardCta: {
    marginHorizontal: SIDE_PAD, marginTop: 8, marginBottom: 8,
    borderRadius: 16, overflow: 'hidden',
  },
  onboardGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18,
  },
  onboardTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  onboardSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
