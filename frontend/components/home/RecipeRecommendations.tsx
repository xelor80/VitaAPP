import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const REASON_LABELS: Record<string, Record<string, string>> = {
  de: {
    fatigue: 'Gegen Müdigkeit',
    headache: 'Gegen Kopfschmerzen',
    digestive: 'Für die Verdauung',
    joint_pain: 'Für die Gelenke',
    muscle_pain: 'Gegen Muskelschmerzen',
    skin_problems: 'Für Haut & Haare',
    hair_loss: 'Gegen Haarausfall',
    concentration: 'Für Konzentration',
    mood_swings: 'Gegen Stimmungsschwankungen',
    anxiety_symptoms: 'Gegen Angst & Stress',
    sleep_problems: 'Für besseren Schlaf',
    weight_issues: 'Für das Gewicht',
    immune_weakness: 'Für das Immunsystem',
    cold_hands_feet: 'Für die Durchblutung',
  },
  it: {
    fatigue: 'Contro la stanchezza',
    headache: 'Contro il mal di testa',
    digestive: 'Per la digestione',
    joint_pain: 'Per le articolazioni',
    muscle_pain: 'Contro i dolori muscolari',
    skin_problems: 'Per pelle e capelli',
    hair_loss: 'Contro la caduta dei capelli',
    concentration: 'Per la concentrazione',
    mood_swings: 'Contro gli sbalzi di umore',
    anxiety_symptoms: 'Contro ansia e stress',
    sleep_problems: 'Per dormire meglio',
    weight_issues: 'Per il peso',
    immune_weakness: 'Per il sistema immunitario',
    cold_hands_feet: 'Per la circolazione',
  },
};

interface Props {
  lang: string;
  onViewAll: () => void;
}

export function RecipeRecommendations({ lang, onViewAll }: Props) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const tx = lang === 'de'
    ? { title: 'Empfohlene Rezepte', sub: 'Basierend auf deinem Gesundheitsprofil', viewAll: 'Alle Rezepte', min: 'Min.', ingredients: 'Zutaten', steps: 'Schritte', noProfile: 'Erstelle ein Gesundheitsprofil für personalisierte Empfehlungen' }
    : { title: 'Ricette consigliate', sub: 'In base al tuo profilo salute', viewAll: 'Tutte le ricette', min: 'Min.', ingredients: 'Ingredienti', steps: 'Passi', noProfile: 'Crea un profilo salute per consigli personalizzati' };

  useEffect(() => {
    loadRecommendations();
  }, [lang]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      const params = new URLSearchParams({ lang, limit: '3' });
      if (profileId) params.set('profile_id', profileId);
      const res = await fetch(`${API_URL}/api/recipes/recommendations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (e) {
      console.warn('RecipeRecommendations fetch error:', e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.headerRow}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#D14953" />
          <Text style={s.title}>{tx.title}</Text>
        </View>
        <ActivityIndicator testID="recommendations-loading" color="#D14953" style={{ padding: 20 }} />
      </View>
    );
  }

  if (recipes.length === 0) return null;

  return (
    <View style={s.container} testID="recipe-recommendations">
      <View style={s.headerRow}>
        <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#D14953" />
        <Text style={s.title}>{tx.title}</Text>
      </View>
      <Text style={s.subtitle}>{tx.sub}</Text>

      {recipes.map((recipe, i) => {
        const reason = recipe.recommendation_reason;
        const reasonLabel = reason ? (REASON_LABELS[lang]?.[reason] || reason) : '';
        const isExpanded = expanded === recipe.id;

        return (
          <TouchableOpacity
            key={recipe.id || i}
            testID={`recommendation-${i}`}
            style={s.recipeCard}
            activeOpacity={0.7}
            onPress={() => setExpanded(isExpanded ? null : recipe.id)}
          >
            {/* Reason Badge */}
            {reasonLabel ? (
              <View style={s.reasonBadge}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={12} color="#D14953" />
                <Text style={s.reasonText}>{reasonLabel}</Text>
              </View>
            ) : null}

            <View style={s.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.recipeTitle}>{recipe.title}</Text>
                <View style={s.metaRow}>
                  <MaterialCommunityIcons name="clock-outline" size={13} color="#8FA39B" />
                  <Text style={s.metaText}>{recipe.time_min} {tx.min}</Text>
                  <Text style={s.dot}> · </Text>
                  <MaterialCommunityIcons name="basket-outline" size={13} color="#8FA39B" />
                  <Text style={s.metaText}>{recipe.ingredients?.length} {tx.ingredients}</Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#8FA39B"
              />
            </View>

            {/* Tags */}
            <View style={s.tagRow}>
              {recipe.tags?.slice(0, 3).map((tag: string, j: number) => (
                <View key={j} style={s.tag}>
                  <Text style={s.tagTxt}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Expanded: Ingredients */}
            {isExpanded && recipe.ingredients?.length > 0 && (
              <View style={s.expandedSection}>
                {recipe.ingredients.map((ing: string, j: number) => (
                  <View key={j} style={s.ingRow}>
                    <View style={s.ingDot} />
                    <Text style={s.ingText}>{ing}</Text>
                  </View>
                ))}
                {recipe.steps?.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    {recipe.steps.map((step: string, j: number) => (
                      <View key={j} style={s.stepRow}>
                        <View style={s.stepNum}><Text style={s.stepNumTxt}>{j + 1}</Text></View>
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

      <TouchableOpacity testID="view-all-recipes-btn" style={s.viewAllBtn} onPress={onViewAll}>
        <Text style={s.viewAllText}>{tx.viewAll}</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color="#D14953" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '700', color: '#1A2D26' },
  subtitle: { fontSize: 13, color: '#8FA39B', marginTop: 2, marginBottom: 12, marginLeft: 28 },

  recipeCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E0E6E2',
  },
  reasonBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEE2E2', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  reasonText: { fontSize: 11, fontWeight: '700', color: '#D14953' },

  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  recipeTitle: { fontSize: 15, fontWeight: '700', color: '#1A2D26' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: '#8FA39B' },
  dot: { color: '#8FA39B', fontSize: 12 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  tag: { backgroundColor: '#F0F4F1', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 },
  tagTxt: { fontSize: 11, fontWeight: '600', color: '#2C5F78' },

  expandedSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F0F4F1', paddingTop: 12 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  ingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D14953' },
  ingText: { fontSize: 13, color: '#1A2D26', flex: 1 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#D14953', justifyContent: 'center', alignItems: 'center' },
  stepNumTxt: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  stepText: { fontSize: 13, color: '#1A2D26', flex: 1, lineHeight: 18 },

  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12, backgroundColor: '#FEE2E2', marginTop: 4,
  },
  viewAllText: { fontSize: 14, fontWeight: '600', color: '#D14953' },
});
