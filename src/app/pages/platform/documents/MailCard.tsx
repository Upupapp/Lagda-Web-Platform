// The document mail card — Documents › Correspondence.
//
// A formal letter-like card: the workspace's banner across the top (the
// SENDER's for "I must sign", this workspace's own for "Sent") with the date
// in its top-right corner, the document centred as the body, and the card's
// actions along its bottom edge — secondary ones at the very left, the main
// one at the very right. The same BrandBand the Completed cards draw.

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BrandBand } from "../settings/branding-preview";

const NAVY = "#07111F";
const SLATE = "#475569";
const BORDER = "#E2E8F0";

export interface MailCardBranding {
  displayName: string;
  primaryColor: string;
  logoUrl: string | null;
}

export function MailCard({
  branding, subtitle, corner, title, children, footerStart, footerEnd, testId = "mail-card",
}: {
  branding: MailCardBranding;
  /** The banner's second line, e.g. "Signature requested". */
  subtitle: string;
  /** Top-right corner of the banner, e.g. "Received Sep 28, 2026". */
  corner: ReactNode;
  title: string;
  /** Centred lines under the title: who sent it, progress, deadline. */
  children?: ReactNode;
  /** Very bottom-left. */
  footerStart?: ReactNode;
  /** Very bottom-right. */
  footerEnd?: ReactNode;
  testId?: string;
}) {
  return (
    <li className="mail-card" data-testid={testId}>
      <div className="mail-card-banner">
        <BrandBand variant="card" compact testId={`${testId}-banner`} subtitle={subtitle}
          branding={{ displayName: branding.displayName, primaryColor: branding.primaryColor, logoPreviewUrl: branding.logoUrl }}
          headerAside={<span className="mail-card-corner">{corner}</span>} />
      </div>
      <div className="mail-card-body">
        <h3 className="mail-card-title" title={title}>{title}</h3>
        {children}
      </div>
      {(footerStart !== undefined || footerEnd !== undefined) && (
        <div className="mail-card-footer">
          <div className="mail-card-footer-start">{footerStart}</div>
          <div className="mail-card-footer-end">{footerEnd}</div>
        </div>
      )}
    </li>
  );
}

/** A centred secondary line in the card body. */
export function MailLine({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "strong" | "warning" }) {
  return (
    <p className={`mail-card-line mail-card-line-${tone}`}>{children}</p>
  );
}

/** A mail-card action button. `primary` is the filled main action. */
export function MailAction({ icon: Icon, label, onClick, primary = false, ariaLabel }: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel}
      className={primary ? "mail-action mail-action-primary" : "mail-action"}>
      <Icon size={15} aria-hidden /> <span>{label}</span>
    </button>
  );
}

/**
 * Centred in the page. A single letter is drawn narrow (510 px), the way one
 * letter sits on a desk; several use the wider column. Both shrink to the
 * screen on a phone.
 */
export function MailCardList({ label, children }: { label: string; children: ReactNode }) {
  const single = Array.isArray(children) ? children.filter(Boolean).length === 1 : children !== null && children !== undefined;
  return (
    <>
      <ul className={single ? "mail-card-list mail-card-list-single" : "mail-card-list"} aria-label={label}>{children}</ul>
      <style>{MAIL_STYLES}</style>
    </>
  );
}

const MAIL_STYLES = `
  .mail-card-list {
    list-style: none; margin: 16px auto 0; padding: 0; display: flex; flex-direction: column; gap: 16px;
    width: 100%; max-width: 920px; box-sizing: border-box;
  }
  .mail-card-list-single { max-width: 510px; }
  .mail-card {
    background: #FFFFFF; border: 1px solid ${BORDER}; border-radius: 12px; overflow: hidden; min-width: 0;
    box-shadow: 0 1px 2px rgba(7,17,31,0.05), 0 6px 18px -12px rgba(7,17,31,0.18);
  }
  .mail-card-corner {
    font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 600; color: #FFFFFF; white-space: nowrap;
    background: rgba(7,17,31,0.22); border-radius: 999px; padding: 4px 10px; align-self: flex-start; flex-shrink: 0;
  }
  .mail-card-body {
    padding: 22px 24px 18px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px;
    border-bottom: 1px solid #F1F5F9;
  }
  .mail-card-title {
    font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif; font-size: 19px; font-weight: 600; line-height: 1.35;
    color: ${NAVY}; margin: 0 0 2px; overflow-wrap: anywhere; max-width: 640px;
  }
  .mail-card-line { font-family: 'Geist', sans-serif; font-size: 13.5px; margin: 0; line-height: 1.5; overflow-wrap: anywhere; }
  .mail-card-line-muted { color: ${SLATE}; }
  .mail-card-line-strong { color: ${NAVY}; font-weight: 600; }
  .mail-card-line-warning { color: #B45309; font-weight: 600; }
  .mail-card-footer {
    display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
    padding: 12px 16px; background: #F8FAFC;
  }
  .mail-card-footer-start, .mail-card-footer-end { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .mail-card-footer-end { margin-left: auto; justify-content: flex-end; }
  .mail-action {
    font-family: 'Geist', sans-serif; display: inline-flex; align-items: center; gap: 6px; min-height: 38px;
    padding: 0 14px; border-radius: 8px; border: 1px solid #D1D9E0; background: #FFFFFF; color: ${NAVY};
    font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
  }
  .mail-action:hover { border-color: #0078D4; color: #005A9E; }
  .mail-action-primary { background: #0078D4; border-color: #0078D4; color: #FFFFFF; }
  .mail-action-primary:hover { background: #005A9E; border-color: #005A9E; color: #FFFFFF; }
  .mail-action:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
  .mail-progress { width: min(100%, 320px); height: 6px; background: ${BORDER}; border-radius: 999px; overflow: hidden; margin-top: 4px; }
  .mail-progress > div { height: 100%; border-radius: 999px; }
  @media (max-width: 520px) {
    .mail-card-body { padding: 18px 16px 14px; }
    .mail-card-title { font-size: 17px; }
    .mail-card-footer { padding: 10px 12px; }
    .mail-action span { font-size: 12.5px; }
  }
`;

/** Formal date, e.g. "Sep 28, 2026". */
export function formalDate(iso: string | null): string {
  if (iso === null) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
