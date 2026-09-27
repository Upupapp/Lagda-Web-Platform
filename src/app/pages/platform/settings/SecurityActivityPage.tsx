// /app/settings/security/activity — sign-in history.
//
// LAGDA does not record sign-in history yet, so this page says exactly that
// rather than showing sample events that could be mistaken for real ones.
// It points to what IS available: the live session list, and the password
// change that signs every other session out.

import { Link } from "react-router";
import { History, Monitor, KeyRound } from "lucide-react";
import { SettingsPage, SCard, BTN_SECONDARY, SET } from "./SettingsShell";

const GF = { fontFamily: SET.FONT };

export function SecurityActivityPage() {
  return (
    <SettingsPage title="Security activity" breadcrumb="Security › Activity" description="A record of sign-ins and security changes to your account.">
      <SCard>
        <div data-testid="security-activity-empty" style={{ textAlign: "center", padding: "28px 8px 20px" }}>
          <span aria-hidden style={{ width: 52, height: 52, borderRadius: 14, background: "#F1F5F9", border: `1px solid ${SET.BORDER}`, color: SET.SLATE, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <History size={24} />
          </span>
          <h3 style={{ ...GF, fontSize: 16, fontWeight: 700, color: SET.NAVY, margin: "14px 0 6px" }}>Sign-in history isn’t recorded yet</h3>
          <p style={{ ...GF, fontSize: 13.5, color: SET.SLATE, margin: "0 auto", maxWidth: "52ch", lineHeight: 1.6 }}>
            When it is, your sign-ins and security changes will be listed here. Until then, you can see every browser signed in to your account, and sign out any you do not recognise.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
            <Link to="/app/settings/security/sessions" style={BTN_SECONDARY}><Monitor size={15} aria-hidden /> View sessions</Link>
            <Link to="/app/settings/security/password" style={BTN_SECONDARY}><KeyRound size={15} aria-hidden /> Change password</Link>
          </div>
        </div>
      </SCard>
    </SettingsPage>
  );
}
