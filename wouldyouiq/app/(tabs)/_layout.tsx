import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.violet,
        tabBarInactiveTintColor: Colors.t3,
        tabBarStyle: {
          backgroundColor: Colors.s1,
          borderTopColor: Colors.s2,
        },
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.t1,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <Text style={styles.icon}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="cal"
        options={{
          title: 'Would You?',
          tabBarIcon: ({ color }) => <Text style={styles.icon}>⚡</Text>,
        }}
      />
      <Tabs.Screen
        name="fy"
        options={{
          title: 'For You',
          tabBarIcon: ({ color }) => <Text style={styles.icon}>✨</Text>,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color }) => <Text style={styles.icon}>💰</Text>,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <Text style={styles.icon}>🧠</Text>,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 22,
  },
});
