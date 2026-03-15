import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  SafeAreaView, Platform, Alert, ActivityIndicator, Modal, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useLang } from '../src/LangContext';
import useSwipeBack from '../src/useSwipeBack';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SW } = Dimensions.get('window');

const UNITS = ['mg', 'ml', 'Tropfen', 'Tablette', 'Kapsel'];
const TIMINGS = [
  { key: 'morning', de: 'Morgens', it: 'Mattina', icon: 'weather-sunny' },
  { key: 'noon', de: 'Mittags', it: 'Mezzogiorno', icon: 'weather-partly-cloudy' },
  { key: 'evening', de: 'Abends', it: 'Sera', icon: 'weather-night' },
];
const FREQUENCIES = [
  { key: 'daily', de: 'Taeglich', it: 'Giornaliero' },
  { key: 'every_other_day', de: 'Jeden 2. Tag', it: 'Ogni 2 giorni' },
  { key: 'specific_days', de: 'Bestimmte Tage', it: 'Giorni specifici' },
];
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MEAL_OPTIONS = [
  { key: '', de: 'Keine Angabe', it: 'Nessuna indicazione' },
  { key: 'before_meal', de: 'Vor dem Essen', it: 'Prima del pasto' },
  { key: 'with_meal', de: 'Mit dem Essen', it: 'Durante il pasto' },
  { key: 'after_meal', de: 'Nach dem Essen', it: 'Dopo il pasto' },
  { key: 'fasting', de: 'Nuechtern', it: 'A digiuno' },
];

export default function MedicationsScreen() {
  const { lang } = useLang();
  const router = useRouter();
  const navigation = useNavigation();
  useSwipeBack(navigation);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('mg');
  const [selectedTimings, setSelectedTimings] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('daily');
  const [specificDays, setSpecificDays] = useState<string[]>([]);
  const [mealRelation, setMealRelation] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMeds = useCallback(async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    setProfileId(pid);
    if (!pid) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/api/medications/${pid}`);
      if (res.ok) {
        const d = await res.json();
        setMedications(d.medications || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMeds(); }, [loadMeds]);

  const resetForm = () => {
    setName(''); setDosage(''); setUnit('mg'); setSelectedTimings([]);
    setFrequency('daily'); setSpecificDays([]); setMealRelation(''); setNote('');
    setEditingMed(null);
  };

  const openEditForm = (med: any) => {
    setEditingMed(med);
    setName(med.name);
    setDosage(String(med.dosage));
    setUnit(med.unit);
    setSelectedTimings(med.timings || []);
    setFrequency(med.frequency || 'daily');
    setSpecificDays(med.specific_days || []);
    setMealRelation(med.meal_relation || '');
    setNote(med.note || '');
    setShowForm(true);
  };

  const saveMedication = async () => {
    if (!name.trim()) {
      Alert.alert(lang === 'de' ? 'Hinweis' : 'Avviso', lang === 'de' ? 'Bitte Medikamentennamen eingeben.' : 'Inserire il nome del farmaco.');
      return;
    }
    if (selectedTimings.length === 0) {
      Alert.alert(lang === 'de' ? 'Hinweis' : 'Avviso', lang === 'de' ? 'Bitte mindestens eine Einnahmezeit waehlen.' : 'Selezionare almeno un orario.');
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      dosage: parseFloat(dosage) || 0,
      unit,
      timings: selectedTimings,
      frequency,
      specific_days: frequency === 'specific_days' ? specificDays : null,
      meal_relation: mealRelation || null,
      note: note.trim() || null,
    };
    try {
      const url = editingMed
        ? `${API_URL}/api/medications/${profileId}/${editingMed.id}`
        : `${API_URL}/api/medications/${profileId}`;
      const res = await fetch(url, {
        method: editingMed ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        resetForm();
        loadMeds();
      }
    } catch {} finally { setSaving(false); }
  };

  const deleteMed = (med: any) => {
    Alert.alert(
      lang === 'de' ? 'Medikament loeschen' : 'Eliminare farmaco',
      lang === 'de' ? `"${med.name}" wirklich loeschen?` : `Eliminare "${med.name}"?`,
      [
        { text: lang === 'de' ? 'Abbrechen' : 'Annulla', style: 'cancel' },
        {
          text: lang === 'de' ? 'Loeschen' : 'Elimina', style: 'destructive',
          onPress: async () => {
            await fetch(`${API_URL}/api/medications/${profileId}/${med.id}`, { method: 'DELETE' });
            loadMeds();
          },
        },
      ]
    );
  };

  const toggleTiming = (key: string) => {
    setSelectedTimings(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]);
  };
  const toggleDay = (day: string) => {
    setSpecificDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const mealLabel = (key: string) => MEAL_OPTIONS.find(m => m.key === key)?.[lang === 'de' ? 'de' : 'it'] || '';
  const timingLabel = (key: string) => TIMINGS.find(t => t.key === key)?.[lang === 'de' ? 'de' : 'it'] || key;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#1E40AF', '#3B82F6', '#60A5FA']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{lang === 'de' ? 'Medikamente' : 'Farmaci'}</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowForm(true); }} style={s.addBtn} data-testid="add-medication-btn">
          <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Legal disclaimer */}
      <View style={s.disclaimer}>
        <MaterialCommunityIcons name="information-outline" size={16} color="#6B7280" />
        <Text style={s.disclaimerText}>
          {lang === 'de'
            ? 'Bitte Medikamente nur nach aerztlicher Vorgabe eintragen und einnehmen.'
            : 'Inserire e assumere farmaci solo secondo prescrizione medica.'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {medications.length === 0 ? (
          <Animated.View entering={FadeIn} style={s.empty}>
            <MaterialCommunityIcons name="pill" size={60} color="#BFDBFE" />
            <Text style={s.emptyTitle}>{lang === 'de' ? 'Keine Medikamente' : 'Nessun farmaco'}</Text>
            <Text style={s.emptyText}>
              {lang === 'de'
                ? 'Fuegen Sie Ihre Medikamente hinzu, um Einnahmezeiten zu verwalten und Erinnerungen zu erhalten.'
                : 'Aggiungete i vostri farmaci per gestire gli orari e ricevere promemoria.'}
            </Text>
          </Animated.View>
        ) : (
          medications.map((med, i) => (
            <Animated.View key={med.id} entering={FadeInDown.delay(i * 60).duration(300)} style={s.medCard}>
              <View style={s.medHeader}>
                <View style={s.medIcon}>
                  <MaterialCommunityIcons name="pill" size={20} color="#3B82F6" />
                </View>
                <View style={s.medInfo}>
                  <Text style={s.medName}>{med.name}</Text>
                  <Text style={s.medDosage}>{med.dosage} {med.unit}</Text>
                </View>
                <TouchableOpacity onPress={() => openEditForm(med)} style={s.actionBtn}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteMed(med)} style={s.actionBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <View style={s.medDetails}>
                <View style={s.medChips}>
                  {(med.timings || []).map((t: string) => (
                    <View key={t} style={s.timingChip}>
                      <MaterialCommunityIcons name={TIMINGS.find(x => x.key === t)?.icon || 'clock'} size={12} color="#3B82F6" />
                      <Text style={s.timingChipText}>{timingLabel(t)}</Text>
                    </View>
                  ))}
                </View>
                {med.meal_relation && <Text style={s.medMeal}>{mealLabel(med.meal_relation)}</Text>}
                {med.note && <Text style={s.medNote}>{med.note}</Text>}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.formContainer}>
          <View style={s.formHeader}>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
              <Text style={s.cancelText}>{lang === 'de' ? 'Abbrechen' : 'Annulla'}</Text>
            </TouchableOpacity>
            <Text style={s.formTitle}>
              {editingMed
                ? (lang === 'de' ? 'Bearbeiten' : 'Modifica')
                : (lang === 'de' ? 'Neues Medikament' : 'Nuovo farmaco')}
            </Text>
            <TouchableOpacity onPress={saveMedication} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#3B82F6" /> : (
                <Text style={s.saveText}>{lang === 'de' ? 'Speichern' : 'Salva'}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false}>
            {/* Name */}
            <Text style={s.label}>{lang === 'de' ? 'Medikamentenname' : 'Nome farmaco'} *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="z.B. Metformin" />

            {/* Dosage + Unit */}
            <Text style={s.label}>{lang === 'de' ? 'Dosierung' : 'Dosaggio'} *</Text>
            <View style={s.row}>
              <TextInput style={[s.input, { flex: 1 }]} value={dosage} onChangeText={setDosage} placeholder="500" keyboardType="numeric" />
              <View style={s.unitRow}>
                {UNITS.map(u => (
                  <TouchableOpacity key={u} style={[s.chip, unit === u && s.chipActive]} onPress={() => setUnit(u)}>
                    <Text style={[s.chipText, unit === u && s.chipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Timings */}
            <Text style={s.label}>{lang === 'de' ? 'Einnahmezeit(en)' : 'Orari'} *</Text>
            <View style={s.chipRow}>
              {TIMINGS.map(t => (
                <TouchableOpacity key={t.key} style={[s.timingBtn, selectedTimings.includes(t.key) && s.timingBtnActive]} onPress={() => toggleTiming(t.key)}>
                  <MaterialCommunityIcons name={t.icon as any} size={18} color={selectedTimings.includes(t.key) ? '#FFF' : '#6B7280'} />
                  <Text style={[s.timingBtnText, selectedTimings.includes(t.key) && s.timingBtnTextActive]}>{t[lang === 'de' ? 'de' : 'it']}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Frequency */}
            <Text style={s.label}>{lang === 'de' ? 'Haeufigkeit' : 'Frequenza'}</Text>
            <View style={s.chipRow}>
              {FREQUENCIES.map(f => (
                <TouchableOpacity key={f.key} style={[s.chip, frequency === f.key && s.chipActive]} onPress={() => setFrequency(f.key)}>
                  <Text style={[s.chipText, frequency === f.key && s.chipTextActive]}>{f[lang === 'de' ? 'de' : 'it']}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Specific days */}
            {frequency === 'specific_days' && (
              <View style={s.chipRow}>
                {WEEKDAYS.map(d => (
                  <TouchableOpacity key={d} style={[s.dayChip, specificDays.includes(d) && s.dayChipActive]} onPress={() => toggleDay(d)}>
                    <Text style={[s.dayChipText, specificDays.includes(d) && s.dayChipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Meal relation */}
            <Text style={s.label}>{lang === 'de' ? 'Mahlzeitbezug' : 'Relazione pasto'}</Text>
            <View style={s.chipRow}>
              {MEAL_OPTIONS.map(m => (
                <TouchableOpacity key={m.key} style={[s.chip, mealRelation === m.key && s.chipActive]} onPress={() => setMealRelation(m.key)}>
                  <Text style={[s.chipText, mealRelation === m.key && s.chipTextActive]}>{m[lang === 'de' ? 'de' : 'it']}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Note */}
            <Text style={s.label}>{lang === 'de' ? 'Hinweis / Notiz' : 'Nota'}</Text>
            <TextInput style={[s.input, { height: 60 }]} value={note} onChangeText={setNote} placeholder={lang === 'de' ? 'Optionale Notiz...' : 'Nota opzionale...'} multiline />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 10 : 40, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 12, padding: 10, backgroundColor: '#FEF3C7', borderRadius: 10 },
  disclaimerText: { fontSize: 11, color: '#92400E', flex: 1, lineHeight: 15 },
  list: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8, lineHeight: 18, maxWidth: 280 },
  medCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6', elevation: 2, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  medHeader: { flexDirection: 'row', alignItems: 'center' },
  medIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  medInfo: { flex: 1, marginLeft: 12 },
  medName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  medDosage: { fontSize: 13, color: '#64748B', marginTop: 2 },
  actionBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  medDetails: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  medChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  timingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  timingChipText: { fontSize: 11, fontWeight: '600', color: '#3B82F6' },
  medMeal: { fontSize: 12, color: '#64748B', marginTop: 6 },
  medNote: { fontSize: 12, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' },
  // Form
  formContainer: { flex: 1, backgroundColor: '#FFF' },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  cancelText: { fontSize: 15, color: '#6B7280' },
  formTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#3B82F6' },
  form: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 18, marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1E293B' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unitRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 2 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  chipTextActive: { color: '#FFF' },
  timingBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  timingBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  timingBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  timingBtnTextActive: { color: '#FFF' },
  dayChip: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  dayChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  dayChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  dayChipTextActive: { color: '#FFF' },
});
