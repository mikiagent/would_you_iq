import { router } from 'expo-router';
import { startTransition, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActionButton, Badge, Fab, Field, PageHeader, SegmentedControl, Sheet, Surface, ToggleRow } from '@/components/primitives';
import { Colors, Fonts } from '@/constants/tokens';
import { buildTaskInsights, filterTasks, getTaskEloTone, getTaskProgress, medalForIndex } from '@/domain/logic';
import { useAppStore } from '@/domain/store';
import type { Subtask, SubtaskDraft, Task, TaskDraft, TaskFilter } from '@/domain/models';

const FILTERS: Array<{ label: string; value: TaskFilter }> = [
  { label: 'All', value: 'all' },
  { label: '⭐ Essential', value: 'ess' },
  { label: '📅 Due Soon', value: 'due' },
  { label: '✅ Done', value: 'done' },
];

const EMOJIS = ['🏋️', '📚', '💡', '📖', '🧘', '✉️', '🎸', '🌿', '🍳', '🚀'];
const SUBTASK_EMOJIS = ['📌', '📝', '🔥', '✅', '💬', '📦', '🎯', '🧠', '📞', '🛠️'];

function blankDraft(): TaskDraft {
  return {
    e: '💡',
    n: '',
    t: '30 min',
    dl: null,
    ess: false,
    detail: '',
  };
}

export default function TasksScreen() {
  const tasks = useAppStore((state) => state.tasks);
  const taskFilter = useAppStore((state) => state.taskFilter);
  const tasksView = useAppStore((state) => state.tasksView);
  const expandedTaskIds = useAppStore((state) => state.expandedTaskIds);
  const setTasksView = useAppStore((state) => state.setTasksView);
  const setTaskFilter = useAppStore((state) => state.setTaskFilter);
  const toggleTaskExpanded = useAppStore((state) => state.toggleTaskExpanded);
  const toggleTaskEssential = useAppStore((state) => state.toggleTaskEssential);
  const toggleTaskDone = useAppStore((state) => state.toggleTaskDone);
  const saveSubtask = useAppStore((state) => state.saveSubtask);
  const toggleSubtaskDone = useAppStore((state) => state.toggleSubtaskDone);
  const deleteSubtask = useAppStore((state) => state.deleteSubtask);
  const moveSubtask = useAppStore((state) => state.moveSubtask);
  const moveTask = useAppStore((state) => state.moveTask);
  const saveTask = useAppStore((state) => state.saveTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const actOnTaskInsight = useAppStore((state) => state.actOnTaskInsight);
  const startRunner = useAppStore((state) => state.startRunner);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(blankDraft());
  const [subtaskSheetOpen, setSubtaskSheetOpen] = useState(false);
  const [subtaskTaskId, setSubtaskTaskId] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState<SubtaskDraft>({
    e: '📌',
    n: '',
    why: '',
  });
  const [insightIndex, setInsightIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState<{ taskId: string; subtaskId: string } | null>(null);

  const list = useMemo(() => filterTasks(tasks, taskFilter), [taskFilter, tasks]);
  const insights = useMemo(() => buildTaskInsights(tasks), [tasks]);
  const activeInsight = insights[insightIndex] ?? null;

  useEffect(() => {
    if (insightIndex >= insights.length) {
      setInsightIndex(0);
    }
  }, [insightIndex, insights.length]);

  const openCreate = () => {
    setDraft(blankDraft());
    setSheetOpen(true);
  };

  const openEdit = (task: Task) => {
    setDraft({
      id: task.id,
      e: task.e,
      n: task.n,
      t: task.t,
      dl: task.dl,
      ess: task.ess,
      detail: task.detail ?? '',
    });
    setSheetOpen(true);
  };

  const openSubtaskEditor = (taskId: string, subtask?: Subtask) => {
    setSubtaskTaskId(taskId);
    setSubtaskDraft(
      subtask
        ? { id: subtask.id, e: subtask.e, n: subtask.n, why: subtask.why ?? '' }
        : { e: '📌', n: '', why: '' },
    );
    setSubtaskSheetOpen(true);
  };

  return (
    <View style={styles.root}>
      <PageHeader title="Tasks 📋" />
      <SegmentedControl
        items={[
          { label: '📋 List', value: 'list' },
          { label: '🎯 Insights', value: 'insights' },
        ]}
        value={tasksView}
        onChange={setTasksView}
      />

      {tasksView === 'list' ? (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTERS.map((filter) => {
                const active = filter.value === taskFilter;
                return (
                  <Pressable
                    key={filter.value}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setTaskFilter(filter.value)}
                  >
                    <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {list.map((task, index) => {
              const expanded = expandedTaskIds.includes(task.id);
              const progress = getTaskProgress(task);

              return (
                <Surface
                  key={task.id}
                  style={[
                    styles.taskCard,
                    task.ess && styles.taskCardEssential,
                    selectedTaskId === task.id && styles.selectedGlow,
                  ]}
                >
                  <Pressable
                    style={styles.taskRow}
                    delayLongPress={180}
                    onLongPress={() => {
                      setSelectedSubtask(null);
                      setSelectedTaskId((current) => (current === task.id ? null : task.id));
                    }}
                    onPress={() => {
                      if (selectedTaskId && selectedTaskId !== task.id) {
                        moveTask(selectedTaskId, task.id);
                        setSelectedTaskId(null);
                        return;
                      }

                      if (selectedTaskId === task.id) {
                        setSelectedTaskId(null);
                        return;
                      }

                      toggleTaskExpanded(task.id);
                    }}
                  >
                    <Text style={[styles.rank, index < 3 && styles.rankTop]}>{medalForIndex(index)}</Text>
                    <Text style={styles.taskEmoji}>{task.e}</Text>
                    <View style={styles.taskMain}>
                      <Text style={styles.taskName}>{task.n}</Text>
                      <View style={styles.taskMeta}>
                        <Badge label={`ELO ${task.elo}`} tone={getTaskEloTone(task)} />
                        {task.dl ? <Badge label={task.dl === 'today' ? '📅 today' : '📅 this week'} tone="gold" /> : null}
                        {task.subtasks.length ? (
                          <Badge label={`${progress.complete}/${progress.total} steps`} />
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.taskActions}>
                      <Pressable
                        style={styles.actionButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          toggleTaskEssential(task.id);
                        }}
                      >
                        <Text style={[styles.actionIcon, task.ess && styles.actionIconActive]}>★</Text>
                      </Pressable>
                      <Pressable
                        style={styles.actionButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          openEdit(task);
                        }}
                      >
                        <Text style={styles.actionIcon}>✎</Text>
                      </Pressable>
                      <Pressable
                        style={styles.chevronButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          toggleTaskExpanded(task.id);
                        }}
                      >
                        <Text style={[styles.chevron, !expanded && styles.chevronCollapsed]}>▼</Text>
                      </Pressable>
                    </View>
                  </Pressable>

                  {expanded ? (
                    <View style={styles.taskDrawer}>
                      <View style={styles.drawerHeader}>
                        <Text style={styles.drawerLabel}>STEPS — {progress.complete}/{progress.total} DONE</Text>
                        <Pressable onPress={() => openSubtaskEditor(task.id)}>
                          <Text style={styles.addStep}>+ Add step</Text>
                        </Pressable>
                      </View>

                      {[...task.subtasks]
                        .sort((left, right) => left.order - right.order)
                        .map((subtask, subtaskIndex) => (
                        <Pressable
                          key={subtask.id}
                          style={[
                            styles.subtaskRow,
                            selectedSubtask?.taskId === task.id &&
                            selectedSubtask?.subtaskId === subtask.id &&
                            styles.selectedGlow,
                          ]}
                          delayLongPress={180}
                          onLongPress={() => {
                            setSelectedTaskId(null);
                            setSelectedSubtask((current) =>
                              current?.taskId === task.id && current.subtaskId === subtask.id
                                ? null
                                : { taskId: task.id, subtaskId: subtask.id },
                            );
                          }}
                          onPress={() => {
                            if (
                              selectedSubtask &&
                              selectedSubtask.taskId === task.id &&
                              selectedSubtask.subtaskId !== subtask.id
                            ) {
                              moveSubtask(task.id, selectedSubtask.subtaskId, subtask.id);
                              setSelectedSubtask(null);
                              return;
                            }

                            if (
                              selectedSubtask?.taskId === task.id &&
                              selectedSubtask.subtaskId === subtask.id
                            ) {
                              setSelectedSubtask(null);
                              return;
                            }

                            openSubtaskEditor(task.id, subtask);
                          }}
                        >
                          <Text style={styles.subtaskIndex}>{subtaskIndex + 1}</Text>
                          <Pressable
                            style={[styles.checkbox, subtask.done && styles.checkboxOn]}
                            onPress={(event) => {
                              event.stopPropagation();
                              toggleSubtaskDone(task.id, subtask.id);
                            }}
                          />
                          <Text style={styles.subtaskEmoji}>{subtask.e}</Text>
                          <View style={styles.subtaskContent}>
                            <Text style={[styles.subtaskName, subtask.done && styles.subtaskInputDone]}>
                              {subtask.n}
                            </Text>
                            {subtask.why ? (
                              <Text style={styles.subtaskWhy} numberOfLines={1}>
                                {subtask.why}
                              </Text>
                            ) : null}
                          </View>
                          <Pressable
                            style={styles.subtaskDeleteButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              Alert.alert(
                                'Delete subtask?',
                                'Are you sure you want to delete this subtask?',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => deleteSubtask(task.id, subtask.id),
                                  },
                                ],
                              );
                            }}
                          >
                            <Text style={styles.subtaskDelete}>×</Text>
                          </Pressable>
                        </Pressable>
                      ))}

                      <View style={styles.drawerButtons}>
                        {task.subtasks.length ? (
                          <ActionButton
                            label="▶ Start Task"
                            tone="primary"
                            onPress={() => {
                              startTransition(() => {
                                startRunner(task.id);
                                router.push({ pathname: '/runner', params: { taskId: task.id } });
                              });
                            }}
                          />
                        ) : null}
                        <ActionButton
                          label={task.done ? 'Undo Done' : 'Mark Done'}
                          tone="success"
                          onPress={() => {
                            startTransition(() => {
                              toggleTaskDone(task.id);
                            });
                          }}
                        />
                      </View>
                    </View>
                  ) : null}
                </Surface>
              );
            })}
          </ScrollView>
          {!sheetOpen && expandedTaskIds.length === 0 ? <Fab onPress={openCreate} /> : null}
        </>
      ) : null}

      {tasksView === 'insights' ? (
        <View style={styles.insightsWrap}>
          {activeInsight ? (
            <>
              <View style={styles.dots}>
                {insights.map((insight, index) => (
                  <View
                    key={insight.id}
                    style={[styles.dot, index === insightIndex && styles.dotActive]}
                  />
                ))}
              </View>
              <Surface style={styles.insightCard}>
                <Text style={styles.insightEmoji}>{activeInsight.emoji}</Text>
                <Badge label={activeInsight.badge} tone="violet" />
                <Text style={styles.insightTitle}>{activeInsight.title}</Text>
                <Text style={styles.insightSubtitle}>{activeInsight.subtitle}</Text>
                <Pressable
                  style={styles.whyButton}
                  onPress={() => setDetailOpen((value) => !value)}
                >
                  <Text style={styles.whyLabel}>{detailOpen ? '▲ Why this matters' : '▼ Why this matters'}</Text>
                </Pressable>
                {detailOpen ? <Text style={styles.insightDetail}>{activeInsight.detail}</Text> : null}
                <View style={styles.insightButtons}>
                  <ActionButton
                    label={activeInsight.action === 'none' ? 'Nice' : activeInsight.cta}
                    tone="success"
                    onPress={() => actOnTaskInsight(activeInsight)}
                  />
                  <ActionButton
                    label="Skip"
                    onPress={() => {
                      setInsightIndex((value) => (value + 1) % Math.max(insights.length, 1));
                      setDetailOpen(false);
                    }}
                  />
                </View>
              </Surface>
            </>
          ) : (
            <Surface style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No insights yet</Text>
              <Text style={styles.emptySub}>Complete a few comparisons and we’ll surface patterns here.</Text>
            </Surface>
          )}
        </View>
      ) : null}

      <Sheet
        open={sheetOpen}
        title={draft.id ? 'Edit Task' : 'Add Task'}
        onClose={() => setSheetOpen(false)}
      >
        <View style={styles.emojiRow}>
          {EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              style={[styles.emojiChip, draft.e === emoji && styles.emojiChipActive]}
              onPress={() => setDraft((current) => ({ ...current, e: emoji }))}
            >
              <Text style={styles.emojiChoice}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Task Name"
          value={draft.n}
          onChangeText={(value) => setDraft((current) => ({ ...current, n: value }))}
          placeholder="What matters next?"
        />
        <Field
          label="Time Estimate"
          value={draft.t}
          onChangeText={(value) => setDraft((current) => ({ ...current, t: value }))}
          placeholder="30 min"
        />
        <Field
          label="Details"
          value={draft.detail ?? ''}
          onChangeText={(value) => setDraft((current) => ({ ...current, detail: value }))}
          placeholder="Optional supporting detail"
        />
        <SegmentedControl
          items={[
            { label: 'No Deadline', value: 'none' },
            { label: 'Today', value: 'today' },
            { label: 'This Week', value: 'this week' },
          ]}
          value={draft.dl ?? 'none'}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              dl: value === 'none' ? null : value,
            }))
          }
        />
        <ToggleRow
          label="Essential"
          subtitle="Pin this to the top and remove it from arena comparisons."
          active={draft.ess}
          onPress={() => setDraft((current) => ({ ...current, ess: !current.ess }))}
        />
        <ActionButton
          label="Save Task"
          tone="primary"
          onPress={() => {
            if (!draft.n.trim()) return;
            saveTask(draft);
            setSheetOpen(false);
          }}
        />
        {draft.id ? (
          <ActionButton
            label="Delete Task"
            onPress={() => {
              deleteTask(draft.id!);
              setSheetOpen(false);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet
        open={subtaskSheetOpen}
        title={subtaskDraft.id ? 'Edit Subtask' : 'Add Subtask'}
        onClose={() => setSubtaskSheetOpen(false)}
      >
        <View style={styles.emojiRow}>
          {SUBTASK_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              style={[styles.emojiChip, subtaskDraft.e === emoji && styles.emojiChipActive]}
              onPress={() => setSubtaskDraft((current) => ({ ...current, e: emoji }))}
            >
              <Text style={styles.emojiChoice}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Subtask Name"
          value={subtaskDraft.n}
          onChangeText={(value) => setSubtaskDraft((current) => ({ ...current, n: value }))}
          placeholder="Smallest next move"
        />
        <Field
          label="Details"
          value={subtaskDraft.why ?? ''}
          onChangeText={(value) => setSubtaskDraft((current) => ({ ...current, why: value }))}
          placeholder="Why this step matters"
        />
        <ActionButton
          label="Save Subtask"
          tone="primary"
          onPress={() => {
            if (!subtaskTaskId || !subtaskDraft.n.trim()) return;
            saveSubtask(subtaskTaskId, subtaskDraft);
            setSubtaskSheetOpen(false);
          }}
        />
        {subtaskDraft.id && subtaskTaskId ? (
          <ActionButton
            label="Delete Subtask"
            onPress={() => {
              Alert.alert('Delete subtask?', 'Are you sure you want to delete this subtask?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteSubtask(subtaskTaskId, subtaskDraft.id!);
                    setSubtaskSheetOpen(false);
                  },
                },
              ]);
            }}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 160,
    gap: 10,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 10,
  },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.violet,
    borderColor: Colors.violet,
  },
  filterLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t2,
  },
  filterLabelActive: {
    color: '#fff',
  },
  taskCard: {
    padding: 14,
  },
  taskCardEssential: {
    borderColor: 'rgba(245,200,66,0.35)',
    backgroundColor: 'rgba(245,200,66,0.04)',
  },
  selectedGlow: {
    borderColor: 'rgba(255,255,255,0.82)',
    shadowColor: '#fff',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rank: {
    width: 28,
    textAlign: 'center',
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.t3,
  },
  rankTop: {
    color: Colors.gold,
  },
  taskEmoji: {
    fontSize: 28,
  },
  taskMain: {
    flex: 1,
    minWidth: 0,
  },
  taskName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.t1,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  actionIcon: {
    fontSize: 20,
    color: Colors.t3,
  },
  actionIconActive: {
    color: Colors.gold,
  },
  chevronButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  chevron: {
    color: Colors.t3,
    fontSize: 20,
    lineHeight: 20,
    fontFamily: Fonts.bodyBold,
  },
  chevronCollapsed: {
    transform: [{ rotate: '90deg' }],
  },
  taskDrawer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.b1,
    gap: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: Colors.t3,
  },
  addStep: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.violet,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  subtaskIndex: {
    width: 16,
    color: Colors.t3,
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    textAlign: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s2,
  },
  checkboxOn: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  subtaskEmoji: {
    fontSize: 20,
  },
  subtaskContent: {
    flex: 1,
    minWidth: 0,
  },
  subtaskName: {
    color: Colors.t1,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  subtaskInputDone: {
    textDecorationLine: 'line-through',
    color: Colors.t2,
  },
  subtaskWhy: {
    marginTop: 4,
    color: Colors.t3,
    fontFamily: Fonts.bodyLight,
    fontSize: 11,
  },
  subtaskDelete: {
    color: Colors.red,
    width: 18,
    textAlign: 'center',
    fontSize: 20,
  },
  subtaskDeleteButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.18)',
  },
  drawerButtons: {
    gap: 10,
    marginTop: 4,
  },
  insightsWrap: {
    flex: 1,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 70,
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
  },
  insightEmoji: {
    fontSize: 58,
  },
  insightTitle: {
    fontFamily: Fonts.display,
    fontSize: 26,
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
  emptyCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
  },
  emptySub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t2,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
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
  emojiChoice: {
    fontSize: 24,
  },
});
