import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { CompletionOverlay } from '@/components/CompletionOverlay';
import { ExpandableTaskText } from '@/components/ExpandableTaskText';
import { useXpOverlay } from '@/components/XpOverlay';
import { Layout, isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts } from '@/constants/tokens';
import { getLevelInfo } from '@/domain/logic';
import type { ArenaMode, ArenaSwipe, BudgetItem, Task, TaskProject } from '@/domain/models';
import { useAppStore } from '@/domain/store';
import { getProjectStats, normalizeTaskWorkspace } from '@/domain/taskWorkspace';
import { useReducedMotion } from '@/lib/useReducedMotion';

type ArenaItem = Task | BudgetItem | TaskProject;

const SWIPE_THRESHOLD = 90;
const DIRECTION_THRESHOLD = 24;

const directionLabels: Record<ArenaSwipe, string> = {
  challenger: 'YES  →',
  champion: '←  NO',
  skip: '↑  SKIP',
  essential: '↓  ESSENTIAL',
};

function arenaItemName(mode: ArenaMode, item: ArenaItem) {
  return mode === 'projects' ? (item as TaskProject).name : (item as Task | BudgetItem).n;
}

function arenaItemEmoji(mode: ArenaMode, item: ArenaItem) {
  return mode === 'projects' ? '🗂️' : (item as Task | BudgetItem).e;
}

export default function CalibrateScreen() {
  const { width, height } = useWindowDimensions();
  const tasks = useAppStore((state) => state.tasks);
  const rawWorkspace = useAppStore((state) => state.taskWorkspace);
  const budget = useAppStore((state) => state.budget);
  const arena = useAppStore((state) => state.arena);
  const user = useAppStore((state) => state.user);
  const setArenaMode = useAppStore((state) => state.setArenaMode);
  const ensureArenaReady = useAppStore((state) => state.ensureArenaReady);
  const commitArenaSwipe = useAppStore((state) => state.commitArenaSwipe);
  const dismissCompletionOverlay = useAppStore((state) => state.dismissCompletionOverlay);
  const reduceMotion = useReducedMotion();
  const { triggerXp, xpOverlay } = useXpOverlay();

  const [activeDirection, setActiveDirection] = useState<ArenaSwipe | null>(null);
  const [levelBannerVisible, setLevelBannerVisible] = useState(false);
  const directionRef = useRef<ArenaSwipe | null>(null);
  const isCommittingRef = useRef(false);
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);
  const compact = height < 760;
  const workspace = useMemo(() => normalizeTaskWorkspace(rawWorkspace), [rawWorkspace]);
  const arenaItems = arena.mode === 'projects'
    ? workspace.projects
    : arena.mode === 'tasks'
      ? tasks
      : budget.items;

  const champion = arenaItems.find((item) => item.id === arena.championId) ?? null;
  const challenger = arenaItems.find((item) => item.id === arena.challengerId) ?? null;

  const pan = useRef(new Animated.ValueXY()).current;
  const idle = useRef(new Animated.Value(0)).current;
  const championBounce = useRef(new Animated.Value(0.92)).current;
  const cardIntro = useRef(new Animated.Value(0.96)).current;
  const commitScale = useRef(new Animated.Value(1)).current;
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const levelPulse = useRef(new Animated.Value(1)).current;
  const prevLevelRef = useRef(getLevelInfo(user.xp).level);
  const levelInfo = getLevelInfo(user.xp);

  const rotate = pan.x.interpolate({
    inputRange: [-160, 0, 160],
    outputRange: ['-8deg', '0deg', '8deg'],
  });
  const idleRotate = idle.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-3deg', '2deg', '-3deg'],
  });
  const idleTranslateY = idle.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -7, 0],
  });

  useFocusEffect(
    useCallback(() => {
      ensureArenaReady();
    }, [ensureArenaReady]),
  );

  useEffect(() => {
    if (reduceMotion) {
      idle.setValue(0);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idle, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(idle, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [idle, reduceMotion]);

  useEffect(() => {
    if (!champion?.id) return;
    if (reduceMotion) {
      championBounce.setValue(1);
      return;
    }

    championBounce.setValue(0.92);
    Animated.spring(championBounce, {
      toValue: 1,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [champion?.id, championBounce, reduceMotion]);

  useEffect(() => {
    if (!challenger?.id) return;

    pan.setValue({ x: 0, y: 0 });
    commitScale.setValue(1);
    stampOpacity.setValue(0);
    directionRef.current = null;
    isCommittingRef.current = false;
    setActiveDirection(null);

    if (reduceMotion) {
      cardIntro.setValue(1);
      return;
    }

    cardIntro.setValue(0.96);
    Animated.spring(cardIntro, {
      toValue: 1,
      tension: 120,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, [cardIntro, challenger?.id, commitScale, pan, reduceMotion, stampOpacity]);

  useEffect(() => {
    if (levelInfo.level <= prevLevelRef.current) {
      prevLevelRef.current = levelInfo.level;
      return;
    }

    prevLevelRef.current = levelInfo.level;
    setLevelBannerVisible(true);

    if (!reduceMotion) {
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
    }

    const timeout = setTimeout(() => setLevelBannerVisible(false), 1800);
    return () => clearTimeout(timeout);
  }, [levelInfo.level, levelPulse, reduceMotion]);

  const clearDirection = useCallback(() => {
    directionRef.current = null;
    setActiveDirection(null);
    stampOpacity.setValue(0);
  }, [stampOpacity]);

  const resetCard = useCallback(() => {
    clearDirection();

    if (reduceMotion) {
      pan.setValue({ x: 0, y: 0 });
      commitScale.setValue(1);
      return;
    }

    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.spring(commitScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
      }),
    ]).start();
  }, [clearDirection, commitScale, pan, reduceMotion]);

  const finishSwipe = useCallback(
    (swipe: ArenaSwipe) => {
      if (isCommittingRef.current) return;
      if (arena.mode === 'projects' && swipe === 'essential') {
        resetCard();
        return;
      }
      isCommittingRef.current = true;
      directionRef.current = swipe;
      setActiveDirection(swipe);
      stampOpacity.setValue(1);

      const toValue =
        swipe === 'challenger'
          ? { x: 520, y: 30 }
          : swipe === 'champion'
            ? { x: -520, y: 30 }
            : swipe === 'skip'
              ? { x: 0, y: -560 }
              : { x: 0, y: 80 };
      const duration = reduceMotion ? 0 : swipe === 'essential' ? 280 : 220;

      Animated.parallel([
        Animated.timing(pan, {
          toValue,
          duration,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(commitScale, {
          toValue: swipe === 'essential' ? 1.06 : 1,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        void Haptics.impactAsync(
          swipe === 'essential'
            ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Medium,
        );
        const xp = swipe === 'essential' ? 30 : swipe === 'skip' ? 0 : 20;
        if (xp > 0) triggerXp(xp);

        commitArenaSwipe(swipe);
        pan.setValue({ x: 0, y: 0 });
        commitScale.setValue(1);
        clearDirection();
        isCommittingRef.current = false;
      });
    },
    [arena.mode, clearDirection, commitArenaSwipe, commitScale, pan, reduceMotion, resetCard, stampOpacity, triggerXp],
  );

  const updateLiveDirection = useCallback(
    (dx: number, dy: number) => {
      const dominantDistance = Math.max(Math.abs(dx), Math.abs(dy));
      if (dominantDistance < DIRECTION_THRESHOLD) {
        if (directionRef.current) clearDirection();
        return;
      }

      if (arena.mode === 'projects' && Math.abs(dy) >= Math.abs(dx) && dy > 0) {
        clearDirection();
        return;
      }

      const nextDirection: ArenaSwipe =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? 'challenger'
            : 'champion'
          : dy < 0
            ? 'skip'
            : 'essential';

      stampOpacity.setValue(Math.min(1, (dominantDistance - DIRECTION_THRESHOLD) / 64));
      if (nextDirection === directionRef.current) return;

      directionRef.current = nextDirection;
      setActiveDirection(nextDirection);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [arena.mode, clearDirection, stampOpacity],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6,
        onPanResponderMove: (_, gestureState) => {
          if (isCommittingRef.current) return;
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          updateLiveDirection(gestureState.dx, gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          const horizontal =
            Math.abs(gestureState.dx) > SWIPE_THRESHOLD &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          const vertical =
            Math.abs(gestureState.dy) > SWIPE_THRESHOLD &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

          if (horizontal) {
            finishSwipe(gestureState.dx > 0 ? 'challenger' : 'champion');
            return;
          }

          if (vertical) {
            if (gestureState.dy > 0 && arena.mode === 'projects') {
              resetCard();
            } else {
              finishSwipe(gestureState.dy < 0 ? 'skip' : 'essential');
            }
            return;
          }

          resetCard();
        },
        onPanResponderTerminate: resetCard,
      }),
    [arena.mode, finishSwipe, pan, resetCard, updateLiveDirection],
  );

  useFocusEffect(
    useCallback(() => {
      if (!desktop || !challenger || !champion || typeof window === 'undefined') {
        return undefined;
      }

      const onKeyDown = (event: KeyboardEvent) => {
        if (shouldIgnoreKeyboardEvent(event)) return;

        const swipe =
          event.key === 'ArrowLeft'
            ? 'champion'
            : event.key === 'ArrowRight'
              ? 'challenger'
              : event.key === 'ArrowUp'
              ? 'skip'
                : event.key === 'ArrowDown' && arena.mode !== 'projects'
                  ? 'essential'
                  : null;

        if (!swipe) return;
        event.preventDefault();
        finishSwipe(swipe);
      };

      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [arena.mode, challenger, champion, desktop, finishSwipe]),
  );

  const handleModeChange = useCallback(
    (mode: ArenaMode) => {
      if (mode === arena.mode || isCommittingRef.current) return;
      resetCard();
      setArenaMode(mode);
    },
    [arena.mode, resetCard, setArenaMode],
  );

  const challengerMeta = challenger
    ? arena.mode === 'projects'
      ? (() => {
          const stats = getProjectStats(challenger.id, tasks, workspace);
          return `${stats.taskCount} task${stats.taskCount === 1 ? '' : 's'} · ${stats.percent}% done`;
        })()
      : arena.mode === 'tasks'
        ? (challenger as Task).t
        : `$${(challenger as BudgetItem).amt}/mo`
    : '';
  const challengerName = challenger ? arenaItemName(arena.mode, challenger) : '';
  const challengerEmoji = challenger ? arenaItemEmoji(arena.mode, challenger) : '';
  const championName = champion ? arenaItemName(arena.mode, champion) : '';
  const championEmoji = champion ? arenaItemEmoji(arena.mode, champion) : '';

  return (
    <View style={styles.root}>
      <View style={[styles.content, desktop && styles.contentDesktop]}>
        <View style={styles.topRow}>
          <View style={styles.wordmark} accessibilityLabel="Would You IQ">
            <Text style={[styles.logo, styles.logoViolet]}>Would</Text>
            <Text style={[styles.logo, styles.logoGold]}>YouIQ</Text>
          </View>
          <ModeSwitch value={arena.mode} onChange={handleModeChange} />
        </View>

        <Animated.View style={[styles.levelStrip, { transform: [{ scale: levelPulse }] }]}>
          <Text style={styles.levelLabel}>Lv {levelInfo.level}</Text>
          <View style={styles.levelTrack}>
            <LinearGradient
              colors={[Colors.gold2, Colors.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.levelFill,
                { width: `${Math.max(6, levelInfo.progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.levelMeta}>
            {levelInfo.current}/{levelInfo.needed} XP
          </Text>
          <View style={styles.levelDivider} />
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakLabel}>{user.streak} DAY</Text>
          {levelBannerVisible ? <Text style={styles.levelBanner}>LEVEL UP!</Text> : null}
        </Animated.View>

        <View style={styles.progressRow} accessibilityLabel={`${arena.progress} of 3 choices complete`}>
          {[0, 1, 2].map((step) => (
            <View
              key={step}
              style={[styles.progressBar, arena.progress > step && styles.progressBarActive]}
            />
          ))}
        </View>

        {challenger && champion ? (
          <>
            <View style={[styles.arena, compact && styles.arenaCompact]}>
              <Text style={styles.questionLabel}>WOULD YOU CHOOSE</Text>
              <Animated.View
                {...responder.panHandlers}
                accessibilityLabel={`${challengerName} over ${championName}`}
                accessibilityHint={arena.mode === 'projects'
                  ? 'Swipe right for yes, left for no, or up to skip'
                  : 'Swipe right for yes, left for no, up to skip, or down to mark essential'}
                style={[
                  styles.challengerWrap,
                  {
                    transform: [
                      ...pan.getTranslateTransform(),
                      { rotate },
                      { scale: cardIntro },
                      { scale: commitScale },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#1a1440', '#120f2a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.85, y: 1 }}
                  style={[
                    styles.challengerCard,
                    compact && styles.challengerCardCompact,
                    activeDirection === 'challenger' && styles.challengerCardYes,
                    activeDirection === 'champion' && styles.challengerCardNo,
                    activeDirection === 'essential' && styles.challengerCardEssential,
                  ]}
                >
                  {activeDirection ? (
                    <Animated.Text
                      style={[
                        styles.directionStamp,
                        activeDirection === 'challenger' && styles.directionStampYes,
                        activeDirection === 'champion' && styles.directionStampNo,
                        activeDirection === 'skip' && styles.directionStampSkip,
                        activeDirection === 'essential' && styles.directionStampEssential,
                        { opacity: stampOpacity },
                      ]}
                    >
                      {directionLabels[activeDirection]}
                    </Animated.Text>
                  ) : null}

                  <Animated.View
                    style={[
                      styles.emojiHalo,
                      compact && styles.emojiHaloCompact,
                      { transform: [{ rotate: idleRotate }, { translateY: idleTranslateY }] },
                    ]}
                  >
                    <LinearGradient
                      colors={['rgba(167,139,250,0.34)', 'rgba(124,106,247,0.08)']}
                      style={styles.emojiHaloGradient}
                    >
                      <Text style={[styles.challengerEmoji, compact && styles.challengerEmojiCompact]}>
                        {challengerEmoji}
                      </Text>
                    </LinearGradient>
                  </Animated.View>

                  <ExpandableTaskText
                    key={challenger.id}
                    value={challengerName}
                    maxLength={34}
                    numberOfLines={2}
                    style={[styles.challengerTitle, compact && styles.challengerTitleCompact]}
                  />
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>{challengerMeta}</Text>
                  </View>
                </LinearGradient>
              </Animated.View>

              <View style={styles.overRow}>
                <View style={styles.overLine} />
                <Text style={styles.overLabel}>OVER</Text>
                <View style={styles.overLine} />
              </View>

              <Animated.View style={[styles.championChip, { transform: [{ scale: championBounce }] }]}>
                <Text style={styles.crown}>♛</Text>
                <Text style={styles.championEmoji}>{championEmoji}</Text>
                <View style={styles.championNameWrap}>
                  <ExpandableTaskText
                    key={champion.id}
                    value={championName}
                    maxLength={24}
                    numberOfLines={1}
                    style={styles.championName}
                  />
                </View>
                <View style={styles.eloBadge}>
                  <Text style={styles.eloText}>{champion.elo}</Text>
                </View>
              </Animated.View>
            </View>

            <View style={styles.actionRow}>
              <ArenaActionButton label="NO" arrow="←" tone="no" weight={1.35} onPress={() => finishSwipe('champion')} />
              <ArenaActionButton label="SKIP" arrow="↑" tone="skip" weight={0.8} onPress={() => finishSwipe('skip')} />
              {arena.mode !== 'projects' ? <ArenaActionButton label="ESSENTIAL" arrow="↓" tone="essential" weight={1} onPress={() => finishSwipe('essential')} /> : null}
              <ArenaActionButton label="YES" arrow="→" tone="yes" weight={1.35} onPress={() => finishSwipe('challenger')} />
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>All calibrated</Text>
            <Text style={styles.emptySub}>
              Add at least two {arena.mode === 'projects' ? 'projects' : arena.mode === 'tasks' ? 'tasks' : 'budget items'} to keep choosing.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(arena.mode === 'budget' ? '/(tabs)/budget' : '/(tabs)/tasks')}
              style={({ pressed }) => [styles.emptyButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.emptyButtonText}>Go to {arena.mode === 'projects' ? 'Projects' : arena.mode === 'tasks' ? 'Tasks' : 'Budget'}</Text>
            </Pressable>
          </View>
        )}
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

function ModeSwitch({ value, onChange }: { value: ArenaMode; onChange: (mode: ArenaMode) => void }) {
  return (
    <View style={styles.modeSwitch} accessibilityLabel="Choose comparison type">
      <ModeOption active={value === 'projects'} label="🗂 Projects" onPress={() => onChange('projects')} />
      <ModeOption active={value === 'tasks'} label="📋 Tasks" onPress={() => onChange('tasks')} />
      <ModeOption active={value === 'budget'} label="💰 Budget" onPress={() => onChange('budget')} />
    </View>
  );
}

function ModeOption({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.modeOption, pressed && styles.buttonPressed]}
    >
      {active ? (
        <LinearGradient colors={['#8b74f7', '#765ee6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modeOptionInner}>
          <Text style={[styles.modeLabel, styles.modeLabelActive]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.modeOptionInner}>
          <Text style={styles.modeLabel}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function ArenaActionButton({
  label,
  arrow,
  tone,
  weight,
  onPress,
}: {
  label: string;
  arrow: string;
  tone: 'no' | 'skip' | 'essential' | 'yes';
  weight: number;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hoverScale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      hoverScale.setValue(1);
      return;
    }

    Animated.spring(hoverScale, {
      toValue: hovered ? 1.035 : 1,
      tension: 180,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [hoverScale, hovered, reduceMotion]);

  const labelColor =
    tone === 'no'
      ? Colors.red
      : tone === 'essential'
        ? Colors.gold
        : tone === 'yes'
          ? '#07150f'
          : Colors.t2;

  return (
    <Animated.View style={[styles.actionButtonWrap, { flex: weight, transform: [{ scale: hoverScale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${arrow}`}
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed }) => [
          styles.actionButton,
          tone === 'no' && styles.actionNo,
          tone === 'skip' && styles.actionSkip,
          tone === 'essential' && styles.actionEssential,
          tone === 'yes' && styles.actionYes,
          (tone === 'skip' || tone === 'essential') && styles.actionButtonStacked,
          pressed && styles.buttonPressed,
        ]}
      >
        {tone === 'yes' ? (
          <LinearGradient pointerEvents="none" colors={['#34d399', '#61d89d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : null}
        <Text
          style={[
            styles.actionArrow,
            (tone === 'skip' || tone === 'essential') && styles.actionArrowStacked,
            { color: labelColor },
          ]}
        >
          {arrow}
        </Text>
        <Text
          style={[
            styles.actionLabel,
            tone === 'essential' && styles.actionLabelEssential,
            { color: labelColor },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function shouldIgnoreKeyboardEvent(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return false;

  const tagName = target.tagName?.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1, width: '100%', maxWidth: Layout.readingMaxWidth, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10 },
  contentDesktop: { maxWidth: 720, paddingHorizontal: 20 },
  topRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  logo: { fontFamily: Fonts.display, fontSize: 19, letterSpacing: -1.1 },
  logoViolet: { color: Colors.violet },
  logoGold: { color: Colors.gold },
  modeSwitch: { height: 38, flexDirection: 'row', padding: 3, borderRadius: 999, borderWidth: 1, borderColor: Colors.b1, backgroundColor: Colors.s1 },
  modeOption: { minWidth: 72, borderRadius: 999, overflow: 'hidden' },
  modeOptionInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 999 },
  modeLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.t3 },
  modeLabelActive: { color: Colors.t1 },
  levelStrip: { minHeight: 38, marginTop: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: Colors.b2, backgroundColor: 'rgba(14,14,28,0.84)' },
  levelLabel: { fontFamily: Fonts.display, fontSize: 10, color: Colors.t1 },
  levelTrack: { flex: 1, minWidth: 48, height: 5, borderRadius: 999, overflow: 'hidden', backgroundColor: Colors.s3 },
  levelFill: { height: '100%', borderRadius: 999 },
  levelMeta: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.t2 },
  levelDivider: { width: 1, height: 18, backgroundColor: Colors.b2 },
  streakEmoji: { fontSize: 12, marginRight: -5 },
  streakLabel: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.gold, letterSpacing: 0.9 },
  levelBanner: { position: 'absolute', top: 31, left: 12, zIndex: 20, fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.gold, letterSpacing: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  progressBar: { flex: 1, height: 4, borderRadius: 999, backgroundColor: Colors.s3 },
  progressBarActive: { backgroundColor: Colors.violet, shadowColor: Colors.violet, shadowOpacity: 0.5, shadowRadius: 5 },
  arena: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingBottom: 10 },
  arenaCompact: { paddingTop: 8, paddingBottom: 6 },
  questionLabel: { marginBottom: 12, fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.t3, letterSpacing: 2.2 },
  challengerWrap: { width: '100%', maxWidth: 620 },
  challengerCard: { minHeight: 240, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 22, alignItems: 'center', justifyContent: 'center', gap: 16, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(167,139,250,0.34)', shadowColor: '#000', shadowOpacity: 0.62, shadowRadius: 22, shadowOffset: { width: 0, height: 13 } },
  challengerCardCompact: { minHeight: 208, paddingTop: 18, paddingBottom: 18, gap: 12 },
  challengerCardYes: { borderColor: 'rgba(52,211,153,0.72)' },
  challengerCardNo: { borderColor: 'rgba(248,113,113,0.68)' },
  challengerCardEssential: { borderColor: 'rgba(245,200,66,0.72)' },
  directionStamp: { position: 'absolute', zIndex: 20, top: 18, right: 18, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden', borderWidth: 1, borderRadius: 10, fontFamily: Fonts.display, fontSize: 12, transform: [{ rotate: '5deg' }] },
  directionStampYes: { color: Colors.green, borderColor: Colors.green, backgroundColor: 'rgba(52,211,153,0.12)' },
  directionStampNo: { color: Colors.red, borderColor: Colors.red, backgroundColor: 'rgba(248,113,113,0.12)' },
  directionStampSkip: { color: Colors.t2, borderColor: Colors.t2, backgroundColor: 'rgba(148,144,181,0.12)' },
  directionStampEssential: { color: Colors.gold, borderColor: Colors.gold, backgroundColor: 'rgba(245,200,66,0.12)' },
  emojiHalo: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', shadowColor: Colors.violet, shadowOpacity: 0.32, shadowRadius: 24 },
  emojiHaloCompact: { width: 78, height: 78, borderRadius: 39 },
  emojiHaloGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  challengerEmoji: { fontSize: 50 },
  challengerEmojiCompact: { fontSize: 42 },
  challengerTitle: { maxWidth: 500, fontFamily: Fonts.display, fontSize: 25, lineHeight: 31, color: Colors.t1, textAlign: 'center' },
  challengerTitleCompact: { fontSize: 21, lineHeight: 27 },
  metaPill: { minHeight: 28, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: Colors.b2, backgroundColor: 'rgba(255,255,255,0.045)' },
  metaPillText: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.t2 },
  overRow: { width: '100%', marginVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 },
  overLine: { flex: 1, height: 1, backgroundColor: Colors.b1 },
  overLabel: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.t3, letterSpacing: 2 },
  championChip: { maxWidth: '84%', minHeight: 46, paddingLeft: 10, paddingRight: 9, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(245,200,66,0.28)', backgroundColor: 'rgba(245,200,66,0.075)' },
  crown: { fontSize: 17, color: Colors.gold, textShadowColor: 'rgba(245,200,66,0.45)', textShadowRadius: 7 },
  championEmoji: { fontSize: 18 },
  championNameWrap: { flexShrink: 1 },
  championName: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.t1 },
  eloBadge: { minWidth: 36, height: 23, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: 'rgba(245,200,66,0.13)' },
  eloText: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Colors.gold },
  actionRow: { minHeight: 62, flexDirection: 'row', alignItems: 'stretch', gap: 9 },
  actionButtonWrap: { minWidth: 0 },
  actionButton: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden', borderRadius: 20, borderWidth: 1 },
  actionButtonStacked: { flexDirection: 'column', gap: 2 },
  actionNo: { borderColor: 'rgba(248,113,113,0.36)', backgroundColor: 'rgba(248,113,113,0.08)' },
  actionSkip: { borderColor: Colors.b2, backgroundColor: Colors.s1 },
  actionEssential: { borderColor: 'rgba(245,200,66,0.3)', backgroundColor: 'rgba(245,200,66,0.06)' },
  actionYes: { borderColor: 'rgba(52,211,153,0.55)', shadowColor: Colors.green, shadowOpacity: 0.25, shadowRadius: 14 },
  actionArrow: { fontFamily: Fonts.bodyBold, fontSize: 15 },
  actionArrowStacked: { fontSize: 13 },
  actionLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, letterSpacing: 0.8 },
  actionLabelEssential: { fontSize: 7, letterSpacing: 0.6 },
  buttonPressed: { opacity: 0.72 },
  emptyCard: { flex: 1, maxHeight: 330, marginTop: 44, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 14, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', backgroundColor: '#120f2a' },
  emptyEmoji: { fontSize: 38 },
  emptyTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.t1 },
  emptySub: { fontFamily: Fonts.bodyLight, fontSize: 14, lineHeight: 21, color: Colors.t2, textAlign: 'center' },
  emptyButton: { minHeight: 48, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: Colors.violet },
  emptyButtonText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.bg },
});
