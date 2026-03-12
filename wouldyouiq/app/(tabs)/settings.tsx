import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';

export default function SettingsScreen() {
  const { user } = useAppStore();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>⚡</Text>
          <Text style={styles.statValue}>{user.xp}</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>{user.streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🧩</Text>
          <Text style={styles.statValue}>{user.comparisons}</Text>
          <Text style={styles.statLabel}>Comparisons</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>✅</Text>
          <Text style={styles.statValue}>{user.done}</Text>
          <Text style={styles.statLabel}>Tasks Done</Text>
        </View>
      </View>
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>Free Plan</Text>
        <Text style={styles.planText}>Pro with Supabase + Stripe coming soon.</Text>
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
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.s1,
    borderWidth: 1,
    borderColor: Colors.b1,
    alignItems: 'flex-start',
    gap: 4,
  },
  statEmoji: {
    fontSize: 22,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.t1,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.t3,
  },
  planCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  planTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.gold,
    marginBottom: 4,
  },
  planText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.t2,
  },
});

