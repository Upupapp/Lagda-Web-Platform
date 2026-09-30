// /app/workspace/settings/billing/invoices/:invoiceId — the full SAMPLE invoice.
//
// Signed-in only (it lives under the platform layout). There is exactly one
// invoice, INV-SAMPLE-0001, and it is a sample: the banner says so at the
// top, the payment status says "Sample — not paid", and the audit trail ends
// with "Marked as sample". Any other id is "not found".
//
// Printable: the print stylesheet drops the platform and settings chrome so
// only the invoice is on the page, and the sample banner prints with it.

import { Link, useParams } from "react-router";
import { ArrowLeft, Printer, ReceiptText, History } from "lucide-react";
import { SettingsPage, SCard, Badge, BTN_SECONDARY, SET, TONES } from "../SettingsShell";
import { VerificationQRCode } from "../../../../components/verification/VerificationQRCode";
import { formatPeso } from "../../../../config/pricing.config";
import { formatDate } from "../settings-data";
import {
  SAMPLE_INVOICE_ID, SAMPLE_INVOICE_PATH, SAMPLE_INVOICE_BANNER, VAT_RATE, buildSampleInvoice, useInvoiceBilledTo,
} from "./sample-invoice";

const GF = { fontFamily: SET.FONT };
const GM = { fontFamily: SET.MONO };

function SampleBanner() {
  return (
    <div data-testid="invoice-sample-banner" className="inv-banner" style={{
      ...GM, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textAlign: "center",
      color: TONES.warning.fg, background: TONES.warning.bg, border: `1px solid ${TONES.warning.border}`,
      borderRadius: 8, padding: "9px 12px", marginBottom: 16,
    }}>
      {SAMPLE_INVOICE_BANNER}
    </div>
  );
}

const PRINT_CSS = `
@media print {
  .platform-desktop-nav, .platform-mobile-nav, .platform-desktop-header, .inv-no-print { display: none !important; }
  .inv-sheet { box-shadow: none !important; border: none !important; }
  .inv-banner, .inv-status { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { background: #FFFFFF !important; }
}
`;

export function InvoicePage() {
  const { invoiceId } = useParams();
  const billedTo = useInvoiceBilledTo();
  const back = (
    <Link to="/app/workspace/settings/billing" className="inv-no-print" style={{ ...GF, fontSize: 13, fontWeight: 600, color: SET.AZURE_TEXT, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, minHeight: 32, marginBottom: 10 }}>
      <ArrowLeft size={15} aria-hidden /> Billing & Plan
    </Link>
  );

  if (invoiceId !== SAMPLE_INVOICE_ID) {
    return (
      <SettingsPage title="Invoice not found" breadcrumb="Billing & Plan › Invoice">
        {back}
        <SCard><p style={{ ...GF, fontSize: 13.5, color: SET.SLATE, margin: 0 }}>There is no invoice with that number. Early Access is not billed, so the only invoice is the sample.</p></SCard>
      </SettingsPage>
    );
  }

  const inv = buildSampleInvoice(billedTo.name);
  const url = typeof window !== "undefined" ? `${window.location.origin}${SAMPLE_INVOICE_PATH}` : SAMPLE_INVOICE_PATH;
  const cell = { padding: "10px 12px", borderTop: `1px solid ${SET.BORDER}` } as const;

  return (
    <SettingsPage title={`Invoice ${inv.id}`} breadcrumb="Billing & Plan › Invoice"
      actions={<button type="button" className="inv-no-print" onClick={() => { window.print(); }} style={BTN_SECONDARY}><Printer size={15} aria-hidden /> Print</button>}>
      {back}
      <SampleBanner />

      <SCard style={{ padding: "clamp(16px, 4vw, 32px)" }}>
        <div className="inv-sheet" data-testid="invoice-sheet">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "0.04em", color: SET.NAVY }}>LAGDA</div>
              <div style={{ ...GF, fontSize: 12.5, color: SET.SLATE, marginTop: 2 }}>Electronic signatures · lagda.ph</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 0 }}>
              <div style={{ ...GM, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: SET.MUTED }}>Invoice</div>
              <div data-testid="invoice-number" style={{ ...GM, fontSize: 16, fontWeight: 700, color: SET.NAVY }}>{inv.id}</div>
              <div style={{ ...GF, fontSize: 12.5, color: SET.SLATE, marginTop: 4 }}>Issued {formatDate(inv.issuedAt)}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 18, marginTop: 24 }}>
            <div>
              <div style={{ ...GM, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: SET.MUTED, marginBottom: 4 }}>Issued by</div>
              <div style={{ ...GF, fontSize: 13.5, color: SET.NAVY, fontWeight: 700 }}>LAGDA</div>
              <div style={{ ...GF, fontSize: 13, color: SET.SLATE }}>Philippines</div>
            </div>
            <div>
              <div style={{ ...GM, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: SET.MUTED, marginBottom: 4 }}>Billed to</div>
              <div data-testid="invoice-page-billed-name" style={{ ...GF, fontSize: 13.5, color: SET.NAVY, fontWeight: 700 }}>{billedTo.name}</div>
              {billedTo.email && <div style={{ ...GF, fontSize: 13, color: SET.SLATE, overflowWrap: "anywhere" }}>{billedTo.email}</div>}
              <div style={{ ...GF, fontSize: 13, color: SET.SLATE }}>{billedTo.workspace}</div>
            </div>
            <div>
              <div style={{ ...GM, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: SET.MUTED, marginBottom: 4 }}>Payment status</div>
              <span className="inv-status" data-testid="invoice-status"><Badge tone="warning" dot>Sample — not paid</Badge></span>
              <div style={{ ...GF, fontSize: 12.5, color: SET.SLATE, marginTop: 6 }}>Service period {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}</div>
            </div>
          </div>

          <div style={{ position: "relative", overflowX: "auto", marginTop: 24 }}>
            <table style={{ width: "100%", minWidth: 440, borderCollapse: "collapse", ...GF, fontSize: 13.5 }}>
              <caption className="st-visually-hidden">Line items</caption>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th scope="col" style={{ textAlign: "left", padding: "10px 12px", color: SET.SLATE, fontWeight: 600 }}>Description</th>
                  <th scope="col" style={{ textAlign: "right", padding: "10px 12px", color: SET.SLATE, fontWeight: 600 }}>Qty</th>
                  <th scope="col" style={{ textAlign: "right", padding: "10px 12px", color: SET.SLATE, fontWeight: 600 }}>Unit price</th>
                  <th scope="col" style={{ textAlign: "right", padding: "10px 12px", color: SET.SLATE, fontWeight: 600 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.lines.map(l => (
                  <tr key={l.description}>
                    <td style={{ ...cell, color: SET.NAVY }}>
                      <div style={{ fontWeight: 600 }}>{l.description}</div>
                      <div style={{ fontSize: 12.5, color: SET.SLATE }}>{l.detail}</div>
                    </td>
                    <td style={{ ...cell, textAlign: "right", ...GM }}>{l.quantity}</td>
                    <td style={{ ...cell, textAlign: "right", ...GM }}>{formatPeso(l.unitPrice, true)}</td>
                    <td style={{ ...cell, textAlign: "right", ...GM, fontWeight: 700, color: SET.NAVY }}>{formatPeso(l.amount, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginTop: 18, alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <VerificationQRCode url={url} size={96} alt={`QR code linking to this sample invoice, ${inv.id}`} />
              <div style={{ ...GF, fontSize: 12, color: SET.SLATE, maxWidth: 200, lineHeight: 1.5 }}>Scan to open this invoice in LAGDA. You must be signed in.</div>
            </div>
            <dl style={{ margin: 0, minWidth: 240, flex: "0 1 300px", ...GF, fontSize: 13.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                <dt style={{ color: SET.SLATE }}>Subtotal (excl. VAT)</dt><dd style={{ margin: 0, ...GM }}>{formatPeso(inv.subtotal, true)}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                <dt style={{ color: SET.SLATE }}>VAT {Math.round(VAT_RATE * 100)}%</dt><dd data-testid="invoice-vat" style={{ margin: 0, ...GM }}>{formatPeso(inv.vat, true)}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", marginTop: 4, borderTop: `2px solid ${SET.NAVY}` }}>
                <dt style={{ color: SET.NAVY, fontWeight: 800 }}>Total</dt><dd data-testid="invoice-total" style={{ margin: 0, ...GM, fontWeight: 800, color: SET.NAVY }}>{formatPeso(inv.total, true)}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                <dt style={{ color: SET.SLATE }}>Amount paid</dt><dd style={{ margin: 0, ...GM }}>{formatPeso(0, true)}</dd>
              </div>
            </dl>
          </div>
          <p style={{ ...GF, fontSize: 12, color: SET.SLATE, margin: "18px 0 0", lineHeight: 1.55 }}>
            Prices include 12% VAT. This is a sample for illustration: it is not a request for payment, not an official receipt, and no payment has been taken.
          </p>
        </div>
      </SCard>

      <SCard>
        <h3 style={{ ...GF, fontSize: 15, fontWeight: 700, color: SET.NAVY, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
          <History size={17} aria-hidden color={SET.AZURE_TEXT} /> Audit trail
        </h3>
        <p style={{ ...GF, fontSize: 12.5, color: SET.SLATE, margin: "0 0 12px" }}>Sample events, shown so you can see what the trail records.</p>
        <ol data-testid="invoice-audit" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {inv.audit.map((a, i) => (
            <li key={a.event} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${SET.BORDER}`, flexWrap: "wrap" }}>
              <span aria-hidden style={{ width: 28, height: 28, borderRadius: 8, background: "#EFF6FD", color: SET.AZURE_TEXT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ReceiptText size={14} />
              </span>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div data-testid="audit-event" style={{ ...GF, fontSize: 13.5, fontWeight: 700, color: SET.NAVY }}>{a.event}</div>
                <div style={{ ...GF, fontSize: 12.5, color: SET.SLATE }}>{a.detail}</div>
              </div>
              <time dateTime={new Date(a.at).toISOString()} style={{ ...GM, fontSize: 12, color: SET.SLATE }}>{formatDate(a.at, true)}</time>
            </li>
          ))}
        </ol>
      </SCard>
      <style>{PRINT_CSS}</style>
    </SettingsPage>
  );
}
