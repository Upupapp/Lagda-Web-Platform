// /app/settings/security — Account security overview.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { SettingsPage, SCard, SSection, StatusBadge, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockSecuritySettingsService } from "../../../services/mock/settings.service";
import type { SecurityOverview } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const GREEN = "#16A34A";
const AMBER = "#D97706";

function statusBadgeColor(status: string): string {
  if (status === "enabled" || status === "demonstration-enabled") return GREEN;
  if (status === "not-enabled") return AMBER;
  return SLATE;
}

function statusLabel(status: string): string {
  if (status === "enabled")               return "Enabled";
  if (status === "demonstration-enabled") return "Enabled (Demo)";
  if (status === "not-enabled")           return "Not Enabled";
  return "Not Available";
}

function MethodRow({ method, onAction }: { method: { id: string; label: string; status: string; description: string }; onAction: (id: string) => void }) {
  const color = statusBadgeColor(method.status);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #F0F2F5", gap: 12, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>{method.label}</div>
        <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 2 }}>{method.description}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <StatusBadge label={statusLabel(method.status)} color={color} />
        {method.status !== "not-available" && (
          <button onClick={() => onAction(method.id)} style={{ ...GF, fontSize: 12, fontWeight: 600, padding: "5px 12px", border: `1.5px solid ${AZURE}`, borderRadius: 6, background: "#FFFFFF", color: AZURE, cursor: "pointer" }}>
            {method.status.includes("enabled") ? "Manage →" : "Set up →"}
          </button>
        )}
      </div>
    </div>
  );
}

export function SecurityOverviewPage() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    mockSecuritySettingsService.getSecurityOverview().then(o => { setOverview(o); setLoading(false); });
  }, []);

  const navigate = useNavigate();
  const handleAction = (id: string) => {
    if (id === "password") navigate("/app/settings/security/password");
    else                   navigate("/app/settings/security/mfa");
  };

  if (loading) return <SettingsPage title="Account Security" breadcrumb="Security"><Skeleton h={160} mb={16} /><Skeleton h={120} /></SettingsPage>;

  return (
    <SettingsPage title="Account Security" breadcrumb="Security">
      {DEMO_NOTICE}

      {/* Status summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Password", value: overview?.passwordConfigured ? "Configured" : "Not set", color: overview?.passwordConfigured ? GREEN : AMBER },
          { label: "MFA Status", value: statusLabel(overview?.mfaStatus ?? "not-enabled"), color: statusBadgeColor(overview?.mfaStatus ?? "not-enabled") },
          { label: "Active Sessions", value: String(overview?.activeSessionCount ?? 0), color: NAVY },
          { label: "Recovery", value: overview?.recoveryConfigured ? "Configured" : "Not configured", color: overview?.recoveryConfigured ? GREEN : AMBER },
        ].map(s => (
          <div key={s.label} style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ ...GF, fontSize: 11, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ ...GF, fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Attention */}
      {overview?.mfaStatus === "not-enabled" && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ ...GF, fontSize: 13, color: "#92400E" }}>⚠ Multi-factor authentication is not enabled. Consider enabling it for additional account security.</span>
          <Link to="/app/settings/security/mfa" style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none", whiteSpace: "nowrap" }}>Set up MFA →</Link>
        </div>
      )}

      {/* Authentication methods */}
      <SSection title="Authentication Methods">
        {overview?.methods.map(m => (
          <MethodRow key={m.id} method={m} onAction={handleAction} />
        ))}
      </SSection>

      {/* Sessions */}
      <SCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Active Sessions</h2>
          <Link to="/app/settings/security/sessions" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none", fontWeight: 600 }}>View all →</Link>
        </div>
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>
          {overview?.activeSessionCount ?? 0} active session{(overview?.activeSessionCount ?? 0) !== 1 ? "s" : ""} — fictional demonstration data.
        </p>
      </SCard>

      {/* Recovery */}
      <SCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Recovery</h2>
          <Link to="/app/settings/security/mfa" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none", fontWeight: 600 }}>Review →</Link>
        </div>
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>
          Recovery codes and alternative contact direction. Production recovery requires backend identity safeguards.
        </p>
      </SCard>

      {/* Recent activity */}
      <SCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Recent Security Activity</h2>
          <Link to="/app/settings/security/activity" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none", fontWeight: 600 }}>View all →</Link>
        </div>
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>
          Sign-in history and account security events. All data is fictional frontend demonstration data.
        </p>
      </SCard>

      {/* Notice */}
      <div style={{ background: "#EBF5FB", border: "1px solid #BAE0FD", borderRadius: 8, padding: "12px 16px", ...GF, fontSize: 12, color: "#0369A1" }}>
        These settings are a frontend demonstration. They do not enforce production security controls. Real account security requires backend authentication, identity verification, and access management services.
      </div>
    </SettingsPage>
  );
}
