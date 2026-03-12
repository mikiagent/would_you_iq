import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTaskStore } from '@/stores/taskStore';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { FilterBar, type FilterMode } from '@/components/tasks/FilterBar';
import { TaskRow } from '@/components/tasks/TaskRow';
import { TaskInsightsPane } from '@/components/tasks/TaskInsightsPane';
import { AddTaskSheet } from '@/components/tasks/AddTaskSheet';
import { ConfirmModal } from '@/components/ui';

type TaskSubTab = 'list' | 'insights';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 44);
  const {
    tasks,
    getSortedTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleEssential,
    undoDone,
  } = useTaskStore();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [subTab, setSubTab] = useState<TaskSubTab>('list');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [undoConfirmTaskId, setUndoConfirmTaskId] = useState<string | null>(null);

  const sorted = useMemo(() => getSortedTasks(false), [tasks, getSortedTasks]);
  const filtered = useMemo(() => {
    if (filter === 'all') return sorted;
    if (filter === 'essential') return sorted.filter((t) => t.essential);
    if (filter === 'deadline')
      return sorted.filter(
        (t) => t.deadline === 'today' || t.deadline === 'this week'
      );
    if (filter === 'done') return sorted.filter((t) => t.done);
    return sorted;
  }, [sorted, filter]);

  const handleSave = (data: Omit<Task, 'id' | 'elo' | 'done' | 'createdAt'>) => {
    if (editingTask) {
      updateTask(editingTask.id, {
        emoji: data.emoji,
        name: data.name,
        timeEstimate: data.timeEstimate,
        deadline: data.deadline,
        essential: data.essential,
        urgency: data.urgency,
      });
      setEditingTask(null);
    } else {
      addTask(data);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setSheetVisible(true);
  };

  const handleAddPress = () => {
    setEditingTask(null);
    setSheetVisible(true);
  };

  const handleUndoPress = (taskId: string) => {
    setUndoConfirmTaskId(taskId);
  };

  const handleConfirmUndo = () => {
    if (undoConfirmTaskId) {
      undoDone(undoConfirmTaskId);
      setUndoConfirmTaskId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop }]}>
        <Text style={styles.title}>Tasks 📋</Text>
      </View>

      {/* Sub-tabs */}
      <View style={styles.subTabs}>
        <Pressable
          style={[styles.stBtn, subTab === 'list' && styles.stBtnOn]}
          onPress={() => setSubTab('list')}
        >
          <Text style={[styles.stBtnText, subTab === 'list' && styles.stBtnTextOn]}>
            📋 List
          </Text>
        </Pressable>
        <Pressable
          style={[styles.stBtn, subTab === 'insights' && styles.stBtnOn]}
          onPress={() => setSubTab('insights')}
        >
          <Text style={[styles.stBtnText, subTab === 'insights' && styles.stBtnTextOn]}>
            🎯 Insights
          </Text>
        </Pressable>
      </View>

      {subTab === 'list' ? (
        <>
          <View style={styles.listPane}>
            <FilterBar active={filter} onSelect={setFilter} />
            <FlatList
              data={filtered}
              keyExtractor={(t) => t.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const rank = sorted.findIndex((x) => x.id === item.id) + 1;
                return (
                  <TaskRow
                    task={item}
                    rank={rank}
                    onToggleEssential={() => toggleEssential(item.id)}
                    onEdit={() => handleEdit(item)}
                    onUndo={item.done ? () => handleUndoPress(item.id) : undefined}
                  />
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No tasks yet. Tap + to add.</Text>
                </View>
              }
            />
          </View>
          <Pressable style={styles.fabWrap} onPress={handleAddPress}>
            <LinearGradient
              colors={[Colors.v2, Colors.violet]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fab}
            >
              <Text style={styles.fabText}>＋</Text>
            </LinearGradient>
          </Pressable>
        </>
      ) : (
        <TaskInsightsPane />
      )}

      <AddTaskSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
        editTask={editingTask}
        onDelete={editingTask ? () => deleteTask(editingTask.id) : undefined}
      />

      <ConfirmModal
        visible={undoConfirmTaskId !== null}
        onClose={() => setUndoConfirmTaskId(null)}
        title="Undo completion?"
        subtitle="This will move the task back to your active list."
        icon="↩️"
        primaryLabel="Yes, Undo ↩️"
        secondaryLabel="Keep it Done"
        onPrimary={handleConfirmUndo}
        onSecondary={() => setUndoConfirmTaskId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
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
  stBtnTextOn: {
    color: Colors.t1,
  },
  listPane: {
    flex: 1,
    paddingHorizontal: 18,
  },
  list: {
    paddingBottom: 100,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.bodyLight,
    fontSize: 15,
    color: Colors.t3,
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
  fabText: {
    fontSize: 22,
    color: '#fff',
    fontFamily: Fonts.bodyBold,
  },
});
