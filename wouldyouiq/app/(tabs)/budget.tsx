import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useBudgetStore } from '@/stores/budgetStore';
import type { BudgetItem } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { BudgetPieChart } from '@/components/budget/BudgetPieChart';
import { LeftoverCard } from '@/components/budget/LeftoverCard';
import { BudgetItemRow } from '@/components/budget/BudgetItemRow';
import { AddExpenseSheet } from '@/components/budget/AddExpenseSheet';
import { BottomSheet } from '@/components/ui';

type BudgetSubTab = 'overview' | 'insights';

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 44);
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

  const [subTab, setSubTab] = useState<BudgetSubTab>('overview');
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
      <View style={[styles.header, { paddingTop }]}>
        <Text style={styles.title}>Budget 💰</Text>
      </View>
      <View style={styles.subTabs}>
        <Pressable
          style={[styles.stBtn, subTab === 'overview' && styles.stBtnOn]}
          onPress={() => setSubTab('overview')}
        >
          <Text style={[styles.stBtnText, subTab === 'overview' && styles.stBtnTextOn]}>
            📊 Overview
          </Text>
        </Pressable>
        <Pressable
          style={[styles.stBtn, subTab === 'insights' && styles.stBtnOn]}
          onPress={() => setSubTab('insights')}
        >
          <Text style={[styles.stBtnText, subTab === 'insights' && styles.stBtnTextOn]}>
            💡 Insights
          </Text>
        </Pressable>
      </View>
      {subTab === 'overview' ? (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.incomeRow}>
          <Text style={styles.incomeLabel}>MONTHLY INCOME</Text>
          <View style={styles.incomeValueRow}>
            <Text style={styles.incomeText}>
              ${(income || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </Text>
            <Pressable onPress={openIncomeEdit}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
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
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.insightsContent} showsVerticalScrollIndicator={false}>
          <View style={styles.insightHero}>
            <Text style={styles.insightHeroText}>Priority alignment</Text>
            <Text style={styles.insightHeroValue}>{alignment}%</Text>
          </View>
          {income > 0 && (
            <Text style={styles.insightBody}>
              {alignment >= 70
                ? 'Your spending aligns well with your task priorities.'
                : 'Consider aligning your flexible spending with your top priorities.'}
            </Text>
          )}
        </ScrollView>
      )}
      <Pressable
        style={styles.fabWrap}
        onPress={() => {
          setEditingItem(null);
          setExpenseSheetVisible(true);
        }}
      >
        <LinearGradient
          colors={[Colors.v2, Colors.violet]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Text style={styles.fabText}>＋</Text>
        </LinearGradient>
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
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  title: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 22,
    color: Colors.t1,
  },
  subTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.s2,
    borderRadius: 16,
    padding: 3,
    gap: 2,
    marginHorizontal: 18,
    marginBottom: 14,
  },
  stBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  stBtnOn: {
    backgroundColor: Colors.s1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 2,
  },
  stBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t3,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  stBtnTextOn: { color: Colors.t1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 100 },
  insightsContent: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 100 },
  incomeRow: {
    marginBottom: 14,
  },
  incomeLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 2,
    color: Colors.t3,
    marginBottom: 4,
  },
  incomeValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  incomeText: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 28,
    color: Colors.t1,
  },
  editLink: {
    fontSize: 11,
    color: Colors.violet,
    fontFamily: Fonts.bodyBold,
    opacity: 0.75,
  },
  insightHero: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  insightHeroText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.t1,
  },
  insightHeroValue: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 24,
    color: Colors.violet,
  },
  insightBody: {
    fontFamily: Fonts.bodyLight,
    fontSize: 13,
    color: Colors.t2,
    lineHeight: 22,
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
  fabWrap: {
    position: 'absolute',
    bottom: 64 + 16,
    right: 18,
    zIndex: 50,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 8,
  },
  fabText: { fontSize: 22, color: '#fff', fontFamily: Fonts.bodyBold },
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
