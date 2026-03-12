import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStore } from '@/stores/userStore';
import { Colors, Fonts } from '@/constants/tokens';
import { BottomSheet } from '@/components/ui';

type ProfileSheetProps = {
  visible: boolean;
  onClose: () => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]![0] + parts[1]![0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '?';
}

export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const { session, signOut } = useAuth();
  const { profile } = useUserStore();
  const initials = getInitials(profile.name || 'Friend');

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="" showHandle>
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarBig}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile.name || 'Friend'}</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>🔒 Free Plan</Text>
        </View>

        <View style={styles.planCardFree}>
          <Text style={styles.planName}>Free</Text>
          <Text style={styles.planDesc}>
            You're on the free plan. Upgrade to unlock unlimited calibrations, advanced analytics, and budget sync.
          </Text>
          <View style={styles.planFeatures}>
            <Text style={styles.planFeat}>✓ 5 calibrations/day</Text>
            <Text style={styles.planFeat}>✓ Basic task ranking</Text>
            <Text style={styles.planFeat}>✓ Budget tracking</Text>
            <Text style={styles.planFeatLock}>🔒 Unlimited calibrations</Text>
            <Text style={styles.planFeatLock}>🔒 AI-powered insights</Text>
            <Text style={styles.planFeatLock}>🔒 Bank sync & auto-budget</Text>
          </View>
        </View>

        <View style={styles.planCardPro}>
          <Text style={styles.planNamePro}>Pro ✦</Text>
          <Text style={styles.planDesc}>
            Everything in Free, plus the full WouldYouIQ experience.
          </Text>
          <View style={styles.planFeatures}>
            <Text style={styles.planFeat}>✓ Unlimited calibrations</Text>
            <Text style={styles.planFeat}>✓ AI-powered behavioral insights</Text>
            <Text style={styles.planFeat}>✓ Bank sync & auto-budget import</Text>
            <Text style={styles.planFeat}>✓ Weekly priority coaching</Text>
            <Text style={styles.planFeat}>✓ Export & share your rankings</Text>
          </View>
          <Pressable style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
          </Pressable>
        </View>
        {session && (
          <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutBtnText}>Sign out</Text>
          </Pressable>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    maxHeight: 400,
  },
  avatarBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 28,
    color: '#fff',
  },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.t1,
    textAlign: 'center',
    marginBottom: 10,
  },
  planBadge: {
    alignSelf: 'center',
    marginBottom: 16,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
  },
  planBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.t3,
  },
  planCardFree: {
    backgroundColor: Colors.s2,
    borderWidth: 1.5,
    borderColor: Colors.b2,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  planName: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 15,
    color: Colors.t1,
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 12,
    color: Colors.t2,
    marginBottom: 12,
    lineHeight: 20,
  },
  planFeatures: {
    gap: 6,
  },
  planFeat: {
    fontSize: 12,
    color: Colors.t2,
  },
  planFeatLock: {
    fontSize: 12,
    color: Colors.t4,
  },
  planCardPro: {
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,200,66,0.28)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  planNamePro: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 15,
    color: Colors.gold,
    marginBottom: 4,
  },
  upgradeBtn: {
    backgroundColor: Colors.gold2,
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 14,
    alignItems: 'center',
  },
  upgradeBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: '#1a1200',
  },
  signOutBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutBtnText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.red,
  },
});
