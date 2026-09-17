// Which icon represents a file, from what the file actually IS.
//
// ── Driven by the server's detected type, not by the filename ──────────────
//
// LAGDA's upload pipeline sniffs the bytes (`fileTypeFromBuffer`) and stores
// the result on the artifact; a browser-supplied type and a file extension
// are both claims, and a `.pdf` suffix on a Word document is exactly the
// kind of mismatch the pipeline exists to catch. So `mediaType` is consulted
// first and the extension is only a fallback for the case where no bytes
// have landed yet and there is nothing else to go on.
//
// ── Why the map is wider than what LAGDA accepts today ─────────────────────
//
// Uploads are PDF-ONLY right now (`SUPPORTED_MEDIA_TYPES` in the backend is
// a one-element list, enforced by content inspection), so in practice every
// real document resolves to the PDF entry. The other entries are not
// decoration: the product's own intake copy already offers DOC/DOCX, and the
// backend's port comment records them as "future". Writing the lookup as a
// table means supporting one is a data change here rather than a hunt for
// every place an icon was chosen by hand.

import {
  FileText, FileType, FileSpreadsheet, FileImage, File as FileIcon,
  type LucideIcon,
} from "lucide-react";

/** Exact media types, checked before any prefix or extension rule. */
const BY_MEDIA_TYPE: Record<string, LucideIcon> = {
  "application/pdf": FileText,
  "application/msword": FileType,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileType,
  "application/vnd.ms-excel": FileSpreadsheet,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": FileSpreadsheet,
  "text/csv": FileSpreadsheet,
};

const BY_EXTENSION: Record<string, LucideIcon> = {
  pdf: FileText,
  doc: FileType,
  docx: FileType,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  webp: FileImage,
};

/**
 * The icon for a document.
 *
 * `mediaType` wins when present. `filename` is consulted only as a fallback,
 * because a document exists before its bytes do — between creation and a
 * successful upload there is genuinely no detected type, and the name the
 * user chose is better than nothing.
 *
 * Returns a generic file icon for anything unrecognised rather than
 * guessing, so an unsupported format reads as "a file" instead of silently
 * borrowing the wrong identity.
 */
export function iconForDocument(
  mediaType?: string | null,
  filename?: string | null,
): LucideIcon {
  if (mediaType != null && mediaType !== "") {
    const exact = BY_MEDIA_TYPE[mediaType.toLowerCase()];
    if (exact !== undefined) return exact;
    // Whole families rather than an endless list of subtypes: every
    // `image/*` is an image whether or not this table has heard of it.
    if (mediaType.startsWith("image/")) return FileImage;
    if (mediaType.startsWith("text/")) return FileText;
  }

  if (filename != null && filename !== "") {
    const dot = filename.lastIndexOf(".");
    // `> 0`, not `!== -1`: a leading dot is a hidden file, not an extension.
    if (dot > 0) {
      const byExtension = BY_EXTENSION[filename.slice(dot + 1).toLowerCase()];
      if (byExtension !== undefined) return byExtension;
    }
  }

  return FileIcon;
}
