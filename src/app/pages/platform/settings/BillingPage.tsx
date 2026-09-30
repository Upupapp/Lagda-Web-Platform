// /app/workspace/settings/billing — the workspace's plan (its OWNER's), what
// each plan includes, and the sample invoice.
//
// A plan belongs to a person (backend 093), so this page only REPORTS the
// workspace's plan; the owner changes it from My Settings › Plan & Billing,
// where the plan cards' buttons lead. Nothing here takes or asks for payment,
// and the one invoice is a SAMPLE, labelled as such everywhere it appears.

import React, { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Sparkles, CalendarClock, ReceiptText, Star, Check, Minus, ChevronDown, Info, ArrowRight, X, BadgeCheck, Gauge,
} from "lucide-react";
import { SettingsPage, SSection, SCard, Badge, BTN_PRIMARY, BTN_SECONDARY, Notice, SET, TONES } from "./SettingsShell";
import {
  SAMPLE_PLANS, SAMPLE_COMPARE_GROUPS, currentPlanLimits,
  formatPeso, annualSaving, type SamplePlan, type CompareCell, type CatalogPlanId,
} from "../../../config/pricing.config";
import { useWorkspacePlan } from "../../../hooks/usePlans";
import { PLAN_NAMES } from "../../../services/real/plans.service";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { useWorkspaceMode } from "../../../hooks/useWorkspaceAccess";
import { useWorkspaceUsage, formatBytes } from "./settings-data";
import { VerificationQRCode } from "../../../components/verification/VerificationQRCode";
import {
  SAMPLE_INVOICE_ID, SAMPLE_INVOICE_PATH, SAMPLE_INVOICE_BANNER, SAMPLE_INVOICE_TOTAL, useInvoiceBilledTo,
} from "./billing/sample-invoice";
import { Z } from "../../../utils/z-index";

const GF = { fontFamily: SET.FONT };
const GM = { fontFamily: SET.MONO };

type Cycle = "monthly" | "annual";

// ── Overview ───────────────────────────────────────────────────────────────

function OverviewCard() {
  const { workspaceId } = useWorkspaceMode();
  const { usage } = useWorkspaceUsage(workspaceId);
  const { plan, info } = useWorkspacePlan();
  const limits = currentPlanLimits();
  const suffix = limits ? "" : " (no limit applied)";
  const lines = usage ? [
    { label: "Signing requests this month", value: usage.signingRequests.sentThisMonth.toLocaleString("en-PH") },
    { label: "Members", value: usage.members.toLocaleString("en-PH") },
    { label: "Templates", value: usage.templates.toLocaleString("en-PH") },
    { label: "Storage", value: formatBytes(usage.storageBytes) },
  ] : null;
  const name = plan === null ? "…" : PLAN_NAMES[plan];
  const owner = info?.ownerIsYou ? "you are" : info?.ownerName ? `its owner, ${info.ownerName}, is` : "its owner is";
  const summary = !USE_REAL_BACKEND
    ? "This demo workspace includes every Business feature."
    : plan === null ? "Reading this workspace's plan…"
    : plan === "free" ? `This workspace is on Free because ${owner} on Free. Paid features stay stored and come back when the owner upgrades.`
    : `This workspace has ${name} features because ${owner} on ${name}.`;
  const until = info?.paidUntil ? new Date(info.paidUntil).toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <SCard style={{ borderTop: `3px solid ${plan === "free" ? SET.BORDER : "#CA8A04"}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 300px" }}>
          <div style={{ ...GM, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: SET.MUTED }}>Workspace plan</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <span data-testid="billing-current-plan" style={{ ...GM, fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", color: SET.NAVY, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={18} aria-hidden color="#A16207" /> {name.toUpperCase()}
            </span>
            {plan !== null && <Badge tone={plan === "free" ? "neutral" : "success"} dot>{plan === "free" ? "Free" : "Active"}</Badge>}
          </div>
          <p data-testid="billing-plan-summary" style={{ ...GF, fontSize: 13.5, color: SET.INK, margin: "8px 0 0", lineHeight: 1.6, maxWidth: "62ch" }}>{summary}</p>
          {info?.ownerIsYou && (
            <Link to="/app/settings/plan" data-testid="billing-manage-plan" style={{ ...BTN_SECONDARY, marginTop: 12 }}>
              Manage your plan <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto auto", gap: "6px 18px", ...GF, fontSize: 13.5 }}>
          <dt style={{ color: SET.SLATE, display: "inline-flex", alignItems: "center", gap: 6 }}><CalendarClock size={14} aria-hidden /> Billing cycle</dt>
          <dd data-testid="billing-cycle" style={{ margin: 0, color: SET.NAVY, fontWeight: 700 }}>{plan === null || plan === "free" ? "—" : "Monthly"}</dd>
          <dt style={{ color: SET.SLATE, display: "inline-flex", alignItems: "center", gap: 6 }}><ReceiptText size={14} aria-hidden /> Paid until</dt>
          <dd data-testid="billing-next-invoice" style={{ margin: 0, color: SET.NAVY, fontWeight: 700 }}>{until ?? "None"}</dd>
        </dl>
      </div>

      <div style={{ borderTop: `1px solid ${SET.BORDER}`, marginTop: 16, paddingTop: 14 }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: SET.NAVY, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Gauge size={15} aria-hidden color={SET.AZURE_TEXT} /> Usage this month
        </div>
        {lines === null ? (
          <div style={{ ...GF, fontSize: 13, color: SET.SLATE }}>Loading usage…</div>
        ) : (
          <ul data-testid="billing-usage-lines" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "6px 24px" }}>
            {lines.map(l => (
              <li key={l.label} style={{ ...GF, fontSize: 13.5, color: SET.INK, display: "flex", justifyContent: "space-between", gap: 10, borderBottom: `1px dashed ${SET.BORDER}`, padding: "5px 0" }}>
                <span style={{ color: SET.SLATE }}>{l.label}</span>
                <span><strong style={{ ...GM, color: SET.NAVY }}>{l.value}</strong><span style={{ color: SET.SLATE }}>{suffix}</span></span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/app/workspace/settings/usage" style={{ ...GF, fontSize: 13, fontWeight: 600, color: SET.AZURE_TEXT, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10 }}>
          All usage <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </SCard>
  );
}

// ── Plans ──────────────────────────────────────────────────────────────────

function PriceBlock({ plan, cycle }: { plan: SamplePlan; cycle: Cycle }) {
  if (plan.price === null) {
    return (
      <div>
        <div style={{ ...GF, fontSize: 26, fontWeight: 800, color: SET.NAVY, lineHeight: 1.1 }}>Custom</div>
        <div style={{ ...GF, fontSize: 12.5, color: SET.SLATE, marginTop: 4 }}>Priced for your organization</div>
      </div>
    );
  }
  const amount = cycle === "monthly" ? plan.price.monthly : plan.price.annual;
  const unit = `${plan.price.perUser ? "/user" : ""}/${cycle === "monthly" ? "mo" : "yr"}`;
  const saving = annualSaving(plan.price);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}>
        <span data-testid={`plan-price-${plan.id}`} style={{ ...GF, fontSize: 26, fontWeight: 800, color: SET.NAVY, lineHeight: 1.1 }}>{formatPeso(amount)}</span>
        {amount > 0 && <span style={{ ...GF, fontSize: 13, color: SET.SLATE }}>{unit}</span>}
      </div>
      <div data-testid={`plan-saving-${plan.id}`} style={{ ...GF, fontSize: 12.5, color: saving > 0 ? TONES.success.fg : SET.SLATE, marginTop: 4, fontWeight: saving > 0 ? 600 : 500 }}>
        {amount === 0 ? "Free, always"
          : cycle === "annual" ? `Save ${formatPeso(saving)}${plan.price.perUser ? " per user" : ""} a year`
          : `Or ${formatPeso(plan.price.annual)}${plan.price.perUser ? "/user" : ""}/yr — save ${formatPeso(saving)}`}
      </div>
    </div>
  );
}

function PlanCard({ plan, cycle, onChoose, current, disabled }: {
  plan: SamplePlan; cycle: Cycle; onChoose: (plan: SamplePlan) => void; current: boolean; disabled: boolean;
}) {
  const inert = disabled || current || plan.id === "free";
  const label = current ? "Your plan"
    : plan.price === null ? "Contact sales"
    : plan.id === "free" ? "Free, always"
    : `Choose ${plan.name}`;
  return (
    <div data-testid={`plan-card-${plan.id}`} style={{
      position: "relative", display: "flex", flexDirection: "column", gap: 14, minWidth: 0,
      background: "#FFFFFF", borderRadius: 12, padding: "18px 18px 16px",
      border: plan.mostPopular ? `2px solid ${SET.AZURE}` : `1px solid ${SET.BORDER}`,
      boxShadow: plan.mostPopular ? "0 8px 22px -12px rgba(0,120,212,0.45)" : "0 1px 2px rgba(7,17,31,0.04)",
    }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 22 }}>
        {plan.mostPopular && <Badge tone="info" icon={Star}>Most popular</Badge>}
        {current && <Badge tone="success" icon={BadgeCheck}>Current plan</Badge>}
      </div>
      <div>
        <h4 style={{ ...GF, fontSize: 17, fontWeight: 800, color: SET.NAVY, margin: 0 }}>{plan.name}</h4>
        <p style={{ ...GF, fontSize: 13, color: SET.SLATE, margin: "3px 0 0", lineHeight: 1.45 }}>{plan.tagline}</p>
      </div>
      <PriceBlock plan={plan} cycle={cycle} />
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 7, flex: 1, alignContent: "start" }}>
        {plan.highlights.map(h => (
          <li key={h} style={{ display: "flex", gap: 8, alignItems: "flex-start", ...GF, fontSize: 13, color: SET.INK, lineHeight: 1.45 }}>
            <Check size={15} aria-hidden color={SET.SUCCESS} style={{ flexShrink: 0, marginTop: 2 }} /> {h}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => { onChoose(plan); }} disabled={inert}
        data-testid={`plan-choose-${plan.id}`}
        style={{ ...(plan.mostPopular && !current ? BTN_PRIMARY : BTN_SECONDARY), width: "100%",
          ...(inert ? { opacity: 0.6, cursor: "default" } : {}) }}>
        {label}
      </button>
    </div>
  );
}

function CellValue({ value }: { value: CompareCell }) {
  if (value === true) return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: SET.SUCCESS, fontWeight: 700 }}><Check size={16} aria-hidden /><span className="st-visually-hidden">Included</span></span>;
  if (value === false) return <span style={{ display: "inline-flex", alignItems: "center", color: "#64748B" }}><Minus size={16} aria-hidden /><span className="st-visually-hidden">Not included</span></span>;
  return <span>{value}</span>;
}

function CompareTable() {
  return (
    <div data-testid="plan-compare" style={{ position: "relative", overflowX: "auto", border: `1px solid ${SET.BORDER}`, borderRadius: 12, marginTop: 14, background: "#FFFFFF" }}>
      <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", ...GF, fontSize: 13 }}>
        <caption className="st-visually-hidden">Plan comparison — sample pricing</caption>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            <th scope="col" style={{ textAlign: "left", padding: "12px 14px", color: SET.SLATE, fontWeight: 600, position: "sticky", left: 0, background: "#F8FAFC", minWidth: 170 }}>Feature</th>
            {SAMPLE_PLANS.map(p => (
              <th key={p.id} scope="col" style={{ textAlign: "center", padding: "12px 10px", color: p.mostPopular ? SET.AZURE_TEXT : SET.NAVY, fontWeight: 800, background: p.mostPopular ? "#EFF6FD" : undefined }}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SAMPLE_COMPARE_GROUPS.map(group => (
            <React.Fragment key={group.id}>
              <tr>
                <th scope="colgroup" colSpan={SAMPLE_PLANS.length + 1} style={{ textAlign: "left", padding: "10px 14px 6px", ...GM, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: SET.MUTED, borderTop: `1px solid ${SET.BORDER}`, background: "#FFFFFF" }}>
                  {group.title}
                </th>
              </tr>
              {group.rows.map(row => (
                <tr key={row.id} style={{ borderTop: "1px solid #EEF2F6" }}>
                  <th scope="row" style={{ textAlign: "left", padding: "9px 14px", color: SET.INK, fontWeight: 500, position: "sticky", left: 0, background: "#FFFFFF" }}>{row.label}</th>
                  {SAMPLE_PLANS.map(p => (
                    <td key={p.id} style={{ textAlign: "center", padding: "9px 10px", color: SET.INK, background: p.mostPopular ? "#F7FBFE" : undefined }}>
                      <CellValue value={row.cell(p)} />
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnterpriseDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [onClose]);
  return (
    <div role="presentation" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(7,17,31,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e => { e.stopPropagation(); }}
        style={{ background: "#FFFFFF", borderRadius: 14, padding: 24, width: "100%", maxWidth: 440, boxShadow: "0 24px 60px -20px rgba(7,17,31,0.45)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h3 id={titleId} style={{ ...GF, fontSize: 18, fontWeight: 800, color: SET.NAVY, margin: 0 }}>Enterprise is set up by LAGDA</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: SET.SLATE, padding: 4, borderRadius: 6 }}><X size={18} aria-hidden /></button>
        </div>
        <p style={{ ...GF, fontSize: 13.5, color: SET.INK, lineHeight: 1.6, margin: "12px 0 0" }}>
          Enterprise is everything in Business plus single sign-on and dedicated support, arranged with each
          organization. Contact LAGDA and we will set it up for your account.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button ref={closeRef} type="button" onClick={onClose} style={BTN_PRIMARY}>Got it</button>
        </div>
      </div>
    </div>
  );
}

export function PlanShowcase({ current, onChoose, disabled = false, description }: {
  /** The plan to mark as current, or null while unknown. */
  current: CatalogPlanId | null;
  /** A paid, self-service plan was chosen. */
  onChoose: (plan: "personal" | "business") => void;
  disabled?: boolean;
  description?: string;
}) {
  const [compare, setCompare] = useState(false);
  const [enterprise, setEnterprise] = useState(false);
  const compareId = useId();
  const choose = (plan: SamplePlan) => {
    if (plan.id === "enterprise") setEnterprise(true);
    else if (plan.id === "personal" || plan.id === "business") onChoose(plan.id);
  };
  return (
    <SSection title="Plans" icon={Star}
      description={description ?? "What each plan includes. Paid plans are monthly while LAGDA is in test mode."}>
      <div data-testid="sample-pricing-notice" style={{ ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: TONES.warning.fg, background: TONES.warning.bg, border: `1px solid ${TONES.warning.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <Info size={14} aria-hidden style={{ flexShrink: 0 }} /> TEST MODE — NO MONEY IS MOVED. MONTHLY PLANS ONLY.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14 }}>
        {SAMPLE_PLANS.map(p => (
          <PlanCard key={p.id} plan={p} cycle="monthly" onChoose={choose} current={p.id === current} disabled={disabled} />
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <button type="button" aria-expanded={compare} aria-controls={compareId} onClick={() => { setCompare(c => !c); }} style={BTN_SECONDARY}>
          {compare ? "Hide comparison" : "Compare all features"}
          <ChevronDown size={15} aria-hidden style={{ transform: compare ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} />
        </button>
      </div>
      <div id={compareId} hidden={!compare}>{compare && <CompareTable />}</div>
      {enterprise && <EnterpriseDialog onClose={() => { setEnterprise(false); }} />}
    </SSection>
  );
}

// ── Invoices ───────────────────────────────────────────────────────────────

function InvoicesSection() {
  const billedTo = useInvoiceBilledTo();
  const url = typeof window !== "undefined" ? `${window.location.origin}${SAMPLE_INVOICE_PATH}` : SAMPLE_INVOICE_PATH;
  return (
    <SSection title="Invoices" icon={ReceiptText} description="Test mode bills nothing, so there are no real invoices. This sample shows what one will look like.">
      <div data-testid="sample-invoice-card" style={{ border: `1px solid ${SET.BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: TONES.warning.fg, background: TONES.warning.bg, borderBottom: `1px solid ${TONES.warning.border}`, padding: "8px 14px" }}>
          {SAMPLE_INVOICE_BANNER}
        </div>
        <div style={{ display: "flex", gap: 18, padding: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ ...GM, fontSize: 14, fontWeight: 700, color: SET.NAVY }}>{SAMPLE_INVOICE_ID}</span>
              <Badge tone="neutral">Sample — not paid</Badge>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <span style={{ ...GF, fontSize: 14, color: SET.INK }}>Business (annual)</span>
              <span style={{ ...GF, fontSize: 20, fontWeight: 800, color: SET.NAVY }}>{formatPeso(SAMPLE_INVOICE_TOTAL)}</span>
            </div>
            <div style={{ ...GF, fontSize: 13, color: SET.SLATE, marginTop: 10, lineHeight: 1.55 }}>
              <div style={{ ...GM, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: SET.MUTED }}>Billed to</div>
              <div data-testid="invoice-billed-name" style={{ color: SET.NAVY, fontWeight: 600 }}>{billedTo.name}</div>
              {billedTo.email && <div style={{ overflowWrap: "anywhere" }}>{billedTo.email}</div>}
              <div>{billedTo.workspace}</div>
            </div>
            <Link to={SAMPLE_INVOICE_PATH} data-testid="view-sample-invoice" style={{ ...BTN_SECONDARY, marginTop: 14 }}>
              View invoice <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <VerificationQRCode url={url} size={112} alt={`QR code linking to sample invoice ${SAMPLE_INVOICE_ID}`} />
            <div style={{ ...GF, fontSize: 11.5, color: SET.SLATE, marginTop: 4 }}>Scan to open</div>
          </div>
        </div>
      </div>
    </SSection>
  );
}

export function BillingPage() {
  const { plan } = useWorkspacePlan();
  const navigate = useNavigate();
  return (
    <SettingsPage title="Billing & Plan" breadcrumb="Billing & Plan" description="This workspace’s plan, what each plan includes, and your invoices.">
      <Notice tone="info" icon={Sparkles}>A plan belongs to a person: this workspace has its owner’s plan. The owner changes it from My Settings › Plan &amp; Billing.</Notice>
      <OverviewCard />
      <PlanShowcase current={plan} onChoose={id => { void navigate(`/app/settings/plan?choose=${id}`); }}
        description="What each plan includes. Choosing one opens your own Plan & Billing." />
      <InvoicesSection />
    </SettingsPage>
  );
}
