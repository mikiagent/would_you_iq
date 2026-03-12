import type { Task } from '@/types/models';

/**
 * Select a pair for comparison: [challenger, defender].
 * Pool = non-essential, non-done. Weight toward fewer comparisons; exclude session pairs.
 */
export function selectPair(
  tasks: Task[],
  sessionPairs: [string, string][],
  comparisonCountByTaskId?: Record<string, number>
): [Task, Task] | null {
  const pool = tasks.filter((t) => !t.essential && !t.done);
  if (pool.length < 2) return null;

  const usedInSession = new Set(sessionPairs.flat());
  const available = pool.filter((t) => !usedInSession.has(t.id));
  const source = available.length >= 2 ? available : pool;

  const byCount = (a: Task, b: Task) => {
    const ca = comparisonCountByTaskId?.[a.id] ?? 0;
    const cb = comparisonCountByTaskId?.[b.id] ?? 0;
    return ca - cb;
  };
  const sorted = [...source].sort(byCount);
  const first = sorted[0]!;
  const rest = sorted.slice(1);
  const second = rest[Math.floor(Math.random() * rest.length)] ?? sorted[1]!;
  return [first, second];
}
