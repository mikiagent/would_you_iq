import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hydrateFromSupabase, pushToSupabase } from '@/lib/supabaseSync';
import { useUserStore } from '@/stores/userStore';
import { useTaskStore } from '@/stores/taskStore';
import { useBudgetStore } from '@/stores/budgetStore';

const PUSH_DEBOUNCE_MS = 2000;

/** Pull name, avatar, email from Supabase Auth user (e.g. Google). */
function getAuthProfile(session: { user: { user_metadata?: Record<string, unknown>; email?: string | null } }) {
  const m = session.user?.user_metadata ?? {};
  return {
    name: (m.full_name as string) ?? (m.name as string) ?? '',
    avatarUrl: (m.avatar_url as string) ?? (m.picture as string) ?? null,
    email: session.user?.email ?? null,
  };
}

/**
 * When user is signed in: hydrate stores from Supabase, merge in auth user info so profile updates,
 * then push store changes to Supabase after a debounce.
 */
export function SyncManager() {
  const { session } = useAuth();
  const hydrated = useRef(false);
  const pushTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      hydrated.current = false;
      return;
    }
    const userId = session.user.id;

    if (!hydrated.current) {
      hydrated.current = true;
      hydrateFromSupabase(userId)
        .then(() => {
          const authProfile = getAuthProfile(session);
          useUserStore.getState().setProfileFromAuth(authProfile);
          pushToSupabase(userId).catch(() => {});
        })
        .catch(() => {
          hydrated.current = false;
        });
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    const schedulePush = () => {
      if (pushTimeout.current) clearTimeout(pushTimeout.current);
      pushTimeout.current = setTimeout(() => {
        pushTimeout.current = null;
        pushToSupabase(userId).catch(() => {});
      }, PUSH_DEBOUNCE_MS);
    };

    const unsubUser = useUserStore.subscribe(schedulePush);
    const unsubTasks = useTaskStore.subscribe(schedulePush);
    const unsubBudget = useBudgetStore.subscribe(schedulePush);

    return () => {
      unsubUser();
      unsubTasks();
      unsubBudget();
      if (pushTimeout.current) clearTimeout(pushTimeout.current);
    };
  }, [session?.user?.id]);

  return null;
}
