// The blank page's "Start from a purpose": pick what the template is for and
// the title and summary are written in for you, from the same library the
// ready-made gallery uses. It is a starting point, not generated text.

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  READY_MADE_CATEGORIES, READY_MADE_TEMPLATES, type ReadyMadeTemplate,
} from "../../../../services/ready-made-templates";
import type { StarterTemplate } from "./starterTemplates";

const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";

export function PurposePicker({
  compact, busy, onWrite, starters, onStarter,
}: {
  compact: boolean;
  busy: boolean;
  onWrite: (template: ReadyMadeTemplate) => void;
  starters: readonly StarterTemplate[];
  onStarter: (starter: StarterTemplate) => void;
}) {
  const [categoryId, setCategoryId] = useState(READY_MADE_CATEGORIES[0]?.id ?? "");
  const documents = useMemo(
    () => READY_MADE_TEMPLATES.filter(t => t.categoryId === categoryId), [categoryId]);
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "");
  const chosen = documents.find(d => d.id === documentId) ?? documents[0];

  const selectStyle: React.CSSProperties = {
    ...GF, fontSize: compact ? 16 : 12.5, color: "#0F172A", background: "white",
    border: "1px solid #BFDBFE", borderRadius: 7, padding: compact ? "8px 10px" : "5px 8px",
    minHeight: compact ? 40 : undefined, minWidth: 0, maxWidth: "100%",
    flex: compact ? "1 1 100%" : "0 1 auto",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      padding: compact ? "10px 12px" : "9px 14px", background: "#EFF6FF",
      borderBottom: "1px solid #BFDBFE", flexShrink: 0,
    }}>
      <Sparkles size={13} color="#1E40AF" style={{ flexShrink: 0 }} aria-hidden />
      <span style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#1E40AF" }}>
        Start from a purpose:
      </span>
      <select
        aria-label="What is this template for?"
        value={categoryId}
        disabled={busy}
        onChange={e => {
          setCategoryId(e.target.value);
          setDocumentId(READY_MADE_TEMPLATES.find(t => t.categoryId === e.target.value)?.id ?? "");
        }}
        style={selectStyle}
      >
        {READY_MADE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <select
        aria-label="Which document?"
        value={chosen?.id ?? ""}
        disabled={busy}
        onChange={e => setDocumentId(e.target.value)}
        style={{ ...selectStyle, maxWidth: compact ? "100%" : 320 }}
      >
        {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
      </select>
      <button
        type="button"
        disabled={busy || chosen === undefined}
        onClick={() => { if (chosen) onWrite(chosen); }}
        style={{
          ...GF, fontSize: 12.5, fontWeight: 700, color: "white", background: busy ? "#94A3B8" : AZURE,
          border: "none", borderRadius: 7, padding: compact ? "9px 14px" : "6px 12px",
          minHeight: compact ? 40 : undefined, cursor: busy ? "default" : "pointer",
          flex: compact ? "1 1 100%" : "0 0 auto",
        }}
      >
        {busy ? "Writing…" : "Write it for me"}
      </button>
      {starters.length > 0 && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ ...GF, fontSize: 11.5, color: "#1E40AF" }}>or a detailed draft:</span>
          {starters.map(s => (
            <button
              key={s.id}
              type="button"
              title={s.description}
              disabled={busy}
              onClick={() => onStarter(s)}
              style={{
                ...GF, fontSize: 12, fontWeight: 600, color: AZURE, background: "white",
                border: "1px solid #BFDBFE", borderRadius: 7,
                padding: compact ? "7px 12px" : "5px 10px", minHeight: compact ? 36 : undefined, cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
