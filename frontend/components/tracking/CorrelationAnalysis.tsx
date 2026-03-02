import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const PERIOD_OPTIONS = [14, 30, 60];

const SEVERITY_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  positive: { bg: '#DCFCE7', text: '#166534', icon: '#22C55E' },
  neutral: { bg: '#F3F4F6', text: '#374151', icon: '#6B7280' },
  negative: { bg: '#FEF3C7', text: '#92400E', icon: '#F59E0B' },
};

const SUPPLEMENT_LABELS: Record<string, string> = {
  magnesium: 'Magnesium', b_vitamins: 'Vitamin B', vitamin_c: 'Vitamin C',
  ashwagandha: 'Ashwagandha', zinc: 'Zink', omega3: 'Omega-3', probiotics: 'Probiotika',
};

const SYMPTOM_LABELS_DE: Record<string, string> = {
  energy: 'Energie', sleep: 'Schlaf', mood: 'Stimmung',
  concentration: 'Konzentration', digestion: 'Verdauung',
};

const SYMPTOM_LABELS_IT: Record<string, string> = {
  energy: 'Energia', sleep: 'Sonno', mood: 'Umore',
  concentration: 'Concentrazione', digestion: 'Digestione',
};

interface Props {
  profileId: string;
  lang: string;
}

export function CorrelationAnalysis({ profileId, lang }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(30);
  const [error, setError] = useState('');

  const symLabels = lang === 'de' ? SYMPTOM_LABELS_DE : SYMPTOM_LABELS_IT;

  useEffect(() => {
    loadAnalysis();
  }, [profileId, period]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_URL}/api/tracking/correlation-analysis/${profileId}?days=${period}&lang=${lang}`
      );
      if (res.ok) {
        setData(await res.json());
      } else {
        setError(lang === 'de' ? 'Fehler beim Laden' : 'Errore nel caricamento');
      }
    } catch {
      setError(lang === 'de' ? 'Verbindungsfehler' : 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#4A8B71" />
        <Text style={styles.loadingText}>
          {lang === 'de' ? 'Analysiere Zusammenhaenge...' : 'Analisi correlazioni...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorWrap}>
        <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#DC2626" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data) return null;

  // Insufficient data
  if (data.status === 'insufficient_data') {
    return (
      <View style={styles.card}>
        <View style={styles.insufficientWrap}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={40} color="#8FA39B" />
          <Text style={styles.insufficientText}>{data.message}</Text>
        </View>
      </View>
    );
  }

  const overall = data.overall_trend || {};
  const llm = data.llm_insights || {};
  const insights = llm.insights || [];
  const suppComp = data.supplement_compliance || {};
  const symTrends = data.symptom_trends || {};

  const trendColor = (dir: string) =>
    dir === 'improving' ? '#16A34A' : dir === 'worsening' ? '#DC2626' : '#6B7280';
  const trendIcon = (dir: string) =>
    dir === 'improving' ? 'trending-up' : dir === 'worsening' ? 'trending-down' : 'minus';

  return (
    <View>
      {/* Period Selector */}
      <View style={styles.periodRow} data-testid="period-selector">
        {PERIOD_OPTIONS.map(p => (
          <TouchableOpacity
            key={p}
            data-testid={`period-${p}`}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p} {lang === 'de' ? 'Tage' : 'giorni'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LLM Headline */}
      {llm.headline && (
        <View style={styles.headlineCard} data-testid="correlation-headline">
          <MaterialCommunityIcons name="brain" size={22} color="#4A8B71" />
          <Text style={styles.headlineText}>{llm.headline}</Text>
        </View>
      )}

      {/* Overall Trend */}
      <View style={styles.card} data-testid="overall-trend-card">
        <View style={styles.overallRow}>
          <View style={[styles.overallBadge, { backgroundColor: trendColor(overall.direction) + '18' }]}>
            <MaterialCommunityIcons
              name={trendIcon(overall.direction) as any}
              size={24}
              color={trendColor(overall.direction)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.overallLabel}>
              {lang === 'de' ? 'Gesamttrend' : 'Trend generale'}
            </Text>
            <Text style={[styles.overallValue, { color: trendColor(overall.direction) }]}>
              {overall.change_pct > 0 ? '+' : ''}{overall.change_pct}%
            </Text>
          </View>
          <View style={styles.overallRange}>
            <Text style={styles.rangeVal}>{overall.avg_start}</Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color="#8FA39B" />
            <Text style={[styles.rangeVal, { fontWeight: '700' }]}>{overall.avg_end}</Text>
          </View>
        </View>
      </View>

      {/* Symptom Trends */}
      <View style={styles.card} data-testid="symptom-trends-card">
        <Text style={styles.sectionTitle}>
          {lang === 'de' ? 'Symptom-Verlauf' : 'Andamento sintomi'}
        </Text>
        {Object.entries(symTrends).map(([key, trend]: [string, any]) => (
          <View key={key} style={styles.trendRow}>
            <Text style={styles.trendName}>{symLabels[key] || key}</Text>
            <View style={styles.trendBar}>
              <View
                style={[
                  styles.trendFill,
                  {
                    width: `${Math.min(Math.max((trend.avg_end / 10) * 100, 10), 100)}%`,
                    backgroundColor: trendColor(trend.direction),
                  },
                ]}
              />
            </View>
            <Text style={[styles.trendPct, { color: trendColor(trend.direction) }]}>
              {trend.change_pct > 0 ? '+' : ''}{trend.change_pct}%
            </Text>
          </View>
        ))}
      </View>

      {/* Supplement Compliance */}
      <View style={styles.card} data-testid="supplement-compliance-card">
        <Text style={styles.sectionTitle}>
          {lang === 'de' ? 'Einnahmekonstanz' : 'Costanza assunzione'}
        </Text>
        {Object.entries(suppComp).map(([sid, comp]: [string, any]) => {
          const rateColor = comp.rate >= 80 ? '#16A34A' : comp.rate >= 60 ? '#D97706' : '#DC2626';
          return (
            <View key={sid} style={styles.compRow}>
              <Text style={styles.compName}>{SUPPLEMENT_LABELS[sid] || sid}</Text>
              <View style={styles.compBarWrap}>
                <View style={[styles.compBarFill, { width: `${comp.rate}%`, backgroundColor: rateColor }]} />
              </View>
              <Text style={[styles.compRate, { color: rateColor }]}>{comp.rate}%</Text>
            </View>
          );
        })}
      </View>

      {/* LLM Insights */}
      {insights.length > 0 && (
        <View data-testid="llm-insights-section">
          <Text style={[styles.sectionTitle, { marginTop: 4 }]}>
            {lang === 'de' ? 'KI-Erkenntnisse' : 'Insights IA'}
          </Text>
          {insights.map((insight: any, idx: number) => {
            const sev = SEVERITY_STYLE[insight.severity] || SEVERITY_STYLE.neutral;
            return (
              <View key={idx} style={[styles.insightCard, { backgroundColor: sev.bg }]} data-testid={`insight-${idx}`}>
                <MaterialCommunityIcons name={(insight.icon || 'lightbulb') as any} size={20} color={sev.icon} />
                <Text style={[styles.insightText, { color: sev.text }]}>{insight.text}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Recommendation */}
      {llm.recommendation && (
        <View style={styles.recCard} data-testid="recommendation-card">
          <MaterialCommunityIcons name="lightbulb-on" size={20} color="#2D5A8B" />
          <Text style={styles.recText}>{llm.recommendation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 14, color: '#5C7A6F', marginTop: 12 },
  errorWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  errorText: { fontSize: 14, color: '#DC2626' },

  // Period
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  periodBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: 10, backgroundColor: '#F0F4F2',
  },
  periodBtnActive: { backgroundColor: '#4A8B71' },
  periodText: { fontSize: 13, fontWeight: '600', color: '#5C7A6F' },
  periodTextActive: { color: '#FFFFFF' },

  // Headline
  headlineCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#E8F5E9', borderRadius: 14, padding: 14, marginBottom: 12,
  },
  headlineText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#2D5A3F', lineHeight: 22 },

  // Card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#E0E6E2',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A2D26', marginBottom: 10 },

  // Overall
  overallRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  overallBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  overallLabel: { fontSize: 12, color: '#8FA39B', fontWeight: '600' },
  overallValue: { fontSize: 22, fontWeight: '800' },
  overallRange: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rangeVal: { fontSize: 14, color: '#5C7A6F', fontWeight: '600' },

  // Symptom trends
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  trendName: { width: 90, fontSize: 13, color: '#374151', fontWeight: '600' },
  trendBar: { flex: 1, height: 8, backgroundColor: '#F0F4F2', borderRadius: 4, overflow: 'hidden' },
  trendFill: { height: 8, borderRadius: 4 },
  trendPct: { width: 50, textAlign: 'right', fontSize: 13, fontWeight: '700' },

  // Supplement compliance
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  compName: { width: 90, fontSize: 12, color: '#374151', fontWeight: '600' },
  compBarWrap: { flex: 1, height: 6, backgroundColor: '#F0F4F2', borderRadius: 3, overflow: 'hidden' },
  compBarFill: { height: 6, borderRadius: 3 },
  compRate: { width: 42, textAlign: 'right', fontSize: 13, fontWeight: '700' },

  // Insights
  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  insightText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // Recommendation
  recCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  recText: { flex: 1, fontSize: 13, color: '#1E40AF', fontWeight: '600', lineHeight: 20 },

  insufficientWrap: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  insufficientText: { fontSize: 14, color: '#5C7A6F', textAlign: 'center', lineHeight: 22 },
});
