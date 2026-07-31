// Collaboration thread detail and thread creation (Command 34).
//
// Comments are PLAIN TEXT throughout. They are typed into a plain <textarea>, sent
// as plain text, and rendered as plain text through React's normal escaping.
// There is no rich-text editor, no Markdown renderer, no attachment control, and
// `dangerouslySetInnerHTML` appears nowhere in this feature.
//
// Nothing on these screens sends an email, an SMS message, a push notification, a
// participant message, or a recipient invitation.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import type { TxnOutletContext } from "../TransactionDetailPage";
import {
  COLLAB_BLOCKING_NOTICE,
  COLLAB_CATEGORY_LABELS,
  COLLAB_COMMENT_MAX,
  COLLAB_DEMONSTRATION_NOTICE,
  COLLAB_MAX_MENTIONS,
  COLLAB_NOTE_MAX,
  COLLAB_PERSONAL_NOTE_NOTICE,
  COLLAB_PRIORITY_LABELS,
  COLLAB_SUMMARY_MAX,
  COLLAB_TITLE_MAX,
  COLLAB_VISIBILITY_DESCRIPTIONS,
  COLLAB_VISIBILITY_LABELS,
  COMMENT_STATUS_LABELS,
  DEFAULT_COLLAB_VISIBILITY,
  VALID_ANCHOR_TYPES,
  VALID_CATEGORIES,
  VALID_COLLAB_VISIBILITIES,
  VALID_PRIORITIES,
  COLLAB_ANCHOR_TYPE_LABELS,
  collabAnchorId,
  type CollaborationAnchorType,
  type CollaborationComment,
  type CollaborationMentionTarget,
  type CollaborationThread,
  type CollaborationThreadCategory,
  type CollaborationThreadPriority,
  type CollaborationVisibility,
} from "../../../../models/collaboration";
import {
  AnchorReference,
  AuthorAvatar,
  CO,
  COLLABORATION_STYLES,
  EmptyState,
  ErrorPanel,
  GF,
  Notice,
  Pill,
  PriorityPill,
  SectionHeading,
  Skeleton,
  ThreadStatusPill,
  TONES,
  VisibilityPill,
  formatDemonstrationTime,
  useAnnouncer,
  useCollaborationConfirm,
} from "../../../../components/collaboration/CollaborationKit";
import { documentCollaborationService } from "../../../../services/mock/document-collaboration.service";
import { resolveThreadActions } from "../../../../services/collaboration.resolver";
import type { CollaborationViewer } from "../../../../services/collaboration.resolver";
import { useCollaborationViewer, useThread } from "./useCollaboration";

// ══════════════════════════════════════════════════════════════════════════════
// Thread details
// ══════════════════════════════════════════════════════════════════════════════

export function CollaborationThreadPage() {
  const { txn } = useOutletContext<TxnOutletContext>();
  const { threadId = "" } = useParams();
  const navigate = useNavigate();
  const documentId = txn.id;

  const { viewer, capabilityAvailable } = useCollaborationViewer(true, txn.ownerName === "Ana Reyes");
  const { data, state, error, reload } = useThread(threadId, viewer, capabilityAvailable);
  const { announce, announcerNode } = useAnnouncer();
  const { confirm, confirmDialog } = useCollaborationConfirm();

  const [reply, setReply] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveSummary, setResolveSummary] = useState("");

  const thread = data?.thread ?? null;
  const comments = data?.comments ?? [];

  const actions = useMemo(
    () => (thread ? resolveThreadActions(thread, viewer) : null),
    [thread, viewer],
  );

  const back = `/app/documents/${documentId}/collaboration`;

  async function run(label: string, fn: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(true);
    setActionError(null);
    const result = await fn();
    setBusy(false);
    if (result.ok) {
      announce(label);
      reload();
    } else {
      setActionError(result.message ?? "That action could not be completed.");
    }
  }

  if (state === "loading") {
    return <div className="co-root"><style>{COLLABORATION_STYLES}</style><Skeleton label="Loading discussion" /></div>;
  }

  if (state === "not-found" || (state === "ready" && !thread)) {
    return (
      <div className="co-root">
        <style>{COLLABORATION_STYLES}</style>
        <EmptyState
          title="This discussion is not available"
          body="It may have been removed, or it may not exist on this document."
          actions={<Link to={back} className="co-btn co-btn-secondary">Back to discussions</Link>}
        />
      </div>
    );
  }

  if (state === "restricted") {
    return (
      <div className="co-root">
        <style>{COLLABORATION_STYLES}</style>
        <EmptyState
          title="This discussion is not available to you"
          body={error ?? "Ask the document owner if you need access. Collaboration never grants access to a document on its own."}
          actions={<Link to={back} className="co-btn co-btn-secondary">Back to discussions</Link>}
        />
      </div>
    );
  }

  if (state === "error" || !thread || !actions) {
    return (
      <div className="co-root">
        <style>{COLLABORATION_STYLES}</style>
        <ErrorPanel message={error ?? "This discussion could not be loaded."} onRetry={reload} />
      </div>
    );
  }

  const isPersonal = thread.visibility === "personal-draft-note";
  const maxLength = isPersonal ? COLLAB_NOTE_MAX : COLLAB_COMMENT_MAX;
  const composerAction = isPersonal ? actions["create-comment"] : actions["reply-to-thread"];

  return (
    <div className="co-root">
      <style>{COLLABORATION_STYLES}</style>
      {announcerNode}
      {confirmDialog}

      <div className="co-stack">
        <Link to={back} className="co-btn co-btn-ghost co-btn-sm" style={{ alignSelf: "flex-start", paddingLeft: 8 }}>
          <ArrowLeft size={14} aria-hidden /> All discussions
        </Link>

        <div className="co-panel">
          <div className="co-row" style={{ gap: 8, marginBottom: 10 }}>
            <ThreadStatusPill status={thread.status} />
            <PriorityPill priority={thread.priority} />
            <VisibilityPill visibility={thread.visibility} />
            <Pill label={COLLAB_CATEGORY_LABELS[thread.category]} tone={TONES.muted} />
          </div>

          <h1 style={{ ...GF, margin: "0 0 10px", fontSize: 20, fontWeight: 700, color: CO.navy, lineHeight: 1.35 }}>
            {thread.title}
          </h1>

          <p style={{ ...GF, margin: "0 0 12px", fontSize: 13, color: CO.slate5 }}>
            Started by {thread.createdByDisplayName} · {formatDemonstrationTime(thread.createdAtDemonstration)}
          </p>

          <AnchorReference anchor={thread.anchor} onNavigate={(d) => navigate(d)} />

          {isPersonal && (
            <div style={{ marginTop: 14 }}>
              <Notice text={COLLAB_PERSONAL_NOTE_NOTICE} tone={TONES.muted} />
            </div>
          )}

          {thread.visibility === "participant-visible" && (
            <div style={{ marginTop: 14 }}>
              <Notice
                tone={TONES.gold}
                text="This thread is marked Participant Visible. Nothing here has been delivered to any participant, and no recipient session, invitation, email, SMS message, or push notification was created."
              />
            </div>
          )}

          {thread.status === "blocking-demonstration" && thread.blockingReason && (
            <div style={{ marginTop: 14 }} className="co-stack">
              <Notice tone={TONES.error} text={`Marked as blocking by ${thread.blockingSetByDisplayName ?? "a reviewer"}: ${thread.blockingReason}`} />
              <Notice tone={TONES.muted} compact text={COLLAB_BLOCKING_NOTICE} />
            </div>
          )}

          {thread.resolution && (
            <div style={{ marginTop: 14 }}>
              <div className="co-panel" style={{ background: CO.successBg, borderColor: CO.successBorder, padding: 14 }}>
                <p style={{ ...GF, margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: CO.successText }}>
                  Resolved in frontend state
                </p>
                <p className="co-body" style={{ color: CO.successText }}>{thread.resolution.summary}</p>
                <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: CO.successText }}>
                  {thread.resolution.resolvedByDisplayName} · {formatDemonstrationTime(thread.resolution.resolvedAtDemonstration)}
                </p>
                <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: CO.slate6, lineHeight: 1.6 }}>
                  Resolving a discussion does not complete the transaction and is not proof that review occurred.
                </p>
              </div>
            </div>
          )}

          {/* Prior resolutions are kept when a thread is reopened, so the record of
              an earlier resolution is never quietly erased. */}
          {thread.priorResolutions.length > 0 && (
            <details style={{ marginTop: 14 }}>
              <summary style={{ ...GF, fontSize: 13, color: CO.slate6, cursor: "pointer", minHeight: 32, display: "flex", alignItems: "center" }}>
                Earlier resolutions ({thread.priorResolutions.length})
              </summary>
              <div className="co-stack" style={{ gap: 10, marginTop: 10 }}>
                {thread.priorResolutions.map((r, i) => (
                  <div key={i} className="co-card" style={{ padding: 12, background: CO.slate0 }}>
                    <p className="co-body" style={{ fontSize: 13 }}>{r.summary}</p>
                    <p style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: CO.slate5 }}>
                      {r.resolvedByDisplayName} · {formatDemonstrationTime(r.resolvedAtDemonstration)}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Thread actions. Every unavailable control keeps its reason as a title so
            nothing is ever silently disabled. */}
        <div className="co-row" style={{ gap: 8 }}>
          {!thread.resolution && (
            <button type="button" className="co-btn co-btn-secondary co-btn-sm"
              disabled={!actions["resolve-thread"].available || busy}
              aria-disabled={!actions["resolve-thread"].available}
              title={actions["resolve-thread"].reason ?? undefined}
              onClick={() => setResolveOpen((v) => !v)}>
              <Check size={14} aria-hidden /> Resolve
            </button>
          )}
          {thread.status === "resolved" && (
            <button type="button" className="co-btn co-btn-secondary co-btn-sm"
              disabled={!actions["reopen-thread"].available || busy}
              aria-disabled={!actions["reopen-thread"].available}
              title={actions["reopen-thread"].reason ?? undefined}
              onClick={() => run("Discussion reopened.", () =>
                documentCollaborationService.reopenThread({ threadId }, { viewer }))}>
              Reopen
            </button>
          )}
          {thread.status !== "blocking-demonstration" ? (
            <button type="button" className="co-btn co-btn-secondary co-btn-sm"
              disabled={!actions["mark-blocking-demonstration"].available || busy}
              aria-disabled={!actions["mark-blocking-demonstration"].available}
              title={actions["mark-blocking-demonstration"].reason ?? undefined}
              onClick={() => confirm({
                title: "Mark as blocking in this demonstration?",
                body: COLLAB_BLOCKING_NOTICE,
                confirmLabel: "Mark as blocking",
                onConfirm: () => void run("Marked as blocking in this demonstration.", () =>
                  documentCollaborationService.setBlocking({
                    threadId, blocking: true,
                    reason: "Internal check requested before preparation continues.",
                  }, { viewer })),
              })}>
              Mark as blocking
            </button>
          ) : (
            <button type="button" className="co-btn co-btn-secondary co-btn-sm"
              disabled={!actions["remove-blocking-demonstration"].available || busy}
              aria-disabled={!actions["remove-blocking-demonstration"].available}
              title={actions["remove-blocking-demonstration"].reason ?? undefined}
              onClick={() => run("Blocking marker removed.", () =>
                documentCollaborationService.setBlocking({ threadId, blocking: false, reason: "" }, { viewer }))}>
              Remove blocking
            </button>
          )}
          {thread.status !== "archived" ? (
            <button type="button" className="co-btn co-btn-ghost co-btn-sm"
              disabled={!actions["archive-thread"].available || busy}
              aria-disabled={!actions["archive-thread"].available}
              title={actions["archive-thread"].reason ?? undefined}
              onClick={() => confirm({
                title: "Archive this discussion?",
                body: "Archiving keeps the discussion for reference. It is not deletion, and nothing is removed.",
                confirmLabel: "Archive",
                onConfirm: () => void run("Discussion archived.", () =>
                  documentCollaborationService.setArchived({ threadId, archived: true }, { viewer })),
              })}>
              Archive
            </button>
          ) : (
            <button type="button" className="co-btn co-btn-ghost co-btn-sm"
              disabled={!actions["restore-thread"].available || busy}
              aria-disabled={!actions["restore-thread"].available}
              title={actions["restore-thread"].reason ?? undefined}
              onClick={() => run("Discussion restored.", () =>
                documentCollaborationService.setArchived({ threadId, archived: false }, { viewer }))}>
              Restore
            </button>
          )}
        </div>

        {actionError && <ErrorPanel message={actionError} />}

        {resolveOpen && (
          <div className="co-panel">
            <SectionHeading level={3} title="Record a resolution"
              description="Say what was decided. This is frontend state only and is not proof that review occurred." />
            <label className="co-visually-hidden" htmlFor="co-resolve">Resolution summary</label>
            <textarea id="co-resolve" className="co-textarea" value={resolveSummary} maxLength={COLLAB_SUMMARY_MAX}
              onChange={(e) => setResolveSummary(e.target.value)}
              placeholder="What was decided, and what happens next?" />
            <div className="co-row" style={{ justifyContent: "space-between", marginTop: 10 }}>
              <span style={{ ...GF, fontSize: 12, color: CO.slate5 }}>
                {resolveSummary.length} / {COLLAB_SUMMARY_MAX}
              </span>
              <div className="co-row" style={{ gap: 8 }}>
                <button type="button" className="co-btn co-btn-secondary co-btn-sm" onClick={() => setResolveOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="co-btn co-btn-primary co-btn-sm"
                  disabled={busy || resolveSummary.trim().length === 0}
                  onClick={async () => {
                    await run("Discussion resolved in frontend state.", () =>
                      documentCollaborationService.resolveThread({ threadId, summary: resolveSummary }, { viewer }));
                    setResolveOpen(false);
                    setResolveSummary("");
                  }}>
                  Record resolution
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="co-panel">
          <SectionHeading level={3} title={`Comments (${comments.length})`} />
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {comments.map((c) => (
              <li key={String(c.id)}>
                <CommentRow
                  comment={c}
                  canRemove={
                    (c.authoredByCurrentUser && actions["remove-own-comment-demonstration"].available) ||
                    (!c.authoredByCurrentUser && actions["moderate-comment"].available)
                  }
                  onRemove={() => confirm({
                    title: "Remove this comment from the demonstration?",
                    body: "The text is cleared from frontend state and is not shown again. This is a demonstration action and removes nothing from a production system.",
                    confirmLabel: "Remove comment",
                    destructive: true,
                    onConfirm: () => void run("Comment removed from the demonstration.", () =>
                      documentCollaborationService.removeComment({ threadId, commentId: String(c.id) }, { viewer })),
                  })}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Composer */}
        <div className="co-panel">
          <SectionHeading level={3}
            title={isPersonal ? "Add to your note" : "Reply"}
            description={isPersonal
              ? "Only you can see this note. It creates no notification and cannot mention anyone."
              : "Plain text only. Nothing here is delivered by email, SMS, or push notification."} />

          {!composerAction.available ? (
            <Notice text={composerAction.reason ?? "You cannot add to this discussion."} tone={TONES.muted} />
          ) : (
            <>
              <label className="co-visually-hidden" htmlFor="co-reply">Your comment</label>
              <textarea id="co-reply" className="co-textarea" value={reply} maxLength={maxLength}
                onChange={(e) => setReply(e.target.value)}
                placeholder={isPersonal ? "A note only you can see" : "Add to the discussion"} />

              {!isPersonal && actions["mention-member"].available && (
                <div style={{ marginTop: 12 }}>
                  <MentionPicker
                    documentId={documentId}
                    threadId={threadId}
                    visibility={thread.visibility}
                    teamId={thread.teamId}
                    selected={mentions}
                    onChange={setMentions}
                    viewer={viewer}
                  />
                </div>
              )}

              <div className="co-row" style={{ justifyContent: "space-between", marginTop: 12 }}>
                <span style={{ ...GF, fontSize: 12, color: CO.slate5 }}>{reply.length} / {maxLength}</span>
                <button type="button" className="co-btn co-btn-primary co-btn-sm"
                  disabled={busy || reply.trim().length === 0}
                  onClick={async () => {
                    await run("Comment added in this frontend demonstration.", () =>
                      documentCollaborationService.addComment({ threadId, body: reply, mentionedMemberIds: mentions }, { viewer }));
                    setReply("");
                    setMentions([]);
                  }}>
                  {isPersonal ? "Add to note" : "Post comment"}
                </button>
              </div>
            </>
          )}
        </div>

        <Notice text={COLLAB_DEMONSTRATION_NOTICE} tone={TONES.neutral} compact />
      </div>
    </div>
  );
}

function CommentRow({ comment, canRemove, onRemove }: {
  comment: CollaborationComment; canRemove: boolean; onRemove: () => void;
}) {
  const removed = comment.status === "removed-in-demonstration";
  return (
    <article className="co-row" style={{ gap: 12, alignItems: "flex-start", flexWrap: "nowrap" }}>
      <AuthorAvatar name={comment.author.redacted ? "?" : comment.author.displayName} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="co-row" style={{ gap: 8, marginBottom: 4 }}>
          <span style={{ ...GF, fontSize: 13.5, fontWeight: 700, color: CO.navy }}>
            {comment.author.redacted ? "Workspace member" : comment.author.displayName}
          </span>
          <span style={{ ...GF, fontSize: 12, color: CO.slate5 }}>{comment.author.roleLabel}</span>
          <span style={{ ...GF, fontSize: 12, color: CO.slate4 }}>
            {formatDemonstrationTime(comment.createdAtDemonstration)}
          </span>
          {comment.status === "edited" && <Pill label={COMMENT_STATUS_LABELS.edited} tone={TONES.muted} />}
        </div>

        {removed ? (
          <p style={{ ...GF, margin: 0, fontSize: 13, color: CO.slate5, fontStyle: "italic" }}>
            This comment was removed from the demonstration. Removed content is not shown.
          </p>
        ) : (
          // Plain text. React escapes this; no markup is ever interpreted.
          <p className="co-body">{comment.body}</p>
        )}

        {!removed && comment.mentionedMemberIds.length > 0 && (
          <p style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: CO.slate5 }}>
            {comment.mentionedMemberIds.length} {comment.mentionedMemberIds.length === 1 ? "member" : "members"} mentioned.
            Mentioning someone does not grant access, and no message was delivered.
          </p>
        )}
      </div>

      {canRemove && !removed && (
        <button type="button" className="co-btn co-btn-ghost co-btn-sm" onClick={onRemove}
          aria-label="Remove this comment from the demonstration" style={{ flexShrink: 0 }}>
          <Trash2 size={14} aria-hidden />
        </button>
      )}
    </article>
  );
}

// ── Mention picker ────────────────────────────────────────────────────────────
//
// Only members who ALREADY have access to this document appear. Everyone else is
// reported as a count, never by name — listing them would leak Workspace membership
// to someone not entitled to see it. Contacts never appear: a Contact is a
// directory entry, not a Workspace Member.

function MentionPicker({ documentId, threadId, visibility, teamId, selected, onChange, viewer }: {
  documentId: string;
  threadId?: string;
  visibility: CollaborationVisibility;
  teamId: string | null;
  selected: string[];
  onChange: (ids: string[]) => void;
  viewer: CollaborationViewer;
}) {
  const [eligible, setEligible] = useState<CollaborationMentionTarget[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    documentCollaborationService
      .getMentionEligibility({ documentId, visibility, teamId, threadId }, { viewer })
      .then((r) => {
        if (!live) return;
        setLoading(false);
        if (r.ok) { setEligible(r.data.eligible); setNotice(r.data.notice); }
        else { setEligible([]); setNotice(r.message); }
      });
    return () => { live = false; };
  }, [documentId, threadId, visibility, teamId, viewer]);

  if (loading) {
    return <p style={{ ...GF, margin: 0, fontSize: 13, color: CO.slate5 }}>Checking who can be mentioned…</p>;
  }

  const atLimit = selected.length >= COLLAB_MAX_MENTIONS;

  return (
    <fieldset style={{ border: `1px solid ${CO.slate2}`, borderRadius: 8, padding: "12px 14px", margin: 0 }}>
      <legend style={{ ...GF, fontSize: 12, fontWeight: 700, color: CO.slate6, padding: "0 6px" }}>
        Mention someone (optional)
      </legend>

      {eligible.length === 0 ? (
        <p style={{ ...GF, margin: 0, fontSize: 13, color: CO.slate5, lineHeight: 1.6 }}>{notice}</p>
      ) : (
        <>
          <div className="co-row" style={{ gap: 8 }}>
            {eligible.map((m) => {
              const on = selected.includes(m.memberId);
              return (
                <label key={m.memberId} className="co-row" style={{
                  gap: 7, padding: "7px 11px", borderRadius: 100, minHeight: 36, cursor: "pointer",
                  background: on ? CO.azureSoft : CO.white,
                  border: `1px solid ${on ? CO.azureBorder : CO.slate3}`,
                }}>
                  <input type="checkbox" checked={on} disabled={!on && atLimit}
                    onChange={() => onChange(on
                      ? selected.filter((id) => id !== m.memberId)
                      : [...selected, m.memberId])}
                    style={{ width: 16, height: 16, accentColor: CO.azure }} />
                  <span style={{ ...GF, fontSize: 13, color: CO.slate9 }}>{m.displayName}</span>
                  <span style={{ ...GF, fontSize: 12, color: CO.slate5 }}>{m.roleLabel}</span>
                </label>
              );
            })}
          </div>
          <p style={{ ...GF, margin: "10px 0 0", fontSize: 12, color: CO.slate5, lineHeight: 1.6 }}>
            {notice}{atLimit ? ` You can mention up to ${COLLAB_MAX_MENTIONS} people in one comment.` : ""}
          </p>
        </>
      )}
    </fieldset>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// New thread
// ══════════════════════════════════════════════════════════════════════════════

export function CollaborationNewThreadPage() {
  const { txn } = useOutletContext<TxnOutletContext>();
  const navigate = useNavigate();
  const documentId = txn.id;
  const { viewer, capabilityAvailable, capabilityReason } =
    useCollaborationViewer(true, txn.ownerName === "Ana Reyes");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<CollaborationThreadCategory>("general-discussion");
  const [visibility, setVisibility] = useState<CollaborationVisibility>(DEFAULT_COLLAB_VISIBILITY);
  const [priority, setPriority] = useState<CollaborationThreadPriority>("normal");
  const [anchorType, setAnchorType] = useState<CollaborationAnchorType>("document");
  const [page, setPage] = useState(1);
  const [mentions, setMentions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const back = `/app/documents/${documentId}/collaboration`;
  const isPersonal = visibility === "personal-draft-note";
  const maxBody = isPersonal ? COLLAB_NOTE_MAX : COLLAB_COMMENT_MAX;

  // Page count lives on the primary file, not on the transaction itself.
  const maxPage = Math.max(1, txn.files.find((f) => f.isPrimary)?.pageCount ?? txn.files[0]?.pageCount ?? 1);

  // Participant Visible needs a separate entitlement. It is offered but explained
  // rather than hidden, so the boundary is visible instead of mysterious.
  const participantVisibleBlocked =
    visibility === "participant-visible" && !viewer.permissions.canCreateParticipantVisible;

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !busy && !participantVisibleBlocked;

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await documentCollaborationService.createThread({
      documentId, title, category, visibility, priority,
      teamId: visibility === "internal-team" ? "team_nbl_legal" : null,
      body,
      mentionedMemberIds: isPersonal ? [] : mentions,
      anchor: {
        id: collabAnchorId(`anc_new_${anchorType}`),
        type: anchorType,
        resourceId: null,
        label: anchorType === "page-direction"
          ? `Page ${page}`
          : COLLAB_ANCHOR_TYPE_LABELS[anchorType],
        pageDirection: anchorType === "page-direction" ? page : null,
        availability: "available",
        destination: null,
        unavailableReason: null,
      },
    }, { viewer });
    setBusy(false);
    if (result.ok) navigate(`${back}/${result.data.id}`, { replace: true });
    else setError(result.message);
  }

  if (!capabilityAvailable) {
    return (
      <div className="co-root">
        <style>{COLLABORATION_STYLES}</style>
        <EmptyState title="Collaboration is not available"
          body={capabilityReason || "Document Collaboration is not included in the current product profile."}
          actions={<Link to={back} className="co-btn co-btn-secondary">Back</Link>} />
      </div>
    );
  }

  return (
    <div className="co-root">
      <style>{COLLABORATION_STYLES}</style>
      <div className="co-stack" style={{ maxWidth: 720 }}>
        <Link to={back} className="co-btn co-btn-ghost co-btn-sm" style={{ alignSelf: "flex-start", paddingLeft: 8 }}>
          <ArrowLeft size={14} aria-hidden /> All discussions
        </Link>

        <SectionHeading title="Start a discussion"
          description="For people inside this workspace who already have access to this document. Nothing here is delivered to a participant." />

        <div className="co-panel co-stack">
          <div>
            <label htmlFor="co-new-title" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: CO.slate7, marginBottom: 6 }}>
              Title
            </label>
            <input id="co-new-title" className="co-input" value={title} maxLength={COLLAB_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)} placeholder="What needs discussing?" />
          </div>

          <div>
            <label htmlFor="co-new-visibility" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: CO.slate7, marginBottom: 6 }}>
              Who can see this
            </label>
            <select id="co-new-visibility" className="co-select" value={visibility}
              onChange={(e) => setVisibility(e.target.value as CollaborationVisibility)}>
              {VALID_COLLAB_VISIBILITIES.map((v) => (
                <option key={v} value={v}>{COLLAB_VISIBILITY_LABELS[v]}</option>
              ))}
            </select>
            <p style={{ ...GF, margin: "8px 0 0", fontSize: 12.5, color: CO.slate5, lineHeight: 1.65 }}>
              {COLLAB_VISIBILITY_DESCRIPTIONS[visibility]}
            </p>
            {participantVisibleBlocked && (
              <div style={{ marginTop: 10 }}>
                <Notice tone={TONES.warning}
                  text="Participant Visible threads require a separate entitlement that is not enabled in this profile. Choose an internal visibility to continue." />
              </div>
            )}
            {isPersonal && (
              <div style={{ marginTop: 10 }}>
                <Notice tone={TONES.muted} text={COLLAB_PERSONAL_NOTE_NOTICE} />
              </div>
            )}
          </div>

          <div className="co-row" style={{ gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 220px", minWidth: 200 }}>
              <label htmlFor="co-new-category" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: CO.slate7, marginBottom: 6 }}>
                Category
              </label>
              <select id="co-new-category" className="co-select" value={category}
                onChange={(e) => setCategory(e.target.value as CollaborationThreadCategory)}>
                {VALID_CATEGORIES.map((c) => <option key={c} value={c}>{COLLAB_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 200px", minWidth: 180 }}>
              <label htmlFor="co-new-priority" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: CO.slate7, marginBottom: 6 }}>
                Priority
              </label>
              <select id="co-new-priority" className="co-select" value={priority}
                onChange={(e) => setPriority(e.target.value as CollaborationThreadPriority)}>
                {VALID_PRIORITIES.map((p) => <option key={p} value={p}>{COLLAB_PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>

          <div className="co-row" style={{ gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 220px", minWidth: 200 }}>
              <label htmlFor="co-new-anchor" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: CO.slate7, marginBottom: 6 }}>
                What this refers to
              </label>
              <select id="co-new-anchor" className="co-select" value={anchorType}
                onChange={(e) => setAnchorType(e.target.value as CollaborationAnchorType)}>
                {VALID_ANCHOR_TYPES.map((t) => (
                  <option key={t} value={t}>{COLLAB_ANCHOR_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            {anchorType === "page-direction" && (
              <div style={{ flex: "0 0 140px" }}>
                <label htmlFor="co-new-page" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: CO.slate7, marginBottom: 6 }}>
                  Page
                </label>
                <input id="co-new-page" className="co-input" type="number" min={1} max={maxPage}
                  value={page} onChange={(e) => setPage(Math.min(maxPage, Math.max(1, Number(e.target.value) || 1)))} />
              </div>
            )}
          </div>
          <p style={{ ...GF, margin: 0, fontSize: 12.5, color: CO.slate5, lineHeight: 1.65 }}>
            A reference points at part of this document. It never changes the document, never adds a mark to the file,
            and never becomes an annotation on the PDF.
          </p>

          <div>
            <label htmlFor="co-new-body" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: CO.slate7, marginBottom: 6 }}>
              First comment
            </label>
            <textarea id="co-new-body" className="co-textarea" value={body} maxLength={maxBody}
              onChange={(e) => setBody(e.target.value)} placeholder="Plain text only" />
            <p style={{ ...GF, margin: "6px 0 0", fontSize: 12, color: CO.slate5 }}>{body.length} / {maxBody}</p>
          </div>

          {!isPersonal && viewer.permissions.canMentionMembers && (
            <MentionPicker
              documentId={documentId}
              visibility={visibility}
              teamId={visibility === "internal-team" ? "team_nbl_legal" : null}
              selected={mentions}
              onChange={setMentions}
              viewer={viewer}
            />
          )}

          {error && <ErrorPanel message={error} />}

          <div className="co-row" style={{ gap: 10, justifyContent: "flex-end" }}>
            <Link to={back} className="co-btn co-btn-secondary">Cancel</Link>
            <button type="button" className="co-btn co-btn-primary" disabled={!canSubmit} aria-disabled={!canSubmit}
              onClick={submit}>
              Start discussion
            </button>
          </div>
        </div>

        <Notice text={COLLAB_DEMONSTRATION_NOTICE} tone={TONES.neutral} compact />
      </div>
    </div>
  );
}
