// The canonical layout primitives for the public site.
//
// WHY THIS EXISTS. Four modules had each grown their own copy of the same three
// things — a page section, a section heading, and an FAQ accordion:
//
//   EsigPageShell    PageSection    SectionHeading    (43 pages)
//   PricingComponents  PricingSection   PricingHeading   FaqAccordion  (8 pages)
//   ResourceComponents ResourcesSection ResourcesHeading FaqAccordion  (11 pages)
//   EnotaryComponents  EnotarySection   EnotaryHeading                 (5 pages)
//
// The three headings were character-identical. The two FAQ accordions were
// character-identical. The four sections differed only in numbers that had
// drifted apart rather than been chosen: 72 / 64 / 64 / 56 padding, 0.02 /
// 0.02 / 0.02 / 0.015 tint, 0.06 / 0.06 / 0.06 / 0.05 border.
//
// Each module keeps its own exported names and delegates here, so no page had
// to change. What that buys is that the next spacing decision is made once.

import { useState } from "react";
import type { ReactNode } from "react";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

/**
 * Vertical rhythm for a public section.
 *
 * Two values, not four. `default` is what 43 of the 67 public pages already
 * used; `compact` exists because the eNotary pages are genuinely denser. The
 * 64px that Pricing and Resources had was drift, not a decision, and those
 * pages now sit on `default`.
 */
export type SectionDensity = "default" | "compact";

const DENSITY: Record<SectionDensity, { padding: string; tint: string; border: string }> = {
  default: { padding: "72px 24px", tint: "rgba(255,255,255,0.02)",  border: "rgba(255,255,255,0.06)" },
  compact: { padding: "56px 24px", tint: "rgba(255,255,255,0.015)", border: "rgba(255,255,255,0.05)" },
};

export interface PublicSectionProps {
  id?: string;
  children: ReactNode;
  /** Adds the faint raised tint that separates alternating bands. */
  light?: boolean;
  /** Adds hairline rules above and below. */
  bordered?: boolean;
  density?: SectionDensity;
}

export function PublicSection({
  id, children, light, bordered, density = "default",
}: PublicSectionProps) {
  const d = DENSITY[density];
  return (
    <section
      id={id}
      style={{
        background: light ? d.tint : "transparent",
        borderTop: bordered ? `1px solid ${d.border}` : undefined,
        borderBottom: bordered ? `1px solid ${d.border}` : undefined,
      }}
    >
      {/* Content max-width is a token concern, not a per-section one. */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: d.padding }}>
        {children}
      </div>
    </section>
  );
}

export interface PublicHeadingProps {
  /** Short category label above the heading. Rendered uppercase. */
  eyebrow: string;
  /** Must match the `aria-labelledby` on the owning section. */
  id: string;
  heading: string;
  sub?: string;
  center?: boolean;
}

export function PublicHeading({ eyebrow, id, heading, sub, center }: PublicHeadingProps) {
  return (
    <div style={{ marginBottom: 40, textAlign: center ? "center" : undefined }}>
      <p style={{
        color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10,
      }}>
        {eyebrow}
      </p>
      <h2 id={id} style={{
        color: "white", ...GF, fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 800,
        margin: 0, marginBottom: sub ? 12 : 0, letterSpacing: "-0.02em", lineHeight: 1.15,
      }}>
        {heading}
      </h2>
      {sub && (
        <p style={{
          color: "#94A3B8", ...GF, fontSize: 16, lineHeight: 1.65,
          margin: center ? "0 auto" : 0, maxWidth: 640,
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export interface FaqItem { id: string; q: string; a: string }

/**
 * Single-open FAQ accordion.
 *
 * The disclosure state lives on a real <button> with `aria-expanded` and
 * `aria-controls`, and the answer is hidden with the `hidden` attribute rather
 * than height, so a closed answer is out of the accessibility tree and out of
 * the tab order instead of merely invisible.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map(({ id, q, a }) => {
        const isOpen = open === id;
        return (
          <div key={id} id={id} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`${id}-answer`}
              onClick={() => setOpen(isOpen ? null : id)}
              style={{
                width: "100%", textAlign: "left", background: "none", border: "none",
                cursor: "pointer", padding: "16px 20px", minHeight: 44,
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
              }}
            >
              <span style={{ color: "white", ...GF, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                {q}
              </span>
              <span aria-hidden style={{
                color: "#94A3B8", flexShrink: 0, fontSize: 14,
                transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none",
                display: "inline-block",
              }}>
                ▾
              </span>
            </button>
            <div id={`${id}-answer`} hidden={!isOpen} style={{ padding: isOpen ? "0 20px 16px" : "0 20px 0" }}>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0 }}>{a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
