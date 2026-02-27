import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { styles } from './homeStyles';

const CHIP_ICONS = [
  'sleep', 'head-flash-outline', 'stomach', 'bone', 'weather-night',
  'lightning-bolt-outline', 'thermometer', 'hand-front-right-outline', 'human', 'head-cog-outline',
];

interface SymptomChipsProps {
  lang: string;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export function SymptomChips({ lang, selectedTags, onToggleTag }: SymptomChipsProps) {
  const chipLabels = t(lang, 'symptom_chips') as string[];

  return (
    <>
      <Text style={styles.chipsTitle}>
        {lang === 'de' ? 'Häufige Bereiche' : 'Aree comuni'}
      </Text>
      <View style={styles.chipsWrap}>
        {chipLabels.map((label: string, idx: number) => {
          const selected = selectedTags.includes(label);
          return (
            <TouchableOpacity
              key={label}
              testID={`symptom-chip-${label.toLowerCase()}`}
              style={[styles.chip, selected && styles.chipSelected]}
              activeOpacity={0.7}
              onPress={() => onToggleTag(label)}
            >
              <MaterialCommunityIcons
                name={(CHIP_ICONS[idx] || 'circle') as any}
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
