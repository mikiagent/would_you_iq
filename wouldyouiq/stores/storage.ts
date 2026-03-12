import { createMMKV } from 'react-native-mmkv';

export const mmkv = createMMKV({ id: 'wouldyouiq' });

export const mmkvStorage = {
  getItem: (name: string): string | null => {
    try {
      return mmkv.getString(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    mmkv.set(name, value);
  },
  removeItem: (name: string): void => {
    mmkv.remove(name);
  },
};
