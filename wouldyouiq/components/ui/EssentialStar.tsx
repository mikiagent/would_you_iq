import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Colors } from '@/constants/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type EssentialStarProps = {
  essential: boolean;
  onToggle: () => void;
  size?: number;
};

export function EssentialStar({ essential, onToggle, size = 28 }: EssentialStarProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(essential ? 1 : 0.4);

  useEffect(() => {
    opacity.value = withSpring(essential ? 1 : 0.4, { damping: 15 });
  }, [essential, opacity]);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(1.35, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    onToggle();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[styles.star, { width: size, height: size }, animatedStyle]}
      hitSlop={8}
    >
      <Text style={styles.emoji}>⭐</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  star: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 22,
  },
});
