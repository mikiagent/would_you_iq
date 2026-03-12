import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useBudgetStore } from '@/stores/budgetStore';
import type { BudgetItem } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { BudgetPieChart } from '@/components/budget/BudgetPieChart';
import { LeftoverCard } from '@/components/budget/LeftoverCard';
import { BudgetItemRow } from '@/components/budget/BudgetItemRow';
import { AddExpenseSheet } from '@/components/budget/AddExpenseSheet';
import { BottomSheet } from '@/components/ui';

export default function BudgetScreen() {
  const {
    income,
    items,
    setIncome,
    getTotalSpend,
    getLeftover,
    getAlignmentScore,
    toggleEssential,
    updateItem,
    deleteItem,
    addItem,
  } = useBudgetStore();

  const [incomeSheetVisible, setIncomeSheetVisible] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [expenseSheetVisible, setExpenseSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  const totalSpend = getTotalSpend();
  const leftover = getLeftover();
  const alignment = getAlignmentScore();

  const essentialTotal = useMemo(
    () =>
      items
        .filter((i) => i.type === 'essential' || i.essential)
        .reduce((s, i) => s + i.amountMonthly, 0),
    [items]
  );
  const flexTotal = useMemo(
    () =>
      items
        .filter((i) => i.type === 'flex' && !i.essential)
        .reduce((s, i) => s + i.amountMonthly, 0),
    [items]
  );
  const saved = Math.max(0, income - totalSpend);

  const essentials = items.filter((i) => i.type === 'essential' || i.essential);
  const flexItems = items.filter((i) => i.type === 'flex' || (!i.essential && i.type !== 'essential'));

  const isFlagged = (item: BudgetItem) =>
    !item.essential && income > 0 && item.amountMonthly / income > 0.05;

  const openIncomeEdit = () => {
    setIncomeInput(String(income || ''));
    setIncomeSheetVisible(true);
  };

  const saveIncome = () => {
    const n = parseFloat(incomeInput.replace(/[^0-9.]/g, ''));
    if (!isNaN(n) && n >= 0) setIncome(n);
    setIncomeSheetVisible(false);
  };

  const handleSaveExpense = (data: Omit<BudgetItem, 'id'>) => {
    if (editingItem) {
      updateItem(editingItem.id, data);
      setEditingItem(null);
    } else {
      addItem(data);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Budget</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.incomeRow}>
          <Text style={styles.incomeLabel}>Monthly income</Text>
          <Pressable onPress={openIncomeEdit} style={styles.incomeValue}>
            <Text style={styles.incomeText}>
              ${(income || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
        </View>
        <LeftoverCard amount={leftover} />
        <View style={styles.chartRow}>
          <BudgetPieChart
            essentialTotal={essentialTotal}
            flexTotal={flexTotal}
            saved={saved}
            income={income}
          />
          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: Colors.violet }]} />
              <Text style={styles.legendText}>Essentials</Text>
              <Text style={styles.legendAmount}>
                ${essentialTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: Colors.gold }]} />
              <Text style={styles.legendText}>Flexible</Text>
              <Text style={styles.legendAmount}>
                ${flexTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: Colors.green }]} />
              <Text style={styles.legendText}>Saved</Text>
              <Text style={styles.legendAmount}>
                ${saved.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>
        {income > 0 && (
          <View style={styles.alignmentBar}>
            <Text style={styles.alignmentLabel}>Priority alignment</Text>
            <View style={styles.alignmentTrack}>
              <View
                style={[
                  styles.alignmentFill,
                  { width: `${alignment}%` },
                ]}
              />
            </View>
            <Text style={styles.alignmentPct}>{alignment}%</Text>
          </View>
        )}
        <Text style={styles.sectionTitle}>🏠 Essentials</Text>
        {essentials.map((item) => (
          <BudgetItemRow
            key={item.id}
            item={item}
            pctOfIncome={income > 0 ? Math.round((item.amountMonthly / income) * 100) : 0}
            isFlagged={false}
            onToggleEssential={() => toggleEssential(item.id)}
            onEdit={() => {
              setEditingItem(item);
              setExpenseSheetVisible(true);
            }}
          />
        ))}
        <Text style={styles.sectionTitle}>🎯 Flexible</Text>
        {flexItems.map((item) => (
          <BudgetItemRow
            key={item.id}
            item={item}
            pctOfIncome={income > 0 ? Math.round((item.amountMonthly / income) * 100) : 0}
            isFlagged={isFlagged(item)}
            onToggleEssential={() => toggleEssential(item.id)}
            onEdit={() => {
              setEditingItem(item);
              setExpenseSheetVisible(true);
            }}
          />
        ))}
        {items.length === 0 && (
          <Text style={styles.emptyText}>No expenses yet. Tap + to add.</Text>
        )}
      </ScrollView>
      <Pressable
        style={styles.fab}
        onPress={() => {
          setEditingItem(null);
          setExpenseSheetVisible(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
      <BottomSheet
        visible={incomeSheetVisible}
        onClose={() => setIncomeSheetVisible(false)}
        title="Edit income"
        showHandle
      >
        <Text style={styles.sheetLabel}>Monthly income ($)</Text>
        <TextInput
          style={styles.sheetInput}
          value={incomeInput}
          onChangeText={setIncomeInput}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={Colors.t3}
        />
        <View style={styles.sheetActions}>
          <Pressable
            style={styles.cancelBtn}
            onPress={() => setIncomeSheetVisible(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={saveIncome}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      </BottomSheet>
      <AddExpenseSheet
        visible={expenseSheetVisible}
        onClose={() => {
          setExpenseSheetVisible(false);
          setEditingItem(null);
        }}
        onSave={handleSaveExpense}
        editItem={editingItem}
        onDelete={editingItem ? (id) => deleteItem(id) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.t1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  incomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  incomeLabel: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.t2,
  },
  incomeValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  incomeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.t1,
  },
  editLink: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.violet,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  legend: { flex: 1 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: {
    fontFamily: Fonts.bodyLight,
    fontSize: 13,
    color: Colors.t2,
    flex: 1,
  },
  legendAmount: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.t1,
  },
  alignmentBar: { marginBottom: 24 },
  alignmentLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.t2,
    marginBottom: 6,
  },
  alignmentTrack: {
    height: 8,
    backgroundColor: Colors.s2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  alignmentFill: {
    height: '100%',
    backgroundColor: Colors.violet,
    borderRadius: 4,
  },
  alignmentPct: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.t2,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.t1,
    marginBottom: 10,
  },
  emptyText: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t3,
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { fontSize: 28, color: Colors.bg, fontWeight: '600' },
  sheetLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.t2,
    marginBottom: 8,
  },
  sheetInput: {
    backgroundColor: Colors.s2,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: Colors.t1,
    marginBottom: 20,
  },
  sheetActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.s2,
  },
  cancelText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.t2 },
  saveBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.violet,
  },
  saveText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.bg },
});
