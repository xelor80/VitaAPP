import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '../src/LangContext';
import { trackingStyles as styles } from '../components/tracking/trackingStyles';
import { LineChart } from 'react-native-chart-kit';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const W = Dimensions.get('window').width - 70;

const INSIGHT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  positive: { bg: '#F0FDF4', text: '#166534', icon: '#10B981' },
  warning: { bg: '#FEF2F2', text: '#991B1B', icon: '#EF4444' },
  suggestion: { bg: '#FFFBEB', text: '#92400E', icon: '#F59E0B' },
  info: { bg: '#EFF6FF', text: '#1E40AF', icon: '#3B82F6' },
  motivation: { bg: '#F0FDF4', text: '#166534', icon: '#4A8B71' },
};

const COMPLAINT_LABELS: Record<string, Record<string, string>> = {
  fatigue: { de: 'Muedigkeit', it: 'Stanchezza' },
  concentration: { de: 'Konzentration', it: 'Concentrazione' },
  hair_loss: { de: 'Haarausfall', it: 'Perdita capelli' },
  skin: { de: 'Haut', it: 'Pelle' },
  mood: { de: 'Stimmung', it: 'Umore' },
  sleep: { de: 'Schlaf', it: 'Sonno' },
  digestive: { de: 'Verdauung', it: 'Digestione' },
  headache: { de: 'Kopfschmerzen', it: 'Mal di testa' },
  joint_pain: { de: 'Gelenkschmerzen', it: 'Dolori articolari' },
  immune: { de: 'Immunsystem', it: 'Sistema immunitario' },
};

export default function ProgressScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [planSupplements, setPlanSupplements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'log' | 'milestones'>('overview');
  const [todayRatings, setTodayRatings] = useState<Record<string, number>>({});
  const [todayOverall, setTodayOverall] = useState(5);
  const [todayCompliance, setTodayCompliance] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const pid = await AsyncStorage.getItem('health_profile_id');
    if (!pid) { setLoading(false); return; }
    setProfileId(pid);

    try {
      const [dashRes, planRes, profRes] = await Promise.all([
        fetch(`${API_URL}/api/tracking/dashboard/${pid}?lang=${lang}`),
        fetch(`${API_URL}/api/supplement-plan/${pid}`),
        fetch(`${API_URL}/api/health-profile/${pid}`),
      ]);

      if (dashRes.ok) setDashboard(await dashRes.json());
      if (planRes.ok) {
        const planData = await planRes.json();
        const stack = planData.plan?.stack || [];
        setPlanSupplements(stack);
        const compInit: Record<string, boolean> = {};
        stack.forEach((s: any) => { compInit[s.id] = false; });
        setTodayCompliance(compInit);
      }
      if (profRes.ok) {
        const profData = await profRes.json();
        const complaints = profData.profile?.complaints || [];
        const ratInit: Record<string, number> = {};
        complaints.forEach((c: any) => { ratInit[c.name] = 5; });
        if (Object.keys(ratInit).length === 0) ratInit['overall_feeling'] = 5;
        setTodayRatings(ratInit);
      }
    } catch (e) { console.error('Init error:', e); }
    setLoading(false);
  };

  const saveToday = async () => {
    if (!profileId) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      await Promise.all([
        fetch(`${API_URL}/api/tracking/symptoms`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: profileId, date: today, ratings: todayRatings, overall: todayOverall })
        }),
        fetch(`${API_URL}/api/tracking/compliance`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile_id: profileId, date: today,
            supplements: Object.entries(todayCompliance).map(([id, taken]) => ({ id, taken }))
          })
        })
      ]);
      // Reload dashboard
      const res = await fetch(`${API_URL}/api/tracking/dashboard/${profileId}?lang=${lang}`);
      if (res.ok) setDashboard(await res.json());
    } catch (e) { console.error('Save error:', e); }
    setSaving(false);
  };

  if (loading) {
    return (<SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#4A8B71" />
    </SafeAreaView>);
  }

  if (!profileId) {
    return (<SafeAreaView style={styles.container}>
      <View style={[styles.emptyCard, { flex: 1, justifyContent: 'center' }]}>
        <MaterialCommunityIcons name="chart-line" size={64} color="#8FA39B" />
        <Text style={styles.emptyTitle}>{lang === 'de' ? 'Tracking starten' : 'Avvia tracking'}</Text>
        <Text style={styles.emptyText}>
          {lang === 'de' ? 'Fuehren Sie zuerst den Gesundheits-Check durch.' : 'Esegui prima il check salute.'}
        </Text>
        <TouchableOpacity style={[styles.saveBtn, { marginTop: 20, paddingHorizontal: 24 }]} onPress={() => router.push('/onboarding')}>
          <Text style={styles.saveBtnText}>{lang === 'de' ? 'Gesundheits-Check' : 'Check salute'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>);
  }

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF', backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0, color: (opacity = 1) => `rgba(74, 139, 113, ${opacity})`,
    labelColor: () => '#8FA39B', propsForDots: { r: '4', strokeWidth: '2', stroke: '#4A8B71' },
    propsForBackgroundLines: { strokeDasharray: '', stroke: '#F0F4F2' },
  };

  const overallChart = dashboard?.overall_chart || [];
  const chartLabels = overallChart.slice(-7).map((d: any) => d.date.slice(5));
  const chartValues = overallChart.slice(-7).map((d: any) => d.value);

  const trendDir = dashboard?.symptom_trend?.direction || 'neutral';
  const trendColor = trendDir === 'improving' ? '#10B981' : trendDir === 'worsening' ? '#EF4444' : '#F59E0B';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{lang === 'de' ? 'Mein Fortschritt' : 'Il mio progresso'}</Text>
        </View>

        {/* Progress Overview */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="fire" size={24} color="#F59E0B" style={styles.streakIcon} />
              <Text style={styles.statValue}>{dashboard?.streak || 0}</Text>
              <Text style={styles.statLabel}>{lang === 'de' ? 'Tage Streak' : 'Giorni streak'}</Text>
            </View>
            <View style={styles.progressCenter}>
              <Text style={styles.progressPct}>{Math.round(dashboard?.progress || 0)}%</Text>
              <Text style={styles.progressLabel}>{lang === 'de' ? 'Gesamtfortschritt' : 'Progresso totale'}</Text>
            </View>
            <View style={styles.statBox}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#4A8B71" style={styles.streakIcon} />
              <Text style={styles.statValue}>{Math.round(dashboard?.compliance_rate || 0)}%</Text>
              <Text style={styles.statLabel}>{lang === 'de' ? 'Einnahmetreue' : 'Compliance'}</Text>
            </View>
          </View>
        </View>

        {/* Coach Insights */}
        {dashboard?.insights?.length > 0 && (
          <View style={styles.coachCard}>
            <MaterialCommunityIcons name="robot-happy" size={28} color="#4A8B71" />
            <Text style={styles.coachText}>{dashboard.insights[0].text}</Text>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: 'overview' as const, label: lang === 'de' ? 'Uebersicht' : 'Panoramica' },
            { key: 'log' as const, label: lang === 'de' ? 'Heute eintragen' : 'Registra oggi' },
            { key: 'milestones' as const, label: lang === 'de' ? 'Meilensteine' : 'Traguardi' },
          ].map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key)}>
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Symptom Chart */}
            {chartValues.length >= 2 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>{lang === 'de' ? 'Symptomverlauf (7 Tage)' : 'Andamento sintomi (7 giorni)'}</Text>
                <View style={[styles.trendBadge, { backgroundColor: trendColor + '20' }]}>
                  <MaterialCommunityIcons
                    name={trendDir === 'improving' ? 'trending-down' : trendDir === 'worsening' ? 'trending-up' : 'trending-neutral'}
                    size={16} color={trendColor}
                  />
                  <Text style={[styles.trendBadgeText, { color: trendColor }]}>
                    {dashboard?.symptom_trend?.label_de || 'Stabil'}
                  </Text>
                </View>
                <LineChart
                  data={{ labels: chartLabels, datasets: [{ data: chartValues.length > 0 ? chartValues : [0] }] }}
                  width={W} height={180} chartConfig={chartConfig}
                  bezier withDots withInnerLines={false} withOuterLines={false}
                  style={{ borderRadius: 12 }}
                  yAxisSuffix="" yAxisLabel=""
                  fromZero yLabelsOffset={8}
                />
              </View>
            )}

            {/* Compliance Chart */}
            {(dashboard?.compliance_daily?.length || 0) >= 2 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>{lang === 'de' ? 'Einnahmetreue (7 Tage)' : 'Compliance (7 giorni)'}</Text>
                <LineChart
                  data={{
                    labels: (dashboard?.compliance_daily || []).slice(-7).map((d: any) => d.date.slice(5)),
                    datasets: [{ data: (dashboard?.compliance_daily || []).slice(-7).map((d: any) => d.rate || 0) }]
                  }}
                  width={W} height={160} chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#3B82F6' },
                  }}
                  bezier withDots withInnerLines={false} withOuterLines={false}
                  style={{ borderRadius: 12 }}
                  yAxisSuffix="%" yAxisLabel=""
                />
              </View>
            )}

            {/* All Insights */}
            {dashboard?.insights?.slice(1).map((ins: any, i: number) => {
              const c = INSIGHT_COLORS[ins.type] || INSIGHT_COLORS.info;
              return (
                <View key={i} style={[styles.insightCard, { backgroundColor: c.bg }]}>
                  <MaterialCommunityIcons name={(ins.icon || 'information') as any} size={22} color={c.icon} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitle, { color: c.text }]}>{ins.title}</Text>
                    <Text style={[styles.insightText, { color: c.text }]}>{ins.text}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Log Tab */}
        {activeTab === 'log' && (
          <>
            {/* Symptom Ratings */}
            <View style={styles.ratingCard}>
              <Text style={styles.ratingTitle}>
                {lang === 'de' ? 'Wie fuehlen Sie sich heute? (1=sehr gut, 10=sehr schlecht)' : 'Come ti senti oggi? (1=molto bene, 10=molto male)'}
              </Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{lang === 'de' ? 'Gesamt' : 'Totale'}</Text>
                <View style={styles.ratingDots}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <TouchableOpacity key={n} style={[styles.ratingDot, todayOverall === n && styles.ratingDotActive]}
                      onPress={() => setTodayOverall(n)}>
                      <Text style={[styles.ratingDotText, todayOverall === n && styles.ratingDotTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {Object.entries(todayRatings).map(([key, val]) => (
                <View key={key} style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>{COMPLAINT_LABELS[key]?.[lang] || key}</Text>
                  <View style={styles.ratingDots}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <TouchableOpacity key={n} style={[styles.ratingDot, val === n && styles.ratingDotActive]}
                        onPress={() => setTodayRatings({ ...todayRatings, [key]: n })}>
                        <Text style={[styles.ratingDotText, val === n && styles.ratingDotTextActive]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Supplement Checklist */}
            {planSupplements.length > 0 && (
              <View style={styles.complianceCard}>
                <View style={styles.complianceHeader}>
                  <Text style={styles.ratingTitle}>{lang === 'de' ? 'Einnahme-Checkliste' : 'Checklist assunzione'}</Text>
                  <Text style={[styles.complianceRate, { color: '#4A8B71' }]}>
                    {Math.round((Object.values(todayCompliance).filter(Boolean).length / Math.max(Object.keys(todayCompliance).length, 1)) * 100)}%
                  </Text>
                </View>
                {planSupplements.map((s: any) => (
                  <View key={s.id} style={styles.complianceRow}>
                    <Text style={styles.complianceName}>{s.name}</Text>
                    <Text style={{ fontSize: 12, color: '#8FA39B' }}>{s.dosage} {s.unit}</Text>
                    <TouchableOpacity
                      style={[styles.checkBtn, {
                        backgroundColor: todayCompliance[s.id] ? '#4A8B71' : 'transparent',
                        borderColor: todayCompliance[s.id] ? '#4A8B71' : '#E0E6E2'
                      }]}
                      onPress={() => setTodayCompliance({ ...todayCompliance, [s.id]: !todayCompliance[s.id] })}
                    >
                      {todayCompliance[s.id] && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={saveToday} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                <Text style={styles.saveBtnText}>{lang === 'de' ? 'Heute speichern' : 'Salva oggi'}</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <View style={styles.milestonesCard}>
            {(dashboard?.milestones || []).length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="trophy-outline" size={48} color="#8FA39B" />
                <Text style={styles.emptyTitle}>{lang === 'de' ? 'Noch keine Meilensteine' : 'Nessun traguardo ancora'}</Text>
                <Text style={styles.emptyText}>
                  {lang === 'de' ? 'Tracken Sie regelmaessig, um Meilensteine zu erreichen!' : 'Traccia regolarmente per raggiungere traguardi!'}
                </Text>
              </View>
            ) : (
              (dashboard?.milestones || []).map((m: any, i: number) => (
                <View key={i} style={styles.milestoneRow}>
                  <View style={[styles.milestoneBadge, { backgroundColor: m.achieved ? '#F0FDF4' : '#F0F4F2' }]}>
                    <MaterialCommunityIcons name={(m.icon || 'star') as any} size={22} color={m.achieved ? '#4A8B71' : '#8FA39B'} />
                  </View>
                  <Text style={[styles.milestoneName, !m.achieved && { color: '#8FA39B' }]}>
                    {lang === 'de' ? m.name_de : m.name_it}
                  </Text>
                  {m.achieved && <MaterialCommunityIcons name="check-circle" size={20} color="#4A8B71" />}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
