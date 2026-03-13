import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

type Burst = {
  id: number;
  x: number;
  y: number;
  count: number;
};

type TriggerOptions = {
  x?: number;
  y?: number;
  count?: number;
};

export function useConfettiOverlay() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const viewport = useMemo(() => Dimensions.get('window'), []);

  const triggerConfetti = useCallback((options: TriggerOptions = {}) => {
    const count = options.count ?? 42;
    const x = options.x ?? viewport.width / 2;
    const y = options.y ?? viewport.height * 0.42;

    setBursts((current) => [
      ...current,
      {
        id: Date.now() + Math.round(Math.random() * 1000),
        x,
        y,
        count,
      },
    ]);
  }, [viewport.height, viewport.width]);

  const overlay = (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map((burst) => (
        <ConfettiCannon
          key={burst.id}
          autoStart
          fadeOut
          count={burst.count}
          fallSpeed={2800}
          explosionSpeed={280}
          origin={{ x: burst.x, y: burst.y }}
          onAnimationEnd={() => {
            setBursts((current) => current.filter((entry) => entry.id !== burst.id));
          }}
        />
      ))}
    </View>
  );

  return { confettiOverlay: overlay, triggerConfetti };
}
