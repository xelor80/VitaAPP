import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './homeStyles';

interface ProgressButtonProps {
  lang: string;
  onPress: () => void;
}

export function ProgressButton({ lang, onPress }: ProgressButtonProps) {
  return (
    <TouchableOpacity
      testID="progress-btn"
      style={styles.progressButton}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.progressIconWrap}>
        <MaterialCommunityIcons name="chart-line" size={16} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.progressBtnTitle}>
          {lang === 'de' ? 'Mein Fortschritt' : 'Il mio progresso'}
        </Text>
        <Text style={styles.progressBtnSub} numberOfLines={1}>
          {lang === 'de' ? 'Symptome, Einnahme & Meilensteine' : 'Traccia sintomi e traguardi'}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
    </TouchableOpacity>
  );
}
