// /app/settings/plan — My Settings › Plan & Billing: YOUR plan (backend 093).
//
// A plan belongs to a person; every workspace you OWN has its features. This
// page shows the plan, the Free allowance, a request waiting for approval, and
// the plan cards. Choosing Personal or Business opens the test-mode form:
// a clear TEST MODE banner, a sample account with Copy buttons, and fields
// that accept only that sample. Submitting sends the request to the LAGDA
// owner, who approves or declines it; approval starts a paid month.
//
// `?choose=personal|business` opens the form straight away (the workspace
// Billing page and the "used your free document" message link here).

import { useEffect, useId, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Sparkles, CalendarClock, FileCheck2, Hourglass, Copy, Check, FlaskConical, X, ShieldCheck, Inbox, Loader2,
} from "lucide-react";
import { SettingsPage, SCard, SSection, Badge, BTN_PRIMARY, BTN_SECONDARY, Notice, SET, TONES } from "./SettingsShell";
import { PlanShowcase } from "./BillingPage";
import { useMyPlan, announcePlanChanged } from "../../../hooks/usePlans";
import {
  plansService, SAMPLE_BANK_ACCOUNT, PLAN_PRICES, PLAN_NAMES, PLAN_ERROR,
  type BankDetails, type MyPlan, type RequestablePlan,
} from "../../../services/real/plans.service";
import { ApiError } from "../../../services/api-client";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { formatPeso } from "../../../config/pricing.config";
import { Z } from "../../../utils/z-index";

const GF = { fontFamily: SET.FONT };
const GM = { fontFamily: SET.MONO };

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" });

// ── Your plan ───────────────────────────────────────────────────────────────

function CurrentPlanCard({ plan, onCancel, cancelling }: { plan: MyPlan; onCancel: () => void; cancelling: boolean }) {
  const free = plan.plan === "free";
  const lapsed = free && plan.storedPlan !== "free";
  const used = Math.min(plan.freeDocumentsUsed, plan.freeDocumentLimit);
  const pending = plan.pendingRequest;
  return (
    <SCard style={{ borderTop: `3px solid ${free ? SET.BORDER : "#CA8A04"}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
          <div style={{ ...GM, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: SET.MUTED }}>Your plan</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <span data-testid="my-plan-name" style={{ ...GM, fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", color: SET.NAVY, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={18} aria-hidden color="#A16207" /> {PLAN_NAMES[plan.plan].toUpperCase()}
            </span>
            <Badge tone={free ? "neutral" : "success"} dot>{free ? "Free" : plan.autoRenew ? "Renews monthly" : "Active"}</Badge>
          </div>
          <p style={{ ...GF, fontSize: 13.5, color: SET.INK, margin: "8px 0 0", lineHeight: 1.6, maxWidth: "62ch" }}>
            {lapsed
              ? `Your ${PLAN_NAMES[plan.storedPlan]} month has ended. Nothing was deleted: your members, teams and branding come back when you upgrade again.`
              : free
                ? "Free lets you send one document for signing. Signing documents other people send you is always free."
                : "Every workspace you own has these features. Members you invite work there with them too."}
          </p>
        </div>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto auto", gap: "6px 18px", ...GF, fontSize: 13.5 }}>
          {free ? (
            <>
              <dt style={{ color: SET.SLATE, display: "inline-flex", alignItems: "center", gap: 6 }}><FileCheck2 size={14} aria-hidden /> Free document</dt>
              <dd data-testid="my-plan-free-usage" style={{ margin: 0, color: SET.NAVY, fontWeight: 700 }}>{used} of {plan.freeDocumentLimit} used</dd>
            </>
          ) : (
            <>
              <dt style={{ color: SET.SLATE, display: "inline-flex", alignItems: "center", gap: 6 }}><CalendarClock size={14} aria-hidden /> {plan.autoRenew ? "Renews" : "Paid until"}</dt>
              <dd data-testid="my-plan-paid-until" style={{ margin: 0, color: SET.NAVY, fontWeight: 700 }}>{plan.paidUntil ? longDate(plan.paidUntil) : "—"}</dd>
            </>
          )}
        </dl>
      </div>

      {pending && (
        <div data-testid="my-plan-pending" style={{ marginTop: 16, borderTop: `1px solid ${SET.BORDER}`, paddingTop: 14, display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <Hourglass size={18} aria-hidden color={TONES.warning.dot} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: SET.NAVY }}>
              Waiting for approval: {PLAN_NAMES[pending.plan]} · {formatPeso(pending.amountPesos, true)} a month
            </div>
            <div style={{ ...GF, fontSize: 13, color: SET.SLATE, marginTop: 2, lineHeight: 1.5 }}>
              Sent {longDate(pending.createdAt)}. LAGDA will approve or decline it by {longDate(pending.expiresAt)}; you will get an email and a notification.
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={cancelling} style={BTN_SECONDARY} data-testid="my-plan-cancel-request">
            {cancelling ? "Cancelling…" : "Cancel request"}
          </button>
        </div>
      )}
    </SCard>
  );
}

// ── The test-mode form ──────────────────────────────────────────────────────

const FIELDS: readonly { key: keyof BankDetails; label: string; autoComplete: string }[] = [
  { key: "bankName", label: "Bank name", autoComplete: "off" },
  { key: "accountName", label: "Account name", autoComplete: "off" },
  { key: "accountNumber", label: "Account number", autoComplete: "off" },
  { key: "branch", label: "Branch", autoComplete: "off" },
  { key: "swiftCode", label: "SWIFT / BIC", autoComplete: "off" },
];

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => { setCopied(false); }, 1500);
    } catch { /* clipboard blocked: the value is on screen to select */ }
  };
  return (
    <button type="button" onClick={() => { void copy(); }} aria-label={`Copy ${label}`} className="pb-copy">
      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />} {copied ? "Copied" : "Copy"}
    </button>
  );
}

function UpgradeDialog({ plan, onClose, onSent }: { plan: RequestablePlan; onClose: () => void; onSent: () => void }) {
  const titleId = useId();
  const firstRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<BankDetails>({ bankName: "", accountName: "", accountNumber: "", branch: "", swiftCode: "" });
  const [bad, setBad] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !sending) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [onClose, sending]);

  const fillSample = () => { setValues({ ...SAMPLE_BANK_ACCOUNT }); setBad(new Set()); setError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empty = FIELDS.filter(f => values[f.key].trim() === "").map(f => f.key);
    if (empty.length > 0) { setBad(new Set(empty)); setError("Fill in every field. Copy the sample account shown."); return; }
    setSending(true); setError(null); setBad(new Set());
    try {
      await plansService.requestUpgrade(plan, values);
      onSent();
    } catch (err) {
      if (err instanceof ApiError && err.body?.code === PLAN_ERROR.sampleOnly) {
        setBad(new Set((err.body.details ?? []).map(d => (d.field ?? "").replace(/^bank\./, ""))));
        setError("Test mode: please use the sample account shown.");
      } else if (err instanceof ApiError && err.body?.code === PLAN_ERROR.pending) {
        setError("You already have a request waiting for approval.");
      } else {
        setError(err instanceof Error && err.message.trim() !== "" ? err.message : "Your request could not be sent. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div role="presentation" onClick={() => { if (!sending) onClose(); }} className="pb-scrim" style={{ zIndex: Z.modal }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="pb-dialog" data-testid="upgrade-dialog"
        onClick={e => { e.stopPropagation(); }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h3 id={titleId} style={{ ...GF, fontSize: 19, fontWeight: 800, color: SET.NAVY, margin: 0 }}>Upgrade to {PLAN_NAMES[plan]}</h3>
            <div style={{ ...GF, fontSize: 13.5, color: SET.SLATE, marginTop: 4 }}>
              {formatPeso(PLAN_PRICES[plan], true)}{plan === "business" ? " per user" : ""} a month · one month, approved by LAGDA
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={sending} aria-label="Close" className="pb-x"><X size={18} aria-hidden /></button>
        </div>

        <div role="note" className="pb-test" data-testid="test-mode-banner">
          <FlaskConical size={18} aria-hidden style={{ flexShrink: 0 }} />
          <div>
            <strong>TEST MODE: no money is moved.</strong>{" "}
            This is a demonstration of the upgrade. Copy the sample account below into the form. Do not enter your real bank details.
          </div>
        </div>

        <div className="pb-grid">
          <section className="pb-sample" aria-label="Sample account" data-testid="sample-account">
            <div className="pb-sample-head">
              <span>Sample account</span>
              <button type="button" onClick={fillSample} className="pb-fill" data-testid="fill-sample">Fill in for me</button>
            </div>
            <dl>
              {FIELDS.map(f => (
                <div key={f.key} className="pb-sample-row">
                  <dt>{f.label}</dt>
                  <dd><code>{SAMPLE_BANK_ACCOUNT[f.key]}</code><CopyButton value={SAMPLE_BANK_ACCOUNT[f.key]} label={f.label} /></dd>
                </div>
              ))}
              <div className="pb-sample-row">
                <dt>Amount</dt>
                <dd><code>{formatPeso(PLAN_PRICES[plan], true)}</code></dd>
              </div>
            </dl>
          </section>

          <form onSubmit={e => { void submit(e); }} noValidate className="pb-form">
            {FIELDS.map((f, i) => (
              <label key={f.key} className="pb-field">
                <span>{f.label}</span>
                <input ref={i === 0 ? firstRef : undefined} value={values[f.key]} autoComplete={f.autoComplete}
                  aria-invalid={bad.has(f.key) || undefined} data-testid={`bank-${f.key}`}
                  onChange={e => { const v = e.target.value; setValues(prev => ({ ...prev, [f.key]: v })); }} />
              </label>
            ))}
            {error && <div role="alert" className="pb-error" data-testid="upgrade-error">{error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 4 }}>
              <button type="button" onClick={onClose} disabled={sending} style={BTN_SECONDARY}>Cancel</button>
              <button type="submit" disabled={sending} style={BTN_PRIMARY} data-testid="upgrade-submit">
                {sending ? <><Loader2 size={15} aria-hidden className="pb-spin" /> Sending…</> : "Send for approval"}
              </button>
            </div>
          </form>
        </div>

        <p style={{ ...GF, fontSize: 12, color: SET.SLATE, margin: "14px 0 0", lineHeight: 1.55, display: "flex", gap: 6 }}>
          <ShieldCheck size={14} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
          Only the sample account is accepted. Nothing you type here is stored or emailed; LAGDA is told only who asked and for which plan.
        </p>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

// ── The page ────────────────────────────────────────────────────────────────

export function PlanBillingPage() {
  const { plan, refresh } = useMyPlan();
  const [params, setParams] = useSearchParams();
  const asked = params.get("choose");
  const [choosing, setChoosing] = useState<RequestablePlan | null>(asked === "personal" || asked === "business" ? asked : null);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (asked !== null) setParams(prev => { const next = new URLSearchParams(prev); next.delete("choose"); return next; }, { replace: true });
  }, [asked, setParams]);

  const blocked = plan !== null && (plan.pendingRequest !== null || !plan.upgradesAvailable);
  const open = plan !== null && choosing !== null && !blocked ? choosing : null;

  const cancel = async () => {
    setCancelling(true);
    try { await plansService.cancelRequest(); setNotice("Your request was cancelled."); } catch { /* shown by the refresh below */ }
    await refresh();
    announcePlanChanged();
    setCancelling(false);
  };

  return (
    <SettingsPage title="Plan & Billing" breadcrumb="Plan & Billing" description="Your plan, the features it gives every workspace you own, and upgrading.">
      {!USE_REAL_BACKEND && <Notice tone="info">This demo includes every feature. Plans apply in the live app.</Notice>}
      {notice && <Notice tone="success" role="status">{notice}</Notice>}
      {plan === null ? (
        <SCard><div style={{ ...GF, fontSize: 13.5, color: SET.SLATE }}>Reading your plan…</div></SCard>
      ) : (
        <>
          <CurrentPlanCard plan={plan} onCancel={() => { void cancel(); }} cancelling={cancelling} />
          {plan.approver && (
            <Notice tone="accent" icon={Inbox}>
              You approve plan upgrades for LAGDA. <Link to="/app/plan-requests" data-testid="plan-requests-link" style={{ color: "inherit", fontWeight: 700 }}>Review upgrade requests</Link>
            </Notice>
          )}
          {!plan.upgradesAvailable && USE_REAL_BACKEND && (
            <Notice tone="warning">Upgrades are not available right now. Please try again later.</Notice>
          )}
          <PlanShowcase current={plan.plan} disabled={blocked}
            onChoose={id => { setNotice(null); setChoosing(id); }}
            description={plan.pendingRequest ? "You have a request waiting for approval. Cancel it to choose another plan." : undefined} />
          <SSection title="How upgrading works" icon={FlaskConical}>
            <ol style={{ ...GF, fontSize: 13.5, color: SET.INK, lineHeight: 1.65, margin: 0, paddingLeft: 20 }}>
              <li>Choose Personal or Business.</li>
              <li>Copy the sample account into the form. It is test mode: no money is moved.</li>
              <li>LAGDA approves or declines your request, usually within a day. You get an email and a notification.</li>
              <li>Once approved, your plan runs for one month. When it ends you return to Free, and nothing is deleted.</li>
            </ol>
          </SSection>
        </>
      )}
      {open && (
        <UpgradeDialog plan={open} onClose={() => { setChoosing(null); }}
          onSent={() => {
            setChoosing(null);
            setNotice("Your request was sent. LAGDA will approve or decline it, and you will get an email and a notification.");
            void refresh();
            announcePlanChanged();
          }} />
      )}
    </SettingsPage>
  );
}

const CSS = `
.pb-scrim { position: fixed; inset: 0; background: rgba(7,17,31,0.45); display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
.pb-dialog { background: #FFFFFF; border-radius: 16px; padding: 24px; width: 100%; max-width: 760px; box-shadow: 0 24px 60px -20px rgba(7,17,31,0.45); max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box; }
.pb-x { background: none; border: none; cursor: pointer; color: #64748B; padding: 6px; border-radius: 8px; }
.pb-x:focus-visible, .pb-copy:focus-visible, .pb-fill:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 2px; }
.pb-test { display: flex; gap: 10px; align-items: flex-start; margin: 16px 0; padding: 12px 14px; border-radius: 10px; border: 2px dashed #B45309; background: #FFFBEB; color: #92400E; font-family: 'Geist', sans-serif; font-size: 13.5px; line-height: 1.55; }
.pb-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; align-items: start; }
.pb-sample { border: 1px solid #FDE68A; background: #FFFDF5; border-radius: 12px; padding: 14px; min-width: 0; }
.pb-sample-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-family: 'Geist', sans-serif; font-weight: 800; font-size: 14px; color: #0B1F4B; margin-bottom: 8px; }
.pb-sample dl { margin: 0; display: grid; gap: 8px; }
.pb-sample-row { display: grid; gap: 2px; }
.pb-sample-row dt { font-family: 'Geist', sans-serif; font-size: 12px; color: #64748B; }
.pb-sample-row dd { margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
.pb-sample-row code { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 13.5px; color: #0B1F4B; overflow-wrap: anywhere; }
.pb-copy, .pb-fill { display: inline-flex; align-items: center; gap: 4px; font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 600; color: #005A9E; background: #FFFFFF; border: 1px solid #BAD7F5; border-radius: 7px; padding: 4px 8px; cursor: pointer; flex-shrink: 0; min-height: 30px; }
.pb-copy:hover, .pb-fill:hover { border-color: #0078D4; }
.pb-form { display: grid; gap: 10px; min-width: 0; }
.pb-field { display: grid; gap: 4px; font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 600; color: #334155; }
.pb-field input { font: inherit; font-weight: 500; font-size: 14px; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 9px; min-height: 42px; box-sizing: border-box; width: 100%; color: #0B1F4B; }
.pb-field input:focus { outline: 3px solid rgba(0,120,212,0.25); border-color: #0078D4; }
.pb-field input[aria-invalid="true"] { border-color: #DC2626; background: #FEF2F2; }
.pb-error { font-family: 'Geist', sans-serif; font-size: 13px; color: #991B1B; background: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px; padding: 8px 10px; }
.pb-spin { animation: pb-spin 900ms linear infinite; }
@keyframes pb-spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) {
  .pb-dialog { padding: 18px 16px; border-radius: 14px; }
  .pb-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .pb-spin { animation: none; } }
`;
