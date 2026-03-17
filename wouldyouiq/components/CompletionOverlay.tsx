import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Colors, Fonts } from '@/constants/tokens';
import { useConfettiOverlay } from '@/components/ConfettiLayer';

type Props = {
  visible: boolean;
  xpLabel: string;
  streakLabel: string;
  onKeepSwiping: () => void;
  onGoToPriorities: () => void;
};

export function CompletionOverlay({
  visible,
  xpLabel,
  streakLabel,
  onKeepSwiping,
  onGoToPriorities,
}: Props) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardTranslateY = useRef(new Animated.Value(26)).current;
  const badgeScale = useRef(new Animated.Value(0.4)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(18)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const streakOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const { confettiOverlay, triggerConfetti } = useConfettiOverlay();

  useEffect(() => {
    if (!visible) {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => setMounted(false));
      return;
    }

    setMounted(true);
    backdropOpacity.setValue(0);
    cardScale.setValue(0.92);
    cardTranslateY.setValue(26);
    badgeScale.setValue(0.4);
    titleOpacity.setValue(0);
    titleTranslateY.setValue(18);
    xpOpacity.setValue(0);
    streakOpacity.setValue(0);
    buttonOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 110,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.spring(badgeScale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(xpOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(streakOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    triggerConfetti({ x: 80, y: 0, count: 90 });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const second = setTimeout(() => {
      triggerConfetti({ x: 320, y: 0, count: 90 });
    }, 220);

    return () => clearTimeout(second);
  }, [
    backdropOpacity,
    badgeScale,
    buttonOpacity,
    cardScale,
    cardTranslateY,
    streakOpacity,
    titleOpacity,
    titleTranslateY,
    triggerConfetti,
    visible,
    xpOpacity,
  ]);

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible={mounted} transparent animationType="none">
      <Animated.View style={[styles.root, { opacity: backdropOpacity }]}>
        {confettiOverlay}
        <Animated.View
          style={[
            styles.panel,
            {
              transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
            },
          ]}
        >
          <LinearGradient colors={['rgba(167,139,250,0.18)', 'rgba(245,200,66,0.07)']} style={styles.card}>
            <Animated.Text style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>🎯</Animated.Text>
            <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }}>
              <Text style={styles.title}>Priorities Updated!</Text>
              <Text style={styles.sub}>Your choices are shaping your future ✨</Text>
            </Animated.View>
            <Animated.View style={[styles.xpRow, { opacity: xpOpacity }]}>
              <Text style={styles.xpEmoji}>⚡</Text>
              <View>
                <Text style={styles.xpLabel}>{xpLabel}</Text>
                <Text style={styles.xpSub}>Earned today</Text>
              </View>
            </Animated.View>
            <Animated.View style={[styles.streakRow, { opacity: streakOpacity }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View>
                <Text style={styles.streakLabel}>{streakLabel}</Text>
                <Text style={styles.streakSub}>Come back tomorrow to keep it going.</Text>
              </View>
            </Animated.View>
            <Animated.View style={[styles.buttons, { opacity: buttonOpacity }]}>
              <TouchableOpacity style={styles.primary} onPress={onKeepSwiping}>
                <Text style={styles.primaryText}>Keep Swiping ⚡</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={onGoToPriorities}>
                <Text style={styles.secondaryText}>My Priorities →</Text>
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(5,5,14,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  panel: {
    width: '100%',
    maxWidth: 520,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    padding: 14,
    backgroundColor: Colors.s1,
    borderWidth: 1,
    borderColor: Colors.b2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  badge: {
    fontSize: 34,
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 16,
    textAlign: 'center',
    color: Colors.t1,
    marginBottom: 4,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    textAlign: 'center',
    color: Colors.t2,
    marginBottom: 10,
    lineHeight: 16,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gold,
    marginBottom: 8,
    backgroundColor: 'rgba(245,200,66,0.08)',
  },
  xpEmoji: {
    fontSize: 18,
  },
  xpLabel: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.gold,
  },
  xpSub: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.t2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    padding: 9,
    borderWidth: 1,
    borderColor: Colors.gold2,
    marginBottom: 10,
    backgroundColor: 'rgba(255,159,67,0.08)',
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.gold2,
  },
  streakSub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 9,
    color: Colors.t2,
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 11,
    backgroundColor: Colors.v2,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: '#fff',
  },
  secondary: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 11,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t2,
  },
});
