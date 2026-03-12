import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Task } from '@/types/models';
import type { Stake } from '@/utils/stakes';
import { ArenaCard } from './ArenaCard';
import { Colors, Fonts } from '@/constants/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAG_THRESHOLD = SCREEN_W * 0.35;
const springConfig = { damping: 20, stiffness: 200 };

type TwoCardArenaProps = {
  challenger: Task;
  defender: Task;
  stake: Stake | null;
  onDecision: (winner: 'challenger' | 'defender') => void;
  onToggleChallengerEssential: () => void;
  onToggleDefenderEssential: () => void;
};

export function TwoCardArena({
  challenger,
  defender,
  stake,
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
      const progress = Math.max(
        -1,
        Math.min(1, e.translationX / DRAG_THRESHOLD)
      );
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

  const questionLabel = stake?.qLabel ?? 'Which would you do first?';
  const priceOverrideA =
    stake?.modSide === 'A'
      ? {
          display: stake.newPriceDisplay,
          unit: stake.unit,
          tickDir: stake.tickDir,
        }
      : undefined;
  const priceOverrideB =
    stake?.modSide === 'B'
      ? {
          display: stake.newPriceDisplay,
          unit: stake.unit,
          tickDir: stake.tickDir,
        }
      : undefined;

  const cardAStyle = useAnimatedStyle(() => {
    const p = dragProgress.value;
    const absP = Math.abs(p);
    const weWin = p < 0;
    const translateX = weWin
      ? interpolate(absP, [0, 1], [0, 28])
      : interpolate(absP, [0, 1], [0, -22]);
    const scale = weWin
      ? interpolate(absP, [0, 1], [1, 1.045])
      : interpolate(absP, [0, 1], [1, 0.935]);
    const opacity = weWin ? 1 : interpolate(absP, [0, 1], [1, 0.55]);
    return {
      transform: [{ translateX }, { scale }],
      opacity,
    };
  });

  const cardBStyle = useAnimatedStyle(() => {
    const p = dragProgress.value;
    const absP = Math.abs(p);
    const weWin = p > 0;
    const translateX = weWin
      ? interpolate(absP, [0, 1], [0, -22])
      : interpolate(absP, [0, 1], [0, 28]);
    const scale = weWin
      ? interpolate(absP, [0, 1], [1, 1.045])
      : interpolate(absP, [0, 1], [1, 0.935]);
    const opacity = weWin ? 1 : interpolate(absP, [0, 1], [1, 0.55]);
    return {
      transform: [{ translateX }, { scale }],
      opacity,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.arena}>
        <View style={styles.qZone}>
          <Text style={styles.qLabel}>{questionLabel}</Text>
          <Text style={styles.qText}>
            {challenger.name} or {defender.name}?
          </Text>
        </View>
        <View style={styles.duelRow}>
          <Animated.View style={[styles.cardWrap, cardAStyle]}>
            <ArenaCard
              task={challenger}
              side="A"
              onToggleEssential={onToggleChallengerEssential}
              priceOverride={priceOverrideA}
            />
          </Animated.View>
          <View style={styles.orDivider}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>
          <Animated.View style={[styles.cardWrap, cardBStyle]}>
            <ArenaCard
              task={defender}
              side="B"
              onToggleEssential={onToggleDefenderEssential}
              priceOverride={priceOverrideB}
            />
          </Animated.View>
        </View>
        <View style={styles.swipeHint}>
          <Text style={styles.hintText}>← A wins</Text>
          <Text style={styles.hintText}>B wins →</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  arena: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 0,
    minHeight: 0,
  },
  qZone: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  qLabel: {
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: Colors.t3,
    marginBottom: 8,
  },
  qText: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 19,
    lineHeight: 24,
    color: Colors.t1,
    textAlign: 'center',
  },
  duelRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 0,
  },
  cardWrap: {
    flex: 1,
    minWidth: 0,
  },
  orDivider: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
  },
  orLine: {
    flex: 1,
    width: 1,
    backgroundColor: Colors.b2,
  },
  orText: {
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
    color: Colors.t3,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  swipeHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
    color: Colors.t3,
    opacity: 0.38,
  },
});
