import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useLang } from '../src/LangContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CATEGORY_ICONS: Record<string, string> = {
  coupon: 'ticket-percent',
  premium: 'star-circle',
  download: 'download-circle',
  partner: 'handshake',
  general: 'gift',
};

const STATUS_COLORS: Record<string, string> = {
  available: '#2E7D52',
  locked: '#9CA3AF',
  redeemed: '#6366F1',
};

interface RewardItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  points_required: number;
  category: string;
  reward_type: string;
  status: string;
  points_remaining: number;
}

interface TodaySummary {
  today_points: number;
  breakdown: Record<string, number>;
  action_labels: Record<string, string>;
  events_count: number;
  current_balance: number;
  current_streak: number;
  next_reward: { title: string; points_required: number; points_remaining: number } | null;
}

interface Balance {
  current_balance: number;
  lifetime_points: number;
  redeemed_points: number;
}

export default function RewardsPage() {
  const { lang } = useLang();
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [catalog, setCatalog] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'redeemed'>('available');

  const t = useCallback((de: string, it: string) => lang === 'it' ? it : de, [lang]);

  const loadData = useCallback(async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    if (!pid) return;
    setProfileId(pid);

    try {
      const [balRes, todayRes, catRes] = await Promise.all([
        fetch(`${API_URL}/api/rewards/${pid}/balance`),
        fetch(`${API_URL}/api/rewards/${pid}/today?lang=${lang}`),
        fetch(`${API_URL}/api/rewards/catalog/list?lang=${lang}&profile_id=${pid}`),
      ]);
      if (balRes.ok) setBalance(await balRes.json());
      if (todayRes.ok) setToday(await todayRes.json());
      if (catRes.ok) setCatalog(await catRes.json());
    } catch {}
    setLoading(false);
  }, [lang]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleRedeem = useCallback(async (item: RewardItem) => {
    if (!profileId) return;
    Alert.alert(
      t('Praemie einloesen', 'Riscatta premio'),
      t(
        `Moechtest du "${item.title}" fuer ${item.points_required} Punkte einloesen?`,
        `Vuoi riscattare "${item.title}" per ${item.points_required} punti?`
      ),
      [
        { text: t('Abbrechen', 'Annulla'), style: 'cancel' },
        {
          text: t('Einloesen', 'Riscatta'),
          onPress: async () => {
            setRedeeming(item.id);
            try {
              const res = await fetch(`${API_URL}/api/rewards/${profileId}/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reward_id: item.id }),
              });
              const data = await res.json();
              if (data.success) {
                const msg = data.code
                  ? t(`Dein Code: ${data.code}`, `Il tuo codice: ${data.code}`)
                  : t('Erfolgreich eingeloest!', 'Riscattato con successo!');
                Alert.alert(t('Glueckwunsch!', 'Congratulazioni!'), msg);
                await loadData();
              } else {
                Alert.alert('Error', data.detail || 'Failed');
              }
            } catch {
              Alert.alert('Error', t('Verbindungsfehler', 'Errore di connessione'));
            }
            setRedeeming(null);
          },
        },
      ]
    );
  }, [profileId, t, loadData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D52" />
      </View>
    );
  }

  const availableItems = catalog.filter(c => c.status !== 'redeemed');
  const redeemedItems = catalog.filter(c => c.status === 'redeemed');

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1B5E3B', '#2E7D52']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} data-testid="rewards-back-btn">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Praemien', 'Premi')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard} data-testid="rewards-balance-card">
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>{t('Dein Punktestand', 'I tuoi punti')}</Text>
              <Text style={styles.balanceValue} data-testid="rewards-balance-value">
                {balance?.current_balance ?? 0}
              </Text>
            </View>
            <View style={styles.streakBadge}>
              <MaterialCommunityIcons name="fire" size={20} color="#F59E0B" />
              <Text style={styles.streakText}>{today?.current_streak ?? 0}</Text>
            </View>
          </View>
          <View style={styles.balanceStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{balance?.lifetime_points ?? 0}</Text>
              <Text style={styles.statLabel}>{t('Gesamt', 'Totale')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{balance?.redeemed_points ?? 0}</Text>
              <Text style={styles.statLabel}>{t('Eingeloest', 'Riscattati')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{today?.today_points ?? 0}</Text>
              <Text style={styles.statLabel}>{t('Heute', 'Oggi')}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Today's Breakdown */}
      {today && today.events_count > 0 && (
        <View style={styles.todayCard} data-testid="rewards-today-breakdown">
          <Text style={styles.todayTitle}>{t('Heute verdient', 'Guadagnato oggi')}</Text>
          <View style={styles.todayItems}>
            {Object.entries(today.breakdown).map(([action, pts]) => (
              <View key={action} style={styles.todayItem}>
                <Text style={styles.todayAction}>{today.action_labels[action] || action}</Text>
                <Text style={styles.todayPoints}>+{pts}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Next Reward Hint */}
      {today?.next_reward && (
        <View style={styles.nextRewardHint}>
          <MaterialCommunityIcons name="trophy-outline" size={18} color="#F59E0B" />
          <Text style={styles.nextRewardText}>
            {t(
              `Noch ${today.next_reward.points_remaining} Punkte bis "${today.next_reward.title}"`,
              `Ancora ${today.next_reward.points_remaining} punti per "${today.next_reward.title}"`
            )}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.tabActive]}
          onPress={() => setActiveTab('available')}
          data-testid="rewards-tab-available"
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
            {t('Verfuegbar', 'Disponibili')} ({availableItems.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'redeemed' && styles.tabActive]}
          onPress={() => setActiveTab('redeemed')}
          data-testid="rewards-tab-redeemed"
        >
          <Text style={[styles.tabText, activeTab === 'redeemed' && styles.tabTextActive]}>
            {t('Eingeloest', 'Riscattati')} ({redeemedItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Catalog */}
      <ScrollView
        style={styles.catalogScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E7D52" />}
      >
        {(activeTab === 'available' ? availableItems : redeemedItems).map(item => (
          <View key={item.id} style={[styles.rewardCard, item.status === 'locked' && styles.rewardCardLocked]} data-testid={`reward-card-${item.id}`}>
            <View style={styles.rewardHeader}>
              <View style={[styles.categoryBadge, { backgroundColor: STATUS_COLORS[item.status] + '18' }]}>
                <MaterialCommunityIcons
                  name={(CATEGORY_ICONS[item.category] || 'gift') as any}
                  size={20}
                  color={STATUS_COLORS[item.status]}
                />
              </View>
              <View style={styles.rewardInfo}>
                <Text style={[styles.rewardTitle, item.status === 'locked' && styles.rewardTitleLocked]}>
                  {item.title}
                </Text>
                <Text style={styles.rewardDesc} numberOfLines={2}>{item.description}</Text>
              </View>
              <View style={styles.pointsBadge}>
                <MaterialCommunityIcons name="star-four-points" size={14} color="#F59E0B" />
                <Text style={styles.pointsText}>{item.points_required}</Text>
              </View>
            </View>

            {item.status === 'locked' && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(100, ((item.points_required - item.points_remaining) / item.points_required) * 100)}%`
                }]} />
                <Text style={styles.progressText}>
                  {t(`Noch ${item.points_remaining} Punkte`, `Ancora ${item.points_remaining} punti`)}
                </Text>
              </View>
            )}

            {item.status === 'available' && (
              <TouchableOpacity
                style={styles.redeemBtn}
                onPress={() => handleRedeem(item)}
                disabled={redeeming === item.id}
                data-testid={`redeem-btn-${item.id}`}
              >
                {redeeming === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.redeemText}>{t('Einloesen', 'Riscatta')}</Text>
                )}
              </TouchableOpacity>
            )}

            {item.status === 'redeemed' && (
              <View style={styles.redeemedBadge}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#6366F1" />
                <Text style={styles.redeemedText}>{t('Eingeloest', 'Riscattato')}</Text>
              </View>
            )}
          </View>
        ))}

        {(activeTab === 'available' ? availableItems : redeemedItems).length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="gift-off-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {activeTab === 'available'
                ? t('Keine Praemien verfuegbar', 'Nessun premio disponibile')
                : t('Noch keine Praemien eingeloest', 'Nessun premio riscattato')}
            </Text>
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  balanceCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 16 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  balanceValue: { fontSize: 36, fontWeight: '800', color: '#fff' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  streakText: { fontSize: 15, fontWeight: '700', color: '#F59E0B', marginLeft: 4 },
  balanceStats: { flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 8 },
  todayCard: { margin: 16, marginBottom: 0, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  todayTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  todayItems: { gap: 4 },
  todayItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayAction: { fontSize: 13, color: '#6B7280' },
  todayPoints: { fontSize: 13, fontWeight: '700', color: '#2E7D52' },
  nextRewardHint: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, gap: 8 },
  nextRewardText: { fontSize: 13, color: '#92400E', flex: 1 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, marginBottom: 8, backgroundColor: '#E5E7EB', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#2E7D52', fontWeight: '600' },
  catalogScroll: { flex: 1, paddingHorizontal: 16 },
  rewardCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  rewardCardLocked: { opacity: 0.8 },
  rewardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  categoryBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rewardInfo: { flex: 1 },
  rewardTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  rewardTitleLocked: { color: '#9CA3AF' },
  rewardDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  pointsText: { fontSize: 14, fontWeight: '700', color: '#B45309' },
  progressBar: { marginTop: 12, height: 20, backgroundColor: '#F3F4F6', borderRadius: 10, overflow: 'hidden', justifyContent: 'center' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#2E7D52', borderRadius: 10, opacity: 0.2 },
  progressText: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  redeemBtn: { marginTop: 12, backgroundColor: '#2E7D52', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  redeemText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  redeemedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  redeemedText: { fontSize: 13, color: '#6366F1', fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});
