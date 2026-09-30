// Invitations — the workspace invitations addressed to this account.
//
//   /app/invitations?status=pending|declined|accepted[&invitation=<id>]
//
//   Pending   Accept (files a join request the workspace owner approves) or
//             Reject (a required reason, 1–500 characters).
//   Rejected  The reason given, and "Withdraw rejection" (back to Pending).
//   Accepted  Read-only: "Waiting for approval" until the account is a
//             member of that workspace, then "Joined".
//
// The tabs say "Rejected"; the wire and the URL say `declined` (the
// backend's word). `?status=rejected` is accepted as an alias so a
// hand-typed link still lands on the right tab.

import { JoinNeedsPersonalNotice } from "../../../components/platform/PlanGate";
import { useMyPlan } from "../../../hooks/usePlans";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Check, X, Undo2, Inbox, Ban, CircleCheck, Mail } from "lucide-react";
import { AppContent, EmptyStateLayout, PageHeader, SkeletonBlock } from "../../../components/platform";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { usePlatform } from "../../../context/PlatformContext";
import { SharingNotice, SmallButton } from "../../../components/document-sharing/SharingPrimitives";
import { SharingTabs, SHARING_STYLES, panelId, tabId } from "../shared-documents/SharingTabs";
import { publishPendingInvitationCount } from "../../../hooks/usePendingInvitationCount";
import {
  ACCEPTED_NOTICE, invitationErrorMessage, isInvitationExpired, myInvitationsAvailable, myInvitationsService,
  type MyInvitation, type MyInvitationStatus,
} from "../../../services/real/my-invitations.service";
import { InvitationLetter, INVITATION_STYLES, invitationSubject } from "./InvitationLetter";
import { DeclineInvitationDialog } from "./DeclineInvitationDialog";

const PREFIX = "invitations";

type Lists = Record<MyInvitationStatus, MyInvitation[]>;
const EMPTY: Lists = { pending: [], declined: [], accepted: [] };

function statusFromParam(raw: string | null): MyInvitationStatus {
  if (raw === "declined" || raw === "rejected") return "declined";
  if (raw === "accepted") return "accepted";
  return "pending";
}

export function MyInvitationsPage() {
  usePageMeta();
  const [params, setParams] = useSearchParams();
  const status = statusFromParam(params.get("status"));
  const focusId = params.get("invitation");
  const platform = usePlatform();
  const memberOf = new Set((platform.workspaces ?? []).map(w => w.id));

  const [lists, setLists] = useState<Lists>(EMPTY);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declining, setDeclining] = useState<MyInvitation | null>(null);
  // Only the newest load may write: an action's quiet reload can overlap the
  // first load, and a slower, older answer must not overwrite a newer one.
  const loadSeq = useRef(0);
  const scrolledTo = useRef<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    const seq = ++loadSeq.current;
    if (!quiet) setState("loading");
    try {
      const [pending, declined, accepted] = await Promise.all([
        myInvitationsService.list("pending"),
        myInvitationsService.list("declined"),
        myInvitationsService.list("accepted"),
      ]);
      if (seq !== loadSeq.current) return;
      setLists({ pending, declined, accepted });
      setState("ready");
      publishPendingInvitationCount(pending.length);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setLoadError(invitationErrorMessage(err, "load"));
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (!myInvitationsAvailable()) return;
    void load();
    return () => { loadSeq.current += 1; };
  }, [load]);

  // A notice link (?invitation=<id>) scrolls its letter into view once.
  useEffect(() => {
    if (state !== "ready" || focusId === null || scrolledTo.current === focusId) return;
    const el = document.getElementById(`invitation-${focusId}`);
    if (el === null) return;
    scrolledTo.current = focusId;
    if (typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state, focusId, status]);

  const setStatus = (next: MyInvitationStatus) => {
    setParams(prev => {
      const out = new URLSearchParams(prev);
      out.set("status", next);
      out.delete("invitation");
      return out;
    }, { replace: true });
  };

  // 093. Joining another workspace is part of Personal (the person's own plan).
  const { plan: myPlan } = useMyPlan();
  const mayJoin = myPlan === null || myPlan.plan !== "free";

  async function act(item: MyInvitation, verb: "accept" | "withdraw") {
    setBusyId(item.invitationId);
    setNotice(null);
    try {
      let text: string;
      if (verb === "accept") {
        const result = await myInvitationsService.accept(item.invitationId);
        // `pending: false` only when the account was already a member.
        text = result.pending === false
          ? `You are already a member of ${item.workspaceName}.`
          : `${ACCEPTED_NOTICE} “${item.workspaceName}” is now under Accepted.`;
      } else {
        await myInvitationsService.withdrawDecline(item.invitationId);
        text = `The rejection was withdrawn. The invitation to ${item.workspaceName} is back under Pending.`;
      }
      setNotice({ tone: "success", text });
      await load(true);
    } catch (err) {
      setNotice({ tone: "error", text: invitationErrorMessage(err, verb) });
      // A 409 means it changed underneath us; show the truth.
      void load(true);
    } finally {
      setBusyId(null);
    }
  }

  const ready = state === "ready";
  const tabs = [
    { id: "pending" as const, label: "Pending", count: ready ? lists.pending.length : null, icon: Inbox },
    { id: "declined" as const, label: "Rejected", count: ready ? lists.declined.length : null, icon: Ban },
    { id: "accepted" as const, label: "Accepted", count: ready ? lists.accepted.length : null, icon: CircleCheck },
  ];

  const items = lists[status];
  const anyBusy = busyId !== null;

  function actionsFor(item: MyInvitation) {
    const subject = invitationSubject(item);
    if (item.status === "pending") {
      if (isInvitationExpired(item)) return null;
      return <>
        <SmallButton icon={X} label="Reject" variant="danger" disabled={anyBusy}
          ariaLabel={`Reject: ${subject}`} onClick={() => { setNotice(null); setDeclining(item); }} />
        <SmallButton icon={Check} label={busyId === item.invitationId ? "Accepting…" : "Accept"} variant="primary" disabled={anyBusy || !mayJoin}
          ariaLabel={`Accept: ${subject}`} onClick={() => { void act(item, "accept"); }} />
      </>;
    }
    if (item.status === "declined") {
      return (
        <SmallButton icon={Undo2} label={busyId === item.invitationId ? "Withdrawing…" : "Withdraw rejection"} disabled={anyBusy}
          ariaLabel={`Withdraw rejection: ${subject}`} onClick={() => { void act(item, "withdraw"); }} />
      );
    }
    return null;
  }

  const empty = {
    pending: { icon: <Inbox size={26} />, title: "No invitations waiting", description: "When a workspace invites your email address to join, the invitation appears here for you to accept or reject." },
    declined: { icon: <Ban size={26} />, title: "No rejected invitations", description: "Invitations you reject are kept here with your reason, so you can change your mind while they are still valid." },
    accepted: { icon: <CircleCheck size={26} />, title: "No accepted invitations", description: "When you accept an invitation, it is listed here while the workspace owner approves your access." },
  }[status];

  return (
    <div style={{ minWidth: 0, overflowX: "hidden" }}>
      <PageHeader title="Invitations"
        description="Invitations to join other LAGDA workspaces, sent to your email address. Accepting sends a request that the workspace owner approves." />
      <AppContent style={{ padding: "16px clamp(12px, 3vw, 24px) 40px", boxSizing: "border-box", minWidth: 0 }}>
        <style>{SHARING_STYLES}{INVITATION_STYLES}</style>
        {!myInvitationsAvailable() ? (
          <EmptyStateLayout icon={<Mail size={26} />} title="Invitations need a connected LAGDA account"
            description="Workspace invitations are sent to real accounts. They are not available in this demonstration." />
        ) : (
          <>
            {!mayJoin && <JoinNeedsPersonalNotice />}
            <SharingTabs label="Invitations by status" idPrefix={PREFIX} active={status} tabs={tabs} onChange={setStatus} />
            <div aria-live="polite" style={{ marginBottom: notice ? 14 : 0 }}>
              {notice && <SharingNotice tone={notice.tone}>{notice.text}</SharingNotice>}
            </div>
            <div role="tabpanel" id={panelId(PREFIX, status)} aria-labelledby={tabId(PREFIX, status)} style={{ minWidth: 0 }}>
              {state === "loading" && <div role="status" aria-label="Loading invitations"><SkeletonBlock height={180} /></div>}
              {state === "error" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
                  <SharingNotice tone="error">{loadError}</SharingNotice>
                  <SmallButton label="Try again" onClick={() => { void load(); }} />
                </div>
              )}
              {ready && (items.length === 0 ? (
                <EmptyStateLayout icon={empty.icon} title={empty.title} description={empty.description} />
              ) : (
                <ul className="inv-grid" aria-label={`${tabs.find(t => t.id === status)?.label ?? ""} invitations`}>
                  {items.map(item => (
                    <InvitationLetter key={item.invitationId} item={item} joined={memberOf.has(item.workspaceId)}
                      highlighted={focusId === item.invitationId}>
                      {actionsFor(item)}
                    </InvitationLetter>
                  ))}
                </ul>
              ))}
            </div>
          </>
        )}
      </AppContent>

      {declining && (
        <DeclineInvitationDialog item={declining} onClose={() => setDeclining(null)}
          onDeclined={() => {
            setNotice({ tone: "success", text: `You rejected the invitation to ${declining.workspaceName}. It is listed under Rejected with your reason.` });
            void load(true);
          }} />
      )}
    </div>
  );
}
