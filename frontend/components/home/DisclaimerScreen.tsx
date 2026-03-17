import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { styles } from './homeStyles';

const LANGS = [
  { code: 'de', flag: 'DE' },
  { code: 'it', flag: 'IT' },
  { code: 'en', flag: 'EN' },
] as const;

const SUBTITLE: Record<string, string> = {
  de: 'Bitte lesen Sie vor der Nutzung',
  it: "Si prega di leggere prima dell'uso",
  en: 'Please read before using',
  tr: 'Kullanmadan once lutfen okuyun',
  fr: 'Veuillez lire avant utilisation',
  es: 'Por favor lea antes de usar',
  ru: 'Pozhalujsta, prochitajte pered ispolzovaniem',
};

interface DisclaimerScreenProps {
  onAccept: () => void;
  lang: string;
  setLang: (lang: string) => void;
}

export function DisclaimerScreen({ onAccept, lang, setLang }: DisclaimerScreenProps) {
  const title = t(lang, 'disclaimer_title');
  const items = [
    { title: t(lang, 'disclaimer_1_title'), text: t(lang, 'disclaimer_1_text'), icon: 'medical-bag' },
    { title: t(lang, 'disclaimer_2_title'), text: t(lang, 'disclaimer_2_text'), icon: 'information-outline' },
    { title: t(lang, 'disclaimer_3_title'), text: t(lang, 'disclaimer_3_text'), icon: 'alert-circle-outline' },
  ];
  const acceptBtn = t(lang, 'disclaimer_accept');

  const iconColors: Record<string, string> = {
    'medical-bag': '#D9534F',
    'information-outline': '#2C5F78',
    'alert-circle-outline': '#D9534F',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.disclaimerContainer}>
        <View style={localStyles.langGrid}>
          {LANGS.map(({ code, flag }) => (
            <TouchableOpacity
              key={code}
              testID={`lang-${code}-btn`}
              data-testid={`lang-${code}-btn`}
              style={[localStyles.langChip, lang === code && localStyles.langChipActive]}
              onPress={() => setLang(code)}
            >
              <Text style={[localStyles.langChipText, lang === code && localStyles.langChipTextActive]}>
                {flag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.disclaimerIconWrap}>
          <MaterialCommunityIcons name="shield-check" size={56} color="#4A8B71" />
        </View>
        <Text style={styles.disclaimerTitle}>{title}</Text>
        <Text style={styles.disclaimerSubtitle}>{SUBTITLE[lang] || SUBTITLE.en}</Text>

        <View style={styles.disclaimerCard}>
          {items.map((item: any, idx: number) => (
            <View key={idx} style={idx > 0 ? { marginTop: 16 } : undefined}>
              <View style={styles.disclaimerRow}>
                <MaterialCommunityIcons
                  name={(item.icon || 'information-outline') as any}
                  size={22}
                  color={iconColors[item.icon] || '#2C5F78'}
                />
                <Text style={styles.disclaimerBold}>{item.title}</Text>
              </View>
              <Text style={styles.disclaimerText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          testID="disclaimer-accept-btn"
          data-testid="disclaimer-accept-btn"
          style={styles.primaryBtn}
          activeOpacity={0.7}
          onPress={onAccept}
        >
          <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>  {acceptBtn}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  langChip: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#D4E7DC',
  },
  langChipActive: {
    backgroundColor: '#2C5F78',
    borderColor: '#2C5F78',
  },
  langChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C5F78',
  },
  langChipTextActive: {
    color: '#FFFFFF',
  },
});
