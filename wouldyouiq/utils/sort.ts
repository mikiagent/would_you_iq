import type { Task } from '@/types/models';

export function sortTasks(tasks: Task[], activeOnly = true): Task[] {
  const pool = activeOnly ? tasks.filter((t) => !t.done) : [...tasks];
  return pool.sort((a, b) => {
    if (a.essential && !b.essential) return -1;
    if (!a.essential && b.essential) return 1;
    const urgencyWeight: Record<string, number> = { high: 3, med: 2, low: 0 };
    const urgA = urgencyWeight[a.urgency] ?? 0;
    const urgB = urgencyWeight[b.urgency] ?? 0;
    if (urgB !== urgA) return urgB - urgA;
    return b.elo - a.elo;
  });
}
