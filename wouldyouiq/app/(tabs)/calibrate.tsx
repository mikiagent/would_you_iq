import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { CompletionOverlay } from '@/components/CompletionOverlay';
import { ActionButton, Badge, SegmentedControl, Surface } from '@/components/primitives';
import { useXpOverlay } from '@/components/XpOverlay';
import { Layout, isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts } from '@/constants/tokens';
import { getLevelInfo } from '@/domain/logic';
import { useAppStore } from '@/domain/store';
import type { ArenaSwipe, BudgetItem, Task } from '@/domain/models';

type ArenaItem = Task | BudgetItem;

export default function CalibrateScreen() {
  const { width } = useWindowDimensions();
  const tasks = useAppStore((state) => state.tasks);
  const budget = useAppStore((state) => state.budget);
  const arena = useAppStore((state) => state.arena);
  const user = useAppStore((state) => state.user);
  const setArenaMode = useAppStore((state) => state.setArenaMode);
  const ensureArenaReady = useAppStore((state) => state.ensureArenaReady);
  const commitArenaSwipe = useAppStore((state) => state.commitArenaSwipe);
  const dismissCompletionOverlay = useAppStore((state) => state.dismissCompletionOverlay);
  const { triggerXp, xpOverlay } = useXpOverlay();

  const [activeDirection, setActiveDirection] = useState<ArenaSwipe | null>(null);
  const [levelBannerVisible, setLevelBannerVisible] = useState(false);
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);

  const champion = (
    arena.mode === 'tasks'
      ? tasks.find((task) => task.id === arena.championId) ?? null
      : budget.items.find((item) => item.id === arena.championId) ?? null
  ) as ArenaItem | null;
  const challenger = (
    arena.mode === 'tasks'
      ? tasks.find((task) => task.id === arena.challengerId) ?? null
      : budget.items.find((item) => item.id === arena.challengerId) ?? null
  ) as ArenaItem | null;

  const pan = useRef(new Animated.ValueXY()).current;
  const idle = useRef(new Animated.Value(0)).current;
  const championBounce = useRef(new Animated.Value(0.92)).current;
  const cardIntro = useRef(new Animated.Value(0.96)).current;
  const levelPulse = useRef(new Animated.Value(1)).current;
  const prevLevelRef = useRef(getLevelInfo(user.xp).level);
  const rotate = pan.x.interpolate({
    inputRange: [-160, 0, 160],
    outputRange: ['-9deg', '0deg', '9deg'],
  });
  const idleRotate = idle.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-4deg', '3deg', '-4deg'],
  });
  const idleTranslateY = idle.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -6, 0],
  });
  const levelInfo = getLevelInfo(user.xp);

  useEffect(() => {
    ensureArenaReady();
  }, [ensureArenaReady]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idle, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(idle, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [idle]);

  useEffect(() => {
    if (!champion?.id) return;
    championBounce.setValue(0.92);
    Animated.spring(championBounce, {
      toValue: 1,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [champion?.id, championBounce]);

  useEffect(() => {
    if (!challenger?.id) return;
    cardIntro.setValue(0.96);
    Animated.spring(cardIntro, {
      toValue: 1,
      tension: 120,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, [cardIntro, challenger?.id]);

  useEffect(() => {
    if (levelInfo.level <= prevLevelRef.current) {
      prevLevelRef.current = levelInfo.level;
      return;
    }

    prevLevelRef.current = levelInfo.level;
    setLevelBannerVisible(true);
    Animated.sequence([
      Animated.spring(levelPulse, {
        toValue: 1.08,
        tension: 140,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(levelPulse, {
        toValue: 1,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => setLevelBannerVisible(false), 1800);
    return () => clearTimeout(timeout);
  }, [levelInfo.level, levelPulse]);

  const resetCard = () => {
    setActiveDirection(null);
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  const finishSwipe = (swipe: ArenaSwipe) => {
    const toValue =
      swipe === 'challenger'
        ? { x: 460, y: 30 }
        : swipe === 'champion'
        ? { x: -460, y: 30 }
        : swipe === 'skip'
        ? { x: 0, y: -460 }
        : { x: 0, y: 460 };

    Animated.timing(pan, {
      toValue,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      void Haptics.impactAsync(
        swipe === 'essential' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium,
      );
      const xp = swipe === 'essential' ? 30 : swipe === 'skip' ? 0 : 20;
      if (xp > 0) {
        triggerXp(xp);
      }
      commitArenaSwipe(swipe);
      pan.setValue({ x: 0, y: 0 });
      setActiveDirection(null);
    });
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6,
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });

        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          setActiveDirection(gestureState.dx > 0 ? 'challenger' : 'champion');
        } else if (gestureState.dy < 0) {
          setActiveDirection('skip');
        } else {
          setActiveDirection('essential');
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const horizontal = Math.abs(gestureState.dx) > 90 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const vertical = Math.abs(gestureState.dy) > 90 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

        if (horizontal) {
          finishSwipe(gestureState.dx > 0 ? 'challenger' : 'champion');
          return;
        }

        if (vertical) {
          finishSwipe(gestureState.dy < 0 ? 'skip' : 'essential');
          return;
        }

        resetCard();
      },
      onPanResponderTerminate: resetCard,
    }),
  ).current;

  if (!challenger || !champion) {
    return (
      <View style={styles.root}>
        <View style={[styles.content, desktop && styles.contentDesktop]}>
          <View style={styles.header}>
            <Text style={styles.logo}>WouldYouIQ</Text>
          </View>
          <Surface style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>All calibrated ✨</Text>
            <Text style={styles.emptySub}>
              Add more tasks or budget items to keep the arena going.
            </Text>
            <ActionButton label="Go to Tasks" tone="primary" onPress={() => router.push('/(tabs)/tasks')} />
          </Surface>
        </View>
      </View>
    );
  }

  const challengerMeta =
    arena.mode === 'tasks' ? (challenger as Task).t : `$${(challenger as BudgetItem).amt}/mo`;

  return (
    <View style={styles.root}>
      <View style={[styles.content, desktop && styles.contentDesktop]}>
        <View style={styles.header}>
          <Text style={styles.logo}>WouldYouIQ</Text>
          <Animated.View style={[styles.levelBlock, { transform: [{ scale: levelPulse }] }]}>
            <View style={styles.levelRow}>
              <Text style={styles.levelLabel}>Level {levelInfo.level}</Text>
              <Text style={styles.levelMeta}>
                {levelInfo.current}/{levelInfo.needed} XP
              </Text>
            </View>
            <View style={styles.streakInline}>
              <Text style={styles.streakInlineEmoji}>🔥</Text>
              <Text style={styles.streakInlineLabel}>{user.streak} day streak</Text>
            </View>
            <View style={styles.levelTrack}>
              <View style={[styles.levelFill, { width: `${Math.max(6, levelInfo.progress * 100)}%` }]} />
            </View>
            {levelBannerVisible ? <Text style={styles.levelBanner}>Level Up!</Text> : null}
          </Animated.View>
          <View style={styles.modeWrap}>
            <SegmentedControl
              items={[
                { label: '📋 Tasks', value: 'tasks' },
                { label: '💰 Budget', value: 'budget' },
              ]}
              value={arena.mode}
              onChange={setArenaMode}
            />
          </View>
        </View>

        <View style={styles.progressRow}>
          {[0, 1, 2].map((step) => (
            <View key={step} style={styles.progressTrack}>
              <View style={[styles.progressDot, arena.progress > step && styles.progressDotActive]} />
            </View>
          ))}
        </View>

        <View style={[styles.question, desktop && styles.questionDesktop]}>
          <Text style={styles.questionLabel}>Do you agree with this statement?</Text>
          <View style={styles.statementTop}>
            <Text style={styles.statementEmoji}>{challenger.e}</Text>
            <Text style={styles.statementTitle}>{challenger.n}</Text>
          </View>
          <View style={styles.statementCenter}>
            <Text style={styles.statementArrow}>&gt;</Text>
            <Text style={styles.statementHint}>(More Important)</Text>
          </View>
          <Animated.View style={[styles.statementBottom, { transform: [{ scale: championBounce }] }]}>
            <Text style={styles.statementEmoji}>{champion.e}</Text>
            <View style={styles.statementBottomText}>
              <Text style={styles.statementTitle}>{champion.n}?</Text>
            </View>
          </Animated.View>
        </View>

        <View style={styles.arena}>
          <Animated.View
            {...responder.panHandlers}
            style={[
              styles.cardWrap,
              desktop && styles.cardWrapDesktop,
              {
                transform: [...pan.getTranslateTransform(), { rotate }, { scale: cardIntro }],
              },
            ]}
          >
            <Surface
              style={[
                styles.card,
                desktop && styles.cardDesktop,
                activeDirection === 'challenger' && styles.cardYes,
                activeDirection === 'champion' && styles.cardNo,
                activeDirection === 'essential' && styles.cardEssential,
              ]}
            >
              <View style={styles.overlayWrap}>
                {activeDirection === 'challenger' ? <Text style={styles.overlayYes}>✓ YES</Text> : null}
                {activeDirection === 'champion' ? <Text style={styles.overlayNo}>✗ NO</Text> : null}
                {activeDirection === 'skip' ? <Text style={styles.overlaySkip}>↑ SKIP</Text> : null}
                {activeDirection === 'essential' ? <Text style={styles.overlayEssential}>⭐ ESSENTIAL</Text> : null}
              </View>
              <Animated.Text
                style={[
                  styles.cardEmoji,
                  {
                    transform: [{ rotate: idleRotate }, { translateY: idleTranslateY }],
                  },
                ]}
              >
                {challenger.e}
              </Animated.Text>
              <Text style={styles.cardTitle}>{challenger.n}</Text>
              <Text style={styles.cardMeta}>{challengerMeta}</Text>
            </Surface>
          </Animated.View>
        </View>

        <View style={styles.swipeGuide}>
          <GuideItem label="YES" icon="→" active={activeDirection === 'challenger'} tone="green" />
          <GuideItem label="NO" icon="←" active={activeDirection === 'champion'} tone="danger" />
          <GuideItem label="SKIP" icon="↑" active={activeDirection === 'skip'} tone="default" />
          <GuideItem label="ESSENTIAL" icon="↓" active={activeDirection === 'essential'} tone="gold" />
        </View>
      </View>
      <CompletionOverlay
        visible={arena.completionVisible}
        xpLabel="+75 XP"
        streakLabel={`${user.streak} Day Streak`}
        onKeepSwiping={dismissCompletionOverlay}
        onGoToPriorities={() => {
          dismissCompletionOverlay();
          router.push('/(tabs)/fyp');
        }}
      />
      {xpOverlay}
    </View>
  );
}

function GuideItem({
  label,
  icon,
  active,
  tone,
}: {
  label: string;
  icon: string;
  active: boolean;
  tone: 'green' | 'danger' | 'gold' | 'default';
}) {
  const color =
    tone === 'green'
      ? Colors.green
      : tone === 'danger'
      ? Colors.red
      : tone === 'gold'
      ? Colors.gold
      : Colors.t2;

  return (
    <View style={[styles.guideItem, active && styles.guideItemActive]}>
      <Text style={[styles.guideIcon, { color }]}>{icon}</Text>
      <Text style={[styles.guideLabel, active && { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.readingMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  contentDesktop: {
    maxWidth: 1120,
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  header: {
    gap: 10,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.t1,
    marginLeft: 4,
  },
  levelBlock: {
    marginTop: 2,
    borderRadius: 18,
    padding: 12,
    backgroundColor: Colors.s1,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  levelLabel: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.t1,
  },
  levelMeta: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t2,
  },
  levelTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: Colors.s3,
    overflow: 'hidden',
  },
  streakInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  streakInlineEmoji: {
    fontSize: 14,
  },
  streakInlineLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  levelFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.gold,
  },
  levelBanner: {
    marginTop: 8,
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  modeWrap: {
    marginHorizontal: -18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.s3,
    borderRadius: 2,
    justifyContent: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.s3,
    borderWidth: 1,
    borderColor: Colors.t4,
  },
  progressDotActive: {
    backgroundColor: Colors.violet,
    borderColor: Colors.violet,
  },
  question: {
    alignItems: 'center',
    marginBottom: 14,
  },
  questionDesktop: {
    maxWidth: 760,
    alignSelf: 'center',
    marginBottom: 22,
  },
  questionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 14,
  },
  statementTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statementBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statementCenter: {
    alignItems: 'center',
    marginVertical: 4,
  },
  statementBottomText: {
    alignItems: 'flex-start',
  },
  statementEmoji: {
    fontSize: 30,
  },
  statementTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.t1,
    lineHeight: 30,
  },
  statementArrow: {
    fontFamily: Fonts.display,
    fontSize: 46,
    lineHeight: 52,
    color: Colors.gold,
    marginVertical: 4,
  },
  statementHint: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: -4,
  },
  arena: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 34,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 350,
  },
  cardWrapDesktop: {
    maxWidth: 420,
  },
  card: {
    minHeight: 340,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
    backgroundColor: '#120f2a',
    borderColor: 'rgba(167,139,250,0.24)',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  cardDesktop: {
    minHeight: 390,
  },
  cardYes: {
    borderColor: 'rgba(52,211,153,0.55)',
  },
  cardNo: {
    borderColor: 'rgba(248,113,113,0.5)',
  },
  cardEssential: {
    borderColor: 'rgba(245,200,66,0.5)',
  },
  overlayWrap: {
    position: 'absolute',
    top: 18,
    right: 18,
  },
  overlayYes: {
    fontFamily: Fonts.display,
    color: Colors.green,
    fontSize: 18,
  },
  overlayNo: {
    fontFamily: Fonts.display,
    color: Colors.red,
    fontSize: 18,
  },
  overlaySkip: {
    fontFamily: Fonts.display,
    color: Colors.t2,
    fontSize: 18,
  },
  overlayEssential: {
    fontFamily: Fonts.display,
    color: Colors.gold,
    fontSize: 16,
  },
  cardEmoji: {
    fontSize: 86,
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.t1,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 38,
  },
  cardMeta: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.t2,
  },
  swipeGuide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 14,
  },
  guideItem: {
    alignItems: 'center',
    gap: 4,
    opacity: 0.42,
  },
  guideItemActive: {
    opacity: 1,
  },
  guideIcon: {
    fontSize: 18,
  },
  guideLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t3,
    letterSpacing: 1.2,
  },
  emptyCard: {
    marginTop: 60,
    padding: 24,
    gap: 14,
    alignItems: 'center',
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
    lineHeight: 22,
  },
});
