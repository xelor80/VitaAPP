import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '../../src/LangContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 16 * 2 - 12) / 2;

const tx = (lang: string, m: Record<string, string>) => m[lang] || m.de || m.en || '';

export default function RecipesTab() {
  const router = useRouter();
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState<'personal' | 'all'>('personal');
  const [personalRecipes, setPersonalRecipes] = useState<any[]>([]);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [loadingPersonal, setLoadingPersonal] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem('health_profile_id');
      setProfileId(id);
    })();
  }, []);

  // Load personalized recipes
  useEffect(() => {
    if (!profileId) { setLoadingPersonal(false); return; }
    (async () => {
      setLoadingPersonal(true);
      try {
        const res = await fetch(`${API_URL}/api/recipes/personalized/${profileId}?lang=${lang}`);
        if (res.ok) {
          const d = await res.json();
          const all = d.recipes || [];
          setPersonalRecipes(all.filter((r: any) => r.relevance_score > 0));
        }
      } catch {} finally { setLoadingPersonal(false); }
    })();
  }, [profileId, lang]);

  // Load all recipes (lazy - only when tab switched)
  useEffect(() => {
    if (activeTab !== 'all' || allRecipes.length > 0) return;
    (async () => {
      setLoadingAll(true);
      try {
        const res = await fetch(`${API_URL}/api/recipes?lang=${lang}`);
        if (res.ok) {
          const d = await res.json();
          setAllRecipes(Array.isArray(d) ? d : (d.recipes || []));
        }
      } catch {} finally { setLoadingAll(false); }
    })();
  }, [activeTab, lang]);

  // Reset allRecipes when lang changes
  useEffect(() => { setAllRecipes([]); }, [lang]);

  const recipes = activeTab === 'personal' ? personalRecipes : allRecipes;
  const loading = activeTab === 'personal' ? loadingPersonal : loadingAll;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#1B6B45', '#2E9E6B', '#43C68A']} style={s.header}>
        <Text style={s.headerTitle}>
          {tx(lang, { de: 'Deine Rezepte', it: 'Le tue ricette', en: 'Your Recipes' })}
        </Text>
        <Text style={s.headerSub}>
          {tx(lang, { de: 'Gesund & lecker', it: 'Sano e gustoso', en: 'Healthy & delicious' })}
        </Text>
      </LinearGradient>

      {/* Tab Switcher */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'personal' && s.tabActive]}
          onPress={() => setActiveTab('personal')}
          data-testid="tab-personal-recipes"
        >
          <MaterialCommunityIcons
            name="star-outline"
            size={16}
            color={activeTab === 'personal' ? '#1B6B45' : '#6B7280'}
          />
          <Text style={[s.tabText, activeTab === 'personal' && s.tabTextActive]}>
            {tx(lang, { de: 'Fuer dich', it: 'Per te', en: 'For you' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'all' && s.tabActive]}
          onPress={() => setActiveTab('all')}
          data-testid="tab-all-recipes"
        >
          <MaterialCommunityIcons
            name="book-open-outline"
            size={16}
            color={activeTab === 'all' ? '#1B6B45' : '#6B7280'}
          />
          <Text style={[s.tabText, activeTab === 'all' && s.tabTextActive]}>
            {tx(lang, { de: 'Alle Rezepte', it: 'Tutte le ricette', en: 'All Recipes' })}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#2E7D52" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
          {recipes.map((r: any, i: number) => (
            <TouchableOpacity
              key={r.id || i}
              style={s.card}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/recipe', params: { id: r.id } } as any)}
              data-testid={`recipe-grid-${i}`}
            >
              {r.image_url ? (
                <Image source={{ uri: r.image_url }} style={s.cardImg} />
              ) : (
                <View style={[s.cardImg, { backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialCommunityIcons name="food-variant" size={32} color="#2E7D52" />
                </View>
              )}
              <View style={s.cardInfo}>
                <Text style={s.cardTitle} numberOfLines={2}>{r.title || r[`title_${lang}`] || r.title_de || ''}</Text>
                {activeTab === 'personal' && r.recommendation_reason ? (
                  <Text style={s.reasonText} numberOfLines={2}>{r.recommendation_reason}</Text>
                ) : activeTab === 'personal' && r.relevance_tags?.length > 0 ? (
                  <View style={s.tagRow}>
                    {r.relevance_tags.slice(0, 2).map((tag: string, ti: number) => (
                      <View key={ti} style={s.relevanceChip}>
                        <Text style={s.relevanceChipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={s.cardTag} numberOfLines={1}>{r[`category_${lang}`] || r.category_de || ''}</Text>
                )}
              </View>
              {activeTab === 'personal' && r.relevance_score > 0 && (
                <View style={s.scoreBadge}>
                  <MaterialCommunityIcons name="heart" size={10} color="#FFF" />
                  <Text style={s.scoreBadgeText}>{tx(lang, { de: 'Fuer dich', it: 'Per te', en: 'For you' })}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          {recipes.length === 0 && (
            <View style={s.emptyState}>
              <MaterialCommunityIcons name="food-off" size={60} color="#D1D5DB" />
              <Text style={s.emptyText}>
                {activeTab === 'personal'
                  ? tx(lang, { de: 'Erstelle ein Gesundheitsprofil fuer personalisierte Rezepte', it: 'Crea un profilo per ricette personalizzate', en: 'Create a health profile for personalized recipes' })
                  : tx(lang, { de: 'Keine Rezepte vorhanden', it: 'Nessuna ricetta', en: 'No recipes available' })
                }
              </Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#1B6B45', fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  card: {
    width: CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardImg: { width: '100%', height: 110 },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A2E35', lineHeight: 18 },
  cardTag: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  reasonText: { fontSize: 11, color: '#1B6B45', fontStyle: 'italic', marginTop: 4, lineHeight: 15 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  relevanceChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  relevanceChipText: { fontSize: 10, fontWeight: '600', color: '#2E9E6B' },
  scoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2E9E6B',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  scoreBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  emptyState: { width: '100%', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#9CA3AF', marginTop: 12, textAlign: 'center', paddingHorizontal: 40 },
});
