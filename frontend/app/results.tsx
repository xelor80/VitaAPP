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
import { useSettings } from '../src/SettingsContext';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { SupplementsTab } from '../components/tabs/SupplementsTab';
import { NutritionTab } from '../components/tabs/NutritionTab';
import { RecipesTab } from '../components/tabs/RecipesTab';
import { VideosSection } from '../components/results/VideosSection';
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
  const { translations } = useSettings();
  const { lang } = useLang();
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);

  useEffect(() => {
    const data = getCurrentAnalysis();
    if (data) {
      setAnalysis(data);
      loadRelatedVideos(data);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadRelatedVideos = async (analysisData: any) => {
    try {
      // Get videos for the current language
      const res = await fetch(`${API_URL}/api/videos?lang=${lang}`);
      if (res.ok) {
        const videos = await res.json();
        
        // Sammle alle relevanten Keywords aus der Analyse
        const keywords: string[] = [];
        
        // Input Tags
        if (analysisData.input_tags) {
          keywords.push(...analysisData.input_tags.map((t: string) => t.toLowerCase()));
        }
        
        // Supplement Namen aus supplements_general_info
        if (analysisData.supplements_general_info) {
          analysisData.supplements_general_info.forEach((s: any) => {
            if (s.name) keywords.push(s.name.toLowerCase());
          });
        }
        
        // Brand Products
        if (analysisData.brand_products) {
          analysisData.brand_products.forEach((p: any) => {
            if (p.name) keywords.push(p.name.toLowerCase());
            if (p.tags) keywords.push(...p.tags.map((t: string) => t.toLowerCase()));
          });
        }
        
        // Summary Text durchsuchen nach Schlüsselwörtern
        const summary = (analysisData.summary || '').toLowerCase();
        const keywordMap: Record<string, string[]> = {
          'verdauung': ['digestione', 'verdauung', 'magen', 'darm'],
          'energie': ['energia', 'energie', 'müdigkeit', 'erschöpfung', 'müde'],
          'schlaf': ['schlaf', 'sleep', 'schlafen', 'insomnia'],
          'gelenke': ['articolazioni', 'gelenke', 'arthrose', 'gelenkschmerzen'],
          'herz': ['cuore', 'herz', 'kreislauf', 'blutdruck'],
          'haut': ['pelle', 'haut', 'haare', 'nägel'],
          'immunsystem': ['immunsystem', 'immun', 'erkältung', 'abwehr'],
          'gedächtnis': ['memoria', 'gedächtnis', 'konzentration', 'fokus'],
          'gewicht': ['peso', 'gewicht', 'abnehmen', 'stoffwechsel'],
        };
        
        // Finde passende Kategorien basierend auf Summary
        const matchedCategories: string[] = [];
        Object.entries(keywordMap).forEach(([category, categoryKeywords]) => {
          if (categoryKeywords.some(kw => summary.includes(kw))) {
            matchedCategories.push(category);
          }
        });
        
        // Wenn keine Keywords gefunden wurden, keine Videos anzeigen
        if (keywords.length === 0 && matchedCategories.length === 0) {
          setRelatedVideos([]);
          return;
        }
        
        // Filter Videos
        const filtered = videos.filter((v: any) => {
          const videoTags = (v.tags || []).map((t: string) => t.toLowerCase());
          const videoCategory = (v.category || '').toLowerCase();
          
          // Check gegen Keywords
          const keywordMatch = keywords.some(kw => 
            videoTags.some((tag: string) => tag.includes(kw) || kw.includes(tag)) ||
            videoCategory.includes(kw)
          );
          
          // Check gegen matched Categories
          const categoryMatch = matchedCategories.some(cat => 
            videoCategory.includes(cat) || 
            videoTags.some((tag: string) => tag.includes(cat))
          );
          
          return keywordMatch || categoryMatch;
        });
        
        setRelatedVideos(filtered.slice(0, 3));
      }
    } catch (e) {
      console.error('Load videos error:', e);
    }
  };

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
        <Text style={styles.headerTitle}>{t(lang, 'results_title', translations)}</Text>
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

        {/* Related Videos Section */}
        {relatedVideos.length > 0 && (
          <VideosSection 
            videos={relatedVideos} 
            lang={lang}
            title={lang === 'de' ? 'Passende Videos' : 'Video correlati'}
          />
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerFooter}>
          <MaterialCommunityIcons name="information-outline" size={14} color="#8FA39B" />
          <Text style={styles.disclaimerText}>
            {analysis.disclaimer_short || t(lang, 'disclaimer_footer', translations)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
