export const MAX_SYLLABUS_FILE_BYTES = 5 * 1024 * 1024;

export function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return globalThis.btoa(binary);
}

export function decodeBase64(value: string): ArrayBuffer {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export function validateSource(
  data: string,
  kind: "pdf" | "image" | "text",
): number {
  if (!data.trim()) throw new Error("Choose a file or paste some text first.");
  // encodeURIComponent counts UTF-8 bytes, including emoji, on native and web.
  const byteSize =
    kind === "text"
      ? encodeURIComponent(data).replace(/%[A-F\d]{2}|./g, "x").length
      : decodeBase64(data).byteLength;
  if (byteSize > MAX_SYLLABUS_FILE_BYTES)
    throw new Error("That source is larger than 5 MB. Choose a smaller file.");
  return byteSize;
}

export function safeSyllabusFilename(
  filename: string,
  kind: "pdf" | "image" | "text",
) {
  const fallback =
    kind === "pdf"
      ? "syllabus.pdf"
      : kind === "image"
        ? "syllabus.jpg"
        : "syllabus.txt";
  return (
    filename
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(-120) || fallback
  );
}
