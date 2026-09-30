// /app/plan-requests and /app/plan-requests/:requestId — the LAGDA owner's
// upgrade approvals (backend 093).
//
// The approval email links here: deciding needs the approver's own session,
// so the email carries no credential. For anyone else the server answers
// "not found", and so does this page.

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, XCircle, Hourglass, Inbox, Loader2 } from "lucide-react";
import {
  plansService, PLAN_NAMES, type UpgradeReview,
} from "../../../services/real/plans.service";
import { ApiError } from "../../../services/api-client";
import { formatPeso } from "../../../config/pricing.config";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PH", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

const STATUS_TEXT: Record<UpgradeReview["status"], string> = {
  pending: "Waiting for your decision",
  approved: "Approved",
  declined: "Declined",
  expired: "Expired",
  cancelled: "Cancelled by the requester",
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pr-page">
      <h1 className="pr-title">{title}</h1>
      {children}
      <style>{CSS}</style>
    </div>
  );
}

function NotFound() {
  return (
    <Shell title="Upgrade request">
      <div className="pr-card" role="alert">This request does not exist, or you are not the plan approver.</div>
    </Shell>
  );
}

export function PlanRequestsPage() {
  const [list, setList] = useState<UpgradeReview[] | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    plansService.pendingReviews()
      .then(r => { setList(r.requests); })
      .catch(() => { setMissing(true); });
  }, []);
  if (missing) return <NotFound />;
  return (
    <Shell title="Upgrade requests">
      <p className="pr-lead">Test-mode requests waiting for your decision. No money was moved for any of them.</p>
      {list === null ? <div className="pr-card">Loading…</div>
        : list.length === 0 ? <div className="pr-card pr-empty"><Inbox size={20} aria-hidden /> Nothing is waiting.</div>
        : (
          <ul className="pr-list" data-testid="plan-request-list">
            {list.map(r => (
              <li key={r.requestId}>
                <Link to={`/app/plan-requests/${encodeURIComponent(r.requestId)}`} className="pr-row">
                  <span className="pr-row-main">
                    <strong>{r.requesterName}</strong>
                    <span>{r.requesterEmail}</span>
                  </span>
                  <span className="pr-row-plan">{PLAN_NAMES[r.plan]} · {formatPeso(r.amountPesos, true)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </Shell>
  );
}

export function PlanRequestPage() {
  const { requestId = "" } = useParams();
  const [review, setReview] = useState<UpgradeReview | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    plansService.review(requestId)
      .then(setReview)
      .catch(() => { setMissing(true); });
  }, [requestId]);
  useEffect(load, [load]);

  const decide = async (decision: "approve" | "decline") => {
    setBusy(decision); setError(null);
    try {
      setReview(await plansService.decide(requestId, decision));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not go through. Please try again.");
      load();
    } finally {
      setBusy(null);
    }
  };

  if (missing) return <NotFound />;
  if (review === null) return <Shell title="Upgrade request"><div className="pr-card">Loading…</div></Shell>;

  const pending = review.status === "pending";
  return (
    <Shell title="Upgrade request">
      <Link to="/app/plan-requests" className="pr-back"><ArrowLeft size={15} aria-hidden /> All requests</Link>
      <div className="pr-card" data-testid="plan-request">
        <div className={`pr-status pr-status-${review.status}`} data-testid="plan-request-status">
          {review.status === "approved" ? <CheckCircle2 size={16} aria-hidden />
            : review.status === "pending" ? <Hourglass size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
          {STATUS_TEXT[review.status]}
        </div>
        <dl className="pr-facts">
          <div><dt>Requested by</dt><dd>{review.requesterName}<br /><span>{review.requesterEmail}</span></dd></div>
          <div><dt>Plan</dt><dd>{PLAN_NAMES[review.plan]} · {formatPeso(review.amountPesos, true)} a month</dd></div>
          <div><dt>Current plan</dt><dd>{PLAN_NAMES[review.currentPlan]}</dd></div>
          <div><dt>Sent</dt><dd>{when(review.createdAt)}</dd></div>
          <div><dt>{pending ? "Open until" : "Decided"}</dt><dd>{pending ? when(review.expiresAt) : review.decidedAt ? when(review.decidedAt) : "—"}</dd></div>
          <div><dt>Payment</dt><dd>Test mode: the sample account was used. No money was moved.</dd></div>
        </dl>
        {error && <div role="alert" className="pr-error">{error}</div>}
        {pending && (
          <div className="pr-actions">
            <button type="button" className="pr-btn pr-decline" disabled={busy !== null} onClick={() => { void decide("decline"); }} data-testid="plan-request-decline">
              {busy === "decline" ? <Loader2 size={15} aria-hidden className="pr-spin" /> : <XCircle size={15} aria-hidden />} Decline
            </button>
            <button type="button" className="pr-btn pr-approve" disabled={busy !== null} onClick={() => { void decide("approve"); }} data-testid="plan-request-approve">
              {busy === "approve" ? <Loader2 size={15} aria-hidden className="pr-spin" /> : <CheckCircle2 size={15} aria-hidden />} Approve one month
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

const CSS = `
.pr-page { max-width: 720px; margin: 0 auto; padding: 24px 16px 64px; font-family: 'Geist', sans-serif; }
.pr-title { font-size: 24px; font-weight: 800; color: #0B1F4B; margin: 0 0 6px; }
.pr-lead { font-size: 14px; color: #64748B; margin: 0 0 16px; }
.pr-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; color: #005A9E; text-decoration: none; margin: 6px 0 14px; }
.pr-card { background: #FFFFFF; border: 1px solid #E6EBF2; border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px rgba(7,17,31,0.04); font-size: 14px; color: #334155; }
.pr-empty { display: flex; align-items: center; gap: 8px; color: #64748B; }
.pr-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.pr-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; background: #FFFFFF; border: 1px solid #E6EBF2; border-radius: 14px; padding: 14px 16px; text-decoration: none; color: #0B1F4B; }
.pr-row:hover { border-color: #0078D4; }
.pr-row-main { display: grid; gap: 2px; min-width: 0; }
.pr-row-main span { font-size: 13px; color: #64748B; overflow-wrap: anywhere; }
.pr-row-plan { font-size: 13.5px; font-weight: 700; color: #005A9E; }
.pr-status { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; border-radius: 999px; padding: 4px 12px; margin-bottom: 14px; }
.pr-status-pending { background: #FEF3C7; color: #92400E; }
.pr-status-approved { background: #DCFCE7; color: #166534; }
.pr-status-declined, .pr-status-expired, .pr-status-cancelled { background: #F1F5F9; color: #334155; }
.pr-facts { margin: 0; display: grid; gap: 12px; }
.pr-facts > div { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 12px; }
.pr-facts dt { color: #64748B; font-size: 13px; }
.pr-facts dd { margin: 0; color: #0B1F4B; font-weight: 600; overflow-wrap: anywhere; }
.pr-facts dd span { font-weight: 500; color: #64748B; }
.pr-error { margin-top: 14px; font-size: 13px; color: #991B1B; background: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px; padding: 8px 10px; }
.pr-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
.pr-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 18px; border-radius: 10px; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.pr-btn:disabled { opacity: 0.6; cursor: progress; }
.pr-btn:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 2px; }
.pr-decline { background: #FFFFFF; border: 1.5px solid #D6DEE8; color: #334155; }
.pr-approve { background: #0B63D1; border: 1.5px solid #0B63D1; color: #FFFFFF; }
.pr-spin { animation: pr-spin 900ms linear infinite; }
@keyframes pr-spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) {
  .pr-facts > div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .pr-actions .pr-btn { flex: 1 1 100%; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) { .pr-spin { animation: none; } }
`;
