import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { styles } from './homeStyles';

interface AnalyzeButtonProps {
  lang: string;
  isLoading: boolean;
  onPress: () => void;
}

export function AnalyzeButton({ lang, isLoading, onPress }: AnalyzeButtonProps) {
  return (
    <TouchableOpacity
      testID="analyze-btn"
      style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <View style={styles.btnRow}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <Text style={styles.primaryBtnText}>  {t(lang, 'analyzing')}</Text>
        </View>
      ) : (
        <View style={styles.btnRow}>
          <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>  {t(lang, 'analyze_btn')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
