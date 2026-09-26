// /app/templates/new — Create template from blank, draft, transaction, or example.
// Inline styles only. No backend. demonstrationOnly.

import { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  LayoutTemplate, FileText, FolderOpen, Copy,
  ChevronLeft, CheckCircle2, AlertCircle, X, Sparkles, ArrowRight,
} from "lucide-react";
import { READY_MADE_TEMPLATES, READY_MADE_CATEGORIES } from "../../../services/ready-made-templates";
import { asyncCreateBlank } from "../../../services/mock/templates.service";
import { createTemplate, realTemplatesAvailable } from "../../../services/templates-source";
import { usePlatform } from "../../../context/PlatformContext";
import {
  PREP_PARTICIPANT_ROLE_LABELS, VALID_PREP_PARTICIPANT_ROLES,
} from "../../../models/prepare";
import type { PrepParticipantRole } from "../../../models/prepare";
import { ROUTING_MODE_LABELS } from "../../../models/transaction-detail";
import type { RoutingMode } from "../../../models/transaction-detail";
import type { TemplateRolePlaceholder } from "../../../models/templates";

/** A row in the role editor. `description` and `mustMapToParticipant` are not
 *  collected: the backend's slot schema is `additionalProperties: false` and
 *  has no column for either, so a field for them would capture input that the
 *  server refuses. */
type SlotRow = Pick<
  TemplateRolePlaceholder,
  "id" | "label" | "role" | "required" | "routingStep" | "defaultAuthMethod"
>;

const newSlot = (step: number): SlotRow => ({
  id: `slot-${String(Date.now())}-${String(step)}`,
  label: "", role: "signer", required: true,
  routingStep: step, defaultAuthMethod: "none",
});

const ROUTING_MODES: RoutingMode[] = ["sequential", "parallel", "mixed", "approval-based"];
import {
  TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_LABELS,
} from "../../../models/templates";
import type { TemplateCategory } from "../../../models/templates";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useViewport } from "../../../hooks/useViewport";
import { useProcessing } from "../../../services/processing.service";
import { Z } from "../../../utils/z-index";

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

  const platform = usePlatform();
  const { run: runProcessing } = useProcessing();
  const workspaceId = platform.currentWorkspace?.id;
  // Whether this form can SAVE a workflow, or is only naming a fixture.
  const canSave = realTemplatesAvailable(workspaceId);

  const [routingMode, setRoutingMode] = useState<RoutingMode>("sequential");
  const [slots, setSlots] = useState<SlotRow[]>([newSlot(1), newSlot(2)]);
  const [notifySender, setNotifySender] = useState(true);

  const patchSlot = (id: string, patch: Partial<SlotRow>) =>
    setSlots(rows => rows.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const addSlot = () =>
    setSlots(rows => [...rows, newSlot(rows.length + 1)]);
  const removeSlot = (id: string) =>
    // Renumbered so the steps stay contiguous from 1. The backend refuses a
    // template whose steps skip a number, and a form that could produce one
    // would fail at save with a message about data the person never saw.
    setSlots(rows => rows.filter(r => r.id !== id)
      .map((r, i) => ({ ...r, routingStep: Math.min(r.routingStep, i + 1) })));

  const handleCreate = async () => {
    if (!name.trim()) { setError("Template name is required."); return; }
    setError(null);
    setLoading(true);
    try {
      if (canSave) {
        const blank = slots.find(sl => sl.label.trim() === "");
        if (blank) {
          setError("Every role needs a name.");
          return;
        }
        // The shared panel covers the navigation that follows, so the person
        // is not left on a form that looks unchanged while the route swaps.
        const created = await runProcessing(
          { message: "Saving the template", detail: "Storing its roles and routing." },
          () => createTemplate(workspaceId, {
            name,
            routingMode,
            placeholders: slots.map(sl => ({
              ...sl, description: "", mustMapToParticipant: sl.required,
            })),
            notifySenderOnComplete: notifySender,
            // No variable-authoring UI at creation time — added afterwards,
            // in the template's own Variables tab.
            variables: [],
          }),
        );
        onCreated(created.id);
        return;
      }

      const r = await asyncCreateBlank(name.trim(), category);
      if (r.ok && r.newId) {
        onCreated(r.newId);
      } else {
        setError(r.reason ?? "Create failed.");
      }
    } catch (err) {
      // The server's own reason, where it gave one — a malformed slot or a
      // duplicate name is actionable, and "unexpected error" is not.
      setError(err instanceof Error && err.message !== ""
        ? err.message
        : "An unexpected error occurred.");
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

      {canSave && (
        <>
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Routing Mode
            </label>
            <select
              value={routingMode}
              onChange={e => setRoutingMode(e.target.value as RoutingMode)}
              style={{ ...GF, fontSize: 13, color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px", background: "white", cursor: "pointer", width: "100%" }}
            >
              {ROUTING_MODES.map(m => (
                <option key={m} value={m}>{ROUTING_MODE_LABELS[m]}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Roles <span style={{ color: RED }}>*</span>
            </label>
            <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: "0 0 10px", lineHeight: 1.5 }}>
              Name the roles, not the people. You choose who fills each one every time you use this template.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {slots.map((sl, idx) => (
                <div key={sl.id} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", background: "white" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>
                      STEP {sl.routingStep}
                    </span>
                    {slots.length > 1 && (
                      <button
                        onClick={() => removeSlot(sl.id)}
                        style={{ ...GF, marginLeft: "auto", fontSize: 12, color: RED, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={sl.label}
                    onChange={e => { patchSlot(sl.id, { label: e.target.value }); setError(null); }}
                    placeholder={idx === 0 ? "e.g. Department Head" : "e.g. Employee"}
                    style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid #E2E8F0", borderRadius: 8, ...GF, fontSize: 13, color: "#0F172A", boxSizing: "border-box", outline: "none", marginBottom: 8 }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <select
                      value={sl.role}
                      onChange={e => patchSlot(sl.id, { role: e.target.value as PrepParticipantRole })}
                      style={{ ...GF, fontSize: 12.5, color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", background: "white", cursor: "pointer" }}
                    >
                      {VALID_PREP_PARTICIPANT_ROLES.map(r => (
                        <option key={r} value={r}>{PREP_PARTICIPANT_ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <select
                      value={String(sl.routingStep)}
                      onChange={e => patchSlot(sl.id, { routingStep: Number(e.target.value) })}
                      style={{ ...GF, fontSize: 12.5, color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", background: "white", cursor: "pointer" }}
                    >
                      {slots.map((_, i) => (
                        <option key={i} value={String(i + 1)}>
                          Step {i + 1}{i + 1 === sl.routingStep ? "" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={sl.required}
                      onChange={e => patchSlot(sl.id, { required: e.target.checked })}
                      style={{ accentColor: AZURE, width: 14, height: 14 }}
                    />
                    <span style={{ ...GF, fontSize: 12.5, color: "#475569" }}>
                      Must act before later steps begin
                    </span>
                  </label>
                  {/* Said at the moment the choice is made. Unticking this is
                      commonly read as "skip this person unless needed", and it
                      is not — the engine activates a non-blocking cohort
                      ALONGSIDE the next one (planWorkflowAdvance only breaks
                      on a required member). They are still asked; the document
                      simply never waits. */}
                  {!sl.required && (
                    <p style={{ ...GF, fontSize: 11.5, color: "#94A3B8", margin: "6px 0 0 21px", lineHeight: 1.5 }}>
                      They will still receive the document at the same time as
                      the next step — it just will not wait for them.
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addSlot}
              style={{ ...GF, marginTop: 10, fontSize: 13, fontWeight: 600, color: AZURE, background: "none", border: "1px dashed #C8E1F5", borderRadius: 8, padding: "9px 14px", cursor: "pointer", width: "100%" }}
            >
              + Add a role
            </button>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={notifySender}
              onChange={e => setNotifySender(e.target.checked)}
              style={{ accentColor: AZURE, width: 15, height: 15 }}
            />
            <span style={{ ...GF, fontSize: 13, color: "#475569" }}>
              Email me when a document from this template is completed
            </span>
          </label>
        </>
      )}

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
  usePageMeta();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const { isNarrow } = useViewport();

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

        {/* The faster start, above building from scratch. */}
        <Link
          to="/app/templates/gallery"
          className="ct-ready-card"
          style={{
            display: "flex", flexDirection: isNarrow ? "column" : "row",
            alignItems: isNarrow ? "flex-start" : "center", gap: isNarrow ? 12 : 16,
            margin: "0 0 20px", padding: isNarrow ? "16px" : "18px 20px",
            borderRadius: 12, border: `2px solid ${AZURE}`, background: "linear-gradient(90deg, #EFF6FF 0%, #FFFFFF 100%)",
            textDecoration: "none", color: "inherit", boxSizing: "border-box",
          }}
        >
          <span style={{
            width: 44, height: 44, borderRadius: 11, background: AZURE, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={21} color="white" />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ ...GF, display: "block", fontSize: 15, fontWeight: 800, color: "#0F172A" }}>
              Start from a ready-made template
            </span>
            <span style={{ ...GF, display: "block", fontSize: 12.5, color: "#475569", margin: "3px 0 8px", lineHeight: 1.5 }}>
              {READY_MADE_TEMPLATES.length} templates with roles and signing order already set up — just edit and send.
            </span>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {READY_MADE_CATEGORIES.slice(0, isNarrow ? 3 : 6).map(c => (
                <span key={c.id} style={{
                  ...GF, fontSize: 11, color: "#1E40AF", background: "white", border: "1px solid #BFDBFE",
                  borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap",
                }}>{c.label}</span>
              ))}
              <span style={{ ...GF, fontSize: 11, color: "#64748B", padding: "2px 2px" }}>
                +{Math.max(0, READY_MADE_CATEGORIES.length - (isNarrow ? 3 : 6))} more
              </span>
            </span>
          </span>
          <span style={{
            ...GF, display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
            fontSize: 13, fontWeight: 700, color: "white", background: AZURE,
            padding: "9px 16px", borderRadius: 8, alignSelf: isNarrow ? "stretch" : undefined,
            justifyContent: "center",
          }}>
            Browse templates <ArrowRight size={14} />
          </span>
        </Link>
        <style>{`.ct-ready-card { transition: box-shadow .15s; } .ct-ready-card:hover, .ct-ready-card:focus-visible { box-shadow: 0 4px 16px rgba(0,120,212,0.18); outline: none; }`}</style>

        {/* Source selection */}
        {/* Flex-wrap rather than a grid: `auto-fill` leaves phantom columns and
            left-aligns a short row, so four cards on a wide screen and two on a
            tablet both sat off-centre. A basis with wrap centres every row at
            every width, and the cards keep one size instead of stretching. */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 14,
          justifyContent: "center", alignItems: "stretch",
        }}>
          {SOURCES.map(s => (
            <button
              key={s.id}
              onClick={() => s.available && setSelected(s.id)}
              disabled={!s.available}
              aria-pressed={selected === s.id}
              style={{
                flex:          "1 1 230px",
                maxWidth:      300,
                minWidth:      0,
                display:       "flex",
                flexDirection: "column",
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
              {"note" in s && !s.available && (
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

        {/* ── Template Details, as a modal ───────────────────────────────
            Inline, it pushed the source cards off the top of a phone the
            moment "Start from Blank" was tapped, and the roles editor made
            the page several screens long with the choice you had just made
            scrolled out of sight. A panel keeps the form in one place, gives
            it its own scroll, and leaves the cards where they were. */}
        {selected === "blank" && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Template details"
            onClick={() => setSelected(null)}
            style={{
              position: "fixed", inset: 0, zIndex: Z.modalScrim,
              background: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              // Bottom-sheet on a phone, centred panel above it. `flex-end`
              // puts the sheet within thumb reach instead of under the notch.
              alignItems: isNarrow ? "flex-end" : "center",
              justifyContent: "center",
              padding: isNarrow ? 0 : 24,
              overflowY: "auto",
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: "white",
                borderRadius: isNarrow ? "16px 16px 0 0" : 14,
                width: "100%",
                maxWidth: 560,
                // Never taller than the viewport; the form scrolls inside.
                maxHeight: isNarrow ? "92vh" : "88vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                position: "relative",
                zIndex: Z.modal,
              }}
            >
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: isNarrow ? "18px 18px 12px" : "22px 24px 14px",
                borderBottom: "1px solid #F1F5F9", flexShrink: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ ...GF, fontSize: 16, fontWeight: 800, color: "#0F172A", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
                    Template Details
                  </h3>
                  <p style={{ ...GF, fontSize: 12.5, color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                    Name the workflow and the roles it routes through.
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#94A3B8", padding: 4, lineHeight: 0, flexShrink: 0,
                    // 44px hit area even though the glyph is small.
                    margin: -4, width: 32, height: 32,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{
                overflowY: "auto", flex: 1,
                padding: isNarrow ? "0 18px 18px" : "0 24px 24px",
                WebkitOverflowScrolling: "touch",
              }}>
                <BlankForm onCreated={id => navigate(`/app/templates/${id}/edit`)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
