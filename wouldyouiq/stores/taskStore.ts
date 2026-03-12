import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task } from '@/types/models';
import { eloUpdate } from '@/utils/elo';
import { sortTasks } from '@/utils/sort';
import { mmkvStorage } from './storage';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface TaskStore {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'elo' | 'done' | 'createdAt'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleEssential: (id: string) => void;
  applyEloUpdate: (winnerId: string, loserId: string) => void;
  markDone: (id: string) => void;
  getPairPool: () => Task[];
  getSortedTasks: (activeOnly?: boolean) => Task[];
}

const defaultTask = (): Pick<Task, 'elo' | 'done' | 'createdAt'> => ({
  elo: 1200,
  done: false,
  createdAt: Date.now(),
});

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (task) => {
    const id = generateId();
    set((s) => ({
      tasks: [
        ...s.tasks,
        {
          ...task,
          id,
          ...defaultTask(),
        } as Task,
      ],
    }));
    return id;
  },

      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
        })),

      toggleEssential: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, essential: !t.essential } : t
          ),
        })),

      applyEloUpdate: (winnerId, loserId) =>
        set((s) => {
          const winner = s.tasks.find((t) => t.id === winnerId);
          const loser = s.tasks.find((t) => t.id === loserId);
          if (!winner || !loser) return s;
          const { winner: newWinnerElo, loser: newLoserElo } = eloUpdate(
            winner.elo,
            loser.elo
          );
          return {
            tasks: s.tasks.map((t) => {
              if (t.id === winnerId) return { ...t, elo: newWinnerElo };
              if (t.id === loserId) return { ...t, elo: newLoserElo };
              return t;
            }),
          };
        }),

      markDone: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, done: true } : t
          ),
        })),

      getPairPool: () => {
        return get().tasks.filter((t) => !t.essential && !t.done);
      },

      getSortedTasks: (activeOnly = true) => {
        return sortTasks(get().tasks, activeOnly);
      },
    }),
    {
      name: 'wouldyouiq-tasks',
      storage: {
        getItem: (name) => {
          const v = mmkvStorage.getItem(name);
          return v ? Promise.resolve({ state: JSON.parse(v) }) : Promise.resolve(null);
        },
        setItem: (name, value) => {
          mmkvStorage.setItem(name, JSON.stringify(value.state));
          return Promise.resolve();
        },
        removeItem: (name) => {
          mmkvStorage.removeItem(name);
          return Promise.resolve();
        },
      },
    }
  )
);
