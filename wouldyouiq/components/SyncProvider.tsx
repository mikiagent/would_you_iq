import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { cloudRepository } from '@/data/cloudRepository';
import type { AppSnapshot } from '@/domain/models';
import { useAppStore } from '@/domain/store';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function getAuthRedirectUrl() {
  if (Platform.OS === 'web') {
    return Linking.createURL('auth/callback');
  }

  return Linking.createURL('auth/callback', {
    scheme: 'wouldyouiq',
  });
}

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error' | 'local';

type SyncContextValue = {
  isSignedIn: boolean;
  isSaving: boolean;
  isDirty: boolean;
  saveState: SaveState;
  saveLabel: string;
  avatarUrl: string | null;
  email: string | null;
  displayName: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  manualSave: () => Promise<void>;
};

const SYNC_META_KEY = 'wouldyouiq-sync-meta-v1';

const SyncContext = createContext<SyncContextValue | null>(null);

function getSnapshot(state: ReturnType<typeof useAppStore.getState>): AppSnapshot {
  return {
    user: state.user,
    tasks: state.tasks,
    budget: state.budget,
    onboarding: state.onboarding,
    arena: state.arena,
    runner: state.runner,
  };
}

function getUserIdentity(sessionUser: any) {
  const metadata = sessionUser?.user_metadata ?? {};
  return {
    id: sessionUser?.id ?? null,
    email: sessionUser?.email ?? null,
    avatarUrl: metadata.avatar_url ?? metadata.picture ?? null,
    name: metadata.full_name ?? metadata.name ?? sessionUser?.email?.split('@')[0] ?? null,
  };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const hasHydrated = useAppStore((state) => state.hasHydrated);
  const user = useAppStore((state) => state.user);
  const tasks = useAppStore((state) => state.tasks);
  const budget = useAppStore((state) => state.budget);
  const onboarding = useAppStore((state) => state.onboarding);
  const arena = useAppStore((state) => state.arena);
  const runner = useAppStore((state) => state.runner);
  const snapshot = useMemo<AppSnapshot>(
    () => ({
      user,
      tasks,
      budget,
      onboarding,
      arena,
      runner,
    }),
    [arena, budget, onboarding, runner, tasks, user],
  );
  const snapshotHash = useMemo(() => JSON.stringify(snapshot), [snapshot]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [lastSavedHash, setLastSavedHash] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('local');
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedCloud, setHasLoadedCloud] = useState(false);

  const isSignedIn = !!sessionUser?.id;
  const isDirty = isSignedIn ? snapshotHash !== lastSavedHash : true;
  const identity = getUserIdentity(sessionUser);

  const mergeAuthIntoStore = useCallback(() => {
    if (!identity.id) return;

    useAppStore.setState((state) => ({
      user: {
        ...state.user,
        name: identity.name ?? state.user.name,
        email: identity.email,
        avatarUrl: identity.avatarUrl,
      },
    }));
  }, [identity.avatarUrl, identity.email, identity.id, identity.name]);

  const persistMeta = useCallback(async (nextHash: string | null) => {
    await AsyncStorage.setItem(
      SYNC_META_KEY,
      JSON.stringify({
        lastSavedHash: nextHash,
      }),
    );
  }, []);

  const manualSave = useCallback(async () => {
    if (!identity.id || isSaving) {
      setSaveState(identity.id ? 'saving' : 'local');
      return;
    }

    try {
      setIsSaving(true);
      setSaveState('saving');
      const freshSnapshot = getSnapshot(useAppStore.getState());
      const freshHash = JSON.stringify(freshSnapshot);
      await cloudRepository.saveSnapshot(identity.id, freshSnapshot);
      await cloudRepository.saveProfile(identity.id, freshSnapshot);
      setLastSavedHash(freshHash);
      await persistMeta(freshHash);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    } finally {
      setIsSaving(false);
    }
  }, [identity.id, isSaving, persistMeta]);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(SYNC_META_KEY).then((raw) => {
      if (!isMounted) return;
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { lastSavedHash?: string | null };
        setLastSavedHash(parsed.lastSavedHash ?? null);
      } catch {
        setLastSavedHash(null);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    supabase.auth.getSession().then(({ data }) => {
      setSessionUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [hasHydrated]);

  useEffect(() => {
    if (!identity.id) {
      setSaveState('local');
      setHasLoadedCloud(false);
      return;
    }

    mergeAuthIntoStore();
  }, [identity.id, mergeAuthIntoStore]);

  useEffect(() => {
    if (!identity.id || !hasHydrated || hasLoadedCloud) return;

    let cancelled = false;

    const hydrateFromCloud = async () => {
      try {
        const remote = await cloudRepository.loadSnapshot(identity.id!);
        if (cancelled) return;

        const localIsDirty = !!lastSavedHash && snapshotHash !== lastSavedHash;
        if (remote?.snapshot && !localIsDirty) {
          useAppStore.setState((state) => ({
            ...state,
            ...remote.snapshot,
            user: {
              ...remote.snapshot.user,
              name: identity.name ?? remote.snapshot.user.name,
              email: identity.email,
              avatarUrl: identity.avatarUrl,
            },
          }));
          const remoteHash = JSON.stringify(remote.snapshot);
          setLastSavedHash(remoteHash);
          await persistMeta(remoteHash);
          setSaveState('saved');
        } else {
          setSaveState(localIsDirty ? 'unsaved' : 'saved');
        }
      } catch {
        setSaveState('error');
      } finally {
        if (!cancelled) {
          setHasLoadedCloud(true);
        }
      }
    };

    void hydrateFromCloud();

    return () => {
      cancelled = true;
    };
  }, [
    hasHydrated,
    hasLoadedCloud,
    identity.avatarUrl,
    identity.email,
    identity.id,
    identity.name,
    lastSavedHash,
    persistMeta,
    snapshotHash,
  ]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isSignedIn) {
      setSaveState('local');
      return;
    }

    if (isSaving) {
      setSaveState('saving');
      return;
    }

    setSaveState(isDirty ? 'unsaved' : 'saved');
  }, [hasHydrated, isDirty, isSaving, isSignedIn]);

  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (!isSignedIn || !isDirty || isSaving) {
      return;
    }

    saveTimerRef.current = setTimeout(() => {
      void manualSave();
    }, 5 * 60 * 1000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [isDirty, isSaving, isSignedIn, manualSave]);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = getAuthRedirectUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error || !data?.url) {
      throw error ?? new Error('Unable to start Google sign-in.');
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      return;
    }

    const parsed = Linking.parse(result.url);
    const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
    if (!code) {
      throw new Error('Missing auth code from Google sign-in.');
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      throw exchangeError;
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
    setHasLoadedCloud(false);
    setSaveState('local');
  }, []);

  const value = useMemo<SyncContextValue>(
    () => ({
      isSignedIn,
      isSaving,
      isDirty,
      saveState,
      saveLabel:
        saveState === 'saving'
          ? 'Saving...'
          : saveState === 'saved'
          ? 'Saved ✓'
          : saveState === 'error'
          ? 'Save failed'
          : saveState === 'local'
          ? 'Local only'
          : 'Unsaved changes...',
      avatarUrl: identity.avatarUrl,
      email: identity.email,
      displayName: identity.name,
      signInWithGoogle,
      signOut,
      manualSave,
    }),
    [
      identity.avatarUrl,
      identity.email,
      identity.name,
      isDirty,
      isSaving,
      isSignedIn,
      manualSave,
      saveState,
      signInWithGoogle,
      signOut,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useCloudSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useCloudSync must be used within SyncProvider.');
  }

  return context;
}
