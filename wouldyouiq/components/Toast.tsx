import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';
import type { ToastState } from '@/domain/models';

export function Toast({
  toast,
  onDone,
}: {
  toast: ToastState | null;
  onDone: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (!toast) return undefined;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -12,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(onDone);
    }, 3200);

    return () => clearTimeout(timeout);
  }, [onDone, opacity, toast, translateY]);

  if (!toast) return null;

  return (
    <Animated.View style={[styles.root, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.icon}>{toast.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{toast.title}</Text>
        <Text style={styles.subtitle}>{toast.subtitle}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 20,
    left: 18,
    right: 18,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 7000,
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.gold,
  },
  subtitle: {
    fontFamily: Fonts.bodyLight,
    fontSize: 11,
    color: Colors.t2,
    marginTop: 2,
  },
});
