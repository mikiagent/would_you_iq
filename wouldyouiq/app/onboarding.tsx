import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ExpandableTaskText } from '@/components/ExpandableTaskText';
import { ActionButton, Badge, Surface } from '@/components/primitives';
import { OB_TASKS } from '@/constants/onboarding';
import { Colors, Fonts } from '@/constants/tokens';
import { medalForIndex, sortedTasks } from '@/domain/logic';
import { useAppStore } from '@/domain/store';

const TOUR_STEPS = [
  {
    eyebrow: 'Tour 1 of 5',
    title: 'Train the app with quick head-to-head picks.',
    description:
      'The Calibrate tab learns your real priorities by asking you to choose between two options instead of building a giant list from scratch.',
    badge: 'Calibrate arena',
    accent: 'Swipe left to keep the current winner. Swipe right when the challenger matters more.',
    cards: [
      { emoji: '🏆', label: 'Current winner', meta: 'Keep your top priority' },
      { emoji: '⚔️', label: 'New challenger', meta: 'Promote what matters more' },
    ],
  },
  {
    eyebrow: 'Tour 2 of 5',
    title: 'Your Tasks tab becomes a ranked command center.',
    description:
      'Add tasks, mark essentials, break work into steps, and let the ranking update as your priorities shift.',
    badge: 'Tasks tab',
    accent: 'Tasks carry ELO, deadlines, subtasks, and an essential flag so the list feels alive instead of static.',
    cards: [
      { emoji: '📚', label: 'Study for Exam', meta: 'ELO 1380  •  due today' },
      { emoji: '💡', label: 'Work on Startup', meta: '3 steps  •  essential' },
    ],
  },
  {
    eyebrow: 'Tour 3 of 5',
    title: 'For You answers the question: what should I do next?',
    description:
      'When you just need momentum, the app surfaces one best-next task and lets you skip or start without thinking too hard.',
    badge: 'For You',
    accent: 'This is your focus lane: one card, one recommendation, one clean next move.',
    cards: [
      { emoji: '🔥', label: 'Top recommendation', meta: 'Start now or skip upward' },
      { emoji: '✅', label: 'Quick win mode', meta: 'Mark done and keep moving' },
    ],
  },
  {
    eyebrow: 'Tour 4 of 5',
    title: 'Budget uses the same priority language as your tasks.',
    description:
      'Compare subscriptions, essentials, and flexible spending so your money reflects the same tradeoffs as your time.',
    badge: 'Budget insights',
    accent: 'You can rank expenses, review leftover cash, and spot spending that is out of alignment.',
    cards: [
      { emoji: '🏠', label: 'Rent', meta: 'Essential  •  protected' },
      { emoji: '🛵', label: 'DoorDash', meta: 'Flexible  •  review this' },
    ],
  },
  {
    eyebrow: 'Tour 5 of 5',
    title: 'Everything starts with your name and a few sample priorities.',
    description:
      'We will seed a starter stack for you, run one short calibration round, and then drop you into the full app with demo data you can immediately edit.',
    badge: 'Set up',
    accent: 'This takes under a minute and gives every tab something useful to show.',
    cards: [
      { emoji: '☁️', label: 'Optional sync', meta: 'Google + Supabase in Settings' },
      { emoji: '⚡', label: 'XP + streaks', meta: 'Momentum stays visible' },
    ],
  },
] as const;

export default function OnboardingScreen() {
  const onboarding = useAppStore((state) => state.onboarding);
  const setName = useAppStore((state) => state.setOnboardingName);
  const continueFromName = useAppStore((state) => state.continueFromName);
  const toggleSelection = useAppStore((state) => state.toggleOnboardingSelection);
  const startTournament = useAppStore((state) => state.startOnboardingTournament);
  const chooseWinner = useAppStore((state) => state.chooseOnboardingWinner);
  const finishOnboarding = useAppStore((state) => state.finishOnboarding);
  const startGuidedTour = useAppStore((state) => state.startGuidedTour);
  const [tourIndex, setTourIndex] = useState(0);

  const pair = onboarding.pairQueue[onboarding.round];
  const left = onboarding.seedTasks.find((task) => task.id === pair?.[0]);
  const right = onboarding.seedTasks.find((task) => task.id === pair?.[1]);
  const topThree = sortedTasks(onboarding.seedTasks, true).slice(0, 3);
  const tour = TOUR_STEPS[tourIndex];
  const onFinalTourStep = tourIndex === TOUR_STEPS.length - 1;

  if (onboarding.completed) {
    return <Redirect href="/(tabs)/calibrate" />;
  }

  return (
    <View style={styles.root}>
      {onboarding.step === 'name' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <Text style={styles.logo}>WouldYouIQ</Text>
            <Text style={styles.tagline}>
              A guided tour of how this app ranks your time, attention, and spending.
            </Text>
          </View>

          <LinearGradient colors={['rgba(124,106,247,0.2)', 'rgba(34,211,238,0.05)']} style={styles.tourCard}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.logoSmall}>{tour.eyebrow}</Text>
              <Badge label={tour.badge} tone="violet" />
            </View>
            <Text style={styles.title}>{tour.title}</Text>
            <Text style={styles.sub}>{tour.description}</Text>

            <View style={styles.previewWrap}>
              {tour.cards.map((card) => (
                <Surface key={card.label} style={styles.previewCard}>
                  <Text style={styles.previewEmoji}>{card.emoji}</Text>
                  <Text style={styles.previewLabel}>{card.label}</Text>
                  <Text style={styles.previewMeta}>{card.meta}</Text>
                </Surface>
              ))}
            </View>

            <Surface style={styles.accentCard}>
              <Text style={styles.accentLabel}>What you’ll do here</Text>
              <Text style={styles.accentText}>{tour.accent}</Text>
            </Surface>

            {onFinalTourStep ? (
              <View style={styles.nameBlock}>
                <Text style={styles.fieldLabel}>What should we call you?</Text>
                <TextInput
                  value={onboarding.nameDraft}
                  onChangeText={setName}
                  placeholder="What's your name?"
                  placeholderTextColor={Colors.t3}
                  style={styles.input}
                />
              </View>
            ) : null}

            <View style={styles.progressRow}>
              {TOUR_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[styles.progressDot, index <= tourIndex && styles.progressDotActive]}
                />
              ))}
            </View>

            <View style={styles.actionsRow}>
              <ActionButton
                label={tourIndex === 0 ? 'Skip tour' : 'Back'}
                onPress={() => {
                  if (tourIndex === 0) {
                    setTourIndex(TOUR_STEPS.length - 1);
                    return;
                  }
                  setTourIndex((value) => value - 1);
                }}
                style={styles.halfButton}
              />
              <ActionButton
                label={onFinalTourStep ? 'Build my starter app →' : 'Next stop →'}
                tone="primary"
                onPress={() => {
                  if (onFinalTourStep) {
                    continueFromName();
                    return;
                  }
                  setTourIndex((value) => value + 1);
                }}
                style={styles.halfButton}
              />
            </View>
          </LinearGradient>
        </ScrollView>
      ) : null}

      {onboarding.step === 'priorities' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.logoSmall}>Step 2 of 4</Text>
          <Text style={styles.title}>Pick the starter priorities you want to tour with.</Text>
          <Text style={styles.sub}>
            Choose at least 4 and we’ll turn them into your first ranked tasks across the app.
          </Text>
          <View style={styles.grid}>
            {OB_TASKS.map((option) => {
              const selected = onboarding.selectedIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleSelection(option.id)}
                >
                  <Text style={styles.chipEmoji}>{option.e}</Text>
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {option.n}
                  </Text>
                  <Text style={styles.chipMeta}>{option.t}</Text>
                </Pressable>
              );
            })}
          </View>
          <ActionButton
            label={`Create my starter stack (${onboarding.selectedIds.length})`}
            tone={onboarding.selectedIds.length >= 4 ? 'primary' : 'secondary'}
            onPress={startTournament}
          />
        </ScrollView>
      ) : null}

      {onboarding.step === 'tournament' ? (
        <View style={styles.centered}>
          <Text style={styles.logoSmall}>Step 3 of 4</Text>
          <Text style={styles.title}>One quick calibration round.</Text>
          <Text style={styles.sub}>
            This is the same interaction the Calibrate tab uses later. Tap the option you would actually do first.
          </Text>
          <View style={styles.progressRow}>
            {onboarding.pairQueue.map((_, index) => (
              <View
                key={index}
                style={[styles.progressDot, index <= onboarding.round && styles.progressDotActive]}
              />
            ))}
          </View>
          <View style={styles.compareRow}>
            {[left, right].map((task) =>
              task ? (
                <Pressable
                  key={task.id}
                  style={styles.compareCard}
                  onPress={() => chooseWinner(task.id)}
                >
                  <Text style={styles.compareEmoji}>{task.e}</Text>
                  <ExpandableTaskText value={task.n} style={styles.compareName} numberOfLines={2} />
                  <Badge label={task.t} />
                </Pressable>
              ) : null,
            )}
          </View>
        </View>
      ) : null}

      {onboarding.step === 'reveal' ? (
        <View style={styles.centered}>
          <Text style={styles.logoSmall}>Step 4 of 4</Text>
          <Text style={styles.title}>Your app is ready.</Text>
          <Text style={styles.sub}>
            These become your opening rankings so Tasks, For You, and Calibrate all have something meaningful to show right away.
          </Text>
          <Surface style={styles.revealCard}>
            {topThree.map((task, index) => (
              <View key={task.id} style={styles.rankRow}>
                <Text style={styles.rankMedal}>{medalForIndex(index)}</Text>
                <Text style={styles.rankEmoji}>{task.e}</Text>
                <View style={{ flex: 1 }}>
                  <ExpandableTaskText value={task.n} style={styles.rankName} />
                  <Text style={styles.rankMeta}>Starter ELO {task.elo}</Text>
                </View>
              </View>
            ))}
          </Surface>
          <ActionButton
            label="Start app tour →"
            tone="primary"
            onPress={() => {
              finishOnboarding();
              startGuidedTour();
              router.replace('/(tabs)/tasks');
            }}
            style={{ width: '100%' }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  scroll: {
    paddingTop: 72,
    paddingBottom: 36,
    gap: 18,
  },
  hero: {
    gap: 12,
    alignItems: 'center',
  },
  centered: {
    width: '100%',
    alignItems: 'center',
    gap: 18,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.t1,
    textAlign: 'center',
  },
  logoSmall: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.violet,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: Colors.t2,
    maxWidth: 420,
  },
  tourCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.b2,
    padding: 20,
    gap: 18,
    overflow: 'hidden',
  },
  eyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.t1,
    textAlign: 'center',
  },
  sub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.t2,
    textAlign: 'center',
  },
  previewWrap: {
    flexDirection: 'row',
    gap: 12,
  },
  previewCard: {
    flex: 1,
    minHeight: 132,
    padding: 16,
    gap: 10,
    justifyContent: 'space-between',
  },
  previewEmoji: {
    fontSize: 28,
  },
  previewLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.t1,
  },
  previewMeta: {
    fontFamily: Fonts.bodyLight,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.t2,
  },
  accentCard: {
    padding: 16,
    gap: 6,
    backgroundColor: 'rgba(7,7,13,0.38)',
  },
  accentLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: Colors.cyan,
  },
  accentText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.t1,
  },
  nameBlock: {
    gap: 10,
  },
  fieldLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.t1,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.b2,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: Colors.s2,
    color: Colors.t1,
    fontFamily: Fonts.body,
    fontSize: 16,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.s3,
    borderWidth: 1,
    borderColor: Colors.t4,
  },
  progressDotActive: {
    backgroundColor: Colors.violet,
    borderColor: Colors.violet,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    width: '47%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s1,
    padding: 14,
    minHeight: 110,
    justifyContent: 'space-between',
    gap: 6,
  },
  chipSelected: {
    borderColor: Colors.violet,
    backgroundColor: 'rgba(167,139,250,0.1)',
  },
  chipEmoji: {
    fontSize: 28,
  },
  chipLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.t1,
  },
  chipLabelSelected: {
    color: '#fff',
  },
  chipMeta: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t2,
  },
  compareRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 14,
  },
  compareCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.b2,
    backgroundColor: Colors.s1,
    padding: 18,
    alignItems: 'center',
    gap: 14,
    minHeight: 220,
    justifyContent: 'center',
  },
  compareEmoji: {
    fontSize: 54,
  },
  compareName: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.t1,
    textAlign: 'center',
  },
  revealCard: {
    width: '100%',
    padding: 18,
    gap: 14,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankMedal: {
    fontSize: 22,
    width: 34,
    textAlign: 'center',
  },
  rankEmoji: {
    fontSize: 28,
  },
  rankName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.t1,
  },
  rankMeta: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t2,
    marginTop: 4,
  },
});
