import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Props {
  lang: string;
}

export function TrustBanner({ lang }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/stats/trust`)
      .then(r => r.json())
      .then(d => setCount(d.display_count))
      .catch(() => {});
  }, []);

  if (!count || count < 100) return null;

  const formatted = count.toLocaleString('de-DE');

  return (
    <View style={s.wrap} testID="trust-banner">
      <MaterialCommunityIcons name="shield-check" size={16} color="#D14953" />
      <Text style={s.text}>
        {lang === 'de'
          ? `Ueber ${formatted} Gesundheitsanalysen durchgefuehrt`
          : `Oltre ${formatted} analisi sanitarie effettuate`}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAF9',
    borderRadius: 10,
    marginBottom: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5C7A6F',
  },
});
