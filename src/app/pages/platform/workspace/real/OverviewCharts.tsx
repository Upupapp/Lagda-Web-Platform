// The Overview's charts. Every one is drawn from real figures
// (overview-insights.ts); one whose figures did not load says so instead of
// showing zeros, and one with nothing to show yet says what will appear.
//
//   KpiCards        four headline figures, each with a 8-week trend line
//   SigningActivity sent vs completed, week by week (30 / 90 days)
//   PlanUsage       this month's sending and the storage used, as rings
//   StatusDonut     where the window's sent documents stand now
//   TeamBars        people per team, the five largest
//   RecentActivity  the last five Activity log entries
//
// Small inline SVG for the trend lines and rings (no layout cost); Recharts
// for the two larger charts, which need tooltips and resizing.

import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Send, CheckCircle2, Hourglass, Timer, ArrowUpRight, ArrowDownRight, Minus, Network, History } from "lucide-react";
import type { SigningRequestListItem } from "../../../../services/real/signing-request.service";
import type { WorkspaceUsage } from "../../../../services/real/workspace-usage.service";
import type { WorkspaceActivityEntry } from "../../../../services/real/workspace-activity.service";
import {
  weeklyTrend, countBetween, averageDaysToComplete, statusMix, type Loadable, type TeamSize,
} from "./overview-insights";
import { ActivitySentence } from "./RealActivityPage";

const SENT = "#0078D4";
const DONE = "#16A34A";
const NAVY = "#07111F";
const SLATE = "#64748B";

function Unavailable({ what }: { what: string }) {
  return <p className="ov-muted">The {what} could not be loaded. Reload the page to try again.</p>;
}

function Loading() {
  return <div className="ov-skeleton" aria-busy="true" aria-label="Loading" />;
}

// ── A trend line ─────────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 120, h = 34, pad = 2;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${(pad + (values.length - 1) * step).toFixed(1)},${h} L${pad},${h} Z`;
  const id = `spark-${color.slice(1)}`;
  return (
    <svg viewBox={`0 0 ${String(w)} ${String(h)}`} className="ov-spark" aria-hidden preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Delta({ now, before }: { now: number; before: number }) {
  const diff = now - before;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const tone = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return (
    <span className="ov-delta" data-tone={tone}>
      <Icon size={13} aria-hidden /> {diff === 0 ? "same as" : `${diff > 0 ? "+" : ""}${String(diff)} vs`} last month
    </span>
  );
}

// ── Headline figures ──────────────────────────────────────────────────────

export function KpiCards({ requests }: { requests: Loadable<SigningRequestListItem[]> }) {
  const now = Date.now();
  const model = useMemo(() => {
    if (!Array.isArray(requests)) return null;
    const d = new Date(now);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const lastMonthStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
    const thisMonth = countBetween(requests, monthStart, now + 1);
    const lastMonth = countBetween(requests, lastMonthStart, monthStart);
    const weeks = weeklyTrend(requests, 8, now);
    const inProgress = requests.filter(r => ["sent", "partially-completed", "completion-ready"].includes(r.state)).length;
    const avg = averageDaysToComplete(requests);
    const sentWindow = requests.filter(r => r.sentAt !== null).length;
    const doneWindow = requests.filter(r => r.state === "completed").length;
    return { thisMonth, lastMonth, weeks, inProgress, avg, rate: sentWindow > 0 ? Math.round((doneWindow / sentWindow) * 100) : null };
  }, [requests, now]);

  if (requests === "error") return <div className="ov-card"><Unavailable what="document figures" /></div>;
  if (model === null) return <div className="ov-kpis">{[0, 1, 2, 3].map(i => <div key={i} className="ov-card ov-kpi"><Loading /></div>)}</div>;
  // The figure and its comparison come from the same list, so they always agree.
  const sentMonth = model.thisMonth.sent;
  const cards = [
    { key: "sent", icon: Send, label: "Sent this month", value: String(sentMonth), extra: <Delta now={model.thisMonth.sent} before={model.lastMonth.sent} />, series: model.weeks.map(w => w.sent), color: SENT, to: "/app/documents" },
    { key: "completed", icon: CheckCircle2, label: "Completed this month", value: String(model.thisMonth.completed),
      extra: <span className="ov-sub">{model.rate === null ? "No documents sent yet" : `${String(model.rate)}% completion rate (90 days)`}</span>, series: model.weeks.map(w => w.completed), color: DONE, to: "/app/documents" },
    { key: "in-progress", icon: Hourglass, label: "Waiting on signers", value: String(model.inProgress),
      extra: <span className="ov-sub">Sent, not finished</span>, series: model.weeks.map(w => Math.max(0, w.sent - w.completed)), color: "#D97706", to: "/app/documents" },
    { key: "average", icon: Timer, label: "Average time to complete", value: model.avg === null ? "—" : model.avg < 1 ? `${String(Math.max(1, Math.round(model.avg * 24)))} h` : `${model.avg.toFixed(1)} days`,
      extra: <span className="ov-sub">From sending to the last signature</span>, series: model.weeks.map(w => w.completed), color: "#7C3AED", to: "/app/documents" },
  ];
  return (
    <div className="ov-kpis" data-testid="overview-kpis">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <Link key={c.key} to={c.to} className="ov-card ov-kpi" data-testid={`kpi-${c.key}`}>
            <span className="ov-kpi-top"><span className="ov-kpi-icon" style={{ color: c.color, background: `${c.color}14` }}><Icon size={16} aria-hidden /></span>{c.label}</span>
            <span className="ov-kpi-value">{c.value}</span>
            {c.extra}
            <Sparkline values={c.series} color={c.color} />
          </Link>
        );
      })}
    </div>
  );
}

// ── Sent vs completed ─────────────────────────────────────────────────────

export function SigningActivity({ requests }: { requests: Loadable<SigningRequestListItem[]> }) {
  const [range, setRange] = useState<30 | 90>(90);
  const points = useMemo(() => Array.isArray(requests) ? weeklyTrend(requests, range === 30 ? 5 : 13) : [], [requests, range]);
  const empty = points.every(p => p.sent === 0 && p.completed === 0);
  return (
    <section className="ov-card ov-chart" aria-labelledby="ov-activity-title" data-testid="signing-activity">
      <header className="ov-card-head">
        <div>
          <h2 id="ov-activity-title">Signing activity</h2>
          <p className="ov-muted">Documents sent and completed, week by week.</p>
        </div>
        <div className="ov-range" role="group" aria-label="Range">
          {([30, 90] as const).map(r => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => { setRange(r); }}>{r} days</button>
          ))}
        </div>
      </header>
      <div className="ov-legend" aria-hidden><span><i style={{ background: SENT }} /> Sent</span><span><i style={{ background: DONE }} /> Completed</span></div>
      {requests === "error" ? <Unavailable what="signing activity" /> : requests === null ? <Loading /> : empty ? (
        <p className="ov-empty">Nothing sent in the last {range} days yet. Once documents go out, their progress appears here.</p>
      ) : (
        <div className="ov-chart-box" role="img" aria-label={`Sent and completed per week over the last ${String(range)} days: ${points.map(p => `${p.label} ${String(p.sent)} sent, ${String(p.completed)} completed`).join("; ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="ovSent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={SENT} stopOpacity={0.3} /><stop offset="100%" stopColor={SENT} stopOpacity={0} /></linearGradient>
                <linearGradient id="ovDone" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={DONE} stopOpacity={0.28} /><stop offset="100%" stopColor={DONE} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#EEF2F6" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE }} interval="preserveStartEnd" minTickGap={18} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: SLATE }} width={40} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontFamily: "'Geist', sans-serif", fontSize: 12 }} labelFormatter={l => `Week of ${String(l)}`} />
              <Area type="monotone" dataKey="sent" name="Sent" stroke={SENT} strokeWidth={2.5} fill="url(#ovSent)" />
              <Area type="monotone" dataKey="completed" name="Completed" stroke={DONE} strokeWidth={2.5} fill="url(#ovDone)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

// ── Plan usage rings ──────────────────────────────────────────────────────

function Ring({ used, limit, label, detail }: { used: number; limit: number | null; label: string; detail: string }) {
  const pct = limit === null || limit <= 0 ? null : Math.min(1, used / limit);
  const tone = pct === null ? SENT : pct >= 0.95 ? "#DC2626" : pct >= 0.8 ? "#D97706" : SENT;
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="ov-ring" data-testid={`ring-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <svg viewBox="0 0 84 84" aria-hidden>
        <circle cx="42" cy="42" r={r} fill="none" stroke="#EEF2F6" strokeWidth="9" />
        <circle cx="42" cy="42" r={r} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${String((pct ?? 0) * c)} ${String(c)}`} transform="rotate(-90 42 42)" />
        <text x="42" y="47" textAnchor="middle" fontSize="15" fontWeight="800" fill={NAVY} fontFamily="Geist, sans-serif">{pct === null ? "∞" : `${String(Math.round(pct * 100))}%`}</text>
      </svg>
      <div><strong>{label}</strong><span>{detail}</span></div>
    </div>
  );
}

/** Decimal units, as the plans state them ("50 GB"). */
function bytes(n: number): string {
  const one = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  if (n >= 1e9) return `${one(n / 1e9)} GB`;
  if (n >= 1e6) return `${one(n / 1e6)} MB`;
  return `${String(Math.round(n / 1e3))} KB`;
}

export function PlanUsage({ usage, planName, sendLimit, storageLimit }: {
  usage: Loadable<WorkspaceUsage>; planName: string | null; sendLimit: number | null; storageLimit: number | null;
}) {
  return (
    <section className="ov-card" aria-labelledby="ov-usage-title" data-testid="plan-usage">
      <header className="ov-card-head">
        <div><h2 id="ov-usage-title">Plan usage</h2><p className="ov-muted">{planName ? `${planName} plan · this month` : "This month"}</p></div>
        <Link to="/app/workspace/settings/usage" className="ov-link">Details →</Link>
      </header>
      {usage === "error" ? <Unavailable what="usage figures" /> : usage === null ? <Loading /> : (
        <div className="ov-rings">
          <Ring used={usage.signingRequests.sentThisMonth} limit={sendLimit} label="Documents sent"
            detail={sendLimit === null ? `${String(usage.signingRequests.sentThisMonth)} this month` : `${String(usage.signingRequests.sentThisMonth)} of ${String(sendLimit)}`} />
          <Ring used={usage.storageBytes} limit={storageLimit} label="Storage"
            detail={storageLimit === null ? bytes(usage.storageBytes) : `${bytes(usage.storageBytes)} of ${bytes(storageLimit)}`} />
        </div>
      )}
    </section>
  );
}

// ── Status donut ──────────────────────────────────────────────────────────

const SLICE_COLOR: Record<string, string> = { completed: DONE, "in-progress": SENT, declined: "#DC2626", expired: "#94A3B8" };

export function StatusDonut({ requests }: { requests: Loadable<SigningRequestListItem[]> }) {
  const slices = useMemo(() => Array.isArray(requests) ? statusMix(requests) : [], [requests]);
  const total = slices.reduce((a, s) => a + s.value, 0);
  return (
    <section className="ov-card" aria-labelledby="ov-status-title" data-testid="status-donut">
      <header className="ov-card-head"><div><h2 id="ov-status-title">Where documents stand</h2><p className="ov-muted">Sent in the last 90 days</p></div></header>
      {requests === "error" ? <Unavailable what="document statuses" /> : requests === null ? <Loading /> : total === 0 ? (
        <p className="ov-empty">No documents sent in the last 90 days.</p>
      ) : (
        <div className="ov-donut">
          <div className="ov-donut-chart" role="img" aria-label={slices.map(s => `${s.label}: ${String(s.value)}`).join(", ")}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices.filter(s => s.value > 0)} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                  {slices.filter(s => s.value > 0).map(s => <Cell key={s.key} fill={SLICE_COLOR[s.key]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="ov-donut-total"><strong>{total}</strong>sent</span>
          </div>
          <ul className="ov-donut-legend">
            {slices.map(s => (
              <li key={s.key}><i style={{ background: SLICE_COLOR[s.key] }} />{s.label}<strong>{s.value}</strong></li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Teams at a glance ─────────────────────────────────────────────────────

export function TeamBars({ teams, accent }: { teams: Loadable<TeamSize[]>; accent: string }) {
  const top = Array.isArray(teams) ? teams.slice(0, 5) : [];
  const max = Math.max(1, ...top.map(t => t.people));
  return (
    <section className="ov-card" aria-labelledby="ov-teams-title" data-testid="team-bars">
      <header className="ov-card-head">
        <div><h2 id="ov-teams-title"><Network size={15} aria-hidden /> Teams at a glance</h2><p className="ov-muted">People per team</p></div>
        <Link to="/app/workspace/people" className="ov-link">People &amp; Teams →</Link>
      </header>
      {teams === "error" ? <Unavailable what="teams" /> : teams === null ? <Loading /> : top.length === 0 ? (
        <p className="ov-empty">No teams yet. Group people into departments or offices under People &amp; Teams.</p>
      ) : (
        <ul className="ov-bars">
          {top.map(t => (
            <li key={t.unitId}>
              <span className="ov-bar-name">{t.name}</span>
              <span className="ov-bar-track"><span className="ov-bar-fill" style={{ width: `${String(Math.max(4, (t.people / max) * 100))}%`, background: accent }} /></span>
              <span className="ov-bar-value">{t.people}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Recent activity ───────────────────────────────────────────────────────

export function RecentActivity({ activity, meId, people, photo }: {
  activity: Loadable<WorkspaceActivityEntry[]>;
  meId: string | null;
  people: ReadonlyMap<string, { userId: string; displayName: string }>;
  photo: (userId: string | null | undefined) => string | undefined;
}) {
  return (
    <section className="ov-card" aria-labelledby="ov-recent-title" data-testid="recent-activity">
      <header className="ov-card-head">
        <div><h2 id="ov-recent-title"><History size={15} aria-hidden /> Recent activity</h2></div>
        <Link to="/app/workspace/activity" className="ov-link">See all →</Link>
      </header>
      {activity === "error" ? <Unavailable what="recent activity" /> : activity === null ? <Loading /> : activity.length === 0 ? (
        <p className="ov-empty">Nothing recorded yet.</p>
      ) : (
        <ul className="ov-recent">
          {activity.map(e => (
            <li key={e.eventId}>
              <span className="ov-recent-text"><ActivitySentence entry={e} meId={meId} people={people} photo={photo} /></span>
              <time dateTime={new Date(e.occurredAt).toISOString()}>{new Date(e.occurredAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const OVERVIEW_CSS = `
.ov-card { background: #FFFFFF; border: 1px solid #E3E8EF; border-radius: 16px; padding: 16px 18px; min-width: 0; box-shadow: 0 1px 2px rgba(7,17,31,0.04); box-sizing: border-box; }
.ov-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.ov-card-head h2 { display: flex; align-items: center; gap: 6px; font-family: 'Geist', sans-serif; font-size: 15px; font-weight: 800; color: ${NAVY}; margin: 0; }
.ov-muted { font-family: 'Geist', sans-serif; font-size: 12.5px; color: ${SLATE}; margin: 2px 0 0; line-height: 1.5; }
.ov-empty { font-family: 'Geist', sans-serif; font-size: 13px; color: ${SLATE}; margin: 6px 0; padding: 22px 12px; text-align: center; background: #F8FAFC; border: 1px dashed #D7DEE7; border-radius: 12px; }
.ov-link { font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 600; color: #005A9E; text-decoration: none; white-space: nowrap; }
.ov-link:hover { text-decoration: underline; }
.ov-skeleton { height: 120px; border-radius: 12px; background: linear-gradient(90deg, #F1F5F9 0%, #E9EEF4 50%, #F1F5F9 100%); background-size: 200% 100%; animation: ov-shimmer 1.2s linear infinite; }
@keyframes ov-shimmer { to { background-position: -200% 0; } }

.ov-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.ov-kpi { display: flex; flex-direction: column; gap: 4px; text-decoration: none; position: relative; overflow: hidden; transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease; }
.ov-kpi:hover { border-color: #93C5FD; box-shadow: 0 10px 22px -14px rgba(0,120,212,0.6); transform: translateY(-1px); }
.ov-kpi-top { display: flex; align-items: center; gap: 8px; font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 600; color: ${SLATE}; }
.ov-kpi-icon { width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ov-kpi-value { font-family: 'Geist', sans-serif; font-size: 28px; font-weight: 800; color: ${NAVY}; line-height: 1.1; margin-top: 4px; }
.ov-sub { font-family: 'Geist', sans-serif; font-size: 11.5px; color: ${SLATE}; }
.ov-delta { display: inline-flex; align-items: center; gap: 3px; font-family: 'Geist', sans-serif; font-size: 11.5px; font-weight: 600; }
.ov-delta[data-tone="up"] { color: #15803D; }
.ov-delta[data-tone="down"] { color: #B42318; }
.ov-delta[data-tone="flat"] { color: ${SLATE}; }
.ov-spark { width: 100%; height: 34px; margin-top: 6px; display: block; }

.ov-chart { margin-bottom: 16px; }
.ov-chart-box { height: 260px; width: 100%; }
.ov-range { display: inline-flex; padding: 3px; gap: 2px; background: #F1F5F9; border-radius: 10px; flex-shrink: 0; }
.ov-range button { font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 600; border: none; background: transparent; color: ${SLATE}; padding: 6px 10px; border-radius: 8px; cursor: pointer; min-height: 30px; }
.ov-range button[aria-pressed="true"] { background: #FFFFFF; color: ${NAVY}; box-shadow: 0 1px 2px rgba(7,17,31,0.12); }
.ov-legend { display: flex; gap: 14px; font-family: 'Geist', sans-serif; font-size: 12px; color: ${SLATE}; margin-bottom: 6px; }
.ov-legend i, .ov-donut-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }

.ov-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
.ov-rings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.ov-ring { display: flex; align-items: center; gap: 12px; min-width: 0; }
.ov-ring svg { width: 84px; height: 84px; flex-shrink: 0; }
.ov-ring div { display: flex; flex-direction: column; min-width: 0; font-family: 'Geist', sans-serif; }
.ov-ring strong { font-size: 13px; color: ${NAVY}; }
.ov-ring span { font-size: 12px; color: ${SLATE}; overflow-wrap: anywhere; }
.ov-donut { display: flex; align-items: center; gap: 18px; }
.ov-donut-chart { position: relative; width: 150px; height: 150px; flex-shrink: 0; }
.ov-donut-total { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Geist', sans-serif; font-size: 11px; color: ${SLATE}; pointer-events: none; }
.ov-donut-total strong { font-size: 24px; color: ${NAVY}; line-height: 1; }
.ov-donut-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }
.ov-donut-legend li { display: flex; align-items: center; font-family: 'Geist', sans-serif; font-size: 13px; color: ${NAVY}; }
.ov-donut-legend strong { margin-left: auto; padding-left: 10px; }

.ov-bars { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.ov-bars li { display: grid; grid-template-columns: minmax(0, 140px) minmax(0, 1fr) 28px; align-items: center; gap: 10px; }
.ov-bar-name { font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 600; color: ${NAVY}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ov-bar-track { height: 10px; border-radius: 999px; background: #EEF2F6; overflow: hidden; }
.ov-bar-fill { display: block; height: 100%; border-radius: 999px; }
.ov-bar-value { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; color: ${NAVY}; text-align: right; }

.ov-recent { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.ov-recent li { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 9px 0; border-top: 1px solid #F1F5F9; }
.ov-recent li:first-child { border-top: none; }
.ov-recent-text { font-family: 'Geist', sans-serif; font-size: 13px; color: ${NAVY}; line-height: 1.6; min-width: 0; overflow-wrap: anywhere; }
.ov-recent time { font-family: 'Geist Mono', monospace; font-size: 11px; color: #94A3B8; white-space: nowrap; padding-top: 3px; }
.ov-recent .act-who { display: inline-flex; align-items: center; gap: 5px; vertical-align: middle; margin: 0 2px; }
.ov-recent .act-who strong[data-you="true"] { color: #0078D4; }

@media (max-width: 1100px) { .ov-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .ov-pair { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 640px) {
  .ov-card { padding: 14px; border-radius: 14px; }
  .ov-kpis { gap: 8px; }
  .ov-kpi-value { font-size: 22px; }
  .ov-kpi-top { font-size: 11.5px; }
  .ov-kpi-icon { width: 24px; height: 24px; }
  .ov-chart-box { height: 200px; }
  .ov-card-head { flex-wrap: wrap; }
  .ov-rings { grid-template-columns: minmax(0, 1fr); }
  .ov-donut { flex-direction: column; align-items: stretch; }
  .ov-donut-chart { margin: 0 auto; width: 140px; height: 140px; }
  .ov-bars li { grid-template-columns: minmax(0, 96px) minmax(0, 1fr) 24px; }
}
@media (prefers-reduced-motion: reduce) { .ov-skeleton { animation: none; } .ov-kpi { transition: none; } .ov-kpi:hover { transform: none; } }
`;
