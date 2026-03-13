import { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useCloudSync } from '@/components/SyncProvider';
import { ActionButton, Field, PageHeader, Sheet, StatCard, Surface } from '@/components/primitives';
import { Layout, isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const user = useAppStore((state) => state.user);
  const updateUserName = useAppStore((state) => state.updateUserName);
  const resetApp = useAppStore((state) => state.resetApp);
  const { avatarUrl, displayName, email, isSignedIn, signInWithGoogle, signOut } = useCloudSync();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);

  return (
    <View style={styles.root}>
      <View style={[styles.content, desktop && styles.contentDesktop]}>
        <PageHeader title="Settings" />
        <ScrollView contentContainerStyle={styles.scroll}>
        <Surface style={styles.profileCard}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarLabel}>{user.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{displayName ?? user.name}</Text>
          <Text style={styles.profileSub}>
            {isSignedIn ? email ?? 'Signed in with Google' : 'Use Google sign-in to sync this device to Supabase.'}
          </Text>
          <ActionButton
            label="Edit Profile"
            tone="primary"
            onPress={() => {
              setName(user.name);
              setSheetOpen(true);
            }}
          />
          <ActionButton
            label={isSignedIn ? 'Sign Out' : 'Continue with Google'}
            onPress={() => {
              void (isSignedIn ? signOut() : signInWithGoogle());
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
            Local changes always save on-device first. When signed in, a cloud save runs every 5 minutes or anytime you tap Save.
          </Text>
        </Surface>

        <ActionButton label="Reset Demo Data" onPress={resetApp} />
        </ScrollView>
      </View>

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
  content: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.readingMaxWidth,
    alignSelf: 'center',
  },
  contentDesktop: {
    paddingTop: 8,
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
    maxWidth: 760,
    alignSelf: 'center',
    width: '100%',
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
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    width: '100%',
  },
  planCard: {
    padding: 18,
    gap: 8,
    width: '100%',
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
