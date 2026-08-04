/**
 * Realtime ECG recording screen – 30 seconds, live-scrolling waveform.
 *
 * Uses `WearableProvider.startRealtimeMeasurement('ecg')` which in the
 * DemoProvider emits burst samples at 250Hz. In a native build this
 * maps 1:1 to `HBandBridge.startDetectECG()`.
 *
 * IMPORTANT (Regel 5 & 18):
 *   The recording is a **wellness** waveform, not diagnostic.
 *   Never claim medical validity in the UI.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWearable } from '../../../src/WearableContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const DURATION_S = 30;
const SAMPLING_HZ = 250;
const WINDOW_SECONDS = 3;                    // scrolling window shown on screen
const WINDOW_SAMPLES = WINDOW_SECONDS * SAMPLING_HZ;

type State = 'intro' | 'preparing' | 'recording' | 'saving' | 'done' | 'error';

export default function ECGMeasureScreen() {
  const router = useRouter();
  const w = useWearable();
  const [state, setState] = useState<State>('intro');
  const [remaining, setRemaining] = useState(DURATION_S);
  const [hr, setHr] = useState<number | null>(null);
  const [quality, setQuality] = useState<'good' | 'weak'>('good');
  const [waveform, setWaveform] = useState<number[]>([]);   // sliding window of raw samples
  const [savedResult, setSavedResult] = useState<{ avgHr: number; samples: number } | null>(null);

  const allSamplesRef = useRef<number[]>([]);
  const bpmHistoryRef = useRef<number[]>([]);
  const startedAtRef = useRef<number>(0);
  const unsubscribeRef = useRef<() => void>(() => {});
  const tickerRef = useRef<any>(null);

  // -------------------------------------------------------------------
  // Cleanup on unmount / navigation
  // -------------------------------------------------------------------
  useEffect(() => {
    return () => {
      unsubscribeRef.current();
      if (tickerRef.current) clearInterval(tickerRef.current);
      w.provider.stopRealtimeMeasurement().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    setState('preparing');
    setRemaining(DURATION_S);
    setWaveform([]);
    setHr(null);
    setSavedResult(null);
    allSamplesRef.current = [];
    bpmHistoryRef.current = [];

    if (!w.device && !w.isDemo) {
      Alert.alert('Kein Band verbunden', 'Bitte verbinde zuerst dein VitaGuide Band.');
      setState('intro');
      return;
    }

    try {
      await w.provider.startRealtimeMeasurement('ecg');
      // Subscribe to samples
      unsubscribeRef.current = w.provider.onRealtimeSample((s) => {
        if (s.metric !== 'ecg') return;
        if (typeof s.value === 'number' && s.value > 0) {
          setHr(Math.round(s.value));
          bpmHistoryRef.current.push(s.value);
        }
        setQuality(s.qualityOk ? 'good' : 'weak');
        if (s.samples && s.samples.length > 0) {
          allSamplesRef.current.push(...s.samples);
          // Update scrolling display window
          setWaveform(prev => {
            const next = [...prev, ...s.samples!];
            return next.length > WINDOW_SAMPLES ? next.slice(next.length - WINDOW_SAMPLES) : next;
          });
        }
      });
      startedAtRef.current = Date.now();
      setState('recording');

      tickerRef.current = setInterval(() => {
        const elapsedMs = Date.now() - startedAtRef.current;
        const left = Math.max(0, Math.ceil((DURATION_S * 1000 - elapsedMs) / 1000));
        setRemaining(left);
        if (left <= 0) {
          finish();
        }
      }, 200);
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Messung konnte nicht gestartet werden.');
      setState('error');
    }
  }, [w]);

  const finish = useCallback(async () => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
    unsubscribeRef.current();
    await w.provider.stopRealtimeMeasurement().catch(() => {});
    setState('saving');

    const total = allSamplesRef.current.length;
    const avgHr =
      bpmHistoryRef.current.length > 0
        ? Math.round(bpmHistoryRef.current.reduce((a, b) => a + b, 0) / bpmHistoryRef.current.length)
        : (hr || 0);

    // Persist to backend if we have a paired device backendDeviceId
    try {
      const uid = (await AsyncStorage.getItem('health_profile_id')) || 'anonymous';
      const backendId = (w.device as any)?.backendDeviceId;
      if (backendId && total > 0) {
        // Down-sample stored samples to keep payload small: keep max 2500 (10s @ 250Hz)
        const stored = total > 2500 ? sampleEvenly(allSamplesRef.current, 2500) : allSamplesRef.current;
        await fetch(`${API_URL}/api/wearable/measurements/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: uid,
            device_id: backendId,
            measurements: [{
              metric_type: 'ecg',
              value: avgHr,
              unit: 'bpm',
              measured_at: new Date().toISOString(),
              source: `${w.provider.name}:manual`,
              quality: quality,
              metadata: {
                sampling_hz: SAMPLING_HZ,
                duration_s: DURATION_S,
                sample_count: stored.length,
                original_sample_count: total,
                samples: stored,
                notes: 'Wellness-Aufzeichnung, kein medizinisches EKG.',
              },
            }],
          }),
        });
      }
      setSavedResult({ avgHr, samples: total });
      setState('done');
    } catch {
      setSavedResult({ avgHr, samples: total });
      setState('done');
    }
  }, [w, hr, quality]);

  const cancel = useCallback(async () => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
    unsubscribeRef.current();
    await w.provider.stopRealtimeMeasurement().catch(() => {});
    setState('intro');
  }, [w]);

  // Build SVG path for scrolling waveform
  const winW = Dimensions.get('window').width - 40;
  const winH = 160;
  const path = React.useMemo(() => {
    if (waveform.length < 2) return '';
    const n = waveform.length;
    const step = winW / Math.max(1, WINDOW_SAMPLES - 1);
    const midY = winH / 2;
    const scale = winH * 0.35;
    let d = '';
    // If we have fewer than WINDOW_SAMPLES, still show them left-aligned
    const offset = WINDOW_SAMPLES - n;
    for (let i = 0; i < n; i++) {
      const x = (offset + i) * step;
      const y = midY - waveform[i] * scale;
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return d;
  }, [waveform, winW]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {w.isDemo && (
        <View style={styles.demoBanner} testID="ecg-demo-banner">
          <MaterialCommunityIcons name="test-tube" size={14} color="#7C2D12" />
          <Text style={styles.demoBannerText}>DEMO – synthetische Waveform. Keine reale Herzaktivität.</Text>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => (state === 'recording' ? cancel() : router.back())} style={styles.iconBtn} testID="ecg-back-btn">
          <MaterialCommunityIcons name={state === 'recording' ? 'close' : 'chevron-left'} size={26} color="#1A2E35" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EKG‑Aufzeichnung</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        {state === 'intro' && (
          <View testID="ecg-intro">
            <MaterialCommunityIcons name="heart-pulse" size={80} color="#C2272F" style={styles.bigIcon} />
            <Text style={styles.h1}>30‑Sekunden‑Aufzeichnung</Text>
            <Text style={styles.p}>
              Sitze bequem, lege beide Arme auf und atme ruhig. Halte das Band ruhig am Handgelenk.
              Diese Aufzeichnung ist eine Wellness‑Messung, keine medizinische Diagnose.
            </Text>
            <View style={styles.tipList}>
              <Tip icon="hand-back-right" text="Handgelenk locker, Arm entspannt aufgelegt" />
              <Tip icon="silence" text="Ruhig atmen, nicht sprechen" />
              <Tip icon="water-check" text="Feuchte Haut verbessert das Signal" />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={start} testID="ecg-start-btn">
              <MaterialCommunityIcons name="record-rec" size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Messung starten</Text>
            </TouchableOpacity>
          </View>
        )}

        {(state === 'preparing' || state === 'recording' || state === 'saving') && (
          <View testID="ecg-recording">
            {/* Waveform card */}
            <View style={styles.waveCard}>
              <View style={styles.waveHeader}>
                <View style={styles.pulseDot}>
                  <View style={[styles.pulseInner, { backgroundColor: state === 'recording' ? '#EF4444' : '#9CA3AF' }]} />
                </View>
                <Text style={styles.waveLabel}>{state === 'saving' ? 'Speichere …' : state === 'recording' ? 'Aufzeichnung läuft' : 'Verbinde …'}</Text>
                <View style={{ flex: 1 }} />
                <View style={[styles.qualityPill, quality === 'good' ? styles.qGood : styles.qWeak]}>
                  <Text style={[styles.qualityText, quality === 'good' ? { color: '#065F46' } : { color: '#92400E' }]}>
                    {quality === 'good' ? 'Signal OK' : 'Signal schwach'}
                  </Text>
                </View>
              </View>
              <View style={{ width: winW, height: winH, backgroundColor: '#0F172A', borderRadius: 10, overflow: 'hidden' }}>
                <Svg width={winW} height={winH}>
                  {/* Grid */}
                  {Array.from({ length: 6 }, (_, i) => (
                    <Line key={`hg-${i}`} x1={0} y1={(winH / 6) * i} x2={winW} y2={(winH / 6) * i} stroke="#1E293B" strokeWidth="1" />
                  ))}
                  {Array.from({ length: 12 }, (_, i) => (
                    <Line key={`vg-${i}`} x1={(winW / 12) * i} y1={0} x2={(winW / 12) * i} y2={winH} stroke="#1E293B" strokeWidth="1" />
                  ))}
                  {/* Waveform */}
                  {path ? <Path d={path} stroke="#22D3EE" strokeWidth="1.8" fill="none" /> : null}
                </Svg>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statLabel}>Herz</Text>
                <Text style={styles.statValue}>{hr === null ? '—' : hr}</Text>
                <Text style={styles.statUnit}>bpm</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statLabel}>Verbleibend</Text>
                <Text style={styles.statValue}>{remaining}s</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statLabel}>Samples</Text>
                <Text style={styles.statValue}>{waveform.length > 0 ? Math.min(30 * SAMPLING_HZ, Math.round((DURATION_S - remaining) * SAMPLING_HZ)) : 0}</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((DURATION_S - remaining) / DURATION_S) * 100}%` }]} />
            </View>

            {state === 'saving' && <ActivityIndicator color="#C2272F" style={{ marginTop: 20 }} />}
            {state === 'recording' && (
              <TouchableOpacity style={styles.cancelBtn} onPress={cancel} testID="ecg-cancel-btn">
                <MaterialCommunityIcons name="stop" size={18} color="#B91C1C" />
                <Text style={styles.cancelBtnText}>Messung abbrechen</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {state === 'done' && savedResult && (
          <View testID="ecg-done">
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check-circle" size={64} color="#059669" />
            </View>
            <Text style={styles.h1}>Aufzeichnung gespeichert</Text>
            <View style={styles.summaryCard}>
              <SumRow label="Ø Herzfrequenz" value={`${savedResult.avgHr} bpm`} />
              <SumRow label="Aufgezeichnete Samples" value={`${savedResult.samples}`} />
              <SumRow label="Sampling" value={`${SAMPLING_HZ} Hz`} />
              <SumRow label="Dauer" value={`${DURATION_S} s`} />
              <SumRow label="Signal" value={quality === 'good' ? 'Gut' : 'Schwach'} isLast />
            </View>
            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert-outline" size={16} color="#78350F" />
              <Text style={styles.warningText}>
                Die Aufzeichnung dient der allgemeinen Wellness‑Information. Sie ist kein medizinisches EKG
                und ersetzt keine ärztliche Untersuchung.
              </Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setState('intro')} testID="ecg-again-btn">
              <MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Neue Aufzeichnung</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/wearable/dashboard' as any)}>
              <Text style={styles.secondaryBtnText}>Zum Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'error' && (
          <View testID="ecg-error">
            <MaterialCommunityIcons name="alert-circle" size={64} color="#B91C1C" />
            <Text style={styles.h1}>Etwas ist schiefgelaufen</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setState('intro')}>
              <Text style={styles.primaryBtnText}>Erneut versuchen</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const Tip = ({ icon, text }: { icon: any; text: string }) => (
  <View style={styles.tipRow}>
    <MaterialCommunityIcons name={icon} size={18} color="#C2272F" />
    <Text style={styles.tipText}>{text}</Text>
  </View>
);

const SumRow = ({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) => (
  <View style={[styles.sumRow, isLast && { borderBottomWidth: 0 }]}>
    <Text style={styles.sumLabel}>{label}</Text>
    <Text style={styles.sumValue}>{value}</Text>
  </View>
);

function sampleEvenly<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const out: T[] = [];
  for (let i = 0; i < target; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  demoBanner: { backgroundColor: '#FED7AA', paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  demoBannerText: { flex: 1, fontSize: 11, color: '#7C2D12', fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A2E35' },
  body: { flex: 1, padding: 20, justifyContent: 'center' },
  bigIcon: { alignSelf: 'center', marginBottom: 20 },
  h1: { fontSize: 24, fontWeight: '800', color: '#1A2E35', textAlign: 'center', marginBottom: 8 },
  p: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  tipList: { gap: 8, marginBottom: 24 },
  tipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  tipText: { fontSize: 13, color: '#1A2E35', fontWeight: '600', flex: 1 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#C2272F', paddingVertical: 14, borderRadius: 12, marginTop: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { alignItems: 'center', padding: 12, marginTop: 6 },
  secondaryBtnText: { color: '#C2272F', fontSize: 14, fontWeight: '700' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#B91C1C', borderRadius: 10,
    paddingVertical: 12, marginTop: 16, backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { color: '#B91C1C', fontSize: 14, fontWeight: '700' },

  waveCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14,
  },
  waveHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  pulseDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  pulseInner: { width: 8, height: 8, borderRadius: 4 },
  waveLabel: { fontSize: 13, fontWeight: '700', color: '#1A2E35' },
  qualityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  qGood: { backgroundColor: '#D1FAE5' },
  qWeak: { backgroundColor: '#FEF3C7' },
  qualityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statPill: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
  },
  statLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1A2E35', marginTop: 2 },
  statUnit: { fontSize: 10, color: '#6B7280' },

  progressBar: { height: 4, backgroundColor: '#FEE2E2', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#C2272F' },

  successIcon: { alignItems: 'center', marginBottom: 12 },
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
  },
  sumRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  sumLabel: { fontSize: 13, color: '#6B7280' },
  sumValue: { fontSize: 13, color: '#1A2E35', fontWeight: '700' },

  warningBox: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FEF3C7',
    borderColor: '#FBBF24', borderWidth: 1, borderRadius: 10,
    padding: 10, marginBottom: 14, alignItems: 'flex-start',
  },
  warningText: { flex: 1, fontSize: 11, color: '#78350F', lineHeight: 15 },
});
