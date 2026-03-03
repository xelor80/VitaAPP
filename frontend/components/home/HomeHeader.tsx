import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { useSettings } from '../../src/SettingsContext';
import { styles } from './homeStyles';

interface HomeHeaderProps {
  lang: string;
  setLang: (lang: string) => void;
  onLangChange?: () => void;
  firstName?: string | null;
}

export function HomeHeader({ lang, setLang, onLangChange, firstName }: HomeHeaderProps) {
  const { translations } = useSettings();
  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    onLangChange?.();
  };

  const greeting = firstName
    ? (lang === 'de' ? `Hallo ${firstName}!` : `Ciao ${firstName}!`)
    : null;

  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <View style={{ width: 80 }} />
        <View style={styles.logoRow}>
          <MaterialCommunityIcons name="leaf" size={28} color="#4A8B71" />
          <Text style={styles.logoText}>VitaGuide</Text>
        </View>
        <View style={styles.langSwitcherSmall}>
          <TouchableOpacity
            testID="lang-de-home"
            style={[styles.langBtnSm, lang === 'de' && styles.langBtnSmActive]}
            onPress={() => handleLangChange('de')}
          >
            <Text style={[styles.langBtnSmText, lang === 'de' && styles.langBtnSmTextActive]}>DE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="lang-it-home"
            style={[styles.langBtnSm, lang === 'it' && styles.langBtnSmActive]}
            onPress={() => handleLangChange('it')}
          >
            <Text style={[styles.langBtnSmText, lang === 'it' && styles.langBtnSmTextActive]}>IT</Text>
          </TouchableOpacity>
        </View>
      </View>
      {greeting && (
        <Text testID="personalized-greeting" style={styles.greetingText}>{greeting}</Text>
      )}
      <Text style={styles.headerSubtitle}>{t(lang, 'home_subtitle', translations)}</Text>
    </View>
  );
}
