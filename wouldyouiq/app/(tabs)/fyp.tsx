import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';

import { ActionButton, Badge, Surface } from '@/components/primitives';
import { useConfettiOverlay } from '@/components/ConfettiLayer';
import { Colors, Fonts } from '@/constants/tokens';
import { getForYouQueue, medalForIndex } from '@/domain/logic';
import { useAppStore } from '@/domain/store';

export default function ForYouScreen() {
  const tasks = useAppStore((state) => state.tasks);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const startRunner = useAppStore((state) => state.startRunner);
  const { triggerConfetti, confettiOverlay } = useConfettiOverlay();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(true);
  const [skipLocked, setSkipLocked] = useState(false);

  const cardY = useRef(new Animated.Value(0)).current;
  const detailAnim = useRef(new Animated.Value(0)).current;
  const emojiPulse = useRef(new Animated.Value(0)).current;
  const cardIntro = useRef(new Animated.Value(0.96)).current;
  const queue = useMemo(() => getForYouQueue(tasks), [tasks]);
  const task = queue.length > 0 ? queue[currentIndex % queue.length] : undefined;
  const nextTask = queue.length > 1 ? queue[(currentIndex + 1) % queue.length] : null;
  const taskRankIndex = task ? queue.findIndex((entry) => entry.id === task.id) : -1;
  const nextTaskRankIndex = nextTask ? queue.findIndex((entry) => entry.id === nextTask.id) : -1;
  const taskTone = getPriorityTone(taskRankIndex);
  const nextTaskTone = getPriorityTone(nextTaskRankIndex);
  const nextCardTranslateY = cardY.interpolate({
    inputRange: [-260, 0],
    outputRange: [0, 34],
    extrapolate: 'clamp',
  });
  const nextCardScale = cardY.interpolate({
    inputRange: [-260, 0],
    outputRange: [1, 0.96],
    extrapolate: 'clamp',
  });
  const nextCardOpacity = cardY.interpolate({
    inputRange: [-260, -40, 0],
    outputRange: [0.9, 0.45, 0.2],
    extrapolate: 'clamp',
  });
  const emptyPulse = useRef(new Animated.Value(0)).current;
  const resetCardOffset = useCallback(() => {
    cardY.stopAnimation(() => {
      cardY.setValue(0);
    });
  }, [cardY]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setCurrentIndex(0);
        setDetailOpen(true);
        setSkipLocked(false);
        resetCardOffset();
      };
    }, [resetCardOffset]),
  );

  useEffect(() => {
    if (queue.length === 0) {
      if (currentIndex !== 0) {
        setCurrentIndex(0);
      }
      return;
    }

    if (currentIndex >= queue.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, queue.length]);

  useEffect(() => {
    Animated.timing(detailAnim, {
      toValue: detailOpen ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [detailAnim, detailOpen]);

  useEffect(() => {
    if (!task?.id) return;
    resetCardOffset();
    cardIntro.setValue(0.96);
    setDetailOpen(true);
    setSkipLocked(false);
    Animated.spring(cardIntro, {
      toValue: 1,
      tension: 120,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, [cardIntro, resetCardOffset, task?.id]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(emojiPulse, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(emojiPulse, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [emojiPulse]);

  useEffect(() => {
    if (task) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(emptyPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(emptyPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [emptyPulse, task]);

  const skipTask = useCallback(() => {
    if (!task || skipLocked) return;

    setSkipLocked(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(cardY, {
      toValue: -520,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      resetCardOffset();
      if (queue.length > 1) {
        setCurrentIndex((value) => (value + 1) % queue.length);
      }
      setDetailOpen(true);
      setSkipLocked(false);
    });
  }, [cardY, queue.length, resetCardOffset, skipLocked, task]);

  const resetCardPosition = useCallback(() => {
    Animated.spring(cardY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, [cardY]);

  const handleGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { translationY } = event.nativeEvent;
      cardY.setValue(translationY < 0 ? translationY : 0);
    },
    [cardY],
  );

  const handleGestureStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      const { state, oldState, translationY } = event.nativeEvent;

      if (state === State.CANCELLED || state === State.FAILED) {
        resetCardPosition();
        return;
      }

      if (oldState !== State.ACTIVE) {
        return;
      }

      if (translationY < -90) {
        skipTask();
        return;
      }

      resetCardPosition();
    },
    [resetCardPosition, skipTask],
  );

  if (!task) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>For You</Text>
        </View>
        <Surface style={styles.emptyCard}>
          <Animated.Text
            style={[
              styles.emptyEmoji,
              {
                transform: [
                  {
                    translateY: emptyPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                  {
                    scale: emptyPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.06],
                    }),
                  },
                ],
              },
            ]}
          >
            ✅
          </Animated.Text>
          <Text style={styles.emptyTitle}>All Done for Now!</Text>
          <Text style={styles.emptySub}>
            All tasks are completed. Nice work.
          </Text>
        </Surface>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>For You</Text>
      </View>
      {nextTask ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cardStackPreview,
            {
              opacity: nextCardOpacity,
              transform: [{ translateY: nextCardTranslateY }, { scale: nextCardScale }],
            },
          ]}
        >
          <Surface style={[styles.card, styles.previewCard]}>
            <View style={styles.swipeZone}>
              <View style={styles.topRow}>
                <Text style={[styles.rankLabel, nextTaskTone.labelStyle]}>
                  {formatPriorityLabel(nextTaskRankIndex, 'Up Next')}
                </Text>
                <Badge label={`ELO ${nextTask.elo}`} tone={nextTaskTone.badgeTone} />
              </View>
              <Text style={styles.previewEmoji}>{nextTask.e}</Text>
              <Text style={styles.previewName}>{nextTask.n}</Text>
              <Text style={styles.meta}>⏱ {nextTask.t}</Text>
            </View>
          </Surface>
        </Animated.View>
      ) : null}
      <Animated.View
        key={task.id}
        style={[styles.cardWrap, { transform: [{ translateY: cardY }, { scale: cardIntro }] }]}
      >
        <Surface style={styles.card}>
          <View style={styles.swipeZone}>
            <View style={styles.topRow}>
              <Text style={[styles.rankLabel, taskTone.labelStyle]}>
                {formatPriorityLabel(taskRankIndex)}
                {task.ess ? ' ⭐' : ''}
              </Text>
              <Badge label={`ELO ${task.elo}`} tone={taskTone.badgeTone} />
            </View>
            <PanGestureHandler
              enabled={!skipLocked}
              activeOffsetY={[-12, 999]}
              failOffsetX={[-24, 24]}
              onGestureEvent={handleGestureEvent}
              onHandlerStateChange={handleGestureStateChange}
            >
              <Animated.View style={styles.swipeHandle}>
                <Animated.Text
                  style={[
                    styles.emoji,
                    {
                      transform: [
                        {
                          scale: emojiPulse.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [1, 1.06, 1],
                          }),
                        },
                        {
                          translateY: emojiPulse.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, -5, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {task.e}
                </Animated.Text>
                <Text style={styles.name}>{task.n}</Text>
                <Text style={styles.meta}>⏱ {task.t}</Text>
                <PressableTellMeMore open={detailOpen} onPress={() => setDetailOpen((value) => !value)} />
                <Animated.View
                  style={[
                    styles.detailWrap,
                    {
                      maxHeight: detailAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 120],
                      }),
                      opacity: detailAnim,
                    },
                  ]}
                >
                  <Text style={styles.detail}>{task.detail ?? 'A focused priority block.'}</Text>
                </Animated.View>
              </Animated.View>
            </PanGestureHandler>
          </View>
          <View style={styles.buttonRow} pointerEvents="box-none">
            <ActionButton
              label={task.subtasks.length ? '▶ Start' : '✅ Done'}
              tone="success"
              onPress={() => {
                if (task.subtasks.length) {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  startRunner(task.id);
                  router.navigate({ pathname: '/runner', params: { taskId: task.id } });
                  return;
                }

                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                triggerConfetti({ count: 90 });
                toggleTaskDone(task.id);
              }}
            />
            <ActionButton label={skipLocked ? 'Skipping…' : '⏭ Skip'} onPress={skipTask} />
          </View>
        </Surface>
      </Animated.View>

      <View style={styles.tip}>
        <Text style={styles.tipArrow}>↑</Text>
        <Text style={styles.tipLabel}>Swipe up to skip</Text>
      </View>
      {confettiOverlay}
    </View>
  );
}

function formatPriorityLabel(index: number, fallback = 'Priority') {
  if (index < 0) return fallback;
  if (index < 3) return `${medalForIndex(index)} #${index + 1} Priority`;
  return `#${index + 1} Priority`;
}

function getPriorityTone(index: number): {
  badgeTone: 'default' | 'violet' | 'gold' | 'green' | 'danger';
  labelStyle: object;
} {
  if (index === 0) {
    return {
      badgeTone: 'gold',
      labelStyle: styles.rankLabelGold,
    };
  }

  if (index === 1) {
    return {
      badgeTone: 'green',
      labelStyle: styles.rankLabelGreen,
    };
  }

  if (index === 2) {
    return {
      badgeTone: 'violet',
      labelStyle: styles.rankLabelViolet,
    };
  }

  return {
    badgeTone: 'default',
    labelStyle: styles.rankLabelMuted,
  };
}

function PressableTellMeMore({
  open,
  onPress,
}: {
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Text style={styles.more}>
        {open ? '▲ Tell me less' : '▼ Tell me more'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 18,
    paddingBottom: 80,
  },
  header: {
    paddingTop: 12,
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
  },
  cardWrap: {
    width: '100%',
    zIndex: 2,
    marginTop: 28,
  },
  cardStackPreview: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 146,
    zIndex: 1,
  },
  card: {
    minHeight: 540,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  previewCard: {
    backgroundColor: 'rgba(14,14,28,0.78)',
    borderColor: Colors.b2,
  },
  swipeZone: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHandle: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  rankLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.t1,
  },
  rankLabelGold: {
    color: Colors.gold,
  },
  rankLabelGreen: {
    color: Colors.green,
  },
  rankLabelViolet: {
    color: Colors.violet,
  },
  rankLabelMuted: {
    color: Colors.t2,
  },
  emoji: {
    fontSize: 88,
    marginBottom: 18,
  },
  previewEmoji: {
    fontSize: 72,
    marginBottom: 18,
    opacity: 0.92,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 34,
    color: Colors.t1,
    textAlign: 'center',
    lineHeight: 42,
  },
  previewName: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.t2,
    textAlign: 'center',
    lineHeight: 36,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.t2,
    marginTop: 10,
  },
  more: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t2,
    marginTop: 14,
  },
  detailWrap: {
    overflow: 'hidden',
  },
  detail: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.t2,
    textAlign: 'center',
    marginTop: 12,
  },
  buttonRow: {
    width: '100%',
    gap: 12,
    marginTop: 30,
    zIndex: 5,
  },
  tip: {
    alignItems: 'center',
    marginTop: 18,
    gap: 4,
  },
  tipArrow: {
    fontSize: 18,
    color: Colors.t3,
  },
  tipLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 80,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.t1,
  },
  emptySub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t2,
    textAlign: 'center',
  },
});
