import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLang } from '../src/LangContext';
import { tx } from '../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type Product = {
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
};

type Props = {
  context: 'dashboard' | 'stress' | 'fasting' | 'weight' | 'analysis' | 'plan';
  profileId?: string | null;
  limit?: number;
  testIdPrefix?: string;
};

export function SmartProductBlock({ context, profileId, limit = 2, testIdPrefix = 'smart-prod' }: Props) {
  const { lang } = useLang();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ context, limit: String(limit) });
        if (profileId) params.set('profile_id', profileId);
        const res = await fetch(`${API_URL}/api/smart-products/recommendations?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setItems(data.items || []);
          // Phase 4: track impressions in batch (passive view)
          const imps = (data.items || []).map((p: Product) => ({
            product_id: p.id,
            profile_id: profileId || null,
            context,
          }));
          if (imps.length) {
            fetch(`${API_URL}/api/smart-products/impression/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: imps }),
            }).catch(() => {});
          }
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [context, profileId, limit]);

  const onPress = async (p: Product) => {
    try {
      fetch(`${API_URL}/api/smart-products/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: p.id, profile_id: profileId, context }),
      }).catch(() => {});
    } catch { /* ignore */ }
    if (p.affiliate_url) {
      try { Linking.openURL(p.affiliate_url); } catch {}
    }
  };

  if (loading || items.length === 0) return null;

  const title = (p: Product) => (lang === 'it' && p.title_it) ? p.title_it : (lang === 'en' && p.title_en) ? p.title_en : p.title_de;
  const desc = (p: Product) => (lang === 'it' && p.description_it) ? p.description_it : (lang === 'en' && p.description_en) ? p.description_en : p.description_de;

  return (
    <View style={st.container} testID={`${testIdPrefix}-block`}>
      <View style={st.header}>
        <MaterialCommunityIcons name="package-variant-closed" size={14} color="#9CA3AF" />
        <Text style={st.headerText}>
          {tx(lang, { de: 'Empfehlung', it: 'Consiglio', en: 'Suggestion' })}
        </Text>
        <Text style={st.adNote}>
          {tx(lang, { de: 'Anzeige', it: 'Sponsorizzato', en: 'Sponsored' })}
        </Text>
      </View>
      {items.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={st.card}
          activeOpacity={0.85}
          onPress={() => onPress(p)}
          testID={`${testIdPrefix}-${p.id}`}
        >
          <View style={st.iconWrap}>
            {p.image_url ? (
              <Image source={{ uri: p.image_url }} style={st.thumb} />
            ) : (
              <MaterialCommunityIcons name="leaf" size={22} color="#C2272F" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.title} numberOfLines={1}>{title(p)}</Text>
            {!!desc(p) && (
              <Text style={st.desc} numberOfLines={2}>{desc(p)}</Text>
            )}
            {p.vendor && (
              <Text style={st.vendor}>{p.vendor}{p.price_eur ? ` · ${p.price_eur.toFixed(2)} €` : ''}</Text>
            )}
          </View>
          <MaterialCommunityIcons name="open-in-new" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  adNote: {
    marginLeft: 'auto',
    fontSize: 10,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDF4F4',
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' as any },
    }),
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  title: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  desc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  vendor: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
});

export default SmartProductBlock;
