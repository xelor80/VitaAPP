import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './homeStyles';

interface Props {
  lang: string;
  onPress: () => void;
}

export function RecipeCatalogButton({ lang, onPress }: Props) {
  return (
    <TouchableOpacity
      testID="recipe-catalog-btn"
      style={styles.recipeCatalogButton}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.recipeCatalogIconWrap}>
        <MaterialCommunityIcons name="chef-hat" size={16} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.recipeCatalogBtnTitle}>
          {lang === 'de' ? 'Deine Rezepte' : 'Le tue Ricette'}
        </Text>
        <Text style={styles.recipeCatalogBtnSub} numberOfLines={1}>
          {lang === 'de' ? 'Personalisierte & gesunde Rezepte' : 'Ricette personalizzate e salutari'}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#D4E8DC" />
    </TouchableOpacity>
  );
}
