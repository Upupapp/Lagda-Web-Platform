// /app/contacts/:contactId — Contact detail view.
// Shows full contact info, tags, groups, usage summary, duplicate panel, privacy notice.
// Frontend-only demonstration. No real identity verification claims.
// Burgundy never used. eNotary never referenced.

import React, { useCallback, useEffect, useState } from "react";
import {
  Mail, Phone, Building2, Briefcase, Share2, User as UserIcon, Pencil, Archive, RotateCcw, ArrowLeft,
  StickyNote, Tag as TagIcon, type LucideIcon,
} from "lucide-react";
import { PersonAvatar, AccountBadges, useLiveRefresh, C } from "./contacts-ui";
import { ContactWorkspaceCard } from "./ContactWorkspaceCard";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { useParams, Link } from "react-router";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactDuplicateCandidate, ContactUsageSummary, ContactTagId } from "../../../models/contacts";
import { CONTACT_STATUS_LABELS, CONTACT_SOURCE_LABELS, getContactTagById } from "../../../models/contacts";
import { usePlatform } from "../../../context/PlatformContext";
import { useWorkspaceAccess } from "../../../hooks/useWorkspaceAccess";
import { contactRequestsAvailable } from "../../../services/real/contact-request.service";
import { ContactRequestDialog, DELIVERY_COPY } from "../../../components/contact-requests/ContactRequestDialog";
import {
  ContactRequestButtons, ContactRequestHistory,
} from "../../../components/contact-requests/ContactRequestControls";
import { contactRequestsPath, type ContactRequestKind } from "../../../models/contact-requests";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
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

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="cd-tile">
      <span aria-hidden className="cd-tile-icon"><Icon size={15} aria-hidden /></span>
      <div style={{ minWidth: 0 }}>
        <dt className="cd-tile-label">{label}</dt>
        <dd className="cd-tile-value">{value ?? <span style={{ color: "#94A3B8" }}>—</span>}</dd>
      </div>
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
  const { state, asyncLoadContact, clearActiveContact, asyncArchive, asyncRestore } = useContacts();
  const [archiving, setArchiving] = useState(false);
  const [requestKind, setRequestKind] = useState<ContactRequestKind | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const platform = usePlatform();
  const access = useWorkspaceAccess();
  const workspaceId = platform.currentWorkspace?.id;
  // 086. Real workspaces only — a request names a real person and may send a
  // real email — and hidden once the server confirms the privilege is missing.
  const canRequest = contactRequestsAvailable(workspaceId)
    && (!access.confirmed || access.can("upload-request.create"));

  useEffect(() => {
    if (contactId) void asyncLoadContact(contactId as ContactId);
    return () => clearActiveContact();
  }, [contactId, asyncLoadContact, clearActiveContact]);

  // A new name, title or photo — or their joining the workspace — shows here
  // without a reload. A quiet re-read, so the page never flashes a skeleton.
  const [fresh, setFresh] = useState<typeof state.activeContact>(null);
  const reread = useCallback(() => {
    if (!contactId || !USE_REAL_BACKEND) return;
    void import("../../../services/contacts-source").then(m => m.getContact(workspaceId, contactId as ContactId))
      .then(next => { if (next) setFresh(next); })
      .catch(() => { /* keep what is shown */ });
  }, [contactId, workspaceId]);
  useLiveRefresh(reread);
  // "Invite to workspace" after accepting a request lands on #workspace.
  const loadedId = state.activeContact?.id;
  useEffect(() => {
    if (loadedId === undefined || window.location.hash !== "#workspace") return;
    const t = window.setTimeout(() => { document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 150);
    return () => { window.clearTimeout(t); };
  }, [loadedId]);
  useEffect(() => { setFresh(null); }, [state.activeContact]);

  const contact = fresh !== null && fresh.id === state.activeContact?.id ? fresh : state.activeContact;
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
      {/* Profile header */}
      <header className="cd-hero">
        <div className="cd-band" aria-hidden />
        <div className="cd-hero-inner">
          <Link to="/app/contacts" className="cd-back"><ArrowLeft size={15} aria-hidden /> Contacts</Link>
          <div className="cd-hero-row">
            <span className="cd-avatar"><PersonAvatar name={contact.name} avatarUrl={contact.avatarUrl} size={96} ring /></span>
            <div className="cd-hero-text">
              <h1 className="cd-name">{contact.name}</h1>
              {(contact.title || contact.organization) && (
                <p className="cd-role">{[contact.title, contact.organization].filter(Boolean).join(" · ")}</p>
              )}
              <div className="cd-badges">
                <AccountBadges account={contact.account} workspaceMember={contact.workspaceMember} />
                {contact.scope === "workspace" && <span className="cd-soft"><Share2 size={11} aria-hidden /> Shared with the workspace</span>}
                {contact.status !== "active" && <StatusBadge status={contact.status} />}
              </div>
            </div>
            <div className="cd-actions">
              <a href={`mailto:${contact.email}`} className="cd-btn"><Mail size={15} aria-hidden /> Email</a>
              {contact.status === "active" && (
                <Link to={`/app/contacts/${contact.id}/edit`} className="cd-btn"><Pencil size={15} aria-hidden /> Edit</Link>
              )}
              {contact.status !== "archived" ? (
                <button type="button" onClick={() => { void handleArchive(); }} disabled={archiving} className="cd-btn" data-variant="quiet">
                  <Archive size={15} aria-hidden /> {archiving ? "Archiving…" : "Archive"}
                </button>
              ) : (
                <button type="button" onClick={() => { void handleRestore(); }} className="cd-btn" data-variant="restore">
                  <RotateCcw size={15} aria-hidden /> Restore
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="cd-layout">
        <div className="cd-main">
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
        <SectionCard title="Contact information">
          <dl className="cd-tiles">
            <InfoTile icon={Mail} label="Email" value={<a href={`mailto:${contact.email}`} style={{ color: "#005A9E", textDecoration: "none", ...C.GM, fontSize: 13 }}>{contact.email}</a>} />
            <InfoTile icon={Phone} label="Phone" value={contact.phone ? <a href={`tel:${contact.phone}`} style={{ color: "#005A9E", textDecoration: "none" }}>{contact.phone}</a> : undefined} />
            <InfoTile icon={Building2} label="Organisation" value={contact.organization} />
            <InfoTile icon={Briefcase} label="Title / role" value={contact.title} />
            <InfoTile icon={Share2} label="Who can use it" value={contact.scope === "workspace" ? "Everyone in the workspace" : "Only you"} />
            <InfoTile icon={UserIcon} label="Source" value={contact.account?.connected ? "Added each other on LAGDA" : CONTACT_SOURCE_LABELS[contact.source]} />
          </dl>
          {contact.tagIds.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
              <TagIcon size={14} color="#94A3B8" aria-hidden />
              {contact.tagIds.map(t => <TagChip key={t} tagId={t} />)}
            </div>
          )}
          {contact.note && (
            <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", marginTop: 14, display: "flex", gap: 10 }}>
              <StickyNote size={15} color="#94A3B8" aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ ...GF, fontSize: 13, color: NAVY, margin: 0, lineHeight: 1.55 }}>{contact.note}</p>
            </div>
          )}
        </SectionCard>

        {/* 086. Requests: what can be asked of this contact, and what has been. */}
        {canRequest && workspaceId !== undefined && (
          <SectionCard title="Requests">
            {contact.workspaceMember !== undefined && (
              <p style={{ ...GF, fontSize: 13, color: "#334155", margin: "0 0 12px", lineHeight: 1.55 }}>
                {contact.workspaceMember === null
                  ? <><strong>External contact.</strong> They are not a member of this workspace.</>
                  : <><strong>Workspace member ({contact.workspaceMember.displayName}).</strong> {DELIVERY_COPY.member}</>}
              </p>
            )}
            {/* Only "Assign for document preparation" is offered (see
                ENABLED_CONTACT_REQUEST_KINDS); for an external contact it stays
                visible, disabled, with the reason. */}
            <ContactRequestButtons
              contact={contact}
              currentUserId={platform.user?.id}
              onChoose={kind => { setRequestKind(kind); }}
            />
            <p style={{ ...GF, fontSize: 12.5, color: "#475569", margin: "12px 0 0" }}>
              Track answers in <Link to={contactRequestsPath({ view: "sent" })} style={{ color: "#005A9E", fontWeight: 600 }}>Document requests</Link>.
            </p>
            <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", margin: "18px 0 10px" }}>
              Request history
            </h3>
            <ContactRequestHistory workspaceId={workspaceId} contactId={contact.id} refreshKey={historyKey} />
          </SectionCard>
        )}

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

        </div>

        <aside className="cd-side">
          {USE_REAL_BACKEND && workspaceId !== undefined && contact.status === "active" && (
            <ContactWorkspaceCard contact={contact} workspaceId={workspaceId}
              canAskToPrepare={canRequest && contact.workspaceMember != null}
              onAskToPrepare={() => { setRequestKind("preparation"); }} />
          )}
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
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", padding: "0 4px" }}>
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
        </aside>
      </div>

      <style>{DETAIL_CSS}</style>

      {requestKind !== null && workspaceId !== undefined && (
        <ContactRequestDialog
          workspaceId={workspaceId}
          kind={requestKind}
          contact={contact}
          onClose={() => { setRequestKind(null); }}
          onCreated={() => { setHistoryKey(k => k + 1); }}
        />
      )}
    </div>
  );
}

const DETAIL_CSS = `
.cd-hero { position: relative; background: #FFFFFF; border-bottom: 1px solid #E3E8EF; }
.cd-band { height: 112px; background:
  radial-gradient(120% 140% at 100% 0%, rgba(0,120,212,0.55) 0%, rgba(0,120,212,0) 55%),
  linear-gradient(120deg, #07111F 0%, #0B3A66 55%, #0078D4 100%); }
.cd-hero-inner { max-width: 1080px; margin: 0 auto; padding: 0 24px 18px; box-sizing: border-box; }
.cd-back { position: absolute; top: 14px; left: 24px; display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px;
  font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 600; color: #FFFFFF; text-decoration: none; background: rgba(255,255,255,0.14); }
.cd-back:hover { background: rgba(255,255,255,0.24); }
.cd-hero-row { display: flex; align-items: flex-start; gap: 18px; padding-top: 14px; flex-wrap: wrap; }
.cd-avatar { display: flex; margin-top: -62px; flex-shrink: 0; }
.cd-hero-text { flex: 1 1 260px; min-width: 0; }
.cd-actions { align-self: center; }
.cd-name { font-family: 'Geist', sans-serif; font-size: 26px; font-weight: 800; color: #07111F; margin: 0; line-height: 1.2; overflow-wrap: anywhere; }
.cd-role { font-family: 'Geist', sans-serif; font-size: 14px; color: #475569; margin: 3px 0 0; }
.cd-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; align-items: center; }
.cd-soft { display: inline-flex; align-items: center; gap: 4px; font-family: 'Geist', sans-serif; font-size: 11px; font-weight: 600; color: #475569;
  background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 999px; padding: 2px 8px; }
.cd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.cd-btn { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 14px; border-radius: 9px; border: 1.5px solid #CBD5E1; background: #FFFFFF;
  color: #1E293B; font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; }
.cd-btn:hover:not(:disabled) { border-color: #0078D4; color: #005A9E; }
.cd-btn:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 1px; }
.cd-btn[data-variant="quiet"] { color: #475569; }
.cd-btn[data-variant="restore"] { color: #166534; border-color: #BBF7D0; background: #F0FDF4; }
.cd-layout { max-width: 1080px; margin: 22px auto 0; padding: 0 24px; box-sizing: border-box; display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
.cd-main, .cd-side { min-width: 0; display: flex; flex-direction: column; gap: 0; }
.cd-side { gap: 16px; position: sticky; top: 16px; }
.cd-tiles { margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 10px; }
.cd-tile { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid #EEF2F6; border-radius: 10px; background: #FBFCFE; min-width: 0; }
.cd-tile-icon { width: 30px; height: 30px; border-radius: 8px; background: #F0F7FF; color: #005A9E; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cd-tile-label { font-family: 'Geist', sans-serif; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
.cd-tile-value { font-family: 'Geist', sans-serif; font-size: 13.5px; color: #07111F; margin: 2px 0 0; overflow-wrap: anywhere; }
@media (max-width: 960px) {
  .cd-layout { grid-template-columns: minmax(0, 1fr); }
  .cd-side { position: static; }
}
@media (max-width: 600px) {
  .cd-band { height: 92px; }
  .cd-hero-inner { padding: 0 16px 16px; }
  .cd-back { left: 16px; }
  .cd-hero-row { flex-direction: column; align-items: flex-start; gap: 10px; padding-top: 0; }
  .cd-avatar { margin-top: -52px; }
  .cd-hero-text { flex: 0 0 auto; width: 100%; }
  .cd-actions { align-self: stretch; }
  .cd-name { font-size: 22px; }
  .cd-actions { width: 100%; }
  .cd-btn { flex: 1 1 0; justify-content: center; padding: 0 10px; }
  .cd-layout { padding: 0 16px; margin-top: 16px; }
}
`;

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
