// /app/settings/notifications — which emails LAGDA sends you.
//
// With a backend: GET and PATCH /me/notification-preferences. Each switch
// saves on its own the moment it is flipped: the page shows the new state at
// once, and if the save fails it puts the switch back and says so on that
// row. Demo build: remembered for the visit only.
//
// Emails that carry a code, a link someone must use, or your signed copy are
// always sent. They are listed, locked, with the reason, so nobody goes
// looking for a switch that deliberately does not exist.

import { useEffect, useId, useRef, useState } from "react";
import { Send, Building2, Lock, Mail, CircleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SettingsPage, SSection, Switch, Skeleton, Notice, BTN_SECONDARY, Badge, SET } from "./SettingsShell";
import { notificationPreferencesData, formatDate, IS_LIVE } from "./settings-data";
import type { NotificationPreferenceKey, NotificationPreferences } from "../../../services/real/notification-preferences.service";
import { useWorkspaceAccess } from "../../../hooks/useWorkspaceAccess";

const GF = { fontFamily: SET.FONT };

interface PrefRow { key: NotificationPreferenceKey; label: string; explanation: string; adminOnly?: boolean }
interface PrefGroup { id: string; title: string; icon: LucideIcon; rows: PrefRow[] }

// Only switches that control an email LAGDA actually sends. The API carries
// three more flags (signerActivity, actionReminders, invitations) for emails
// that do not exist yet; they are not shown until those emails do.
const GROUPS: PrefGroup[] = [
  {
    id: "sent", title: "Documents you send", icon: Send,
    rows: [
      { key: "requestCompleted", label: "Signing complete", explanation: "When all signing is complete" },
    ],
  },
  {
    id: "workspace", title: "Your workspace", icon: Building2,
    rows: [
      { key: "workspaceRequests", label: "Join requests", explanation: "When someone asks to join your workspace", adminOnly: true },
    ],
  },
];

const ALWAYS_ON: { label: string; reason: string }[] = [
  { label: "Sign-in and verification codes", reason: "You need them to sign in and to prove it’s you." },
  { label: "Password resets", reason: "Sent only when you ask, so you can always get back in." },
  { label: "Signing invitations", reason: "The link to sign is only in this email." },
  { label: "Signed-copy emails", reason: "Your copy of a completed document, for your records." },
  { label: "Join links and join decisions", reason: "The link to join, or the answer to your request, is only in this email." },
  { label: "Workspace invitations", reason: "Someone invited you; the link to accept is only in this email." },
  { label: "Document upload requests", reason: "Someone asked you for a document; the link to upload is only in this email." },
];

function PreferenceRow({ row, value, pending, error, onToggle, first }: {
  row: PrefRow; value: boolean; pending: boolean; error: boolean; onToggle: (next: boolean) => void; first: boolean;
}) {
  const labelId = useId();
  const descId = useId();
  return (
    <li data-testid={`notif-row-${row.key}`} style={{ padding: "13px 0", borderTop: first ? "none" : `1px solid ${SET.BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div id={labelId} style={{ ...GF, fontSize: 14, fontWeight: 600, color: SET.NAVY }}>{row.label}</div>
          <div id={descId} style={{ ...GF, fontSize: 13, color: SET.SLATE, marginTop: 2, lineHeight: 1.45 }}>{row.explanation}</div>
        </div>
        <Switch checked={value} onChange={onToggle} labelledBy={labelId} describedBy={descId} busy={pending} />
      </div>
      {error && (
        <div role="alert" style={{ ...GF, fontSize: 12.5, color: SET.DANGER, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <CircleAlert size={14} aria-hidden /> That change could not be saved, so the previous setting was kept.
        </div>
      )}
    </li>
  );
}

export function NotificationsPage() {
  const access = useWorkspaceAccess();
  const manager = access.role === "owner" || access.role === "administrator";
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<Set<NotificationPreferenceKey>>(new Set());
  const [errors, setErrors] = useState<Set<NotificationPreferenceKey>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    notificationPreferencesData.get()
      .then(p => { if (!cancelled) setPrefs(p); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [attempt]);

  const toggle = (key: NotificationPreferenceKey, next: boolean) => {
    if (!prefs) return;
    const previous = prefs[key];
    setPrefs(p => (p ? { ...p, [key]: next } : p));
    setPending(s => new Set(s).add(key));
    setErrors(s => { const n = new Set(s); n.delete(key); return n; });
    notificationPreferencesData.set(key, next)
      .then(stored => {
        if (!mounted.current) return;
        // Only this key is taken from the reply, so a second switch flipped
        // while this one was saving keeps its own optimistic value.
        if (stored) setPrefs(p => (p ? { ...p, [key]: stored[key], updatedAt: stored.updatedAt } : p));
      })
      .catch(() => {
        if (!mounted.current) return;
        setPrefs(p => (p ? { ...p, [key]: previous } : p));
        setErrors(s => new Set(s).add(key));
      })
      .finally(() => {
        if (!mounted.current) return;
        setPending(s => { const n = new Set(s); n.delete(key); return n; });
      });
  };

  const heading = {
    title: "Notifications", breadcrumb: "Notifications",
    description: "Choose which emails LAGDA sends you. Each change saves as soon as you make it.",
  };

  if (loadError) return (
    <SettingsPage {...heading}>
      <Notice tone="danger" role="alert">Your notification settings could not be loaded.</Notice>
      <button type="button" onClick={() => { setAttempt(a => a + 1); }} style={BTN_SECONDARY}>Try again</button>
    </SettingsPage>
  );
  if (!prefs) return <SettingsPage {...heading}><Skeleton h={130} mb={16} /><Skeleton h={90} mb={16} /><Skeleton h={130} /></SettingsPage>;

  return (
    <SettingsPage {...heading}>
      {GROUPS.map(group => {
        const rows = group.rows.filter(r => !r.adminOnly || manager);
        if (rows.length === 0) return null;
        return (
          <SSection key={group.id} title={group.title} icon={group.icon}>
            <ul style={{ listStyle: "none", margin: "-13px 0 -13px", padding: 0 }}>
              {rows.map((row, i) => (
                <PreferenceRow key={row.key} row={row} value={prefs[row.key]} first={i === 0}
                  pending={pending.has(row.key)} error={errors.has(row.key)}
                  onToggle={next => { toggle(row.key, next); }} />
              ))}
            </ul>
          </SSection>
        );
      })}

      <SSection title="Always on" icon={Lock} description="These emails are always sent, because they carry something you need.">
        <ul data-testid="notif-always-on" style={{ listStyle: "none", margin: "-12px 0 -12px", padding: 0 }}>
          {ALWAYS_ON.map((item, i) => (
            <li key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "12px 0", borderTop: i === 0 ? "none" : `1px solid ${SET.BORDER}` }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0 }}>
                <Mail size={16} aria-hidden color={SET.SLATE} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...GF, fontSize: 14, fontWeight: 600, color: SET.NAVY }}>{item.label}</div>
                  <div style={{ ...GF, fontSize: 13, color: SET.SLATE, marginTop: 2, lineHeight: 1.45 }}>{item.reason}</div>
                </div>
              </div>
              <Badge tone="neutral" icon={Lock}>Always on</Badge>
            </li>
          ))}
        </ul>
      </SSection>

      <p data-testid="notif-more-note" style={{ ...GF, fontSize: 12.5, color: SET.SLATE, margin: "4px 0 6px" }}>
        More email choices will appear here as LAGDA adds them.
      </p>
      <p style={{ ...GF, fontSize: 12.5, color: SET.SLATE, margin: 0 }}>
        {IS_LIVE
          ? prefs.updatedAt === null ? "You are using the default settings." : `Last changed ${formatDate(prefs.updatedAt, true)}.`
          : "Demo build — these switches are remembered for this visit only."}
      </p>
    </SettingsPage>
  );
}
