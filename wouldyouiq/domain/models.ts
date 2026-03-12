export type Urgency = 'low' | 'med' | 'high';

export type Deadline = 'today' | 'this week' | null;

export interface Subtask {
  id: number;
  n: string;
  done: boolean;
}

export interface Task {
  id: number;
  e: string;
  n: string;
  t: string;
  elo: number;
  ess: boolean;
  dl: Deadline;
  urg: Urgency;
  done: boolean;
  subtasks: Subtask[];
}

export type BudgetType = 'ess' | 'flex';

export interface BudgetItem {
  id: number;
  e: string;
  n: string;
  amt: number;
  type: BudgetType;
  ess: boolean;
  elo: number;
  comps: number;
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
}

export type CalibrationMode = 'tasks' | 'budget';

export interface CalibrationState {
  step: number;
  totalCommits: number;
  mode: CalibrationMode;
}

