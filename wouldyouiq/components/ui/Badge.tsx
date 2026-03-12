import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Fonts } from '@/constants/tokens';

type BadgeVariant = 'default' | 'violet' | 'gold' | 'green' | 'red' | 'cyan';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
};

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: Colors.s3, text: Colors.t2 },
  violet: { bg: Colors.violet + '30', text: Colors.violet },
  gold: { bg: Colors.gold + '30', text: Colors.gold },
  green: { bg: Colors.green + '30', text: Colors.green },
  red: { bg: Colors.red + '30', text: Colors.red },
  cyan: { bg: Colors.cyan + '30', text: Colors.cyan },
};

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const { bg, text } = variantStyles[variant];
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontFamily: Fonts.body,
  },
});
