// Rebuilding a preparation draft from what the backend already holds.
//
// ── Why this is needed at all ─────────────────────────────────────────────
//
// A preparation draft lives in localStorage (see PrepareContext's header).
// The signing request behind it does not: its document, its recipients and
// its field placement are all on the server, reachable through endpoints that
// already exist. So a draft was only ever resumable on the browser that
// started it — a different device, a cleared cache or a colleague picking the
// work up all met a draft that appeared to have vanished, while the server
// still held every part of it.
//
// This reads those three surfaces back and reconstructs enough of a local
// draft to re-enter the preparation flow against the SAME backend document.
//
// ── What is reconstructed, and what is not ────────────────────────────────
//
// Reconstructed:
//   the file row, carrying `backendDocumentId` so every later step syncs
//   against the original document rather than creating a second one
//   the title
//   the participants, with their roles and routing order
//
// NOT reconstructed here:
//   field placement. `FieldsPage` already loads real fields for a document
//   that has a `backendDocumentId`, so copying them into the local draft
//   would create a second, staler copy of something the editor reads from
//   the server anyway.
//
//   routing groups, auth overrides and settings. The backend models routing
//   as an order per recipient and has no representation for the frontend's
//   groups or per-participant auth overrides. Inventing defaults for them
//   would look like a faithful restore of choices the sender never made — so
//   they come back as the defaults a new draft would have, and the sender can
//   see plainly that those steps need revisiting.

import { realDocumentService } from "./document.service";
import { realRecipientService } from "./recipient.service";
import type { PrepFile, PrepParticipant } from "../../models/prepare";

export interface ResumableDraft {
  readonly title: string;
  readonly files: PrepFile[];
  readonly participants: PrepParticipant[];
}

/**
 * Reads a backend document and its recipients back into draft shape.
 *
 * Throws if the document cannot be read — a draft that cannot be rebuilt must
 * fail loudly here rather than open an empty preparation flow that looks like
 * the work was lost.
 */
export async function loadResumableDraft(
  workspaceId: string,
  documentId: string,
): Promise<ResumableDraft> {
  // Sequential rather than parallel: if the document is gone there is nothing
  // for its recipients to belong to, and a parallel pair would surface the
  // recipient error first and describe the wrong problem.
  const document = await realDocumentService.get(workspaceId, documentId);
  const recipients = await realRecipientService.list(workspaceId, documentId);

  const file: PrepFile = {
    id: `pf_resume_${documentId}`,
    fileName: document.originalFilename ?? document.title,
    fileSizeBytes: document.source?.sizeBytes ?? 0,
    mimeType: document.source?.mediaType ?? "application/pdf",
    // "ready" is a claim about the FILE, and it is true: the bytes are on the
    // server, already scanned and accepted. It is the one state that does not
    // ask the sender to re-upload something they have already uploaded.
    fileState: "ready",
    order: 0,
    // The whole point. Without this every later step treats the transaction
    // as new work and creates a SECOND backend document beside the first.
    backendDocumentId: document.documentId,
    uploadStatus: "uploaded",
    // No `backendDigest`: the document endpoint does not return one, and an
    // undefined field here would read as "fetched and absent" rather than
    // "never asked for".
  };

  const participants: PrepParticipant[] = recipients
    // Routing order is what the sender arranged; list order is whatever the
    // API happened to return.
    .slice()
    .sort((a, b) => a.routingOrder - b.routingOrder || a.orderIndex - b.orderIndex)
    .map(recipient => ({
      // The BACKEND's recipient id, deliberately. Carrying it means the
      // participant sync updates the existing row instead of adding a
      // duplicate beside it on the next save.
      id: recipient.recipientId,
      name: recipient.name,
      email: recipient.email,
      role: recipient.type,
      organization: recipient.organization ?? "",
      isRequired: recipient.isRequired,
      // No backend representation — see the header. Defaults, not inventions.
      routingGroupId: null,
      authMethodOverride: null,
    }));

  return { title: document.title, files: [file], participants };
}
