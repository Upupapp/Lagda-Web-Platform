// Shared Documents → Shared By Me.
//
//   Approved Access  completed documents with at least one accepted share or
//                    approved request (the backend drops one at zero), as the
//                    same branded cards as Documents → Completed. The burger
//                    menu opens "Shared with" (Edit / Remove per person) and
//                    "+ Add more".
//   Pending Access   access requests waiting for a decision: Approve / Reject.
//   Rejected Access  rejected requests: Withdraw rejection (back to Pending) /
//                    Delete (after a confirmation).
//
// Owners and administrators may switch between their own documents and the
// whole workspace's; everyone else only ever sees their own, which is also
// what the backend returns to them.

import { useCallback, useEffect, useState } from "react";
import { Users, UserPlus, Check, X, Undo2, Trash2, Mail, FileText, MessageSquare, Clock, ShieldCheck, Inbox, Ban } from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { useWorkspaceAccess } from "../../../hooks/useWorkspaceAccess";
import { EmptyStateLayout, SkeletonBlock } from "../../../components/platform";
import { CompletedDocumentGrid, type CompletedCardData } from "../documents/CompletedDocumentCards";
import { ShareDocumentDialog, type ShareTarget } from "../../../components/document-sharing/ShareDocumentDialog";
import { ConfirmDialog } from "../../../components/document-sharing/ConfirmDialog";
import { GF, NAVY, SLATE, SharingNotice, SmallButton, StatusChip } from "../../../components/document-sharing/SharingPrimitives";
import {
  documentSharingService, sharingErrorMessage, formatSharingDate,
  type SharedByMeItem, type AccessRequest,
} from "../../../services/real/document-sharing.service";
import { SharingTabs, panelId, tabId } from "./SharingTabs";

export type ByMeSection = "approved" | "pending" | "rejected";
type Scope = "mine" | "workspace";

const PREFIX = "shared-by-me";

interface Data {
  approved: SharedByMeItem[];
  pending: AccessRequest[];
  rejected: AccessRequest[];
}

function peopleLine(item: SharedByMeItem): string {
  const withAccess = item.acceptedShares + item.approvedRequests;
  const parts = [`${withAccess} ${withAccess === 1 ? "person has" : "people have"} access`];
  if (item.pendingShares > 0) parts.push(`${item.pendingShares} waiting to accept`);
  if (item.pendingRequests > 0) parts.push(`${item.pendingRequests} ${item.pendingRequests === 1 ? "request" : "requests"} to review`);
  return parts.join(" · ");
}

export function SharedByMeSection({ section, onSection }: { section: ByMeSection; onSection: (s: ByMeSection) => void }) {
  const { currentWorkspace, user } = usePlatform();
  const access = useWorkspaceAccess();
  const workspaceId = currentWorkspace?.id ?? null;
  const canChooseScope = access.role === "owner" || access.role === "administrator";
  const [scope, setScope] = useState<Scope>("mine");
  const effectiveScope: Scope = canChooseScope ? scope : "mine";

  const [data, setData] = useState<Data>({ approved: [], pending: [], rejected: [] });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [dialog, setDialog] = useState<{ target: ShareTarget; mode: "add" | "list" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AccessRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback((quiet = false) => {
    if (workspaceId === null) return;
    if (!quiet) setStatus("loading");
    // Requests have no scope on the wire; "mine" narrows them to documents I own.
    const mineOnly = (items: AccessRequest[]) =>
      effectiveScope === "mine" && canChooseScope && user?.id
        ? items.filter(r => r.document.owner.userId === user.id)
        : items;
    Promise.all([
      documentSharingService.sharedByMe(workspaceId, effectiveScope),
      documentSharingService.listAccessRequests(workspaceId, "pending"),
      documentSharingService.listAccessRequests(workspaceId, "rejected"),
    ])
      .then(([approved, pending, rejected]) => {
        setData({ approved, pending: mineOnly(pending), rejected: mineOnly(rejected) });
        setStatus("ready");
      })
      .catch((err: unknown) => { setLoadError(sharingErrorMessage(err, "load")); setStatus("error"); });
  }, [workspaceId, effectiveScope, canChooseScope, user?.id]);

  useEffect(() => { load(); }, [load]);

  async function decide(request: AccessRequest, verb: "approve" | "reject" | "withdraw-rejection") {
    if (workspaceId === null) return;
    setBusyId(request.requestId);
    setNotice(null);
    try {
      await documentSharingService.decideAccessRequest(workspaceId, request.requestId, verb);
      const who = request.requester.displayName;
      setNotice({
        tone: "success",
        text: verb === "approve" ? `${who} can now open “${request.document.documentTitle}”.`
          : verb === "reject" ? `You rejected ${who}'s request. It is listed under Rejected Access.`
          : `The rejection was withdrawn. ${who}'s request is back under Pending Access.`,
      });
      load(true);
    } catch (err) {
      setNotice({ tone: "error", text: sharingErrorMessage(err, "decide") });
    } finally {
      setBusyId(null);
    }
  }

  const tabs = [
    { id: "approved" as const, label: "Approved Access", count: status === "ready" ? data.approved.length : null, icon: ShieldCheck },
    { id: "pending" as const, label: "Pending Access", count: status === "ready" ? data.pending.length : null, icon: Inbox },
    { id: "rejected" as const, label: "Rejected Access", count: status === "ready" ? data.rejected.length : null, icon: Ban },
  ];

  return (
    <div style={{ minWidth: 0 }}>
      <div className="sharing-toolbar">
        <SharingTabs label="Shared by me" tabs={tabs} active={section} onChange={onSection} idPrefix={PREFIX} size="minor" />
        {canChooseScope && (
          <div role="group" aria-label="Whose documents" className="sharing-tabs sharing-tabs-minor" style={{ marginBottom: 14 }}>
            {(["mine", "workspace"] as const).map(s => (
              <button key={s} type="button" className="sharing-tab" aria-pressed={scope === s} data-selected={scope === s}
                onClick={() => setScope(s)} style={{ ...GF, ...(scope === s ? { background: "#FFFFFF", color: NAVY, boxShadow: "0 1px 2px rgba(7,17,31,0.12)" } : {}) }}>
                {s === "mine" ? "Mine" : "Whole workspace"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div aria-live="polite" style={{ marginBottom: notice ? 12 : 0 }}>
        {notice && <SharingNotice tone={notice.tone}>{notice.text}</SharingNotice>}
      </div>

      <div role="tabpanel" id={panelId(PREFIX, section)} aria-labelledby={tabId(PREFIX, section)} style={{ minWidth: 0 }}>
        {status === "loading" && <div role="status" aria-label="Loading"><SkeletonBlock height={120} /></div>}
        {status === "error" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
            <SharingNotice tone="error">{loadError}</SharingNotice>
            <SmallButton label="Try again" onClick={() => load()} />
          </div>
        )}
        {status === "ready" && section === "approved" && (
          data.approved.length === 0 ? (
            <EmptyStateLayout icon={<ShieldCheck size={26} />} title="No documents shared yet"
              description="Completed documents you share appear here once someone accepts, or once you approve a request. Share one from Documents → Completed." />
          ) : (
            <CompletedDocumentGrid label="Documents with approved access" cards={data.approved.map((item): CompletedCardData => {
              const target = { documentId: item.document.documentId, title: item.document.documentTitle };
              return {
                key: item.document.documentId,
                title: item.document.documentTitle,
                verificationId: item.document.verificationId,
                done: item.document.participantCount,
                total: item.document.participantCount,
                createdAt: item.document.completedAt,
                dateLabel: "Completed",
                bannerSubtitle: "Shared document",
                extra: (
                  <div style={{ ...GF, fontSize: 12.5, color: SLATE, display: "flex", flexDirection: "column", gap: 3 }}>
                    <span data-testid="shared-by-me-people"><Users size={12} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> {peopleLine(item)}</span>
                    {effectiveScope === "workspace" && <span>Owner: {item.document.owner.displayName}</span>}
                  </div>
                ),
                actions: [
                  { id: "shared-with", label: "Shared with", icon: Users, onSelect: () => setDialog({ target, mode: "list" }) },
                  { id: "add-more", label: "+ Add more", icon: UserPlus, onSelect: () => setDialog({ target, mode: "add" }) },
                ],
              };
            })} />
          )
        )}
        {status === "ready" && section === "pending" && (
          data.pending.length === 0 ? (
            <EmptyStateLayout icon={<Inbox size={26} />} title="No access requests to review"
              description="When someone with a Verification ID asks to open one of your completed documents, the request appears here." />
          ) : (
            <ul aria-label="Pending access requests" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {data.pending.map(req => (
                <RequestRow key={req.requestId} request={req} showOwner={effectiveScope === "workspace"}>
                  <SmallButton icon={Check} label="Approve" variant="primary" disabled={busyId !== null}
                    ariaLabel={`Approve ${req.requester.displayName}`} onClick={() => { void decide(req, "approve"); }} />
                  <SmallButton icon={X} label="Reject" disabled={busyId !== null}
                    ariaLabel={`Reject ${req.requester.displayName}`} onClick={() => { void decide(req, "reject"); }} />
                </RequestRow>
              ))}
            </ul>
          )
        )}
        {status === "ready" && section === "rejected" && (
          data.rejected.length === 0 ? (
            <EmptyStateLayout icon={<Ban size={26} />} title="No rejected requests"
              description="Requests you reject are kept here, so you can withdraw the rejection or delete them." />
          ) : (
            <ul aria-label="Rejected access requests" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {data.rejected.map(req => (
                <RequestRow key={req.requestId} request={req} showOwner={effectiveScope === "workspace"} rejected>
                  <SmallButton icon={Undo2} label="Withdraw rejection" disabled={busyId !== null}
                    ariaLabel={`Withdraw rejection for ${req.requester.displayName}`} onClick={() => { void decide(req, "withdraw-rejection"); }} />
                  <SmallButton icon={Trash2} label="Delete" variant="danger" disabled={busyId !== null}
                    ariaLabel={`Delete request from ${req.requester.displayName}`} onClick={() => setConfirmDelete(req)} />
                </RequestRow>
              ))}
            </ul>
          )
        )}
      </div>

      {dialog && workspaceId && (
        <ShareDocumentDialog workspaceId={workspaceId} target={dialog.target} mode={dialog.mode}
          onClose={() => setDialog(null)} onChanged={() => load(true)} />
      )}
      {confirmDelete && workspaceId && (
        <ConfirmDialog title="Delete this request?" subtitle={confirmDelete.document.documentTitle} busyLabel="Deleting…"
          onClose={() => setConfirmDelete(null)}
          onConfirm={async () => {
            try {
              await documentSharingService.deleteAccessRequest(workspaceId, confirmDelete.requestId);
              setNotice({ tone: "success", text: "The request was deleted." });
              load(true);
              return null;
            } catch (err) {
              return sharingErrorMessage(err, "decide");
            }
          }}>
          The rejected request from <strong>{confirmDelete.requester.displayName}</strong> will be removed from this list. This cannot be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}

function RequestRow({ request, showOwner, rejected = false, children }: {
  request: AccessRequest; showOwner: boolean; rejected?: boolean; children: React.ReactNode;
}) {
  return (
    <li className="sharing-row" data-testid="access-request-row">
      <div className="sharing-row-main">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, overflowWrap: "anywhere", minWidth: 0 }}>{request.requester.displayName}</span>
          {rejected ? <StatusChip tone="danger">Rejected</StatusChip> : <StatusChip tone="warning">Waiting for you</StatusChip>}
        </div>
        <div style={{ ...GF, fontSize: 13, color: SLATE, display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
          <span style={{ overflowWrap: "anywhere" }}><Mail size={13} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> {request.requester.email}</span>
          <span style={{ overflowWrap: "anywhere" }}>
            <FileText size={13} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> {request.document.documentTitle}{" "}
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>({request.document.verificationId})</span>
          </span>
          {showOwner && <span>Owner: {request.document.owner.displayName}</span>}
          <span><Clock size={13} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> Requested {formatSharingDate(request.createdAt)}{rejected && request.decidedAt ? ` · Rejected ${formatSharingDate(request.decidedAt)}` : ""}</span>
          {request.note && (
            <span style={{ color: "#334155", overflowWrap: "anywhere" }}>
              <MessageSquare size={13} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> Note: “{request.note}”
            </span>
          )}
        </div>
      </div>
      <div className="sharing-row-actions">{children}</div>
    </li>
  );
}
