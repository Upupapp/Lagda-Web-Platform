// C13 — Accept team invitation page.
// Invitation state driven by ?inv= param (maps to mock fixture key).
// Demo values: valid | expired | revoked | accepted | mismatch.
// Never performs real workspace writes.

import { useState, useEffect } from "react";
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
    platform.signIn(payload.user, payload.workspaces, payload.currentWorkspace, payload.subscription, payload.notifications);
    setPageState("accepted");
    setTimeout(() => navigate("/app/dashboard", { replace: true }), 1500);
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
      <div style={{ textAlign: "center" }}>
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
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 20 }} aria-hidden>✓</div>
        <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 10px" }}>Invitation accepted</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" }}>
          Welcome to <strong style={{ color: "#94A3B8" }}>{invitation?.workspaceName}</strong> (frontend demonstration). Redirecting to your workspace…
        </p>
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

    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 20 }} aria-hidden>⚠</div>
        <StatusBadge status={invitation.status} />
        <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "14px 0 10px" }}>{copy.title}</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>{copy.body}</p>
        <Link to="/sign-in" style={{ display: "block", background: AZURE, borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", textDecoration: "none", minHeight: 48, lineHeight: "20px", marginBottom: 10 }}>Go to Sign In</Link>
        <Link to="/help"    style={{ display: "block", color: "#475569", ...GF, fontSize: 13, textDecoration: "none", padding: "8px" }}>Contact Support</Link>
      </div>
    );
  }

  // ── Valid invitation ───────────────────────────────────────────────────────

  if (!invitation) return null;

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>You have been invited</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
          Accept to join the workspace below.
        </p>
      </div>

      {/* Demo notice */}
      <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
        <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>FRONTEND DEMONSTRATION</p>
        <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          Test states: add <strong style={{ color: "#94A3B8" }}>?inv=expired</strong>,{" "}
          <strong style={{ color: "#94A3B8" }}>?inv=revoked</strong>, or{" "}
          <strong style={{ color: "#94A3B8" }}>?inv=mismatch</strong> to the URL.
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

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link to="/sign-in" style={{ color: "#475569", ...GF, fontSize: 12, textDecoration: "none" }}>Already have an account? Sign In</Link>
      </div>
    </>
  );
}
