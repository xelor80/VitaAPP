import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { styles } from './homeStyles';

interface DisclaimerScreenProps {
  onAccept: () => void;
  lang: string;
  setLang: (lang: string) => void;
}

export function DisclaimerScreen({ onAccept, lang, setLang }: DisclaimerScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.disclaimerContainer}>
        {/* Language Switcher */}
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
        <Text style={styles.disclaimerTitle}>{t(lang, 'disclaimer_title')}</Text>
        <Text style={styles.disclaimerSubtitle}>
          {lang === 'de' ? 'Bitte lesen Sie vor der Nutzung' : 'Si prega di leggere prima dell\'uso'}
        </Text>

        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerRow}>
            <MaterialCommunityIcons name="medical-bag" size={22} color="#D9534F" />
            <Text style={styles.disclaimerBold}>{t(lang, 'disclaimer_1_title')}</Text>
          </View>
          <Text style={styles.disclaimerText}>{t(lang, 'disclaimer_1_text')}</Text>

          <View style={[styles.disclaimerRow, { marginTop: 16 }]}>
            <MaterialCommunityIcons name="information-outline" size={22} color="#2C5F78" />
            <Text style={styles.disclaimerBold}>{t(lang, 'disclaimer_2_title')}</Text>
          </View>
          <Text style={styles.disclaimerText}>{t(lang, 'disclaimer_2_text')}</Text>

          <View style={[styles.disclaimerRow, { marginTop: 16 }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#D9534F" />
            <Text style={styles.disclaimerBold}>{t(lang, 'disclaimer_3_title')}</Text>
          </View>
          <Text style={styles.disclaimerText}>{t(lang, 'disclaimer_3_text')}</Text>
        </View>

        <TouchableOpacity
          testID="disclaimer-accept-btn"
          style={styles.primaryBtn}
          activeOpacity={0.7}
          onPress={onAccept}
        >
          <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>  {t(lang, 'disclaimer_accept')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
