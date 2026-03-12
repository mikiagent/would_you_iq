/**
 * Default (web) storage — localStorage only. Native builds use storage.native.ts (MMKV).
 */
function createWebStorage() {
  return {
    getItem: (name: string): string | null => {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      if (typeof localStorage !== 'undefined') localStorage.setItem(name, value);
    },
    removeItem: (name: string): void => {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(name);
    },
  };
}

const _storage = createWebStorage();

export const mmkv = undefined;
export const mmkvStorage = _storage;
