import { useState } from "react";
import { Link } from "react-router";
import {
  ResourcesPageShell, ResourcesSection, ResourcesHeading,
} from "../../../components/resources/ResourceComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const HELP_ARTICLES = [
  { id: "getting-started-1", category: "Getting Started", title: "Preparing your first document", tags: ["document", "prepare", "upload", "start"], path: "/resources/guides" },
  { id: "getting-started-2", category: "Getting Started", title: "Adding participants to a transaction", tags: ["participants", "signer", "add", "recipient"], path: "/features/participant-roles" },
  { id: "getting-started-3", category: "Getting Started", title: "Sending a document for signing", tags: ["send", "signing", "workflow"], path: "/resources/guides" },
  { id: "auth-1", category: "Authentication", title: "Choosing a signer authentication method", tags: ["authentication", "otp", "sms", "verify", "security"], path: "/resources/authentication-guide" },
  { id: "auth-2", category: "Authentication", title: "Setting up email OTP for signers", tags: ["email", "otp", "code", "authentication"], path: "/features/signer-authentication" },
  { id: "templates-1", category: "Templates", title: "Creating a reusable template", tags: ["template", "reuse", "workflow", "save"], path: "/resources/templates-guide" },
  { id: "templates-2", category: "Templates", title: "Sharing templates with your team", tags: ["shared", "template", "team", "workspace"], path: "/pricing/templates-by-plan" },
  { id: "verification-1", category: "Verification", title: "Verifying a completed document", tags: ["verify", "verification id", "qr", "check", "document"], path: "/resources/document-verification-guide" },
  { id: "verification-2", category: "Verification", title: "Reading verification result states", tags: ["verified", "mismatch", "result", "status"], path: "/resources/document-verification-guide" },
  { id: "account-1", category: "Account", title: "Managing account security and MFA", tags: ["account", "mfa", "password", "security", "login"], path: "/security/account-security" },
  { id: "plans-1", category: "Plans and Billing", title: "Understanding your plan and limits", tags: ["plan", "limit", "signing requests", "usage", "billing"], path: "/pricing" },
  { id: "plans-2", category: "Plans and Billing", title: "Comparing plans", tags: ["compare", "plans", "features", "difference"], path: "/pricing/compare" },
  { id: "workspace-1", category: "Teams and Workspace", title: "Inviting team members to your workspace", tags: ["team", "workspace", "invite", "member", "sender"], path: "/features/team-workspaces" },
  { id: "legal-1", category: "Legal and Compliance", title: "Which documents are appropriate for eSignature", tags: ["legal", "document", "appropriate", "notarization", "formality"], path: "/resources/legal-framework" },
  { id: "enotary-1", category: "LAGDA eNotary", title: "What is LAGDA eNotary?", tags: ["enotary", "notary", "notarization", "coming soon", "accreditation"], path: "/enotary" },
];

const CATEGORIES = ["Getting Started", "Authentication", "Templates", "Verification", "Account", "Plans and Billing", "Teams and Workspace", "Legal and Compliance", "LAGDA eNotary"];

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = HELP_ARTICLES.filter(article => {
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    const q = query.toLowerCase().trim();
    const matchesQuery = !q || article.title.toLowerCase().includes(q) || article.tags.some(t => t.includes(q));
    return matchesCategory && matchesQuery;
  });

  return (
    <ResourcesPageShell>
      <section style={{ padding: "64px 24px 48px", background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(0,120,212,0.06) 0%, transparent 70%)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#0078D4", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>HELP CENTER</p>
          <h1 style={{ color: "#07111F", ...GF, fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 24px" }}>How can we help?</h1>
          {/* Search */}
          <div style={{ position: "relative", maxWidth: 480, margin: "0 auto" }}>
            <label htmlFor="help-search" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Search help articles</label>
            <input
              id="help-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help articles…"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#ffffff", border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10, padding: "13px 18px", color: "#07111F", ...GF, fontSize: 15,
                outline: "none",
              }}
              onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = "#0078D4"}
              onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = "rgba(0,0,0,0.14)"}
              autoComplete="off"
              aria-label="Search help articles"
            />
          </div>
        </div>
      </section>

      <ResourcesSection id="results">
        {/* Category filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }} role="group" aria-label="Filter by category">
          <button
            onClick={() => setSelectedCategory(null)}
            aria-pressed={!selectedCategory}
            style={{ background: !selectedCategory ? "#0078D4" : "#ffffff", color: !selectedCategory ? "white" : "#64748B", border: "1px solid " + (!selectedCategory ? "#0078D4" : "rgba(0,0,0,0.12)"), borderRadius: 6, padding: "6px 14px", cursor: "pointer", ...GF, fontSize: 12, fontWeight: 600, minHeight: 32 }}
          >All</button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              aria-pressed={selectedCategory === cat}
              style={{ background: selectedCategory === cat ? "rgba(0,120,212,0.1)" : "#ffffff", color: selectedCategory === cat ? "#0078D4" : "#64748B", border: "1px solid " + (selectedCategory === cat ? "rgba(0,120,212,0.3)" : "rgba(0,0,0,0.12)"), borderRadius: 6, padding: "6px 14px", cursor: "pointer", ...GF, fontSize: 12, fontWeight: 500, minHeight: 32, whiteSpace: "nowrap" }}
            >{cat}</button>
          ))}
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ color: "#64748B", ...GF, fontSize: 16, fontWeight: 600 }}>No articles found for "{query}"</p>
            <p style={{ color: "#64748B", ...GF, fontSize: 13 }}>Try a different search term or <Link to="/contact" style={{ color: "#0078D4", textDecoration: "none" }}>contact our team</Link>.</p>
          </div>
        ) : (
          <div>
            <p style={{ color: "#64748B", ...GM, fontSize: 10, marginBottom: 16 }}>{filtered.length} ARTICLE{filtered.length !== 1 ? "S" : ""}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {filtered.map(({ id, category, title, path }) => (
                <Link key={id} to={path} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  padding: "13px 18px", borderRadius: 9, textDecoration: "none",
                  background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)",
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,120,212,0.3)"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,120,212,0.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.08)"; (e.currentTarget as HTMLAnchorElement).style.background = "#ffffff"; }}
                >
                  <div>
                    <span style={{ color: "#0078D4", ...GM, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 3 }}>{category.toUpperCase()}</span>
                    <span style={{ color: "#07111F", ...GF, fontSize: 14, fontWeight: 500 }}>{title}</span>
                  </div>
                  <span style={{ color: "#94A3B8", fontSize: 14, flexShrink: 0 }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </ResourcesSection>

      <ResourcesSection id="contact-support" light bordered>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#0078D4", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>STILL NEED HELP?</p>
          <h2 style={{ color: "#07111F", ...GF, fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Contact our team.</h2>
          <p style={{ color: "#64748B", ...GF, fontSize: 15, lineHeight: 1.65, marginBottom: 24 }}>Our team can help with sales, product questions, and support inquiries.</p>
          <Link to="/contact" style={{ background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Contact Support</Link>
        </div>
      </ResourcesSection>
    </ResourcesPageShell>
  );
}
