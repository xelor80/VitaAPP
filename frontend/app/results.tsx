import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  ActivityIndicator, Linking, Image, useWindowDimensions, Platform
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentAnalysis } from '../src/store';
import { useLang } from '../src/LangContext';
import { t } from '../src/i18n';

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
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={18}
                  color={active ? '#FFFFFF' : '#5C7A6F'}
                />
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
        {activeTab === 'recipes' && <RecipesTab analysis={analysis} router={router} lang={lang} />}

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

// ==================== TAB COMPONENTS ====================

function OverviewTab({ analysis, onShopPress, lang }: { analysis: any; onShopPress: (id: string, url: string) => void; lang: string }) {
  const featuredProduct = analysis.brand_products?.[0];
  return (
    <View>
      {/* Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="text-box-outline" size={20} color="#4A8B71" />
          <Text style={styles.cardTitle}>{lang === 'it' ? 'Riepilogo' : 'Zusammenfassung'}</Text>
        </View>
        <Text style={styles.cardBody}>{analysis.summary}</Text>
      </View>

      {/* Red Flags */}
      {analysis.red_flags?.map((rf: any, i: number) => (
        <View key={i} testID={`red-flag-${i}`} style={styles.redFlagCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#D9534F" />
            <Text style={[styles.cardTitle, { color: '#D9534F' }]}>{rf.flag}</Text>
          </View>
          <Text style={styles.cardBody}>{rf.action}</Text>
        </View>
      ))}

      {/* Quick Info */}
      {analysis.nutrition_tips?.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#4A8B71" />
            <Text style={styles.cardTitle}>{t(lang, 'quick_tips')}</Text>
          </View>
          {analysis.nutrition_tips.slice(0, 3).map((tip: string, i: number) => (
            <View key={i} style={styles.tipRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Featured Product on Overview */}
      {featuredProduct && !analysis.red_flags?.length && (
        <View style={styles.featuredProductCard}>
          <View style={styles.featuredHeader}>
            <MaterialCommunityIcons name="star-outline" size={18} color="#4A8B71" />
            <Text style={styles.featuredLabel}>{lang === 'de' ? 'Passend für Sie' : 'Adatto a te'}</Text>
            <Text style={styles.featuredAdLabel}>{lang === 'de' ? 'Werbung' : 'Pubblicità'}</Text>
          </View>
          <View style={styles.featuredContent}>
            {featuredProduct.image_url ? (
              <Image
                source={{ uri: featuredProduct.image_url }}
                style={styles.featuredImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.featuredImage, styles.featuredImagePlaceholder]}>
                <MaterialCommunityIcons name="package-variant-closed" size={32} color="#4A8B71" />
              </View>
            )}
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredName}>{featuredProduct.name}</Text>
              {featuredProduct.price ? <Text style={styles.featuredPrice}>{featuredProduct.price}</Text> : null}
              <Text style={styles.featuredReason} numberOfLines={2}>{featuredProduct.reason}</Text>
              {featuredProduct.rating ? (
                <View style={styles.ratingRow}>
                  <MaterialCommunityIcons name="star" size={14} color="#F5A623" />
                  <Text style={styles.ratingText}>{featuredProduct.rating}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            testID={`featured-shop-btn-${featuredProduct.product_id}`}
            style={styles.featuredShopBtn}
            activeOpacity={0.7}
            onPress={() => onShopPress(featuredProduct.product_id, featuredProduct.affiliate_url)}
          >
            <MaterialCommunityIcons name="open-in-new" size={16} color="#FFFFFF" />
            <Text style={styles.shopBtnText}>  {t(lang, 'shop_link')}</Text>
          </TouchableOpacity>
          {featuredProduct.video_url ? (
            <TouchableOpacity
              data-testid={`video-btn-${featuredProduct.product_id}`}
              style={styles.videoBtn}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(featuredProduct.video_url)}
            >
              <MaterialCommunityIcons name="play-circle-outline" size={16} color="#D9534F" />
              <Text style={styles.videoBtnText}>  {t(lang, 'watch_video')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

function SupplementsTab({ analysis, onShopPress, lang }: { analysis: any; onShopPress: (id: string, url: string) => void; lang: string }) {
  return (
    <View>
      {/* Supplement Info */}
      {analysis.supplements_general_info?.map((s: any, i: number) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="pill" size={20} color="#2C5F78" />
            <Text style={styles.cardTitle}>{s.nutrient}</Text>
            <View style={[styles.badge, s.evidence_level === 'high' ? styles.badgeHigh : s.evidence_level === 'medium' ? styles.badgeMed : styles.badgeLow]}>
              <Text style={styles.badgeText}>{s.evidence_level === 'high' ? 'Stark' : s.evidence_level === 'medium' ? 'Mittel' : 'Gering'}</Text>
            </View>
          </View>
          <Text style={styles.cardBody}>{s.why}</Text>
          {s.cautions ? (
            <View style={styles.cautionRow}>
              <MaterialCommunityIcons name="alert-outline" size={14} color="#D9534F" />
              <Text style={styles.cautionText}>{s.cautions}</Text>
            </View>
          ) : null}
          {s.food_sources?.length > 0 && (
            <View style={styles.sourcesWrap}>
              <Text style={styles.sourcesLabel}>{t(lang, 'natural_sources')}:</Text>
              <Text style={styles.sourcesText}>{s.food_sources.join(', ')}</Text>
            </View>
          )}
        </View>
      ))}

      {/* Brand Products */}
      {analysis.brand_products?.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Passende Produkte</Text>
          <Text style={styles.sectionSubtitle}>{lang === 'de' ? 'Von Joachim Kaeser (Werbung)' : 'Di Joachim Kaeser (Pubblicità)'}</Text>
        </View>
      )}
      {analysis.brand_products?.map((p: any, i: number) => (
        <View key={i} testID={`product-card-${p.product_id}`} style={styles.productCard}>
          <View style={styles.productTop}>
            {p.image_url ? (
              <Image source={{ uri: p.image_url }} style={styles.productImage} resizeMode="contain" />
            ) : (
              <View style={styles.productIcon}>
                <MaterialCommunityIcons name="package-variant-closed" size={24} color="#4A8B71" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{p.name}</Text>
              <View style={styles.productPriceRow}>
                {p.price ? <Text style={styles.productPrice}>{p.price}</Text> : null}
                {p.rating ? (
                  <View style={styles.ratingRow}>
                    <MaterialCommunityIcons name="star" size={13} color="#F5A623" />
                    <Text style={styles.ratingText}>{p.rating}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          <Text style={styles.productReason}>{p.reason}</Text>
          {p.note ? <Text style={styles.productNote}>{p.note}</Text> : null}
          <TouchableOpacity
            testID={`product-shop-btn-${p.product_id}`}
            style={styles.shopBtn}
            activeOpacity={0.7}
            onPress={() => onShopPress(p.product_id, p.affiliate_url)}
          >
            <MaterialCommunityIcons name="open-in-new" size={16} color="#FFFFFF" />
            <Text style={styles.shopBtnText}>  Zum Shop</Text>
          </TouchableOpacity>
        </View>
      ))}

      {analysis.brand_products?.length === 0 && analysis.supplements_general_info?.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="pill" size={40} color="#8FA39B" />
          <Text style={styles.emptyStateText}>Keine Supplement-Informationen verfügbar</Text>
        </View>
      )}
    </View>
  );
}

function NutritionTab({ analysis, onShopPress, lang }: { analysis: any; onShopPress: (id: string, url: string) => void; lang: string }) {
  const schedule = analysis.supplement_schedule || [];
  const TIME_ICONS: Record<string, string> = {
    'Morgens': 'weather-sunset-up',
    'Mittags': 'white-balance-sunny',
    'Abends': 'weather-sunset-down',
    'Vor dem Schlafen': 'weather-night',
  };
  const TIME_COLORS: Record<string, string> = {
    'Morgens': '#FF9800',
    'Mittags': '#F5C842',
    'Abends': '#E8845C',
    'Vor dem Schlafen': '#7986CB',
  };

  return (
    <View>
      {/* Supplement Schedule */}
      {schedule.length > 0 && (
        <View style={styles.scheduleSection}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#4A8B71" />
            <Text style={styles.cardTitle}>{t(lang, 'schedule_title')}</Text>
          </View>
          <Text style={styles.scheduleSubtitle}>{t(lang, 'schedule_subtitle')}</Text>

          {schedule.map((item: any, i: number) => {
            const timeKey = Object.keys(TIME_ICONS).find(k => item.time?.includes(k)) || 'Morgens';
            const iconName = TIME_ICONS[timeKey] || 'clock-outline';
            const iconColor = TIME_COLORS[timeKey] || '#4A8B71';
            return (
              <View key={i} testID={`schedule-item-${i}`} style={styles.scheduleCard}>
                <View style={styles.scheduleLeft}>
                  <View style={[styles.scheduleTimeIcon, { backgroundColor: iconColor + '20' }]}>
                    <MaterialCommunityIcons name={iconName as any} size={22} color={iconColor} />
                  </View>
                  <Text style={[styles.scheduleTime, { color: iconColor }]}>{item.time}</Text>
                </View>
                <View style={styles.scheduleRight}>
                  <View style={styles.scheduleProductRow}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.scheduleProductImg} resizeMode="contain" />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleProductName}>{item.product_name}</Text>
                      <Text style={styles.scheduleDosage}>{item.dosage}</Text>
                    </View>
                  </View>
                  {item.instruction ? (
                    <Text style={styles.scheduleInstruction}>{item.instruction}</Text>
                  ) : null}
                  {item.application_instructions ? (
                    <View style={styles.officialInstructionRow}>
                      <MaterialCommunityIcons name="information-outline" size={13} color="#2C5F78" />
                      <Text style={styles.officialInstructionText}>{item.application_instructions}</Text>
                    </View>
                  ) : null}
                  {item.affiliate_url ? (
                    <TouchableOpacity
                      testID={`schedule-shop-${i}`}
                      style={styles.scheduleShopLink}
                      onPress={() => onShopPress(item.product_id || '', item.affiliate_url)}
                    >
                      <MaterialCommunityIcons name="open-in-new" size={13} color="#4A8B71" />
                      <Text style={styles.scheduleShopText}>  {t(lang, 'shop_link')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}

          <View style={styles.scheduleCaution}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#D9534F" />
            <Text style={styles.scheduleCautionText}>
              {t(lang, 'schedule_disclaimer')}
            </Text>
          </View>
        </View>
      )}

      {/* Nutrition Tips */}
      {analysis.nutrition_tips?.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="food-apple-outline" size={20} color="#4A8B71" />
            <Text style={styles.cardTitle}>{t(lang, 'nutrition_tips_title')}</Text>
          </View>
          {analysis.nutrition_tips.map((tip: string, i: number) => (
            <View key={i} style={styles.nutritionTipCard}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.nutritionTipText}>{tip}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="food-apple-outline" size={40} color="#8FA39B" />
          <Text style={styles.emptyStateText}>Keine Ernährungstipps verfügbar</Text>
        </View>
      )}
    </View>
  );
}

function RecipesTab({ analysis, router, lang }: { analysis: any; router: any; lang: string }) {
  const [catalogRecipes, setCatalogRecipes] = React.useState<any[]>([]);
  const [expandedRecipe, setExpandedRecipe] = React.useState<string | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = screenWidth - 32; // account for content padding

  React.useEffect(() => {
    const inputTags = analysis?.input_tags || [];
    const tagParam = inputTags.join(',');
    fetch(`${API_URL}/api/recipes?lang=${lang}${tagParam ? `&tags=${tagParam}` : ''}`)
      .then(r => r.json())
      .then(data => setCatalogRecipes(data))
      .catch(() => {});
  }, [lang, analysis?.input_tags]);

  // LLM recipes first, then matching catalog recipes (no duplicates)
  const llmRecipes = analysis.recipes || [];
  const allRecipes = [...llmRecipes];
  for (const cr of catalogRecipes) {
    if (!allRecipes.find((r: any) => r.id === cr.id || r.title === cr.title)) {
      allRecipes.push(cr);
    }
  }

  if (!allRecipes.length) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="chef-hat" size={40} color="#8FA39B" />
        <Text style={styles.emptyStateText}>{lang === 'de' ? 'Keine Rezepte verfügbar' : 'Nessuna ricetta disponibile'}</Text>
      </View>
    );
  }

  return (
    <View>
      {allRecipes.map((recipe: any, i: number) => {
        const isExpanded = expandedRecipe === (recipe.id || `r${i}`);
        return (
          <TouchableOpacity
            key={recipe.id || i}
            testID={`recipe-card-${i}`}
            style={styles.recipeCard}
            activeOpacity={0.7}
            onPress={() => setExpandedRecipe(isExpanded ? null : (recipe.id || `r${i}`))}
          >
            {recipe.image_url ? (
              <ExpoImage source={{ uri: recipe.image_url }} style={{ width: imageWidth, height: 180 }} contentFit="cover" />
            ) : null}
            <View style={styles.recipeContent}>
              <Text style={styles.recipeTitle}>{recipe.title}</Text>
              <View style={styles.recipeMeta}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#5C7A6F" />
                <Text style={styles.recipeTime}> {recipe.time_min} Min.</Text>
                <Text style={styles.recipeDot}>·</Text>
                <Text style={styles.recipeIngCount}>{recipe.ingredients?.length || 0} {lang === 'de' ? 'Zutaten' : 'Ingredienti'}</Text>
              </View>
              {recipe.tags?.length > 0 && (
                <View style={styles.recipeTagsRow}>
                  {recipe.tags.slice(0, 3).map((tag: string, j: number) => (
                    <View key={j} style={styles.recipeTag}>
                      <Text style={styles.recipeTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            {isExpanded && (
              <View style={styles.recipeDetail}>
                {recipe.ingredients?.length > 0 && (
                  <View style={styles.recipeSection}>
                    <Text style={styles.recipeSectionTitle}>{lang === 'de' ? 'Zutaten' : 'Ingredienti'}</Text>
                    {recipe.ingredients.map((ing: string, j: number) => (
                      <View key={j} style={styles.recipeIngRow}>
                        <MaterialCommunityIcons name="circle-small" size={18} color="#4A8B71" />
                        <Text style={styles.recipeIngText}>{ing}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {recipe.steps?.length > 0 && (
                  <View style={styles.recipeSection}>
                    <Text style={styles.recipeSectionTitle}>{lang === 'de' ? 'Zubereitung' : 'Preparazione'}</Text>
                    {recipe.steps.map((step: string, j: number) => (
                      <View key={j} style={styles.recipeStepRow}>
                        <View style={styles.recipeStepNum}>
                          <Text style={styles.recipeStepNumText}>{j + 1}</Text>
                        </View>
                        <Text style={styles.recipeStepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F9F6' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },

  // Header
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E6E2',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26' },

  // Red Flag Banner
  redFlagBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF2F2',
    padding: 14, marginHorizontal: 16, marginTop: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#F5C6CB',
  },
  redFlagTitle: { fontSize: 15, fontWeight: '700', color: '#D9534F' },
  redFlagText: { fontSize: 13, color: '#721C24', marginTop: 2, lineHeight: 18 },

  // Tabs
  tabBar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E6E2' },
  tabScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: '#F7F9F6', gap: 6,
  },
  tabActive: { backgroundColor: '#4A8B71' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#5C7A6F' },
  tabTextActive: { color: '#FFFFFF' },

  // Cards
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26', flex: 1 },
  cardBody: { fontSize: 15, color: '#1A2D26', lineHeight: 22 },

  // Red flag card
  redFlagCard: {
    backgroundColor: '#FDF2F2', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F5C6CB',
  },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  tipText: { fontSize: 14, color: '#1A2D26', flex: 1, lineHeight: 20 },

  // Badge
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeHigh: { backgroundColor: '#E8F5E9' },
  badgeMed: { backgroundColor: '#FFF3E0' },
  badgeLow: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#1A2D26' },

  // Caution
  cautionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10,
    backgroundColor: '#FDF2F2', borderRadius: 8, padding: 10,
  },
  cautionText: { fontSize: 13, color: '#D9534F', flex: 1, lineHeight: 18 },

  // Sources
  sourcesWrap: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  sourcesLabel: { fontSize: 13, fontWeight: '600', color: '#5C7A6F' },
  sourcesText: { fontSize: 13, color: '#5C7A6F' },

  // Section
  sectionHeader: { marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26' },
  sectionSubtitle: { fontSize: 13, color: '#8FA39B', marginTop: 2 },

  // Product Card
  productCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E0E6E2',
  },
  productTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  productIcon: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  productImage: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: '#F7F9F6',
  },
  productName: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: '600', color: '#4A8B71' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#5C7A6F' },
  productReason: { fontSize: 14, color: '#5C7A6F', lineHeight: 20, marginBottom: 4 },
  productNote: { fontSize: 13, color: '#8FA39B', fontStyle: 'italic', marginBottom: 10 },
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2C5F78', borderRadius: 20, paddingVertical: 12, marginTop: 4,
  },
  shopBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Nutrition
  nutritionTipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14,
  },
  tipNumber: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  tipNumberText: { fontSize: 14, fontWeight: '700', color: '#4A8B71' },
  nutritionTipText: { fontSize: 15, color: '#1A2D26', flex: 1, lineHeight: 22 },

  // Recipes
  recipeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  recipeImage: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  } as any,
  recipeImageWrap: {
    height: 180, backgroundColor: '#E8F5E9', overflow: 'hidden',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  } as any,
  recipeContent: { padding: 14 },
  recipeTitle: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  recipeTime: { fontSize: 13, color: '#5C7A6F' },
  recipeDot: { fontSize: 13, color: '#8FA39B', marginHorizontal: 6 },
  recipeIngCount: { fontSize: 13, color: '#5C7A6F' },
  recipeTagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  recipeTag: { backgroundColor: '#E8F5E9', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  recipeTagText: { fontSize: 12, fontWeight: '600', color: '#2C5F78' },
  // Recipe detail (expanded)
  recipeDetail: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: '#F0F4F1',
  },
  recipeSection: { marginTop: 12 },
  recipeSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A2D26', marginBottom: 8 },
  recipeIngRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  recipeIngText: { fontSize: 14, color: '#1A2D26', flex: 1 },
  recipeStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  recipeStepNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  recipeStepNumText: { fontSize: 12, fontWeight: '700', color: '#4A8B71' },
  recipeStepText: { fontSize: 14, color: '#1A2D26', flex: 1, lineHeight: 20 },

  // Empty states
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyStateText: { fontSize: 15, color: '#8FA39B' },
  emptyText: { fontSize: 16, color: '#8FA39B', marginTop: 12 },
  linkBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  linkBtnText: { fontSize: 16, color: '#4A8B71', fontWeight: '600' },

  // Disclaimer footer
  disclaimerFooter: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 16,
    paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#E0E6E2',
  },
  disclaimerText: { fontSize: 12, color: '#8FA39B', flex: 1, lineHeight: 18 },

  // Featured Product on Overview
  featuredProductCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#D4E7DC',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  featuredHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  featuredLabel: { fontSize: 14, fontWeight: '700', color: '#4A8B71', flex: 1 },
  featuredAdLabel: {
    fontSize: 10, fontWeight: '700', color: '#8FA39B',
    borderWidth: 1, borderColor: '#D0D5D2', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  featuredContent: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  featuredImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F7F9F6' },
  featuredImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  featuredInfo: { flex: 1 },
  featuredName: { fontSize: 16, fontWeight: '700', color: '#1A2D26', marginBottom: 2 },
  featuredPrice: { fontSize: 15, fontWeight: '700', color: '#4A8B71', marginBottom: 4 },
  featuredReason: { fontSize: 13, color: '#5C7A6F', lineHeight: 18 },
  featuredShopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4A8B71', borderRadius: 20, paddingVertical: 12,
  },
  videoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF0F0', borderRadius: 20, paddingVertical: 10, marginTop: 6,
    borderWidth: 1, borderColor: '#F5D0D0',
  },
  videoBtnText: { fontSize: 13, fontWeight: '600', color: '#D9534F' },

  // Schedule styles
  scheduleSection: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
  },
  scheduleSubtitle: { fontSize: 13, color: '#8FA39B', marginBottom: 14, marginTop: -4 },
  scheduleCard: {
    flexDirection: 'row', marginBottom: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F4F1',
  },
  scheduleLeft: { alignItems: 'center', width: 72, gap: 6 },
  scheduleTimeIcon: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
  scheduleTime: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  scheduleRight: { flex: 1, marginLeft: 10 },
  scheduleProductRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  scheduleProductImg: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F7F9F6' },
  scheduleProductName: { fontSize: 15, fontWeight: '700', color: '#1A2D26' },
  scheduleDosage: { fontSize: 14, fontWeight: '600', color: '#4A8B71', marginTop: 1 },
  scheduleInstruction: { fontSize: 13, color: '#5C7A6F', marginTop: 4, lineHeight: 18 },
  officialInstructionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6,
    backgroundColor: '#EFF6FB', borderRadius: 8, padding: 8,
  },
  officialInstructionText: { fontSize: 12, color: '#2C5F78', flex: 1, lineHeight: 17, fontStyle: 'italic' },
  scheduleShopLink: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6,
  },
  scheduleShopText: { fontSize: 13, fontWeight: '600', color: '#4A8B71' },
  scheduleCaution: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4,
    backgroundColor: '#FFF8F0', borderRadius: 10, padding: 10,
  },
  scheduleCautionText: { fontSize: 12, color: '#D9534F', flex: 1, lineHeight: 18 },
});
