import { Colors } from '../constants/tokens.ts';
import type {
  Task,
  TaskBoardColumn,
  TaskProject,
  TaskSortMode,
  TaskWorkspace,
} from './models';

export const DEFAULT_TASK_PROJECT_ID = 'project-personal';

const DEFAULT_COLUMNS: TaskBoardColumn[] = [
  { id: 'column-backlog', name: 'Backlog', order: 0 },
  { id: 'column-active', name: 'Active', order: 1 },
  { id: 'column-progress', name: 'In progress', order: 2 },
  { id: 'column-done', name: 'Done', order: 3 },
];

const DEFAULT_PROJECTS: TaskProject[] = [
  {
    id: DEFAULT_TASK_PROJECT_ID,
    code: 'PERSONAL',
    name: 'Personal',
    color: Colors.gold2,
    elo: 1200,
    columnId: 'column-active',
    order: 0,
    createdAt: 0,
  },
];

export const TASK_PROJECT_COLORS = [
  Colors.violet,
  Colors.gold,
  Colors.green,
  Colors.cyan,
  Colors.gold2,
  Colors.blue,
];

export function createDefaultTaskWorkspace(): TaskWorkspace {
  return {
    projects: DEFAULT_PROJECTS.map((project) => ({ ...project })),
    columns: DEFAULT_COLUMNS.map((column) => ({ ...column })),
    preferences: {
      sort: 'importance',
      completedAtBottom: true,
      autoMoveCompletedProjects: true,
    },
  };
}

export function normalizeTaskWorkspace(workspace?: Partial<TaskWorkspace> | null): TaskWorkspace {
  const fallback = createDefaultTaskWorkspace();
  const columns = workspace?.columns?.length
    ? [...workspace.columns].sort((left, right) => left.order - right.order)
    : fallback.columns;
  const projects = workspace?.projects?.length
    ? [...workspace.projects]
        .map((project) => ({
          ...project,
          elo: Number.isFinite(project.elo) ? project.elo : 1200,
        }))
        .sort((left, right) => left.order - right.order)
    : fallback.projects;

  if (!projects.some((project) => project.id === DEFAULT_TASK_PROJECT_ID)) {
    projects.push({
      ...fallback.projects[0],
      order: projects.length,
      columnId: columns[1]?.id ?? columns[0]?.id ?? 'column-active',
    });
  }

  return {
    projects,
    columns,
    preferences: {
      ...fallback.preferences,
      ...workspace?.preferences,
    },
  };
}

export function resolveTaskProjectId(task: Task, workspace: TaskWorkspace) {
  return workspace.projects.some((project) => project.id === task.projectId)
    ? task.projectId!
    : DEFAULT_TASK_PROJECT_ID;
}

export function taskDueLabel(task: Task) {
  if (task.dueLabel?.trim()) return task.dueLabel.trim();
  if (task.dl === 'today') return 'Due today';
  if (task.dl === 'this week') return 'Due this week';
  return 'No date';
}

export function getTaskItemStats(task: Task) {
  if (!task.subtasks.length) {
    return { total: 1, complete: task.done ? 1 : 0, percent: task.done ? 100 : 0 };
  }

  const leaves = getTaskLeafSubtasks(task);
  const total = leaves.length;
  const complete = leaves.filter((subtask) => subtask.done).length;
  return {
    total,
    complete,
    percent: total ? Math.round((complete / total) * 100) : 0,
  };
}

export function getTaskLeafSubtasks(task: Task) {
  const parentIds = new Set(
    task.subtasks.map((subtask) => subtask.parentId).filter((id): id is string => Boolean(id)),
  );
  return task.subtasks
    .filter((subtask) => !parentIds.has(subtask.id))
    .sort((left, right) => left.order - right.order);
}

export function getProjectStats(projectId: string, tasks: Task[], workspace: TaskWorkspace) {
  const projectTasks = tasks.filter(
    (task) => resolveTaskProjectId(task, workspace) === projectId,
  );
  const itemStats = projectTasks.reduce(
    (stats, task) => {
      const next = getTaskItemStats(task);
      return {
        total: stats.total + next.total,
        complete: stats.complete + next.complete,
      };
    },
    { total: 0, complete: 0 },
  );

  return {
    taskCount: projectTasks.length,
    openTaskCount: projectTasks.filter((task) => !task.done).length,
    total: itemStats.total,
    complete: itemStats.complete,
    percent: itemStats.total ? Math.round((itemStats.complete / itemStats.total) * 100) : 0,
  };
}

export function getWorkspaceStats(tasks: Task[]) {
  const open = tasks.filter((task) => !task.done).length;
  const totals = tasks.reduce(
    (stats, task) => {
      const next = getTaskItemStats(task);
      return {
        total: stats.total + next.total,
        complete: stats.complete + next.complete,
      };
    },
    { total: 0, complete: 0 },
  );

  return {
    open,
    percent: totals.total ? Math.round((totals.complete / totals.total) * 100) : 0,
  };
}

const urgencyRank = { high: 0, med: 1, low: 2 } as const;

export function sortWorkspaceTasks(
  tasks: Task[],
  sort: TaskSortMode,
  completedAtBottom: boolean,
) {
  return [...tasks].sort((left, right) => {
    if (completedAtBottom && left.done !== right.done) return left.done ? 1 : -1;
    if (sort === 'importance') return right.elo - left.elo || left.order - right.order;
    if (sort === 'due') {
      return (
        urgencyRank[left.urg] - urgencyRank[right.urg] ||
        right.elo - left.elo ||
        left.order - right.order
      );
    }
    return left.order - right.order;
  });
}

export function syncCompletedProjectColumns(
  workspace: TaskWorkspace,
  tasks: Task[],
): TaskWorkspace {
  if (!workspace.preferences.autoMoveCompletedProjects || workspace.columns.length < 2) {
    return workspace;
  }

  const columns = [...workspace.columns].sort((left, right) => left.order - right.order);
  const doneColumnId = columns[columns.length - 1].id;
  const activeColumnId = columns[Math.min(1, columns.length - 1)].id;

  return {
    ...workspace,
    projects: workspace.projects.map((project) => {
      const projectTasks = tasks.filter(
        (task) => resolveTaskProjectId(task, workspace) === project.id,
      );
      if (!projectTasks.length) return project;
      const allDone = projectTasks.every((task) => task.done);
      if (allDone) return { ...project, columnId: doneColumnId };
      if (project.columnId === doneColumnId) return { ...project, columnId: activeColumnId };
      return project;
    }),
  };
}
