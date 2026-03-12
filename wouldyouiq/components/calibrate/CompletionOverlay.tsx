import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '@/constants/tokens';
import { ConfettiCannon } from '@/components/Confetti';

const { width: W, height: H } = Dimensions.get('window');

const easeOutBack = Easing.bezier(0.34, 1.2, 0.64, 1);

type CompletionOverlayProps = {
  visible: boolean;
  xpEarned: number;
  streak: number;
  onClose: () => void;
};

export function CompletionOverlay({
  visible,
  xpEarned,
  streak,
  onClose,
}: CompletionOverlayProps) {
  const router = useRouter();
  const overlayOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);
  const badgeRotate = useSharedValue(-15);
  const badgeOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const titleO = useSharedValue(0);
  const subY = useSharedValue(14);
  const subO = useSharedValue(0);
  const xpScale = useSharedValue(0.82);
  const xpO = useSharedValue(0);
  const streakY = useSharedValue(12);
  const streakO = useSharedValue(0);
  const ctaY = useSharedValue(14);
  const ctaO = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 400 });
      badgeScale.value = withSequence(
        withTiming(1.32, { duration: 420, easing: easeOutBack }),
        withTiming(0.92, { duration: 140 }),
        withTiming(1, { duration: 140 })
      );
      badgeRotate.value = withSequence(
        withTiming(5, { duration: 420, easing: easeOutBack }),
        withTiming(-2, { duration: 140 }),
        withTiming(0, { duration: 140 })
      );
      badgeOpacity.value = withTiming(1, { duration: 420 });
      titleY.value = withDelay(200, withTiming(0, { duration: 550, easing: easeOutBack }));
      titleO.value = withDelay(200, withTiming(1, { duration: 550 }));
      subY.value = withDelay(350, withTiming(0, { duration: 550, easing: easeOutBack }));
      subO.value = withDelay(350, withTiming(1, { duration: 550 }));
      xpScale.value = withDelay(500, withTiming(1, { duration: 550, easing: easeOutBack }));
      xpO.value = withDelay(500, withTiming(1, { duration: 550 }));
      streakY.value = withDelay(650, withTiming(0, { duration: 550, easing: easeOutBack }));
      streakO.value = withDelay(650, withTiming(1, { duration: 550 }));
      ctaY.value = withDelay(820, withTiming(0, { duration: 550, easing: easeOutBack }));
      ctaO.value = withDelay(820, withTiming(1, { duration: 550 }));
    } else {
      overlayOpacity.value = withTiming(0, { duration: 300 });
      badgeScale.value = withTiming(0);
      badgeRotate.value = withTiming(-15);
      badgeOpacity.value = withTiming(0);
      titleY.value = 20;
      titleO.value = 0;
      subY.value = 14;
      subO.value = 0;
      xpScale.value = 0.82;
      xpO.value = 0;
      streakY.value = 12;
      streakO.value = 0;
      ctaY.value = 14;
      ctaO.value = 0;
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [
      { scale: badgeScale.value },
      { rotate: `${badgeRotate.value}deg` },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleO.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subO.value,
    transform: [{ translateY: subY.value }],
  }));

  const xpStyle = useAnimatedStyle(() => ({
    opacity: xpO.value,
    transform: [{ scale: xpScale.value }],
  }));

  const streakStyle = useAnimatedStyle(() => ({
    opacity: streakO.value,
    transform: [{ translateY: streakY.value }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaO.value,
    transform: [{ translateY: ctaY.value }],
  }));

  const handleKeepGoing = () => {
    onClose();
  };

  const handleSeePriorities = () => {
    onClose();
    router.push('/(tabs)/fy');
  };

  if (!visible) return null;

  return (
    <>
      <Animated.View
        style={[styles.overlay, backdropStyle]}
        // @ts-ignore
        pointerEvents={visible ? 'box-none' : 'none'}
      >
        {/* Radial glow */}
        <View style={styles.glow} pointerEvents="none" />

        <ConfettiCannon
          visible={visible}
          particleCount={70}
          origin={{ x: W / 2, y: H * 0.35 }}
        />

        {/* Content */}
        <Animated.View style={[styles.badgeWrap, badgeStyle]}>
          <Text style={styles.badge}>🎯</Text>
        </Animated.View>

        <Animated.Text style={[styles.title, titleStyle]}>Priorities Updated!</Animated.Text>
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          Your choices are shaping your future ✨
        </Animated.Text>

        <Animated.View style={[styles.xpPill, xpStyle]}>
          <Text style={styles.xpEmoji}>⚡</Text>
          <View>
            <Text style={styles.xpText}>+{xpEarned} XP</Text>
            <Text style={styles.xpSub}>Earned today</Text>
          </View>
        </Animated.View>

        {streak > 0 && (
          <Animated.View style={[styles.streakCard, streakStyle]}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakText}>{streak} Day Streak!</Text>
              <Text style={styles.streakSub}>Come back tomorrow to keep it going</Text>
            </View>
          </Animated.View>
        )}

        <Animated.View style={[styles.ctaRow, ctaStyle]}>
          <Pressable
            style={({ pressed }) => [styles.cta, styles.ctaPrimary, pressed && styles.ctaPressed]}
            onPress={handleKeepGoing}
          >
            <Text style={styles.ctaPrimaryText}>Keep Swiping ⚡</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.cta, styles.ctaSecondary, pressed && styles.ctaPressed]}
            onPress={handleSeePriorities}
          >
            <Text style={styles.ctaSecondaryText}>My Priorities →</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,14,0.92)',
    zIndex: 800,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(22px) saturate(1.5)' } as any)
      : {}),
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    // Simulated radial glow at top-center
    backgroundColor: 'transparent',
    // On web this would be a radial gradient; we approximate with a View
  },
  badgeWrap: {
    marginBottom: 14,
  },
  badge: {
    fontSize: 72,
    textShadowColor: 'rgba(167,139,250,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  title: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 26,
    color: Colors.t1,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t2,
    marginBottom: 24,
    textAlign: 'center',
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,200,66,0.28)',
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 20,
    marginBottom: 14,
    gap: 11,
  },
  xpEmoji: {
    fontSize: 26,
  },
  xpText: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 24,
    color: Colors.gold,
  },
  xpSub: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    color: Colors.t2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,159,67,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,159,67,0.22)',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 22,
    gap: 10,
  },
  streakEmoji: {
    fontSize: 22,
  },
  streakText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.gold2,
  },
  streakSub: {
    fontSize: 10,
    color: Colors.t3,
    marginTop: 1,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    maxWidth: 300,
  },
  cta: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    transform: [{ scale: 0.96 }],
  },
  ctaPrimary: {
    backgroundColor: Colors.v3,
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 8,
  },
  ctaPrimaryText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: '#fff',
  },
  ctaSecondary: {
    backgroundColor: Colors.s2,
    borderWidth: 1.5,
    borderColor: Colors.b2,
  },
  ctaSecondaryText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t2,
  },
});
