import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/tokens';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = Math.max(insets.bottom, 14);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.violet,
        tabBarInactiveTintColor: Colors.t3,
        tabBarStyle: {
          backgroundColor: 'rgba(7,7,16,0.97)',
          borderTopWidth: 1,
          borderTopColor: Colors.b1,
          paddingBottom: tabBarPaddingBottom,
          height: 56 + tabBarPaddingBottom,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          fontFamily: Fonts.bodyBold,
        },
        tabBarIconStyle: { marginBottom: -2 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="cal"
        options={{
          title: 'Would You?',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>⚡</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="fy"
        options={{
          title: 'For You',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>✨</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>💰</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>⚙️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 19,
  },
  iconActive: {
    transform: [{ scale: 1.3 }],
  },
});
