import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LangProvider } from '../src/LangContext';
import { SettingsProvider } from '../src/SettingsContext';
import { GuideProvider, useGuide } from '../src/GuideContext';
import { AuthProvider, useAuth } from '../src/AuthContext';
import { useSwipeBack } from '../src/useSwipeBack';
import { GuideMascot } from '../components/GuideMascot';
import { ActionToast } from '../components/ActionToast';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

function SwipeWrapper({ children }: { children: React.ReactNode }) {
  const swipeHandlers = useSwipeBack();
  return <View style={{ flex: 1 }} {...swipeHandlers}>{children}</View>;
}

function GuideOverlay() {
  const rawPathname = usePathname();
  const [firstName, setFirstName] = useState<string | null>(null);
  const guide = useGuide();

  // Normalize pathname: remove group segments like "(tabs)" and clean up
  const pathname = (rawPathname || '/')
    .replace(/\/?\(tabs\)\/?/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';

  useEffect(() => {
    if (!guide.disclaimerAccepted) return;
    AsyncStorage.getItem('health_profile_id').then(async (profileId) => {
      if (!profileId) return;
      try {
        const res = await fetch(`${API_URL}/api/health-profile/${profileId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.first_name) setFirstName(data.profile.first_name);
        }
      } catch {}
    }).catch(() => {});
  }, [guide.disclaimerAccepted]);

  if (!guide.disclaimerAccepted) return null;

  return <GuideMascot currentRoute={pathname || '/'} firstName={firstName} />;
}

export default function RootLayout() {
  return (
    <LangProvider>
      <SettingsProvider>
        <AuthProvider>
          <GuideProvider>
            <StatusBar style="dark" />
            <SwipeWrapper>
              <View style={{ flex: 1 }}>
                <Stack screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }}>
                  <Stack.Screen name="login" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="results" />
                  <Stack.Screen name="recipe" />
                  <Stack.Screen name="diary" />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="supplement-plan" />
                  <Stack.Screen name="health-profile" />
                  <Stack.Screen name="progress" />
                  <Stack.Screen name="recipes-catalog" />
                  <Stack.Screen name="admin" />
                  <Stack.Screen name="tracking" />
                  <Stack.Screen name="product-comparison" />
                  <Stack.Screen name="videos" />
                  <Stack.Screen name="medications" />
                  <Stack.Screen name="daily-plan" />
                  <Stack.Screen name="rewards" />
                  <Stack.Screen name="weekly-report" />
                  <Stack.Screen name="water-tracking" />
                  <Stack.Screen name="stress" />
                  <Stack.Screen name="stress-player" />
                  <Stack.Screen name="weight-metabolism" />
                </Stack>
                <GuideOverlay />
                <ActionToast />
              </View>
            </SwipeWrapper>
          </GuideProvider>
        </AuthProvider>
      </SettingsProvider>
    </LangProvider>
  );
}
