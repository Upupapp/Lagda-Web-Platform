import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import { ENOTARY_SUBNAV, ENOTARY_DISCLAIMER } from "../../pages/public/enotary/content";
import { Z } from "../../utils/z-index";
import { TabStrip } from "../platform/TabStrip";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const BURGUNDY = "#67023B";
const SOFT_BURGUNDY = "rgba(103,2,59,0.12)";

// ── SubNav ──────────────────────────────────────────────────────────────────

export function EnotarySubNav() {
  const location = useLocation();
  return (
    <nav
      aria-label="eNotary navigation"
      style={{
        position: "sticky", top: 72, zIndex: Z.sticky,
        background: "rgba(7,17,31,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <TabStrip as="scroller" label="eNotary pages" activeKey={location.pathname}
          className="enotary-subnav-scroll">
          {ENOTARY_SUBNAV.map(({ label, path }) => {
            const isActive = path === "/enotary"
              ? location.pathname === "/enotary"
              : location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                style={{
                  color: isActive ? BURGUNDY : "#94A3B8",
                  ...GF, fontSize: 13, fontWeight: isActive ? 700 : 500,
                  padding: "14px 18px", textDecoration: "none", whiteSpace: "nowrap",
                  borderBottom: isActive ? `2px solid ${BURGUNDY}` : "2px solid transparent",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {label}
              </NavLink>
            );
          })}
        </TabStrip>
      </div>
      <style>{`.enotary-subnav-scroll::-webkit-scrollbar{display:none}`}</style>
    </nav>
  );
}

// ── EnotaryPageShell ─────────────────────────────────────────────────────────

export function EnotaryPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#07111F", minHeight: "100vh", color: "white", ...GF }}>
      <EnotarySubNav />
      {children}
    </div>
  );
}

// ── EnotaryStatusBanner ──────────────────────────────────────────────────────

export function EnotaryStatusBanner() {
  return (
    <div style={{ background: SOFT_BURGUNDY, borderBottom: `1px solid rgba(103,2,59,0.25)`, padding: "12px 24px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ color: BURGUNDY, ...GM, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: "rgba(103,2,59,0.18)", border: `1px solid rgba(103,2,59,0.3)`, whiteSpace: "nowrap" }}>
          COMING SOON
        </span>
        <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          {ENOTARY_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

// ── EnotaryDisclaimer ────────────────────────────────────────────────────────

export function EnotaryDisclaimer({ variant = "default" }: { variant?: "default" | "compact" }) {
  if (variant === "compact") {
    return (
      <p style={{ color: "#8A9BAE", ...GF, fontSize: 12, lineHeight: 1.6, margin: "12px 0 0" }}>
        {ENOTARY_DISCLAIMER}
      </p>
    );
  }
  return (
    <div style={{ background: SOFT_BURGUNDY, border: `1px solid rgba(103,2,59,0.25)`, borderRadius: 10, padding: "14px 18px" }}>
      <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
        <strong style={{ color: BURGUNDY }}>LAGDA eNotary is Coming Soon</strong> and Subject to Supreme Court Accreditation and applicable rules. LAGDA does not currently represent this service as accredited, approved, or available.
      </p>
    </div>
  );
}

// ── EnotarySection ───────────────────────────────────────────────────────────

export function EnotarySection({ id, children, light, bordered }: { id?: string; children: React.ReactNode; light?: boolean; bordered?: boolean }) {
  return (
    <section
      id={id}
      style={{
        padding: "56px 24px",
        background: light ? "rgba(255,255,255,0.015)" : "transparent",
        borderTop: bordered ? "1px solid rgba(255,255,255,0.05)" : undefined,
      }}
    >
      {children}
    </section>
  );
}

export function EnotaryHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ color: "white", ...GF, fontSize: "clamp(20px, 3vw, 30px)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 10px" }}>{children}</h2>
      {sub && <p style={{ color: "#94A3B8", ...GF, fontSize: 15, margin: 0, maxWidth: 640 }}>{sub}</p>}
    </div>
  );
}

// ── FutureConceptCard ────────────────────────────────────────────────────────

export function FutureConceptCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(103,2,59,0.06)", border: `1px solid rgba(103,2,59,0.2)`, borderRadius: 12, padding: "20px 24px", position: "relative" }}>
      <span style={{ position: "absolute", top: 12, right: 14, color: "#8A9BAE", ...GM, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>FUTURE CONCEPT — NOT AN AVAILABLE SERVICE</span>
      <h3 style={{ color: "white", ...GF, fontSize: 16, fontWeight: 700, margin: "20px 0 10px" }}>{label}</h3>
      <div style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

// ── AccreditationTimeline ────────────────────────────────────────────────────

type TimelineStage = { id: string; label: string; status: string; desc: string };
type StageCategory = "active" | "planned" | "future-regulatory" | "after-approval";

function stageCategory(status: string): StageCategory {
  if (status === "In progress") return "active";
  if (status === "Planned") return "planned";
  if (status.startsWith("Future")) return "future-regulatory";
  return "after-approval";
}

const CAT_COLOR: Record<StageCategory, string> = {
  "active": "#22C55E",
  "planned": "#38bdf8",
  "future-regulatory": BURGUNDY,
  "after-approval": "#8A9BAE",
};

export function AccreditationTimeline({ stages }: { stages: TimelineStage[] }) {
  return (
    <div style={{ position: "relative" }}>
      {stages.map((stage, i) => {
        const cat = stageCategory(stage.status);
        const color = CAT_COLOR[cat];
        return (
          <div key={stage.id} style={{ display: "flex", gap: 16, marginBottom: i < stages.length - 1 ? 24 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 4 }} />
              {i < stages.length - 1 && <div style={{ width: 2, flex: 1, background: "rgba(255,255,255,0.06)", marginTop: 6 }} />}
            </div>
            <div style={{ paddingBottom: i < stages.length - 1 ? 20 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <h3 style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>{stage.label}</h3>
                <span style={{ color, ...GM, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: `${color}18`, border: `1px solid ${color}30`, whiteSpace: "nowrap" }}>
                  {stage.status}
                </span>
              </div>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{stage.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── EnotaryFaqAccordion ──────────────────────────────────────────────────────

type FaqItem = { id: string; q: string; a: string };
type FaqGroup = { id: string; title: string; items: FaqItem[] };

export function EnotaryFaqGroup({ group }: { group: FaqGroup }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ color: "white", ...GF, fontSize: "clamp(16px, 2.5vw, 21px)", fontWeight: 800, margin: "0 0 16px", paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{group.title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {group.items.map(({ id, q, a }) => {
          const expanded = open === id;
          return (
            <div key={id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, overflow: "hidden" }}>
              <button
                aria-expanded={expanded}
                aria-controls={`efaq-${id}`}
                onClick={() => setOpen(expanded ? null : id)}
                style={{
                  width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer",
                  padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                }}
              >
                <span style={{ color: "white", ...GF, fontSize: 14, fontWeight: 600 }}>{q}</span>
                <span aria-hidden style={{ color: BURGUNDY, fontSize: 18, fontWeight: 300, flexShrink: 0 }}>{expanded ? "−" : "+"}</span>
              </button>
              <div id={`efaq-${id}`} hidden={!expanded} style={{ padding: "0 20px 16px" }}>
                <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
