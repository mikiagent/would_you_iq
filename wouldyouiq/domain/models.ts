export type Urgency = 'low' | 'med' | 'high';

export type Deadline = 'today' | 'this week' | null;

export type BudgetType = 'ess' | 'flex';

export type TaskFilter = 'all' | 'ess' | 'due' | 'done';

export type TasksView = 'list' | 'insights';

export type BudgetView = 'overview' | 'insights';

export type ArenaMode = 'tasks' | 'budget';

export type ArenaSwipe = 'champion' | 'challenger' | 'skip' | 'essential';

export type InsightAction =
  | 'add_deadline'
  | 'mark_essential'
  | 'reduce_spending'
  | 'boost_savings'
  | 'none';

export interface Subtask {
  id: string;
  e: string;
  n: string;
  done: boolean;
  why?: string;
  order: number;
}

export interface Task {
  id: string;
  e: string;
  n: string;
  t: string;
  elo: number;
  ess: boolean;
  dl: Deadline;
  urg: Urgency;
  done: boolean;
  subtasks: Subtask[];
  detail?: string;
  createdAt: number;
  order: number;
}

export interface BudgetItem {
  id: string;
  e: string;
  n: string;
  amt: number;
  type: BudgetType;
  ess: boolean;
  elo: number;
  comps: number;
  createdAt: number;
}

export interface Budget {
  income: number;
  items: BudgetItem[];
}

export interface User {
  name: string;
  xp: number;
  streak: number;
  comparisons: number;
  done: number;
  email: string | null;
  avatarUrl: string | null;
  lastCalibrationDate: string | null;
}

export interface OnboardingOption {
  id: string;
  e: string;
  n: string;
  t: string;
}

export interface OnboardingState {
  completed: boolean;
  step: 'name' | 'priorities' | 'tournament' | 'reveal';
  nameDraft: string;
  selectedIds: string[];
  seedTasks: Task[];
  pairQueue: Array<[string, string]>;
  round: number;
}

export interface ToastState {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

export interface ArenaState {
  mode: ArenaMode;
  progress: number;
  totalCommits: number;
  championId: string | null;
  challengerId: string | null;
  rotationIndex: number;
  completionVisible: boolean;
  lastCompletionAt: number | null;
}

export interface RunnerState {
  taskId: string | null;
  stepIndex: number;
  completed: boolean;
}

export interface TaskInsight {
  id: string;
  emoji: string;
  badge: string;
  title: string;
  subtitle: string;
  detail: string;
  cta: string;
  action: InsightAction;
  taskId?: string;
}

export interface BudgetInsight {
  id: string;
  emoji: string;
  badge: string;
  title: string;
  subtitle: string;
  detail: string;
  cta: string;
  action: InsightAction;
  itemId?: string;
}

export interface ExpenseDraft {
  id?: string;
  e: string;
  n: string;
  amt: number;
  type: BudgetType;
  ess: boolean;
}

export interface TaskDraft {
  id?: string;
  e: string;
  n: string;
  t: string;
  dl: Deadline;
  ess: boolean;
  detail?: string;
}

export interface SubtaskDraft {
  id?: string;
  e: string;
  n: string;
  why?: string;
}

export interface AppSnapshot {
  user: User;
  tasks: Task[];
  budget: Budget;
  onboarding: OnboardingState;
  arena: ArenaState;
  runner: RunnerState;
}
