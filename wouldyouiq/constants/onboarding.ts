import type { OnboardingOption } from '@/domain/models';

export const OB_TASKS: OnboardingOption[] = [
  { id: 'exercise', e: '🏋️', n: 'Workout', t: '30 min' },
  { id: 'study', e: '📚', n: 'Study for Exam', t: '45 min' },
  { id: 'startup', e: '💡', n: 'Work on Startup', t: '60 min' },
  { id: 'read', e: '📖', n: 'Read', t: '20 min' },
  { id: 'meditate', e: '🧘', n: 'Meditate', t: '10 min' },
  { id: 'inbox', e: '✉️', n: 'Clear Inbox', t: '15 min' },
  { id: 'finance', e: '💰', n: 'Review Finances', t: '20 min' },
  { id: 'creative', e: '🎸', n: 'Creative Practice', t: '25 min' },
  { id: 'outside', e: '🌿', n: 'Walk Outside', t: '20 min' },
  { id: 'people', e: '👨‍👩‍👧', n: 'Family / Friends', t: '30 min' },
  { id: 'cook', e: '🍳', n: 'Cook at Home', t: '35 min' },
  { id: 'sleep', e: '💤', n: 'Sleep Early', t: '15 min' },
];
