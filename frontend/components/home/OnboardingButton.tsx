import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './homeStyles';

interface OnboardingButtonProps {
  lang: string;
  refreshKey?: number;
  onPress: () => void;
  onProfilePress?: () => void;
}

export function OnboardingButton({ lang, refreshKey, onPress, onProfilePress }: OnboardingButtonProps) {
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('health_profile_id').then(val => {
      setHasProfile(!!val);
    }).catch(() => {});
  }, [refreshKey]);

  return (
    <TouchableOpacity
      testID="onboarding-btn"
      style={styles.onboardingButton}
      activeOpacity={0.7}
      onPress={hasProfile && onProfilePress ? onProfilePress : onPress}
    >
      <View style={styles.onboardingIconWrap}>
        <MaterialCommunityIcons name={hasProfile ? 'account-heart' : 'clipboard-pulse'} size={16} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.onboardingBtnTitle}>
          {hasProfile
            ? (lang === 'de' ? 'Gesundheitsprofil anzeigen' : 'Mostra profilo salute')
            : (lang === 'de' ? 'Gesundheits-Check starten' : 'Avvia check salute')}
        </Text>
        <Text style={styles.onboardingBtnSub} numberOfLines={1}>
          {hasProfile
            ? (lang === 'de' ? 'Ihre persoenliche Naehrstoff-Analyse' : 'La tua analisi nutrizionale personale')
            : (lang === 'de' ? 'Personalisierte Naehrstoff-Empfehlungen' : 'Ricevi raccomandazioni personalizzate')}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
    </TouchableOpacity>
  );
}
