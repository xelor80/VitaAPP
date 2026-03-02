import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '../src/LangContext';
import { trackingStyles as styles } from '../components/tracking/trackingStyles';
import { SymptomTracker } from '../components/tracking/SymptomTracker';
import { ComplianceTracker } from '../components/tracking/ComplianceTracker';
import { MilestonesCard } from '../components/tracking/MilestonesCard';
import { InsightsCard } from '../components/tracking/InsightsCard';
import { ProgressHeader } from '../components/tracking/ProgressHeader';
import { CorrelationAnalysis } from '../components/tracking/CorrelationAnalysis';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface DashboardData {
  progress: number;
  streak: number;
  days_tracked: number;
  symptom_trend: { direction: string; change_pct: number; label_de: string; label_it: string };
  symptom_chart: Record<string, Array<{ date: string; value: number }>>;
  overall_chart: Array<{ date: string; value: number }>;
  compliance_rate: number;
  compliance_daily: Array<{ date: string; rate: number }>;
  compliance_trend: { direction: string; change_pct: number };
  milestones: Array<{ id: string; name_de: string; name_it: string; icon: string; achieved: boolean }>;
  insights: Array<{ type: string; icon: string; title: string; text: string }>;
}

export default function TrackingScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<'symptoms' | 'compliance' | 'correlations'>('symptoms');
  const [supplements, setSupplements] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      const pid = await AsyncStorage.getItem('health_profile_id');
      if (pid) {
        setProfileId(pid);
        await Promise.all([loadDashboard(pid), loadSupplements(pid)]);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadDashboard = async (pid: string) => {
    try {
      const res = await fetch(`${API_URL}/api/tracking/dashboard/${pid}?lang=${lang}`);
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (e) {
      console.error('Dashboard error:', e);
    }
  };

  const loadSupplements = async (pid: string) => {
    try {
      const res = await fetch(`${API_URL}/api/supplement-plan/${pid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.plan?.stack) {
          setSupplements(data.plan.stack);
        }
      }
    } catch (e) {
      console.error('Supplements error:', e);
    }
  };

  const refreshDashboard = useCallback(async () => {
    if (profileId) {
      await loadDashboard(profileId);
    }
  }, [profileId, lang]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4A8B71" testID="loading-indicator" />
      </SafeAreaView>
    );
  }

  if (!profileId) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{lang === 'de' ? 'Mein Fortschritt' : 'Il mio progresso'}</Text>
          </View>
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="clipboard-alert-outline" size={56} color="#F59E0B" />
            <Text style={styles.emptyTitle}>
              {lang === 'de' ? 'Gesundheits-Check erforderlich' : 'Check salute necessario'}
            </Text>
            <Text style={styles.emptyText}>
              {lang === 'de'
                ? 'Bitte führen Sie zuerst den Gesundheits-Check durch, um Ihren Fortschritt zu tracken.'
                : 'Esegui prima il check salute per tracciare i tuoi progressi.'}
            </Text>
            <TouchableOpacity
              testID="start-onboarding-btn"
              style={[styles.saveBtn, { marginTop: 20, width: '100%' }]}
              onPress={() => router.push('/onboarding')}
            >
              <Text style={styles.saveBtnText}>
                {lang === 'de' ? 'Gesundheits-Check starten' : 'Avvia check salute'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{lang === 'de' ? 'Mein Fortschritt' : 'Il mio progresso'}</Text>
        </View>

        {/* Progress Header Card */}
        {dashboard && (
          <ProgressHeader
            progress={dashboard.progress}
            streak={dashboard.streak}
            daysTracked={dashboard.days_tracked}
            complianceRate={dashboard.compliance_rate}
            lang={lang}
          />
        )}

        {/* Insights (Coach Messages) */}
        {dashboard?.insights && dashboard.insights.length > 0 && (
          <InsightsCard insights={dashboard.insights} lang={lang} />
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            testID="tab-symptoms"
            style={[styles.tab, activeTab === 'symptoms' && styles.tabActive]}
            onPress={() => setActiveTab('symptoms')}
          >
            <Text style={[styles.tabText, activeTab === 'symptoms' && styles.tabTextActive]}>
              {lang === 'de' ? 'Symptome' : 'Sintomi'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="tab-compliance"
            style={[styles.tab, activeTab === 'compliance' && styles.tabActive]}
            onPress={() => setActiveTab('compliance')}
          >
            <Text style={[styles.tabText, activeTab === 'compliance' && styles.tabTextActive]}>
              {lang === 'de' ? 'Einnahme' : 'Assunzione'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="tab-correlations"
            style={[styles.tab, activeTab === 'correlations' && styles.tabActive]}
            onPress={() => setActiveTab('correlations')}
          >
            <Text style={[styles.tabText, activeTab === 'correlations' && styles.tabTextActive]}>
              {lang === 'de' ? 'Analyse' : 'Analisi'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Symptom Tracker Tab */}
        {activeTab === 'symptoms' && (
          <SymptomTracker
            profileId={profileId}
            lang={lang}
            overallChart={dashboard?.overall_chart || []}
            symptomChart={dashboard?.symptom_chart}
            symptomTrend={dashboard?.symptom_trend}
            onSave={refreshDashboard}
          />
        )}

        {/* Compliance Tracker Tab */}
        {activeTab === 'compliance' && (
          <ComplianceTracker
            profileId={profileId}
            lang={lang}
            supplements={supplements}
            complianceDaily={dashboard?.compliance_daily || []}
            complianceRate={dashboard?.compliance_rate || 0}
            complianceTrend={dashboard?.compliance_trend}
            onSave={refreshDashboard}
          />
        )}

        {/* Correlation Analysis Tab */}
        {activeTab === 'correlations' && (
          <CorrelationAnalysis profileId={profileId} lang={lang} />
        )}

        {/* Milestones */}
        {dashboard?.milestones && dashboard.milestones.length > 0 && (
          <MilestonesCard milestones={dashboard.milestones} lang={lang} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
