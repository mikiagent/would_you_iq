import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { ActionButton, Badge, Surface } from '@/components/primitives';
import { isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts } from '@/constants/tokens';
import { useAppStore } from '@/domain/store';

const TOUR_STEPS = [
  {
    route: '/tasks',
    badge: 'Tasks',
    title: 'This is your ranked task board.',
    body:
      'Tasks are not just a checklist here. You can add work, mark essentials, expand steps, and let the ranking adapt as you calibrate.',
    hint: 'Try expanding a card or adding a new task after the tour.',
  },
  {
    route: '/calibrate',
    badge: 'Would You?',
    title: 'This is the calibration engine.',
    body:
      'Pick between two options and the app updates their priority in real time. This is the core mechanic that keeps your rankings honest.',
    hint: 'Swipe or tap a choice to teach the app what wins when tradeoffs are real.',
  },
  {
    route: '/fyp',
    badge: 'For You',
    title: 'This tab gives you one best next move.',
    body:
      'When the full list feels heavy, For You surfaces a single recommended task so you can act without re-planning everything.',
    hint: 'Start a task here when you want focus without friction.',
  },
  {
    route: '/budget',
    badge: 'Budget',
    title: 'Budget uses the same priority logic as time.',
    body:
      'Review essentials, compare flexible spending, and see whether your monthly money choices align with what you say matters most.',
    hint: 'Open Insights after the tour to see where your spending is drifting.',
  },
  {
    route: '/settings',
    badge: 'Settings',
    title: 'Settings is where sync, profile, and resets live.',
    body:
      'You can connect Google and Supabase, edit your profile, check stats, or replay this tour anytime if you want a refresher.',
    hint: 'Use Reset Demo Data if you want to start the sample workspace over.',
  },
] as const;

function normalizePath(pathname: string) {
  return pathname.replace('/(tabs)', '');
}

export function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const guidedTour = useAppStore((state) => state.guidedTour);
  const nextGuidedTourStep = useAppStore((state) => state.nextGuidedTourStep);
  const previousGuidedTourStep = useAppStore((state) => state.previousGuidedTourStep);
  const endGuidedTour = useAppStore((state) => state.endGuidedTour);
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);

  const step = TOUR_STEPS[Math.min(guidedTour.step, TOUR_STEPS.length - 1)];

  useEffect(() => {
    if (!guidedTour.active || !step) return;

    const currentPath = normalizePath(pathname);
    if (currentPath === step.route) return;

    router.replace(step.route as never);
  }, [guidedTour.active, pathname, router, step]);

  if (!guidedTour.active || !step) {
    return null;
  }

  const isLastStep = guidedTour.step === TOUR_STEPS.length - 1;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Surface style={[styles.card, desktop && styles.cardDesktop]}>
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            <Text style={styles.stepLabel}>
              Tour step {guidedTour.step + 1} of {TOUR_STEPS.length}
            </Text>
            <Badge label={step.badge} tone="violet" />
          </View>
          <Pressable onPress={endGuidedTour} style={styles.skipButton}>
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>

        <View style={styles.hintBox}>
          <Text style={styles.hintLabel}>What to look for</Text>
          <Text style={styles.hintText}>{step.hint}</Text>
        </View>

        <View style={styles.actions}>
          <ActionButton
            label={guidedTour.step === 0 ? 'Close tour' : 'Back'}
            onPress={() => {
              if (guidedTour.step === 0) {
                endGuidedTour();
                return;
              }

              previousGuidedTourStep();
            }}
            style={styles.button}
          />
          <ActionButton
            label={isLastStep ? 'Finish tour' : 'Next feature →'}
            tone="primary"
            onPress={() => {
              nextGuidedTourStep(TOUR_STEPS.length);
            }}
            style={styles.button}
          />
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 90,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    padding: 18,
    gap: 14,
    borderColor: 'rgba(167,139,250,0.24)',
    backgroundColor: 'rgba(14,14,28,0.96)',
  },
  cardDesktop: {
    marginLeft: 160,
    maxWidth: 620,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  stepLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.cyan,
  },
  skipButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skipLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t2,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.t1,
  },
  body: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.t2,
  },
  hintBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: 'rgba(7,7,13,0.35)',
    padding: 14,
    gap: 6,
  },
  hintLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    color: Colors.gold,
  },
  hintText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.t1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
  },
});
