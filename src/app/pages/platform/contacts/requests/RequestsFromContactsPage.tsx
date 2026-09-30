// /app/contacts/requests — Contacts → Requests From Contacts (backend 086).
//
//   Received   what colleagues asked of ME, from every workspace.
//   Sent       what I asked of my contacts, from every workspace.
//
// Each view has three sub-sections, with counts:
//   Approved   status completed
//   Pending    status pending — the only one with actions
//   Rejected   status declined, and cancelled ("Cancelled by requester")
//
// The URL carries the place — ?view=received|sent&status=approved|pending|
// rejected&request=<id> — so a notification, a Back press or a shared link
// lands on the same item. When `request` names an item, the page opens the
// view and sub-section the item is ACTUALLY in (its status may have moved on
// since the link was made) and moves focus to it.

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router";
import { Check, Upload, Ban, X, PackageCheck, Loader2, Inbox, Info } from "lucide-react";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { useProcessing, buildSteps } from "../../../../services/processing.service";
import {
  realContactRequestService, contactRequestErrorMessage,
} from "../../../../services/real/contact-request.service";
import {
  CONTACT_REQUEST_GROUPS, CONTACT_REQUEST_GROUP_LABELS, CONTACT_REQUEST_VIEW_LABELS,
  contactRequestGroup, isContactRequestGroup, isContactRequestView, sortRequests, countByGroup,
  type ContactRequest, type ContactRequestGroup, type ContactRequestView,
} from "../../../../models/contact-requests";
import { modalButtonStyle } from "../../../../components/contact-requests/ModalFrame";
import { ContactsHeader, useConnectionLists } from "../contacts-ui";
import {
  RequestCard, ActionButton, InlineError, OpenDocumentButton,
  RejectDialog, CancelRequestDialog, MarkReceivedDialog,
} from "./RequestParts";
import { ACCEPT, UPLOAD_STAGES, uploadIntoWorkspace, uploadError } from "./request-upload";

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const NAVY = "#07111F";
const SLATE = "#475569";
const AZURE_DARK = "#005A9E";
const PAGE_BG = "#F8FAFC";

const VIEWS: readonly ContactRequestView[] = ["received", "sent"];

type ListStatus = "loading" | "ready" | "error";

function useRequestList(load: () => Promise<ContactRequest[]>) {
  const [items, setItems] = useState<ContactRequest[]>([]);
  const [status, setStatus] = useState<ListStatus>(USE_REAL_BACKEND ? "loading" : "ready");
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    // No backend: nothing can have been asked, and nothing is invented.
    if (!USE_REAL_BACKEND) { setItems([]); setStatus("ready"); return () => undefined; }
    let cancelled = false;
    setStatus("loading"); setError(null);
    load()
      .then(result => { if (!cancelled) { setItems(sortRequests(result)); setStatus("ready"); } })
      .catch((err: unknown) => { if (!cancelled) { setError(contactRequestErrorMessage(err, "load")); setStatus("error"); } });
    return () => { cancelled = true; };
  }, [load]);
  useEffect(() => reload(), [reload]);
  const replace = useCallback((next: ContactRequest) => {
    setItems(list => sortRequests(list.map(item => (item.requestId === next.requestId ? next : item))));
  }, []);
  return { items, status, error, reload, replace };
}

const loadReceived = () => realContactRequestService.listReceived();
const loadSent = () => realContactRequestService.listSent();

// ── Tabs (WAI-ARIA tabs pattern, automatic activation) ────────────────────

function Tabs<K extends string>({ label, keys, selected, onSelect, idFor, panelFor, render, size }: {
  label: string;
  keys: readonly K[];
  selected: K;
  onSelect: (key: K) => void;
  idFor: (key: K) => string;
  panelFor: (key: K) => string;
  render: (key: K, active: boolean) => React.ReactNode;
  size: "primary" | "secondary";
}) {
  const refs = useRef(new Map<K, HTMLButtonElement>());
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % keys.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + keys.length) % keys.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = keys.length - 1;
    if (next === null) return;
    event.preventDefault();
    const key = keys[next]!;
    onSelect(key);
    refs.current.get(key)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={`rfc-tabs rfc-tabs-${size}`}>
      {keys.map((key, index) => {
        const active = key === selected;
        return (
          <button
            key={key}
            ref={element => { if (element === null) refs.current.delete(key); else refs.current.set(key, element); }}
            type="button"
            role="tab"
            id={idFor(key)}
            aria-selected={active}
            // Only the shown panel exists, so only its tab points at one.
            aria-controls={active ? panelFor(key) : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => { onSelect(key); }}
            onKeyDown={event => { onKeyDown(event, index); }}
            className={`rfc-tab${active ? " rfc-tab-active" : ""}`}
          >
            {render(key, active)}
          </button>
        );
      })}
    </div>
  );
}

function CountPill({ value, active, srSuffix }: { value: number | null; active: boolean; srSuffix?: string }) {
  if (value === null) return null;
  return (
    <span className={`rfc-count${active ? " rfc-count-active" : ""}`}>
      {value}{srSuffix !== undefined && <span className="rfc-sr"> {srSuffix}</span>}
    </span>
  );
}

// ── Empty wording ─────────────────────────────────────────────────────────

const EMPTY: Record<ContactRequestView, Record<ContactRequestGroup, { title: string; body: string }>> = {
  received: {
    approved: { title: "No approved requests", body: "Requests you have completed will be listed here." },
    pending: { title: "Nothing is waiting for you", body: "When a colleague asks you to prepare a document, it will appear here and in your notifications." },
    rejected: { title: "No rejected requests", body: "Requests you reject, and requests the requester cancels, will be listed here." },
  },
  sent: {
    approved: { title: "No approved requests", body: "Requests your contacts have completed will be listed here." },
    pending: { title: "No pending requests", body: "Assign a contact for document preparation from their contact page. It will be listed here until they answer." },
    rejected: { title: "No rejected requests", body: "Requests your contacts reject, and requests you cancel, will be listed here." },
  },
};

// ── The page ──────────────────────────────────────────────────────────────

export function RequestsFromContactsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get("view");
  const rawGroup = searchParams.get("status");
  const view: ContactRequestView = isContactRequestView(rawView) ? rawView : "received";
  const group: ContactRequestGroup = isContactRequestGroup(rawGroup) ? rawGroup : "pending";
  const focusId = searchParams.get("request");

  const received = useRequestList(loadReceived);
  const sent = useRequestList(loadSent);
  const lists = { received, sent };
  const current = lists[view];

  const { run } = useProcessing();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<ContactRequest | null>(null);
  const [cancelFor, setCancelFor] = useState<ContactRequest | null>(null);
  const [receivedFor, setReceivedFor] = useState<ContactRequest | null>(null);
  const [missing, setMissing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<ContactRequest | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef<string | null>(null);
  const baseId = useId();
  // The Pending tab's count in the shared header.
  const pendingCount = useConnectionLists().lists?.received.length;

  const go = useCallback((next: { view?: ContactRequestView; group?: ContactRequestGroup; request?: string | null }) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (next.view !== undefined) params.set("view", next.view);
      if (next.group !== undefined) params.set("status", next.group);
      if (next.request === null) params.delete("request");
      else if (next.request !== undefined) params.set("request", next.request);
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  // A linked request opens where it actually is now.
  const receivedItems = received.items;
  const sentItems = sent.items;
  const receivedStatus = received.status;
  const sentStatus = sent.status;
  useEffect(() => {
    if (focusId === null || focusId === "") { setMissing(false); return; }
    const here = view === "received" ? { items: receivedItems, status: receivedStatus } : { items: sentItems, status: sentStatus };
    const there = view === "received" ? { items: sentItems, status: sentStatus } : { items: receivedItems, status: receivedStatus };
    if (here.status !== "ready") return;
    const found = here.items.find(item => item.requestId === focusId);
    if (found !== undefined) {
      setMissing(false);
      const actual = contactRequestGroup(found.status);
      if (actual !== group) go({ group: actual });
      return;
    }
    if (there.status === "loading") return;
    const elsewhere = there.status === "ready" ? there.items.find(item => item.requestId === focusId) : undefined;
    if (elsewhere !== undefined) {
      go({ view: view === "received" ? "sent" : "received", group: contactRequestGroup(elsewhere.status) });
      return;
    }
    setMissing(true);
  }, [focusId, view, group, receivedItems, sentItems, receivedStatus, sentStatus, go]);

  // …and takes focus, once, when it is on screen.
  const shown = useMemo(
    () => current.items.filter(item => contactRequestGroup(item.status) === group),
    [current.items, group]);
  useEffect(() => {
    if (focusId === null || focusedRef.current === focusId) return;
    if (!shown.some(item => item.requestId === focusId)) return;
    const element = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("[data-request-id]") ?? [])
      .find(candidate => candidate.dataset.requestId === focusId);
    if (element === undefined) return;
    focusedRef.current = focusId;
    element.scrollIntoView?.({ block: "center" });
    element.focus({ preventScroll: true });
  }, [focusId, shown]);

  const counts = {
    received: received.status === "ready" ? countByGroup(received.items) : null,
    sent: sent.status === "ready" ? countByGroup(sent.items) : null,
  };
  const groupCounts = counts[view];

  const selectView = (next: ContactRequestView) => {
    setActionError(null); setNotice(null);
    go({ view: next, group: "pending", request: null });
  };
  const selectGroup = (next: ContactRequestGroup) => {
    setActionError(null); setNotice(null);
    go({ group: next, request: null });
  };

  /** An answered request leaves Pending; say where it went. */
  const moved = (list: typeof received, next: ContactRequest, verb: string) => {
    list.replace(next);
    go({ request: null });
    setNotice(`${verb} “${next.title}”. It is now under ${CONTACT_REQUEST_GROUP_LABELS[contactRequestGroup(next.status)]}.`);
  };

  const complete = (request: ContactRequest, documentId?: string) => {
    setBusyId(request.requestId); setActionError(null); setNotice(null);
    realContactRequestService.complete(request.workspaceId, request.requestId, documentId)
      .then(next => { moved(received, next, "Completed"); })
      .catch((err: unknown) => { setActionError(contactRequestErrorMessage(err, "complete")); })
      .finally(() => { setBusyId(null); });
  };

  const onFile = (file: File) => {
    const request = uploadFor.current;
    if (request === null) return;
    setBusyId(request.requestId); setActionError(null); setNotice(null);
    void (async () => {
      try {
        const next = await run(
          { message: `Uploading ${file.name}`, detail: "Large documents can take a moment.", steps: buildSteps(UPLOAD_STAGES, "transfer") },
          async ({ update }) => {
            const documentId = await uploadIntoWorkspace(request.workspaceId, file, steps => { update({ steps }); });
            return realContactRequestService.complete(request.workspaceId, request.requestId, documentId);
          },
        );
        moved(received, next, "Completed");
      } catch (err) {
        setActionError(uploadError(err));
      } finally {
        setBusyId(null);
        uploadFor.current = null;
      }
    })();
  };

  const cancel = (request: ContactRequest) => {
    setBusyId(request.requestId); setActionError(null); setNotice(null);
    realContactRequestService.cancel(request.workspaceId, request.requestId)
      .then(next => { setCancelFor(null); moved(sent, next, "Cancelled"); })
      .catch((err: unknown) => { setCancelFor(null); setActionError(contactRequestErrorMessage(err, "cancel")); })
      .finally(() => { setBusyId(null); });
  };

  const actionsFor = (request: ContactRequest): React.ReactNode => {
    if (request.status !== "pending") return undefined;
    const busy = busyId === request.requestId;
    if (view === "received") {
      return (<>
        {request.kind === "preparation" ? (<>
          <OpenDocumentButton request={request} disabled={busy} />
          <ActionButton icon={Check} label={busy ? "Saving…" : "Mark as done"} disabled={busy}
            onClick={() => { complete(request); }} />
        </>) : (
          <ActionButton icon={busy ? Loader2 : Upload} label={busy ? "Uploading…" : "Upload and complete"} variant="primary" disabled={busy}
            onClick={() => { uploadFor.current = request; fileInput.current?.click(); }} />
        )}
        <ActionButton icon={Ban} label="Reject" variant="danger" disabled={busy}
          onClick={() => { setActionError(null); setRejectFor(request); }} />
      </>);
    }
    return (<>
      {request.delivery === "email" && (
        <ActionButton icon={PackageCheck} label="Mark as received" variant="primary" disabled={busy}
          onClick={() => { setActionError(null); setReceivedFor(request); }} />
      )}
      <ActionButton icon={X} label="Cancel" variant="danger" disabled={busy}
        onClick={() => { setActionError(null); setCancelFor(request); }} />
    </>);
  };

  const viewTabId = (key: ContactRequestView) => `${baseId}-view-${key}`;
  const viewPanelId = (key: ContactRequestView) => `${baseId}-view-panel-${key}`;
  const groupTabId = (key: ContactRequestGroup) => `${baseId}-${view}-group-${key}`;
  const groupPanelId = (key: ContactRequestGroup) => `${baseId}-${view}-group-panel-${key}`;
  const empty = EMPTY[view][group];

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG }}>
      <style>{STYLES}</style>
      <ContactsHeader section="requests" pendingCount={pendingCount}
        subtitle="Documents you asked your contacts for, and what they asked of you." />

      <main className="rfc-main" style={{ padding: "20px 24px 40px", maxWidth: 980, boxSizing: "border-box" }}>
        <h2 style={{ ...GF, fontSize: 18, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>Document requests</h2>
        <p style={{ ...GF, fontSize: 13.5, color: SLATE, margin: "0 0 16px", lineHeight: 1.55, maxWidth: 680 }}>
          Requests your colleagues sent you, and requests you sent to your contacts, across every workspace you belong to.
        </p>

        {!USE_REAL_BACKEND && (
          <p style={{ ...GF, display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#1E3A8A", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 12px", margin: "0 0 16px", lineHeight: 1.5 }}>
            <Info size={15} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            Requests are available in a connected LAGDA workspace. Nothing is shown in this demonstration.
          </p>
        )}

        <Tabs
          label="Request views"
          keys={VIEWS}
          selected={view}
          onSelect={selectView}
          idFor={viewTabId}
          panelFor={viewPanelId}
          size="primary"
          render={(key, active) => (<>
            {CONTACT_REQUEST_VIEW_LABELS[key]}
            {counts[key] !== null && counts[key].pending > 0 && (
              <CountPill value={counts[key].pending} active={active} srSuffix="pending" />
            )}
          </>)}
        />

        <div role="tabpanel" id={viewPanelId(view)} aria-labelledby={viewTabId(view)} style={{ marginTop: 14 }}>
          <Tabs
            label={`${CONTACT_REQUEST_VIEW_LABELS[view]} requests by status`}
            keys={CONTACT_REQUEST_GROUPS}
            selected={group}
            onSelect={selectGroup}
            idFor={groupTabId}
            panelFor={groupPanelId}
            size="secondary"
            render={(key, active) => (<>
              {CONTACT_REQUEST_GROUP_LABELS[key]}
              <CountPill value={groupCounts === null ? null : groupCounts[key]} active={active} />
            </>)}
          />

          <div ref={panelRef} role="tabpanel" id={groupPanelId(group)} aria-labelledby={groupTabId(group)} style={{ marginTop: 14 }}>
            <p role="status" aria-live="polite" style={notice === null ? SR_ONLY : { ...GF, fontSize: 13, color: "#065F46", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: "8px 12px", margin: "0 0 12px", overflowWrap: "anywhere" }}>
              {notice ?? ""}
            </p>
            {missing && (
              <p style={{ ...GF, fontSize: 13, color: "#334155", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 12px", margin: "0 0 12px" }}>
                The request you followed is no longer available to you.
              </p>
            )}
            <InlineError text={actionError} />
            {group === "rejected" && current.status === "ready" && shown.length > 0 && (
              <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "0 0 10px", lineHeight: 1.5 }}>
                Rejected requests, and requests cancelled by the requester, are kept here for your records. They are read-only.
              </p>
            )}

            {current.status === "loading" && (
              <p role="status" style={{ ...GF, fontSize: 13, color: SLATE, padding: "20px 0", textAlign: "center", margin: 0 }}>Loading requests…</p>
            )}
            {current.status === "error" && (
              <div>
                <InlineError text={current.error} />
                <button type="button" onClick={() => { current.reload(); }} style={modalButtonStyle("secondary")}>Try again</button>
              </div>
            )}
            {current.status === "ready" && shown.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 12px", background: "#FFFFFF", border: "1px dashed #CBD5E1", borderRadius: 10 }}>
                <Inbox size={26} aria-hidden style={{ color: "#64748B" }} />
                <h3 style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "8px 0 4px" }}>{empty.title}</h3>
                <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 auto", lineHeight: 1.6, maxWidth: 420 }}>{empty.body}</p>
              </div>
            )}
            {current.status === "ready" && shown.length > 0 && (
              <ul
                aria-label={`${CONTACT_REQUEST_VIEW_LABELS[view]}, ${CONTACT_REQUEST_GROUP_LABELS[group]}`}
                style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}
              >
                {shown.map(request => (
                  <RequestCard key={request.requestId} request={request} view={view} highlighted={focusId === request.requestId}>
                    {actionsFor(request)}
                  </RequestCard>
                ))}
              </ul>
            )}
          </div>
        </div>

        <input
          ref={fileInput} type="file" accept={ACCEPT} aria-label="Choose a file to upload" tabIndex={-1}
          style={{ display: "none" }}
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
      </main>

      {rejectFor !== null && (
        <RejectDialog
          request={rejectFor}
          onClose={() => { setRejectFor(null); }}
          onRejected={next => { moved(received, next, "Rejected"); }}
        />
      )}
      {cancelFor !== null && (
        <CancelRequestDialog
          request={cancelFor}
          busy={busyId === cancelFor.requestId}
          onContinue={() => { cancel(cancelFor); }}
          onClose={() => { setCancelFor(null); }}
        />
      )}
      {receivedFor !== null && (
        <MarkReceivedDialog
          request={receivedFor}
          onClose={() => { setReceivedFor(null); }}
          onCompleted={next => { moved(sent, next, "Marked as received"); }}
        />
      )}
    </div>
  );
}

const SR_ONLY: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden",
  clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};

const STYLES = `
.rfc-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.rfc-tabs-primary { border-bottom: 1px solid #E2E8F0; gap: 4px; }
.rfc-tab {
  font-family: 'Geist', sans-serif; display: inline-flex; align-items: center; gap: 6px;
  min-height: 44px; padding: 0 14px; cursor: pointer; font-size: 14px; font-weight: 600;
  color: ${SLATE}; background: transparent; border: none; white-space: nowrap;
}
.rfc-tabs-primary .rfc-tab { border-bottom: 3px solid transparent; margin-bottom: -1px; border-radius: 6px 6px 0 0; }
.rfc-tabs-primary .rfc-tab-active { color: ${AZURE_DARK}; border-bottom-color: #0078D4; font-weight: 700; }
.rfc-tabs-secondary .rfc-tab {
  min-height: 40px; font-size: 13px; border-radius: 999px; padding: 0 12px;
  border: 1px solid #CBD5E1; background: #FFFFFF; color: #334155;
}
.rfc-tabs-secondary .rfc-tab-active { border-color: #0078D4; background: #EFF6FF; color: ${AZURE_DARK}; font-weight: 700; }
.rfc-tab:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
.rfc-count {
  display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px;
  padding: 0 6px; border-radius: 999px; font-size: 11.5px; font-weight: 700;
  background: #E2E8F0; color: #1E293B; box-sizing: border-box;
}
.rfc-count-active { background: #0078D4; color: #FFFFFF; }
.rfc-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.rfc-card:focus { outline: 2px solid #0078D4; outline-offset: 2px; }
@media (max-width: 480px) {
  .rfc-header { padding: 16px 16px 12px !important; }
  .rfc-main { padding: 16px 16px 32px !important; }
  .rfc-card { padding: 12px !important; gap: 10px !important; }
  .rfc-card-icon { display: none !important; }
  .rfc-tabs-secondary .rfc-tab { padding: 0 10px; }
}
`;
