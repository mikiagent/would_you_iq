import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hydrateFromSupabase, pushToSupabase } from '@/lib/supabaseSync';
import { useUserStore } from '@/stores/userStore';
import { useTaskStore } from '@/stores/taskStore';
import { useBudgetStore } from '@/stores/budgetStore';

const PUSH_DEBOUNCE_MS = 2000;

/**
 * When user is signed in: hydrate stores from Supabase on mount,
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
      hydrateFromSupabase(userId).catch(() => {
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
