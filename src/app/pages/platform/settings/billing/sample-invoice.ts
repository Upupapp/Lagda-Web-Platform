// The one SAMPLE invoice shown under Billing & Plan.
//
// Nothing here was billed or paid. It exists so a workspace owner can see
// what a LAGDA invoice will look like — line items, 12% VAT, a verification
// QR code — before paid plans open. Every view of it carries the sample
// banner, and its number says SAMPLE.
//
// The amounts come from the Business plan's annual SAMPLE price in
// config/pricing.config, so the invoice cannot disagree with the plan cards.
// Prices are VAT-inclusive: the ₱7,990 on the card is the invoice total.

import { plansService, type PlanInvoice } from "../../../../services/real/plans.service";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { useLiveQuery, SETTINGS_TTL_MS } from "../../../../services/live/live-query";
import { SAMPLE_PLANS } from "../../../../config/pricing.config";
import { usePlatform } from "../../../../context/PlatformContext";

export const SAMPLE_INVOICE_ID = "INV-SAMPLE-0001";
export const SAMPLE_INVOICE_PATH = `/app/workspace/settings/billing/invoices/${SAMPLE_INVOICE_ID}`;
export const SAMPLE_INVOICE_BANNER = "SAMPLE INVOICE — NO PAYMENT HAS BEEN TAKEN";
export const VAT_RATE = 0.12;

const business = SAMPLE_PLANS.find(p => p.id === "business");
/** ₱7,990 — the Business plan's annual sample price for one user. */
export const SAMPLE_INVOICE_TOTAL = business?.price?.annual ?? 7990;

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface SampleInvoice {
  id: string;
  planLabel: string;
  issuedAt: number;
  periodStart: number;
  periodEnd: number;
  lines: { description: string; detail: string; quantity: number; unitPrice: number; amount: number }[];
  /** VAT-exclusive. */
  subtotal: number;
  vat: number;
  total: number;
  currency: "PHP";
  audit: { at: number; event: string; detail: string }[];
}

export function buildSampleInvoice(billedToName: string): SampleInvoice {
  const issuedAt = Date.UTC(2026, 8, 1, 1, 0); // 1 Sep 2026, 09:00 Manila
  const periodStart = issuedAt;
  const periodEnd = Date.UTC(2027, 7, 31, 15, 59);
  const total = SAMPLE_INVOICE_TOTAL;
  const subtotal = round2(total / (1 + VAT_RATE));
  const vat = round2(total - subtotal);
  return {
    id: SAMPLE_INVOICE_ID,
    planLabel: "Business (annual)",
    issuedAt, periodStart, periodEnd,
    lines: [{
      description: "LAGDA Business — annual plan",
      detail: "1 user · 12 months · sample pricing",
      quantity: 1, unitPrice: total, amount: total,
    }],
    subtotal, vat, total, currency: "PHP",
    audit: [
      { at: issuedAt, event: "Issued", detail: "Invoice created by LAGDA" },
      { at: issuedAt + 5 * 60_000, event: "Viewed", detail: `Opened by ${billedToName}` },
      { at: issuedAt + 6 * 60_000, event: "Marked as sample", detail: "No payment is due and none has been taken" },
    ],
  };
}

export interface BilledTo { name: string; email: string; workspace: string }

/**
 * Who an invoice is addressed to: the SIGNED-IN person. A plan belongs to a
 * person, the server lists only the caller's own invoices and prints the
 * caller's name on the PDF — so the page says the same, whichever workspace
 * it is opened from (the workspace name is just where it was opened).
 */
export function useInvoiceBilledTo(): BilledTo {
  const platform = usePlatform();
  return {
    name: platform.user?.fullName ?? platform.user?.displayName ?? "You",
    email: platform.user?.email ?? "",
    workspace: platform.currentWorkspace?.name ?? "Your workspace",
  };
}


// ── Real (test-mode) invoices ──────────────────────────────────────────────
//
// One per approved plan change, from the server. Nothing was paid: each says
// so. They follow the person's plan live (services/live): an approval, here
// or in another tab, announces `plan`, which re-reads them — so the invoice
// is there the moment the plan changes — and the held list shows at once on
// a return to the page.

export const TEST_INVOICE_BANNER = "TEST MODE — NO PAYMENT HAS BEEN TAKEN";
export const invoicePath = (number: string) => `/app/workspace/settings/billing/invoices/${encodeURIComponent(number)}`;

export function usePlanInvoices(enabled = true): { invoices: PlanInvoice[] | null; error: boolean } {
  const query = useLiveQuery(
    enabled && USE_REAL_BACKEND ? "billing:invoices" : null,
    () => plansService.invoices(),
    { ttl: SETTINGS_TTL_MS, topics: ["plan", "billing"] },
  );
  return { invoices: query.data?.invoices ?? null, error: query.error !== undefined };
}

/** A real invoice in the shape the invoice page draws. Prices include VAT. */
export function buildPlanInvoice(inv: PlanInvoice, billedToName: string): SampleInvoice {
  const issuedAt = Date.parse(inv.issuedAt);
  const periodEnd = Date.parse(inv.periodEnd);
  const total = inv.amountPesos;
  const subtotal = round2(total / (1 + VAT_RATE));
  return {
    id: inv.number,
    planLabel: `${inv.planName} (monthly)`,
    issuedAt, periodStart: issuedAt, periodEnd,
    lines: [{
      description: `LAGDA ${inv.planName} — monthly plan`,
      detail: "1 month · test-mode pricing",
      quantity: 1, unitPrice: total, amount: total,
    }],
    subtotal, vat: round2(total - subtotal), total, currency: "PHP",
    audit: [
      { at: Date.parse(inv.issuedAt) - 1000, event: "Requested", detail: `${billedToName} asked for the ${inv.planName} plan` },
      { at: issuedAt, event: "Approved", detail: `${inv.planName} was activated for one month` },
      { at: issuedAt, event: "Issued", detail: "Invoice created by LAGDA" },
      { at: issuedAt, event: "Marked as test", detail: "Test mode: no payment is due and none has been taken" },
    ],
  };
}


/** Builds the PDF on the server and saves it as `<number>.pdf`. */
export async function downloadInvoicePdf(number: string, workspace: string): Promise<void> {
  const blob = await plansService.invoicePdf(number, workspace);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
}
