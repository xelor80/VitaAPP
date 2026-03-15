import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLang } from '../../src/LangContext';
import {
  scheduleSupplementReminders,
  sendTestNotification,
  cancelAllReminders,
  ReminderSettings,
  WeeklySchedule
} from '../../src/services/NotificationService';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const TIMING_ICONS: Record<string, { icon: string; color: string }> = {
  morning: { icon: 'weather-sunny', color: '#FF9800' },
  noon: { icon: 'weather-partly-cloudy', color: '#2E9E6B' },
  evening: { icon: 'weather-night', color: '#5C6BC0' },
};

export default function PlanScreen() {
  const { lang } = useLang();
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState({ enabled: false, morning_time: '08:00', noon_time: '12:00', evening_time: '20:00' });
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const pid = await AsyncStorage.getItem('health_profile_id');
      if (pid) {
        setProfileId(pid);
        loadPlan(pid);
        loadReminders(pid);
      } else {
        setLoading(false);
      }
    })();
  }, []);

  const loadPlan = async (pid: string) => {
    try {
      const res = await fetch(`${API_URL}/api/medications/${pid}/daily-plan?lang=${lang}`);
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
      }
    } catch (e) {
      console.error('Load plan error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async (pid: string) => {
    try {
      const res = await fetch(`${API_URL}/api/supplement-plan/${pid}/reminders`);
      if (res.ok) {
        const data = await res.json();
        if (data.enabled !== undefined) setReminders(data);
      }
      const planRes = await fetch(`${API_URL}/api/supplement-plan/${pid}`);
      if (planRes.ok) {
        const planData = await planRes.json();
        if (planData.plan?.weekly_schedule) setWeeklySchedule(planData.plan.weekly_schedule);
      }
    } catch {}
  };

  const toggleItem = async (item: any) => {
    if (!profileId) return;
    try {
      if (item.type === 'medication') {
        await fetch(`${API_URL}/api/medications/${profileId}/${item.id}/check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timing: item.timing }),
        });
      } else {
        await fetch(`${API_URL}/api/medications/${profileId}/supplement-check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplement_id: item.id, timing: item.timing }),
        });
      }
      loadPlan(profileId);
    } catch (e) {
      console.error('Toggle error:', e);
    }
  };

  const saveReminders = async () => {
    try {
      await fetch(`${API_URL}/api/supplement-plan/${profileId}/reminders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminders),
      });

      if (reminders.enabled && weeklySchedule) {
        const success = await scheduleSupplementReminders(
          reminders as ReminderSettings,
          weeklySchedule as WeeklySchedule,
          lang
        );
        if (success) {
          await sendTestNotification(lang);
          Alert.alert(
            lang === 'de' ? 'Erinnerungen aktiviert' : 'Promemoria attivati',
            lang === 'de' ? 'Sie erhalten Benachrichtigungen zu den eingestellten Zeiten.' : 'Riceverai notifiche agli orari impostati.'
          );
        } else {
          Alert.alert(
            lang === 'de' ? 'Berechtigung erforderlich' : 'Autorizzazione richiesta',
            lang === 'de' ? 'Bitte erlauben Sie Benachrichtigungen in den Einstellungen.' : 'Per favore consenti le notifiche nelle impostazioni.'
          );
        }
      } else {
        await cancelAllReminders();
      }
      setShowReminderSettings(false);
    } catch (e) {
      console.error('Save reminders error:', e);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1B6B45" />
      </View>
    );
  }

  const totalItems = plan?.total_items || 0;
  const checkedItems = plan?.checked_items || 0;
  const pct = plan?.percentage || 0;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header */}
      <LinearGradient colors={['#1B6B45', '#2E9E6B']} style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{lang === 'de' ? 'Mein Plan' : 'Il mio Piano'}</Text>
          <Text style={s.headerSubtitle}>
            {lang === 'de' ? 'Supplements & Medikamente' : 'Supplementi & Farmaci'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowReminderSettings(!showReminderSettings)}
          style={s.bellBtn}
          data-testid="reminder-toggle-btn"
        >
          <MaterialCommunityIcons
            name={reminders.enabled ? 'bell-ring' : 'bell-outline'}
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* Progress Bar */}
      {totalItems > 0 && (
        <Animated.View entering={FadeInDown.delay(100)} style={s.progressCard}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>
              {lang === 'de' ? 'Tagesfortschritt' : 'Progresso giornaliero'}
            </Text>
            <Text style={s.progressPct}>{pct}%</Text>
          </View>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.progressDetail}>
            {checkedItems}/{totalItems} {lang === 'de' ? 'eingenommen' : 'assunti'}
          </Text>
        </Animated.View>
      )}

      {/* Reminder Settings */}
      {showReminderSettings && (
        <Animated.View entering={FadeInDown.delay(150)} style={s.reminderCard}>
          <Text style={s.reminderTitle}>
            <MaterialCommunityIcons name="bell-cog-outline" size={18} color="#1B6B45" />
            {' '}{lang === 'de' ? 'Erinnerungen' : 'Promemoria'}
          </Text>

          <TouchableOpacity
            style={s.toggleRow}
            onPress={() => setReminders({ ...reminders, enabled: !reminders.enabled })}
            data-testid="reminder-enabled-toggle"
          >
            <MaterialCommunityIcons
              name={reminders.enabled ? 'toggle-switch' : 'toggle-switch-off'}
              size={44}
              color={reminders.enabled ? '#1B6B45' : '#C4CEC8'}
            />
            <Text style={[s.toggleText, { color: reminders.enabled ? '#1A2D26' : '#8FA39B' }]}>
              {reminders.enabled
                ? (lang === 'de' ? 'Push-Benachrichtigungen aktiv' : 'Notifiche push attive')
                : (lang === 'de' ? 'Push-Benachrichtigungen aus' : 'Notifiche push disattivate')}
            </Text>
          </TouchableOpacity>

          {reminders.enabled && (
            <View style={{ gap: 10, marginTop: 8 }}>
              {[
                { key: 'morning_time', icon: 'weather-sunny', label: lang === 'de' ? 'Morgens' : 'Mattina', color: '#FF9800' },
                { key: 'noon_time', icon: 'weather-partly-cloudy', label: lang === 'de' ? 'Mittags' : 'Mezzogiorno', color: '#2E9E6B' },
                { key: 'evening_time', icon: 'weather-night', label: lang === 'de' ? 'Abends' : 'Sera', color: '#5C6BC0' },
              ].map(({ key, icon, label, color }) => (
                <View key={key} style={s.timeRow}>
                  <View style={[s.timeIcon, { backgroundColor: color + '18' }]}>
                    <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                  </View>
                  <Text style={s.timeLabel}>{label}</Text>
                  <TextInput
                    style={s.timeInput}
                    value={(reminders as any)[key]}
                    onChangeText={v => setReminders({ ...reminders, [key]: v })}
                    placeholder="HH:MM"
                    placeholderTextColor="#C4CEC8"
                    data-testid={`reminder-time-${key}`}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={s.reminderBtns}>
            <TouchableOpacity style={s.testBtn} onPress={() => sendTestNotification(lang)} data-testid="test-notification-btn">
              <MaterialCommunityIcons name="bell-ring" size={16} color="#1B6B45" />
              <Text style={s.testBtnText}>{lang === 'de' ? 'Testen' : 'Prova'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={saveReminders} data-testid="save-reminders-btn">
              <LinearGradient colors={['#1B6B45', '#2E9E6B']} style={s.saveBtnGradient}>
                <MaterialCommunityIcons name="content-save" size={16} color="#FFF" />
                <Text style={s.saveBtnText}>{lang === 'de' ? 'Speichern' : 'Salva'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Daily Plan - Grouped by timing */}
      {plan?.plan?.length > 0 ? (
        plan.plan.map((group: any, gi: number) => (
          <Animated.View key={group.timing} entering={FadeInDown.delay(200 + gi * 80)} style={s.groupCard}>
            <View style={s.groupHeader}>
              <MaterialCommunityIcons
                name={(TIMING_ICONS[group.timing]?.icon || 'clock-outline') as any}
                size={22}
                color={TIMING_ICONS[group.timing]?.color || '#5C7A6F'}
              />
              <Text style={s.groupTitle}>{group.label}</Text>
              <Text style={s.groupCount}>
                {group.items.filter((i: any) => i.checked).length}/{group.items.length}
              </Text>
            </View>

            {group.items.map((item: any) => (
              <TouchableOpacity
                key={`${item.id}-${item.timing}`}
                style={[s.itemRow, item.checked && s.itemChecked]}
                onPress={() => toggleItem(item)}
                data-testid={`plan-item-${item.id}-${item.timing}`}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, item.checked && s.checkboxChecked]}>
                  {item.checked && <MaterialCommunityIcons name="check" size={14} color="#FFF" />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.itemName, item.checked && s.itemNameChecked]}>{item.name}</Text>
                    <View style={[s.typeBadge, item.type === 'medication' ? s.typeBadgeMed : s.typeBadgeSupp]}>
                      <Text style={[s.typeBadgeText, item.type === 'medication' ? s.typeBadgeTextMed : s.typeBadgeTextSupp]}>
                        {item.type === 'medication'
                          ? (lang === 'de' ? 'Med' : 'Farm')
                          : (lang === 'de' ? 'Supp' : 'Int')}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.itemDose}>{item.dosage}{item.meal_note ? ` - ${item.meal_note}` : ''}</Text>
                </View>
                {item.checked && (
                  <MaterialCommunityIcons name="check-circle" size={22} color="#22C55E" />
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        ))
      ) : (
        <View style={s.emptyCard}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#C4CEC8" />
          <Text style={s.emptyText}>
            {lang === 'de'
              ? 'Noch kein Einnahmeplan vorhanden.\nFuege Supplements oder Medikamente hinzu.'
              : 'Nessun piano ancora.\nAggiungi supplementi o farmaci.'}
          </Text>
        </View>
      )}

      {/* Nav Cards */}
      <Animated.View entering={FadeInDown.delay(400)} style={s.navSection}>
        <Text style={s.navSectionTitle}>
          {lang === 'de' ? 'Verwalten' : 'Gestisci'}
        </Text>
        <View style={s.navRow}>
          <TouchableOpacity
            style={s.navCard}
            onPress={() => router.push('/supplement-plan')}
            data-testid="nav-supplement-plan"
          >
            <LinearGradient colors={['#1B6B45', '#2E9E6B']} style={s.navCardGradient}>
              <MaterialCommunityIcons name="pill" size={28} color="#FFF" />
              <Text style={s.navCardTitle}>{lang === 'de' ? 'Supplements' : 'Supplementi'}</Text>
              <Text style={s.navCardSub}>{lang === 'de' ? 'Plan ansehen' : 'Vedi piano'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.navCard}
            onPress={() => router.push('/medications')}
            data-testid="nav-medications"
          >
            <LinearGradient colors={['#3B82F6', '#60A5FA']} style={s.navCardGradient}>
              <MaterialCommunityIcons name="medical-bag" size={28} color="#FFF" />
              <Text style={s.navCardTitle}>{lang === 'de' ? 'Medikamente' : 'Farmaci'}</Text>
              <Text style={s.navCardSub}>{lang === 'de' ? 'Verwalten' : 'Gestisci'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Disclaimer */}
      <View style={s.disclaimer}>
        <MaterialCommunityIcons name="information-outline" size={14} color="#8FA39B" />
        <Text style={s.disclaimerText}>
          {lang === 'de'
            ? 'Diese App dokumentiert nur Ihre Eingaben und ersetzt keine aerztliche Beratung.'
            : 'Questa app documenta solo i tuoi dati e non sostituisce il consulto medico.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F1' },
  content: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F1' },

  header: { padding: 20, paddingTop: 56, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 13, color: '#D1E8D5', marginTop: 2 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },

  progressCard: { margin: 16, marginBottom: 8, padding: 16, backgroundColor: '#FFF', borderRadius: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#1A2D26' },
  progressPct: { fontSize: 18, fontWeight: '800', color: '#1B6B45' },
  progressBarBg: { height: 8, backgroundColor: '#E8F0EB', borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: '#1B6B45', borderRadius: 4, minWidth: 4 },
  progressDetail: { fontSize: 12, color: '#8FA39B', marginTop: 6 },

  reminderCard: { margin: 16, marginBottom: 8, padding: 16, backgroundColor: '#FFF', borderRadius: 16 },
  reminderTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleText: { fontSize: 14, fontWeight: '500' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  timeLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A2D26' },
  timeInput: { width: 64, fontSize: 14, fontWeight: '700', color: '#1A2D26', textAlign: 'center', borderWidth: 1, borderColor: '#E0E7E3', borderRadius: 8, paddingVertical: 4 },
  reminderBtns: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' },
  testBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#1B6B45' },
  testBtnText: { fontSize: 13, fontWeight: '600', color: '#1B6B45' },
  saveBtn: { borderRadius: 10, overflow: 'hidden' },
  saveBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  groupCard: { margin: 16, marginBottom: 8, backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F8FAF9', borderBottomWidth: 1, borderBottomColor: '#E8F0EB' },
  groupTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  groupCount: { fontSize: 13, fontWeight: '600', color: '#8FA39B' },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F4F1' },
  itemChecked: { backgroundColor: '#F0FDF4' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#C4CEC8', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1A2D26' },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#8FA39B' },
  itemDose: { fontSize: 12, color: '#8FA39B', marginTop: 2 },

  typeBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  typeBadgeSupp: { backgroundColor: '#E8F5E9' },
  typeBadgeMed: { backgroundColor: '#E3F2FD' },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  typeBadgeTextSupp: { color: '#1B6B45' },
  typeBadgeTextMed: { color: '#3B82F6' },

  emptyCard: { margin: 16, padding: 40, backgroundColor: '#FFF', borderRadius: 16, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: '#8FA39B', textAlign: 'center', lineHeight: 20 },

  navSection: { margin: 16, marginTop: 8 },
  navSectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', marginBottom: 10 },
  navRow: { flexDirection: 'row', gap: 12 },
  navCard: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  navCardGradient: { padding: 18, gap: 6 },
  navCardTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  navCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },

  disclaimer: { flexDirection: 'row', gap: 6, margin: 16, marginTop: 4, padding: 12, backgroundColor: '#FFF', borderRadius: 12, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 11, color: '#8FA39B', lineHeight: 16 },
});
