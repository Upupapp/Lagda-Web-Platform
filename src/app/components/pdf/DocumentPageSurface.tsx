// A real PDF page, drawn as a surface other things can be positioned on.
//
// ── Why this is loader-agnostic ────────────────────────────────────────────
//
// Two realms need it and they may not share a service. The sender's field
// editor fetches through the workspace API; the recipient ceremony fetches
// through `recipient-api-client`, and `RealSigningPage`'s header states the
// rule plainly: that page never imports anything from the sender/workspace
// realm. A component that knew how to fetch would force one of them to break
// that boundary.
//
// So the caller supplies `loadBlob` and this file imports no service at all.
//
// ── Why a canvas and not an iframe ─────────────────────────────────────────
//
// Both callers position absolutely-placed boxes over the page and need them to
// share its coordinate space — field boxes for the sender, fillable fields for
// the signer. A native PDF viewport scrolls and zooms on its own and would
// silently desynchronise from the overlay, putting every box somewhere other
// than where it appears to be.

import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Vite's `?url` import keeps the worker a real separate asset. Bundled into a
// chunk it fails to spawn, and pdf.js then renders nothing with no error.
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
 * Loads a document once and reports its real page count and page sizes.
 *
 * @param loadBlob  how to fetch the bytes. Identity matters: the effect
 *   re-runs when it changes, so callers should memoise it or the document
 *   reloads on every render.
 * @param enabled   `false` parks the hook in `idle` without fetching, for a
 *   caller that is not ready yet.
 */
export function useRealDocument(
  loadBlob: (() => Promise<Blob>) | null,
  enabled = true,
): RealDocumentState {
  const [state, setState] = useState<RealDocumentState>({ status: "idle" });

  useEffect(() => {
    if (!enabled || loadBlob === null) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    let loaded: pdfjsLib.PDFDocumentProxy | null = null;
    setState({ status: "loading" });

    void (async () => {
      try {
        const blob = await loadBlob();
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
                ? `This view displays PDF documents. This file is ${declaredType}.`
                : "This document could not be opened.",
            });
          }
          return;
        }
        if (cancelled) { void loaded.destroy(); return; }

        // Read up front, for every page. Callers shape their surfaces before
        // drawing, and a per-page async lookup during render would make pages
        // jump as each size arrived.
        const sizes: RealPageSize[] = [];
        for (let pageNumber = 1; pageNumber <= loaded.numPages; pageNumber++) {
          const page = await loaded.getPage(pageNumber);
          if (cancelled) return;
          // Scale 1 is CSS pixels at 72dpi and already accounts for any
          // /Rotate, so a landscape scan reports landscape.
          const viewport = page.getViewport({ scale: 1 });
          sizes.push({ width: viewport.width, height: viewport.height });
        }

        if (!cancelled) {
          setState({
            status: "ready", doc: loaded, pageCount: loaded.numPages, pageSizes: sizes,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "This document could not be loaded." });
        }
      }
    })();

    return () => {
      cancelled = true;
      void loaded?.destroy();
    };
  }, [loadBlob, enabled]);

  return state;
}

export interface DocumentPageSurfaceProps {
  readonly doc: pdfjsLib.PDFDocumentProxy;
  /** 1-based, as the whole preparation model is. */
  readonly pageNumber: number;
  /** CSS pixels. The canvas fills its parent box exactly. */
  readonly width: number;
  readonly height: number;
}

/**
 * Draws one page, filling its box exactly.
 *
 * "Exactly" is a requirement, not an aesthetic: overlays position boxes as
 * percentages of this same box, so a page drawn even slightly inset puts every
 * overlaid field a little off from where it appears.
 */
export function DocumentPageSurface({
  doc, pageNumber, width, height,
}: DocumentPageSurfaceProps) {
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
        // follows whatever box the caller decided on — including after a zoom
        // change or a resize.
        const base = page.getViewport({ scale: 1 });
        const ratio = Math.min(window.devicePixelRatio || 1, 3);
        const viewport = page.getViewport({ scale: (width / base.width) * ratio });

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        canvas.style.width = `${String(width)}px`;
        canvas.style.height = `${String(height)}px`;

        const context = canvas.getContext("2d");
        if (context === null) return;

        // A render in flight must be cancelled before another starts on the
        // same canvas, or pdf.js throws and leaves the page half-drawn.
        taskRef.current?.cancel();
        const task = page.render({ canvasContext: context, viewport });
        taskRef.current = task;
        await task.promise;
      } catch {
        // A cancelled render rejects, and cancellation is the NORMAL case
        // here — zoom, page and resize changes all cause one. The next render
        // replaces whatever is on the canvas.
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
        position: "absolute", inset: 0, width: "100%", height: "100%",
        // The overlay owns every pointer event. A canvas that swallowed them
        // would break click-to-place and field interaction.
        pointerEvents: "none",
      }}
    />
  );
}
