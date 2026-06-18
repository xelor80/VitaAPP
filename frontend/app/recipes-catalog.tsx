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
    long: 'Aufwaendig',
    recipes: 'Rezepte',
    easy: 'Einfach',
    medium_diff: 'Medium',
    hard: 'Aufwaendig',
    recommended: 'Top-Empfehlungen',
    allRecipes: 'Alle Rezepte',
    personalizedRecipes: 'Fuer dein Profil',
    profileRequired: 'Gesundheitsprofil erforderlich',
    profileRequiredSub: 'Erstelle dein Gesundheitsprofil, damit wir die besten Rezepte fuer dich finden.',
    startProfile: 'Profil erstellen',
    relevantFor: 'Passend fuer dich',
    otherRecipes: 'Weitere Rezepte',
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
    recommended: 'I piu consigliati',
    allRecipes: 'Tutte le ricette',
    personalizedRecipes: 'Per il tuo profilo',
    profileRequired: 'Profilo salute richiesto',
    profileRequiredSub: 'Crea il tuo profilo salute per trovare le ricette migliori per te.',
    startProfile: 'Crea profilo',
    relevantFor: 'Adatto a te',
    otherRecipes: 'Altre ricette',
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
  const tags = recipe.relevance_tags || [];

  return (
    <TouchableOpacity
      style={[s.card, { width: cardWidth }]}
      activeOpacity={0.85}
      onPress={onPress}
      testID={`recipe-card-${recipe.id}`}
    >
      <Image
        source={{ uri: recipe.image_url || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&h=300&fit=crop' }}
        style={[s.cardImage, { height: cardWidth * 0.7 }]}
        resizeMode="cover"
      />
      {tags.length > 0 && (
        <View style={s.relevanceTagRow}>
          {tags.slice(0, 2).map((tag: string, i: number) => (
            <View key={i} style={s.relevanceTag}>
              <Text style={s.relevanceTagText} numberOfLines={1}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
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

  const [personalizedRecipes, setPersonalizedRecipes] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Load all recipes once: personalized if profile exists, all recipes otherwise
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const pid = await AsyncStorage.getItem('health_profile_id');
        setProfileId(pid);
        setHasProfile(!!pid);
        if (pid) {
          const res = await fetch(`${API_URL}/api/recipes/personalized/${pid}?lang=${lang}`);
          if (res.ok) {
            const data = await res.json();
            setPersonalizedRecipes(data.recipes || []);
          }
        } else {
          const res = await fetch(`${API_URL}/api/recipes?lang=${lang}`);
          if (res.ok) {
            const data = await res.json();
            setPersonalizedRecipes(data.map((r: any) => ({ ...r, relevance_score: 0, relevance_tags: [] })));
          }
        }
      } catch {}
      setIsLoading(false);
    })();
  }, [lang]);

  useEffect(() => {
    fetch(`${API_URL}/api/recipes/filters?lang=${lang}`)
      .then(r => r.json()).then(setFilters).catch(() => {});
  }, [lang]);

  // Local filtering from personalizedRecipes (no extra API calls)
  const filteredRecipes = React.useMemo(() => {
    let list = personalizedRecipes;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(r => r.title?.toLowerCase().includes(q));
    }
    if (selectedCategory) {
      list = list.filter(r =>
        r.symptom_tags?.some((t: string) => t.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        r.tags?.some((t: string) => t.toLowerCase().includes(selectedCategory.toLowerCase()))
      );
    }
    if (selectedTags.length > 0) {
      list = list.filter(r =>
        selectedTags.some(t => r.tags?.map((x: string) => x.toLowerCase()).includes(t.toLowerCase()))
      );
    }
    if (timeFilter === 'quick') list = list.filter(r => (r.time_min || 99) <= 10);
    else if (timeFilter === 'medium') list = list.filter(r => (r.time_min || 99) <= 20);
    else if (timeFilter === 'long') list = list.filter(r => (r.time_min || 99) <= 60);
    return list;
  }, [personalizedRecipes, searchText, selectedCategory, selectedTags, timeFilter]);

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
        <TouchableOpacity testID="catalog-back-btn" onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{tx.title}</Text>
          <Text style={s.headerSub}>
            {hasActiveFilters ? `${filteredRecipes.length} ${tx.recipes}` : tx.subtitle}
          </Text>
        </View>
        {hasActiveFilters && (
          <TouchableOpacity testID="reset-filters-btn" onPress={resetFilters} style={s.resetBtn}>
            <MaterialCommunityIcons name="filter-remove" size={20} color="#D9534F" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
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
        {/* Filters row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={s.chipRow}>
            {filters?.categories?.map((cat: any) => {
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
            {(['quick', 'medium', 'long'] as TimeFilter[]).map(tf => {
              const active = timeFilter === tf;
              const label = tf === 'quick' ? `${tx.quick}` : tf === 'medium' ? `${tx.medium}` : `${tx.long}`;
              const icon = tf === 'quick' ? 'lightning-bolt' : tf === 'medium' ? 'clock-outline' : 'clock-alert-outline';
              return (
                <TouchableOpacity
                  key={tf}
                  testID={`time-filter-${tf}`}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setTimeFilter(active ? null : tf)}
                >
                  <MaterialCommunityIcons name={icon as any} size={13} color={active ? '#FFF' : '#D14953'} />
                  <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {isLoading && (
          <View style={s.loadingWrap}>
            <ActivityIndicator testID="catalog-loading" size="large" color="#D14953" />
          </View>
        )}

        {/* When filters active: show filtered results */}
        {!isLoading && hasActiveFilters && filteredRecipes.length === 0 && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="chef-hat" size={48} color="#8FA39B" />
            <Text style={s.emptyTitle}>{tx.noResults}</Text>
            <Text style={s.emptySub}>{tx.noResultsSub}</Text>
            <TouchableOpacity testID="empty-reset-btn" style={s.emptyResetBtn} onPress={resetFilters}>
              <MaterialCommunityIcons name="refresh" size={16} color="#D14953" />
              <Text style={s.emptyResetText}>{tx.resetFilters}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && hasActiveFilters && filteredRecipes.length > 0 && renderGrid(filteredRecipes)}

        {/* When no filters: show personalized recipes or profile required */}
        {!isLoading && !hasActiveFilters && (
          <>
            {/* Profile Required Message */}
            {hasProfile === false && (
              <View style={s.profileRequired} testID="profile-required-card">
                <MaterialCommunityIcons name="account-heart-outline" size={48} color="#2C8C99" />
                <Text style={s.profileRequiredTitle}>{tx.profileRequired}</Text>
                <Text style={s.profileRequiredSub}>{tx.profileRequiredSub}</Text>
                <TouchableOpacity
                  style={s.profileRequiredBtn}
                  onPress={() => router.push('/onboarding')}
                  testID="start-profile-btn"
                >
                  <MaterialCommunityIcons name="account-plus" size={16} color="#FFF" />
                  <Text style={s.profileRequiredBtnText}>{tx.startProfile}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Relevant recipes */}
            {personalizedRecipes.filter(r => r.relevance_score > 0).length > 0 && (
              <View style={{ marginBottom: 20, marginTop: 16 }}>
                <View style={s.sectionHeader}>
                  <MaterialCommunityIcons name="star-outline" size={18} color="#2C8C99" />
                  <Text style={[s.sectionTitle, { color: '#2C8C99' }]}>{tx.relevantFor}</Text>
                  <Text style={s.sectionCount}>{personalizedRecipes.filter(r => r.relevance_score > 0).length}</Text>
                </View>
                {renderGrid(personalizedRecipes.filter(r => r.relevance_score > 0))}
              </View>
            )}

            {/* Other / All recipes */}
            {personalizedRecipes.filter(r => r.relevance_score === 0).length > 0 && (
              <View style={{ marginTop: 8 }}>
                <View style={s.sectionHeader}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={18} color="#D14953" />
                  <Text style={s.sectionTitle}>{hasProfile ? tx.otherRecipes : tx.allRecipes}</Text>
                  <Text style={s.sectionCount}>{personalizedRecipes.filter(r => r.relevance_score === 0).length}</Text>
                </View>
                {renderGrid(personalizedRecipes.filter(r => r.relevance_score === 0))}
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
    backgroundColor: '#FEE2E2', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12,
  },
  chipActive: { backgroundColor: '#D14953' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#D14953' },
  chipTextActive: { color: '#FFF' },

  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A2D26', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#8FA39B', marginTop: 4, textAlign: 'center' },
  emptyResetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#FEE2E2' },
  emptyResetText: { fontSize: 14, fontWeight: '600', color: '#D14953' },

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

  // Relevance tags on recipe cards
  relevanceTagRow: {
    position: 'absolute' as any,
    top: 8,
    left: 6,
    right: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    zIndex: 1,
  },
  relevanceTag: {
    backgroundColor: 'rgba(44, 140, 153, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  relevanceTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Profile Required
  profileRequired: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileRequiredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2D26',
    marginTop: 16,
    textAlign: 'center',
  },
  profileRequiredSub: {
    fontSize: 14,
    color: '#5C7A6F',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  profileRequiredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2C8C99',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  profileRequiredBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
