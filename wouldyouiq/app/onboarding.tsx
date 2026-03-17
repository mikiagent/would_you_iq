import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ActionButton, Badge, Surface } from '@/components/primitives';
import { OB_TASKS } from '@/constants/onboarding';
import { Colors, Fonts } from '@/constants/tokens';
import { isDesktopWidth } from '@/constants/layout';
import { useAppStore } from '@/domain/store';

const SLIDE_COUNT = 5;
const SCREEN_EASE = Easing.bezier(0.34, 1, 0.64, 1);

const DEMO_COMPARISONS = [
  {
    top: { e: '💡', n: 'Work on Startup', elo: 1288, meta: '60 min' },
    bottom: { e: '💤', n: 'Sleep 8hrs', elo: 1304, meta: '8 hrs' },
    direction: 'right' as const,
    hint: '→ YES',
    result: 'Work on Startup wins · +16 ELO',
    nextTopElo: 1304,
    nextBottomElo: 1288,
  },
  {
    top: { e: '🏋️', n: 'Workout', elo: 1312, meta: '30 min' },
    bottom: { e: '🧘', n: 'Meditate', elo: 1274, meta: '10 min' },
    direction: 'left' as const,
    hint: '← NO',
    result: 'Meditate wins · +16 ELO',
    nextTopElo: 1296,
    nextBottomElo: 1290,
  },
  {
    top: { e: '📚', n: 'Study for Exam', elo: 1342, meta: '45 min' },
    bottom: { e: '📖', n: 'Read', elo: 1218, meta: '20 min' },
    direction: 'essential' as const,
    hint: '⭐ ESSENTIAL',
    result: 'Study for Exam wins · +16 ELO',
    nextTopElo: 1358,
    nextBottomElo: 1202,
  },
];

const RANKING_ROWS = [
  { e: '💡', n: 'Work on Startup', elo: 1378, width: 100 },
  { e: '📚', n: 'Study for Exam', elo: 1334, width: 84 },
  { e: '✉️', n: 'Clear Inbox', elo: 1222, width: 58 },
  { e: '🎸', n: 'Creative Practice', elo: 1160, width: 42 },
];

const SEED_TASKS = OB_TASKS.slice(0, 4);

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const onboarding = useAppStore((state) => state.onboarding);
  const finishOnboarding = useAppStore((state) => state.finishOnboarding);
  const startGuidedTour = useAppStore((state) => state.startGuidedTour);
  const [slideIndex, setSlideIndex] = useState(0);
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);

  const cardAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const screenAnim = useRef(new Animated.Value(0)).current;
  const rowAnims = useRef(RANKING_ROWS.map(() => new Animated.Value(0))).current;
  const [demoIndex, setDemoIndex] = useState(0);
  const demoFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    screenAnim.setValue(0);
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 450,
      easing: SCREEN_EASE,
      useNativeDriver: true,
    }).start();
  }, [screenAnim, slideIndex]);

  useEffect(() => {
    if (slideIndex !== 0) {
      sparkleAnim.stopAnimation();
      sparkleAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
      sparkleAnim.stopAnimation();
    };
  }, [slideIndex, sparkleAnim]);

  useEffect(() => {
    if (slideIndex !== 1) {
      cardAnim.stopAnimation();
      flashAnim.stopAnimation();
      pulseAnim.stopAnimation();
      demoFade.stopAnimation();
      cardAnim.setValue(0);
      flashAnim.setValue(0);
      pulseAnim.setValue(0);
      demoFade.setValue(1);
      return;
    }

    let active = true;
    let index = 0;
    let pulseLoop: Animated.CompositeAnimation | null = null;

    const runDemoStep = () => {
      if (!active) return;

      pulseLoop?.stop();
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 520,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 520,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );

      Animated.sequence([
        Animated.timing(demoFade, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(40),
      ]).start(() => {
        if (!active) return;

        setDemoIndex(index);
        cardAnim.setValue(0);
        flashAnim.setValue(0);
        pulseAnim.setValue(0);
        pulseLoop?.start();

        Animated.sequence([
          Animated.parallel([
            Animated.timing(demoFade, {
              toValue: 1,
              duration: 250,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(cardAnim, {
              toValue: 1,
              duration: 560,
              easing: SCREEN_EASE,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(390),
              Animated.timing(flashAnim, {
                toValue: 1,
                duration: 140,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(flashAnim, {
                toValue: 0,
                duration: 220,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.delay(900),
        ]).start(() => {
          if (!active) return;
          index = (index + 1) % DEMO_COMPARISONS.length;
          runDemoStep();
        });
      });
    };

    runDemoStep();

    return () => {
      active = false;
      pulseLoop?.stop();
      cardAnim.stopAnimation();
      flashAnim.stopAnimation();
      pulseAnim.stopAnimation();
      demoFade.stopAnimation();
    };
  }, [cardAnim, demoFade, flashAnim, pulseAnim, slideIndex]);

  useEffect(() => {
    if (slideIndex !== 2) {
      rowAnims.forEach((anim) => anim.setValue(0));
      return;
    }

    Animated.stagger(
      110,
      rowAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 420,
          easing: SCREEN_EASE,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [rowAnims, slideIndex]);

  const currentDemo = DEMO_COMPARISONS[demoIndex];
  const comparisonShift =
    currentDemo.direction === 'right'
      ? cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 24] })
      : currentDemo.direction === 'left'
      ? cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -24] })
      : cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0] });
  const comparisonTilt =
    currentDemo.direction === 'right'
      ? cardAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '5deg'] })
      : currentDemo.direction === 'left'
      ? cardAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-5deg'] })
      : cardAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '0deg'] });
  const comparisonScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const slideZeroMinHeight = Math.max(420, Math.floor(height * 0.75));
  const sparkleBounce = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const sparkleScale = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const screenStyle = useMemo(
    () => ({
      opacity: screenAnim,
      transform: [
        {
          translateY: screenAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [26, 0],
          }),
        },
        {
          scale: screenAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.97, 1],
          }),
        },
      ],
    }),
    [screenAnim],
  );

  if (onboarding.completed) {
    return <Redirect href="/(tabs)/calibrate" />;
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.orb, styles.orbViolet, desktop && styles.orbDesktop]} />
      <Animated.View style={[styles.orb, styles.orbGold]} />
      <Animated.View style={[styles.orb, styles.orbCyan]} />

      <View style={[styles.shell, desktop && styles.shellDesktop]}>
        <View style={styles.top}>
          <Text style={styles.logo}>WouldYouIQ</Text>
          {slideIndex === 0 ? (
            <Pressable style={styles.skipLink} onPress={() => setSlideIndex(SLIDE_COUNT - 1)}>
              <Text style={styles.skipLabel}>Skip to end</Text>
            </Pressable>
          ) : <View style={styles.skipSpacer} />}
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.card, screenStyle]}>
            {slideIndex === 0 ? (
              <View style={[styles.slideCenter, { minHeight: slideZeroMinHeight }]}>
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroTitle}>For You</Text>
                </View>
                <View style={styles.heroIntro}>
                  <Animated.Text
                    style={[
                      styles.heroSparkles,
                      {
                        transform: [{ translateY: sparkleBounce }, { scale: sparkleScale }],
                      },
                    ]}
                  >
                    ✨
                  </Animated.Text>
                </View>
                <Text style={styles.headline}>
                  What do you{'\n'}
                  actually <Text style={styles.headlineAccent}>value</Text>?
                </Text>
                <Text style={styles.body}>Your choices reveal it. Your lists don't.</Text>
                <View style={styles.statDivider} />
                <View style={styles.statRow}>
                  <StatChip value="2s" label="per choice" />
                  <StatChip value="ELO" label="live ranked" />
                  <StatChip value="revealed" label="by choice" />
                </View>
              </View>
            ) : null}

            {slideIndex === 1 ? (
              <>
                <Text style={styles.headline}>
                  Two things.{'\n'}
                  One <Text style={styles.headlineAccent}>wins</Text>.
                </Text>
                <Text style={styles.body}>Watch the ranking update in real time.</Text>

                <View style={[styles.demoWrap, styles.demoWrapTight]}>
                  <View style={styles.demoProgressTrack}>
                    <View
                      style={[
                        styles.demoProgressFill,
                        { width: `${((demoIndex + 1) / DEMO_COMPARISONS.length) * 100}%` },
                      ]}
                    />
                  </View>

                  <Animated.View style={[styles.resultFlash, { opacity: flashAnim }]} />

                  <Animated.View style={[styles.demoArena, { opacity: demoFade }]}>
                    <Surface style={styles.demoPrompt}>
                      <Text style={styles.demoPromptTitle}>
                        {currentDemo.top.n} &gt; {currentDemo.bottom.n}?
                      </Text>
                      <Text style={styles.demoPromptBody}>Which feels more important right now?</Text>
                    </Surface>

                    <Animated.View
                      style={[
                        styles.demoStatement,
                        {
                          transform: [{ translateX: comparisonShift as any }, { rotate: comparisonTilt as any }],
                        },
                      ]}
                    >
                      <View style={styles.demoTaskBlock}>
                        <View style={styles.demoEloRow}>
                          <Text style={styles.demoEloLabel}>ELO {currentDemo.top.elo}</Text>
                        </View>
                        <Text style={styles.demoStatementEmoji}>{currentDemo.top.e}</Text>
                        <Text style={styles.demoStatementTitle}>{currentDemo.top.n}</Text>
                      </View>

                      <View style={styles.demoCenter}>
                        <Animated.Text
                          style={[
                            styles.demoArrow,
                            {
                              transform: [{ scale: comparisonScale }],
                            },
                          ]}
                        >
                          &gt;
                        </Animated.Text>
                        <Text style={styles.demoHintText}>(MORE IMPORTANT)</Text>
                      </View>

                      <View style={styles.demoTaskBlock}>
                        <View style={styles.demoEloRow}>
                          <Text style={styles.demoEloLabel}>ELO {currentDemo.bottom.elo}</Text>
                        </View>
                        <Text style={styles.demoStatementEmoji}>{currentDemo.bottom.e}</Text>
                        <Text style={styles.demoStatementTitle}>{currentDemo.bottom.n}</Text>
                      </View>
                    </Animated.View>

                    <Surface style={styles.resultCard}>
                      <Text style={styles.resultTitle}>{currentDemo.result}</Text>
                      <Text style={styles.resultBody}>
                        {currentDemo.top.n}: {currentDemo.top.elo} → {currentDemo.nextTopElo} · {currentDemo.bottom.n}: {currentDemo.bottom.elo} → {currentDemo.nextBottomElo}
                      </Text>
                    </Surface>

                    <View style={styles.demoControls}>
                      {[
                        { key: 'right', label: '→ YES' },
                        { key: 'left', label: '← NO' },
                        { key: 'skip', label: '↑ SKIP' },
                        { key: 'essential', label: '↓ ESSENTIAL' },
                      ].map((item) => {
                        const active = currentDemo.direction === item.key;
                        return (
                          <View key={item.key} style={styles.demoControlItem}>
                            <Text
                              style={[
                                styles.demoControlLabel,
                                active && item.key === 'right' && styles.demoControlYes,
                                active && item.key === 'left' && styles.demoControlNo,
                                active && item.key === 'skip' && styles.demoControlSkip,
                                active && item.key === 'essential' && styles.demoControlEssential,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </Animated.View>
                </View>
              </>
            ) : null}

            {slideIndex === 2 ? (
              <>
                <Text style={styles.headline}>
                  Your <Text style={styles.headlineAccent}>map</Text>{'\n'}
                  emerges.
                </Text>
                <Text style={styles.body}>10 swipes builds a ranking no list could.</Text>

                <View style={styles.rankList}>
                  {RANKING_ROWS.map((row, index) => (
                    <Animated.View
                      key={row.n}
                      style={[
                        styles.rankRow,
                        {
                          opacity: rowAnims[index],
                          transform: [
                            {
                              translateY: rowAnims[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [18, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View style={styles.rankRowTop}>
                        <Text style={styles.rankName}>{row.e} {row.n}</Text>
                        <Text style={styles.rankMeta}>ELO {row.elo}</Text>
                      </View>
                      <View style={styles.rankTrack}>
                        <View style={[styles.rankFill, { width: `${row.width}%` }]} />
                      </View>
                    </Animated.View>
                  ))}
                </View>

                <Surface style={styles.callout}>
                  <Text style={styles.calloutText}>
                    You ranked email #7 — but it's eating your mornings.
                  </Text>
                </Surface>
              </>
            ) : null}

            {slideIndex === 3 ? (
              <>
                <Text style={styles.headline}>
                  The <Text style={styles.headlineAccent}>ranking</Text>{'\n'}
                  works everywhere.
                </Text>
                <Text style={styles.body}>One ranked list. Three ways it helps.</Text>

                <View style={styles.featureStack}>
                  <FeatureCard
                    emoji="✨"
                    title="Know what's next"
                    subtext="For You picks fast."
                  />
                  <FeatureCard
                    emoji="🎯"
                    title="Spot the busywork"
                    subtext="Insights catch drift."
                  />
                  <FeatureCard
                    emoji="📈"
                    title="Watch values shift"
                    subtext="History shows movement."
                  />
                </View>
              </>
            ) : null}

            {slideIndex === 4 ? (
              <>
                <Text style={styles.headline}>
                  4 tasks.{'\n'}
                  Ready to <Text style={styles.headlineAccent}>rank</Text>.
                </Text>
                <Text style={styles.body}>Edit or replace them any time.</Text>

                <View style={styles.seedStack}>
                  {SEED_TASKS.map((task) => (
                    <Surface key={task.id} style={styles.seedRow}>
                      <Text style={styles.seedEmoji}>{task.e}</Text>
                      <View style={styles.seedMeta}>
                        <Text style={styles.seedName}>{task.n}</Text>
                        <Text style={styles.seedTime}>{task.t}</Text>
                      </View>
                    </Surface>
                  ))}
                </View>
                <Text style={styles.seedHint}>Your first comparison is queued up.</Text>
              </>
            ) : null}
          </Animated.View>
        </ScrollView>

        <View style={styles.bottom}>
          <View style={styles.dots}>
            {Array.from({ length: SLIDE_COUNT }).map((_, index) => (
              <Pressable
                key={index}
                onPress={() => setSlideIndex(index)}
                style={[styles.dot, slideIndex === index && styles.dotActive]}
              />
            ))}
          </View>

          {slideIndex < SLIDE_COUNT - 1 ? (
            <View style={styles.navRow}>
              {slideIndex > 0 ? (
                <ActionButton
                  label="Back"
                  onPress={() => setSlideIndex((value) => Math.max(0, value - 1))}
                  style={styles.halfButton}
                />
              ) : (
                <View style={styles.halfButton} />
              )}
              <ActionButton
                label={slideIndex === 0 ? 'Show me →' : 'Next →'}
                tone="primary"
                onPress={() => setSlideIndex((value) => Math.min(SLIDE_COUNT - 1, value + 1))}
                style={styles.halfButton}
              />
            </View>
          ) : (
            <View style={styles.navRow}>
              <ActionButton
                label="Start clean"
                onPress={() => {
                  finishOnboarding({ useSampleTasks: false });
                  startGuidedTour();
                  router.replace('/(tabs)/tasks');
                }}
                style={styles.halfButton}
              />
              <ActionButton
                label="Add sample data"
                tone="primary"
                onPress={() => {
                  finishOnboarding({ useSampleTasks: true });
                  startGuidedTour();
                  router.replace('/(tabs)/tasks');
                }}
                style={styles.halfButton}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <Surface style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Surface>
  );
}

function FeatureCard({
  emoji,
  title,
  subtext,
}: {
  emoji: string;
  title: string;
  subtext: string;
}) {
  return (
    <Surface style={styles.featureCard}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <View style={styles.featureMeta}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtext}>{subtext}</Text>
        <View style={styles.featureFooter}>
          <Text style={styles.featureFooterText}>Every swipe sharpens all three.</Text>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0d14',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    opacity: 0.28,
  },
  orbDesktop: {
    width: 320,
    height: 320,
  },
  orbViolet: {
    top: 62,
    right: -60,
    backgroundColor: '#7c3aed',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.72,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 0 },
  },
  orbGold: {
    bottom: 200,
    left: -70,
    backgroundColor: '#f5c842',
    shadowColor: '#f5c842',
    shadowOpacity: 0.65,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 0 },
  },
  orbCyan: {
    bottom: 78,
    right: 28,
    backgroundColor: '#22d3ee',
    shadowColor: '#22d3ee',
    shadowOpacity: 0.55,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 0 },
  },
  shell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 28,
    justifyContent: 'flex-start',
  },
  shellDesktop: {
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: '#f3f0ff',
  },
  skipLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  skipSpacer: {
    width: 96,
  },
  skipLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: '#d5cff6',
  },
  card: {
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'flex-start',
    gap: 16,
    flexShrink: 1,
    minHeight: 0,
  },
  slideCenter: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    position: 'relative',
  },
  heroTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: '#fff',
  },
  heroIntro: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroSparkles: {
    fontSize: 84,
    lineHeight: 92,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 156,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 33,
    color: '#f7f5ff',
  },
  headlineAccent: {
    color: '#a78bfa',
  },
  body: {
    fontFamily: Fonts.bodyLight,
    fontSize: 14,
    lineHeight: 21,
    color: '#b5afd2',
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statChip: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    paddingVertical: 24,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: '#fff',
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#9a93ba',
  },
  statDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: '100%',
  },
  demoWrap: {
    gap: 14,
  },
  demoWrapTight: {
    minHeight: 500,
  },
  resultFlash: {
    ...StyleSheet.absoluteFillObject,
    top: 42,
    bottom: 102,
    borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.2)',
  },
  demoProgressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  demoProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#7c3aed',
  },
  demoArena: {
    flex: 1,
    minHeight: 430,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: 'rgba(9,9,14,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  demoPrompt: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  demoPromptTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  demoPromptBody: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: '#a7a1c6',
    textAlign: 'center',
  },
  demoStatement: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 18,
    paddingVertical: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  demoTaskBlock: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoEloRow: {
    marginBottom: 6,
  },
  demoEloLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: '#a78bfa',
  },
  demoStatementEmoji: {
    fontSize: 46,
  },
  demoStatementTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    color: '#fff',
  },
  demoCenter: {
    alignItems: 'center',
    gap: 2,
    marginVertical: 8,
  },
  demoArrow: {
    fontFamily: Fonts.display,
    fontSize: 68,
    lineHeight: 72,
    color: Colors.gold,
  },
  demoHintText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.gold,
  },
  demoControlItem: {
    flex: 1,
    alignItems: 'center',
  },
  demoControlLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: '#6f698f',
  },
  demoControlYes: {
    color: Colors.green,
  },
  demoControlNo: {
    color: Colors.red,
  },
  demoControlSkip: {
    color: '#b5afd2',
  },
  demoControlEssential: {
    color: Colors.gold,
  },
  demoProgressDotActive: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#7c3aed',
  },
  resultCard: {
    padding: 12,
    borderRadius: 16,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 12,
  },
  resultTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: '#fff',
  },
  resultBody: {
    fontFamily: Fonts.bodyLight,
    fontSize: 11,
    lineHeight: 16,
    color: '#a7a1c6',
  },
  demoControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  rankList: {
    gap: 10,
  },
  rankRow: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  rankRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rankName: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
  rankMeta: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: '#a78bfa',
  },
  rankTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  rankFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#7c3aed',
  },
  callout: {
    padding: 16,
    backgroundColor: 'rgba(34,211,238,0.06)',
    borderColor: 'rgba(34,211,238,0.16)',
  },
  calloutText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    lineHeight: 20,
    color: '#e7faff',
  },
  featureStack: {
    gap: 10,
  },
  featureCard: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 18,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: '#fff',
  },
  featureMeta: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  featureSubtext: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: '#9a93ba',
  },
  featureFooter: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  featureFooterText: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: '#9a93ba',
  },
  seedStack: {
    gap: 10,
  },
  seedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  seedEmoji: {
    fontSize: 26,
  },
  seedMeta: {
    flex: 1,
    minWidth: 0,
  },
  seedName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
  seedTime: {
    marginTop: 2,
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: '#a7a1c6',
  },
  seedHint: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: '#9a93ba',
    textAlign: 'center',
  },
  bottom: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    paddingTop: 20,
    gap: 14,
    paddingBottom: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#7c3aed',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
});
