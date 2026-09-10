import { Link } from "react-router";
import { EsigSubNav } from "./EsigSubNav";
import {
  LEGAL_NOTE,
  ENOTARY_NOTE,
} from "../../pages/public/esignature/content";
import { PublicSection, PublicHeading } from "../public/PublicKit";
import type {
  PublicSectionProps,
  PublicHeadingProps,
} from "../public/PublicKit";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Reusable section container ────────────────────────────────────────────────
// Section and heading are the shared public primitives. Kept exported under
// their original names so the 43 pages importing them did not have to change.
export function PageSection(props: PublicSectionProps) {
  return <PublicSection {...props} />;
}

export function SectionHeading(props: PublicHeadingProps) {
  return <PublicHeading {...props} />;
}

// ── Related pages nav ─────────────────────────────────────────────────────────
export function RelatedPages({
  links,
}: {
  links: { label: string; desc: string; path: string }[];
}) {
  return (
    <section
      style={{ borderTop: "1px solid rgba(0,0,0,0.07)", background: "#f8fafb" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <p
          style={{
            color: "#64748B",
            ...GM,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            marginBottom: 20,
          }}
        >
          EXPLORE MORE
        </p>
        <div style={{ display: "grid", gap: 12 }} className="related-grid">
          {links.map((l) => (
            <Link key={l.path} to={l.path} style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow:
                    "0 1px 4px rgba(7,17,31,0.07), 0 0 1px rgba(7,17,31,0.04)",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "rgba(0,120,212,0.35)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 4px 16px rgba(7,17,31,0.10), 0 1px 4px rgba(7,17,31,0.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 1px 4px rgba(7,17,31,0.07), 0 0 1px rgba(7,17,31,0.04)";
                }}
              >
                <div>
                  <p
                    style={{
                      color: "#07111F",
                      ...GF,
                      fontSize: 14,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {l.label}
                  </p>
                  <p
                    style={{
                      color: "#64748B",
                      ...GF,
                      fontSize: 13,
                      margin: 0,
                      marginTop: 2,
                    }}
                  >
                    {l.desc}
                  </p>
                </div>
                <span
                  style={{
                    color: "#0078D4",
                    ...GF,
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  →
                </span>
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
    <section
      style={{
        borderTop: "1px solid rgba(0,0,0,0.07)",
        background: "rgba(0,120,212,0.04)",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "64px 24px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#07111F",
            ...GF,
            fontSize: "clamp(22px, 3.5vw, 34px)",
            fontWeight: 800,
            margin: 0,
            marginBottom: sub ? 12 : 24,
            letterSpacing: "-0.02em",
          }}
        >
          {heading}
        </h2>
        {sub && (
          <p
            style={{
              color: "#64748B",
              ...GF,
              fontSize: 16,
              lineHeight: 1.65,
              margin: "0 auto 24px",
              maxWidth: 520,
            }}
          >
            {sub}
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            to={primaryPath}
            style={{
              background: "#0B3A82",
              color: "white",
              padding: "13px 28px",
              borderRadius: 12,
              ...GF,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              boxShadow: "0 4px 16px rgba(0,120,212,0.3)",
              transition: "filter 0.15s ease, transform 0.15s ease",
              minHeight: 44,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = "brightness(1.1)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "";
              e.currentTarget.style.transform = "";
            }}
          >
            {primaryLabel}
          </Link>
          {secondaryLabel && secondaryPath && (
            <Link
              to={secondaryPath}
              style={{
                background: "#ffffff",
                color: "#07111F",
                border: "1px solid rgba(0,0,0,0.12)",
                padding: "13px 24px",
                borderRadius: 12,
                ...GF,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                transition: "background 0.15s ease, border-color 0.15s ease",
                minHeight: 44,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafb";
                e.currentTarget.style.borderColor = "rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)";
              }}
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
    <div
      style={{
        background: "#f8fafb",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        padding: "20px 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p
          style={{
            color: "#64748B",
            ...GF,
            fontSize: 12,
            lineHeight: 1.6,
            margin: 0,
            marginBottom: showEnotary ? 8 : 0,
          }}
        >
          {LEGAL_NOTE}
        </p>
        {showEnotary && (
          <p
            style={{
              color: "#94A3B8",
              ...GF,
              fontSize: 12,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {ENOTARY_NOTE}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
export function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 14,
        padding: "20px 20px 18px",
        boxShadow: "0 1px 4px rgba(7,17,31,0.07), 0 0 1px rgba(7,17,31,0.04)",
      }}
    >
      <span
        aria-hidden="true"
        style={{ fontSize: 24, display: "block", marginBottom: 12 }}
      >
        {icon}
      </span>
      <p
        style={{
          color: "#07111F",
          ...GF,
          fontSize: 14,
          fontWeight: 700,
          margin: 0,
          marginBottom: 6,
        }}
      >
        {title}
      </p>
      <p
        style={{
          color: "#64748B",
          ...GF,
          fontSize: 13,
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {desc}
      </p>
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
  visual,
}: {
  eyebrow: string;
  headingId: string;
  heading: string;
  sub: string;
  children?: React.ReactNode;
  gradient?: string;
  // Optional right-column visual (e.g. an interactive logo/mockup). When
  // present the hero becomes a two-column layout on desktop and stacks the
  // visual below the copy on narrow screens; omitted, the hero is unchanged
  // single-column text as every other page already renders it.
  visual?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={headingId}
      style={{ position: "relative", overflow: "hidden" }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            gradient ??
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,120,212,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        className={visual ? "esig-hero-grid" : undefined}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "64px 24px 48px",
          ...(visual
            ? { display: "grid", gridTemplateColumns: "1fr auto", gap: "40px 56px", alignItems: "center" }
            : {}),
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              color: "#0078D4",
              ...GM,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {eyebrow}
          </p>
          <h1
            id={headingId}
            style={{
              color: "#07111F",
              ...GF,
              fontSize: "clamp(28px, 4.5vw, 52px)",
              fontWeight: 800,
              lineHeight: 1.1,
              margin: 0,
              marginBottom: 16,
              letterSpacing: "-0.02em",
              maxWidth: 800,
            }}
          >
            {heading}
          </h1>
          <p
            style={{
              color: "#64748B",
              ...GF,
              fontSize: "clamp(15px, 2vw, 18px)",
              lineHeight: 1.65,
              margin: 0,
              marginBottom: children ? 32 : 0,
              maxWidth: 640,
            }}
          >
            {sub}
          </p>
          {children}
        </div>
        {visual && (
          <div className="esig-hero-visual" style={{ flexShrink: 0 }}>
            {visual}
          </div>
        )}
      </div>
      {visual && (
        <style>{`
          @media (max-width: 860px) {
            .esig-hero-grid { grid-template-columns: 1fr !important; }
            .esig-hero-visual { justify-self: center; }
          }
        `}</style>
      )}
    </section>
  );
}

// ── Availability badge ────────────────────────────────────────────────────────
export function AvailBadge({
  tier,
}: {
  tier: "Core" | "Advanced" | "Enterprise" | "Planned";
}) {
  const configs = {
    Core: {
      bg: "rgba(34,197,94,0.1)",
      border: "rgba(34,197,94,0.3)",
      color: "#178A4C",
      label: "Available",
    },
    Advanced: {
      bg: "rgba(0,120,212,0.1)",
      border: "rgba(0,120,212,0.3)",
      color: "#0078D4",
      label: "Plan dependent",
    },
    Enterprise: {
      bg: "rgba(201,150,12,0.1)",
      border: "rgba(201,150,12,0.3)",
      color: "#9A7208",
      label: "Enterprise",
    },
    Planned: {
      bg: "rgba(100,116,139,0.1)",
      border: "rgba(100,116,139,0.3)",
      color: "#64748B",
      label: "Planned",
    },
  };
  const c = configs[tier];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        borderRadius: 999,
        padding: "2px 8px",
        ...GM,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        flexShrink: 0,
      }}
    >
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
