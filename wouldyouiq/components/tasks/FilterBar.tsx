import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Colors, Fonts } from '@/constants/tokens';

export type FilterMode = 'all' | 'essential' | 'deadline' | 'done';

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'essential', label: '⭐ Essential' },
  { key: 'deadline', label: '📅 Due Soon' },
  { key: 'done', label: '✅ Done' },
];

type FilterBarProps = {
  active: FilterMode;
  onSelect: (mode: FilterMode) => void;
};

export function FilterBar({ active, onSelect }: FilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map(({ key, label }) => (
        <Pressable
          key={key}
          style={[styles.chip, active === key && styles.chipActive]}
          onPress={() => onSelect(key)}
        >
          <Text style={[styles.label, active === key && styles.labelActive]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 16,
    paddingBottom: 2,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.b2,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.violet,
    borderColor: Colors.violet,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t3,
  },
  labelActive: {
    color: '#fff',
  },
});
