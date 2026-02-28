import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { trackingStyles as styles } from './trackingStyles';

interface Insight {
  type: string;
  icon: string;
  title: string;
  text: string;
}

interface InsightsCardProps {
  insights: Insight[];
  lang: string;
}

const INSIGHT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  positive: { bg: '#DCFCE7', text: '#166534', icon: '#22C55E' },
  warning: { bg: '#FEF3C7', text: '#92400E', icon: '#F59E0B' },
  suggestion: { bg: '#E0F2FE', text: '#075985', icon: '#0EA5E9' },
  info: { bg: '#F3F4F6', text: '#374151', icon: '#6B7280' },
  motivation: { bg: '#F3E8FF', text: '#6B21A8', icon: '#A855F7' },
};

export function InsightsCard({ insights, lang }: InsightsCardProps) {
  return (
    <View testID="insights-card">
      <Text style={styles.sectionTitle}>{lang === 'de' ? 'Ihr Coach sagt...' : 'Il tuo coach dice...'}</Text>
      {insights.map((insight, idx) => {
        const colors = INSIGHT_COLORS[insight.type] || INSIGHT_COLORS.info;
        return (
          <View key={idx} style={[styles.insightCard, { backgroundColor: colors.bg }]}>
            <MaterialCommunityIcons name={insight.icon as any} size={24} color={colors.icon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, { color: colors.text }]}>{insight.title}</Text>
              <Text style={[styles.insightText, { color: colors.text }]}>{insight.text}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
