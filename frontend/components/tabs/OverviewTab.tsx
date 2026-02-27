import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { styles } from '../styles/resultsStyles';

export function OverviewTab({ analysis, onShopPress, lang }: { analysis: any; onShopPress: (id: string, url: string) => void; lang: string }) {
  const featuredProduct = analysis.brand_products?.[0];
  return (
    <View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="text-box-outline" size={20} color="#4A8B71" />
          <Text style={styles.cardTitle}>{lang === 'it' ? 'Riepilogo' : 'Zusammenfassung'}</Text>
        </View>
        <Text style={styles.cardBody}>{analysis.summary}</Text>
      </View>

      {analysis.red_flags?.map((rf: any, i: number) => (
        <View key={i} testID={`red-flag-${i}`} style={styles.redFlagCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#D9534F" />
            <Text style={[styles.cardTitle, { color: '#D9534F' }]}>{rf.flag}</Text>
          </View>
          <Text style={styles.cardBody}>{rf.action}</Text>
        </View>
      ))}

      {analysis.nutrition_tips?.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#4A8B71" />
            <Text style={styles.cardTitle}>{t(lang, 'quick_tips')}</Text>
          </View>
          {analysis.nutrition_tips.slice(0, 3).map((tip: string, i: number) => (
            <View key={i} style={styles.tipRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}

      {featuredProduct && !analysis.red_flags?.length && (
        <View style={styles.featuredProductCard}>
          <View style={styles.featuredHeader}>
            <MaterialCommunityIcons name="star-outline" size={18} color="#4A8B71" />
            <Text style={styles.featuredLabel}>{lang === 'de' ? 'Passend für Sie' : 'Adatto a te'}</Text>
            <Text style={styles.featuredAdLabel}>{lang === 'de' ? 'Werbung' : 'Pubblicità'}</Text>
          </View>
          <View style={styles.featuredContent}>
            {featuredProduct.image_url ? (
              <Image source={{ uri: featuredProduct.image_url }} style={styles.featuredImage} resizeMode="contain" />
            ) : (
              <View style={[styles.featuredImage, styles.featuredImagePlaceholder]}>
                <MaterialCommunityIcons name="package-variant-closed" size={32} color="#4A8B71" />
              </View>
            )}
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredName}>{featuredProduct.name}</Text>
              {featuredProduct.price ? <Text style={styles.featuredPrice}>{featuredProduct.price}</Text> : null}
              <Text style={styles.featuredReason} numberOfLines={2}>{featuredProduct.reason}</Text>
              {featuredProduct.rating ? (
                <View style={styles.ratingRow}>
                  <MaterialCommunityIcons name="star" size={14} color="#F5A623" />
                  <Text style={styles.ratingText}>{featuredProduct.rating}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity testID={`featured-shop-btn-${featuredProduct.product_id}`} style={styles.featuredShopBtn} activeOpacity={0.7} onPress={() => onShopPress(featuredProduct.product_id, featuredProduct.affiliate_url)}>
            <MaterialCommunityIcons name="open-in-new" size={16} color="#FFFFFF" />
            <Text style={styles.shopBtnText}>  {t(lang, 'shop_link')}</Text>
          </TouchableOpacity>
          {featuredProduct.video_url ? (
            <TouchableOpacity data-testid={`video-btn-${featuredProduct.product_id}`} style={styles.videoBtn} activeOpacity={0.7} onPress={() => Linking.openURL(featuredProduct.video_url)}>
              <MaterialCommunityIcons name="play-circle-outline" size={16} color="#D9534F" />
              <Text style={styles.videoBtnText}>  {t(lang, 'watch_video')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}
