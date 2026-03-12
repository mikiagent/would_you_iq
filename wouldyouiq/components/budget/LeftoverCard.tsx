import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/tokens';
import { Surface } from '@/components/ui/Surface';

type LeftoverCardProps = {
  amount: number;
};

export function LeftoverCard({ amount }: LeftoverCardProps) {
  const isNegative = amount < 0;

  return (
    <Surface style={[styles.card, isNegative && styles.cardNegative]}>
      <Text style={styles.label}>Remaining / Save Budget</Text>
      <Text style={styles.sub}>Surplus after expenses</Text>
      <Text style={[styles.amount, isNegative && styles.amountNegative]}>
        ${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.green,
  },
  cardNegative: {
    borderLeftColor: Colors.red,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.t1,
    marginBottom: 2,
  },
  sub: {
    fontFamily: Fonts.bodyLight,
    fontSize: 12,
    color: Colors.t2,
    marginBottom: 8,
  },
  amount: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.green,
  },
  amountNegative: {
    color: Colors.red,
  },
});
