import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { Colors } from '@/constants/tokens';

const MAX_APP_WIDTH = 430;

/**
 * Wraps the app so on desktop (web) the UI is constrained to a phone-width column (430px) centered.
 * Mobile-first: on native or narrow viewports, uses full width.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width > MAX_APP_WIDTH;

  if (!isWide) {
    return <View style={styles.flex}>{children}</View>;
  }

  return (
    <View style={styles.outer}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  outer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_APP_WIDTH,
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
