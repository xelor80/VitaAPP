import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PriceAlert {
  product_id: string;
  product_name: string;
  nutrient_id: string;
  nutrient_name: string;
  old_price: number;
  new_price: number;
  drop_percent: number;
  price_per_day: number;
  affiliate_url: string;
  image_url: string;
}

interface Props {
  lang: string;
}

export function PriceAlerts({ lang }: Props) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => { loadAlerts(); }, [lang]);

  const loadAlerts = async () => {
    try {
      const profileId = await AsyncStorage.getItem('health_profile_id');
      if (!profileId) return;
      const res = await fetch(`${API_URL}/api/price-alerts/${profileId}?lang=${lang}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setFirstName(data.first_name || null);
      }
    } catch {}
  };

  const dismiss = (productId: string) => {
    setDismissed(prev => new Set([...prev, productId]));
  };

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.product_id));
  if (visibleAlerts.length === 0) return null;

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <MaterialCommunityIcons name="tag-arrow-down" size={18} color="#D14953" />
        <Text style={s.sectionTitle}>
          {firstName
            ? (lang === 'de' ? `Preis-Update fuer ${firstName}` : `Aggiornamento prezzi per ${firstName}`)
            : (lang === 'de' ? 'Preis-Update fuer deinen Plan' : 'Aggiornamento prezzi per il tuo piano')}
        </Text>
      </View>

      {visibleAlerts.map(alert => (
        <View key={alert.product_id} style={s.alertCard}>
          <TouchableOpacity
            style={s.dismissBtn}
            onPress={() => dismiss(alert.product_id)}
            testID={`dismiss-price-alert-${alert.product_id}`}
          >
            <MaterialCommunityIcons name="close" size={14} color="#8FA39B" />
          </TouchableOpacity>

          <View style={s.alertContent}>
            <View style={s.nutrientBadge}>
              <Text style={s.nutrientBadgeText}>{alert.nutrient_name}</Text>
            </View>

            <Text style={s.productName} numberOfLines={1}>{alert.product_name}</Text>

            <View style={s.priceRow}>
              <Text style={s.oldPrice}>{alert.old_price.toFixed(2).replace('.', ',')} EUR</Text>
              <MaterialCommunityIcons name="arrow-right" size={14} color="#D14953" />
              <Text style={s.newPrice}>{alert.new_price.toFixed(2).replace('.', ',')} EUR</Text>
              <View style={s.dropBadge}>
                <MaterialCommunityIcons name="arrow-down" size={10} color="#FFF" />
                <Text style={s.dropText}>-{alert.drop_percent}%</Text>
              </View>
            </View>

            <Text style={s.perDayText}>
              {lang === 'de'
                ? `= ${alert.price_per_day.toFixed(2).replace('.', ',')} EUR pro Tag`
                : `= ${alert.price_per_day.toFixed(2).replace('.', ',')} EUR al giorno`}
            </Text>

            <TouchableOpacity
              style={s.ctaButton}
              onPress={() => alert.affiliate_url && Linking.openURL(alert.affiliate_url)}
              testID={`price-alert-cta-${alert.product_id}`}
            >
              <Text style={s.ctaText}>
                {lang === 'de' ? 'Zum guenstigeren Preis ansehen' : 'Vedi il prezzo ridotto'}
              </Text>
              <MaterialCommunityIcons name="open-in-new" size={12} color="#D14953" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Text style={s.disclaimer}>
        {lang === 'de'
          ? 'Preise koennen variieren. Affiliate-Link.'
          : 'I prezzi possono variare. Link affiliato.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A2D26' },
  alertCard: {
    backgroundColor: '#F0FAF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D4E8DC',
    position: 'relative' as const,
  },
  dismissBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
  alertContent: { gap: 6 },
  nutrientBadge: {
    alignSelf: 'flex-start' as const,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nutrientBadgeText: { fontSize: 11, fontWeight: '600', color: '#D14953' },
  productName: { fontSize: 14, fontWeight: '600', color: '#1A2D26', paddingRight: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  oldPrice: { fontSize: 13, color: '#8FA39B', textDecorationLine: 'line-through' as const },
  newPrice: { fontSize: 15, fontWeight: '700', color: '#1A2D26' },
  dropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  dropText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  perDayText: { fontSize: 12, color: '#5C7A6F', fontStyle: 'italic' as const },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ctaText: { fontSize: 13, fontWeight: '600', color: '#D14953' },
  disclaimer: { fontSize: 10, color: '#B0BDB6', textAlign: 'center', marginTop: 4 },
});
