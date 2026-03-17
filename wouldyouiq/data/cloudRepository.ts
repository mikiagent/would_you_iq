import type { AppSnapshot } from '@/domain/models';
import { supabase } from '@/lib/supabase';

type CloudSnapshotRow = {
  user_id: string;
  snapshot: AppSnapshot;
  updated_at?: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
};

export const cloudRepository = {
  async loadSnapshot(userId: string) {
    const { data, error } = await supabase
      .from('app_state')
      .select('snapshot, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    return (data as Pick<CloudSnapshotRow, 'snapshot' | 'updated_at'> | null) ?? null;
  },

  async saveSnapshot(userId: string, snapshot: AppSnapshot) {
    const { error } = await supabase.from('app_state').upsert(
      {
        user_id: userId,
        snapshot,
        updated_at: new Date().toISOString(),
      } satisfies CloudSnapshotRow,
      { onConflict: 'user_id' },
    );

    if (error) throw error;
  },

  async loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, email')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    return (data as ProfileRow | null) ?? null;
  },

  async saveProfile(userId: string, snapshot: AppSnapshot) {
    const { user, onboarding, budget } = snapshot;
    const { error } = await supabase.from('profiles').upsert(
      {
        id: userId,
        name: user.name,
        avatar_url: user.avatarUrl,
        email: user.email,
        xp: user.xp,
        streak: user.streak,
        streak_last_date: user.lastCalibrationDate,
        comparisons_total: user.comparisons,
        tasks_completed: user.done,
        monthly_income: budget.income,
        onboarding_complete: onboarding.completed,
      },
      { onConflict: 'id' },
    );

    if (error) throw error;
  },
};
