import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Task } from '@/types/models';
import { CalibrateCard } from './CalibrateCard';
import { VSDivider, DRAG_THRESHOLD } from './VSDivider';
import { Colors, Fonts } from '@/constants/tokens';

const springConfig = { damping: 20, stiffness: 200 };

type TwoCardArenaProps = {
  challenger: Task;
  defender: Task;
  onDecision: (winner: 'challenger' | 'defender') => void;
  onToggleChallengerEssential: () => void;
  onToggleDefenderEssential: () => void;
};

export function TwoCardArena({
  challenger,
  defender,
  onDecision,
  onToggleChallengerEssential,
  onToggleDefenderEssential,
}: TwoCardArenaProps) {
  const dragProgress = useSharedValue(0);

  const commitDecision = useCallback(
    (winner: 'challenger' | 'defender') => {
      onDecision(winner);
      dragProgress.value = 0;
    },
    [onDecision, dragProgress]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const progress = Math.max(-1, Math.min(1, e.translationX / DRAG_THRESHOLD));
      dragProgress.value = progress;
    })
    .onEnd((e) => {
      const p = dragProgress.value;
      if (Math.abs(p) >= 0.5) {
        const winner: 'challenger' | 'defender' = p > 0 ? 'defender' : 'challenger';
        dragProgress.value = withSpring(p > 0 ? 1 : -1, springConfig, () => {
          runOnJS(commitDecision)(winner);
        });
      } else {
        dragProgress.value = withSpring(0, springConfig);
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.arena}>
        <CalibrateCard
          task={challenger}
          role="challenger"
          isWinner={false}
          isLoser={false}
          dragProgress={dragProgress}
          onToggleEssential={onToggleChallengerEssential}
        />
        <VSDivider label="Which would you do first?" />
        <CalibrateCard
          task={defender}
          role="defender"
          isWinner={false}
          isLoser={false}
          dragProgress={dragProgress}
          onToggleEssential={onToggleDefenderEssential}
        />
        <View style={styles.swipeHint}>
          <Text style={styles.hintText}>👈 Challenger wins</Text>
          <Text style={styles.hintText}>Defender wins 👉</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  arena: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 4,
  },
  swipeHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  hintText: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t3,
  },
});
