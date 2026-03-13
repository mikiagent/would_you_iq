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
