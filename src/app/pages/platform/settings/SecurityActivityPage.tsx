// /app/settings/security/activity — Fictional sign-in and security activity.
// No full IP addresses, exact locations, or device fingerprints.
// Data is clearly labeled as fictional frontend demonstration data.

import React, { useEffect, useState } from "react";
import { SettingsPage, SSection, Skeleton } from "./SettingsShell";
import { mockSecuritySettingsService } from "../../../services/mock/settings.service";
import type { SignInActivity, SignInActivityType } from "../../../models/settings";
import { SIGN_IN_ACTIVITY_LABELS } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const RED   = "#DC2626";

function statusColor(s: string) {
  if (s === "success")   return GREEN;
  if (s === "failed")    return RED;
  return AMBER;
}

function typeIcon(t: SignInActivityType): string {
  if (t === "sign-in-success")               return "✓";
  if (t === "sign-in-failed")                return "✕";
  if (t === "password-update-demonstration") return "🔑";
  if (t === "mfa-update-demonstration")      return "🔐";
  if (t === "session-revoke-demonstration")  return "⊗";
  return "·";
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all",                            label: "All events" },
  { value: "sign-in-success",                label: "Successful sign-ins" },
  { value: "sign-in-failed",                 label: "Failed attempts" },
  { value: "password-update-demonstration",  label: "Password updates" },
  { value: "mfa-update-demonstration",       label: "MFA events" },
  { value: "session-revoke-demonstration",   label: "Session events" },
];

export function SecurityActivityPage() {
  const [activity, setActivity] = useState<SignInActivity[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<string>("all");

  useEffect(() => {
    mockSecuritySettingsService.listSignInActivity().then(a => { setActivity(a); setLoading(false); });
  }, []);

  const onFilterChange = async (value: string) => {
    setFilter(value);
    setLoading(true);
    const args = value !== "all" ? { type: value as SignInActivityType } : undefined;
    const data = await mockSecuritySettingsService.listSignInActivity(args);
    setActivity(data);
    setLoading(false);
  };

  return (
    <SettingsPage title="Security Activity" breadcrumb="Security › Security Activity">
      <div role="note" style={{ background: "#F8FAFC", border: "1px solid #E3E8EF", borderRadius: 8, padding: "10px 16px", marginBottom: 16, ...GF, fontSize: 12, color: SLATE }}>
        All activity shown is fictional frontend demonstration data. This does not represent real sign-in history or audit logging. Full IP addresses, exact locations, and device fingerprints are never shown.
      </div>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="activity-filter" style={{ ...GF, fontSize: 12, fontWeight: 600, color: SLATE, marginRight: 8 }}>Filter:</label>
        <select id="activity-filter" value={filter} onChange={e => onFilterChange(e.target.value)}
          style={{ ...GF, fontSize: 13, padding: "7px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer" }}>
          {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <SSection title={`Activity (${activity.length} event${activity.length !== 1 ? "s" : ""})`}>
        {loading ? (
          <><Skeleton h={56} mb={8} /><Skeleton h={56} mb={8} /><Skeleton h={56} /></>
        ) : activity.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", ...GF, fontSize: 14, color: SLATE }}>No events match the selected filter.</div>
        ) : (
          <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {activity.map(a => (
              <li key={a.id} role="listitem" style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 0", borderBottom: "1px solid #F0F2F5" }}>
                <span aria-hidden style={{ fontSize: 18, color: statusColor(a.status), flexShrink: 0, marginTop: 2, width: 22, textAlign: "center" }}>
                  {typeIcon(a.type)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>
                      {SIGN_IN_ACTIVITY_LABELS[a.type] ?? a.type}
                    </span>
                    <span style={{ ...GF, fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: `${statusColor(a.status)}22`, color: statusColor(a.status) }}>
                      {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                    </span>
                    {a.status === "simulated" && (
                      <span style={{ ...GF, fontSize: 11, color: SILVER, fontStyle: "italic" }}>Demonstration</span>
                    )}
                  </div>
                  <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 3 }}>{a.deviceLabel} · {a.region}</div>
                  <time dateTime={a.occurredAt} style={{ ...{ fontFamily: "'Geist Mono', monospace" }, fontSize: 11, color: SILVER }}>
                    {new Date(a.occurredAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SSection>
    </SettingsPage>
  );
}
