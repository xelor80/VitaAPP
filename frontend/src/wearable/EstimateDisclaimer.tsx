/**
 * Small helper component used everywhere a non-medical estimate metric
 * (blood glucose, blood pressure, stress) is displayed.
 *
 * Renders a compact orange warning row that cannot be styled away without
 * removing the component itself — that's intentional (Regel 5, 18).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  /** Optional custom text (defaults to the standard disclaimer). */
  text?: string;
  compact?: boolean;
  testID?: string;
}

const DEFAULT_TEXT = 'Wellness-Schätzung durch das Band. Kein medizinischer Messwert.';

export const EstimateDisclaimer: React.FC<Props> = ({ text, compact, testID }) => (
  <View style={[styles.wrap, compact && styles.compact]} testID={testID || 'estimate-disclaimer'}>
    <MaterialCommunityIcons name="alert-outline" size={compact ? 12 : 14} color="#B45309" />
    <Text style={[styles.txt, compact && styles.txtCompact]}>{text || DEFAULT_TEXT}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderColor: '#FBBF24',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
  },
  compact: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  txt: { flex: 1, fontSize: 11, color: '#78350F', fontWeight: '600', lineHeight: 15 },
  txtCompact: { fontSize: 10, lineHeight: 13 },
});
