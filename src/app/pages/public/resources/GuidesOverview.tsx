import { Link } from "react-router";
import {
  ResourcesPageShell, ResourcesSection, ResourcesHeading, ResourceCard,
} from "../../../components/resources/ResourceComponents";
import { RESOURCE_CARDS, GUIDE_CATEGORIES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function GuidesOverview() {
  return (
    <ResourcesPageShell>
      <section style={{ padding: "64px 24px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ color: "#0078D4", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>GUIDES</p>
          <h1 style={{ color: "#07111F", ...GF, fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            LAGDA product guides.
          </h1>
          <p style={{ color: "#64748B", ...GF, fontSize: 16, lineHeight: 1.65 }}>
            Practical guidance on using LAGDA eSignature — from preparing documents to verifying completed transactions and managing your workspace.
          </p>
        </div>
      </section>

      <ResourcesSection id="featured">
        <ResourcesHeading eyebrow="Guides" id="guides-h2" heading="Available guides." />
        <div style={{ display: "grid", gap: 16 }} className="guides-main">
          {RESOURCE_CARDS.filter(c => c.category === "Guide").map(card => <ResourceCard key={card.path} {...card} />)}
        </div>
        <style>{`.guides-main { grid-template-columns: repeat(3, 1fr); } @media (max-width: 800px) { .guides-main { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 520px) { .guides-main { grid-template-columns: 1fr; } }`}</style>
      </ResourcesSection>

      <ResourcesSection id="by-category" light bordered>
        <ResourcesHeading eyebrow="Browse" id="browse-h2" heading="Browse by topic." />
        <div style={{ display: "grid", gap: 28 }} className="browse-grid">
          {GUIDE_CATEGORIES.map(cat => (
            <div key={cat.id}>
              <p style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>{cat.label.toUpperCase()}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {cat.guides.map(g => (
                  <Link key={g.path} to={g.path} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 8, textDecoration: "none",
                    background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)",
                    transition: "border-color 0.15s ease",
                  }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,120,212,0.3)"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.08)"}
                  >
                    <span style={{ color: "#334155", ...GF, fontSize: 13 }}>{g.title}</span>
                    <span style={{ color: "#94A3B8", fontSize: 12 }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <style>{`.browse-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 640px) { .browse-grid { grid-template-columns: 1fr; } }`}</style>
      </ResourcesSection>

      <ResourcesSection id="product-pages">
        <ResourcesHeading eyebrow="Product documentation" id="prod-h2" heading="Feature pages." sub="Detailed product documentation for each LAGDA eSignature capability." />
        <div style={{ display: "grid", gap: 10, maxWidth: 720 }} className="prod-grid">
          {[
            { label: "Document Preparation",    path: "/features/document-preparation" },
            { label: "Participant Roles",        path: "/features/participant-roles" },
            { label: "Parallel Signing",         path: "/features/parallel-signing" },
            { label: "Sequential Signing",       path: "/features/sequential-signing" },
            { label: "Signer Authentication",    path: "/features/signer-authentication" },
            { label: "Audit Trail",              path: "/features/audit-trail" },
            { label: "Document Verification",    path: "/features/document-verification" },
            { label: "Templates",                path: "/features/templates" },
            { label: "Team Workspaces",          path: "/features/team-workspaces" },
            { label: "API and Integrations",     path: "/features/api-and-integrations" },
          ].map(({ label, path }) => (
            <Link key={path} to={path} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 8, textDecoration: "none",
              background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)",
            }}>
              <span style={{ color: "#334155", ...GF, fontSize: 13 }}>{label}</span>
              <span style={{ color: "#94A3B8", fontSize: 12 }}>→</span>
            </Link>
          ))}
        </div>
        <style>{`.prod-grid { grid-template-columns: 1fr; }`}</style>
      </ResourcesSection>
    </ResourcesPageShell>
  );
}
