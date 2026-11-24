// Home's charts, under "At a glance":
//
//   Sent and completed       a line per week, the last 12 weeks
//   Where your requests stand  a circle of the same buckets as the tiles
//   Participant progress     a ring: participants done, of all involved, on the
//                            requests still out for signing
//
// Every figure comes from the rows Home already holds (see
// services/dashboard/home-charts.ts); nothing is estimated. Small hand-drawn
// SVG, in the app's navy and sky blue, with success green and error red
// keeping their meanings. Each chart can be read without its colours: the
// line has a crosshair readout (pointer and arrow keys) and a table view, and
// the circles print every figure beside them.

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Link } from "react-router";
import { ChartLine, ChartPie, ChevronRight, PenLine, Table2, type LucideIcon } from "lucide-react";
import type { SigningRequestListItem } from "../../services/real/signing-request.service";
import type { StatusSummary } from "../../services/dashboard/attention";
import { weeklyTrend, type WeekPoint } from "../../pages/platform/workspace/real/overview-insights";
import {
  HOME_TREND_WEEKS, countAxis, percentLabel, signatureProgress, statusSlices,
  type HomeSlice, type HomeSliceKey,
} from "../../services/dashboard/home-charts";

const SENT = "#1b3a66";      // the chart primary: navy
const DONE = "#059669";      // completed keeps the success green
const GRID = "#EDF1F6";      // one step off the white card
const BASE = "#D5DDE8";
const TRACK = "#e6f0fa";     // a ring's unfilled track: the lightest step of the navy-and-sky ramp

function plural(n: number, word: string): string {
  return `${String(n)} ${word}${n === 1 ? "" : "s"}`;
}

// ── A chart card (styled by Home's .hd-panel rules) ──────────────────────

function ChartCard({ icon: Icon, title, subtitle, action, wide = false, children }: {
  icon: LucideIcon; title: string; subtitle: string; action?: React.ReactNode; wide?: boolean; children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className={wide ? "hd-panel hc-wide" : "hd-panel"}>
      <div className="hd-panel-head">
        <Icon size={22} strokeWidth={1.9} aria-hidden className="hd-panel-icon" />
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <h2 className="hd-panel-title">{title}</h2>
          <p className="hd-panel-sub">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── Sent and completed: the weekly line ──────────────────────────────────

const PLOT_H = 220;
const PAD = { top: 14, right: 20, bottom: 30, left: 34 };

/** "Week of 6 Oct", or "This week" for the last point. */
function weekName(weeks: readonly WeekPoint[], index: number): string {
  return index === weeks.length - 1 ? "This week" : `Week of ${weeks[index]?.label ?? ""}`;
}

function TrendLines({ weeks }: { weeks: readonly WeekPoint[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [spoken, setSpoken] = useState("");

  // Drawn at the card's real width, so text and lines stay crisp.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (box === null) return;
    const measure = () => { setWidth(box.clientWidth); };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => { observer.disconnect(); };
  }, []);

  const n = weeks.length;
  const { top, ticks } = countAxis(Math.max(0, ...weeks.map(w => Math.max(w.sent, w.completed))));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = PLOT_H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (value: number) => PAD.top + plotH - (value / top) * plotH;
  const line = (key: "sent" | "completed") =>
    weeks.map((w, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(w[key]).toFixed(1)}`).join(" ");
  // Week labels thin out on narrow cards, always keeping "This week".
  const every = Math.max(1, Math.ceil((n * 58) / Math.max(1, plotW)));
  const last = n - 1;

  const readout = (i: number) => {
    const w = weeks[i];
    return w === undefined ? "" : `${weekName(weeks, i)}: ${plural(w.sent, "request")} sent, ${String(w.completed)} completed.`;
  };

  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (n === 0 || plotW <= 0) return;
    const left = event.currentTarget.getBoundingClientRect().left;
    const step = n <= 1 ? plotW : plotW / (n - 1);
    const i = Math.round((event.clientX - left - PAD.left) / step);
    setActive(Math.min(last, Math.max(0, i)));
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = active ?? last;
    let next: number | null = null;
    if (event.key === "ArrowLeft") next = Math.max(0, from - 1);
    else if (event.key === "ArrowRight") next = Math.min(last, from + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    setSpoken(readout(next));
  };

  const point = active === null ? undefined : weeks[active];
  const tipLeft = active === null ? 0 : x(active) + 14;
  const tipFlip = tipLeft + 168 > width;

  return (
    <div
      ref={boxRef}
      className="hc-plot"
      style={{ height: PLOT_H }}
      tabIndex={0}
      role="group"
      aria-label="Requests sent and completed each week. Use the left and right arrow keys to read each week, or open the table."
      onKeyDown={onKey}
      onFocus={() => { if (active === null) { setActive(last); setSpoken(readout(last)); } }}
      onBlur={() => { setActive(null); }}
    >
      {width > 0 && (
        <svg
          width={width} height={PLOT_H} viewBox={`0 0 ${String(width)} ${String(PLOT_H)}`} aria-hidden="true" focusable="false"
          onPointerMove={onPointer} onPointerDown={onPointer} onPointerLeave={() => { setActive(null); }}
        >
          {/* Hairline grid and the count axis. */}
          {ticks.map(t => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASE : GRID} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="hc-axis">{t}</text>
            </g>
          ))}
          {weeks.map((w, i) => ((last - i) % every === 0 ? (
            <text key={w.start} x={x(i)} y={PLOT_H - 8} textAnchor={i === last ? "end" : i === 0 ? "start" : "middle"} className="hc-axis">
              {i === last ? "This week" : w.label}
            </text>
          ) : null))}

          {/* The crosshair finds the week. */}
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="#B8C6D8" strokeWidth={1} shapeRendering="crispEdges" />
          )}

          <path d={line("completed")} fill="none" stroke={DONE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={line("sent")} fill="none" stroke={SENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* This week's values, and the hovered week's, as dots with a white ring. */}
          {[active ?? last].map(i => {
            const w = weeks[i];
            if (w === undefined) return null;
            return (
              <g key={`dots-${String(i)}`}>
                <circle cx={x(i)} cy={y(w.completed)} r={4.5} fill={DONE} stroke="#FFFFFF" strokeWidth={2} />
                <circle cx={x(i)} cy={y(w.sent)} r={4.5} fill={SENT} stroke="#FFFFFF" strokeWidth={2} />
              </g>
            );
          })}
        </svg>
      )}

      {point !== undefined && active !== null && (
        <div className="hc-tip" style={{ left: tipFlip ? undefined : tipLeft, right: tipFlip ? Math.max(0, width - x(active) + 14) : undefined, top: PAD.top }}>
          <div className="hc-tip-when">{weekName(weeks, active)}</div>
          <div className="hc-tip-row"><span className="hc-key" style={{ background: SENT }} /><strong>{point.sent}</strong> sent</div>
          <div className="hc-tip-row"><span className="hc-key" style={{ background: DONE }} /><strong>{point.completed}</strong> completed</div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{spoken}</p>
    </div>
  );
}

function TrendTable({ weeks }: { weeks: readonly WeekPoint[] }) {
  const rows = weeks.map((w, i) => ({ w, i })).reverse();
  return (
    <table className="hc-table">
      <caption className="sr-only">Requests sent and completed each week, newest first</caption>
      <thead>
        <tr><th scope="col">Week</th><th scope="col">Sent</th><th scope="col">Completed</th></tr>
      </thead>
      <tbody>
        {rows.map(({ w, i }) => (
          <tr key={w.start}>
            <th scope="row">{i === weeks.length - 1 ? "This week" : `Week of ${w.label}`}</th>
            <td>{w.sent}</td>
            <td>{w.completed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TrendCard({ weeks, note }: { weeks: readonly WeekPoint[]; note: string | null }) {
  const [asTable, setAsTable] = useState(false);
  const sent = weeks.reduce((sum, w) => sum + w.sent, 0);
  const completed = weeks.reduce((sum, w) => sum + w.completed, 0);
  const empty = sent === 0 && completed === 0;
  return (
    <ChartCard
      wide icon={ChartLine} title="Sent and completed"
      subtitle={empty
        ? `Each week's requests, over the last ${String(HOME_TREND_WEEKS)} weeks.`
        : `${plural(sent, "request")} sent and ${String(completed)} completed in the last ${String(HOME_TREND_WEEKS)} weeks.`}
      action={empty ? undefined : (
        <button type="button" className="hd-btn" aria-pressed={asTable} onClick={() => { setAsTable(value => !value); }}>
          {asTable ? <ChartLine size={15} aria-hidden /> : <Table2 size={15} aria-hidden />}
          {asTable ? "Chart" : "Table"}
        </button>
      )}
    >
      {empty ? (
        <p className="hc-empty">Nothing was sent or completed in the last {HOME_TREND_WEEKS} weeks. Each week's requests appear here once you send.</p>
      ) : asTable ? <TrendTable weeks={weeks} /> : (
        <>
          <ul className="hc-legend" aria-label="Lines">
            <li><span className="hc-key" style={{ background: SENT }} />Sent</li>
            <li><span className="hc-key" style={{ background: DONE }} />Completed</li>
          </ul>
          <TrendLines weeks={weeks} />
        </>
      )}
      {note !== null && <p className="hc-note">{note}</p>}
    </ChartCard>
  );
}

// ── Where your requests stand: the status circle ─────────────────────────

const DONUT = { size: 168, r: 66, width: 20 };

function StatusCircle({ slices, total, active, onActive }: {
  slices: readonly HomeSlice[]; total: number; active: HomeSliceKey | null; onActive: (key: HomeSliceKey | null) => void;
}) {
  const c = 2 * Math.PI * DONUT.r;
  const shown = slices.filter(s => s.value > 0);
  // A 2px white gap between neighbours, none when one part is the whole.
  const gap = shown.length > 1 ? 2 : 0;
  const centre = DONUT.size / 2;
  let start = 0;
  const focus = active === null ? undefined : slices.find(s => s.key === active);
  const name = `Where your requests stand: ${slices.map(s => `${s.label} ${String(s.value)}`).join(", ")}.`;
  return (
    <div className="hc-donut">
      <svg width={DONUT.size} height={DONUT.size} viewBox={`0 0 ${String(DONUT.size)} ${String(DONUT.size)}`} role="img" aria-label={name}>
        <g transform={`rotate(-90 ${String(centre)} ${String(centre)})`}>
          {total === 0 && <circle cx={centre} cy={centre} r={DONUT.r} fill="none" stroke={TRACK} strokeWidth={DONUT.width} />}
          {shown.map(s => {
            const length = (s.value / total) * c;
            const dash = Math.max(0.5, length - gap);
            const offset = start;
            start += length;
            return (
              <circle
                key={s.key} cx={centre} cy={centre} r={DONUT.r} fill="none"
                stroke={s.color} strokeWidth={DONUT.width}
                strokeDasharray={`${dash.toFixed(2)} ${(c - dash).toFixed(2)}`} strokeDashoffset={(-offset).toFixed(2)}
                opacity={active !== null && active !== s.key ? 0.28 : 1}
                style={{ transition: "opacity 0.15s ease", cursor: "default" }}
                onPointerEnter={() => { onActive(s.key); }} onPointerLeave={() => { onActive(null); }}
              />
            );
          })}
        </g>
      </svg>
      <div className="hc-centre" aria-hidden="true">
        <span className="hc-centre-value">{focus === undefined ? total : focus.value}</span>
        <span className="hc-centre-label">
          {focus === undefined ? (total === 1 ? "request" : "requests") : `${focus.label} · ${percentLabel(focus.value, total)}`}
        </span>
      </div>
    </div>
  );
}

function StatusCard({ summary, note }: { summary: StatusSummary; note: string | null }) {
  const [active, setActive] = useState<HomeSliceKey | null>(null);
  const slices = statusSlices(summary);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  return (
    <ChartCard icon={ChartPie} title="Where your requests stand" subtitle="Your requests, by where each one is now.">
      <div className="hc-circle-row">
        <StatusCircle slices={slices} total={total} active={active} onActive={setActive} />
        <ul className="hc-legend-list" aria-label="Requests by status">
          {slices.map(s => (
            <li
              key={s.key} className="hc-leg" data-active={active === s.key ? "true" : undefined}
              onPointerEnter={() => { setActive(s.key); }} onPointerLeave={() => { setActive(null); }}
            >
              <span className="hc-swatch" style={{ background: s.color }} aria-hidden="true" />
              <span className="hc-leg-label">{s.label}</span>
              <span className="hc-leg-value">{s.value}</span>
              <span className="hc-leg-pct">{percentLabel(s.value, total)}</span>
            </li>
          ))}
        </ul>
      </div>
      {note !== null && <p className="hc-note">{note}</p>}
    </ChartCard>
  );
}

// ── Participant progress: the ring ───────────────────────────────────────

const RING = { size: 148, r: 60, width: 14 };

function SignaturesCard({ items }: { items: readonly SigningRequestListItem[] }) {
  const { signed, of, requests } = signatureProgress(items);
  const c = 2 * Math.PI * RING.r;
  const share = of === 0 ? 0 : signed / of;
  const centre = RING.size / 2;
  return (
    <ChartCard icon={PenLine} title="Participant progress" subtitle="On the requests still out for signing.">
      {requests === 0 ? (
        <p className="hc-empty">Nothing is out for signing right now. Requests you send appear here until every signature is in.</p>
      ) : (
        <div className="hc-circle-row">
          <div
            className="hc-meter" role="meter" aria-valuemin={0} aria-valuemax={of} aria-valuenow={signed}
            aria-label={`Participant progress: ${String(signed)} of ${String(of)} completed`}
          >
            <svg width={RING.size} height={RING.size} viewBox={`0 0 ${String(RING.size)} ${String(RING.size)}`} aria-hidden="true" focusable="false">
              <circle cx={centre} cy={centre} r={RING.r} fill="none" stroke={TRACK} strokeWidth={RING.width} />
              {signed > 0 && (
                <circle
                  cx={centre} cy={centre} r={RING.r} fill="none" stroke={SENT} strokeWidth={RING.width} strokeLinecap="round"
                  strokeDasharray={`${(share * c).toFixed(2)} ${c.toFixed(2)}`} transform={`rotate(-90 ${String(centre)} ${String(centre)})`}
                />
              )}
            </svg>
            <div className="hc-centre" aria-hidden="true">
              <span className="hc-centre-value hc-centre-big">{percentLabel(signed, of)}</span>
              <span className="hc-centre-label">completed</span>
            </div>
          </div>
          <div className="hc-meter-text">
            <p className="hc-meter-lead">
              <strong>{signed} of {of}</strong> participants have completed their part, across {plural(requests, "request")} still waiting on someone.
            </p>
            <Link to="/app/documents" className="hc-link">
              Open the requests in flight <ChevronRight size={15} aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

// ── The block ─────────────────────────────────────────────────────────────

export function HomeCharts({ items, summary, paged, now }: {
  items: readonly SigningRequestListItem[]; summary: StatusSummary; paged: boolean; now: number;
}) {
  const weeks = weeklyTrend(items, HOME_TREND_WEEKS, now);
  const note = paged ? `From your ${String(summary.fetched)} most recent requests.` : null;
  return (
    <div className="hc-grid" data-testid="home-charts">
      <TrendCard weeks={weeks} note={note} />
      <StatusCard summary={summary} note={note} />
      <SignaturesCard items={items} />
      <style>{HOME_CHARTS_CSS}</style>
    </div>
  );
}

const HOME_CHARTS_CSS = `
.hc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; min-width: 0; }
.hc-grid > .hd-panel { margin-top: 0; }
.hc-wide { grid-column: 1 / -1; }
.hc-legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 0 2px 8px; padding: 0; list-style: none; font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 500; color: #334155; }
.hc-legend li { display: inline-flex; align-items: center; gap: 8px; }
.hc-key { display: inline-block; width: 14px; height: 2px; border-radius: 1px; flex-shrink: 0; }
.hc-plot { position: relative; border-radius: 8px; }
.hc-plot:focus-visible { outline: 2px solid #1b3a66; outline-offset: 4px; }
.hc-plot svg { display: block; overflow: visible; touch-action: pan-y; }
.hc-axis { font-family: 'Geist', sans-serif; font-size: 11.5px; font-weight: 500; fill: #64748B; font-variant-numeric: tabular-nums; }
.hc-tip { position: absolute; pointer-events: none; min-width: 136px; box-sizing: border-box; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px;
  padding: 8px 11px; box-shadow: 0 12px 26px -14px rgba(20,41,77,0.45); font-family: 'Geist', sans-serif; }
.hc-tip-when { font-size: 12px; color: #64748B; margin-bottom: 4px; white-space: nowrap; }
.hc-tip-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #475569; line-height: 1.7; white-space: nowrap; }
.hc-tip-row strong { font-size: 14px; color: #14294d; min-width: 1.4em; font-variant-numeric: tabular-nums; }
.hc-table { width: 100%; border-collapse: collapse; font-family: 'Geist', sans-serif; font-size: 13.5px; color: #334155; }
.hc-table th, .hc-table td { padding: 8px 10px; border-bottom: 1px solid #EEF2F7; text-align: right; font-variant-numeric: tabular-nums; }
.hc-table thead th { font-weight: 600; font-size: 12.5px; color: #475569; border-bottom-color: #E2E8F0; }
.hc-table th:first-child { text-align: left; font-weight: 500; }
.hc-table thead th:first-child { font-weight: 600; }
.hc-table tbody tr:last-child th, .hc-table tbody tr:last-child td { border-bottom: none; }
.hc-empty { font-family: 'Geist', sans-serif; font-size: 14px; line-height: 1.6; color: #475569; margin: 2px 2px 4px; }
.hc-note { font-family: 'Geist', sans-serif; font-size: 12px; color: #64748B; margin: 12px 2px 0; }
.hc-circle-row { display: flex; align-items: center; gap: 22px 28px; flex-wrap: wrap; }
.hc-donut, .hc-meter { position: relative; flex-shrink: 0; }
.hc-donut svg, .hc-meter svg { display: block; }
.hc-centre { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
.hc-centre-value { font-family: 'Geist', sans-serif; font-size: 28px; font-weight: 800; line-height: 1.1; color: #14294d; }
.hc-centre-big { font-size: 30px; }
.hc-centre-label { font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 500; color: #64748B; margin-top: 3px; max-width: 104px; line-height: 1.3; }
.hc-legend-list { flex: 1 1 210px; min-width: 0; margin: 0; padding: 0; list-style: none; }
.hc-leg { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto 3.2em; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 8px;
  font-family: 'Geist', sans-serif; font-size: 13.5px; color: #334155; transition: background-color 0.15s ease; }
.hc-leg[data-active="true"] { background: #eef5fc; }
.hc-swatch { width: 12px; height: 12px; border-radius: 3px; }
.hc-leg-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hc-leg-value { font-weight: 700; color: #14294d; font-variant-numeric: tabular-nums; text-align: right; }
.hc-leg-pct { color: #64748B; font-variant-numeric: tabular-nums; text-align: right; }
.hc-meter-text { flex: 1 1 210px; min-width: 0; }
.hc-meter-lead { font-family: 'Geist', sans-serif; font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 10px; }
.hc-meter-lead strong { color: #14294d; }
.hc-link { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; font-family: 'Geist', sans-serif; font-size: 13.5px; font-weight: 600; color: #1b3a66; text-decoration: none; border-radius: 4px; }
.hc-link:hover { text-decoration: underline; text-decoration-color: #4a9ad8; text-decoration-thickness: 2px; text-underline-offset: 4px; }
.hc-link:focus-visible { outline: 2px solid #1b3a66; outline-offset: 2px; }
@media (max-width: 900px) { .hc-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 640px) {
  .hc-circle-row { justify-content: center; }
  .hc-legend-list, .hc-meter-text { flex-basis: 100%; }
}
@media (prefers-reduced-motion: reduce) { .hc-leg, .hc-donut circle { transition: none !important; } }
`;
