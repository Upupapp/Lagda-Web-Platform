// The document mail card — Documents › Correspondence.
//
// A formal letter-like card: the workspace's banner across the top (the
// SENDER's for "I must sign", this workspace's own for "Sent") with the date
// in its top-right corner, the document centred as the body, and the card's
// actions along its bottom edge — secondary ones at the very left, the main
// one at the very right. The same BrandBand the Completed cards draw.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
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
  branding, subtitle, corner, title, children, footerStart, footerEnd, testId = "mail-card", badge,
}: {
  /**
   * Something that sits ON the card's corner, half outside it. The card then
   * stops clipping at its edge (the banner and footer keep its rounded
   * corners themselves), so the badge is whole. Read after the body.
   */
  badge?: ReactNode;
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
  const hasBadge = badge !== undefined && badge !== null && badge !== false;
  const scroller = useActionScroller();
  return (
    <li className={hasBadge ? "mail-card mail-card-with-badge" : "mail-card"} data-testid={testId}>
      <div className="mail-card-banner">
        <BrandBand variant="card" compact testId={`${testId}-banner`} subtitle={subtitle}
          branding={{ displayName: branding.displayName, primaryColor: branding.primaryColor, logoPreviewUrl: branding.logoUrl }}
          headerAside={<span className="mail-card-corner">{corner}</span>} />
      </div>
      <div className="mail-card-body">
        <h3 className="mail-card-title" title={title}>{title}</h3>
        {children}
      </div>
      {hasBadge && badge}
      {(footerStart !== undefined || footerEnd !== undefined) && (
        <div className={scroller.scrolling ? "mail-card-footer mail-card-footer-scroll" : "mail-card-footer"}
          data-testid={`${testId}-footer`} data-scrolling={scroller.scrolling ? "true" : "false"}>
          <button type="button" className="mail-scroll-btn" aria-label="Show earlier actions" data-testid={`${testId}-scroll-left`}
            hidden={!scroller.scrolling || !scroller.canLeft} onClick={() => { scroller.by(-1); }}>
            <ChevronLeft size={18} aria-hidden />
          </button>
          <div ref={scroller.track} className="mail-card-footer-track" role="group" aria-label="Document actions"
            data-fade-left={scroller.scrolling && scroller.canLeft ? "true" : "false"}
            data-fade-right={scroller.scrolling && scroller.canRight ? "true" : "false"}>
            <div className="mail-card-footer-start">{footerStart}</div>
            <div className="mail-card-footer-end">{footerEnd}</div>
          </div>
          <button type="button" className="mail-scroll-btn" aria-label="Show more actions" data-testid={`${testId}-scroll-right`}
            hidden={!scroller.scrolling || !scroller.canRight} onClick={() => { scroller.by(1); }}>
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </li>
  );
}

/** From this many actions on, a card's actions become one scrolling row instead of wrapping onto lines. */
export const SCROLL_ACTIONS_FROM = 3;

/**
 * The card's action row. With three or more actions (counted from what the card
 * actually drew) they sit side by side in one row that scrolls sideways, with an
 * arrow at each end that appears only while there is more to see on that side.
 * Fewer than three keep the plain wrapping row.
 */
function useActionScroller() {
  const track = useRef<HTMLDivElement>(null);
  const [scrolling, setScrolling] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const measure = useCallback(() => {
    const el = track.current;
    if (el === null) return;
    const many = el.querySelectorAll(".mail-action").length >= SCROLL_ACTIONS_FROM;
    setScrolling(many);
    if (!many) { setCanLeft(false); setCanRight(false); return; }
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(max > 2 && el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (el === null) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize?.observe(el);
    const mutate = typeof MutationObserver === "undefined" ? null : new MutationObserver(measure);
    mutate?.observe(el, { childList: true, subtree: true });
    return () => { el.removeEventListener("scroll", measure); resize?.disconnect(); mutate?.disconnect(); };
  }, [measure]);

  const by = useCallback((direction: -1 | 1) => {
    const el = track.current;
    if (el === null) return;
    const reduce = typeof window !== "undefined" && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amount = Math.max(120, Math.round(el.clientWidth * 0.7)) * direction;
    if (typeof el.scrollBy === "function") el.scrollBy({ left: amount, behavior: reduce ? "auto" : "smooth" });
    else el.scrollLeft += amount;
  }, []);

  return { track, scrolling, canLeft, canRight, by };
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
  .mail-card-with-badge { position: relative; overflow: visible; }
  .mail-card-with-badge > .mail-card-banner { border-radius: 11px 11px 0 0; overflow: hidden; }
  .mail-card-with-badge > .mail-card-footer { border-radius: 0 0 11px 11px; }
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
  .mail-card-footer-track { display: contents; }
  .mail-scroll-btn { display: none; }
  .mail-card-footer-start, .mail-card-footer-end { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .mail-card-footer-end { margin-left: auto; justify-content: flex-end; }
  /* PHONES ONLY: three or more actions become one row, side by side, scrolling sideways with an arrow at each end.
     Wider screens keep the plain wrapping row. */
  @media (max-width: 640px) {
    .mail-card-footer-scroll { flex-wrap: nowrap; gap: 6px; position: relative; }
    .mail-card-footer-scroll .mail-card-footer-track {
      display: flex; flex: 1 1 auto; min-width: 0; align-items: center; gap: 8px; flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden;
      scrollbar-width: none; -ms-overflow-style: none; scroll-snap-type: x proximity; overscroll-behavior-x: contain; padding: 2px 1px;
    }
    .mail-card-footer-scroll .mail-card-footer-track::-webkit-scrollbar { display: none; }
    .mail-card-footer-scroll .mail-card-footer-start, .mail-card-footer-scroll .mail-card-footer-end {
      flex: 0 0 auto; flex-wrap: nowrap; margin-left: 0; scroll-snap-align: start;
    }
    .mail-card-footer-scroll .mail-action { flex: 0 0 auto; }
    /* A soft fade tells the eye there is more on that side. */
    .mail-card-footer-scroll .mail-card-footer-track[data-fade-left="true"] { -webkit-mask-image: linear-gradient(to right, transparent 0, #000 22px); mask-image: linear-gradient(to right, transparent 0, #000 22px); }
    .mail-card-footer-scroll .mail-card-footer-track[data-fade-right="true"] { -webkit-mask-image: linear-gradient(to left, transparent 0, #000 22px); mask-image: linear-gradient(to left, transparent 0, #000 22px); }
    .mail-card-footer-scroll .mail-card-footer-track[data-fade-left="true"][data-fade-right="true"] {
      -webkit-mask-image: linear-gradient(to right, transparent 0, #000 22px, #000 calc(100% - 22px), transparent 100%);
      mask-image: linear-gradient(to right, transparent 0, #000 22px, #000 calc(100% - 22px), transparent 100%); }
    .mail-card-footer-scroll .mail-scroll-btn {
      display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 34px; height: 34px; border-radius: 999px;
      border: 1px solid #D1D9E0; background: #FFFFFF; color: ${NAVY}; cursor: pointer; box-shadow: 0 2px 6px -2px rgba(7,17,31,0.25);
    }
    .mail-card-footer-scroll .mail-scroll-btn[hidden] { display: none; }
    .mail-card-footer-scroll .mail-scroll-btn:hover { border-color: #0078D4; color: #005A9E; }
    .mail-card-footer-scroll .mail-scroll-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
    @media (prefers-reduced-motion: no-preference) { .mail-card-footer-scroll .mail-card-footer-track { scroll-behavior: smooth; } }
  }
  .mail-action {
    font-family: 'Geist', sans-serif; display: inline-flex; align-items: center; gap: 6px; min-height: 38px;
    padding: 0 14px; border-radius: 8px; border: 1px solid #D1D9E0; background: #FFFFFF; color: ${NAVY};
    font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
  }
  .mail-action:hover { border-color: #0078D4; color: #005A9E; }
  .mail-action-primary { background: #0078D4; border-color: #0078D4; color: #FFFFFF; }
  .mail-action-primary:hover { background: #005A9E; border-color: #005A9E; color: #FFFFFF; }
  .mail-action:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
  .mail-inline-link {
    font: inherit; font-weight: 600; color: #005A9E; background: none; border: none; padding: 0;
    cursor: pointer; text-decoration: underline; text-underline-offset: 2px;
  }
  .mail-inline-link:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; border-radius: 3px; }
  .mail-progress { width: min(100%, 320px); height: 6px; background: ${BORDER}; border-radius: 999px; overflow: hidden; margin-top: 4px; }
  .mail-progress > div { height: 100%; border-radius: 999px; }
  @media (max-width: 520px) {
    .mail-card-body { padding: 18px 16px 14px; }
    .mail-card-title { font-size: 17px; }
    .mail-card-footer { padding: 10px 12px; }
    .mail-card-footer-scroll { padding: 10px 8px; }
    .mail-card-footer-scroll .mail-scroll-btn { width: 36px; height: 36px; }
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
