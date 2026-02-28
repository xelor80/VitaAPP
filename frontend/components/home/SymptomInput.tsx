import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { t } from '../../src/i18n';
import { useSettings } from '../../src/SettingsContext';
import { styles } from './homeStyles';

interface SymptomInputProps {
  lang: string;
  value: string;
  onChangeText: (text: string) => void;
}

export function SymptomInput({ lang, value, onChangeText }: SymptomInputProps) {
  const { translations } = useSettings();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {lang === 'de' ? 'Was beschäftigt Sie?' : 'Cosa ti preoccupa?'}
      </Text>
      <Text style={styles.cardSubtitle}>
        {lang === 'de'
          ? 'Beschreiben Sie Ihre Symptome oder wählen Sie Bereiche aus'
          : 'Descrivi i tuoi sintomi o seleziona le aree'}
      </Text>
      <TextInput
        testID="symptom-text-input"
        style={styles.textInput}
        placeholder={t(lang, 'symptom_placeholder', translations)}
        placeholderTextColor="#8FA39B"
        multiline
        numberOfLines={4}
        value={value}
        onChangeText={onChangeText}
        textAlignVertical="top"
      />
    </View>
  );
}
