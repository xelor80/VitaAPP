import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  ActivityIndicator, StyleSheet, Linking, Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLang } from '../src/LangContext';
import { tx as txl } from '../src/i18n';

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
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('health_profile_id').then(pid => {
      if (pid) {
        setProfileId(pid);
        // Load existing selection for this nutrient
        fetch(`${API_URL}/api/products/selections/${pid}`)
          .then(r => r.json())
          .then(data => {
            const sel = data.selections?.[nutrient];
            if (sel?.product_id) setSelectedProductId(sel.product_id);
          })
          .catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    if (!nutrient) return;
    fetch(`${API_URL}/api/products/by-nutrient/${nutrient}?lang=${lang}&_t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(r => r.json())
      .then(data => {
        setProducts(data.products || []);
        setQualityInfo(data.quality_info || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [nutrient, lang]);

  const selectProduct = async (product: any) => {
    if (!profileId) return;
    const isDeselect = selectedProductId === product.product_id;
    if (isDeselect) {
      setSelectedProductId(null);
      fetch(`${API_URL}/api/products/selections/${profileId}/${nutrient}`, { method: 'DELETE' }).catch(() => {});
    } else {
      setSelectedProductId(product.product_id);
      fetch(`${API_URL}/api/products/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          nutrient_id: nutrient,
          product_name: product.name,
          product_id: product.product_id,
        }),
      }).catch(() => {});
    }
  };

  const accentColor = RISK_COLORS[risk] || '#F59E0B';
  const nutrientName = NUTRIENT_NAMES[nutrient]?.[lang] || nutrient;

  const texts = {
    title: txl(lang, { de: 'Qualitaetsgepruefte Optionen', it: 'Opzioni verificate', en: 'Qualitaetsgepruefte Optionen' }),
    for: txl(lang, { de: 'fuer', it: 'per', en: 'fuer' }),
    dailyDose: txl(lang, { de: 'Empf. Tagesdosis', it: 'Dose giornaliera', en: 'Empf. Tagesdosis' }),
    form: txl(lang, { de: 'Empf. Form', it: 'Forma consigliata', en: 'Empf. Form' }),
    tip: txl(lang, { de: 'Einnahme-Tipp', it: 'Consiglio', en: 'Einnahme-Tipp' }),
    price: txl(lang, { de: 'Preis', it: 'Prezzo', en: 'Preis' }),
    pricePerDay: txl(lang, { de: 'Preis/Tag', it: 'Prezzo/giorno', en: 'Preis/Tag' }),
    rating: txl(lang, { de: 'Bewertung', it: 'Valutazione', en: 'Bewertung' }),
    quality: txl(lang, { de: 'Qualitaetsmerkmale', it: 'Qualita', en: 'Qualitaetsmerkmale' }),
    viewProduct: risk === 'high'
      ? (txl(lang, { de: `Optimale ${nutrientName}-Quelle`, it: `Fonte ottimale di ${nutrientName}`, en: `Optimale ${nutrientName}-Quelle` }))
      : (txl(lang, { de: 'Optionen vergleichen', it: 'Confronta opzioni', en: 'Optionen vergleichen' })),
    noProducts: txl(lang, { de: 'Keine passenden Produkte gefunden', it: 'Nessun prodotto trovato', en: 'Keine passenden Produkte gefunden' }),
    noProductsSub: txl(lang, { de: 'Fuer diesen Naehrstoff sind aktuell keine Produkte verfuegbar.', it: 'Al momento non sono disponibili prodotti per questo nutriente.', en: 'Fuer diesen Naehrstoff sind aktuell keine Produkte verfuegbar.' }),
    disclaimer: txl(lang, { de: 'Transparenzhinweis: Diese Seite enthaelt Affiliate-Links. Bei einem Kauf ueber diese Links erhalten wir eine kleine Provision - fuer Sie ohne Mehrkosten.', it: 'Nota di trasparenza: questa pagina contiene link di affiliazione. Se acquisti tramite questi link, riceviamo una piccola commissione - senza costi aggiuntivi per te.', en: 'Transparenzhinweis: Diese Seite enthaelt Affiliate-Links. Bei einem Kauf ueber diese Links erhalten wir eine kleine Provision - fuer Sie ohne Mehrkosten.' }),
    backToPlan: txl(lang, { de: 'Zum Supplement-Plan', it: 'Vai al piano', en: 'Zum Supplement-Plan' }),
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#D14953" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="product-back-btn">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A2D26" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{texts.title}</Text>
            <Text style={[s.headerSub, { color: accentColor }]}>{texts.for} {nutrientName}</Text>
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
              ? (txl(lang, { de: 'Hohes Risiko – Handlung empfohlen', it: 'Rischio alto – azione consigliata', en: 'Hohes Risiko – Handlung empfohlen' }))
              : (txl(lang, { de: 'Mittleres Risiko – Optimierung moeglich', it: 'Rischio medio – ottimizzazione possibile', en: 'Mittleres Risiko – Optimierung moeglich' }))}
          </Text>
        </View>

        {/* Quality Info Card */}
        {qualityInfo && (
          <View style={s.qualityCard}>
            <Text style={s.qualityTitle}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#D14953" />
              {'  '}{texts.quality}
            </Text>
            <View style={s.qualityGrid}>
              <View style={s.qualityItem}>
                <Text style={s.qualityLabel}>{texts.dailyDose}</Text>
                <Text style={s.qualityValue}>{qualityInfo.daily_dose_hint}</Text>
              </View>
              <View style={s.qualityItem}>
                <Text style={s.qualityLabel}>{texts.form}</Text>
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
            <Text style={s.emptyTitle}>{texts.noProducts}</Text>
            <Text style={s.emptySub}>{texts.noProductsSub}</Text>
          </View>
        ) : (
          products.map((p: any, i: number) => (
            <View key={p.product_id || i} style={[s.productCard, selectedProductId === p.product_id && s.productCardSelected]} testID={`product-card-${i}`}>
              {/* Selection indicator */}
              {selectedProductId === p.product_id && (
                <View style={s.selectedBanner}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#FFF" />
                  <Text style={s.selectedBannerText}>
                    {txl(lang, { de: 'Mein Produkt', it: 'Il mio prodotto', en: 'Mein Produkt' })}
                  </Text>
                </View>
              )}
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
                  <MaterialCommunityIcons name="tag" size={14} color="#D14953" />
                  <Text style={s.metaLabel}>{texts.price}</Text>
                  <Text style={s.metaValue}>{p.price}</Text>
                </View>
                <View style={s.metaItem}>
                  <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                  <Text style={s.metaLabel}>{texts.rating}</Text>
                  <Text style={s.metaValue}>{p.rating}</Text>
                </View>
              </View>

              {/* Application Instructions */}
              {p.application_instructions && (
                <Text style={s.appInstr} numberOfLines={2}>{p.application_instructions}</Text>
              )}

              {/* Trust: Stars + Reviews + Lab Badge */}
              {(() => {
                const ratingStr = p.rating || '';
                const ratingMatch = ratingStr.match(/(\d+[.,]\d+)\s*\/\s*5\s*\((\d+)\)/);
                const stars = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : null;
                const reviewCount = ratingMatch ? parseInt(ratingMatch[2]) : null;
                const hasLabel = !!p.label_analysis;

                return (stars || hasLabel) ? (
                  <View style={s.trustRow}>
                    {stars && (
                      <View style={s.trustStars}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <MaterialCommunityIcons
                            key={n}
                            name={n <= Math.floor(stars) ? 'star' : (n - 0.5 <= stars ? 'star-half-full' : 'star-outline')}
                            size={14}
                            color="#D97706"
                          />
                        ))}
                        <Text style={s.trustStarVal}>{stars.toFixed(1).replace('.', ',')}</Text>
                        {reviewCount && (
                          <Text style={s.trustReviewCount}>({reviewCount} {txl(lang, { de: 'Bewertungen', it: 'recensioni', en: 'Bewertungen' })})</Text>
                        )}
                      </View>
                    )}
                    {hasLabel && (
                      <View style={s.labBadge}>
                        <MaterialCommunityIcons name="flask-outline" size={12} color="#059669" />
                        <Text style={s.labBadgeText}>{txl(lang, { de: 'Laborgeprüft', it: 'Тестato in laboratorio', en: 'Laborgeprüft' })}</Text>
                      </View>
                    )}
                  </View>
                ) : null;
              })()}

              {/* Affiliate CTA */}
              <TouchableOpacity
                style={[s.affiliateBtn, { backgroundColor: '#D14953' }]}
                onPress={() => p.affiliate_url && Linking.openURL(p.affiliate_url)}
                testID={`affiliate-btn-${i}`}
              >
                <MaterialCommunityIcons name="shield-search" size={16} color="#FFF" />
                <Text style={s.affiliateBtnText}>{texts.viewProduct}</Text>
              </TouchableOpacity>

              {/* Select Product Button */}
              <TouchableOpacity
                style={[
                  s.selectBtn,
                  selectedProductId === p.product_id ? s.selectBtnActive : s.selectBtnInactive,
                ]}
                onPress={() => selectProduct(p)}
                testID={`select-product-btn-${i}`}
              >
                <MaterialCommunityIcons
                  name={selectedProductId === p.product_id ? 'check-circle' : 'circle-outline'}
                  size={20}
                  color={selectedProductId === p.product_id ? '#FFF' : '#8B1A20'}
                />
                <Text style={[
                  s.selectBtnText,
                  { color: selectedProductId === p.product_id ? '#FFF' : '#8B1A20' }
                ]}>
                  {selectedProductId === p.product_id
                    ? (txl(lang, { de: 'Mein Produkt', it: 'Il mio prodotto', en: 'Mein Produkt' }))
                    : (txl(lang, { de: 'Ich nehme dieses Produkt', it: 'Prendo questo prodotto', en: 'Ich nehme dieses Produkt' }))}
                </Text>
              </TouchableOpacity>

              {/* Price per day hint */}
              {p.price && p.servings && (
                <View style={s.pricePerDayRow}>
                  <MaterialCommunityIcons name="calculator-variant" size={13} color="#5C7A6F" />
                  <Text style={s.pricePerDayText}>
                    {texts.pricePerDay}: ~{(parseFloat(p.price.replace(/[^0-9.,]/g, '').replace(',', '.')) / Math.max(1, parseInt(p.servings) || 30)).toFixed(2).replace('.', ',')} EUR
                  </Text>
                </View>
              )}
            </View>
          ))
        )}

        {/* Disclaimer */}
        <Text style={s.disclaimer}>{texts.disclaimer}</Text>
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
  qualityItem: { flex: 1, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10 },
  qualityLabel: { fontSize: 11, color: '#5C7A6F', marginBottom: 4 },
  qualityValue: { fontSize: 14, fontWeight: '600', color: '#1A2D26' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8 },
  tipText: { fontSize: 12, color: '#92400E', flex: 1 },

  productCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  productCardSelected: { borderColor: '#8B1A20', backgroundColor: '#FAFFF9' },
  selectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8B1A20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, alignSelf: 'flex-start' },
  selectedBannerText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
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

  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 12, marginTop: 8 },
  selectBtnActive: { backgroundColor: '#8B1A20' },
  selectBtnInactive: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#8B1A20' },
  selectBtnText: { fontSize: 14, fontWeight: '700' },

  pricePerDayRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 },
  pricePerDayText: { fontSize: 12, color: '#5C7A6F' },

  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 },
  trustStars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trustStarVal: { fontSize: 13, fontWeight: '700', color: '#92400E', marginLeft: 4 },
  trustReviewCount: { fontSize: 11, color: '#8FA39B', marginLeft: 2 },
  labBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  labBadgeText: { fontSize: 11, fontWeight: '600', color: '#059669' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#1A2D26', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#5C7A6F', marginTop: 6, textAlign: 'center' },

  disclaimer: { fontSize: 11, color: '#8FA39B', textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
