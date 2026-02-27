import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LangProvider } from '../src/LangContext';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.id = 'vitaguide-custom-css';
      style.textContent = `
        .rimg-wrap { position:relative !important; width:100% !important; height:180px !important; min-height:180px !important; overflow:hidden !important; border-top-left-radius:16px !important; border-top-right-radius:16px !important; background:#E8F5E9 !important; }
        .rimg-wrap img, .rimg-wrap > div { position:absolute !important; top:0 !important; left:0 !important; width:100% !important; height:100% !important; object-fit:cover !important; background-size:cover !important; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <LangProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="results" />
        <Stack.Screen name="recipe" />
        <Stack.Screen name="diary" />
      </Stack>
    </LangProvider>
  );
}
