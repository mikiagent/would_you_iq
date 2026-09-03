import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';

type XpBurst = { id: number; value: number; left: number };

export function useXpOverlay() {
  const [bursts, setBursts] = useState<XpBurst[]>([]);
  const width = Dimensions.get('window').width;
  const reduceMotion = useReducedMotion();

  const trigger = useCallback((value: number) => {
    const base = width * 0.5 - 58;
    const drift = (Math.random() - 0.5) * 70;
    setBursts((prev) => [...prev, { id: Date.now() + Math.random(), value, left: base + drift }]);
  }, [width]);

  const overlay = (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map((burst) => (
        <XpFloat
          key={burst.id}
          value={burst.value}
          left={burst.left}
          reduceMotion={reduceMotion}
          onDone={() => {
            setBursts((prev) => prev.filter((entry) => entry.id !== burst.id));
          }}
        />
      ))}
    </View>
  );

  return { triggerXp: trigger, xpOverlay: overlay };
}

function XpFloat({
  value,
  left,
  reduceMotion,
  onDone,
}: {
  value: number;
  left: number;
  reduceMotion: boolean;
  onDone: () => void;
}) {
  const translateY = useRef(new Animated.Value(8)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (reduceMotion) {
      // Static fade: show the XP without motion, then dismiss.
      translateY.setValue(0);
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start(onDone);
      return;
    }

    Animated.parallel([
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -84,
          duration: 840,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: (Math.random() - 0.5) * 26,
          duration: 840,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(360),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 240,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.spring(scale, {
            toValue: 1.08,
            tension: 140,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.96,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(onDone);
  }, [onDone, opacity, reduceMotion, scale, translateX, translateY]);

  return (
    <Animated.View
      style={[
        styles.float,
        {
          left,
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    >
      <Text style={styles.text}>{`+${value} XP`}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  float: {
    position: 'absolute',
    top: '36%',
    zIndex: 600,
  },
  text: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(245,200,66,0.12)',
    textShadowColor: 'rgba(245,200,66,0.6)',
    textShadowRadius: 12,
  },
});
