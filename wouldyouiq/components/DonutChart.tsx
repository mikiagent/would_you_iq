import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors, Fonts } from '@/constants/tokens';

type Segment = {
  key: string;
  amount: number;
  color: string;
};

export function DonutChart({
  spentPercent,
  segments,
}: {
  spentPercent: number;
  segments: Segment[];
}) {
  const size = 210;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(1, segments.reduce((sum, segment) => sum + segment.amount, 0));

  let offset = 0;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.s2}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {segments.map((segment) => {
          const dash = (segment.amount / total) * circumference;
          const circle = (
            <Circle
              key={segment.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return circle;
        })}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.percent}>{spentPercent}%</Text>
        <Text style={styles.caption}>SPENT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 210,
    height: 210,
    alignSelf: 'center',
  },
  center: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.b1,
  },
  percent: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.t1,
  },
  caption: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.t3,
    letterSpacing: 1.4,
  },
});
