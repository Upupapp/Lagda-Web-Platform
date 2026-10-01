// "Invite people" — one button at the lower right, one panel.
//
// Inviting used to be spread over the Workspace's People part: an "Invite
// people" tab (email invitations, and join links behind a switch) and a
// separate "Requests" tab. Now one button — on the Invitations page and on
// People & Teams — opens one panel with three tabs:
//
//   Invite by email   address and role, then Send
//   Join links        single-use links: create, copy, withdraw
//   Requests          people who used a link, waiting for your answer
//
// The button carries the pending-requests count. It sits at the lower right
// and never moves anything else on the page. Only on Business, and only for
// people allowed to invite or to answer requests.

import { useCallback, useEffect, useId, useState } from "react";
import { UserPlus, Mail, Link2, Inbox, X } from "lucide-react";
import { useWorkspaceAccess } from "../../../hooks/useWorkspaceAccess";
import { useWorkspaceAllows } from "../../../hooks/usePlans";
import { useViewport } from "../../../hooks/useViewport";
import { Z } from "../../../utils/z-index";
import { WorkspaceAdminProvider } from "../../../context/WorkspaceAdminContext";
import { listJoinRequests } from "../../../services/real/workspace-join.service";
import { InviteForm } from "../workspace/InvitationsPage";
import { JoinLinksSection } from "../workspace/join/JoinLinksSection";
import { JoinRequestsSection } from "../workspace/join/JoinRequestsSection";

export type PanelTab = "email" | "links" | "requests";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";

/** Who may use the panel, and which of its tabs. */
export function useInvitePeopleAccess(): { email: boolean; links: boolean; requests: boolean; any: boolean } {
  const access = useWorkspaceAccess();
  const business = useWorkspaceAllows("business") === true;
  const email = business && access.can("invitation.create");
  const links = email;
  const requests = business && access.can("membership.role.change");
  return { email, links, requests, any: email || links || requests };
}

export function InvitePeopleToggle({ workspaceId, onChanged, initialTab, openOnArrival = false }: {
  workspaceId: string;
  /** Something was sent, created or decided — the page behind may refresh. */
  onChanged?: () => void;
  initialTab?: PanelTab;
  /** Open straight away (a link to the join links or the requests). */
  openOnArrival?: boolean;
}) {
  const allowed = useInvitePeopleAccess();
  const { isNarrow } = useViewport();
  const [open, setOpen] = useState(openOnArrival);
  const [tab, setTab] = useState<PanelTab>(initialTab ?? "email");
  const [pending, setPending] = useState(0);
  const titleId = useId();

  const refreshPending = useCallback(() => {
    if (!allowed.requests) return;
    listJoinRequests(workspaceId, "pending").then(list => { setPending(list.length); }).catch(() => undefined);
  }, [allowed.requests, workspaceId]);
  useEffect(() => { refreshPending(); }, [refreshPending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!allowed.any) return null;
  const tabs: { id: PanelTab; label: string; icon: typeof Mail; show: boolean; count?: number }[] = [
    { id: "email", label: "Invite by email", icon: Mail, show: allowed.email },
    { id: "links", label: "Join links", icon: Link2, show: allowed.links },
    { id: "requests", label: "Requests", icon: Inbox, show: allowed.requests, count: pending },
  ];
  const visible = tabs.filter(t => t.show);
  const active = visible.some(t => t.id === tab) ? tab : visible[0]!.id;
  const changed = () => { onChanged?.(); refreshPending(); };

  return (
    <>
      <button type="button" data-testid="invite-people-toggle" aria-expanded={open} aria-haspopup="dialog"
        onClick={() => { setOpen(true); }}
        style={{
          ...GF, position: "fixed", right: isNarrow ? 16 : 24, bottom: `calc(${isNarrow ? 16 : 24}px + env(safe-area-inset-bottom, 0px))`,
          zIndex: Z.helpFab, display: "inline-flex", alignItems: "center", gap: 8, minHeight: 48,
          padding: isNarrow ? "12px 16px" : "12px 20px", borderRadius: 999, border: "none", cursor: "pointer",
          background: AZURE, color: "#FFFFFF", fontSize: 13.5, fontWeight: 700, boxShadow: "0 8px 22px -6px rgba(0,120,212,0.55)",
        }}>
        <UserPlus size={17} aria-hidden /> Invite people
        {pending > 0 && (
          <span data-testid="invite-people-pending" aria-label={`${String(pending)} requests waiting`} style={{
            minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "#DC2626", color: "#FFFFFF",
            fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px #FFFFFF",
          }}>{pending}</span>
        )}
      </button>

      {open && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(7,17,31,0.5)", display: "flex",
            justifyContent: isNarrow ? "stretch" : "flex-end", alignItems: isNarrow ? "flex-end" : "stretch" }}>
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="invite-people-panel"
            style={{
              background: "#F8FAFC", width: isNarrow ? "100%" : "min(640px, 100vw)", maxHeight: isNarrow ? "92dvh" : "100dvh",
              height: isNarrow ? "auto" : "100dvh", display: "flex", flexDirection: "column", boxSizing: "border-box",
              borderRadius: isNarrow ? "16px 16px 0 0" : 0, boxShadow: "-12px 0 40px rgba(7,17,31,0.22)",
            }}>
            <div style={{ background: "#FFFFFF", padding: isNarrow ? "16px 16px 0" : "20px 24px 0", borderBottom: "1px solid #E3E8EF" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <h2 id={titleId} style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>Invite people</h2>
                <button type="button" aria-label="Close" onClick={() => { setOpen(false); }}
                  style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #E3E8EF", background: "#FFFFFF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={18} aria-hidden />
                </button>
              </div>
              <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "6px 0 12px", lineHeight: 1.5 }}>
                Invite someone by email, share a single-use join link, or answer the people waiting to join.
              </p>
              <div role="tablist" aria-label="Ways to invite" style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none" }}>
                {visible.map(t => {
                  const on = t.id === active;
                  const Icon = t.icon;
                  return (
                    <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => { setTab(t.id); }}
                      data-testid={`invite-tab-${t.id}`}
                      style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", flexShrink: 0,
                        padding: "10px 14px", minHeight: 44, border: "none", background: "none", cursor: "pointer",
                        borderBottom: `3px solid ${on ? AZURE : "transparent"}`, color: on ? AZURE : SLATE, fontSize: 13.5, fontWeight: on ? 700 : 600 }}>
                      <Icon size={16} aria-hidden /> {t.label}
                      {t.count !== undefined && t.count > 0 && (
                        <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "#DC2626", color: "#FFFFFF", fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{t.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div role="tabpanel" style={{ flex: 1, overflowY: "auto", padding: isNarrow ? 16 : 24 }}>
              {active === "email" && (
                <WorkspaceAdminProvider>
                  <InviteForm onDone={changed} />
                  <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: 0, lineHeight: 1.6 }}>
                    They get an email with a link to join. You can follow it under Invitations › Sent.
                  </p>
                </WorkspaceAdminProvider>
              )}
              {active === "links" && <JoinLinksSection workspaceId={workspaceId} onChanged={changed} flush />}
              {active === "requests" && (
                <JoinRequestsSection workspaceId={workspaceId} onPendingCount={setPending} onDecided={changed} flush />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
