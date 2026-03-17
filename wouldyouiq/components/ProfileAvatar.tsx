import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';

export function ProfileAvatar({
  avatarUrl,
  label,
  size = 40,
}: {
  avatarUrl: string | null | undefined;
  label: string;
  size?: number;
}) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [avatarUrl]);

  const initials = (label.trim()[0] ?? 'W').toUpperCase();
  const borderRadius = size / 2;

  if (!avatarUrl || hasImageError) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius,
          },
        ]}
      >
        <Text style={[styles.fallbackLabel, { fontSize: Math.max(13, Math.round(size * 0.34)) }]}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: avatarUrl }}
      style={[
        styles.image,
        {
          width: size,
          height: size,
          borderRadius,
        },
      ]}
      onError={() => setHasImageError(true)}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.s2,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.violet,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  fallbackLabel: {
    fontFamily: Fonts.bodyBold,
    color: '#fff',
  },
});
