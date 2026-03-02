import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput, ActivityIndicator, Image, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '../src/LangContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
    noResults: 'Keine Rezepte gefunden',
    noResultsSub: 'Versuchen Sie andere Suchbegriffe oder Filter.',
    resetFilters: 'Filter zurücksetzen',
    quick: 'Schnell',
    medium: 'Mittel',
    long: 'Aufwändig',
    recipes: 'Rezepte',
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
    noResults: 'Nessuna ricetta trovata',
    noResultsSub: 'Prova altri termini di ricerca o filtri.',
    resetFilters: 'Reimposta filtri',
    quick: 'Veloce',
    medium: 'Medio',
    long: 'Elaborato',
    recipes: 'Ricette',
  },
};

type TimeFilter = null | 'quick' | 'medium' | 'long';

export default function RecipesCatalogScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const tx = TEXTS[lang] || TEXTS.de;

  const [recipes, setRecipes] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  // Load filters once
  useEffect(() => {
    fetch(`${API_URL}/api/recipes/filters?lang=${lang}`)
      .then(r => r.json())
      .then(data => setFilters(data))
      .catch(() => {});
  }, [lang]);

  // Load recipes with filters
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
        // Client-side tag filter
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
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const resetFilters = useCallback(() => {
    setSearchText('');
    setSelectedCategory(null);
    setSelectedTags([]);
    setTimeFilter(null);
  }, []);

  const hasActiveFilters = searchText || selectedCategory || selectedTags.length > 0 || timeFilter;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.headerBar}>
        <TouchableOpacity testID="catalog-back-btn" onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{tx.title}</Text>
          <Text style={s.headerSub}>{recipes.length} {tx.recipes}</Text>
        </View>
        {hasActiveFilters && (
          <TouchableOpacity testID="reset-filters-btn" onPress={resetFilters} style={s.resetBtn}>
            <MaterialCommunityIcons name="filter-remove" size={20} color="#D9534F" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color="#8FA39B" style={{ marginRight: 8 }} />
        <TextInput
          testID="recipe-search-input"
          style={s.searchInput}
          placeholder={tx.searchPlaceholder}
          placeholderTextColor="#8FA39B"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity testID="clear-search-btn" onPress={() => setSearchText('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#8FA39B" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Time Filter */}
        <View style={s.filterSection}>
          <Text style={s.filterLabel}>{tx.time}</Text>
          <View style={s.chipRow}>
            {(['quick', 'medium', 'long'] as TimeFilter[]).map(tf => {
              const active = timeFilter === tf;
              const label = tf === 'quick' ? `${tx.quick} (≤10 ${tx.minutes})` 
                : tf === 'medium' ? `${tx.medium} (≤20 ${tx.minutes})`
                : `${tx.long} (20+ ${tx.minutes})`;
              const icon = tf === 'quick' ? 'lightning-bolt' : tf === 'medium' ? 'clock-outline' : 'clock-alert-outline';
              return (
                <TouchableOpacity
                  key={tf}
                  testID={`time-filter-${tf}`}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setTimeFilter(active ? null : tf)}
                >
                  <MaterialCommunityIcons name={icon as any} size={14} color={active ? '#FFF' : '#4A8B71'} />
                  <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category Filter */}
        {filters?.categories?.length > 0 && (
          <View style={s.filterSection}>
            <Text style={s.filterLabel}>{tx.categories}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.chipRow}>
                <TouchableOpacity
                  testID="category-all-btn"
                  style={[s.chip, !selectedCategory && s.chipActive]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[s.chipText, !selectedCategory && s.chipTextActive]}>{tx.allCategories}</Text>
                </TouchableOpacity>
                {filters.categories.map((cat: any) => {
                  const active = selectedCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      testID={`category-${cat.key}`}
                      style={[s.chip, active && s.chipActive]}
                      onPress={() => setSelectedCategory(active ? null : cat.key)}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Tag Filter */}
        {filters?.tags?.length > 0 && (
          <View style={s.filterSection}>
            <Text style={s.filterLabel}>{tx.tags}</Text>
            <View style={s.chipWrap}>
              {filters.tags.map((tag: string) => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    testID={`tag-${tag}`}
                    style={[s.tagChip, active && s.tagChipActive]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[s.tagChipText, active && s.tagChipTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={s.loadingWrap}>
            <ActivityIndicator testID="catalog-loading" size="large" color="#4A8B71" />
          </View>
        )}

        {/* No Results */}
        {!isLoading && recipes.length === 0 && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="chef-hat" size={48} color="#8FA39B" />
            <Text style={s.emptyTitle}>{tx.noResults}</Text>
            <Text style={s.emptySub}>{tx.noResultsSub}</Text>
            {hasActiveFilters && (
              <TouchableOpacity testID="empty-reset-btn" style={s.emptyResetBtn} onPress={resetFilters}>
                <MaterialCommunityIcons name="refresh" size={16} color="#4A8B71" />
                <Text style={s.emptyResetText}>{tx.resetFilters}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Recipe Cards */}
        {!isLoading && recipes.map((recipe, i) => {
          const isExpanded = expandedRecipe === recipe.id;
          return (
            <TouchableOpacity
              key={recipe.id || i}
              testID={`catalog-recipe-${i}`}
              style={s.recipeCard}
              activeOpacity={0.7}
              onPress={() => setExpandedRecipe(isExpanded ? null : recipe.id)}
            >
              {/* Header Row */}
              <View style={s.recipeHeader}>
                <View style={s.recipeTimeBox}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#4A8B71" />
                  <Text style={s.recipeTimeTxt}>{recipe.time_min} {tx.minutes}</Text>
                </View>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color="#8FA39B"
                />
              </View>

              {/* Title */}
              <Text style={s.recipeTitle}>{recipe.title}</Text>

              {/* Tags */}
              {recipe.tags?.length > 0 && (
                <View style={s.recipeTagRow}>
                  {recipe.tags.slice(0, 4).map((tag: string, j: number) => (
                    <View key={j} style={s.recipeTag}>
                      <Text style={s.recipeTagTxt}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Ingredient count */}
              <View style={s.recipeMetaRow}>
                <MaterialCommunityIcons name="basket-outline" size={14} color="#5C7A6F" />
                <Text style={s.recipeMetaTxt}>
                  {recipe.ingredients?.length || 0} {tx.ingredients}
                </Text>
                <Text style={s.recipeDot}> · </Text>
                <MaterialCommunityIcons name="format-list-numbered" size={14} color="#5C7A6F" />
                <Text style={s.recipeMetaTxt}>
                  {recipe.steps?.length || 0} {lang === 'de' ? 'Schritte' : 'Passi'}
                </Text>
              </View>

              {/* Expanded Detail */}
              {isExpanded && (
                <View style={s.expandedWrap}>
                  {/* Ingredients */}
                  {recipe.ingredients?.length > 0 && (
                    <View style={s.detailSection}>
                      <Text style={s.detailTitle}>{tx.ingredients}</Text>
                      {recipe.ingredients.map((ing: string, j: number) => (
                        <View key={j} style={s.ingRow}>
                          <View style={s.ingDot} />
                          <Text style={s.ingText}>{ing}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Steps */}
                  {recipe.steps?.length > 0 && (
                    <View style={s.detailSection}>
                      <Text style={s.detailTitle}>{tx.preparation}</Text>
                      {recipe.steps.map((step: string, j: number) => (
                        <View key={j} style={s.stepRow}>
                          <View style={s.stepNum}>
                            <Text style={s.stepNumTxt}>{j + 1}</Text>
                          </View>
                          <Text style={s.stepText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F9F6' },
  
  // Header
  headerBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E6E2',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26' },
  headerSub: { fontSize: 12, color: '#8FA39B', marginTop: 1 },
  resetBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E0E6E2',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1A2D26', padding: 0 },

  content: { padding: 16, paddingBottom: 40 },

  // Filter sections
  filterSection: { marginBottom: 16 },
  filterLabel: { fontSize: 13, fontWeight: '700', color: '#5C7A6F', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'nowrap' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F5E9', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12,
  },
  chipActive: { backgroundColor: '#4A8B71' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#4A8B71' },
  chipTextActive: { color: '#FFF' },

  tagChip: {
    backgroundColor: '#F0F4F1', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10,
  },
  tagChipActive: { backgroundColor: '#2C5F78' },
  tagChipText: { fontSize: 11, fontWeight: '600', color: '#5C7A6F' },
  tagChipTextActive: { color: '#FFF' },

  // Loading
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A2D26', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#8FA39B', marginTop: 4, textAlign: 'center' },
  emptyResetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#E8F5E9' },
  emptyResetText: { fontSize: 14, fontWeight: '600', color: '#4A8B71' },

  // Recipe Card
  recipeCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  recipeTimeBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8 },
  recipeTimeTxt: { fontSize: 12, fontWeight: '600', color: '#4A8B71' },
  recipeTitle: { fontSize: 17, fontWeight: '700', color: '#1A2D26', marginBottom: 8 },
  recipeTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  recipeTag: { backgroundColor: '#F0F4F1', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8 },
  recipeTagTxt: { fontSize: 11, fontWeight: '600', color: '#2C5F78' },
  recipeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recipeMetaTxt: { fontSize: 12, color: '#5C7A6F' },
  recipeDot: { fontSize: 12, color: '#8FA39B' },

  // Expanded
  expandedWrap: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#F0F4F1', paddingTop: 14 },
  detailSection: { marginBottom: 14 },
  detailTitle: { fontSize: 15, fontWeight: '700', color: '#1A2D26', marginBottom: 8 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  ingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4A8B71' },
  ingText: { fontSize: 14, color: '#1A2D26', flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#4A8B71',
    justifyContent: 'center', alignItems: 'center',
  },
  stepNumTxt: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  stepText: { fontSize: 14, color: '#1A2D26', flex: 1, lineHeight: 20 },
});
