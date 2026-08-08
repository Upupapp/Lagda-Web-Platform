import { Link } from "react-router";
import {
  ResourcesPageShell, ResourcesSection, ResourcesHeading, ResourceCard, EduDisclaimer,
} from "../../../components/resources/ResourceComponents";
import { RESOURCE_CARDS, GUIDE_CATEGORIES, EDU_DISCLAIMER } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function ResourcesOverview() {
  return (
    <ResourcesPageShell>
      <section style={{ padding: "72px 24px 56px", background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(56,189,248,0.07) 0%, transparent 70%)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>LAGDA RESOURCES</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(28px, 5vw, 50px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 18px" }}>
            Guides and resources for secure digital document workflows.
          </h1>
          <p style={{ color: "#94A3B8", ...GF, fontSize: 17, lineHeight: 1.65 }}>
            Product guides, verification and security resources, legal framework context, and support information for LAGDA eSignature.
          </p>
        </div>
      </section>

      {/* Featured resource cards */}
      <ResourcesSection id="resources">
        <ResourcesHeading eyebrow="Resources" id="res-h2" heading="Guides and reference materials." />
        <div style={{ display: "grid", gap: 16 }} className="res-grid">
          {RESOURCE_CARDS.map((card) => <ResourceCard key={card.path} {...card} />)}
        </div>
        <style>{`.res-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 900px) { .res-grid { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 580px) { .res-grid { grid-template-columns: 1fr; } }`}</style>
      </ResourcesSection>

      {/* Guide library */}
      <ResourcesSection id="guide-library" light bordered>
        <ResourcesHeading eyebrow="Guide library" id="lib-h2" heading="Find resources by category." />
        <div style={{ display: "grid", gap: 24 }} className="lib-grid">
          {GUIDE_CATEGORIES.map(cat => (
            <div key={cat.id}>
              <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>{cat.label.toUpperCase()}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {cat.guides.map(g => (
                  <Link key={g.path} to={g.path} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    padding: "10px 14px", borderRadius: 8, textDecoration: "none",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    transition: "border-color 0.15s ease",
                  }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,120,212,0.3)"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.06)"}
                  >
                    <span style={{ color: "#94a3b8", ...GF, fontSize: 13, fontWeight: g.available ? 500 : 400 }}>{g.title}</span>
                    <span style={{ color: "#7C8DA4", fontSize: 12, flexShrink: 0 }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <style>{`.lib-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 640px) { .lib-grid { grid-template-columns: 1fr; } }`}</style>
      </ResourcesSection>

      {/* Help + Contact + Service Status */}
      <ResourcesSection id="help-contact">
        <ResourcesHeading eyebrow="Support" id="supp-h2" heading="Help, contact, and service information." />
        <div style={{ display: "grid", gap: 16 }} className="supp-grid">
          {[
            { icon: "❓", title: "Help Center", desc: "Browse guides and common product questions by topic.", path: "/help", cta: "Go to Help Center" },
            { icon: "✉️", title: "Contact", desc: "Reach our team with sales, product, or support questions.", path: "/contact", cta: "Contact LAGDA" },
            { icon: "📡", title: "Service Status", desc: "View current platform status. Demonstration data — not connected to production monitoring.", path: "/service-status", cta: "View Status" },
          ].map(({ icon, title, desc, path, cta }) => (
            <div key={path} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
              <span aria-hidden style={{ fontSize: 24 }}>{icon}</span>
              <p style={{ color: "white", ...GF, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</p>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5, flex: 1 }}>{desc}</p>
              <Link to={path} style={{ color: "#38bdf8", ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>{cta} →</Link>
            </div>
          ))}
        </div>
        <style>{`.supp-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 700px) { .supp-grid { grid-template-columns: 1fr; } }`}</style>
      </ResourcesSection>

      {/* Legal context */}
      <ResourcesSection id="legal-context" light bordered>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <ResourcesHeading eyebrow="Legal and policy" id="legal-h2" heading="Privacy, terms, and legal information." />
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { title: "Legal Framework",   desc: "Educational overview of electronic signature concepts, attribution, records, and formality considerations.", path: "/resources/legal-framework" },
              { title: "Privacy Policy",    desc: "How LAGDA handles personal and organizational data.", path: "/legal/privacy" },
              { title: "Terms of Service",  desc: "The terms governing use of LAGDA eSignature.", path: "/legal/terms" },
              { title: "Accessibility",     desc: "LAGDA's commitment to accessible digital experiences.", path: "/legal/accessibility" },
            ].map(({ title, desc, path }) => (
              <Link key={path} to={path} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "14px 18px", borderRadius: 10, textDecoration: "none",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div>
                  <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 600, margin: "0 0 3px" }}>{title}</p>
                  <p style={{ color: "#94A3B8", ...GF, fontSize: 12, margin: 0 }}>{desc}</p>
                </div>
                <span style={{ color: "#8A9BAE", fontSize: 14, flexShrink: 0 }}>→</span>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <EduDisclaimer />
          </div>
        </div>
      </ResourcesSection>
    </ResourcesPageShell>
  );
}
