// /app/templates/gallery — ready-made templates, grouped by purpose.
// Inline styles only. No Burgundy.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeft, LayoutTemplate, Search, Sparkles, Users, X } from "lucide-react";
import {
  READY_MADE_CATEGORIES, READY_MADE_TEMPLATES, searchReadyMadeTemplates,
  type ReadyMadeTemplate,
} from "../../../services/ready-made-templates";
import { PREP_PARTICIPANT_ROLE_LABELS } from "../../../models/prepare";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useViewport } from "../../../hooks/useViewport";

const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const MAX_ROLE_CHIPS = 3;

function ReadyMadeCard({ template }: { template: ReadyMadeTemplate }) {
  const navigate = useNavigate();
  const open = () => { void navigate(`/app/templates/gallery/${template.id}`); };
  const shown = template.roles.slice(0, MAX_ROLE_CHIPS);
  const hidden = template.roles.length - shown.length;

  return (
    <article
      onClick={open}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
      tabIndex={0}
      role="button"
      aria-label={`Preview ready-made template: ${template.title}`}
      className="rmt-card"
      style={{
        background: "white", border: "1px solid #E2E8F0", borderRadius: 12,
        padding: "18px 20px", cursor: "pointer", display: "flex", flexDirection: "column",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, background: "#EEF4FB", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <LayoutTemplate size={17} color={AZURE} />
        </div>
        <span style={{
          ...GF, fontSize: 11, fontWeight: 600, color: "#1E40AF", background: "#EFF6FF",
          border: "1px solid #BFDBFE", borderRadius: 999, padding: "2px 9px",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
        }}>
          {template.category}
        </span>
      </div>

      <h3 style={{ ...GF, fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 4px", lineHeight: 1.35, overflowWrap: "anywhere" }}>
        {template.title}
      </h3>
      <p style={{ ...GF, fontSize: 12, color: "#64748B", margin: "0 0 14px", lineHeight: 1.5, overflowWrap: "anywhere" }}>
        {template.documentType}
      </p>

      <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <Users size={12} color="#94A3B8" aria-hidden />
        {shown.map(r => (
          <span key={`${String(r.routingStep)}-${r.label}`} title={PREP_PARTICIPANT_ROLE_LABELS[r.role]} style={{
            ...GF, fontSize: 11, color: "#475569", background: "#F1F5F9", borderRadius: 6,
            padding: "2px 7px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {r.label}
          </span>
        ))}
        {hidden > 0 && (
          <span style={{ ...GF, fontSize: 11, color: "#64748B" }}>+{hidden} more</span>
        )}
      </div>
    </article>
  );
}

export function ReadyMadeGalleryPage() {
  usePageMeta();
  const { isNarrow } = useViewport();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const results = useMemo(() => searchReadyMadeTemplates(query, categoryId), [query, categoryId]);
  const grouped = useMemo(() => {
    const out = new Map<string, ReadyMadeTemplate[]>();
    for (const t of results) out.set(t.category, [...(out.get(t.category) ?? []), t]);
    return [...out.entries()];
  }, [results]);

  const chip = (id: string | null, label: string, count: number) => {
    const active = categoryId === id;
    return (
      <button
        key={id ?? "all"}
        type="button"
        aria-pressed={active}
        onClick={() => setCategoryId(id)}
        style={{
          ...GF, fontSize: 12, fontWeight: active ? 700 : 500, whiteSpace: "nowrap", flexShrink: 0,
          color: active ? "white" : "#334155", background: active ? AZURE : "white",
          border: `1px solid ${active ? AZURE : "#E2E8F0"}`, borderRadius: 999,
          padding: isNarrow ? "8px 13px" : "6px 12px", minHeight: isNarrow ? 36 : undefined, cursor: "pointer",
        }}
      >
        {label} <span style={{ opacity: 0.75 }}>({count})</span>
      </button>
    );
  };

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      <style>{`
        .rmt-card { transition: box-shadow .15s, border-color .15s; outline: none; }
        .rmt-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: #CBD5E1; }
        .rmt-card:focus-visible { box-shadow: 0 0 0 3px rgba(0,120,212,0.35); border-color: ${AZURE}; }
      `}</style>

      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: isNarrow ? "16px 16px" : "20px 24px" }}>
        <Link to="/app/templates" style={{ ...GF, fontSize: 12, color: "#64748B", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
          <ChevronLeft size={13} /> Templates
        </Link>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: "#EFF6FF", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={19} color={AZURE} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ ...GF, fontSize: isNarrow ? 20 : 22, fontWeight: 800, color: "#0F172A", margin: 0, letterSpacing: "-0.02em" }}>
              Ready-made Templates
            </h1>
            <p style={{ ...GF, fontSize: 13, color: "#64748B", margin: "4px 0 0", lineHeight: 1.55 }}>
              {READY_MADE_TEMPLATES.length} templates with their roles and signing order already set up.
              Preview one, then use it to make it your own.
            </p>
          </div>
        </div>

        <div style={{ position: "relative", marginTop: 16, maxWidth: isNarrow ? "100%" : 420 }}>
          <Search size={14} color="#94A3B8" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title, type or role"
            aria-label="Search ready-made templates"
            style={{
              ...GF, width: "100%", boxSizing: "border-box", fontSize: isNarrow ? 16 : 13,
              padding: "9px 32px 9px 32px", border: "1px solid #E2E8F0", borderRadius: 8,
              outline: "none", background: "#F8FAFC", color: "#0F172A",
            }}
          />
          {query !== "" && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" style={{
              position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex",
            }}>
              <X size={14} color="#64748B" />
            </button>
          )}
        </div>

        {/* One scrollable row on a phone; wraps where there is room. */}
        <div
          role="group"
          aria-label="Filter by category"
          style={{
            display: "flex", gap: 8,
            flexWrap: isNarrow ? "nowrap" : "wrap",
            overflowX: isNarrow ? "auto" : undefined,
            margin: isNarrow ? "14px -16px 0" : "14px 0 0",
            padding: isNarrow ? "0 16px 4px" : 0,
          }}
        >
          {chip(null, "All", READY_MADE_TEMPLATES.length)}
          {READY_MADE_CATEGORIES.map(c => chip(c.id, c.label, c.count))}
        </div>
      </div>

      <div style={{ padding: isNarrow ? "16px" : "20px 24px 40px" }}>
        {grouped.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "#64748B", ...GF, fontSize: 13 }}>
            No ready-made template matches “{query.trim()}”.
          </div>
        ) : grouped.map(([category, items]) => (
          <section key={category} style={{ marginBottom: 28 }}>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#0F172A", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              {category}
              <span style={{ ...GF, fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>{items.length}</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {items.map(t => <ReadyMadeCard key={t.id} template={t} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
