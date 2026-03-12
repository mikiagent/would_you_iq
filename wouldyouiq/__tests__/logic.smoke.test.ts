import { budgetTotals, filterTasks } from '@/domain/logic';
import { initialBudget, initialTasks } from '@/data/mockData';

test('budgetTotals computes leftover', () => {
  const { total, leftover } = budgetTotals(initialBudget);
  expect(total).toBeGreaterThan(0);
  expect(initialBudget.income - total).toBe(leftover);
});

test('filterTasks respects done flag', () => {
  const list = filterTasks(initialTasks, 'all');
  expect(list.every((t) => !t.done)).toBe(true);
});

