import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLang } from '../../src/LangContext';
import { tx } from '../../src/i18n';
import {
  scheduleCombinedReminders,
  sendTestNotification,
  cancelAllReminders,
  ReminderSettings,
  CombinedSchedule,
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
    } catch {}
  };

  // Build combined schedule from daily plan data
  const buildCombinedSchedule = (): CombinedSchedule => {
    const combined: CombinedSchedule = { morning: [], noon: [], evening: [] };
    if (!plan?.plan) return combined;
    for (const group of plan.plan) {
      const key = group.timing as keyof CombinedSchedule;
      if (combined[key]) {
        for (const item of group.items) {
          combined[key].push({ name: item.name, type: item.type });
        }
      }
    }
    return combined;
  };

  const toggleItem = async (item: any) => {
    if (!profileId || !plan) return;

    // Optimistic UI: Update local state immediately
    const updatedPlan = {
      ...plan,
      plan: plan.plan.map((group: any) => ({
        ...group,
        items: group.items.map((it: any) =>
          it.id === item.id && it.timing === item.timing
            ? { ...it, taken: !it.taken }
            : it
        ),
      })),
    };
    setPlan(updatedPlan);

    // Fire API call in background (don't await)
    try {
      if (item.type === 'medication') {
        fetch(`${API_URL}/api/medications/${profileId}/${item.id}/check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timing: item.timing }),
        }).catch(() => {});
      } else {
        fetch(`${API_URL}/api/medications/${profileId}/supplement-check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplement_id: item.id, timing: item.timing }),
        }).catch(() => {});
      }
    } catch {}
  };

  const saveReminders = async () => {
    try {
      await fetch(`${API_URL}/api/supplement-plan/${profileId}/reminders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminders),
      });

      if (reminders.enabled) {
        const combined = buildCombinedSchedule();
        const hasItems = combined.morning.length > 0 || combined.noon.length > 0 || combined.evening.length > 0;
        if (hasItems) {
          const success = await scheduleCombinedReminders(
            reminders as ReminderSettings,
            combined,
            lang
          );
          if (success) {
            await sendTestNotification(lang);
            Alert.alert(
              tx(lang, { de: 'Erinnerungen aktiviert', it: 'Promemoria attivati', en: 'Reminders activated', tr: 'Hatirlatmalar etkinlestirildi', fr: 'Rappels actives', es: 'Recordatorios activados', ru: 'Напоминания aktivirovany' }),
              tx(lang, { de: 'Sie erhalten Benachrichtigungen fuer Supplements und Medikamente.', it: 'Riceverai notifiche per supplementi e farmaci.', en: 'You will receive notifications for supplements and medications.', tr: 'Takviyeler ve ilaclar icin bildirim alacaksiniz.', fr: 'Vous recevrez des notifications pour les supplements et medicaments.', es: 'Recibira notificaciones para suplementos y medicamentos.', ru: 'Вы будете получать уведомления о добавках и лекарствах.' })
            );
          } else {
            Alert.alert(
              tx(lang, { de: 'Berechtigung erforderlich', it: 'Autorizzazione richiesta', en: 'Permission required', tr: 'Izin gerekli', fr: 'Autorisation requise', es: 'Permiso requerido', ru: 'Требуется разрешение' }),
              tx(lang, { de: 'Bitte erlauben Sie Benachrichtigungen in den Einstellungen.', it: 'Consenti le notifiche nelle impostazioni.', en: 'Please allow notifications in settings.', tr: 'Lutfen ayarlarda bildirimlere izin verin.', fr: 'Veuillez autoriser les notifications dans les parametres.', es: 'Por favor permita las notificaciones en la configuracion.', ru: 'Пожалуйста, разрешите уведомления в настройках.' })
            );
          }
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
          <Text style={s.headerTitle}>{tx(lang, { de: 'Mein Plan', it: 'Il mio Piano', en: 'My Plan', tr: 'Planim', fr: 'Mon Plan', es: 'Mi Plan', ru: 'Мой План' })}</Text>
          <Text style={s.headerSubtitle}>
            {tx(lang, { de: 'Supplements & Medikamente', it: 'Supplementi & Farmaci', en: 'Supplements & Medications', tr: 'Takviyeler ve Ilaclar', fr: 'Supplements & Medicaments', es: 'Suplementos y Medicamentos', ru: 'Добavki i Лекarstva' })}
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

      {/* Nav Cards - ganz oben */}
      <Animated.View entering={FadeInDown.delay(100)} style={s.navSection}>
        <Text style={s.navSectionTitle}>
          {tx(lang, { de: 'Verwalten', it: 'Gestisci', en: 'Manage', tr: 'Yonet', fr: 'Gerer', es: 'Gestionar', ru: 'Управление' })}
        </Text>
        <View style={s.navRow}>
          <TouchableOpacity
            style={s.navCard}
            onPress={() => router.push('/supplement-plan')}
            data-testid="nav-supplement-plan"
          >
            <LinearGradient colors={['#1B6B45', '#2E9E6B']} style={s.navCardGradient}>
              <MaterialCommunityIcons name="pill" size={28} color="#FFF" />
              <Text style={s.navCardTitle}>{tx(lang, { de: 'Supplements', it: 'Supplementi', en: 'Supplements', tr: 'Takviyeler', fr: 'Supplements', es: 'Suplementos', ru: 'Добavki' })}</Text>
              <Text style={s.navCardSub}>{tx(lang, { de: 'Plan ansehen', it: 'Vedi piano', en: 'View plan', tr: 'Plani gor', fr: 'Voir le plan', es: 'Ver plan', ru: 'Смотреть план' })}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.navCard}
            onPress={() => router.push('/medications')}
            data-testid="nav-medications"
          >
            <LinearGradient colors={['#3B82F6', '#60A5FA']} style={s.navCardGradient}>
              <MaterialCommunityIcons name="medical-bag" size={28} color="#FFF" />
              <Text style={s.navCardTitle}>{tx(lang, { de: 'Medikamente', it: 'Farmaci', en: 'Medications', tr: 'Ilaclar', fr: 'Medicaments', es: 'Medicamentos', ru: 'Лекarstva' })}</Text>
              <Text style={s.navCardSub}>{tx(lang, { de: 'Verwalten', it: 'Gestisci', en: 'Manage', tr: 'Yonet', fr: 'Gerer', es: 'Gestionar', ru: 'Управление' })}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Progress Bar */}
      {totalItems > 0 && (
        <Animated.View entering={FadeInDown.delay(150)} style={s.progressCard}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>
              {tx(lang, { de: 'Tagesfortschritt', it: 'Progresso giornaliero', en: 'Daily progress', tr: 'Gunluk ilerleme', fr: 'Progres quotidien', es: 'Progreso diario', ru: 'Дневной прогресс' })}
            </Text>
            <Text style={s.progressPct}>{pct}%</Text>
          </View>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.progressDetail}>
            {checkedItems}/{totalItems} {tx(lang, { de: 'eingenommen', it: 'assunti', en: 'taken', tr: 'alinan', fr: 'pris', es: 'tomados', ru: 'принято' })}
          </Text>
        </Animated.View>
      )}

      {/* Reminder Settings */}
      {showReminderSettings && (
        <Animated.View entering={FadeInDown.delay(150)} style={s.reminderCard}>
          <Text style={s.reminderTitle}>
            <MaterialCommunityIcons name="bell-cog-outline" size={18} color="#1B6B45" />
            {' '}{tx(lang, { de: 'Erinnerungen', it: 'Promemoria', en: 'Reminders', tr: 'Hatirlatmalar', fr: 'Rappels', es: 'Recordatorios', ru: 'Напоминания' })}
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
                ? (tx(lang, { de: 'Push-Benachrichtigungen aktiv', it: 'Notifiche push attive', en: 'Push notifications active', tr: 'Bildirimler aktif', fr: 'Notifications push actives', es: 'Notificaciones push activas', ru: 'Push-уведомления активны' }))
                : (tx(lang, { de: 'Push-Benachrichtigungen aus', it: 'Notifiche push disattivate', en: 'Push notifications off', tr: 'Bildirimler kapali', fr: 'Notifications push desactivees', es: 'Notificaciones push desactivadas', ru: 'Push-уведомления отключены' }))}
            </Text>
          </TouchableOpacity>

          {reminders.enabled && (
            <View style={{ gap: 10, marginTop: 8 }}>
              {[
                { key: 'morning_time', timing: 'morning', icon: 'weather-sunny', label: tx(lang, { de: 'Morgens', it: 'Mattina', en: 'Morning', tr: 'Sabah', fr: 'Matin', es: 'Manana', ru: 'Утро' }), color: '#FF9800' },
                { key: 'noon_time', timing: 'noon', icon: 'weather-partly-cloudy', label: tx(lang, { de: 'Mittags', it: 'Mezzogiorno', en: 'Noon', tr: 'Ogle', fr: 'Midi', es: 'Mediodia', ru: 'Полдень' }), color: '#2E9E6B' },
                { key: 'evening_time', timing: 'evening', icon: 'weather-night', label: tx(lang, { de: 'Abends', it: 'Sera', en: 'Evening', tr: 'Aksam', fr: 'Soir', es: 'Noche', ru: 'Вечер' }), color: '#5C6BC0' },
              ].map(({ key, timing, icon, label, color }) => {
                const combined = buildCombinedSchedule();
                const items = combined[timing as keyof CombinedSchedule] || [];
                const suppCount = items.filter(i => i.type === 'supplement').length;
                const medCount = items.filter(i => i.type === 'medication').length;
                return (
                  <View key={key}>
                    <View style={s.timeRow}>
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
                    {items.length > 0 && (
                      <View style={s.previewRow}>
                        {suppCount > 0 && (
                          <View style={[s.previewBadge, { backgroundColor: '#E8F5E9' }]}>
                            <MaterialCommunityIcons name="pill" size={12} color="#1B6B45" />
                            <Text style={[s.previewBadgeText, { color: '#1B6B45' }]}>
                              {suppCount} {tx(lang, { de: 'Supp.', it: 'Int.', en: 'Supp.', tr: 'Tak.', fr: 'Supp.', es: 'Supl.', ru: 'Доб.' })}
                            </Text>
                          </View>
                        )}
                        {medCount > 0 && (
                          <View style={[s.previewBadge, { backgroundColor: '#E3F2FD' }]}>
                            <MaterialCommunityIcons name="medical-bag" size={12} color="#3B82F6" />
                            <Text style={[s.previewBadgeText, { color: '#3B82F6' }]}>
                              {medCount} {tx(lang, { de: 'Med.', it: 'Farm.', en: 'Med.', tr: 'Ilac.', fr: 'Med.', es: 'Med.', ru: 'Лек.' })}
                            </Text>
                          </View>
                        )}
                        <Text style={s.previewNames} numberOfLines={1}>
                          {items.map(i => i.name).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={s.reminderBtns}>
            <TouchableOpacity style={s.testBtn} onPress={() => sendTestNotification(lang)} data-testid="test-notification-btn">
              <MaterialCommunityIcons name="bell-ring" size={16} color="#1B6B45" />
              <Text style={s.testBtnText}>{tx(lang, { de: 'Testen', it: 'Prova', en: 'Test', tr: 'Test', fr: 'Tester', es: 'Probar', ru: 'Тест' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={saveReminders} data-testid="save-reminders-btn">
              <LinearGradient colors={['#1B6B45', '#2E9E6B']} style={s.saveBtnGradient}>
                <MaterialCommunityIcons name="content-save" size={16} color="#FFF" />
                <Text style={s.saveBtnText}>{tx(lang, { de: 'Speichern', it: 'Salva', en: 'Save', tr: 'Kaydet', fr: 'Enregistrer', es: 'Guardar', ru: 'Сохранить' })}</Text>
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
                          ? (tx(lang, { de: 'Med', it: 'Farm', en: 'Med', tr: 'Ilac', fr: 'Med', es: 'Med', ru: 'Лек' }))
                          : (tx(lang, { de: 'Supp', it: 'Int', en: 'Supp', tr: 'Tak', fr: 'Supp', es: 'Supl', ru: 'Доб' }))}
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
            {tx(lang, { de: 'Noch kein Einnahmeplan vorhanden.\nFuege Supplements oder Medikamente hinzu.', it: 'Nessun piano ancora.\nAggiungi supplementi o farmaci.', en: 'No intake plan yet.\nAdd supplements or medications.', tr: 'Henuz alim plani yok.\nTakviye veya ilac ekleyin.', fr: 'Pas encore de plan.\nAjoutez des supplements ou medicaments.', es: 'Aun no hay plan.\nAgregue suplementos o medicamentos.', ru: 'Плана приёма пока нет.\nДобавьте добавки или лекарства.' })}
          </Text>
        </View>
      )}

      {/* Disclaimer */}
      <View style={s.disclaimer}>
        <MaterialCommunityIcons name="information-outline" size={14} color="#8FA39B" />
        <Text style={s.disclaimerText}>
          {tx(lang, { de: 'Diese App dokumentiert nur Ihre Eingaben und ersetzt keine aerztliche Beratung.', it: 'Questa app documenta solo i tuoi dati e non sostituisce il consulto medico.', en: 'This app only documents your inputs and does not replace medical advice.', tr: 'Bu uygulama yalnizca girdiginiz verileri kaydeder ve tibbi tavsiyenin yerini almaz.', fr: 'Cette application ne fait que documenter vos saisies et ne remplace pas un avis medical.', es: 'Esta aplicacion solo documenta sus datos y no reemplaza el consejo medico.', ru: 'Это приложение только документирует ваши данные и не заменяет медицинскую консультацию.' })}
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
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginLeft: 46, flexWrap: 'wrap' },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  previewBadgeText: { fontSize: 10, fontWeight: '700' },
  previewNames: { fontSize: 11, color: '#8FA39B', flex: 1 },
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

  rewardToast: {
    position: 'absolute', top: 50, left: 20, right: 20, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1F2937', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  rewardToastText: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
});
