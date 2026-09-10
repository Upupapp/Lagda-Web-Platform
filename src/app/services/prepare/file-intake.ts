// Shared browser-File → PrepFile classification.
// PRIVACY / SECURITY:
//   • browser File objects are NEVER passed to domain state.
//   • only metadata (name, size, type) is stored in PrepFile.
//   • no file contents are read, buffered, or hashed.
//   • this is a frontend demonstration — no uploads occur.
//
// Extracted from the authenticated Documents step (UploadStep.tsx) so the
// public pre-auth intake uses the exact same validation rules rather than a
// second, potentially-drifting copy.

import type { PrepFile, PrepFileState } from "../../models/prepare";

export const DEMO_SIZE_LIMIT_BYTES = 20 * 1024 * 1024; // 20 MB demo limit
export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
export const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
export const MAX_FILES_PER_TRANSACTION = 10;

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileStateLabel(s: PrepFileState): { text: string; color: string } {
  switch (s) {
    case "ready":
      return { text: "Ready", color: "#2E7D32" };
    case "unsupported-type":
      return { text: "Unsupported type — PDF, DOC, or DOCX only", color: "#8A6A16" };
    case "empty-file":
      return { text: "Empty file — cannot be used", color: "#8A6A16" };
    case "demonstration-size-limit":
      return { text: "File too large for demonstration (20 MB limit)", color: "#C9960C" };
    case "duplicate":
      return { text: "Duplicate filename", color: "#C9960C" };
    case "unavailable":
      return { text: "File unavailable", color: "#8A6A16" };
    case "removed":
      return { text: "Removed", color: "#8A9BAE" };
    default:
      return { text: s, color: "#8A9BAE" };
  }
}

export function classifyFile(file: File, existingNames: Set<string>): PrepFileState {
  if (file.size === 0) return "empty-file";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byMime = ALLOWED_MIME_TYPES.has(file.type);
  const byExt = ALLOWED_EXTENSIONS.includes(`.${ext}`);
  if (!byMime && !byExt) return "unsupported-type";
  if (file.size > DEMO_SIZE_LIMIT_BYTES) return "demonstration-size-limit";
  if (existingNames.has(file.name)) return "duplicate";
  return "ready";
}

export function generatePrepFileId(): string {
  return `pf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Classifies a FileList/File[] into PrepFile metadata against an existing
 * selection, exactly as the authenticated Documents step does. The browser
 * File objects themselves are read synchronously for metadata only and are
 * never returned or retained by this function.
 */
export function classifyFiles(files: File[], existing: PrepFile[]): PrepFile[] {
  const currentNames = new Set(existing.map((f) => f.fileName));
  const newEntries: PrepFile[] = [];

  files.forEach((file) => {
    if (existing.length + newEntries.length >= MAX_FILES_PER_TRANSACTION) return;
    const state = classifyFile(file, currentNames);
    currentNames.add(file.name);
    newEntries.push({
      id: generatePrepFileId(),
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
      fileState: state,
      order: existing.length + newEntries.length,
      demoPageCount:
        file.type === "application/pdf"
          ? Math.max(1, Math.floor(file.size / 40000))
          : undefined,
    });
  });

  return newEntries;
}
