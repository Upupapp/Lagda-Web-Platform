// C13 — Accept team invitation page.
//
// Two paths:
//   /invitations/accept?token=…  (real backend) — the link a workspace
//     invitation email carries. Previews the invitation, and Accept files a
//     join REQUEST (078): the response says `pending: true` and the person
//     waits for an owner or administrator to approve. Nobody auto-joins.
//   /accept-invitation?inv=…     (demo) — state driven by the ?inv= fixture
//     key (valid | expired | revoked | accepted | mismatch). Accepting shows
//     the same "waiting for approval" outcome. No real workspace writes.

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { mockAuthService } from "../../services/mock/auth.service";
import { usePlatform } from "../../context/PlatformContext";
import { USE_REAL_BACKEND } from "../../services/backend-flag";
import type { MockInvitation } from "../../models/auth";
import {
  previewInvitation, acceptInvitation, declineInvitation, type InvitationPreview,
} from "../../services/real/invitation-redemption.service";
import { REAL_ROLE_LABELS, type BackendWorkspaceRole } from "../../services/real/workspace-admin.service";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";

type PageState = "loading" | "valid" | "invalid" | "pending" | "declined";

const primaryLink = {
  display: "block", background: AZURE, borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700,
  padding: "14px", textDecoration: "none", minHeight: 48, lineHeight: "20px", boxSizing: "border-box" as const,
  textAlign: "center" as const,
};

/** "Request sent — waiting for approval." Shared by the real and demo paths. */
function PendingApproval({ workspaceName }: { workspaceName: string | undefined }) {
  return (
    <div style={{ textAlign: "center" }} role="status">
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 20 }} aria-hidden>✓</div>
      <h1 style={{ color: "#07111F", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 10px" }}>Request sent — waiting for approval</h1>
      <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
        The owner or an admin of <strong style={{ color: "#334155" }}>{workspaceName ?? "the workspace"}</strong> will
        review your request. You will have access once it is approved.
      </p>
      <Link to="/app/dashboard" style={primaryLink}>Go to dashboard</Link>
    </div>
  );
}

function StatusBadge({ status }: { status: MockInvitation["status"] }) {
  const cfg: Record<MockInvitation["status"], { label: string; color: string; bg: string; border: string }> = {
    valid:    { label: "Valid",    color: "#0078D4", bg: "rgba(0,120,212,0.08)",  border: "rgba(0,120,212,0.2)" },
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
  const [params] = useSearchParams();
  const token = params.get("token");
  if (USE_REAL_BACKEND && token) return <RealAcceptInvitation token={token} />;
  return <DemoAcceptInvitation />;
}

// ── Real: /invitations/accept?token=… ─────────────────────────────────────────

type RealState =
  | { kind: "loading" }
  | { kind: "valid"; invitation: InvitationPreview }
  | { kind: "invalid" }
  | { kind: "error"; message: string; invitation: InvitationPreview | null }
  | { kind: "mismatch"; invitation: InvitationPreview }
  | { kind: "pending"; workspaceName: string }
  | { kind: "member"; workspaceName: string }
  | { kind: "declined"; workspaceName: string };

function RealAcceptInvitation({ token }: { token: string }) {
  const navigate = useNavigate();
  const platform = usePlatform();
  const [state, setState] = useState<RealState>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const signedIn = platform.sessionStatus === "authenticated";
  const signInUrl = `/sign-in?returnTo=${encodeURIComponent(`/invitations/accept?token=${token}`)}`;

  useEffect(() => {
    let cancelled = false;
    void previewInvitation(token).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") setState({ kind: "valid", invitation: result.invitation });
      else if (result.kind === "invalid") setState({ kind: "invalid" });
      else setState({ kind: "error", message: "We couldn't open this invitation right now. Try again in a moment.", invitation: null });
    });
    return () => { cancelled = true; };
  }, [token]);

  async function accept(invitation: InvitationPreview) {
    if (!signedIn) { void navigate(signInUrl); return; }
    setSubmitting(true);
    const result = await acceptInvitation(token);
    setSubmitting(false);
    switch (result.kind) {
      case "pending": setState({ kind: "pending", workspaceName: result.workspaceName }); return;
      case "joined":
      case "already-member":
        await platform.refreshSessionFromBackend();
        setState({ kind: "member", workspaceName: result.workspaceName });
        return;
      case "invalid": setState({ kind: "invalid" }); return;
      case "mismatch": setState({ kind: "mismatch", invitation }); return;
      case "signed-out": void navigate(signInUrl); return;
      default: setState({ kind: "error", message: result.message, invitation });
    }
  }

  async function decline(invitation: InvitationPreview) {
    if (!signedIn) { void navigate(signInUrl); return; }
    setSubmitting(true);
    try {
      await declineInvitation(token);
      setState({ kind: "declined", workspaceName: invitation.workspaceName });
    } catch {
      setState({ kind: "error", message: "We couldn't decline this invitation. Please try again.", invitation });
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div role="status" aria-label="Loading invitation" style={{ width: 28, height: 28, border: "2px solid rgba(0,120,212,0.2)", borderTopColor: AZURE, borderRadius: "50%", animation: "ai-spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#334155", ...GF, fontSize: 13 }}>Loading invitation…</p>
        <style>{`@keyframes ai-spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="ai-spin"] { animation: none; } }`}</style>
      </div>
    );
  }
  if (state.kind === "pending") return <PendingApproval workspaceName={state.workspaceName} />;
  if (state.kind === "member" || state.kind === "declined") {
    return (
      <div style={{ textAlign: "center" }} role="status">
        <h1 style={{ color: "#07111F", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 10px" }}>
          {state.kind === "member" ? `You're already a member of ${state.workspaceName}` : "Invitation declined"}
        </h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
          {state.kind === "member" ? "Nothing else to do here." : `You won't join ${state.workspaceName}.`}
        </p>
        <Link to="/app/dashboard" style={primaryLink}>Go to dashboard</Link>
      </div>
    );
  }
  if (state.kind === "invalid") {
    return (
      <div style={{ textAlign: "center" }} role="alert">
        <h1 style={{ color: "#07111F", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 10px" }}>Invitation not valid</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
          This invitation is no longer valid. Ask the workspace owner or an administrator for a new one.
        </p>
        <Link to="/app/dashboard" style={primaryLink}>Go to dashboard</Link>
      </div>
    );
  }

  const invitation = state.invitation;
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <p style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 8px" }}>WORKSPACE INVITATION</p>
        <h1 style={{ color: "#07111F", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 8px", lineHeight: 1.3 }}>
          {invitation ? `Join ${invitation.workspaceName} on LAGDA` : "Workspace invitation"}
        </h1>
        {invitation && (
          <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Sent to <strong style={{ color: "#334155" }}>{invitation.inviteeEmail}</strong> as{" "}
            <strong style={{ color: "#334155" }}>{REAL_ROLE_LABELS[invitation.role as BackendWorkspaceRole] ?? invitation.role}</strong>.
            Accepting sends a request that the owner or an admin approves.
          </p>
        )}
      </div>
      {(state.kind === "error" || state.kind === "mismatch") && (
        <p role="alert" style={{ ...GF, fontSize: 14, color: "#B42318", background: "#FEF3F2", border: "1px solid #FECDCA", borderRadius: 8, padding: "10px 14px", margin: "0 0 16px" }}>
          {state.kind === "mismatch"
            ? "This invitation was sent to a different email address. Sign in with that account to accept it."
            : state.message}
        </p>
      )}
      {invitation && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => void decline(invitation)} disabled={submitting}
            style={{ flex: "1 1 120px", background: "none", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, color: "#64748B", ...GF, fontSize: 14, fontWeight: 600, padding: "12px", cursor: submitting ? "not-allowed" : "pointer", minHeight: 44 }}>
            Decline
          </button>
          <button onClick={() => void accept(invitation)} disabled={submitting} aria-busy={submitting}
            style={{ flex: "2 1 180px", background: submitting ? "rgba(0,120,212,0.5)" : AZURE, border: "none", borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "12px", cursor: submitting ? "not-allowed" : "pointer", minHeight: 44 }}>
            {submitting ? "Processing…" : signedIn ? "Accept invitation" : "Sign in to accept"}
          </button>
        </div>
      )}
      {state.kind === "mismatch" && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <Link to={signInUrl} style={{ color: "#64748B", ...GF, fontSize: 12, textDecoration: "underline", padding: 8, display: "inline-block", minHeight: 44, lineHeight: "28px" }}>
            Sign in with a different account
          </Link>
        </div>
      )}
    </>
  );
}

// ── Demo: /accept-invitation?inv=… ─────────────────────────────────────────────

function DemoAcceptInvitation() {
  const [params]    = useSearchParams();
  const invParam    = params.get("inv") ?? "valid";
  const platform    = usePlatform();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invitation,setInvitation]= useState<MockInvitation | null>(null);
  const [submitting,setSubmitting]= useState(false);

  useEffect(() => {
    let cancelled = false;
    void mockAuthService.getInvitation(invParam).then((inv) => {
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
    // 078: accepting never adds anyone straight away. It files a request the
    // owner or an administrator approves. The demo shows that same outcome
    // and, unlike before, installs no fixture session: nothing was joined.
    if (USE_REAL_BACKEND) await platform.refreshSessionFromBackend();
    setPageState("pending");
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
        <p style={{ color: "#334155", ...GF, fontSize: 13 }}>Loading invitation…</p>
        <style>{`@keyframes ai-spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="ai-spin"] { animation: none; } }`}</style>
      </div>
    );
  }

  // ── Declined ───────────────────────────────────────────────────────────────

  if (pageState === "declined") {
    return (
      <div style={{ textAlign: "center" }} role="status">
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f8fafb", border: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 20 }} aria-hidden>✕</div>
        <h1 style={{ color: "#07111F", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 10px" }}>Invitation declined</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>
          You have declined the invitation to join <strong style={{ color: "#334155" }}>{invitation?.workspaceName}</strong> in this frontend demonstration.
        </p>
        <Link to="/sign-in" style={{ display: "block", background: AZURE, borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", textDecoration: "none", minHeight: 48, lineHeight: "20px" }}>Return to Sign In</Link>
      </div>
    );
  }

  // ── Request sent (pending approval) ───────────────────────────────────────

  if (pageState === "pending") return <PendingApproval workspaceName={invitation?.workspaceName} />;

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
        <h1 style={{ color: "#07111F", ...GF, fontSize: 20, fontWeight: 900, margin: "14px 0 10px" }}>{copy.title}</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>{copy.body}</p>
        {needsNewInvite && (
          <p style={{ color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.6, margin: "0 0 18px" }}>
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
        <p style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 8px" }}>
          WORKSPACE INVITATION
        </p>
        <h1 style={{ color: "#07111F", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 8px", lineHeight: 1.3 }}>
          Join {invitation.workspaceName} on LAGDA
        </h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: "#334155" }}>{invitation.invitedBy}</strong> invited you as{" "}
          <strong style={{ color: "#334155" }}>{invitation.role}</strong>. This is an invitation to join
          a team — you are not being asked to sign a document.
        </p>
      </div>

      {/* Invitation card */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: "24px", marginBottom: 24, boxShadow: "0 1px 4px rgba(7,17,31,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h2 style={{ color: "#07111F", ...GF, fontSize: 17, fontWeight: 800, margin: 0 }}>{invitation.workspaceName}</h2>
          <StatusBadge status={invitation.status} />
        </div>

        {[
          { label: "Invited by",   value: invitation.invitedBy },
          { label: "Your role",    value: invitation.role },
          { label: "Invited email", value: invitation.invitedEmail },
          { label: "Expires",      value: invitation.expiresAt },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <span style={{ color: "#334155", ...GF, fontSize: 13 }}>{label}</span>
            <span style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handleDecline}
          disabled={submitting}
          style={{ flex: 1, background: "none", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, color: "#64748B", ...GF, fontSize: 14, fontWeight: 600, padding: "12px", cursor: submitting ? "not-allowed" : "pointer", minHeight: 44 }}
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
      <p style={{ color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.6, textAlign: "center", margin: "14px 0 0" }}>
        Accepting sends a request to join {invitation.workspaceName}. The owner or an admin
        approves it before you have access.
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
        <p style={{ color: "#334155", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          Test states: add <strong style={{ color: "#07111F" }}>?inv=expired</strong>,{" "}
          <strong style={{ color: "#07111F" }}>?inv=revoked</strong>, or{" "}
          <strong style={{ color: "#07111F" }}>?inv=mismatch</strong> to the URL.
        </p>
      </div>
    </>
  );
}
