import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { styles } from './homeStyles';

interface FooterDisclaimerProps {
  lang: string;
}

export function FooterDisclaimer({ lang }: FooterDisclaimerProps) {
  return (
    <View style={styles.footerWrap}>
      <MaterialCommunityIcons name="information-outline" size={14} color="#8FA39B" />
      <Text style={styles.footerText}>{t(lang, 'disclaimer_footer')}</Text>
    </View>
  );
}
