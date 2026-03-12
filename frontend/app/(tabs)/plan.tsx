import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLang } from '../../src/LangContext';
import { eventBus } from '../../src/eventBus';

export default function PlanTab() {
  const router = useRouter();
  const { lang } = useLang();
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkProfile = async () => {
    setLoading(true);
    const profileId = await AsyncStorage.getItem('health_profile_id');
    setHasProfile(!!profileId);
    setLoading(false);
  };

  useEffect(() => { checkProfile(); }, []);
  useEffect(() => {
    eventBus.on('profileUpdated', checkProfile);
    return () => eventBus.off('profileUpdated', checkProfile);
  }, []);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2E7D52" /></View>;
  }

  if (hasProfile) {
    return (
      <View style={s.container}>
        <LinearGradient colors={['#1B6B45', '#2E9E6B', '#43C68A']} style={s.header}>
          <Text style={s.headerTitle}>{lang === 'de' ? 'Supplement Plan' : 'Piano Integratori'}</Text>
        </LinearGradient>
        <View style={s.emptyState}>
          <MaterialCommunityIcons name="pill" size={80} color="#2E7D52" />
          <Text style={s.emptyTitle}>
            {lang === 'de' ? 'Dein Supplement Plan' : 'Il tuo piano integratori'}
          </Text>
          <Text style={s.emptyText}>
            {lang === 'de'
              ? 'Oeffne deinen personalisierten Supplement-Plan mit Einnahmeempfehlungen.'
              : 'Apri il tuo piano integratori personalizzato con le raccomandazioni.'}
          </Text>
          <TouchableOpacity style={s.createBtn} onPress={() => router.push('/supplement-plan' as any)} data-testid="open-plan-btn">
            <Text style={s.createBtnText}>{lang === 'de' ? 'Plan oeffnen' : 'Apri piano'}</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#1B6B45', '#2E9E6B', '#43C68A']} style={s.header}>
        <Text style={s.headerTitle}>{lang === 'de' ? 'Supplement Plan' : 'Piano Integratori'}</Text>
      </LinearGradient>
      <View style={s.emptyState}>
        <MaterialCommunityIcons name="pill" size={80} color="#D1D5DB" />
        <Text style={s.emptyTitle}>
          {lang === 'de' ? 'Kein Plan vorhanden' : 'Nessun piano presente'}
        </Text>
        <Text style={s.emptyText}>
          {lang === 'de'
            ? 'Erstelle zuerst dein Gesundheitsprofil, um einen personalisierten Supplement-Plan zu erhalten.'
            : 'Crea prima il tuo profilo salute per ricevere un piano integratori personalizzato.'}
        </Text>
        <TouchableOpacity style={s.createBtn} onPress={() => router.push('/onboarding' as any)} data-testid="create-plan-btn">
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
