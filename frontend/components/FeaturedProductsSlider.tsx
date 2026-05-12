import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLang } from '../src/LangContext';
import { tx } from '../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type FeaturedProduct = {
  id: string;
  title_de: string;
  title_it?: string;
  title_en?: string;
  description_de?: string;
  description_it?: string;
  description_en?: string;
  image_url?: string | null;
  affiliate_url?: string | null;
  vendor?: string | null;
  price_eur?: number | null;
  badge?: string | null;
};

type Props = {
  profileId?: string | null;
  limit?: number;
};

export function FeaturedProductsSlider({ profileId, limit = 8 }: Props) {
  const { lang } = useLang();
  const [items, setItems] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/smart-products/featured?limit=${limit}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setItems(data.items || []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [limit]);

  const pickTitle = (p: FeaturedProduct) => {
    if (lang === 'it' && p.title_it) return p.title_it;
    if (lang === 'en' && p.title_en) return p.title_en;
    return p.title_de;
  };
  const pickDesc = (p: FeaturedProduct) => {
    if (lang === 'it' && p.description_it) return p.description_it;
    if (lang === 'en' && p.description_en) return p.description_en;
    return p.description_de || '';
  };

  const openProduct = async (p: FeaturedProduct) => {
    // Track click
    try {
      await fetch(`${API_URL}/api/smart-products/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: p.id, profile_id: profileId || null, context: 'featured_slider' }),
      });
    } catch { /* ignore tracking error */ }
    if (p.affiliate_url) {
      try {
        if (Platform.OS === 'web') {
          window.open(p.affiliate_url, '_blank', 'noopener,noreferrer');
        } else {
          await Linking.openURL(p.affiliate_url);
        }
      } catch { /* ignore */ }
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <View style={st.wrap} testID="featured-slider">
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="star-four-points" size={16} color="#7C3AED" />
          <Text style={st.title}>
            {tx(lang, { de: 'Neu für dich', it: 'Novità per te', en: 'New for you' })}
          </Text>
        </View>
        <Text style={st.adLabel}>
          {tx(lang, { de: 'Anzeige', it: 'Annuncio', en: 'Ad' })}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.scroll}
        snapToInterval={172}
        decelerationRate="fast"
        testID="featured-slider-scroll"
      >
        {items.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={st.card}
            activeOpacity={0.85}
            onPress={() => openProduct(p)}
            testID={`featured-card-${p.id}`}
          >
            <View style={st.imageWrap}>
              {p.image_url ? (
                <Image source={{ uri: p.image_url }} style={st.image} resizeMode="cover" />
              ) : (
                <View style={[st.image, { backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialCommunityIcons name="gift-outline" size={32} color="#A78BFA" />
                </View>
              )}
              {p.badge ? (
                <View style={st.badge}>
                  <Text style={st.badgeText}>{p.badge}</Text>
                </View>
              ) : null}
            </View>
            <View style={st.body}>
              <Text style={st.cardTitle} numberOfLines={2}>{pickTitle(p)}</Text>
              {pickDesc(p) ? (
                <Text style={st.cardDesc} numberOfLines={1}>{pickDesc(p)}</Text>
              ) : null}
              <View style={st.cardFooter}>
                {p.price_eur != null ? (
                  <Text style={st.price}>{p.price_eur.toFixed(2).replace('.', ',')} €</Text>
                ) : <View />}
                <View style={st.ctaPill}>
                  <Text style={st.ctaPillText}>
                    {tx(lang, { de: 'Ansehen', it: 'Scopri', en: 'View' })}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={11} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '800', color: '#1F2937', letterSpacing: -0.2 },
  adLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  scroll: { paddingHorizontal: 16, paddingRight: 24, gap: 12 },
  card: { width: 160, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  imageWrap: { position: 'relative', width: '100%', height: 110, backgroundColor: '#FAFBFC' },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  body: { padding: 10 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#1F2937', lineHeight: 15 },
  cardDesc: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { fontSize: 12, fontWeight: '900', color: '#2E7D52' },
  ctaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  ctaPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});

export default FeaturedProductsSlider;
