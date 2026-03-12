import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/types/models';
import { mmkvStorage } from './storage';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const defaultProfile: UserProfile = {
  name: '',
  avatarUrl: null,
  email: null,
  xp: 0,
  streak: 0,
  streakLastDate: null,
  comparisonsTotal: 0,
  tasksCompleted: 0,
  monthlyIncome: 0,
  onboardingComplete: false,
};

interface UserStore {
  profile: UserProfile;
  setName: (name: string) => void;
  /** Merge auth user info into profile (e.g. after sign-in); only sets non-empty values. */
  setProfileFromAuth: (data: { name?: string; avatarUrl?: string | null; email?: string | null }) => void;
  addXP: (amount: number) => void;
  incrementStreak: () => void;
  incrementComparisons: () => void;
  incrementTasksDone: () => void;
  setOnboardingComplete: () => void;
  setMonthlyIncome: (amount: number) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: defaultProfile,

      setName: (name) =>
        set((s) => ({
          profile: { ...s.profile, name },
        })),

      setProfileFromAuth: (data) =>
        set((s) => ({
          profile: {
            ...s.profile,
            ...(data.name != null && data.name !== '' && { name: data.name }),
            ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
            ...(data.email !== undefined && { email: data.email }),
          },
        })),

      addXP: (amount) =>
        set((s) => ({
          profile: { ...s.profile, xp: s.profile.xp + amount },
        })),

      incrementStreak: () =>
        set((s) => {
          const today = todayStr();
          if (s.profile.streakLastDate === today) return s;
          const last = s.profile.streakLastDate;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().slice(0, 10);
          const newStreak = last === yesterdayStr ? s.profile.streak + 1 : 1;
          return {
            profile: {
              ...s.profile,
              streak: newStreak,
              streakLastDate: today,
            },
          };
        }),

      incrementComparisons: () =>
        set((s) => ({
          profile: {
            ...s.profile,
            comparisonsTotal: s.profile.comparisonsTotal + 1,
          },
        })),

      incrementTasksDone: () =>
        set((s) => ({
          profile: {
            ...s.profile,
            tasksCompleted: s.profile.tasksCompleted + 1,
          },
        })),

      setOnboardingComplete: () =>
        set((s) => ({
          profile: { ...s.profile, onboardingComplete: true },
        })),

      setMonthlyIncome: (amount) =>
        set((s) => ({
          profile: { ...s.profile, monthlyIncome: amount },
        })),
    }),
    {
      name: 'wouldyouiq-user',
      storage: {
        getItem: (name) => {
          const v = mmkvStorage.getItem(name);
          return v ? Promise.resolve({ state: JSON.parse(v) }) : Promise.resolve(null);
        },
        setItem: (name, value) => {
          mmkvStorage.setItem(name, JSON.stringify(value.state));
          return Promise.resolve();
        },
        removeItem: (name) => {
          mmkvStorage.removeItem(name);
          return Promise.resolve();
        },
      },
    }
  )
);
