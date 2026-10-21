// One request on the notary's desk, as a card: who it is from and its number, its badges and the way into it; the facts
// of the request in a grid; where the session and the payment stand, side by side; whatever the notary can do now; and
// the session itself in a band at the foot. On a phone the badges and Open drop under the name, the facts fall into two
// columns and the two states stack.

import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router";
import { ArrowUpRight, ShieldCheck, User, type LucideProps } from "lucide-react";
import { GF } from "../../../../components/system/design-system";
import { E, SERIF } from "../EnotaryChrome";

export type DeskTone = "wait" | "ok" | "info" | "warn" | "end" | "alert";

const TONES: Record<DeskTone, { bg: string; line: string; ink: string; head: string }> = {
  wait: { bg: "#FFF8EC", line: "#F4D9A6", ink: "#7A4B00", head: "#8A5A00" },
  warn: { bg: "#FFF8EC", line: "#F4D9A6", ink: "#7A4B00", head: "#8A5A00" },
  ok: { bg: "#EEF9F2", line: "#B7E3CA", ink: "#17703C", head: "#17703C" },
  info: { bg: E.skyWash, line: E.skyLine, ink: E.skyDeep, head: E.skyDeep },
  alert: { bg: E.maroonWash, line: E.maroonLine, ink: E.maroon, head: E.maroon },
  end: { bg: E.wash, line: E.line, ink: E.text, head: E.quiet },
};

export interface DeskFact { readonly icon: ComponentType<LucideProps>; readonly label: string; readonly value: ReactNode; readonly mono?: boolean; readonly testId?: string }
export interface DeskTile { readonly icon: ComponentType<LucideProps>; readonly label: string; readonly text: ReactNode; readonly tone: DeskTone; readonly testId?: string; readonly strong?: boolean }
export interface DeskPill { readonly icon: ComponentType<LucideProps>; readonly label: string; readonly tone: DeskTone; readonly testId?: string }

export const DESK_CARD_STYLES = `
  .dk-card { font-family: 'Geist', sans-serif; background: #FFFFFF; border: 1px solid ${E.line}; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 2px rgba(10,26,43,0.04), 0 10px 28px -18px rgba(10,26,43,0.28); animation: eno-in 240ms ease both; }
  .dk-head { display: flex; align-items: center; gap: 14px; padding: 18px 20px; flex-wrap: wrap; }
  .dk-who { display: flex; align-items: center; gap: 14px; flex: 1 1 260px; min-width: 0; }
  .dk-ava { flex: 0 0 auto; width: 44px; height: 44px; border-radius: 999px; display: grid; place-items: center; background: ${E.wash}; border: 1px solid ${E.line}; color: ${E.navy}; }
  .dk-name { margin: 0; font-family: ${SERIF}; font-size: 18px; font-weight: 700; color: ${E.navy}; overflow-wrap: anywhere; line-height: 1.25; }
  .dk-ref { margin: 2px 0 0; font: 600 13px ui-monospace, Menlo, Consolas, monospace; color: ${E.ink}; letter-spacing: 0.02em; }
  .dk-ref span { color: ${E.quiet}; margin-right: 4px; }
  .dk-side { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .dk-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid transparent; white-space: nowrap; }
  .dk-open { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid ${E.line}; background: #FFFFFF; color: ${E.ink}; font-size: 14px; font-weight: 700; text-decoration: none; transition: background 140ms ease, border-color 140ms ease, transform 100ms ease; }
  .dk-open:hover { background: ${E.wash}; border-color: #C5D2DF; }
  .dk-open:active { transform: scale(0.97); }
  .dk-open:focus-visible { outline: 3px solid rgba(10,132,214,0.4); outline-offset: 2px; }
  .dk-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px 18px; padding: 16px 20px; border-top: 1px solid ${E.line}; margin: 0; }
  .dk-fact { display: flex; gap: 10px; min-width: 0; }
  .dk-fact svg { flex: 0 0 auto; margin-top: 2px; color: ${E.quiet}; }
  .dk-fact dt { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${E.quiet}; }
  .dk-fact dd { margin: 2px 0 0; font-size: 14px; color: ${E.ink}; overflow-wrap: anywhere; line-height: 1.35; }
  .dk-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 16px 20px; border-top: 1px solid ${E.line}; }
  .dk-tile { display: flex; gap: 12px; padding: 14px 16px; border-radius: 12px; border: 1px solid; min-width: 0; }
  .dk-tile svg { flex: 0 0 auto; margin-top: 1px; }
  .dk-tile b { display: block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 3px; }
  .dk-tile p { margin: 0; font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
  .dk-body { padding: 0 20px 16px; }
  .dk-body:empty { display: none; }
  .dk-band { background: ${E.wash}; border-top: 1px solid ${E.line}; padding: 16px 20px 18px; }
  @media (max-width: 900px) { .dk-facts { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 640px) {
    .dk-head { padding: 16px; }
    .dk-side { width: 100%; justify-content: flex-start; }
    .dk-open { margin-left: auto; }
    .dk-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 14px 16px; gap: 14px; }
    .dk-tiles { grid-template-columns: minmax(0, 1fr); padding: 14px 16px; }
    .dk-body { padding: 0 16px 14px; }
    .dk-band { padding: 14px 16px 16px; }
  }
  @media (prefers-reduced-motion: reduce) { .dk-card { animation: none; } .dk-open { transition: none; } }
`;

export function DeskCard({ name, reference, verified, pills, openTo, facts, tiles, children, band, testId = "desk-row", data }: {
  name: string; reference?: string | null; verified: boolean; pills: readonly DeskPill[]; openTo?: string;
  facts: readonly DeskFact[]; tiles?: readonly DeskTile[]; children?: ReactNode; band?: ReactNode; testId?: string;
  data?: Record<`data-${string}`, string>;
}) {
  return (
    <li className="dk-card" data-testid={testId} {...data}>
      <div className="dk-head">
        <div className="dk-who">
          <span className="dk-ava" aria-hidden="true"><User size={20} /></span>
          <div style={{ minWidth: 0 }}>
            <h3 className="dk-name">{name}</h3>
            {reference !== undefined && reference !== null && <p className="dk-ref"><span aria-hidden="true">#</span><span data-testid="desk-reference-no" style={{ color: E.ink, margin: 0 }}>{reference}</span></p>}
          </div>
        </div>
        <div className="dk-side">
          {verified && (
            <span className="dk-pill" style={{ background: TONES.ok.bg, borderColor: TONES.ok.line, color: TONES.ok.ink }}>
              <ShieldCheck size={13} aria-hidden /> ID verified
            </span>
          )}
          {pills.map(pill => {
            const Icon = pill.icon;
            const tone = TONES[pill.tone];
            return (
              <span key={pill.label} className="dk-pill" data-testid={pill.testId ?? "status-pill"} style={{ background: tone.bg, borderColor: tone.line, color: tone.ink }}>
                <Icon size={13} aria-hidden /> {pill.label}
              </span>
            );
          })}
          {openTo !== undefined && <Link to={openTo} className="dk-open" data-testid="desk-open">Open <ArrowUpRight size={15} aria-hidden /></Link>}
        </div>
      </div>
      {facts.length > 0 && (
        <dl className="dk-facts">
          {facts.map(fact => {
            const Icon = fact.icon;
            return (
              <div key={fact.label} className="dk-fact" data-testid={fact.testId}>
                <Icon size={17} aria-hidden />
                <div style={{ minWidth: 0 }}>
                  <dt>{fact.label}</dt>
                  <dd style={fact.mono === true ? { fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13.5 } : undefined}>{fact.value}</dd>
                </div>
              </div>
            );
          })}
        </dl>
      )}
      {tiles !== undefined && tiles.length > 0 && (
        <div className="dk-tiles">
          {tiles.map(tile => {
            const Icon = tile.icon;
            const tone = TONES[tile.tone];
            return (
              <div key={tile.label} className="dk-tile" data-testid={tile.testId} style={{ background: tone.bg, borderColor: tone.line }}>
                <Icon size={19} aria-hidden color={tone.head} />
                <div style={{ minWidth: 0 }}>
                  <b style={{ color: tone.head }}>{tile.label}</b>
                  <p style={{ color: tone.ink, fontWeight: tile.strong === true ? 700 : 500 }}>{tile.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {children !== undefined && children !== null && children !== false && <div className="dk-body" style={{ paddingTop: tiles === undefined || tiles.length === 0 ? 16 : 0 }}>{children}</div>}
      {band !== undefined && band !== null && band !== false && <div className="dk-band">{band}</div>}
    </li>
  );
}

/** A section of the desk: an icon, its title and how many it holds. */
export function DeskGroup({ id, title, count, icon: Icon, children }: { id: string; title: string; count: number; icon: ComponentType<LucideProps>; children: ReactNode }) {
  return (
    <section aria-labelledby={`desk-${id}-heading`} data-testid={`desk-section-${id}`}>
      <h2 id={`desk-${id}-heading`} style={{ ...GF, fontSize: 21, fontWeight: 800, color: E.navy, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.01em" }}>
        <Icon size={20} aria-hidden color={E.navy} /> {title}
        <span style={{ fontSize: 12, fontWeight: 700, color: E.text, background: "#E3EAF2", borderRadius: 999, minWidth: 22, height: 22, display: "inline-grid", placeItems: "center", padding: "0 7px", boxSizing: "border-box" }}>{count}</span>
      </h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>{children}</ul>
    </section>
  );
}
