import { useState } from "react";
import { Link } from "react-router";
import {
  ResourcesPageShell, ResourcesSection,
} from "../../../components/resources/ResourceComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// Help is not a separate article library: each entry names the topic and the
// existing guide or product page that covers it, so a visitor knows where the
// link leads before following it.
const HELP_ARTICLES = [
  { id: "getting-started-1", category: "Getting Started", title: "Guides for preparing and sending a document", page: "Guides", tags: ["document", "prepare", "upload", "start", "send", "signing", "workflow"], path: "/resources/guides" },
  { id: "getting-started-2", category: "Getting Started", title: "How participant roles work", page: "Participant Roles", tags: ["participants", "signer", "add", "recipient"], path: "/features/participant-roles" },
  { id: "getting-started-3", category: "Getting Started", title: "Frequently asked questions", page: "FAQ", tags: ["faq", "questions", "start"], path: "/resources/faq" },
  { id: "auth-1", category: "Authentication", title: "Choosing a signer authentication method", page: "Authentication Guide", tags: ["authentication", "otp", "verify", "security"], path: "/resources/authentication-guide" },
  { id: "auth-2", category: "Authentication", title: "Signer authentication options, including email codes", page: "Signer Authentication", tags: ["email", "otp", "code", "authentication"], path: "/features/signer-authentication" },
  { id: "templates-1", category: "Templates", title: "Creating and using templates", page: "Templates Guide", tags: ["template", "reuse", "workflow", "save"], path: "/resources/templates-guide" },
  { id: "templates-2", category: "Templates", title: "Which template features each plan includes", page: "Templates by Plan", tags: ["shared", "template", "team", "workspace"], path: "/pricing/templates-by-plan" },
  { id: "verification-1", category: "Verification", title: "Verifying a completed document and reading the result", page: "Document Verification Guide", tags: ["verify", "verification id", "qr", "check", "document", "verified", "mismatch", "result", "status"], path: "/resources/document-verification-guide" },
  { id: "verification-2", category: "Verification", title: "Check a Verification ID", page: "Verify a Document", tags: ["verify", "verification id", "check"], path: "/verify" },
  { id: "account-1", category: "Account", title: "Account security: passwords, two-step verification and sessions", page: "Account Security", tags: ["account", "mfa", "password", "security", "login"], path: "/security/account-security" },
  { id: "plans-1", category: "Plans and Billing", title: "Plans, prices and limits", page: "Pricing", tags: ["plan", "limit", "signing requests", "usage", "billing"], path: "/pricing" },
  { id: "plans-2", category: "Plans and Billing", title: "Compare plans side by side", page: "Compare Plans", tags: ["compare", "plans", "features", "difference"], path: "/pricing/compare" },
  { id: "workspace-1", category: "Teams and Workspace", title: "How team workspaces, members and roles work", page: "Team Workspaces", tags: ["team", "workspace", "invite", "member", "sender"], path: "/features/team-workspaces" },
  { id: "legal-1", category: "Legal and Compliance", title: "Which documents suit electronic signing", page: "Legal Framework", tags: ["legal", "document", "appropriate", "notarization", "formality"], path: "/resources/legal-framework" },
  { id: "enotary-1", category: "LAGDA eNotary", title: "About LAGDA eNotary", page: "LAGDA eNotary", tags: ["enotary", "notary", "notarization", "coming soon", "accreditation"], path: "/enotary" },
];

const CATEGORIES = ["Getting Started", "Authentication", "Templates", "Verification", "Account", "Plans and Billing", "Teams and Workspace", "Legal and Compliance", "LAGDA eNotary"];

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = HELP_ARTICLES.filter(article => {
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    const q = query.toLowerCase().trim();
    const matchesQuery = !q || article.title.toLowerCase().includes(q) || article.page.toLowerCase().includes(q) || article.tags.some(t => t.includes(q));
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
            <label htmlFor="help-search" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Search guides and pages</label>
            <input
              id="help-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides and pages…"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#ffffff", border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10, padding: "13px 18px", color: "#07111F", ...GF, fontSize: 15,
                outline: "none",
              }}
              onFocus={(e) => (e.target).style.borderColor = "#0078D4"}
              onBlur={(e) => (e.target).style.borderColor = "rgba(0,0,0,0.14)"}
              autoComplete="off"
              aria-label="Search guides and pages"
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
            <p style={{ color: "#64748B", ...GF, fontSize: 16, fontWeight: 600 }}>No guides or pages found for "{query}"</p>
            <p style={{ color: "#64748B", ...GF, fontSize: 13 }}>Try a different search term or <Link to="/contact" style={{ color: "#0078D4", textDecoration: "none" }}>contact our team</Link>.</p>
          </div>
        ) : (
          <div>
            <h2 style={{ color: "#07111F", ...GF, fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>Related guides and pages</h2>
            <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.55, margin: "0 0 12px" }}>Each topic opens the LAGDA guide or product page that covers it.</p>
            <p style={{ color: "#64748B", ...GM, fontSize: 10, marginBottom: 16 }}>{filtered.length} PAGE{filtered.length !== 1 ? "S" : ""}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {filtered.map(({ id, category, title, page, path }) => (
                <Link key={id} to={path} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  padding: "13px 18px", borderRadius: 9, textDecoration: "none",
                  background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)",
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
                  onMouseEnter={(e) => { (e.currentTarget).style.borderColor = "rgba(0,120,212,0.3)"; (e.currentTarget).style.background = "rgba(0,120,212,0.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget).style.borderColor = "rgba(0,0,0,0.08)"; (e.currentTarget).style.background = "#ffffff"; }}
                >
                  <div>
                    <span style={{ color: "#0078D4", ...GM, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 3 }}>{category.toUpperCase()}</span>
                    <span style={{ color: "#07111F", ...GF, fontSize: 14, fontWeight: 500, display: "block" }}>{title}</span>
                    <span style={{ color: "#64748B", ...GF, fontSize: 12, display: "block", marginTop: 2 }}>Opens: {page}</span>
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
