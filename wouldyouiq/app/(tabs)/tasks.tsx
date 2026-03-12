import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useTaskStore } from '@/stores/taskStore';
import type { Task } from '@/types/models';
import { Colors, Fonts } from '@/constants/tokens';
import { FilterBar, type FilterMode } from '@/components/tasks/FilterBar';
import { TaskRow } from '@/components/tasks/TaskRow';
import { AddTaskSheet } from '@/components/tasks/AddTaskSheet';

export default function TasksScreen() {
  const { tasks, getSortedTasks, addTask, updateTask, deleteTask, toggleEssential } =
    useTaskStore();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const sorted = useMemo(() => getSortedTasks(false), [tasks, getSortedTasks]);
  const filtered = useMemo(() => {
    if (filter === 'all') return sorted;
    if (filter === 'essential') return sorted.filter((t) => t.essential);
    if (filter === 'deadline')
      return sorted.filter((t) => t.deadline === 'today' || t.deadline === 'this week');
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Tasks</Text>
      </View>
      <FilterBar active={filter} onSelect={setFilter} />
      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const rank = sorted.findIndex((x) => x.id === item.id) + 1;
          return (
            <TaskRow
              task={item}
              rank={rank}
              onToggleEssential={() => toggleEssential(item.id)}
              onEdit={() => handleEdit(item)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tasks yet. Tap + to add.</Text>
          </View>
        }
      />
      <Pressable style={styles.fab} onPress={handleAddPress}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.t1,
  },
  list: {
    paddingHorizontal: 20,
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
  fabText: {
    fontSize: 28,
    color: Colors.bg,
    fontWeight: '600',
  },
});
