import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTaskStore } from '@/stores/taskStore';
import { useUserStore } from '@/stores/userStore';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { ConfettiCannon } from '@/components/Confetti';

const { height: H } = Dimensions.get('window');
const SKIP_THRESHOLD = -80;
const TASK_DONE_XP = 30;

export default function ForYouScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 44);
  const { addXP, incrementTasksDone } = useUserStore();
  const { getSortedTasks, markDone } = useTaskStore();
  const [index, setIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const sorted = useMemo(() => getSortedTasks(true), [getSortedTasks]);
  const currentTask = sorted[index] ?? null;

  const translateY = useSharedValue(0);
  const tipBobY = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  useEffect(() => {
    tipBobY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

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

  const tipBobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tipBobY.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const handleDone = () => {
    if (!currentTask) return;
    markDone(currentTask.id);
    addXP(TASK_DONE_XP);
    incrementTasksDone();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowConfetti(true);
    flashOpacity.value = withSequence(
      withTiming(0.16, { duration: 100 }),
      withTiming(0, { duration: 500 })
    );
    setTimeout(() => setShowConfetti(false), 2000);
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
      <Animated.View style={[StyleSheet.absoluteFill, styles.greenFlash, flashStyle]} pointerEvents="none" />
      <ConfettiCannon visible={showConfetti} particleCount={50} />
      <View style={[styles.glow, { backgroundColor: urgencyGlow }]} />
      <View style={[styles.rankRow, { top: paddingTop }]}>
        <View style={styles.rankLblWrap}>
          <Svg width={100} height={20} style={styles.rankLblSvg}>
            <Defs>
              <LinearGradient id="fyGrad" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0" stopColor={Colors.violet} />
                <Stop offset="1" stopColor={Colors.gold} />
              </LinearGradient>
            </Defs>
            <SvgText x={0} y={15} fill="url(#fyGrad)" fontFamily={Fonts.display} fontWeight="900" fontSize={13}>For You</SvgText>
          </Svg>
        </View>
        <View style={styles.eloTag}>
          <Text style={styles.eloTagText}>{currentTask?.elo ?? 0} ELO</Text>
        </View>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardWrap, cardStyle]}>
          <View style={[styles.card, { backgroundColor: Colors.s1 }]}>
            {currentTask?.urgency === 'high' && (
              <View style={styles.urgBadge}>
                <Text style={styles.urgBadgeText}>URGENT</Text>
              </View>
            )}
            <Text style={styles.emoji}>{currentTask?.emoji}</Text>
            <Text style={styles.name}>{currentTask?.name}</Text>
            {currentTask?.timeEstimate ? (
              <Text style={styles.timeEst}>{currentTask.timeEstimate}</Text>
            ) : null}
            {currentTask?.deadline && (
              <Text style={styles.dlText}>
                {currentTask.deadline === 'today' ? 'Due today' : 'Due this week'}
              </Text>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
      <View style={styles.actions}>
        <Pressable style={({ pressed }) => [styles.doneBtn, pressed && styles.btnPressed]} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.tipWrap, tipBobStyle]}>
        <Text style={styles.tip}>↑ Swipe up to skip</Text>
      </Animated.View>
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
    backgroundColor: 'rgba(52,211,153,0.99)',
    zIndex: 100,
  },
  rankRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  rankLblWrap: {
    overflow: 'hidden',
  },
  rankLblSvg: {
    marginLeft: 0,
  },
  rankLbl: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 13,
    color: Colors.violet,
  },
  eloTag: {
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  eloTagText: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    color: Colors.t3,
  },
  cardWrap: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.s2,
    paddingVertical: 20,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgBadge: {
    backgroundColor: 'rgba(248,113,113,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.28)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 14,
  },
  urgBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.5,
    color: Colors.red,
  },
  emoji: {
    fontSize: 84,
    marginBottom: 14,
  },
  name: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 25,
    color: Colors.t1,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  timeEst: {
    fontSize: 14,
    color: Colors.t2,
    marginBottom: 6,
  },
  dlText: {
    fontSize: 12,
    fontFamily: Fonts.bodyBold,
    color: Colors.gold,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  doneBtn: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: Colors.green2,
    minWidth: 120,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: '#042b1e',
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
    minWidth: 120,
    alignItems: 'center',
  },
  skipBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t2,
  },
  btnPressed: {
    transform: [{ scale: 0.93 }],
  },
  tipWrap: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.t3,
    textAlign: 'center',
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
