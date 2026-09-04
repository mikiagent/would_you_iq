import type {
  AppSnapshot,
  ArenaMode,
  ArenaSwipe,
  Budget,
  BudgetInsight,
  BudgetItem,
  BudgetType,
  Deadline,
  OnboardingOption,
  Subtask,
  Task,
  TaskFilter,
  TaskInsight,
  TaskWorkspace,
  User,
} from './models.ts';
import { DEFAULT_TASK_PROJECT_ID } from './taskWorkspace.ts';

export const COMPARISON_XP = 20;
export const ESSENTIAL_XP = 30;
export const COMPLETION_XP = 75;
export const TASK_DONE_XP = 30;
const LEVEL_BASE_XP = 1000;
const LEVEL_RATIO = 1.2;

const GOLD_ELO = 1300;
const LOW_ELO = 1125;

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function levelRequirement(level: number) {
  return Math.round(LEVEL_BASE_XP * LEVEL_RATIO ** Math.max(0, level - 1));
}

export function getLevelInfo(xp: number) {
  let level = 1;
  let spent = 0;
  let needed = levelRequirement(level);

  while (xp >= spent + needed) {
    spent += needed;
    level += 1;
    needed = levelRequirement(level);
  }

  const current = xp - spent;
  const progress = needed > 0 ? current / needed : 1;

  return {
    level,
    current,
    needed,
    progress,
    nextLevelXp: spent + needed,
    previousLevelXp: spent,
  };
}

export function deadlineToUrgency(deadline: Deadline) {
  if (deadline === 'today') return 'high';
  if (deadline === 'this week') return 'med';
  return 'low';
}

export function medalForIndex(index: number) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `${index + 1}`;
}

export function truncateTaskName(value: string, maxLength = 16) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function buildOnboardingSeedTasks(options: OnboardingOption[]) {
  return options.map((option, index) => {
    const subtasks = buildDefaultSubtasks(option.id);

    return {
      id: createId('task'),
      e: option.e,
      n: option.n,
      t: option.t,
      elo: 1200 - index * 5,
      ess: false,
      dl: index === 1 ? 'today' : index === 2 ? 'this week' : null,
      urg: index === 1 ? 'high' : index === 2 ? 'med' : 'low',
      done: false,
      detail: buildTaskDetail(option.n),
      projectId: DEFAULT_TASK_PROJECT_ID,
      createdAt: Date.now() + index,
      order: index,
      subtasks,
    } satisfies Task;
  });
}

export function buildTournamentPairs(tasks: Task[]) {
  const ids = tasks.map((task) => task.id);
  const pairs: Array<[string, string]> = [];

  for (let index = 0; index < ids.length && pairs.length < 3; index += 1) {
    const a = ids[index];
    const b = ids[(index + 1) % ids.length];

    if (a && b && a !== b) {
      pairs.push([a, b]);
    }
  }

  while (pairs.length < 3 && ids.length >= 2) {
    pairs.push([ids[0], ids[ids.length - 1]]);
  }

  return pairs.slice(0, 3);
}

export function applyTaskComparison(
  tasks: Task[],
  aId: string,
  bId: string,
  winnerId: string,
) {
  return tasks.map((task) => {
    if (task.id === winnerId) return { ...task, elo: task.elo + 16 };
    if (task.id === aId || task.id === bId) return { ...task, elo: task.elo - 16 };
    return task;
  });
}

export function sortedTasks(tasks: Task[], includeDone = true) {
  const urgencyWeight = { high: 3, med: 2, low: 0 } as const;

  return [...tasks]
    .filter((task) => includeDone || !task.done)
    .sort((left, right) => {
      if (left.ess && !right.ess) return -1;
      if (!left.ess && right.ess) return 1;
      if (!left.done && right.done) return -1;
      if (left.done && !right.done) return 1;

      const urgencyDelta = urgencyWeight[right.urg] - urgencyWeight[left.urg];
      if (urgencyDelta !== 0) return urgencyDelta;

      return right.elo - left.elo;
    });
}

export function filterTasks(tasks: Task[], filter: TaskFilter) {
  const ordered = [...tasks].sort((left, right) => left.order - right.order);

  if (filter === 'ess') return ordered.filter((task) => task.ess);
  if (filter === 'due') return ordered.filter((task) => task.dl !== null && !task.done);
  if (filter === 'done') return ordered.filter((task) => task.done);
  return ordered.filter((task) => !task.done);
}

export function getTaskProgress(task: Task) {
  const total = task.subtasks.length;
  const complete = task.subtasks.filter((subtask) => subtask.done).length;

  return { complete, total };
}

export function getForYouQueue(tasks: Task[]) {
  return sortedTasks(tasks, false).sort((left, right) => {
    if (left.ess && !right.ess) return -1;
    if (!left.ess && right.ess) return 1;
    if (left.dl === 'today' && right.dl !== 'today') return -1;
    if (left.dl !== 'today' && right.dl === 'today') return 1;
    if (left.dl === 'this week' && right.dl === null) return -1;
    if (left.dl === null && right.dl === 'this week') return 1;
    return right.elo - left.elo;
  });
}

export function getArenaItems(
  mode: ArenaMode,
  tasks: Task[],
  budget: Budget,
  taskWorkspace: TaskWorkspace,
) {
  if (mode === 'projects') {
    return taskWorkspace.projects;
  }

  if (mode === 'tasks') {
    return tasks.filter((task) => !task.done && !task.ess);
  }

  return budget.items.filter((item) => !item.ess);
}

export function ensureArenaPair(
  mode: ArenaMode,
  tasks: Task[],
  budget: Budget,
  taskWorkspace: TaskWorkspace,
  championId: string | null,
  challengerId: string | null,
  rotationIndex: number,
) {
  const items = getArenaItems(mode, tasks, budget, taskWorkspace);

  if (items.length < 2) {
    return {
      championId: null,
      challengerId: null,
      rotationIndex: 0,
    };
  }

  const ranked = [...items].sort((left, right) => right.elo - left.elo);
  const nextChampionId = ranked.some((item) => item.id === championId) ? championId : ranked[0].id;
  const challengers = ranked.filter((item) => item.id !== nextChampionId);

  let nextChallengerId = challengerId;
  if (!challengers.some((item) => item.id === nextChallengerId)) {
    nextChallengerId = challengers[rotationIndex % challengers.length]?.id ?? null;
  }

  if (nextChallengerId === nextChampionId) {
    nextChallengerId = challengers[0]?.id ?? null;
  }

  return {
    championId: nextChampionId,
    challengerId: nextChallengerId,
    rotationIndex,
  };
}

export function nextArenaRotation(
  mode: ArenaMode,
  tasks: Task[],
  budget: Budget,
  taskWorkspace: TaskWorkspace,
  championId: string | null,
  currentRotation: number,
) {
  const items = getArenaItems(mode, tasks, budget, taskWorkspace).filter((item) => item.id !== championId);

  if (!items.length) return 0;
  return (currentRotation + 1) % items.length;
}

export function applyArenaResult(
  mode: ArenaMode,
  tasks: Task[],
  budget: Budget,
  taskWorkspace: TaskWorkspace,
  championId: string,
  challengerId: string,
  swipe: Extract<ArenaSwipe, 'champion' | 'challenger'>,
) {
  if (mode === 'projects') {
    const winnerId = swipe === 'champion' ? championId : challengerId;
    return {
      tasks,
      budget,
      taskWorkspace: {
        ...taskWorkspace,
        projects: taskWorkspace.projects.map((project) => {
          if (project.id === winnerId) return { ...project, elo: project.elo + 16 };
          if (project.id === championId || project.id === challengerId) {
            return { ...project, elo: project.elo - 16 };
          }
          return project;
        }),
      },
      championId: winnerId,
      xpDelta: COMPARISON_XP,
      comparisonsDelta: 1,
    };
  }

  if (mode === 'tasks') {
    const winnerId = swipe === 'champion' ? championId : challengerId;
    const nextTasks = tasks.map((task) => {
      if (task.id === winnerId) return { ...task, elo: task.elo + 16 };
      if (task.id === championId || task.id === challengerId) {
        return { ...task, elo: task.elo - 16 };
      }
      return task;
    });

    return {
      tasks: nextTasks,
      budget,
      taskWorkspace,
      championId: winnerId,
      xpDelta: COMPARISON_XP,
      comparisonsDelta: 1,
    };
  }

  const nextItems = budget.items.map((item) => {
    if (item.id === championId || item.id === challengerId) {
      const didWin =
        (swipe === 'champion' && item.id === championId) ||
        (swipe === 'challenger' && item.id === challengerId);

      return {
        ...item,
        elo: item.elo + (didWin ? 16 : -16),
        comps: item.comps + 1,
      };
    }

    return item;
  });

  return {
    tasks,
    budget: { ...budget, items: nextItems },
    taskWorkspace,
    championId: swipe === 'champion' ? championId : challengerId,
    xpDelta: COMPARISON_XP,
    comparisonsDelta: 1,
  };
}

export function markTaskDone(user: User, task: Task, awardXp = true) {
  if (task.done) {
    return { user, task };
  }

  return {
    user: {
      ...user,
      xp: awardXp ? user.xp + TASK_DONE_XP : user.xp,
      done: user.done + 1,
    },
    task: { ...task, done: true },
  };
}

export function budgetTotals(budget: Budget) {
  const essentials = budget.items
    .filter((item) => item.type === 'ess' || item.ess)
    .reduce((sum, item) => sum + item.amt, 0);
  const flexible = budget.items
    .filter((item) => item.type === 'flex' && !item.ess)
    .reduce((sum, item) => sum + item.amt, 0);
  const total = essentials + flexible;
  const leftover = Math.max(0, budget.income - total);
  const overspend = Math.max(0, total - budget.income);
  const spentPercent = budget.income ? Math.round((total / budget.income) * 100) : 0;

  return {
    total,
    essentials,
    flexible,
    leftover,
    overspend,
    spentPercent,
  };
}

export function budgetSegments(budget: Budget) {
  const totals = budgetTotals(budget);

  return [
    { key: 'essentials', label: 'Essentials', amount: totals.essentials, color: '#9f8cff' },
    { key: 'flexible', label: 'Flexible', amount: totals.flexible, color: '#ffad4f' },
    { key: 'saved', label: 'Saved', amount: totals.leftover, color: '#56d68a' },
  ];
}

export function getBudgetFlaggedItems(budget: Budget) {
  return budget.items.filter((item) => {
    if (item.ess || item.type === 'ess') return false;
    return budget.income > 0 && item.amt / budget.income > 0.05;
  });
}

export function getBudgetEloTone(item: BudgetItem) {
  if (item.elo >= GOLD_ELO) return 'positive' as const;
  if (item.elo <= LOW_ELO) return 'negative' as const;
  return 'neutral' as const;
}

export function getTaskEloTone(task: Task) {
  if (task.elo >= GOLD_ELO) return 'gold' as const;
  if (task.elo >= 1225) return 'green' as const;
  if (task.elo <= LOW_ELO) return 'danger' as const;
  return 'violet' as const;
}

export function getEmojiPreferenceInsights(tasks: Task[]) {
  const emojiStats = new Map<
    string,
    { totalElo: number; count: number; taskCount: number; subtaskCount: number }
  >();

  const accumulate = (emoji: string, elo: number, source: 'task' | 'subtask') => {
    const current = emojiStats.get(emoji) ?? {
      totalElo: 0,
      count: 0,
      taskCount: 0,
      subtaskCount: 0,
    };

    emojiStats.set(emoji, {
      totalElo: current.totalElo + elo,
      count: current.count + 1,
      taskCount: current.taskCount + (source === 'task' ? 1 : 0),
      subtaskCount: current.subtaskCount + (source === 'subtask' ? 1 : 0),
    });
  };

  tasks.forEach((task) => {
    accumulate(task.e, task.elo, 'task');
    task.subtasks.forEach((subtask) => accumulate(subtask.e, task.elo, 'subtask'));
  });

  return [...emojiStats.entries()]
    .map(([emoji, stats]) => ({
      emoji,
      averageElo: Math.round(stats.totalElo / Math.max(1, stats.count)),
      appearances: stats.count,
      taskCount: stats.taskCount,
      subtaskCount: stats.subtaskCount,
    }))
    .filter((entry) => entry.appearances >= 2)
    .sort((left, right) => {
      if (right.averageElo !== left.averageElo) {
        return right.averageElo - left.averageElo;
      }

      return right.appearances - left.appearances;
    });
}

export function alignmentScore(budget: Budget) {
  const flexible = budget.items.filter((item) => !item.ess && item.type === 'flex');

  if (flexible.length < 2) return 100;

  const spendRank = [...flexible].sort((left, right) => right.amt - left.amt);
  const valueRank = [...flexible].sort((left, right) => right.elo - left.elo);
  const maxDelta = Math.max(1, flexible.length - 1);

  const distance = flexible.reduce((sum, item) => {
    const spendIndex = spendRank.findIndex((entry) => entry.id === item.id);
    const valueIndex = valueRank.findIndex((entry) => entry.id === item.id);
    return sum + Math.abs(spendIndex - valueIndex);
  }, 0);

  const normalized = distance / (flexible.length * maxDelta);
  return Math.max(0, Math.round((1 - normalized) * 100));
}

export function buildTaskInsights(tasks: Task[]) {
  const ranked = sortedTasks(tasks, false);
  const highPriorityNoDeadline = ranked.find((task) => !task.ess && !task.dl);
  const urgentNotEssential = ranked.find((task) => task.dl === 'today' && !task.ess);
  const focusDrift = ranked[ranked.length - 1];
  const emojiPreferences = getEmojiPreferenceInsights(tasks);
  const favoriteEmoji = emojiPreferences[0];
  const neglectedEmoji = emojiPreferences[emojiPreferences.length - 1];
  const insights: TaskInsight[] = [];

  if (highPriorityNoDeadline) {
    insights.push({
      id: `task-insight-${highPriorityNoDeadline.id}`,
      emoji: highPriorityNoDeadline.e,
      badge: 'NEGLECTED PRIORITY',
      title: highPriorityNoDeadline.n,
      subtitle: 'Your #1 priority has no deadline',
      detail: "You've ranked this highly but haven't committed to when it gets done.",
      cta: 'Add Deadline',
      action: 'add_deadline',
      taskId: highPriorityNoDeadline.id,
    });
  }

  if (urgentNotEssential) {
    insights.push({
      id: `task-essential-${urgentNotEssential.id}`,
      emoji: urgentNotEssential.e,
      badge: 'ESSENTIAL GAP',
      title: urgentNotEssential.n,
      subtitle: 'This looks urgent enough to graduate from the arena',
      detail: 'Marking it essential will pin it to the top and remove it from future debates.',
      cta: 'Mark Essential',
      action: 'mark_essential',
      taskId: urgentNotEssential.id,
    });
  }

  if (focusDrift) {
    insights.push({
      id: `task-drift-${focusDrift.id}`,
      emoji: focusDrift.e,
      badge: 'FOCUS DRIFT',
      title: focusDrift.n,
      subtitle: 'A lower-ranked task keeps hanging around',
      detail: 'Either raise its commitment with a deadline or trim it from the list.',
      cta: 'Mark Essential',
      action: 'mark_essential',
      taskId: focusDrift.id,
    });
  }

  if (favoriteEmoji) {
    insights.push({
      id: `task-emoji-favorite-${favoriteEmoji.emoji}`,
      emoji: favoriteEmoji.emoji,
      badge: 'EMOJI SIGNAL',
      title: `${favoriteEmoji.emoji} priorities are winning`,
      subtitle: `Average ELO ${favoriteEmoji.averageElo} across ${favoriteEmoji.appearances} matching items`,
      detail:
        neglectedEmoji && neglectedEmoji.emoji !== favoriteEmoji.emoji
          ? `${favoriteEmoji.emoji} shows up on priorities you consistently rank higher. In contrast, ${neglectedEmoji.emoji} items are averaging ELO ${neglectedEmoji.averageElo}.`
          : `${favoriteEmoji.emoji} appears on tasks and subtasks that keep floating toward the top of your list.`,
      cta: 'Got it',
      action: 'none',
    });
  }

  return insights.slice(0, 4);
}

export function buildBudgetInsights(budget: Budget) {
  const flags = getBudgetFlaggedItems(budget);
  const flexible = budget.items.filter((item) => !item.ess && item.type === 'flex');
  const lowValueSpend = [...flexible].sort((left, right) => left.elo - right.elo)[0];
  const noSavings = budgetTotals(budget).leftover < 100;
  const insights: BudgetInsight[] = [];

  if (flags[0]) {
    insights.push({
      id: `budget-overspend-${flags[0].id}`,
      emoji: flags[0].e,
      badge: 'OVERSPEND',
      title: flags[0].n,
      subtitle: `${Math.round((flags[0].amt / budget.income) * 100)}% of income is going here`,
      detail: 'This is consuming a meaningful share of your budget without being marked essential.',
      cta: 'Reduce Spending',
      action: 'reduce_spending',
      itemId: flags[0].id,
    });
  }

  if (lowValueSpend) {
    insights.push({
      id: `budget-value-${lowValueSpend.id}`,
      emoji: lowValueSpend.e,
      badge: 'LOW-VALUE SPEND',
      title: lowValueSpend.n,
      subtitle: 'You keep ranking this low compared with what you pay',
      detail: 'If this is still worth it, mark it essential. Otherwise trim the monthly amount.',
      cta: 'Reduce Spending',
      action: 'reduce_spending',
      itemId: lowValueSpend.id,
    });
  }

  if (noSavings) {
    insights.push({
      id: 'budget-savings-gap',
      emoji: '💚',
      badge: 'SAVINGS GAP',
      title: 'Saved',
      subtitle: 'Your leftover cushion is running thin',
      detail: 'Even a small monthly transfer creates room for priorities that matter later.',
      cta: 'Boost Savings',
      action: 'boost_savings',
    });
  }

  return insights.slice(0, 3);
}

export function applyTaskInsight(tasks: Task[], insight: TaskInsight) {
  return tasks.map((task) => {
    if (task.id !== insight.taskId) return task;

    if (insight.action === 'add_deadline') {
      return { ...task, dl: 'today' as const, urg: 'high' as const };
    }

    if (insight.action === 'mark_essential') {
      return { ...task, ess: true };
    }

    return task;
  });
}

export function applyBudgetInsight(budget: Budget, insight: BudgetInsight) {
  if (insight.action === 'boost_savings') {
    return budget;
  }

  return {
    ...budget,
    items: budget.items.map((item) => {
      if (item.id !== insight.itemId) return item;
      return {
        ...item,
        amt: Math.max(0, Math.round(item.amt * 0.85)),
      };
    }),
  };
}

export function runnerCurrentSubtask(task: Task | undefined, stepIndex: number) {
  if (!task) return null;
  return task.subtasks[stepIndex] ?? null;
}

export function nextRunnerStep(subtasks: Subtask[], currentIndex: number) {
  if (!subtasks.length) return { nextIndex: 0, done: true };

  const remaining = subtasks.findIndex((subtask, index) => index > currentIndex && !subtask.done);
  if (remaining >= 0) {
    return { nextIndex: remaining, done: false };
  }

  return { nextIndex: subtasks.length - 1, done: subtasks.every((subtask) => subtask.done) };
}

export function cloneSnapshot(snapshot: AppSnapshot): AppSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as AppSnapshot;
}

export function budgetTypeLabel(type: BudgetType) {
  return type === 'ess' ? 'Essential' : 'Flexible';
}

function buildDefaultSubtasks(id: string) {
  if (id === 'exercise') {
    return [
      { id: createId('subtask'), e: '👕', n: 'Change into gym clothes', done: false, why: 'Reduce friction before you start.', order: 0 },
      { id: createId('subtask'), e: '🔥', n: '10 min warm-up', done: false, why: 'Get your body ready so the workout feels easier.', order: 1 },
      { id: createId('subtask'), e: '🏋️', n: 'Main workout', done: false, why: 'This is the highest-value block of the session.', order: 2 },
      { id: createId('subtask'), e: '🧘', n: 'Cool down & stretch', done: false, why: 'Lock in the habit and help recovery.', order: 3 },
    ];
  }

  if (id === 'study') {
    return [
      { id: createId('subtask'), e: '📝', n: 'Review chapter notes', done: false, why: 'Rebuild the big picture first.', order: 0 },
      { id: createId('subtask'), e: '✍️', n: 'Practice problems', done: false, why: 'Pressure-test what you actually remember.', order: 1 },
      { id: createId('subtask'), e: '🧠', n: 'Self-quiz', done: false, why: 'End with recall so the session sticks.', order: 2 },
    ];
  }

  if (id === 'inbox') {
    return [
      { id: createId('subtask'), e: '🗂️', n: 'Archive old emails', done: false, why: 'Clear the visual clutter before deciding.', order: 0 },
      { id: createId('subtask'), e: '📬', n: 'Reply to urgent items', done: false, why: 'Take care of the few messages that matter.', order: 1 },
      { id: createId('subtask'), e: '✂️', n: 'Unsubscribe from 3 lists', done: false, why: 'Make the next inbox session easier.', order: 2 },
    ];
  }

  return [];
}

function buildTaskDetail(name: string) {
  return `A focused block for ${name.toLowerCase()} that keeps your highest priorities moving.`;
}
