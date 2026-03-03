import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
}

interface Props {
  lang: string;
  onNavigate: (route: string) => void;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; accent: string }> = {
  urgent: { color: '#DC2626', bg: '#FEF2F2', accent: '#FCA5A5' },
  pending: { color: '#D97706', bg: '#FFFBEB', accent: '#FCD34D' },
  warning: { color: '#DC2626', bg: '#FEF2F2', accent: '#FCA5A5' },
  info: { color: '#2563EB', bg: '#EFF6FF', accent: '#93C5FD' },
  progress: { color: '#059669', bg: '#ECFDF5', accent: '#6EE7B7' },
};

export function DailyTasks({ lang, onNavigate }: Props) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [lang]);

  const loadTasks = async () => {
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      if (!profileId) { setLoading(false); return; }
      const res = await fetch(`${API_URL}/api/daily-tasks/${profileId}?lang=${lang}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading || tasks.length === 0) return null;

  return (
    <View style={s.wrap} data-testid="daily-tasks-section">
      <View style={s.headerRow}>
        <MaterialCommunityIcons name="star-four-points" size={18} color="#4A8B71" />
        <Text style={s.sectionTitle}>
          {lang === 'de' ? 'Heute fuer dich wichtig' : 'Importante per te oggi'}
        </Text>
      </View>
      {tasks.map((task) => {
        const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.info;
        return (
          <View
            key={task.id}
            style={[s.card, { borderLeftColor: cfg.color }]}
            data-testid={`daily-task-${task.id}`}
          >
            <View style={s.cardTop}>
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
            </View>

            {task.progress !== null && (
              <View style={s.progressWrap}>
                <View style={s.progressTrack}>
                  <View
                    style={[s.progressFill, {
                      width: `${Math.max(2, task.progress)}%` as any,
                      backgroundColor: cfg.color,
                    }]}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[s.ctaBtn, { backgroundColor: cfg.color }]}
              onPress={() => onNavigate(task.cta_route)}
              data-testid={`daily-task-cta-${task.id}`}
            >
              <Text style={s.ctaText}>{task.cta_label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2D26',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2D26',
  },
  taskReason: {
    fontSize: 12,
    color: '#5C7A6F',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressWrap: {
    marginTop: 10,
    marginBottom: 4,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F0F4F2',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
