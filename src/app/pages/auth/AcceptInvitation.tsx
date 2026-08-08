// C13 — Accept team invitation page.
// Invitation state driven by ?inv= param (maps to mock fixture key).
// Demo values: valid | expired | revoked | accepted | mismatch.
// Never performs real workspace writes.

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { mockAuthService } from "../../services/mock/auth.service";
import { usePlatform } from "../../context/PlatformContext";
import { createMockSignInPayload } from "../../context/PlatformContext";
import type { MockInvitation } from "../../models/auth";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";

type PageState = "loading" | "valid" | "invalid" | "accepted" | "declined";

function StatusBadge({ status }: { status: MockInvitation["status"] }) {
  const cfg: Record<MockInvitation["status"], { label: string; color: string; bg: string; border: string }> = {
    valid:    { label: "Valid",    color: "#38BDF8", bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.2)" },
    expired:  { label: "Expired", color: "#EF4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)" },
    revoked:  { label: "Revoked", color: "#EF4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)" },
    accepted: { label: "Already accepted", color: "#C9960C", bg: "rgba(201,150,12,0.08)", border: "rgba(201,150,12,0.2)" },
    mismatch: { label: "Email mismatch", color: "#C9960C", bg: "rgba(201,150,12,0.08)", border: "rgba(201,150,12,0.2)" },
  };
  const c = cfg[status];
  return (
    <span style={{ display: "inline-block", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, color: c.color, ...GF, fontSize: 11, fontWeight: 700, padding: "3px 10px" }}>
      {c.label}
    </span>
  );
}

export function AcceptInvitation() {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const invParam    = params.get("inv") ?? "valid";
  const platform    = usePlatform();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invitation,setInvitation]= useState<MockInvitation | null>(null);
  const [submitting,setSubmitting]= useState(false);
  const redirectTimer = useRef<number | null>(null);

  useEffect(() => () => { if (redirectTimer.current) window.clearTimeout(redirectTimer.current); }, []);

  useEffect(() => {
    let cancelled = false;
    mockAuthService.getInvitation(invParam).then((inv) => {
      if (cancelled) return;
      setInvitation(inv);
      setPageState(inv.status === "valid" ? "valid" : "invalid");
    });
    return () => { cancelled = true; };
  }, [invParam]);

  async function handleAccept() {
    if (!invitation || submitting) return;
    setSubmitting(true);
    await mockAuthService.acceptInvitation(invitation.id);
    // Sign into the platform session with mock payload
    const payload = createMockSignInPayload();
    // The mock fixture always has a current workspace; guard so a missing one
    // never enters the session as an undefined workspace.
    const ws = payload.currentWorkspace ?? payload.workspaces[0];
    if (ws) platform.signIn(payload.user, payload.workspaces, ws, payload.subscription, payload.notifications);
    setPageState("accepted");
    // Tracked so leaving the page cancels it. An uncancelled timer would
    // navigate the user away from wherever they went next.
    redirectTimer.current = window.setTimeout(
      () => navigate("/app/dashboard", { replace: true }),
      1800,
    );
  }

  async function handleDecline() {
    if (!invitation || submitting) return;
    setSubmitting(true);
    await mockAuthService.declineInvitation(invitation.id);
    setPageState("declined");
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div role="status" aria-label="Loading invitation" style={{ width: 28, height: 28, border: "2px solid rgba(0,120,212,0.2)", borderTopColor: AZURE, borderRadius: "50%", animation: "ai-spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#475569", ...GF, fontSize: 13 }}>Loading invitation…</p>
        <style>{`@keyframes ai-spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="ai-spin"] { animation: none; } }`}</style>
      </div>
    );
  }

  // ── Declined ───────────────────────────────────────────────────────────────

  if (pageState === "declined") {
    return (
      <div style={{ textAlign: "center" }} role="status">
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 20 }} aria-hidden>✕</div>
        <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 10px" }}>Invitation declined</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>
          You have declined the invitation to join <strong style={{ color: "#94A3B8" }}>{invitation?.workspaceName}</strong> in this frontend demonstration.
        </p>
        <Link to="/sign-in" style={{ display: "block", background: AZURE, borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", textDecoration: "none", minHeight: 48, lineHeight: "20px" }}>Return to Sign In</Link>
      </div>
    );
  }

  // ── Accepted ───────────────────────────────────────────────────────────────

  if (pageState === "accepted") {
    return (
      // role=status so assistive technology hears the outcome. The redirect is
      // a convenience, never the only way forward — a user whose redirect is
      // blocked, slow, or interrupted still has a link.
      <div style={{ textAlign: "center" }} role="status">
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 20 }} aria-hidden>✓</div>
        <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 10px" }}>You have joined {invitation?.workspaceName}</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
          Taking you to your workspace now.
        </p>
        <Link to="/app/dashboard" style={{ display: "block", background: AZURE, borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", textDecoration: "none", minHeight: 48, lineHeight: "20px" }}>
          Go to workspace
        </Link>
      </div>
    );
  }

  // ── Invalid states ─────────────────────────────────────────────────────────

  if (pageState === "invalid" && invitation) {
    const errorCopy: Record<string, { title: string; body: string }> = {
      expired:  { title: "Invitation expired", body: "This invitation has expired. Ask the workspace administrator to send you a new one." },
      revoked:  { title: "Invitation revoked", body: "This invitation has been revoked. Contact the workspace administrator if you believe this is an error." },
      accepted: { title: "Invitation already used", body: "This invitation link has already been accepted. Sign in to access your workspace." },
      mismatch: { title: "Email mismatch", body: `This invitation was sent to a different email address (${invitation.invitedEmail}). Please sign in with that address or ask to be re-invited.` },
    };
    const copy = errorCopy[invitation.status] ?? { title: "Invitation not valid", body: "This invitation link is not valid." };
    const needsNewInvite = invitation.status === "expired" || invitation.status === "revoked";

    return (
      <div style={{ textAlign: "center" }} role="alert">
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 20 }} aria-hidden>⚠</div>
        <StatusBadge status={invitation.status} />
        <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "14px 0 10px" }}>{copy.title}</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>{copy.body}</p>
        {needsNewInvite && (
          <p style={{ color: "#94A3B8", ...GF, fontSize: 12, lineHeight: 1.6, margin: "0 0 18px" }}>
            {invitation.invitedBy} invited you. Reply to their invitation email, or contact support below
            and we will help you get a new link.
          </p>
        )}
        <Link to="/sign-in" style={{ display: "block", background: AZURE, borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", textDecoration: "none", minHeight: 48, lineHeight: "20px", marginBottom: 10 }}>
          {invitation.status === "accepted" ? "Sign in to your workspace" : "Go to Sign In"}
        </Link>
        <Link to="/contact" target="_blank" rel="noopener noreferrer" style={{ display: "block", color: "#64748B", ...GF, fontSize: 13, textDecoration: "underline", padding: "10px", minHeight: 44 }}>
          Contact support (opens in a new tab)
        </Link>
      </div>
    );
  }

  // ── Valid invitation ───────────────────────────────────────────────────────

  if (!invitation) return null;

  return (
    <>
      {/* The single most important thing this screen does is say WHAT the
          invitation is. A LAGDA email can invite you to join a workspace or ask
          you to sign a document, and those need completely different things
          from you. "You have been invited" left that ambiguous; naming the
          workspace and stating plainly that no signing is being asked for
          settles it before the user reads anything else. */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <p style={{ color: "#38BDF8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 8px" }}>
          WORKSPACE INVITATION
        </p>
        <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 8px", lineHeight: 1.3 }}>
          Join {invitation.workspaceName} on LAGDA
        </h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: "#94A3B8" }}>{invitation.invitedBy}</strong> invited you as{" "}
          <strong style={{ color: "#94A3B8" }}>{invitation.role}</strong>. This is an invitation to join
          a team — you are not being asked to sign a document.
        </p>
      </div>

      {/* Invitation card */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "24px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h2 style={{ color: "white", ...GF, fontSize: 17, fontWeight: 800, margin: 0 }}>{invitation.workspaceName}</h2>
          <StatusBadge status={invitation.status} />
        </div>

        {[
          { label: "Invited by",   value: invitation.invitedBy },
          { label: "Your role",    value: invitation.role },
          { label: "Invited email", value: invitation.invitedEmail },
          { label: "Expires",      value: invitation.expiresAt },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ color: "#475569", ...GF, fontSize: 13 }}>{label}</span>
            <span style={{ color: "#94A3B8", ...GF, fontSize: 13, fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handleDecline}
          disabled={submitting}
          style={{ flex: 1, background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#64748B", ...GF, fontSize: 14, fontWeight: 600, padding: "12px", cursor: submitting ? "not-allowed" : "pointer", minHeight: 44 }}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          disabled={submitting}
          aria-busy={submitting}
          style={{ flex: 2, background: submitting ? "rgba(0,120,212,0.5)" : AZURE, border: "none", borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "12px", cursor: submitting ? "not-allowed" : "pointer", minHeight: 44 }}
        >
          {submitting ? "Processing…" : "Accept invitation"}
        </button>
      </div>

      {/* What happens next, before the user commits. Previously the only hint
          about accounts was a "Already have an account?" link under the fold,
          which left a first-time recipient unsure whether accepting would
          create one. */}
      <p style={{ color: "#475569", ...GF, fontSize: 12, lineHeight: 1.6, textAlign: "center", margin: "14px 0 0" }}>
        Accepting takes you to {invitation.workspaceName}. If you do not have a LAGDA
        account yet, one is created for {invitation.invitedEmail} — there is nothing else to fill in.
      </p>

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <Link to="/sign-in" style={{ color: "#64748B", ...GF, fontSize: 12, textDecoration: "underline", padding: 8, display: "inline-block", minHeight: 44, lineHeight: "28px" }}>
          Sign in with a different account
        </Link>
      </div>

      {/* Demonstration scaffolding, deliberately last. It used to sit directly
          under the headline, which made developer test instructions the most
          prominent thing on an invitation screen. */}
      <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "12px 16px", marginTop: 24 }}>
        <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>FRONTEND DEMONSTRATION</p>
        <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          Test states: add <strong style={{ color: "#94A3B8" }}>?inv=expired</strong>,{" "}
          <strong style={{ color: "#94A3B8" }}>?inv=revoked</strong>, or{" "}
          <strong style={{ color: "#94A3B8" }}>?inv=mismatch</strong> to the URL.
        </p>
      </div>
    </>
  );
}
