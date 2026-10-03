// /app/settings/data-and-privacy — what LAGDA keeps about you, and how to
// ask for a copy or for your account to be deleted.
//
// Only honest actions: neither a download nor a deletion can be done from
// this page yet, so both say so and point to support, which handles them.
// Nothing here pretends to start a request.

import { useEffect, useId, useState } from "react";
import { Link } from "react-router";
import { FileText, UserRound, Users, Mail, ShieldCheck, Download, Trash2, LifeBuoy, ArrowRight, UserSearch } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SettingsPage, SSection, BTN_SECONDARY, SET, Switch } from "./SettingsShell";
import { usePlatform } from "../../../context/PlatformContext";
import { contactConnectionsService, contactConnectionsAvailable } from "../../../services/real/contact-connections.service";

const GF = { fontFamily: SET.FONT };

const DATA_KINDS: { title: string; body: string; icon: LucideIcon }[] = [
  { icon: FileText, title: "Documents and signing requests", body: "The documents you upload, the requests you send, who signed them and the evidence of each signature." },
  { icon: UserRound, title: "Your account", body: "Your name, email address, profile photo, preferences and saved signatures." },
  { icon: Users, title: "Workspace membership", body: "The workspaces you belong to, your role and your organization unit titles." },
  { icon: Mail, title: "Email notifications", body: "Which emails were sent to you, and your notification settings." },
  { icon: ShieldCheck, title: "Security", body: "Your signed-in sessions and your two-step verification setup. Passwords are stored only as secure hashes." },
];

// The public contact form reaches the LAGDA inbox; `topic` and `subject`
// prefill it so the request arrives already labelled.
function supportLink(subject: string): string {
  return `/contact?topic=privacy&subject=${encodeURIComponent(subject)}`;
}

function RequestRow({ icon: Icon, title, body, danger }: { icon: LucideIcon; title: string; body: string; danger?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "14px 0", borderTop: `1px solid ${SET.BORDER}` }}>
      <span aria-hidden style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: danger ? "#FEF2F2" : "#EFF6FD", border: `1px solid ${danger ? "#FECACA" : "#BAD7F5"}`, color: danger ? "#991B1B" : SET.AZURE_TEXT }}>
        <Icon size={18} />
      </span>
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: SET.NAVY }}>{title}</div>
        <div style={{ ...GF, fontSize: 13, color: SET.SLATE, marginTop: 2, lineHeight: 1.5 }}>{body}</div>
      </div>
      <Link to={supportLink(title)} style={{ ...BTN_SECONDARY, minHeight: 36, padding: "6px 14px", fontSize: 13 }}>
        <LifeBuoy size={14} aria-hidden /> Contact support
      </Link>
    </div>
  );
}

/**
 * 091. Whether others can find this account by its exact email in Contacts ›
 * Find people. On by default; turning it off makes every lookup of this
 * address answer "not found", exactly like an address with no account.
 */
function DiscoverySetting() {
  const platform = usePlatform();
  const available = contactConnectionsAvailable(platform.currentWorkspace?.id);
  const [value, setValue] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labelId = useId();
  const descId = useId();
  useEffect(() => {
    if (!available) return;
    contactConnectionsService.getDiscovery()
      .then(r => { setValue(r.discoverableByEmail); })
      .catch(() => { setError("This setting could not be loaded."); });
  }, [available]);
  if (!available) return null;
  const change = (next: boolean) => {
    setBusy(true); setError(null);
    contactConnectionsService.setDiscovery(next)
      .then(r => { setValue(r.discoverableByEmail); })
      .catch(() => { setError("The change could not be saved. Please try again."); })
      .finally(() => { setBusy(false); });
  };
  return (
    <SSection title="Being found" icon={UserSearch}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div id={labelId} style={{ ...GF, fontSize: 14, fontWeight: 700, color: SET.NAVY }}>Let people find me by email</div>
          <div id={descId} style={{ ...GF, fontSize: 13, color: SET.SLATE, marginTop: 3, lineHeight: 1.55 }}>
            Someone who types your exact email in Contacts › Find people can see your name, title and photo, and ask to add you. Turn this off and you can't be found — people can still add you as an external contact.
          </div>
          {error && <div role="alert" style={{ ...GF, fontSize: 12.5, color: SET.DANGER, marginTop: 6 }}>{error}</div>}
        </div>
        <Switch checked={value ?? true} disabled={value === null || busy} busy={busy}
          labelledBy={labelId} describedBy={descId} onChange={change} />
      </div>
    </SSection>
  );
}

export function DataPrivacyPage() {
  return (
    <SettingsPage title="Data & Privacy" breadcrumb="Data & Privacy" description="What LAGDA keeps about you, and how to ask for a copy or for your account to be deleted.">
      <SSection title="Your data in LAGDA" icon={ShieldCheck}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 10 }}>
          {DATA_KINDS.map(k => (
            <li key={k.title} style={{ display: "flex", gap: 10, alignItems: "flex-start", border: `1px solid ${SET.BORDER}`, borderRadius: 10, padding: "12px 14px", background: "#FBFCFE" }}>
              <k.icon size={17} aria-hidden color={SET.AZURE_TEXT} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ ...GF, fontSize: 13.5, fontWeight: 700, color: SET.NAVY }}>{k.title}</div>
                <div style={{ ...GF, fontSize: 13, color: SET.SLATE, marginTop: 2, lineHeight: 1.5 }}>{k.body}</div>
              </div>
            </li>
          ))}
        </ul>
      </SSection>

      <DiscoverySetting />

      <SSection title="Requests" icon={LifeBuoy} description="These are handled by our support team for now. Send the request from the contact form and we'll reply to your account email.">
        <div style={{ marginTop: -14 }}>
          <RequestRow icon={Download} title="Download my data" body="A copy of your account information and the documents you own." />
          <RequestRow icon={Trash2} title="Delete my account" danger
            body="Closes your account and removes your personal data. A workspace owner must hand ownership to someone else first." />
        </div>
      </SSection>

      <p style={{ ...GF, fontSize: 13, color: SET.SLATE, margin: 0 }}>
        How LAGDA handles personal data is set out in the{" "}
        <Link to="/legal/privacy" style={{ color: SET.AZURE_TEXT, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>Privacy Policy <ArrowRight size={13} aria-hidden /></Link>
      </p>
    </SettingsPage>
  );
}
