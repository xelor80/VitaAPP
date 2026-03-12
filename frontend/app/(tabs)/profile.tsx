import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLang } from '../../src/LangContext';
import { eventBus } from '../../src/eventBus';
import HealthProfileScreen from '../health-profile';

export default function ProfileTab() {
  const router = useRouter();
  const { lang } = useLang();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    const profileId = await AsyncStorage.getItem('health_profile_id');
    setHasProfile(!!profileId);
  }, []);

  useEffect(() => {
    check();
    eventBus.on('profileUpdated', check);
    return () => eventBus.off('profileUpdated', check);
  }, [check]);

  if (hasProfile === null) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2E7D52" /></View>;
  }

  // Render full health profile directly in the tab
  if (hasProfile) {
    return <HealthProfileScreen />;
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#1B6B45', '#2E9E6B', '#43C68A']} style={s.header}>
        <Text style={s.headerTitle}>{lang === 'de' ? 'Gesundheitsprofil' : 'Profilo salute'}</Text>
      </LinearGradient>
      <View style={s.emptyState}>
        <MaterialCommunityIcons name="account-heart-outline" size={80} color="#D1D5DB" />
        <Text style={s.emptyTitle}>
          {lang === 'de' ? 'Kein Profil vorhanden' : 'Nessun profilo presente'}
        </Text>
        <Text style={s.emptyText}>
          {lang === 'de'
            ? 'Erstelle dein Gesundheitsprofil fuer personalisierte Empfehlungen.'
            : 'Crea il tuo profilo salute per raccomandazioni personalizzate.'}
        </Text>
        <TouchableOpacity style={s.createBtn} onPress={() => router.push('/onboarding' as any)} data-testid="create-profile-btn">
          <Text style={s.createBtnText}>{lang === 'de' ? 'Profil erstellen' : 'Crea profilo'}</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A2E35', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2E7D52', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, marginTop: 24,
  },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
