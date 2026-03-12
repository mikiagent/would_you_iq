import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useUserStore } from '@/stores/userStore';
import { useTaskStore } from '@/stores/taskStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { Colors, Fonts } from '@/constants/tokens';
import { Surface } from '@/components/ui/Surface';

export default function InsightsScreen() {
  const { profile } = useUserStore();
  const { getSortedTasks } = useTaskStore();
  const { getAlignmentScore } = useBudgetStore();

  const sorted = useMemo(() => getSortedTasks(false), [getSortedTasks]);
  const active = sorted.filter((t) => !t.done);
  const alignment = getAlignmentScore();

  const minElo = active.length > 0 ? Math.min(...active.map((t) => t.elo)) : 1200;
  const maxElo = active.length > 0 ? Math.max(...active.map((t) => t.elo)) : 1200;
  const range = maxElo - minElo || 1;

  const topPriority = active[0];
  const insight2 = alignment < 70 && profile.monthlyIncome > 0
    ? `Your priority alignment is ${alignment}%. Consider aligning spending with your top priorities.`
    : null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.greeting}>Hey {profile.name || 'there'}!</Text>
          <Text style={styles.sub}>Here’s how your priorities look.</Text>
        </View>

        <Text style={styles.sectionTitle}>📊 Full priority ranking</Text>
        {active.map((task, i) => {
          const rank = i + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
          const pct = ((task.elo - minElo) / range) * 100;
          return (
            <Surface key={task.id} style={styles.rankRow}>
              <Text style={styles.medal}>{task.essential ? '⭐' : medal}</Text>
              <Text style={styles.emoji}>{task.emoji}</Text>
              <View style={styles.rankCenter}>
                <Text style={styles.taskName}>{task.name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
              <Text style={styles.elo}>{task.elo} ELO</Text>
            </Surface>
          );
        })}
        {active.length === 0 && (
          <Text style={styles.empty}>Complete calibration to see your ranking.</Text>
        )}

        <Text style={styles.sectionTitle}>📈 Stats</Text>
        <View style={styles.statsGrid}>
          <Surface style={styles.statCard}>
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={styles.statValue}>{profile.xp}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{profile.streak}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statEmoji}>🧩</Text>
            <Text style={styles.statValue}>{profile.comparisonsTotal}</Text>
            <Text style={styles.statLabel}>Comparisons</Text>
          </Surface>
          <Surface style={styles.statCard}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statValue}>{profile.tasksCompleted}</Text>
            <Text style={styles.statLabel}>Tasks done</Text>
          </Surface>
        </View>

        <Text style={styles.sectionTitle}>💡 Insights</Text>
        {topPriority && (
          <Surface style={styles.insightCard}>
            <Text style={styles.insightText}>
              Your #1 priority is <Text style={styles.insightBold}>{topPriority.name}</Text>. Make sure your schedule reflects it.
            </Text>
          </Surface>
        )}
        {insight2 && (
          <Surface style={styles.insightCard}>
            <Text style={styles.insightText}>{insight2}</Text>
          </Surface>
        )}
        <Surface style={styles.insightCard}>
          <Text style={styles.insightText}>
            You’ve made {profile.comparisonsTotal} comparisons. Your Elo ratings are {profile.comparisonsTotal >= 10 ? 'getting more accurate.' : 'still calibrating—keep going!'}
          </Text>
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  hero: { marginBottom: 28 },
  greeting: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.t1,
    marginBottom: 4,
  },
  sub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 16,
    color: Colors.t2,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    color: Colors.t1,
    marginBottom: 12,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  medal: { fontSize: 20, width: 28, textAlign: 'center' },
  emoji: { fontSize: 24, marginRight: 10 },
  rankCenter: { flex: 1 },
  taskName: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.t1,
    marginBottom: 4,
  },
  barTrack: {
    height: 4,
    backgroundColor: Colors.s2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.violet,
    borderRadius: 2,
  },
  elo: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.t2,
    marginLeft: 8,
  },
  empty: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t3,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    padding: 16,
    alignItems: 'center',
  },
  statEmoji: { fontSize: 28, marginBottom: 4 },
  statValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
    color: Colors.t1,
  },
  statLabel: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t2,
    marginTop: 2,
  },
  insightCard: {
    padding: 16,
    marginBottom: 10,
  },
  insightText: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t1,
    lineHeight: 20,
  },
  insightBold: {
    fontFamily: Fonts.bodyBold,
  },
});
