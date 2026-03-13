import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Unbounded_900Black,
} from '@expo-google-fonts/unbounded';
import {
  Figtree_400Regular,
  Figtree_600SemiBold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';

import { AppShell } from '@/components/AppShell';
import { Colors } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const hasHydrated = useAppStore((state) => state.hasHydrated);
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_900Black,
    Figtree_400Regular,
    Figtree_600SemiBold,
    Figtree_800ExtraBold,
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded && hasHydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hasHydrated]);

  if (!fontsLoaded || !hasHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.violet} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.fullScreen}>
      <AppShell>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="runner" />
        </Stack>
      </AppShell>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
});
