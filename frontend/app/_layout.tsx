import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LangProvider } from '../src/LangContext';
import { SettingsProvider } from '../src/SettingsContext';

export default function RootLayout() {
  return (
    <LangProvider>
      <SettingsProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="results" />
          <Stack.Screen name="recipe" />
          <Stack.Screen name="diary" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="supplement-plan" />
          <Stack.Screen name="health-profile" />
        </Stack>
      </SettingsProvider>
    </LangProvider>
  );
}
