// The REAL uploaded document, behind the field-placement canvas.
//
// ── Why this exists ────────────────────────────────────────────────────────
//
// The field editor drew `FictionPagePreview` — grey placeholder bars — and
// three things followed from that, none of them cosmetic:
//
//   1. You cannot aim. A signature is placed on a signature LINE, and there
//      was no line to place it on.
//   2. The page COUNT was invented (`derivePageCount`, an index into a
//      hardcoded array), so a field could be placed on a page the document
//      does not have. The backend validates `pageNumber` against the
//      artifact's real page count and refuses the save — correctly, but the
//      editor had already shown the page, so the refusal arrived as an
//      unexplained error.
//   3. The page SHAPE was assumed A4 (595x842, ratio 1.415). On US Letter
//      (612x792, ratio 1.294) every normalised `y` is off by about 9% of page
//      height — no error, just a signature in the wrong place.
//
// Fields are stored as normalised 0-1 rects, which is the right contract. The
// bug was never the coordinates; it was the surface they were measured
// against. So this renders the real page at the real aspect ratio and the
// rest of the editor is left alone.
//
// ── Rendering, not embedding ───────────────────────────────────────────────
//
// pdf.js to a canvas rather than an `<iframe>` or `<embed>`, for the same
// reason `DocumentArchiveViewer` does it: the page has to sit UNDER absolutely
// positioned, draggable field boxes and share a coordinate space with them. A
// native PDF viewport scrolls and zooms independently and would silently
// desynchronise from the overlay.

import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { realSigningRequestService } from "../../services/real/signing-request.service";

// Same worker wiring as the archive viewer. Vite's `?url` import is what keeps
// the worker a real separate asset rather than something bundled into the main
// chunk and then failing to spawn.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface RealPageSize {
  readonly width: number;
  readonly height: number;
}

export type RealDocumentState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly doc: pdfjsLib.PDFDocumentProxy;
      readonly pageCount: number;
      readonly pageSizes: readonly RealPageSize[];
    }
  | { readonly status: "error"; readonly message: string };

/**
 * Loads the real document once per (workspace, document).
 *
 * Returns page COUNT and per-page SIZES as well as the proxy, because the
 * editor needs all three: the count to build its page list, the sizes to shape
 * each page, and the proxy to draw.
 */
export function useRealDocument(
  workspaceId: string | null,
  documentId: string | null,
): RealDocumentState {
  const [state, setState] = useState<RealDocumentState>({ status: "idle" });

  useEffect(() => {
    if (workspaceId === null || documentId === null) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    let loaded: pdfjsLib.PDFDocumentProxy | null = null;
    setState({ status: "loading" });

    void (async () => {
      try {
        const blob = await realSigningRequestService.documentContentBlob(
          workspaceId, documentId);
        if (cancelled) return;

        // The BYTES decide, not the declared type — a proxy that rewrites
        // `Content-Type` must not make a renderable document unopenable.
        const declaredType = blob.type;
        const data = await blob.arrayBuffer();
        if (cancelled) return;

        try {
          loaded = await pdfjsLib.getDocument({ data }).promise;
        } catch {
          if (!cancelled) {
            setState({
              status: "error",
              message: declaredType !== "" && declaredType !== "application/pdf"
                ? `Field placement needs a PDF. This document is ${declaredType}.`
                : "This document could not be opened for field placement.",
            });
          }
          return;
        }
        if (cancelled) { void loaded.destroy(); return; }

        // Sizes are read UP FRONT, for every page. The editor shapes its
        // canvas before it draws, and a per-page async lookup during render
        // would make the page jump as each size arrived.
        const sizes: RealPageSize[] = [];
        for (let pageNumber = 1; pageNumber <= loaded.numPages; pageNumber++) {
          const page = await loaded.getPage(pageNumber);
          if (cancelled) return;
          // Scale 1 gives CSS-pixel dimensions at 72dpi, already accounting for
          // any /Rotate on the page — so a landscape scan reports landscape.
          const viewport = page.getViewport({ scale: 1 });
          sizes.push({ width: viewport.width, height: viewport.height });
        }

        if (!cancelled) {
          setState({
            status: "ready",
            doc: loaded,
            pageCount: loaded.numPages,
            pageSizes: sizes,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "This document could not be loaded for field placement.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      void loaded?.destroy();
    };
  }, [workspaceId, documentId]);

  return state;
}

export interface RealDocumentPageProps {
  readonly doc: pdfjsLib.PDFDocumentProxy;
  /** 1-based, as everything else in the preparation model is. */
  readonly pageNumber: number;
  /** CSS pixels. The canvas fills its parent exactly. */
  readonly width: number;
  readonly height: number;
}

/**
 * Draws one page, filling the placement surface exactly.
 *
 * "Exactly" is the requirement, not an aesthetic: the field overlay positions
 * boxes as percentages of this same box, so a page drawn even slightly inset
 * would put every field a little off from where it appears to be.
 */
export function RealDocumentPage({
  doc, pageNumber, width, height,
}: RealDocumentPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const taskRef = useRef<pdfjsLib.RenderTask | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || width <= 0 || height <= 0) return;

    let cancelled = false;

    void (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;

        // Scaled to the TARGET WIDTH rather than a fixed zoom, so the drawing
        // matches whatever box the editor has decided on — including after a
        // zoom change or a resize.
        const base = page.getViewport({ scale: 1 });
        const ratio = Math.min(window.devicePixelRatio || 1, 3);
        const viewport = page.getViewport({ scale: (width / base.width) * ratio });

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        canvas.style.width = `${String(width)}px`;
        canvas.style.height = `${String(height)}px`;

        const context = canvas.getContext("2d");
        if (context === null) return;

        // A render already in flight must be cancelled before another starts
        // on the same canvas, or pdf.js throws and the page is left half-drawn.
        taskRef.current?.cancel();
        const task = page.render({ canvasContext: context, viewport });
        taskRef.current = task;
        await task.promise;
      } catch {
        // A cancelled render rejects, and a cancelled render is the normal
        // case here — zoom and page changes both cause one. Nothing to report:
        // the next render replaces whatever is on the canvas.
      }
    })();

    return () => {
      cancelled = true;
      taskRef.current?.cancel();
    };
  }, [doc, pageNumber, width, height]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        // The overlay owns every pointer event. A canvas that swallowed them
        // would break click-to-place and field dragging.
        pointerEvents: "none",
      }}
    />
  );
}
