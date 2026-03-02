import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { hasSavedAnalysis } from '../../src/store';

interface Props {
  lang: string;
  onShowAnalysis: () => void;
  onNewAnalysis: () => void;
}

export function SavedAnalysisButtons({ lang, onShowAnalysis, onNewAnalysis }: Props) {
  const [hasAnalysis, setHasAnalysis] = useState(false);

  useEffect(() => {
    hasSavedAnalysis().then(setHasAnalysis);
  }, []);

  if (!hasAnalysis) return null;

  return (
    <View style={styles.wrap} data-testid="saved-analysis-buttons">
      <TouchableOpacity
        data-testid="show-saved-analysis-btn"
        style={styles.showBtn}
        onPress={onShowAnalysis}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="file-document-outline" size={18} color="#FFF" />
        <Text style={styles.showBtnText}>
          {lang === 'de' ? 'Letzte Analyse anzeigen' : 'Mostra ultima analisi'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        data-testid="new-analysis-btn"
        style={styles.newBtn}
        onPress={onNewAnalysis}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#4A8B71" />
        <Text style={styles.newBtnText}>
          {lang === 'de' ? 'Neue Analyse starten' : 'Nuova analisi'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  showBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4A8B71',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  showBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  newBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F4F2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#D0DDD6',
  },
  newBtnText: {
    color: '#4A8B71',
    fontSize: 13,
    fontWeight: '600',
  },
});
