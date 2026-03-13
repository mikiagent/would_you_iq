import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton, Field, PageHeader, Sheet, StatCard, Surface } from '@/components/primitives';
import { Colors, Fonts } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';

export default function SettingsScreen() {
  const user = useAppStore((state) => state.user);
  const updateUserName = useAppStore((state) => state.updateUserName);
  const resetApp = useAppStore((state) => state.resetApp);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState(user.name);

  return (
    <View style={styles.root}>
      <PageHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Surface style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{user.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileSub}>Frontend-only build. Supabase profile sync will slot in later.</Text>
          <ActionButton
            label="Edit Profile"
            tone="primary"
            onPress={() => {
              setName(user.name);
              setSheetOpen(true);
            }}
          />
        </Surface>

        <View style={styles.statsGrid}>
          <StatCard icon="⚡" value={String(user.xp)} label="Total XP" />
          <StatCard icon="🔥" value={String(user.streak)} label="Day Streak" />
        </View>
        <View style={styles.statsGrid}>
          <StatCard icon="🧩" value={String(user.comparisons)} label="Comparisons" />
          <StatCard icon="✅" value={String(user.done)} label="Tasks Done" />
        </View>

        <Surface style={styles.planCard}>
          <Text style={styles.planTitle}>WouldYouIQ Pro</Text>
          <Text style={styles.planBody}>
            Supabase auth, sync, and payments are intentionally paused for this frontend pass.
          </Text>
        </Surface>

        <ActionButton label="Reset Demo Data" onPress={resetApp} />
      </ScrollView>

      <Sheet open={sheetOpen} title="Profile" onClose={() => setSheetOpen(false)}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        <ActionButton
          label="Save"
          tone="primary"
          onPress={() => {
            updateUserName(name);
            setSheetOpen(false);
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
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 120,
    gap: 14,
  },
  profileCard: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.s2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  avatarLabel: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.t1,
  },
  profileName: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.t1,
  },
  profileSub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 13,
    color: Colors.t2,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    padding: 18,
    gap: 8,
  },
  planTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.gold,
  },
  planBody: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t2,
    lineHeight: 22,
  },
});
