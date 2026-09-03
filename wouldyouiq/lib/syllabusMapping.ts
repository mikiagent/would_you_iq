import type { Deadline, TaskDraft } from '../domain/models.ts';

export type ExtractedAssignment = {
  title: string;
  detail: string;
  dueDate: string | null;
  emoji: string;
  estimatedDuration: string;
};

// The task model only supports coarse deadlines, so an exact due date is
// folded into the detail text and mapped onto the nearest bucket.
export function deriveDeadline(dueDate: string | null, now: Date = new Date()): Deadline {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T23:59:59`);
  if (Number.isNaN(due.getTime())) return null;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const daysAway = Math.floor((due.getTime() - startOfToday.getTime()) / dayMs);
  if (daysAway <= 1) return 'today';
  if (daysAway <= 7) return 'this week';
  return null;
}

export function formatDueDate(dueDate: string): string {
  const due = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(due.getTime())) return dueDate;
  return due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function assignmentToTaskDraft(assignment: ExtractedAssignment, now: Date = new Date()): TaskDraft {
  const dueLabel = assignment.dueDate ? `Due ${formatDueDate(assignment.dueDate)}` : '';
  const detail = [dueLabel, assignment.detail].filter(Boolean).join(' — ') || undefined;
  const deadline = deriveDeadline(assignment.dueDate, now);
  return {
    e: assignment.emoji || '📚',
    n: assignment.title,
    t: assignment.estimatedDuration || '30 min',
    dl: deadline,
    ess: deadline !== null,
    detail,
  };
}
