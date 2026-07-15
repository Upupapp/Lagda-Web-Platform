// /app/templates/new — Create template from blank, draft, transaction, or example.
// Inline styles only. No backend. demonstrationOnly.

import { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  LayoutTemplate, FileText, FolderOpen, Copy, Sparkles,
  ChevronLeft, CheckCircle2, AlertCircle,
} from "lucide-react";
import { asyncCreateBlank } from "../../../services/mock/templates.service";
import {
  TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_LABELS,
} from "../../../models/templates";
import type { TemplateCategory } from "../../../models/templates";
import { usePageMeta } from "../../../hooks/usePageMeta";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const RED   = "#DC2626";

// ── Source options ────────────────────────────────────────────────────────────
const SOURCES = [
  {
    id:          "blank",
    label:       "Start from Blank",
    description: "Build a new template from scratch with your own documents, roles, and fields.",
    icon:        <LayoutTemplate size={22} color={AZURE} />,
    available:   true,
  },
  {
    id:          "from-draft",
    label:       "From an Existing Draft",
    description: "Use an in-progress transaction draft as the starting point for a new template.",
    icon:        <FileText size={22} color="#64748B" />,
    available:   false,
    note:        "No qualifying drafts in this demonstration.",
  },
  {
    id:          "from-transaction",
    label:       "From a Completed Transaction",
    description: "Copy the document set and participant roles from a completed signing transaction.",
    icon:        <FolderOpen size={22} color="#64748B" />,
    available:   false,
    note:        "Connect to a real workspace to use this option.",
  },
  {
    id:          "duplicate",
    label:       "Duplicate an Existing Template",
    description: "Create a copy of an existing template to use as the starting point.",
    icon:        <Copy size={22} color="#64748B" />,
    available:   false,
    note:        "Use the Duplicate action on an existing template instead.",
  },
] as const;

// ── Blank template form ───────────────────────────────────────────────────────
function BlankForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [name,     setName]     = useState("");
  const [category, setCategory] = useState<TemplateCategory>("legal-services");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Template name is required."); return; }
    setError(null);
    setLoading(true);
    try {
      const r = await asyncCreateBlank(name.trim(), category);
      if (r.ok && r.newId) {
        onCreated(r.newId);
      } else {
        setError(r.reason ?? "Create failed.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, marginTop: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Template Name <span style={{ color: RED }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          placeholder="e.g. Engagement Letter — Standard"
          autoFocus
          style={{
            width:        "100%",
            height:       42,
            padding:      "0 14px",
            border:       `1px solid ${error ? RED : "#E2E8F0"}`,
            borderRadius: 8,
            ...GF,
            fontSize:     14,
            color:        "#0F172A",
            boxSizing:    "border-box",
            outline:      "none",
          }}
        />
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <AlertCircle size={13} color={RED} />
            <span style={{ ...GF, fontSize: 12, color: RED }}>{error}</span>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Category
        </label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as TemplateCategory)}
          style={{ ...GF, fontSize: 13, color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px", background: "white", cursor: "pointer", width: "100%" }}
        >
          {TEMPLATE_CATEGORIES.map(c => (
            <option key={c} value={c}>{TEMPLATE_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleCreate}
        disabled={loading}
        style={{
          display:     "inline-flex",
          alignItems:  "center",
          gap:         8,
          padding:     "11px 22px",
          background:  loading ? "#93C5FD" : AZURE,
          color:       "white",
          border:      "none",
          borderRadius:8,
          ...GF,
          fontSize:    14,
          fontWeight:  700,
          cursor:      loading ? "default" : "pointer",
        }}
      >
        {loading ? "Creating…" : "Create Template"}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function CreateTemplatePage() {
  usePageMeta("New Template — LAGDA");
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "18px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/app/templates" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#64748B", textDecoration: "none", ...GF, fontSize: 13 }}>
          <ChevronLeft size={15} />
          Templates
        </Link>
        <span style={{ color: "#CBD5E1" }}>/</span>
        <span style={{ ...GF, fontSize: 13, color: "#0F172A", fontWeight: 600 }}>New Template</span>
      </div>

      <div style={{ padding: "28px 24px", maxWidth: 760 }}>
        <h2 style={{ ...GF, fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Create a New Template
        </h2>
        <p style={{ ...GF, fontSize: 13, color: "#64748B", margin: "0 0 24px" }}>
          Choose how you'd like to start building your new template.
        </p>

        {/* Source selection */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {SOURCES.map(s => (
            <button
              key={s.id}
              onClick={() => s.available && setSelected(s.id)}
              disabled={!s.available}
              aria-pressed={selected === s.id}
              style={{
                textAlign:     "left",
                padding:       "18px 16px",
                border:        `2px solid ${selected === s.id ? AZURE : "#E2E8F0"}`,
                borderRadius:  12,
                background:    selected === s.id ? "#EEF4FB" : s.available ? "white" : "#F8FAFC",
                cursor:        s.available ? "pointer" : "not-allowed",
                opacity:       s.available ? 1 : 0.55,
                transition:    "border-color 0.15s, background 0.15s",
              }}
            >
              <div style={{ marginBottom: 10 }}>{s.icon}</div>
              <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 5 }}>{s.label}</div>
              <div style={{ ...GF, fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>{s.description}</div>
              {s.note && !s.available && (
                <div style={{ ...GF, fontSize: 11, color: "#94A3B8", marginTop: 8, fontStyle: "italic" }}>{s.note}</div>
              )}
              {selected === s.id && s.available && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle2 size={12} color={AZURE} />
                  <span style={{ ...GF, fontSize: 11, color: AZURE, fontWeight: 600 }}>Selected</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Detail form for selected source */}
        {selected === "blank" && (
          <div style={{ marginTop: 28, background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "22px 24px" }}>
            <h3 style={{ ...GF, fontSize: 15, fontWeight: 700, color: "#0F172A", margin: "0 0 4px" }}>Template Details</h3>
            <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: "0 0 0" }}>Name your template before adding documents and roles.</p>
            <BlankForm onCreated={id => navigate(`/app/templates/${id}/edit`)} />
          </div>
        )}
      </div>
    </div>
  );
}
