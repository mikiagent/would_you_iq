import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/tokens';

const SIZE = 96;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CY = SIZE / 2;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

type BudgetPieChartProps = {
  essentialTotal: number;
  flexTotal: number;
  saved: number;
  income: number;
};

export function BudgetPieChart({
  essentialTotal,
  flexTotal,
  saved,
  income,
}: BudgetPieChartProps) {
  const totalSpend = essentialTotal + flexTotal;
  const pctSpent = income > 0 ? Math.round((totalSpend / income) * 100) : 0;
  const savedSafe = Math.max(0, saved);
  const total = essentialTotal + flexTotal + savedSafe;

  let start = 0;
  const essentialDeg = total > 0 ? (essentialTotal / total) * 360 : 0;
  const flexDeg = total > 0 ? (flexTotal / total) * 360 : 0;
  const savedDeg = total > 0 ? (savedSafe / total) * 360 : 0;

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <G>
          {essentialTotal > 0 && (
            <Path
              d={describeArc(CX, CY, R, start, start + essentialDeg)}
              fill="none"
              stroke={Colors.violet}
              strokeWidth={STROKE}
            />
          )}
          {essentialTotal > 0 && (start += essentialDeg)}
          {flexTotal > 0 && (
            <Path
              d={describeArc(CX, CY, R, start, start + flexDeg)}
              fill="none"
              stroke={Colors.gold}
              strokeWidth={STROKE}
            />
          )}
          {flexTotal > 0 && (start += flexDeg)}
          {saved > 0 && (
            <Path
              d={describeArc(CX, CY, R, start, start + savedDeg)}
              fill="none"
              stroke={Colors.green}
              strokeWidth={STROKE}
            />
          )}
        </G>
        <Circle cx={CX} cy={CY} r={R - STROKE - 4} fill={Colors.s1} />
        <SvgText
          x={CX}
          y={CY - 6}
          fill={Colors.t1}
          fontSize="12"
          fontFamily={Fonts.bodyBold}
          textAnchor="middle"
        >
          {pctSpent}%
        </SvgText>
        <SvgText
          x={CX}
          y={CY + 8}
          fill={Colors.t2}
          fontSize="9"
          fontFamily={Fonts.bodyLight}
          textAnchor="middle"
        >
          spent
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
