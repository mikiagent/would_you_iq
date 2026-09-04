import { OB_TASKS } from '../constants/onboarding.ts';
import { buildOnboardingSeedTasks, buildTournamentPairs, cloneSnapshot, createId } from '../domain/logic.ts';
import { createDefaultTaskWorkspace } from '../domain/taskWorkspace.ts';
import type { AppSnapshot, Budget } from '../domain/models.ts';

const seedTasks = buildOnboardingSeedTasks(OB_TASKS.slice(0, 8));
const onboardingSampleBudget: Budget = {
  income: 4500,
  items: [
    { id: createId('budget'), e: '🏠', n: 'Rent', amt: 1500, type: 'ess' as const, ess: true, elo: 1200, comps: 0, createdAt: Date.now() },
    { id: createId('budget'), e: '💡', n: 'Utilities', amt: 180, type: 'ess' as const, ess: true, elo: 1200, comps: 0, createdAt: Date.now() + 1 },
    { id: createId('budget'), e: '🛒', n: 'Groceries', amt: 450, type: 'ess' as const, ess: true, elo: 1200, comps: 0, createdAt: Date.now() + 2 },
    { id: createId('budget'), e: '🚗', n: 'Transportation', amt: 220, type: 'ess' as const, ess: false, elo: 1216, comps: 2, createdAt: Date.now() + 3 },
    { id: createId('budget'), e: '💪', n: 'Gym', amt: 65, type: 'flex' as const, ess: false, elo: 1298, comps: 3, createdAt: Date.now() + 4 },
    { id: createId('budget'), e: '☕', n: 'Coffee Runs', amt: 85, type: 'flex' as const, ess: false, elo: 1172, comps: 2, createdAt: Date.now() + 5 },
    { id: createId('budget'), e: '🎬', n: 'Streaming', amt: 32, type: 'flex' as const, ess: false, elo: 1154, comps: 2, createdAt: Date.now() + 6 },
  ],
};

const initialSnapshot: AppSnapshot = {
  user: {
    name: 'Friend',
    xp: 340,
    streak: 7,
    comparisons: 28,
    done: 14,
    email: null,
    avatarUrl: null,
    lastCalibrationDate: null,
  },
  tasks: seedTasks.map((task, index) => ({
    ...task,
    elo: [1420, 1380, 1350, 1310, 1290, 1240, 1200, 1180][index] ?? task.elo,
    ess: index === 4,
    dl: index === 1 ? 'today' : index === 5 ? 'today' : task.dl,
    urg: index === 1 ? 'high' : index === 5 ? 'med' : task.urg,
  })),
  taskWorkspace: createDefaultTaskWorkspace(),
  syllabi: [],
  budget: {
    income: 4200,
    items: [
      { id: createId('budget'), e: '🏠', n: 'Rent', amt: 1400, type: 'ess', ess: true, elo: 1200, comps: 0, createdAt: Date.now() },
      { id: createId('budget'), e: '⚡', n: 'Electricity', amt: 90, type: 'ess', ess: true, elo: 1200, comps: 0, createdAt: Date.now() + 1 },
      { id: createId('budget'), e: '🛒', n: 'Groceries', amt: 380, type: 'ess', ess: true, elo: 1200, comps: 0, createdAt: Date.now() + 2 },
      { id: createId('budget'), e: '💪', n: 'Gym', amt: 45, type: 'flex', ess: false, elo: 1340, comps: 4, createdAt: Date.now() + 3 },
      { id: createId('budget'), e: '🎵', n: 'Spotify', amt: 10, type: 'flex', ess: false, elo: 1280, comps: 4, createdAt: Date.now() + 4 },
      { id: createId('budget'), e: '🛵', n: 'DoorDash', amt: 210, type: 'flex', ess: false, elo: 1120, comps: 4, createdAt: Date.now() + 5 },
      { id: createId('budget'), e: '📺', n: 'Streaming', amt: 28, type: 'flex', ess: false, elo: 1200, comps: 2, createdAt: Date.now() + 6 },
    ],
  },
  onboarding: {
    completed: false,
    step: 'name',
    nameDraft: '',
    selectedIds: [],
    seedTasks: buildOnboardingSeedTasks(OB_TASKS.slice(0, 4)),
    pairQueue: buildTournamentPairs(buildOnboardingSeedTasks(OB_TASKS.slice(0, 4))),
    round: 0,
  },
  arena: {
    mode: 'tasks',
    progress: 0,
    totalCommits: 0,
    championId: null,
    challengerId: null,
    rotationIndex: 0,
    completionVisible: false,
    lastCompletionAt: null,
  },
  runner: {
    taskId: null,
    stepIndex: 0,
    completed: false,
  },
};

const signedOutSnapshot: AppSnapshot = {
  user: {
    name: 'Friend',
    xp: 0,
    streak: 0,
    comparisons: 0,
    done: 0,
    email: null,
    avatarUrl: null,
    lastCalibrationDate: null,
  },
  tasks: [],
  taskWorkspace: createDefaultTaskWorkspace(),
  syllabi: [],
  budget: {
    income: 0,
    items: [],
  },
  onboarding: {
    completed: false,
    step: 'name',
    nameDraft: '',
    selectedIds: [],
    seedTasks: buildOnboardingSeedTasks(OB_TASKS.slice(0, 4)),
    pairQueue: buildTournamentPairs(buildOnboardingSeedTasks(OB_TASKS.slice(0, 4))),
    round: 0,
  },
  arena: {
    mode: 'tasks',
    progress: 0,
    totalCommits: 0,
    championId: null,
    challengerId: null,
    rotationIndex: 0,
    completionVisible: false,
    lastCompletionAt: null,
  },
  runner: {
    taskId: null,
    stepIndex: 0,
    completed: false,
  },
};

export const mockRepository = {
  loadSnapshot() {
    return cloneSnapshot(initialSnapshot);
  },
  loadSignedOutSnapshot() {
    return cloneSnapshot(signedOutSnapshot);
  },
  loadOnboardingSampleBudget() {
    return {
      income: onboardingSampleBudget.income,
      items: onboardingSampleBudget.items.map((item) => ({ ...item })),
    };
  },
};
