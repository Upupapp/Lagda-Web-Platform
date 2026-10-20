// Where the notary's seal and signature go on the document: they open a page of it, press where each should sit, and can
// move it by pressing again or with the arrow keys, as fields are placed when a document is prepared. What is not placed
// goes to its usual place (the seal at the lower right of the last page, the signature beside it).
//
// The seal is drawn from the commission on the notary's application and the signature is the picture they saved, so this
// only says where; the server draws them. A marker shows the size and place they will have.

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Stamp, PenLine } from "lucide-react";
import { Link } from "react-router";
import { DocumentPageSurface, useRealDocument } from "../../../../components/pdf/DocumentPageSurface";
import { GF } from "../../../../components/system/design-system";
import { realEnotarySessionsService, type PagePoint } from "../../../../services/real/enotary-sessions.service";
import { E } from "../EnotaryChrome";
import { bodyText, hintStyle } from "../onramp-ui";

export interface Placements { seal?: PagePoint; signature?: PagePoint }

type Tool = "seal" | "signature";

/** The seal and the signature as the server draws them, in points of a page; the markers are scaled from these. */
const SEAL_POINTS = 124;
const SIGNATURE_W = 120;
const SIGNATURE_H = 44;
const STEP = 0.02;

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

export function SealPlacer({ sessionId, hasSignature, value, onChange, notaryName }: {
  sessionId: string; hasSignature: boolean; value: Placements; onChange: (next: Placements) => void; notaryName: string;
}) {
  const load = useCallback(() => realEnotarySessionsService.document(sessionId), [sessionId]);
  const state = useRealDocument(load);
  const [tool, setTool] = useState<Tool>("seal");
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(0);
  const holder = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = holder.current;
    if (element === null) return;
    const measure = () => { setWidth(Math.min(560, Math.floor(element.clientWidth))); };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { observer.disconnect(); };
  }, [state.status]);

  if (state.status === "loading" || state.status === "idle") return <p role="status" style={{ ...bodyText, margin: 0 }}>Opening the document…</p>;
  if (state.status === "error") {
    return <p data-testid="placer-unavailable" style={{ ...bodyText, margin: 0 }}>The pages could not be shown here. Your seal and signature will go at their usual place, lower right of the last page.</p>;
  }

  const size = state.pageSizes[page - 1] ?? state.pageSizes[0] ?? { width: 595, height: 842 };
  const height = width === 0 ? 0 : Math.round((width * size.height) / size.width);
  const current = value[tool];
  const scale = width === 0 ? 0 : width / size.width;

  const put = (point: { x: number; y: number }, which: Tool = tool) => { onChange({ ...value, [which]: { page, x: clamp(point.x), y: clamp(point.y) } }); };
  const press = (event: React.MouseEvent<HTMLDivElement>) => {
    const box = surface.current?.getBoundingClientRect();
    if (box === undefined || box.width === 0) return;
    put({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height });
  };
  const keys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const at = current !== undefined && current.page === page ? current : { x: 0.5, y: 0.5 };
    const moves: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    const move = moves[event.key];
    if (move !== undefined) { event.preventDefault(); put({ x: at.x + move[0], y: at.y + move[1] }); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); put(at); }
  };
  const marker = (which: Tool) => {
    const point = value[which];
    if (point === undefined || point.page !== page || scale === 0) return null;
    const w = (which === "seal" ? SEAL_POINTS : SIGNATURE_W) * scale;
    const h = (which === "seal" ? SEAL_POINTS : SIGNATURE_H) * scale;
    return (
      <div
        key={which} data-testid={`marker-${which}`} aria-hidden="true"
        style={{
          position: "absolute", left: `${String(point.x * 100)}%`, top: `${String(point.y * 100)}%`, width: w, height: h,
          transform: "translate(-50%, -50%)", display: "grid", placeItems: "center", pointerEvents: "none", textAlign: "center",
          fontFamily: "'Geist', sans-serif", fontSize: Math.max(8, 10 * scale * 1.6), fontWeight: 700, color: E.maroon,
          border: `2px ${which === "seal" ? "solid" : "dashed"} ${E.maroon}`, borderRadius: which === "seal" ? "999px" : 6,
          background: "rgba(194,24,91,0.08)", boxSizing: "border-box", overflow: "hidden", padding: 2,
        }}
      >
        {which === "seal" ? <span>NOTARY PUBLIC<br />{notaryName}</span> : <span>Signature</span>}
      </div>
    );
  };
  const tabs: [Tool, string, typeof Stamp, boolean][] = [["seal", "Place my seal", Stamp, true], ["signature", "Place my signature", PenLine, hasSignature]];

  return (
    <div data-testid="seal-placer">
      <p style={{ ...bodyText, margin: "0 0 8px" }}>
        Press on a page where the {tool} should go. Press again to move it. With the page selected, the arrow keys move it.
      </p>
      <div role="tablist" aria-label="What to place" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 10px" }}>
        {tabs.map(([key, label, Icon, usable]) => (
          <button
            key={key} type="button" role="tab" aria-selected={tool === key} disabled={!usable} data-testid={`place-${key}`} onClick={() => { setTool(key); }}
            style={{ ...GF, minHeight: 44, padding: "0 14px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: usable ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: 6,
              border: `2px solid ${tool === key ? E.maroon : E.maroonLine}`, background: tool === key ? "#FFF7F8" : "#FFFFFF", color: E.ink, opacity: usable ? 1 : 0.6 }}
          ><Icon size={16} aria-hidden /> {label}</button>
        ))}
      </div>
      {!hasSignature && (
        <p style={{ ...hintStyle, margin: "0 0 8px" }}>
          You have not saved a signature picture, so none is drawn. <Link to="/app/enotary/seal" style={{ color: "inherit", fontWeight: 700 }}>Add my signature</Link>
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px", flexWrap: "wrap" }}>
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => { setPage(page - 1); }} style={{ ...GF, minHeight: 40, minWidth: 40, borderRadius: 8, border: `1px solid ${E.line}`, background: "#FFFFFF", cursor: "pointer" }}><ChevronLeft size={18} aria-hidden /></button>
        <span data-testid="placer-page" style={{ ...GF, fontSize: 14, fontWeight: 700 }}>Page {page} of {state.pageCount}</span>
        <button type="button" aria-label="Next page" disabled={page >= state.pageCount} onClick={() => { setPage(page + 1); }} style={{ ...GF, minHeight: 40, minWidth: 40, borderRadius: 8, border: `1px solid ${E.line}`, background: "#FFFFFF", cursor: "pointer" }}><ChevronRight size={18} aria-hidden /></button>
        <button type="button" onClick={() => { onChange({}); }} disabled={value.seal === undefined && value.signature === undefined} style={{ ...GF, minHeight: 40, padding: "0 12px", borderRadius: 8, border: `1px solid ${E.line}`, background: "#FFFFFF", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <RotateCcw size={14} aria-hidden /> Use the usual place
        </button>
      </div>
      <div ref={holder} style={{ width: "100%" }}>
        <div
          ref={surface} role="button" tabIndex={0} aria-label={`Page ${String(page)} of the document. Press where the ${tool} should go.`} data-testid="placer-surface"
          onClick={press} onKeyDown={keys}
          style={{ position: "relative", width, height, margin: "0 auto", background: "#FFFFFF", border: `1px solid ${E.line}`, borderRadius: 4, cursor: "crosshair", boxShadow: "0 1px 6px rgba(10,26,43,0.12)" }}
        >
          {width > 0 && <DocumentPageSurface doc={state.doc} pageNumber={page} width={width} height={height} />}
          {marker("seal")}
          {marker("signature")}
        </div>
      </div>
      <p data-testid="placer-summary" style={{ ...hintStyle, margin: "8px 0 0" }}>
        {value.seal === undefined ? "Seal: the usual place." : `Seal: page ${String(value.seal.page)}.`}{" "}
        {hasSignature ? (value.signature === undefined ? "Signature: the usual place." : `Signature: page ${String(value.signature.page)}.`) : ""}
      </p>
    </div>
  );
}
