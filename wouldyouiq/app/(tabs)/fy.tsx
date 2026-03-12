import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTaskStore } from '@/stores/taskStore';
import { useUserStore } from '@/stores/userStore';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { Badge } from '@/components/ui';
import { ConfettiCannon } from '@/components/Confetti';

const { height: H } = Dimensions.get('window');
const SKIP_THRESHOLD = -80;
const TASK_DONE_XP = 30;

export default function ForYouScreen() {
  const { addXP, incrementTasksDone } = useUserStore();
  const { getSortedTasks, markDone } = useTaskStore();
  const [index, setIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [greenFlash, setGreenFlash] = useState(false);

  const sorted = useMemo(() => getSortedTasks(true), [getSortedTasks]);
  const currentTask = sorted[index] ?? null;

  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (translateY.value < SKIP_THRESHOLD) {
        translateY.value = withSpring(-H, { damping: 20 }, () => {
          runOnJS(setIndex)((i) => Math.min(i + 1, sorted.length));
          translateY.value = 0;
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleDone = () => {
    if (!currentTask) return;
    markDone(currentTask.id);
    addXP(TASK_DONE_XP);
    incrementTasksDone();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowConfetti(true);
    setGreenFlash(true);
    setTimeout(() => setShowConfetti(false), 2000);
    setTimeout(() => setGreenFlash(false), 600);
    setIndex((i) => i);
  };

  const handleSkip = () => {
    setIndex((i) => Math.min(i + 1, sorted.length - 1));
  };

  if (sorted.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>✨</Text>
          <Text style={styles.emptyTitle}>No tasks for you right now</Text>
          <Text style={styles.emptySub}>
            Complete calibration in Would You? or add tasks in Tasks.
          </Text>
        </View>
      </View>
    );
  }

  const urgencyGlow =
    currentTask?.urgency === 'high'
      ? 'rgba(248,113,113,0.08)'
      : currentTask?.urgency === 'med'
        ? 'rgba(245,200,66,0.07)'
        : 'rgba(167,139,250,0.06)';

  return (
    <View style={styles.container}>
      {greenFlash && (
        <View style={[StyleSheet.absoluteFill, styles.greenFlash]} />
      )}
      <ConfettiCannon visible={showConfetti} particleCount={50} />
      <View style={[styles.glow, { backgroundColor: urgencyGlow }]} />
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardWrap, cardStyle]}>
          <View style={[styles.card, { backgroundColor: Colors.s1 }]}>
            <View style={styles.rankBar}>
              <Text style={styles.rankText}>
                #{index + 1} Priority
                {currentTask?.essential ? ' ⭐' : ''}
              </Text>
              <Badge label={`${currentTask?.elo ?? 0} ELO`} variant="violet" />
            </View>
            {currentTask?.deadline === 'today' && (
              <View style={styles.urgencyBadge}>
                <Text style={styles.urgencyText}>🔥 Due today</Text>
              </View>
            )}
            <Text style={styles.emoji}>{currentTask?.emoji}</Text>
            <Text style={styles.name}>{currentTask?.name}</Text>
            {currentTask?.timeEstimate ? (
              <Text style={styles.timeEst}>{currentTask.timeEstimate}</Text>
            ) : null}
          </View>
        </Animated.View>
      </GestureDetector>
      <View style={styles.actions}>
        <Pressable style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>⏭ Skip</Text>
        </Pressable>
        <Pressable style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneText}>✅ Done</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Swipe up to skip to next</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  greenFlash: {
    backgroundColor: 'rgba(52,211,153,0.25)',
    zIndex: 100,
  },
  cardWrap: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.s2,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBar: {
    position: 'absolute',
    top: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.t2,
  },
  urgencyBadge: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: Colors.red + '30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  urgencyText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.red,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 24,
    color: Colors.t1,
    textAlign: 'center',
    marginBottom: 8,
  },
  timeEst: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t2,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  skipBtn: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: Colors.s2,
  },
  skipText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.t2,
  },
  doneBtn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: Colors.green,
  },
  doneText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.bg,
  },
  hint: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t3,
    textAlign: 'center',
    paddingBottom: 24,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.t1,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t2,
    textAlign: 'center',
  },
});
