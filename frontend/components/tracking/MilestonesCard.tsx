import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { trackingStyles as styles } from './trackingStyles';

interface Milestone {
  id: string;
  name_de: string;
  name_it: string;
  icon: string;
  achieved: boolean;
}

interface MilestonesCardProps {
  milestones: Milestone[];
  lang: string;
}

const MILESTONE_COLORS: Record<string, string> = {
  fire: '#F59E0B',
  star: '#FBBF24',
  trophy: '#EAB308',
  medal: '#F97316',
  'check-decagram': '#DC2626',
  'shield-check': '#DC2626',
  'flag-checkered': '#8B5CF6',
  'calendar-check': '#6366F1',
  'calendar-star': '#EC4899',
};

export function MilestonesCard({ milestones, lang }: MilestonesCardProps) {
  return (
    <View style={styles.milestonesCard} testID="milestones-card">
      <Text style={styles.sectionTitle}>{lang === 'de' ? 'Meilensteine' : 'Traguardi'}</Text>
      {milestones.map((m) => {
        const iconColor = MILESTONE_COLORS[m.icon] || '#D14953';
        return (
          <View key={m.id} style={styles.milestoneRow}>
            <View style={[styles.milestoneBadge, { backgroundColor: `${iconColor}20` }]}>
              <MaterialCommunityIcons name={m.icon as any} size={22} color={iconColor} />
            </View>
            <Text style={styles.milestoneName}>{lang === 'de' ? m.name_de : m.name_it}</Text>
            <MaterialCommunityIcons name="check-circle" size={22} color="#DC2626" />
          </View>
        );
      })}
    </View>
  );
}
