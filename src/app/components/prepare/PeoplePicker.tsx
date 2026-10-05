// Choose a participant instead of typing one: from the sender's contacts, from
// their own team, or from the other teams of the workspace.
//
// The two team tabs come from the workspace's participant directory. They are
// absent when there is no directory to read (the demo build, a personal
// workspace of one, or a member who may not prepare documents here): the
// picker is then the contacts list it always was.

import { useEffect, useId, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import {
  participantDirectoryAvailable, participantDirectoryService, splitDirectory, type DirectoryPerson,
} from "../../services/real/participant-directory.service";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F", AZURE = "#0078D4", SILVER = "#64748B";
const SHOWN = 6;

export interface PickerContact { id: string; name: string; email: string; organization: string; tagIds?: readonly string[] }
export type PickedPerson =
  | { from: "contact"; name: string; email: string; contact: PickerContact }
  | { from: "account"; name: string; email: string };

type TabId = "contacts" | "team" | "others";

export function PeoplePicker({ workspaceId, contacts, onPick, takenEmails = [], compact = false }: {
  workspaceId: string | null | undefined;
  contacts: readonly PickerContact[];
  onPick: (person: PickedPerson) => void;
  /** Already participants on this document: shown, not offered twice. */
  takenEmails?: readonly string[];
  /** A smaller trigger, for use inside a card that already has a heading. */
  compact?: boolean;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [directory, setDirectory] = useState<DirectoryPerson[] | null>(null);
  const [tab, setTab] = useState<TabId>("contacts");

  // Read once, when the picker is first opened: most participants are typed.
  useEffect(() => {
    if (!open || directory !== null || !participantDirectoryAvailable(workspaceId)) return;
    let cancelled = false;
    participantDirectoryService.list(workspaceId)
      .then(people => { if (!cancelled) setDirectory(people); })
      // Not allowed, or unreachable: no team tabs. Contacts still work.
      .catch(() => { if (!cancelled) setDirectory([]); });
    return () => { cancelled = true; };
  }, [open, directory, workspaceId]);

  const { myTeam, others } = useMemo(() => splitDirectory(directory ?? []), [directory]);
  const tabs = useMemo(() => {
    const list: { id: TabId; label: string; count: number }[] = [];
    if (contacts.length > 0) list.push({ id: "contacts", label: "Contacts", count: contacts.length });
    if (myTeam.length > 0) list.push({ id: "team", label: "My team", count: myTeam.length });
    if (others.length > 0) list.push({ id: "others", label: myTeam.length > 0 ? "Other teams" : "Workspace", count: others.length });
    return list;
  }, [contacts.length, myTeam.length, others.length]);
  const active = tabs.some(t => t.id === tab) ? tab : tabs[0]?.id ?? "contacts";

  const taken = useMemo(() => new Set(takenEmails.map(e => e.toLowerCase())), [takenEmails]);
  const q = query.trim().toLowerCase();
  const matches = (name: string, email: string, extra = "") =>
    q === "" || name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || extra.toLowerCase().includes(q);

  const rows: { key: string; name: string; email: string; sub: string; pick: PickedPerson }[] =
    active === "contacts"
      ? contacts.filter(c => matches(c.name, c.email, c.organization)).map(c => ({
          key: c.id, name: c.name, email: c.email, sub: c.organization,
          pick: { from: "contact", name: c.name, email: c.email, contact: c },
        }))
      : (active === "team" ? myTeam : others)
          .filter(p => matches(p.displayName, p.email, p.units.map(u => u.name).join(" ")))
          .map(p => ({
            key: p.userId, name: p.isCurrentUser ? `${p.displayName} (you)` : p.displayName, email: p.email,
            sub: p.units.map(u => u.name).join(", "),
            pick: { from: "account", name: p.displayName, email: p.email },
          }));

  const choose = (person: PickedPerson) => { onPick(person); setOpen(false); setQuery(""); };
  // Nothing to choose from at all, and no directory that could bring any.
  if (contacts.length === 0 && !participantDirectoryAvailable(workspaceId)) return null;

  return (
    <div style={{ marginBottom: compact ? 12 : 16 }}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); }}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          ...GF, display: "inline-flex", alignItems: "center", gap: 6,
          padding: compact ? "5px 11px" : "6px 14px", borderRadius: 8,
          border: `1px solid ${AZURE}`, background: "#FFFFFF", color: AZURE,
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}
      >
        <Users size={13} aria-hidden />
        {open ? "Hide people" : "Choose a person"}
      </button>

      {open && (
        <div id={panelId} style={{ marginTop: 10, background: "#FFFFFF", borderRadius: 8, border: "1px solid #D1D9E0", overflow: "hidden" }}>
          {tabs.length > 1 && (
            <div role="tablist" aria-label="Where to choose from" style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: "6px 8px 0", borderBottom: "1px solid #E3E8EF" }}>
              {tabs.map(t => (
                <button
                  key={t.id} type="button" role="tab" aria-selected={active === t.id}
                  onClick={() => { setTab(t.id); }}
                  style={{
                    ...GF, padding: "7px 10px", border: "none", background: "none", cursor: "pointer",
                    borderBottom: `2px solid ${active === t.id ? AZURE : "transparent"}`,
                    color: active === t.id ? AZURE : SILVER, fontSize: 12, fontWeight: active === t.id ? 700 : 500,
                  }}
                >
                  {t.label} <span style={{ fontWeight: 400 }}>({t.count})</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #E3E8EF" }}>
            <Search size={14} color={SILVER} aria-hidden />
            <input
              type="text"
              aria-label="Search people by name, email or team"
              placeholder="Search by name, email or team…"
              value={query}
              onChange={e => { setQuery(e.target.value); }}
              autoFocus
              style={{ ...GF, flex: 1, minWidth: 0, padding: "4px 0", border: "none", outline: "none", fontSize: 13, color: NAVY }}
            />
          </div>
          {directory === null && participantDirectoryAvailable(workspaceId) && tabs.length === 0 && (
            <div role="status" style={{ ...GF, padding: 12, fontSize: 13, color: SILVER }}>Loading people…</div>
          )}
          {rows.length === 0 && (directory !== null || tabs.length > 0) && (
            <div style={{ ...GF, padding: 12, fontSize: 13, color: SILVER }}>
              {q === "" ? "Nobody to choose here yet." : "Nobody matches that search."}
            </div>
          )}
          <div role="tabpanel">
            {rows.slice(0, SHOWN).map(row => {
              const used = taken.has(row.email.toLowerCase());
              return (
                <button
                  key={row.key} type="button" disabled={used}
                  onClick={() => { choose(row.pick); }}
                  style={{
                    ...GF, display: "block", width: "100%", padding: "9px 14px", border: "none",
                    borderBottom: "1px solid #F0F2F5", background: "#FFFFFF", textAlign: "left",
                    cursor: used ? "not-allowed" : "pointer", fontSize: 13, color: NAVY, opacity: used ? 0.55 : 1,
                  }}
                >
                  <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                    {row.name}{used && <span style={{ fontWeight: 400, color: SILVER }}> · already added</span>}
                  </div>
                  <div style={{ color: SILVER, fontSize: 12, overflowWrap: "anywhere" }}>
                    {row.email}{row.sub ? ` · ${row.sub}` : ""}
                  </div>
                </button>
              );
            })}
          </div>
          {rows.length > SHOWN && (
            <div style={{ ...GF, padding: "8px 14px", fontSize: 12, color: SILVER }}>
              Showing {SHOWN} of {rows.length}. Search to narrow the list.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
