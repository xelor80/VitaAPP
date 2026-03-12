import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLang } from '../../src/LangContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 16 * 2 - 12) / 2;

export default function RecipesTab() {
  const router = useRouter();
  const { lang } = useLang();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/recipes?lang=${lang}&limit=20`);
        if (res.ok) {
          const d = await res.json();
          setRecipes(d.recipes || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [lang]);

  return (
    <View style={s.container}>
      <LinearGradient colors={['#1B6B45', '#2E9E6B', '#43C68A']} style={s.header}>
        <Text style={s.headerTitle}>{lang === 'de' ? 'Deine Rezepte' : 'Le tue ricette'}</Text>
        <Text style={s.headerSub}>{lang === 'de' ? 'Gesund & lecker' : 'Sano e gustoso'}</Text>
      </LinearGradient>
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
                <Text style={s.cardTitle} numberOfLines={2}>{r[`title_${lang}`] || r.title_de || r.title}</Text>
                <Text style={s.cardTag} numberOfLines={1}>{r[`category_${lang}`] || r.category_de || ''}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {recipes.length === 0 && (
            <View style={s.emptyState}>
              <MaterialCommunityIcons name="food-off" size={60} color="#D1D5DB" />
              <Text style={s.emptyText}>{lang === 'de' ? 'Keine Rezepte vorhanden' : 'Nessuna ricetta'}</Text>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
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
  emptyState: { width: '100%', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },
});
