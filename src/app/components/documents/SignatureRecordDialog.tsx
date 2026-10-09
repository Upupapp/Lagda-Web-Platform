// The participant record for one signing request: everyone who takes part —
// signers, approvers, reviewers — what each has done, and when.
//
// Reads GET /workspaces/:id/signing-requests/:id/signatures — a surface
// separate from the request's own detail route on purpose. That one returns
// the immutable snapshot (who was named, where they sign) and deliberately
// carries no ceremony state; this one answers "how far has it got". Keeping
// them apart is what makes it unambiguous, at every call site, whether you
// are looking at what was agreed or at what has happened since.
//
// Presented as a record rather than a status widget: for a signed document
// the interesting content is evidentiary — the party's name, the address the
// invitation went to, and the exact instant their submission was accepted.

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { X, CheckCircle2, Clock, XCircle, MinusCircle, ShieldCheck, SkipForward, BadgeCheck, AlertTriangle, Send, Loader2, IdCard } from "lucide-react";
import {
  realSigningRequestService,
  type SigningRequestSignatures, type Signatory, type RecipientWorkflowState,
} from "../../services/real/signing-request.service";
import { Z } from "../../utils/z-index";
import { completedWord } from "../../services/participant-wording";
import { DECLINE_REASON_CATEGORIES } from "../../models/recipient";
import { ApiError } from "../../services/api-client";
import { signingLinkLapsed } from "../../services/real/signing-link";
import {
  realIdentityCheckService, describeIdentityWaiveError,
  type RecipientIdentityCheck,
} from "../../services/real/identity-check.service";
import { LifecycleConfirmDialog, type LifecycleConfirmCopy } from "./LifecycleConfirmDialog";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };

const NAVY   = "#07111F";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const GREEN  = "#059669";
const AMBER  = "#B45309";
const RED    = "#DC2626";
const AZURE  = "#0078D4";

/** Case- and whitespace-insensitive, so "bruce  wayne" matches "Bruce Wayne". */
function sameName(a: string, b: string): boolean {
  const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(a) === norm(b);
}

/** Absolute, with the timezone shown — an evidentiary timestamp is useless
 *  as "2 days ago", and ambiguous without an offset. */
function fmtAbsolute(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
}

const STATE_PRESENTATION: Record<RecipientWorkflowState, {
  label: string; color: string; icon: typeof CheckCircle2;
}> = {
  signed:   { label: "Signed",       color: GREEN,  icon: CheckCircle2 },
  approved: { label: "Approved",     color: GREEN,  icon: BadgeCheck },
  skipped:  { label: "Skipped",      color: SLATE6, icon: SkipForward },
  active:   { label: "Awaiting",     color: AMBER,  icon: Clock },
  // "Not yet their turn" — a real and different thing from "we are waiting
  // on them", which is what `active` means.
  waiting:  { label: "Not yet due",  color: SLATE4, icon: MinusCircle },
  declined: { label: "Declined",     color: RED,    icon: XCircle },
};

/** What each participant IS, so a reader can tell who signed from who
 *  approved. The row never said, so everyone read as a signer. */
const ROLE_LABELS: Record<string, string> = {
  signer: "Signer",
  approver: "Approver",
  reviewer: "Reviewer",
  "acknowledgment-recipient": "Acknowledges",
  viewer: "Viewer",
  "carbon-copy": "Receives a copy",
};

/** A single labeled fact. Every field the record shows is named explicitly. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 6 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.05em", ...GF }}>
        {label}
      </span>
      <span style={{ fontSize: 12.5, color: NAVY, marginLeft: 6, ...GF, wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  );
}

/** The reason a signer picked, as they saw it; an unknown code still reads. */
function declineReasonLabel(reason: string): string {
  return DECLINE_REASON_CATEGORIES.find(category => category.id === reason)?.label
    ?? reason.replace(/-/g, " ");
}

/**
 * 105. How one participant stands on the identity check the sender asked of
 * them, in the sender's words.
 *
 * A pass made in test mode is a SIMULATION and is never worded as a pass:
 * it reads "Completed (test mode)".
 */
function identityCheckLine(check: RecipientIdentityCheck): { text: string; color: string } {
  switch (check.status) {
    case "passed": {
      const when = check.verifiedAt === null ? "" : ` ${fmtAbsolute(check.verifiedAt)}`;
      return check.mode === "live"
        ? { text: `Passed${when}`, color: GREEN }
        : { text: `Completed (test mode)${when}`, color: AMBER };
    }
    case "locked":
      return { text: "Locked after 3 attempts", color: RED };
    case "waived":
      return {
        text: `Lighter method allowed${check.waivedAt === null ? "" : ` ${fmtAbsolute(check.waivedAt)}`}`,
        color: SLATE6,
      };
    case "pending":
      return check.failedAttempts > 0
        ? { text: `Not passed, ${String(check.failedAttempts)} ${check.failedAttempts === 1 ? "attempt" : "attempts"}`, color: AMBER }
        : { text: "Required, not done yet", color: SLATE6 };
    default:
      return { text: "Not required", color: SLATE4 };
  }
}

/** What a row needs to show the identity check and offer the lighter method. */
interface IdentityControl {
  readonly check: RecipientIdentityCheck;
  /** Absent once the request is no longer out for signing. */
  readonly onAllow?: (signatory: Signatory) => void;
}

function IdentityCheckLine({ signatory, identity }: { signatory: Signatory; identity: IdentityControl }) {
  const { check } = identity;
  const line = identityCheckLine(check);
  const canAllow = identity.onAllow !== undefined && (check.status === "pending" || check.status === "locked");
  return (
    <div data-testid="signatory-identity-check" style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <IdCard size={13} aria-hidden style={{ color: SLATE4, flexShrink: 0, alignSelf: "center" }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: SLATE4, textTransform: "uppercase", letterSpacing: "0.05em", ...GF }}>
          Identity check
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: line.color, ...GF }}>{line.text}</span>
      </div>
      {canAllow && (
        <button
          type="button" onClick={() => { identity.onAllow?.(signatory); }}
          aria-label={`Allow a lighter method for ${signatory.name}`}
          style={{
            ...GF, marginTop: 8, minHeight: 36, display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12.5, fontWeight: 600, color: AZURE, background: "#fff",
            border: `1px solid #BFDBFE`, borderRadius: 7, padding: "7px 12px", cursor: "pointer",
          }}
        >
          Allow a lighter method
        </button>
      )}
    </div>
  );
}

const WAIVE_COPY: LifecycleConfirmCopy = {
  title: "Allow a lighter method?",
  lead: "This participant will be able to open and sign the document with their secure link alone, without the identity check.",
  points: [
    "This is recorded in the document's history.",
    "It applies to this participant only.",
  ],
  reason: {
    label: "Reason",
    placeholder: "For example: they do not have an ID with them.",
    hint: "Optional. Shown in the document's history.",
    optional: true,
  },
  tone: "neutral",
  icon: IdCard,
};

function SignatoryRow({ signatory, link, identity }: {
  signatory: Signatory; link?: LinkControl; identity?: IdentityControl;
}) {
  // Falls back rather than crashing if a newer backend sends a state this
  // build does not know yet — the defect this used to have.
  const presentation = STATE_PRESENTATION[signatory.state]
    ?? { label: signatory.state, color: SLATE6, icon: MinusCircle };
  const Icon = presentation.icon;
  const role = ROLE_LABELS[signatory.type] ?? signatory.type;
  // A reviewer or acknowledgment recipient ends `signed` like a signer does;
  // say what they actually did.
  // Nothing is ever expected of a viewer or a copy recipient, so "Awaiting"
  // or "Not yet due" would misstate them; say what they receive instead.
  const stateLabel = signatory.type === "viewer" ? "View only"
    : signatory.type === "carbon-copy" ? "Gets the final copy"
    : signatory.state === "signed" ? completedWord(signatory.type) : presentation.label;

  return (
    <li style={{ padding: "14px 0", borderBottom: `1px solid #F1F5F9`, listStyle: "none" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Icon size={17} aria-hidden style={{ color: presentation.color, flexShrink: 0, marginTop: 1 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: NAVY, ...GF }}>
              {signatory.name}
            </span>
            <span style={{ fontSize: 10, fontWeight: 400, color: SLATE4, ...GF }}>
              (name in document)
            </span>
            <span style={{
              fontSize: 10.5, fontWeight: 700, color: SLATE6, ...GF,
              background: "#F1F5F9", borderRadius: 99, padding: "1px 7px",
            }}>
              {role}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: presentation.color, ...GF }}>
              {stateLabel}
            </span>
            {!signatory.isRequired && (
              <span style={{ fontSize: 11, color: SLATE4, ...GF }}>optional</span>
            )}
          </div>

          {/* Every remaining field named, per its origin: what the SENDER
              wrote when preparing the document, distinct from the LAGDA
              account the person actually signed in with, if any -- the two
              can differ, and for a legal record that difference is the
              point. */}
          <Detail label="Email in document" value={signatory.email} />
          <Detail label="Company" value={signatory.organization ?? "Not provided"} />

          {(signatory.linkedAccountName !== null || signatory.linkedAccountEmail !== null) && (
            <div style={{
              marginTop: 8, padding: "8px 10px", borderRadius: 8,
              background: "#EFF6FF", border: `1px solid #BFDBFE`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={13} aria-hidden style={{ color: AZURE, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: AZURE, ...GF }}>
                  Signed in with a LAGDA account
                </span>
              </div>
              <Detail label="Account name" value={signatory.linkedAccountName ?? "Not available"} />
              <Detail label="Account email" value={signatory.linkedAccountEmail ?? "Not available"} />
              {/* The sender typed one name; the person signed in as another.
                  Both are kept as recorded — this only makes the difference
                  visible instead of leaving it to be spotted. */}
              {signatory.linkedAccountName !== null && !sameName(signatory.name, signatory.linkedAccountName) && (
                <div data-testid="signatory-name-mismatch" role="note" style={{
                  display: "flex", alignItems: "center", gap: 6, marginTop: 8,
                  padding: "4px 8px", borderRadius: 6, background: "#FFFBEB", border: "1px solid #FDE68A",
                }}>
                  <AlertTriangle size={12} aria-hidden style={{ color: AMBER, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: AMBER, ...GF }}>
                    Name differs from the LAGDA account ({signatory.linkedAccountName})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* The evidentiary line. Only ever rendered from a real instant —
              there is no "signed (date unknown)" state to represent. */}
          {/* An approval shares its submission instant with `signedAt`; it is
              stated once, as "Approved", below. */}
          {signatory.signedAt !== null && signatory.approvedAt == null && (
            <div style={{ fontSize: 12, color: NAVY, marginTop: 6, ...GF }}>
              {completedWord(signatory.type)} {fmtAbsolute(signatory.signedAt)}
            </div>
          )}
          {signatory.approvedAt != null && (
            <div style={{ fontSize: 12, color: NAVY, marginTop: 6, ...GF }}>
              Approved {fmtAbsolute(signatory.approvedAt)}
            </div>
          )}
          {signatory.skippedAt != null && (
            <div style={{ fontSize: 12, color: SLATE6, marginTop: 6, ...GF }}>
              Skipped {fmtAbsolute(signatory.skippedAt)}
            </div>
          )}
          {signatory.declinedAt !== null && (
            <div style={{ fontSize: 12, color: RED, marginTop: 6, ...GF }}>
              Declined {fmtAbsolute(signatory.declinedAt)}
            </div>
          )}
          {identity !== undefined && <IdentityCheckLine signatory={signatory} identity={identity} />}
          {link !== undefined && <SigningLink signatory={signatory} link={link} />}
          {/* The signer's stated reason, in the words they chose from. Only
              the category is recorded — there is no free-text note to show. */}
          {signatory.declinedAt !== null && signatory.declineReason !== null && (
            <div style={{
              marginTop: 8, padding: "8px 10px", borderRadius: 8,
              background: "#FEF2F2", border: "1px solid #FECACA",
            }}>
              <span style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: "0.05em", ...GF }}>
                Reason for declining
              </span>
              <span style={{ display: "block", fontSize: 13, color: NAVY, marginTop: 2, ...GF }}>
                {declineReasonLabel(signatory.declineReason)}
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** What a row needs to offer a new signing link. Absent when the request is no longer out for signing. */
interface LinkControl {
  /** The recipient a new link is being sent to right now, if any. */
  readonly sending: string | null;
  /** Recipients sent a new link in this dialog, and when that link ends. */
  readonly sent: ReadonlyMap<string, string>;
  readonly error: { recipientId: string; message: string } | null;
  readonly onSend: (signatory: Signatory) => void;
}

/**
 * The signing link of someone the request is waiting on: when it ends, and,
 * once it has ended, the button that sends a new one. Nothing is renewed
 * automatically, so a lapsed link stays lapsed until the sender presses this.
 */
function SigningLink({ signatory, link }: { signatory: Signatory; link: LinkControl }) {
  const sentUntil = link.sent.get(signatory.recipientId);
  if (sentUntil !== undefined) {
    return (
      <div role="status" data-testid="signing-link-sent" style={{ fontSize: 12, color: GREEN, fontWeight: 600, marginTop: 8, ...GF }}>
        A new signing link was emailed to {signatory.email}. It works until {fmtAbsolute(sentUntil)}.
      </div>
    );
  }
  if (signatory.state !== "active" || signatory.linkExpiresAt == null) return null;
  if (!signingLinkLapsed(signatory)) {
    return (
      <div style={{ fontSize: 12, color: SLATE6, marginTop: 6, ...GF }}>
        Signing link works until {fmtAbsolute(signatory.linkExpiresAt)}
      </div>
    );
  }
  const busy = link.sending === signatory.recipientId;
  return (
    <div data-testid="signing-link-lapsed" style={{
      marginTop: 8, padding: "10px 12px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <AlertTriangle size={13} aria-hidden style={{ color: AMBER, flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 12.5, color: NAVY, lineHeight: 1.5, ...GF }}>
          <strong>The signing link has ended.</strong> It stopped working on {fmtAbsolute(signatory.linkExpiresAt)},
          {" "}and {signatory.name} has not acted. Nothing is sent again until you choose to.
        </span>
      </div>
      <button
        type="button" disabled={link.sending !== null} onClick={() => { link.onSend(signatory); }}
        aria-label={`Send a new link to ${signatory.name}`}
        style={{
          ...GF, marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
          color: "#fff", background: AZURE, border: "none", borderRadius: 7, padding: "7px 12px",
          cursor: link.sending === null ? "pointer" : "default", opacity: link.sending !== null && !busy ? 0.6 : 1,
        }}
      >
        {busy ? <Loader2 size={13} aria-hidden className="animate-spin" /> : <Send size={13} aria-hidden />}
        {busy ? "Sending…" : "Send a new link"}
      </button>
      {link.error?.recipientId === signatory.recipientId && (
        <p role="alert" style={{ fontSize: 12, color: RED, margin: "8px 0 0", ...GF }}>{link.error.message}</p>
      )}
    </div>
  );
}

export interface SignatureRecordDialogProps {
  workspaceId: string;
  signingRequestId: string;
  documentTitle: string;
  onClose: () => void;
}

export function SignatureRecordDialog({
  workspaceId, signingRequestId, documentTitle, onClose,
}: SignatureRecordDialogProps) {
  const [data, setData] = useState<SigningRequestSignatures | null>(null);
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [linkError, setLinkError] = useState<{ recipientId: string; message: string } | null>(null);

  function sendNewLink(signatory: Signatory) {
    setSending(signatory.recipientId);
    setLinkError(null);
    void realSigningRequestService.reissueLink(workspaceId, signingRequestId, signatory.recipientId)
      .then(result => {
        setSent(previous => new Map(previous).set(signatory.recipientId, result.linkExpiresAt));
      })
      .catch((cause: unknown) => {
        setLinkError({
          recipientId: signatory.recipientId,
          message: cause instanceof ApiError && cause.status !== 0
            ? cause.message
            : "The new link could not be sent. Check your connection and try again.",
        });
      })
      .finally(() => { setSending(null); });
  }

  // 105. The identity check, where the sender asked one of anybody. `null`
  // covers "feature off" (the route does not exist) and any failure to read
  // it: the dialog then shows exactly what it showed before.
  const [identityChecks, setIdentityChecks] = useState<ReadonlyMap<string, RecipientIdentityCheck> | null>(null);
  const [waiving, setWaiving] = useState<Signatory | null>(null);
  const [waiveBusy, setWaiveBusy] = useState(false);
  const [waiveError, setWaiveError] = useState<string | null>(null);

  const loadIdentityChecks = useCallback(async (): Promise<void> => {
    try {
      setIdentityChecks(shownIdentityChecks(await realIdentityCheckService.checks(workspaceId, signingRequestId)));
    } catch {
      setIdentityChecks(null);
    }
  }, [workspaceId, signingRequestId]);

  useEffect(() => {
    let cancelled = false;
    void realIdentityCheckService.checks(workspaceId, signingRequestId)
      .then(items => { if (!cancelled) setIdentityChecks(shownIdentityChecks(items)); })
      .catch(() => { if (!cancelled) setIdentityChecks(null); });
    return () => { cancelled = true; };
  }, [workspaceId, signingRequestId]);

  function allowLighterMethod(reason: string) {
    if (waiving === null || waiveBusy) return;
    setWaiveBusy(true);
    setWaiveError(null);
    void realIdentityCheckService.waive(workspaceId, signingRequestId, waiving.recipientId, reason)
      .then(async () => {
        await loadIdentityChecks();
        setWaiving(null);
      })
      .catch((cause: unknown) => { setWaiveError(describeIdentityWaiveError(cause)); })
      .finally(() => { setWaiveBusy(false); });
  }

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

  useEffect(() => {
    let cancelled = false;
    void realSigningRequestService.signatures(workspaceId, signingRequestId)
      .then(result => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [workspaceId, signingRequestId]);

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Participants for ${documentTitle}`}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "rgba(7,17,31,0.55)", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 12, width: "min(560px, 100%)",
        maxHeight: "min(85vh, 760px)", display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 12, padding: "16px 18px", borderBottom: `1px solid ${SLATE2}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0, ...GF }}>
              Participants
            </h2>
            <p
              title={documentTitle}
              style={{
                fontSize: 12, color: SLATE6, margin: "3px 0 0", ...GF,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {documentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: SLATE4, padding: 2, flexShrink: 0,
            }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "4px 18px 18px" }}>
          {failed && (
            <p style={{ fontSize: 13, color: SLATE6, padding: "24px 0", ...GF }}>
              This document&apos;s participants could not be loaded.
            </p>
          )}

          {!failed && data === null && (
            <p style={{ fontSize: 13, color: SLATE4, padding: "24px 0", ...GF }}>
              Loading…
            </p>
          )}

          {data !== null && (
            <>
              <p style={{ fontSize: 13, color: SLATE6, margin: "14px 0 2px", ...GF }}>
                <strong style={{ color: NAVY }}>
                  {data.signedCount} of {data.requiredCount}
                </strong>
                {" "}required {data.requiredCount === 1 ? "participant has" : "participants have"} completed their part
              </p>
              <ul style={{ margin: "8px 0 0", padding: 0 }}>
                {data.signatories.map(signatory => (
                  <SignatoryRow key={signatory.recipientId} signatory={signatory}
                    {...identityControlFor(signatory, identityChecks, data.state,
                      target => { setWaiveError(null); setWaiving(target); })}
                    {...(data.state === "sent" || data.state === "partially-completed"
                      ? { link: { sending, sent, error: linkError, onSend: sendNewLink } } : {})} />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      {waiving !== null && (
        <LifecycleConfirmDialog
          copy={WAIVE_COPY}
          subject={`${waiving.name} · ${documentTitle}`}
          busy={waiveBusy}
          error={waiveError}
          onContinue={allowLighterMethod}
          onCancel={() => { if (!waiveBusy) setWaiving(null); }}
        />
      )}
    </div>
  );
}

/** The participants a check was asked of, by recipient; null when there is nothing to show. */
function shownIdentityChecks(
  items: readonly RecipientIdentityCheck[] | null,
): ReadonlyMap<string, RecipientIdentityCheck> | null {
  const shown = (items ?? []).filter(item => item.status !== "not-required");
  return shown.length === 0 ? null : new Map(shown.map(item => [item.recipientId, item]));
}

/** The identity check of one row, as a prop to spread; nothing when there is none. */
function identityControlFor(
  signatory: Signatory,
  checks: ReadonlyMap<string, RecipientIdentityCheck> | null,
  requestState: SigningRequestSignatures["state"],
  onAllow: (signatory: Signatory) => void,
): { identity?: IdentityControl } {
  const check = checks?.get(signatory.recipientId);
  if (check === undefined) return {};
  // A lighter method only means something while the request is still out.
  const open = requestState === "sent" || requestState === "partially-completed";
  return { identity: open ? { check, onAllow } : { check } };
}
