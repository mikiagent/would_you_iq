import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';
import { filterTasks } from '@/domain/logic';
import { useAppStore } from '@/domain/store';

export default function ForYouScreen() {
  const { tasks, completeTaskById } = useAppStore();
  const sorted = filterTasks(tasks, 'all');
  const next = sorted[0];

  if (!next) {
    return (
      <View style={styles.root}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>All done!</Text>
        <Text style={styles.doneSub}>You&apos;ve cleared your active priorities.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.rank}>#{1} Priority</Text>
        <Text style={styles.emoji}>{next.e}</Text>
        <Text style={styles.name}>{next.n}</Text>
        <Text style={styles.meta}>⏱ {next.t}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => completeTaskById(next.id)}
            activeOpacity={0.9}
          >
            <Text style={styles.doneLabel}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.b1,
    backgroundColor: Colors.s1,
    padding: 24,
    alignItems: 'center',
  },
  rank: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t3,
    marginBottom: 10,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
    marginBottom: 4,
    textAlign: 'center',
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
  },
  doneBtn: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: Colors.green,
    alignItems: 'center',
  },
  doneLabel: {
    fontFamily: Fonts.bodyBold,
    color: '#042b1e',
  },
  doneEmoji: {
    fontSize: 72,
  },
  doneTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
    marginTop: 16,
    textAlign: 'center',
  },
  doneSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.t2,
    textAlign: 'center',
    marginTop: 8,
  },
});

