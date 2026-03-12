import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/stores/userStore';
import { useTaskStore } from '@/stores/taskStore';
import { useBudgetStore } from '@/stores/budgetStore';
import type { Task } from '@/types/models';
import type { BudgetItem } from '@/types/models';

/**
 * Hydrate Zustand stores from Supabase (run when user logs in).
 */
export async function hydrateFromSupabase(userId: string): Promise<void> {
  const [profileRes, tasksRes, incomeRes, itemsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('budget_income').select('amount').eq('user_id', userId).single(),
    supabase.from('budget_items').select('*').eq('user_id', userId),
  ]);

  if (profileRes.data) {
    const p = profileRes.data as Record<string, unknown>;
    useUserStore.setState({
      profile: {
        name: (p.name as string) ?? '',
        xp: (p.xp as number) ?? 0,
        streak: (p.streak as number) ?? 0,
        streakLastDate: (p.streak_last_date as string | null) ?? null,
        comparisonsTotal: (p.comparisons_total as number) ?? 0,
        tasksCompleted: (p.tasks_completed as number) ?? 0,
        monthlyIncome: (p.monthly_income as number) ?? 0,
        onboardingComplete: (p.onboarding_complete as boolean) ?? false,
      },
    });
  }

  if (tasksRes.data && Array.isArray(tasksRes.data)) {
    const tasks: Task[] = tasksRes.data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      emoji: String(row.emoji ?? '📋'),
      name: String(row.name),
      timeEstimate: String(row.time_estimate ?? ''),
      elo: Number(row.elo ?? 1200),
      essential: Boolean(row.essential),
      deadline: (row.deadline as Task['deadline']) ?? null,
      urgency: (row.urgency as Task['urgency']) ?? 'low',
      done: Boolean(row.done),
      createdAt: Number(row.created_at ?? 0),
    }));
    useTaskStore.setState({ tasks });
  }

  if (incomeRes.data && incomeRes.data !== null) {
    const amount = Number((incomeRes.data as Record<string, unknown>).amount ?? 0);
    useBudgetStore.setState({ income: amount });
  }

  if (itemsRes.data && Array.isArray(itemsRes.data)) {
    const items: BudgetItem[] = itemsRes.data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      emoji: String(row.emoji ?? '💰'),
      name: String(row.name),
      amountMonthly: Number(row.amount_monthly ?? 0),
      type: (row.type as BudgetItem['type']) ?? 'flex',
      essential: Boolean(row.essential),
      elo: Number(row.elo ?? 1200),
    }));
    useBudgetStore.setState({ items });
  }
}

/**
 * Push current store state to Supabase (run after mutations or on interval).
 */
export async function pushToSupabase(userId: string): Promise<void> {
  const profile = useUserStore.getState().profile;
  const tasks = useTaskStore.getState().tasks;
  const income = useBudgetStore.getState().income;
  const items = useBudgetStore.getState().items;

  await supabase.from('profiles').upsert(
    {
      id: userId,
      name: profile.name,
      xp: profile.xp,
      streak: profile.streak,
      streak_last_date: profile.streakLastDate,
      comparisons_total: profile.comparisonsTotal,
      tasks_completed: profile.tasksCompleted,
      monthly_income: profile.monthlyIncome,
      onboarding_complete: profile.onboardingComplete,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  await supabase.from('tasks').delete().eq('user_id', userId);
  if (tasks.length > 0) {
    const rows = tasks.map((t) => ({
      id: t.id,
      user_id: userId,
      emoji: t.emoji,
      name: t.name,
      time_estimate: t.timeEstimate,
      elo: t.elo,
      essential: t.essential,
      deadline: t.deadline,
      urgency: t.urgency,
      done: t.done,
      created_at: t.createdAt,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from('tasks').insert(rows);
  }

  await supabase.from('budget_income').upsert(
    { user_id: userId, amount: income, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );

  await supabase.from('budget_items').delete().eq('user_id', userId);
  if (items.length > 0) {
    const rows = items.map((i) => ({
      id: i.id,
      user_id: userId,
      emoji: i.emoji,
      name: i.name,
      amount_monthly: i.amountMonthly,
      type: i.type,
      essential: i.essential,
      elo: i.elo,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from('budget_items').insert(rows);
  }
}
