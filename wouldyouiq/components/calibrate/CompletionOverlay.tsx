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
          <Text style={styles.title}>Calibration complete!</Text>
          <Text style={styles.subtitle}>Your priorities are updated.</Text>
          <View style={styles.xpPill}>
            <Text style={styles.xpText}>+{xpEarned} XP</Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakCard}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{streak} day streak</Text>
            </View>
          )}
          <Pressable style={styles.cta} onPress={handleSeePriorities}>
            <Text style={styles.ctaText}>See My Priorities →</Text>
          </Pressable>
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
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.bodyLight,
    fontSize: 15,
    color: Colors.t2,
    marginBottom: 20,
    textAlign: 'center',
  },
  xpPill: {
    backgroundColor: Colors.violet + '40',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 16,
  },
  xpText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.violet,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.s2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.gold,
  },
  cta: {
    backgroundColor: Colors.violet,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.bg,
  },
});
