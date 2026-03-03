import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  ActivityIndicator, StyleSheet, Linking, Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLang } from '../src/LangContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const NUTRIENT_NAMES: Record<string, Record<string, string>> = {
  iron: { de: 'Eisen', it: 'Ferro' },
  zinc: { de: 'Zink', it: 'Zinco' },
  omega3: { de: 'Omega-3', it: 'Omega-3' },
  vitamin_d: { de: 'Vitamin D', it: 'Vitamina D' },
  vitamin_b12: { de: 'Vitamin B12', it: 'Vitamina B12' },
  vitamin_c: { de: 'Vitamin C', it: 'Vitamina C' },
  magnesium: { de: 'Magnesium', it: 'Magnesio' },
  calcium: { de: 'Calcium', it: 'Calcio' },
  folate: { de: 'Folat', it: 'Folato' },
  iodine: { de: 'Jod', it: 'Iodio' },
  selenium: { de: 'Selen', it: 'Selenio' },
  b_vitamins: { de: 'B-Vitamine', it: 'Vitamine B' },
  vitamin_k2: { de: 'Vitamin K2', it: 'Vitamina K2' },
  vitamin_e: { de: 'Vitamin E', it: 'Vitamina E' },
  coq10: { de: 'Coenzym Q10', it: 'Coenzima Q10' },
  probiotics: { de: 'Probiotika', it: 'Probiotici' },
};

const RISK_COLORS: Record<string, string> = { high: '#EF4444', medium: '#F59E0B' };

export default function ProductComparisonScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const params = useLocalSearchParams<{ nutrient: string; risk: string }>();
  const nutrient = params.nutrient || '';
  const risk = params.risk || 'high';

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [qualityInfo, setQualityInfo] = useState<any>(null);

  useEffect(() => {
    if (!nutrient) return;
    fetch(`${API_URL}/api/products/by-nutrient/${nutrient}?lang=${lang}`)
      .then(r => r.json())
      .then(data => {
        setProducts(data.products || []);
        setQualityInfo(data.quality_info || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [nutrient, lang]);

  const accentColor = RISK_COLORS[risk] || '#F59E0B';
  const nutrientName = NUTRIENT_NAMES[nutrient]?.[lang] || nutrient;

  const tx = {
    title: lang === 'de' ? 'Empfohlene Produkte' : 'Prodotti consigliati',
    for: lang === 'de' ? 'fuer' : 'per',
    dailyDose: lang === 'de' ? 'Empf. Tagesdosis' : 'Dose giornaliera',
    form: lang === 'de' ? 'Empf. Form' : 'Forma consigliata',
    tip: lang === 'de' ? 'Einnahme-Tipp' : 'Consiglio',
    price: lang === 'de' ? 'Preis' : 'Prezzo',
    rating: lang === 'de' ? 'Bewertung' : 'Valutazione',
    quality: lang === 'de' ? 'Qualitaetsmerkmale' : 'Qualita',
    viewProduct: lang === 'de' ? 'Zum Produkt' : 'Vai al prodotto',
    noProducts: lang === 'de' ? 'Keine passenden Produkte gefunden' : 'Nessun prodotto trovato',
    noProductsSub: lang === 'de'
      ? 'Fuer diesen Naehrstoff sind aktuell keine Produkte verfuegbar.'
      : 'Al momento non sono disponibili prodotti per questo nutriente.',
    disclaimer: lang === 'de'
      ? 'Affiliate-Links: Bei einem Kauf erhalten wir eine kleine Provision.'
      : 'Link affiliati: riceviamo una piccola commissione per ogni acquisto.',
    backToPlan: lang === 'de' ? 'Zum Supplement-Plan' : 'Vai al piano',
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4A8B71" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} data-testid="product-back-btn">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{tx.title}</Text>
            <Text style={[s.headerSub, { color: accentColor }]}>{tx.for} {nutrientName}</Text>
          </View>
        </View>

        {/* Risk Banner */}
        <View style={[s.riskBanner, { backgroundColor: risk === 'high' ? '#FEF2F2' : '#FFFBEB', borderLeftColor: accentColor }]}>
          <MaterialCommunityIcons
            name={risk === 'high' ? 'alert-circle' : 'alert'}
            size={20} color={accentColor}
          />
          <Text style={[s.riskBannerText, { color: risk === 'high' ? '#991B1B' : '#92400E' }]}>
            {risk === 'high'
              ? (lang === 'de' ? 'Hohes Risiko – Handlung empfohlen' : 'Rischio alto – azione consigliata')
              : (lang === 'de' ? 'Mittleres Risiko – Optimierung moeglich' : 'Rischio medio – ottimizzazione possibile')}
          </Text>
        </View>

        {/* Quality Info Card */}
        {qualityInfo && (
          <View style={s.qualityCard}>
            <Text style={s.qualityTitle}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#4A8B71" />
              {'  '}{tx.quality}
            </Text>
            <View style={s.qualityGrid}>
              <View style={s.qualityItem}>
                <Text style={s.qualityLabel}>{tx.dailyDose}</Text>
                <Text style={s.qualityValue}>{qualityInfo.daily_dose_hint}</Text>
              </View>
              <View style={s.qualityItem}>
                <Text style={s.qualityLabel}>{tx.form}</Text>
                <Text style={s.qualityValue}>{qualityInfo.form}</Text>
              </View>
            </View>
            <View style={s.tipRow}>
              <MaterialCommunityIcons name="lightbulb-outline" size={14} color="#F59E0B" />
              <Text style={s.tipText}>{qualityInfo.tip}</Text>
            </View>
          </View>
        )}

        {/* Products */}
        {products.length === 0 ? (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="package-variant" size={48} color="#8FA39B" />
            <Text style={s.emptyTitle}>{tx.noProducts}</Text>
            <Text style={s.emptySub}>{tx.noProductsSub}</Text>
          </View>
        ) : (
          products.map((p: any, i: number) => (
            <View key={p.product_id || i} style={s.productCard} data-testid={`product-card-${i}`}>
              {/* Product Header */}
              <View style={s.productHeader}>
                {p.image_url ? (
                  <Image source={{ uri: p.image_url }} style={s.productImg} resizeMode="contain" />
                ) : (
                  <View style={[s.productImg, s.productImgPlaceholder]}>
                    <MaterialCommunityIcons name="pill" size={24} color="#8FA39B" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.productName}>{p.name}</Text>
                  <Text style={s.productDesc} numberOfLines={2}>{p.description}</Text>
                </View>
              </View>

              {/* Price & Rating Row */}
              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <MaterialCommunityIcons name="tag" size={14} color="#4A8B71" />
                  <Text style={s.metaLabel}>{tx.price}</Text>
                  <Text style={s.metaValue}>{p.price}</Text>
                </View>
                <View style={s.metaItem}>
                  <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                  <Text style={s.metaLabel}>{tx.rating}</Text>
                  <Text style={s.metaValue}>{p.rating}</Text>
                </View>
              </View>

              {/* Application Instructions */}
              {p.application_instructions && (
                <Text style={s.appInstr} numberOfLines={2}>{p.application_instructions}</Text>
              )}

              {/* Affiliate CTA */}
              <TouchableOpacity
                style={[s.affiliateBtn, { backgroundColor: accentColor }]}
                onPress={() => p.affiliate_url && Linking.openURL(p.affiliate_url)}
                data-testid={`affiliate-btn-${i}`}
              >
                <MaterialCommunityIcons name="open-in-new" size={16} color="#FFF" />
                <Text style={s.affiliateBtnText}>{tx.viewProduct}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Disclaimer */}
        <Text style={s.disclaimer}>{tx.disclaimer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAF9' },
  content: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A2D26' },
  headerSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  riskBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderLeftWidth: 4, padding: 12, marginBottom: 16 },
  riskBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

  qualityCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 16 },
  qualityTitle: { fontSize: 15, fontWeight: '700', color: '#1A2D26', marginBottom: 12 },
  qualityGrid: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  qualityItem: { flex: 1, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10 },
  qualityLabel: { fontSize: 11, color: '#5C7A6F', marginBottom: 4 },
  qualityValue: { fontSize: 14, fontWeight: '600', color: '#1A2D26' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8 },
  tipText: { fontSize: 12, color: '#92400E', flex: 1 },

  productCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12 },
  productHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  productImg: { width: 60, height: 60, borderRadius: 10 },
  productImgPlaceholder: { backgroundColor: '#F0F4F2', justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 16, fontWeight: '700', color: '#1A2D26' },
  productDesc: { fontSize: 12, color: '#5C7A6F', marginTop: 4, lineHeight: 18 },

  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAF9', borderRadius: 8, padding: 8 },
  metaLabel: { fontSize: 11, color: '#8FA39B' },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#1A2D26' },

  appInstr: { fontSize: 12, color: '#5C7A6F', lineHeight: 18, marginBottom: 12 },

  affiliateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 12 },
  affiliateBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#1A2D26', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#5C7A6F', marginTop: 6, textAlign: 'center' },

  disclaimer: { fontSize: 11, color: '#8FA39B', textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
