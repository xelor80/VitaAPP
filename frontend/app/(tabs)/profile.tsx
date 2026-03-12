import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLang } from '../../src/LangContext';
import { eventBus } from '../../src/eventBus';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileTab() {
  const router = useRouter();
  const { lang } = useLang();
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      if (profileId) {
        setHasProfile(true);
        const res = await fetch(`${API_URL}/api/health-profile/${profileId}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
        }
      } else {
        setHasProfile(false);
        setProfile(null);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => {
    eventBus.on('profileUpdated', loadProfile);
    return () => eventBus.off('profileUpdated', loadProfile);
  }, []);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2E7D52" /></View>;
  }

  if (!hasProfile) {
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

  const fields = [
    { icon: 'account', label: lang === 'de' ? 'Name' : 'Nome', value: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() },
    { icon: 'calendar', label: lang === 'de' ? 'Alter' : 'Eta', value: profile?.age },
    { icon: 'gender-male-female', label: lang === 'de' ? 'Geschlecht' : 'Sesso', value: profile?.gender },
    { icon: 'scale-bathroom', label: 'BMI', value: profile?.bmi ? `${profile.bmi}` : null },
    { icon: 'run', label: lang === 'de' ? 'Aktivitaet' : 'Attivita', value: profile?.activity_level },
    { icon: 'food-apple', label: lang === 'de' ? 'Ernaehrung' : 'Alimentazione', value: profile?.diet_type },
  ].filter(f => f.value);

  return (
    <View style={s.container}>
      <LinearGradient colors={['#1B6B45', '#2E9E6B', '#43C68A']} style={s.header}>
        <Text style={s.headerTitle}>{lang === 'de' ? 'Gesundheitsprofil' : 'Profilo salute'}</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            <MaterialCommunityIcons name="account" size={40} color="#2E7D52" />
          </View>
          <Text style={s.profileName}>{profile?.first_name} {profile?.last_name}</Text>
        </View>
        {fields.map((f, i) => (
          <View key={i} style={s.fieldRow}>
            <MaterialCommunityIcons name={f.icon as any} size={20} color="#6B7280" />
            <Text style={s.fieldLabel}>{f.label}</Text>
            <Text style={s.fieldValue}>{f.value}</Text>
          </View>
        ))}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.editBtn} onPress={() => router.push('/health-profile' as any)} data-testid="view-profile-btn">
            <MaterialCommunityIcons name="eye" size={18} color="#2E7D52" />
            <Text style={s.editBtnText}>{lang === 'de' ? 'Profil ansehen' : 'Vedi profilo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.editBtn, { backgroundColor: '#2E7D52' }]} onPress={() => router.push('/onboarding' as any)} data-testid="edit-profile-btn">
            <MaterialCommunityIcons name="pencil" size={18} color="#FFFFFF" />
            <Text style={[s.editBtnText, { color: '#FFFFFF' }]}>{lang === 'de' ? 'Bearbeiten' : 'Modifica'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: { padding: 20 },
  profileCard: { alignItems: 'center', marginBottom: 20 },
  avatarWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  profileName: { fontSize: 22, fontWeight: '800', color: '#1A2E35' },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 14, marginBottom: 8, gap: 12,
  },
  fieldLabel: { fontSize: 14, color: '#6B7280', flex: 1 },
  fieldValue: { fontSize: 14, fontWeight: '600', color: '#1A2E35' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#E8F5E9', paddingVertical: 14, borderRadius: 14,
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: '#2E7D52' },
});
