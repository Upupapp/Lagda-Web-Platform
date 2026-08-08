// /app/settings/security/sessions — Fictional active session review.
// No full IP addresses, exact locations, session tokens, or device fingerprints.
// All revocations are frontend demonstrations only.

import React, { useEffect, useState } from "react";
import { SettingsPage, SSection, StatusBadge, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockSecuritySettingsService } from "../../../services/mock/settings.service";
import { useConfirm } from "../../../components/platform/ConfirmDialog";
import type { ActiveSession, ActiveSessionId } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const RED   = "#DC2626";

const DEVICE_ICON: Record<string, string> = {
  desktop: "🖥",
  mobile:  "📱",
  tablet:  "⬜",
};

function sessionStatusColor(status: string): string {
  if (status === "active") return GREEN;
  if (status === "expired") return AMBER;
  return RED;
}

function sessionStatusLabel(status: string): string {
  if (status === "active") return "Active";
  if (status === "expired") return "Expired";
  return "Revoked (Demo)";
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading]   = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    mockSecuritySettingsService.listActiveSessions().then(s => { setSessions(s); setLoading(false); });
  }, []);

  const active = sessions.filter(s => s.status === "active" && !s.isCurrent);

  const revokeOne = async (id: ActiveSessionId) => {
    setRevoking(id);
    await mockSecuritySettingsService.revokeSessionDemonstration(id);
    const updated = await mockSecuritySettingsService.listActiveSessions();
    setSessions(updated);
    setRevoking(null);
    setFeedback("Session revocation simulated. No production session was invalidated.");
    setTimeout(() => setFeedback(null), 4000);
  };

  const revokeOthers = () => {
    confirm({
      title: "Revoke all other sessions?",
      body: `This signs out ${active.length === 1 ? "the other device" : `all ${active.length} other devices`} currently signed in to your account. This device stays signed in. In this frontend demonstration no production session is invalidated.`,
      confirmLabel: "Revoke other sessions",
      destructive: true,
      onConfirm: performRevokeOthers,
    });
  };

  const performRevokeOthers = async () => {
    setRevoking("all");
    const result = await mockSecuritySettingsService.revokeOtherSessionsDemonstration();
    const updated = await mockSecuritySettingsService.listActiveSessions();
    setSessions(updated);
    setRevoking(null);
    setFeedback(`${result.count} session${result.count !== 1 ? "s" : ""} revoked (demonstration). No production sessions were invalidated.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  if (loading) return <SettingsPage title="Active Sessions" breadcrumb="Security › Active Sessions"><Skeleton h={80} mb={10} /><Skeleton h={80} mb={10} /><Skeleton h={80} /></SettingsPage>;

  return (
    <SettingsPage title="Active Sessions" breadcrumb="Security › Active Sessions">
      {confirmDialog}
      {DEMO_NOTICE}

      {feedback && (
        <div role="status" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginBottom: 16, ...GF, fontSize: 13, color: "#166534" }}>
          {feedback}
        </div>
      )}

      <SSection title={`Sessions (${sessions.length})`}>
        {sessions.length === 0 ? (
          <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>No sessions found.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {sessions.map(s => (
              <li key={s.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #F0F2F5", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span aria-hidden style={{ fontSize: 22, marginTop: 2 }}>{DEVICE_ICON[s.deviceType] ?? "🖥"}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{s.deviceLabel}</span>
                      {s.isCurrent && <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: AZURE, background: "#EBF5FB", padding: "1px 7px", borderRadius: 999 }}>Current session</span>}
                      <StatusBadge label={sessionStatusLabel(s.status)} color={sessionStatusColor(s.status)} />
                    </div>
                    <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 3 }}>
                      {s.browser} · {s.region}
                    </div>
                    <div style={{ ...{ fontFamily: "'Geist Mono', monospace" }, fontSize: 11, color: SILVER, marginTop: 3 }}>
                      Last active: {new Date(s.lastActive).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
                {!s.isCurrent && s.status === "active" && (
                  <button
                    onClick={() => revokeOne(s.id)}
                    disabled={!!revoking}
                    aria-label={`Revoke session: ${s.deviceLabel}`}
                    style={{ ...GF, fontSize: 12, fontWeight: 600, padding: "6px 12px", border: "1.5px solid #FECACA", borderRadius: 6, background: "#FEF2F2", color: "#991B1B", cursor: revoking ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: revoking ? 0.6 : 1 }}>
                    {revoking === s.id ? "Revoking…" : "Revoke (Demo)"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SSection>

      {active.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button onClick={revokeOthers} disabled={!!revoking} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "1.5px solid #FECACA", borderRadius: 8, background: "#FEF2F2", color: "#991B1B", cursor: revoking ? "not-allowed" : "pointer", opacity: revoking ? 0.6 : 1 }}>
            Revoke all other sessions (Demonstration)
          </button>
        </div>
      )}

      <div style={{ marginTop: 18, background: "#F8FAFC", border: "1px solid #E3E8EF", borderRadius: 8, padding: "12px 16px", ...GF, fontSize: 12, color: SLATE }}>
        <strong>Demonstration data:</strong> Sessions shown are fictional. Approximate region is shown without specific location, IP address, session tokens, or device fingerprints. Session revocation does not invalidate any real session or authentication credential.
      </div>
    </SettingsPage>
  );
}
