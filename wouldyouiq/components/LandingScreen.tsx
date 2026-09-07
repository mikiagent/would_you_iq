import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Fonts } from '@/constants/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';

type LandingScreenProps = {
  returning: boolean;
  onContinue: () => void;
};

export function LandingScreen({ returning, onContinue }: LandingScreenProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const compact = height < 700;
  const wide = width >= 768;
  const entrance = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      entrance.setValue(1);
      buttonScale.setValue(1);
      return;
    }
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [buttonScale, entrance, reduceMotion]);

  const animateButton = (scale: number) => {
    if (reduceMotion) return;
    Animated.spring(buttonScale, {
      toValue: scale,
      stiffness: 260,
      damping: 22,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LinearGradient
          colors={['#06070e', '#17102e', '#452078', '#7629d3']}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0.08, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="landingViolet" cx="100%" cy="65%" rx="88%" ry="62%">
              <Stop offset="0" stopColor="#963bff" stopOpacity="0.65" />
              <Stop offset="1" stopColor="#963bff" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="landingGreen" cx="0%" cy="110%" rx="85%" ry="50%">
              <Stop offset="0" stopColor="#00da8a" stopOpacity="0.42" />
              <Stop offset="1" stopColor="#00da8a" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#landingViolet)" />
          <Rect width="100%" height="100%" fill="url(#landingGreen)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, compact && styles.contentCompact]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.topline}>
            <View style={styles.statusDot} />
            <Text style={styles.eyebrow}>YOUR TIME. YOUR CALL.</Text>
          </View>

          <Animated.View
            style={[
              styles.hero,
              compact && styles.heroCompact,
              {
                opacity: entrance,
                transform: [{
                  translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
                }],
              },
            ]}
          >
            <View style={[styles.logoFrame, compact && styles.logoFrameCompact, wide && styles.logoFrameWide]}>
              <Image
                source={require('@/assets/images/icon-wouldyouiq-v5.png')}
                style={styles.logo}
                resizeMode="cover"
                accessibilityLabel="Would You? logo: a question mark and a completed task"
              />
            </View>
            <Text accessibilityRole="header" style={[styles.title, wide && styles.titleWide, compact && styles.titleCompact]}>
              Would You?
            </Text>
            <Text style={styles.subtitle}>Decide what matters.{'\n'}Make it happen.</Text>
          </Animated.View>

          <View style={styles.footer}>
            <Animated.View style={[styles.buttonWrap, { transform: [{ scale: buttonScale }] }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={returning ? 'Continue to Would You?' : 'Get started'}
                accessibilityHint={returning ? 'Opens your importance comparisons.' : 'Opens the app introduction.'}
                accessibilityState={{ disabled: opening }}
                disabled={opening}
                onHoverIn={() => { setHovered(true); animateButton(1.025); }}
                onHoverOut={() => { setHovered(false); animateButton(1); }}
                onPressIn={() => animateButton(0.975)}
                onPressOut={() => animateButton(hovered ? 1.025 : 1)}
                onPress={() => {
                  if (opening) return;
                  setOpening(true);
                  onContinue();
                }}
                style={({ pressed }) => [styles.button, hovered && styles.buttonHovered, pressed && styles.buttonPressed]}
              >
                <Text style={styles.buttonLabel}>{returning ? 'Continue' : 'Get started'}</Text>
                <Text style={styles.buttonArrow} accessible={false}>↗</Text>
              </Pressable>
            </Animated.View>
            <Text style={styles.footerNote}>One choice at a time.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06070e' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  contentCompact: { paddingTop: 20, paddingBottom: 18 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#09de83' },
  eyebrow: { color: '#c8c0df', fontFamily: Fonts.body, fontSize: 10, letterSpacing: 2.2 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 },
  heroCompact: { paddingVertical: 38 },
  logoFrame: {
    width: 172,
    height: 172,
    borderRadius: 40,
    borderCurve: 'continuous',
    backgroundColor: '#07070d',
    shadowColor: '#090012',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 10,
    marginBottom: 36,
  },
  logoFrameCompact: { width: 136, height: 136, borderRadius: 32, marginBottom: 28 },
  logoFrameWide: { width: 192, height: 192, borderRadius: 44 },
  logo: { width: '100%', height: '100%', borderRadius: 38, borderCurve: 'continuous' },
  title: { fontFamily: Fonts.display, fontSize: 34, letterSpacing: -1.7, color: '#ffffff', textAlign: 'center' },
  titleWide: { fontSize: 52, letterSpacing: -2.6 },
  titleCompact: { fontSize: 30 },
  subtitle: { color: '#ded2f4', fontFamily: Fonts.bodyLight, fontSize: 18, lineHeight: 27, textAlign: 'center', marginTop: 18 },
  footer: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: 18 },
  buttonWrap: { borderRadius: 22 },
  button: {
    minHeight: 64,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f8f5ff',
  },
  buttonHovered: { backgroundColor: '#e5ffef' },
  buttonPressed: { backgroundColor: '#d9fce8' },
  buttonLabel: { flexShrink: 1, fontFamily: Fonts.bodyBold, fontSize: 17, color: '#1c102f' },
  buttonArrow: { fontFamily: Fonts.body, fontSize: 25, color: '#1c102f', lineHeight: 28 },
  footerNote: { fontFamily: Fonts.body, fontSize: 12, color: '#d3c4e8', textAlign: 'center', letterSpacing: 0.2 },
});
