import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import type { SyllabusDocument, SyllabusSourceKind } from "@/domain/models";
import { supabase } from "@/lib/supabase";
import {
  decodeBase64,
  encodeBase64,
  safeSyllabusFilename,
  validateSource,
} from "@/lib/syllabusFiles";

const SYLLABUS_BUCKET = "syllabi";
const SYLLABUS_DIRECTORY = "syllabi";

type StoreSyllabusSourceInput = {
  id: string;
  userId: string;
  kind: SyllabusSourceKind;
  data: string;
  filename: string;
  mimeType: string;
};

export type StoredSyllabusSource = {
  localUri: string | null;
  remotePath: string | null;
  remoteError: string | null;
};

async function assertOwner(ownerId: string) {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id !== ownerId)
    throw new Error("Sign in to the account that owns this syllabus.");
}

async function writeLocalSource(
  input: StoreSyllabusSourceInput,
  filename: string,
) {
  if (Platform.OS === "web" || !FileSystem.documentDirectory) return null;
  const directory = `${FileSystem.documentDirectory}${SYLLABUS_DIRECTORY}/${input.userId}`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const localUri = `${directory}/${input.id}-${filename}`;
  await FileSystem.writeAsStringAsync(localUri, input.data, {
    encoding:
      input.kind === "text"
        ? FileSystem.EncodingType.UTF8
        : FileSystem.EncodingType.Base64,
  });
  return localUri;
}

async function uploadCloudSource(
  input: StoreSyllabusSourceInput,
  filename: string,
) {
  await assertOwner(input.userId);
  const remotePath = `${input.userId}/${input.id}/${filename}`;
  const body =
    input.kind === "text"
      ? new Uint8Array(
          Array.from(unescape(encodeURIComponent(input.data)), (char) =>
            char.charCodeAt(0),
          ),
        ).buffer
      : decodeBase64(input.data);
  const { error } = await supabase.storage
    .from(SYLLABUS_BUCKET)
    .upload(remotePath, body, {
      contentType: input.mimeType,
      upsert: true,
    });
  if (error) throw error;
  return remotePath;
}

export async function storeSyllabusSource(
  input: StoreSyllabusSourceInput,
): Promise<StoredSyllabusSource> {
  validateSource(input.data, input.kind);
  await assertOwner(input.userId);
  const filename = safeSyllabusFilename(input.filename, input.kind);
  // A full disk should not prevent a cloud upload.
  const localUri = await writeLocalSource(input, filename).catch(() => null);

  try {
    const remotePath = await uploadCloudSource(input, filename);
    return { localUri, remotePath, remoteError: null };
  } catch {
    return {
      localUri,
      remotePath: null,
      remoteError: localUri
        ? "The cloud copy failed, but the syllabus is stored on this device."
        : "Cloud upload failed. The syllabus could not be stored.",
    };
  }
}

export async function readSyllabusSource(document: SyllabusDocument) {
  await assertOwner(document.ownerId);
  if (document.kind === "text" && document.textContent !== undefined) {
    return document.textContent;
  }

  if (document.localUri && Platform.OS !== "web") {
    try {
      const uri = localSourceUri(document);
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        return await FileSystem.readAsStringAsync(uri, {
          encoding:
            document.kind === "text"
              ? FileSystem.EncodingType.UTF8
              : FileSystem.EncodingType.Base64,
        });
      }
    } catch {
      // A local path from another install is not portable. Fall back to cloud storage.
    }
  }

  if (document.remotePath) {
    const { data, error } = await supabase.storage
      .from(SYLLABUS_BUCKET)
      .download(document.remotePath);
    if (error || !data)
      throw error ?? new Error("The stored syllabus is unavailable.");
    if (typeof data.arrayBuffer === "function") {
      const buffer = await data.arrayBuffer();
      return document.kind === "text"
        ? await data.text()
        : encodeBase64(buffer);
    }
    // React Native Blob implements FileReader, but not Blob.arrayBuffer.
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () =>
        reject(new Error("Could not read the stored syllabus."));
      reader.onload = () => {
        const result = String(reader.result);
        resolve(
          document.kind === "text"
            ? result
            : result.slice(result.indexOf(",") + 1),
        );
      };
      if (document.kind === "text") reader.readAsText(data);
      else reader.readAsDataURL(data);
    });
  }

  throw new Error("The stored syllabus file is unavailable on this device.");
}

export async function deleteSyllabusSource(document: SyllabusDocument) {
  await assertOwner(document.ownerId);
  if (document.remotePath) {
    const { error } = await supabase.storage
      .from(SYLLABUS_BUCKET)
      .remove([document.remotePath]);
    if (error)
      throw new Error(
        "Could not delete the cloud file. Check your connection and retry.",
      );
  }
  if (document.localUri && Platform.OS !== "web") {
    await FileSystem.deleteAsync(localSourceUri(document), {
      idempotent: true,
    });
  }
}

function localSourceUri(document: SyllabusDocument) {
  // iOS can change the app sandbox prefix after an update.
  return `${FileSystem.documentDirectory}${SYLLABUS_DIRECTORY}/${document.ownerId}/${document.id}-${safeSyllabusFilename(document.filename, document.kind)}`;
}

export async function getSyllabusUrl(document: SyllabusDocument) {
  await assertOwner(document.ownerId);
  if (document.remotePath) {
    const { data, error } = await supabase.storage
      .from(SYLLABUS_BUCKET)
      .createSignedUrl(document.remotePath, 300);
    if (error)
      throw new Error(
        "Could not open this syllabus. Check your connection and retry.",
      );
    return data.signedUrl;
  }
  return null;
}

export async function clearLocalSyllabusFiles(userId: string) {
  if (Platform.OS === "web" || !FileSystem.documentDirectory) return;
  // Exact account folder only. Local documents are copies of the user's chosen uploads.
  await FileSystem.deleteAsync(
    `${FileSystem.documentDirectory}${SYLLABUS_DIRECTORY}/${userId}`,
    { idempotent: true },
  );
}
