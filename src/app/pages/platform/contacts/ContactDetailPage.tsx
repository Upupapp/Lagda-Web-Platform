// /app/contacts/:contactId — Contact detail view.
// Shows full contact info, tags, groups, usage summary, duplicate panel, privacy notice.
// Frontend-only demonstration. No real identity verification claims.
// Burgundy never used. eNotary never referenced.

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactDuplicateCandidate, ContactUsageSummary, Contact, ContactTagId, ContactGroupId } from "../../../models/contacts";
import { CONTACT_STATUS_LABELS, CONTACT_SCOPE_LABELS, CONTACT_SOURCE_LABELS, getContactTagById } from "../../../models/contacts";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";
const PAGE_BG = "#F8FAFC";

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string }> = {
    active:     { bg: "#DCFCE7", color: "#166534" },
    archived:   { bg: "#F1F5F9", color: "#475569" },
    invalid:    { bg: "#FEF3C7", color: "#92400E" },
    // Slate, not the Soft Burgundy Tint this used to be — Burgundy at any
    // strength belongs to eNotary. Kept identical to ContactsPage's badge.
    restricted: { bg: "#E2E8F0", color: "#334155" },
  };
  const c = configs[status] ?? { bg: "#F1F5F9", color: "#475569" };
  return (
    <span style={{ ...GM, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: c.bg, color: c.color }}>
      {CONTACT_STATUS_LABELS[status as ContactStatus] ?? status}
    </span>
  );
}

function TagChip({ tagId }: { tagId: ContactTagId }) {
  const tag = getContactTagById(tagId);
  if (!tag) return null;
  return (
    <span style={{ ...GM, fontSize: 10, padding: "3px 9px", borderRadius: 999, background: `${tag.color}18`, color: tag.color, border: `1px solid ${tag.color}30` }}>
      {tag.label}
    </span>
  );
}

function InitialsAvatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center",
      ...GM, fontSize: size * 0.3, fontWeight: 700, color: AZURE, flexShrink: 0, userSelect: "none",
    }}>
      {initials}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0F2F5" }}>
        <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</h2>
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
      <dt style={{ ...GF, fontSize: 12, fontWeight: 700, color: SILVER, minWidth: 110, marginTop: 1 }}>{label}</dt>
      <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: 0, flex: 1, wordBreak: "break-word" }}>{value ?? "—"}</dd>
    </div>
  );
}

function DuplicatePanel({ candidates, contactId }: { candidates: ContactDuplicateCandidate[]; contactId: string }) {
  if (!candidates.length) return null;
  return (
    <SectionCard title={`Potential Duplicates (${candidates.length})`}>
      <p style={{ ...GF, fontSize: 12, color: SLATE, marginBottom: 12 }}>
        These contacts share a similar email or name. Review each to determine if they represent the same person.
      </p>
      {candidates.map(c => (
        <div key={c.existingContactId} style={{ border: "1.5px solid #F0F2F5", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <p style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 2px" }}>{c.existingName}</p>
              <p style={{ ...GM, fontSize: 11, color: SLATE, margin: "0 0 6px" }}>{c.existingEmail}</p>
              {c.existingOrg && <p style={{ ...GF, fontSize: 11, color: SILVER, margin: "0 0 4px" }}>{c.existingOrg}</p>}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {c.reasons.map((r, i) => (
                  <span key={i} style={{ ...GM, fontSize: 9, padding: "2px 7px", borderRadius: 999, background: "#FEF3C7", color: "#92400E" }}>{r}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Link to={`/app/contacts/${c.existingContactId}`} style={{ ...GF, fontSize: 12, color: AZURE, border: `1.5px solid ${AZURE}`, borderRadius: 7, padding: "5px 10px", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                View
              </Link>
              <Link to={`/app/contacts/${contactId}/merge?with=${c.existingContactId}`} style={{ ...GF, fontSize: 12, color: SLATE, border: "1.5px solid #D1D9E0", borderRadius: 7, padding: "5px 10px", textDecoration: "none", whiteSpace: "nowrap" }}>
                Preview Merge
              </Link>
            </div>
          </div>
        </div>
      ))}
    </SectionCard>
  );
}

function UsageSummaryCard({ usage }: { usage: ContactUsageSummary }) {
  return (
    <SectionCard title="Usage Summary">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: usage.roleHistory.length ? 16 : 0 }}>
        {[
          { label: "Transactions",  value: usage.totalTransactions },
          { label: "Templates",     value: usage.totalTemplates },
          { label: "Draft Docs",    value: usage.totalDrafts },
        ].map(m => (
          <div key={m.label} style={{ textAlign: "center", background: "#F8FAFC", borderRadius: 8, padding: "12px 8px" }}>
            <p style={{ ...GM, fontSize: 22, fontWeight: 700, color: NAVY, margin: "0 0 2px" }}>{m.value}</p>
            <p style={{ ...GF, fontSize: 11, color: SILVER, margin: 0 }}>{m.label}</p>
          </div>
        ))}
      </div>
      {usage.roleHistory.length > 0 && (
        <div>
          <p style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Role History</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {usage.roleHistory.map((r, i) => (
              <span key={i} style={{ ...GM, fontSize: 10, padding: "3px 9px", borderRadius: 999, background: "#F0F7FF", color: AZURE }}>{r.role}</span>
            ))}
          </div>
          {usage.mostFrequentRole && (
            <p style={{ ...GF, fontSize: 11, color: SLATE, marginTop: 8 }}>
              Most frequent role: <strong>{usage.mostFrequentRole}</strong>
            </p>
          )}
        </div>
      )}
      <p style={{ ...GF, fontSize: 10, color: SILVER, marginTop: 12 }}>
        Usage counts are demonstration values and do not reflect actual document history.
      </p>
    </SectionCard>
  );
}

// ── Inner detail component ────────────────────────────────────────────────────

function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { state, asyncLoadContact, clearActiveContact, asyncArchive, asyncRestore } = useContacts();
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (contactId) void asyncLoadContact(contactId as ContactId);
    return () => clearActiveContact();
  }, [contactId, asyncLoadContact, clearActiveContact]);

  const contact = state.activeContact;
  const usage   = state.activeUsage;
  const dups    = state.activeDuplicates;
  const loading = state.activeLoading;
  const error   = state.activeError;

  const handleArchive = async () => {
    if (!contact) return;
    setArchiving(true);
    await asyncArchive(contact.id);
    setArchiving(false);
  };

  const handleRestore = async () => {
    if (!contact) return;
    await asyncRestore(contact.id);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: PAGE_BG, padding: "32px 24px" }}>
        <div aria-busy="true" aria-label="Loading contact" style={{ maxWidth: 720, margin: "0 auto" }}>
          {[80, 200, 140, 180].map((h, i) => (
            <div key={i} style={{ height: h, background: "#E2E8F0", borderRadius: 12, marginBottom: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div style={{ minHeight: "100vh", background: PAGE_BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", ...GF }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 8 }}>Contact not found</h1>
          <p style={{ fontSize: 13, color: SLATE, marginBottom: 20 }}>{error ?? "This contact may have been archived or doesn't exist."}</p>
          <Link to="/app/contacts" style={{ fontSize: 13, color: AZURE, fontWeight: 600 }}>← Back to Contacts</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, padding: "0 0 48px" }}>
      {/* Page header */}
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 12 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/contacts" style={{ color: AZURE, textDecoration: "none" }}>Contacts</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>{contact.name}</li>
          </ol>
        </nav>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <InitialsAvatar name={contact.name} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>{contact.name}</h1>
              <StatusBadge status={contact.status} />
              <span style={{ ...GM, fontSize: 10, padding: "3px 9px", borderRadius: 999, background: contact.scope === "workspace" ? "#EBF4FC" : "#F8FAFC", color: contact.scope === "workspace" ? AZURE : SLATE }}>
                {CONTACT_SCOPE_LABELS[contact.scope]}
              </span>
            </div>
            <p style={{ ...GM, fontSize: 13, color: SLATE, margin: "0 0 4px" }}>{contact.email}</p>
            {contact.phone && <p style={{ ...GM, fontSize: 12, color: SILVER, margin: 0 }}>{contact.phone}</p>}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            {contact.status === "active" && (
              <Link to={`/app/contacts/${contact.id}/edit`}
                style={{ ...GF, fontSize: 13, color: AZURE, border: `1.5px solid ${AZURE}`, borderRadius: 8, padding: "8px 16px", textDecoration: "none", fontWeight: 600 }}>
                Edit
              </Link>
            )}
            {contact.status !== "archived" ? (
              <button onClick={handleArchive} disabled={archiving}
                style={{ ...GF, fontSize: 13, color: SLATE, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "8px 16px", background: "#FFFFFF", cursor: "pointer" }}>
                {archiving ? "Archiving…" : "Archive"}
              </button>
            ) : (
              <button onClick={handleRestore}
                style={{ ...GF, fontSize: 13, color: "#166534", border: "1.5px solid #BBF7D0", borderRadius: 8, padding: "8px 16px", background: "#F0FDF4", cursor: "pointer" }}>
                Restore
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        {contact.tagIds.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            {contact.tagIds.map(t => <TagChip key={t} tagId={t} />)}
          </div>
        )}
      </header>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "24px auto 0", padding: "0 24px" }}>

        {/* Invalid notice */}
        {contact.status === "invalid" && (
          <div role="alert" style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 10, padding: "12px 16px", marginBottom: 16, ...GF, fontSize: 13, color: "#92400E" }}>
            <strong>⚠️ Invalid contact:</strong> This contact has an email address that could not be validated. Edit it to correct the email before using it in a workflow.
          </div>
        )}

        {/* Potential duplicates panel */}
        {dups && dups.length > 0 && contact.id && (
          <DuplicatePanel candidates={dups} contactId={contact.id} />
        )}

        {/* Contact info */}
        <SectionCard title="Contact Information">
          <dl style={{ margin: 0 }}>
            <InfoRow label="Full Name"    value={contact.name} />
            <InfoRow label="Email"        value={<a href={`mailto:${contact.email}`} style={{ color: AZURE, textDecoration: "none" }}>{contact.email}</a>} />
            <InfoRow label="Phone"        value={contact.phone} />
            <InfoRow label="Organization" value={contact.organization} />
            <InfoRow label="Title / Role" value={contact.title} />
            <InfoRow label="Scope"        value={CONTACT_SCOPE_LABELS[contact.scope]} />
            <InfoRow label="Source"       value={CONTACT_SOURCE_LABELS[contact.source]} />
          </dl>
          {contact.note && (
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", marginTop: 8 }}>
              <p style={{ ...GF, fontSize: 12, fontWeight: 700, color: SILVER, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Note</p>
              <p style={{ ...GF, fontSize: 13, color: NAVY, margin: 0 }}>{contact.note}</p>
            </div>
          )}
        </SectionCard>

        {/* Groups */}
        {contact.groupIds.length > 0 && (
          <SectionCard title="Contact Groups">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {contact.groupIds.map(gid => (
                <Link key={gid} to={`/app/contacts/groups/${gid}`}
                  style={{ ...GF, fontSize: 12, color: AZURE, border: `1.5px solid ${AZURE}`, borderRadius: 8, padding: "5px 12px", textDecoration: "none", background: LIGHT }}>
                  {gid}
                </Link>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Usage summary */}
        {usage && <UsageSummaryCard usage={usage} />}

        {/* Participant separation notice */}
        <SectionCard title="Document Participation">
          <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 8px" }}>
            This contact record stores reusable participant information for document workflows. When this contact is added to a document as a participant, a separate signing record is created for that specific transaction.
          </p>
          <p style={{ ...GF, fontSize: 12, color: SILVER, margin: 0 }}>
            Editing this contact's details does not update historical participant records. Contact records and participant signing records are separate concepts in LAGDA.
          </p>
        </SectionCard>

        {/* Privacy notice */}
        <div style={{ background: "#F8FAFC", border: "1.5px solid #E3E8EF", borderRadius: 10, padding: "14px 18px" }}>
          <p style={{ ...GF, fontSize: 11, color: SLATE, margin: 0 }}>
            <strong>Privacy:</strong> Contact information is not shared with external parties or verified against government identity systems. This record is a demonstration-only fixture and does not represent a real individual.
          </p>
        </div>

        {/* Metadata footer */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 20, padding: "0 4px" }}>
          {[
            { label: "Created",     val: contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : "—" },
            { label: "Updated",     val: contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString() : "—" },
            { label: "Last Used",   val: contact.lastUsedAt ? new Date(contact.lastUsedAt).toLocaleDateString() : "Never" },
            { label: "Usage Count", val: String(contact.usageCount) },
          ].map(m => (
            <div key={m.label}>
              <p style={{ ...GF, fontSize: 10, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px" }}>{m.label}</p>
              <p style={{ ...GM, fontSize: 12, color: SLATE, margin: 0 }}>{m.val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContactDetailPage() {
  return (
    <ContactProvider>
      <ContactDetail />
    </ContactProvider>
  );
}

// Brand types re-export
type ContactId = import("../../../models/contacts").ContactId;
type ContactStatus = import("../../../models/contacts").ContactStatus;
