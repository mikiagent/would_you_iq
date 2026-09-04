import React, { ReactNode, useEffect, useMemo, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/AmbientBackground';
import { GuidedTour } from '@/components/GuidedTour';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { SyncProvider, useCloudSync } from '@/components/SyncProvider';
import { Toast } from '@/components/Toast';
import { Colors, Fonts } from '@/constants/tokens';
import { isDesktopWidth, Layout } from '@/constants/layout';
import { useAppStore } from '@/domain/store';
import { getLevelInfo, todayKey } from '@/domain/logic';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SyncProvider>
      <AppShellInner>{children}</AppShellInner>
    </SyncProvider>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const toast = useAppStore((state) => state.toast);
  const clearToast = useAppStore((state) => state.clearToast);
  const user = useAppStore((state) => state.user);
  const showToast = useAppStore((state) => state.showToast);
  const didNotifyRef = useRef(false);
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);

  useEffect(() => {
    if (didNotifyRef.current) return;
    if (user.lastCalibrationDate === todayKey()) return;

    didNotifyRef.current = true;
    showToast({
      icon: '🔥',
      title: `Your ${user.streak}-day streak is ready`,
      subtitle: 'Complete today’s calibration to keep it alive.',
    });
  }, [showToast, user.lastCalibrationDate, user.streak]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AmbientBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {desktop ? <DesktopShell>{children}</DesktopShell> : <View style={styles.app}>{children}</View>}
      </SafeAreaView>
      <GuidedTour />
      <Toast toast={toast} onDone={clearToast} />
    </View>
  );
}

function DesktopShell({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const startGuidedTour = useAppStore((state) => state.startGuidedTour);
  const replayOnboarding = useAppStore((state) => state.replayOnboarding);
  const user = useAppStore((state) => state.user);
  const { avatarUrl, displayName, email, isSignedIn } = useCloudSync();
  const storedUser = user;
  const showTabsChrome = pathname !== '/onboarding' && pathname !== '/runner';
  const onboardingRoute = pathname === '/onboarding';
  const resolvedAvatarUrl = avatarUrl ?? storedUser.avatarUrl;
  const resolvedName = displayName ?? storedUser.name;
  const resolvedEmail = email ?? storedUser.email;
  const initials = useMemo(() => {
    const source = resolvedName || resolvedEmail || 'W';
    return source
      .split(' ')
      .map((part) => part.trim()[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [resolvedEmail, resolvedName]);
  const navItems = [
    { label: 'Tasks', icon: '📋', href: '/tasks' },
    { label: 'Would You?', icon: '⚡', href: '/calibrate' },
    { label: 'For You', icon: '✨', href: '/fyp' },
    { label: 'ELO', icon: '🏆', href: '/elo' },
    { label: 'Budget', icon: '💰', href: '/budget' },
    { label: 'Settings', icon: '⚙️', href: '/settings' },
  ];
  const phoneHeight = Math.max(700, Math.min(height - 130, 880));
  const phoneWidth = Math.round(phoneHeight * 0.72);
  const levelInfo = getLevelInfo(user.xp);

  if (!showTabsChrome) {
    return (
      <View style={styles.desktopStandalone}>
        <View
          style={[
            styles.desktopStandaloneContent,
            onboardingRoute && styles.desktopStandaloneContentFullBleed,
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.desktopLayout}>
      <View style={styles.desktopRail}>
        <View style={styles.desktopLogoWrap}>
          <Text style={styles.desktopLogo}>WouldYouIQ</Text>
          <Text style={styles.desktopTagline}>Decide what matters most.</Text>
        </View>

        <Pressable style={styles.desktopSearch}>
          <Text style={styles.desktopSearchIcon}>⌕</Text>
          <Text style={styles.desktopSearchLabel}>Search</Text>
        </Pressable>

        <View style={styles.desktopSection}>
          <Text style={styles.desktopSectionLabel}>Pages</Text>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Pressable
                key={item.href}
                onPress={() => router.replace(item.href as never)}
                style={[styles.desktopNavItem, active && styles.desktopNavItemActive]}
              >
                <Text style={styles.desktopNavIcon}>{item.icon}</Text>
                <Text style={[styles.desktopNavLabel, active && styles.desktopNavLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.desktopMain}>
        <View style={styles.desktopTopBar}>
          <View />
          <View style={styles.desktopTopActions}>
            <Pressable
              onPress={() => {
                replayOnboarding();
                router.replace('/onboarding' as never);
              }}
              style={styles.desktopTutorialButton}
            >
              <Text style={styles.desktopTutorialIcon}>↺</Text>
              <Text style={styles.desktopTutorialLabel}>Onboarding</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                startGuidedTour();
                router.replace('/tasks' as never);
              }}
              style={styles.desktopTutorialButton}
            >
              <Text style={styles.desktopTutorialIcon}>?</Text>
              <Text style={styles.desktopTutorialLabel}>Tutorial</Text>
            </Pressable>
            <View style={styles.desktopProfileChip}>
              <ProfileAvatar avatarUrl={resolvedAvatarUrl} label={resolvedName || initials} size={38} />
              <View style={styles.desktopProfileMeta}>
                <Text style={styles.desktopProfileName} numberOfLines={1}>
                  {resolvedName || 'Local mode'}
                </Text>
                <Text style={styles.desktopProfileSub} numberOfLines={1}>
                  {isSignedIn ? resolvedEmail || 'Connected' : 'Offline first'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.desktopContentFrame}>
          <View
            style={[
              styles.desktopContent,
              styles.desktopPanelFrame,
              {
                width: phoneWidth,
                height: phoneHeight,
              },
            ]}
          >
            {children}
          </View>
        </View>
        <View style={styles.desktopFloatingRail}>
          {showTabsChrome ? (
            <View style={styles.desktopLevelCard}>
              <View style={styles.desktopLevelRow}>
                <Text style={styles.desktopLevelTitle}>Level {levelInfo.level}</Text>
                <Text style={styles.desktopLevelMeta}>
                  {levelInfo.current}/{levelInfo.needed} XP
                </Text>
              </View>
              <View style={styles.desktopStreakRow}>
                <Text style={styles.desktopStreakEmoji}>🔥</Text>
                <Text style={styles.desktopStreakLabel}>{user.streak} day streak</Text>
              </View>
              <View style={styles.desktopLevelTrack}>
                <View style={[styles.desktopLevelFill, { width: `${Math.max(6, levelInfo.progress * 100)}%` }]} />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safe: {
    flex: 1,
  },
  app: {
    flex: 1,
    width: '100%',
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    maxWidth: Layout.appMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingBottom: 18,
    gap: 32,
  },
  desktopRail: {
    width: 310,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: 'rgba(10,10,20,0.9)',
    borderWidth: 1,
    borderColor: Colors.b1,
    gap: 22,
  },
  desktopLogoWrap: {
    gap: 8,
  },
  desktopLogo: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.t1,
  },
  desktopTagline: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.t3,
    lineHeight: 18,
  },
  desktopSearch: {
    height: 50,
    borderRadius: 18,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopSearchIcon: {
    fontSize: 18,
    color: Colors.t3,
  },
  desktopSearchLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.t3,
  },
  desktopSection: {
    gap: 10,
  },
  desktopSectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  desktopNavItem: {
    height: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  desktopNavItemActive: {
    backgroundColor: 'rgba(124,106,247,0.16)',
    borderColor: 'rgba(167,139,250,0.24)',
  },
  desktopNavIcon: {
    fontSize: 18,
  },
  desktopNavLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.t2,
  },
  desktopNavLabelActive: {
    color: Colors.t1,
  },
  desktopMain: {
    flex: 1,
    gap: 0,
    position: 'relative',
  },
  desktopTopBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  desktopTopActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopTutorialButton: {
    minHeight: 46,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(124,106,247,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.24)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopTutorialIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.t1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  desktopTutorialLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t1,
  },
  desktopProfileChip: {
    maxWidth: 320,
    minHeight: 54,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(10,10,20,0.9)',
    borderWidth: 1,
    borderColor: Colors.b1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopProfileMeta: {
    flex: 1,
    minWidth: 0,
  },
  desktopProfileName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.t1,
  },
  desktopProfileSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.t3,
    marginTop: 2,
  },
  desktopContentFrame: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingRight: 360,
    marginTop: -28,
  },
  desktopContent: {
    width: '100%',
  },
  desktopPanelFrame: {
    maxWidth: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.bg,
  },
  desktopFloatingRail: {
    position: 'absolute',
    right: 0,
    top: 78,
    gap: 14,
  },
  desktopLevelCard: {
    width: 320,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(15,13,34,0.92)',
    borderWidth: 1,
    borderColor: Colors.b1,
    gap: 10,
  },
  desktopLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  desktopLevelTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.t1,
  },
  desktopLevelMeta: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t2,
  },
  desktopStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopStreakEmoji: {
    fontSize: 15,
  },
  desktopStreakLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  desktopLevelTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: Colors.s3,
    overflow: 'hidden',
  },
  desktopLevelFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.gold,
  },
  desktopStandalone: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  desktopStandaloneContent: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
  },
  desktopStandaloneContentFullBleed: {
    maxWidth: '100%',
  },
});
