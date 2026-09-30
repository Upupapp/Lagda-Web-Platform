// The shared look of Contacts: the page header with its counts and section
// tabs, the avatar, the account badges, and the icon detail line.
//
// ── Avatars ────────────────────────────────────────────────────────────────
//
// A real photo only when a LAGDA account stands behind the contact (091's
// `account`, served by the contact's own photo route); otherwise a blank
// person — never initials. An address-book entry is not a verified identity,
// and a face guessed from a name would claim more than is known.
//
// ── Keeping up without a push channel ──────────────────────────────────────
//
// There is no server push. `useLiveRefresh` re-reads every 60 seconds while
// the tab is visible and at once when it becomes visible again, so a request,
// an acceptance or a new photo shows up on its own.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  User as BlankPersonIcon, Users, UserSearch, Inbox, FileText, Archive, BadgeCheck, Building2,
  Globe, type LucideIcon,
} from "lucide-react";
import { TabStrip } from "../../../components/platform/TabStrip";
import { CONTACT_REQUESTS_ROUTE } from "../../../models/contact-requests";
import {
  contactConnectionsService, contactConnectionsAvailable, type ConnectionLists,
} from "../../../services/real/contact-connections.service";
import { usePlatform } from "../../../context/PlatformContext";
import type { ContactAccount, ContactWorkspaceMember } from "../../../models/contacts";

export const C = {
  NAVY: "#07111F",
  INK: "#1E293B",
  AZURE: "#0078D4",
  AZURE_TEXT: "#005A9E",
  SLATE: "#475569",
  MUTED: "#64748B",
  BORDER: "#E3E8EF",
  LIGHT: "#F0F7FF",
  CANVAS: "#F8FAFC",
  SUCCESS: "#15803D",
  GF: { fontFamily: "'Geist', sans-serif" } as const,
  GM: { fontFamily: "'Geist Mono', monospace" } as const,
};

export const ARCHIVED_CONTACTS_ROUTE = "/app/contacts/archived";
export const PENDING_CONTACTS_ROUTE = "/app/contacts/pending";
export const FIND_PEOPLE_ROUTE = "/app/contacts/new";
export const EXTERNAL_CONTACT_ROUTE = "/app/contacts/new/external";

// ── Live refresh ───────────────────────────────────────────────────────────

/** Calls `refresh` every `ms` while the page is visible, and on becoming visible. */
export function useLiveRefresh(refresh: () => void, ms = 60_000): void {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") latest.current(); };
    const timer = window.setInterval(tick, ms);
    const onVisible = () => { if (document.visibilityState === "visible") latest.current(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [ms]);
}

/** The account's own requests, kept current. Null lists while loading or without a backend. */
export function useConnectionLists(): {
  available: boolean; lists: ConnectionLists | null; error: string | null; refresh: () => void;
} {
  const platform = usePlatform();
  const available = contactConnectionsAvailable(platform.currentWorkspace?.id);
  const [lists, setLists] = useState<ConnectionLists | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const refresh = useCallback(() => {
    if (!available) return;
    contactConnectionsService.list()
      .then(next => { if (alive.current) { setLists(next); setError(null); } })
      .catch(() => { if (alive.current) setError("Requests could not be loaded."); });
  }, [available]);
  useEffect(() => { refresh(); }, [refresh]);
  useLiveRefresh(refresh);
  return { available, lists, error, refresh };
}

// ── Avatar ─────────────────────────────────────────────────────────────────

export function PersonAvatar({ name, avatarUrl, size = 44, ring = false }: {
  name: string; avatarUrl?: string | undefined; size?: number; ring?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [avatarUrl]);
  const showImage = !!avatarUrl && !failed;
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: showImage ? "#FFFFFF" : "linear-gradient(160deg, #F1F5F9 0%, #E2E8F0 100%)",
      border: ring ? "3px solid #FFFFFF" : `1px solid ${C.BORDER}`,
      boxShadow: ring ? "0 4px 14px rgba(7,17,31,0.18)" : undefined,
    }}>
      {showImage
        ? <img src={avatarUrl} alt={`${name}'s profile photo`} onError={() => setFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <BlankPersonIcon size={Math.round(size * 0.52)} color="#94A3B8" strokeWidth={1.75}
            aria-label={`${name} has no profile photo`} />}
    </span>
  );
}

// ── Badges ─────────────────────────────────────────────────────────────────

function Pill({ icon: Icon, tone, children, title }: {
  icon: LucideIcon; tone: "success" | "info" | "neutral"; children: React.ReactNode; title?: string;
}) {
  const t = {
    success: { bg: "#ECFDF3", fg: "#166534", border: "#BBF7D0" },
    info: { bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE" },
    neutral: { bg: "#F8FAFC", fg: "#475569", border: "#E2E8F0" },
  }[tone];
  return (
    <span title={title} style={{
      ...C.GF, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700,
      padding: "2px 8px", borderRadius: 999, background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      whiteSpace: "nowrap", lineHeight: 1.5,
    }}>
      <Icon size={12} strokeWidth={2.2} aria-hidden /> {children}
    </span>
  );
}

/** On LAGDA ✓ / Member / External — what stands behind this contact. */
export function AccountBadges({ account, workspaceMember }: {
  account?: ContactAccount | null; workspaceMember?: ContactWorkspaceMember | null;
}) {
  return (
    <>
      {account?.connected && (
        <Pill icon={BadgeCheck} tone="success" title="Connected: you added each other on LAGDA">On LAGDA</Pill>
      )}
      {workspaceMember && <Pill icon={Building2} tone="info" title="A member of this workspace">Workspace member</Pill>}
      {workspaceMember === null && !account?.connected && (
        <Pill icon={Globe} tone="neutral" title="Not linked to a LAGDA account">External</Pill>
      )}
    </>
  );
}

/** An icon, then a value; nothing when the value is empty. */
export function DetailLine({ icon: Icon, children, mono = false, href }: {
  icon: LucideIcon; children: React.ReactNode; mono?: boolean; href?: string;
}) {
  if (children === undefined || children === null || children === "") return null;
  const text = (
    <span style={{ ...(mono ? C.GM : C.GF), fontSize: mono ? 12 : 13, color: C.SLATE, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <Icon size={14} strokeWidth={2} color="#94A3B8" aria-hidden style={{ flexShrink: 0 }} />
      {href ? <a href={href} style={{ minWidth: 0, textDecoration: "none", display: "flex" }}>{text}</a> : text}
    </span>
  );
}

// ── Header and tabs ────────────────────────────────────────────────────────

export type ContactsSection = "all" | "pending" | "requests" | "archived";

export function ContactsSectionNav({ current, pendingCount }: { current: ContactsSection; pendingCount?: number }) {
  const platform = usePlatform();
  const connections = contactConnectionsAvailable(platform.currentWorkspace?.id);
  const items: { key: ContactsSection; label: string; to: string; icon: LucideIcon }[] = [
    { key: "all", label: "All contacts", to: "/app/contacts", icon: Users },
    ...(connections ? [{ key: "pending" as const, label: "Pending", to: PENDING_CONTACTS_ROUTE, icon: Inbox }] : []),
    { key: "requests", label: "Document requests", to: CONTACT_REQUESTS_ROUTE, icon: FileText },
    { key: "archived", label: "Archived", to: ARCHIVED_CONTACTS_ROUTE, icon: Archive },
  ];
  return (
    <TabStrip label="Contacts sections" activeKey={current} className="contacts-viewstrip">
      {items.map(item => {
        const active = item.key === current;
        const Icon = item.icon;
        const count = item.key === "pending" && pendingCount !== undefined && pendingCount > 0 ? pendingCount : null;
        return (
          <Link key={item.key} to={item.to} aria-current={active ? "page" : undefined}
            aria-label={count === null ? undefined : `${item.label}, ${String(count)} waiting`}
            data-testid={`contacts-tab-${item.key}`}
            style={{
              ...C.GF, fontSize: 13, fontWeight: active ? 700 : 600, textDecoration: "none",
              padding: "8px 12px", borderRadius: 9, whiteSpace: "nowrap", minHeight: 38, boxSizing: "border-box",
              display: "inline-flex", alignItems: "center", gap: 7,
              background: active ? C.LIGHT : "transparent",
              color: active ? C.AZURE_TEXT : C.SLATE,
              boxShadow: active ? "inset 0 0 0 1.5px #BAD7F5" : undefined,
            }}>
            <Icon size={15} strokeWidth={2} aria-hidden />
            {item.label}
            {count !== null && (
              <span aria-hidden style={{ ...C.GM, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, padding: "0 5px", boxSizing: "border-box",
                borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: "#FFF8E1", color: "#8A5A00", border: "1px solid #F5D98B" }}>{count}</span>
            )}
          </Link>
        );
      })}
    </TabStrip>
  );
}

export interface HeaderStat { label: string; value: string | number; icon: LucideIcon; tone?: "attention" }

/** The Contacts page header: title, a line on the section, counts, the Find people action, and the tabs. */
export function ContactsHeader({ section, subtitle, stats, pendingCount, action = true }: {
  section: ContactsSection; subtitle: string; stats?: readonly HeaderStat[]; pendingCount?: number; action?: boolean;
}) {
  return (
    <header className="ct-header">
      <div className="ct-header-top">
        <span aria-hidden className="ct-header-icon"><Users size={22} strokeWidth={1.8} /></span>
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <div className="ct-eyebrow">Address book</div>
          <h1 className="ct-title">Contacts</h1>
          <p className="ct-sub">{subtitle}</p>
        </div>
        {action && (
          <Link to={FIND_PEOPLE_ROUTE} className="ct-primary" data-testid="find-people-button">
            <UserSearch size={16} strokeWidth={2.2} aria-hidden /> <span>Find people</span>
          </Link>
        )}
      </div>
      {stats && stats.length > 0 && (
        <ul className="ct-stats" aria-label="Contacts at a glance">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <li key={s.label} className="ct-stat" data-tone={s.tone}>
                <span aria-hidden className="ct-stat-icon"><Icon size={16} strokeWidth={2} /></span>
                <span className="ct-stat-text">
                  <span className="ct-stat-value">{s.value}</span>
                  <span className="ct-stat-label">{s.label}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <ContactsSectionNav current={section} {...(pendingCount === undefined ? {} : { pendingCount })} />
      <style>{HEADER_CSS}</style>
    </header>
  );
}

const HEADER_CSS = `
.ct-header { position: relative; background: #FFFFFF; border-bottom: 1px solid ${C.BORDER}; padding: 22px 24px 12px; }
.ct-header::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, ${C.NAVY} 0%, #0B3A66 45%, ${C.AZURE} 100%); }
.ct-header-top { display: flex; align-items: center; gap: 14px; min-width: 0; margin-bottom: 14px; }
.ct-header-icon { width: 46px; height: 46px; border-radius: 12px; background: ${C.LIGHT}; border: 1.5px solid #BAD7F5; color: ${C.AZURE_TEXT};
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ct-eyebrow { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 600; color: ${C.MUTED}; text-transform: uppercase; letter-spacing: 0.1em; }
.ct-title { font-family: 'Geist', sans-serif; font-size: 22px; font-weight: 800; color: ${C.NAVY}; margin: 2px 0 0; line-height: 1.2; }
.ct-sub { font-family: 'Geist', sans-serif; font-size: 13px; color: ${C.SLATE}; margin: 3px 0 0; line-height: 1.5; max-width: 70ch; }
.ct-primary { flex-shrink: 0; align-self: flex-start; display: inline-flex; align-items: center; gap: 7px; min-height: 42px; padding: 0 18px; border-radius: 10px;
  background: ${C.AZURE}; color: #FFFFFF; font-family: 'Geist', sans-serif; font-size: 14px; font-weight: 700; text-decoration: none;
  box-shadow: 0 6px 16px -8px rgba(0,120,212,0.6); transition: background-color 150ms ease, box-shadow 150ms ease; }
.ct-primary:hover { background: #006CBE; }
.ct-primary:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 2px; }
.ct-stats { list-style: none; margin: 0 0 12px; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; max-width: 760px; }
.ct-stat { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid ${C.BORDER}; border-radius: 12px;
  background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%); min-width: 0; }
.ct-stat-icon { width: 32px; height: 32px; border-radius: 9px; background: ${C.LIGHT}; color: ${C.AZURE_TEXT}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ct-stat[data-tone="attention"] .ct-stat-icon { background: #FFF8E1; color: #8A5A00; }
.ct-stat-text { display: flex; flex-direction: column; min-width: 0; }
.ct-stat-value { font-family: 'Geist Mono', monospace; font-size: 18px; font-weight: 700; color: ${C.NAVY}; line-height: 1.15; }
.ct-stat-label { font-family: 'Geist', sans-serif; font-size: 12px; color: ${C.MUTED}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 767px) {
  .ct-header { padding: 16px 16px 10px; }
  .ct-header-top { flex-wrap: wrap; gap: 12px; }
  .ct-header-icon { width: 40px; height: 40px; border-radius: 10px; }
  .ct-title { font-size: 20px; }
  .ct-primary { width: 100%; justify-content: center; order: 3; }
  .ct-stats { display: flex; overflow-x: auto; scrollbar-width: none; margin: 0 -16px 10px; padding: 0 16px; scroll-snap-type: x proximity; }
  .ct-stats::-webkit-scrollbar { display: none; }
  .ct-stat { flex: 0 0 auto; min-width: 148px; scroll-snap-align: start; }
}
@media (prefers-reduced-motion: reduce) { .ct-primary { transition: none; } }
`;
