import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTaskStore } from '@/stores/taskStore';
import { Colors, Fonts } from '@/constants/tokens';

export function TaskInsightsPane() {
  const { getSortedTasks } = useTaskStore();
  const sorted = useMemo(() => getSortedTasks(false), [getSortedTasks]);
  const active = sorted.filter((t) => !t.done);
  const minElo = active.length > 0 ? Math.min(...active.map((t) => t.elo)) : 1200;
  const maxElo = active.length > 0 ? Math.max(...active.map((t) => t.elo)) : 1200;
  const range = maxElo - minElo || 1;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {active.length === 0 ? (
        <Text style={styles.empty}>Complete calibration to see your ranking.</Text>
      ) : (
        active.map((task, i) => {
          const rank = i + 1;
          const pct = ((task.elo - minElo) / range) * 100;
          const rankCls =
            rank === 1 ? styles.rank1 : rank === 2 ? styles.rank2 : rank === 3 ? styles.rank3 : null;
          return (
            <View key={task.id} style={styles.rankRow}>
              <Text style={[styles.rankNum, rankCls]}>
                {task.essential ? '⭐' : rank}
              </Text>
              <Text style={styles.emoji}>{task.emoji}</Text>
              <View style={styles.rankCenter}>
                <Text style={styles.taskName}>{task.name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
              <View style={styles.eloBadge}>
                <Text style={styles.eloText}>{task.elo}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 100 },
  empty: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t3,
    marginTop: 24,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.s1,
    borderWidth: 1.5,
    borderColor: Colors.b1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rankNum: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 15,
    width: 26,
    textAlign: 'center',
    color: Colors.t3,
  },
  rank1: { color: Colors.gold },
  rank2: { color: Colors.violet },
  rank3: { color: Colors.cyan },
  emoji: { fontSize: 24 },
  rankCenter: { flex: 1, minWidth: 0 },
  taskName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.t1,
    marginBottom: 4,
  },
  barTrack: {
    height: 4,
    backgroundColor: Colors.s3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.violet,
    borderRadius: 4,
  },
  eloBadge: {
    backgroundColor: 'rgba(167,139,250,0.1)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)',
  },
  eloText: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    color: Colors.violet,
  },
});
