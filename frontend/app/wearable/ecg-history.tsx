import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Line } from 'react-native-svg';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ECGRecording {
  measured_at: string;
  value: number;      // avg HR
  quality?: string;
  metadata?: {
    samples?: number[];
    sampling_hz?: number;
    duration_s?: number;
    sample_count?: number;
    notes?: string;
  };
}

export default function ECGHistory() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ECGRecording[]>([]);
  const [active, setActive] = useState<ECGRecording | null>(null);

  useEffect(() => { AsyncStorage.getItem('health_profile_id').then(v => setUserId(v || 'anonymous')); }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/wearable/measurements?user_id=${userId}&metric=ecg&limit=200`);
      const data = await res.json();
      setRecords(data.measurements || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const winW = Dimensions.get('window').width - 40;
  const fullW = Dimensions.get('window').width - 40;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="ecg-history-back">
          <MaterialCommunityIcons name="chevron-left" size={26} color="#1A2E35" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EKG‑Aufzeichnungen</Text>
        <TouchableOpacity onPress={() => router.push('/wearable/measure/ecg' as any)} style={styles.iconBtn} testID="ecg-history-new-btn">
          <MaterialCommunityIcons name="plus-circle" size={26} color="#C2272F" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}>
        {loading ? (
          <ActivityIndicator color="#C2272F" style={{ marginTop: 40 }} testID="ecg-history-loading" />
        ) : records.length === 0 ? (
          <View style={styles.emptyCard} testID="ecg-history-empty">
            <MaterialCommunityIcons name="heart-off" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Noch keine Aufzeichnungen</Text>
            <Text style={styles.emptyText}>Starte deine erste 30‑Sekunden EKG‑Messung.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/wearable/measure/ecg' as any)} testID="ecg-history-first-btn">
              <MaterialCommunityIcons name="record-rec" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Erste Messung starten</Text>
            </TouchableOpacity>
          </View>
        ) : (
          records.map((r, i) => (
            <TouchableOpacity
              key={`${r.measured_at}-${i}`}
              style={styles.recordCard}
              onPress={() => setActive(r)}
              testID={`ecg-record-${i}`}
            >
              <View style={styles.recordHeader}>
                <View>
                  <Text style={styles.recordDate}>
                    {new Date(r.measured_at).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </Text>
                  <Text style={styles.recordTime}>
                    {new Date(r.measured_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.recordRight}>
                  <Text style={styles.recordHr}>{Math.round(r.value)}</Text>
                  <Text style={styles.recordHrUnit}>bpm</Text>
                </View>
              </View>
              <Sparkline samples={r.metadata?.samples || []} width={winW - 32} height={54} />
              <View style={styles.recordFooter}>
                <View style={styles.recordChip}>
                  <MaterialCommunityIcons name="clock-outline" size={11} color="#6B7280" />
                  <Text style={styles.recordChipText}>{r.metadata?.duration_s ?? 30}s</Text>
                </View>
                <View style={styles.recordChip}>
                  <MaterialCommunityIcons name="sine-wave" size={11} color="#6B7280" />
                  <Text style={styles.recordChipText}>{r.metadata?.sampling_hz ?? 250} Hz</Text>
                </View>
                {r.quality && (
                  <View style={[styles.recordChip, r.quality === 'good' ? styles.chipGood : styles.chipWeak]}>
                    <Text style={[styles.recordChipText, { color: r.quality === 'good' ? '#065F46' : '#92400E' }]}>
                      {r.quality === 'good' ? 'Signal OK' : 'Signal schwach'}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Fullscreen playback modal */}
      <Modal visible={!!active} transparent animationType="fade" onRequestClose={() => setActive(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="ecg-playback-modal">
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {active && new Date(active.measured_at).toLocaleString('de-DE')}
                </Text>
                <Text style={styles.modalSub}>Ø {active ? Math.round(active.value) : 0} bpm · {active?.metadata?.duration_s ?? 30}s</Text>
              </View>
              <TouchableOpacity onPress={() => setActive(null)} style={styles.closeBtn} testID="ecg-playback-close">
                <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <FullWaveform samples={active?.metadata?.samples || []} width={fullW} height={220} />
            <View style={styles.modalDisclaimer}>
              <MaterialCommunityIcons name="alert-outline" size={14} color="#FBBF24" />
              <Text style={styles.modalDisclaimerText}>Wellness‑Aufzeichnung, kein medizinisches EKG.</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const Sparkline = ({ samples, width, height }: { samples: number[]; width: number; height: number }) => {
  if (!samples || samples.length < 2) {
    return <View style={{ height, width, backgroundColor: '#F3F4F6', borderRadius: 6 }} />;
  }
  // Take max 200 evenly-spaced points
  const target = Math.min(200, samples.length);
  const step = samples.length / target;
  const pts: number[] = [];
  for (let i = 0; i < target; i++) pts.push(samples[Math.floor(i * step)]);
  const maxA = Math.max(...pts.map(Math.abs), 0.5);
  const midY = height / 2;
  const scale = (height * 0.4) / maxA;
  const dx = width / Math.max(1, pts.length - 1);
  let d = '';
  pts.forEach((v, i) => { d += `${i === 0 ? 'M' : 'L'}${(i * dx).toFixed(1)} ${(midY - v * scale).toFixed(1)} `; });
  return (
    <View style={{ backgroundColor: '#0F172A', borderRadius: 8, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        <Path d={d} stroke="#22D3EE" strokeWidth="1.4" fill="none" />
      </Svg>
    </View>
  );
};

const FullWaveform = ({ samples, width, height }: { samples: number[]; width: number; height: number }) => {
  if (!samples || samples.length < 2) return null;
  const maxA = Math.max(...samples.map(Math.abs), 0.5);
  const midY = height / 2;
  const scale = (height * 0.4) / maxA;
  const dx = width / Math.max(1, samples.length - 1);
  let d = '';
  samples.forEach((v, i) => { d += `${i === 0 ? 'M' : 'L'}${(i * dx).toFixed(1)} ${(midY - v * scale).toFixed(1)} `; });
  return (
    <View style={{ backgroundColor: '#0F172A', borderRadius: 10, overflow: 'hidden', marginVertical: 12 }}>
      <Svg width={width} height={height}>
        {Array.from({ length: 6 }, (_, i) => (
          <Line key={`hg-${i}`} x1={0} y1={(height / 6) * i} x2={width} y2={(height / 6) * i} stroke="#1E293B" strokeWidth="1" />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <Line key={`vg-${i}`} x1={(width / 12) * i} y1={0} x2={(width / 12) * i} y2={height} stroke="#1E293B" strokeWidth="1" />
        ))}
        <Path d={d} stroke="#22D3EE" strokeWidth="1.6" fill="none" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A2E35' },
  content: { padding: 16 },
  emptyCard: { padding: 40, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1A2E35', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#C2272F', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  recordCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  recordDate: { fontSize: 13, fontWeight: '800', color: '#1A2E35' },
  recordTime: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  recordRight: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  recordHr: { fontSize: 22, fontWeight: '900', color: '#C2272F' },
  recordHrUnit: { fontSize: 11, color: '#6B7280', marginBottom: 3 },
  recordFooter: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  recordChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },
  chipGood: { backgroundColor: '#D1FAE5' },
  chipWeak: { backgroundColor: '#FEF3C7' },
  recordChipText: { fontSize: 10, color: '#6B7280', fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: '#1A2E35', borderRadius: 18, padding: 16, width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  modalSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  modalDisclaimer: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  modalDisclaimerText: { fontSize: 11, color: '#FBBF24' },
});
