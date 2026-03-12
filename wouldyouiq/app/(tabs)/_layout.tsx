import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';

function TabLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <>
      <Text style={{ fontSize: 19 }}>{icon}</Text>
      <Text
        style={{
          fontSize: 9,
          fontFamily: Fonts.bodyBold,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(7,7,16,0.97)',
          borderTopColor: Colors.b1,
        },
        tabBarActiveTintColor: Colors.violet,
        tabBarInactiveTintColor: Colors.t3,
        tabBarLabelStyle: { fontSize: 9, fontFamily: Fonts.bodyBold },
      }}
    >
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: () => <TabLabel icon="📋" label="Tasks" />,
        }}
      />
      <Tabs.Screen
        name="calibrate"
        options={{
          tabBarLabel: 'Would You?',
          tabBarIcon: () => <TabLabel icon="⚡" label="Would You?" />,
        }}
      />
      <Tabs.Screen
        name="fyp"
        options={{
          tabBarLabel: 'For You',
          tabBarIcon: () => <TabLabel icon="✨" label="For You" />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          tabBarLabel: 'Budget',
          tabBarIcon: () => <TabLabel icon="💰" label="Budget" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: () => <TabLabel icon="⚙️" label="Settings" />,
        }}
      />
    </Tabs>
  );
}

