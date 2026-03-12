import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { EssentialStar } from '@/components/ui';
import { Badge } from '@/components/ui';

const { width: SCREEN_W } = Dimensions.get('window');
const THRESH = 0.35;
const DRAG_THRESHOLD = SCREEN_W * THRESH;

type Role = 'challenger' | 'defender';

import type { SharedValue } from 'react-native-reanimated';

type CalibrateCardProps = {
  task: Task;
  role: Role;
  isWinner: boolean;
  isLoser: boolean;
  dragProgress: SharedValue<number>;
  onToggleEssential: () => void;
};

export function CalibrateCard({
  task,
  role,
  isWinner,
  isLoser,
  dragProgress,
  onToggleEssential,
}: CalibrateCardProps) {
  const isChallenger = role === 'challenger';

  const cardStyle = useAnimatedStyle(() => {
    const p = dragProgress.value;
    const absP = Math.abs(p);
    const weWin = isChallenger ? p < 0 : p > 0;
    const translateX = weWin
      ? interpolate(absP, [0, 1], [0, 28])
      : interpolate(absP, [0, 1], [0, -22]);
    const scale = weWin
      ? interpolate(absP, [0, 1], [1, 1.045])
      : interpolate(absP, [0, 1], [1, 0.935]);
    const saturation = weWin ? 1 : interpolate(absP, [0, 1], [1, 0.56]);
    const gray = weWin ? 0 : interpolate(absP, [0, 1], [0, 0.75]);
    return {
      transform: [{ translateX }, { scale }],
      opacity: saturation,
    };
  });

  const crownStyle = useAnimatedStyle(() => {
    const p = dragProgress.value;
    const absP = Math.abs(p);
    const show = (isChallenger && p < 0) || (!isChallenger && p > 0);
    const translateY = show ? interpolate(absP, [0, 1], [-28, 0]) : -28;
    const opacity = show ? interpolate(absP, [0, 1], [0, 1]) : 0;
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const bg = isChallenger ? Colors.challengerBg : Colors.defenderBg;
  const borderColor = isChallenger ? Colors.redB : Colors.blue;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor,
          flex: isChallenger ? 0.37 : 0.47,
        },
        cardStyle,
      ]}
    >
      <View style={styles.crownWrap}>
        <Animated.Text style={[styles.crown, crownStyle]}>👑</Animated.Text>
      </View>
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <Text style={styles.roleBadge}>
            {isChallenger ? '⚔️ Challenger' : '👑 Defending'}
          </Text>
          <EssentialStar essential={task.essential} onToggle={onToggleEssential} size={26} />
        </View>
        <Text style={[styles.emoji, isChallenger ? styles.emojiSmall : styles.emojiBig]}>
          {task.emoji}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {task.name}
        </Text>
        <View style={styles.meta}>
          {task.timeEstimate ? (
            <Text style={styles.metaText}>{task.timeEstimate}</Text>
          ) : null}
          <Badge label={`${task.elo} ELO`} variant="default" />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 100,
  },
  crownWrap: {
    position: 'absolute',
    top: 8,
    right: 44,
    zIndex: 2,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crown: {
    fontSize: 26,
  },
  inner: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleBadge: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.t2,
  },
  emoji: {
    marginBottom: 4,
  },
  emojiSmall: {
    fontSize: 44,
  },
  emojiBig: {
    fontSize: 56,
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.t1,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t2,
  },
});
