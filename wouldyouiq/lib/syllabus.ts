import { supabase } from '@/lib/supabase';
import type { ExtractedAssignment } from '@/lib/syllabusMapping';

export {
  assignmentToTaskDraft,
  deriveDeadline,
  formatDueDate,
  type ExtractedAssignment,
} from '@/lib/syllabusMapping';

export type SyllabusSourceKind = 'pdf' | 'image' | 'text';

// Raw-file cap enforced before base64 encoding; the edge function enforces
// a matching cap server-side.
export const MAX_SYLLABUS_FILE_BYTES = 5 * 1024 * 1024;

export async function extractAssignments({
  kind,
  data,
  filename,
}: {
  kind: SyllabusSourceKind;
  data: string;
  filename?: string;
}): Promise<ExtractedAssignment[]> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: result, error } = await supabase.functions.invoke('syllabus-extract', {
    body: { kind, data, filename, timezone },
  });

  if (error) {
    // FunctionsHttpError carries the function's JSON error body.
    const context = (error as any)?.context;
    if (context && typeof context.json === 'function') {
      const body = await context.json().catch(() => null);
      if (body?.error) {
        throw new Error(body.error);
      }
    }
    throw new Error('Syllabus import failed. Check your connection and try again.');
  }

  return (result?.assignments ?? []) as ExtractedAssignment[];
}
