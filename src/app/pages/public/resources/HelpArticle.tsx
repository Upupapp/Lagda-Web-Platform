// One Help Center article: numbered steps for one task, read from
// content/help-articles.ts. An unknown slug shows the "not found" state
// inside the Help Center shell, with the way back, rather than a bare 404.

import { ON_LIGHT } from "../../../utils/on-light";
import { Link, useParams } from "react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ResourcesPageShell, ResourcesSection } from "../../../components/resources/ResourceComponents";
import { HELP_ARTICLES, findHelpArticle, helpArticlePath } from "../../../content/help-articles";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const NAVY = "#07111F";
const INK = "#334155";
const SLATE = ON_LIGHT.slate;
const AZURE = ON_LIGHT.azure;

export function HelpArticle() {
  const { slug = "" } = useParams();
  const article = findHelpArticle(slug);

  if (article === undefined) {
    return (
      <ResourcesPageShell>
        <ResourcesSection id="help-article-missing">
          <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "40px 0" }}>
            <p style={{ color: AZURE, ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>HELP CENTER</p>
            <h1 style={{ color: NAVY, ...GF, fontSize: 28, fontWeight: 800, margin: "0 0 12px" }}>There is no article at this address</h1>
            <p style={{ color: SLATE, ...GF, fontSize: 15, lineHeight: 1.65, margin: "0 0 20px" }}>It may have been renamed. The Help Center lists every article.</p>
            <Link to="/help" style={{ color: AZURE, ...GF, fontSize: 14, fontWeight: 600, textDecoration: "underline" }}>Go to the Help Center →</Link>
          </div>
        </ResourcesSection>
      </ResourcesPageShell>
    );
  }

  const sameCategory = HELP_ARTICLES.filter(a => a.category === article.category && a.slug !== article.slug);

  return (
    <ResourcesPageShell>
      <section style={{ padding: "48px 24px 32px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <nav aria-label="Breadcrumb" style={{ marginBottom: 18 }}>
            <Link to="/help" style={{ color: AZURE, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={14} aria-hidden /> Help Center
            </Link>
          </nav>
          <p style={{ color: AZURE, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{article.category}</p>
          <h1 style={{ color: NAVY, ...GF, fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 12px" }}>{article.title}</h1>
          <p style={{ color: INK, ...GF, fontSize: 16, lineHeight: 1.65, margin: 0, maxWidth: 640 }}>{article.summary}</p>
        </div>
      </section>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 24px 72px" }}>
        {article.before !== undefined && (
          <div style={{ margin: "28px 0 0", padding: "14px 18px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10 }}>
            <p style={{ color: SLATE, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 8px" }}>BEFORE YOU START</p>
            <ul style={{ margin: 0, padding: "0 0 0 20px" }}>
              {article.before.map(item => <li key={item} style={{ color: INK, ...GF, fontSize: 14, lineHeight: 1.65, marginBottom: 3 }}>{item}</li>)}
            </ul>
          </div>
        )}

        <h2 style={{ color: NAVY, ...GF, fontSize: 18, fontWeight: 800, margin: "32px 0 14px" }}>Steps</h2>
        <ol className="help-steps" style={{ margin: 0, padding: 0, listStyle: "none", counterReset: "step" }}>
          {article.steps.map((step, i) => (
            <li key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid #F1F5F9" }}>
              <span aria-hidden style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, background: AZURE, color: "#fff", ...GM, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              <p style={{ color: INK, ...GF, fontSize: 15, lineHeight: 1.7, margin: "3px 0 0" }}>
                <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Step {i + 1}. </span>{step}
              </p>
            </li>
          ))}
        </ol>

        {article.notes !== undefined && (
          <>
            <h2 style={{ color: NAVY, ...GF, fontSize: 18, fontWeight: 800, margin: "32px 0 12px" }}>Good to know</h2>
            <ul style={{ margin: 0, padding: "0 0 0 20px" }}>
              {article.notes.map(note => <li key={note} style={{ color: INK, ...GF, fontSize: 14.5, lineHeight: 1.7, marginBottom: 8 }}>{note}</li>)}
            </ul>
          </>
        )}

        {(article.related !== undefined || sameCategory.length > 0) && (
          <>
            <h2 style={{ color: NAVY, ...GF, fontSize: 18, fontWeight: 800, margin: "32px 0 12px" }}>Read next</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...(article.related ?? []), ...sameCategory.map(a => ({ label: a.title, to: helpArticlePath(a.slug) }))]
                .filter((link, i, all) => all.findIndex(l => l.to === link.to) === i)
                .map(link => (
                  <Link key={link.to} to={link.to} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 16px", borderRadius: 9, textDecoration: "none", background: "#fff", border: "1px solid rgba(0,0,0,0.08)", color: NAVY, ...GF, fontSize: 14, fontWeight: 500 }}>
                    <span>{link.label}</span>
                    <ChevronRight size={15} aria-hidden style={{ color: "#94A3B8", flexShrink: 0 }} />
                  </Link>
                ))}
            </div>
          </>
        )}

        <p style={{ color: SLATE, ...GF, fontSize: 13, lineHeight: 1.6, margin: "40px 0 0" }}>
          Still stuck? <Link to="/contact?topic=support" style={{ color: AZURE, textDecoration: "underline" }}>Contact our team</Link> and tell us which step you were on.
        </p>
      </div>
    </ResourcesPageShell>
  );
}
