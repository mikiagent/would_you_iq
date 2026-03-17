import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { DonutChart } from '@/components/DonutChart';
import { DesktopTaskRankingRail } from '@/components/DesktopTaskRankingRail';
import { ActionButton, Badge, Fab, Field, PageHeader, SegmentedControl, Sheet, Surface, ToggleRow } from '@/components/primitives';
import { Layout, isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts } from '@/constants/tokens';
import {
  budgetSegments,
  budgetTotals,
  buildBudgetInsights,
  getBudgetEloTone,
  getBudgetFlaggedItems,
} from '@/domain/logic';
import { useAppStore } from '@/domain/store';
import type { ExpenseDraft } from '@/domain/models';

const EMOJIS = ['🏠', '⚡', '🛒', '💪', '🎵', '🛵', '📺', '☕', '✈️', '💚'];

function blankExpense(): ExpenseDraft {
  return {
    e: '☕',
    n: '',
    amt: 0,
    type: 'flex',
    ess: false,
  };
}

export default function BudgetScreen() {
  const { width } = useWindowDimensions();
  const budget = useAppStore((state) => state.budget);
  const tasks = useAppStore((state) => state.tasks);
  const budgetView = useAppStore((state) => state.budgetView);
  const setBudgetView = useAppStore((state) => state.setBudgetView);
  const saveExpense = useAppStore((state) => state.saveExpense);
  const deleteExpense = useAppStore((state) => state.deleteExpense);
  const toggleBudgetEssential = useAppStore((state) => state.toggleBudgetEssential);
  const setIncome = useAppStore((state) => state.setIncome);
  const actOnBudgetInsight = useAppStore((state) => state.actOnBudgetInsight);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [incomeSheetOpen, setIncomeSheetOpen] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft>(blankExpense());
  const [incomeDraft, setIncomeDraft] = useState(String(budget.income));
  const [insightIndex, setInsightIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);

  const totals = budgetTotals(budget);
  const segments = budgetSegments(budget);
  const insights = buildBudgetInsights(budget);
  const activeInsight = insights[insightIndex] ?? null;
  const flaggedIds = new Set(getBudgetFlaggedItems(budget).map((item) => item.id));

  useEffect(() => {
    if (insightIndex >= insights.length) {
      setInsightIndex(0);
    }
  }, [insightIndex, insights.length]);

  const openCreate = () => {
    setDraft(blankExpense());
    setSheetOpen(true);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.content, desktop && styles.contentDesktop]}>
        <PageHeader
          title="Budget 💰"
          right={
            desktop ? (
              <Pressable style={styles.desktopAddButton} onPress={openCreate}>
                <Text style={styles.desktopAddButtonLabel}>+ Add expense</Text>
              </Pressable>
            ) : undefined
          }
        />
        <SegmentedControl
          items={[
            { label: '📊 Overview', value: 'overview' },
            { label: '💡 Insights', value: 'insights' },
          ]}
          value={budgetView}
          onChange={setBudgetView}
        />
        {budgetView === 'overview' ? (
          <>
            <ScrollView contentContainerStyle={styles.scroll}>
            <Surface style={[styles.heroCard, desktop && styles.heroCardDesktop]}>
              <View style={styles.heroHeader}>
                <View style={styles.heroCopy}>
                  <Text style={styles.sectionLabel}>Monthly Budget</Text>
                  <Text style={styles.heroTitle}>Spending breakdown</Text>
                  <Text style={styles.heroSub}>
                    The donut and category totals are the fastest way to read where this month is going.
                  </Text>
                </View>
                <Badge
                  label={totals.overspend ? 'Over budget' : `${totals.spentPercent}% spent`}
                  tone={totals.overspend ? 'danger' : 'violet'}
                />
              </View>

              <View style={[styles.heroBody, desktop && styles.heroBodyDesktop]}>
                <View style={[styles.chartPanel, desktop && styles.chartPanelDesktop]}>
                  <DonutChart spentPercent={totals.spentPercent} segments={segments} size={desktop ? 240 : 230} />
                </View>

                <View style={[styles.breakdownPanel, desktop && styles.breakdownPanelDesktop]}>
                  <View style={[styles.summaryGrid, desktop && styles.summaryGridDesktop]}>
                    <Surface style={[styles.summaryCard, desktop && styles.summaryCardDesktop]}>
                      <Text style={styles.sectionLabel}>Monthly Income</Text>
                      <View style={styles.incomeRow}>
                        <Text style={styles.incomeValue}>${budget.income.toLocaleString()}</Text>
                        <Pressable onPress={() => {
                          setIncomeDraft(String(budget.income));
                          setIncomeSheetOpen(true);
                        }}>
                          <Text style={styles.link}>Edit ✎</Text>
                        </Pressable>
                      </View>
                    </Surface>

                    <Surface
                      style={[
                        styles.summaryCard,
                        styles.summaryCardDesktop,
                        styles.leftoverCard,
                        totals.overspend ? styles.leftoverNegative : styles.leftoverPositive,
                      ]}
                    >
                      <Text style={styles.leftoverLabel}>{totals.overspend ? 'Over Budget' : 'Leftover / Save'}</Text>
                      <Text style={[styles.leftoverValue, totals.overspend ? styles.leftoverValueNegative : null]}>
                        ${(totals.overspend || totals.leftover).toLocaleString()}
                      </Text>
                      <Text style={styles.leftoverSub}>
                        {totals.overspend ? 'You’re spending beyond your monthly income.' : 'After all monthly expenses.'}
                      </Text>
                    </Surface>
                  </View>

                  <Surface style={styles.legendCard}>
                    <Text style={styles.sectionLabel}>Breakdown</Text>
                    <View style={styles.legend}>
                      {segments.map((segment) => (
                        <View key={segment.key} style={styles.legendRow}>
                          <View style={styles.legendMain}>
                            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                            <Text style={styles.legendLabel}>{segment.label}</Text>
                          </View>
                          <View style={styles.legendAmountWrap}>
                            <Text style={styles.legendAmount}>${segment.amount.toLocaleString()}</Text>
                            <Text style={styles.legendShare}>
                              {Math.round((segment.amount / Math.max(1, budget.income)) * 100)}%
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </Surface>
                </View>
              </View>
            </Surface>

            <Text style={styles.sectionHeader}>All Expenses</Text>
            {budget.items.map((item) => {
              const tone = getBudgetEloTone(item);
              return (
                <Surface
                  key={item.id}
                  style={[
                    styles.itemCard,
                    item.ess && styles.essentialItem,
                    flaggedIds.has(item.id) && styles.flaggedItem,
                  ]}
                >
                  <View style={styles.itemRow}>
                    <Text style={styles.itemEmoji}>{item.e}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.n}
                      </Text>
                      <View style={styles.itemMeta}>
                        {item.ess ? <Badge label="⭐ Essential" tone="gold" /> : <Badge label={`ELO ${item.elo}`} tone={tone === 'positive' ? 'green' : tone === 'negative' ? 'danger' : 'violet'} />}
                        {flaggedIds.has(item.id) ? (
                          <Badge
                            label={`⚠ ${Math.round((item.amt / budget.income) * 100)}% of income`}
                            tone="danger"
                          />
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.itemActions}>
                      <View style={styles.itemActionRow}>
                        <Pressable style={styles.iconButton} onPress={() => toggleBudgetEssential(item.id)}>
                          <Text style={[styles.icon, item.ess && styles.iconActive]}>★</Text>
                        </Pressable>
                        <Pressable
                          style={styles.iconButton}
                          onPress={() => {
                            setDraft({
                              id: item.id,
                              e: item.e,
                              n: item.n,
                              amt: item.amt,
                              type: item.type,
                              ess: item.ess,
                            });
                            setSheetOpen(true);
                          }}
                        >
                          <Text style={styles.icon}>✎</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.itemAmount}>${item.amt}</Text>
                    </View>
                  </View>
                </Surface>
              );
            })}
            </ScrollView>
            {!desktop ? <Fab onPress={openCreate} /> : null}
          </>
        ) : null}

        {budgetView === 'insights' ? (
          <View style={[styles.insightsWrap, desktop && styles.insightsWrapDesktop]}>
          <View style={[styles.insightsMain, desktop && styles.insightsMainDesktop]}>
          {activeInsight ? (
            <>
              <View style={styles.dots}>
                {insights.map((insight, index) => (
                  <View key={insight.id} style={[styles.dot, index === insightIndex && styles.dotActive]} />
                ))}
              </View>
              <Surface style={styles.insightCard}>
                <Text style={styles.insightEmoji}>{activeInsight.emoji}</Text>
                <Badge label={activeInsight.badge} tone="violet" />
                <Text style={styles.insightTitle}>{activeInsight.title}</Text>
                <Text style={styles.insightSubtitle}>{activeInsight.subtitle}</Text>
                <Pressable style={styles.whyButton} onPress={() => setDetailOpen((value) => !value)}>
                  <Text style={styles.whyLabel}>{detailOpen ? '▲ Why this matters' : '▼ Why this matters'}</Text>
                </Pressable>
                {detailOpen ? <Text style={styles.insightDetail}>{activeInsight.detail}</Text> : null}
                <View style={styles.insightButtons}>
                  <ActionButton
                    label={activeInsight.cta}
                    tone="success"
                    onPress={() => actOnBudgetInsight(activeInsight)}
                  />
                  <ActionButton
                    label="Skip"
                    onPress={() => {
                      setInsightIndex((value) => (value + 1) % Math.max(1, insights.length));
                      setDetailOpen(false);
                    }}
                  />
                </View>
              </Surface>
            </>
          ) : (
            <Surface style={styles.insightCard}>
              <Text style={styles.insightTitle}>No budget insights yet</Text>
              <Text style={styles.insightDetail}>As you compare items, this tab will surface patterns and tradeoffs.</Text>
            </Surface>
          )}
          </View>
          {!desktop ? (
            <View style={styles.mobileRail}>
              <DesktopTaskRankingRail tasks={tasks} title="Task ELO board" />
            </View>
          ) : null}
          </View>
        ) : null}
      </View>

      <Sheet open={sheetOpen} title={draft.id ? 'Edit Expense' : 'Add Expense'} onClose={() => setSheetOpen(false)}>
        <View style={styles.emojiRow}>
          {EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              style={[styles.emojiChip, draft.e === emoji && styles.emojiChipActive]}
              onPress={() => setDraft((current) => ({ ...current, e: emoji }))}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Name"
          value={draft.n}
          onChangeText={(value) => setDraft((current) => ({ ...current, n: value }))}
          placeholder="Spotify"
        />
        <Field
          label="Monthly Amount"
          value={String(draft.amt || '')}
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, amt: Number(value.replace(/[^0-9]/g, '')) || 0 }))
          }
          keyboardType="number-pad"
        />
        <SegmentedControl
          items={[
            { label: 'Essential', value: 'ess' },
            { label: 'Flexible', value: 'flex' },
          ]}
          value={draft.type}
          onChange={(value) => setDraft((current) => ({ ...current, type: value }))}
        />
        <ToggleRow
          label="Exclude from ranking"
          subtitle="Mark this as essential so it no longer appears in budget comparisons."
          active={draft.ess}
          onPress={() => setDraft((current) => ({ ...current, ess: !current.ess }))}
        />
        <ActionButton
          label="Save Expense"
          tone="primary"
          onPress={() => {
            if (!draft.n.trim()) return;
            saveExpense(draft);
            setSheetOpen(false);
          }}
        />
        {draft.id ? (
          <ActionButton
            label="Delete Expense"
            onPress={() => {
              deleteExpense(draft.id!);
              setSheetOpen(false);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet open={incomeSheetOpen} title="Edit Income" onClose={() => setIncomeSheetOpen(false)}>
        <Field
          label="Monthly Income"
          value={incomeDraft}
          onChangeText={(value) => setIncomeDraft(value.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />
        <ActionButton
          label="Save Income"
          tone="primary"
          onPress={() => {
            setIncome(Number(incomeDraft) || 0);
            setIncomeSheetOpen(false);
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingTop: 8,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 160,
    gap: 14,
  },
  desktopAddButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    backgroundColor: 'rgba(124,106,247,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  desktopAddButtonLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t1,
  },
  heroCard: {
    padding: 18,
    gap: 18,
  },
  heroCardDesktop: {
    padding: 24,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    flexWrap: 'wrap',
  },
  heroCopy: {
    flex: 1,
    minWidth: 220,
  },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.t1,
    marginTop: 2,
  },
  heroSub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.t2,
    marginTop: 6,
    maxWidth: 420,
  },
  heroBody: {
    gap: 16,
  },
  heroBodyDesktop: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 18,
  },
  chartPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  chartPanelDesktop: {
    paddingTop: 4,
  },
  breakdownPanel: {
    flex: 1,
    gap: 14,
  },
  breakdownPanelDesktop: {
    width: '100%',
  },
  summaryGrid: {
    gap: 12,
  },
  summaryGridDesktop: {
    flexDirection: 'row',
  },
  summaryCard: {
    padding: 18,
  },
  summaryCardDesktop: {
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  incomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeValue: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.t1,
    flexShrink: 1,
  },
  link: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.violet,
  },
  leftoverCard: {
    padding: 18,
  },
  leftoverPositive: {
    borderColor: 'rgba(52,211,153,0.28)',
    backgroundColor: 'rgba(52,211,153,0.06)',
  },
  leftoverNegative: {
    borderColor: 'rgba(248,113,113,0.28)',
    backgroundColor: 'rgba(248,113,113,0.06)',
  },
  leftoverLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t2,
  },
  leftoverValue: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.green,
    marginTop: 6,
  },
  leftoverValueNegative: {
    color: Colors.red,
  },
  leftoverSub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t2,
    marginTop: 6,
  },
  legendCard: {
    padding: 18,
  },
  legend: {
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 4,
  },
  legendMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.t1,
    flexShrink: 1,
  },
  legendAmountWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  legendAmount: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.t1,
  },
  legendShare: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.t2,
  },
  sectionHeader: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginTop: 8,
  },
  itemCard: {
    padding: 14,
  },
  essentialItem: {
    borderColor: 'rgba(245,200,66,0.32)',
  },
  flaggedItem: {
    borderColor: 'rgba(248,113,113,0.28)',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemEmoji: {
    fontSize: 26,
  },
  itemName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.t1,
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: 10,
    minWidth: 112,
  },
  itemActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 19,
    color: Colors.t3,
  },
  iconActive: {
    color: Colors.gold,
  },
  itemAmount: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.t1,
  },
  insightsWrap: {
    flex: 1,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 70,
    position: 'relative',
  },
  insightsWrapDesktop: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  insightsMain: {
    width: '100%',
    alignItems: 'center',
  },
  insightsMainDesktop: {
    width: '100%',
    maxWidth: 470,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.s3,
  },
  dotActive: {
    backgroundColor: Colors.violet,
  },
  insightCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
    gap: 14,
    maxWidth: 470,
  },
  mobileRail: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  insightEmoji: {
    fontSize: 58,
  },
  insightTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.t1,
    textAlign: 'center',
  },
  insightSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.t2,
    textAlign: 'center',
    lineHeight: 22,
  },
  whyButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.violet,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  whyLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t2,
  },
  insightDetail: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t2,
    textAlign: 'center',
    lineHeight: 22,
  },
  insightButtons: {
    width: '100%',
    gap: 10,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChipActive: {
    borderColor: Colors.violet,
    backgroundColor: 'rgba(167,139,250,0.12)',
  },
  emoji: {
    fontSize: 22,
  },
});
