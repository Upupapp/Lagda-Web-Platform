// /app/settings/billing — Current plan, billing account, invoices, and plan direction.
// Frontend-only. No payment processing, subscription changes, or card collection.
// All billing data is fictional demonstration data.

import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { SettingsPage, SSection, SCard, SField, INPUT_STYLE, StatusBadge, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockBillingSettingsService } from "../../../services/mock/settings.service";
import type { BillingAccount, InvoiceSummary } from "../../../models/settings";
import { LAGDA_PLANS, COMPARE_GROUPS } from "../../../config/pricing.config";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const GREEN = "#16A34A";

function invoiceStatusColor(status: string) {
  if (status === "demonstration-paid") return GREEN;
  if (status === "demonstration-open") return GOLD;
  return SLATE;
}

function invoiceStatusLabel(status: string) {
  if (status === "demonstration-paid")   return "Paid (Demo)";
  if (status === "demonstration-open")   return "Open (Demo)";
  return "Voided (Demo)";
}

type Tab = "overview" | "invoices" | "comparison";

export function BillingPage() {
  const [billing, setBilling] = useState<BillingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>("overview");
  const [editContact, setEditContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", poRef: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaved, setContactSaved]   = useState(false);
  const [planPreview, setPlanPreview]     = useState<string | null>(null);
  const [simulating, setSimulating]       = useState(false);
  const [simResult, setSimResult]         = useState<string | null>(null);

  useEffect(() => {
    mockBillingSettingsService.getBillingAccount().then(b => {
      setBilling(b);
      setContactForm({ name: b.billingContact.name, email: b.billingContact.email, poRef: b.billingContact.poRef });
      setLoading(false);
    });
  }, []);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    const updated = await mockBillingSettingsService.updateBillingContact(contactForm);
    setBilling(updated);
    setSavingContact(false);
    setContactSaved(true);
    setEditContact(false);
    setTimeout(() => setContactSaved(false), 2500);
  };

  const handleSimulatePlan = async (planId: string, planName: string) => {
    setSimulating(true);
    const res = await mockBillingSettingsService.simulatePlanChange(planId, planName);
    const updated = await mockBillingSettingsService.getBillingAccount();
    setBilling(updated);
    setSimulating(false);
    setPlanPreview(null);
    setSimResult(res.message);
    setTimeout(() => setSimResult(null), 4000);
  };

  if (loading) return <SettingsPage title="Billing & Plan" breadcrumb="Billing & Plan"><Skeleton h={120} mb={16} /><Skeleton h={120} /></SettingsPage>;

  return (
    <SettingsPage title="Billing & Plan" breadcrumb="Billing & Plan">
      {DEMO_NOTICE}

      {simResult && (
        <div role="status" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginBottom: 16, ...GF, fontSize: 13, color: "#166534" }}>
          {simResult}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E3E8EF", marginBottom: 20 }}>
        {(["overview", "invoices", "comparison"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...GF, fontSize: 13, fontWeight: tab === t ? 700 : 400, color: tab === t ? AZURE : SLATE, background: "none", border: "none", borderBottom: `2px solid ${tab === t ? AZURE : "transparent"}`, padding: "8px 16px", cursor: "pointer", marginBottom: -2, textTransform: "capitalize" }}>
            {t === "comparison" ? "Plan Comparison" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && billing && (
        <>
          <SSection title="Current Plan">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <StatusBadge label={billing.planName} color={GOLD} />
              <StatusBadge label={billing.status === "active" ? "Active" : billing.status} color={billing.status === "active" ? GREEN : SLATE} />
              <span style={{ ...GF, fontSize: 12, color: SLATE }}>{billing.billingCycle === "annual" ? "Annual" : "Monthly"} billing</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 14 }}>
              {[
                { label: "Active Members", value: String(billing.activeMembers) },
                { label: "Seat Allocation", value: String(billing.seatAllocation) },
                { label: "Pending Invites", value: String(billing.pendingInvites) },
                { label: "Renewal Direction", value: billing.nextReviewDate },
              ].map(s => (
                <div key={s.label} style={{ background: "#F8FAFC", border: "1px solid #E3E8EF", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ ...GF, fontSize: 11, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY }}>{s.value}</div>
                </div>
              ))}
            </div>
            {billing.activeMembers >= billing.seatAllocation * 0.8 && (
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "8px 12px", ...GF, fontSize: 12, color: "#92400E" }}>
                ⚠ Seat usage is approaching allocation. Review your plan or contact sales.
              </div>
            )}
            <Link to="/app/workspace/members" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none" }}>View Members →</Link>
          </SSection>

          {/* Payment method */}
          <SSection title="Payment Method">
            <div role="note" style={{ ...GF, fontSize: 12, color: SLATE, marginBottom: 12, fontStyle: "italic" }}>
              Fictional demonstration data. Do not enter real card information in this frontend.
            </div>
            {billing.paymentMethod && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", border: "1.5px solid #E3E8EF", borderRadius: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, minWidth: 32 }}>▪</div>
                <div>
                  <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>
                    {billing.paymentMethod.cardBrand} •••• {billing.paymentMethod.lastFour}
                  </div>
                  <div style={{ ...GF, fontSize: 12, color: SLATE }}>
                    Expires {billing.paymentMethod.expiryMonth}/{billing.paymentMethod.expiryYear} · {billing.paymentMethod.billingName}
                  </div>
                </div>
                <StatusBadge label={billing.paymentMethod.status === "active" ? "Active" : billing.paymentMethod.status} color={billing.paymentMethod.status === "active" ? GREEN : GOLD} />
              </div>
            )}
            <button disabled style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "8px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, color: SLATE, background: "#F8FAFC", cursor: "not-allowed" }}>
              Update payment method (demonstration only)
            </button>
          </SSection>

          {/* Billing contact */}
          <SSection title="Billing Contact">
            {editContact ? (
              <form onSubmit={handleSaveContact} noValidate>
                <SField label="Contact name">
                  <input type="text" value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} style={INPUT_STYLE} />
                </SField>
                <SField label="Billing email" help="Read-only in production. Change via account settings.">
                  <input type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} style={INPUT_STYLE} />
                </SField>
                <SField label="Purchase order ref.">
                  <input type="text" value={contactForm.poRef} onChange={e => setContactForm(p => ({ ...p, poRef: e.target.value }))} style={INPUT_STYLE} />
                </SField>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" disabled={savingContact} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "8px 16px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: "pointer" }}>{savingContact ? "Saving…" : "Save"}</button>
                  <button type="button" onClick={() => setEditContact(false)} style={{ ...GF, fontSize: 13, padding: "8px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", color: SLATE, cursor: "pointer" }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ ...GF, fontSize: 13, color: NAVY, marginBottom: 4 }}><strong>{billing.billingContact.name}</strong></div>
                <div style={{ ...GF, fontSize: 13, color: SLATE, marginBottom: 2 }}>{billing.billingContact.email}</div>
                {billing.billingContact.poRef && <div style={{ ...GF, fontSize: 12, color: SLATE }}>PO: {billing.billingContact.poRef}</div>}
                <button onClick={() => setEditContact(true)} style={{ ...GF, fontSize: 13, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 10 }}>Edit billing contact</button>
                {contactSaved && <span role="status" style={{ ...GF, fontSize: 12, color: GREEN, marginLeft: 12 }}>Saved (demonstration).</span>}
              </div>
            )}
          </SSection>
        </>
      )}

      {/* Invoices tab */}
      {tab === "invoices" && billing && (
        <SSection title="Invoice History">
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 14px", fontStyle: "italic" }}>
            All invoices below are fictional demonstration records. No financial data is real.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table role="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ borderBottom: "2px solid #E3E8EF", background: "#F8FAFC" }}>
                <tr>
                  {["Invoice", "Period", "Date", "Amount", "Status", "Action"].map(h => (
                    <th key={h} style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 12px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {billing.invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: "1px solid #F0F2F5" }}>
                    <td style={{ ...{ fontFamily: "'Geist Mono', monospace" }, fontSize: 12, color: NAVY, padding: "10px 12px" }}>{inv.id}</td>
                    <td style={{ ...GF, fontSize: 13, color: SLATE, padding: "10px 12px" }}>{inv.billingPeriod}</td>
                    <td style={{ ...GF, fontSize: 13, color: SLATE, padding: "10px 12px" }}>{new Date(inv.date).toLocaleDateString("en-PH", { year: "numeric", month: "short" })}</td>
                    <td style={{ ...GF, fontSize: 13, color: SLATE, padding: "10px 12px" }}>{inv.amountLabel}</td>
                    <td style={{ padding: "10px 12px" }}><StatusBadge label={invoiceStatusLabel(inv.status)} color={invoiceStatusColor(inv.status)} /></td>
                    <td style={{ padding: "10px 12px" }}>
                      <button disabled style={{ ...GF, fontSize: 12, color: SLATE, background: "none", border: "none", cursor: "not-allowed" }}>Download unavailable</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SSection>
      )}

      {/* Plan comparison tab */}
      {tab === "comparison" && (
        <div>
          <p style={{ ...GF, fontSize: 13, color: SLATE, marginBottom: 16 }}>
            Compare plan features. Plan-change simulations do not alter any subscription, payment, or feature entitlement.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: `200px repeat(${LAGDA_PLANS.length}, 1fr)`, gap: 0, border: "1.5px solid #E3E8EF", borderRadius: 10, overflow: "hidden", overflowX: "auto" }}>
            {/* Header */}
            <div style={{ background: "#F8FAFC", padding: "12px 16px", borderBottom: "2px solid #E3E8EF" }} />
            {LAGDA_PLANS.map(p => (
              <div key={p.id} style={{ background: p.featured ? "#EBF5FB" : "#F8FAFC", padding: "12px 16px", borderBottom: "2px solid #E3E8EF", borderLeft: "1px solid #E3E8EF", textAlign: "center" }}>
                <div style={{ ...GF, fontSize: 14, fontWeight: 800, color: p.featured ? AZURE : NAVY }}>{p.name}</div>
                {p.featured && <div style={{ ...GF, fontSize: 11, color: AZURE }}>Most popular</div>}
                {billing && p.id !== billing.planId && (
                  <button onClick={() => setPlanPreview(p.id)} style={{ ...GF, fontSize: 12, fontWeight: 600, padding: "5px 12px", border: `1.5px solid ${AZURE}`, borderRadius: 6, color: AZURE, background: "#FFFFFF", cursor: "pointer", marginTop: 8 }}>
                    {p.contactSales ? "Contact Sales" : "Preview change →"}
                  </button>
                )}
                {billing && p.id === billing.planId && <div style={{ ...GF, fontSize: 12, color: GREEN, marginTop: 8, fontWeight: 600 }}>Current plan</div>}
              </div>
            ))}

            {/* Feature rows */}
            {COMPARE_GROUPS.map(group => (
              <React.Fragment key={group.id}>
                <div style={{ gridColumn: `span ${LAGDA_PLANS.length + 1}`, background: "#F8FAFC", padding: "8px 16px", borderTop: "1px solid #E3E8EF", ...GF, fontSize: 11, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {group.title}
                </div>
                {group.rows.map(row => [
                  <div key={`label-${row.id}`} style={{ padding: "10px 16px", borderTop: "1px solid #F0F2F5", ...GF, fontSize: 13, color: NAVY }}>{row.label}</div>,
                  ...LAGDA_PLANS.map(p => {
                    const planVals: Record<string, string> = { personal: row.personal, business: row.business, enterprise: row.enterprise };
                    const val = planVals[p.id] ?? "";
                    const icon = val === "included" ? "✓" : val === "not-included" ? "—" : val === "enterprise" ? "E" : val === "varies" ? "~" : val === "pending" ? "·" : val;
                    const color = val === "included" ? GREEN : val === "not-included" ? "#CBD5E1" : val === "enterprise" ? GOLD : SLATE;
                    return (
                      <div key={`${row.id}-${p.id}`} style={{ padding: "10px 12px", borderTop: "1px solid #F0F2F5", borderLeft: "1px solid #E3E8EF", textAlign: "center", background: p.featured ? "#F8FBFF" : "#FFFFFF" }}>
                        <span style={{ ...GF, fontSize: 13, fontWeight: val === "included" ? 700 : 400, color }}>{icon}</span>
                      </div>
                    );
                  }),
                ])}
              </React.Fragment>
            ))}
          </div>

          {/* Plan change preview dialog */}
          {planPreview && (
            <div role="dialog" aria-modal="true" aria-label="Plan change preview" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 28, maxWidth: 460, width: "100%" }}>
                <h2 style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 12px" }}>Plan Change Preview</h2>
                <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 14px" }}>
                  Switch to <strong>{LAGDA_PLANS.find(p => p.id === planPreview)?.name}</strong>? This is a frontend simulation only.
                </p>
                <div role="note" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 18, ...GF, fontSize: 12, color: "#92400E" }}>
                  This plan change is simulated in frontend state. No subscription, invoice, payment, seat allocation, or feature entitlement is changed by a backend.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => handleSimulatePlan(planPreview, LAGDA_PLANS.find(p => p.id === planPreview)?.name ?? planPreview)} disabled={simulating}
                    style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: "pointer" }}>
                    {simulating ? "Simulating…" : "Confirm simulation"}
                  </button>
                  <button onClick={() => setPlanPreview(null)} style={{ ...GF, fontSize: 13, padding: "9px 16px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", color: SLATE, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </SettingsPage>
  );
}
