import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';
import { TabBar } from '@/components/TabBar';

function TabLabel({ icon }: { icon: string }) {
  return <Text style={{ fontSize: 19 }}>{icon}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.violet,
        tabBarInactiveTintColor: Colors.t3,
      }}
    >
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: () => <TabLabel icon="📋" />,
        }}
      />
      <Tabs.Screen
        name="calibrate"
        options={{
          tabBarLabel: 'Would You?',
          tabBarIcon: () => <TabLabel icon="⚡" />,
        }}
      />
      <Tabs.Screen
        name="fyp"
        options={{
          tabBarLabel: 'For You',
          tabBarIcon: () => <TabLabel icon="✨" />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          tabBarLabel: 'Budget',
          tabBarIcon: () => <TabLabel icon="💰" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: () => <TabLabel icon="⚙️" />,
        }}
      />
    </Tabs>
  );
}

