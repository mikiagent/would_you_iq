import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useCloudSync } from '@/components/SyncProvider';
import { ActionButton, Field, PageHeader, Sheet, Surface } from '@/components/primitives';
import { Layout, isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const user = useAppStore((state) => state.user);
  const updateUserName = useAppStore((state) => state.updateUserName);
  const resetApp = useAppStore((state) => state.resetApp);
  const startGuidedTour = useAppStore((state) => state.startGuidedTour);
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
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakValue}>{user.streak}</Text>
          </View>
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
          <View style={styles.profileActionsRow}>
            <ActionButton
              label="Edit Profile"
              tone="primary"
              onPress={() => {
                setName(user.name);
                setSheetOpen(true);
              }}
              style={styles.profileActionButton}
            />
            <ActionButton
              label={isSignedIn ? 'Sign Out' : 'Continue with Google'}
              onPress={() => {
                void (isSignedIn ? signOut() : signInWithGoogle());
              }}
              style={styles.profileActionButton}
            />
          </View>
        </Surface>

        <Surface style={styles.planCard}>
          <Text style={styles.planEyebrow}>Upgrade</Text>
          <Text style={styles.planTitle}>WouldYouIQ Pro</Text>
          <Text style={styles.planBody}>
            Unlock deeper coaching, premium calibration insights, richer trend tracking, and a more personalized system that keeps your priorities synced everywhere.
          </Text>
          <View style={styles.planHighlights}>
            <Text style={styles.planHighlight}>Priority reports with longer-term patterns</Text>
            <Text style={styles.planHighlight}>Smarter budget recommendations</Text>
            <Text style={styles.planHighlight}>Cross-device sync and premium backup feel</Text>
          </View>
          <ActionButton label="Upgrade to Pro" tone="primary" onPress={() => {}} />
          <Text style={styles.planFootnote}>
            Local changes already save on-device first. Signing in adds cloud save every 5 minutes or anytime you tap Save.
          </Text>
        </Surface>

        <ActionButton label="Reset Demo Data" onPress={resetApp} />
        <ActionButton
          label="Replay App Tour"
          onPress={() => {
            startGuidedTour();
            router.replace('/(tabs)/tasks');
          }}
        />
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
    position: 'relative',
  },
  streakBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    minWidth: 74,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,200,66,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakValue: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.gold,
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
  profileActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 440,
  },
  profileActionButton: {
    flex: 1,
  },
  planCard: {
    padding: 22,
    gap: 12,
    width: '100%',
    borderColor: 'rgba(245,200,66,0.24)',
    backgroundColor: 'rgba(245,200,66,0.05)',
  },
  planEyebrow: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  planTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.gold,
  },
  planBody: {
    fontFamily: Fonts.bodyLight,
    fontSize: 15,
    color: Colors.t2,
    lineHeight: 24,
  },
  planHighlights: {
    gap: 8,
  },
  planHighlight: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.t1,
  },
  planFootnote: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t2,
    lineHeight: 20,
  },
});
