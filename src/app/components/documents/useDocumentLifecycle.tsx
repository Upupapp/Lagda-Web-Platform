// Every action that changes where a document lives, behind one hook:
//
//   ask(action)  →  the confirmation (Cancel / Continue, a reason where one
//                   is owed)  →  the two-second processing screen  →  done.
//
// The same path for all of them is the point: nothing is cancelled, trashed,
// restored or deleted on a single click, and the processing screen covers the
// buttons for two seconds, so an action cannot be repeated by tapping again.
// A workspace on the Free plan is told what it needs instead of being let
// through to a refusal.

import { useCallback, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  Ban, RotateCcw, Trash2, FileX2, ArchiveRestore, Send, ThumbsUp, ThumbsDown, ListX, Crown,
} from "lucide-react";
import { LifecycleConfirmDialog, type LifecycleConfirmCopy } from "./LifecycleConfirmDialog";
import { documentLifecycleService, isPlanRequired } from "../../services/real/document-lifecycle.service";
import { realSigningRequestService } from "../../services/real/signing-request.service";
import { ApiError } from "../../services/api-client";
import { withProcess, type ProcessKind } from "../../config/process-screens";
import { toastSuccess } from "../brand/BrandToast";
import { Z } from "../../utils/z-index";

export type LifecycleAction =
  | { kind: "cancel"; workspaceId: string; signingRequestId: string; title: string }
  | { kind: "restore"; workspaceId: string; signingRequestId: string; title: string }
  | { kind: "trash"; workspaceId: string; signingRequestId: string; title: string; state: "cancelled" | "completed" }
  /** A document never sent (`signingRequestId` absent), or a draft request. */
  | { kind: "delete-draft"; workspaceId: string; documentId: string; signingRequestId?: string; title: string }
  | { kind: "delete-ended"; workspaceId: string; signingRequestId: string; title: string }
  | { kind: "bin-restore"; workspaceId: string; signingRequestId: string; title: string; state: "cancelled" | "completed" }
  | { kind: "bin-delete"; workspaceId: string; signingRequestId: string; title: string }
  /** The owner: everything in the bin, one reason for all. `title` is the count in words. */
  | { kind: "bin-empty"; workspaceId: string; signingRequestIds: readonly string[]; title: string }
  | { kind: "bin-request-deletion"; workspaceId: string; signingRequestId: string; title: string }
  | { kind: "approve-deletion"; workspaceId: string; requestId: string; title: string; requester: string }
  | { kind: "disapprove-deletion"; workspaceId: string; requestId: string; title: string; requester: string }
  | { kind: "remove-signed"; signingRequestId: string; title: string }
  | { kind: "remove-notice"; id: string; title: string };

/** Stated wherever a signed document is about to be erased for good. */
export const RETENTION_POINT =
  "Keeping records is your responsibility. Some must be kept for a set time: accounting records and the documents that support them for ten years, employment records for three. Download a copy first if you may need it.";

const ERASED = "The document, its signatures and its audit trail are erased for everyone. This cannot be undone.";

export function lifecycleCopy(action: LifecycleAction): LifecycleConfirmCopy {
  switch (action.kind) {
    case "cancel":
      return {
        title: "Cancel this signing request?", icon: Ban, tone: "danger",
        lead: "By choosing Continue, this document stops being out for signature.",
        points: [
          "Everyone's signing link stops working, and nobody else can act on it.",
          "It moves to Records › Cancelled, where you can Restore it to carry on from where it stopped, or move it to the Recycle Bin.",
        ],
        reason: { label: "Reason for cancelling", placeholder: "Why is this being cancelled?", hint: "Required. Kept with the document's history." },
      };
    case "restore":
      return {
        title: "Restore this signing request?", icon: RotateCcw,
        lead: "By choosing Continue, this document goes back out for signature and carries on from where it stopped.",
        points: [
          "Everyone who has not acted yet, and whose turn it is, gets a new signing link and a new invitation.",
          "What was already signed, approved or reviewed is kept.",
          "The audit trail records both the cancellation and this restore.",
        ],
      };
    case "trash":
      return {
        title: "Move to the Recycle Bin?", icon: Trash2,
        lead: `By choosing Continue, this ${action.state} document leaves your lists and goes to the Recycle Bin.`,
        points: [
          "Nothing is erased yet, and nothing changes for the participants.",
          "From the Recycle Bin it can be restored. Only the workspace owner can delete it permanently.",
        ],
        // A cancelled document already carries the reason it was cancelled.
        ...(action.state === "completed"
          ? { reason: { label: "Reason for moving it to the bin", placeholder: "Why is this completed document being moved?", hint: "Required. Shown with the document in the Recycle Bin." } }
          : {}),
      };
    case "delete-draft":
      return {
        title: "Delete this draft?", icon: FileX2, tone: "danger",
        lead: "By choosing Continue, this draft is permanently deleted.",
        points: ["The uploaded file, its participants and its fields are erased. This cannot be undone.", "It was never sent, so nobody is notified."],
      };
    case "delete-ended":
      return {
        title: "Permanently delete this document?", icon: FileX2, tone: "danger",
        lead: "By choosing Continue, this document is permanently deleted.",
        points: [ERASED, "People who had access to it see a notice that it was deleted."],
      };
    case "bin-restore":
      return {
        title: "Restore this document?", icon: ArchiveRestore,
        lead: `By choosing Continue, this document leaves the Recycle Bin and goes back to ${action.state === "completed" ? "Completed" : "Cancelled"}.`,
        points: ["Any request to delete it is withdrawn."],
      };
    case "bin-delete":
      return {
        title: "Permanently delete this document?", icon: FileX2, tone: "danger",
        lead: "By choosing Continue, you permanently delete this document as the workspace owner.",
        points: [ERASED, "Everyone who had access sees a notice that you deleted it, with your name and the reason you give below.", RETENTION_POINT],
        reason: { label: "Reason for deleting", placeholder: "Why is this document being deleted?", hint: "Required. The people who had access will see it." },
      };
    case "bin-empty":
      return {
        title: "Empty the Recycle Bin?", icon: FileX2, tone: "danger",
        lead: `By choosing Continue, you permanently delete ${action.title} as the workspace owner: everything in the Recycle Bin.`,
        points: [
          "Each document, its signatures and its audit trail are erased for everyone. This cannot be undone.",
          "Everyone who had access to one of them sees a notice that you deleted it, with your name and the reason you give below.",
          "Any request to delete one of them is approved by this.",
          RETENTION_POINT,
        ],
        reason: { label: "Reason for deleting them all", placeholder: "Why is the Recycle Bin being emptied?", hint: "Required. The same reason is shown for every document." },
      };
    case "bin-request-deletion":
      return {
        title: "Ask the owner to delete this document?", icon: Send,
        lead: "By choosing Continue, this document is sent to the workspace owner as a deletion request.",
        points: [
          "Only the workspace owner can permanently delete a document. They will approve or disapprove your request.",
          "Until they decide, it stays in the Recycle Bin, marked as waiting for the owner.",
          "Only the owner sees the reason you give below.",
        ],
        reason: { label: "Reason for the request", placeholder: "Why should this document be deleted?", hint: "Required. It helps the owner decide." },
      };
    case "approve-deletion":
      return {
        title: "Approve this deletion?", icon: ThumbsUp, tone: "danger",
        lead: `By choosing Continue, you approve ${action.requester}'s request and permanently delete this document.`,
        points: [ERASED, "Everyone who had access sees a notice that you deleted it, with your name and the reason you give below.", RETENTION_POINT],
        reason: { label: "Your reason for deleting", placeholder: "Why is this document being deleted?", hint: "Required. The people who had access will see YOUR reason, not the requester's." },
      };
    case "disapprove-deletion":
      return {
        title: "Disapprove this deletion?", icon: ThumbsDown,
        lead: `By choosing Continue, you turn down ${action.requester}'s request. The document is not deleted.`,
        points: ["It stays in the Recycle Bin, where it can be restored to its list.", `${action.requester} is told that you disapproved.`],
      };
    case "remove-signed":
      return {
        title: "Remove from Signed by me?", icon: ListX,
        lead: "By choosing Continue, this document is removed from your own list.",
        points: ["Nothing is erased: the sender and the other participants still have it.", "You will no longer see it here."],
      };
    case "remove-notice":
      return {
        title: "Remove this notice?", icon: ListX,
        lead: "By choosing Continue, this deleted-document notice is removed from your list.",
        points: ["This cannot be undone."],
      };
  }
}

const PROCESS: Record<LifecycleAction["kind"], ProcessKind> = {
  "cancel": "document-cancel", "restore": "document-restore", "trash": "document-trash",
  "delete-draft": "draft-delete", "delete-ended": "document-delete",
  "bin-restore": "bin-restore", "bin-delete": "bin-delete", "bin-empty": "bin-empty", "bin-request-deletion": "deletion-request",
  "approve-deletion": "deletion-approve", "disapprove-deletion": "deletion-disapprove",
  "remove-signed": "signed-remove", "remove-notice": "deleted-notice-remove",
};

const DONE: Record<LifecycleAction["kind"], string> = {
  "cancel": "Signing request cancelled", "restore": "Signing request restored", "trash": "Moved to the Recycle Bin",
  "delete-draft": "Draft deleted", "delete-ended": "Document deleted",
  "bin-restore": "Document restored", "bin-delete": "Document permanently deleted", "bin-empty": "The Recycle Bin was emptied", "bin-request-deletion": "Deletion request sent to the owner",
  "approve-deletion": "Deletion approved. The document was deleted.", "disapprove-deletion": "Deletion disapproved",
  "remove-signed": "Removed from your list", "remove-notice": "Notice removed",
};

/** What the Free plan may still do: its own drafts, and its own lists. */
const FREE_ALLOWED: ReadonlySet<LifecycleAction["kind"]> = new Set(["cancel", "restore", "delete-draft", "remove-signed", "remove-notice"]);

async function perform(action: LifecycleAction, reason: string): Promise<void> {
  const svc = documentLifecycleService;
  switch (action.kind) {
    case "cancel": await realSigningRequestService.cancel(action.workspaceId, action.signingRequestId, reason); return;
    case "restore": await svc.restore(action.workspaceId, action.signingRequestId); return;
    case "trash": await svc.moveToTrash(action.workspaceId, action.signingRequestId, reason); return;
    case "delete-draft":
      if (action.signingRequestId !== undefined) await svc.deleteRequest(action.workspaceId, action.signingRequestId);
      else await svc.deleteDraftDocument(action.workspaceId, action.documentId);
      return;
    case "delete-ended": await svc.deleteRequest(action.workspaceId, action.signingRequestId); return;
    case "bin-restore": await svc.restoreFromBin(action.workspaceId, action.signingRequestId); return;
    case "bin-delete":
    case "bin-request-deletion": await svc.deleteFromBin(action.workspaceId, action.signingRequestId, reason); return;
    case "bin-empty": {
      // One at a time, each a deletion of its own with its own notices. If
      // one is refused the rest are left alone and the person is told how far it got.
      let done = 0;
      for (const id of action.signingRequestIds) {
        try { await svc.deleteFromBin(action.workspaceId, id, reason); } catch (err) { throw new BinEmptyStoppedError(done, action.signingRequestIds.length, err); }
        done += 1;
      }
      return;
    }
    case "approve-deletion": await svc.approveDeletion(action.workspaceId, action.requestId, reason); return;
    case "disapprove-deletion": await svc.disapproveDeletion(action.workspaceId, action.requestId); return;
    case "remove-signed": await svc.removeFromSignedByMe(action.signingRequestId); return;
    case "remove-notice": await svc.removeDeletedDocument(action.id); return;
  }
}

/** Emptying the bin stopped part-way: what was deleted stays deleted. */
export class BinEmptyStoppedError extends Error {
  constructor(readonly deleted: number, readonly total: number, readonly reason: unknown) {
    super("The Recycle Bin was not fully emptied.");
  }
}

/** Plain words for the refusals the server gives. */
export function lifecycleErrorMessage(err: unknown): string {
  if (err instanceof BinEmptyStoppedError) {
    return `${String(err.deleted)} of ${String(err.total)} documents were deleted, then it stopped. ${lifecycleErrorMessage(err.reason)} The rest are still in the Recycle Bin.`;
  }
  if (err instanceof ApiError) {
    switch (err.body?.code) {
      case "cancel_first": return "This document is still out for signature. Cancel it first.";
      case "move_to_trash_first": return "Move this document to the Recycle Bin first; the owner deletes it from there.";
      // The server says which: a template's own document (and names the
      // template to delete), or one somebody was asked to prepare.
      case "document_in_use": return err.message || "This document cannot be deleted while something else still uses it.";
      case "deletion_request_pending": return "Someone has already asked the owner to delete this document.";
      case "deletion_request_not_pending": return "This request was already decided.";
      case "signing_request_not_restorable": return "Only a cancelled signing request can be restored.";
      case "signing_request_in_trash": return "This document is in the Recycle Bin. Restore it from there first.";
      case "signing_request_not_in_trash": return "This document is no longer in the Recycle Bin.";
      default: return err.message || "That didn't work. Please try again.";
    }
  }
  return "That didn't work. Please check your connection and try again.";
}

export function useDocumentLifecycle({ freePlan, onDone }: {
  /** True when the workspace's owner is on the Free plan. */
  freePlan: boolean;
  onDone?: (action: LifecycleAction) => void;
}): { ask: (action: LifecycleAction) => void; element: ReactNode } {
  const [action, setAction] = useState<LifecycleAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planNotice, setPlanNotice] = useState(false);

  const ask = useCallback((next: LifecycleAction) => {
    setError(null);
    if (freePlan && !FREE_ALLOWED.has(next.kind)) { setPlanNotice(true); return; }
    setAction(next);
  }, [freePlan]);

  const run = (reason: string) => {
    if (action === null || busy) return;
    const current = action;
    setBusy(true); setError(null);
    void withProcess(PROCESS[current.kind], current.title, () => perform(current, reason))
      .then(() => { setAction(null); toastSuccess(DONE[current.kind]); onDone?.(current); })
      .catch((err: unknown) => {
        if (isPlanRequired(err)) { setAction(null); setPlanNotice(true); } else setError(lifecycleErrorMessage(err));
        // Part of it happened: what is behind the pop-up re-reads.
        if (err instanceof BinEmptyStoppedError && err.deleted > 0) onDone?.(current);
      })
      .finally(() => { setBusy(false); });
  };

  const element = (
    <>
      {action !== null && (
        <LifecycleConfirmDialog
          key={`${action.kind}:${action.title}`}
          copy={lifecycleCopy(action)} subject={action.title} busy={busy} error={error}
          onContinue={run} onCancel={() => { if (!busy) setAction(null); }}
        />
      )}
      {planNotice && <PlanRequiredDialog onClose={() => { setPlanNotice(false); }} />}
    </>
  );
  return { ask, element };
}

/** Shown to a workspace on the Free plan in place of a delete it cannot do. */
export function PlanRequiredDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const GF = { fontFamily: "'Geist', sans-serif" };
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(7,17,31,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box" }}>
      <div role="alertdialog" aria-modal="true" aria-label="Deleting documents needs the Personal plan" data-testid="plan-required-dialog"
        style={{ ...GF, background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 440, padding: 22, boxSizing: "border-box", boxShadow: "0 12px 40px rgba(7,17,31,0.30)" }}>
        <span aria-hidden style={{ width: 40, height: 40, borderRadius: 10, background: "#FEF9EC", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Crown size={20} color="#B45309" />
        </span>
        <h2 style={{ ...GF, fontSize: 17, fontWeight: 800, color: "#07111F", margin: "12px 0 6px" }}>Deleting documents needs the Personal plan</h2>
        <p style={{ ...GF, fontSize: 14, color: "#1F2937", lineHeight: 1.55, margin: 0 }}>
          On the Free plan, documents that were sent cannot be moved to the Recycle Bin or deleted.
          Drafts can still be deleted, and you can still remove documents from your own Signed by me list.
        </p>
        <p style={{ ...GF, fontSize: 13, color: "#475569", lineHeight: 1.55, margin: "8px 0 0" }}>
          Upgrade to Personal or Business to manage and delete your documents.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap-reverse", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onClose} autoFocus
            style={{ ...GF, flex: "1 1 130px", minHeight: 44, borderRadius: 9, border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#07111F", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" onClick={() => { onClose(); void navigate("/app/settings/plan"); }}
            style={{ ...GF, flex: "1 1 130px", minHeight: 44, borderRadius: 9, border: "none", background: "#0078D4", color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            See plans
          </button>
        </div>
      </div>
    </div>
  );
}
