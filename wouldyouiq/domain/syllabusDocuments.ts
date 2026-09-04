import type { SyllabusDocument } from "./models.ts";

export function cloudSyllabi(
  documents: SyllabusDocument[],
  ownerId?: string | null,
): SyllabusDocument[] {
  return documents
    .filter(
      (document) =>
        !!document.remotePath && (!ownerId || document.ownerId === ownerId),
    )
    .map((document) => ({
      ...document,
      localUri: null,
      textContent: undefined,
    }));
}

export function mergeSyllabi(
  remote: SyllabusDocument[] | undefined,
  local: SyllabusDocument[],
  ownerId: string,
): SyllabusDocument[] {
  const remoteDocuments = (remote ?? []).filter(
    (document) => document.ownerId === ownerId,
  );
  const merged = remoteDocuments.map((document) => ({
    ...document,
    localUri:
      local.find(
        (entry) => entry.id === document.id && entry.ownerId === ownerId,
      )?.localUri ?? null,
  }));
  // Keep offline uploads that have not reached cloud storage yet.
  return [
    ...local.filter(
      (document) =>
        document.ownerId === ownerId &&
        !document.remotePath &&
        !merged.some((entry) => entry.id === document.id),
    ),
    ...merged,
  ];
}

export function recoverSyllabusScans(
  documents: SyllabusDocument[] = [],
): SyllabusDocument[] {
  return documents.map((document) =>
    document.extractionStatus === "extracting"
      ? {
          ...document,
          extractionStatus: "error",
          extractionError: "The scan was interrupted. You can try again.",
        }
      : document,
  );
}
