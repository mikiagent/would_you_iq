import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';

export default function CalibrateScreen() {
  const { tasks, calibration, pickNextTask, addComparison, markEssential } = useAppStore();
  const current = tasks.find((t) => t.id === calibration.currentTaskId) ?? tasks[0];

  useEffect(() => {
    if (!calibration.currentTaskId && tasks.length) {
      pickNextTask();
    }
  }, [calibration.currentTaskId, pickNextTask, tasks.length]);

  const handleYes = () => {
    addComparison();
    pickNextTask();
  };

  const handleEssential = () => {
    if (current) {
      markEssential(current.id);
      pickNextTask();
    }
  };

  if (!current) {
    return (
      <View style={styles.root}>
        <Text style={styles.emptyTitle}>All calibrated ✨</Text>
        <Text style={styles.emptySub}>Add more tasks from the Tasks tab.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.logo}>WouldYouIQ</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.emoji}>{current.e}</Text>
        <Text style={styles.name}>{current.n}</Text>
        <Text style={styles.meta}>{current.t}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.noBtn} onPress={pickNextTask}>
            <Text style={styles.noLabel}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.yesBtn} onPress={handleYes}>
            <Text style={styles.yesLabel}>Yes</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.essBtn} onPress={handleEssential}>
          <Text style={styles.essLabel}>⭐ Mark Essential</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    marginBottom: 16,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.violet,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.b2,
    backgroundColor: Colors.s1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 18,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
    marginBottom: 6,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.t2,
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  yesBtn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    backgroundColor: Colors.green,
    alignItems: 'center',
  },
  yesLabel: {
    fontFamily: Fonts.bodyBold,
    color: '#042b1e',
  },
  noBtn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
    alignItems: 'center',
  },
  noLabel: {
    fontFamily: Fonts.bodyBold,
    color: Colors.t2,
  },
  essBtn: {
    marginTop: 8,
    paddingVertical: 10,
  },
  essLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.gold,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
    textAlign: 'center',
    marginTop: 80,
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.t2,
    textAlign: 'center',
    marginTop: 8,
  },
});

