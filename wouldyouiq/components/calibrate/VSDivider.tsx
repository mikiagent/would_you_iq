import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Fonts } from '@/constants/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const THRESH = 0.35;

export const DRAG_THRESHOLD = SCREEN_W * THRESH;

type VSDividerProps = {
  label?: string;
};

export function VSDivider({ label = 'VS' }: VSDividerProps) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <View style={styles.chip}>
        <Text style={styles.chipText}>{label}</Text>
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.s3,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 8,
    backgroundColor: Colors.s3,
    borderRadius: 999,
  },
  chipText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.t2,
  },
});
