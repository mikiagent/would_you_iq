import type { Task } from '@/types/models';

export type Stake = {
  modSide: 'A' | 'B';
  newPriceDisplay: string;
  unit: string;
  tickDir: 'up' | 'dn';
  qLabel: string;
};

function parseMins(t: string | undefined): number {
  const m = String(t ?? '30').match(/(\d+)/);
  return m ? parseInt(m[1]!, 10) : 30;
}

/**
 * Sometimes return a stake variant (e.g. "What if it took twice as long?") for the pair.
 * Otherwise return null for plain "Which would you do first?".
 */
export function genStake(taskA: Task, taskB: Task): Stake | null {
  const aWins = taskA.elo >= taskB.elo;
  const hi = aWins ? taskA : taskB;
  const lo = aWins ? taskB : taskA;
  const hiSide: 'A' | 'B' = aWins ? 'A' : 'B';
  const loSide: 'A' | 'B' = aWins ? 'B' : 'A';

  const hiMins = parseMins(hi.timeEstimate);
  const loMins = parseMins(lo.timeEstimate);
  const doubled = hiMins * 2;
  const halved = Math.max(5, Math.round(loMins / 2));

  const variants: Stake[] = [];

  if (hiMins >= 15) {
    variants.push({
      modSide: hiSide,
      newPriceDisplay: `${doubled} min`,
      unit: 'time cost',
      tickDir: 'up',
      qLabel: 'What if it took twice as long?',
    });
  }
  variants.push({
    modSide: loSide,
    newPriceDisplay: `${halved} min`,
    unit: 'time cost',
    tickDir: 'dn',
    qLabel: 'Twice as fast — still your pick?',
  });

  if (Math.random() < 0.4) return null;
  return variants[Math.floor(Math.random() * variants.length)]!;
}
