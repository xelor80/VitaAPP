import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SupplementItem {
  id: string;
  name: string;
  dosage: string;
}

interface DailyTask {
  id: string;
  type: string;
  icon: string;
  title: string;
  reason: string;
  progress: number | null;
  progress_label: string | null;
  status: string;
  cta_label: string;
  cta_route: string;
  items?: SupplementItem[];
  timing?: string;
}

interface Props {
  lang: string;
  onNavigate: (route: string) => void;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  urgent: { color: '#D97706', bg: '#FFFBEB' },
  pending: { color: '#D97706', bg: '#FFFBEB' },
  warning: { color: '#DC2626', bg: '#FEF2F2' },
  info: { color: '#2563EB', bg: '#EFF6FF' },
  progress: { color: '#059669', bg: '#ECFDF5' },
};

function getSeverityColor(val: number): string {
  if (val <= 3) return '#22C55E';
  if (val <= 6) return '#F59E0B';
  return '#EF4444';
}

export function DailyTasks({ lang, onNavigate }: Props) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [symptomRating, setSymptomRating] = useState(5);
  const [saving, setSaving] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => { loadTasks(); }, [lang]);

  const loadTasks = async () => {
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      if (!profileId) { setLoading(false); return; }
      const res = await fetch(`${API_URL}/api/daily-tasks/${profileId}?lang=${lang}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setFirstName(data.first_name || null);
        setCheckedItems({});
        setCompletedTasks(new Set());
      }
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const saveSupplements = async (task: DailyTask) => {
    const profileId = await AsyncStorage.getItem('health_profile_id');
    if (!profileId) return;
    setSaving(true);
    try {
      const selectedIds = (task.items || [])
        .filter(i => checkedItems[i.id])
        .map(i => i.id);
      if (selectedIds.length === 0) return;

      const res = await fetch(`${API_URL}/api/daily-tasks/complete-supplements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          supplement_ids: selectedIds,
          timing: task.timing || '',
        }),
      });
      if (res.ok) {
        setCompletedTasks(prev => new Set(prev).add(task.id));
        setExpandedId(null);
        // Refresh after short delay
        setTimeout(loadTasks, 800);
      }
    } catch (e) { /* silent */ }
    finally { setSaving(false); }
  };

  const saveSymptomCheck = async () => {
    const profileId = await AsyncStorage.getItem('health_profile_id');
    if (!profileId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/daily-tasks/complete-symptom-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, overall: symptomRating }),
      });
      if (res.ok) {
        setCompletedTasks(prev => new Set(prev).add('symptom_check'));
        setExpandedId(null);
        setTimeout(loadTasks, 800);
      }
    } catch (e) { /* silent */ }
    finally { setSaving(false); }
  };

  if (loading || tasks.length === 0) return null;

  const visibleTasks = tasks.filter(t => !completedTasks.has(t.id));
  if (visibleTasks.length === 0) {
    return (
      <View style={s.wrap}>
        <View style={s.headerRow}>
          <MaterialCommunityIcons name="star-four-points" size={18} color="#4A8B71" />
          <Text style={s.sectionTitle}>
            {firstName
              ? (lang === 'de' ? `Heute fuer ${firstName} wichtig` : `Importante per ${firstName} oggi`)
              : (lang === 'de' ? 'Heute fuer dich wichtig' : 'Importante per te oggi')}
          </Text>
        </View>
        <View style={s.doneCard}>
          <MaterialCommunityIcons name="check-circle" size={28} color="#22C55E" />
          <Text style={s.doneText}>
            {firstName
              ? (lang === 'de' ? `Alles erledigt! Gut gemacht, ${firstName}.` : `Tutto fatto! Ben fatto, ${firstName}.`)
              : (lang === 'de' ? 'Alles erledigt! Gut gemacht.' : 'Tutto fatto! Ben fatto.')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrap} data-testid="daily-tasks-section">
      <View style={s.headerRow}>
        <MaterialCommunityIcons name="star-four-points" size={18} color="#4A8B71" />
        <Text style={s.sectionTitle}>
          {firstName
            ? (lang === 'de' ? `Heute fuer ${firstName} wichtig` : `Importante per ${firstName} oggi`)
            : (lang === 'de' ? 'Heute fuer dich wichtig' : 'Importante per te oggi')}
        </Text>
      </View>

      {visibleTasks.map(task => {
        const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.info;
        const isExpanded = expandedId === task.id;
        const isInteractive = task.type === 'supplement' || task.type === 'tracking';

        return (
          <View key={task.id} style={[s.card, { borderLeftColor: cfg.color }]} data-testid={`daily-task-${task.id}`}>
            {/* Card Header - Tappable */}
            <TouchableOpacity
              style={s.cardTop}
              onPress={() => isInteractive ? toggleExpand(task.id) : onNavigate(task.cta_route)}
              activeOpacity={0.7}
              data-testid={`daily-task-header-${task.id}`}
            >
              <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
                <MaterialCommunityIcons name={task.icon as any} size={20} color={cfg.color} />
              </View>
              <View style={s.textCol}>
                <Text style={s.taskTitle} numberOfLines={1}>{task.title}</Text>
                <Text style={s.taskReason} numberOfLines={1}>{task.reason}</Text>
              </View>
              {task.progress_label && (
                <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[s.badgeText, { color: cfg.color }]}>{task.progress_label}</Text>
                </View>
              )}
              {isInteractive && (
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#8FA39B"
                />
              )}
            </TouchableOpacity>

            {/* Progress bar */}
            {task.progress !== null && !isExpanded && (
              <View style={s.progressWrap}>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${Math.max(2, task.progress)}%` as any, backgroundColor: cfg.color }]} />
                </View>
              </View>
            )}

            {/* Expanded: Supplement Checklist */}
            {isExpanded && task.type === 'supplement' && task.items && (
              <View style={s.expandedArea}>
                {task.items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.checkRow}
                    onPress={() => toggleItem(item.id)}
                    data-testid={`supplement-check-${item.id}`}
                  >
                    <View style={[s.checkbox, checkedItems[item.id] && s.checkboxChecked]}>
                      {checkedItems[item.id] && (
                        <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                      )}
                    </View>
                    <View style={s.checkTextCol}>
                      <Text style={[s.checkName, checkedItems[item.id] && s.checkNameDone]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.dosage ? (
                        <Text style={s.checkDosage}>{item.dosage}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[s.confirmBtn, { backgroundColor: cfg.color }, saving && { opacity: 0.5 }]}
                  onPress={() => saveSupplements(task)}
                  disabled={saving || Object.values(checkedItems).every(v => !v)}
                  data-testid="confirm-supplements-btn"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check-all" size={16} color="#FFF" />
                      <Text style={s.confirmText}>
                        {lang === 'de' ? 'Einnahme bestaetigen' : 'Conferma assunzione'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Expanded: Quick Symptom Rating */}
            {isExpanded && task.type === 'tracking' && (
              <View style={s.expandedArea}>
                <Text style={s.ratingLabel}>
                  {lang === 'de' ? 'Wie fuehlen Sie sich heute?' : 'Come ti senti oggi?'}
                </Text>
                <View style={s.ratingBar}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[s.ratingSegment, {
                        backgroundColor: symptomRating >= n ? getSeverityColor(n) : '#E5E7EB',
                        borderTopLeftRadius: n === 1 ? 6 : 0,
                        borderBottomLeftRadius: n === 1 ? 6 : 0,
                        borderTopRightRadius: n === 10 ? 6 : 0,
                        borderBottomRightRadius: n === 10 ? 6 : 0,
                      }]}
                      onPress={() => setSymptomRating(n)}
                      data-testid={`quick-symptom-${n}`}
                    />
                  ))}
                </View>
                <View style={s.ratingMeta}>
                  <Text style={s.ratingHint}>{lang === 'de' ? 'Gut' : 'Buono'}</Text>
                  <Text style={[s.ratingValue, { color: getSeverityColor(symptomRating) }]}>
                    {symptomRating}/10
                  </Text>
                  <Text style={s.ratingHint}>{lang === 'de' ? 'Schlecht' : 'Male'}</Text>
                </View>
                <TouchableOpacity
                  style={[s.confirmBtn, { backgroundColor: cfg.color }, saving && { opacity: 0.5 }]}
                  onPress={saveSymptomCheck}
                  disabled={saving}
                  data-testid="confirm-symptom-btn"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="content-save-check" size={16} color="#FFF" />
                      <Text style={s.confirmText}>
                        {lang === 'de' ? 'Bewertung speichern' : 'Salva valutazione'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Collapsed CTA - only for non-interactive or non-expanded */}
            {!isExpanded && (
              <TouchableOpacity
                style={[s.ctaBtn, { backgroundColor: cfg.color }]}
                onPress={() => isInteractive ? toggleExpand(task.id) : onNavigate(task.cta_route)}
                data-testid={`daily-task-cta-${task.id}`}
              >
                <Text style={s.ctaText}>
                  {isInteractive
                    ? (lang === 'de' ? 'Jetzt erledigen' : 'Fai ora')
                    : task.cta_label}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 12 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 10, paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },

  doneCard: {
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  doneText: { fontSize: 15, fontWeight: '600', color: '#166534', flex: 1 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginBottom: 10, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  textCol: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '700', color: '#1A2D26' },
  taskReason: { fontSize: 12, color: '#5C7A6F', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  progressWrap: { marginTop: 10, marginBottom: 4 },
  progressTrack: { height: 6, backgroundColor: '#F0F4F2', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, borderRadius: 10, paddingVertical: 10, marginTop: 10,
  },
  ctaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Expanded area
  expandedArea: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#F0F4F2',
  },

  // Supplement checklist
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F8FAF9',
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22C55E', borderColor: '#22C55E',
  },
  checkTextCol: { flex: 1 },
  checkName: { fontSize: 14, fontWeight: '600', color: '#1A2D26' },
  checkNameDone: { textDecorationLine: 'line-through', color: '#8FA39B' },
  checkDosage: { fontSize: 11, color: '#8FA39B', marginTop: 2 },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 12, marginTop: 12,
  },
  confirmText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Symptom rating
  ratingLabel: {
    fontSize: 14, fontWeight: '600', color: '#1A2D26', marginBottom: 12,
  },
  ratingBar: { flexDirection: 'row', gap: 3, height: 32 },
  ratingSegment: { flex: 1 },
  ratingMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 6,
  },
  ratingHint: { fontSize: 11, color: '#8FA39B' },
  ratingValue: { fontSize: 18, fontWeight: '700' },
});
