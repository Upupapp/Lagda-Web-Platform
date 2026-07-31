// Collaboration Center — one place to see what needs your attention across
// documents you already have access to (Command 34).
//
// The Center never widens access. Every row here passed the same visibility
// resolver used on the document itself, so nothing appears that the viewer could
// not already open, and restricted rows show only that something exists.
//
// This is not an inbox for participants. My Actions stays the only place recipient
// assignments appear.

import { useState } from "react";
import { Link } from "react-router";
import {
  COLLAB_CENTER_VIEW_LABELS,
  COLLAB_CATEGORY_LABELS,
  COLLAB_DEMONSTRATION_NOTICE,
  COLLAB_SCOPE_NOTICE,
  type CollaborationCenterView,
  type CollaborationThreadSummary,
} from "../../../models/collaboration";
import {
  CO,
  COLLABORATION_STYLES,
  CountChip,
  EmptyState,
  ErrorPanel,
  GF,
  Notice,
  Pill,
  PriorityPill,
  RestrictedNotice,
  SectionHeading,
  Skeleton,
  ThreadStatusPill,
  TONES,
  VisibilityPill,
  formatDemonstrationTime,
} from "../../../components/collaboration/CollaborationKit";
import { documentCollaborationService } from "../../../services/mock/document-collaboration.service";
import {
  useCollaborationOverview,
  useCollaborationViewer,
  useCenterThreads,
  useMentions,
} from "../documents/collaboration/useCollaboration";

type ListView = "assigned" | "open" | "blocking" | "resolved" | "owned" | "archived" | "awaiting-my-review";

const VIEW_DESCRIPTIONS: Record<CollaborationCenterView, string> = {
  overview:             "A summary of internal review work across documents you already have access to.",
  assigned:             "Discussions where you are listed as an internal reviewer.",
  mentions:             "Comments where someone mentioned you. A mention is a pointer and never grants access.",
  open:                 "Discussions still under way.",
  blocking:             "Discussions marked as blocking in this demonstration. This enforces nothing in production.",
  "awaiting-my-review": "Documents where your internal review response has not been recorded yet.",
  resolved:             "Discussions resolved in frontend state.",
  owned:                "Discussions you started.",
  archived:             "Discussions kept for reference. Archiving is not deletion.",
};

export function CollaborationCenterPage({ view = "overview" }: { view?: CollaborationCenterView }) {
  // No document context here, so document access is scoped by the service to
  // threads the viewer could already open.
  const { viewer, capabilityAvailable, capabilityReason } = useCollaborationViewer(true, false);
  const overview = useCollaborationOverview(viewer, capabilityAvailable);

  if (!capabilityAvailable) {
    return (
      <div className="co-root">
        <style>{COLLABORATION_STYLES}</style>
        <EmptyState
          title="Collaboration Center is not available"
          body={capabilityReason || "Document Collaboration is not included in the current product profile."}
          actions={<Link to="/app/documents" className="co-btn co-btn-secondary">Go to Documents</Link>}
        />
      </div>
    );
  }

  return (
    <div className="co-root">
      <style>{COLLABORATION_STYLES}</style>
      <div className="co-stack">
        <SectionHeading
          title="Collaboration Center"
          description={VIEW_DESCRIPTIONS[view]}
        />

        <nav aria-label="Collaboration views" className="co-row co-scroll-x" style={{ gap: 8, flexWrap: "nowrap", paddingBottom: 2 }}>
          {(["overview", "assigned", "mentions", "blocking", "resolved"] as CollaborationCenterView[]).map((v) => (
            <Link key={v}
              to={v === "overview" ? "/app/collaboration" : `/app/collaboration/${v}`}
              className={`co-btn co-btn-sm ${v === view ? "co-btn-primary" : "co-btn-secondary"}`}
              aria-current={v === view ? "page" : undefined}>
              {COLLAB_CENTER_VIEW_LABELS[v]}
            </Link>
          ))}
        </nav>

        {view === "overview" && (
          <>
            {overview.state === "loading" && <Skeleton label="Loading collaboration overview" />}
            {overview.state === "error" && (
              <ErrorPanel message={overview.error ?? "The overview could not be loaded."} onRetry={overview.reload} />
            )}
            {overview.state === "ready" && overview.data && (
              <div className="co-row" style={{ gap: 10 }}>
                <CountChip label="Reviews assigned to me" value={overview.data.assignedReviews} tone={TONES.azure} />
                <CountChip label="New mentions" value={overview.data.unviewedMentions} tone={TONES.gold} />
                <CountChip label="Open threads" value={overview.data.openThreads} tone={TONES.neutral} />
                <CountChip label="Blocking in demonstration" value={overview.data.blockingThreads} tone={TONES.error} />
                <CountChip label="Awaiting my review" value={overview.data.awaitingMyReview} tone={TONES.warning} />
                <CountChip label="Recently resolved" value={overview.data.recentlyResolved} tone={TONES.success} />
                <CountChip label="Discussions I started" value={overview.data.ownedDocuments} tone={TONES.muted} />
              </div>
            )}
            <Notice
              tone={TONES.muted}
              text="These counts cover only documents you already have access to. Collaboration never grants access, and nothing here is a participant action or an item in My Actions."
            />
          </>
        )}

        {view === "mentions" && <MentionsView viewer={viewer} />}

        {view !== "overview" && view !== "mentions" && (
          <ThreadListView view={view as ListView} viewer={viewer} />
        )}

        <Notice text={COLLAB_SCOPE_NOTICE} tone={TONES.muted} compact />
        <Notice text={COLLAB_DEMONSTRATION_NOTICE} tone={TONES.neutral} compact />
      </div>
    </div>
  );
}

function ThreadListView({ view, viewer }: { view: ListView; viewer: ReturnType<typeof useCollaborationViewer>["viewer"] }) {
  const { data, state, error, reload } = useCenterThreads(view, viewer, true);
  const rows = data ?? [];

  if (state === "loading") return <Skeleton label="Loading discussions" />;
  if (state === "error") return <ErrorPanel message={error ?? "Discussions could not be loaded."} onRetry={reload} />;
  if (state === "restricted") {
    return <EmptyState title="Not available" body={error ?? "You do not have access to collaboration in this workspace."} />;
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing here right now"
        body="When there is something for you in this view, it will appear here. Only documents you already have access to are included."
        actions={<Link to="/app/documents" className="co-btn co-btn-secondary">Go to Documents</Link>}
      />
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((row) => <li key={String(row.id)}><CenterRow row={row} /></li>)}
    </ul>
  );
}

function CenterRow({ row }: { row: CollaborationThreadSummary }) {
  if (row.restricted) {
    return (
      <div className="co-card" style={{ padding: 16 }}>
        <RestrictedNotice text="A discussion exists here that is not available to you." />
      </div>
    );
  }
  return (
    <Link to={`/app/documents/${row.documentId}/collaboration/${row.id}`} className="co-thread-link co-card"
      style={{ padding: 16, display: "block" }}>
      <div className="co-row" style={{ gap: 8, marginBottom: 8 }}>
        <ThreadStatusPill status={row.status} />
        <PriorityPill priority={row.priority} />
        <VisibilityPill visibility={row.visibility} />
        <Pill label={COLLAB_CATEGORY_LABELS[row.category]} tone={TONES.muted} />
        {row.mentionsCurrentUser && <Pill label="You were mentioned" tone={TONES.gold} strong />}
      </div>
      <h3 className="co-thread-title" style={{ ...GF, margin: "0 0 5px", fontSize: 15, fontWeight: 700, color: CO.navy, lineHeight: 1.45 }}>
        {row.title}
      </h3>
      <p style={{ ...GF, margin: 0, fontSize: 12.5, color: CO.slate5 }}>
        {row.documentLabel} · Updated {formatDemonstrationTime(row.updatedAtDemonstration)}
      </p>
    </Link>
  );
}

function MentionsView({ viewer }: { viewer: ReturnType<typeof useCollaborationViewer>["viewer"] }) {
  const { data, state, error, reload } = useMentions(viewer, true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const rows = data ?? [];

  if (state === "loading") return <Skeleton label="Loading mentions" />;
  if (state === "error") return <ErrorPanel message={error ?? "Mentions could not be loaded."} onRetry={reload} />;
  if (rows.length === 0) {
    return <EmptyState title="No mentions" body="When someone mentions you in an internal discussion, it will appear here." />;
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((m) => {
        const id = String(m.id);
        // A mention whose destination is gone stays visible — the user really was
        // mentioned — but is not a way back into something they cannot open.
        const navigable = !!m.destination;
        const body = (
          <>
            <div className="co-row" style={{ gap: 8, marginBottom: 8 }}>
              <VisibilityPill visibility={m.visibility} />
              {m.status === "unviewed" && <Pill label="New" tone={TONES.gold} strong />}
              {!navigable && <Pill label="Not available" tone={TONES.muted} />}
            </div>
            <h3 className="co-thread-title" style={{ ...GF, margin: "0 0 5px", fontSize: 15, fontWeight: 700, color: CO.navy, lineHeight: 1.45 }}>
              {m.threadTitle}
            </h3>
            <p style={{ ...GF, margin: 0, fontSize: 12.5, color: CO.slate5, lineHeight: 1.6 }}>
              {m.mentionedByDisplayName} mentioned you · {m.documentLabel} · {formatDemonstrationTime(m.createdAtDemonstration)}
            </p>
            {m.unavailableReason && (
              <p style={{ ...GF, margin: "8px 0 0", fontSize: 12.5, color: CO.slate6, lineHeight: 1.6 }}>
                {m.unavailableReason}
              </p>
            )}
          </>
        );

        return (
          <li key={id}>
            {navigable ? (
              <Link to={m.destination as string} className="co-thread-link co-card" style={{ padding: 16, display: "block" }}
                onClick={() => {
                  if (m.status !== "unviewed" || busyId === id) return;
                  setBusyId(id);
                  void documentCollaborationService.markMentionViewed(id, { viewer });
                }}>
                {body}
              </Link>
            ) : (
              <div className="co-card" style={{ padding: 16 }}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Route-level wrappers so each view has its own entry point and its own title.
export const CollaborationCenterOverview  = () => <CollaborationCenterPage view="overview" />;
export const CollaborationCenterAssigned  = () => <CollaborationCenterPage view="assigned" />;
export const CollaborationCenterMentions  = () => <CollaborationCenterPage view="mentions" />;
export const CollaborationCenterBlocking  = () => <CollaborationCenterPage view="blocking" />;
export const CollaborationCenterResolved  = () => <CollaborationCenterPage view="resolved" />;
