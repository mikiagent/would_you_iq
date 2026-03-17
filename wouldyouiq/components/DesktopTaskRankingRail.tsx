import { StyleSheet, Text, View } from 'react-native';

import { ExpandableTaskText } from '@/components/ExpandableTaskText';
import { Badge, Surface } from '@/components/primitives';
import { Colors, Fonts } from '@/constants/tokens';
import { getTaskEloTone } from '@/domain/logic';
import type { Task } from '@/domain/models';

export function DesktopTaskRankingRail({
  tasks,
  title = 'Task rankings',
}: {
  tasks: Task[];
  title?: string;
}) {
  const rankedTasks = tasks.filter((task) => !task.done).sort((left, right) => {
    if (left.ess && !right.ess) return -1;
    if (!left.ess && right.ess) return 1;
    return right.elo - left.elo;
  });

  return (
    <Surface style={styles.rail}>
      <Text style={styles.eyebrow}>Desktop sidebar</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>
        Live task order with emoji-first scanning and color-coded ELO signals.
      </Text>

      <View style={styles.list}>
        {rankedTasks.length ? (
          rankedTasks.slice(0, 8).map((task, index) => {
            const tone = getTaskEloTone(task);

            return (
              <View
                key={task.id}
                style={[
                  styles.row,
                  task.ess && styles.rowEssential,
                  tone === 'gold' && styles.rowGold,
                  tone === 'violet' && styles.rowViolet,
                  tone === 'green' && styles.rowGreen,
                  tone === 'danger' && styles.rowDanger,
                ]}
              >
                {task.ess ? <Text style={styles.essentialStar}>★</Text> : null}
                <Text
                  style={[
                    styles.rank,
                    tone === 'gold' && styles.rankGold,
                    tone === 'violet' && styles.rankViolet,
                    tone === 'green' && styles.rankGreen,
                    tone === 'danger' && styles.rankDanger,
                  ]}
                >
                  {index + 1}
                </Text>
                <Text style={styles.emoji}>{task.e}</Text>
                <View style={styles.meta}>
                  <ExpandableTaskText value={task.n} style={styles.name} />
                  <Text style={styles.time}>{task.t}</Text>
                </View>
                <Badge label={`ELO ${task.elo}`} tone={tone} />
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>No active tasks in the ladder right now.</Text>
        )}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 320,
    padding: 18,
    gap: 12,
    alignSelf: 'flex-start',
  },
  eyebrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.t1,
  },
  sub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.t2,
  },
  list: {
    gap: 10,
    marginTop: 4,
  },
  empty: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.t2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'relative',
  },
  rowEssential: {
    borderColor: 'rgba(245,200,66,0.34)',
    backgroundColor: 'rgba(245,200,66,0.08)',
  },
  rowGold: {
    borderColor: 'rgba(245,200,66,0.32)',
  },
  rowViolet: {
    borderColor: 'rgba(167,139,250,0.28)',
  },
  rowGreen: {
    borderColor: 'rgba(52,211,153,0.28)',
  },
  rowDanger: {
    borderColor: 'rgba(248,113,113,0.28)',
  },
  essentialStar: {
    position: 'absolute',
    top: 8,
    right: 10,
    fontSize: 14,
    color: Colors.gold,
  },
  rank: {
    width: 18,
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t3,
    textAlign: 'center',
  },
  rankGold: {
    color: Colors.gold,
  },
  rankViolet: {
    color: Colors.v2,
  },
  rankGreen: {
    color: Colors.green,
  },
  rankDanger: {
    color: Colors.red,
  },
  emoji: {
    fontSize: 24,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t1,
  },
  time: {
    marginTop: 2,
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.t2,
  },
});
