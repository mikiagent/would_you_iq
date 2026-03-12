import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { BudgetItem } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { EssentialStar } from '@/components/ui/EssentialStar';
import { Surface } from '@/components/ui/Surface';

type BudgetItemRowProps = {
  item: BudgetItem;
  pctOfIncome: number;
  isFlagged: boolean;
  onToggleEssential: () => void;
  onEdit: () => void;
};

export function BudgetItemRow({
  item,
  pctOfIncome,
  isFlagged,
  onToggleEssential,
  onEdit,
}: BudgetItemRowProps) {
  return (
    <Surface style={[styles.row, isFlagged && styles.rowFlagged]}>
      <View style={styles.left}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          {isFlagged && (
            <Text style={styles.flag}>⚠️ {pctOfIncome}% of income</Text>
          )}
        </View>
      </View>
      <Text style={styles.amount}>
        ${item.amountMonthly.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </Text>
      <View style={styles.actions}>
        <EssentialStar essential={item.essential} onToggle={onToggleEssential} size={24} />
        <Pressable onPress={onEdit} hitSlop={8}>
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
    padding: 14,
    marginBottom: 8,
  },
  rowFlagged: {
    borderWidth: 2,
    borderColor: Colors.red + '80',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 24,
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.t1,
  },
  flag: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.red,
    marginTop: 2,
  },
  amount: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.t1,
    marginRight: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editText: {
    fontSize: 16,
  },
});
