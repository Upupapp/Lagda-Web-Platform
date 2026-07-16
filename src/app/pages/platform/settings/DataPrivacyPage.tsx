// /app/settings/data-and-privacy — Data boundaries, export request demo, account closure demo.
// Frontend-only. No archive generated, no data deleted, no account closed.
// Account closure demonstration is blocked for workspace owners.

import React, { useEffect, useState } from "react";
import { SettingsPage, SSection, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockDataPrivacyService } from "../../../services/mock/settings.service";
import type { DataPrivacySettings } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const RED   = "#DC2626";

const DATA_SECTIONS = [
  { title: "Documents and Transactions",       body: "Document records, signing transactions, signer information, and document metadata created in your LAGDA Workspace." },
  { title: "Account Information",              body: "Your name, email address, profile settings, preferences, and authentication records associated with your LAGDA account." },
  { title: "Workspace Membership",             body: "Your membership records, team assignments, and permission grants within LAGDA Workspaces you belong to." },
  { title: "Notification and Communication Logs", body: "Records of notifications delivered to you, email communication audit logs, and communication preferences." },
  { title: "Security and Activity Logs",       body: "Sign-in records, session history, and security-event logs associated with your account." },
];

export function DataPrivacyPage() {
  const [settings, setSettings]     = useState<DataPrivacySettings | null>(null);
  const [loading, setLoading]       = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestResult, setRequestResult] = useState<string | null>(null);
  const [closing, setClosing]       = useState(false);
  const [closeResult, setCloseResult] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmText, setConfirmText]   = useState("");

  useEffect(() => {
    mockDataPrivacyService.getDataPrivacySettings().then(s => { setSettings(s); setLoading(false); });
  }, []);

  const handleExportRequest = async () => {
    setRequesting(true);
    const res = await mockDataPrivacyService.createDataExportRequestDemonstration();
    const updated = await mockDataPrivacyService.getDataPrivacySettings();
    setSettings(updated);
    setRequesting(false);
    setRequestResult(res.message);
    setTimeout(() => setRequestResult(null), 5000);
  };

  const handleCloseRequest = async () => {
    if (confirmText.trim().toLowerCase() !== "close my account") return;
    setClosing(true);
    const res = await mockDataPrivacyService.createAccountClosureRequestDemonstration("user-requested");
    const updated = await mockDataPrivacyService.getDataPrivacySettings();
    setSettings(updated);
    setClosing(false);
    setConfirmClose(false);
    setConfirmText("");
    setCloseResult(res.message);
    setTimeout(() => setCloseResult(null), 6000);
  };

  if (loading) return (
    <SettingsPage title="Data & Privacy" breadcrumb="Data & Privacy">
      <Skeleton h={120} mb={16} /><Skeleton h={160} mb={16} /><Skeleton h={80} />
    </SettingsPage>
  );

  const exportPending  = settings?.exportRequestStatus  === "demonstration-requested" || settings?.exportRequestStatus  === "demonstration-processing";
  const closurePending = settings?.closureRequestStatus === "demonstration-requested";

  return (
    <SettingsPage title="Data & Privacy" breadcrumb="Data & Privacy">
      {DEMO_NOTICE}

      {/* Data you can access */}
      <SSection title="Your Data in LAGDA">
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 14px" }}>
          LAGDA stores and processes the following data categories associated with your account and Workspace activity.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DATA_SECTIONS.map(s => (
            <div key={s.title} style={{ background: "#F8FAFC", border: "1px solid #E3E8EF", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 3 }}>{s.title}</div>
              <div style={{ ...GF, fontSize: 13, color: SLATE }}>{s.body}</div>
            </div>
          ))}
        </div>
      </SSection>

      {/* Data export */}
      <SSection title="Export Your Data">
        <p style={{ ...GF, fontSize: 13, color: SLATE, marginBottom: 14 }}>
          Request a copy of your personal data. Workspace document archives are managed by your Workspace administrator.
        </p>
        {requestResult && (
          <div role="status" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginBottom: 14, ...GF, fontSize: 13, color: "#166534" }}>
            {requestResult}
          </div>
        )}
        {exportPending && !requestResult && (
          <div role="status" style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 14, ...GF, fontSize: 13, color: "#92400E" }}>
            Export request submitted (demonstration). In production, your data would be prepared and delivered to your account email.
          </div>
        )}
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "10px 14px", marginBottom: 14, ...GF, fontSize: 12, color: "#92400E" }}>
          This creates a frontend export-request demonstration only. No archive is generated and no data is delivered.
        </div>
        <button onClick={handleExportRequest} disabled={requesting || exportPending}
          style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: (requesting || exportPending) ? "not-allowed" : "pointer", opacity: (requesting || exportPending) ? 0.7 : 1 }}>
          {requesting ? "Submitting…" : exportPending ? "Request submitted (demo)" : "Request data export (Demonstration)"}
        </button>
      </SSection>

      {/* Account closure */}
      <SSection title="Account Closure">
        <div role="note" style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 8, padding: "12px 16px", marginBottom: 14, ...GF, fontSize: 13, color: "#991B1B" }}>
          <strong>Important:</strong> Account closure is irreversible in production. Workspace Owners must transfer ownership before closing their account. This demonstration does not close your account, delete any data, or affect any Workspace.
        </div>
        {closeResult && (
          <div role="status" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginBottom: 14, ...GF, fontSize: 13, color: "#166534" }}>
            {closeResult}
          </div>
        )}
        {closurePending && !closeResult && (
          <div role="status" style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 14, ...GF, fontSize: 13, color: "#991B1B" }}>
            Closure request submitted (demonstration). This does not close your account.
          </div>
        )}
        {!confirmClose ? (
          <button onClick={() => setConfirmClose(true)} disabled={closurePending}
            style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "1.5px solid #FECACA", borderRadius: 8, background: "#FEF2F2", color: "#991B1B", cursor: closurePending ? "not-allowed" : "pointer", opacity: closurePending ? 0.6 : 1 }}>
            {closurePending ? "Closure requested (demo)" : "Request account closure (Demonstration)"}
          </button>
        ) : (
          <div style={{ border: "1.5px solid #FECACA", borderRadius: 10, padding: 18, background: "#FEF2F2", maxWidth: 440 }}>
            <p style={{ ...GF, fontSize: 13, color: "#991B1B", marginBottom: 12 }}>
              Type <strong>close my account</strong> to confirm this demonstration:
            </p>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder="close my account"
              style={{ ...GF, fontSize: 13, padding: "8px 12px", border: "1.5px solid #FECACA", borderRadius: 8, width: "100%", marginBottom: 12, boxSizing: "border-box" as const, background: "#FFFFFF" }}
              aria-label="Type 'close my account' to confirm" />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleCloseRequest}
                disabled={closing || confirmText.trim().toLowerCase() !== "close my account"}
                style={{ ...GF, fontSize: 13, fontWeight: 700, padding: "9px 18px", border: "none", borderRadius: 8, background: (closing || confirmText.trim().toLowerCase() !== "close my account") ? "#FCA5A5" : RED, color: "#FFFFFF", cursor: (closing || confirmText.trim().toLowerCase() !== "close my account") ? "not-allowed" : "pointer" }}>
                {closing ? "Submitting…" : "Confirm demonstration"}
              </button>
              <button onClick={() => { setConfirmClose(false); setConfirmText(""); }}
                style={{ ...GF, fontSize: 13, padding: "9px 16px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", color: SLATE, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </SSection>

      <div style={{ marginTop: 10, ...GF, fontSize: 12, color: SLATE, fontStyle: "italic" }}>
        For real data requests or account management, contact support via your account email.
      </div>
    </SettingsPage>
  );
}
