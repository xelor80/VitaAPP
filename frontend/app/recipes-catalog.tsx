import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput, ActivityIndicator, Image, useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '../src/LangContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const CARD_GAP = 10;

const TEXTS = {
  de: {
    title: 'Deine Rezepte',
    subtitle: 'Gesunde Rezepte entdecken',
    searchPlaceholder: 'Rezept suchen...',
    categories: 'Kategorien',
    tags: 'Tags',
    time: 'Zubereitungszeit',
    allCategories: 'Alle',
    ingredients: 'Zutaten',
    preparation: 'Zubereitung',
    minutes: 'Min.',
    minFull: 'Minuten',
    noResults: 'Keine Rezepte gefunden',
    noResultsSub: 'Versuchen Sie andere Suchbegriffe oder Filter.',
    resetFilters: 'Filter zurücksetzen',
    quick: 'Schnell',
    medium: 'Mittel',
    long: 'Aufwändig',
    recipes: 'Rezepte',
    easy: 'Einfach',
    medium_diff: 'Medium',
    hard: 'Aufwändig',
    recommended: 'Für dich empfohlen',
    allRecipes: 'Alle Rezepte',
  },
  it: {
    title: 'Le tue Ricette',
    subtitle: 'Scopri ricette salutari',
    searchPlaceholder: 'Cerca ricetta...',
    categories: 'Categorie',
    tags: 'Tag',
    time: 'Tempo di preparazione',
    allCategories: 'Tutte',
    ingredients: 'Ingredienti',
    preparation: 'Preparazione',
    minutes: 'Min.',
    minFull: 'Minuti',
    noResults: 'Nessuna ricetta trovata',
    noResultsSub: 'Prova altri termini di ricerca o filtri.',
    resetFilters: 'Reimposta filtri',
    quick: 'Veloce',
    medium: 'Medio',
    long: 'Elaborato',
    recipes: 'Ricette',
    easy: 'Facile',
    medium_diff: 'Medio',
    hard: 'Elaborato',
    recommended: 'Consigliato per te',
    allRecipes: 'Tutte le ricette',
  },
};

type TimeFilter = null | 'quick' | 'medium' | 'long';

const REASON_LABELS: Record<string, Record<string, string>> = {
  de: {
    fatigue: 'Gegen Müdigkeit', headache: 'Gegen Kopfschmerzen', digestive: 'Für die Verdauung',
    joint_pain: 'Für die Gelenke', muscle_pain: 'Gegen Muskelschmerzen', skin_problems: 'Für Haut & Haare',
    concentration: 'Für Konzentration', mood_swings: 'Gegen Stimmungsschwankungen',
    anxiety_symptoms: 'Gegen Stress', sleep_problems: 'Für besseren Schlaf',
    immune_weakness: 'Für das Immunsystem', cold_hands_feet: 'Für die Durchblutung',
  },
  it: {
    fatigue: 'Contro la stanchezza', headache: 'Contro il mal di testa', digestive: 'Per la digestione',
    joint_pain: 'Per le articolazioni', muscle_pain: 'Contro i dolori', skin_problems: 'Per pelle e capelli',
    concentration: 'Per la concentrazione', mood_swings: 'Contro gli sbalzi',
    anxiety_symptoms: 'Contro stress', sleep_problems: 'Per dormire meglio',
    immune_weakness: 'Per il sistema immunitario', cold_hands_feet: 'Per la circolazione',
  },
};

function getDifficulty(time: number, tx: typeof TEXTS['de']) {
  if (time <= 10) return tx.easy;
  if (time <= 25) return tx.medium_diff;
  return tx.hard;
}

function RecipeCard({ recipe, tx, onPress, cardWidth }: { recipe: any; tx: typeof TEXTS['de']; onPress: () => void; cardWidth: number }) {
  const difficulty = getDifficulty(recipe.time_min || 15, tx);
  const ingCount = recipe.ingredients?.length || 0;

  return (
    <TouchableOpacity
      style={[s.card, { width: cardWidth }]}
      activeOpacity={0.85}
      onPress={onPress}
      data-testid={`recipe-card-${recipe.id}`}
    >
      <Image
        source={{ uri: recipe.image_url || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&h=300&fit=crop' }}
        style={[s.cardImage, { height: cardWidth * 0.7 }]}
        resizeMode="cover"
      />
      <View style={s.cardBody}>
        <View style={s.badgeRow}>
          <View style={s.badge}>
            <MaterialCommunityIcons name="chef-hat" size={13} color="#D4930D" />
            <Text style={s.badgeText}>{difficulty}</Text>
          </View>
          <View style={s.badge}>
            <MaterialCommunityIcons name="clock-outline" size={13} color="#D4930D" />
            <Text style={s.badgeText}>{recipe.time_min} {tx.minFull}</Text>
          </View>
        </View>
        <Text style={s.cardTitle} numberOfLines={2}>{recipe.title}</Text>
        <View style={s.cardFooter}>
          <MaterialCommunityIcons name="food-apple-outline" size={14} color="#D4930D" />
          <Text style={s.footerText}>{ingCount} {tx.ingredients}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RecipesCatalogScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const tx = TEXTS[lang] || TEXTS.de;
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, 480);
  const cardWidth = (contentWidth - 32 - CARD_GAP) / 2;

  const [recipes, setRecipes] = useState<any[]>([]);
  const [allRecipes, setAllRecipes] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setRecsLoading(true);
      try {
        const profileId = await AsyncStorage.getItem('health_profile_id');
        const params = new URLSearchParams({ lang, limit: '4' });
        if (profileId) params.set('profile_id', profileId);
        const res = await fetch(`${API_URL}/api/recipes/recommendations?${params}`);
        if (res.ok) setRecommendations(await res.json());
      } catch {}
      setRecsLoading(false);
    })();
  }, [lang]);

  useEffect(() => {
    fetch(`${API_URL}/api/recipes/filters?lang=${lang}`)
      .then(r => r.json()).then(setFilters).catch(() => {});
  }, [lang]);

  // Load ALL recipes once for "Alle Rezepte" section
  useEffect(() => {
    fetch(`${API_URL}/api/recipes?lang=${lang}`)
      .then(r => r.json()).then(setAllRecipes).catch(() => setAllRecipes([]));
  }, [lang]);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams({ lang });
    if (searchText.trim()) params.set('search', searchText.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    if (timeFilter === 'quick') params.set('max_time', '10');
    else if (timeFilter === 'medium') params.set('max_time', '20');
    else if (timeFilter === 'long') params.set('max_time', '60');
    fetch(`${API_URL}/api/recipes?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        let filtered = data;
        if (selectedTags.length > 0) {
          filtered = data.filter((r: any) =>
            selectedTags.some(t => r.tags?.map((x: string) => x.toLowerCase()).includes(t.toLowerCase()))
          );
        }
        setRecipes(filtered);
      })
      .catch(() => setRecipes([]))
      .finally(() => setIsLoading(false));
  }, [lang, searchText, selectedCategory, timeFilter, selectedTags]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchText(''); setSelectedCategory(null); setSelectedTags([]); setTimeFilter(null);
  }, []);

  const hasActiveFilters = searchText || selectedCategory || selectedTags.length > 0 || timeFilter;

  const openRecipe = (recipe: any) => {
    router.push({ pathname: '/recipe', params: { id: recipe.id } });
  };

  const renderGrid = (items: any[]) => {
    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(
        <View key={i} style={s.gridRow}>
          <RecipeCard recipe={items[i]} tx={tx} onPress={() => openRecipe(items[i])} cardWidth={cardWidth} />
          {items[i + 1] ? (
            <RecipeCard recipe={items[i + 1]} tx={tx} onPress={() => openRecipe(items[i + 1])} cardWidth={cardWidth} />
          ) : (
            <View style={{ width: cardWidth }} />
          )}
        </View>
      );
    }
    return rows;
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.headerBar}>
        <TouchableOpacity data-testid="catalog-back-btn" onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{tx.title}</Text>
          <Text style={s.headerSub}>
            {hasActiveFilters ? `${recipes.length} ${tx.recipes}` : tx.subtitle}
          </Text>
        </View>
        {hasActiveFilters && (
          <TouchableOpacity data-testid="reset-filters-btn" onPress={resetFilters} style={s.resetBtn}>
            <MaterialCommunityIcons name="filter-remove" size={20} color="#D9534F" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color="#8FA39B" style={{ marginRight: 8 }} />
        <TextInput
          data-testid="recipe-search-input"
          style={s.searchInput}
          placeholder={tx.searchPlaceholder}
          placeholderTextColor="#8FA39B"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity data-testid="clear-search-btn" onPress={() => setSearchText('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#8FA39B" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Filters row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={s.chipRow}>
            {filters?.categories?.map((cat: any) => {
              const active = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  data-testid={`category-${cat.key}`}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setSelectedCategory(active ? null : cat.key)}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
            {(['quick', 'medium', 'long'] as TimeFilter[]).map(tf => {
              const active = timeFilter === tf;
              const label = tf === 'quick' ? `${tx.quick}` : tf === 'medium' ? `${tx.medium}` : `${tx.long}`;
              const icon = tf === 'quick' ? 'lightning-bolt' : tf === 'medium' ? 'clock-outline' : 'clock-alert-outline';
              return (
                <TouchableOpacity
                  key={tf}
                  data-testid={`time-filter-${tf}`}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setTimeFilter(active ? null : tf)}
                >
                  <MaterialCommunityIcons name={icon as any} size={13} color={active ? '#FFF' : '#4A8B71'} />
                  <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {isLoading && (
          <View style={s.loadingWrap}>
            <ActivityIndicator data-testid="catalog-loading" size="large" color="#4A8B71" />
          </View>
        )}

        {/* When filters active: show filtered results */}
        {!isLoading && hasActiveFilters && recipes.length === 0 && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="chef-hat" size={48} color="#8FA39B" />
            <Text style={s.emptyTitle}>{tx.noResults}</Text>
            <Text style={s.emptySub}>{tx.noResultsSub}</Text>
            <TouchableOpacity data-testid="empty-reset-btn" style={s.emptyResetBtn} onPress={resetFilters}>
              <MaterialCommunityIcons name="refresh" size={16} color="#4A8B71" />
              <Text style={s.emptyResetText}>{tx.resetFilters}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && hasActiveFilters && recipes.length > 0 && renderGrid(recipes)}

        {/* When no filters: show recommendations + all recipes */}
        {!isLoading && !hasActiveFilters && (
          <>
            {/* Personalized Recommendations */}
            {!recsLoading && recommendations.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <View style={s.sectionHeader}>
                  <MaterialCommunityIcons name="star-outline" size={18} color="#D4930D" />
                  <Text style={s.sectionTitle}>{tx.recommended}</Text>
                </View>
                {renderGrid(recommendations)}
              </View>
            )}

            {/* All Recipes */}
            {allRecipes.length > 0 && (
              <View>
                <View style={s.sectionHeader}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={18} color="#4A8B71" />
                  <Text style={s.sectionTitle}>{tx.allRecipes}</Text>
                  <Text style={s.sectionCount}>{allRecipes.length}</Text>
                </View>
                {renderGrid(allRecipes)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E8E8E8',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26' },
  headerSub: { fontSize: 12, color: '#8FA39B', marginTop: 1 },
  resetBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1A2D26', padding: 0 },
  content: { padding: 16, paddingBottom: 100 },

  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F5E9', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12,
  },
  chipActive: { backgroundColor: '#4A8B71' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#4A8B71' },
  chipTextActive: { color: '#FFF' },

  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A2D26', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#8FA39B', marginTop: 4, textAlign: 'center' },
  emptyResetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#E8F5E9' },
  emptyResetText: { fontSize: 14, fontWeight: '600', color: '#4A8B71' },

  // Grid
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },

  // Card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    backgroundColor: '#E8E8E8',
  },
  cardBody: {
    padding: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4930D',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2D26',
    lineHeight: 19,
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#8B8B8B',
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2D26',
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8FA39B',
    backgroundColor: '#F0F4F1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
