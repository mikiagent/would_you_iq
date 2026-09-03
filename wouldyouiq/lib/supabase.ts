import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.');
}

const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

const webStorage =
  typeof window !== 'undefined' && window.localStorage
    ? {
        getItem: async (key: string) => window.localStorage.getItem(key),
        setItem: async (key: string, value: string) => {
          window.localStorage.setItem(key, value);
        },
        removeItem: async (key: string) => {
          window.localStorage.removeItem(key);
        },
      }
    : noopStorage;

// Auth sessions exceed SecureStore's 2 KB item limit, so store the session
// AES-encrypted in AsyncStorage with the per-item key held in SecureStore
// (the pattern from the Supabase Expo docs).
class LargeSecureStore {
  private async encrypt(key: string, value: string) {
    const encryptionKey = Crypto.getRandomBytes(32);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string) {
    try {
      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) return null;
      return await this.decrypt(key, encrypted);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string) {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}

const authStorage = Platform.OS === 'web' ? webStorage : new LargeSecureStore();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: Platform.OS === 'web' ? typeof window !== 'undefined' : true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
