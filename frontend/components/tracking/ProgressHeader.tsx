import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { trackingStyles as styles } from './trackingStyles';

interface ProgressHeaderProps {
  progress: number;
  streak: number;
  daysTracked: number;
  complianceRate: number;
  lang: string;
}

export function ProgressHeader({ progress, streak, daysTracked, complianceRate, lang }: ProgressHeaderProps) {
  return (
    <View style={styles.progressCard} testID="progress-header-card">
      <View style={styles.progressRow}>
        {/* Streak */}
        <View style={styles.statBox}>
          <MaterialCommunityIcons name="fire" size={24} color="#F59E0B" style={styles.streakIcon} />
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>{lang === 'de' ? 'Tage Streak' : 'Giorni streak'}</Text>
        </View>

        {/* Progress Circle */}
        <View style={styles.progressCenter}>
          <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
          <Text style={styles.progressLabel}>{lang === 'de' ? 'Gesamt-Fortschritt' : 'Progresso totale'}</Text>
        </View>

        {/* Days Tracked */}
        <View style={styles.statBox}>
          <MaterialCommunityIcons name="calendar-check" size={24} color="#4A8B71" style={styles.streakIcon} />
          <Text style={styles.statValue}>{daysTracked}</Text>
          <Text style={styles.statLabel}>{lang === 'de' ? 'Tage getrackt' : 'Giorni tracciati'}</Text>
        </View>
      </View>

      {/* Compliance Mini-Stat */}
      <View style={{ marginTop: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#5C7A6F' }}>
          {lang === 'de' ? 'Einnahmetreue' : 'Compliance'}: <Text style={{ fontWeight: '700', color: complianceRate >= 80 ? '#4A8B71' : complianceRate >= 50 ? '#F59E0B' : '#EF4444' }}>{complianceRate}%</Text>
        </Text>
      </View>
    </View>
  );
}
