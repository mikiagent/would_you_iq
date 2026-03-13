/*
import type { AppSnapshot } from '@/domain/models';

// Future frontend integration point.
// Intentionally unused for now so the app remains fully local-first.
export const supabaseRepository = {
  async loadSnapshot(): Promise<AppSnapshot> {
    // TODO: wire Supabase auth + profile/task/budget tables here.
    // const { data } = await supabase.from('profiles').select(...);
    throw new Error('Supabase integration is intentionally disabled in the frontend-only build.');
  },
};
*/
