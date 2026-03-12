import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Colors, Fonts } from '@/constants/tokens';

export type FilterMode = 'all' | 'essential' | 'deadline' | 'done';

const FILTERS: { key: FilterMode; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '📋' },
  { key: 'essential', label: 'Essential', emoji: '⭐' },
  { key: 'deadline', label: 'Due Soon', emoji: '📅' },
  { key: 'done', label: 'Done', emoji: '✅' },
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
      {FILTERS.map(({ key, label, emoji }) => (
        <Pressable
          key={key}
          style={[styles.chip, active === key && styles.chipActive]}
          onPress={() => onSelect(key)}
        >
          <Text style={styles.emoji}>{emoji}</Text>
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
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.s2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.violet + '30',
    borderColor: Colors.violet,
  },
  emoji: {
    fontSize: 14,
    marginRight: 6,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.t2,
  },
  labelActive: {
    color: Colors.violet,
  },
});
