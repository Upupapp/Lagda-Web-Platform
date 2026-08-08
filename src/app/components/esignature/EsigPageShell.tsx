import { Link } from "react-router";
import { EsigSubNav } from "./EsigSubNav";
import { LEGAL_NOTE, ENOTARY_NOTE } from "../../pages/public/esignature/content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Reusable section container ────────────────────────────────────────────────
export function PageSection({
  id,
  children,
  light,
  bordered,
}: {
  id?: string;
  children: React.ReactNode;
  light?: boolean;
  bordered?: boolean;
}) {
  return (
    <section
      id={id}
      style={{
        background: light ? "rgba(255,255,255,0.02)" : "transparent",
        borderTop: bordered ? "1px solid rgba(255,255,255,0.06)" : undefined,
        borderBottom: bordered ? "1px solid rgba(255,255,255,0.06)" : undefined,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 24px" }}>
        {children}
      </div>
    </section>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeading({
  eyebrow,
  id,
  heading,
  sub,
  center,
}: {
  eyebrow: string;
  id: string;
  heading: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div style={{ marginBottom: 40, textAlign: center ? "center" : undefined }}>
      <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
        {eyebrow}
      </p>
      <h2 id={id} style={{ color: "white", ...GF, fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 800, margin: 0, marginBottom: sub ? 12 : 0, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
        {heading}
      </h2>
      {sub && (
        <p style={{ color: "#94A3B8", ...GF, fontSize: 16, lineHeight: 1.65, margin: center ? "0 auto" : 0, maxWidth: 620 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Related pages nav ─────────────────────────────────────────────────────────
export function RelatedPages({ links }: { links: { label: string; desc: string; path: string }[] }) {
  return (
    <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 20 }}>
          EXPLORE MORE
        </p>
        <div style={{ display: "grid", gap: 12 }} className="related-grid">
          {links.map((l) => (
            <Link key={l.path} to={l.path} style={{ textDecoration: "none" }}>
              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "16px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "border-color 0.15s ease, background 0.15s ease",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,120,212,0.35)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,120,212,0.04)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
              >
                <div>
                  <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>{l.label}</p>
                  <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, marginTop: 2 }}>{l.desc}</p>
                </div>
                <span style={{ color: "#38BDF8", ...GF, fontSize: 16, flexShrink: 0 }}>→</span>
              </div>
            </Link>
          ))}
        </div>
        <style>{`
          .related-grid { grid-template-columns: repeat(2, 1fr); }
          @media (max-width: 640px) { .related-grid { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    </section>
  );
}

// ── Page-level final CTA ──────────────────────────────────────────────────────
export function PageCTA({
  heading,
  sub,
  primaryLabel,
  primaryPath,
  secondaryLabel,
  secondaryPath,
}: {
  heading: string;
  sub?: string;
  primaryLabel: string;
  primaryPath: string;
  secondaryLabel?: string;
  secondaryPath?: string;
}) {
  return (
    <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,120,212,0.04)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
        <h2 style={{ color: "white", ...GF, fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, margin: 0, marginBottom: sub ? 12 : 24, letterSpacing: "-0.02em" }}>
          {heading}
        </h2>
        {sub && (
          <p style={{ color: "#94A3B8", ...GF, fontSize: 16, lineHeight: 1.65, margin: "0 auto 24px", maxWidth: 520 }}>
            {sub}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to={primaryPath} style={{
            background: "#0078D4", color: "white",
            padding: "13px 28px", borderRadius: 12,
            ...GF, fontSize: 15, fontWeight: 700, textDecoration: "none",
            display: "inline-flex", alignItems: "center",
            boxShadow: "0 4px 16px rgba(0,120,212,0.3)",
            transition: "filter 0.15s ease, transform 0.15s ease",
            minHeight: 44,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ""; e.currentTarget.style.transform = ""; }}
          >
            {primaryLabel}
          </Link>
          {secondaryLabel && secondaryPath && (
            <Link to={secondaryPath} style={{
              background: "rgba(255,255,255,0.06)", color: "white",
              border: "1px solid rgba(255,255,255,0.15)",
              padding: "13px 24px", borderRadius: 12,
              ...GF, fontSize: 15, fontWeight: 600, textDecoration: "none",
              display: "inline-flex", alignItems: "center",
              transition: "background 0.15s ease",
              minHeight: 44,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Legal responsibility notice ───────────────────────────────────────────────
export function LegalNote({ showEnotary }: { showEnotary?: boolean }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "20px 24px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ color: "#7C8DA4", ...GF, fontSize: 12, lineHeight: 1.6, margin: 0, marginBottom: showEnotary ? 8 : 0 }}>
          {LEGAL_NOTE}
        </p>
        {showEnotary && (
          <p style={{ color: "#8A9BAE", ...GF, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            {ENOTARY_NOTE}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
export function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "20px 20px 18px",
    }}>
      <span aria-hidden="true" style={{ fontSize: 24, display: "block", marginBottom: 12 }}>{icon}</span>
      <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 6 }}>{title}</p>
      <p style={{ color: "#94A3B8", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{desc}</p>
    </div>
  );
}

// ── Page hero ─────────────────────────────────────────────────────────────────
export function PageHero({
  eyebrow,
  headingId,
  heading,
  sub,
  children,
  gradient,
}: {
  eyebrow: string;
  headingId: string;
  heading: string;
  sub: string;
  children?: React.ReactNode;
  gradient?: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      style={{ position: "relative", overflow: "hidden" }}
    >
      <div aria-hidden style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: gradient ?? "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,120,212,0.1) 0%, transparent 70%)",
      }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "64px 24px 48px" }}>
        <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
          {eyebrow}
        </p>
        <h1 id={headingId} style={{
          color: "white", ...GF,
          fontSize: "clamp(28px, 4.5vw, 52px)",
          fontWeight: 800, lineHeight: 1.1, margin: 0, marginBottom: 16,
          letterSpacing: "-0.02em", maxWidth: 800,
        }}>
          {heading}
        </h1>
        <p style={{ color: "#94a3b8", ...GF, fontSize: "clamp(15px, 2vw, 18px)", lineHeight: 1.65, margin: 0, marginBottom: children ? 32 : 0, maxWidth: 640 }}>
          {sub}
        </p>
        {children}
      </div>
    </section>
  );
}

// ── Availability badge ────────────────────────────────────────────────────────
export function AvailBadge({ tier }: { tier: "Core" | "Advanced" | "Enterprise" | "Planned" }) {
  const configs = {
    Core:       { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)",  color: "#22C55E", label: "Available" },
    Advanced:   { bg: "rgba(0,120,212,0.1)",  border: "rgba(0,120,212,0.3)",  color: "#38bdf8", label: "Plan dependent" },
    Enterprise: { bg: "rgba(201,150,12,0.1)", border: "rgba(201,150,12,0.3)", color: "#C9960C", label: "Enterprise" },
    Planned:    { bg: "rgba(100,116,139,0.1)",border: "rgba(100,116,139,0.3)",color: "#94a3b8", label: "Planned" },
  };
  const c = configs[tier];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.color, borderRadius: 999,
      padding: "2px 8px", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      flexShrink: 0,
    }}>
      {c.label}
    </span>
  );
}

// ── Page shell with sub-nav ───────────────────────────────────────────────────
export function EsigPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EsigSubNav />
      {children}
    </>
  );
}
