import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { trackingStyles as styles } from './trackingStyles';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface Supplement {
  id: string;
  name: string;
}

interface ComplianceTrackerProps {
  profileId: string;
  lang: string;
  supplements: Supplement[];
  complianceDaily: Array<{ date: string; rate: number }>;
  complianceRate: number;
  complianceTrend?: { direction: string; change_pct: number };
  onSave: () => void;
}

export function ComplianceTracker({
  profileId,
  lang,
  supplements,
  complianceDaily,
  complianceRate,
  complianceTrend,
  onSave
}: ComplianceTrackerProps) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Initialize checks from supplements
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    supplements.forEach(s => {
      initial[s.id] = false;
    });
    setChecks(initial);
  }, [supplements]);

  const toggleCheck = (id: string) => {
    setChecks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supplementData = supplements.map(s => ({
        id: s.id,
        name: s.name,
        taken: checks[s.id] || false
      }));

      const res = await fetch(`${API_URL}/api/tracking/compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          date: today,
          supplements: supplementData
        })
      });

      if (res.ok) {
        Alert.alert(
          lang === 'de' ? 'Gespeichert!' : 'Salvato!',
          lang === 'de' ? 'Ihre Einnahme wurde dokumentiert.' : 'La tua assunzione è stata documentata.'
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
    if (!complianceTrend) return '#6B7280';
    if (complianceTrend.direction === 'improving') return '#22C55E';
    if (complianceTrend.direction === 'worsening') return '#EF4444';
    return '#6B7280';
  };

  // Chart Data
  const chartLabels = complianceDaily.slice(-7).map(d => d.date.slice(5));
  const chartValues = complianceDaily.slice(-7).map(d => d.rate);

  const takenCount = Object.values(checks).filter(Boolean).length;
  const todayRate = supplements.length > 0 ? Math.round((takenCount / supplements.length) * 100) : 0;

  return (
    <View testID="compliance-tracker">
      {/* Summary Card */}
      <View style={styles.complianceCard}>
        <View style={styles.complianceHeader}>
          <Text style={styles.chartTitle}>{lang === 'de' ? 'Einnahmetreue' : 'Compliance'}</Text>
          <Text style={[styles.complianceRate, { color: complianceRate >= 80 ? '#22C55E' : complianceRate >= 50 ? '#F59E0B' : '#EF4444' }]}>
            {complianceRate}%
          </Text>
        </View>

        {/* Chart */}
        {complianceDaily.length >= 2 && (
          <LineChart
            data={{
              labels: chartLabels.length > 0 ? chartLabels : [''],
              datasets: [{ data: chartValues.length > 0 ? chartValues : [0] }]
            }}
            width={SCREEN_WIDTH - 68}
            height={160}
            yAxisSuffix="%"
            yAxisInterval={1}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(45, 90, 139, ${opacity})`,
              labelColor: () => '#8FA39B',
              style: { borderRadius: 16 },
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#2D5A8B' }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        )}
      </View>

      {/* Today's Checklist */}
      <View style={styles.complianceCard}>
        <Text style={styles.chartTitle}>
          {lang === 'de' ? `Heute (${today})` : `Oggi (${today})`}
        </Text>
        <Text style={{ fontSize: 13, color: '#5C7A6F', marginBottom: 12 }}>
          {lang === 'de'
            ? `${takenCount} von ${supplements.length} eingenommen (${todayRate}%)`
            : `${takenCount} di ${supplements.length} assunti (${todayRate}%)`}
        </Text>

        {supplements.length === 0 ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <MaterialCommunityIcons name="pill-off" size={40} color="#8FA39B" />
            <Text style={{ fontSize: 14, color: '#5C7A6F', marginTop: 10, textAlign: 'center' }}>
              {lang === 'de'
                ? 'Kein Supplement-Plan vorhanden. Erstellen Sie zuerst Ihren Plan.'
                : 'Nessun piano supplementi. Crea prima il tuo piano.'}
            </Text>
          </View>
        ) : (
          supplements.map(s => (
            <TouchableOpacity
              key={s.id}
              testID={`compliance-check-${s.id}`}
              style={styles.complianceRow}
              onPress={() => toggleCheck(s.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="pill" size={18} color="#5C7A6F" />
              <Text style={styles.complianceName}>{s.name}</Text>
              <View style={[
                styles.checkBtn,
                { borderColor: checks[s.id] ? '#22C55E' : '#D1D5DB', backgroundColor: checks[s.id] ? '#DCFCE7' : '#FFFFFF' }
              ]}>
                {checks[s.id] && <MaterialCommunityIcons name="check" size={18} color="#22C55E" />}
              </View>
            </TouchableOpacity>
          ))
        )}

        {supplements.length > 0 && (
          <TouchableOpacity
            testID="save-compliance-btn"
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving
                ? (lang === 'de' ? 'Speichern...' : 'Salvataggio...')
                : (lang === 'de' ? 'Einnahme bestätigen' : 'Conferma assunzione')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
