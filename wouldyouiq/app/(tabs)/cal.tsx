import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTaskStore } from '@/stores/taskStore';
import { useUserStore } from '@/stores/userStore';
import { getMilestoneToast } from '@/components/MilestoneToast';
import { selectPair } from '@/utils/pairs';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { TwoCardArena } from '@/components/calibrate/TwoCardArena';
import { CompletionOverlay } from '@/components/calibrate/CompletionOverlay';
import { Badge } from '@/components/ui';

const COMPARISON_XP = 20;
const SESSION_BONUS_XP = 75;

export default function WouldYouScreen() {
  const { profile, addXP, incrementStreak, incrementComparisons } = useUserStore();
  const { tasks, getPairPool, applyEloUpdate, toggleEssential, getSortedTasks } = useTaskStore();

  const [round, setRound] = useState(0);
  const [sessionPairs, setSessionPairs] = useState<[string, string][]>([]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);

  const pool = useMemo(() => getPairPool(), [tasks, getPairPool]);
  const pair = useMemo(() => {
    const p = selectPair(tasks, sessionPairs);
    return p;
  }, [tasks, sessionPairs]);

  const handleDecision = useCallback(
    (winner: 'challenger' | 'defender') => {
      if (!pair) return;
      const [challenger, defender] = pair;
      const winnerTask = winner === 'challenger' ? challenger : defender;
      const loserTask = winner === 'challenger' ? defender : challenger;
      applyEloUpdate(winnerTask.id, loserTask.id);
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
      applyEloUpdate,
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
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.logo}>⚡ Would You?</Text>
          <Badge label={`${profile.xp} XP`} variant="violet" />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Not enough tasks to compare</Text>
          <Text style={styles.emptySub}>
            Add at least 2 non-essential tasks in the Tasks tab, then come back.
          </Text>
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
      <View style={styles.topBar}>
        <Text style={styles.logo}>⚡ Would You?</Text>
        <Badge label={`${profile.xp} XP`} variant="violet" />
      </View>
      <View style={styles.progressRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= round && styles.progressDotActive,
              i < round && styles.progressDotDone,
            ]}
          />
        ))}
        <View style={styles.streakWrap}>
          <Text style={styles.streakText}>🔥 {profile.streak} days</Text>
        </View>
      </View>
      <TwoCardArena
        challenger={challenger}
        defender={defender}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.gold,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.s3,
  },
  progressDotActive: {
    backgroundColor: Colors.violet,
    width: 24,
  },
  progressDotDone: {
    backgroundColor: Colors.green,
  },
  streakWrap: {
    marginLeft: 'auto',
  },
  streakText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.gold,
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
