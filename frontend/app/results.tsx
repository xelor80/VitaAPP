import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView,
  ActivityIndicator, Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentAnalysis } from '../src/store';
import { useLang } from '../src/LangContext';
import { t } from '../src/i18n';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { SupplementsTab } from '../components/tabs/SupplementsTab';
import { NutritionTab } from '../components/tabs/NutritionTab';
import { RecipesTab } from '../components/tabs/RecipesTab';
import { styles } from '../components/styles/resultsStyles';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type TabKey = 'overview' | 'supplements' | 'nutrition' | 'recipes';

const TABS: { key: TabKey; icon: string }[] = [
  { key: 'overview', icon: 'view-dashboard-outline' },
  { key: 'supplements', icon: 'pill' },
  { key: 'nutrition', icon: 'food-apple-outline' },
  { key: 'recipes', icon: 'chef-hat' },
];

const TAB_LABELS: Record<string, Record<TabKey, string>> = {
  de: { overview: 'Übersicht', supplements: 'Supplements', nutrition: 'Ernährung', recipes: 'Rezepte' },
  it: { overview: 'Panoramica', supplements: 'Integratori', nutrition: 'Nutrizione', recipes: 'Ricette' },
};

export default function ResultsScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const data = getCurrentAnalysis();
    if (data) {
      setAnalysis(data);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const trackClick = useCallback(async (productId: string, affiliateUrl: string) => {
    try {
      await fetch(`${API_URL}/api/track/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, affiliate_url: affiliateUrl, source: 'app' }),
      });
    } catch {}
    Linking.openURL(affiliateUrl);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <ActivityIndicator testID="results-loading" color="#4A8B71" size="large" />
      </SafeAreaView>
    );
  }

  if (!analysis) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#8FA39B" />
        <Text style={styles.emptyText}>Keine Analyse gefunden</Text>
        <TouchableOpacity testID="back-home-btn" style={styles.linkBtn} onPress={() => router.back()}>
          <Text style={styles.linkBtnText}>Zurück zur Eingabe</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const hasRedFlags = analysis.red_flags && analysis.red_flags.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(lang, 'results_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Red Flag Banner */}
      {hasRedFlags && (
        <View testID="red-flag-banner" style={styles.redFlagBanner}>
          <MaterialCommunityIcons name="alert-decagram" size={22} color="#D9534F" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.redFlagTitle}>{lang === 'de' ? 'Wichtige Warnung' : 'Avviso importante'}</Text>
            <Text style={styles.redFlagText}>
              {lang === 'de'
                ? 'Es wurden mögliche Warnsignale erkannt. Bitte konsultieren Sie umgehend einen Arzt.'
                : 'Sono stati rilevati possibili segnali di allarme. Si prega di consultare immediatamente un medico.'}
            </Text>
          </View>
        </View>
      )}

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                testID={`tab-${tab.key}`}
                style={[styles.tab, active && styles.tabActive]}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.key)}
              >
                <MaterialCommunityIcons name={tab.icon as any} size={18} color={active ? '#FFFFFF' : '#5C7A6F'} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{TAB_LABELS[lang]?.[tab.key] || TAB_LABELS.de[tab.key]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && <OverviewTab analysis={analysis} onShopPress={trackClick} lang={lang} />}
        {activeTab === 'supplements' && <SupplementsTab analysis={analysis} onShopPress={trackClick} lang={lang} />}
        {activeTab === 'nutrition' && <NutritionTab analysis={analysis} onShopPress={trackClick} lang={lang} />}
        {activeTab === 'recipes' && <RecipesTab analysis={analysis} lang={lang} />}

        {/* Disclaimer */}
        <View style={styles.disclaimerFooter}>
          <MaterialCommunityIcons name="information-outline" size={14} color="#8FA39B" />
          <Text style={styles.disclaimerText}>
            {analysis.disclaimer_short || t(lang, 'disclaimer_footer')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
