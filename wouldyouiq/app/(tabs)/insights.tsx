import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStore } from '@/stores/userStore';
import { useTaskStore } from '@/stores/taskStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { Colors, Fonts } from '@/constants/tokens';
import { ProfileSheet } from '@/components/settings/ProfileSheet';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0] + parts[1]![0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '?';
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 44);
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);
  const { session, loading, signInWithGoogle } = useAuth();
  const { profile } = useUserStore();
  const { getSortedTasks } = useTaskStore();
  const { getAlignmentScore } = useBudgetStore();

  const sorted = useMemo(() => getSortedTasks(false), [getSortedTasks]);
  const active = sorted.filter((t) => !t.done);
  const alignment = getAlignmentScore();
  const initials = getInitials(profile.name || 'Friend');
  const minElo = active.length > 0 ? Math.min(...active.map((t) => t.elo)) : 1200;
  const maxElo = active.length > 0 ? Math.max(...active.map((t) => t.elo)) : 1200;
  const eloRange = maxElo - minElo || 1;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop }]}>
        <Text style={styles.title}>Settings</Text>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.violet} />
        ) : session ? (
          <Pressable
            style={styles.avatar}
            onPress={() => setProfileSheetVisible(true)}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.signInBtn} onPress={signInWithGoogle}>
            <Text style={styles.signInBtnText}>Sign in</Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.planBadgeInline}>
          <Text style={styles.planBadgeText}>🔒 Free Plan</Text>
        </View>

        <Pressable
          style={styles.settingsRow}
          onPress={() => setProfileSheetVisible(true)}
        >
          <View style={styles.srLeft}>
            <Text style={styles.srIco}>👤</Text>
            <View>
              <Text style={styles.srLabel}>Profile & Plan</Text>
              <Text style={styles.srSub}>Free plan · Upgrade to Pro</Text>
            </View>
          </View>
          <Text style={styles.srRight}>→</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>PRIORITY RANKING</Text>
        {active.slice(0, 5).map((task, i) => {
          const rank = i + 1;
          const rankCls =
            rank === 1 ? styles.rank1 : rank === 2 ? styles.rank2 : rank === 3 ? styles.rank3 : null;
          return (
            <View key={task.id} style={[styles.rankRow, rank === 1 && styles.rankRow1, rank === 2 && styles.rankRow2, rank === 3 && styles.rankRow3]}>
              <Text style={[styles.rankNum, rankCls]}>{rank}</Text>
              <Text style={styles.rankEmoji}>{task.emoji}</Text>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{task.name}</Text>
                <View style={styles.rankSub}>
                  <View style={styles.eloBadge}>
                    <Text style={styles.eloBadgeText}>{task.elo} ELO</Text>
                  </View>
                </View>
              </View>
              <View style={styles.rankBarBg}>
                <View
                  style={[
                    styles.rankBar,
                    {
                      width: `${((task.elo - minElo) / eloRange) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
        {active.length === 0 && (
          <Text style={styles.empty}>Complete calibration to see your ranking.</Text>
        )}

        <Text style={styles.sectionLabel}>STATS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{profile.xp}</Text>
            <Text style={styles.statLbl}>Total XP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{profile.streak}</Text>
            <Text style={styles.statLbl}>Day streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{profile.comparisonsTotal}</Text>
            <Text style={styles.statLbl}>Comparisons</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{profile.tasksCompleted}</Text>
            <Text style={styles.statLbl}>Tasks done</Text>
          </View>
        </View>
      </ScrollView>
      <ProfileSheet
        visible={profileSheetVisible}
        onClose={() => setProfileSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 20,
    color: Colors.t1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 15,
    color: '#fff',
  },
  signInBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.violet,
  },
  signInBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 40 },
  planBadgeInline: {
    marginBottom: 16,
  },
  planBadgeText: {
    fontSize: 12,
    color: Colors.t2,
    fontFamily: Fonts.bodyBold,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.s2,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  srLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  srIco: { fontSize: 18, width: 24, textAlign: 'center' },
  srLabel: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.t1 },
  srSub: { fontSize: 11, color: Colors.t3, marginTop: 1 },
  srRight: { fontSize: 12, color: Colors.t3 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: Colors.t3,
    marginTop: 18,
    marginBottom: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.s1,
    borderWidth: 1.5,
    borderColor: Colors.b1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rankRow1: { borderLeftWidth: 3, borderLeftColor: Colors.gold },
  rankRow2: { borderLeftWidth: 3, borderLeftColor: Colors.violet },
  rankRow3: { borderLeftWidth: 3, borderLeftColor: Colors.cyan },
  rankNum: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 15,
    width: 26,
    textAlign: 'center',
    color: Colors.t3,
  },
  rank1: { color: Colors.gold },
  rank2: { color: Colors.violet },
  rank3: { color: Colors.cyan },
  rankEmoji: { fontSize: 24 },
  rankInfo: { flex: 1, minWidth: 0 },
  rankName: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.t1 },
  rankSub: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  eloBadge: {
    backgroundColor: 'rgba(167,139,250,0.1)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)',
  },
  eloBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    color: Colors.violet,
  },
  rankBarBg: {
    width: 52,
    height: 4,
    backgroundColor: Colors.s3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rankBar: {
    height: '100%',
    backgroundColor: Colors.violet,
    borderRadius: 4,
  },
  empty: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t3,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.s1,
    borderWidth: 1,
    borderColor: Colors.b1,
    borderRadius: 18,
    padding: 14,
  },
  statVal: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 24,
    color: Colors.t1,
  },
  statLbl: {
    fontSize: 11,
    color: Colors.t3,
    fontFamily: Fonts.bodyBold,
    marginTop: 4,
  },
});
