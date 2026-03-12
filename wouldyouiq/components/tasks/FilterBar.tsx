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
    gap: 7,
    marginBottom: 16,
    paddingBottom: 2,
    paddingHorizontal: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
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
  emoji: {
    fontSize: 12,
    marginRight: 4,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.t3,
  },
  labelActive: {
    color: '#fff',
  },
});
