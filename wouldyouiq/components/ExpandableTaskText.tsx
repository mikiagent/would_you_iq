import { useState } from 'react';
import { Pressable, Text, type StyleProp, type TextStyle } from 'react-native';

import { truncateTaskName } from '@/domain/logic';

export function ExpandableTaskText({
  value,
  style,
  maxLength = 16,
  numberOfLines = 1,
}: {
  value: string;
  style?: StyleProp<TextStyle>;
  maxLength?: number;
  numberOfLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const truncated = truncateTaskName(value, maxLength);
  const isTruncated = truncated !== value.trim();

  if (!isTruncated) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {value}
      </Text>
    );
  }

  return (
    <Pressable onPress={() => setExpanded((current) => !current)}>
      <Text style={style} numberOfLines={expanded ? undefined : numberOfLines}>
        {expanded ? value : truncated}
      </Text>
    </Pressable>
  );
}
