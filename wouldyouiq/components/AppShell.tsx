import React, { ReactNode, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';

import { AmbientBackground } from '@/components/AmbientBackground';
import { Toast } from '@/components/Toast';
import { Colors } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';
import { todayKey } from '@/domain/logic';

export function AppShell({ children }: { children: ReactNode }) {
  const toast = useAppStore((state) => state.toast);
  const clearToast = useAppStore((state) => state.clearToast);
  const user = useAppStore((state) => state.user);
  const showToast = useAppStore((state) => state.showToast);
  const didNotifyRef = useRef(false);

  useEffect(() => {
    if (didNotifyRef.current) return;
    if (user.lastCalibrationDate === todayKey()) return;

    didNotifyRef.current = true;
    showToast({
      icon: '🔥',
      title: `Your ${user.streak}-day streak is ready`,
      subtitle: 'Complete today’s calibration to keep it alive.',
    });
  }, [showToast, user.lastCalibrationDate, user.streak]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AmbientBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.app}>{children}</View>
      </SafeAreaView>
      <Toast toast={toast} onDone={clearToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safe: {
    flex: 1,
  },
  app: {
    flex: 1,
    width: '100%',
  },
});
