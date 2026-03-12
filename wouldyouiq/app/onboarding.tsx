import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useUserStore } from '@/stores/userStore';
import { useTaskStore } from '@/stores/taskStore';
import type { Task } from '@/types/models';
import { OB_TASKS } from '@/constants/onboarding';
import { Colors, Fonts } from '@/constants/tokens';
import { ConfettiCannon } from '@/components/Confetti';

const { width: W } = Dimensions.get('window');

type Step = 0 | 1 | 2 | 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, setName, setOnboardingComplete } = useUserStore();
  const { addTask, tasks, applyEloUpdate, getSortedTasks } = useTaskStore();

  const [step, setStep] = useState<Step>(0);
  const [name, setNameLocal] = useState(profile.name || '');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tournamentRound, setTournamentRound] = useState(0);
  const [tournamentPairs, setTournamentPairs] = useState<[Task, Task][]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const selectedTaskData = useMemo(() => {
    return Array.from(selected).map((i) => ({ index: i, ...OB_TASKS[i] }));
  }, [selected]);

  const currentPair = tournamentPairs[tournamentRound];
  const sortedForDNA = useMemo(() => getSortedTasks(false), [tasks, getSortedTasks]);
  const topThree = sortedForDNA.filter((t) => !t.done).slice(0, 3);

  const handleNextFromName = () => {
    if (name.trim()) {
      setName(name.trim());
      setStep(1);
    }
  };

  const handleTogglePriority = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleNextFromPriorities = () => {
    if (selected.size < 4) return;
    const ids: string[] = [];
    selectedTaskData.forEach(({ emoji, name }) => {
      const id = addTask({
        emoji,
        name,
        timeEstimate: '',
        essential: false,
        deadline: null,
        urgency: 'low',
      });
      ids.push(id);
    });
    const allTasks = useTaskStore.getState().tasks;
    const added = ids.map((id) => allTasks.find((t) => t.id === id)!).filter(Boolean);
    const pairs: [Task, Task][] = [];
    for (let i = 0; i < 3; i++) {
      const a = added[i % added.length]!;
      const b = added[(i + 1) % added.length]!;
      pairs.push([a, b]);
    }
    setTournamentPairs(pairs);
    setTournamentRound(0);
    setStep(2);
  };

  const handleTournamentPick = (winner: Task, loser: Task) => {
    applyEloUpdate(winner.id, loser.id);
    if (tournamentRound >= 2) {
      setStep(3);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    } else {
      setTournamentRound((r) => r + 1);
    }
  };

  const handleStartApp = () => {
    setOnboardingComplete();
    router.replace('/(tabs)/cal');
  };

  if (step === 0) {
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
          <Text style={styles.logo}>⚡ WouldYouIQ</Text>
          <Text style={styles.tagline}>Discover what matters most.</Text>
          <Text style={styles.question}>What's your name?</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setNameLocal}
            placeholder="Your name"
            placeholderTextColor={Colors.t3}
            autoCapitalize="words"
          />
          <Pressable
            style={[styles.cta, !name.trim() && styles.ctaDisabled]}
            onPress={handleNextFromName}
            disabled={!name.trim()}
          >
            <Text style={styles.ctaText}>Let's go →</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (step === 1) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Pick your priorities</Text>
          <Text style={styles.subtitle}>Choose at least 4 (tap to select)</Text>
          <View style={styles.chipGrid}>
            {OB_TASKS.map((t, i) => (
              <Pressable
                key={i}
                style={[styles.chip, selected.has(i) && styles.chipSelected]}
                onPress={() => handleTogglePriority(i)}
              >
                <Text style={styles.chipEmoji}>{t.emoji}</Text>
                <Text style={styles.chipLabel} numberOfLines={1}>{t.name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.progressDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.dot, i === 1 ? styles.dotActive : null]}
              />
            ))}
          </View>
          <Pressable
            style={[styles.cta, selected.size < 4 && styles.ctaDisabled]}
            onPress={handleNextFromPriorities}
            disabled={selected.size < 4}
          >
            <Text style={styles.ctaText}>Next →</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (step === 2 && currentPair) {
    const [a, b] = currentPair;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Which would you do first?</Text>
        <Text style={styles.subtitle}>Tap your choice ({tournamentRound + 1}/3)</Text>
        <View style={styles.tournamentRow}>
          <Pressable
            style={[styles.tournamentCard, styles.challengerCard]}
            onPress={() => handleTournamentPick(a, b)}
          >
            <Text style={styles.tournamentEmoji}>{a.emoji}</Text>
            <Text style={styles.tournamentName}>{a.name}</Text>
          </Pressable>
          <Text style={styles.vs}>VS</Text>
          <Pressable
            style={[styles.tournamentCard, styles.defenderCard]}
            onPress={() => handleTournamentPick(b, a)}
          >
            <Text style={styles.tournamentEmoji}>{b.emoji}</Text>
            <Text style={styles.tournamentName}>{b.name}</Text>
          </Pressable>
        </View>
        <View style={styles.progressDots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, i <= tournamentRound ? styles.dotActive : null]}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ConfettiCannon visible={showConfetti} particleCount={80} />
      <ScrollView contentContainerStyle={styles.dnaContent}>
        <Text style={styles.dnaTitle}>Your Priority DNA</Text>
        <Text style={styles.dnaSubtitle}>Top 3 from your choices</Text>
        {topThree.map((t, i) => (
          <View key={t.id} style={styles.dnaRow}>
            <Text style={styles.medal}>{['🥇', '🥈', '🥉'][i]}</Text>
            <Text style={styles.dnaEmoji}>{t.emoji}</Text>
            <Text style={styles.dnaName}>{t.name}</Text>
          </View>
        ))}
        <Pressable style={styles.cta} onPress={handleStartApp}>
          <Text style={styles.ctaText}>Start Using WouldYouIQ →</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    padding: 24,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingVertical: 24,
  },
  card: {
    backgroundColor: Colors.s1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.s2,
    padding: 28,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.gold,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: Fonts.bodyLight,
    fontSize: 16,
    color: Colors.t2,
    marginBottom: 32,
  },
  question: {
    fontFamily: Fonts.body,
    fontSize: 18,
    color: Colors.t1,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.s2,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: Colors.t1,
    marginBottom: 24,
  },
  cta: {
    backgroundColor: Colors.violet,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.bg,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.t1,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    color: Colors.t2,
    textAlign: 'center',
    marginBottom: 24,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.s2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: Colors.violet,
    backgroundColor: Colors.violet + '25',
  },
  chipEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  chipLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.t1,
    maxWidth: 100,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.s3,
  },
  dotActive: {
    backgroundColor: Colors.violet,
    width: 24,
  },
  tournamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 24,
    gap: 16,
  },
  tournamentCard: {
    flex: 1,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  challengerCard: {
    backgroundColor: Colors.challengerBg,
    borderColor: Colors.redB,
  },
  defenderCard: {
    backgroundColor: Colors.defenderBg,
    borderColor: Colors.blue,
  },
  tournamentEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  tournamentName: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.t1,
    textAlign: 'center',
  },
  vs: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.t2,
  },
  dnaContent: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  dnaTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.gold,
    marginBottom: 8,
  },
  dnaSubtitle: {
    fontFamily: Fonts.bodyLight,
    fontSize: 16,
    color: Colors.t2,
    marginBottom: 32,
  },
  dnaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.s1,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.s2,
  },
  medal: {
    fontSize: 28,
    marginRight: 12,
  },
  dnaEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  dnaName: {
    fontFamily: Fonts.body,
    fontSize: 18,
    color: Colors.t1,
    flex: 1,
  },
});
