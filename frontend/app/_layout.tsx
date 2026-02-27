import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LangProvider } from './LangContext';

export default function RootLayout() {
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
