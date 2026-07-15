// Mock editor data: fictional EditorDocuments and pre-placed FieldDefinitions.
// All page previews are fictional — no real PDFs are parsed or rendered.
// Coordinates are NORMALIZED (0–1) relative to page dimensions.
// demonstrationOnly: true on all field and document records.

import type { EditorDocument, EditorPage, FieldDefinition } from "../../models/field-editor";
import type { PrepFile } from "../../models/prepare";

const A4 = 595 / 842; // ≈ 0.7068

// ── Page factory ──────────────────────────────────────────────────────────────

function makePage(docId: string, n: number): EditorPage {
  return {
    id:          `epage_${docId}_${n}`,
    documentId:  docId,
    pageNumber:  n,
    aspectRatio: A4,
    label:       `Page ${n}`,
  };
}

function makeDoc(fileId: string, name: string, pageCount: number): EditorDocument {
  const id = `edoc_${fileId}`;
  return {
    id,
    prepFileId:  fileId,
    displayName: name,
    pageCount,
    pages:       Array.from({ length: pageCount }, (_, i) => makePage(id, i + 1)),
  };
}

// ── Deterministic page count from file metadata ────────────────────────────────

const PAGE_COUNTS_BY_INDEX = [3, 2, 5, 1, 4, 2, 3];

export function derivePageCount(fileIndex: number, file: PrepFile): number {
  return file.demoPageCount ?? PAGE_COUNTS_BY_INDEX[fileIndex % PAGE_COUNTS_BY_INDEX.length] ?? 2;
}

// ── Document factory from PrepFiles ──────────────────────────────────────────

export function buildEditorDocuments(files: PrepFile[]): EditorDocument[] {
  return files
    .filter(f => f.fileState === "ready")
    .map((file, i) => makeDoc(file.id, file.fileName, derivePageCount(i, file)));
}

// ── Pre-placed field sets for demonstration scenarios ─────────────────────────
// These are used when the scenario includes pre-existing fields.

export function buildDemoFields(
  documents: EditorDocument[],
  participants: { id: string; name: string; role: string }[],
): FieldDefinition[] {
  const fields: FieldDefinition[] = [];
  if (documents.length === 0) return fields;

  const doc1  = documents[0]!;
  const page1 = doc1.pages[0];
  const page2 = doc1.pages[1];
  const pax1  = participants[0];
  const pax2  = participants[1];

  // Page 1 — signature + full name + date for participant 1
  if (page1 && pax1) {
    fields.push({
      id:            "demo_sig_1",
      type:          "signature",
      documentId:    doc1.id,
      pageId:        page1.id,
      rect:          { x: 0.10, y: 0.78, width: 0.302, height: 0.059 },
      participantId: pax1.id,
      label:         "Signature",
      required:      true,
      layer:         1,
      demonstrationOnly: true,
    });
    fields.push({
      id:            "demo_name_1",
      type:          "full-name",
      documentId:    doc1.id,
      pageId:        page1.id,
      rect:          { x: 0.10, y: 0.86, width: 0.336, height: 0.036 },
      participantId: pax1.id,
      label:         "Full Name",
      required:      true,
      layer:         1,
      demonstrationOnly: true,
    });
    fields.push({
      id:            "demo_date_1",
      type:          "date-signed",
      documentId:    doc1.id,
      pageId:        page1.id,
      rect:          { x: 0.55, y: 0.86, width: 0.218, height: 0.036 },
      participantId: pax1.id,
      label:         "Date Signed",
      required:      true,
      layer:         1,
      demonstrationOnly: true,
    });
  }

  // Page 1 — participant 2 fields
  if (page1 && pax2) {
    fields.push({
      id:            "demo_sig_2",
      type:          "signature",
      documentId:    doc1.id,
      pageId:        page1.id,
      rect:          { x: 0.55, y: 0.78, width: 0.302, height: 0.059 },
      participantId: pax2.id,
      label:         "Signature",
      required:      true,
      layer:         1,
      demonstrationOnly: true,
    });
    fields.push({
      id:            "demo_name_2",
      type:          "full-name",
      documentId:    doc1.id,
      pageId:        page1.id,
      rect:          { x: 0.55, y: 0.86, width: 0.336, height: 0.036 },
      participantId: pax2.id,
      label:         "Full Name",
      required:      true,
      layer:         1,
      demonstrationOnly: true,
    });
  }

  // Page 2 — initials for participant 1 (if exists)
  if (page2 && pax1) {
    fields.push({
      id:            "demo_init_1",
      type:          "initials",
      documentId:    doc1.id,
      pageId:        page2.id,
      rect:          { x: 0.10, y: 0.88, width: 0.118, height: 0.047 },
      participantId: pax1.id,
      label:         "Initials",
      required:      true,
      layer:         1,
      demonstrationOnly: true,
    });
  }

  // Sender text field (no participant)
  if (page1) {
    fields.push({
      id:            "demo_sender_1",
      type:          "sender-text",
      documentId:    doc1.id,
      pageId:        page1.id,
      rect:          { x: 0.10, y: 0.10, width: 0.403, height: 0.036 },
      participantId: null,
      label:         "Sender Text",
      required:      false,
      layer:         1,
      senderText:    "Prepared for signature using LAGDA eSignature (frontend demonstration).",
      demonstrationOnly: true,
    });
  }

  return fields;
}

// ── Multi-file demo fields ────────────────────────────────────────────────────

export function buildMultiFileFields(
  documents: EditorDocument[],
  participants: { id: string; name: string; role: string }[],
): FieldDefinition[] {
  const fields = buildDemoFields(documents, participants);
  if (documents.length < 2) return fields;

  const doc2  = documents[1]!;
  const page1 = doc2.pages[0];
  const pax1  = participants[0];

  if (page1 && pax1) {
    fields.push({
      id:            "demo_sig_doc2_1",
      type:          "signature",
      documentId:    doc2.id,
      pageId:        page1.id,
      rect:          { x: 0.10, y: 0.78, width: 0.302, height: 0.059 },
      participantId: pax1.id,
      label:         "Signature",
      required:      true,
      layer:         1,
      demonstrationOnly: true,
    });
    fields.push({
      id:            "demo_ack_doc2_1",
      type:          "acknowledgment",
      documentId:    doc2.id,
      pageId:        page1.id,
      rect:          { x: 0.10, y: 0.87, width: 0.504, height: 0.042 },
      participantId: pax1.id,
      label:         "I acknowledge receipt of this document",
      required:      true,
      layer:         1,
      demonstrationOnly: true,
    });
  }
  return fields;
}
