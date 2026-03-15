import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';

import { useConfettiOverlay } from '@/components/ConfettiLayer';
import { ActionButton, Badge, Surface } from '@/components/primitives';
import { isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';

export default function RunnerScreen() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ taskId?: string }>();
  const tasks = useAppStore((state) => state.tasks);
  const runner = useAppStore((state) => state.runner);
  const setRunnerStep = useAppStore((state) => state.setRunnerStep);
  const advanceRunner = useAppStore((state) => state.advanceRunner);
  const resetRunner = useAppStore((state) => state.resetRunner);
  const { triggerConfetti, confettiOverlay } = useConfettiOverlay();
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideX = useRef(new Animated.Value(0)).current;

  const [whyOpen, setWhyOpen] = useState(false);
  const [slideDirection, setSlideDirection] = useState<-1 | 0 | 1>(0);
  const routeTaskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
    };
  }, []);

  const task = tasks.find((entry) => entry.id === (routeTaskId ?? runner.taskId));
  const orderedSubtasks = useMemo(
    () => (task ? [...task.subtasks].sort((left, right) => left.order - right.order) : []),
    [task],
  );
  const subtask = orderedSubtasks[runner.stepIndex] ?? null;
  const isFinalStep = !!task && runner.stepIndex >= orderedSubtasks.length - 1;
  const canSwipePrevious = runner.stepIndex > 0;
  const canSwipeNext = runner.stepIndex < orderedSubtasks.length - 1;

  useEffect(() => {
    if (slideDirection === 0) {
      slideX.setValue(0);
      return;
    }

    slideX.setValue(slideDirection * 48);
    Animated.spring(slideX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start(() => setSlideDirection(0));
  }, [slideDirection, slideX, runner.stepIndex]);

  const moveRunnerStep = (direction: -1 | 1) => {
    const nextIndex = runner.stepIndex + direction;
    if (nextIndex < 0 || nextIndex >= orderedSubtasks.length) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSlideDirection(direction);
    setWhyOpen(false);
    setRunnerStep(nextIndex);
  };

  const handleGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    slideX.setValue(translationX);
  };

  const handleGestureStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    const { state, oldState, translationX } = event.nativeEvent;

    if (state === State.CANCELLED || state === State.FAILED) {
      Animated.spring(slideX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
      return;
    }

    if (oldState !== State.ACTIVE) {
      return;
    }

    if (translationX <= -70 && canSwipeNext) {
      moveRunnerStep(1);
      return;
    }

    if (translationX >= 70 && canSwipePrevious) {
      moveRunnerStep(-1);
      return;
    }

    Animated.spring(slideX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  useEffect(() => {
    if (!desktop || !subtask || typeof window === 'undefined') {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardEvent(event)) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (canSwipePrevious) {
          moveRunnerStep(-1);
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (canSwipeNext) {
          moveRunnerStep(1);
        }
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        triggerConfetti({ count: isFinalStep ? 90 : 36 });
        if (advanceTimeoutRef.current) {
          clearTimeout(advanceTimeoutRef.current);
        }
        advanceTimeoutRef.current = setTimeout(() => {
          startTransition(() => {
            advanceRunner('done');
          });
        }, 180);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        startTransition(() => {
          advanceRunner('skip');
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advanceRunner, canSwipeNext, canSwipePrevious, desktop, isFinalStep, subtask, triggerConfetti]);

  useEffect(() => {
    if (!runner.completed) {
      return;
    }

    const timeout = setTimeout(() => {
      resetRunner();
      router.replace('/(tabs)/fyp');
    }, 450);

    return () => clearTimeout(timeout);
  }, [resetRunner, runner.completed]);

  if (!task) {
    return (
      <View style={styles.root}>
        <Surface style={styles.empty}>
          <Text style={styles.emptyTitle}>No active runner</Text>
          <Text style={styles.emptySub}>Pick a task with subtasks to start this flow.</Text>
          <ActionButton label="Back to For You" tone="primary" onPress={() => router.push('/(tabs)/fyp')} />
        </Surface>
      </View>
    );
  }

  if (!subtask || runner.completed) {
    return (
      <View style={styles.root}>
        <Surface style={styles.empty}>
          <Text style={styles.stepEmoji}>✅</Text>
          <Text style={styles.title}>Task complete</Text>
          <Text style={styles.sub}>{task.n} is ready to leave the queue.</Text>
          <ActionButton
            label="Back to Priorities"
            tone="primary"
            onPress={() => {
              resetRunner();
              router.push('/(tabs)/fyp');
            }}
          />
        </Surface>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.confettiBackdrop}>
        {confettiOverlay}
      </View>
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            resetRunner();
            router.back();
          }}
        >
          <Text style={styles.backLabel}>← Back</Text>
        </Pressable>
        <Text style={styles.stepLabel}>
          STEP {Math.min(runner.stepIndex + 1, orderedSubtasks.length)} OF {orderedSubtasks.length}
        </Text>
      </View>

      <View style={styles.content}>
        <Badge label={`${task.e} ${task.n}`} tone="violet" />
        <View style={styles.connector} />
        <PanGestureHandler
          activeOffsetX={[-14, 14]}
          failOffsetY={[-24, 24]}
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleGestureStateChange}
        >
          <Animated.View style={[styles.slideCard, { transform: [{ translateX: slideX }] }]}>
            <Text style={styles.stepEmoji}>{subtask.e}</Text>
            <Text style={styles.title}>{subtask.n}</Text>
            <Pressable style={styles.whyButton} onPress={() => setWhyOpen((value) => !value)}>
              <Text style={styles.whyLabel}>{whyOpen ? '▲ Why this step?' : '▼ Why this step?'}</Text>
            </Pressable>
            {whyOpen ? <Text style={styles.sub}>{subtask.why ?? 'This is the next smallest move that keeps momentum.'}</Text> : null}
          </Animated.View>
        </PanGestureHandler>
        <View style={styles.swipeHintRow}>
          <Text style={[styles.swipeHint, !canSwipePrevious && styles.swipeHintMuted]}>← Previous</Text>
          <Text style={styles.swipeHintCenter}>
            {desktop ? 'Arrow keys move, space completes, up skips' : 'Swipe to move'}
          </Text>
          <Text style={[styles.swipeHint, !canSwipeNext && styles.swipeHintMuted]}>Next →</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <ActionButton
          label="✅ Done"
          tone="success"
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            triggerConfetti({ count: isFinalStep ? 90 : 36 });
            if (advanceTimeoutRef.current) {
              clearTimeout(advanceTimeoutRef.current);
            }
            advanceTimeoutRef.current = setTimeout(() => {
              startTransition(() => {
                advanceRunner('done');
              });
            }, 180);
          }}
        />
        <ActionButton
          label="⏭ Skip"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            startTransition(() => {
              advanceRunner('skip');
            });
          }}
        />
      </View>
    </View>
  );
}

function shouldIgnoreKeyboardEvent(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return false;

  const tagName = target.tagName?.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select'
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 34,
  },
  confettiBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  backButton: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  backLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t2,
  },
  stepLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t3,
    letterSpacing: 1.2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 2,
  },
  slideCard: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  connector: {
    width: 2,
    height: 54,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.32)',
  },
  stepEmoji: {
    fontSize: 72,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.t1,
    textAlign: 'center',
    lineHeight: 38,
  },
  whyButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.b2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.s1,
  },
  whyLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t2,
  },
  sub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.t2,
    textAlign: 'center',
    maxWidth: 300,
  },
  swipeHintRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  swipeHint: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.violet,
    letterSpacing: 0.3,
  },
  swipeHintCenter: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  swipeHintMuted: {
    color: Colors.t4,
  },
  actions: {
    gap: 12,
    zIndex: 2,
  },
  empty: {
    marginTop: 120,
    padding: 24,
    gap: 14,
    alignItems: 'center',
    zIndex: 2,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.t1,
  },
  emptySub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t2,
    textAlign: 'center',
  },
});
