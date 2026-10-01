// Shared Documents → Shared With Me: completed documents other people shared
// with this account, and the ones it asked for.
//
//   Accepted  branded with the OWNER workspace's banner and logo; the burger
//             menu opens the signed document (view / download), its
//             participants and audit trail, and "Remove your access".
//   Pending   Accept / Reject. A request of mine still waiting for the owner
//             is listed here too, without buttons.
//   Rejected  Withdraw rejection / Delete.
//
// What each item offers comes from its `actions`, never from a guess here.

import { useCallback, useEffect, useState } from "react";
import { Eye, Users, History, LogOut, Check, X, Undo2, Trash2, FileText, Clock, MessageSquare, UserRound, Inbox, Ban, CircleCheck } from "lucide-react";
import { EmptyStateLayout, SkeletonBlock } from "../../../components/platform";
import { CompletedDocumentGrid, type CardAction, type CompletedCardData } from "../documents/CompletedDocumentCards";
import { ConfirmDialog } from "../../../components/document-sharing/ConfirmDialog";
import { SharedDocumentDialog, type SharedDocumentView } from "../../../components/document-sharing/SharedDocumentDialog";
import { GF, NAVY, SLATE, SharingNotice, SmallButton, StatusChip } from "../../../components/document-sharing/SharingPrimitives";
import {
  documentSharingService, sharingErrorMessage, sharedLogoUrl, formatSharingDate,
  type SharedDocument,
} from "../../../services/real/document-sharing.service";
import { SharingTabs, panelId, tabId } from "./SharingTabs";
import { withProcess } from "../../../config/process-screens";

export type WithMeSection = "accepted" | "pending" | "rejected";

const PREFIX = "shared-with-me";
const DEFAULT_COLOR = "#0078D4";

interface Data { accepted: SharedDocument[]; pending: SharedDocument[]; rejected: SharedDocument[] }

type Confirm = { kind: "remove-access" | "delete"; item: SharedDocument };

export function SharedWithMeSection({ section, onSection }: { section: WithMeSection; onSection: (s: WithMeSection) => void }) {
  const [data, setData] = useState<Data>({ accepted: [], pending: [], rejected: [] });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [viewer, setViewer] = useState<{ item: SharedDocument; view: SharedDocumentView } | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback((quiet = false) => {
    if (!quiet) setStatus("loading");
    Promise.all([
      documentSharingService.sharedWithMe("accepted"),
      documentSharingService.sharedWithMe("pending"),
      documentSharingService.sharedWithMe("rejected"),
    ])
      .then(([accepted, pending, rejected]) => { setData({ accepted, pending, rejected }); setStatus("ready"); })
      .catch((err: unknown) => { setLoadError(sharingErrorMessage(err, "load")); setStatus("error"); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function respond(item: SharedDocument, verb: "accept" | "reject" | "withdraw-rejection") {
    setBusyId(item.id);
    setNotice(null);
    try {
      await withProcess(verb === "accept" ? "shared-accept" : verb === "reject" ? "shared-reject" : "shared-undo-reject", "",
        () => documentSharingService.actOnShared(item.id, verb));
      setNotice({
        tone: "success",
        text: verb === "accept" ? `“${item.documentTitle}” is now under Accepted.`
          : verb === "reject" ? `You rejected “${item.documentTitle}”. It is listed under Rejected.`
          : `The rejection was withdrawn. “${item.documentTitle}” is back under Pending.`,
      });
      load(true);
    } catch (err) {
      setNotice({ tone: "error", text: sharingErrorMessage(err, "respond") });
    } finally {
      setBusyId(null);
    }
  }

  const tabs = [
    { id: "accepted" as const, label: "Accepted", count: status === "ready" ? data.accepted.length : null, icon: CircleCheck },
    { id: "pending" as const, label: "Pending", count: status === "ready" ? data.pending.length : null, icon: Inbox },
    { id: "rejected" as const, label: "Rejected", count: status === "ready" ? data.rejected.length : null, icon: Ban },
  ];

  function cardActions(item: SharedDocument): CardAction[] {
    const actions: CardAction[] = [];
    if (item.actions.includes("open")) {
      actions.push(
        { id: "view", label: "View / Download signed document", icon: Eye, onSelect: () => setViewer({ item, view: "document" }) },
        { id: "participants", label: "View participants", icon: Users, onSelect: () => setViewer({ item, view: "participants" }) },
        { id: "audit", label: "View audit trail", icon: History, onSelect: () => setViewer({ item, view: "audit" }) },
      );
    }
    if (item.actions.includes("remove-access")) {
      actions.push({ id: "remove-access", label: "Remove your access", icon: LogOut, onSelect: () => setConfirm({ kind: "remove-access", item }) });
    }
    return actions;
  }

  return (
    <div style={{ minWidth: 0 }}>
      <SharingTabs label="Shared with me" tabs={tabs} active={section} onChange={onSection} idPrefix={PREFIX} size="minor" />

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
        {status === "ready" && section === "accepted" && (
          data.accepted.length === 0 ? (
            <EmptyStateLayout icon={<CircleCheck size={26} />} title="Nothing shared with you yet"
              description="Completed documents shared with your email address appear under Pending first. Accept one and it moves here." />
          ) : (
            <CompletedDocumentGrid label="Documents shared with you" cards={data.accepted.map((item): CompletedCardData => ({
              key: item.id,
              title: item.documentTitle,
              verificationId: item.verificationId,
              done: item.progress.completed,
              total: item.progress.participants,
              createdAt: item.completedAt,
              dateLabel: "Completed",
              bannerSubtitle: "Shared with you",
              branding: {
                displayName: item.branding.displayName,
                primaryColor: item.branding.primaryColor ?? DEFAULT_COLOR,
                logoUrl: sharedLogoUrl(item),
              },
              extra: (
                <div style={{ ...GF, fontSize: 12.5, color: SLATE, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ overflowWrap: "anywhere" }}><UserRound size={12} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> Owner: {item.owner.displayName}</span>
                  {item.sharedBy && item.sharedBy.displayName !== item.owner.displayName && (
                    <span style={{ overflowWrap: "anywhere" }}>Shared by {item.sharedBy.displayName}</span>
                  )}
                  {item.kind === "access-request" && <span>Access approved on your request</span>}
                </div>
              ),
              actions: cardActions(item),
            }))} />
          )
        )}
        {status === "ready" && section === "pending" && (
          data.pending.length === 0 ? (
            <EmptyStateLayout icon={<Inbox size={26} />} title="Nothing waiting for you"
              description="When someone shares a completed document with your email address, it appears here for you to accept or reject." />
          ) : (
            <ul aria-label="Pending shared documents" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {data.pending.map(item => (
                <SharedRow key={item.id} item={item}>
                  {item.actions.includes("accept") && (
                    <SmallButton icon={Check} label="Accept" variant="primary" disabled={busyId !== null}
                      ariaLabel={`Accept ${item.documentTitle}`} onClick={() => { void respond(item, "accept"); }} />
                  )}
                  {item.actions.includes("reject") && (
                    <SmallButton icon={X} label="Reject" disabled={busyId !== null}
                      ariaLabel={`Reject ${item.documentTitle}`} onClick={() => { void respond(item, "reject"); }} />
                  )}
                </SharedRow>
              ))}
            </ul>
          )
        )}
        {status === "ready" && section === "rejected" && (
          data.rejected.length === 0 ? (
            <EmptyStateLayout icon={<Ban size={26} />} title="No rejected documents"
              description="Documents you reject are kept here, so you can change your mind or delete them." />
          ) : (
            <ul aria-label="Rejected shared documents" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {data.rejected.map(item => (
                <SharedRow key={item.id} item={item}>
                  {item.actions.includes("withdraw-rejection") && (
                    <SmallButton icon={Undo2} label="Withdraw rejection" disabled={busyId !== null}
                      ariaLabel={`Withdraw rejection for ${item.documentTitle}`} onClick={() => { void respond(item, "withdraw-rejection"); }} />
                  )}
                  {item.actions.includes("delete") && (
                    <SmallButton icon={Trash2} label="Delete" variant="danger" disabled={busyId !== null}
                      ariaLabel={`Delete ${item.documentTitle}`} onClick={() => setConfirm({ kind: "delete", item })} />
                  )}
                </SharedRow>
              ))}
            </ul>
          )
        )}
      </div>

      {viewer && <SharedDocumentDialog item={viewer.item} view={viewer.view} onClose={() => setViewer(null)} />}
      {confirm && (
        <ConfirmDialog
          title={confirm.kind === "remove-access" ? "Remove your access?" : "Delete this document?"}
          subtitle={confirm.item.documentTitle}
          busyLabel={confirm.kind === "remove-access" ? "Removing…" : "Deleting…"}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              const item = confirm.item;
              if (confirm.kind === "remove-access") await withProcess("shared-remove-access", "", () => documentSharingService.removeMyAccess(item.id));
              else await withProcess("shared-delete", "", () => documentSharingService.deleteShared(item.id));
              setNotice({
                tone: "success",
                text: confirm.kind === "remove-access"
                  ? `You no longer have access to “${confirm.item.documentTitle}”.`
                  : `“${confirm.item.documentTitle}” was deleted from your list.`,
              });
              load(true);
              return null;
            } catch (err) {
              return sharingErrorMessage(err, "respond");
            }
          }}>
          {confirm.kind === "remove-access"
            ? <>You will no longer be able to open <strong>{confirm.item.documentTitle}</strong>. The owner would have to share it with you again.</>
            : <><strong>{confirm.item.documentTitle}</strong> will be removed from your Rejected list. This cannot be undone.</>}
        </ConfirmDialog>
      )}
    </div>
  );
}

function SharedRow({ item, children }: { item: SharedDocument; children: React.ReactNode }) {
  const waitingOnOwner = item.kind === "access-request" && item.status === "pending";
  const requestRejected = item.kind === "access-request" && item.status === "rejected";
  return (
    <li className="sharing-row" data-testid="shared-with-me-row">
      <div className="sharing-row-main">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, overflowWrap: "anywhere", minWidth: 0 }}>
            <FileText size={15} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> {item.documentTitle}
          </span>
          {waitingOnOwner && <StatusChip tone="warning">Waiting for the owner's approval</StatusChip>}
          {requestRejected && <StatusChip tone="neutral">Request not approved</StatusChip>}
          {item.kind === "share" && item.status === "pending" && <StatusChip tone="info">Shared with you</StatusChip>}
          {item.kind === "share" && item.status === "rejected" && <StatusChip tone="danger">Rejected</StatusChip>}
        </div>
        <div style={{ ...GF, fontSize: 13, color: SLATE, display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, overflowWrap: "anywhere" }}>{item.verificationId}</span>
          <span style={{ overflowWrap: "anywhere" }}>
            <UserRound size={13} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> {item.branding.displayName} · Owner: {item.owner.displayName}
            {item.sharedBy ? ` · Shared by ${item.sharedBy.displayName}` : ""}
          </span>
          <span><Clock size={13} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> {item.kind === "share" ? "Shared" : "Requested"} {formatSharingDate(item.createdAt)}</span>
          {item.note && (
            <span style={{ color: "#334155", overflowWrap: "anywhere" }}>
              <MessageSquare size={13} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} /> {item.kind === "access-request" ? "Your note" : "Note"}: “{item.note}”
            </span>
          )}
        </div>
      </div>
      <div className="sharing-row-actions">{children}</div>
    </li>
  );
}
