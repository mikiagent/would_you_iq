export type Task = {
  id: string;
  emoji: string;
  name: string;
  timeEstimate: string;
  elo: number;
  essential: boolean;
  deadline: 'today' | 'this week' | null;
  urgency: 'high' | 'med' | 'low';
  done: boolean;
  createdAt: number;
};

export type BudgetItem = {
  id: string;
  emoji: string;
  name: string;
  amountMonthly: number;
  type: 'essential' | 'flex';
  essential: boolean;
  elo: number;
};

export type UserProfile = {
  name: string;
  xp: number;
  streak: number;
  streakLastDate: string | null; // YYYY-MM-DD
  comparisonsTotal: number;
  tasksCompleted: number;
  monthlyIncome: number;
  onboardingComplete: boolean;
};
