// /app/enotary/requests/:id — one request to a notary: the 3-day expiry, the link
// to give the notary (copy, share, the QR card), where it stands, and Revoke or
// Renew.
//
// The server owns every fact. This page asks again every 5 seconds while the
// request is open (and when the tab comes back to the front), counts down on its
// own clock in between, and re-syncs that clock from each answer. It ends where
// the notary's answer ends: "accepted" says the session opens when LAGDA eNotary
// does, and promises nothing more.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Check, Copy, Hourglass, Mail, RefreshCw, Share2, ShieldCheck, XCircle } from "lucide-react";
import { ActionButton, ActionRow, GF, Notice, T, TAP } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import {
  describeInvitationError, invitationIsOpen, realEnotaryInvitationsService, type Invitation,
} from "../../../../services/real/enotary-invitations.service";
import { E, EnotaryFrame, EnotaryHeading, SERIF } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import {
  OnrampNote, Panel, PanelTitle, StatusPill, TextField, bodyText, fieldStyle, useNow,
} from "../onramp-ui";
import { QrCard } from "./QrCard";
import { ExpiryClock, countdownText, expiryLabel, expiryTone, stampLabel, type ExpiryTone } from "./expiry";

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

type Loaded =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "missing" }
  | { kind: "ready"; invitation: Invitation };

function noticeFor(invitation: Invitation): { tone: "info" | "success" | "warn"; text: string } | null {
  const who = invitation.notary.name;
  switch (invitation.status) {
    case "awaiting":
      return { tone: "info", text: `Give the link or the card to ${who}. They sign in to LAGDA and pass an ID and face check before they can take the request.` };
    case "claimed":
      return { tone: "info", text: `${who} passed the identity check and has the request. Now it waits for their answer.` };
    case "accepted":
      return { tone: "success", text: `${who} accepted your request. The session opens when LAGDA eNotary does, and you will be told then.` };
    case "declined":
      return { tone: "warn", text: `${who} declined this request. You can ask another notary from the Notary Directory.` };
    case "expired":
      return { tone: "warn", text: "This request ran out of time before it was answered. The old link no longer works. Renew it for a new link and a fresh time limit." };
    case "revoked":
      return { tone: "warn", text: "You cancelled this request and its link no longer works. Renew it for a new link and a fresh time limit." };
  }
}

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

  // Ask again every 5 seconds while the request is open, and when the tab comes back.
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => { if (!document.hidden) load(true); }, POLL_MS);
    const visible = () => { if (!document.hidden) load(true); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [open, status, load]);

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
      body: `The link and the card stop working at once. ${invitation.notary.name} will not be able to open it. You can renew it later for a new link.`,
      confirmLabel: "Cancel the request",
      cancelLabel: "Keep it",
      destructive: true,
      onConfirm: () => act("revoke", () => realEnotaryInvitationsService.revoke(invitation.id)),
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
          title: "LAGDA eNotary request", text: `A request for ${invitation.notary.name} on LAGDA eNotary.`, url: link,
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

  return (
    <EnotaryFrame
      wide eyebrow="Your request" badge="Client" tone="client"
      description={`${invitation.notary.name}${invitation.notary.firm !== "" ? `, ${invitation.notary.firm}` : ""}`}
    >
      {confirmDialog}
      <p style={{ ...GF, margin: "0 0 14px" }}>
        <Link to="/app/enotary/requests" style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: TAP, color: T.azureDeep, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={16} aria-hidden /> All requests
        </Link>
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <EnotaryHeading>Request to Atty. {invitation.notary.name}</EnotaryHeading>
        <StatusPill status={invitation.status} />
      </div>
      <p style={{ ...bodyText, color: E.quiet, marginTop: -4 }}>
        {[invitation.notary.city, invitation.notary.province].filter(part => part !== "").join(", ")}
      </p>

      {notice !== null && (
        <Notice icon={invitation.status === "accepted" ? ShieldCheck : invitation.status === "awaiting" || invitation.status === "claimed" ? Hourglass : XCircle} tone={notice.tone}>
          <span data-testid="request-notice">{notice.text}</span>
        </Notice>
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
            <ActionRow>
              <ActionButton icon={Copy} onClick={() => { void copy(); }} full>Copy link</ActionButton>
              <ActionButton icon={Share2} kind="secondary" onClick={() => { void share(); }} full>Share</ActionButton>
            </ActionRow>
            {invitation.notary.accountKnown && (
              <p style={{ ...bodyText, margin: "12px 0 0", fontSize: 13.5 }}>
                {invitation.notary.name} already has a LAGDA account and was told about this request there.
              </p>
            )}
          </Panel>

          <Panel testId="card-panel">
            <PanelTitle>The QR card</PanelTitle>
            <p style={{ ...bodyText, fontSize: 13.5 }}>Show it on your screen or save it as a picture. It opens the same request as the link.</p>
            <QrCard link={link} notaryName={invitation.notary.name} expiresAt={invitation.expiresAt} />
          </Panel>
        </>
      )}

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
          <ActionButton icon={Mail} kind="secondary" disabled={busy !== null || email.trim() === ""} onClick={() => { void act("email", () => realEnotaryInvitationsService.setNotaryEmail(invitation.id, email)); }}>
            {busy === "email" ? "Saving…" : "Save the email"}
          </ActionButton>
        </Panel>
      )}

      {invitation.timeline.length > 0 && (
        <Panel testId="timeline">
          <PanelTitle>What happened</PanelTitle>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {invitation.timeline.map((entry, i) => (
              <li key={`${entry.at}-${entry.code}-${String(i)}`} style={{ ...GF, display: "flex", gap: 10, padding: "7px 0", borderTop: i === 0 ? "none" : `1px solid ${E.line}`, fontSize: 14, color: E.text }}>
                <Check size={16} aria-hidden style={{ color: E.sky, flex: "0 0 auto", marginTop: 3 }} />
                <span style={{ minWidth: 0 }}>
                  {entry.text}
                  <small style={{ display: "block", color: E.quiet, fontSize: 12.5 }}>{stampLabel(entry.at)}</small>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {open && (
        <ActionRow>
          <ActionButton kind="danger" disabled={busy !== null} onClick={revoke}>
            {busy === "revoke" ? "Cancelling…" : "Cancel this request"}
          </ActionButton>
        </ActionRow>
      )}
      {(invitation.status === "expired" || invitation.status === "revoked") && (
        <ActionRow>
          <ActionButton icon={RefreshCw} disabled={busy !== null} onClick={() => { void act("renew", () => realEnotaryInvitationsService.renew(invitation.id)); }}>
            {busy === "renew" ? "Renewing…" : "Renew with a new link"}
          </ActionButton>
        </ActionRow>
      )}
      <OnrampNote />
    </EnotaryFrame>
  );
}
