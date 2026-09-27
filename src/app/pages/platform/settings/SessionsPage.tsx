// /app/settings/security/sessions — where you are signed in.
//
// With a backend: GET /me/sessions and POST /me/sessions/revoke (one by id,
// or every other session with an empty body). The backend records no device,
// browser, IP address or location for a session, so the list shows only
// what it knows: when each session started, when it was last used and when
// it expires. This device's own session is marked and cannot be revoked
// here — sign out does that. Demo build: fictional sessions, nothing is
// revoked for real.

import { useCallback, useEffect, useState } from "react";
import { Monitor, LogOut, CircleCheck, Info } from "lucide-react";
import { SettingsPage, SSection, Badge, Skeleton, BTN_DANGER, BTN_SECONDARY, Notice, SET } from "./SettingsShell";
import { securityData, formatDate, formatRelative, IS_LIVE } from "./settings-data";
import type { AccountSession } from "../../../services/real/security-settings.service";
import { useConfirm } from "../../../components/platform/ConfirmDialog";
import { ApiError } from "../../../services/api-client";

const GF = { fontFamily: SET.FONT };

export function SessionsPage() {
  const [sessions, setSessions] = useState<AccountSession[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(() => {
    setLoadError(false);
    securityData.listSessions()
      .then(list => { setSessions([...list].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.lastSeenAt - a.lastSeenAt)); })
      .catch(() => { setLoadError(true); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const others = (sessions ?? []).filter(s => !s.isCurrent);

  const revokeOne = async (s: AccountSession) => {
    setBusy(s.sessionId);
    setFeedback(null);
    try {
      await securityData.revokeSession(s.sessionId);
      setSessions(list => (list ?? []).filter(x => x.sessionId !== s.sessionId));
      setFeedback({ tone: "success", text: IS_LIVE ? "That session was signed out." : "Demo build — no session was signed out." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSessions(list => (list ?? []).filter(x => x.sessionId !== s.sessionId));
        setFeedback({ tone: "success", text: "That session had already ended." });
      } else {
        setFeedback({ tone: "danger", text: "That session could not be signed out. Please try again." });
      }
    } finally {
      setBusy(null);
    }
  };

  const revokeOthers = () => {
    confirm({
      title: "Sign out every other session?",
      body: `${others.length === 1 ? "The other session" : `All ${String(others.length)} other sessions`} will be signed out and will need your password to sign in again. You stay signed in on this device.`,
      confirmLabel: "Sign out other sessions",
      destructive: true,
      onConfirm: async () => {
        setBusy("all");
        setFeedback(null);
        try {
          const r = await securityData.revokeOtherSessions();
          setSessions(list => (list ?? []).filter(x => x.isCurrent));
          setFeedback({ tone: "success", text: IS_LIVE
            ? `${String(r.revoked)} session${r.revoked === 1 ? " was" : "s were"} signed out.`
            : "Demo build — no session was signed out." });
        } catch {
          setFeedback({ tone: "danger", text: "The other sessions could not be signed out. Please try again." });
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const heading = { title: "Sessions", breadcrumb: "Security › Sessions", description: "Every browser currently signed in to your account." };

  if (loadError) return (
    <SettingsPage {...heading}>
      <Notice tone="danger" role="alert">Your sessions could not be loaded.</Notice>
      <button type="button" onClick={load} style={BTN_SECONDARY}>Try again</button>
    </SettingsPage>
  );
  if (sessions === null) return <SettingsPage {...heading}><Skeleton h={76} mb={10} /><Skeleton h={76} mb={10} /><Skeleton h={76} /></SettingsPage>;

  return (
    <SettingsPage {...heading}
      actions={others.length > 0 ? (
        <button type="button" onClick={revokeOthers} disabled={busy !== null} style={{ ...BTN_DANGER, opacity: busy ? 0.6 : 1 }}>
          <LogOut size={15} aria-hidden /> Sign out other sessions
        </button>
      ) : undefined}>
      {confirmDialog}
      {feedback && <Notice tone={feedback.tone} icon={feedback.tone === "success" ? CircleCheck : Info} role={feedback.tone === "success" ? "status" : "alert"}>{feedback.text}</Notice>}

      <SSection title={`Signed-in sessions (${String(sessions.length)})`} icon={Monitor}
        description={IS_LIVE ? "LAGDA does not record device names, IP addresses or locations, so sessions are listed by when they were used." : undefined}>
        {sessions.length === 0 ? (
          <p style={{ ...GF, fontSize: 13.5, color: SET.SLATE, margin: 0 }}>No sessions found.</p>
        ) : (
          <ul data-testid="sessions-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {sessions.map((s, i) => (
              <li key={s.sessionId} data-testid="session-row" style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
                padding: "14px 0", borderTop: i === 0 ? "none" : `1px solid ${SET.BORDER}`,
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0, flex: "1 1 260px" }}>
                  <span aria-hidden style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: s.isCurrent ? "#E6F1FB" : "#F1F5F9", color: s.isCurrent ? "#0B4F8A" : SET.SLATE }}>
                    <Monitor size={18} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ ...GF, fontSize: 14, fontWeight: 700, color: SET.NAVY }}>
                        {s.label ?? (s.isCurrent ? "This browser" : `Session started ${formatDate(s.createdAt)}`)}
                      </span>
                      {s.isCurrent && <Badge tone="info" dot>This device</Badge>}
                    </div>
                    <div style={{ ...GF, fontSize: 12.5, color: SET.SLATE, marginTop: 3, lineHeight: 1.5 }}>
                      Last active {formatRelative(s.lastSeenAt)} · Signed in {formatDate(s.createdAt)} · Expires {formatDate(s.expiresAt)}
                    </div>
                  </div>
                </div>
                {!s.isCurrent && (
                  <button type="button" onClick={() => { void revokeOne(s); }} disabled={busy !== null}
                    aria-label={`Sign out session started ${formatDate(s.createdAt)}`}
                    style={{ ...BTN_SECONDARY, minHeight: 36, padding: "6px 14px", fontSize: 13, opacity: busy ? 0.6 : 1 }}>
                    {busy === s.sessionId ? "Signing out…" : "Sign out"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SSection>
    </SettingsPage>
  );
}
