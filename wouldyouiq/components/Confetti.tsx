import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const SHAPES = ['■', '●', '▲', '★', '♦'];
const COLORS = ['#f5c842', '#a78bfa', '#34d399', '#f87171', '#22d3ee', '#3b82f6'];

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  shape: string;
  rotation: number;
  vx: number;
  vy: number;
  delay: number;
  duration: number;
};

function createParticles(count: number, origin: { x: number; y: number }): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 80 + Math.random() * 120;
    out.push({
      id: i,
      x: origin.x,
      y: origin.y,
      size: 8 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)]!,
      rotation: Math.random() * 360,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      delay: Math.random() * 150,
      duration: 1200 + Math.random() * 600,
    });
  }
  return out;
}

function ParticleView({ p }: { p: Particle }) {
  const x = useSharedValue(p.x);
  const y = useSharedValue(p.y);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(p.rotation);

  useEffect(() => {
    const gravity = 280;
    const duration = p.duration / 1000;
    opacity.value = withDelay(
      p.delay,
      withSequence(
        withTiming(1, { duration: 0.05 }),
        withDelay(duration * 0.7, withTiming(0, { duration: duration * 0.3 }))
      )
    );
    x.value = withDelay(
      p.delay,
      withTiming(p.x + p.vx * duration, {
        duration,
        easing: Easing.out(Easing.quad),
      })
    );
    y.value = withDelay(
      p.delay,
      withTiming(p.y + p.vy * duration + (gravity * duration * duration) / 2, {
        duration,
        easing: Easing.out(Easing.quad),
      })
    );
    rotate.value = withDelay(
      p.delay,
      withTiming(p.rotation + 360, { duration })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x.value,
    top: y.value,
    opacity: opacity.value,
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.Text
      style={[
        style,
        {
          fontSize: p.size,
          color: p.color,
        },
      ]}
    >
      {p.shape}
    </Animated.Text>
  );
}

type ConfettiCannonProps = {
  visible: boolean;
  particleCount?: number;
  origin?: { x: number; y: number };
};

export function ConfettiCannon({
  visible,
  particleCount = 60,
  origin = { x: W / 2, y: H / 2 },
}: ConfettiCannonProps) {
  const [particles, setParticles] = React.useState<Particle[]>([]);

  useEffect(() => {
    if (visible) {
      setParticles(createParticles(particleCount, origin));
    } else {
      setParticles([]);
    }
  }, [visible, particleCount, origin.x, origin.y]);

  if (!visible || particles.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ParticleView key={p.id} p={p} />
      ))}
    </View>
  );
}
