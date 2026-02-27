import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { styles } from '../styles/resultsStyles';

const TIME_ICONS: Record<string, string> = {
  'Morgens': 'weather-sunset-up',
  'Mittags': 'white-balance-sunny',
  'Abends': 'weather-sunset-down',
  'Vor dem Schlafen': 'weather-night',
};
const TIME_COLORS: Record<string, string> = {
  'Morgens': '#FF9800',
  'Mittags': '#F5C842',
  'Abends': '#E8845C',
  'Vor dem Schlafen': '#7986CB',
};

export function NutritionTab({ analysis, onShopPress, lang }: { analysis: any; onShopPress: (id: string, url: string) => void; lang: string }) {
  const schedule = analysis.supplement_schedule || [];
  return (
    <View>
      {schedule.length > 0 && (
        <View style={styles.scheduleSection}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#4A8B71" />
            <Text style={styles.cardTitle}>{t(lang, 'schedule_title')}</Text>
          </View>
          <Text style={styles.scheduleSubtitle}>{t(lang, 'schedule_subtitle')}</Text>

          {schedule.map((item: any, i: number) => {
            const timeKey = Object.keys(TIME_ICONS).find(k => item.time?.includes(k)) || 'Morgens';
            const iconName = TIME_ICONS[timeKey] || 'clock-outline';
            const iconColor = TIME_COLORS[timeKey] || '#4A8B71';
            return (
              <View key={i} testID={`schedule-item-${i}`} style={styles.scheduleCard}>
                <View style={styles.scheduleLeft}>
                  <View style={[styles.scheduleTimeIcon, { backgroundColor: iconColor + '20' }]}>
                    <MaterialCommunityIcons name={iconName as any} size={22} color={iconColor} />
                  </View>
                  <Text style={[styles.scheduleTime, { color: iconColor }]}>{item.time}</Text>
                </View>
                <View style={styles.scheduleRight}>
                  <View style={styles.scheduleProductRow}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.scheduleProductImg} resizeMode="contain" />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleProductName}>{item.product_name}</Text>
                      <Text style={styles.scheduleDosage}>{item.dosage}</Text>
                    </View>
                  </View>
                  {item.instruction ? <Text style={styles.scheduleInstruction}>{item.instruction}</Text> : null}
                  {item.application_instructions ? (
                    <View style={styles.officialInstructionRow}>
                      <MaterialCommunityIcons name="information-outline" size={13} color="#2C5F78" />
                      <Text style={styles.officialInstructionText}>{item.application_instructions}</Text>
                    </View>
                  ) : null}
                  {item.affiliate_url ? (
                    <TouchableOpacity testID={`schedule-shop-${i}`} style={styles.scheduleShopLink} onPress={() => onShopPress(item.product_id || '', item.affiliate_url)}>
                      <MaterialCommunityIcons name="open-in-new" size={13} color="#4A8B71" />
                      <Text style={styles.scheduleShopText}>  {t(lang, 'shop_link')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}

          <View style={styles.scheduleCaution}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#D9534F" />
            <Text style={styles.scheduleCautionText}>{t(lang, 'schedule_disclaimer')}</Text>
          </View>
        </View>
      )}

      {analysis.nutrition_tips?.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="food-apple-outline" size={20} color="#4A8B71" />
            <Text style={styles.cardTitle}>{t(lang, 'nutrition_tips_title')}</Text>
          </View>
          {analysis.nutrition_tips.map((tip: string, i: number) => (
            <View key={i} style={styles.nutritionTipCard}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.nutritionTipText}>{tip}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="food-apple-outline" size={40} color="#8FA39B" />
          <Text style={styles.emptyStateText}>Keine Ernährungstipps verfügbar</Text>
        </View>
      )}
    </View>
  );
}
