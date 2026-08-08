import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { CONTACT_INFO } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function ContactListMockup() {
  const contacts = [
    { name: "Ana Reyes",    org: "Mabini Legal Solutions", role: "Senior Associate",  avatar: "AR", tag: "Legal" },
    { name: "Marco Santos", org: "Santos & Cruz Law",      role: "Managing Partner",  avatar: "MS", tag: "Client" },
    { name: "Lea Cruz",     org: "Cruz Ventures Inc.",     role: "CFO",               avatar: "LC", tag: "Finance" },
    { name: "Pedro Lim",    org: "Lim & Associates",       role: "Corporate Counsel", avatar: "PL", tag: "Legal" },
  ];
  return (
    <div aria-hidden style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden", maxWidth: 440, width: "100%" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>Contacts</span>
        <span style={{ background: "rgba(255,255,255,0.05)", ...GM, fontSize: 10, color: "#475569", padding: "2px 8px", borderRadius: 6 }}>Search contacts…</span>
      </div>
      {contacts.map((c) => (
        <div key={c.name} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,120,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 10, fontWeight: 700, color: "#38bdf8", flexShrink: 0 }}>{c.avatar}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{c.name}</p>
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.role} · {c.org}</p>
          </div>
          <span style={{ background: "rgba(0,120,212,0.1)", color: "#38bdf8", border: "1px solid rgba(0,120,212,0.2)", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, flexShrink: 0 }}>{c.tag}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,120,212,0.06)" }}>
        <span style={{ color: "#0078D4", ...GF, fontSize: 12, fontWeight: 700 }}>+ Add contact</span>
      </div>
    </div>
  );
}

export function Contacts() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Contacts"
        headingId="con-h1"
        heading="Save recurring participants so every new transaction starts faster."
        sub="Contacts are designed to support recurring document participants and transaction preparation — not as a general-purpose CRM. Save the people you work with most, and add them to any transaction in seconds."
      />

      <PageSection id="contact-list" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="con-two-col">
          <div>
            <SectionHeading eyebrow="Contact information" id="ci-h2" heading="Store what you need for each transaction." sub="A saved contact can include the information used to add them to a signing transaction — name, email, mobile, and preferred authentication method." />
            <div style={{ display: "grid", gap: 6 }} className="con-info-grid">
              {CONTACT_INFO.map((f) => (
                <div key={f} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                  <span style={{ color: "#0078D4", flexShrink: 0, fontSize: 12 }}>·</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.45 }}>{f}</span>
                </div>
              ))}
            </div>
            <style>{`.con-info-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 480px) { .con-info-grid { grid-template-columns: 1fr; } }`}</style>
          </div>
          <ContactListMockup />
        </div>
        <style>{`.con-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .con-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="actions">
        <SectionHeading eyebrow="Contact actions" id="ca-h2" heading="Manage your contact list." center />
        <div style={{ display: "grid", gap: 10 }} className="ca-grid">
          {[
            { action: "Add from transaction", desc: "After sending a transaction, save the recipient as a contact automatically." },
            { action: "Search and filter",    desc: "Find contacts by name, organization, tag, or last transaction date." },
            { action: "Edit details",          desc: "Update contact information as roles or organizations change." },
            { action: "Tag and organize",      desc: "Group contacts by client, department, or document type." },
            { action: "Archive",               desc: "Remove contacts from active view without deleting their transaction history." },
            { action: "Duplicate detection",   desc: "Identify possible duplicate contacts before adding them." },
          ].map((a) => (
            <div key={a.action} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 12px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{a.action}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{a.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ca-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .ca-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="crm-note" light bordered>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>CONTACTS ARE NOT A CRM</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            Contacts are designed to support recurring document participants and transaction preparation. LAGDA is not a customer relationship management platform. Contact data is used for signing workflow purposes only.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Templates",         desc: "Reuse contacts across saved workflow templates", path: "/features/templates" },
        { label: "Team Workspaces",   desc: "Share contacts across workspace members", path: "/features/team-workspaces" },
        { label: "Notifications",     desc: "Stay informed about participant actions", path: "/features/notifications" },
      ]} />

      <PageCTA
        heading="Explore Team Workspaces."
        sub="Share contacts and templates across your team — with role-based access control."
        primaryLabel="Team Workspaces"
        primaryPath="/features/team-workspaces"
        secondaryLabel="Create Free Account"
        secondaryPath="/create-account"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
