import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { Surface } from '@/components/ui/Surface';
import { Badge } from '@/components/ui/Badge';
import { EssentialStar } from '@/components/ui/EssentialStar';

type TaskRowProps = {
  task: Task;
  rank: number;
  onToggleEssential: () => void;
  onEdit: () => void;
};

export function TaskRow({
  task,
  rank,
  onToggleEssential,
  onEdit,
}: TaskRowProps) {
  const isEssential = task.essential;
  const isDone = task.done;

  const rankDisplay =
    isEssential ? '⭐' : rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <Surface
      style={[
        styles.row,
        isEssential && styles.rowEssential,
        isDone && styles.rowDone,
      ]}
    >
      <View style={styles.left}>
        <Text style={styles.rank}>{rankDisplay}</Text>
        <Text style={styles.emoji}>{task.emoji}</Text>
        <View style={styles.textBlock}>
          <Text style={[styles.name, isDone && styles.nameDone]} numberOfLines={1}>
            {task.name}
          </Text>
          <View style={styles.meta}>
            <Badge label={`${task.elo} ELO`} variant="default" />
            {task.deadline && (
              <Badge
                label={task.deadline === 'today' ? 'Today' : 'This week'}
                variant="cyan"
              />
            )}
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <EssentialStar essential={isEssential} onToggle={onToggleEssential} size={26} />
        <Pressable onPress={onEdit} hitSlop={8} style={styles.editBtn}>
          <Text style={styles.editText}>✏️</Text>
        </Pressable>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 8,
  },
  rowEssential: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
    backgroundColor: Colors.s2 + 'cc',
  },
  rowDone: {
    opacity: 0.75,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rank: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.t2,
    width: 36,
    textAlign: 'center',
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.t1,
  },
  nameDone: {
    textDecorationLine: 'line-through',
    color: Colors.t3,
  },
  meta: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    padding: 4,
  },
  editText: {
    fontSize: 18,
  },
});
