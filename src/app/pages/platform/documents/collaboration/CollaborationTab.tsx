// Collaboration tab — the thread list for one document (Command 34).
//
// Read-first. The list shows what exists, what is blocking, and what needs
// attention, without ever revealing the contents of a thread the viewer may not
// read: a restricted row shows that a discussion exists and nothing more.
//
// This tab creates no Evidence, no transaction Activity, no Verification record,
// and no participant action.

import { useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";
import { MessageSquare, Plus } from "lucide-react";
import type { TxnOutletContext } from "../TransactionDetailPage";
import {
  COLLAB_CATEGORY_LABELS,
  COLLAB_DEMONSTRATION_NOTICE,
  COLLAB_SCOPE_NOTICE,
  COLLAB_SORT_LABELS,
  COLLAB_THREAD_STATUS_LABELS,
  COLLAB_VISIBILITY_LABELS,
  DEFAULT_COLLABORATION_QUERY,
  parseCollaborationSort,
  parseThreadStatus,
  parseVisibility,
  VALID_CATEGORIES,
  VALID_COLLAB_SORTS,
  VALID_COLLAB_VISIBILITIES,
  VALID_THREAD_STATUSES,
  type CollaborationQuery,
  type CollaborationThreadSummary,
} from "../../../../models/collaboration";
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
} from "../../../../components/collaboration/CollaborationKit";
import {
  useCollaborationViewer,
  useDocumentThreads,
  useReviewSummary,
} from "./useCollaboration";

export function CollaborationTab() {
  const { txn, canPrepare } = useOutletContext<TxnOutletContext>();
  const navigate = useNavigate();
  const documentId = txn.id;

  const { viewer, capabilityAvailable, capabilityReason } =
    useCollaborationViewer(true, txn.ownerName === "Ana Reyes");

  const [query, setQuery] = useState<CollaborationQuery>(DEFAULT_COLLABORATION_QUERY);

  const threads = useDocumentThreads(documentId, viewer, capabilityAvailable, query);
  const summary = useReviewSummary(documentId, viewer, capabilityAvailable);

  const rows = threads.data ?? [];
  const counts = summary.data;

  const activeFilters = useMemo(() =>
    (query.q ? 1 : 0) + (query.status !== "all" ? 1 : 0) +
    (query.visibility !== "all" ? 1 : 0) + (query.category !== "all" ? 1 : 0) +
    (query.mentionedMe ? 1 : 0),
  [query]);

  function patch(next: Partial<CollaborationQuery>) {
    setQuery((q) => ({ ...q, ...next }));
  }

  return (
    <div className="co-root">
      <style>{COLLABORATION_STYLES}</style>

      <div className="co-stack">
        <SectionHeading
          title="Internal review and discussion"
          description="Threads, comments, and mentions for people inside this workspace who already have access to this document."
          action={
            <div className="co-row" style={{ gap: 8 }}>
              <Link to={`/app/documents/${documentId}/review`} className="co-btn co-btn-secondary co-btn-sm">
                Internal review
              </Link>
              <button
                type="button"
                className="co-btn co-btn-primary co-btn-sm"
                onClick={() => navigate(`/app/documents/${documentId}/collaboration/new`)}
                disabled={!viewer.permissions.canCreateInternalComments}
                aria-disabled={!viewer.permissions.canCreateInternalComments}
                title={viewer.permissions.canCreateInternalComments
                  ? undefined
                  : "You do not have permission to start a discussion in this workspace."}
              >
                <Plus size={14} aria-hidden /> Start a discussion
              </button>
            </div>
          }
        />

        <Notice text={COLLAB_DEMONSTRATION_NOTICE} tone={TONES.neutral} compact />

        {!capabilityAvailable && (
          <Notice text={capabilityReason || "Document Collaboration is not available in the current product profile."}
            tone={TONES.muted} />
        )}

        {/* Counts. Every number here comes from the one shared summary builder, so
            the tab, the review screen, and the Collaboration Center can never
            disagree about how many threads are blocking. */}
        {counts && (
          <div className="co-row co-scroll-x" style={{ gap: 10, flexWrap: "nowrap", paddingBottom: 2 }}>
            <CountChip label="Open" value={counts.openThreads} tone={TONES.azure}
              active={query.status === "all"} onClick={() => patch({ status: "all" })} />
            <CountChip label="Blocking in demonstration" value={counts.blockingThreads} tone={TONES.error}
              active={query.status === "blocking-demonstration"}
              onClick={() => patch({ status: query.status === "blocking-demonstration" ? "all" : "blocking-demonstration" })} />
            <CountChip label="Needs attention" value={counts.needsAttention} tone={TONES.warning}
              active={query.status === "needs-attention"}
              onClick={() => patch({ status: query.status === "needs-attention" ? "all" : "needs-attention" })} />
            <CountChip label="Resolved" value={counts.resolvedThreads} tone={TONES.success}
              active={query.status === "resolved"}
              onClick={() => patch({ status: query.status === "resolved" ? "all" : "resolved" })} />
            <CountChip label="My mentions" value={counts.myUnviewedMentions} tone={TONES.gold}
              active={query.mentionedMe}
              onClick={() => patch({ mentionedMe: !query.mentionedMe })} />
          </div>
        )}

        {counts && counts.blockingThreads > 0 && (
          <Notice
            tone={TONES.warning}
            text={`${counts.blockingThreads} ${counts.blockingThreads === 1 ? "thread is" : "threads are"} marked as blocking in this demonstration. This affects frontend preparation warnings only. It enforces nothing in production and never blocks a participant action.`}
          />
        )}

        {/* Filters */}
        <div className="co-panel" style={{ padding: 16 }}>
          <div className="co-row" style={{ gap: 10 }}>
            <label className="co-visually-hidden" htmlFor="co-search">Search discussions</label>
            <input
              id="co-search" className="co-input" type="search" value={query.q}
              onChange={(e) => patch({ q: e.target.value.slice(0, 120) })}
              placeholder="Search titles and references"
              style={{ maxWidth: 280 }}
            />
            <label className="co-visually-hidden" htmlFor="co-status">Status</label>
            <select id="co-status" className="co-select" style={{ maxWidth: 210 }}
              value={query.status}
              onChange={(e) => patch({ status: parseThreadStatus(e.target.value) })}>
              <option value="all">All statuses</option>
              {VALID_THREAD_STATUSES.filter((s) => s !== "unavailable").map((s) => (
                <option key={s} value={s}>{COLLAB_THREAD_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <label className="co-visually-hidden" htmlFor="co-visibility">Visibility</label>
            <select id="co-visibility" className="co-select" style={{ maxWidth: 210 }}
              value={query.visibility}
              onChange={(e) => patch({ visibility: parseVisibility(e.target.value) })}>
              <option value="all">All visibility</option>
              {VALID_COLLAB_VISIBILITIES.map((v) => (
                <option key={v} value={v}>{COLLAB_VISIBILITY_LABELS[v]}</option>
              ))}
            </select>
            <label className="co-visually-hidden" htmlFor="co-category">Category</label>
            <select id="co-category" className="co-select" style={{ maxWidth: 220 }}
              value={query.category}
              onChange={(e) => patch({ category: (e.target.value as CollaborationQuery["category"]) })}>
              <option value="all">All categories</option>
              {VALID_CATEGORIES.map((c) => (
                <option key={c} value={c}>{COLLAB_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <label className="co-visually-hidden" htmlFor="co-sort">Sort</label>
            <select id="co-sort" className="co-select" style={{ maxWidth: 200 }}
              value={query.sort}
              onChange={(e) => patch({ sort: parseCollaborationSort(e.target.value) })}>
              {VALID_COLLAB_SORTS.map((s) => (
                <option key={s} value={s}>{COLLAB_SORT_LABELS[s]}</option>
              ))}
            </select>
            {activeFilters > 0 && (
              <button type="button" className="co-btn co-btn-ghost co-btn-sm"
                onClick={() => setQuery(DEFAULT_COLLABORATION_QUERY)}>
                Clear filters ({activeFilters})
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {threads.state === "loading" && <Skeleton label="Loading discussions" />}

        {threads.state === "error" && (
          <ErrorPanel message={threads.error ?? "Discussions could not be loaded."} onRetry={threads.reload} />
        )}

        {threads.state === "restricted" && (
          <EmptyState
            title="Collaboration is not available here"
            body={threads.error ?? capabilityReason ?? "You do not have access to internal discussion on this document."}
          />
        )}

        {threads.state === "ready" && rows.length === 0 && (
          <EmptyState
            title={activeFilters > 0 ? "No discussions match these filters" : "No internal discussion yet"}
            body={activeFilters > 0
              ? "Try clearing the filters to see every discussion you have access to."
              : "Start a thread to raise a question with people inside this workspace. Nothing here is delivered to any participant."}
            actions={activeFilters > 0
              ? <button type="button" className="co-btn co-btn-secondary" onClick={() => setQuery(DEFAULT_COLLABORATION_QUERY)}>Clear filters</button>
              : (
                <button type="button" className="co-btn co-btn-primary"
                  onClick={() => navigate(`/app/documents/${documentId}/collaboration/new`)}
                  disabled={!viewer.permissions.canCreateInternalComments}
                  aria-disabled={!viewer.permissions.canCreateInternalComments}>
                  <Plus size={15} aria-hidden /> Start a discussion
                </button>
              )}
          />
        )}

        {threads.state === "ready" && rows.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((row) => (
              <li key={String(row.id)}>
                <ThreadRow row={row} documentId={documentId} />
              </li>
            ))}
          </ul>
        )}

        <Notice text={COLLAB_SCOPE_NOTICE} tone={TONES.muted} compact />

        {!canPrepare && (
          <Notice
            tone={TONES.muted}
            compact
            text="You can read internal discussion here. Preparing or changing this document requires the preparation permission."
          />
        )}
      </div>
    </div>
  );
}

function ThreadRow({ row, documentId }: { row: CollaborationThreadSummary; documentId: string }) {
  // A restricted row is rendered as a non-link. There is nothing to open, so there
  // is no control suggesting otherwise.
  if (row.restricted) {
    return (
      <div className="co-card" style={{ padding: 16 }}>
        <RestrictedNotice text="A discussion exists here that is not available to you. Ask the document owner if you need access." />
      </div>
    );
  }

  return (
    <Link to={`/app/documents/${documentId}/collaboration/${row.id}`} className="co-thread-link co-card"
      style={{ padding: 16, display: "block" }}>
      <div className="co-row" style={{ gap: 8, marginBottom: 8 }}>
        <ThreadStatusPill status={row.status} />
        <PriorityPill priority={row.priority} />
        <VisibilityPill visibility={row.visibility} />
        <Pill label={COLLAB_CATEGORY_LABELS[row.category]} tone={TONES.muted} />
        {row.mentionsCurrentUser && <Pill label="You were mentioned" tone={TONES.gold} strong />}
      </div>

      <h3 className="co-thread-title" style={{ ...GF, margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: CO.navy, lineHeight: 1.45 }}>
        {row.title}
      </h3>

      <div className="co-row" style={{ gap: 14, rowGap: 4 }}>
        <span style={{ ...GF, fontSize: 12.5, color: CO.slate5 }}>Refers to {row.anchorLabel}</span>
        <span className="co-row" style={{ gap: 5, fontSize: 12.5, color: CO.slate5, ...GF }}>
          <MessageSquare size={13} aria-hidden />
          {row.replyCount} {row.replyCount === 1 ? "reply" : "replies"}
        </span>
        <span style={{ ...GF, fontSize: 12.5, color: CO.slate5 }}>
          Updated {formatDemonstrationTime(row.updatedAtDemonstration)}
        </span>
      </div>
    </Link>
  );
}
