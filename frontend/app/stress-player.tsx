import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, Easing, interpolate, cancelAnimation,
} from 'react-native-reanimated';
import { useLang } from '../src/LangContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.55;

export default function StressPlayerScreen() {
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { lang } = useLang();
  const t = useCallback((de: string, it: string) => lang === 'it' ? it : de, [lang]);

  const [exercise, setExercise] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'pre' | 'active' | 'post'>('pre');
  const [stressBefore, setStressBefore] = useState(5);
  const [stressAfter, setStressAfter] = useState(3);
  const [sessionId, setSessionId] = useState('');
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentPhaseLabel, setCurrentPhaseLabel] = useState('');
  const [completing, setCompleting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathAnim = useSharedValue(0);

  useEffect(() => {
    loadExercise();
    return () => { if (timerRef.current) clearInterval(timerRef.current); cancelAnimation(breathAnim); };
  }, []);

  const loadExercise = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stress/exercises?lang=${lang}`);
      if (res.ok) {
        const d = await res.json();
        const ex = d.exercises.find((e: any) => e.id === exerciseId);
        if (ex) setExercise(ex);
      }
    } catch {}
    setLoading(false);
  };

  const startSession = async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    if (!pid) return;
    try {
      const res = await fetch(`${API_URL}/api/stress/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: pid, exercise_id: exerciseId, stress_before: stressBefore }),
      });
      if (res.ok) {
        const d = await res.json();
        setSessionId(d.session_id);
      }
    } catch {}
    setPhase('active');
    startTimer();
    if (exercise?.content_json?.type === 'breathing') startBreathAnimation();
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (next >= (exercise?.duration_seconds || 120)) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('post');
        }
        return next;
      });
    }, 1000);
  };

  const startBreathAnimation = () => {
    if (!exercise?.content_json?.pattern) return;
    const pattern = exercise.content_json.pattern;
    const totalCycle = pattern.reduce((sum: number, p: any) => sum + p.seconds, 0);

    // Animate breath circle
    breathAnim.value = 0;
    breathAnim.value = withRepeat(
      withTiming(1, { duration: totalCycle * 1000, easing: Easing.linear }),
      -1, false
    );

    // Update phase labels
    let running = true;
    const runCycle = async () => {
      while (running) {
        for (const p of pattern) {
          if (!running) return;
          const label = lang === 'de' ? p.label_de : p.label_it;
          setCurrentPhaseLabel(label);
          await new Promise(r => setTimeout(r, p.seconds * 1000));
        }
      }
    };
    runCycle();
    return () => { running = false; };
  };

  const togglePause = () => {
    if (paused) {
      startTimer();
      if (exercise?.content_json?.type === 'breathing') startBreathAnimation();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimation(breathAnim);
    }
    setPaused(!paused);
  };

  const completeSession = async () => {
    if (!sessionId) { router.back(); return; }
    setCompleting(true);
    try {
      await fetch(`${API_URL}/api/stress/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stress_after: stressAfter, mood_after: 'relaxed', completed: true }),
      });
    } catch {}
    setCompleting(false);
    router.back();
  };

  const abandon = () => {
    Alert.alert(
      t('Uebung beenden?', 'Terminare esercizio?'),
      t('Moechtest du die Uebung wirklich abbrechen?', 'Vuoi davvero interrompere?'),
      [
        { text: t('Weiter', 'Continua'), style: 'cancel' },
        { text: t('Beenden', 'Termina'), style: 'destructive', onPress: () => {
          if (timerRef.current) clearInterval(timerRef.current);
          if (sessionId) {
            fetch(`${API_URL}/api/stress/sessions/${sessionId}/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stress_after: null, completed: false }),
            }).catch(() => {});
          }
          router.back();
        }},
      ]
    );
  };

  // Breathing animation styles
  const breathStyle = useAnimatedStyle(() => {
    if (!exercise?.content_json?.pattern) return {};
    const pattern = exercise.content_json.pattern;
    const totalCycle = pattern.reduce((s: number, p: any) => s + p.seconds, 0);
    let cumulative = 0;
    const points: number[] = [0];
    const scales: number[] = [0.6];
    for (const p of pattern) {
      cumulative += p.seconds;
      const frac = cumulative / totalCycle;
      if (p.phase === 'inhale') scales.push(1);
      else if (p.phase === 'exhale') scales.push(0.6);
      else scales.push(scales[scales.length - 1]);
      points.push(frac);
    }
    const scale = interpolate(breathAnim.value, points, scales);
    return { transform: [{ scale }], opacity: interpolate(breathAnim.value, [0, 0.5, 1], [0.7, 1, 0.7]) };
  });

  // Guided steps logic
  useEffect(() => {
    if (phase !== 'active' || exercise?.content_json?.type !== 'guided_steps') return;
    const steps = exercise.content_json.steps;
    let cumDuration = 0;
    for (let i = 0; i < steps.length; i++) {
      cumDuration += steps[i].duration;
      if (elapsed < cumDuration) { setCurrentStep(i); return; }
    }
    setCurrentStep(steps.length - 1);
  }, [elapsed, phase]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s2 = secs % 60;
    return `${m}:${s2.toString().padStart(2, '0')}`;
  };

  if (loading || !exercise) return (
    <SafeAreaView style={st.safe}><View style={st.center}><ActivityIndicator size="large" color="#2E7D52" /></View></SafeAreaView>
  );

  const remaining = Math.max(0, exercise.duration_seconds - elapsed);
  const progress = elapsed / exercise.duration_seconds;

  // ── PRE: Stress-Slider ──
  if (phase === 'pre') return (
    <SafeAreaView style={st.safe}>
      <View style={st.preContainer}>
        <TouchableOpacity onPress={() => router.back()} style={st.closeBtn}>
          <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={st.preTitle}>{exercise.name}</Text>
        <Text style={st.preDesc}>{exercise.description}</Text>
        <Text style={st.preDur}>{Math.ceil(exercise.duration_seconds / 60)} min</Text>

        <View style={st.sliderSection}>
          <Text style={st.sliderLabel}>{t('Wie gestresst fuehlst du dich?', 'Quanto sei stressato?')}</Text>
          <View style={st.sliderRow}>
            {[1,2,3,4,5,6,7,8,9,10].map(v => (
              <TouchableOpacity
                key={v}
                style={[st.sliderDot, stressBefore === v && st.sliderDotActive,
                  v <= 3 && st.sliderGreen, v >= 4 && v <= 6 && st.sliderYellow, v >= 7 && st.sliderRed,
                  stressBefore === v && v <= 3 && st.sliderGreenActive,
                  stressBefore === v && v >= 4 && v <= 6 && st.sliderYellowActive,
                  stressBefore === v && v >= 7 && st.sliderRedActive,
                ]}
                onPress={() => setStressBefore(v)}
              >
                <Text style={[st.sliderNum, stressBefore === v && st.sliderNumActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={st.sliderLabels}>
            <Text style={st.sliderMin}>{t('Entspannt', 'Rilassato')}</Text>
            <Text style={st.sliderMax}>{t('Sehr gestresst', 'Molto stressato')}</Text>
          </View>
        </View>

        <TouchableOpacity style={st.startBtn} onPress={startSession} data-testid="stress-start-button">
          <Text style={st.startBtnText}>{t('Uebung starten', 'Inizia esercizio')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // ── POST: After exercise ──
  if (phase === 'post') return (
    <SafeAreaView style={st.safe}>
      <View style={st.preContainer}>
        <MaterialCommunityIcons name="check-circle" size={56} color="#22C55E" style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={st.preTitle}>{t('Gut gemacht!', 'Ben fatto!')}</Text>
        <Text style={st.preDesc}>{t('Wie fuehlst du dich jetzt?', 'Come ti senti adesso?')}</Text>

        <View style={st.sliderSection}>
          <Text style={st.sliderLabel}>{t('Stresslevel jetzt', 'Livello di stress adesso')}</Text>
          <View style={st.sliderRow}>
            {[1,2,3,4,5,6,7,8,9,10].map(v => (
              <TouchableOpacity
                key={v}
                style={[st.sliderDot, stressAfter === v && st.sliderDotActive,
                  v <= 3 && st.sliderGreen, v >= 4 && v <= 6 && st.sliderYellow, v >= 7 && st.sliderRed,
                  stressAfter === v && v <= 3 && st.sliderGreenActive,
                  stressAfter === v && v >= 4 && v <= 6 && st.sliderYellowActive,
                  stressAfter === v && v >= 7 && st.sliderRedActive,
                ]}
                onPress={() => setStressAfter(v)}
              >
                <Text style={[st.sliderNum, stressAfter === v && st.sliderNumActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {stressBefore > stressAfter && (
          <View style={st.improvBadge}>
            <MaterialCommunityIcons name="trending-down" size={18} color="#22C55E" />
            <Text style={st.improvText}>
              {t(`Stress um ${stressBefore - stressAfter} gesenkt`, `Stress ridotto di ${stressBefore - stressAfter}`)}
            </Text>
          </View>
        )}

        <TouchableOpacity style={st.startBtn} onPress={completeSession} disabled={completing} data-testid="stress-complete-button">
          {completing ? <ActivityIndicator color="#fff" /> : (
            <Text style={st.startBtnText}>{t('Fertig', 'Fatto')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // ── ACTIVE: Exercise running ──
  const isBreathing = exercise.content_json?.type === 'breathing';
  const steps = exercise.content_json?.steps || [];
  const currentStepData = steps[currentStep];

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.activeContainer}>
        {/* Top bar */}
        <View style={st.topBar}>
          <TouchableOpacity onPress={abandon}>
            <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={st.timerText}>{formatTime(remaining)}</Text>
          <TouchableOpacity onPress={togglePause}>
            <MaterialCommunityIcons name={paused ? 'play' : 'pause'} size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={st.progressBar}>
          <View style={[st.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
        </View>

        {/* Content area */}
        <View style={st.contentArea}>
          {isBreathing ? (
            <>
              <Animated.View style={[st.breathCircle, breathStyle]}>
                <View style={st.breathInner}>
                  <Text style={st.breathLabel}>{currentPhaseLabel}</Text>
                </View>
              </Animated.View>
              <Text style={st.exerciseName}>{exercise.name}</Text>
            </>
          ) : (
            <>
              <Text style={st.stepText}>
                {currentStepData ? (lang === 'de' ? currentStepData.text_de : currentStepData.text_it) : ''}
              </Text>
              <Text style={st.stepCount}>
                {currentStep + 1} / {steps.length}
              </Text>
            </>
          )}
        </View>

        {/* Bottom info */}
        <Text style={st.exerciseNameBottom}>{exercise.name}</Text>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Pre & Post
  preContainer: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  preTitle: { fontSize: 26, fontWeight: '700', color: '#1A2D26', textAlign: 'center' },
  preDesc: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  preDur: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
  sliderSection: { marginTop: 36 },
  sliderLabel: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'center', marginBottom: 16 },
  sliderRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  sliderDot: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
  sliderDotActive: { borderWidth: 2 },
  sliderGreen: { borderColor: '#D1FAE5' }, sliderGreenActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  sliderYellow: { borderColor: '#FEF3C7' }, sliderYellowActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  sliderRed: { borderColor: '#FEE2E2' }, sliderRedActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  sliderNum: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  sliderNumActive: { color: '#fff' },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sliderMin: { fontSize: 11, color: '#22C55E' },
  sliderMax: { fontSize: 11, color: '#EF4444' },
  startBtn: { backgroundColor: '#2E7D52', borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  startBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  improvBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F0FDF4', borderRadius: 20, alignSelf: 'center' },
  improvText: { fontSize: 14, fontWeight: '600', color: '#22C55E' },
  // Active
  activeContainer: { flex: 1, backgroundColor: '#1A2D26' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  timerText: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.9)', fontVariant: ['tabular-nums'] },
  progressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: '#22C55E', borderRadius: 2 },
  contentArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  // Breathing
  breathCircle: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, backgroundColor: 'rgba(46,125,82,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(46,125,82,0.3)' },
  breathInner: { width: CIRCLE_SIZE * 0.7, height: CIRCLE_SIZE * 0.7, borderRadius: CIRCLE_SIZE * 0.35, backgroundColor: 'rgba(46,125,82,0.25)', justifyContent: 'center', alignItems: 'center' },
  breathLabel: { fontSize: 20, fontWeight: '600', color: '#fff', textAlign: 'center' },
  exerciseName: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: 32 },
  // Guided steps
  stepText: { fontSize: 22, fontWeight: '600', color: '#fff', textAlign: 'center', lineHeight: 32 },
  stepCount: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 20 },
  exerciseNameBottom: { fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingBottom: 24 },
});
