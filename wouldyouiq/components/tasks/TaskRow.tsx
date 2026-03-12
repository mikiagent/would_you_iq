import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { EssentialStar } from '@/components/ui/EssentialStar';

type TaskRowProps = {
  task: Task;
  rank: number;
  onToggleEssential: () => void;
  onEdit: () => void;
  onUndo?: () => void;
};

export function TaskRow({
  task,
  rank,
  onToggleEssential,
  onEdit,
  onUndo,
}: TaskRowProps) {
  const isEssential = task.essential;
  const isDone = task.done;

  const rankNum = isEssential ? 0 : rank;
  const rankStyle = [
    styles.rank,
    rankNum === 1 && styles.rank1,
    rankNum === 2 && styles.rank2,
    rankNum === 3 && styles.rank3,
  ];
  const rankDisplay =
    isEssential ? '⭐' : rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <View
      style={[
        styles.row,
        isEssential && styles.rowEssential,
        isDone && styles.rowDone,
      ]}
    >
      <Text style={rankStyle}>{rankDisplay}</Text>
      <Text style={[styles.emoji, isDone && styles.emojiDone]}>{task.emoji}</Text>
      <View style={styles.textBlock}>
        <Text style={[styles.name, isDone && styles.nameDone]} numberOfLines={1}>
          {task.name}
        </Text>
        <View style={styles.meta}>
          <View style={styles.tiElo}>
            <Text style={styles.tiEloText}>{task.elo} ELO</Text>
          </View>
          {task.deadline && (
            <View style={styles.tiDl}>
              <Text style={styles.tiDlText}>
                {task.deadline === 'today' ? 'Today' : 'This week'}
              </Text>
            </View>
          )}
          {isDone && (
            <Text style={styles.tiDoneTag}>Done</Text>
          )}
        </View>
      </View>
      <View style={styles.actions}>
        {!isDone && (
          <EssentialStar essential={isEssential} onToggle={onToggleEssential} size={22} />
        )}
        {isDone && onUndo && (
          <Pressable onPress={onUndo} hitSlop={8} style={styles.undoBtn}>
            <Text style={styles.undoText}>↩️</Text>
          </Pressable>
        )}
        <Pressable onPress={onEdit} hitSlop={8} style={styles.editBtn}>
          <Text style={styles.editText}>✏️</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.s1,
    borderWidth: 1.5,
    borderColor: Colors.b1,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 9,
    overflow: 'hidden',
  },
  rowEssential: {
    borderColor: 'rgba(245,200,66,0.32)',
    backgroundColor: 'rgba(245,200,66,0.03)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  rowDone: {
    opacity: 0.45,
  },
  rank: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 14,
    width: 26,
    textAlign: 'center',
    color: Colors.t3,
  },
  rank1: { color: Colors.gold },
  rank2: { color: Colors.violet },
  rank3: { color: Colors.cyan },
  emoji: {
    fontSize: 26,
  },
  emojiDone: {
    opacity: 0.32,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.t1,
  },
  nameDone: {
    opacity: 0.32,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  tiElo: {
    backgroundColor: 'rgba(167,139,250,0.1)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)',
  },
  tiEloText: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    color: Colors.violet,
  },
  tiDl: {
    backgroundColor: 'rgba(245,200,66,0.08)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.18)',
  },
  tiDlText: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    color: Colors.gold,
  },
  tiDoneTag: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    color: Colors.green,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  undoBtn: {
    padding: 4,
  },
  undoText: {
    fontSize: 16,
  },
  editBtn: {
    padding: 4,
    opacity: 0.22,
  },
  editText: {
    fontSize: 14,
  },
});
