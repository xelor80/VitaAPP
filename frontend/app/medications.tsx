import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  SafeAreaView, Platform, Alert, ActivityIndicator, Modal, Dimensions, Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useLang } from '../src/LangContext';
import { tx } from '../src/i18n';
import { scheduleCombinedReminders, sendTestNotification, cancelAllReminders } from '../src/services/NotificationService';

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

  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [morningTime, setMorningTime] = useState('08:00');
  const [noonTime, setNoonTime] = useState('12:00');
  const [eveningTime, setEveningTime] = useState('20:00');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderDirty, setReminderDirty] = useState(false);

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

  // Load reminder settings
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/medications/${profileId}/reminders`);
        if (res.ok) {
          const d = await res.json();
          setReminderEnabled(d.enabled || false);
          setMorningTime(d.morning_time || '08:00');
          setNoonTime(d.noon_time || '12:00');
          setEveningTime(d.evening_time || '20:00');
        }
      } catch {}
    })();
  }, [profileId]);

  const saveReminders = async () => {
    if (!profileId) return;
    setReminderSaving(true);
    try {
      const settings = { enabled: reminderEnabled, morning_time: morningTime, noon_time: noonTime, evening_time: eveningTime };
      await fetch(`${API_URL}/api/medications/${profileId}/reminders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (reminderEnabled) {
        // Build combined schedule from medications
        const combined: { morning: any[]; noon: any[]; evening: any[] } = { morning: [], noon: [], evening: [] };
        for (const med of medications) {
          for (const timing of med.timings || []) {
            if (combined[timing as keyof typeof combined]) {
              combined[timing as keyof typeof combined].push({ name: `${med.name} (${med.dosage} ${med.unit})`, type: 'medication' as const });
            }
          }
        }
        await scheduleCombinedReminders(
          { enabled: true, morning_time: morningTime, noon_time: noonTime, evening_time: eveningTime },
          combined,
          lang
        );
      } else {
        await cancelAllReminders();
      }
      setReminderDirty(false);
    } catch {}
    setReminderSaving(false);
  };

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
      Alert.alert(tx(lang, { de: 'Hinweis', it: 'Avviso', en: 'Notice', tr: 'Uyari', fr: 'Avis', es: 'Aviso', ru: 'Уведомление' }), tx(lang, { de: 'Bitte Medikamentennamen eingeben.', it: 'Inserire il nome del farmaco.', en: 'Please enter medication name.', tr: 'Lutfen ilac adini girin.', fr: 'Veuillez entrer le nom du medicament.', es: 'Por favor ingrese el nombre del medicamento.', ru: 'Пожалуйста, введите название лекарства.' }));
      return;
    }
    if (selectedTimings.length === 0) {
      Alert.alert(tx(lang, { de: 'Hinweis', it: 'Avviso', en: 'Notice', tr: 'Uyari', fr: 'Avis', es: 'Aviso', ru: 'Уведомление' }), tx(lang, { de: 'Bitte mindestens eine Einnahmezeit waehlen.', it: 'Selezionare almeno un orario di assunzione.', en: 'Please select at least one intake time.', tr: 'Lutfen en az bir alim zamani secin.', fr: 'Veuillez selectionner au moins une heure de prise.', es: 'Por favor seleccione al menos una hora de toma.', ru: 'Пожалуйста, выберите хотя бы одно время приема.' }));
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
      tx(lang, { de: 'Medikament loeschen', it: 'Elimina farmaco', en: 'Delete medication', tr: 'Ilaci sil', fr: 'Supprimer le medicament', es: 'Eliminar medicamento', ru: 'Удалить lekarstvo' }),
      tx(lang, { de: `"${med.name}" wirklich loeschen?`, it: `Eliminare "${med.name}"?`, en: `"${med.name}" wirklich loeschen?` }),
      [
        { text: tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel', tr: 'Iptal', fr: 'Annuler', es: 'Cancelar', ru: 'Отмена' }), style: 'cancel' },
        {
          text: tx(lang, { de: 'Loeschen', it: 'Elimina', en: 'Delete', tr: 'Sil', fr: 'Supprimer', es: 'Eliminar', ru: 'Удалить' }), style: 'destructive',
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

  const mealLabel = (key: string) => MEAL_OPTIONS.find(m => m.key === key)?.[tx(lang, { de: 'de', it: 'de', en: 'en', tr: 'tr', fr: 'fr', es: 'es', ru: 'ru' })] || '';
  const timingLabel = (key: string) => TIMINGS.find(t => t.key === key)?.[tx(lang, { de: 'de', it: 'de', en: 'en', tr: 'tr', fr: 'fr', es: 'es', ru: 'ru' })] || key;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#1E40AF', '#3B82F6', '#60A5FA']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{tx(lang, { de: 'Medikamente', it: 'Farmaci', en: 'Medications', tr: 'Ilaclar', fr: 'Medicaments', es: 'Medicamentos', ru: 'Лекarstva' })}</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowForm(true); }} style={s.addBtn} testID="add-medication-btn">
          <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Legal disclaimer */}
      <View style={s.disclaimer}>
        <MaterialCommunityIcons name="information-outline" size={16} color="#6B7280" />
        <Text style={s.disclaimerText}>
          {tx(lang, { de: 'Bitte Medikamente nur nach aerztlicher Vorgabe eintragen und einnehmen.', it: 'Inserire e assumere farmaci solo secondo prescrizione medica.', en: 'Please only add and take medications as prescribed by your doctor.', tr: 'Lutfen ilaci yalnizca doktor tavsiyesine gore girin ve kullanin.', fr: 'Veuillez entrer et prendre les medicaments uniquement selon les prescriptions medicales.', es: 'Por favor ingrese y tome medicamentos solo segun prescripcion medica.', ru: 'Пожалуйста, вносите и принимайте лекарства только по назначению врача.' })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {medications.length === 0 ? (
          <Animated.View entering={FadeIn} style={s.empty}>
            <MaterialCommunityIcons name="pill" size={60} color="#BFDBFE" />
            <Text style={s.emptyTitle}>{tx(lang, { de: 'Keine Medikamente', it: 'Nessun farmaco', en: 'No medications', tr: 'Ilac yok', fr: 'Aucun medicament', es: 'Sin medicamentos', ru: 'Нет лекарств' })}</Text>
            <Text style={s.emptyText}>
              {tx(lang, { de: 'Fuegen Sie Ihre Medikamente hinzu, um Einnahmezeiten zu verwalten und Erinnerungen zu erhalten.', it: 'Aggiungi i tuoi farmaci per gestire gli orari e ricevere promemoria.', en: 'Add your medications to manage intake times and receive reminders.', tr: 'Alim zamanlarini yonetmek ve hatirlatma almak icin ilaclarinizi ekleyin.', fr: 'Ajoutez vos medicaments pour gerer les horaires et recevoir des rappels.', es: 'Agregue sus medicamentos para gestionar horarios y recibir recordatorios.', ru: 'Добавьте свои лекарства для управления временем приёма и получения напоминаний.' })}
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

        {/* VERO Medication Reminders */}
        {medications.length > 0 && (
          <View style={s.reminderWrap} testID="medication-reminder-section">
            <View style={s.reminderHeader}>
              <View style={s.reminderIconWrap}>
                <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.reminderTitle}>
                  {tx(lang, { de: 'VERO Erinnerungen', it: 'Promemoria VERO', en: 'VERO Reminders' })}
                </Text>
                <Text style={s.reminderSub}>
                  {tx(lang, { de: 'Nie wieder eine Einnahme vergessen', it: 'Non dimenticare mai una dose', en: 'Never miss a dose' })}
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={(v) => { setReminderEnabled(v); setReminderDirty(true); }}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={reminderEnabled ? '#3B82F6' : '#9CA3AF'}
                testID="medication-reminder-toggle"
              />
            </View>

            {reminderEnabled && (
              <Animated.View entering={FadeIn.duration(300)}>
                {[
                  { key: 'morning', label: tx(lang, { de: 'Morgens', it: 'Mattina', en: 'Morning' }), icon: 'weather-sunny' as const, color: '#F59E0B', value: morningTime, setter: setMorningTime },
                  { key: 'noon', label: tx(lang, { de: 'Mittags', it: 'Mezzogiorno', en: 'Noon' }), icon: 'weather-partly-cloudy' as const, color: '#F97316', value: noonTime, setter: setNoonTime },
                  { key: 'evening', label: tx(lang, { de: 'Abends', it: 'Sera', en: 'Evening' }), icon: 'weather-night' as const, color: '#6366F1', value: eveningTime, setter: setEveningTime },
                ].filter(t => medications.some(m => (m.timings || []).includes(t.key))).map(t => (
                  <View key={t.key} style={s.timeRow}>
                    <MaterialCommunityIcons name={t.icon} size={18} color={t.color} />
                    <Text style={s.timeLabel}>{t.label}</Text>
                    <TextInput
                      style={s.timeInput}
                      value={t.value}
                      onChangeText={(v) => { t.setter(v); setReminderDirty(true); }}
                      placeholder="HH:MM"
                      maxLength={5}
                      testID={`reminder-time-${t.key}`}
                    />
                    <Text style={s.timeMeds}>
                      {medications.filter(m => (m.timings || []).includes(t.key)).map(m => m.name).join(', ')}
                    </Text>
                  </View>
                ))}

                <View style={s.reminderActions}>
                  <TouchableOpacity
                    style={[s.saveReminderBtn, !reminderDirty && { opacity: 0.5 }]}
                    onPress={saveReminders}
                    disabled={reminderSaving}
                    testID="save-medication-reminders-btn"
                  >
                    {reminderSaving ? <ActivityIndicator size="small" color="#FFF" /> : (
                      <>
                        <MaterialCommunityIcons name="content-save-outline" size={16} color="#FFF" />
                        <Text style={s.saveReminderBtnText}>
                          {tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save' })}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.testReminderBtn}
                    onPress={() => sendTestNotification(lang)}
                    testID="test-medication-reminder-btn"
                  >
                    <MaterialCommunityIcons name="bell-ring" size={16} color="#3B82F6" />
                    <Text style={s.testReminderBtnText}>
                      {tx(lang, { de: 'Testen', it: 'Test', en: 'Test' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.formContainer}>
          <View style={s.formHeader}>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
              <Text style={s.cancelText}>{tx(lang, { de: 'Abbrechen', it: 'Annulla', en: 'Cancel', tr: 'Iptal', fr: 'Annuler', es: 'Cancelar', ru: 'Отмена' })}</Text>
            </TouchableOpacity>
            <Text style={s.formTitle}>
              {editingMed
                ? (tx(lang, { de: 'Bearbeiten', it: 'Modifica', en: 'Edit', tr: 'Duzenle', fr: 'Modifier', es: 'Editar', ru: 'Редактировать' }))
                : (tx(lang, { de: 'Neues Medikament', it: 'Nuovo farmaco', en: 'New medication', tr: 'Yeni ilac', fr: 'Nouveau medicament', es: 'Nuevo medicamento', ru: 'Новое лекарство' }))}
            </Text>
            <TouchableOpacity onPress={saveMedication} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#3B82F6" /> : (
                <Text style={s.saveText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save', tr: 'Kaydet', fr: 'Enregistrer', es: 'Guardar', ru: 'Сохранить' })}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false}>
            {/* Name */}
            <Text style={s.label}>{tx(lang, { de: 'Medikamentenname', it: 'Nome farmaco', en: 'Medication name', tr: 'Ilac adi', fr: 'Nom du medicament', es: 'Nombre del medicamento', ru: 'Название лекарства' })} *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="z.B. Metformin" />

            {/* Dosage + Unit */}
            <Text style={s.label}>{tx(lang, { de: 'Dosierung', it: 'Dosaggio', en: 'Dosage', tr: 'Dozaj', fr: 'Dosage', es: 'Dosis', ru: 'Дозировка' })} *</Text>
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
            <Text style={s.label}>{tx(lang, { de: 'Einnahmezeit(en)', it: 'Orario/i di assunzione', en: 'Intake time(s)', tr: 'Alim zamani/lari', fr: 'Heure(s) de prise', es: 'Hora(s) de toma', ru: 'Время приема' })} *</Text>
            <View style={s.chipRow}>
              {TIMINGS.map(t => (
                <TouchableOpacity key={t.key} style={[s.timingBtn, selectedTimings.includes(t.key) && s.timingBtnActive]} onPress={() => toggleTiming(t.key)}>
                  <MaterialCommunityIcons name={t.icon as any} size={18} color={selectedTimings.includes(t.key) ? '#FFF' : '#6B7280'} />
                  <Text style={[s.timingBtnText, selectedTimings.includes(t.key) && s.timingBtnTextActive]}>{t[tx(lang, { de: 'de', it: 'de', en: 'en', tr: 'tr', fr: 'fr', es: 'es', ru: 'ru' })]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Frequency */}
            <Text style={s.label}>{tx(lang, { de: 'Haeufigkeit', it: 'Frequenza', en: 'Frequency', tr: 'Siklik', fr: 'Frequence', es: 'Frecuencia', ru: 'Частота' })}</Text>
            <View style={s.chipRow}>
              {FREQUENCIES.map(f => (
                <TouchableOpacity key={f.key} style={[s.chip, frequency === f.key && s.chipActive]} onPress={() => setFrequency(f.key)}>
                  <Text style={[s.chipText, frequency === f.key && s.chipTextActive]}>{f[tx(lang, { de: 'de', it: 'de', en: 'en', tr: 'tr', fr: 'fr', es: 'es', ru: 'ru' })]}</Text>
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
            <Text style={s.label}>{tx(lang, { de: 'Mahlzeitbezug', it: 'Relazione pasto', en: 'Meal relation', tr: 'Ogun iliskisi', fr: 'Relation repas', es: 'Relacion con comida', ru: 'Отношение к еде' })}</Text>
            <View style={s.chipRow}>
              {MEAL_OPTIONS.map(m => (
                <TouchableOpacity key={m.key} style={[s.chip, mealRelation === m.key && s.chipActive]} onPress={() => setMealRelation(m.key)}>
                  <Text style={[s.chipText, mealRelation === m.key && s.chipTextActive]}>{m[tx(lang, { de: 'de', it: 'de', en: 'en', tr: 'tr', fr: 'fr', es: 'es', ru: 'ru' })]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Note */}
            <Text style={s.label}>{tx(lang, { de: 'Hinweis / Notiz', it: 'Nota', en: 'Note', tr: 'Not', fr: 'Note', es: 'Nota', ru: 'Заметка' })}</Text>
            <TextInput style={[s.input, { height: 60 }]} value={note} onChangeText={setNote} placeholder={tx(lang, { de: 'Optionale Notiz...', it: 'Nota opzionale...', en: 'Optional note...', tr: 'Istege bagli not...', fr: 'Note optionnelle...', es: 'Nota opcional...', ru: 'Необязательная заметка...' })} multiline />
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
  // Reminders
  reminderWrap: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#6366F1',
    elevation: 2, shadowColor: '#1E40AF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
  },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },
  reminderTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  reminderSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginTop: 12,
  },
  timeLabel: { fontSize: 13, fontWeight: '600', color: '#374151', width: 60 },
  timeInput: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontWeight: '600', width: 60, textAlign: 'center',
  },
  timeMeds: { flex: 1, fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },
  reminderActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  saveReminderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 12,
  },
  saveReminderBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  testReminderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#3B82F6', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
  },
  testReminderBtnText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
});
