import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAG_THRESHOLD = SCREEN_W * 0.25;

type SingleCardArenaProps = {
  challenger: Task;
  defender: Task | null;
  questionLabel: string;
  onDecision: (winner: 'challenger' | 'defender') => void;
  onToggleEssential: () => void;
};

export function SingleCardArena({
  challenger,
  defender,
  questionLabel,
  onDecision,
  onToggleEssential,
}: SingleCardArenaProps) {
  const translateX = useSharedValue(0);
  const rotateZ = useSharedValue(0);

  const commitDecision = useCallback(
    (dir: 'left' | 'right') => {
      const winner: 'challenger' | 'defender' =
        dir === 'right' || !defender ? 'challenger' : 'defender';
      onDecision(winner);
      translateX.value = 0;
      rotateZ.value = 0;
    },
    [defender, onDecision, translateX, rotateZ]
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      rotateZ.value = e.translationX * 0.04;
    })
    .onEnd(() => {
      const x = translateX.value;
      if (Math.abs(x) > DRAG_THRESHOLD) {
        const dir: 'left' | 'right' = x > 0 ? 'right' : 'left';
        translateX.value = withTiming(
          dir === 'right' ? SCREEN_W * 1.1 : -SCREEN_W * 1.1,
          { duration: 260 },
          () => {
            runOnJS(commitDecision)(dir);
          }
        );
        rotateZ.value = withTiming(dir === 'right' ? 16 : -16, { duration: 260 });
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
        rotateZ.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value * 0.7 },
      { rotateZ: `${rotateZ.value}deg` },
    ],
  }));

  return (
    <View style={styles.root}>
      <View style={styles.qLine}>
        <Text style={styles.qLabel}>{questionLabel}</Text>
        <Text style={styles.qText}>
          <Text style={styles.qName}>{challenger.name}</Text>
          {defender ? (
            <Text style={styles.qDetail}>
              {' '}
              or {defender.emoji} {defender.name}?
            </Text>
          ) : (
            <Text style={styles.qDetail}>
              {challenger.timeEstimate ? ` · ${challenger.timeEstimate}` : ''}
            </Text>
          )}
        </Text>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.cardHeader}>
            <Text style={styles.emoji}>{challenger.emoji}</Text>
            <Text style={styles.elo}>ELO {challenger.elo}</Text>
          </View>
          <Text style={styles.cardName}>{challenger.name}</Text>
          {challenger.timeEstimate ? (
            <Text style={styles.meta}>{challenger.timeEstimate}</Text>
          ) : null}
          {challenger.deadline && (
            <Text style={styles.deadline}>
              📅{' '}
              {challenger.deadline === 'today'
                ? 'Due today'
                : challenger.deadline === 'this week'
                ? 'Due this week'
                : challenger.deadline}
            </Text>
          )}
          <View style={styles.swipeGuide}>
            <Text style={styles.swipeHint}>← keep current</Text>
            <Text style={styles.swipeHint}>pick instead →</Text>
          </View>
          <View style={styles.essRow}>
            <Text style={styles.essLabel}>Mark essential</Text>
            <Text style={styles.essStar} onPress={onToggleEssential}>
              ⭐
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  qLine: {
    paddingTop: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  qLabel: {
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: Colors.t3,
    marginBottom: 10,
  },
  qText: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 18,
    textAlign: 'center',
    color: Colors.t1,
  },
  qName: {
    color: Colors.violet,
  },
  qDetail: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t2,
  },
  card: {
    flex: 1,
    maxHeight: 360,
    marginHorizontal: 10,
    backgroundColor: Colors.s1,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.b2,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 52,
  },
  elo: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t3,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  cardName: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 22,
    color: Colors.t1,
    textAlign: 'center',
    marginBottom: 6,
  },
  meta: {
    fontFamily: Fonts.bodyLight,
    fontSize: 13,
    color: Colors.t2,
    marginBottom: 4,
  },
  deadline: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.gold,
    marginBottom: 12,
  },
  swipeGuide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 18,
  },
  swipeHint: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t3,
  },
  essRow: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  essLabel: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t2,
  },
  essStar: {
    fontSize: 22,
  },
});

