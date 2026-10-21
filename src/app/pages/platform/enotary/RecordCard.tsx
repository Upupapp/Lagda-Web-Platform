// The formal parts of a request's page: a record card (an icon, a title in the serif face, a state badge at the right,
// and its body under a rule), a grid of labelled facts inside it, and the banner that says where the request stands.
// On a phone the badge moves under the title and the grid becomes one column.

import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { GF } from "../../../components/system/design-system";
import { E, SERIF } from "./EnotaryChrome";

export type RecordTone = "ok" | "warn" | "info" | "alert" | "end";

const TONE: Record<RecordTone, { bg: string; line: string; ink: string }> = {
  ok: { bg: "#EEF9F2", line: "#B7E3CA", ink: "#17703C" },
  warn: { bg: "#FFF8EC", line: "#F0D9A8", ink: "#8A5A00" },
  info: { bg: E.skyWash, line: E.skyLine, ink: E.skyDeep },
  alert: { bg: E.maroonWash, line: E.maroonLine, ink: E.maroon },
  end: { bg: E.wash, line: E.line, ink: E.quiet },
};

export const RECORD_STYLES = `
  .rc-card { font-family: 'Geist', sans-serif; background: #FFFFFF; border: 1px solid ${E.line}; border-radius: 14px; overflow: hidden; margin: 0 0 18px; box-shadow: 0 1px 2px rgba(10,26,43,0.04), 0 12px 30px -20px rgba(10,26,43,0.3); }
  .rc-head { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: linear-gradient(180deg, #FFFFFF 0%, #F7F9FC 100%); border-bottom: 1px solid ${E.line}; flex-wrap: wrap; }
  .rc-icon { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; background: ${E.navy}; color: #FFFFFF; }
  .rc-title { margin: 0; flex: 1 1 auto; min-width: 0; font-family: ${SERIF}; font-size: 19px; font-weight: 700; color: ${E.navy}; }
  .rc-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 7px; border: 1px solid; font-size: 11.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
  .rc-body { padding: 18px 20px; }
  .rc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rc-cell { padding: 16px 20px; border-bottom: 1px solid ${E.line}; min-width: 0; }
  .rc-cell:nth-child(odd) { border-right: 1px solid ${E.line}; }
  .rc-cell:nth-last-child(-n+2) { border-bottom: 0; }
  .rc-cell dt { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${E.quiet}; }
  .rc-cell dd { margin: 6px 0 0; font-size: 15px; font-weight: 700; color: ${E.ink}; overflow-wrap: anywhere; }
  .rc-cell.is-lead { background: #F6EFDF; }
  .rc-banner { display: flex; gap: 12px; align-items: flex-start; padding: 14px 18px; border-radius: 12px; border: 1px solid; border-left-width: 4px; margin: 0 0 18px; font-family: 'Geist', sans-serif; font-size: 14.5px; line-height: 1.55; }
  .rc-banner svg { flex: 0 0 auto; margin-top: 2px; }
  @media (max-width: 640px) {
    .rc-head { padding: 12px 16px; }
    .rc-head .rc-badge { order: 3; margin-left: 46px; }
    .rc-body { padding: 16px; }
    .rc-grid { grid-template-columns: minmax(0, 1fr); }
    .rc-cell { padding: 14px 16px; border-right: 0 !important; border-bottom: 1px solid ${E.line} !important; }
    .rc-cell:last-child { border-bottom: 0 !important; }
  }
`;

export interface RecordBadge { readonly icon: ComponentType<LucideProps>; readonly label: string; readonly tone: RecordTone }

export function RecordCard({ icon: Icon, title, badge, testId, children, flush = false }: {
  icon: ComponentType<LucideProps>; title: string; badge?: RecordBadge; testId?: string; children: ReactNode; flush?: boolean;
}) {
  const BadgeIcon = badge?.icon;
  const tone = badge === undefined ? null : TONE[badge.tone];
  return (
    <section className="rc-card" data-testid={testId}>
      <style>{RECORD_STYLES}</style>
      <div className="rc-head">
        <span className="rc-icon" aria-hidden="true"><Icon size={18} /></span>
        <h3 className="rc-title">{title}</h3>
        {badge !== undefined && tone !== null && BadgeIcon !== undefined && (
          <span className="rc-badge" data-testid="record-badge" style={{ background: tone.bg, borderColor: tone.line, color: tone.ink }}>
            <BadgeIcon size={13} aria-hidden /> {badge.label}
          </span>
        )}
      </div>
      {flush ? children : <div className="rc-body">{children}</div>}
    </section>
  );
}

export interface RecordCell { readonly icon: ComponentType<LucideProps>; readonly label: string; readonly value: ReactNode; readonly lead?: boolean; readonly mono?: boolean; readonly testId?: string }

/** Labelled facts in two columns (one on a phone); a lead cell is set apart, as the amount on a receipt is. */
export function RecordGrid({ cells }: { cells: readonly RecordCell[] }) {
  return (
    <dl className="rc-grid" style={{ margin: 0 }}>
      {cells.map(cell => {
        const Icon = cell.icon;
        return (
          <div key={cell.label} className={cell.lead === true ? "rc-cell is-lead" : "rc-cell"} data-testid={cell.testId}>
            <dt><Icon size={13} aria-hidden /> {cell.label}</dt>
            <dd style={cell.mono === true ? { fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 14 } : undefined}>{cell.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Where the request stands, in a banner with a coloured edge. */
export function StatusBanner({ icon: Icon, tone, lead, children, testId }: {
  icon: ComponentType<LucideProps>; tone: RecordTone; lead?: string; children: ReactNode; testId?: string;
}) {
  const colours = TONE[tone];
  return (
    <div className="rc-banner" role="status" data-testid={testId} style={{ ...GF, background: colours.bg, borderColor: colours.line, borderLeftColor: colours.ink, color: E.ink }}>
      <style>{RECORD_STYLES}</style>
      <Icon size={20} aria-hidden color={colours.ink} />
      <span>{lead !== undefined && <strong style={{ color: E.ink }}>{lead} </strong>}{children}</span>
    </div>
  );
}
