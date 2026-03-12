import type { Budget, Task, User } from '@/domain/models';
import { initialBudget, initialTasks, initialUser } from '@/data/mockData';

// Thin abstraction over local in-memory data.
// TODO: Replace implementations with Supabase-backed queries/mutations.

export async function loadUser(): Promise<User> {
  return initialUser;
}

export async function loadTasks(): Promise<Task[]> {
  return initialTasks;
}

export async function loadBudget(): Promise<Budget> {
  return initialBudget;
}

export async function saveTask(task: Task): Promise<Task> {
  return task;
}

