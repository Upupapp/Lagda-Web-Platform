// /app/enotary/requests/:id — one request to a notary: the 3-day expiry, the link
// to give the notary (copy, share, the QR card), where it stands, and Revoke or
// Renew.
//
// The server owns every fact. This page asks again every 5 seconds while the
// request is open (and when the tab comes back to the front), counts down on its
// own clock in between, and re-syncs that clock from each answer. It ends where
// the notary's answer and the fee end: "accepted" says the session opens when
// LAGDA eNotary does, and promises nothing more. After the notary accepts, the
// page keeps asking while a fee is still to be paid or confirmed.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Copy, Hourglass, Mail, RefreshCw, Share2, ShieldCheck, XCircle } from "lucide-react";
import { ActionButton, ActionRow, GF, Notice } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import {
  describeInvitationError, invitationIsOpen, realEnotaryInvitationsService, type Invitation,
} from "../../../../services/real/enotary-invitations.service";
import { E, SERIF } from "../EnotaryChrome";
import { RequestTrail } from "../RequestTrail";
import { DetailNotes, detailRows } from "../request-details";
import { CLIENT_STEPS, EnotaryCaseFrame, PartyCard, type ClientStepId, type PartyRow, type TrailEntry } from "../CaseFrame";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import {
  OnrampNote, Panel, PanelTitle, TextField, bodyText, fieldStyle, useNow,
} from "../onramp-ui";
import { QrCard } from "./QrCard";
import { StatusBanner } from "../RecordCard";
import { SessionPanel } from "../room/SessionPanel";
import { ClientPaymentPanel, paymentIsPending } from "../payments/ClientPaymentPanel";
import { ExpiryClock, countdownText, expiryLabel, expiryTone, stampLabel, type ExpiryTone } from "./expiry";
import { withProcess } from "../../../../config/process-screens";

export const POLL_MS = 5000;

const TONE_STYLE: Record<ExpiryTone, { fg: string; bg: string; edge: string; word: string }> = {
  calm: { fg: E.skyDeep, bg: E.skyWash, edge: E.skyLine, word: "Time left" },
  amber: { fg: "#8A5A00", bg: "#FFF6DD", edge: "#EBD9A6", word: "Less than a day left" },
  red: { fg: "#B0182B", bg: "#FDECEE", edge: "#F3C4BF", word: "Less than 3 hours left" },
  ended: { fg: E.quiet, bg: E.wash, edge: E.line, word: "Ended" },
};

/** The big expiry panel: the date it ends and a live countdown. */
export function ExpiryPanel({ expiresAt, msLeft }: { expiresAt: string; msLeft: number }) {
  const tone = expiryTone(msLeft);
  const style = TONE_STYLE[tone];
  return (
    <div
      data-testid="expiry-panel" data-tone={tone}
      style={{ ...GF, margin: "0 0 18px", padding: "16px 18px", borderRadius: 12, background: style.bg, border: `1px solid ${style.edge}`, color: style.fg }}
    >
      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{style.word}</p>
      <p data-testid="expiry-countdown" style={{ margin: "4px 0 2px", fontFamily: SERIF, fontSize: "clamp(28px, 8vw, 40px)", fontWeight: 700, lineHeight: 1.15 }}>
        {countdownText(msLeft)}
      </p>
      <p data-testid="expiry-label" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
        {tone === "ended" ? "This request has ended." : `Expires ${expiryLabel(expiresAt)}`}
      </p>
    </div>
  );
}

/**
 * The notary's name as this page shows it: as their valid ID reads (LAGDA's identity check when they took the request,
 * never typed by them), or the Notary Directory's name until a verified one exists.
 */
export const notaryNameOf = (invitation: Invitation): string => {
  const verified = invitation.notary.verifiedName ?? null;
  return verified !== null && verified.trim() !== "" ? verified.trim() : invitation.notary.name;
};
const hasVerifiedName = (invitation: Invitation): boolean => (invitation.notary.verifiedName ?? "").trim() !== "";

type Loaded =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "missing" }
  | { kind: "ready"; invitation: Invitation };

function noticeFor(invitation: Invitation): { tone: "info" | "success" | "warn"; text: string } | null {
  const who = notaryNameOf(invitation);
  switch (invitation.status) {
    case "awaiting":
      return { tone: "info", text: `Give the link or the card to ${who}. They sign in to LAGDA and pass an ID and face check before they can take the request.` };
    case "claimed":
      return { tone: "info", text: `${who} passed the identity check and has the request. Now it waits for their answer.` };
    case "accepted": {
      const payment = invitation.payment;
      if (paymentIsPending(payment)) {
        return { tone: "success", text: payment?.status === "proof"
          ? `${who} accepted your request. They are checking your payment.`
          : `${who} accepted your request. Pay the fee below to go on.` };
      }
      return { tone: "success", text: `${who} accepted your request. You will be told when the session can begin.` };
    }
    case "declined":
      return { tone: "warn", text: `${who} declined this request. You can ask another notary from the Notary Directory.` };
    case "expired":
      return { tone: "warn", text: "This request ran out of time before it was answered. The old link no longer works. Renew it for a new link and a fresh time limit." };
    case "revoked":
      return { tone: "warn", text: "You cancelled this request and its link no longer works. Renew it for a new link and a fresh time limit." };
  }
}

/** Where the client is among the eight steps, from the request's own state. */
export function clientStepOf(invitation: Invitation): ClientStepId {
  switch (invitation.status) {
    case "accepted": {
      // Once there is a session, the step follows it: notarized, the document added, or the call.
      const session = invitation.session ?? null;
      if (session?.status === "notarized") return "notarized";
      if (session !== null && session.status !== "cancelled" && session.hasDocument) return "document";
      return "call";
    }
    default: return "joins";
  }
}

function titleFor(invitation: Invitation): string {
  const who = `Atty. ${notaryNameOf(invitation)}`;
  switch (invitation.status) {
    case "awaiting": return `Waiting for ${who} to join`;
    case "claimed": return `${who} has your request`;
    case "accepted": return `${who} accepted your request`;
    case "declined": return `${who} declined this request`;
    case "expired": return "This request ran out of time";
    case "revoked": return "You cancelled this request";
  }
}

function leadFor(invitation: Invitation): string {
  const who = `Atty. ${notaryNameOf(invitation)}`;
  switch (invitation.status) {
    case "awaiting": case "claimed":
      return `Your identity is verified. Your request has been sent to ${who}. When they accept, you meet them on a video call and choose the document together.`;
    case "accepted": return `${who} will meet you in a private room on a video call. You choose the document together.`;
    case "declined": return "You can ask another notary from the Notary Directory.";
    default: return "Renew the request for a new link and a fresh time limit.";
  }
}

const NEXT_STEPS: readonly { title: string; text: string }[] = [
  { title: "The lawyer accepts.", text: "You are told here, on this page." },
  { title: "You meet on a video call.", text: "On the call, the notary confirms it is you, and what you need notarized." },
  { title: "You choose the document together.", text: "From Completed, Shared Documents, or a file you upload." },
  { title: "The lawyer confirms the notarial act and the fee.", text: "You are not charged before that." },
  { title: "The document is notarized.", text: "You preview it, download it, and may ask for a Certified True Copy." },
];

/** The notary's side of the story, as the entries of the audit trail. */
function trailOf(invitation: Invitation): TrailEntry[] {
  const notaryCodes = new Set(["claimed", "accepted", "declined"]);
  return invitation.timeline.map(entry => {
    const by = notaryCodes.has(entry.code) ? "notary" : "client";
    return { at: stampLabel(entry.at), text: entry.text, by, actor: by === "notary" ? `Atty. ${notaryNameOf(invitation)}` : "You" } satisfies TrailEntry;
  });
}

const statusOf = (invitation: Invitation): { label: string; tone: "wait" | "ok" | "info" | "end" } => {
  switch (invitation.status) {
    case "awaiting": return { label: "Waiting for the notary", tone: "wait" };
    case "claimed": return { label: "Notary verified", tone: "wait" };
    case "accepted": return { label: "Accepted", tone: "ok" };
    case "declined": return { label: "Declined", tone: "end" };
    case "expired": return { label: "Expired", tone: "end" };
    case "revoked": return { label: "Cancelled", tone: "end" };
  }
};

export function ClientRequestPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "missing" });
  const [busy, setBusy] = useState<"revoke" | "renew" | "email" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const clock = useRef(new ExpiryClock());
  const alive = useRef(true);
  const { confirm, confirmDialog } = useConfirm();
  const now = useNow(1000);

  const take = useCallback((invitation: Invitation) => {
    clock.current.sync(invitation.secondsLeft);
    setLoaded({ kind: "ready", invitation });
  }, []);

  const load = useCallback((quiet: boolean) => {
    if (!USE_REAL_BACKEND) return;
    if (!quiet) setLoaded(current => (current.kind === "ready" ? current : { kind: "loading" }));
    realEnotaryInvitationsService.get(id).then(
      invitation => {
        if (!alive.current) return;
        if (invitation === null) setLoaded({ kind: "missing" }); else take(invitation);
      },
      () => { if (alive.current && !quiet) setLoaded({ kind: "error" }); },
    );
  }, [id, take]);

  useEffect(() => {
    alive.current = true;
    load(false);
    return () => { alive.current = false; };
  }, [load]);

  const open = loaded.kind === "ready" && invitationIsOpen(loaded.invitation.status);
  const status = loaded.kind === "ready" ? loaded.invitation.status : null;
  // A fee still to be paid or confirmed is also worth watching: the notary's answer arrives here.
  const watching = open || (loaded.kind === "ready" && loaded.invitation.status === "accepted" && paymentIsPending(loaded.invitation.payment));

  // Ask again every 5 seconds while the request is open, and when the tab comes back.
  useEffect(() => {
    if (!watching) return;
    const timer = setInterval(() => { if (!document.hidden) load(true); }, POLL_MS);
    const visible = () => { if (!document.hidden) load(true); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [watching, status, load]);

  const msLeft = clock.current.msLeft(now);
  // The clock ran out: ask once what the server now says.
  const endedAsked = useRef<string | null>(null);
  useEffect(() => {
    if (!open || msLeft > 0 || endedAsked.current === id) return;
    endedAsked.current = id;
    load(true);
  }, [open, msLeft, id, load]);

  if (!USE_REAL_BACKEND) return <EnotaryNotOffered />;
  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { load(false); }} />;
  if (loaded.kind === "missing") return <EnotaryNotOffered />;

  const invitation = loaded.invitation;
  const notice = noticeFor(invitation);
  const link = invitation.link;

  const act = async (kind: "revoke" | "renew" | "email", run: () => Promise<Invitation>) => {
    setBusy(kind);
    setProblem(null);
    setSaid(null);
    try {
      const next = await run();
      if (!alive.current) return;
      if (kind === "renew") { void navigate(`/app/enotary/requests/${encodeURIComponent(next.id)}`); return; }
      take(next);
      setSaid(kind === "revoke" ? "The request was cancelled and its link no longer works." : "The email address was saved.");
      if (kind === "email") setEmail("");
    } catch (error) {
      if (alive.current) setProblem(describeInvitationError(error));
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  const revoke = () => {
    confirm({
      title: "Cancel this request?",
      body: `The link and the card stop working at once. ${notaryNameOf(invitation)} will not be able to open it. You can renew it later for a new link.`,
      confirmLabel: "Cancel the request",
      cancelLabel: "Keep it",
      destructive: true,
      onConfirm: () => act("revoke", () => withProcess("enotary-request-revoke", "", () => realEnotaryInvitationsService.revoke(invitation.id), describeInvitationError)),
    });
  };

  const copy = async () => {
    if (link === null) return;
    try {
      await navigator.clipboard.writeText(link);
      setSaid("Link copied.");
    } catch {
      const field = document.getElementById("request-link") as HTMLInputElement | null;
      field?.select();
      setSaid("Press Copy on your keyboard to copy the selected link.");
    }
  };

  const share = async () => {
    if (link === null) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "LAGDA eNotary request", text: `A request for ${notaryNameOf(invitation)} on LAGDA eNotary.`, url: link,
        });
        return;
      } catch (error) {
        // The person closed the share sheet: nothing to say.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copy();
  };

  const canSetEmail = invitation.status === "awaiting" && !invitation.notary.emailOnRecord;

  const place = [invitation.notary.city, invitation.notary.province].filter(part => part !== "").join(", ");
  const rows: PartyRow[] = [
    ...(place !== "" ? [{ label: "Place of notarization", value: place }] : []),
    ...(invitation.reference !== undefined && invitation.reference !== null ? [{ label: "Reference no.", value: invitation.reference, mono: true, testId: "party-reference" }] : []),
    ...detailRows(invitation.details),
    { label: "Identity status", value: "Verified in LAGDA", testId: "party-identity", good: true },
    ...(invitation.payment !== null && invitation.payment !== undefined ? [{ label: "Notarial fee", value: `PHP ${(invitation.payment.amountCentavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` }] : []),
    { label: "Request received", value: stampLabel(invitation.createdAt ?? invitation.expiresAt) },
  ];
  const trail = trailOf(invitation);

  return (
    <EnotaryCaseFrame
      tone="client" eyebrow={`eNotary request \u2022 Atty. ${notaryNameOf(invitation)}`} title={titleFor(invitation)} lead={leadFor(invitation)}
      steps={CLIENT_STEPS} current={clientStepOf(invitation)} back={{ to: "/app/enotary/requests", label: "All requests" }}
      party={<PartyCard
        name={`Atty. ${notaryNameOf(invitation)}`} role={`Notary Public${invitation.notary.firm !== "" ? ` \u00B7 ${invitation.notary.firm}` : ""}`}
        tone="attorney" status={statusOf(invitation)} rows={rows} auditCount={trail.length} invitationId={invitation.id}
        verifiedName={hasVerifiedName(invitation)} />}
      trail={<RequestTrail invitationId={invitation.id} tone="client" fallback={trail} refreshKey={invitation.status} />}
    >
      {confirmDialog}

      {(invitation.status === "awaiting" || invitation.status === "claimed") && (
        <Panel testId="next-steps">
          <PanelTitle>What happens next</PanelTitle>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {NEXT_STEPS.map((step, i) => (
              <li key={step.title} style={{ ...GF, display: "flex", gap: 12, padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${E.line}`, fontSize: 14.5, color: E.text }}>
                <span aria-hidden="true" style={{ flex: "0 0 auto", width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: E.skyWash, color: E.skyDeep, fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
                <span><strong style={{ color: E.ink }}>{step.title}</strong> {step.text}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <DetailNotes details={invitation.details} />
      {notice !== null && (
        <StatusBanner
          icon={invitation.status === "accepted" ? ShieldCheck : invitation.status === "awaiting" || invitation.status === "claimed" ? Hourglass : XCircle}
          tone={notice.tone === "success" ? "ok" : notice.tone === "warn" ? "warn" : "info"}
          lead={invitation.status === "accepted" ? "Request accepted." : invitation.status === "claimed" ? "With the notary." : invitation.status === "awaiting" ? "Waiting for the notary." : undefined}
        >
          <span data-testid="request-notice">{notice.text}</span>
        </StatusBanner>
      )}

      {open && <ExpiryPanel expiresAt={invitation.expiresAt} msLeft={msLeft} />}

      {said !== null && <div role="status" style={{ ...GF, margin: "0 0 12px", fontSize: 13.5, color: E.ok, fontWeight: 600 }}>{said}</div>}
      {problem !== null && <Notice icon={XCircle} tone="danger">{problem}</Notice>}

      {invitation.status === "awaiting" && link !== null && (
        <>
          <Panel tone="sky" testId="link-panel">
            <PanelTitle>The link for the notary</PanelTitle>
            <input
              id="request-link" readOnly value={link} aria-label="Link for the notary"
              onFocus={event => { event.currentTarget.select(); }}
              style={{ ...fieldStyle(), fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13 }}
            />
            <ActionRow align="end">
              <ActionButton icon={Copy} onClick={() => { void copy(); }} full>Copy link</ActionButton>
              <ActionButton icon={Share2} kind="secondary" onClick={() => { void share(); }} full>Share</ActionButton>
            </ActionRow>
            {invitation.notary.accountKnown && (
              <p style={{ ...bodyText, margin: "12px 0 0", fontSize: 13.5 }}>
                {notaryNameOf(invitation)} already has a LAGDA account and was told about this request there.
              </p>
            )}
          </Panel>

          <Panel testId="card-panel">
            <PanelTitle>The QR card</PanelTitle>
            <p style={{ ...bodyText, fontSize: 13.5 }}>Show it on your screen or save it as a picture. It opens the same request as the link.</p>
            <QrCard link={link} notaryName={notaryNameOf(invitation)} expiresAt={invitation.expiresAt} />
          </Panel>
        </>
      )}

      {invitation.status === "accepted" && invitation.payment !== null && invitation.payment !== undefined && (
        <ClientPaymentPanel invitation={invitation} payment={invitation.payment} onChanged={take} />
      )}

      {invitation.status === "accepted" && <SessionPanel invitationId={invitation.id} role="client" />}

      {canSetEmail && (
        <Panel testId="email-panel">
          <PanelTitle>The notary&rsquo;s email</PanelTitle>
          {invitation.notaryEmail !== null && (
            <p data-testid="notary-email-saved" style={{ ...bodyText, fontSize: 13.5 }}>Saved: <strong>{invitation.notaryEmail}</strong></p>
          )}
          <TextField
            label={invitation.notaryEmail === null ? "Email address (optional)" : "Change the email address"}
            value={email} onChange={setEmail} type="email" inputMode="email" autoComplete="off"
            hint="LAGDA has no email on record for this notary. If you know it, add it here; it is kept with this request."
          />
          <ActionButton icon={Mail} kind="secondary" disabled={busy !== null || email.trim() === ""} onClick={() => { void act("email", () => withProcess("enotary-request-email", "", () => realEnotaryInvitationsService.setNotaryEmail(invitation.id, email), describeInvitationError)); }}>
            {busy === "email" ? "Saving…" : "Save the email"}
          </ActionButton>
        </Panel>
      )}

      {open && (
        <ActionRow align="end">
          <ActionButton kind="danger" disabled={busy !== null} onClick={revoke}>
            {busy === "revoke" ? "Cancelling…" : "Cancel this request"}
          </ActionButton>
        </ActionRow>
      )}
      {(invitation.status === "expired" || invitation.status === "revoked") && (
        <ActionRow align="end">
          <ActionButton icon={RefreshCw} disabled={busy !== null} onClick={() => { void act("renew", () => withProcess("enotary-request-renew", "", () => realEnotaryInvitationsService.renew(invitation.id), describeInvitationError)); }}>
            {busy === "renew" ? "Renewing…" : "Renew with a new link"}
          </ActionButton>
        </ActionRow>
      )}
      <OnrampNote />
    </EnotaryCaseFrame>
  );
}
