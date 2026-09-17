// The "Digital Document Archive" viewer.
//
// Opens the ACTUAL uploaded PDF bytes (never a thumbnail, mock, or
// simplified preview) in a dedicated full-screen reading surface, rendered
// page-by-page with pdf.js directly onto <canvas> elements — the same
// approach a native PDF reader uses, so layout, typography, images, tables
// and page dimensions come through exactly as authored. An <iframe> (the
// browser's built-in PDF viewer) was deliberately rejected here: it cannot
// be given custom archive-styled chrome, its zoom/scroll behavior differs
// per browser, and it cannot report page boundaries for a page counter.
//
// Data path: unchanged from the existing pipeline.
// realSigningRequestService.documentContentBlob() already hits the real
// GET /workspaces/:id/documents/:id/content route (Lagda-Backend) and
// resolves to a Blob of the actual stored artifact — this component owns
// only the rendering, not retrieval.
//
// Large documents (LAGDA accepts up to UPLOAD_MAX_PAGES = 2000): page
// geometry for every page is fetched up front (cheap — pdf.js parses each
// page's dictionary, not its content stream) so the scroll container has an
// accurate height from the first frame. Actual pixel rendering happens only
// for pages within an IntersectionObserver window around the viewport, and
// canvases that scroll far away are cleared back to a placeholder — so
// memory stays bounded regardless of document length.

import {
  useState, useEffect, useRef, useCallback, useMemo, type CSSProperties,
} from "react";
import {
  X, ChevronLeft, ZoomIn, ZoomOut, Maximize2, AlertCircle, FileText,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Z } from "../../utils/z-index";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const SERIF: CSSProperties = { fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" };

// ── Archive palette ───────────────────────────────────────────────────────
// Distinct from the rest of the platform's white/azure SaaS surfaces on
// purpose: a warm, dim reading-room backdrop and a lit paper surface, so
// opening a document reads as "an archive record", not "another dialog".
const INK        = "#12100D";
const INK_PANEL  = "#1B1815";
const PAPER_WELL = "#2A2620";
const PAPER      = "#FBF9F4";
const PAPER_EDGE = "#E4DFD2";
const GOLD       = "#C9A15A";
const CREAM_DIM  = "#B9B2A1";
const CREAM      = "#EDE8DC";
const DANGER     = "#E27D6B";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const RENDER_MARGIN = "1200px 0px";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; doc: pdfjsLib.PDFDocumentProxy; pageSizes: { width: number; height: number }[] };

export interface DocumentArchiveViewerProps {
  title: string;
  /** Resolves the actual stored bytes. Called once per open. */
  loadBlob: () => Promise<Blob>;
  onClose: () => void;
}

/** True once the browser's viewport is at or below the phone breakpoint the
 *  rest of the platform already uses for collapsing chrome (DocumentsPage's
 *  own `@media (max-width: 767px)`). */
function useIsCompact(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 767,
  );
  useEffect(() => {
    function onResize() { setCompact(window.innerWidth <= 767); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return compact;
}

/** One page: a placeholder box at its true aspect ratio until it scrolls
 *  near the viewport, then a rendered canvas, then cleared back to a
 *  placeholder once it scrolls far away — bounded memory for long
 *  documents without ever showing the wrong page size. */
function ArchivePage({
  doc, pageNumber, naturalSize, containerWidth, zoom, isCompact,
}: {
  doc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  naturalSize: { width: number; height: number };
  containerWidth: number;
  zoom: number;
  isCompact: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Fit-width base scale, independent of the aspect ratio of the viewport
  // itself — a landscape page and a portrait page both fill the same
  // available width, never stretched, never cropped.
  const sidePadding = isCompact ? 12 : 0;
  const targetCssWidth = Math.max(1, containerWidth - sidePadding * 2);
  const baseScale = targetCssWidth / naturalSize.width;
  const scale = baseScale * zoom;
  const cssWidth = naturalSize.width * scale;
  const cssHeight = naturalSize.height * scale;

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { for (const entry of entries) setVisible(entry.isIntersecting); },
      { rootMargin: RENDER_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) {
      // Scrolled far away: release the bitmap, keep the placeholder's exact
      // footprint so the scrollbar never jumps.
      renderTaskRef.current?.cancel();
      setRendered(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * outputScale });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      try {
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch {
        // Cancelled render (page scrolled away mid-draw) — not an error.
      }
    })();

    return () => { cancelled = true; renderTaskRef.current?.cancel(); };
    // `cssWidth`/`cssHeight` are derived from `scale`; re-running on scale
    // change is the point (zoom must re-render at the new resolution).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, doc, pageNumber, scale]);

  return (
    <div
      ref={wrapperRef}
      data-page-number={pageNumber}
      style={{
        width: cssWidth, height: cssHeight, margin: "0 auto 20px",
        position: "relative", background: PAPER,
        boxShadow: "0 1px 2px rgba(0,0,0,0.4), 0 12px 28px rgba(0,0,0,0.35)",
        border: `1px solid ${PAPER_EDGE}`,
      }}
    >
      {/* ALWAYS mounted, never gated on `rendered`.
          pdf.js draws into this element, so the element has to exist before
          the draw can start. Gating it on the flag the draw itself sets is a
          deadlock: the effect reads `canvasRef.current`, finds null because
          the canvas was not mounted, returns early, and therefore never sets
          the flag that would have mounted it — so every page stayed blank.
          `rendered` now controls only the overlay on top. */}
      <canvas
        ref={canvasRef}
        style={{
          display: "block", width: cssWidth, height: cssHeight,
          // Hidden until there are real pixels in it, so a half-drawn or
          // stale bitmap never flashes at the reader.
          visibility: rendered ? "visible" : "hidden",
        }}
      />
      {!rendered && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", color: "#B8B2A2", fontSize: 12, ...GF,
        }}>
          {visible ? "Rendering…" : ""}
        </div>
      )}
      <div style={{
        position: "absolute", bottom: 8, right: 10, fontSize: 10, color: "#A8A190",
        background: "rgba(255,255,255,0.75)", padding: "1px 6px", borderRadius: 3, ...GF,
      }}>
        {pageNumber}
      </div>
    </div>
  );
}

export function DocumentArchiveViewer({ title, loadBlob, onClose }: DocumentArchiveViewerProps) {
  const isCompact = useIsCompact();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Body-scroll lock, same convention as ConfirmDialog/MobileNav/CommandPalette.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let doc: pdfjsLib.PDFDocumentProxy | null = null;
    void (async () => {
      try {
        const blob = await loadBlob();
        if (cancelled) return;

        // The BYTES decide, not the declared type. A proxy that rewrites or
        // drops `Content-Type` would otherwise make a perfectly renderable
        // document unopenable, so an unexpected type is a reason to warn
        // after failing, never a reason not to try.
        const declaredType = blob.type;
        const data = await blob.arrayBuffer();
        if (cancelled) return;
        try {
          doc = await pdfjsLib.getDocument({ data }).promise;
        } catch {
          // Only now is the declared type worth reporting: it turns "this is
          // broken" into "this is a .docx, which this viewer cannot draw".
          // Returning rather than rethrowing, so the outer handler does not
          // replace this specific explanation with its generic one.
          if (!cancelled) {
            setState({
              status: "error",
              message: declaredType !== "" && declaredType !== "application/pdf"
                ? `This viewer displays PDF documents. This file is ${declaredType}, which it cannot draw.`
                : "This document could not be opened. It may be damaged or still processing.",
            });
          }
          return;
        }
        if (cancelled) { void doc.destroy(); return; }

        // Geometry for every page, up front — cheap (page dictionary only,
        // no content-stream decode), and it makes the scrollbar accurate
        // from the very first frame instead of jumping as pages render.
        const pageSizes: { width: number; height: number }[] = [];
        for (let n = 1; n <= doc.numPages; n += 1) {
          const page = await doc.getPage(n);
          const viewport = page.getViewport({ scale: 1 });
          pageSizes.push({ width: viewport.width, height: viewport.height });
        }
        if (cancelled) { void doc.destroy(); return; }
        setState({ status: "ready", doc, pageSizes });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "This document could not be opened. It may be damaged or still processing." });
        }
      }
    })();
    return () => { cancelled = true; if (doc) void doc.destroy(); };
    // `loadBlob` is expected stable for the viewer's lifetime (identity tied
    // to the document being viewed, not to render count).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function measure() { if (el) setContainerWidth(el.clientWidth); }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [state.status]);

  const pageWidth = useMemo(() => {
    const maxReadableWidth = isCompact ? containerWidth : Math.min(containerWidth, 860);
    return Math.max(1, maxReadableWidth);
  }, [containerWidth, isCompact]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const containerTop = el.getBoundingClientRect().top;
    let closest = 1;
    let closestDistance = Infinity;
    for (const node of el.querySelectorAll<HTMLElement>("[data-page-number]")) {
      const distance = Math.abs(node.getBoundingClientRect().top - containerTop);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = Number(node.dataset.pageNumber);
      }
    }
    setCurrentPage(closest);
  }, []);

  const zoomIn = useCallback(() => setZoom(z => Math.min(MAX_SCALE, +(z + 0.2).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(MIN_SCALE, +(z - 0.2).toFixed(2))), []);
  const zoomReset = useCallback(() => setZoom(1), []);

  const numPages = state.status === "ready" ? state.doc.numPages : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal,
        background: `radial-gradient(ellipse at 50% 0%, ${INK_PANEL} 0%, ${INK} 70%)`,
        display: "flex", flexDirection: "column",
      }}
    >
      {/* ── Toolbar — an archive record label, not a generic modal header ── */}
      <div
        style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 12,
          padding: isCompact ? "10px 12px" : "12px 20px",
          background: INK_PANEL, borderBottom: `1px solid rgba(201,161,90,0.25)`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close document"
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none",
            border: "none", cursor: "pointer", color: CREAM, padding: "6px 8px",
            borderRadius: 6, flexShrink: 0,
          }}
        >
          <ChevronLeft size={18} aria-hidden />
          {!isCompact && <span style={{ fontSize: 13, ...GF }}>Documents</span>}
        </button>

        <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            title={title}
            style={{
              fontSize: isCompact ? 13 : 14, fontWeight: 600, color: CREAM,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...SERIF,
            }}
          >
            {title}
          </div>
          {state.status === "ready" && (
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: "0.06em", textTransform: "uppercase", ...GF, marginTop: 1 }}>
              Page {currentPage} of {numPages}
            </div>
          )}
        </div>

        {state.status === "ready" && !isCompact && (
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <button onClick={zoomOut} aria-label="Zoom out" disabled={zoom <= MIN_SCALE}
              style={iconButtonStyle(zoom <= MIN_SCALE)}>
              <ZoomOut size={16} aria-hidden />
            </button>
            <span style={{ fontSize: 12, color: CREAM_DIM, width: 42, textAlign: "center", ...GF }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={zoomIn} aria-label="Zoom in" disabled={zoom >= MAX_SCALE}
              style={iconButtonStyle(zoom >= MAX_SCALE)}>
              <ZoomIn size={16} aria-hidden />
            </button>
            <button onClick={zoomReset} aria-label="Reset zoom to fit width" style={iconButtonStyle(false)}>
              <Maximize2 size={15} aria-hidden />
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, background: "none", border: "none",
            cursor: "pointer", color: CREAM_DIM, borderRadius: 6, flexShrink: 0,
          }}
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      {/* ── The reading surface ── */}
      <div
        ref={scrollRef}
        onScroll={state.status === "ready" ? handleScroll : undefined}
        style={{
          flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
          background: PAPER_WELL,
          padding: isCompact ? "16px 0 28px" : "32px 24px 40px",
        }}
      >
        {state.status === "loading" && (
          <div style={centerMessageStyle}>
            <FileText size={32} color={GOLD} aria-hidden />
            <p style={{ color: CREAM_DIM, fontSize: 13, marginTop: 12, ...GF }}>Opening document…</p>
          </div>
        )}

        {state.status === "error" && (
          <div style={centerMessageStyle}>
            <AlertCircle size={32} color={DANGER} aria-hidden />
            <p style={{ color: CREAM, fontSize: 14, marginTop: 12, maxWidth: 360, textAlign: "center", ...GF }}>
              {state.message}
            </p>
          </div>
        )}

        {state.status === "ready" && containerWidth > 0 && (
          <div style={{ width: pageWidth, margin: "0 auto" }}>
            {state.pageSizes.map((size, i) => (
              <ArchivePage
                key={i + 1}
                doc={state.doc}
                pageNumber={i + 1}
                naturalSize={size}
                containerWidth={pageWidth}
                zoom={zoom}
                isCompact={isCompact}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Compact-screen zoom, collapsed off the main toolbar ── */}
      {state.status === "ready" && isCompact && (
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          padding: "8px 12px", background: INK_PANEL, borderTop: "1px solid rgba(201,161,90,0.2)",
        }}>
          <button onClick={zoomOut} aria-label="Zoom out" disabled={zoom <= MIN_SCALE} style={iconButtonStyle(zoom <= MIN_SCALE)}>
            <ZoomOut size={16} aria-hidden />
          </button>
          <span style={{ fontSize: 11, color: CREAM_DIM, width: 38, textAlign: "center", ...GF }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={zoomIn} aria-label="Zoom in" disabled={zoom >= MAX_SCALE} style={iconButtonStyle(zoom >= MAX_SCALE)}>
            <ZoomIn size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

const centerMessageStyle: CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  minHeight: "50vh",
};

function iconButtonStyle(disabled: boolean): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, background: "none", border: "none",
    cursor: disabled ? "default" : "pointer", color: disabled ? "#5C584E" : CREAM_DIM,
    borderRadius: 6, opacity: disabled ? 0.5 : 1,
  };
}
