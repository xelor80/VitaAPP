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
        <MaterialCommunityIcons name="chef-hat" size={24} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.recipeCatalogBtnTitle}>
          {lang === 'de' ? 'Rezeptkatalog' : 'Catalogo Ricette'}
        </Text>
        <Text style={styles.recipeCatalogBtnSub}>
          {lang === 'de' ? 'Gesunde Rezepte durchstöbern & filtern' : 'Sfoglia e filtra ricette salutari'}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color="#D4E8DC" />
    </TouchableOpacity>
  );
}
