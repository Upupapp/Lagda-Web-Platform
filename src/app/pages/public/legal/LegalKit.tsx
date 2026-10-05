// The pieces the legal pages are built from: one shell, numbered sections, a
// table of contents, and the review notice.
//
// ── No review notice, no draft label ────────────────────────────────────────
//
// The pages used to carry an "Under legal review" notice and a "(draft)"
// version. The owner had both removed on 5 October 2026: they read as
// Version 1.0.

import type { CSSProperties, ReactNode } from "react";
import { ON_LIGHT } from "../../../utils/on-light";
import { Link } from "react-router";

export const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
export const GM: CSSProperties = { fontFamily: "'Geist Mono', monospace" };

const NAVY = "#07111F";
const INK = "#334155";
const SLATE = ON_LIGHT.slate;
const AZURE = ON_LIGHT.azure;

export const COMPANY = "UpUp Technologies";

export interface LegalMeta {
  /** "Privacy Policy" */
  readonly title: string;
  /** "1.0" */
  readonly version: string;
  /** "5 October 2026" */
  readonly date: string;
  /** One or two sentences under the title. */
  readonly summary: string;
}

export interface TocEntry { readonly id: string; readonly title: string }

export function LegalShell({ meta, toc, children }: { meta: LegalMeta; toc: readonly TocEntry[]; children: ReactNode }) {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", color: NAVY, ...GF }}>
      <section style={{ padding: "64px 24px 40px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: AZURE, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>LEGAL</p>
          <h1 style={{ color: NAVY, ...GF, fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 12px" }}>{meta.title}</h1>
          <p style={{ color: SLATE, ...GF, fontSize: 15, margin: "0 0 14px" }}>{COMPANY} — the LAGDA platform</p>
          <p style={{ color: INK, ...GF, fontSize: 15, lineHeight: 1.7, margin: "0 0 16px", maxWidth: 680 }}>{meta.summary}</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: SLATE, ...GM, fontSize: 11, padding: "4px 9px", borderRadius: 4, background: "#F1F5F9", border: "1px solid #E2E8F0" }}>Version {meta.version}</span>
            <span style={{ color: SLATE, ...GM, fontSize: 11, padding: "4px 9px", borderRadius: 4, background: "#F1F5F9", border: "1px solid #E2E8F0" }}>Dated {meta.date}</span>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 80px" }}>
        <nav aria-label="Contents" style={{ margin: "28px 0 8px", padding: "16px 20px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10 }}>
          <p style={{ color: SLATE, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 10px" }}>CONTENTS</p>
          <ol style={{ margin: 0, padding: "0 0 0 20px", columns: 2, columnGap: 24 }}>
            {toc.map((entry, i) => (
              <li key={entry.id} style={{ ...GF, fontSize: 13, lineHeight: 1.7, color: INK, breakInside: "avoid" }}>
                <a href={`#${entry.id}`} style={{ color: AZURE, textDecoration: "underline" }}>{i + 1}. {entry.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        {children}
        <div style={{ marginTop: 40, padding: "16px 20px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10 }}>
          <p style={{ color: SLATE, ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            Questions about this document can be sent through the <Link to="/contact?topic=privacy" style={{ color: AZURE, textDecoration: "underline" }}>Contact page</Link>.
            The <Link to="/legal/privacy" style={{ color: AZURE, textDecoration: "underline" }}>Privacy Policy</Link>, <Link to="/legal/terms" style={{ color: AZURE, textDecoration: "underline" }}>Terms of Service</Link> and <Link to="/legal/accessibility" style={{ color: AZURE, textDecoration: "underline" }}>Accessibility Statement</Link> are published together.
          </p>
        </div>
      </div>
      <style>{`
        @media (max-width: 560px) { nav[aria-label="Contents"] ol { columns: 1; } }
        .legal-body a { color: ${AZURE}; text-decoration: underline; text-underline-offset: 2px; }
      `}</style>
    </div>
  );
}

let sectionNumber = 0;
/** Reset at the top of each page's render so numbering starts at 1. */
export function resetSections() { sectionNumber = 0; }

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  sectionNumber += 1;
  return (
    <section id={id} className="legal-body" style={{ paddingTop: 32, paddingBottom: 8, borderTop: "1px solid rgba(0,0,0,0.07)", marginTop: 28 }}>
      <h2 style={{ color: NAVY, ...GF, fontSize: "clamp(17px, 2.5vw, 22px)", fontWeight: 800, margin: "0 0 14px" }}>{sectionNumber}. {title}</h2>
      {children}
    </section>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 style={{ color: NAVY, ...GF, fontSize: 15.5, fontWeight: 700, margin: "20px 0 8px" }}>{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p style={{ color: INK, ...GF, fontSize: 15, lineHeight: 1.75, margin: "0 0 14px" }}>{children}</p>;
}

export function UL({ items }: { items: readonly ReactNode[] }) {
  return (
    <ul style={{ padding: "0 0 0 22px", margin: "0 0 14px" }}>
      {items.map((item, i) => <li key={i} style={{ color: INK, ...GF, fontSize: 14.5, lineHeight: 1.7, marginBottom: 5 }}>{item}</li>)}
    </ul>
  );
}

/** A two-column fact table: label on the left, value on the right. */
export function Facts({ rows, caption }: { rows: readonly (readonly [string, ReactNode])[]; caption: string }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", margin: "4px 0 18px", fontSize: 14, ...GF }}>
      <caption style={{ textAlign: "left", color: SLATE, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", padding: "0 0 8px" }}>{caption.toUpperCase()}</caption>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} style={{ borderTop: "1px solid #E2E8F0" }}>
            <th scope="row" style={{ textAlign: "left", verticalAlign: "top", color: NAVY, fontWeight: 600, padding: "9px 12px 9px 0", width: "38%" }}>{label}</th>
            <td style={{ verticalAlign: "top", color: INK, padding: "9px 0", lineHeight: 1.6 }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Something the reader should notice: a plain-words summary of a clause. */
export function Plain({ children }: { children: ReactNode }) {
  return (
    <div style={{ margin: "0 0 16px", padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8 }}>
      <p style={{ color: "#1E3A5F", ...GF, fontSize: 13.5, lineHeight: 1.6, margin: 0 }}><strong>In plain words:</strong> {children}</p>
    </div>
  );
}
