import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Milestone {
  id: string;
  icon: string;
  title: string;
  message: string;
  achieved: boolean;
  current_value: number;
  threshold: number;
}

interface AchievementData {
  streak: {
    current: number;
    next_goal: number | null;
    label: string;
    next_label: string | null;
    compliance_streak: number;
    tracking_streak: number;
  };
  milestones: {
    unlocked: Milestone[];
    new: Milestone[];
    next: Milestone | null;
    total_unlocked: number;
    total: number;
  };
}

interface Props {
  lang: string;
}

export function Achievements({ lang }: Props) {
  const [data, setData] = useState<AchievementData | null>(null);
  const [showNewBadge, setShowNewBadge] = useState<Milestone | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => { load(); }, [lang]);

  const load = async () => {
    try {
      const pid = await AsyncStorage.getItem('health_profile_id');
      if (!pid) return;
      const res = await fetch(`${API_URL}/api/achievements/${pid}?lang=${lang}`);
      if (res.ok) {
        const d: AchievementData = await res.json();
        setData(d);
        // Show toast for new milestone
        if (d.milestones.new.length > 0) {
          setShowNewBadge(d.milestones.new[0]);
          Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]).start();
          // Auto-dismiss after 5s
          setTimeout(() => {
            Animated.parallel([
              Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
              Animated.timing(slideAnim, { toValue: -20, duration: 400, useNativeDriver: true }),
            ]).start(() => setShowNewBadge(null));
          }, 5000);
        }
      }
    } catch (e) { /* silent */ }
  };

  if (!data || (data.streak.current === 0 && data.milestones.total_unlocked === 0 && !data.milestones.next)) {
    return null;
  }

  const { streak, milestones } = data;
  const progressPct = streak.next_goal
    ? Math.min(100, Math.round((streak.current / streak.next_goal) * 100))
    : 100;

  return (
    <View style={s.wrap} testID="achievements-section">
      {/* New milestone toast */}
      {showNewBadge && (
        <Animated.View style={[s.toast, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.toastIcon}>
            <MaterialCommunityIcons name={showNewBadge.icon as any} size={20} color="#059669" />
          </View>
          <View style={s.toastText}>
            <Text style={s.toastTitle}>{showNewBadge.title}</Text>
            <Text style={s.toastMsg}>{showNewBadge.message}</Text>
          </View>
        </Animated.View>
      )}

      {/* Streak Card */}
      <View style={s.streakCard}>
        <View style={s.streakTop}>
          <View style={s.streakIconWrap}>
            <MaterialCommunityIcons name="fire" size={22} color="#D97706" />
          </View>
          <View style={s.streakInfo}>
            <Text style={s.streakLabel} testID="streak-label">{streak.label}</Text>
            {streak.next_label && (
              <Text style={s.nextGoal}>{streak.next_label}</Text>
            )}
          </View>
          <View style={s.streakBadge}>
            <Text style={s.streakNum}>{streak.current}</Text>
          </View>
        </View>

        {/* Progress toward next goal */}
        {streak.next_goal && (
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.max(3, progressPct)}%` as any }]} />
            </View>
            <Text style={s.progressPct}>{progressPct}%</Text>
          </View>
        )}

        {/* Sub-streaks */}
        <View style={s.subStreaks}>
          <View style={s.subItem}>
            <MaterialCommunityIcons name="pill" size={14} color="#5C7A6F" />
            <Text style={s.subText}>
              {lang === 'de' ? `Einnahme: ${streak.compliance_streak}d` : `Assunzione: ${streak.compliance_streak}g`}
            </Text>
          </View>
          <View style={s.subDivider} />
          <View style={s.subItem}>
            <MaterialCommunityIcons name="clipboard-pulse" size={14} color="#5C7A6F" />
            <Text style={s.subText}>
              {lang === 'de' ? `Tracking: ${streak.tracking_streak}d` : `Monitoraggio: ${streak.tracking_streak}g`}
            </Text>
          </View>
        </View>
      </View>

      {/* Badges Row */}
      {(milestones.unlocked.length > 0 || milestones.next) && (
        <View style={s.badgesCard}>
          <Text style={s.badgesTitle}>
            {lang === 'de'
              ? `Meilensteine (${milestones.total_unlocked}/${milestones.total})`
              : `Traguardi (${milestones.total_unlocked}/${milestones.total})`}
          </Text>
          <View style={s.badgesRow}>
            {milestones.unlocked.map(m => (
              <View key={m.id} style={s.badge} testID={`badge-${m.id}`}>
                <View style={s.badgeCircle}>
                  <MaterialCommunityIcons name={m.icon as any} size={18} color="#059669" />
                </View>
                <Text style={s.badgeLabel} numberOfLines={1}>{m.title}</Text>
              </View>
            ))}
            {milestones.next && (
              <View key={milestones.next.id} style={s.badge} testID={`badge-next-${milestones.next.id}`}>
                <View style={s.badgeCircleLocked}>
                  <MaterialCommunityIcons name={milestones.next.icon as any} size={18} color="#B0BDB6" />
                </View>
                <Text style={s.badgeLabelLocked} numberOfLines={1}>{milestones.next.title}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 12 },

  // Toast for new milestone
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#BBF7D0',
  },
  toastIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center',
  },
  toastText: { flex: 1 },
  toastTitle: { fontSize: 14, fontWeight: '700', color: '#166534' },
  toastMsg: { fontSize: 12, color: '#15803D', marginTop: 2 },

  // Streak card
  streakCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center',
  },
  streakInfo: { flex: 1 },
  streakLabel: { fontSize: 15, fontWeight: '700', color: '#1A2D26' },
  nextGoal: { fontSize: 12, color: '#8FA39B', marginTop: 2 },
  streakBadge: {
    backgroundColor: '#1A2D26', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  streakNum: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },

  // Progress
  progressWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
  },
  progressTrack: {
    flex: 1, height: 5, backgroundColor: '#F0F4F2', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: {
    height: 5, borderRadius: 3, backgroundColor: '#D97706',
  },
  progressPct: { fontSize: 11, fontWeight: '600', color: '#8FA39B', width: 30, textAlign: 'right' },

  // Sub-streaks
  subStreaks: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F4F2',
  },
  subItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  subText: { fontSize: 12, color: '#5C7A6F', fontWeight: '500' },
  subDivider: { width: 1, height: 16, backgroundColor: '#E5E7EB' },

  // Badges card
  badgesCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  badgesTitle: { fontSize: 13, fontWeight: '600', color: '#5C7A6F', marginBottom: 12 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge: { alignItems: 'center', width: 68 },
  badgeCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ECFDF5', borderWidth: 2, borderColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
  },
  badgeCircleLocked: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F8FAF9', borderWidth: 2, borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  badgeLabel: { fontSize: 10, fontWeight: '600', color: '#1A2D26', marginTop: 4, textAlign: 'center' },
  badgeLabelLocked: { fontSize: 10, fontWeight: '500', color: '#B0BDB6', marginTop: 4, textAlign: 'center' },
});
