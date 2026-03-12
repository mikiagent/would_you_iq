import { create } from 'zustand';

import type { Budget, CalibrationMode, Task, User } from '@/domain/models';
import { initialBudget, initialTasks, initialUser } from '@/data/mockData';
import { COMPARISON_XP, ESSENTIAL_XP, completeTask } from '@/domain/logic';

export interface AppState {
  user: User;
  tasks: Task[];
  budget: Budget;
  calibration: {
    mode: CalibrationMode;
    step: number;
    totalCommits: number;
    currentTaskId: number | null;
  };
  setMode: (mode: CalibrationMode) => void;
  addComparison: () => void;
  markEssential: (taskId: number) => void;
  completeTaskById: (id: number) => void;
  pickNextTask: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: initialUser,
  tasks: initialTasks,
  budget: initialBudget,
  calibration: {
    mode: 'tasks',
    step: 0,
    totalCommits: 0,
    currentTaskId: initialTasks[0]?.id ?? null,
  },
  setMode: (mode) =>
    set((state) => ({
      calibration: {
        ...state.calibration,
        mode,
      },
    })),
  addComparison: () =>
    set((state) => ({
      user: {
        ...state.user,
        comparisons: state.user.comparisons + 1,
        xp: state.user.xp + COMPARISON_XP,
      },
      calibration: {
        ...state.calibration,
        step: Math.min(state.calibration.step + 1, 3),
        totalCommits: state.calibration.totalCommits + 1,
      },
    })),
  markEssential: (taskId) =>
    set((state) => {
      const tasks = state.tasks.map((t) =>
        t.id === taskId ? { ...t, ess: true } : t,
      );
      return {
        tasks,
        user: {
          ...state.user,
          xp: state.user.xp + ESSENTIAL_XP,
        },
      };
    }),
  completeTaskById: (id) =>
    set((state) => {
      const task = state.tasks.find((t) => t.id === id);
      if (!task || task.done) return state;
      const { user, task: updatedTask } = completeTask(state.user, task);
      return {
        user,
        tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
      };
    }),
  pickNextTask: () =>
    set((state) => {
      const remaining = state.tasks.filter((t) => !t.done);
      if (!remaining.length) {
        return {
          calibration: { ...state.calibration, currentTaskId: null },
        };
      }
      const idx = Math.floor(Math.random() * remaining.length);
      return {
        calibration: {
          ...state.calibration,
          currentTaskId: remaining[idx].id,
        },
      };
    }),
}));

