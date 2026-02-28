import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { trackingStyles as styles } from './trackingStyles';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface SymptomTrackerProps {
  profileId: string;
  lang: string;
  overallChart: Array<{ date: string; value: number }>;
  symptomTrend?: { direction: string; change_pct: number; label_de: string; label_it: string };
  onSave: () => void;
}

const SYMPTOM_CATEGORIES = [
  { id: 'energy', label_de: 'Energie', label_it: 'Energia' },
  { id: 'sleep', label_de: 'Schlaf', label_it: 'Sonno' },
  { id: 'mood', label_de: 'Stimmung', label_it: 'Umore' },
  { id: 'concentration', label_de: 'Konzentration', label_it: 'Concentrazione' },
  { id: 'digestion', label_de: 'Verdauung', label_it: 'Digestione' },
];

export function SymptomTracker({ profileId, lang, overallChart, symptomTrend, onSave }: SymptomTrackerProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [overall, setOverall] = useState<number>(5);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/tracking/symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          date: today,
          ratings,
          overall,
          notes: ''
        })
      });
      if (res.ok) {
        Alert.alert(
          lang === 'de' ? 'Gespeichert!' : 'Salvato!',
          lang === 'de' ? 'Ihre Symptombewertung wurde gespeichert.' : 'La tua valutazione dei sintomi è stata salvata.'
        );
        onSave();
      } else {
        throw new Error('Save failed');
      }
    } catch (e) {
      Alert.alert(
        lang === 'de' ? 'Fehler' : 'Errore',
        lang === 'de' ? 'Speichern fehlgeschlagen.' : 'Salvataggio fallito.'
      );
    } finally {
      setSaving(false);
    }
  };

  const getTrendColor = () => {
    if (!symptomTrend) return '#6B7280';
    if (symptomTrend.direction === 'improving') return '#22C55E';
    if (symptomTrend.direction === 'worsening') return '#EF4444';
    return '#6B7280';
  };

  const getTrendIcon = () => {
    if (!symptomTrend) return 'minus';
    if (symptomTrend.direction === 'improving') return 'trending-down';
    if (symptomTrend.direction === 'worsening') return 'trending-up';
    return 'minus';
  };

  // Chart Data
  const chartLabels = overallChart.slice(-7).map(d => d.date.slice(5));
  const chartValues = overallChart.slice(-7).map(d => d.value);

  return (
    <View testID="symptom-tracker">
      {/* Trend Badge */}
      {symptomTrend && (
        <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor()}20` }]}>
          <MaterialCommunityIcons name={getTrendIcon() as any} size={16} color={getTrendColor()} />
          <Text style={[styles.trendBadgeText, { color: getTrendColor() }]}>
            {lang === 'de' ? symptomTrend.label_de : symptomTrend.label_it}
          </Text>
        </View>
      )}

      {/* Chart */}
      {overallChart.length >= 2 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{lang === 'de' ? 'Verlauf (letzte 7 Tage)' : 'Andamento (ultimi 7 giorni)'}</Text>
          <LineChart
            data={{
              labels: chartLabels.length > 0 ? chartLabels : [''],
              datasets: [{ data: chartValues.length > 0 ? chartValues : [0] }]
            }}
            width={SCREEN_WIDTH - 68}
            height={180}
            yAxisSuffix=""
            yAxisInterval={1}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(74, 139, 113, ${opacity})`,
              labelColor: () => '#8FA39B',
              style: { borderRadius: 16 },
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#4A8B71' }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>
      )}

      {/* Rating Input Card */}
      <View style={styles.ratingCard}>
        <Text style={styles.ratingTitle}>
          {lang === 'de' ? `Wie geht es Ihnen heute? (${today})` : `Come ti senti oggi? (${today})`}
        </Text>

        {/* Overall Rating */}
        <View style={styles.ratingRow}>
          <Text style={styles.ratingLabel}>{lang === 'de' ? 'Gesamt' : 'Totale'}</Text>
          <View style={styles.ratingDots}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <TouchableOpacity
                key={n}
                testID={`overall-rating-${n}`}
                style={[styles.ratingDot, overall === n && styles.ratingDotActive]}
                onPress={() => setOverall(n)}
              >
                <Text style={[styles.ratingDotText, overall === n && styles.ratingDotTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Ratings */}
        {SYMPTOM_CATEGORIES.map(cat => (
          <View key={cat.id} style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>{lang === 'de' ? cat.label_de : cat.label_it}</Text>
            <View style={styles.ratingDots}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <TouchableOpacity
                  key={n}
                  testID={`${cat.id}-rating-${n}`}
                  style={[styles.ratingDot, ratings[cat.id] === n && styles.ratingDotActive]}
                  onPress={() => setRatings({ ...ratings, [cat.id]: n })}
                >
                  <Text style={[styles.ratingDotText, ratings[cat.id] === n && styles.ratingDotTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          testID="save-symptoms-btn"
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving
              ? (lang === 'de' ? 'Speichern...' : 'Salvataggio...')
              : (lang === 'de' ? 'Speichern' : 'Salva')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
