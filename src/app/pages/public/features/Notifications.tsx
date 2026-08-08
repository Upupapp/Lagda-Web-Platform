import { useState } from "react";
import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { NOTIFICATION_EVENTS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function NotificationCenter() {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const visible = NOTIFICATION_EVENTS.filter((_, i) => !dismissed.includes(i));
  return (
    <div style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden", maxWidth: 400, width: "100%" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>Notifications</span>
        {dismissed.length < NOTIFICATION_EVENTS.length && (
          <button
            onClick={() => setDismissed(NOTIFICATION_EVENTS.map((_, i) => i))}
            style={{ background: "none", border: "none", color: "#475569", ...GF, fontSize: 11, cursor: "pointer", padding: 0 }}
          >
            Clear all
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <p style={{ color: "#334155", ...GM, fontSize: 11, margin: 0 }}>No new notifications</p>
        </div>
      ) : visible.map((n, idx) => {
        const originalIdx = NOTIFICATION_EVENTS.indexOf(n);
        return (
          <div key={idx} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0, flex: 1 }}>{n.title}</p>
                {n.action && <span style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", ...GM, fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 999, flexShrink: 0 }}>ACTION</span>}
              </div>
              <p style={{ color: "#64748b", ...GF, fontSize: 11, margin: "2px 0 0", lineHeight: 1.4 }}>{n.desc}</p>
              <p style={{ color: "#334155", ...GM, fontSize: 9, margin: "3px 0 0" }}>{n.time}</p>
            </div>
            <button
              onClick={() => setDismissed((prev) => [...prev, originalIdx])}
              aria-label={`Dismiss ${n.title}`}
              style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", padding: 0, fontSize: 12, flexShrink: 0, marginTop: 1 }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function Notifications() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Notifications"
        headingId="notif-h1"
        heading="Know what's happening with every transaction — without checking manually."
        sub="LAGDA sends notifications for the events that matter most: when a document is signed, viewed, declined, expiring, or completed. Senders and workspace members can control which channels they use."
      />

      <PageSection id="center" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="notif-two-col">
          <div>
            <SectionHeading eyebrow="Event types" id="et-h2" heading="Dismiss events from the interactive example." sub="The notification center surfaces the events that require attention. Action-required events are labeled so they stand out." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              {[
                { label: "Signature completed",   icon: "✍️", when: "When any participant signs" },
                { label: "Document viewed",       icon: "👁️", when: "When a participant opens the document" },
                { label: "Request expiring",      icon: "⚠️", when: "Before a transaction deadline passes" },
                { label: "Participant declined",  icon: "❌", when: "When any participant declines to sign" },
                { label: "Delivery failed",       icon: "📬", when: "When an invitation cannot be delivered" },
                { label: "Transaction completed", icon: "✅", when: "When all required participants have acted" },
              ].map((e) => (
                <div key={e.label} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{e.icon}</span>
                  <div>
                    <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{e.label}</p>
                    <p style={{ color: "#475569", ...GM, fontSize: 10, margin: 0 }}>{e.when}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <NotificationCenter />
        </div>
        <style>{`.notif-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .notif-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="channels">
        <SectionHeading eyebrow="Channels" id="ch-h2" heading="How LAGDA delivers notifications." center />
        <div style={{ display: "grid", gap: 10 }} className="ch-grid">
          {[
            { icon: "📧", channel: "Email",                   desc: "Notification emails sent to the sender's verified email address. Includes transaction summary and direct link." },
            { icon: "📱", channel: "In-app",                  desc: "Notifications appear in the LAGDA notification center when the sender or team member is signed in." },
            { icon: "🔔", channel: "Digest (where available)", desc: "Daily or periodic summaries instead of individual notifications. Availability may vary by plan." },
          ].map((c) => (
            <div key={c.channel} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 14px" }}>
              <span aria-hidden style={{ fontSize: 22, display: "block", marginBottom: 8 }}>{c.icon}</span>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{c.channel}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ch-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 680px) { .ch-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="reminders" light bordered>
        <SectionHeading eyebrow="Automatic reminders" id="ar-h2" heading="Pending signers are reminded so you don't have to follow up manually." center />
        <div style={{ display: "grid", gap: 10 }} className="ar-grid">
          {[
            { title: "Automatic reminders",    desc: "LAGDA can send reminder notifications to participants who have not yet completed their action." },
            { title: "Configurable schedule",  desc: "Reminder timing and frequency is set during transaction preparation or template configuration." },
            { title: "Manual resend",          desc: "Senders can manually trigger a resend from the transaction management view." },
            { title: "Expiry notification",    desc: "As a transaction nears its expiration date, the sender is notified to take action or extend." },
          ].map((r) => (
            <div key={r.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ar-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 560px) { .ar-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Audit Trail",       desc: "Full timeline of all transaction events", path: "/features/audit-trail" },
        { label: "Templates",         desc: "Set reminder schedules in saved templates", path: "/features/templates" },
        { label: "Team Workspaces",   desc: "Workspace-level notification visibility", path: "/features/team-workspaces" },
      ]} />

      <PageCTA
        heading="Review every event with the Audit Trail."
        sub="When you need more than a notification, the full audit trail records every event with timestamps."
        primaryLabel="Audit Trail"
        primaryPath="/features/audit-trail"
        secondaryLabel="Create Free Account"
        secondaryPath="/create-account"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
