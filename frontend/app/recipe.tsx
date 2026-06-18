import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  Image, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentAnalysis } from '../src/store';
import { useLang } from '../src/LangContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function RecipeScreen() {
  const router = useRouter();
  const { idx, id } = useLocalSearchParams<{ idx?: string; id?: string }>();
  const { lang } = useLang();
  const analysis = getCurrentAnalysis();

  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (idx !== undefined) {
      // Load from analysis results
      const r = analysis?.recipes?.[Number(idx)];
      if (r) setRecipe(r);
    } else if (id) {
      // Load from API by recipe ID
      setLoading(true);
      fetch(`${API_URL}/api/recipes/${id}?lang=${lang}`)
        .then(r => r.json())
        .then(data => setRecipe(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [idx, id, lang]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <ActivityIndicator size="large" color="#D14953" />
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <MaterialCommunityIcons name="chef-hat" size={48} color="#8FA39B" />
        <Text style={styles.emptyText}>Rezept nicht gefunden</Text>
        <TouchableOpacity testID="recipe-back-btn" style={styles.linkBtn} onPress={() => router.back()}>
          <Text style={styles.linkBtnText}>Zurück</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity testID="recipe-back-btn" onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Rezept</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        {recipe.image_url && (
          <Image
            source={{ uri: recipe.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        )}

        {/* Title */}
        <Text style={styles.recipeTitle}>{recipe.title}</Text>

        {/* Meta Badges */}
        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#D14953" />
            <Text style={styles.metaText}>{recipe.time_min} {lang === 'de' ? 'Min.' : 'Min.'}</Text>
          </View>
          <View style={styles.metaBadge}>
            <MaterialCommunityIcons name="format-list-bulleted" size={16} color="#D14953" />
            <Text style={styles.metaText}>{recipe.ingredients?.length || 0} {lang === 'de' ? 'Zutaten' : 'Ingredienti'}</Text>
          </View>
          <View style={styles.metaBadge}>
            <MaterialCommunityIcons name="shoe-print" size={16} color="#D14953" />
            <Text style={styles.metaText}>{recipe.steps?.length || 0} {lang === 'de' ? 'Schritte' : 'Passi'}</Text>
          </View>
        </View>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {recipe.tags.map((tag: string, i: number) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="basket-outline" size={22} color="#D14953" />
            <Text style={styles.sectionTitle}>{lang === 'de' ? 'Zutaten' : 'Ingredienti'}</Text>
          </View>
          <View style={styles.card}>
            {recipe.ingredients?.map((ing: string, i: number) => (
              <View key={i} style={[styles.ingredientRow, i > 0 && styles.ingredientBorder]}>
                <View style={styles.ingredientDot} />
                <Text style={styles.ingredientText}>{ing}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Steps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="format-list-numbered" size={22} color="#D14953" />
            <Text style={styles.sectionTitle}>{lang === 'de' ? 'Zubereitung' : 'Preparazione'}</Text>
          </View>
          {recipe.steps?.map((step: string, i: number) => (
            <View key={i} style={styles.stepCard}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerWrap}>
          <MaterialCommunityIcons name="information-outline" size={14} color="#8FA39B" />
          <Text style={styles.disclaimerText}>
            Rezeptvorschlag basierend auf allgemeinen Ernährungsinformationen. Individuelle Unverträglichkeiten und Allergien beachten.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F9F6' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 100 },

  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#E8E8E8',
  },

  // Header
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E6E2',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26', flex: 1, textAlign: 'center' },

  // Recipe Title
  recipeTitle: { fontSize: 24, fontWeight: '700', color: '#1A2D26', marginBottom: 12 },

  // Meta
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEE2E2', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12,
  },
  metaText: { fontSize: 13, fontWeight: '600', color: '#D14953' },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  tag: { backgroundColor: '#F0F4F1', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  tagText: { fontSize: 12, fontWeight: '600', color: '#2C5F78' },

  // Section
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A2D26' },

  // Card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },

  // Ingredients
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  ingredientBorder: { borderTopWidth: 1, borderTopColor: '#F0F4F1' },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D14953' },
  ingredientText: { fontSize: 15, color: '#1A2D26', flex: 1 },

  // Steps
  stepCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  stepNumber: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#D14953',
    justifyContent: 'center', alignItems: 'center',
  },
  stepNumberText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  stepText: { fontSize: 15, color: '#1A2D26', flex: 1, lineHeight: 22 },

  // Empty/Link
  emptyText: { fontSize: 16, color: '#8FA39B', marginTop: 12 },
  linkBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  linkBtnText: { fontSize: 16, color: '#D14953', fontWeight: '600' },

  // Disclaimer
  disclaimerWrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12,
    paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0E6E2',
  },
  disclaimerText: { fontSize: 12, color: '#8FA39B', flex: 1, lineHeight: 18 },
});
