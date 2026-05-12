import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; icon: string; iconColor: string; label_de: string; label_it: string }> = {
  red: { bg: '#FEF2F2', border: '#FECACA', icon: 'alert-circle', iconColor: '#DC2626', label_de: 'Risiko', label_it: 'Rischio' },
  yellow: { bg: '#FFFBEB', border: '#FDE68A', icon: 'alert', iconColor: '#D97706', label_de: 'Beachten', label_it: 'Attenzione' },
  green: { bg: '#F0FDF4', border: '#BBF7D0', icon: 'check-circle', iconColor: '#16A34A', label_de: 'Synergie', label_it: 'Sinergia' },
};

const OPT_ICONS: Record<string, string> = {
  timing: 'clock-outline',
  dosage: 'scale-balance',
  replace: 'swap-horizontal',
};

interface Props {
  profileId: string;
  lang: string;
}

export function InteractionAnalysis({ profileId, lang }: Props) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCached();
  }, [profileId]);

  const loadCached = async () => {
    try {
      const res = await fetch(`${API_URL}/api/supplement-plan/${profileId}/interactions`);
      if (res.ok) {
        setAnalysis(await res.json());
      }
    } catch {}
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_URL}/api/supplement-plan/${profileId}/analyze-interactions?lang=${lang}`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Analyse fehlgeschlagen');
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (e: any) {
      setError(e.message || (lang === 'de' ? 'Fehler bei der Analyse' : 'Errore nell\'analisi'));
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) => {
    if (s >= 75) return '#16A34A';
    if (s >= 50) return '#D97706';
    return '#DC2626';
  };

  // Empty / initial state
  if (!analysis && !loading) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconWrap}>
          <MaterialCommunityIcons name="shield-search" size={48} color="#4A8B71" />
        </View>
        <Text style={styles.emptyTitle}>
          {lang === 'de' ? 'Stack-Analyse' : 'Analisi Stack'}
        </Text>
        <Text style={styles.emptyDesc}>
          {lang === 'de'
            ? 'Lassen Sie Ihren Supplement-Stack auf Wechselwirkungen, Risiken und Synergien pruefen.'
            : 'Verifica il tuo stack di supplementi per interazioni, rischi e sinergie.'}
        </Text>
        <TouchableOpacity
          testID="run-interaction-analysis-btn"
          style={styles.analyzeBtn}
          onPress={runAnalysis}
        >
          <MaterialCommunityIcons name="flask" size={20} color="#FFF" />
          <Text style={styles.analyzeBtnText}>
            {lang === 'de' ? 'Analyse starten' : 'Avvia analisi'}
          </Text>
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#4A8B71" />
        <Text style={styles.loadingText}>
          {lang === 'de' ? 'Analysiere Wechselwirkungen...' : 'Analisi interazioni...'}
        </Text>
        <Text style={styles.loadingSubtext}>
          {lang === 'de' ? 'KI prueft Ihren Stack' : 'IA verifica il tuo stack'}
        </Text>
      </View>
    );
  }

  if (!analysis) return null;

  const score = analysis.overall_score || 0;
  const interactions = analysis.interactions || [];
  const optimizations = analysis.optimizations || [];
  const redCount = interactions.filter((i: any) => i.severity === 'red').length;
  const yellowCount = interactions.filter((i: any) => i.severity === 'yellow').length;
  const greenCount = interactions.filter((i: any) => i.severity === 'green').length;

  return (
    <View>
      {/* Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreNum, { color: scoreColor(score) }]}>{score}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.scoreLabel}>{analysis.score_label}</Text>
          <Text style={styles.scoreSummary} numberOfLines={3}>{analysis.summary}</Text>
        </View>
      </View>

      {/* Traffic Light Overview */}
      <View style={styles.trafficRow}>
        <View style={[styles.trafficItem, { backgroundColor: '#FEF2F2' }]}>
          <MaterialCommunityIcons name="alert-circle" size={18} color="#DC2626" />
          <Text style={[styles.trafficNum, { color: '#DC2626' }]}>{redCount}</Text>
          <Text style={styles.trafficLabel}>{lang === 'de' ? 'Risiken' : 'Rischi'}</Text>
        </View>
        <View style={[styles.trafficItem, { backgroundColor: '#FFFBEB' }]}>
          <MaterialCommunityIcons name="alert" size={18} color="#D97706" />
          <Text style={[styles.trafficNum, { color: '#D97706' }]}>{yellowCount}</Text>
          <Text style={styles.trafficLabel}>{lang === 'de' ? 'Beachten' : 'Attenzione'}</Text>
        </View>
        <View style={[styles.trafficItem, { backgroundColor: '#F0FDF4' }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#16A34A" />
          <Text style={[styles.trafficNum, { color: '#16A34A' }]}>{greenCount}</Text>
          <Text style={styles.trafficLabel}>{lang === 'de' ? 'Synergien' : 'Sinergie'}</Text>
        </View>
      </View>

      {/* Interactions */}
      {interactions.length > 0 && (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>
            {lang === 'de' ? 'Wechselwirkungen' : 'Interazioni'}
          </Text>
          {interactions.map((item: any, idx: number) => {
            const config = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.yellow;
            return (
              <View
                key={idx}
                style={[styles.interactionCard, { backgroundColor: config.bg, borderColor: config.border }]}
                testID={`interaction-card-${idx}`}
              >
                <View style={styles.interactionHeader}>
                  <MaterialCommunityIcons name={config.icon as any} size={20} color={config.iconColor} />
                  <View style={[styles.severityBadge, { backgroundColor: config.iconColor + '20' }]}>
                    <Text style={[styles.severityText, { color: config.iconColor }]}>
                      {lang === 'de' ? config.label_de : config.label_it}
                    </Text>
                  </View>
                  <Text style={styles.interactionTitle} numberOfLines={2}>{item.title}</Text>
                </View>
                <Text style={styles.interactionDesc}>{item.description}</Text>
                {item.supplements_involved?.length > 0 && (
                  <View style={styles.pillsRow}>
                    {item.supplements_involved.map((name: string, i: number) => (
                      <View key={i} style={styles.pill}>
                        <Text style={styles.pillText}>{name}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {item.recommendation && (
                  <View style={styles.recRow}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#4A8B71" />
                    <Text style={styles.recText}>{item.recommendation}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Optimizations */}
      {optimizations.length > 0 && (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>
            {lang === 'de' ? 'Optimierungsvorschlaege' : 'Suggerimenti di ottimizzazione'}
          </Text>
          {optimizations.map((opt: any, idx: number) => (
            <View key={idx} style={styles.optCard} testID={`optimization-card-${idx}`}>
              <View style={styles.optHeader}>
                <View style={styles.optIconWrap}>
                  <MaterialCommunityIcons
                    name={(OPT_ICONS[opt.type] || 'tune') as any}
                    size={20}
                    color="#2D5A8B"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optSupplement}>{opt.supplement}</Text>
                  <Text style={styles.optType}>
                    {opt.type === 'timing'
                      ? (lang === 'de' ? 'Einnahmezeit' : 'Orario')
                      : opt.type === 'dosage'
                      ? (lang === 'de' ? 'Dosierung' : 'Dosaggio')
                      : (lang === 'de' ? 'Ersatz' : 'Sostituzione')}
                  </Text>
                </View>
              </View>
              <View style={styles.optChangeRow}>
                <View style={styles.optChangeBubble}>
                  <Text style={styles.optChangeLabel}>{lang === 'de' ? 'Aktuell' : 'Attuale'}</Text>
                  <Text style={styles.optChangeVal}>{opt.current}</Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#8FA39B" />
                <View style={[styles.optChangeBubble, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Text style={[styles.optChangeLabel, { color: '#2D5A8B' }]}>{lang === 'de' ? 'Vorschlag' : 'Suggerito'}</Text>
                  <Text style={[styles.optChangeVal, { color: '#1E40AF' }]}>{opt.suggested}</Text>
                </View>
              </View>
              <Text style={styles.optReason}>{opt.reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Re-analyze Button */}
      <TouchableOpacity
        testID="rerun-interaction-analysis-btn"
        style={styles.reanalyzeBtn}
        onPress={runAnalysis}
        disabled={loading}
      >
        <MaterialCommunityIcons name="refresh" size={18} color="#4A8B71" />
        <Text style={styles.reanalyzeBtnText}>
          {lang === 'de' ? 'Erneut analysieren' : 'Rianalizza'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A2D26', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#5C7A6F', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#4A8B71', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14,
  },
  analyzeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 12, textAlign: 'center' },

  // Loading
  loadingWrap: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { fontSize: 16, fontWeight: '600', color: '#1A2D26', marginTop: 16 },
  loadingSubtext: { fontSize: 13, color: '#5C7A6F', marginTop: 4 },

  // Score
  scoreCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E0E6E2',
  },
  scoreCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#F8FAF9', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#E0E6E2',
  },
  scoreNum: { fontSize: 24, fontWeight: '800' },
  scoreMax: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: -2 },
  scoreLabel: { fontSize: 15, fontWeight: '700', color: '#1A2D26', marginBottom: 4 },
  scoreSummary: { fontSize: 13, color: '#5C7A6F', lineHeight: 19 },

  // Traffic light
  trafficRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  trafficItem: {
    flex: 1, alignItems: 'center', borderRadius: 12, padding: 10, gap: 4,
  },
  trafficNum: { fontSize: 20, fontWeight: '800' },
  trafficLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },

  // Sections
  sectionWrap: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', marginBottom: 10 },

  // Interaction cards
  interactionCard: {
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1,
  },
  interactionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  severityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  severityText: { fontSize: 11, fontWeight: '700' },
  interactionTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A2D26' },
  interactionDesc: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 8 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  pill: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  recText: { flex: 1, fontSize: 12, color: '#4A8B71', fontWeight: '600', lineHeight: 18 },

  // Optimization cards
  optCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E0E6E2',
  },
  optHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  optIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },
  optSupplement: { fontSize: 14, fontWeight: '700', color: '#1A2D26' },
  optType: { fontSize: 11, color: '#2D5A8B', fontWeight: '600', marginTop: 1 },
  optChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  optChangeBubble: {
    flex: 1, backgroundColor: '#F8FAF9', borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: '#E0E6E2',
  },
  optChangeLabel: { fontSize: 10, color: '#8FA39B', fontWeight: '600', marginBottom: 2 },
  optChangeVal: { fontSize: 13, color: '#1A2D26', fontWeight: '600' },
  optReason: { fontSize: 12, color: '#5C7A6F', lineHeight: 18 },

  // Re-analyze
  reanalyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F0F4F2', borderRadius: 12, padding: 12, marginTop: 4,
  },
  reanalyzeBtnText: { fontSize: 14, fontWeight: '600', color: '#4A8B71' },
});
