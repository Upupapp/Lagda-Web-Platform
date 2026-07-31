// ContactRecipientPicker — multi-select Contacts and Contact Groups for a
// recipient source. Gap Closure Command 1.
//
// This is NOT a replacement for ContactPicker.tsx. That one is single-select and
// exists to fill one participant slot in Prepare/Templates. This one selects many
// people at once and expands Contact Groups into individuals, which the
// single-select dialog cannot express.
//
// It reads the canonical Contacts service and creates NO Contacts state of its own.
// Nothing here writes a Contact, changes group membership, sends anything, or
// grants anyone access.
//
// All eligibility, expansion, de-duplication and payload construction live in
// services/contact-recipient-source.ts — this component only renders them.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, Check, Search, Users, X } from "lucide-react";
import type { ContactGroupId, ContactGroupSummary, ContactListItem } from "../../models/contacts";
import { DEFAULT_CONTACT_QUERY } from "../../models/contacts";
import { mockContactService } from "../../services/mock/contacts.service";
import {
  CONTACT_ELIGIBILITY_HINTS,
  CONTACT_ELIGIBILITY_LABELS,
  CONTACT_GROUP_EXPANSION_NOTICE,
  CONTACT_NO_ACCESS_NOTICE,
  CONTACT_SOURCE_NOTICE,
  buildContactSourcePayload,
  describeSelection,
  expandSelection,
  filterVisibleContacts,
  isBlockingReason,
  resolveSourceKind,
  type ContactSelectionEntry,
  type ContactSourcePayload,
} from "../../services/contact-recipient-source";

const GF = { fontFamily: "'Geist', 'Inter', system-ui, sans-serif" } as const;
const NAVY = "#07111F", AZURE = "#0078D4", AZURE_DEEP = "#005EA2";
const SLATE9 = "#0F172A", SLATE6 = "#475569", SLATE5 = "#64748B", SLATE4 = "#94A3B8";
const SLATE3 = "#CBD5E1", SLATE2 = "#E2E8F0", SLATE1 = "#F1F5F9", SLATE0 = "#F8FAFC";
const WHITE = "#FFFFFF";
const WARN_BG = "#FFFBEB", WARN_BORDER = "#FDE68A", WARN_TEXT = "#92400E";
const OK_BG = "#F0FDF4", OK_BORDER = "#BBF7D0", OK_TEXT = "#166534";

export type ContactRecipientPickerMode = "contacts" | "contact-groups";

export interface ContactRecipientPickerProps {
  mode: ContactRecipientPickerMode;
  /** Workspace the session currently holds. Contacts outside it never appear. */
  workspaceId: string;
  /** False when the viewer may not read Contacts; the picker refuses to open. */
  canUseContacts: boolean;
  onCancel: () => void;
  /** Receives the index-aligned payload plus the source union member to record. */
  onAdd: (payload: ContactSourcePayload, sourceKind: "contact" | "contact-group") => void;
  busy?: boolean;
}

type LoadState = "loading" | "ready" | "empty" | "error";

export function ContactRecipientPicker({
  mode, workspaceId, canUseContacts, onCancel, onAdd, busy = false,
}: ContactRecipientPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);

  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [contactState, setContactState] = useState<LoadState>("loading");

  const [groups, setGroups] = useState<ContactGroupSummary[]>([]);
  const [groupState, setGroupState] = useState<LoadState>("loading");

  const [pickedContactIds, setPickedContactIds] = useState<Set<string>>(new Set());
  const [pickedGroupIds, setPickedGroupIds] = useState<Set<string>>(new Set());
  const [groupMembers, setGroupMembers] = useState<Record<string, ContactListItem[]>>({});
  const [groupMembersLoading, setGroupMembersLoading] = useState<Set<string>>(new Set());
  const [groupMemberError, setGroupMemberError] = useState<Set<string>>(new Set());

  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);

  const ctx = useMemo(() => ({ workspaceId }), [workspaceId]);

  // ── Focus containment ──────────────────────────────────────────────────────
  //
  // Focus is restored to whatever opened the picker ONLY when it is still in the
  // document. After a successful Add the source selector is replaced by the rows
  // table, so the card that opened this picker no longer exists — restoring to a
  // detached node silently drops focus to <body>. In that case the page owns
  // moving focus instead (see onAdd in BulkSendBatchPages).
  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => searchRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(t);
      const el = prevFocus.current;
      if (el && el.isConnected) el.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onCancel(); return; }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  // ── Load contacts (debounced, stale-guarded) ───────────────────────────────
  const loadContacts = useCallback(() => {
    const id = ++reqRef.current;
    setContactState("loading");
    mockContactService
      .listContacts({
        ...DEFAULT_CONTACT_QUERY,
        view: "all",
        // `statusFilter` is only honoured when view === "all"; active-only keeps
        // archived Contacts out of the default list rather than relying on the
        // view's own partial filtering.
        statusFilter: "active",
        search,
        perPage: 50,
      })
      .then((res) => {
        if (id !== reqRef.current) return;   // superseded
        const visible = filterVisibleContacts(res.items, ctx);
        setContacts(visible);
        setContactState(visible.length === 0 ? "empty" : "ready");
      })
      .catch(() => { if (id === reqRef.current) setContactState("error"); });
  }, [search, ctx]);

  useEffect(() => {
    if (mode !== "contacts") return;
    const t = window.setTimeout(loadContacts, 200);
    return () => window.clearTimeout(t);
  }, [mode, loadContacts]);

  // ── Load groups ────────────────────────────────────────────────────────────
  const loadGroups = useCallback(() => {
    setGroupState("loading");
    mockContactService
      .listGroups()
      .then((all) => {
        // listGroups applies no status filter of its own.
        const active = all.filter((g) => g.status === "active");
        setGroups(active);
        setGroupState(active.length === 0 ? "empty" : "ready");
      })
      .catch(() => setGroupState("error"));
  }, []);

  useEffect(() => { if (mode === "contact-groups") loadGroups(); }, [mode, loadGroups]);

  // ── Group member loading (on demand, never eagerly for every group) ────────
  const loadGroupMembers = useCallback((groupId: string) => {
    setGroupMembersLoading((s) => new Set(s).add(groupId));
    setGroupMemberError((s) => { const n = new Set(s); n.delete(groupId); return n; });
    mockContactService
      .getGroup(groupId as ContactGroupId)
      .then((res) => {
        setGroupMembersLoading((s) => { const n = new Set(s); n.delete(groupId); return n; });
        if (!res) { setGroupMemberError((s) => new Set(s).add(groupId)); return; }
        // Filter for workspace visibility at the boundary, before the members can
        // reach a count, a preview, or an expansion.
        setGroupMembers((m) => ({ ...m, [groupId]: filterVisibleContacts(res.members, ctx) }));
      })
      .catch(() => {
        setGroupMembersLoading((s) => { const n = new Set(s); n.delete(groupId); return n; });
        setGroupMemberError((s) => new Set(s).add(groupId));
      });
  }, [ctx]);

  const toggleGroup = (id: string) => {
    setPickedGroupIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else { n.add(id); if (!groupMembers[id]) loadGroupMembers(id); }
      return n;
    });
  };

  const toggleContact = (id: string) => {
    setPickedContactIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── Expansion (the single source of truth for what will be added) ──────────
  const expansion = useMemo(() => expandSelection({
    directContacts: contacts.filter((c) => pickedContactIds.has(String(c.id))),
    groups: [...pickedGroupIds]
      .map((gid) => {
        const g = groups.find((x) => String(x.id) === gid);
        return g ? { id: g.id, name: g.name, members: groupMembers[gid] ?? [] } : null;
      })
      .filter(Boolean) as Array<{ id: ContactGroupId; name: string; members: ContactListItem[] }>,
    excludedContactIds: excludedIds,
    ctx,
  }), [contacts, pickedContactIds, pickedGroupIds, groups, groupMembers, excludedIds, ctx]);

  const anyGroupLoading = groupMembersLoading.size > 0;
  const nothingPicked = pickedContactIds.size === 0 && pickedGroupIds.size === 0;
  const canAdd = expansion.summary.eligible > 0 && !busy && !anyGroupLoading;

  const disabledReason = anyGroupLoading
    ? "Waiting for group members to load."
    : nothingPicked
      ? (mode === "contacts" ? "Select at least one Contact." : "Select at least one Contact Group.")
      : expansion.summary.excluded > 0 && expansion.summary.eligible === 0
        ? "Everyone in this selection has been excluded."
        : "No one in this selection can be added as a recipient yet.";

  const handleAdd = () => {
    const payload = buildContactSourcePayload(expansion.entries);
    if (payload.rowCount === 0) return;
    onAdd(payload, resolveSourceKind(expansion.entries));
  };

  const title = mode === "contacts" ? "Select Contacts" : "Select Contact Groups";

  // ── Permission refusal ─────────────────────────────────────────────────────
  if (!canUseContacts) {
    return (
      <Shell title={title} onCancel={onCancel} panelRef={panelRef}>
        <Notice tone="warn"
          text="You do not have permission to use Contacts as a recipient source in this workspace." />
        <div style={{ marginTop: 16 }}>
          <button type="button" className="bs-btn bs-btn-secondary" onClick={onCancel}>Back to sources</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={title} onCancel={onCancel} panelRef={panelRef}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Notice tone="neutral" text={mode === "contacts" ? CONTACT_SOURCE_NOTICE : CONTACT_GROUP_EXPANSION_NOTICE} />

        {/* ── Contacts mode ───────────────────────────────────────────────── */}
        {mode === "contacts" && (
          <>
            <label htmlFor="crp-search" style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE6 }}>
              Search Contacts
            </label>
            <div style={{ position: "relative" }}>
              <Search size={14} aria-hidden
                style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: SLATE4 }} />
              <input id="crp-search" ref={searchRef} type="search" value={search}
                onChange={(e) => setSearch(e.target.value.slice(0, 120))}
                placeholder="Name, email, or organization"
                style={{
                  ...GF, width: "100%", minHeight: 44, padding: "10px 12px 10px 32px",
                  border: `1.5px solid ${SLATE3}`, borderRadius: 8, fontSize: 14,
                  color: SLATE9, background: WHITE, boxSizing: "border-box",
                }} />
            </div>

            {contactState === "loading" && <Muted text="Loading Contacts…" live />}
            {contactState === "error" && (
              <ErrorBlock text="Contacts could not be loaded." onRetry={loadContacts} />
            )}
            {contactState === "empty" && (
              <EmptyBlock
                title={search ? "No Contacts match this search" : "No eligible Contacts in this workspace"}
                body={search
                  ? "Try a different search, or clear it to see all Contacts."
                  : "Add Contacts first, or use another recipient source."}
                actions={
                  <>
                    {search && (
                      <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm"
                        onClick={() => setSearch("")}>Clear search</button>
                    )}
                    <Link to="/app/contacts" className="bs-btn bs-btn-secondary bs-btn-sm">Open Contacts</Link>
                  </>
                } />
            )}

            {contactState === "ready" && (
              <>
                <div className="bs-row" style={{ justifyContent: "space-between", gap: 10 }}>
                  <span style={{ ...GF, fontSize: 12, color: SLATE5 }}>
                    {contacts.length} {contacts.length === 1 ? "Contact" : "Contacts"} shown
                  </span>
                  <div className="bs-row" style={{ gap: 8 }}>
                    <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm"
                      onClick={() => setPickedContactIds(new Set(contacts.map((c) => String(c.id))))}>
                      Select these {contacts.length}
                    </button>
                    <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm"
                      disabled={pickedContactIds.size === 0}
                      onClick={() => setPickedContactIds(new Set())}>
                      Clear selection
                    </button>
                  </div>
                </div>

                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {contacts.map((c) => {
                    const id = String(c.id);
                    const on = pickedContactIds.has(id);
                    const reason = expansion.entries.find((e) => String(e.contact.id) === id)?.reason;
                    const blocked = reason ? isBlockingReason(reason) : false;
                    return (
                      <li key={id}>
                        <label style={{
                          display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer",
                          padding: "10px 12px", minHeight: 44, borderRadius: 8,
                          background: on ? "#F0F9FF" : WHITE,
                          border: `1px solid ${on ? "#BAE6FD" : SLATE2}`,
                        }}>
                          <input type="checkbox" checked={on} onChange={() => toggleContact(id)}
                            style={{ width: 18, height: 18, marginTop: 2, accentColor: AZURE, flexShrink: 0 }} />
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ ...GF, display: "block", fontSize: 14, fontWeight: 600, color: NAVY, overflowWrap: "anywhere" }}>
                              {c.name}
                            </span>
                            <span style={{ ...GF, display: "block", fontSize: 12.5, color: SLATE5, overflowWrap: "anywhere" }}>
                              {c.email || "No email address"}
                              {c.organization ? ` · ${c.organization}` : ""}
                            </span>
                            {on && blocked && reason && (
                              <span style={{ ...GF, display: "block", fontSize: 12, color: WARN_TEXT, marginTop: 4 }}>
                                {CONTACT_ELIGIBILITY_LABELS[reason]}
                                {CONTACT_ELIGIBILITY_HINTS[reason] ? ` — ${CONTACT_ELIGIBILITY_HINTS[reason]}` : ""}
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}

        {/* ── Contact Groups mode ─────────────────────────────────────────── */}
        {mode === "contact-groups" && (
          <>
            {groupState === "loading" && <Muted text="Loading Contact Groups…" live />}
            {groupState === "error" && <ErrorBlock text="Contact Groups could not be loaded." onRetry={loadGroups} />}
            {groupState === "empty" && (
              <EmptyBlock title="No Contact Groups available"
                body="Create a group in Contacts, or select individual Contacts instead."
                actions={<Link to="/app/contacts/groups" className="bs-btn bs-btn-secondary bs-btn-sm">Open Contact Groups</Link>} />
            )}

            {groupState === "ready" && (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {groups.map((g) => {
                  const gid = String(g.id);
                  const on = pickedGroupIds.has(gid);
                  const loading = groupMembersLoading.has(gid);
                  const failed = groupMemberError.has(gid);
                  const members = groupMembers[gid];
                  const eligibleHere = members
                    ? members.filter((m) => !isBlockingReason(
                        expansion.entries.find((e) => String(e.contact.id) === String(m.id))?.reason ?? "eligible")).length
                    : null;
                  return (
                    <li key={gid}>
                      <label style={{
                        display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer",
                        padding: "12px 14px", minHeight: 44, borderRadius: 8,
                        background: on ? "#F0F9FF" : WHITE,
                        border: `1px solid ${on ? "#BAE6FD" : SLATE2}`,
                      }}>
                        <input type="checkbox" checked={on} onChange={() => toggleGroup(gid)}
                          style={{ width: 18, height: 18, marginTop: 2, accentColor: AZURE, flexShrink: 0 }} />
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ ...GF, display: "block", fontSize: 14, fontWeight: 600, color: NAVY }}>{g.name}</span>
                          {g.description && (
                            <span style={{ ...GF, display: "block", fontSize: 12.5, color: SLATE5, marginTop: 2, overflowWrap: "anywhere" }}>
                              {g.description}
                            </span>
                          )}
                          <span style={{ ...GF, display: "block", fontSize: 12, color: SLATE5, marginTop: 4 }}>
                            {loading ? "Loading members…"
                              : failed ? "Members could not be loaded."
                              : eligibleHere !== null
                                ? `${eligibleHere} ${eligibleHere === 1 ? "person" : "people"} can be added`
                                : `${g.memberCount} ${g.memberCount === 1 ? "member" : "members"}`}
                          </span>
                          {/* Never discloses who is excluded or how many are hidden. */}
                          {members && eligibleHere !== null && eligibleHere < members.length && (
                            <span style={{ ...GF, display: "block", fontSize: 12, color: WARN_TEXT, marginTop: 3 }}>
                              Some group members cannot be added.
                            </span>
                          )}
                          {failed && (
                            <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm"
                              style={{ marginTop: 6 }}
                              onClick={(e) => { e.preventDefault(); loadGroupMembers(gid); }}>
                              Retry this group
                            </button>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {/* ── Selection summary ───────────────────────────────────────────── */}
        {(pickedContactIds.size > 0 || pickedGroupIds.size > 0) && (
          <div style={{ padding: "12px 14px", borderRadius: 8, background: SLATE0, border: `1px solid ${SLATE2}` }}>
            <p style={{ ...GF, margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: NAVY }}>Selection</p>
            <p style={{ ...GF, margin: 0, fontSize: 13, color: SLATE6, lineHeight: 1.7 }} aria-live="polite">
              {describeSelection(expansion.summary).join(" · ")}
            </p>
            <p style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: SLATE5 }}>
              {expansion.summary.directContacts} selected directly ·{" "}
              {expansion.summary.groupsSelected} {expansion.summary.groupsSelected === 1 ? "group" : "groups"}
            </p>
            {expansion.entries.length > 0 && (
              <button type="button" className="bs-btn bs-btn-ghost bs-btn-sm" style={{ marginTop: 8 }}
                onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}>
                {showPreview ? "Hide recipients" : `Review ${expansion.entries.length} recipients`}
              </button>
            )}
          </div>
        )}

        {/* ── Group expansion preview ─────────────────────────────────────── */}
        {showPreview && expansion.entries.length > 0 && (
          <div style={{ border: `1px solid ${SLATE2}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", background: SLATE1, borderBottom: `1px solid ${SLATE2}` }}>
              <p style={{ ...GF, margin: 0, fontSize: 13, fontWeight: 700, color: NAVY }}>
                Recipients to be added
              </p>
              <p style={{ ...GF, margin: "3px 0 0", fontSize: 12, color: SLATE5 }}>
                Untick anyone you do not want. This changes only this batch draft.
              </p>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {expansion.entries.map((e) => (
                <PreviewRow key={String(e.contact.id)} entry={e}
                  onToggle={() => setExcludedIds((s) => {
                    const n = new Set(s); const id = String(e.contact.id);
                    n.has(id) ? n.delete(id) : n.add(id); return n;
                  })} />
              ))}
            </ul>
          </div>
        )}

        <Notice tone="neutral" text={CONTACT_NO_ACCESS_NOTICE} compact />
      </div>

      {/* ── Sticky actions ─────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", bottom: 0, marginTop: 16,
        padding: "12px 0 calc(4px + env(safe-area-inset-bottom, 0px))",
        background: WHITE, borderTop: `1px solid ${SLATE2}`,
        display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap",
        alignItems: "center",
      }}>
        {/* A disabled primary action always says why. Without this the button
            simply read "Add 0 Recipients" and gave no reason. */}
        {!canAdd && !busy && (
          <p style={{ ...GF, margin: 0, marginRight: "auto", fontSize: 12.5, color: SLATE5, lineHeight: 1.5 }}>
            {disabledReason}
          </p>
        )}
        <button type="button" className="bs-btn bs-btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="bs-btn bs-btn-primary" onClick={handleAdd}
          disabled={!canAdd} aria-disabled={!canAdd}
          title={!canAdd && !busy ? disabledReason : undefined}>
          {busy ? "Adding…" : `Add ${expansion.summary.eligible} ${expansion.summary.eligible === 1 ? "Recipient" : "Recipients"}`}
        </button>
      </div>
    </Shell>
  );
}

// ── Preview row ───────────────────────────────────────────────────────────────

function PreviewRow({ entry, onToggle }: { entry: ContactSelectionEntry; onToggle: () => void }) {
  const blocked = isBlockingReason(entry.reason);
  const label = CONTACT_ELIGIBILITY_LABELS[entry.reason];
  return (
    <li style={{ borderBottom: `1px solid ${SLATE1}` }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", minHeight: 44 }}>
        <input type="checkbox" checked={!entry.excluded} onChange={onToggle}
          aria-label={`Include ${entry.contact.name}`}
          disabled={blocked}
          style={{ width: 18, height: 18, marginTop: 2, accentColor: AZURE, flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ ...GF, margin: 0, fontSize: 13.5, fontWeight: 600, color: entry.excluded ? SLATE4 : NAVY, overflowWrap: "anywhere" }}>
            {entry.contact.name}
          </p>
          <p style={{ ...GF, margin: "2px 0 0", fontSize: 12, color: SLATE5, overflowWrap: "anywhere" }}>
            {entry.contact.email || "No email address"}
          </p>
          <p style={{ ...GF, margin: "3px 0 0", fontSize: 11.5, color: SLATE5 }}>
            {entry.pickedDirectly && entry.viaGroupNames.length > 0
              ? `Selected directly and via ${entry.viaGroupNames.join(", ")}`
              : entry.viaGroupNames.length > 0
                ? `From ${entry.viaGroupNames.join(", ")}`
                : "Selected directly"}
          </p>
        </div>
        {/* Status is text, never colour or icon alone. */}
        <span style={{
          ...GF, flexShrink: 0, fontSize: 11.5, fontWeight: 600, padding: "3px 8px", borderRadius: 100,
          background: entry.excluded ? SLATE1 : blocked ? WARN_BG : OK_BG,
          color: entry.excluded ? SLATE5 : blocked ? WARN_TEXT : OK_TEXT,
          border: `1px solid ${entry.excluded ? SLATE2 : blocked ? WARN_BORDER : OK_BORDER}`,
        }}>
          {entry.excluded ? "Excluded" : label}
        </span>
      </div>
    </li>
  );
}

// ── Small presentational helpers ──────────────────────────────────────────────

function Shell({ title, onCancel, panelRef, children }: {
  title: string; onCancel: () => void;
  panelRef: React.RefObject<HTMLDivElement | null>; children: React.ReactNode;
}) {
  return (
    <div className="bs-panel" ref={panelRef} role="group" aria-label={title}>
      <div className="bs-row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div className="bs-row" style={{ gap: 8 }}>
          <Users size={16} color={AZURE} aria-hidden />
          <h2 style={{ ...GF, margin: 0, fontSize: 16, fontWeight: 700, color: NAVY }}>{title}</h2>
        </div>
        <button type="button" className="bs-btn bs-btn-ghost" onClick={onCancel} aria-label="Close and return to recipient sources"
          style={{ minHeight: 44, width: 44, padding: 0 }}>
          <X size={18} aria-hidden />
        </button>
      </div>
      {children}
    </div>
  );
}

function Notice({ text, tone, compact }: { text: string; tone: "neutral" | "warn"; compact?: boolean }) {
  const warn = tone === "warn";
  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "flex-start",
      padding: compact ? "8px 10px" : "11px 13px", borderRadius: 8,
      background: warn ? WARN_BG : SLATE0,
      border: `1px solid ${warn ? WARN_BORDER : SLATE2}`,
    }}>
      {warn && <AlertTriangle size={14} style={{ color: WARN_TEXT, flexShrink: 0, marginTop: 1 }} aria-hidden />}
      <p style={{ ...GF, margin: 0, fontSize: compact ? 12 : 12.5, lineHeight: 1.65, color: warn ? WARN_TEXT : SLATE6 }}>
        {text}
      </p>
    </div>
  );
}

function Muted({ text, live }: { text: string; live?: boolean }) {
  return (
    <p role={live ? "status" : undefined} aria-live={live ? "polite" : undefined}
      style={{ ...GF, margin: 0, fontSize: 13, color: SLATE5, padding: "12px 0" }}>
      {text}
    </p>
  );
}

function ErrorBlock({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div role="alert" style={{ padding: "12px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA" }}>
      <p style={{ ...GF, margin: "0 0 10px", fontSize: 13, color: "#991B1B" }}>{text}</p>
      <button type="button" className="bs-btn bs-btn-secondary bs-btn-sm" onClick={onRetry}>Try again</button>
    </div>
  );
}

function EmptyBlock({ title, body, actions }: { title: string; body: string; actions?: React.ReactNode }) {
  return (
    <div style={{ padding: "28px 20px", textAlign: "center", background: SLATE0, borderRadius: 10, border: `1px solid ${SLATE2}` }}>
      <p style={{ ...GF, margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: NAVY }}>{title}</p>
      <p style={{ ...GF, margin: "0 auto 14px", fontSize: 13, color: SLATE5, lineHeight: 1.65, maxWidth: 380 }}>{body}</p>
      {actions && <div className="bs-row" style={{ gap: 8, justifyContent: "center" }}>{actions}</div>}
    </div>
  );
}
