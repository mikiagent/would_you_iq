import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';

export default function RunnerScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Subtask Runner</Text>
      <Text style={styles.sub}>Runner flow will be expanded here.</Text>
    </View>
  );
}

RunnerScreen.options = {
  header: () => <Stack.Screen name="runner" options={{ headerShown: false }} />,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.t1,
    marginBottom: 8,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.t2,
  },
});

