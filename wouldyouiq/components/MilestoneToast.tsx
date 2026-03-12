import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/tokens';

const MILESTONES = [3, 7, 14, 30, 60, 100];

type ToastState = {
  streak: number;
  visible: boolean;
} | null;

let setToastState: (s: ToastState) => void;

export function getMilestoneToast() {
  return {
    show: (streak: number) => {
      if (MILESTONES.includes(streak) && setToastState) {
        setToastState({ streak, visible: true });
      }
    },
  };
}

type MilestoneToastProps = {
  onDismiss?: () => void;
};

export function MilestoneToast({ onDismiss }: MilestoneToastProps) {
  const [state, setState] = React.useState<ToastState>(null);
  const translateY = useSharedValue(-120);

  useEffect(() => {
    setToastState = (s) => setState(s);
    return () => {
      setToastState = () => {};
    };
  }, []);

  useEffect(() => {
    if (!state?.visible) return;
    translateY.value = withSpring(0, { damping: 16 });
    const t = setTimeout(() => {
      translateY.value = withDelay(
        0,
        withSpring(-120, { damping: 20 }, () => {
          runOnJS(setState)(null);
          onDismiss?.();
        })
      );
    }, 3600);
    return () => clearTimeout(t);
  }, [state?.visible, state?.streak]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!state?.visible) return null;

  return (
    <Animated.View style={[styles.toast, style]}>
      <Text style={styles.emoji}>🔥</Text>
      <View>
        <Text style={styles.title}>{state.streak}-day streak!</Text>
        <Text style={styles.subtitle}>You’re on fire.</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.s2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gold + '60',
    zIndex: 1000,
    marginTop: 56,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.t1,
  },
  subtitle: {
    fontFamily: Fonts.bodyLight,
    fontSize: 13,
    color: Colors.t2,
    marginTop: 2,
  },
});
