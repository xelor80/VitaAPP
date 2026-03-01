import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface VideosButtonProps {
  lang: string;
  onPress: () => void;
}

export function VideosButton({ lang, onPress }: VideosButtonProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.85}
      testID="videos-button"
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="youtube" size={24} color="#FF0000" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {lang === 'de' ? 'Videos & Tipps' : 'Video e consigli'}
        </Text>
        <Text style={styles.subtitle}>
          {lang === 'de' ? 'Expertenvideos zu Nahrungsergänzung' : 'Video esperti sugli integratori'}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#8FA39B" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2D26',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#5C7A6F',
  },
});
