import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { OB_TASKS } from '@/constants/onboarding';
import { mockRepository } from '@/data/mockRepository';
import {
  applyArenaResult,
  applyBudgetInsight,
  applyTaskInsight,
  buildOnboardingSeedTasks,
  buildTournamentPairs,
  COMPLETION_XP,
  COMPARISON_XP,
  createId,
  deadlineToUrgency,
  ensureArenaPair,
  ESSENTIAL_XP,
  markTaskDone,
  nextArenaRotation,
  sortedTasks,
  TASK_DONE_XP,
  todayKey,
} from './logic';
import type {
  AppSnapshot,
  ArenaMode,
  ArenaSwipe,
  BudgetInsight,
  BudgetView,
  ExpenseDraft,
  GuidedTourState,
  OnboardingOption,
  Task,
  TaskDraft,
  TaskFilter,
  TaskInsight,
  TaskProjectDraft,
  TaskSortMode,
  SubtaskDraft,
  TasksView,
  ToastState,
} from './models';
import {
  DEFAULT_TASK_PROJECT_ID,
  getTaskItemStats,
  getTaskLeafSubtasks,
  normalizeTaskWorkspace,
  syncCompletedProjectColumns,
} from './taskWorkspace';

type RunnerAction = 'done' | 'skip';
const COMPLETION_COOLDOWN_MS = 6 * 60 * 60 * 1000;

type PersistedState = Pick<
  AppStore,
  'user' | 'tasks' | 'taskWorkspace' | 'budget' | 'onboarding' | 'arena' | 'runner' | 'guidedTour'
>;

const initialGuidedTourState: GuidedTourState = {
  active: false,
  step: 0,
  completed: false,
};

export interface AppStore extends AppSnapshot {
  hasHydrated: boolean;
  toast: ToastState | null;
  guidedTour: GuidedTourState;
  tasksView: TasksView;
  budgetView: BudgetView;
  taskFilter: TaskFilter;
  expandedTaskIds: string[];
  collapsedTaskProjectIds: string[];
  setHasHydrated: (value: boolean) => void;
  showToast: (toast: Omit<ToastState, 'id'>) => void;
  clearToast: () => void;
  setTasksView: (view: TasksView) => void;
  setBudgetView: (view: BudgetView) => void;
  setTaskFilter: (filter: TaskFilter) => void;
  setTaskSortMode: (sort: TaskSortMode) => void;
  toggleCompletedTasksAtBottom: () => void;
  toggleAutoMoveCompletedProjects: () => void;
  toggleTaskExpanded: (taskId: string) => void;
  toggleTaskProjectCollapsed: (projectId: string) => void;
  saveTaskProject: (draft: TaskProjectDraft) => void;
  deleteTaskProject: (projectId: string) => void;
  moveTaskProject: (projectId: string, targetProjectId: string, before?: boolean) => void;
  moveProjectToColumn: (projectId: string, columnId: string) => void;
  renameTaskBoardColumn: (columnId: string, name: string) => void;
  addTaskBoardColumn: () => void;
  removeTaskBoardColumn: (columnId: string) => void;
  moveTaskToProject: (taskId: string, projectId: string) => void;
  resetApp: () => void;
  replayOnboarding: () => void;
  setOnboardingName: (value: string) => void;
  updateUserName: (value: string) => void;
  continueFromName: () => void;
  toggleOnboardingSelection: (id: string) => void;
  startOnboardingTournament: () => void;
  chooseOnboardingWinner: (winnerId: string) => void;
  finishOnboarding: (options?: { useSampleTasks?: boolean }) => void;
  saveTask: (draft: TaskDraft) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskEssential: (taskId: string) => void;
  toggleTaskDone: (taskId: string) => void;
  addSubtask: (taskId: string) => void;
  saveSubtask: (taskId: string, draft: SubtaskDraft) => void;
  toggleSubtaskDone: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  moveSubtask: (taskId: string, subtaskId: string, targetSubtaskId: string, before?: boolean) => void;
  moveTask: (taskId: string, targetTaskId: string, before?: boolean) => void;
  startRunner: (taskId: string) => void;
  setRunnerStep: (stepIndex: number) => void;
  advanceRunner: (action: RunnerAction) => void;
  resetRunner: () => void;
  saveExpense: (draft: ExpenseDraft) => void;
  deleteExpense: (itemId: string) => void;
  toggleBudgetEssential: (itemId: string) => void;
  setIncome: (value: number) => void;
  actOnTaskInsight: (insight: TaskInsight) => void;
  actOnBudgetInsight: (insight: BudgetInsight) => void;
  setArenaMode: (mode: ArenaMode) => void;
  ensureArenaReady: () => void;
  commitArenaSwipe: (swipe: ArenaSwipe) => void;
  dismissCompletionOverlay: () => void;
  startGuidedTour: () => void;
  nextGuidedTourStep: (totalSteps: number) => void;
  previousGuidedTourStep: () => void;
  endGuidedTour: () => void;
}

const snapshot = mockRepository.loadSignedOutSnapshot();

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...snapshot,
      hasHydrated: false,
      toast: null,
      guidedTour: initialGuidedTourState,
      tasksView: 'list',
      budgetView: 'overview',
      taskFilter: 'all',
      expandedTaskIds: [],
      collapsedTaskProjectIds: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      showToast: (toast) =>
        set({
          toast: {
            id: createId('toast'),
            ...toast,
          },
        }),
      clearToast: () => set({ toast: null }),
      setTasksView: (view) => set({ tasksView: view }),
      setBudgetView: (view) => set({ budgetView: view }),
      setTaskFilter: (filter) => set({ taskFilter: filter }),
      setTaskSortMode: (sort) =>
        set((state) => ({
          taskWorkspace: {
            ...state.taskWorkspace,
            preferences: { ...state.taskWorkspace.preferences, sort },
          },
        })),
      toggleCompletedTasksAtBottom: () =>
        set((state) => ({
          taskWorkspace: {
            ...state.taskWorkspace,
            preferences: {
              ...state.taskWorkspace.preferences,
              completedAtBottom: !state.taskWorkspace.preferences.completedAtBottom,
            },
          },
        })),
      toggleAutoMoveCompletedProjects: () =>
        set((state) => {
          const taskWorkspace = {
            ...state.taskWorkspace,
            preferences: {
              ...state.taskWorkspace.preferences,
              autoMoveCompletedProjects:
                !state.taskWorkspace.preferences.autoMoveCompletedProjects,
            },
          };
          return {
            taskWorkspace: syncCompletedProjectColumns(taskWorkspace, state.tasks),
          };
        }),
      toggleTaskExpanded: (taskId) =>
        set((state) => ({
          expandedTaskIds: state.expandedTaskIds.includes(taskId)
            ? state.expandedTaskIds.filter((id) => id !== taskId)
            : [...state.expandedTaskIds, taskId],
        })),
      toggleTaskProjectCollapsed: (projectId) =>
        set((state) => ({
          collapsedTaskProjectIds: state.collapsedTaskProjectIds.includes(projectId)
            ? state.collapsedTaskProjectIds.filter((id) => id !== projectId)
            : [...state.collapsedTaskProjectIds, projectId],
        })),
      saveTaskProject: (draft) =>
        set((state) => {
          const workspace = normalizeTaskWorkspace(state.taskWorkspace);
          const existing = workspace.projects.find((project) => project.id === draft.id);
          const project = {
            id: draft.id ?? createId('project'),
            code: draft.code.trim().toUpperCase() || 'PROJECT',
            name: draft.name.trim() || 'Untitled project',
            color: draft.color,
            elo: existing?.elo ?? 1200,
            columnId:
              draft.columnId ?? existing?.columnId ?? workspace.columns[1]?.id ?? workspace.columns[0].id,
            order: existing?.order ?? workspace.projects.length,
            createdAt: existing?.createdAt ?? Date.now(),
          };
          return {
            taskWorkspace: {
              ...workspace,
              projects: existing
                ? workspace.projects.map((entry) => (entry.id === project.id ? project : entry))
                : [...workspace.projects, project],
            },
          };
        }),
      deleteTaskProject: (projectId) =>
        set((state) => {
          if (projectId === DEFAULT_TASK_PROJECT_ID) return state;
          const workspace = normalizeTaskWorkspace(state.taskWorkspace);
          return {
            tasks: state.tasks.map((task) =>
              task.projectId === projectId ? { ...task, projectId: DEFAULT_TASK_PROJECT_ID } : task,
            ),
            taskWorkspace: {
              ...workspace,
              projects: workspace.projects
                .filter((project) => project.id !== projectId)
                .map((project, index) => ({ ...project, order: index })),
            },
            collapsedTaskProjectIds: state.collapsedTaskProjectIds.filter((id) => id !== projectId),
          };
        }),
      moveTaskProject: (projectId, targetProjectId, before = true) =>
        set((state) => {
          const projects = [...state.taskWorkspace.projects];
          const from = projects.findIndex((project) => project.id === projectId);
          if (from < 0 || from === projects.findIndex((project) => project.id === targetProjectId)) return state;
          const [project] = projects.splice(from, 1);
          const targetIndex = projects.findIndex((entry) => entry.id === targetProjectId);
          if (targetIndex < 0) return state;
          projects.splice(before ? targetIndex : targetIndex + 1, 0, project);
          return {
            taskWorkspace: {
              ...state.taskWorkspace,
              projects: projects.map((entry, index) => ({ ...entry, order: index })),
            },
          };
        }),
      moveProjectToColumn: (projectId, columnId) =>
        set((state) => ({
          taskWorkspace: {
            ...state.taskWorkspace,
            projects: state.taskWorkspace.projects.map((project) =>
              project.id === projectId ? { ...project, columnId } : project,
            ),
          },
        })),
      renameTaskBoardColumn: (columnId, name) =>
        set((state) => ({
          taskWorkspace: {
            ...state.taskWorkspace,
            columns: state.taskWorkspace.columns.map((column) =>
              column.id === columnId ? { ...column, name: name.trim() || column.name } : column,
            ),
          },
        })),
      addTaskBoardColumn: () =>
        set((state) => ({
          taskWorkspace: {
            ...state.taskWorkspace,
            columns: [
              ...state.taskWorkspace.columns,
              {
                id: createId('column'),
                name: 'New column',
                order: state.taskWorkspace.columns.length,
              },
            ],
          },
        })),
      removeTaskBoardColumn: (columnId) =>
        set((state) => {
          const hasProjects = state.taskWorkspace.projects.some(
            (project) => project.columnId === columnId,
          );
          if (hasProjects || state.taskWorkspace.columns.length <= 2) return state;
          return {
            taskWorkspace: {
              ...state.taskWorkspace,
              columns: state.taskWorkspace.columns
                .filter((column) => column.id !== columnId)
                .map((column, index) => ({ ...column, order: index })),
            },
          };
        }),
      moveTaskToProject: (taskId, projectId) =>
        set((state) => {
          const tasks = state.tasks.map((task) =>
            task.id === taskId ? { ...task, projectId } : task,
          );
          return {
            tasks,
            taskWorkspace: syncCompletedProjectColumns(state.taskWorkspace, tasks),
          };
        }),
      resetApp: () =>
        set(() => ({
          ...mockRepository.loadSignedOutSnapshot(),
          toast: null,
          guidedTour: initialGuidedTourState,
          collapsedTaskProjectIds: [],
        })),
      replayOnboarding: () =>
        set((state) => {
          const base = mockRepository.loadSignedOutSnapshot();

          return {
            ...state,
            onboarding: base.onboarding,
            guidedTour: initialGuidedTourState,
            runner: base.runner,
            arena: base.arena,
            toast: null,
            expandedTaskIds: [],
            collapsedTaskProjectIds: [],
          };
        }),
      setOnboardingName: (value) =>
        set((state) => ({
          onboarding: {
            ...state.onboarding,
            nameDraft: value,
          },
        })),
      updateUserName: (value) =>
        set((state) => ({
          user: {
            ...state.user,
            name: value.trim() || state.user.name,
          },
          onboarding: {
            ...state.onboarding,
            nameDraft: value.trim() || state.onboarding.nameDraft,
          },
        })),
      continueFromName: () =>
        set((state) => ({
          onboarding: {
            ...state.onboarding,
            step: 'priorities',
          },
        })),
      toggleOnboardingSelection: (id) =>
        set((state) => {
          const selectedIds = state.onboarding.selectedIds.includes(id)
            ? state.onboarding.selectedIds.filter((entry) => entry !== id)
            : [...state.onboarding.selectedIds, id];

          return {
            onboarding: {
              ...state.onboarding,
              selectedIds,
            },
          };
        }),
      startOnboardingTournament: () =>
        set((state) => {
          const selected = OB_TASKS.filter((option) => state.onboarding.selectedIds.includes(option.id));
          if (selected.length < 4) return state;

          const seedTasks = buildOnboardingSeedTasks(selected);
          return {
            onboarding: {
              ...state.onboarding,
              step: 'tournament',
              seedTasks,
              pairQueue: buildTournamentPairs(seedTasks),
              round: 0,
            },
          };
        }),
      chooseOnboardingWinner: (winnerId) =>
        set((state) => {
          const pair = state.onboarding.pairQueue[state.onboarding.round];
          if (!pair) return state;

          const [leftId, rightId] = pair;
          const loserId = winnerId === leftId ? rightId : leftId;
          const seedTasks = state.onboarding.seedTasks.map((task) => {
            if (task.id === winnerId) return { ...task, elo: task.elo + 16 };
            if (task.id === loserId) return { ...task, elo: task.elo - 16 };
            return task;
          });
          const nextRound = state.onboarding.round + 1;

          return {
            onboarding: {
              ...state.onboarding,
              seedTasks,
              round: nextRound,
              step: nextRound >= state.onboarding.pairQueue.length ? 'reveal' : 'tournament',
            },
          };
        }),
      finishOnboarding: (options) =>
        set((state) => {
          const seedTasks = sortedTasks(state.onboarding.seedTasks, true);
          const useSampleTasks = options?.useSampleTasks ?? false;
          const nextTasks = useSampleTasks ? seedTasks : [];
          const nextBudget = useSampleTasks
            ? mockRepository.loadOnboardingSampleBudget()
            : mockRepository.loadSignedOutSnapshot().budget;
          const name = state.onboarding.nameDraft.trim() || state.user.name;
          const onboarding = {
            ...state.onboarding,
            completed: true,
            step: 'name' as const,
            nameDraft: name,
            selectedIds: [],
            seedTasks,
            pairQueue: buildTournamentPairs(seedTasks),
            round: 0,
          };
          const nextArena = ensureArenaPair(
            'tasks',
            nextTasks,
            nextBudget,
            state.taskWorkspace,
            null,
            null,
            0,
          );

          return {
            tasks: nextTasks,
            budget: nextBudget,
            user: {
              ...state.user,
              name,
            },
            onboarding,
            arena: {
              ...state.arena,
              mode: 'tasks',
              progress: 0,
              totalCommits: 0,
              championId: nextArena.championId,
              challengerId: nextArena.challengerId,
              rotationIndex: nextArena.rotationIndex,
              completionVisible: false,
              lastCompletionAt: null,
            },
          };
        }),
      saveTask: (draft) =>
        set((state) => {
          const task: Task = {
            id: draft.id ?? createId('task'),
            e: draft.e,
            n: draft.n.trim(),
            t: draft.t.trim(),
            elo: draft.id
              ? state.tasks.find((entry) => entry.id === draft.id)?.elo ?? 1200
              : 1200,
            ess: draft.ess,
            dl: draft.dl,
            urg: deadlineToUrgency(draft.dl),
            done: draft.id
              ? state.tasks.find((entry) => entry.id === draft.id)?.done ?? false
              : false,
            subtasks: draft.id
              ? state.tasks.find((entry) => entry.id === draft.id)?.subtasks ?? []
              : [],
            detail: draft.detail?.trim() || undefined,
            dueLabel: draft.dueLabel?.trim() || undefined,
            projectId:
              draft.projectId ??
              state.tasks.find((entry) => entry.id === draft.id)?.projectId ??
              DEFAULT_TASK_PROJECT_ID,
            createdAt:
              state.tasks.find((entry) => entry.id === draft.id)?.createdAt ?? Date.now(),
            order:
              state.tasks.find((entry) => entry.id === draft.id)?.order ?? state.tasks.length,
          };
          const tasks = draft.id
            ? state.tasks.map((entry) => (entry.id === draft.id ? task : entry))
            : [task, ...state.tasks];

          return syncArena({
            ...state,
            tasks,
            taskWorkspace: syncCompletedProjectColumns(state.taskWorkspace, tasks),
          });
        }),
      deleteTask: (taskId) =>
        set((state) => {
          const tasks = state.tasks.filter((task) => task.id !== taskId);
          return syncArena({
            ...state,
            tasks,
            taskWorkspace: syncCompletedProjectColumns(state.taskWorkspace, tasks),
            expandedTaskIds: state.expandedTaskIds.filter((id) => id !== taskId),
            runner:
              state.runner.taskId === taskId
                ? { taskId: null, stepIndex: 0, completed: false }
                : state.runner,
          });
        }),
      toggleTaskEssential: (taskId) =>
        set((state) => {
          const nextTasks = state.tasks.map((task) =>
            task.id === taskId ? { ...task, ess: !task.ess } : task,
          );
          const task = nextTasks.find((entry) => entry.id === taskId);

          return {
            ...syncArena({
              ...state,
              tasks: nextTasks,
            }),
            user: {
              ...state.user,
              xp: task?.ess ? state.user.xp + ESSENTIAL_XP : state.user.xp,
            },
            toast: task?.ess
              ? {
                  id: createId('toast'),
                  icon: '⭐',
                  title: 'This task graduates',
                  subtitle: 'It will stay at the top and leave the arena.',
                }
              : state.toast,
          };
        }),
      toggleTaskDone: (taskId) =>
        set((state) => {
          let user = state.user;
          let shouldCollapse = false;
          const tasks = state.tasks.map((task) => {
            if (task.id !== taskId) return task;
            if (!task.done) {
              const result = markTaskDone(user, task, true);
              user = result.user;
              return result.task;
            }

            user = { ...user, done: Math.max(0, user.done - 1) };
            shouldCollapse = true;
            return {
              ...task,
              done: false,
              subtasks: task.subtasks.map((subtask) => ({
                ...subtask,
                done: false,
              })),
            };
          });

          return syncArena({
            ...state,
            user,
            tasks,
            taskWorkspace: syncCompletedProjectColumns(state.taskWorkspace, tasks),
            expandedTaskIds: shouldCollapse
              ? state.expandedTaskIds.filter((id) => id !== taskId)
              : state.expandedTaskIds,
          });
        }),
      addSubtask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;

            return {
              ...task,
              subtasks: [
                ...task.subtasks,
                {
                  id: createId('subtask'),
                  e: '📌',
                  n: 'New step',
                  done: false,
                  why: '',
                  order: task.subtasks.length,
                },
              ],
            };
          }),
        })),
      saveSubtask: (taskId, draft) =>
        set((state) => {
          const tasks = state.tasks.map((task) => {
            if (task.id !== taskId) return task;

            const existing = task.subtasks.find((subtask) => subtask.id === draft.id);
            const nextSubtask = {
              id: draft.id ?? createId('subtask'),
              e: draft.e,
              n: draft.n.trim() || 'Untitled step',
              why: draft.why?.trim() || '',
              done: existing?.done ?? false,
              order: existing?.order ?? task.subtasks.length,
              parentId: existing?.parentId ?? null,
            };

            return {
              ...task,
              done: draft.id ? task.done : false,
              subtasks: draft.id
                ? task.subtasks.map((subtask) => (subtask.id === draft.id ? nextSubtask : subtask))
                : [...task.subtasks, nextSubtask],
            };
          });
          return {
            tasks,
            taskWorkspace: syncCompletedProjectColumns(state.taskWorkspace, tasks),
          };
        }),
      toggleSubtaskDone: (taskId, subtaskId) =>
        set((state) => {
          let user = state.user;
          const tasks = state.tasks.map((task) => {
            if (task.id !== taskId) return task;

            const subtasks = task.subtasks.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask,
            );
            const nextTask = { ...task, subtasks };
            const progress = getTaskItemStats(nextTask);
            const allDone = progress.total > 0 && progress.complete === progress.total;

            if (allDone && !task.done) {
              user = {
                ...user,
                xp: user.xp + TASK_DONE_XP,
                done: user.done + 1,
              };
            }

            if (!allDone && task.done) {
              user = { ...user, done: Math.max(0, user.done - 1) };
            }

            return {
              ...task,
              subtasks,
              done: allDone,
            };
          });

          return syncArena({
            ...state,
            user,
            tasks,
            taskWorkspace: syncCompletedProjectColumns(state.taskWorkspace, tasks),
          });
        }),
      deleteSubtask: (taskId, subtaskId) =>
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;
            return {
              ...task,
              subtasks: task.subtasks
                .filter((subtask) => subtask.id !== subtaskId)
                .map((subtask, index) => ({ ...subtask, order: index })),
            };
          }),
        })),
      moveSubtask: (taskId, subtaskId, targetSubtaskId, before = true) =>
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;

            const from = task.subtasks.findIndex((subtask) => subtask.id === subtaskId);
            const to = task.subtasks.findIndex((subtask) => subtask.id === targetSubtaskId);
            if (from < 0 || to < 0 || to >= task.subtasks.length || from === to) return task;

            const subtasks = [...task.subtasks];
            const [item] = subtasks.splice(from, 1);
            const targetIndex = subtasks.findIndex((subtask) => subtask.id === targetSubtaskId);
            subtasks.splice(before ? targetIndex : targetIndex + 1, 0, item);

            return {
              ...task,
              subtasks: subtasks.map((subtask, index) => ({ ...subtask, order: index })),
            };
          }),
        })),
      moveTask: (taskId, targetTaskId, before = true) =>
        set((state) => {
          const from = state.tasks.findIndex((task) => task.id === taskId);
          if (from < 0 || from === state.tasks.findIndex((task) => task.id === targetTaskId)) return state;

          const tasks = [...state.tasks];
          const [item] = tasks.splice(from, 1);
          const targetIndex = tasks.findIndex((task) => task.id === targetTaskId);
          if (targetIndex < 0) return state;
          tasks.splice(before ? targetIndex : targetIndex + 1, 0, item);

          return {
            ...state,
            tasks: tasks.map((task, index) => ({ ...task, order: index })),
          };
        }),
      startRunner: (taskId) =>
        set((state) => {
          const task = state.tasks.find((entry) => entry.id === taskId);
          if (!task || task.subtasks.length === 0) {
            return state;
          }

          const orderedSubtasks = getTaskLeafSubtasks(task);
          const firstOpenIndex = orderedSubtasks.findIndex((subtask) => !subtask.done);
          const nextStepIndex = firstOpenIndex >= 0 ? firstOpenIndex : 0;
          const alreadyRunning =
            state.runner.taskId === taskId &&
            state.runner.stepIndex === nextStepIndex;

          if (alreadyRunning) {
            return state;
          }

          return {
            runner: {
              taskId,
              stepIndex: nextStepIndex,
              completed: false,
            },
          };
        }),
      setRunnerStep: (stepIndex) =>
        set((state) => {
          const task = state.tasks.find((entry) => entry.id === state.runner.taskId);
          if (!task) return state;

          const orderedSubtasks = getTaskLeafSubtasks(task);
          const nextStepIndex = Math.max(0, Math.min(stepIndex, Math.max(0, orderedSubtasks.length - 1)));

          if (state.runner.stepIndex === nextStepIndex && !state.runner.completed) {
            return state;
          }

          return {
            runner: {
              taskId: task.id,
              stepIndex: nextStepIndex,
              completed: false,
            },
          };
        }),
      advanceRunner: (action) =>
        set((state) => {
          const task = state.tasks.find((entry) => entry.id === state.runner.taskId);
          if (!task) return state;

          let user = state.user;
          const currentIndex = state.runner.stepIndex;
          const orderedSubtasks = getTaskLeafSubtasks(task);
          const activeSubtaskId = orderedSubtasks[currentIndex]?.id ?? null;
          if (!activeSubtaskId) {
            return {
              ...state,
              runner: {
                taskId: task.id,
                stepIndex: currentIndex,
                completed: true,
              },
            };
          }

          const subtasks = task.subtasks.map((subtask) =>
            subtask.id === activeSubtaskId && action === 'done' ? { ...subtask, done: true } : subtask,
          );
          const nextOrderedSubtasks = getTaskLeafSubtasks({ ...task, subtasks });
          const allDone = nextOrderedSubtasks.length > 0 && nextOrderedSubtasks.every((subtask) => subtask.done);
          const nextOpenIndex = nextOrderedSubtasks.findIndex((subtask) => !subtask.done);
          const nextIndex = allDone ? currentIndex : nextOpenIndex >= 0 ? nextOpenIndex : currentIndex;

          const tasks = state.tasks.map((entry) => {
            if (entry.id !== task.id) return entry;
            return {
              ...entry,
              subtasks,
              done: allDone || entry.done,
            };
          });

          if (allDone && !task.done) {
            user = {
              ...user,
              xp: user.xp + TASK_DONE_XP,
              done: user.done + 1,
            };
          }

          return {
            ...syncArena({
              ...state,
              user,
              tasks,
              taskWorkspace: syncCompletedProjectColumns(state.taskWorkspace, tasks),
            }),
            runner: {
              taskId: task.id,
              stepIndex: nextIndex,
              completed: allDone || currentIndex >= nextOrderedSubtasks.length - 1,
            },
          };
        }),
      resetRunner: () =>
        set({
          runner: {
            taskId: null,
            stepIndex: 0,
            completed: false,
          },
        }),
      saveExpense: (draft) =>
        set((state) => {
          const nextItem = {
            id: draft.id ?? createId('budget'),
            e: draft.e,
            n: draft.n.trim(),
            amt: Number.isFinite(draft.amt) ? draft.amt : 0,
            type: draft.type,
            ess: draft.ess,
            elo: draft.id
              ? state.budget.items.find((item) => item.id === draft.id)?.elo ?? 1200
              : 1200,
            comps: draft.id
              ? state.budget.items.find((item) => item.id === draft.id)?.comps ?? 0
              : 0,
            createdAt:
              state.budget.items.find((item) => item.id === draft.id)?.createdAt ?? Date.now(),
          };
          const items = draft.id
            ? state.budget.items.map((item) => (item.id === draft.id ? nextItem : item))
            : [...state.budget.items, nextItem];

          return syncArena({
            ...state,
            budget: {
              ...state.budget,
              items,
            },
          });
        }),
      deleteExpense: (itemId) =>
        set((state) =>
          syncArena({
            ...state,
            budget: {
              ...state.budget,
              items: state.budget.items.filter((item) => item.id !== itemId),
            },
          }),
        ),
      toggleBudgetEssential: (itemId) =>
        set((state) => {
          const items = state.budget.items.map((item) =>
            item.id === itemId ? { ...item, ess: !item.ess } : item,
          );
          const item = items.find((entry) => entry.id === itemId);
          return {
            ...syncArena({
              ...state,
              budget: {
                ...state.budget,
                items,
              },
            }),
            toast: item?.ess
              ? {
                  id: createId('toast'),
                  icon: '⭐',
                  title: 'Budget item marked essential',
                  subtitle: 'It will be excluded from budget ranking.',
                }
              : state.toast,
          };
        }),
      setIncome: (value) =>
        set((state) => ({
          budget: {
            ...state.budget,
            income: value,
          },
        })),
      actOnTaskInsight: (insight) =>
        insight.action === 'none'
          ? set((state) => ({
              toast: {
                id: createId('toast'),
                icon: insight.emoji,
                title: insight.title,
                subtitle: 'We will keep learning from the emoji patterns you create.',
              },
            }))
          :
        set((state) =>
          ({
            ...syncArena({
              ...state,
              tasks: applyTaskInsight(state.tasks, insight),
            }),
            toast: {
              id: createId('toast'),
              icon: '✨',
              title: insight.cta,
              subtitle: 'Your task list has been updated.',
            },
          }) satisfies Partial<AppStore>,
        ),
      actOnBudgetInsight: (insight) =>
        set((state) =>
          ({
            ...syncArena({
              ...state,
              budget: applyBudgetInsight(state.budget, insight),
            }),
            toast: {
              id: createId('toast'),
              icon: '💡',
              title: insight.cta,
              subtitle: 'Your budget view has been updated.',
            },
          }) satisfies Partial<AppStore>,
        ),
      setArenaMode: (mode) =>
        set((state) =>
          syncArena({
            ...state,
            arena: {
              ...state.arena,
              mode,
              championId: null,
              challengerId: null,
              rotationIndex: 0,
            },
          }),
        ),
      ensureArenaReady: () =>
        set((state) => syncArena(state)),
      commitArenaSwipe: (swipe) =>
        set((state) => {
          const arena = ensureArenaPair(
            state.arena.mode,
            state.tasks,
            state.budget,
            state.taskWorkspace,
            state.arena.championId,
            state.arena.challengerId,
            state.arena.rotationIndex,
          );
          const championId = arena.championId;
          const challengerId = arena.challengerId;

          if (!championId || !challengerId) return { ...state, arena: { ...state.arena, ...arena } };

          if (swipe === 'skip') {
            const rotationIndex = nextArenaRotation(
              state.arena.mode,
              state.tasks,
              state.budget,
              state.taskWorkspace,
              championId,
              state.arena.rotationIndex,
            );
            const nextArena = ensureArenaPair(
              state.arena.mode,
              state.tasks,
              state.budget,
              state.taskWorkspace,
              championId,
              null,
              rotationIndex,
            );

            return {
              arena: {
                ...state.arena,
                ...nextArena,
              },
            };
          }

          if (swipe === 'essential' && state.arena.mode === 'projects') {
            return state;
          }

          if (swipe === 'essential') {
            if (state.arena.mode === 'tasks') {
              const tasks = state.tasks.map((task) =>
                task.id === challengerId ? { ...task, ess: true } : task,
              );
              const baseArena = normalizeArenaWindow(state.arena);
              const progress = Math.min(baseArena.progress + 1, 3);
              const didComplete = progress >= 3 && canShowCompletion(baseArena.lastCompletionAt);
              const nextArena = ensureArenaPair(
                state.arena.mode,
                tasks,
                state.budget,
                state.taskWorkspace,
                championId,
                null,
                nextArenaRotation(
                  state.arena.mode,
                  tasks,
                  state.budget,
                  state.taskWorkspace,
                  championId,
                  state.arena.rotationIndex,
                ),
              );

              return finalizeCommit({
                ...state,
                tasks,
                user: {
                  ...state.user,
                  xp: state.user.xp + ESSENTIAL_XP,
                },
                toast: {
                  id: createId('toast'),
                  icon: '⭐',
                  title: 'This task graduates',
                  subtitle: 'It leaves the arena and rises to the top.',
                },
                arena: {
                  ...baseArena,
                  ...nextArena,
                  progress,
                  totalCommits: state.arena.totalCommits + 1,
                  completionVisible: didComplete,
                },
              });
            }

            const budget = {
              ...state.budget,
              items: state.budget.items.map((item) =>
                item.id === challengerId ? { ...item, ess: true } : item,
              ),
            };
            const baseArena = normalizeArenaWindow(state.arena);
            const progress = Math.min(baseArena.progress + 1, 3);
            const didComplete = progress >= 3 && canShowCompletion(baseArena.lastCompletionAt);
            const nextArena = ensureArenaPair(
              state.arena.mode,
              state.tasks,
              budget,
              state.taskWorkspace,
              championId,
              null,
              nextArenaRotation(
                state.arena.mode,
                state.tasks,
                budget,
                state.taskWorkspace,
                championId,
                state.arena.rotationIndex,
              ),
            );

            return finalizeCommit({
              ...state,
              budget,
              user: {
                ...state.user,
                xp: state.user.xp + ESSENTIAL_XP,
              },
              toast: {
                id: createId('toast'),
                icon: '⭐',
                title: 'Budget item marked essential',
                subtitle: 'It leaves the comparison pool.',
              },
              arena: {
                ...baseArena,
                ...nextArena,
                progress,
                totalCommits: state.arena.totalCommits + 1,
                completionVisible: didComplete,
              },
            });
          }

          const result = applyArenaResult(
            state.arena.mode,
            state.tasks,
            state.budget,
            state.taskWorkspace,
            championId,
            challengerId,
            swipe,
          );
          const baseArena = normalizeArenaWindow(state.arena);
          const progress = Math.min(baseArena.progress + 1, 3);
          const didComplete = progress >= 3 && canShowCompletion(baseArena.lastCompletionAt);
          const rotationIndex = nextArenaRotation(
            state.arena.mode,
            result.tasks,
            result.budget,
            result.taskWorkspace,
            result.championId,
            state.arena.rotationIndex,
          );
          const nextArena = ensureArenaPair(
            state.arena.mode,
            result.tasks,
            result.budget,
            result.taskWorkspace,
            result.championId,
            null,
            rotationIndex,
          );

          return finalizeCommit({
            ...state,
            tasks: result.tasks,
            budget: result.budget,
            taskWorkspace: result.taskWorkspace,
            user: {
              ...state.user,
              xp: state.user.xp + result.xpDelta,
              comparisons: state.user.comparisons + result.comparisonsDelta,
            },
            arena: {
              ...baseArena,
              ...nextArena,
              progress,
              totalCommits: state.arena.totalCommits + 1,
              completionVisible: didComplete,
            },
          });
        }),
      dismissCompletionOverlay: () =>
        set((state) => ({
          arena: {
            ...normalizeArenaWindow(state.arena),
            progress: 0,
            completionVisible: false,
          },
        })),
      startGuidedTour: () =>
        set({
          guidedTour: {
            active: true,
            step: 0,
            completed: false,
          },
        }),
      nextGuidedTourStep: (totalSteps) =>
        set((state) => {
          const nextStep = state.guidedTour.step + 1;
          if (nextStep >= totalSteps) {
            return {
              guidedTour: {
                active: false,
                step: totalSteps - 1,
                completed: true,
              },
            };
          }

          return {
            guidedTour: {
              ...state.guidedTour,
              active: true,
              step: nextStep,
            },
          };
        }),
      previousGuidedTourStep: () =>
        set((state) => ({
          guidedTour: {
            ...state.guidedTour,
            active: true,
            step: Math.max(0, state.guidedTour.step - 1),
          },
        })),
      endGuidedTour: () =>
        set((state) => ({
          guidedTour: {
            active: false,
            step: state.guidedTour.step,
            completed: true,
          },
        })),
    }),
    {
      name: 'wouldyouiq-v10-front-end',
      version: 12,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedState => ({
        user: state.user,
        tasks: state.tasks,
        taskWorkspace: state.taskWorkspace,
        budget: state.budget,
        onboarding: state.onboarding,
        arena: state.arena,
        runner: state.runner,
        guidedTour: state.guidedTour,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

function syncArena(state: AppStore) {
  const arenaState = normalizeArenaWindow(state.arena);
  const taskWorkspace = normalizeTaskWorkspace(state.taskWorkspace);
  const nextArena = ensureArenaPair(
    arenaState.mode,
    state.tasks,
    state.budget,
    taskWorkspace,
    arenaState.championId,
    arenaState.challengerId,
    arenaState.rotationIndex,
  );

  return {
    ...state,
    taskWorkspace,
    arena: {
      ...arenaState,
      ...nextArena,
    },
  };
}

function finalizeCommit(state: AppStore) {
  if (!state.arena.completionVisible) {
    return state;
  }

  const today = todayKey();
  const streak =
    state.user.lastCalibrationDate === today
      ? state.user.streak
      : state.user.lastCalibrationDate === yesterdayKey(today)
      ? state.user.streak + 1
      : 1;

  return {
    ...state,
    user: {
      ...state.user,
      xp: state.user.xp + COMPLETION_XP,
      streak,
      lastCalibrationDate: today,
    },
    arena: {
      ...state.arena,
      lastCompletionAt: Date.now(),
    },
    toast: {
      id: createId('toast'),
      icon: '🎯',
      title: 'Priorities Updated!',
      subtitle: `+${COMPLETION_XP} XP and your streak is now ${streak} day${streak === 1 ? '' : 's'}.`,
    },
  };
}

function yesterdayKey(today: string) {
  const date = new Date(today);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function canShowCompletion(lastCompletionAt: number | null) {
  return !lastCompletionAt || Date.now() - lastCompletionAt >= COMPLETION_COOLDOWN_MS;
}

function normalizeArenaWindow(arena: AppStore['arena']) {
  if (!arena.lastCompletionAt) {
    return arena;
  }

  if (Date.now() - arena.lastCompletionAt < COMPLETION_COOLDOWN_MS) {
    return arena;
  }

  return {
    ...arena,
    progress: 0,
    completionVisible: false,
    lastCompletionAt: null,
  };
}
