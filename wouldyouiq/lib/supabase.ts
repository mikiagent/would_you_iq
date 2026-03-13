import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
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

const authStorage = Platform.OS === 'web' ? webStorage : (AsyncStorage as any);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: Platform.OS === 'web' ? typeof window !== 'undefined' : true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
