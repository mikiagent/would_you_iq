import type {
  Budget,
  BudgetItem,
  CalibrationMode,
  Task,
  User,
} from '@/domain/models';

export const COMPARISON_XP = 20;
export const ESSENTIAL_XP = 30;
export const COMPLETION_XP = 75;
export const TASK_DONE_XP = 15;

export function sortedTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.ess && !b.ess) return -1;
    if (!a.ess && b.ess) return 1;
    return b.elo - a.elo;
  });
}

export function filterTasks(tasks: Task[], filter: 'all' | 'ess' | 'due' | 'done'): Task[] {
  const base = sortedTasks(tasks);
  switch (filter) {
    case 'ess':
      return base.filter((t) => t.ess);
    case 'due':
      return base.filter((t) => t.dl != null);
    case 'done':
      return base.filter((t) => t.done);
    case 'all':
    default:
      return base.filter((t) => !t.done);
  }
}

export function applyComparisonElo(
  mode: CalibrationMode,
  a: BudgetItem | Task,
  b: BudgetItem | Task,
  winner: 'a' | 'b',
): { nextA: BudgetItem | Task; nextB: BudgetItem | Task; xpDelta: number } {
  const delta = 16;
  const winnerItem = winner === 'a' ? a : b;
  const loserItem = winner === 'a' ? b : a;

  const updatedWinner = { ...winnerItem, elo: (winnerItem.elo || 1200) + delta };
  const updatedLoser = { ...loserItem, elo: (loserItem.elo || 1200) - delta };

  if (mode === 'budget') {
    (updatedWinner as BudgetItem).comps = ((updatedWinner as BudgetItem).comps || 0) + 1;
    (updatedLoser as BudgetItem).comps = ((updatedLoser as BudgetItem).comps || 0) + 1;
  }

  return {
    nextA: winner === 'a' ? updatedWinner : updatedLoser,
    nextB: winner === 'a' ? updatedLoser : updatedWinner,
    xpDelta: COMPARISON_XP,
  };
}

export function completeTask(user: User, task: Task): { user: User; task: Task } {
  return {
    user: {
      ...user,
      xp: user.xp + TASK_DONE_XP,
      done: user.done + 1,
    },
    task: { ...task, done: true },
  };
}

export function budgetTotals(budget: Budget): {
  total: number;
  leftover: number;
  flexSpend: number;
} {
  const total = budget.items.reduce((sum, item) => sum + item.amt, 0);
  const flexSpend = budget.items
    .filter((i) => !i.ess)
    .reduce((sum, item) => sum + item.amt, 0);
  const leftover = budget.income - total;
  return { total, leftover, flexSpend };
}

