import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/tokens';

const EMOJI_GRID = [
  '📋', '✅', '🎯', '⚡', '📚', '🏋️', '💻', '🧘', '💰', '🎸',
  '🌿', '👨‍👩‍👧', '🍳', '💤', '✉️', '📖', '🔧', '🎨', '📝', '🚀',
];

type EmojiPickerProps = {
  selected: string;
  onSelect: (emoji: string) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function EmojiCell({
  emoji,
  selected,
  onSelect,
}: {
  emoji: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: selected ? Colors.violet : 'transparent',
    borderWidth: selected ? 2 : 0,
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        scale.value = withSpring(1.2, { damping: 10 });
        setTimeout(() => {
          scale.value = withSpring(1);
        }, 100);
        onSelect();
      }}
      style={[styles.cell, animatedStyle]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
    </AnimatedPressable>
  );
}

export function EmojiPicker({ selected, onSelect }: EmojiPickerProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {EMOJI_GRID.map((emoji) => (
          <EmojiCell
            key={emoji}
            emoji={emoji}
            selected={selected === emoji}
            onSelect={() => onSelect(emoji)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxHeight: 200,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.s2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
});
