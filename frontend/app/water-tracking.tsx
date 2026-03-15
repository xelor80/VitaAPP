import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
  SafeAreaView, ActivityIndicator, TextInput, Modal, Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  withRepeat, withSequence, Easing, FadeIn, FadeInDown, ZoomIn,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';
import { useLang } from '../src/LangContext';
import { eventBus } from '../src/eventBus';

const VERO_WATER_IMAGE = { uri: 'https://customer-assets.emergentagent.com/job_1555994b-6d08-464e-b162-3cd8fab568d9/artifacts/i4oylwy4_ChatGPT%20Image%2014.%20Ma%CC%88rz%202026%2C%2009_16_03.png' };

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_W } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_W * 0.58;
const STROKE = 10;

// ── Wave Component ──
function WaveCircle({ percentage }: { percentage: number }) {
  const fillHeight = (percentage / 100) * CIRCLE_SIZE;
  const r = CIRCLE_SIZE / 2;
  // Simple sine wave path
  const waveY = CIRCLE_SIZE - fillHeight;
  const wPath = `M 0 ${waveY} Q ${r * 0.5} ${waveY - 12} ${r} ${waveY} T ${CIRCLE_SIZE} ${waveY} L ${CIRCLE_SIZE} ${CIRCLE_SIZE} L 0 ${CIRCLE_SIZE} Z`;

  return (
    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
      <Defs>
        <SvgGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5BC0EB" stopOpacity="0.7" />
          <Stop offset="1" stopColor="#3A86FF" stopOpacity="0.9" />
        </SvgGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r - 2} fill="none" stroke="#E0EAF0" strokeWidth={2} />
      <Circle cx={r} cy={r} r={r - 2} fill="none" stroke="#5BC0EB" strokeWidth={2} strokeDasharray={`${2 * Math.PI * (r - 2) * percentage / 100} ${2 * Math.PI * (r - 2)}`} strokeDashoffset={2 * Math.PI * (r - 2) * 0.25} strokeLinecap="round" />
      <Path d={wPath} fill="url(#waterGrad)" clipPath={`circle(${r - 4}px at ${r}px ${r}px)`} />
    </Svg>
  );
}

// ── Feedback Toast ──
function FeedbackToast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible || !message) return null;
  return (
    <Animated.View entering={ZoomIn.duration(300)} style={st.toast}>
      <MaterialCommunityIcons name="water-check" size={18} color="#FFFFFF" />
      <Text style={st.toastText}>{message}</Text>
    </Animated.View>
  );
}

export default function WaterTrackingScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const { lang } = useLang();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [history, setHistory] = useState<any>(null);
  const [historyPeriod, setHistoryPeriod] = useState<'week' | 'month'>('week');
  const [veroTip, setVeroTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  // Animations
  const waveAnim = useSharedValue(0);
  const splashScale = useSharedValue(1);

  useEffect(() => {
    waveAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);

  const splashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: splashScale.value }],
  }));

  // Load data
  const loadData = useCallback(async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    if (!pid) { setLoading(false); return; }
    setProfileId(pid);
    try {
      const res = await fetch(`${API_URL}/api/water-tracking/${pid}/today?lang=${lang}`);
      const d = await res.json();
      setData(d);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, [lang]);

  const loadHistory = useCallback(async () => {
    if (!profileId) return;
    try {
      const res = await fetch(`${API_URL}/api/water-tracking/${profileId}/history?period=${historyPeriod}`);
      setHistory(await res.json());
    } catch {}
  }, [profileId, historyPeriod]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (profileId) loadHistory(); }, [profileId, historyPeriod, loadHistory]);

  // Add water
  const addWater = async (amount: number) => {
    if (!profileId || amount <= 0) return;
    splashScale.value = withSequence(
      withSpring(1.15, { damping: 4 }),
      withSpring(1, { damping: 8 })
    );
    try {
      const res = await fetch(`${API_URL}/api/water-tracking/${profileId}/add?lang=${lang}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_ml: amount }),
      });
      const d = await res.json();
      setData((prev: any) => ({
        ...prev,
        total_ml: d.total_ml,
        percentage: d.percentage,
        remaining_ml: d.remaining_ml,
        daily_goal_ml: d.daily_goal_ml,
        vero_message: d.vero_message,
      }));
      setFeedback(`+${amount} ml — ${d.feedback}`);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2500);
      loadHistory();
      eventBus.emit('waterUpdated');
    } catch {}
  };

  // Update goal
  const updateGoal = async () => {
    const val = parseInt(goalInput);
    if (!profileId || isNaN(val) || val < 500) return;
    try {
      await fetch(`${API_URL}/api/water-tracking/${profileId}/goal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_goal_ml: val }),
      });
      setShowGoalModal(false);
      loadData();
    } catch {}
  };

  if (loading) return <View style={st.center}><ActivityIndicator size="large" color="#3A86FF" /></View>;
  if (!profileId) return (
    <SafeAreaView style={st.container}>
      <View style={st.center}>
        <MaterialCommunityIcons name="water-off" size={64} color="#D1D5DB" />
        <Text style={st.emptyTitle}>{lang === 'de' ? 'Profil erforderlich' : 'Profilo necessario'}</Text>
        <TouchableOpacity style={st.primaryBtn} onPress={() => router.push('/onboarding' as any)}>
          <Text style={st.primaryBtnText}>{lang === 'de' ? 'Profil erstellen' : 'Crea profilo'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const pct = data?.percentage || 0;
  const totalL = ((data?.total_ml || 0) / 1000).toFixed(1);
  const goalL = ((data?.daily_goal_ml || 2400) / 1000).toFixed(1);
  const remainL = ((data?.remaining_ml || 0) / 1000).toFixed(1);
  const quickAmounts = [100, 200, 250, 500];

  return (
    <SafeAreaView style={st.container}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1B6B45', '#2E9E6B', '#43C68A']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={st.header}>
          {canGoBack && (
            <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
            </TouchableOpacity>
          )}
          <Text style={st.headerTitle}>{lang === 'de' ? 'Wasser Tracking' : 'Idratazione'}</Text>
          <TouchableOpacity onPress={() => { setGoalInput(String(data?.daily_goal_ml || 2400)); setShowGoalModal(true); }} style={st.goalBtn}>
            <MaterialCommunityIcons name="cog-outline" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Water Circle */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={st.circleWrap}>
          <Animated.View style={splashStyle}>
            <WaveCircle percentage={pct} />
          </Animated.View>
          <View style={st.circleOverlay}>
            <Text style={st.pctText}>{pct}%</Text>
            <Text style={st.amountText}>{totalL} / {goalL} L</Text>
            <Text style={st.remainText}>
              {pct >= 100
                ? (lang === 'de' ? 'Ziel erreicht!' : 'Obiettivo raggiunto!')
                : (lang === 'de' ? `Noch ${remainL} L` : `Ancora ${remainL} L`)}
            </Text>
          </View>
        </Animated.View>

        {/* Feedback Toast */}
        <FeedbackToast message={feedback} visible={showFeedback} />

        {/* VERO message - tap for hydration tip */}
        {data?.vero_message && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
              if (!profileId || loadingTip) return;
              setLoadingTip(true);
              try {
                const res = await fetch(`${API_URL}/api/water-tracking/${profileId}/hydration-tip?lang=${lang}`);
                if (res.ok) {
                  const d = await res.json();
                  setVeroTip(d.tip);
                }
              } catch {} finally {
                setLoadingTip(false);
              }
            }}
            data-testid="vero-tip-button"
          >
            <Animated.View entering={FadeIn.delay(400).duration(500)} style={st.veroCard}>
              <Image source={VERO_WATER_IMAGE} style={st.veroImage} resizeMode="contain" />
              <View style={st.veroRight}>
                <Text style={st.veroText}>{data.vero_message.text}</Text>
                <Text style={st.veroHint}>
                  {loadingTip ? (lang === 'de' ? 'Lade Tipp...' : 'Caricamento...') : (lang === 'de' ? 'Tippe fuer einen Hydrations-Tipp' : 'Tocca per un consiglio')}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* VERO AI Tip */}
        {veroTip && (
          <Animated.View entering={FadeIn.duration(300)} style={st.tipCard}>
            <View style={st.tipHeader}>
              <MaterialCommunityIcons name="lightbulb-outline" size={18} color="#F59E0B" />
              <Text style={st.tipTitle}>{lang === 'de' ? 'VEROs Tipp' : 'Consiglio di VERO'}</Text>
              <TouchableOpacity onPress={() => setVeroTip(null)} style={st.tipClose}>
                <MaterialCommunityIcons name="close" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <Text style={st.tipText}>{veroTip}</Text>
          </Animated.View>
        )}

        {/* Quick Add Buttons */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={st.buttonsWrap}>
          <Text style={st.sectionLabel}>{lang === 'de' ? 'Wasser hinzufuegen' : 'Aggiungi acqua'}</Text>
          <View style={st.buttonsRow}>
            {quickAmounts.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={st.addBtn}
                activeOpacity={0.7}
                onPress={() => addWater(amt)}
                data-testid={`add-water-${amt}`}
              >
                <MaterialCommunityIcons name="water-plus" size={18} color="#3A86FF" />
                <Text style={st.addBtnText}>+{amt} ml</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={st.customBtn}
            onPress={() => { setCustomAmount(''); setShowCustom(!showCustom); }}
            data-testid="add-water-custom"
          >
            <MaterialCommunityIcons name="pencil-outline" size={16} color="#6B7280" />
            <Text style={st.customBtnText}>{lang === 'de' ? 'Eigene Menge' : 'Quantita personalizzata'}</Text>
          </TouchableOpacity>
          {showCustom && (
            <Animated.View entering={FadeIn.duration(200)} style={st.customRow}>
              <TextInput
                style={st.customInput}
                keyboardType="numeric"
                placeholder="ml"
                value={customAmount}
                onChangeText={setCustomAmount}
                data-testid="custom-amount-input"
              />
              <TouchableOpacity
                style={st.customConfirm}
                onPress={() => {
                  const v = parseInt(customAmount);
                  if (v > 0) { addWater(v); setShowCustom(false); }
                }}
              >
                <MaterialCommunityIcons name="check" size={20} color="#FFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* History */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={st.historyWrap}>
          <View style={st.historyHeader}>
            <Text style={st.sectionLabel}>{lang === 'de' ? 'Verlauf' : 'Storico'}</Text>
            <View style={st.periodTabs}>
              {(['week', 'month'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[st.periodTab, historyPeriod === p && st.periodTabActive]}
                  onPress={() => setHistoryPeriod(p)}
                >
                  <Text style={[st.periodTabText, historyPeriod === p && st.periodTabTextActive]}>
                    {p === 'week' ? (lang === 'de' ? '7 Tage' : '7 giorni') : (lang === 'de' ? '30 Tage' : '30 giorni')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {history && (
            <>
              <View style={st.statsRow}>
                <View style={st.statBox}>
                  <Text style={st.statValue}>{history.days_goal_reached}/{history.days_with_data}</Text>
                  <Text style={st.statLabel}>{lang === 'de' ? 'Ziel erreicht' : 'Obiettivo'}</Text>
                </View>
                <View style={st.statBox}>
                  <Text style={st.statValue}>{(history.average_ml / 1000).toFixed(1)} L</Text>
                  <Text style={st.statLabel}>{lang === 'de' ? 'Durchschnitt' : 'Media'}</Text>
                </View>
              </View>
              {/* Bar chart */}
              <View style={st.chart}>
                {(history.days || []).map((d: any, i: number) => {
                  const barPct = Math.min((d.total_ml / (data?.daily_goal_ml || 2400)) * 100, 100);
                  const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString(lang === 'de' ? 'de-DE' : 'it-IT', { weekday: 'short' }).slice(0, 2);
                  return (
                    <View key={i} style={st.barCol}>
                      <View style={st.barBg}>
                        <View style={[st.barFill, { height: `${barPct}%` as any, backgroundColor: barPct >= 100 ? '#2E9E6B' : '#5BC0EB' }]} />
                      </View>
                      <Text style={st.barLabel}>{dayLabel}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Goal Modal */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>{lang === 'de' ? 'Tagesziel anpassen' : 'Modifica obiettivo'}</Text>
            <Text style={st.modalSub}>{lang === 'de' ? 'Empfohlen basierend auf deinem Profil' : 'Consigliato dal tuo profilo'}</Text>
            <TextInput
              style={st.modalInput}
              keyboardType="numeric"
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="ml"
            />
            <View style={st.modalBtns}>
              <TouchableOpacity style={st.modalCancel} onPress={() => setShowGoalModal(false)}>
                <Text style={st.modalCancelText}>{lang === 'de' ? 'Abbrechen' : 'Annulla'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalSave} onPress={updateGoal}>
                <Text style={st.modalSaveText}>{lang === 'de' ? 'Speichern' : 'Salva'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 8, paddingBottom: 14, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backBtn: { position: 'absolute', left: 16, bottom: 14, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  goalBtn: { position: 'absolute', right: 16, bottom: 14, padding: 4 },
  // Circle
  circleWrap: { alignItems: 'center', marginTop: 24, marginBottom: 16 },
  circleOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  pctText: { fontSize: 42, fontWeight: '800', color: '#1A2E35', letterSpacing: -1 },
  amountText: { fontSize: 16, fontWeight: '600', color: '#3A86FF', marginTop: 2 },
  remainText: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  // Feedback toast
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2E9E6B', marginHorizontal: 32, borderRadius: 24,
    paddingVertical: 10, paddingHorizontal: 18, alignSelf: 'center', marginBottom: 8,
  },
  toastText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  // VERO
  veroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E8F5E9',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  veroImage: {
    width: 70,
    height: 85,
  },
  veroRight: {
    flex: 1,
  },
  veroText: { fontSize: 13, color: '#2E7D52', lineHeight: 18, fontWeight: '500' },
  veroHint: { fontSize: 10, color: '#81C784', marginTop: 4, fontStyle: 'italic' },
  // Tip card
  tipCard: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  tipClose: {
    padding: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  // Buttons
  buttonsWrap: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1A2E35', marginBottom: 12 },
  buttonsRow: { flexDirection: 'row', gap: 10 },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#D0E4F7',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#3A86FF' },
  customBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, paddingVertical: 10,
  },
  customBtnText: { fontSize: 13, color: '#6B7280' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  customInput: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E6E2',
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, fontWeight: '600',
  },
  customConfirm: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#3A86FF',
    justifyContent: 'center', alignItems: 'center',
  },
  // History
  historyWrap: {
    backgroundColor: '#FFF', marginHorizontal: 20, borderRadius: 18, padding: 18,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  periodTabs: { flexDirection: 'row', gap: 6 },
  periodTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
  periodTabActive: { backgroundColor: '#3A86FF' },
  periodTabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  periodTabTextActive: { color: '#FFF' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#1A2E35' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  chart: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 100 },
  barCol: { flex: 1, alignItems: 'center' },
  barBg: { width: '100%', height: 80, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  // Empty
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A2E35', marginTop: 16 },
  primaryBtn: { backgroundColor: '#2E7D52', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, marginTop: 20 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: SCREEN_W - 64 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A2E35', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#F5F7FA', borderRadius: 12, borderWidth: 1, borderColor: '#E0E6E2',
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, fontWeight: '700', textAlign: 'center',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  modalSave: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#3A86FF', alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
