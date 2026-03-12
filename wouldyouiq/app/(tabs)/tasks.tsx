import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';
import { filterTasks } from '@/domain/logic';
import { useAppStore } from '@/domain/store';

type FilterKey = 'all' | 'ess' | 'due' | 'done';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ess', label: '⭐ Essential' },
  { key: 'due', label: '📅 Due Soon' },
  { key: 'done', label: '✅ Done' },
];

export default function TasksScreen() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const tasks = useAppStore((s) => s.tasks);

  const list = filterTasks(tasks, filter);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks 📋</Text>
      </View>
      <View style={styles.subTabs}>
        <View style={[styles.subTabButton, styles.subTabOn]}>
          <Text style={styles.subTabText}>📋 List</Text>
        </View>
        <View style={styles.subTabButton}>
          <Text style={[styles.subTabText, { color: Colors.t3 }]}>🎯 Insights</Text>
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const on = f.key === filter;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, on && styles.filterChipOn]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.9}
              >
                <Text style={[styles.filterLabel, on && styles.filterLabelOn]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {list.map((t) => (
          <View key={t.id} style={[styles.taskCard, t.ess && styles.taskCardEss]}>
            <Text style={styles.taskEmoji}>{t.e}</Text>
            <View style={styles.taskInfo}>
              <Text numberOfLines={1} style={styles.taskName}>
                {t.n}
              </Text>
              <View style={styles.taskMetaRow}>
                <Text style={styles.eloBadge}>ELO {t.elo}</Text>
                {t.dl && <Text style={styles.dlBadge}>📅 {t.dl}</Text>}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 18,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
    marginBottom: 10,
  },
  subTabs: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 3,
    borderRadius: 16,
    backgroundColor: Colors.s2,
  },
  subTabButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  subTabOn: {
    backgroundColor: Colors.s1,
  },
  subTabText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.b2,
    backgroundColor: 'transparent',
  },
  filterChipOn: {
    backgroundColor: Colors.violet,
    borderColor: Colors.violet,
  },
  filterLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.t3,
  },
  filterLabelOn: {
    color: '#fff',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    marginBottom: 9,
    borderRadius: 18,
    backgroundColor: Colors.s1,
    borderWidth: 1.5,
    borderColor: Colors.b1,
  },
  taskCardEss: {
    borderColor: Colors.gold,
  },
  taskEmoji: {
    fontSize: 26,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
    minWidth: 0,
  },
  taskName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.t1,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  eloBadge: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    color: Colors.violet,
  },
  dlBadge: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    color: Colors.gold,
  },
});

