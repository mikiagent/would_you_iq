import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTaskStore } from '@/stores/taskStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useUserStore } from '@/stores/userStore';
import { getMilestoneToast } from '@/components/MilestoneToast';
import { selectPair, selectBudgetPair } from '@/utils/pairs';
import { genStake } from '@/utils/stakes';
import type { Task } from '@/types/models';
import type { BudgetItem } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { TwoCardArena } from '@/components/calibrate/TwoCardArena';
import { CompletionOverlay } from '@/components/calibrate/CompletionOverlay';

const COMPARISON_XP = 20;
const SESSION_BONUS_XP = 75;

type CalMode = 'tasks' | 'budget';

/** Map BudgetItem to a Task-like shape for the arena (display only). */
function budgetItemToTaskLike(b: BudgetItem): Task {
  return {
    id: b.id,
    emoji: b.emoji,
    name: b.name,
    timeEstimate: `$${b.amountMonthly}/mo`,
    elo: b.elo ?? 1200,
    essential: false,
    deadline: null,
    urgency: 'low',
    done: false,
    createdAt: 0,
  };
}

export default function WouldYouScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 44);
  const { profile, addXP, incrementStreak, incrementComparisons } = useUserStore();
  const { tasks, getPairPool, applyEloUpdate, toggleEssential } = useTaskStore();
  const { items: budgetItems, getPairPool: getBudgetPairPool, applyEloUpdate: applyBudgetEloUpdate } = useBudgetStore();

  const [calMode, setCalMode] = useState<CalMode>('tasks');
  const [round, setRound] = useState(0);
  const [sessionPairs, setSessionPairs] = useState<[string, string][]>([]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);

  const taskPool = useMemo(() => getPairPool(), [tasks, getPairPool]);
  const budgetPool = useMemo(() => getBudgetPairPool(), [budgetItems, getBudgetPairPool]);
  const isTasks = calMode === 'tasks';
  const pool = isTasks ? taskPool : budgetPool;
  const pair = useMemo(() => {
    if (isTasks) {
      const p = selectPair(tasks, sessionPairs);
      return p;
    }
    const p = selectBudgetPair(budgetItems, sessionPairs);
    return p ? [budgetItemToTaskLike(p[0]), budgetItemToTaskLike(p[1])] : null;
  }, [isTasks, tasks, budgetItems, sessionPairs]);
  const stake = useMemo(() => {
    if (!pair || !isTasks) return null;
    return genStake(pair[0], pair[1]);
  }, [pair, isTasks]);

  const handleDecision = useCallback(
    (winner: 'challenger' | 'defender') => {
      if (!pair) return;
      const [challenger, defender] = pair;
      const winnerId = winner === 'challenger' ? challenger.id : defender.id;
      const loserId = winner === 'challenger' ? defender.id : challenger.id;
      if (isTasks) {
        applyEloUpdate(winnerId, loserId);
      } else {
        applyBudgetEloUpdate(winnerId, loserId);
      }
      incrementComparisons();
      addXP(COMPARISON_XP);
      setSessionXp((x) => x + COMPARISON_XP);
      setSessionPairs((prev) => [...prev, [challenger.id, defender.id]]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (round >= 2) {
        addXP(SESSION_BONUS_XP);
        setSessionXp((x) => x + SESSION_BONUS_XP);
        incrementStreak();
        const newStreak = useUserStore.getState().profile.streak;
        getMilestoneToast().show(newStreak);
        setShowCompletion(true);
      } else {
        setRound((r) => r + 1);
      }
    },
    [
      pair,
      round,
      isTasks,
      applyEloUpdate,
      applyBudgetEloUpdate,
      incrementComparisons,
      addXP,
      incrementStreak,
    ]
  );

  const handleToggleChallengerEssential = useCallback(() => {
    if (!pair) return;
    toggleEssential(pair[0].id);
    setSessionPairs((prev) => [...prev, [pair[0].id, pair[1].id]]);
  }, [pair, toggleEssential]);

  const handleToggleDefenderEssential = useCallback(() => {
    if (!pair) return;
    toggleEssential(pair[1].id);
    setSessionPairs((prev) => [...prev, [pair[0].id, pair[1].id]]);
  }, [pair, toggleEssential]);

  const handleCloseCompletion = useCallback(() => {
    setShowCompletion(false);
    setRound(0);
    setSessionPairs([]);
    setSessionXp(0);
  }, []);

  if (pool.length < 2) {
    const emptyTitle = isTasks
      ? 'Not enough tasks to compare'
      : 'Not enough budget items to compare';
    const emptySub = isTasks
      ? 'Add at least 2 non-essential tasks in the Tasks tab, then come back.'
      : 'Add at least 2 non-essential expenses in Budget, then come back.';
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop }]}>
          <Text style={styles.logo}>WouldYouIQ</Text>
          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.mtBtn, calMode === 'tasks' && styles.mtBtnOn]}
              onPress={() => setCalMode('tasks')}
            >
              <Text style={[styles.mtBtnText, calMode === 'tasks' && styles.mtBtnTextOn]}>
                📋 Tasks
              </Text>
            </Pressable>
            <Pressable
              style={[styles.mtBtn, calMode === 'budget' && styles.mtBtnOn]}
              onPress={() => setCalMode('budget')}
            >
              <Text style={[styles.mtBtnText, calMode === 'budget' && styles.mtBtnTextOn]}>
                💰 Budget
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>{isTasks ? '📋' : '💰'}</Text>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySub}>{emptySub}</Text>
        </View>
      </View>
    );
  }

  if (!pair) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading pair...</Text>
      </View>
    );
  }

  const [challenger, defender] = pair;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop }]}>
        <Text style={styles.logo}>WouldYouIQ</Text>
        <View style={styles.modeToggle}>
          <Pressable
            style={[styles.mtBtn, calMode === 'tasks' && styles.mtBtnOn]}
            onPress={() => setCalMode('tasks')}
          >
            <Text style={[styles.mtBtnText, calMode === 'tasks' && styles.mtBtnTextOn]}>
              📋 Tasks
            </Text>
          </Pressable>
          <Pressable
            style={[styles.mtBtn, calMode === 'budget' && styles.mtBtnOn]}
            onPress={() => setCalMode('budget')}
          >
            <Text style={[styles.mtBtnText, calMode === 'budget' && styles.mtBtnTextOn]}>
              💰 Budget
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.progRow}>
        <View style={[styles.dot, round >= 0 && styles.dotOn]} />
        <View style={styles.progLine}>
          <View style={[styles.progFill, { width: round >= 1 ? '100%' : '0%' }]} />
        </View>
        <View style={[styles.dot, round >= 1 && styles.dotOn]} />
        <View style={styles.progLine}>
          <View style={[styles.progFill, { width: round >= 2 ? '100%' : '0%' }]} />
        </View>
        <View style={[styles.dot, round >= 2 && styles.dotOn]} />
      </View>
      <TwoCardArena
        challenger={challenger}
        defender={defender}
        stake={stake}
        onDecision={handleDecision}
        onToggleChallengerEssential={handleToggleChallengerEssential}
        onToggleDefenderEssential={handleToggleDefenderEssential}
      />
      <CompletionOverlay
        visible={showCompletion}
        xpEarned={sessionXp}
        streak={profile.streak}
        onClose={handleCloseCompletion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  logo: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 15,
    color: Colors.violet,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  mtBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  mtBtnOn: {
    backgroundColor: Colors.v2,
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 2,
  },
  mtBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t2,
    letterSpacing: 0.2,
  },
  mtBtnTextOn: {
    color: '#fff',
  },
  progRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.s3,
    borderWidth: 1.5,
    borderColor: Colors.t4,
  },
  dotOn: {
    backgroundColor: Colors.violet,
    borderColor: Colors.violet,
    transform: [{ scale: 1.45 }],
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  progLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.s3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: Colors.violet,
    borderRadius: 2,
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
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.t1,
    padding: 24,
  },
});
