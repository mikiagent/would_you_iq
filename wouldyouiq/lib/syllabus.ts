import { supabase } from '@/lib/supabase';
import type { ExtractedAssignment } from '@/lib/syllabusMapping';

export {
  assignmentToTaskDraft,
  deriveDeadline,
  formatDueDate,
  type ExtractedAssignment,
} from '@/lib/syllabusMapping';

export type { SyllabusSourceKind } from '@/domain/models';
import type { SyllabusSourceKind } from '@/domain/models';

// Raw-file cap enforced before base64 encoding; the edge function enforces
// a matching cap server-side.
export { MAX_SYLLABUS_FILE_BYTES } from '@/lib/syllabusFiles';

export async function extractAssignments({
  kind,
  data,
  filename,
  ownerId,
  mimeType,
}: {
  kind: SyllabusSourceKind;
  data: string;
  filename?: string;
  ownerId?: string;
  mimeType?: string;
}): Promise<ExtractedAssignment[]> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session || (ownerId && auth.session.user.id !== ownerId)) {
    throw new Error('Sign in to the account that owns this syllabus.');
  }
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: result, error } = await supabase.functions.invoke('syllabus-extract', {
    headers: { Authorization: `Bearer ${auth.session.access_token}` },
    body: { kind, data, filename, timezone, mimeType },
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
