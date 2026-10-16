import { useState } from "react";
import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { AccountPageCTA } from "../../../components/shell/AccountPageCTA";
import { NOTIFICATION_EVENTS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function NotificationCenter() {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const visible = NOTIFICATION_EVENTS.filter((_, i) => !dismissed.includes(i));
  return (
    <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden", maxWidth: 400, width: "100%", boxShadow: "0 4px 16px rgba(7,17,31,0.08)" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 700 }}>Notifications</span>
        {dismissed.length < NOTIFICATION_EVENTS.length && (
          <button
            onClick={() => setDismissed(NOTIFICATION_EVENTS.map((_, i) => i))}
            style={{ background: "none", border: "none", color: "#64748B", ...GF, fontSize: 11, cursor: "pointer", padding: 0 }}
          >
            Clear all
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <p style={{ color: "#94A3B8", ...GM, fontSize: 11, margin: 0 }}>No new notifications</p>
        </div>
      ) : visible.map((n, idx) => {
        const originalIdx = NOTIFICATION_EVENTS.indexOf(n);
        return (
          <div key={idx} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <p style={{ color: "#07111F", ...GF, fontSize: 12, fontWeight: 600, margin: 0, flex: 1 }}>{n.title}</p>
                {n.action && <span style={{ background: "rgba(239,68,68,0.12)", color: "#DC2626", ...GM, fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 999, flexShrink: 0 }}>ACTION</span>}
              </div>
              <p style={{ color: "#64748B", ...GF, fontSize: 11, margin: "2px 0 0", lineHeight: 1.4 }}>{n.desc}</p>
              <p style={{ color: "#94A3B8", ...GM, fontSize: 9, margin: "3px 0 0" }}>{n.time}</p>
            </div>
            <button
              onClick={() => setDismissed((prev) => [...prev, originalIdx])}
              aria-label={`Dismiss ${n.title}`}
              style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: 0, fontSize: 12, flexShrink: 0, marginTop: 1 }}
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
        sub="LAGDA emails you when a document you sent is completed or declined, reminds participants who have not acted, and tells everyone on a document when it is cancelled, declined or expires."
      />

      <PageSection id="center" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="notif-two-col">
          <div>
            <SectionHeading eyebrow="Event types" id="et-h2" heading="Dismiss events from the interactive example." sub="The notification center surfaces the events that require attention. Action-required events are labeled so they stand out." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              {[
                { label: "Signing invitation",    icon: "📧", when: "Emailed to each participant when their turn comes" },
                { label: "Waiting for your signature", icon: "✍️", when: "In-app, when a document is sent to your account's address" },
                { label: "Reminder",              icon: "⏰", when: "Emailed to a participant who has not acted, on the sender's schedule" },
                { label: "Signing link ended",    icon: "🔗", when: "In-app, to the sender, when a participant's link lapses unsigned" },
                { label: "Participant declined",  icon: "❌", when: "Emailed and in-app to the sender; emailed to the other participants" },
                { label: "Cancelled or expired",  icon: "⏹️", when: "Emailed to participants; an expiry is emailed to the sender too" },
                { label: "Could not finalize",    icon: "⚠️", when: "Emailed and in-app to the sender, with Try again" },
                { label: "Document completed",    icon: "✅", when: "Emailed to the sender when all required participants have acted" },
                { label: "Completed document",    icon: "📄", when: "Emailed to participants, unless the sender switches it off" },
              ].map((e) => (
                <div key={e.label} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{e.icon}</span>
                  <div>
                    <p style={{ color: "#07111F", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{e.label}</p>
                    <p style={{ color: "#64748B", ...GM, fontSize: 10, margin: 0 }}>{e.when}</p>
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
            { icon: "📧", channel: "Email",  desc: "Invitations, reminders, completion, decline, cancellation and expiry notices, and each participant's completed document are sent by email." },
            { icon: "📱", channel: "In-app", desc: "Notices appear in the LAGDA notification center when you are signed in. A participant whose email address belongs to a LAGDA account sees theirs there too." },
          ].map((c) => (
            <div key={c.channel} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "16px 14px", boxShadow: "0 1px 4px rgba(7,17,31,0.07)" }}>
              <span aria-hidden style={{ fontSize: 22, display: "block", marginBottom: 8 }}>{c.icon}</span>
              <p style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{c.channel}</p>
              <p style={{ color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ch-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 680px) { .ch-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="following-up" light bordered>
        <SectionHeading eyebrow="Automatic reminders" id="ar-h2" heading="Pending participants are reminded, on a schedule you control." center />
        <div style={{ display: "grid", gap: 10 }} className="ar-grid">
          {[
            { title: "On by default",           desc: "A participant who has not acted is reminded by email 3 days after it became their turn, then every 3 days, up to 3 reminders." },
            { title: "Your schedule",           desc: "Switch reminders off for one document, or choose the days (1 to 30), when you prepare it or while it is out for signature." },
            { title: "Send a reminder now",     desc: "Remind one participant yourself from the document's Participants, at most once an hour." },
            { title: "When reminders stop",     desc: "When the participant acts, or the document is completed, declined, cancelled or expires. A participant whose link has ended needs a new link instead." },
            { title: "No delivery-failure notice", desc: "LAGDA does not tell the sender when an invitation email could not be delivered; reminders stop for that address. Check the address if a participant says nothing arrived." },
          ].map((r) => (
            <div key={r.title} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "12px 14px", boxShadow: "0 1px 4px rgba(7,17,31,0.06)" }}>
              <p style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.title}</p>
              <p style={{ color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ar-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 560px) { .ar-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Audit Trail",       desc: "Full timeline of all transaction events", path: "/features/audit-trail" },
        { label: "Templates",         desc: "Reuse a signing workflow", path: "/features/templates" },
        { label: "Team Workspaces",   desc: "Workspace-level notification visibility", path: "/features/team-workspaces" },
      ]} />

      <AccountPageCTA
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
