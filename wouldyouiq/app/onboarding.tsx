import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors, Fonts } from '@/constants/tokens';
import { initialUser } from '@/data/mockData';

export default function OnboardingScreen() {
  const [name, setName] = useState('');

  const handleContinue = () => {
    const trimmed = name.trim();
    const nextName = trimmed.length ? trimmed : initialUser.name;
    // TODO: wire to Supabase / persistent user profile
    console.log('Onboarding name:', nextName);
    router.replace('(tabs)');
  };

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.logo}>WouldYouIQ</Text>
        <Text style={styles.tagline}>
          Discover your real priorities{'\n'}through two-second choices.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="What's your name?"
          placeholderTextColor={Colors.t3}
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />
        <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={handleContinue}>
          <Text style={styles.buttonLabel}>Let&apos;s go →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 20,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 32,
    backgroundColor: 'transparent',
    color: Colors.violet,
  },
  tagline: {
    textAlign: 'center',
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.t2,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.s2,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.b2,
    paddingVertical: 14,
    paddingHorizontal: 18,
    color: Colors.t1,
    fontFamily: Fonts.body,
    fontSize: 16,
  },
  button: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: Colors.v2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: '#fff',
  },
});

