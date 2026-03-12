import React from 'react';
import { View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function RecipesTab() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/recipes-catalog' as any);
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#F5F7FA' }} />;
}
