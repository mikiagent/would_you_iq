import assert from 'node:assert/strict';
import test from 'node:test';

import { mockRepository } from '../data/mockRepository.ts';
import {
  alignmentScore,
  applyArenaResult,
  budgetTotals,
  buildOnboardingSeedTasks,
  buildTournamentPairs,
  filterTasks,
  nextRunnerStep,
  sortedTasks,
} from '../domain/logic.ts';
import { OB_TASKS } from '../constants/onboarding.ts';
import { assignmentToTaskDraft, deriveDeadline } from '../lib/syllabusMapping.ts';
import {
  DEFAULT_TASK_PROJECT_ID,
  getProjectStats,
  normalizeTaskWorkspace,
  syncCompletedProjectColumns,
} from '../domain/taskWorkspace.ts';
import { pickTaskDropTarget } from '../domain/taskDrag.ts';

test('a clean start has no demo tasks, budget, or progress', () => {
  const snapshot = mockRepository.loadSignedOutSnapshot();

  assert.equal(snapshot.tasks.length, 0);
  assert.equal(snapshot.budget.income, 0);
  assert.equal(snapshot.budget.items.length, 0);
  assert.equal(snapshot.user.xp, 0);
  assert.equal(snapshot.user.streak, 0);
  assert.equal(snapshot.user.comparisons, 0);
  assert.equal(snapshot.user.done, 0);
});

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

test('legacy tasks fall back to the Personal project without rewriting them', () => {
  const snapshot = mockRepository.loadSnapshot();
  const workspace = normalizeTaskWorkspace(undefined);
  const stats = getProjectStats(DEFAULT_TASK_PROJECT_ID, snapshot.tasks, workspace);

  assert.equal(workspace.projects[0]?.id, DEFAULT_TASK_PROJECT_ID);
  assert.equal(stats.taskCount, snapshot.tasks.length);
  assert.ok(stats.total >= stats.taskCount);
});

test('a completed project moves to the final board column', () => {
  const snapshot = mockRepository.loadSnapshot();
  const tasks = snapshot.tasks.map((task) => ({
    ...task,
    done: true,
    subtasks: task.subtasks.map((subtask) => ({ ...subtask, done: true })),
  }));
  const workspace = syncCompletedProjectColumns(snapshot.taskWorkspace, tasks);
  const finalColumn = workspace.columns[workspace.columns.length - 1];

  assert.equal(workspace.projects[0]?.columnId, finalColumn?.id);
});

test('project comparisons update project ELO without changing task ELO', () => {
  const snapshot = mockRepository.loadSnapshot();
  const personal = snapshot.taskWorkspace.projects[0]!;
  const secondProject = {
    ...personal,
    id: 'project-work',
    code: 'WORK',
    name: 'Work',
    order: 1,
  };
  const taskWorkspace = {
    ...snapshot.taskWorkspace,
    projects: [personal, secondProject],
  };
  const originalTaskElos = snapshot.tasks.map((task) => task.elo);

  const result = applyArenaResult(
    'projects',
    snapshot.tasks,
    snapshot.budget,
    taskWorkspace,
    personal.id,
    secondProject.id,
    'challenger',
  );

  assert.equal(result.taskWorkspace.projects.find((project) => project.id === secondProject.id)?.elo, 1216);
  assert.equal(result.taskWorkspace.projects.find((project) => project.id === personal.id)?.elo, 1184);
  assert.deepEqual(result.tasks.map((task) => task.elo), originalTaskElos);
});

test('task drag targeting prefers a task row over its containing project', () => {
  const target = pickTaskDropTarget(
    { kind: 'task', taskId: 'task-a', projectId: 'project-a' },
    [
      {
        key: 'project:project-b',
        target: { kind: 'project', projectId: 'project-b' },
        x: 0,
        y: 100,
        width: 320,
        height: 200,
      },
      {
        key: 'task:task-b',
        target: { kind: 'task', taskId: 'task-b', projectId: 'project-b' },
        x: 16,
        y: 140,
        width: 288,
        height: 68,
      },
    ],
    { x: 160, y: 175 },
  );

  assert.deepEqual(target, {
    kind: 'task',
    taskId: 'task-b',
    projectId: 'project-b',
    before: false,
  });
});
