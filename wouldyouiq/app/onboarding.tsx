import { Redirect, router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActionButton, Badge, Surface } from '@/components/primitives';
import { OB_TASKS } from '@/constants/onboarding';
import { Colors, Fonts } from '@/constants/tokens';
import { medalForIndex, sortedTasks } from '@/domain/logic';
import { useAppStore } from '@/domain/store';

export default function OnboardingScreen() {
  const onboarding = useAppStore((state) => state.onboarding);
  const setName = useAppStore((state) => state.setOnboardingName);
  const continueFromName = useAppStore((state) => state.continueFromName);
  const toggleSelection = useAppStore((state) => state.toggleOnboardingSelection);
  const startTournament = useAppStore((state) => state.startOnboardingTournament);
  const chooseWinner = useAppStore((state) => state.chooseOnboardingWinner);
  const finishOnboarding = useAppStore((state) => state.finishOnboarding);

  const pair = onboarding.pairQueue[onboarding.round];
  const left = onboarding.seedTasks.find((task) => task.id === pair?.[0]);
  const right = onboarding.seedTasks.find((task) => task.id === pair?.[1]);
  const topThree = sortedTasks(onboarding.seedTasks, true).slice(0, 3);

  if (onboarding.completed) {
    return <Redirect href="/(tabs)/calibrate" />;
  }

  return (
    <View style={styles.root}>
      {onboarding.step === 'name' ? (
        <View style={styles.centered}>
          <Text style={styles.logo}>WouldYouIQ</Text>
          <Text style={styles.tagline}>
            Discover your real priorities{'\n'}through two-second choices.
          </Text>
          <TextInput
            value={onboarding.nameDraft}
            onChangeText={setName}
            placeholder="What's your name?"
            placeholderTextColor={Colors.t3}
            style={styles.input}
          />
          <ActionButton
            label="Let's go →"
            tone="primary"
            onPress={continueFromName}
            style={{ width: '100%' }}
          />
        </View>
      ) : null}

      {onboarding.step === 'priorities' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.logoSmall}>Step 2 of 3</Text>
          <Text style={styles.title}>Pick Your Priorities</Text>
          <Text style={styles.sub}>
            Choose at least 4 so we can seed your first rankings.
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
                </Pressable>
              );
            })}
          </View>
          <ActionButton
            label={`Start Mini Tournament (${onboarding.selectedIds.length})`}
            tone={onboarding.selectedIds.length >= 4 ? 'primary' : 'secondary'}
            onPress={startTournament}
          />
        </ScrollView>
      ) : null}

      {onboarding.step === 'tournament' ? (
        <View style={styles.centered}>
          <Text style={styles.logoSmall}>Step 3 of 3</Text>
          <Text style={styles.title}>Mini Tournament</Text>
          <Text style={styles.sub}>Tap the one you’d do first.</Text>
          <View style={styles.progressRow}>
            {[0, 1, 2].map((dot) => (
              <View
                key={dot}
                style={[styles.progressDot, dot <= onboarding.round && styles.progressDotActive]}
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
                  <Text style={styles.compareName}>{task.n}</Text>
                  <Badge label={task.t} />
                </Pressable>
              ) : null,
            )}
          </View>
        </View>
      ) : null}

      {onboarding.step === 'reveal' ? (
        <View style={styles.centered}>
          <Text style={styles.logoSmall}>Your Priority DNA</Text>
          <Text style={styles.title}>Top 3 Ranked</Text>
          <Text style={styles.sub}>This is the baseline your app will learn from.</Text>
          <Surface style={styles.revealCard}>
            {topThree.map((task, index) => (
              <View key={task.id} style={styles.rankRow}>
                <Text style={styles.rankMedal}>{medalForIndex(index)}</Text>
                <Text style={styles.rankEmoji}>{task.e}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankName}>{task.n}</Text>
                  <Text style={styles.rankMeta}>ELO {task.elo}</Text>
                </View>
              </View>
            ))}
          </Surface>
          <ActionButton
            label="Start Using WouldYouIQ →"
            tone="primary"
            onPress={() => {
              finishOnboarding();
              router.replace('/(tabs)/calibrate');
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
  centered: {
    width: '100%',
    alignItems: 'center',
    gap: 18,
  },
  scroll: {
    paddingTop: 84,
    paddingBottom: 36,
    gap: 18,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.t1,
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
    minHeight: 92,
    justifyContent: 'space-between',
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
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
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
