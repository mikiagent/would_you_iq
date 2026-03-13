import { mockRepository } from '@/data/mockRepository';

const snapshot = mockRepository.loadSnapshot();

export const initialUser = snapshot.user;
export const initialTasks = snapshot.tasks;
export const initialBudget = snapshot.budget;
