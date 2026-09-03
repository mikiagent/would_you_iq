import assert from 'node:assert/strict';
import test from 'node:test';

import { mockRepository } from '../data/mockRepository.ts';
import {
  alignmentScore,
  budgetTotals,
  buildOnboardingSeedTasks,
  buildTournamentPairs,
  filterTasks,
  nextRunnerStep,
  sortedTasks,
} from '../domain/logic.ts';
import { OB_TASKS } from '../constants/onboarding.ts';
import { assignmentToTaskDraft, deriveDeadline } from '../lib/syllabusMapping.ts';

test('budget totals compute leftover and spent percent', () => {
  const snapshot = mockRepository.loadSnapshot();
  const totals = budgetTotals(snapshot.budget);

  assert.ok(totals.total > 0);
  assert.equal(snapshot.budget.income - totals.total, totals.leftover);
  assert.ok(totals.spentPercent > 0);
});

test('task filters exclude completed tasks from the default list', () => {
  const snapshot = mockRepository.loadSnapshot();
  const list = filterTasks(snapshot.tasks, 'all');

  assert.equal(list.every((task) => !task.done), true);
  assert.equal(sortedTasks(snapshot.tasks)[0]?.ess, true);
});

test('onboarding seeding creates tournament pairs and starter tasks', () => {
  const tasks = buildOnboardingSeedTasks(OB_TASKS.slice(0, 4));
  const pairs = buildTournamentPairs(tasks);

  assert.equal(tasks.length, 4);
  assert.equal(pairs.length, 3);
  assert.ok(tasks.every((task) => typeof task.id === 'string'));
});

test('alignment score stays in 0-100 range', () => {
  const snapshot = mockRepository.loadSnapshot();
  const score = alignmentScore(snapshot.budget);

  assert.ok(score >= 0);
  assert.ok(score <= 100);
});

test('runner step logic advances until completion', () => {
  const snapshot = mockRepository.loadSnapshot();
  const task = snapshot.tasks.find((entry) => entry.subtasks.length > 0);

  assert.ok(task);

  const subtasks = task!.subtasks.map((subtask, index) =>
    index === 0 ? { ...subtask, done: true } : subtask,
  );
  const result = nextRunnerStep(subtasks, 0);

  assert.equal(result.done, false);
  assert.equal(result.nextIndex, 1);
});

test('syllabus due dates map onto deadline buckets', () => {
  const now = new Date('2026-09-03T10:00:00');

  assert.equal(deriveDeadline(null, now), null);
  assert.equal(deriveDeadline('2026-09-03', now), 'today');
  assert.equal(deriveDeadline('2026-09-04', now), 'today');
  assert.equal(deriveDeadline('2026-09-07', now), 'this week');
  assert.equal(deriveDeadline('2026-09-10', now), 'this week');
  assert.equal(deriveDeadline('2026-09-11', now), null);
  assert.equal(deriveDeadline('not-a-date', now), null);
});

test('assignments convert to task drafts with due date in detail', () => {
  const now = new Date('2026-09-03T10:00:00');
  const draft = assignmentToTaskDraft(
    {
      title: 'Problem set 3',
      detail: 'CS 201, submit on Canvas',
      dueDate: '2026-09-05',
      emoji: '🧮',
      estimatedDuration: '90 min',
    },
    now,
  );

  assert.equal(draft.n, 'Problem set 3');
  assert.equal(draft.dl, 'this week');
  assert.equal(draft.ess, true);
  assert.ok(draft.detail?.startsWith('Due '));
  assert.ok(draft.detail?.includes('CS 201, submit on Canvas'));

  const undated = assignmentToTaskDraft(
    { title: 'Read chapter 4', detail: '', dueDate: null, emoji: '', estimatedDuration: '' },
    now,
  );
  assert.equal(undated.dl, null);
  assert.equal(undated.ess, false);
  assert.equal(undated.e, '📚');
  assert.equal(undated.t, '30 min');
  assert.equal(undated.detail, undefined);
});
