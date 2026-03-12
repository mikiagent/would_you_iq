import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useUserStore } from '@/stores/userStore';
import { Colors } from '@/constants/tokens';
import OnboardingScreen from './onboarding';
import { MilestoneToast } from '@/components/MilestoneToast';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [webReady, setWebReady] = useState(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // On web, useFonts can hang. Stop blocking after a short delay so the app can render.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const t = setTimeout(() => {
      setWebReady(true);
      SplashScreen.hideAsync();
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const ready = fontsLoaded || (Platform.OS === 'web' && webReady);

  if (!ready) {
    return (
      <View style={[styles.loading, styles.fullScreen]}>
        <ActivityIndicator size="large" color={Colors.violet} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.flex1, styles.fullScreen]}>
      <RootLayoutNav />
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const onboardingComplete = useUserStore((s) => s.profile.onboardingComplete);

  if (!onboardingComplete) {
    return <OnboardingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <MilestoneToast />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreen: {
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  flex1: {
    flex: 1,
  },
});
