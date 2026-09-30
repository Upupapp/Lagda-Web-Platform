// /app/templates/gallery — ready-made templates, grouped by purpose.
// Inline styles only. No Burgundy.
//
// 093. The cards come from the server's CATALOGUE: titles, categories and
// roles, never a document's text. On a Free owner's workspace every card is
// shown under a frosted cover and cannot be opened — no link, no focus, no
// handler — and the text it would open is refused by the server anyway, so
// nothing in the browser can be coaxed into revealing it.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeft, Search, Sparkles, Users, X, Lock } from "lucide-react";
import { searchReadyMadeTemplates, type ReadyMadeTemplate } from "../../../services/ready-made-templates";
import { useReadyMade } from "../../../hooks/useReadyMade";
import { useWorkspaceAllows } from "../../../hooks/usePlans";
import { PlanUpgradeCard } from "../../../components/platform/PlanGate";
import { categoryBanner } from "../../../services/ready-made-banners";
import { readyMadeIcon } from "../../../services/ready-made-icons";
import { PREP_PARTICIPANT_ROLE_LABELS } from "../../../models/prepare";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useViewport } from "../../../hooks/useViewport";
import { CenteredColumn } from "../../../components/platform";

const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const MAX_ROLE_CHIPS = 3;

function ReadyMadeCard({ template, locked = false }: { template: ReadyMadeTemplate; locked?: boolean }) {
  const navigate = useNavigate();
  const open = () => { if (!locked) void navigate(`/app/templates/gallery/${template.id}`); };
  const shown = template.roles.slice(0, MAX_ROLE_CHIPS);
  const hidden = template.roles.length - shown.length;
  const banner = categoryBanner(template.category);
  const Icon = readyMadeIcon(template.title);

  return (
    <article
      {...(locked ? {
        "aria-label": `${template.title} — part of the Personal plan`,
        "data-testid": "ready-made-locked-card",
      } : {
        onClick: open,
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } },
        tabIndex: 0,
        role: "button",
        "aria-label": `Preview ready-made template: ${template.title}`,
      })}
      className={locked ? "rmt-card rmt-locked" : "rmt-card"}
      style={{
        position: "relative",
        background: "white", border: "1px solid #E2E8F0", borderRadius: 12,
        cursor: locked ? "default" : "pointer", display: "flex", flexDirection: "column",
        minWidth: 0, height: "100%", boxSizing: "border-box",
      }}
    >
      {locked && (
        <div className="rmt-frost" aria-hidden>
          <span className="rmt-frost-chip"><Lock size={13} /> Personal</span>
        </div>
      )}
      <div style={{ position: "relative" }}>
        <div className="rmt-banner" style={{
          aspectRatio: "16 / 5", background: "#E2E8F0", overflow: "hidden",
          borderTopLeftRadius: 11, borderTopRightRadius: 11,
        }}>
          {banner && (
            <img
              src={banner.card} alt="" aria-hidden loading="lazy" decoding="async"
              width={800} height={250}
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
        <span style={{
          ...GF, position: "absolute", left: 0, top: 0, width: "fit-content", maxWidth: "calc(100% - 74px)",
          boxSizing: "border-box", fontSize: 11, fontWeight: 600, color: "#0F172A", background: "#9DCBFF",
          borderRadius: 0, borderBottomRightRadius: 5, padding: "2px 9px", boxShadow: "0 1px 2px rgba(15,23,42,0.12)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {template.category}
        </span>
        <div aria-hidden style={{
          position: "absolute", left: 16, bottom: -20, width: 40, height: 40, borderRadius: "50%",
          background: "white", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(15,23,42,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
        }}>
          <Icon size={18} color={AZURE} />
        </div>
      </div>

      <div style={{ padding: "30px 18px 16px", display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
      <h3 style={{
        ...GF, fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 4px", lineHeight: 1.35, overflowWrap: "anywhere",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.7em",
      }} title={template.title}>
        {template.title}
      </h3>
      <p style={{ ...GF, fontSize: 12, color: "#64748B", margin: "0 0 14px", lineHeight: 1.5, overflowWrap: "anywhere" }}>
        {template.documentType}
      </p>
      {locked && (
        // Decoration, not text: the catalogue carries none to show.
        <div aria-hidden className="rmt-ghost">
          <span style={{ width: "92%" }} /><span style={{ width: "78%" }} /><span style={{ width: "85%" }} />
        </div>
      )}

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
      </div>
    </article>
  );
}

export function ReadyMadeGalleryPage() {
  usePageMeta();
  const { isNarrow } = useViewport();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const library = useReadyMade();
  const READY_MADE_TEMPLATES = library.templates;
  const READY_MADE_CATEGORIES = library.categories;
  // 093. Ready-made templates are part of Personal. Unknown hides nothing.
  const locked = useWorkspaceAllows("personal") === false;

  // `library.version`: the arrays are filled in place when the server answers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const results = useMemo(() => searchReadyMadeTemplates(query, categoryId), [query, categoryId, library.version]);
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
        .rmt-card { transition: box-shadow .18s, border-color .18s, transform .18s; outline: none; }
        .rmt-card img { transition: transform .35s ease; }
        .rmt-card:hover { box-shadow: 0 6px 20px rgba(15,23,42,0.10); border-color: #CBD5E1; transform: translateY(-2px); }
        .rmt-card:hover img { transform: scale(1.04); }
        .rmt-card:focus-visible { box-shadow: 0 0 0 3px white, 0 0 0 5px ${AZURE}; border-color: ${AZURE}; }
        .rmt-locked { pointer-events: none; user-select: none; overflow: hidden; }
        .rmt-locked > :not(.rmt-frost) { filter: blur(2.5px) saturate(0.85); }
        .rmt-frost { position: absolute; inset: 0; z-index: 2; border-radius: 12px; display: flex; align-items: flex-start; justify-content: flex-end; padding: 10px;
          background: linear-gradient(180deg, rgba(11,27,58,0.10), rgba(11,27,58,0.28)); backdrop-filter: blur(1.5px); -webkit-backdrop-filter: blur(1.5px); }
        .rmt-frost-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: #3B2A00;
          background: linear-gradient(135deg, #FDE68A, #F5C542); border-radius: 999px; padding: 4px 10px; box-shadow: 0 6px 16px -8px rgba(245,197,66,0.9); }
        .rmt-ghost { display: grid; gap: 6px; margin: -4px 0 14px; }
        .rmt-ghost span { display: block; height: 7px; border-radius: 4px; background: #E2E8F0; }
        @media (prefers-reduced-motion: reduce) {
          .rmt-card, .rmt-card img { transition: none; }
          .rmt-card:hover, .rmt-card:hover img { transform: none; }
        }
      `}</style>

      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: isNarrow ? "16px 16px" : "20px 24px" }}>
        {/* Header and grid share one centred column, so a wide screen does not
            leave the gallery pinned left with a blank strip on the right. */}
        <CenteredColumn>
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
              {library.status === "loading" && READY_MADE_TEMPLATES.length === 0 ? "Loading the templates…"
                : `${String(READY_MADE_TEMPLATES.length)} templates with their roles and signing order already set up. `
                  + (locked ? "They are part of the Personal plan." : "Preview one, then use it to make it your own.")}
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
        </CenteredColumn>
      </div>

      <div style={{ padding: isNarrow ? "16px" : "20px 24px 40px" }}>
      <CenteredColumn>
        {locked && (
          <PlanUpgradeCard minimum="personal" feature="Ready-made templates"
            title={`${String(READY_MADE_TEMPLATES.length)} ready-made templates are part of the Personal plan`} />
        )}
        {library.status === "error" && READY_MADE_TEMPLATES.length === 0 ? (
          <div role="alert" style={{ textAlign: "center", padding: "48px 16px", color: "#64748B", ...GF, fontSize: 13 }}>
            The ready-made templates could not be loaded. Please refresh the page.
          </div>
        ) : library.status === "loading" && READY_MADE_TEMPLATES.length === 0 ? (
          <div aria-busy="true" style={{ minHeight: 240 }} />
        ) : grouped.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "#64748B", ...GF, fontSize: 13 }}>
            No ready-made template matches “{query.trim()}”.
          </div>
        ) : grouped.map(([category, items]) => (
          <section key={category} style={{ marginBottom: 28 }}>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#0F172A", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              {category}
              <span style={{ ...GF, fontSize: 11, fontWeight: 500, color: "#94A3B8" }}>{items.length}</span>
            </h2>
            {/* The same tracks in every section, so cards line up down the
                page; inside the centred column that is at most four across. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 16 }}>
              {items.map(t => <ReadyMadeCard key={t.id} template={t} locked={locked} />)}
            </div>
          </section>
        ))}
      </CenteredColumn>
      </div>
    </div>
  );
}
