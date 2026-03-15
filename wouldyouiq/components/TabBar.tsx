import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Layout, isDesktopWidth } from '@/constants/layout';
import { Colors, Fonts } from '@/constants/tokens';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && isDesktopWidth(width);

  if (desktop) {
    return null;
  }

  return (
    <View style={[styles.container, desktop && styles.containerDesktop]}>
      {state.routes.map((route, index) => {
        if (route.name === 'ai-magic') {
          return null;
        }

        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        if ((options as { href?: string | null }).href === null) {
          return null;
        }
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const icon = (options.tabBarIcon as any)?.({
          focused: isFocused,
          color: isFocused ? Colors.violet : Colors.t3,
          size: 20,
        });

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={[styles.item, desktop && styles.itemDesktop]}>
            <View style={styles.iconWrap}>{icon}</View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>{label as string}</Text>
            <View style={[styles.underline, isFocused && styles.underlineActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingBottom: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.b1,
    backgroundColor: 'rgba(7,7,16,0.96)',
  },
  containerDesktop: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingTop: 10,
    paddingBottom: 16,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDesktop: {
    maxWidth: 180,
  },
  iconWrap: {
    marginBottom: 2,
  },
  label: {
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.t3,
  },
  labelActive: {
    color: Colors.violet,
  },
  underline: {
    marginTop: 4,
    width: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  underlineActive: {
    width: 26,
    backgroundColor: Colors.violet,
  },
});
