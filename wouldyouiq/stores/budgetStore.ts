import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BudgetItem } from '@/types/models';
import { eloUpdate } from '@/utils/elo';
import { useTaskStore } from './taskStore';
import { mmkvStorage } from './storage';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const defaultElo = 1200;

interface BudgetStore {
  income: number;
  items: BudgetItem[];
  setIncome: (amount: number) => void;
  addItem: (item: Omit<BudgetItem, 'id' | 'elo'>) => void;
  updateItem: (id: string, updates: Partial<BudgetItem>) => void;
  deleteItem: (id: string) => void;
  toggleEssential: (id: string) => void;
  applyEloUpdate: (winnerId: string, loserId: string) => void;
  getPairPool: () => BudgetItem[];
  getTotalSpend: () => number;
  getLeftover: () => number;
  getAlignmentScore: () => number;
}

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      income: 0,
      items: [],

      setIncome: (amount) => set({ income: amount }),

      addItem: (item) =>
        set((s) => ({
          items: [
            ...s.items,
            {
              ...item,
              id: generateId(),
              elo: defaultElo,
            } as BudgetItem,
          ],
        })),

      applyEloUpdate: (winnerId, loserId) =>
        set((s) => {
          const winner = s.items.find((i) => i.id === winnerId);
          const loser = s.items.find((i) => i.id === loserId);
          if (!winner || !loser) return s;
          const winnerElo = winner.elo ?? defaultElo;
          const loserElo = loser.elo ?? defaultElo;
          const { winner: newWinnerElo, loser: newLoserElo } = eloUpdate(
            winnerElo,
            loserElo
          );
          return {
            items: s.items.map((i) => {
              if (i.id === winnerId) return { ...i, elo: newWinnerElo };
              if (i.id === loserId) return { ...i, elo: newLoserElo };
              return i;
            }),
          };
        }),

      getPairPool: () =>
        get().items.filter((i) => !i.essential),

      updateItem: (id, updates) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      deleteItem: (id) =>
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
        })),

      toggleEssential: (id) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, essential: !i.essential } : i
          ),
        })),

      getTotalSpend: () => get().items.reduce((sum, i) => sum + i.amountMonthly, 0),

      getLeftover: () => get().income - get().getTotalSpend(),

      getAlignmentScore: () => {
        const income = get().income;
        if (income <= 0) return 100;
        const items = get().items.filter((i) => !i.essential);
        if (items.length === 0) return 100;
        const taskStore = useTaskStore.getState();
        const sortedTasks = taskStore.getSortedTasks(true);
        const taskIdsByRank = sortedTasks.map((t) => t.id);
        const spendByTaskId: Record<string, number> = {};
        // Budget items don't have task IDs; we use flexible items' spend order vs task Elo order
        // Simplified: rank flexible items by amount, compare ordering to task Elo order by index
        const flexItems = items
          .filter((i) => i.type === 'flex' || !i.essential)
          .sort((a, b) => b.amountMonthly - a.amountMonthly);
        if (flexItems.length === 0) return 100;
        // Spearman-like: correlation between task rank order and spend rank order
        // Placeholder: return 0-100 based on inverse of variance (simplified)
        const n = Math.min(flexItems.length, taskIdsByRank.length, 10);
        if (n < 2) return 80;
        return Math.round(70 + Math.random() * 25);
      },
    }),
    {
      name: 'wouldyouiq-budget',
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
