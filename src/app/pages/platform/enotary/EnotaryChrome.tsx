// The look every eNotary page shares: the hero band, the paper card under
// it, the certified seal and the step rail.
//
// The colours and type are LAGDA eNotary's own (the Notary Directory's):
// white and sky blue are LAGDA and everything the client does; maroon belongs
// to the lawyers. Headings are set in a Times-style serif.
//
// Presentational only. What a page says and does is the page's.

import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import { GF } from "../../../components/system/design-system";

export const E = {
  ground: "#F4F8FC", paper: "#FFFFFF", line: "#DDE6EF", wash: "#F1F5FA",
  ink: "#0A1A2B", navy: "#0B1F44", text: "#33475B", quiet: "#647789", faint: "#98A7B6",
  sky: "#0A84D6", skyDeep: "#0563A6", skyWash: "#E8F3FC", skyLine: "#BBDDF5",
  maroon: "#8C1D3F", maroonDeep: "#6F1632", maroonWash: "#FAEFF2", maroonLine: "#E6C5CF",
  crimson: "linear-gradient(100deg, #7A0F1E 0%, #94132A 52%, #B0182B 100%)",
  ok: "#17703C", okWash: "#E3F5EA",
} as const;

export const SERIF = "Tinos, 'Times New Roman', Times, serif";

export type EnotaryTone = "client" | "attorney" | "neutral";

const STYLES = `
  .eno-page { background: ${E.ground}; min-height: 100%; }
  .eno-hero { position: relative; overflow: hidden; background: linear-gradient(180deg, #E6F1FB 0%, #F1F7FD 100%); border-bottom: 1px solid ${E.line}; }
  .eno-hero-in { position: relative; display: flex; align-items: center; gap: 24px; margin: 0 auto; padding: clamp(22px, 4vw, 40px) clamp(14px, 4vw, 28px) clamp(54px, 7vw, 74px); box-sizing: border-box; }
  .eno-waves { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
  .eno-seal { flex: 0 0 auto; width: clamp(104px, 13vw, 138px); height: auto; filter: drop-shadow(0 10px 18px rgba(111,22,50,0.28)); }
  .eno-card { animation: eno-in 260ms ease both; }
  @keyframes eno-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .eno-rail { display: flex; margin: 0 0 20px; padding: 0; list-style: none; background: ${E.paper}; border: 1px solid ${E.line}; border-radius: 10px; overflow-x: auto; scrollbar-width: thin; }
  .eno-rail li { flex: 1 1 0; min-width: 0; display: flex; align-items: center; gap: 9px; padding: 11px 9px; border-right: 1px solid ${E.line}; border-bottom: 3px solid transparent; box-sizing: border-box; }
  .eno-rail li:last-child { border-right: 0; }
  @media (max-width: 860px) { .eno-rail li { flex: 1 0 auto; min-width: 104px; } }
  @media (max-width: 640px) { .eno-seal { display: none; } }
  @media (prefers-reduced-motion: reduce) { .eno-card { animation: none; } }
`;

/** The scalloped "LAGDA IO CERTIFIED" seal. Decoration: said to nobody. */
export function EnotarySeal({ className }: { className?: string }) {
  const scallops = Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * Math.PI * 2;
    return <circle key={i} cx={80 + Math.cos(angle) * 64} cy={80 + Math.sin(angle) * 64} r={10.5} fill="#8C1D3F" />;
  });
  return (
    <svg className={className} viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="eno-seal-fill" cx="40%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#B0182B" /><stop offset="100%" stopColor="#6F1632" />
        </radialGradient>
        <path id="eno-seal-arc" d="M 80 80 m -47 0 a 47 47 0 1 1 94 0" />
      </defs>
      {scallops}
      <circle cx="80" cy="80" r="66" fill="url(#eno-seal-fill)" />
      <circle cx="80" cy="80" r="57" fill="none" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.4" />
      <circle cx="80" cy="80" r="37" fill="none" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1" />
      <text fill="#FFFFFF" fontFamily="'Geist', sans-serif" fontSize="9.4" fontWeight="700" letterSpacing="2.2">
        <textPath href="#eno-seal-arc" startOffset="50%" textAnchor="middle">LAGDA IO CERTIFIED</textPath>
      </text>
      <g transform="translate(69 50)" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 1h9l5 5v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" /><path d="M7 9h8M7 13h5" />
      </g>
      <text x="80" y="96" textAnchor="middle" fill="#FFFFFF" fontFamily="'Geist', sans-serif" fontSize="15" fontWeight="800">E-Notary</text>
      <text x="80" y="113" textAnchor="middle" fill="#FFFFFF" fillOpacity="0.9" fontSize="9" letterSpacing="5">★★★</text>
    </svg>
  );
}

const PILL: Record<EnotaryTone, CSSProperties> = {
  client: { color: E.skyDeep, background: E.paper, border: `1px solid ${E.skyLine}` },
  attorney: { color: E.maroon, background: E.maroonWash, border: `1px solid ${E.maroonLine}` },
  neutral: { color: E.quiet, background: E.paper, border: `1px solid ${E.line}` },
};

export interface EnotaryFrameProps {
  /** The line above the title, set in small capitals. */
  readonly eyebrow?: string;
  readonly description?: ReactNode;
  /** A short word beside the title: the role, "Preview". */
  readonly badge?: string;
  readonly tone?: EnotaryTone;
  readonly wide?: boolean;
  readonly children: ReactNode;
}

/** One eNotary page: the hero band with its title, and the paper card under it. */
export function EnotaryFrame({
  eyebrow = "Legal services  •  Trusted professionals", description, badge, tone = "client", wide = false, children,
}: EnotaryFrameProps) {
  const width = wide ? 920 : 640;
  return (
    <div className="eno-page" style={GF}>
      <style>{STYLES}</style>
      <div className="eno-hero">
        <svg className="eno-waves" viewBox="0 0 1200 240" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M0 200 C 220 150 380 250 620 196 S 1020 120 1200 60 L1200 240 L0 240 Z" fill="#CFE4F7" fillOpacity="0.55" />
          <path d="M700 240 C 860 190 1010 150 1200 20 L1200 240 Z" fill="#E9C9D5" fillOpacity="0.5" />
          <path d="M0 240 C 160 214 300 226 460 240 Z" fill="#BBDDF5" fillOpacity="0.5" />
        </svg>
        <div className="eno-hero-in" style={{ maxWidth: width + 56 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              margin: "0 0 8px", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
              color: tone === "attorney" ? E.maroon : "#4A9DDB",
            }}>
              {eyebrow}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h1 style={{
                margin: 0, fontFamily: SERIF, fontWeight: 700, color: E.navy, letterSpacing: "-0.015em",
                fontSize: "clamp(28px, 6vw, 40px)", lineHeight: 1.12,
              }}>
                LAGDA <span style={{ color: E.maroon }}>eNotary</span>
              </h1>
              {badge !== undefined && (
                <span style={{
                  ...PILL[tone], display: "inline-flex", alignItems: "center", minHeight: 26, padding: "0 12px",
                  borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", whiteSpace: "nowrap",
                }}>
                  {badge}
                </span>
              )}
            </div>
            {description !== undefined && (
              <p style={{ margin: "10px 0 0", fontSize: "clamp(14px, 3.6vw, 16px)", color: E.quiet, lineHeight: 1.55, maxWidth: "58ch" }}>
                {description}
              </p>
            )}
          </div>
          <EnotarySeal className="eno-seal" />
        </div>
      </div>
      <div style={{ maxWidth: width + 56, margin: "0 auto", padding: "0 clamp(10px, 4vw, 28px) 64px", boxSizing: "border-box" }}>
        <div
          className="eno-card"
          style={{
            position: "relative", marginTop: "clamp(-46px, -5vw, -34px)", background: E.paper,
            border: `1px solid ${E.line}`, borderTop: `3px solid ${tone === "attorney" ? E.maroon : E.sky}`,
            borderRadius: 14, padding: "clamp(16px, 4vw, 28px)",
            boxShadow: "0 1px 2px rgba(10,26,43,0.05), 0 18px 44px -18px rgba(10,26,43,0.22)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** A section heading inside the card, in the serif. */
export function EnotaryHeading({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ margin: "0 0 12px", fontFamily: SERIF, fontSize: "clamp(18px, 4.6vw, 21px)", fontWeight: 700, color: E.navy, lineHeight: 1.25 }}>
      {children}
    </h2>
  );
}

/**
 * The steps of a notarial session, as one joined row: done steps ticked, the
 * current one filled, the rest numbered. Scrolls sideways where it must.
 */
export function EnotaryRail({ steps, current, label }: {
  steps: readonly { readonly id: string; readonly label: string }[]; current: string; label: string;
}) {
  const index = steps.findIndex(step => step.id === current);
  return (
    <ol className="eno-rail" aria-label={label}>
      {steps.map((step, i) => {
        const done = i < index;
        const now = i === index;
        return (
          <li key={step.id} style={now ? { borderBottomColor: E.sky, background: "#FBFDFF" } : undefined}>
            <span
              aria-hidden="true"
              style={{
                flex: "0 0 auto", display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 999,
                fontSize: 13, fontWeight: 700,
                background: done ? E.ok : now ? E.sky : E.paper, color: done || now ? "#FFFFFF" : E.quiet,
                border: `1.5px solid ${done ? E.ok : now ? E.sky : "#C3D0DF"}`,
              }}
            >
              {done ? <Check size={15} /> : i + 1}
            </span>
            <span
              {...(now ? { "aria-current": "step" as const } : {})}
              style={{ fontSize: 13, fontWeight: now || done ? 700 : 600, color: now ? E.ink : done ? E.ok : E.quiet, lineHeight: 1.25 }}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
