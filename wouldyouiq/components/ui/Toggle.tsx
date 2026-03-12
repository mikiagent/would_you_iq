import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Colors, Fonts } from '@/constants/tokens';

type ToggleProps = {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
};

export function Toggle({ label, value, onValueChange }: ToggleProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.s3, true: Colors.violet + '99' }}
        thumbColor={value ? Colors.violet : Colors.t3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.t1,
  },
});
