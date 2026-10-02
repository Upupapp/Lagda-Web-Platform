// /app/workspace/settings/billing — the workspace's plan (its OWNER's), what
// each plan includes, and the sample invoice.
//
// A plan belongs to a person (backend 093), so this page only REPORTS the
// workspace's plan; the owner changes it from My Settings › Plan & Billing,
// where the plan cards' buttons lead. Nothing here takes or asks for payment,
// and the one invoice is a SAMPLE, labelled as such everywhere it appears.

import React, { useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Download,
  Sparkles, CalendarClock, ReceiptText, Star, Check, Minus, ChevronDown, Info, ArrowRight, BadgeCheck, Gauge,
} from "lucide-react";
import { SettingsPage, SSection, SCard, Badge, BTN_SECONDARY, Notice, SET, TONES } from "./SettingsShell";
import {
  SAMPLE_PLANS, SAMPLE_COMPARE_GROUPS, currentPlanLimits,
  formatPeso, type SamplePlan, type CompareCell, type CatalogPlanId,
} from "../../../config/pricing.config";
import { useWorkspacePlan } from "../../../hooks/usePlans";
import { PLAN_NAMES } from "../../../services/real/plans.service";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { useWorkspaceMode } from "../../../hooks/useWorkspaceAccess";
import { useWorkspaceUsage, formatBytes } from "./settings-data";
import { VerificationQRCode } from "../../../components/verification/VerificationQRCode";
import {
  SAMPLE_INVOICE_ID, SAMPLE_INVOICE_PATH, SAMPLE_INVOICE_BANNER, SAMPLE_INVOICE_TOTAL, useInvoiceBilledTo,
  usePlanInvoices, invoicePath, TEST_INVOICE_BANNER, downloadInvoicePdf,
} from "./billing/sample-invoice";
import { PLAN_PASS_CSS } from "../../../components/platform/PlanPass";
import { PlanCarousel } from "../../../components/pricing/PlanCarousel";

const GF = { fontFamily: SET.FONT };
const GM = { fontFamily: SET.MONO };

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

/** The price line: monthly only while LAGDA is in test mode. */
function TilePrice({ plan }: { plan: SamplePlan }) {
  if (plan.price === null) {
    return (
      <div>
        <div className="pp-tile-price" data-testid={`plan-price-${plan.id}`}>Custom</div>
        <div className="pp-tile-sub">Priced for your organization</div>
      </div>
    );
  }
  const amount = plan.price.monthly;
  return (
    <div>
      <div className="pp-tile-price" data-testid={`plan-price-${plan.id}`}>
        {formatPeso(amount)}{amount > 0 && <small>{plan.price.perUser ? "/user/mo" : "/mo"}</small>}
      </div>
      <div className="pp-tile-sub">{amount === 0 ? "Free, always" : "Monthly · test mode"}</div>
    </div>
  );
}

function PlanTile({ plan, onChoose, current, disabled }: {
  plan: SamplePlan; onChoose: (plan: SamplePlan) => void; current: boolean; disabled: boolean;
}) {
  const soon = plan.id === "enterprise";
  const inert = disabled || current || plan.id === "free" || soon;
  const label = current ? "Your plan"
    : soon ? "Coming soon"
    : plan.id === "free" ? "Free, always"
    : `Choose ${plan.name}`;
  return (
    <div data-testid={`plan-card-${plan.id}`}
      className={`pp-tile${plan.mostPopular ? " pp-tile-business" : ""}${current ? " pp-tile-current" : ""}${soon ? " pp-tile-soon" : ""}`}>
      <div className="pp-tile-tags">
        {plan.mostPopular && <span className="pp-tag pp-tag-popular"><Star size={11} aria-hidden /> Most popular</span>}
        {soon && <span className="pp-tag pp-tag-current">Coming soon</span>}
        {current && <span className="pp-tag pp-tag-current"><BadgeCheck size={11} aria-hidden /> Current plan</span>}
      </div>
      <div>
        <h4 className="pp-tile-name">{plan.name}</h4>
        <p className="pp-tile-tagline">{plan.tagline}</p>
      </div>
      <TilePrice plan={plan} />
      <ul>
        {plan.highlights.map(h => <li key={h}><Check size={14} aria-hidden /> {h}</li>)}
      </ul>
      <button type="button" onClick={() => { onChoose(plan); }} disabled={inert} data-testid={`plan-choose-${plan.id}`}
        className={`pp-tile-btn${plan.mostPopular && !current ? " pp-tile-btn-primary" : ""}`}>
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

export function PlanShowcase({ current, onChoose, disabled = false, description }: {
  /** The plan to mark as current, or null while unknown. */
  current: CatalogPlanId | null;
  /** A paid, self-service plan was chosen. */
  onChoose: (plan: "personal" | "business") => void;
  disabled?: boolean;
  description?: string;
}) {
  const [compare, setCompare] = useState(false);
  const compareId = useId();
  const choose = (plan: SamplePlan) => {
    if (plan.id === "personal" || plan.id === "business") onChoose(plan.id);
  };
  return (
    <SSection title="Plans" icon={Star}
      description={description ?? "What each plan includes. Paid plans are monthly while LAGDA is in test mode."}>
      {/* The same "pass" as the Free pass on Home and every plan lock. */}
      <div className="pp-panel" data-testid="plan-panel">
        <div className="pp-panel-head">
          <span className="pp-panel-kicker">Choose your plan</span>
          <span className="pp-test" data-testid="sample-pricing-notice">
            <Info size={13} aria-hidden /> TEST MODE — NO MONEY IS MOVED. MONTHLY PLANS ONLY.
          </span>
        </div>
        <PlanCarousel label="Plans" tone="dark" testId="plan-carousel">
          {SAMPLE_PLANS.map(p => (
            <PlanTile key={p.id} plan={p} onChoose={choose} current={p.id === current} disabled={disabled} />
          ))}
        </PlanCarousel>
        <div className="pp-panel-foot">
          <button type="button" className="pp-compare-btn" aria-expanded={compare} aria-controls={compareId} onClick={() => { setCompare(c => !c); }}>
            {compare ? "Hide comparison" : "Compare all features"}
            <ChevronDown size={15} aria-hidden style={{ transform: compare ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} />
          </button>
        </div>
      </div>
      <div id={compareId} hidden={!compare}>{compare && <CompareTable />}</div>
      <style>{PLAN_PASS_CSS}</style>
    </SSection>
  );
}

// ── Invoices ───────────────────────────────────────────────────────────────

/** The owner's real (test-mode) invoices: one per approved plan change, newest first. */
function RealInvoicesSection({ isOwner }: { isOwner: boolean }) {
  const { invoices, error } = usePlanInvoices(isOwner);
  const billedTo = useInvoiceBilledTo();
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savePdf = (number: string) => {
    setSaving(number);
    setSaveError(null);
    downloadInvoicePdf(number, billedTo.workspace)
      .catch(() => { setSaveError("The PDF could not be created. Try again."); })
      .finally(() => { setSaving(null); });
  };
  const date = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  return (
    <SSection title="Invoices" icon={ReceiptText}
      description="One invoice for every plan change that was approved. Test mode bills nothing, so none of them has been paid.">
      {!isOwner ? (
        <p data-testid="invoices-owner-only" style={{ ...GF, fontSize: 13.5, color: SET.SLATE, margin: 0, lineHeight: 1.55 }}>
          Invoices are visible to the workspace owner, who holds the plan.
        </p>
      ) : error && invoices === null ? (
        <p role="alert" style={{ ...GF, fontSize: 13.5, color: "#991B1B", margin: 0 }}>Your invoices could not be loaded. Reload the page to try again.</p>
      ) : invoices === null ? (
        <p aria-busy="true" style={{ ...GF, fontSize: 13.5, color: SET.SLATE, margin: 0 }}>Loading your invoices…</p>
      ) : invoices.length === 0 ? (
        <p data-testid="no-invoices" style={{ ...GF, fontSize: 13.5, color: SET.SLATE, margin: 0, lineHeight: 1.55 }}>
          No invoices yet. When a Personal or Business plan is approved, its invoice appears here.
        </p>
      ) : (
        <ul data-testid="invoice-list" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {invoices.map(inv => (
            <li key={inv.number} data-testid={`invoice-${inv.number}`}
              style={{ border: `1px solid ${SET.BORDER}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ ...GM, fontSize: 13.5, fontWeight: 700, color: SET.NAVY }}>{inv.number}</span>
                  <Badge tone="neutral">Test — not paid</Badge>
                </div>
                <div style={{ ...GF, fontSize: 13, color: SET.INK, marginTop: 4 }}>
                  {inv.planName} · {date(inv.issuedAt)} – {date(inv.periodEnd)}
                </div>
                <div style={{ ...GF, fontSize: 12, color: SET.SLATE }}>Billed to {billedTo.name}</div>
              </div>
              <span style={{ ...GF, fontSize: 18, fontWeight: 800, color: SET.NAVY }}>{formatPeso(inv.amountPesos)}</span>
              <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                <Link to={invoicePath(inv.number)} data-testid={`view-invoice-${inv.number}`} style={{ ...BTN_SECONDARY }}>
                  View <ArrowRight size={14} aria-hidden />
                </Link>
                <button type="button" data-testid={`pdf-invoice-${inv.number}`} disabled={saving !== null}
                  onClick={() => { savePdf(inv.number); }} style={{ ...BTN_SECONDARY, cursor: saving !== null ? "default" : "pointer" }}>
                  <Download size={14} aria-hidden /> {saving === inv.number ? "Preparing…" : "PDF"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {saveError && <p role="alert" style={{ ...GF, fontSize: 13, color: "#991B1B", margin: "10px 0 0" }}>{saveError}</p>}
      <p style={{ ...GM, fontSize: 10.5, letterSpacing: "0.08em", color: TONES.warning.fg, margin: "12px 0 0" }}>{TEST_INVOICE_BANNER}</p>
    </SSection>
  );
}

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
          <div className="inv-qr" style={{ textAlign: "center", flexShrink: 0 }}>
            <VerificationQRCode url={url} size={112} alt={`QR code linking to sample invoice ${SAMPLE_INVOICE_ID}`} />
            <div style={{ ...GF, fontSize: 11.5, color: SET.SLATE, marginTop: 4 }}>Scan to open</div>
          </div>
          {/* On a phone the QR wraps below the details: give it the whole row, centred. */}
          <style>{`@media (max-width: 640px) { .inv-qr { flex: 1 1 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; } }`}</style>
        </div>
      </div>
    </SSection>
  );
}

export function BillingPage() {
  const { plan, info } = useWorkspacePlan();
  const navigate = useNavigate();
  return (
    <SettingsPage title="Billing & Plan" breadcrumb="Billing & Plan" description="This workspace’s plan, what each plan includes, and your invoices.">
      <Notice tone="info" icon={Sparkles}>A plan belongs to a person: this workspace has its owner’s plan. The owner changes it from My Settings › Plan &amp; Billing.</Notice>
      <OverviewCard />
      <PlanShowcase current={plan} onChoose={id => { void navigate(`/app/settings/plan?choose=${id}`); }}
        description="What each plan includes. Choosing one opens your own Plan & Billing." />
      {USE_REAL_BACKEND ? <RealInvoicesSection isOwner={info?.ownerIsYou === true} /> : <InvoicesSection />}
    </SettingsPage>
  );
}
