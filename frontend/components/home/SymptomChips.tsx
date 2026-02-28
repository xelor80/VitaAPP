import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { useSettings } from '../../src/SettingsContext';
import { styles } from './homeStyles';

interface SymptomChipsProps {
  lang: string;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export function SymptomChips({ lang, selectedTags, onToggleTag }: SymptomChipsProps) {
  const { chips } = useSettings();

  // Use dynamic chips from backend if available, otherwise fall back to hardcoded
  const dynamicChips = chips.length > 0 ? chips : null;
  const chipLabels = dynamicChips
    ? dynamicChips.map(c => lang === 'de' ? c.de : c.it)
    : (t(lang, 'symptom_chips') as string[]);
  const chipIcons = dynamicChips
    ? dynamicChips.map(c => c.icon)
    : ['sleep', 'head-flash-outline', 'stomach', 'bone', 'weather-night',
       'lightning-bolt-outline', 'thermometer', 'hand-front-right-outline', 'human', 'head-cog-outline'];

  return (
    <>
      <Text style={styles.chipsTitle}>
        {lang === 'de' ? 'Haeufige Bereiche' : 'Aree comuni'}
      </Text>
      <View style={styles.chipsWrap}>
        {chipLabels.map((label: string, idx: number) => {
          const selected = selectedTags.includes(label);
          return (
            <TouchableOpacity
              key={label}
              testID={`symptom-chip-${label.toLowerCase().replace(/\s/g, '-')}`}
              style={[styles.chip, selected && styles.chipSelected]}
              activeOpacity={0.7}
              onPress={() => onToggleTag(label)}
            >
              <MaterialCommunityIcons
                name={(chipIcons[idx] || 'circle') as any}
                size={16}
                color={selected ? '#FFFFFF' : '#2C5F78'}
              />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}
