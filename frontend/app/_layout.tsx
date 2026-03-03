import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { LangProvider } from '../src/LangContext';
import { SettingsProvider } from '../src/SettingsContext';
import { useSwipeBack } from '../src/useSwipeBack';

function SwipeWrapper({ children }: { children: React.ReactNode }) {
  const swipeHandlers = useSwipeBack();
  return <View style={{ flex: 1 }} {...swipeHandlers}>{children}</View>;
}

export default function RootLayout() {
  return (
    <LangProvider>
      <SettingsProvider>
        <StatusBar style="dark" />
        <SwipeWrapper>
          <Stack screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}>
            <Stack.Screen name="index" options={{ gestureEnabled: false }} />
            <Stack.Screen name="results" />
            <Stack.Screen name="recipe" />
            <Stack.Screen name="diary" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="supplement-plan" />
            <Stack.Screen name="health-profile" />
            <Stack.Screen name="progress" />
            <Stack.Screen name="recipes-catalog" />
          </Stack>
        </SwipeWrapper>
      </SettingsProvider>
    </LangProvider>
  );
}
