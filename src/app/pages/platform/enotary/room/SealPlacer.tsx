// 127. Where the notarial block goes on the document: one block carrying the notary's seal and signature with their name,
// commission and register place, placed once, at the size it will be printed. The tools are on the left, every page of
// the document in full in the middle. Press a page where the block should go; drag it, or use the arrow keys, to move it.
// Not placed, it goes across the foot of the last page. Or it goes on a page of its own, added at the end.
//
// The server draws the block from the notary's application, seal and signature picture; this says only where. The
// preview is drawn in the server's own measures, so what the notary sees is the size and place it will have.

import { useCallback, useEffect, useRef, useState } from "react";
import { FilePlus2, RotateCcw, Stamp } from "lucide-react";
import { Link } from "react-router";
import { DocumentPageSurface, useRealDocument } from "../../../../components/pdf/DocumentPageSurface";
import { GF } from "../../../../components/system/design-system";
import { realEnotarySessionsService, type BlockPlacements } from "../../../../services/real/enotary-sessions.service";
import { E } from "../EnotaryChrome";
import { bodyText, hintStyle } from "../onramp-ui";
import { NotarialBlockPreview, type BlockFacts } from "./NotarialBlockPreview";
import { A4_K, BLOCK_HEIGHT, BLOCK_WIDTH, blockBox, blockOf, blockWords, defaultBlockPoint } from "./notarial-block";

export type Placements = BlockPlacements;

const STEP = 0.02;
const MAX_WIDTH = 720;
const A4 = { width: 595.28, height: 841.89 };
/** The page added at the end, as the server lays it out (in points): its heading, its line, and the block under them. */
const ADDED = { left: 48 * A4_K, heading: 60 * A4_K, line: 78 * A4_K, blockTop: 116 * A4_K };

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const STYLES = `
  .sp-wrap { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 20px; align-items: start; }
  .sp-side { position: sticky; top: 76px; display: grid; gap: 12px; }
  .sp-pages { display: grid; gap: 18px; justify-items: center; padding: 18px 10px 30px; background: #E9EDF3; border: 1px solid ${E.line}; border-radius: 12px; min-width: 0; }
  .sp-block:focus-visible { outline: 3px solid ${E.sky}; outline-offset: 3px; }
  @media (max-width: 860px) { .sp-wrap { grid-template-columns: minmax(0, 1fr); } .sp-side { position: static; } }
`;

export function SealPlacer({ sessionId, hasSignature, value, onChange, facts }: {
  sessionId: string; hasSignature: boolean; value: Placements; onChange: (next: Placements) => void; facts: BlockFacts;
}) {
  const load = useCallback(() => realEnotarySessionsService.document(sessionId), [sessionId]);
  const state = useRealDocument(load);
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

  const ownPage = value.blockOwnPage === true;
  /** The block at `point` on `page`; a session's older seal and signature places give way to it. */
  const put = (page: number, point: { x: number; y: number }) => {
    onChange({ block: { page, x: clamp(point.x), y: clamp(point.y) }, ...(latest.current.blockOwnPage === true ? { blockOwnPage: true } : {}) });
  };
  const pointOn = (page: number, clientX: number, clientY: number): { x: number; y: number } | null => {
    const box = surfaces.current.get(page)?.getBoundingClientRect();
    if (box === undefined || box.width === 0) return null;
    return { x: (clientX - box.left) / box.width, y: (clientY - box.top) / box.height };
  };
  const drag = (page: number, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const move = (next: PointerEvent) => { const point = pointOn(page, next.clientX, next.clientY); if (point !== null) put(page, point); };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  const keys = (page: number, from: { x: number; y: number }, event: React.KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    const move = moves[event.key];
    if (move !== undefined) { event.preventDefault(); put(page, { x: from.x + move[0], y: from.y + move[1] }); }
    else if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); onChange(ownPage ? { blockOwnPage: true } : {}); }
  };

  const placed = blockOf(value);
  let pages: React.ReactNode;
  if (state.status === "loading" || state.status === "idle") pages = <p role="status" style={{ ...bodyText, margin: 0 }}>Opening the document…</p>;
  else if (state.status === "error") {
    pages = <p data-testid="placer-unavailable" style={{ ...bodyText, margin: 0 }}>The pages could not be shown here. Your notarial block will go across the foot of the last page.</p>;
  } else {
    const lastPage = state.pageCount;
    const surface = (page: number, size: { width: number; height: number }, added = false) => {
      const pageWidth = Math.min(width, Math.floor(width * Math.min(1, size.width / A4.width)));
      const pageHeight = pageWidth === 0 ? 0 : Math.round((pageWidth * size.height) / size.width);
      const scale = pageWidth === 0 ? 0 : pageWidth / size.width;
      // The block on this page: its own place, or (not placed) across the foot of the last page.
      const usual = placed === undefined && page === lastPage && !ownPage;
      const at = added ? null
        : ownPage ? null : placed !== undefined && placed.page === page ? placed : usual ? defaultBlockPoint(size.width, size.height) : null;
      const box = scale === 0 ? null
        : added ? { left: ADDED.left, top: ADDED.blockTop, width: BLOCK_WIDTH * A4_K, height: BLOCK_HEIGHT * A4_K }
          : at === null ? null : blockBox(at, size.width, size.height);
      return (
        <figure key={added ? "added" : page} style={{ margin: 0 }}>
          <div
            ref={element => { if (added) return; if (element === null) surfaces.current.delete(page); else surfaces.current.set(page, element); }}
            data-testid={added ? "placer-added-page" : `placer-surface-${String(page)}`} role="group"
            aria-label={added ? "The page added at the end, with the notarial block" : `Page ${String(page)} of ${String(lastPage)} of the document. Press where the notarial block should go.`}
            onClick={event => { if (added || ownPage) return; const point = pointOn(page, event.clientX, event.clientY); if (point !== null) put(page, point); }}
            style={{ position: "relative", width: pageWidth, height: pageHeight, background: "#FFFFFF", cursor: added || ownPage ? "default" : "crosshair", boxShadow: "0 2px 14px rgba(10,26,43,0.18)" }}
          >
            {pageWidth > 0 && !added && <DocumentPageSurface doc={state.doc} pageNumber={page} width={pageWidth} height={pageHeight} />}
            {added && pageWidth > 0 && (
              <div style={{ ...GF, position: "absolute", left: ADDED.left * scale, right: ADDED.left * scale, top: ADDED.heading * scale }}>
                <p style={{ margin: 0, fontSize: 9 * A4_K * scale, lineHeight: 1.3, fontWeight: 800, letterSpacing: "0.18em", color: E.maroon }}>NOTARIAL BLOCK</p>
                <p style={{ margin: `${String((ADDED.line - ADDED.heading - 9 * A4_K * 1.3) * scale)}px 0 0`, fontSize: 10.5 * A4_K * scale, lineHeight: 1.4, color: E.text }}>
                  This page completes the notarized document, with its register entry.
                </p>
              </div>
            )}
            {box !== null && (added || at !== null) && (
              <div
                className="sp-block" data-testid={added ? "added-block" : usual ? "marker-block-usual" : "marker-block"} role={added ? undefined : "button"} tabIndex={added ? undefined : 0}
                aria-label={added ? undefined : usual ? "The notarial block, across the foot of the last page. Drag it to place it, or press a page." : `The notarial block, on page ${String(page)}. Drag it, or use the arrow keys.`}
                onPointerDown={added ? undefined : event => { drag(page, event); }}
                onKeyDown={added || at === null ? undefined : event => { keys(page, at, event); }}
                onClick={event => { event.stopPropagation(); }}
                style={{ position: "absolute", left: box.left * scale, top: box.top * scale, cursor: added ? "default" : "grab", touchAction: "none" }}
              >
                <NotarialBlockPreview facts={facts} width={box.width * scale} ghost={usual} />
                {usual && <span style={{ ...GF, position: "absolute", right: 6, top: -20, fontSize: 11, fontWeight: 700, color: E.maroon, background: "#FFFFFF", borderRadius: 6, padding: "1px 6px", boxShadow: "0 1px 4px rgba(10,26,43,0.15)" }}>Default place</span>}
              </div>
            )}
          </div>
          <figcaption data-testid={added ? "placer-added-caption" : "placer-page"} style={{ ...GF, textAlign: "center", fontSize: 13, color: added ? E.maroon : E.quiet, fontWeight: added ? 700 : 400, marginTop: 6 }}>
            {added ? `Page ${String(lastPage + 1)}, added: the notarial block` : `Page ${String(page)} of ${String(lastPage)}`}
          </figcaption>
        </figure>
      );
    };
    pages = [
      ...Array.from({ length: lastPage }, (_, index) => surface(index + 1, state.pageSizes[index] ?? state.pageSizes[0] ?? A4)),
      ...(ownPage ? [surface(lastPage + 1, A4, true)] : []),
    ];
  }

  const small = { ...GF, minHeight: 40, padding: "0 12px", borderRadius: 8, border: `1px solid ${E.line}`, background: "#FFFFFF", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 } as const;
  return (
    <div data-testid="seal-placer" className="sp-wrap">
      <style>{STYLES}</style>
      <aside className="sp-side" aria-label="Notarial block">
        <div style={{ background: "#FFFFFF", border: `1px solid ${E.line}`, borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <h2 style={{ ...GF, margin: 0, fontSize: 15, color: E.navy, display: "flex", alignItems: "center", gap: 8 }}><Stamp size={18} aria-hidden color={E.maroon} /> Notarial block</h2>
          <p style={{ ...hintStyle, margin: 0 }}>
            Your seal and signature go in one block, with your name, commission and register entry, at the size shown. Press the page where it should go, then drag it to move it.
          </p>
          <p data-testid="status-block" style={{ ...GF, margin: 0, fontSize: 14, fontWeight: 700, color: E.ink }}>{blockWords(value)}</p>
          <label style={{ ...GF, display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `2px solid ${ownPage ? E.maroon : E.maroonLine}`, background: ownPage ? "#FFF7F8" : "#FFFFFF", fontSize: 14 }}>
            <input
              type="checkbox" data-testid="block-own-page" checked={ownPage} style={{ width: 18, height: 18, marginTop: 1, accentColor: E.maroon }}
              onChange={event => { const block = latest.current.block; onChange({ ...(block === undefined ? {} : { block }), ...(event.target.checked ? { blockOwnPage: true } : {}) }); }}
            />
            <span><strong style={{ display: "flex", alignItems: "center", gap: 6 }}><FilePlus2 size={15} aria-hidden style={{ flex: "0 0 auto" }} /> Put the notarial block on its own page at the end</strong>
              <span style={{ fontSize: 12.5, color: E.quiet }}>For a document with no room for it. The client&rsquo;s pages keep only the small footer.</span></span>
          </label>
          {!hasSignature && (
            <p style={{ ...hintStyle, margin: 0 }}>
              You have not saved a signature picture, so the block shows none. <Link to="/app/enotary/seal" style={{ color: "inherit", fontWeight: 700 }}>Add my signature</Link>
            </p>
          )}
          <button type="button" data-testid="block-default" onClick={() => { onChange({}); }} disabled={value.block === undefined && value.seal === undefined && !ownPage} style={small}>
            <RotateCcw size={14} aria-hidden /> Use the default place
          </button>
          <p data-testid="placer-summary" style={{ ...hintStyle, margin: 0 }}>The default place is across the foot of the last page.</p>
        </div>
      </aside>
      <div ref={holder} className="sp-pages">{pages}</div>
    </div>
  );
}
