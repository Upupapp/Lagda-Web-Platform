// Where the notary's seal and signature go on the document, on a page of their own as fields are placed when a document is
// prepared: the tools on the left (the seal, the signature), every page of the document shown in full in the middle. Press
// a page where the chosen tool should go; drag it, or use the arrow keys, to move it. What is not placed goes to its usual
// place (the seal at the lower right of the last page, the signature beside it).
//
// The seal is drawn from the commission on the notary's application and the signature is the picture they saved, so this
// only says where; the server draws them. A marker shows the size and place they will have.

import { useCallback, useEffect, useRef, useState } from "react";
import { PenLine, RotateCcw, Stamp, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { DocumentPageSurface, useRealDocument } from "../../../../components/pdf/DocumentPageSurface";
import { GF } from "../../../../components/system/design-system";
import { realEnotarySessionsService, type PagePoint } from "../../../../services/real/enotary-sessions.service";
import { E } from "../EnotaryChrome";
import { bodyText, hintStyle } from "../onramp-ui";

export interface Placements { seal?: PagePoint; signature?: PagePoint }

type Tool = "seal" | "signature";

/** The seal and the signature as the server draws them, in points of a page; the markers are scaled from these. */
export const SEAL_POINTS = 140;
export const SIGNATURE_W = 120;
export const SIGNATURE_H = 44;
/** Where each goes when the notary does not place it (the server's own choice): the last page, lower right. */
export const USUAL_PLACE = { seal: { x: 0.8, y: 0.84 }, signature: { x: 0.52, y: 0.86 } } as const;
const STEP = 0.02;
const MAX_WIDTH = 720;

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const STYLES = `
  .sp-wrap { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 20px; align-items: start; }
  .sp-side { position: sticky; top: 76px; display: grid; gap: 12px; }
  .sp-pages { display: grid; gap: 18px; justify-items: center; padding: 18px 10px 30px; background: #E9EDF3; border: 1px solid ${E.line}; border-radius: 12px; min-width: 0; }
  .sp-tool { text-align: left; }
  @media (max-width: 860px) { .sp-wrap { grid-template-columns: minmax(0, 1fr); } .sp-side { position: static; } }
`;

const without = (value: Placements, which: Tool): Placements => {
  const next = { ...value };
  delete next[which];
  return next;
};

export function SealPlacer({ sessionId, hasSignature, value, onChange, notaryName }: {
  sessionId: string; hasSignature: boolean; value: Placements; onChange: (next: Placements) => void; notaryName: string;
}) {
  const load = useCallback(() => realEnotarySessionsService.document(sessionId), [sessionId]);
  const state = useRealDocument(load);
  const [tool, setTool] = useState<Tool>("seal");
  const [width, setWidth] = useState(0);
  const holder = useRef<HTMLDivElement>(null);
  const surfaces = useRef(new Map<number, HTMLDivElement>());
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    const element = holder.current;
    if (element === null) return;
    const measure = () => { setWidth(Math.min(MAX_WIDTH, Math.max(0, Math.floor(element.clientWidth) - 20))); };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { observer.disconnect(); };
  }, [state.status]);

  const put = (which: Tool, page: number, point: { x: number; y: number }) => {
    onChange({ ...latest.current, [which]: { page, x: clamp(point.x), y: clamp(point.y) } });
  };
  const pointOn = (page: number, clientX: number, clientY: number): { x: number; y: number } | null => {
    const box = surfaces.current.get(page)?.getBoundingClientRect();
    if (box === undefined || box.width === 0) return null;
    return { x: (clientX - box.left) / box.width, y: (clientY - box.top) / box.height };
  };
  const drag = (which: Tool, page: number, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const move = (next: PointerEvent) => { const point = pointOn(page, next.clientX, next.clientY); if (point !== null) put(which, page, point); };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  const keys = (which: Tool, page: number, event: React.KeyboardEvent<HTMLDivElement>) => {
    const at = value[which]?.page === page ? value[which] : undefined;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    const move = moves[event.key];
    const from = at ?? { x: 0.5, y: 0.5 };
    if (move !== undefined) { event.preventDefault(); put(which, page, { x: from.x + move[0], y: from.y + move[1] }); }
    else if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); onChange(without(value, which)); }
  };

  const tools: [Tool, string, typeof Stamp, boolean][] = [["seal", "Notary seal", Stamp, true], ["signature", "My signature", PenLine, hasSignature]];
  const summary = (which: Tool): string => {
    const point = value[which];
    return point === undefined ? "The usual place" : `Page ${String(point.page)}`;
  };

  let pages: React.ReactNode;
  if (state.status === "loading" || state.status === "idle") pages = <p role="status" style={{ ...bodyText, margin: 0 }}>Opening the document…</p>;
  else if (state.status === "error") {
    pages = <p data-testid="placer-unavailable" style={{ ...bodyText, margin: 0 }}>The pages could not be shown here. Your seal and signature will go at their usual place, lower right of the last page.</p>;
  } else {
    pages = Array.from({ length: state.pageCount }, (_, index) => {
      const page = index + 1;
      const size = state.pageSizes[index] ?? state.pageSizes[0] ?? { width: 595, height: 842 };
      const pageWidth = Math.min(width, Math.floor(width * Math.min(1, size.width / 595)));
      const pageHeight = pageWidth === 0 ? 0 : Math.round((pageWidth * size.height) / size.width);
      const scale = pageWidth === 0 ? 0 : pageWidth / size.width;
      const marker = (which: Tool) => {
        const point = value[which];
        if (point === undefined || point.page !== page || scale === 0) return null;
        const w = (which === "seal" ? SEAL_POINTS : SIGNATURE_W) * scale;
        const h = (which === "seal" ? SEAL_POINTS : SIGNATURE_H) * scale;
        return (
          <div
            key={which} data-testid={`marker-${which}`} role="button" tabIndex={0} aria-label={`The ${which}, on page ${String(page)}. Drag it, or use the arrow keys.`}
            onPointerDown={event => { setTool(which); drag(which, page, event); }} onKeyDown={event => { keys(which, page, event); }} onClick={event => { event.stopPropagation(); }}
            style={{
              position: "absolute", left: `${String(point.x * 100)}%`, top: `${String(point.y * 100)}%`, width: w, height: h,
              transform: "translate(-50%, -50%)", display: "grid", placeItems: "center", cursor: "grab", touchAction: "none", textAlign: "center",
              fontFamily: "'Geist', sans-serif", fontSize: Math.max(8, 10 * scale * 1.6), fontWeight: 700, color: E.maroon,
              border: `2px ${which === "seal" ? "solid" : "dashed"} ${E.maroon}`, borderRadius: which === "seal" ? "999px" : 6,
              background: "rgba(194,24,91,0.1)", boxSizing: "border-box", overflow: "hidden", padding: 2,
              boxShadow: tool === which ? "0 0 0 3px rgba(194,24,91,0.25)" : "none",
            }}
          >
            {which === "seal" ? <span>NOTARY PUBLIC<br />{notaryName}</span> : <span>Signature</span>}
          </div>
        );
      };
      return (
        <figure key={page} style={{ margin: 0 }}>
          <div
            ref={element => { if (element === null) surfaces.current.delete(page); else surfaces.current.set(page, element); }}
            data-testid={`placer-surface-${String(page)}`} role="group" aria-label={`Page ${String(page)} of ${String(state.pageCount)} of the document. Press where the ${tool} should go.`}
            onClick={event => { const point = pointOn(page, event.clientX, event.clientY); if (point !== null) put(tool, page, point); }}
            style={{ position: "relative", width: pageWidth, height: pageHeight, background: "#FFFFFF", cursor: "crosshair", boxShadow: "0 2px 14px rgba(10,26,43,0.18)" }}
          >
            {pageWidth > 0 && <DocumentPageSurface doc={state.doc} pageNumber={page} width={pageWidth} height={pageHeight} />}
            {marker("seal")}
            {marker("signature")}
          </div>
          <figcaption data-testid="placer-page" style={{ ...GF, textAlign: "center", fontSize: 13, color: E.quiet, marginTop: 6 }}>Page {page} of {state.pageCount}</figcaption>
        </figure>
      );
    });
  }

  const small = { ...GF, minHeight: 40, padding: "0 12px", borderRadius: 8, border: `1px solid ${E.line}`, background: "#FFFFFF", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 } as const;
  return (
    <div data-testid="seal-placer" className="sp-wrap">
      <style>{STYLES}</style>
      <aside className="sp-side" aria-label="Seal and signature">
        <div style={{ background: "#FFFFFF", border: `1px solid ${E.line}`, borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <h2 style={{ ...GF, margin: 0, fontSize: 15, color: E.navy }}>Place on the document</h2>
          <p style={{ ...hintStyle, margin: 0 }}>Choose one, then press the page where it should go. Drag it to move it.</p>
          <div role="radiogroup" aria-label="What to place" style={{ display: "grid", gap: 8 }}>
            {tools.map(([key, label, Icon, usable]) => (
              <button
                key={key} type="button" role="radio" aria-checked={tool === key} disabled={!usable} data-testid={`place-${key}`} className="sp-tool" onClick={() => { setTool(key); }}
                style={{ ...GF, minHeight: 54, padding: "8px 12px", borderRadius: 10, cursor: usable ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 10,
                  border: `2px solid ${tool === key ? E.maroon : E.maroonLine}`, background: tool === key ? "#FFF7F8" : "#FFFFFF", color: E.ink, opacity: usable ? 1 : 0.6 }}
              >
                <Icon size={20} aria-hidden color={E.maroon} />
                <span style={{ display: "grid", fontSize: 14, fontWeight: 700 }}>{label}<small data-testid={`status-${key}`} style={{ fontWeight: 500, color: E.quiet }}>{summary(key)}</small></span>
              </button>
            ))}
          </div>
          {!hasSignature && (
            <p style={{ ...hintStyle, margin: 0 }}>
              You have not saved a signature picture, so none is drawn. <Link to="/app/enotary/seal" style={{ color: "inherit", fontWeight: 700 }}>Add my signature</Link>
            </p>
          )}
          <button type="button" onClick={() => { onChange(without(value, tool)); }} disabled={value[tool] === undefined} style={small}>
            <Trash2 size={14} aria-hidden /> Remove the {tool}
          </button>
          <button type="button" onClick={() => { onChange({}); }} disabled={value.seal === undefined && value.signature === undefined} style={small}>
            <RotateCcw size={14} aria-hidden /> Use the usual places
          </button>
          <p data-testid="placer-summary" style={{ ...hintStyle, margin: 0 }}>
            {value.seal === undefined ? "Seal: the usual place." : `Seal: page ${String(value.seal.page)}.`}{" "}
            {hasSignature ? (value.signature === undefined ? "Signature: the usual place." : `Signature: page ${String(value.signature.page)}.`) : ""}
          </p>
        </div>
      </aside>
      <div ref={holder} className="sp-pages">{pages}</div>
    </div>
  );
}
