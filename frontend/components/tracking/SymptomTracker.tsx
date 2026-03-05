import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Alert, Dimensions, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface SymptomTrackerProps {
  profileId: string;
  lang: string;
  overallChart: Array<{ date: string; value: number }>;
  symptomChart?: Record<string, Array<{ date: string; value: number }>>;
  symptomTrend?: { direction: string; change_pct: number; label_de: string; label_it: string };
  todaySubmitted?: boolean;
  todayEntry?: any;
  onSave: () => void;
}

const SYMPTOM_CATEGORIES = [
  { id: 'energy', label_de: 'Energie', label_it: 'Energia', icon: 'lightning-bolt' },
  { id: 'sleep', label_de: 'Schlafqualitaet', label_it: 'Qualita sonno', icon: 'weather-night' },
  { id: 'mood', label_de: 'Stimmung', label_it: 'Umore', icon: 'emoticon-outline' },
  { id: 'concentration', label_de: 'Konzentration', label_it: 'Concentrazione', icon: 'brain' },
  { id: 'digestion', label_de: 'Verdauung', label_it: 'Digestione', icon: 'stomach' },
  { id: 'pain', label_de: 'Schmerzen', label_it: 'Dolore', icon: 'bandage' },
  { id: 'stress', label_de: 'Stress', label_it: 'Stress', icon: 'head-snowflake-outline' },
];

function getSeverityColor(val: number): string {
  if (val <= 3) return '#22C55E';
  if (val <= 6) return '#F59E0B';
  return '#EF4444';
}

function getSeverityLabel(val: number, lang: string): string {
  if (val <= 3) return lang === 'de' ? 'Gut' : 'Buono';
  if (val <= 6) return lang === 'de' ? 'Maessig' : 'Moderato';
  return lang === 'de' ? 'Stark' : 'Forte';
}

function MiniSparkline({ data, width }: { data: number[]; width: number }) {
  if (data.length < 2) return null;
  const h = 32;
  const max = Math.max(...data, 10);
  const min = Math.min(...data, 1);
  const range = max - min || 1;
  const step = (width - 4) / (data.length - 1);
  const points = data.map((v, i) => `${2 + i * step},${h - 2 - ((v - min) / range) * (h - 4)}`).join(' ');
  const lastVal = data[data.length - 1];
  const color = getSeverityColor(lastVal);

  return (
    <View style={{ width, height: h }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Simple SVG-like rendering using View */}
        {data.map((v, i) => {
          if (i === 0) return null;
          const x1 = 2 + (i - 1) * step;
          const y1 = h - 2 - ((data[i - 1] - min) / range) * (h - 4);
          const x2 = 2 + i * step;
          const y2 = h - 2 - ((v - min) / range) * (h - 4);
          const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
          return (
            <View
              key={i}
              style={{
                position: 'absolute', left: x1, top: y1,
                width: len, height: 2, backgroundColor: color + '80',
                borderRadius: 1,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
              }}
            />
          );
        })}
        {/* Last dot */}
        <View
          style={{
            position: 'absolute',
            left: 2 + (data.length - 1) * step - 3,
            top: h - 2 - ((lastVal - min) / range) * (h - 4) - 3,
            width: 6, height: 6, borderRadius: 3, backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

export function SymptomTracker({
  profileId, lang, overallChart, symptomChart, symptomTrend,
  todaySubmitted, todayEntry, onSave
}: SymptomTrackerProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [overall, setOverall] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [showChart, setShowChart] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/tracking/symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId, date: today, ratings, overall, notes: ''
        })
      });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          window.alert(lang === 'de' ? 'Symptombewertung gespeichert!' : 'Valutazione salvata!');
        }
        onSave();
      } else { throw new Error('fail'); }
    } catch {
      if (typeof window !== 'undefined') {
        window.alert(lang === 'de' ? 'Speichern fehlgeschlagen.' : 'Salvataggio fallito.');
      }
    } finally {
      setSaving(false);
    }
  };

  const trendColor = !symptomTrend ? '#6B7280'
    : symptomTrend.direction === 'improving' ? '#22C55E'
    : symptomTrend.direction === 'worsening' ? '#EF4444' : '#6B7280';
  const trendIcon = !symptomTrend ? 'minus'
    : symptomTrend.direction === 'improving' ? 'trending-down'
    : symptomTrend.direction === 'worsening' ? 'trending-up' : 'minus';

  const chartLabels = overallChart.slice(-7).map(d => d.date.slice(5));
  const chartValues = overallChart.slice(-7).map(d => d.value);

  return (
    <View data-testid="symptom-tracker">
      {/* Trend Badge */}
      {symptomTrend && (
        <View style={[st.trendBadge, { backgroundColor: trendColor + '18' }]}>
          <MaterialCommunityIcons name={trendIcon as any} size={16} color={trendColor} />
          <Text style={[st.trendBadgeText, { color: trendColor }]}>
            {lang === 'de' ? symptomTrend.label_de : symptomTrend.label_it}
          </Text>
        </View>
      )}

      {/* Overall Chart */}
      {overallChart.length >= 2 && (
        <View style={st.chartCard}>
          <Text style={st.chartTitle}>
            {lang === 'de' ? 'Gesamtverlauf (7 Tage)' : 'Andamento (7 giorni)'}
          </Text>
          <LineChart
            data={{
              labels: chartLabels.length > 0 ? chartLabels : [''],
              datasets: [{ data: chartValues.length > 0 ? chartValues : [0] }]
            }}
            width={SCREEN_WIDTH - 68}
            height={160}
            yAxisSuffix=""
            yAxisInterval={1}
            chartConfig={{
              backgroundColor: '#FFF', backgroundGradientFrom: '#FFF', backgroundGradientTo: '#FFF',
              decimalPlaces: 0,
              color: (op = 1) => `rgba(74,139,113,${op})`,
              labelColor: () => '#8FA39B',
              style: { borderRadius: 12 },
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#4A8B71' }
            }}
            bezier
            style={{ borderRadius: 12 }}
          />
        </View>
      )}

      {/* Today's Rating Card */}
      <View style={st.ratingCard}>
        <View style={st.ratingCardHeader}>
          <MaterialCommunityIcons name="calendar-today" size={18} color="#4A8B71" />
          <Text style={st.ratingCardTitle}>
            {lang === 'de' ? `Heutige Bewertung` : `Valutazione di oggi`}
          </Text>
          <Text style={st.ratingDate}>{today}</Text>
        </View>

        {/* Locked State: Already submitted today */}
        {todaySubmitted ? (
          <View>
            <View style={st.lockedBanner}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={st.lockedTitle}>
                  {lang === 'de' ? 'Bereits fuer heute eingetragen' : 'Gia inserito per oggi'}
                </Text>
                <Text style={st.lockedSubtitle}>
                  {lang === 'de' ? 'Naechste Eingabe morgen moeglich' : 'Prossimo inserimento possibile domani'}
                </Text>
              </View>
            </View>

            {/* Show submitted ratings as read-only */}
            {todayEntry?.overall && (
              <View style={st.lockedOverall}>
                <Text style={st.sectionLabel}>{lang === 'de' ? 'ALLGEMEINBEFINDEN' : 'STATO GENERALE'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[st.severityValue, { color: getSeverityColor(todayEntry.overall) }]}>
                    {todayEntry.overall}/10
                  </Text>
                  <Text style={[st.severityLabel, { color: getSeverityColor(todayEntry.overall) }]}>
                    {getSeverityLabel(todayEntry.overall, lang)}
                  </Text>
                </View>
              </View>
            )}
            {todayEntry?.ratings && Object.keys(todayEntry.ratings).length > 0 && (
              <View style={st.lockedRatings}>
                {SYMPTOM_CATEGORIES.map(cat => {
                  const val = todayEntry.ratings[cat.id];
                  if (!val || val === 0) return null;
                  return (
                    <View key={cat.id} style={st.lockedRatingRow}>
                      <MaterialCommunityIcons name={cat.icon as any} size={14} color="#5C7A6F" />
                      <Text style={st.lockedRatingName}>{lang === 'de' ? cat.label_de : cat.label_it}</Text>
                      <View style={[st.lockedRatingBadge, { backgroundColor: getSeverityColor(val) + '20' }]}>
                        <Text style={[st.lockedRatingValue, { color: getSeverityColor(val) }]}>{val}/10</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
        /* Editable Form */
        <View>

        {/* Overall Severity */}
        <View style={st.overallSection}>
          <Text style={st.sectionLabel}>{lang === 'de' ? 'ALLGEMEINBEFINDEN' : 'STATO GENERALE'}</Text>
          <View style={st.severityBar}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <TouchableOpacity
                key={n}
                data-testid={`overall-rating-${n}`}
                style={[st.severitySegment, {
                  backgroundColor: overall >= n ? getSeverityColor(n) : '#E5E7EB',
                  borderTopLeftRadius: n === 1 ? 6 : 0,
                  borderBottomLeftRadius: n === 1 ? 6 : 0,
                  borderTopRightRadius: n === 10 ? 6 : 0,
                  borderBottomRightRadius: n === 10 ? 6 : 0,
                }]}
                onPress={() => setOverall(n)}
              />
            ))}
          </View>
          <View style={st.severityMeta}>
            <Text style={[st.severityValue, { color: getSeverityColor(overall) }]}>{overall}/10</Text>
            <Text style={[st.severityLabel, { color: getSeverityColor(overall) }]}>
              {getSeverityLabel(overall, lang)}
            </Text>
          </View>
        </View>

        {/* Symptom Categories */}
        {SYMPTOM_CATEGORIES.map(cat => {
          const val = ratings[cat.id] || 0;
          const hasHistory = symptomChart?.[cat.id]?.length ? symptomChart[cat.id].length >= 2 : false;
          const historyData = symptomChart?.[cat.id]?.slice(-7).map(d => d.value) || [];

          return (
            <View key={cat.id} style={st.symptomRow}>
              <View style={st.symptomRowHeader}>
                <MaterialCommunityIcons name={cat.icon as any} size={16} color="#5C7A6F" />
                <Text style={st.symptomName}>{lang === 'de' ? cat.label_de : cat.label_it}</Text>
                {hasHistory && (
                  <TouchableOpacity
                    style={st.chartToggle}
                    onPress={() => setShowChart(showChart === cat.id ? null : cat.id)}
                  >
                    <MaterialCommunityIcons
                      name={showChart === cat.id ? 'chart-line' : 'chart-line-variant'}
                      size={14} color="#4A8B71"
                    />
                  </TouchableOpacity>
                )}
                {val > 0 && (
                  <Text style={[st.symptomBadge, { backgroundColor: getSeverityColor(val) + '20', color: getSeverityColor(val) }]}>
                    {val}/10
                  </Text>
                )}
              </View>

              {/* Mini sparkline for history */}
              {showChart === cat.id && hasHistory && (
                <View style={st.sparklineWrap}>
                  <MiniSparkline data={historyData} width={SCREEN_WIDTH - 100} />
                  <Text style={st.sparklineLabel}>
                    {lang === 'de' ? 'Letzte 7 Eintraege' : 'Ultimi 7 inserimenti'}
                  </Text>
                </View>
              )}

              {/* Severity bar */}
              <View style={st.severityBar}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <TouchableOpacity
                    key={n}
                    data-testid={`${cat.id}-rating-${n}`}
                    style={[st.severitySegment, {
                      backgroundColor: val >= n ? getSeverityColor(n) : '#E5E7EB',
                      borderTopLeftRadius: n === 1 ? 6 : 0,
                      borderBottomLeftRadius: n === 1 ? 6 : 0,
                      borderTopRightRadius: n === 10 ? 6 : 0,
                      borderBottomRightRadius: n === 10 ? 6 : 0,
                    }]}
                    onPress={() => setRatings({ ...ratings, [cat.id]: n })}
                  />
                ))}
              </View>
              <View style={st.barLabels}>
                <Text style={st.barLabelText}>{lang === 'de' ? 'Gut' : 'Buono'}</Text>
                <Text style={st.barLabelText}>{lang === 'de' ? 'Stark' : 'Forte'}</Text>
              </View>
            </View>
          );
        })}

        {/* Save Button */}
        <TouchableOpacity
          data-testid="save-symptoms-btn"
          style={[st.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <MaterialCommunityIcons name="content-save-check" size={18} color="#FFF" />
          <Text style={st.saveBtnText}>
            {saving
              ? (lang === 'de' ? 'Speichern...' : 'Salvataggio...')
              : (lang === 'de' ? 'Bewertung speichern' : 'Salva valutazione')}
          </Text>
        </TouchableOpacity>
        </View>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 10, marginBottom: 12,
  },
  trendBadgeText: { fontSize: 13, fontWeight: '600' },

  chartCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: '600', color: '#1A2D26', marginBottom: 8 },

  ratingCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12 },
  ratingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  ratingCardTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', flex: 1 },
  ratingDate: { fontSize: 12, color: '#8FA39B', fontWeight: '500' },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#8FA39B',
    letterSpacing: 1.2, marginBottom: 8,
  },

  overallSection: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F4F2' },

  severityBar: { flexDirection: 'row', gap: 3, height: 28 },
  severitySegment: { flex: 1 },
  severityMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  severityValue: { fontSize: 20, fontWeight: '700' },
  severityLabel: { fontSize: 13, fontWeight: '600' },

  symptomRow: { marginBottom: 16 },
  symptomRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  symptomName: { fontSize: 14, fontWeight: '600', color: '#1A2D26', flex: 1 },
  chartToggle: { padding: 4 },
  symptomBadge: {
    fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, overflow: 'hidden',
  },

  sparklineWrap: { backgroundColor: '#F8FAF9', borderRadius: 8, padding: 8, marginBottom: 6 },
  sparklineLabel: { fontSize: 10, color: '#8FA39B', marginTop: 4, textAlign: 'center' },

  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  barLabelText: { fontSize: 10, color: '#8FA39B' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#4A8B71', borderRadius: 12,
    paddingVertical: 14, marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  lockedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#D1FAE5',
  },
  lockedTitle: { fontSize: 15, fontWeight: '700', color: '#10B981' },
  lockedSubtitle: { fontSize: 12, color: '#5C7A6F', marginTop: 2 },
  lockedOverall: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F4F2' },
  lockedRatings: { gap: 8 },
  lockedRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  lockedRatingName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#5C7A6F' },
  lockedRatingBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  lockedRatingValue: { fontSize: 12, fontWeight: '700' },
});
