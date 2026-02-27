import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { styles } from './homeStyles';

interface DiaryButtonProps {
  lang: string;
  onPress: () => void;
}

export function DiaryButton({ lang, onPress }: DiaryButtonProps) {
  return (
    <TouchableOpacity
      testID="diary-btn"
      style={styles.diaryButton}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.diaryIconWrap}>
        <MaterialCommunityIcons name="book-open-variant" size={22} color="#2C5F78" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.diaryBtnTitle}>{t(lang, 'diary_btn')}</Text>
        <Text style={styles.diaryBtnSub}>
          {lang === 'de' ? 'Tracken Sie Befinden, Schlaf, Stress & mehr' : 'Monitora umore, sonno, stress e altro'}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#8FA39B" />
    </TouchableOpacity>
  );
}
