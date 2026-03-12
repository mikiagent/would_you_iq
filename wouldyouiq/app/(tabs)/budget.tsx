import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';
import { budgetTotals } from '@/domain/logic';
import { useAppStore } from '@/domain/store';

export default function BudgetScreen() {
  const { budget } = useAppStore();
  const { total, leftover } = budgetTotals(budget);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Budget 💰</Text>
      <View style={styles.card}>
        <Text style={styles.incomeLabel}>Monthly Income</Text>
        <Text style={styles.incomeValue}>${budget.income.toLocaleString()}</Text>
      </View>
      <View style={[styles.card, leftover >= 0 ? styles.leftPos : styles.leftNeg]}>
        <Text style={styles.leftLabel}>{leftover >= 0 ? 'Leftover / Save' : 'Over Budget'}</Text>
        <Text style={styles.leftValue}>
          {leftover >= 0 ? '$' : '-$'}
          {Math.abs(leftover).toLocaleString()}
        </Text>
      </View>
      <Text style={styles.section}>All Expenses</Text>
      {budget.items.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.rowEmoji}>{item.e}</Text>
          <View style={styles.rowInfo}>
            <Text style={styles.rowName}>{item.n}</Text>
            <Text style={styles.rowMeta}>${item.amt}/mo</Text>
          </View>
          <Text style={styles.rowAmt}>ELO {item.elo}</Text>
        </View>
      ))}
      <Text style={styles.total}>Total: ${total.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingTop: 64,
    paddingHorizontal: 18,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    marginBottom: 14,
    color: Colors.t1,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: Colors.s1,
    borderWidth: 1,
    borderColor: Colors.b2,
    marginBottom: 14,
  },
  incomeLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.t3,
    marginBottom: 4,
  },
  incomeValue: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.t1,
  },
  leftLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.t2,
    marginBottom: 4,
  },
  leftValue: {
    fontFamily: Fonts.display,
    fontSize: 22,
  },
  leftPos: {
    borderColor: Colors.green,
  },
  leftNeg: {
    borderColor: Colors.red,
  },
  section: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t3,
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.b1,
  },
  rowEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t1,
  },
  rowMeta: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.t2,
  },
  rowAmt: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.violet,
  },
  total: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t2,
    marginTop: 10,
  },
});

