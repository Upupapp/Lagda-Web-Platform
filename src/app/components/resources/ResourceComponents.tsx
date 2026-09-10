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
      background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(0,0,0,0.08)",
    }}>
      <TabStrip as="scroller" label="Resource pages" activeKey={pathname}
        style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        {RESOURCES_SUBNAV.map(({ label, path }) => {
          const active = pathname === path || (path !== "/resources" && pathname.startsWith(path + "/"));
          return (
            <Link key={path} to={path} aria-current={active ? "page" : undefined} style={{
              textDecoration: "none", flexShrink: 0,
              display: "flex", alignItems: "center", padding: "14px 14px",
              borderBottom: active ? "2px solid #0078D4" : "2px solid transparent",
              transition: "border-color 0.15s ease",
            }}>
              <span style={{ ...GF, fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#07111F" : "#64748B", whiteSpace: "nowrap" }}>{label}</span>
            </Link>
          );
        })}
      </TabStrip>
    </nav>
  );
}

export function ResourcesPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", color: "#07111F", ...GF }}>
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
    <section style={{ padding: "64px 24px 48px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <p style={{ color: "#0078D4", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>{eyebrow}</p>
        <h1 style={{ color: "#07111F", ...GF, fontSize: "clamp(24px, 4.5vw, 42px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 16px" }}>{title}</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 16, lineHeight: 1.65, margin: 0 }}>{sub}</p>
      </div>
    </section>
  );
}

export function GuideSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ paddingTop: 40, paddingBottom: 16, borderTop: "1px solid rgba(0,0,0,0.06)", marginTop: 32 }}>
      <h2 id={`${id}-h`} style={{ color: "#07111F", ...GF, fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.01em" }}>{title}</h2>
      {children}
    </section>
  );
}

export function GuidePara({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#334155", ...GF, fontSize: 15, lineHeight: 1.75, margin: "0 0 14px" }}>{children}</p>;
}

export function GuideCallout({ label, text, color = "#0078D4" }: { label?: string; text: string; color?: string }) {
  return (
    <div style={{ background: `rgba(${color === "#DC2626" ? "220,38,38" : color === "#B45309" ? "180,83,9" : "0,120,212"},0.06)`, border: `1px solid rgba(${color === "#DC2626" ? "220,38,38" : color === "#B45309" ? "180,83,9" : "0,120,212"},0.2)`, borderRadius: 10, padding: "14px 18px", margin: "16px 0" }}>
      {label && <p style={{ color, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>{label}</p>}
      <p style={{ color: "#334155", ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

export function GuideList({ items }: { items: string[] }) {
  return (
    <ul style={{ padding: "0 0 0 20px", margin: "0 0 14px" }}>
      {items.map((item) => (
        <li key={item} style={{ color: "#334155", ...GF, fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>{item}</li>
      ))}
    </ul>
  );
}

export function EduDisclaimer() {
  return (
    <div style={{ background: "#f8fafb", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "14px 18px", marginTop: 32 }}>
      <p style={{ color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.65, margin: 0 }}>
        <strong style={{ color: "#334155", fontWeight: 600 }}>Educational information:</strong> {EDU_DISCLAIMER}
      </p>
    </div>
  );
}

// ── Resource card ─────────────────────────────────────────────────────────────
export function ResourceCard({ icon, title, desc, path, category, audience }: { icon: string; title: string; desc: string; path: string; category: string; audience: string }) {
  return (
    <Link to={path} style={{ textDecoration: "none" }}>
      <div style={{
        background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12, padding: "18px 20px", height: "100%",
        display: "flex", flexDirection: "column", gap: 8,
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        boxShadow: "0 1px 4px rgba(7,17,31,0.07)",
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,120,212,0.35)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(7,17,31,0.10)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(7,17,31,0.07)"; }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span aria-hidden style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
          <span style={{ color: "#0078D4", ...GM, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>{category.toUpperCase()}</span>
        </div>
        <p style={{ color: "#07111F", ...GF, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</p>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5, flex: 1 }}>{desc}</p>
        <p style={{ color: "#94A3B8", ...GM, fontSize: 9, margin: 0 }}>For: {audience}</p>
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

