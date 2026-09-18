// Capturing a signature or initials, for the REAL signing ceremony.
//
// ── What the backend accepts, and why this file mirrors it exactly ─────────
//
// `SignatureRepresentationSchema` is a union of two members and nothing else:
//
//   { method: "typed", text, styleIndex }   text plus a server-known style
//   { method: "drawn", base64 }             a PNG, RAW base64
//
// "Upload" is not a third member — an uploaded image is a `drawn` signature
// whose pixels came from a file instead of a pointer. Treating it as its own
// wire shape would invent a contract the server does not have.
//
// The base64 carries NO `data:` prefix. The server's pattern is
// `^[A-Za-z0-9+/]+={0,2}$`, which REFUSES a prefixed payload outright rather
// than stripping it — the prefix is transport formatting and proves nothing
// about content. So every path here strips it before the value leaves.
//
// ── Why the limits are duplicated here ────────────────────────────────────
//
// They are the server's, restated, because this is a separate repository and
// cannot import the contract. That duplication is a real risk and is handled
// the only honest way available: the numbers are derived the same way the
// server derives them, named the same, and a value over budget is DOWNSCALED
// here rather than sent and refused. If they ever drift, the failure is a
// rejected submission rather than a corrupted one.
//
// ── Why there is no style picker ──────────────────────────────────────────
//
// `styleIndex` accepts 0-3 and the renderer draws all four IDENTICALLY:
// `faceFor()` returns the italic face for every signature regardless. Offering
// four styles would be a control that changes nothing about the document — so
// the typed mode sends style 0 and says nothing about styles. A picker becomes
// honest the day the merger renders them differently, and not before.

import React, { useCallback, useEffect, useRef, useState } from "react";

// ── The server's bounds, restated ──────────────────────────────────────────
/** `RASTER_SIGNATURE_MAX_BYTES` — 64 KiB of decoded PNG. */
const MAX_BYTES = 64 * 1024;
/** `RASTER_SIGNATURE_MAX_DIMENSION` — longest side, in pixels. */
const MAX_DIMENSION = 512;
/** `RASTER_SIGNATURE_MAX_TRANSPORT_CHARS` — base64 inflates by 4/3. */
const MAX_TRANSPORT_CHARS = Math.ceil((MAX_BYTES * 4) / 3) + 128;
/** `TYPED_SIGNATURE_MAX_LENGTH`. */
const MAX_TYPED_LENGTH = 200;

/**
 * The only style the renderer distinguishes. See the header.
 */
const ONLY_STYLE_INDEX = 0;

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SILVER = "#8A9BAE";
const BORDER = "#D1D9E0";

export type SignatureValue =
  | { method: "typed"; text: string; styleIndex: number }
  | { method: "drawn"; base64: string };

type Mode = "draw" | "type" | "upload";

export interface SignatureCaptureProps {
  /** Shown above the control, e.g. "Signature (required)". */
  readonly label: string;
  /** Changes wording only. Both purposes use the identical wire shape. */
  readonly purpose: "signature" | "initials";
  readonly value: SignatureValue | null;
  readonly onChange: (value: SignatureValue | null) => void;
  readonly disabled?: boolean;
}

// ── Raster helpers ───────────────────────────────────────────────────────────

/** Strips the `data:` prefix a canvas or FileReader produces. */
function rawBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

/**
 * Crops transparent margins and scales to fit the server's bounds.
 *
 * Trimming matters for more than tidiness: an untrimmed 420x120 canvas with a
 * small signature in the middle is mostly empty pixels, and the merge scales
 * the whole raster into the field box — so the visible mark would render
 * tiny. Cropping to the ink makes the drawn size match the field.
 *
 * Returns `null` when the canvas holds no ink at all, which is how an
 * untouched pad is distinguished from a deliberate mark.
 */
function trimmedPng(source: HTMLCanvasElement): string | null {
  const context = source.getContext("2d");
  if (context === null) return null;

  const { width, height } = source;
  if (width === 0 || height === 0) return null;

  const { data } = context.getImageData(0, 0, width, height);
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Alpha only. The stroke colour is ours, so anything non-transparent is
      // ink by definition.
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) return null;

  // A couple of pixels of breathing room, clamped to the canvas.
  const pad = 4;
  const cropX = Math.max(0, left - pad);
  const cropY = Math.max(0, top - pad);
  const cropW = Math.min(width, right + pad) - cropX + 1;
  const cropH = Math.min(height, bottom + pad) - cropY + 1;

  let scale = Math.min(1, MAX_DIMENSION / Math.max(cropW, cropH));
  for (let attempt = 0; attempt < 6; attempt++) {
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(cropW * scale));
    out.height = Math.max(1, Math.round(cropH * scale));
    const outContext = out.getContext("2d");
    if (outContext === null) return null;
    outContext.drawImage(
      source, cropX, cropY, cropW, cropH, 0, 0, out.width, out.height);

    const base64 = rawBase64(out.toDataURL("image/png"));
    // Checked against the TRANSPORT bound, which is what the server checks
    // first — before decoding, so an over-budget payload never reaches the
    // decoder. Downscaling here means a large signature is accepted rather
    // than refused.
    if (base64.length <= MAX_TRANSPORT_CHARS) return base64;
    scale *= 0.75;
  }
  return null;
}

/** Re-encodes an uploaded image as a bounded PNG. */
async function pngFromFile(file: File): Promise<string | null> {
  const dataUrl = await new Promise<string | null>(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
  if (dataUrl === null) return null;

  const image = await new Promise<HTMLImageElement | null>(resolve => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => resolve(null);
    element.src = dataUrl;
  });
  if (image === null || image.width === 0 || image.height === 0) return null;

  // Drawn onto a canvas rather than forwarded as-is. Re-encoding is what
  // guarantees the bytes are a PNG the server's magic-byte check will accept,
  // whatever the file claimed to be, and it drops any metadata the original
  // carried — a photo of a signature should not ship its GPS tags.
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (context === null) return null;
  context.drawImage(image, 0, 0);

  return trimmedPng(canvas);
}

// ── The component ────────────────────────────────────────────────────────────

export function SignatureCapture({
  label, purpose, value, onChange, disabled = false,
}: SignatureCaptureProps) {
  const [mode, setMode] = useState<Mode>("draw");
  const [typed, setTyped] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);

  const noun = purpose === "initials" ? "initials" : "signature";

  // ── Canvas sizing ─────────────────────────────────────────────────────────
  //
  // The backing store is sized to the element's CSS box times the device pixel
  // ratio, so strokes are crisp on a phone rather than upscaled and soft. It is
  // re-measured on resize because the ceremony is used at 320px and on
  // rotation, and a canvas that kept its first size would stretch its contents.
  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (canvas === null || wrap === null) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const cssWidth = wrap.clientWidth;
    const cssHeight = 150;
    const nextWidth = Math.round(cssWidth * ratio);
    const nextHeight = Math.round(cssHeight * ratio);
    if (canvas.width === nextWidth && canvas.height === nextHeight) return;

    // Resizing clears the canvas, so any existing mark is discarded and the
    // value goes with it. Silently keeping a stale value while showing a blank
    // pad would let a signer submit a mark they can no longer see.
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    canvas.style.height = `${String(cssHeight)}px`;
    const context = canvas.getContext("2d");
    if (context !== null) {
      context.scale(ratio, ratio);
      context.lineWidth = 2.2;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = NAVY;
    }
    setHasInk(false);
  }, []);

  useEffect(() => {
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);
    return () => { window.removeEventListener("resize", sizeCanvas); };
  }, [sizeCanvas, mode]);

  // ── Drawing ───────────────────────────────────────────────────────────────

  const pointAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas === null) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const context = canvasRef.current?.getContext("2d");
    const point = pointAt(event);
    if (context === undefined || context === null || point === null) return;

    // Capture so a stroke that leaves the pad still ends cleanly on release,
    // rather than staying "down" and resuming when the pointer returns.
    //
    // Guarded: capture throws for a pointer id the browser has already
    // released, and a signature pad that breaks on a stray event is worse than
    // one that draws without capture. The stroke still works either way —
    // `onPointerUp` and `onPointerCancel` both end it.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Not fatal. Drawing continues uncaptured.
    }
    drawing.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
    // A tap with no movement is a legitimate mark (a dot), so ink is recorded
    // on DOWN rather than on the first move.
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasInk(true);
  };

  const extendStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    const point = pointAt(event);
    if (context === undefined || context === null || point === null) return;
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const endStroke = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const base64 = trimmedPng(canvas);
    onChange(base64 === null ? null : { method: "drawn", base64 });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas === null || context === undefined || context === null) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  };

  // ── Mode switching ────────────────────────────────────────────────────────
  //
  // Switching CLEARS the value. Carrying a drawn mark into typed mode would
  // submit something the signer is no longer looking at, and the adopted
  // representation is meant to be the one they last saw and approved.
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setUploadError(null);
    setTyped("");
    setHasInk(false);
    onChange(null);
  };

  const onTyped = (text: string) => {
    setTyped(text);
    const trimmed = text.trim();
    onChange(trimmed.length === 0
      ? null
      : { method: "typed", text: trimmed, styleIndex: ONLY_STYLE_INDEX });
  };

  const onUpload = async (file: File | undefined) => {
    setUploadError(null);
    if (file === undefined) return;
    const base64 = await pngFromFile(file);
    if (base64 === null) {
      setUploadError("That image could not be read. Try a PNG or JPEG of your signature.");
      onChange(null);
      return;
    }
    onChange({ method: "drawn", base64 });
  };

  const tab = (target: Mode, text: string) => (
    <button
      type="button"
      onClick={() => { switchMode(target); }}
      disabled={disabled}
      aria-pressed={mode === target}
      style={{
        ...GF, flex: "1 1 0", minWidth: 72, padding: "8px 10px",
        borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        border: mode === target ? `1px solid ${AZURE}` : `1px solid ${BORDER}`,
        background: mode === target ? "#EAF4FC" : "#FFFFFF",
        color: mode === target ? AZURE : NAVY,
      }}
    >
      {text}
    </button>
  );

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 8 }}>
        {label}
      </label>

      {/* Wraps at 320px rather than overflowing. */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {tab("draw", "Draw")}
        {tab("type", "Type")}
        {tab("upload", "Upload")}
      </div>

      {mode === "draw" && (
        <div ref={wrapRef}>
          <canvas
            ref={canvasRef}
            onPointerDown={startStroke}
            onPointerMove={extendStroke}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            aria-label={`Draw your ${noun}`}
            style={{
              width: "100%", display: "block", borderRadius: 8,
              border: `1px dashed ${BORDER}`, background: "#FBFCFD",
              // Without this a drag on a touch screen scrolls the page instead
              // of drawing, which makes the pad unusable on a phone.
              touchAction: "none",
              cursor: disabled ? "not-allowed" : "crosshair",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...GF, fontSize: 12, color: SILVER }}>
              {hasInk ? `Your ${noun} is ready.` : `Draw your ${noun} above.`}
            </span>
            <button
              type="button"
              onClick={clearCanvas}
              disabled={disabled || !hasInk}
              style={{
                ...GF, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: `1px solid ${BORDER}`, background: "#FFFFFF",
                color: hasInk ? NAVY : SILVER,
                cursor: hasInk && !disabled ? "pointer" : "not-allowed",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {mode === "type" && (
        <div>
          <input
            value={typed}
            onChange={event => { onTyped(event.target.value); }}
            maxLength={MAX_TYPED_LENGTH}
            disabled={disabled}
            placeholder={purpose === "initials" ? "Type your initials" : "Type your full name"}
            aria-label={`Type your ${noun}`}
            style={{
              ...GF, width: "100%", boxSizing: "border-box", padding: "10px 12px",
              borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, color: NAVY,
            }}
          />
          {/* The preview uses the face the SERVER draws with, so this is what
              the sealed document will show — not a decorative approximation. */}
          <div
            aria-hidden="true"
            style={{
              marginTop: 8, minHeight: 56, display: "flex", alignItems: "center",
              padding: "8px 12px", borderRadius: 8, background: "#FBFCFD",
              border: `1px dashed ${BORDER}`,
              fontFamily: "'Noto Sans', system-ui, sans-serif",
              fontStyle: "italic", fontSize: 26, color: NAVY,
              // A long name must not blow out the layout at 320px.
              overflowWrap: "anywhere",
            }}
          >
            {typed.trim().length > 0
              ? typed
              : <span style={{ ...GF, fontSize: 12, fontStyle: "normal", color: SILVER }}>
                  Preview appears here
                </span>}
          </div>
        </div>
      )}

      {mode === "upload" && (
        <div>
          <input
            type="file"
            accept="image/png,image/jpeg"
            disabled={disabled}
            onChange={event => { void onUpload(event.target.files?.[0]); }}
            aria-label={`Upload an image of your ${noun}`}
            style={{ ...GF, fontSize: 13, color: NAVY, width: "100%" }}
          />
          <p style={{ ...GF, fontSize: 12, color: SILVER, margin: "8px 0 0" }}>
            A photo or scan works. It is converted to a PNG and trimmed to your
            mark before it is sent.
          </p>
          {uploadError !== null && (
            <p role="alert" style={{ ...GF, fontSize: 12, color: "#C0392B", margin: "6px 0 0" }}>
              {uploadError}
            </p>
          )}
          {value?.method === "drawn" && uploadError === null && (
            <p style={{ ...GF, fontSize: 12, color: "#1E7F4F", margin: "6px 0 0" }}>
              Image ready.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
