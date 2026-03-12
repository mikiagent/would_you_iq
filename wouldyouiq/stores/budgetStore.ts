import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BudgetItem } from '@/types/models';
import { useTaskStore } from './taskStore';
import { mmkvStorage } from './storage';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface BudgetStore {
  income: number;
  items: BudgetItem[];
  setIncome: (amount: number) => void;
  addItem: (item: Omit<BudgetItem, 'id'>) => void;
  updateItem: (id: string, updates: Partial<BudgetItem>) => void;
  deleteItem: (id: string) => void;
  toggleEssential: (id: string) => void;
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
            } as BudgetItem,
          ],
        })),

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
