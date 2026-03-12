import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants/tokens';

type SurfaceProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
};

export function Surface({ children, style, elevated }: SurfaceProps) {
  return (
    <View style={[styles.base, elevated && styles.elevated, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.s1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.s2,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: Colors.s2,
    borderColor: Colors.s3,
  },
});
