import React from 'react';
import { View, Text, Image, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from '../styles/resultsStyles';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

function RecipeImg({ url, alt }: { url: string; alt: string }) {
  const id = React.useId();
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const el = document.querySelector(`[id="${id}"]`);
      if (el) el.classList.add('rimg-wrap');
    }
  }, [id]);
  return (
    <View nativeID={id}>
      <Image source={{ uri: url }} style={{ width: 1, height: 1 }} resizeMode="cover" />
    </View>
  );
}

export function RecipesTab({ analysis, lang }: { analysis: any; lang: string }) {
  const [catalogRecipes, setCatalogRecipes] = React.useState<any[]>([]);
  const [expandedRecipe, setExpandedRecipe] = React.useState<string | null>(null);

  React.useEffect(() => {
    const inputTags = analysis?.input_tags || [];
    if (inputTags.length === 0) {
      setCatalogRecipes([]);
      return;
    }
    const tagParam = inputTags.join(',');
    fetch(`${API_URL}/api/recipes?lang=${lang}&tags=${tagParam}`)
      .then(r => r.json())
      .then(data => setCatalogRecipes(data))
      .catch(() => {});
  }, [lang, analysis?.input_tags]);

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
            {recipe.image_url ? <RecipeImg url={recipe.image_url} alt={recipe.title} /> : null}
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
