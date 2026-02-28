import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { useSettings } from '../../src/SettingsContext';
import { styles } from './homeStyles';

interface DisclaimerScreenProps {
  onAccept: () => void;
  lang: string;
  setLang: (lang: string) => void;
}

export function DisclaimerScreen({ onAccept, lang, setLang }: DisclaimerScreenProps) {
  const { disclaimer } = useSettings();
  const data = lang === 'de' ? disclaimer.de : disclaimer.it;

  const title = data?.title || t(lang, 'disclaimer_title');
  const items = data?.items || [
    { title: t(lang, 'disclaimer_1_title'), text: t(lang, 'disclaimer_1_text'), icon: 'medical-bag' },
    { title: t(lang, 'disclaimer_2_title'), text: t(lang, 'disclaimer_2_text'), icon: 'information-outline' },
    { title: t(lang, 'disclaimer_3_title'), text: t(lang, 'disclaimer_3_text'), icon: 'alert-circle-outline' },
  ];
  const acceptBtn = data?.accept_button || t(lang, 'disclaimer_accept');

  const iconColors: Record<string, string> = {
    'medical-bag': '#D9534F',
    'information-outline': '#2C5F78',
    'alert-circle-outline': '#D9534F',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.disclaimerContainer}>
        <View style={styles.langSwitcher}>
          <TouchableOpacity
            testID="lang-de-btn"
            style={[styles.langBtn, lang === 'de' && styles.langBtnActive]}
            onPress={() => setLang('de')}
          >
            <Text style={[styles.langBtnText, lang === 'de' && styles.langBtnTextActive]}>DE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="lang-it-btn"
            style={[styles.langBtn, lang === 'it' && styles.langBtnActive]}
            onPress={() => setLang('it')}
          >
            <Text style={[styles.langBtnText, lang === 'it' && styles.langBtnTextActive]}>IT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.disclaimerIconWrap}>
          <MaterialCommunityIcons name="shield-check" size={56} color="#4A8B71" />
        </View>
        <Text style={styles.disclaimerTitle}>{title}</Text>
        <Text style={styles.disclaimerSubtitle}>
          {lang === 'de' ? 'Bitte lesen Sie vor der Nutzung' : 'Si prega di leggere prima dell\'uso'}
        </Text>

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
