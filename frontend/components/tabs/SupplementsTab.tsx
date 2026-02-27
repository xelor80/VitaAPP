import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { styles } from '../styles/resultsStyles';

export function SupplementsTab({ analysis, onShopPress, lang }: { analysis: any; onShopPress: (id: string, url: string) => void; lang: string }) {
  return (
    <View>
      {analysis.supplements_general_info?.map((s: any, i: number) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="pill" size={20} color="#2C5F78" />
            <Text style={styles.cardTitle}>{s.nutrient}</Text>
            <View style={[styles.badge, s.evidence_level === 'high' ? styles.badgeHigh : s.evidence_level === 'medium' ? styles.badgeMed : styles.badgeLow]}>
              <Text style={styles.badgeText}>{s.evidence_level === 'high' ? 'Stark' : s.evidence_level === 'medium' ? 'Mittel' : 'Gering'}</Text>
            </View>
          </View>
          <Text style={styles.cardBody}>{s.why}</Text>
          {s.cautions ? (
            <View style={styles.cautionRow}>
              <MaterialCommunityIcons name="alert-outline" size={14} color="#D9534F" />
              <Text style={styles.cautionText}>{s.cautions}</Text>
            </View>
          ) : null}
          {s.food_sources?.length > 0 && (
            <View style={styles.sourcesWrap}>
              <Text style={styles.sourcesLabel}>{t(lang, 'natural_sources')}:</Text>
              <Text style={styles.sourcesText}>{s.food_sources.join(', ')}</Text>
            </View>
          )}
        </View>
      ))}

      {analysis.brand_products?.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Passende Produkte</Text>
          <Text style={styles.sectionSubtitle}>{lang === 'de' ? 'Von Joachim Kaeser (Werbung)' : 'Di Joachim Kaeser (Pubblicità)'}</Text>
        </View>
      )}
      {analysis.brand_products?.map((p: any, i: number) => (
        <View key={i} testID={`product-card-${p.product_id}`} style={styles.productCard}>
          <View style={styles.productTop}>
            {p.image_url ? (
              <Image source={{ uri: p.image_url }} style={styles.productImage} resizeMode="contain" />
            ) : (
              <View style={styles.productIcon}>
                <MaterialCommunityIcons name="package-variant-closed" size={24} color="#4A8B71" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{p.name}</Text>
              <View style={styles.productPriceRow}>
                {p.price ? <Text style={styles.productPrice}>{p.price}</Text> : null}
                {p.rating ? (
                  <View style={styles.ratingRow}>
                    <MaterialCommunityIcons name="star" size={13} color="#F5A623" />
                    <Text style={styles.ratingText}>{p.rating}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          <Text style={styles.productReason}>{p.reason}</Text>
          {p.note ? <Text style={styles.productNote}>{p.note}</Text> : null}
          <TouchableOpacity testID={`product-shop-btn-${p.product_id}`} style={styles.shopBtn} activeOpacity={0.7} onPress={() => onShopPress(p.product_id, p.affiliate_url)}>
            <MaterialCommunityIcons name="open-in-new" size={16} color="#FFFFFF" />
            <Text style={styles.shopBtnText}>  Zum Shop</Text>
          </TouchableOpacity>
        </View>
      ))}

      {analysis.brand_products?.length === 0 && analysis.supplements_general_info?.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="pill" size={40} color="#8FA39B" />
          <Text style={styles.emptyStateText}>Keine Supplement-Informationen verfügbar</Text>
        </View>
      )}
    </View>
  );
}
