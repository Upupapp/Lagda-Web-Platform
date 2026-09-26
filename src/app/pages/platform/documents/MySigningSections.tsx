// "Documents I must sign" and "Signed by me" — documents OTHER people sent to
// this account, from any workspace (backend migrations 055, 056).
//
// Account-scoped rather than workspace-scoped, which is why these are their
// own tables and not filters on the sent list: the sent list is this
// workspace's documents, these are the signed-in person's.
//
// ── "Continue signing" is a second verification, then a button ─────────────
//
// The dialog asks for the account password first. Only once the server has
// accepted it does a "Proceed to signing" button appear, which opens the same
// signing page the emailed link opens, already signed in as this account. The
// step is deliberately two presses rather than one: the first proves who you
// are, the second is you choosing to go and sign a binding document now.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  X, PenLine, UserRound, Mail, Building2, CalendarClock, FileText, ShieldCheck,
  Lock, ArrowRight, Inbox, FileCheck2, Loader2,
} from "lucide-react";
import { Z } from "../../../utils/z-index";
import { ApiError } from "../../../services/api-client";
import {
  realMySigningService, continueSigningPath, isSignerEntry, canContinueFromApp,
  type DocumentToSign, type SignedDocument,
} from "../../../services/real/my-signing.service";

/** What a non-signer is asked to do, in the words the list and dialog use. */
const ROLE_WORDING: Record<string, { label: string; action: string; verb: string }> = {
  approver: { label: "Approver", action: "Continue to approve", verb: "approve it" },
  reviewer: { label: "Reviewer", action: "Continue reviewing", verb: "review it" },
  "acknowledgment-recipient": { label: "Acknowledgment", action: "Continue to acknowledge", verb: "acknowledge it" },
  viewer: { label: "Viewer", action: "", verb: "" },
  "carbon-copy": { label: "Copy recipient", action: "", verb: "" },
};
const SIGNER_WORDING = { label: "Signer", action: "Continue signing", verb: "sign it" };
const wordingFor = (item: Pick<DocumentToSign, "recipientType">) =>
  (isSignerEntry(item) ? SIGNER_WORDING : ROLE_WORDING[item.recipientType ?? ""]) ?? SIGNER_WORDING;

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const GREEN = "#059669";

const STYLES = `
  .mysign-row {
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 220px) 130px 300px;
    column-gap: 12px; align-items: center; min-height: 56px;
    border-bottom: 1px solid #F1F5F9; padding: 6px 0;
  }
  .mysign-row.signed { grid-template-columns: minmax(0, 1fr) minmax(0, 240px) 150px 150px; }
  .mysign-row > * { min-width: 0; }
  .mysign-head {
    font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase;
    letter-spacing: 0.06em; min-height: 36px; border-bottom: 1px solid #E2E8F0;
  }
  .mysign-actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
  .mysign-cards { display: none; }
  .mysign-spin { animation: mysign-spin 0.8s linear infinite; }
  @keyframes mysign-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .mysign-spin { animation: none; } }
  @media (max-width: 1100px) {
    .mysign-row { grid-template-columns: minmax(0, 1fr) minmax(0, 180px) 250px; }
    .mysign-row.signed { grid-template-columns: minmax(0, 1fr) minmax(0, 200px) 140px 150px; }
    .mysign-row > .mysign-when { display: none; }
    .mysign-row.signed > .mysign-when { display: block; }
  }
  @media (max-width: 767px) {
    .mysign-table { display: none; }
    .mysign-cards { display: block; }
  }
`;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function senderLine(item: { senderName: string | null; workspaceName: string | null }): string {
  if (item.senderName && item.workspaceName) return `${item.senderName} · ${item.workspaceName}`;
  return item.senderName ?? item.workspaceName ?? "Sender not recorded";
}

function RowButton({ icon: Icon, label, onClick, primary }: {
  icon: typeof PenLine; label: string; onClick: () => void; primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...GF, display: "inline-flex", alignItems: "center", gap: 6,
        minHeight: 34, padding: "0 12px", borderRadius: 7, cursor: "pointer",
        fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
        border: primary === true ? "none" : "1px solid #E3E8EF",
        background: primary === true ? AZURE : "#FFFFFF",
        color: primary === true ? "#FFFFFF" : SLATE6,
      }}
    >
      <Icon size={15} aria-hidden /> {label}
    </button>
  );
}

// ── Dialog frame ────────────────────────────────────────────────────────────

function DialogFrame({ title, subtitle, onClose, children }: {
  title: string; subtitle: string; onClose: () => void; children: ReactNode;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog" aria-modal="true" aria-label={title}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "rgba(7,17,31,0.55)", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 12, width: "min(480px, 100%)",
        maxHeight: "min(88vh, 720px)", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 12, padding: "16px 18px", borderBottom: `1px solid ${SLATE2}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>{title}</h2>
            <p title={subtitle} style={{
              ...GF, fontSize: 12, color: SLATE6, margin: "3px 0 0",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {subtitle}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: "none", border: "none", cursor: "pointer", color: SLATE4, padding: 2, flexShrink: 0,
          }}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <div style={{ padding: "16px 18px 18px" }}>{children}</div>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid #F1F5F9" }}>
      <Icon size={16} aria-hidden style={{ color: AZURE, flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...GF, fontSize: 11, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        <div style={{ ...GF, fontSize: 13.5, color: NAVY, fontWeight: 600, marginTop: 2, wordBreak: "break-word" }}>{value}</div>
      </div>
    </div>
  );
}

// ── See the sender ──────────────────────────────────────────────────────────

function SenderDialog({ item, onClose }: {
  item: (DocumentToSign | SignedDocument) & { signedAt?: string; invitedAt?: string; expiresAt?: string };
  onClose: () => void;
}) {
  return (
    <DialogFrame title="Who sent this" subtitle={item.documentTitle} onClose={onClose}>
      <Fact icon={UserRound} label="Sent by" value={item.senderName ?? "Not recorded"} />
      <Fact icon={Mail} label="Sender's email" value={item.senderEmail ?? "Not recorded"} />
      <Fact icon={Building2} label="Organisation" value={item.workspaceName ?? "Not recorded"} />
      <Fact icon={FileText} label="Document" value={item.documentTitle} />
      {item.invitedAt !== undefined && (
        <Fact icon={CalendarClock} label="Received" value={fmtDateTime(item.invitedAt)} />
      )}
      {item.expiresAt !== undefined && (
        <Fact icon={CalendarClock} label="Signing link valid until" value={fmtDateTime(item.expiresAt)} />
      )}
      {item.signedAt !== undefined && (
        <Fact icon={FileCheck2} label="You signed" value={fmtDateTime(item.signedAt)} />
      )}
      {/* Said because it is the one check a signer can make that the product
          cannot: whether this is someone they actually expected to hear from. */}
      <p style={{ ...GF, fontSize: 12, color: SLATE6, lineHeight: 1.6, margin: "12px 0 0" }}>
        These details are as they stood when the document was sent to you. If you
        don&rsquo;t recognise the sender, don&rsquo;t sign &mdash; contact them through a
        channel you already trust.
      </p>
    </DialogFrame>
  );
}

// ── Continue signing: the second verification ───────────────────────────────

function ContinueSigningDialog({ item, onClose }: { item: DocumentToSign; onClose: () => void }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "verified">("idle");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const verify = async () => {
    if (password === "" || state === "checking") return;
    setState("checking");
    setError(null);
    try {
      const result = await realMySigningService.continueSigning(item, password);
      setCode(result.code);
      setPassword("");
      setState("verified");
    } catch (err) {
      setState("idle");
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  };

  return (
    <DialogFrame title={wordingFor(item).action} subtitle={item.documentTitle} onClose={onClose}>
      {state !== "verified" ? (
        <form onSubmit={e => { e.preventDefault(); void verify(); }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
            <Lock size={18} aria-hidden style={{ color: AZURE, flexShrink: 0, marginTop: 2 }} />
            <p style={{ ...GF, margin: 0, fontSize: 13, color: NAVY, lineHeight: 1.6 }}>
              {isSignerEntry(item)
                ? <>Confirm it&rsquo;s you before signing. Enter your LAGDA account password
                  &mdash; your signature will be applied to a binding document.</>
                : <>Confirm it&rsquo;s you before you {wordingFor(item).verb}. Enter your LAGDA
                  account password &mdash; what you do is recorded against this document.</>}
            </p>
          </div>
          <label htmlFor="continue-signing-password" style={{ ...GF, display: "block", fontSize: 12, fontWeight: 600, color: SLATE6, marginBottom: 6 }}>
            Password
          </label>
          <input
            id="continue-signing-password"
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              ...GF, width: "100%", boxSizing: "border-box", height: 42, padding: "0 12px",
              border: `1px solid ${error ? "#DC2626" : SLATE2}`, borderRadius: 8,
              fontSize: 16, color: NAVY, outline: "none",
            }}
            aria-invalid={error !== null}
            aria-describedby={error !== null ? "continue-signing-error" : undefined}
          />
          {error !== null && (
            <p id="continue-signing-error" role="alert" style={{ ...GF, fontSize: 12.5, color: "#DC2626", margin: "8px 0 0" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button type="button" onClick={onClose} style={{
              ...GF, minHeight: 40, padding: "0 16px", borderRadius: 8, border: `1px solid ${SLATE2}`,
              background: "#fff", color: NAVY, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            }}>
              Cancel
            </button>
            <button type="submit" disabled={password === "" || state === "checking"} style={{
              ...GF, minHeight: 40, padding: "0 18px", borderRadius: 8, border: "none",
              background: AZURE, color: "#fff", fontSize: 13.5, fontWeight: 700,
              cursor: password === "" || state === "checking" ? "not-allowed" : "pointer",
              opacity: password === "" ? 0.6 : 1,
              display: "inline-flex", alignItems: "center", gap: 7,
            }}>
              {state === "checking"
                ? <><Loader2 size={15} aria-hidden className="mysign-spin" /> Verifying…</>
                : <><ShieldCheck size={15} aria-hidden /> Verify</>}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div role="status" style={{
            display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px",
            borderRadius: 10, background: "#ECFDF5", border: "1px solid #A7F3D0", marginBottom: 14,
          }}>
            <ShieldCheck size={18} aria-hidden style={{ color: GREEN, flexShrink: 0, marginTop: 1 }} />
            <p style={{ ...GF, margin: 0, fontSize: 13, color: "#065F46", lineHeight: 1.6 }}>
              Verified. You can now go to the document and {wordingFor(item).verb}. This step is
              valid for two minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { if (code !== null) void navigate(continueSigningPath(code)); }}
            style={{
              ...GF, width: "100%", minHeight: 46, borderRadius: 9, border: "none",
              background: AZURE, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {isSignerEntry(item) ? "Proceed to signing" : "Proceed to the document"} <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      )}
    </DialogFrame>
  );
}

// ── Shared list chrome ──────────────────────────────────────────────────────

function useList<T>(load: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const reload = useCallback(() => {
    setStatus("loading");
    void load()
      .then(result => { setItems(result); setStatus("ready"); })
      .catch(() => setStatus("error"));
  }, [load]);
  useEffect(() => { reload(); }, [reload]);
  return { items, status, reload };
}

function EmptyOrError({ status, icon: Icon, emptyTitle, emptyBody, onRetry }: {
  status: "loading" | "ready" | "error"; icon: typeof Inbox;
  emptyTitle: string; emptyBody: string; onRetry: () => void;
}) {
  if (status === "loading") {
    return <p style={{ ...GF, fontSize: 13, color: SLATE6, padding: "28px 0", textAlign: "center" }}>Loading…</p>;
  }
  const failed = status === "error";
  return (
    <div style={{ textAlign: "center", padding: "36px 12px" }}>
      <Icon size={28} aria-hidden style={{ color: SLATE4 }} />
      <h3 style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "10px 0 4px" }}>
        {failed ? "Couldn't load this list" : emptyTitle}
      </h3>
      <p style={{ ...GF, fontSize: 13, color: SLATE6, margin: 0, lineHeight: 1.6 }}>
        {failed ? "Something went wrong. Try again in a moment." : emptyBody}
      </p>
      {failed && (
        <button type="button" onClick={onRetry} style={{
          ...GF, marginTop: 12, minHeight: 36, padding: "0 14px", borderRadius: 8,
          border: `1px solid ${SLATE2}`, background: "#fff", color: NAVY, cursor: "pointer", fontSize: 13,
        }}>
          Try again
        </button>
      )}
    </div>
  );
}

const loadToSign = () => realMySigningService.documentsToSign().then(items => items.filter(isSignerEntry));
const loadOthers = () => realMySigningService.documentsToSign()
  .then(items => items.filter(item => !isSignerEntry(item)));
const loadSigned = () => realMySigningService.signedDocuments();

// ── Documents I must sign ───────────────────────────────────────────────────

export function DocumentsToSignSection({ onCount }: { onCount?: (count: number) => void }) {
  const { items, status, reload } = useList(loadToSign);
  const [senderFor, setSenderFor] = useState<DocumentToSign | null>(null);
  const [continueFor, setContinueFor] = useState<DocumentToSign | null>(null);

  useEffect(() => { if (status === "ready") onCount?.(items.length); }, [status, items.length, onCount]);

  return (
    <section aria-label="Documents I must sign" style={{ marginTop: 20 }}>
      <style>{STYLES}</style>
      {status !== "ready" || items.length === 0 ? (
        <EmptyOrError
          status={status} icon={Inbox} onRetry={reload}
          emptyTitle="Nothing waiting for your signature"
          emptyBody="Documents sent to your email address for signing will appear here."
        />
      ) : (
        <>
          <div className="mysign-table" role="table" aria-label="Documents I must sign">
            <div role="row" className="mysign-row mysign-head">
              <div role="columnheader">Document</div>
              <div role="columnheader">Sent by</div>
              <div role="columnheader" className="mysign-when">Received</div>
              <div role="columnheader" style={{ textAlign: "right" }}>Actions</div>
            </div>
            {items.map(item => (
              <div role="row" className="mysign-row" key={`${item.signingRequestId}:${item.recipientId}`}>
                <div role="cell" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <FileText size={15} aria-hidden style={{ color: SLATE4, flexShrink: 0 }} />
                  <span title={item.documentTitle} style={{
                    ...GF, fontSize: 13, fontWeight: 600, color: NAVY,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item.documentTitle}
                  </span>
                </div>
                <div role="cell" style={{ ...GF, fontSize: 12.5, color: SLATE6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={senderLine(item)}>
                  {senderLine(item)}
                </div>
                <div role="cell" className="mysign-when" style={{ ...GF, fontSize: 12, color: SLATE4 }}>
                  {fmtDate(item.invitedAt)}
                </div>
                <div role="cell" className="mysign-actions">
                  <RowButton icon={UserRound} label="See the sender" onClick={() => setSenderFor(item)} />
                  <RowButton icon={PenLine} label="Continue signing" primary onClick={() => setContinueFor(item)} />
                </div>
              </div>
            ))}
          </div>
          <div className="mysign-cards">
            {items.map(item => (
              <div key={`${item.signingRequestId}:${item.recipientId}`} style={{
                border: `1px solid ${SLATE2}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10, background: "#fff",
              }}>
                <div style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, wordBreak: "break-word" }}>{item.documentTitle}</div>
                <div style={{ ...GF, fontSize: 12.5, color: SLATE6, marginTop: 4 }}>{senderLine(item)}</div>
                <div style={{ ...GF, fontSize: 12, color: SLATE4, marginTop: 2 }}>Received {fmtDate(item.invitedAt)}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <RowButton icon={UserRound} label="See the sender" onClick={() => setSenderFor(item)} />
                  <RowButton icon={PenLine} label="Continue signing" primary onClick={() => setContinueFor(item)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {senderFor !== null && <SenderDialog item={senderFor} onClose={() => setSenderFor(null)} />}
      {continueFor !== null && <ContinueSigningDialog item={continueFor} onClose={() => setContinueFor(null)} />}
    </section>
  );
}

// ── Others: documents where this account takes part without signing ────────

function RoleBadge({ item }: { item: DocumentToSign }) {
  return (
    <span style={{
      ...GF, fontSize: 11, fontWeight: 700, color: "#1E40AF", background: "#EFF6FF",
      border: "1px solid #BFDBFE", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {wordingFor(item).label}
    </span>
  );
}

function OtherAction({ item, onContinue }: { item: DocumentToSign; onContinue: () => void }) {
  if (canContinueFromApp(item)) {
    return <RowButton icon={ArrowRight} label={wordingFor(item).action} primary onClick={onContinue} />;
  }
  // Nothing to do in the app: a viewer's access is the emailed link, and a
  // copy recipient is sent the finished document.
  return (
    <span style={{ ...GF, fontSize: 12, color: SLATE6, lineHeight: 1.4 }}>
      {item.recipientType === "viewer" ? "Open it from your email link" : "You’ll get the completed copy by email"}
    </span>
  );
}

export function OthersSection({ onCount }: { onCount?: (count: number) => void }) {
  const { items, status, reload } = useList(loadOthers);
  const [senderFor, setSenderFor] = useState<DocumentToSign | null>(null);
  const [continueFor, setContinueFor] = useState<DocumentToSign | null>(null);

  useEffect(() => { if (status === "ready") onCount?.(items.length); }, [status, items.length, onCount]);

  return (
    <section aria-label="Other documents I take part in" style={{ marginTop: 20 }}>
      <style>{STYLES}</style>
      {status !== "ready" || items.length === 0 ? (
        <EmptyOrError
          status={status} icon={Inbox} onRetry={reload}
          emptyTitle="Nothing here yet"
          emptyBody="Documents where you are an approver, reviewer, viewer, copy recipient or acknowledgment recipient will appear here."
        />
      ) : (
        <>
          <div className="mysign-table" role="table" aria-label="Other documents I take part in">
            <div role="row" className="mysign-row mysign-head">
              <div role="columnheader">Document</div>
              <div role="columnheader">Sent by</div>
              <div role="columnheader" className="mysign-when">Your role</div>
              <div role="columnheader" style={{ textAlign: "right" }}>Actions</div>
            </div>
            {items.map(item => (
              <div role="row" className="mysign-row" key={`${item.signingRequestId}:${item.recipientId}`}>
                <div role="cell" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <FileText size={15} aria-hidden style={{ color: SLATE4, flexShrink: 0 }} />
                  <span title={item.documentTitle} style={{
                    ...GF, fontSize: 13, fontWeight: 600, color: NAVY,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item.documentTitle}
                  </span>
                </div>
                <div role="cell" style={{ ...GF, fontSize: 12.5, color: SLATE6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={senderLine(item)}>
                  {senderLine(item)}
                </div>
                <div role="cell" className="mysign-when"><RoleBadge item={item} /></div>
                <div role="cell" className="mysign-actions" style={{ alignItems: "center" }}>
                  <RowButton icon={UserRound} label="See the sender" onClick={() => setSenderFor(item)} />
                  <OtherAction item={item} onContinue={() => setContinueFor(item)} />
                </div>
              </div>
            ))}
          </div>
          <div className="mysign-cards">
            {items.map(item => (
              <div key={`${item.signingRequestId}:${item.recipientId}`} style={{
                border: `1px solid ${SLATE2}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10, background: "#fff",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, wordBreak: "break-word", minWidth: 0 }}>{item.documentTitle}</div>
                  <RoleBadge item={item} />
                </div>
                <div style={{ ...GF, fontSize: 12.5, color: SLATE6, marginTop: 4 }}>{senderLine(item)}</div>
                <div style={{ ...GF, fontSize: 12, color: SLATE4, marginTop: 2 }}>Received {fmtDate(item.invitedAt)}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <RowButton icon={UserRound} label="See the sender" onClick={() => setSenderFor(item)} />
                  <OtherAction item={item} onContinue={() => setContinueFor(item)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {senderFor !== null && <SenderDialog item={senderFor} onClose={() => setSenderFor(null)} />}
      {continueFor !== null && <ContinueSigningDialog item={continueFor} onClose={() => setContinueFor(null)} />}
    </section>
  );
}

// ── Signed by me ────────────────────────────────────────────────────────────

export function SignedByMeSection() {
  const { items, status, reload } = useList(loadSigned);
  const [senderFor, setSenderFor] = useState<SignedDocument | null>(null);

  return (
    <section aria-label="Signed by me" style={{ marginTop: 20 }}>
      <style>{STYLES}</style>
      {status !== "ready" || items.length === 0 ? (
        <EmptyOrError
          status={status} icon={FileCheck2} onRetry={reload}
          emptyTitle="You haven't signed anything yet"
          emptyBody="Documents you sign while signed in to your LAGDA account will appear here, with who sent each one."
        />
      ) : (
        <>
          <div className="mysign-table" role="table" aria-label="Signed by me">
            <div role="row" className="mysign-row signed mysign-head">
              <div role="columnheader">Document</div>
              <div role="columnheader">Sent by</div>
              <div role="columnheader" className="mysign-when">Signed</div>
              <div role="columnheader" style={{ textAlign: "right" }}>Actions</div>
            </div>
            {items.map(item => (
              <div role="row" className="mysign-row signed" key={item.signingRequestId}>
                <div role="cell" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <FileCheck2 size={15} aria-hidden style={{ color: GREEN, flexShrink: 0 }} />
                  <span title={item.documentTitle} style={{
                    ...GF, fontSize: 13, fontWeight: 600, color: NAVY,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item.documentTitle}
                  </span>
                </div>
                <div role="cell" style={{ ...GF, fontSize: 12.5, color: SLATE6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={senderLine(item)}>
                  {senderLine(item)}
                </div>
                <div role="cell" className="mysign-when" style={{ ...GF, fontSize: 12, color: SLATE4 }}>
                  {fmtDate(item.signedAt)}
                </div>
                <div role="cell" className="mysign-actions">
                  <RowButton icon={UserRound} label="See the sender" onClick={() => setSenderFor(item)} />
                </div>
              </div>
            ))}
          </div>
          <div className="mysign-cards">
            {items.map(item => (
              <div key={item.signingRequestId} style={{
                border: `1px solid ${SLATE2}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10, background: "#fff",
              }}>
                <div style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, wordBreak: "break-word" }}>{item.documentTitle}</div>
                <div style={{ ...GF, fontSize: 12.5, color: SLATE6, marginTop: 4 }}>{senderLine(item)}</div>
                <div style={{ ...GF, fontSize: 12, color: GREEN, marginTop: 2 }}>Signed {fmtDate(item.signedAt)}</div>
                <div style={{ marginTop: 10 }}>
                  <RowButton icon={UserRound} label="See the sender" onClick={() => setSenderFor(item)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {senderFor !== null && <SenderDialog item={senderFor} onClose={() => setSenderFor(null)} />}
    </section>
  );
}
