import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  withDelay,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '@/constants/tokens';
import { ConfettiCannon } from '@/components/Confetti';

const { height: H } = Dimensions.get('window');

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
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withSpring(1);
      scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 150 }));
    } else {
      opacity.value = withSpring(0);
      scale.value = withSpring(0);
    }
  }, [visible, opacity, scale]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <ConfettiCannon
        visible={visible}
        particleCount={70}
        origin={{ x: 0, y: H * 0.35 }}
      />
      <Animated.View style={[styles.overlay, backdropStyle]} pointerEvents="box-none">
        <Animated.View style={[styles.card, cardStyle]} entering={FadeIn.delay(100)}>
          <Text style={styles.badge}>🎯</Text>
          <Text style={styles.title}>Priorities Updated!</Text>
          <Text style={styles.subtitle}>Your choices are shaping your future ✨</Text>
          <View style={styles.xpPill}>
            <Text style={styles.xpEmoji}>⚡</Text>
            <View>
              <Text style={styles.xpText}>+{xpEarned} XP</Text>
              <Text style={styles.xpSub}>Earned today</Text>
            </View>
          </View>
          {streak > 0 && (
            <View style={styles.streakCard}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View>
                <Text style={styles.streakText}>{streak} Day Streak!</Text>
                <Text style={styles.streakSub}>Come back tomorrow to keep it going</Text>
              </View>
            </View>
          )}
          <View style={styles.ctaRow}>
            <Pressable style={[styles.cta, styles.ctaPrimary]} onPress={handleKeepGoing}>
              <Text style={styles.ctaPrimaryText}>Keep Swiping ⚡</Text>
            </Pressable>
            <Pressable style={[styles.cta, styles.ctaSecondary]} onPress={handleSeePriorities}>
              <Text style={styles.ctaSecondaryText}>My Priorities →</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 200,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 201,
    padding: 24,
  },
  card: {
    backgroundColor: Colors.s1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.s2,
    padding: 28,
    alignItems: 'center',
    maxWidth: 320,
  },
  badge: {
    fontSize: 72,
    marginBottom: 14,
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
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimary: {
    backgroundColor: Colors.violet,
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
