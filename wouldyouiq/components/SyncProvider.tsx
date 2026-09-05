import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
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
import { mockRepository } from '@/data/mockRepository';
import type { AppSnapshot } from '@/domain/models';
import { normalizeTaskWorkspace } from '@/domain/taskWorkspace';
import { useAppStore } from '@/domain/store';
import { clearAiConsent } from '@/lib/aiConsent';
import { cloudSyllabi, mergeSyllabi, recoverSyllabusScans } from '@/domain/syllabusDocuments';
import { clearLocalSyllabusFiles } from '@/lib/syllabusStorage';
import { isCloudConfigured, supabase } from '@/lib/supabase';

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
  userId: string | null;
  isSignedIn: boolean;
  isCloudConfigured: boolean;
  isSaving: boolean;
  isDirty: boolean;
  saveState: SaveState;
  saveLabel: string;
  avatarUrl: string | null;
  email: string | null;
  displayName: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  isAppleSignInAvailable: boolean;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  manualSave: () => Promise<void>;
};

const SYNC_META_KEY = 'wouldyouiq-sync-meta-v1';

const SyncContext = createContext<SyncContextValue | null>(null);

function getSnapshot(state: ReturnType<typeof useAppStore.getState>, ownerId: string): AppSnapshot {
  return {
    user: state.user,
    tasks: state.tasks,
    taskWorkspace: state.taskWorkspace,
    syllabi: cloudSyllabi(state.syllabi, ownerId),
    budget: state.budget,
    onboarding: state.onboarding,
    arena: state.arena,
    runner: state.runner,
  };
}

function getUserIdentity(sessionUser: any) {
  const metadata = sessionUser?.user_metadata ?? {};
  const identityData = sessionUser?.identities?.[0]?.identity_data ?? {};
  return {
    id: sessionUser?.id ?? null,
    email: sessionUser?.email ?? null,
    avatarUrl:
      metadata.avatar_url ??
      metadata.picture ??
      identityData.avatar_url ??
      identityData.picture ??
      null,
    name:
      metadata.full_name ??
      metadata.name ??
      identityData.full_name ??
      identityData.name ??
      sessionUser?.email?.split('@')[0] ??
      null,
  };
}

type CloudProfile = {
  name: string | null;
  avatarUrl: string | null;
  email: string | null;
};

export function SyncProvider({ children }: { children: ReactNode }) {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const hasHydrated = useAppStore((state) => state.hasHydrated);
  const user = useAppStore((state) => state.user);
  const tasks = useAppStore((state) => state.tasks);
  const taskWorkspace = useAppStore((state) => state.taskWorkspace);
  const syllabi = useAppStore((state) => state.syllabi);
  const budget = useAppStore((state) => state.budget);
  const onboarding = useAppStore((state) => state.onboarding);
  const arena = useAppStore((state) => state.arena);
  const runner = useAppStore((state) => state.runner);
  const snapshot = useMemo<AppSnapshot>(
    () => ({
      user,
      tasks,
      taskWorkspace,
      syllabi: cloudSyllabi(syllabi, sessionUser?.id),
      budget,
      onboarding,
      arena,
      runner,
    }),
    [arena, budget, onboarding, runner, sessionUser?.id, syllabi, taskWorkspace, tasks, user],
  );
  const snapshotHash = useMemo(() => JSON.stringify(snapshot), [snapshot]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedHash, setLastSavedHash] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('local');
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedCloud, setHasLoadedCloud] = useState(false);
  const [cloudProfile, setCloudProfile] = useState<CloudProfile | null>(null);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let isMounted = true;
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (isMounted) setIsAppleSignInAvailable(available);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const isSignedIn = !!sessionUser?.id;
  const isDirty = isSignedIn ? snapshotHash !== lastSavedHash : true;
  const sessionIdentity = getUserIdentity(sessionUser);
  const identity = useMemo(
    () => ({
      id: sessionIdentity.id,
      email: sessionIdentity.email ?? cloudProfile?.email ?? null,
      avatarUrl: sessionIdentity.avatarUrl ?? cloudProfile?.avatarUrl ?? null,
      name: sessionIdentity.name ?? cloudProfile?.name ?? null,
    }),
    [cloudProfile?.avatarUrl, cloudProfile?.email, cloudProfile?.name, sessionIdentity],
  );

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
      const freshSnapshot = getSnapshot(useAppStore.getState(), identity.id);
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
    if (!isCloudConfigured) {
      setSessionUser(null);
      return;
    }

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
      setCloudProfile(null);
      return;
    }

    mergeAuthIntoStore();
  }, [identity.id, mergeAuthIntoStore]);

  useEffect(() => {
    if (!identity.id || !hasHydrated) return;

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const profile = await cloudRepository.loadProfile(identity.id!);
        if (cancelled) return;
        setCloudProfile(
          profile
            ? {
                name: profile.name,
                avatarUrl: profile.avatar_url,
                email: profile.email,
              }
            : null,
        );
      } catch {
        if (!cancelled) {
          setCloudProfile(null);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, identity.id]);

  useEffect(() => {
    if (!identity.id || !hasHydrated || hasLoadedCloud) return;

    let cancelled = false;

    const hydrateFromCloud = async () => {
      try {
        const remote = await cloudRepository.loadSnapshot(identity.id!);
        if (cancelled) return;

        const localIsDirty = !!lastSavedHash && snapshotHash !== lastSavedHash;
        if (remote?.snapshot && !localIsDirty) {
          const remoteSnapshot = {
            ...remote.snapshot,
            taskWorkspace: normalizeTaskWorkspace(remote.snapshot.taskWorkspace),
            syllabi: recoverSyllabusScans(remote.snapshot.syllabi),
          };
          useAppStore.setState((state) => ({
            ...state,
            ...remoteSnapshot,
            syllabi: mergeSyllabi(remoteSnapshot.syllabi, state.syllabi, identity.id!),
            user: {
              ...remoteSnapshot.user,
              name: identity.name ?? remoteSnapshot.user.name,
              email: identity.email,
              avatarUrl: identity.avatarUrl,
            },
          }));
          const remoteHash = JSON.stringify(remoteSnapshot);
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
    if (!isCloudConfigured) {
      throw new Error('Cloud sync is not configured in this build.');
    }

    const redirectTo = getAuthRedirectUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
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

  const signInWithApple = useCallback(async () => {
    if (!isCloudConfigured) {
      throw new Error('Cloud sync is not configured in this build.');
    }

    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple is only available on iOS.');
    }

    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      throw err;
    }

    if (!credential.identityToken) {
      throw new Error('Apple sign-in did not return an identity token.');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) {
      throw error;
    }

    // Apple only provides the name on the first authorization — persist it.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fullName && data.user && !data.user.user_metadata?.full_name) {
      await supabase.auth.updateUser({ data: { full_name: fullName } }).catch(() => {});
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isCloudConfigured) {
      await supabase.auth.signOut();
    }
    // Consent to send syllabus content to a third-party AI provider belongs
    // to the person who granted it. Never carry it into another account on a
    // shared device.
    await clearAiConsent();
    await AsyncStorage.removeItem(SYNC_META_KEY);
    await useAppStore.persist.clearStorage();

    const signedOutSnapshot = mockRepository.loadSignedOutSnapshot();
    useAppStore.setState({
      ...signedOutSnapshot,
      hasHydrated: true,
      toast: null,
      guidedTour: {
        active: false,
        step: 0,
        completed: false,
      },
      tasksView: 'list',
      budgetView: 'overview',
      taskFilter: 'all',
      expandedTaskIds: [],
      collapsedTaskProjectIds: [],
    });

    setSessionUser(null);
    setHasLoadedCloud(false);
    setCloudProfile(null);
    setLastSavedHash(null);
    setSaveState('local');
  }, []);

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) {
      throw new Error('Account deletion failed. Check your connection and try again.');
    }

    if (identity.id) await clearLocalSyllabusFiles(identity.id).catch(() => undefined);
    await signOut();
  }, [identity.id, signOut]);

  const value = useMemo<SyncContextValue>(
    () => ({
      userId: identity.id,
      isSignedIn,
      isCloudConfigured,
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
      signInWithApple,
      isAppleSignInAvailable,
      signOut,
      deleteAccount,
      manualSave,
    }),
    [
      deleteAccount,
      identity.avatarUrl,
      identity.email,
      identity.id,
      identity.name,
      isAppleSignInAvailable,
      isCloudConfigured,
      isDirty,
      isSaving,
      isSignedIn,
      manualSave,
      saveState,
      signInWithApple,
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
