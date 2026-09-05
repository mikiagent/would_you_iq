import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ProfileAvatar } from '@/components/ProfileAvatar';
import { useCloudSync } from '@/components/SyncProvider';
import { ActionButton, Field, PageHeader, Sheet, Surface } from '@/components/primitives';
import { Layout, isDesktopWidth } from '@/constants/layout';
import { Links } from '@/constants/links';
import { Colors, Fonts } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';
import { clearAiConsent, getAiConsent } from '@/lib/aiConsent';

function confirmDestructive(title: string, message: string, actionLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: actionLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const user = useAppStore((state) => state.user);
  const updateUserName = useAppStore((state) => state.updateUserName);
  const resetApp = useAppStore((state) => state.resetApp);
  const startGuidedTour = useAppStore((state) => state.startGuidedTour);
  const showToast = useAppStore((state) => state.showToast);
  const {
    avatarUrl,
    displayName,
    email,
    isSignedIn,
    isCloudConfigured,
    isAppleSignInAvailable,
    signInWithGoogle,
    signInWithApple,
    signOut,
    deleteAccount,
  } = useCloudSync();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [hasAiConsent, setHasAiConsent] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);
  const resolvedAvatarUrl = avatarUrl ?? user.avatarUrl;
  const resolvedName = displayName ?? user.name;
  const resolvedEmail = email ?? user.email;
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    if (!isSignedIn) {
      setHasAiConsent(false);
      return;
    }

    getAiConsent().then((record) => setHasAiConsent(!!record));
  }, [isSignedIn]);

  const handleDeleteAccount = () => {
    confirmDestructive(
      'Delete account?',
      'This permanently deletes your account and synced app content, including your profile, tasks, and budget. Data saved on this device is also reset. Service providers may retain limited security logs under their standard retention policies. This cannot be undone.',
      'Delete',
      () => {
        confirmDestructive(
          'Are you sure?',
          'Your account and synced app content will be permanently deleted. If you used Sign in with Apple, also remove WouldYouIQ from your Sign in with Apple settings to revoke the remaining Apple authorization.',
          'Delete forever',
          () => {
            setIsDeletingAccount(true);
            deleteAccount()
              .then(() => {
                showToast({ icon: '🗑️', title: 'Account deleted', subtitle: 'Your account and synced app content were removed.' });
              })
              .catch((err: Error) => {
                showToast({ icon: '⚠️', title: 'Deletion failed', subtitle: err.message || 'Try again.' });
              })
              .finally(() => setIsDeletingAccount(false));
          },
        );
      },
    );
  };

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
          <ProfileAvatar avatarUrl={resolvedAvatarUrl} label={resolvedName} size={72} />
          <Text style={styles.profileName}>{resolvedName}</Text>
          <Text style={styles.profileSub}>
            {isSignedIn
              ? resolvedEmail ?? 'Signed in'
              : 'Sign in to back up and sync your data across devices. Everything also works without an account.'}
          </Text>
          <View style={styles.profileActionsColumn}>
            <ActionButton
              label="Edit Profile"
              tone="primary"
              onPress={() => {
                setName(user.name);
                setSheetOpen(true);
              }}
            />
            {!isCloudConfigured ? (
              <Text style={styles.sectionNote}>
                Cloud sync is unavailable in this build. Local features still work.
              </Text>
            ) : isSignedIn ? (
              <ActionButton
                label="Sign Out"
                onPress={() => {
                  void signOut();
                }}
              />
            ) : (
              <>
                {isAppleSignInAvailable ? (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={14}
                    style={styles.appleButton}
                    onPress={() => {
                      signInWithApple().catch(() => {
                        showToast({ icon: '⚠️', title: 'Apple sign-in failed', subtitle: 'Try again.' });
                      });
                    }}
                  />
                ) : null}
                <ActionButton
                  label="Continue with Google"
                  onPress={() => {
                    signInWithGoogle().catch(() => {
                      showToast({ icon: '⚠️', title: 'Google sign-in failed', subtitle: 'Try again.' });
                    });
                  }}
                />
              </>
            )}
          </View>
        </Surface>

        <Surface style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About & Privacy</Text>
          <ActionButton
            label="Privacy Policy"
            onPress={() => {
              void WebBrowser.openBrowserAsync(Links.privacyPolicy);
            }}
          />
          <ActionButton
            label="Support"
            onPress={() => {
              void WebBrowser.openBrowserAsync(Links.support);
            }}
          />
          {hasAiConsent ? (
            <ActionButton
              label="Revoke AI Import Consent"
              onPress={() => {
                void clearAiConsent().then(() => {
                  setHasAiConsent(false);
                  showToast({ icon: '🔒', title: 'Consent revoked', subtitle: 'Syllabus import will ask again before sending anything.' });
                });
              }}
            />
          ) : (
            <Text style={styles.sectionNote}>
              AI syllabus scanning is off until you give consent in Tasks → Context.
            </Text>
          )}
          <Text style={styles.sectionNote}>Version {appVersion}</Text>
        </Surface>

        <ActionButton
          label="Reset App Data"
          onPress={() => {
            confirmDestructive(
              'Reset app data?',
              'This clears all tasks, budget items, and progress stored on this device. This cannot be undone.',
              'Reset',
              () => {
                resetApp();
                router.replace('/onboarding');
              },
            );
          }}
        />
        <ActionButton
          label="Replay App Tour"
          onPress={() => {
            startGuidedTour();
            router.replace('/(tabs)/tasks');
          }}
        />

        {isSignedIn ? (
          <Surface style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Danger zone</Text>
            <Text style={styles.sectionNote}>
              Permanently delete your account and synced app content.
            </Text>
            <ActionButton
              label={isDeletingAccount ? 'Deleting…' : 'Delete Account & Data'}
              onPress={handleDeleteAccount}
            />
          </Surface>
        ) : null}
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
  profileActionsColumn: {
    gap: 12,
    width: '100%',
    maxWidth: 440,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  sectionCard: {
    padding: 20,
    gap: 12,
    width: '100%',
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.t1,
  },
  sectionNote: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t2,
    lineHeight: 20,
  },
  dangerCard: {
    padding: 20,
    gap: 12,
    width: '100%',
    borderColor: 'rgba(255,99,99,0.28)',
    backgroundColor: 'rgba(255,99,99,0.05)',
  },
  dangerTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: '#ff8a8a',
  },
});
