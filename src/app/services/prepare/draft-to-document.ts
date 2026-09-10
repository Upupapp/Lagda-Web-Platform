// Converts a finished PreparationDraft into a DocumentListItem so it shows
// up in the /app/documents workspace — reusing the same "Draft Projection"
// mechanism Bulk Send already hands to documentService.addDraftProjections().
//
// Honesty constraint (carried over from ConfirmationPage.tsx's own mandatory
// disclosure): no signing request is created and nothing is sent in this
// demonstration, so the resulting item is always status "draft" — never
// "sent"/"completed" and never given a verificationId. It genuinely is just
// a prepared draft, and the Documents list must not claim otherwise.

import type { DocumentListItem, DocumentParticipantPreview } from "../../models/documents";
import type { ParticipantRole } from "../../models";
import type { PreparationDraft, PrepParticipantRole } from "../../models/prepare";
import { DOCUMENT_TAGS } from "../../data/mock/documents";

const ROLE_MAP: Record<PrepParticipantRole, ParticipantRole> = {
  "signer": "signer",
  "approver": "approver",
  "reviewer": "viewer",
  "acknowledgment-recipient": "carbon-copy",
  "viewer": "viewer",
  "carbon-copy": "carbon-copy",
};

export function mapPreparationDraftToDocumentListItem(
  draft: PreparationDraft,
  ownerName: string,
): DocumentListItem {
  const participants: DocumentParticipantPreview[] = draft.participants.map((p) => ({
    name: p.name || p.email,
    role: ROLE_MAP[p.role],
    status: "pending",
  }));

  const tags = draft.details.tagIds
    .map((id) => DOCUMENT_TAGS.find((t) => t.id === id))
    .filter((t): t is (typeof DOCUMENT_TAGS)[number] => !!t);

  const now = new Date().toISOString();

  return {
    id: `doc_${draft.id}`,
    title: draft.details.title || "Untitled Document",
    status: "draft",
    createdAt: draft.createdAt,
    updatedAt: now,
    participantCount: participants.length,
    completedParticipantCount: 0,
    participants,
    ownerName,
    workspaceId: draft.workspaceId,
    folderIds: draft.details.folderId ? [draft.details.folderId] : [],
    tags,
    pageCount: draft.files.reduce((sum, f) => sum + (f.demoPageCount ?? 0), 0) || undefined,
    isMyAction: false,
  };
}
