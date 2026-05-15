import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { useSettings } from '../../src/SettingsContext';
import { useBrand } from '../../src/BrandContext';
import { styles } from './homeStyles';

interface HomeHeaderProps {
  lang: string;
  setLang: (lang: string) => void;
  onLangChange?: () => void;
  firstName?: string | null;
}

export function HomeHeader({ lang, setLang, onLangChange, firstName }: HomeHeaderProps) {
  const { translations } = useSettings();
  const { brand, appName, tagline } = useBrand();
  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    onLangChange?.();
  };

  const greeting = firstName
    ? (lang === 'de' ? `Hallo ${firstName}!` : `Ciao ${firstName}!`)
    : null;

  const customTagline = tagline(lang);
  const subtitle = customTagline && !brand.is_default
    ? customTagline
    : t(lang, 'home_subtitle', translations);

  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <View style={{ width: 80 }} />
        <View style={styles.logoRow} testID="brand-logo-row">
          {brand.logo_url ? (
            <Image
              source={{ uri: brand.logo_url }}
              style={{ width: 28, height: 28, resizeMode: 'contain' }}
              testID="brand-logo-image"
            />
          ) : (
            <MaterialCommunityIcons name="leaf" size={28} color={brand.primary_color || '#4A8B71'} />
          )}
          <Text style={[styles.logoText, { color: brand.primary_color || '#4A8B71' }]} testID="brand-app-name">
            {appName(lang)}
          </Text>
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
      <Text style={styles.headerSubtitle}>{subtitle}</Text>
    </View>
  );
}
