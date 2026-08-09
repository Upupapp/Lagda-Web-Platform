import { Link, useLocation } from "react-router";
import { RESOURCES_SUBNAV, EDU_DISCLAIMER } from "../../pages/public/resources/content";
import { Z } from "../../utils/z-index";
import { TabStrip } from "../platform/TabStrip";
import { PublicSection, PublicHeading } from "../public/PublicKit";
import type { PublicSectionProps, PublicHeadingProps } from "../public/PublicKit";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Resources sub-nav ─────────────────────────────────────────────────────────
export function ResourcesSubNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Resources navigation" style={{
      position: "sticky", top: 72, zIndex: Z.sticky,
      background: "rgba(7,17,31,0.95)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    }}>
      <TabStrip as="scroller" label="Resource pages" activeKey={pathname}
        style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        {RESOURCES_SUBNAV.map(({ label, path }) => {
          const active = pathname === path || (path !== "/resources" && pathname.startsWith(path + "/"));
          return (
            <Link key={path} to={path} aria-current={active ? "page" : undefined} style={{
              textDecoration: "none", flexShrink: 0,
              display: "flex", alignItems: "center", padding: "14px 14px",
              borderBottom: active ? "2px solid #38bdf8" : "2px solid transparent",
              transition: "border-color 0.15s ease",
            }}>
              <span style={{ ...GF, fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "white" : "#94A3B8", whiteSpace: "nowrap" }}>{label}</span>
            </Link>
          );
        })}
      </TabStrip>
    </nav>
  );
}

export function ResourcesPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#07111F", minHeight: "100vh", color: "white", ...GF }}>
      <ResourcesSubNav />
      {children}
    </div>
  );
}

// ── Guide reading layout (narrow centered) ────────────────────────────────────
export function GuideLayout({ hero, children }: { hero: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      {hero}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 80px" }}>
        {children}
      </div>
    </>
  );
}

export function GuideHero({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <section style={{ padding: "64px 24px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>{eyebrow}</p>
        <h1 style={{ color: "white", ...GF, fontSize: "clamp(24px, 4.5vw, 42px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 16px" }}>{title}</h1>
        <p style={{ color: "#94A3B8", ...GF, fontSize: 16, lineHeight: 1.65, margin: 0 }}>{sub}</p>
      </div>
    </section>
  );
}

export function GuideSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ paddingTop: 40, paddingBottom: 16, borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 32 }}>
      <h2 id={`${id}-h`} style={{ color: "white", ...GF, fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.01em" }}>{title}</h2>
      {children}
    </section>
  );
}

export function GuidePara({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.75, margin: "0 0 14px" }}>{children}</p>;
}

export function GuideCallout({ label, text, color = "#0078D4" }: { label?: string; text: string; color?: string }) {
  return (
    <div style={{ background: `rgba(${color === "#ef4444" ? "239,68,68" : color === "#C9960C" ? "201,150,12" : "0,120,212"},0.07)`, border: `1px solid rgba(${color === "#ef4444" ? "239,68,68" : color === "#C9960C" ? "201,150,12" : "0,120,212"},0.2)`, borderRadius: 10, padding: "14px 18px", margin: "16px 0" }}>
      {label && <p style={{ color, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>{label}</p>}
      <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

export function GuideList({ items }: { items: string[] }) {
  return (
    <ul style={{ padding: "0 0 0 20px", margin: "0 0 14px" }}>
      {items.map((item) => (
        <li key={item} style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>{item}</li>
      ))}
    </ul>
  );
}

export function EduDisclaimer() {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 18px", marginTop: 32 }}>
      <p style={{ color: "#8A9BAE", ...GF, fontSize: 12, lineHeight: 1.65, margin: 0 }}>
        <strong style={{ color: "#94A3B8", fontWeight: 600 }}>Educational information:</strong> {EDU_DISCLAIMER}
      </p>
    </div>
  );
}

// ── Resource card ─────────────────────────────────────────────────────────────
export function ResourceCard({ icon, title, desc, path, category, audience }: { icon: string; title: string; desc: string; path: string; category: string; audience: string }) {
  return (
    <Link to={path} style={{ textDecoration: "none" }}>
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, padding: "18px 20px", height: "100%",
        display: "flex", flexDirection: "column", gap: 8,
        transition: "border-color 0.15s ease, background 0.15s ease",
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,120,212,0.35)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,120,212,0.05)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span aria-hidden style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
          <span style={{ color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>{category.toUpperCase()}</span>
        </div>
        <p style={{ color: "white", ...GF, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</p>
        <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5, flex: 1 }}>{desc}</p>
        <p style={{ color: "#7C8DA4", ...GM, fontSize: 9, margin: 0 }}>For: {audience}</p>
      </div>
    </Link>
  );
}

// ── FAQ accordion (reused from pricing but standalone) ────────────────────────
// Shared with Pricing — the two copies were character-identical.
export { FaqAccordion } from "../public/PublicKit";

export function ResourcesSection(props: PublicSectionProps) {
  return <PublicSection {...props} />;
}

export function ResourcesHeading(props: PublicHeadingProps) {
  return <PublicHeading {...props} />;
}

