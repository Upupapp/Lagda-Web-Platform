// Internal review for one document (Command 34).
//
// Internal review is NOT participant approval, NOT legal approval, and NOT Evidence.
// It records internal readiness direction in frontend state only.
//
// Assigning a reviewer never grants document access. A reviewer without access is
// shown as unavailable, with the reason, rather than silently treated as assigned.

import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";
import { ArrowLeft } from "lucide-react";
import type { TxnOutletContext } from "../TransactionDetailPage";
import {
  COLLAB_DEMONSTRATION_NOTICE,
  COLLAB_LEGAL_NOTICE,
  COLLAB_REVIEW_NOTICE,
  COLLAB_REVIEW_STATUS_DESCRIPTIONS,
  type CollaborationReviewerStatus,
} from "../../../../models/collaboration";
import { resolvePreparationReadiness } from "../../../../services/collaboration.resolver";
import {
  AuthorAvatar,
  CO,
  COLLABORATION_STYLES,
  CountChip,
  EmptyState,
  ErrorPanel,
  GF,
  Notice,
  ReviewStatusPill,
  ReviewerStatusPill,
  SectionHeading,
  Skeleton,
  TONES,
  formatDemonstrationTime,
  useAnnouncer,
} from "../../../../components/collaboration/CollaborationKit";
import { documentCollaborationService } from "../../../../services/mock/document-collaboration.service";
import { useCollaborationViewer, useReview, useReviewSummary } from "./useCollaboration";

const RESPONSE_OPTIONS: Array<{ id: CollaborationReviewerStatus; label: string; hint: string }> = [
  { id: "in-review",             label: "I am reviewing",     hint: "Marks that you have started. Nothing is sent to anyone." },
  { id: "changes-requested",     label: "Changes requested",  hint: "Internal direction that something should change before preparation continues." },
  { id: "ready-for-preparation", label: "Ready for preparation", hint: "Internal readiness only. Not participant approval and not legal approval." },
];

export function CollaborationReviewPage() {
  const { txn } = useOutletContext<TxnOutletContext>();
  const navigate = useNavigate();
  const documentId = txn.id;

  const { viewer, capabilityAvailable, capabilityReason } =
    useCollaborationViewer(true, txn.ownerName === "Ana Reyes");

  const review = useReview(documentId, viewer, capabilityAvailable);
  const summary = useReviewSummary(documentId, viewer, capabilityAvailable);
  const { announce, announcerNode } = useAnnouncer();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const back = `/app/documents/${documentId}/collaboration`;
  const data = review.data ?? null;
  const counts = summary.data ?? null;

  const readiness = counts
    ? resolvePreparationReadiness(counts, data?.blockingPolicyEnabled ?? true)
    : { ready: false, warnings: [] };

  const me = data?.reviewers.find((r) => r.memberId === viewer.memberId) ?? null;

  async function respond(status: CollaborationReviewerStatus) {
    setBusy(true);
    setError(null);
    const result = await documentCollaborationService.updateMyReviewerResponse({ documentId, status }, { viewer });
    setBusy(false);
    if (result.ok) {
      announce("Your internal review response was recorded in frontend state.");
      review.reload();
      summary.reload();
    } else {
      setError(result.message);
    }
  }

  if (!capabilityAvailable) {
    return (
      <div className="co-root">
        <style>{COLLABORATION_STYLES}</style>
        <EmptyState title="Internal review is not available"
          body={capabilityReason || "Document Collaboration is not included in the current product profile."}
          actions={<Link to={`/app/documents/${documentId}`} className="co-btn co-btn-secondary">Back to document</Link>} />
      </div>
    );
  }

  return (
    <div className="co-root">
      <style>{COLLABORATION_STYLES}</style>
      {announcerNode}

      <div className="co-stack">
        <Link to={back} className="co-btn co-btn-ghost co-btn-sm" style={{ alignSelf: "flex-start", paddingLeft: 8 }}>
          <ArrowLeft size={14} aria-hidden /> All discussions
        </Link>

        <SectionHeading
          title="Internal review"
          description="A record of who inside this workspace is reviewing this document before it is prepared."
        />

        <Notice text={COLLAB_REVIEW_NOTICE} tone={TONES.warning} />

        {review.state === "loading" && <Skeleton label="Loading internal review" />}
        {review.state === "error" && <ErrorPanel message={review.error ?? "Review could not be loaded."} onRetry={review.reload} />}

        {review.state === "ready" && !data && (
          <EmptyState
            title="No internal review has been set up"
            body="Discussions can still be used without one. An internal review records who is reviewing and what internal readiness they have indicated."
            actions={<Link to={back} className="co-btn co-btn-secondary">Back to discussions</Link>}
          />
        )}

        {review.state === "ready" && data && (
          <>
            <div className="co-panel">
              <div className="co-row" style={{ gap: 10, marginBottom: 10 }}>
                <ReviewStatusPill status={data.status} />
                {data.dueDateDirection && (
                  <span style={{ ...GF, fontSize: 12.5, color: CO.slate5 }}>
                    Target direction: {data.dueDateDirection}
                  </span>
                )}
              </div>
              <h2 style={{ ...GF, margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: CO.navy }}>{data.name}</h2>
              {data.description && (
                <p style={{ ...GF, margin: "0 0 10px", fontSize: 14, color: CO.slate6, lineHeight: 1.65 }}>{data.description}</p>
              )}
              <p style={{ ...GF, margin: 0, fontSize: 13, color: CO.slate5, lineHeight: 1.65 }}>
                {COLLAB_REVIEW_STATUS_DESCRIPTIONS[data.status]}
              </p>
              <p style={{ ...GF, margin: "10px 0 0", fontSize: 12.5, color: CO.slate5 }}>
                Set up by {data.createdByDisplayName} · {formatDemonstrationTime(data.createdAtDemonstration)}
              </p>
            </div>

            {counts && (
              <div className="co-row co-scroll-x" style={{ gap: 10, flexWrap: "nowrap", paddingBottom: 2 }}>
                <CountChip label="Reviewers responded" value={counts.respondedReviewerCount} tone={TONES.azure} />
                <CountChip label="Responses still needed" value={counts.missingReviewerResponses} tone={TONES.warning} />
                <CountChip label="Blocking in demonstration" value={counts.blockingThreads} tone={TONES.error} />
                <CountChip label="Open threads" value={counts.openThreads} tone={TONES.neutral} />
                <CountChip label="Resolved" value={counts.resolvedThreads} tone={TONES.success} />
              </div>
            )}

            {/* Readiness is direction only. It produces warnings, never enforcement. */}
            <div className="co-panel">
              <SectionHeading level={3} title="Preparation readiness"
                description="Direction for the people preparing this document. It produces warnings only, enforces nothing in production, and never blocks a participant action." />
              {readiness.ready ? (
                <Notice tone={TONES.success}
                  text="No internal blockers are recorded in this demonstration. This is not participant approval, legal approval, or a determination that the document is complete." />
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {readiness.warnings.map((w, i) => (
                    <li key={i}><Notice tone={TONES.warning} text={w} compact /></li>
                  ))}
                </ul>
              )}
            </div>

            <div className="co-panel">
              <SectionHeading level={3} title={`Reviewers (${data.reviewers.length})`}
                description={`${Math.min(data.requiredReviewerCount, data.reviewers.length)} of ${data.reviewers.length} need to indicate readiness. Assigning a reviewer does not grant access to this document.`} />
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {data.reviewers.map((r) => (
                  <li key={r.memberId} className="co-row" style={{ gap: 12, alignItems: "flex-start", flexWrap: "nowrap" }}>
                    <AuthorAvatar name={r.displayName} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="co-row" style={{ gap: 8 }}>
                        <span style={{ ...GF, fontSize: 14, fontWeight: 700, color: CO.navy }}>{r.displayName}</span>
                        <span style={{ ...GF, fontSize: 12.5, color: CO.slate5 }}>{r.roleLabel}</span>
                        <ReviewerStatusPill status={r.status} />
                      </div>
                      {r.respondedAtDemonstration && (
                        <p style={{ ...GF, margin: "5px 0 0", fontSize: 12, color: CO.slate5 }}>
                          Responded {formatDemonstrationTime(r.respondedAtDemonstration)}
                        </p>
                      )}
                      {r.unavailableReason && (
                        <p style={{ ...GF, margin: "6px 0 0", fontSize: 12.5, color: CO.warnText, lineHeight: 1.6 }}>
                          {r.unavailableReason}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Only your own response. There is no path here to respond for anyone else. */}
            <div className="co-panel">
              <SectionHeading level={3} title="Your response"
                description="You can only record your own response. Nobody can record a response on your behalf, and you cannot record one for anyone else." />
              {!me ? (
                <Notice tone={TONES.muted}
                  text="You are not assigned as an internal reviewer on this document, so there is no response for you to give." />
              ) : !me.hasDocumentAccess ? (
                <Notice tone={TONES.warning} text={me.unavailableReason ?? "You do not have access to this document."} />
              ) : (
                <div className="co-row" style={{ gap: 10 }}>
                  {RESPONSE_OPTIONS.map((opt) => (
                    <button key={opt.id} type="button"
                      className={`co-btn co-btn-sm ${me.status === opt.id ? "co-btn-primary" : "co-btn-secondary"}`}
                      aria-pressed={me.status === opt.id}
                      disabled={busy || !viewer.permissions.canUpdateOwnReviewerResponse}
                      aria-disabled={busy || !viewer.permissions.canUpdateOwnReviewerResponse}
                      title={opt.hint}
                      onClick={() => respond(opt.id)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {error && <div style={{ marginTop: 12 }}><ErrorPanel message={error} /></div>}
            </div>

            <div className="co-row" style={{ gap: 10 }}>
              <button type="button" className="co-btn co-btn-secondary co-btn-sm"
                onClick={() => navigate(back)}>
                View discussions
              </button>
              <button type="button" className="co-btn co-btn-ghost co-btn-sm"
                onClick={() => navigate(`/app/documents/${documentId}`)}>
                Back to document
              </button>
            </div>
          </>
        )}

        <Notice text={COLLAB_DEMONSTRATION_NOTICE} tone={TONES.neutral} compact />
        <Notice text={COLLAB_LEGAL_NOTICE} tone={TONES.muted} compact />
      </div>
    </div>
  );
}
