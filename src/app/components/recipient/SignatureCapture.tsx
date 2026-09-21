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
import { removeOpaqueBackground } from "./signature-background";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  PenTool, Type as TypeIcon, Upload as UploadIcon, Eraser, Check,
  AlertTriangle, ImageUp, RefreshCw, Trash2, type LucideIcon,
} from "lucide-react";
import { T, GF as SIGNER_GF, useViewport } from "./signer-ui";

// ── The server's bounds, restated ──────────────────────────────────────────
/** `RASTER_SIGNATURE_MAX_BYTES` — 64 KiB of decoded PNG. */
const MAX_BYTES = 64 * 1024;
/** `RASTER_SIGNATURE_MAX_DIMENSION` — longest side, in pixels. */
const MAX_DIMENSION = 512;

/**
 * Largest source image the background estimator will look at.
 *
 * Deliberately far above MAX_DIMENSION: the trim crops to the ink and then
 * scales, so starting from more detail than the final 512px gives a cleaner
 * result than pre-shrinking to the output size would.
 */
const MAX_SOURCE_DIMENSION = 1600;
/** `RASTER_SIGNATURE_MAX_TRANSPORT_CHARS` — base64 inflates by 4/3. */
const MAX_TRANSPORT_CHARS = Math.ceil((MAX_BYTES * 4) / 3) + 128;
/** `TYPED_SIGNATURE_MAX_LENGTH`. */
const MAX_TYPED_LENGTH = 200;

/**
 * The only style the renderer distinguishes. See the header.
 */
const ONLY_STYLE_INDEX = 0;

// Aliases onto the shared signer palette, so this cannot drift from the
// screens it appears on.
const GF = SIGNER_GF;
const NAVY = T.ink;
const AZURE = T.azure;
const SILVER = T.silver;
const BORDER = T.borderStrong;

/**
 * How the signer produced a mark, reported alongside it.
 *
 * This component is the only place that knows the difference. Once an upload
 * has been through the background removal it is a PNG exactly like a drawn
 * one, and by the time the bytes reach the server nothing can tell them
 * apart — so if this does not say, nobody ever can.
 *
 * Until now they were both submitted as "drawn", which filed a picture made
 * last year in front of a different document as though the signer had drawn
 * it here, in this moment. That is the distinction a dispute turns on.
 */
export type CaptureProvenance = "typed-live" | "drawn-live" | "uploaded-live";

export type SignatureValue =
  | { method: "typed"; text: string; styleIndex: number; provenance?: CaptureProvenance }
  | { method: "drawn"; base64: string; provenance?: CaptureProvenance }
  /**
   * "Use the mark the server was handed."
   *
   * Carries no content on purpose. The server already holds what was prepared
   * for this session, and a client that could supply the bytes could claim
   * `applied-from-saved` for anything — the absence of a payload is what makes
   * that provenance a fact rather than an assertion. It carries no
   * `provenance` either, for the same reason: the server decides that one.
   */
  | { method: "saved" };

type Mode = "draw" | "type" | "upload";

/** A mark already prepared for this session, ready to apply. */
export interface PreparedMark {
  purpose: "signature" | "initials";
  method: "typed" | "drawn";
  text?: string;
  styleIndex?: number;
  base64?: string;
}

export interface SignatureCaptureProps {
  /** Shown above the control, e.g. "Signature (required)". */
  readonly label: string;
  /** Changes wording only. Both purposes use the identical wire shape. */
  readonly purpose: "signature" | "initials";
  readonly value: SignatureValue | null;
  readonly onChange: (value: SignatureValue | null) => void;
  readonly disabled?: boolean;
  /**
   * A mark the server already holds for this session, if any.
   *
   * Shown as a preview with an explicit confirm — never applied silently.
   * Applying a signature the signer has not looked at is the one thing this
   * feature must not do, and an extra tap is a small price for the signer
   * having seen what their name is going onto.
   */
  readonly prepared?: PreparedMark | null;
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
async function pngFromFile(file: File, sensitivity: number): Promise<string | null> {
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
  // A 12-megapixel phone photo is 12 million pixels through two passes of the
  // background estimator. Capped on the way in, not after — the cost is in the
  // decode as much as the arithmetic. Well above MAX_DIMENSION, so the trim
  // still has detail to work with.
  const scale = Math.min(1, MAX_SOURCE_DIMENSION / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (context === null) return null;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Lift the signature off its paper BEFORE the trim, because the trim finds
  // the mark by looking for transparent pixels and a photograph has none.
  //
  // This used to fall through silently when the pixels could not be read,
  // reasoning that the old behaviour was better than no upload. The old
  // behaviour is a fully opaque PNG — and the sealer embeds signature images
  // with no compositing control, so an opaque one paints a WHITE BOX over
  // whatever it lands on in the finished document. Silently shipping that is
  // worse than refusing, because the signer cannot see it happen: the preview
  // shows their signature, and the box only appears in the sealed PDF.
  //
  // Same-origin data URL, so a throw here is close to unreachable in practice.
  // It is handled as a refusal rather than a fallback because of what the
  // fallback would produce, not because it is likely.
  try {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    removeOpaqueBackground(pixels.data, canvas.width, canvas.height, { sensitivity });
    context.putImageData(pixels, 0, 0);
  } catch {
    return null;
  }

  return trimmedPng(canvas);
}

// ── The component ────────────────────────────────────────────────────────────

export function SignatureCapture({
  label, purpose, value, onChange, disabled = false, prepared = null,
}: SignatureCaptureProps) {
  const [mode, setMode] = useState<Mode>("draw");
  /**
   * Whether the picker is showing, when a signature has already been adopted.
   *
   * ── Why a mark cannot simply be "reopened" ────────────────────────────
   *
   * A drawn signature is kept as a PNG, not as the strokes that made it, so
   * the pad genuinely cannot resume where the signer left off. Pretending
   * otherwise — opening an empty canvas over an adopted signature — reads as
   * having lost their work.
   *
   * So an existing mark is SHOWN, with Replace and Remove beside it, and the
   * picker appears only once they choose to replace. A typed signature is
   * restored exactly, because for that one the text is the whole value.
   */
  const [replacing, setReplacing] = useState(false);
  const [typed, setTyped] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Kept so the sensitivity slider can re-process the same image without
  // making the signer find the file again.
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sensitivity, setSensitivity] = useState(0.5);
  const sensitivityId = useId();
  const [hasInk, setHasInk] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const { isMobileS } = useViewport();

  const noun = purpose === "initials" ? "initials" : "signature";

  /**
   * Whether the Draw/Type/Upload picker is showing.
   *
   * Hidden while an adopted signature is on screen, so the sheet answers one
   * question at a time: first "here is what you signed with, keep it or
   * change it", and only then "how do you want to sign".
   */
  const picking = value === null || replacing;

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

  // Reopening on a TYPED signature restores the text and the tab that made
  // it, so "change my signature" starts from what is there rather than from
  // nothing. A drawn one cannot be restored — see `replacing` — so it opens
  // on the adopted view instead.
  useEffect(() => {
    if (value?.method === "typed") {
      setMode("type");
      setTyped(current => (current === "" ? value.text : current));
    }
  }, [value]);

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
    onChange(base64 === null ? null : { method: "drawn", base64, provenance: "drawn-live" });
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
      : {
          method: "typed", text: trimmed, styleIndex: ONLY_STYLE_INDEX,
          provenance: "typed-live",
        });
  };

  const onUpload = async (file: File | undefined, nextSensitivity = sensitivity) => {
    setUploadError(null);
    if (file === undefined) return;
    setUploadedFile(file);
    const base64 = await pngFromFile(file, nextSensitivity);
    if (base64 === null) {
      // Distinguishable from an unreadable file: a photo of a blank sheet
      // trims to nothing, and "try a PNG" would be baffling advice for it.
      setUploadError(
        "No signature was found in that image. Try a clearer photo, or move the slider.",
      );
      onChange(null);
      return;
    }
    onChange({ method: "drawn", base64, provenance: "uploaded-live" });
  };

  // Re-runs the last upload at a new sensitivity. Auto-detection genuinely
  // fails on faint pencil and dark paper, and re-picking the file to try again
  // would be a miserable way to find that out.
  const onSensitivityChange = (next: number) => {
    setSensitivity(next);
    if (uploadedFile !== null) void onUpload(uploadedFile, next);
  };

  /**
   * One way to sign, as a card rather than a text tab.
   *
   * An icon above the label, because at Mobile S three text tabs either
   * truncate or wrap into something unreadable — and because "draw" and
   * "type" are genuinely different actions that a glyph distinguishes faster
   * than a word.
   *
   * `aria-pressed` rather than a tablist: these are three toggles over one
   * value, and a real tablist would promise arrow-key navigation between
   * panels that do not behave like tabs.
   */
  const tab = (target: Mode, text: string, Icon: LucideIcon, hint: string) => {
    const active = mode === target;
    return (
      <button
        type="button"
        onClick={() => { switchMode(target); }}
        disabled={disabled}
        aria-pressed={active}
        title={hint}
        style={{
          ...GF,
          flex: "1 1 0",
          // Narrow enough for three across at 320px, tall enough to tap.
          minWidth: 0, minHeight: 64,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 4,
          padding: isMobileS ? "8px 4px" : "10px 8px",
          borderRadius: 12,
          fontSize: isMobileS ? 11 : 12.5, fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
          border: `1px solid ${active ? AZURE : T.border}`,
          background: active ? T.azureWash : T.surface,
          color: active ? T.azureDeep : T.inkSoft,
          boxShadow: active ? "0 1px 0 rgba(0,120,212,0.18)" : "none",
          transition: "background 120ms ease, border-color 120ms ease",
        }}
      >
        <Icon size={isMobileS ? 17 : 19} aria-hidden />
        <span style={{ whiteSpace: "nowrap" }}>{text}</span>
      </button>
    );
  };

  // ── The prepared mark ─────────────────────────────────────────────────
  //
  // Offered ABOVE the three ways to make a new one, because for someone who
  // saved a signature this is the whole point — and dismissible, because a
  // saved mark is a convenience and not an obligation.
  const preparedPreview = prepared == null ? null : (
    <div style={{
      border: `1px solid ${T.border}`, borderRadius: 12,
      padding: "clamp(10px, 3vw, 14px)", marginBottom: 12,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <span style={{ ...GF, fontSize: 12, fontWeight: 700, color: T.ink }}>
        Your saved {prepared.purpose === "initials" ? "initials" : "signature"}
      </span>
      <div style={{
        display: "grid", placeItems: "center",
        minHeight: "clamp(56px, 14vw, 80px)",
        borderRadius: 8, background: T.canvas,
        padding: "clamp(6px, 2vw, 10px)",
      }}>
        {prepared.method === "drawn" && prepared.base64 !== undefined ? (
          <img
            src={`data:image/png;base64,${prepared.base64}`}
            alt={`Your saved ${prepared.purpose}`}
            style={{ maxWidth: "100%", maxHeight: "clamp(44px, 11vw, 64px)", objectFit: "contain" }}
          />
        ) : (
          <span style={{
            ...GF, fontSize: "clamp(16px, 5vw, 22px)", fontStyle: "italic",
            color: T.ink, textAlign: "center", wordBreak: "break-word",
          }}>
            {prepared.text ?? ""}
          </span>
        )}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { onChange({ method: "saved" }); }}
        style={{
          ...GF, minHeight: 44, borderRadius: 8, border: "none",
          background: T.azure, color: "#fff", fontSize: 13, fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        Use this {prepared.purpose === "initials" ? "initials" : "signature"}
      </button>
      <span style={{ ...GF, fontSize: 11.5, color: T.silver, textAlign: "center" }}>
        or make a new one below
      </span>
    </div>
  );

  return (
    <div style={{ marginBottom: 18 }}>
      {/* A banner, not a bare label: this control is the consequential one on
          the screen, and a 13px line of text above three buttons did not read
          as the place where a signature gets made. */}
      <div
        style={{
          ...GF, display: "flex", alignItems: "center", gap: 10,
          padding: isMobileS ? "9px 11px" : "11px 14px",
          borderRadius: 12, marginBottom: 10,
          background: T.azureWash, border: `1px solid #B7DAF5`,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "grid", placeItems: "center", flexShrink: 0,
            width: 30, height: 30, borderRadius: 9,
            background: T.surface, border: `1px solid #B7DAF5`, color: T.azureDeep,
          }}
        >
          <PenTool size={16} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{
            display: "block", fontSize: "clamp(13px, 3.5vw, 14px)",
            fontWeight: 800, color: T.ink,
          }}>
            {label}
          </span>
          <span style={{ display: "block", fontSize: 11.5, color: T.inkSoft, marginTop: 1 }}>
            Choose how you want to sign
          </span>
        </span>
      </div>

      {/* ── Already signed: show it, with a way to change it ──────────────
          A signature can be changed at any point before the submission is
          sent; nothing is final until then. Saying so matters — a signer who
          believes their first attempt is binding will not try to improve it,
          and a wobbly signature they are stuck with is a worse outcome than
          one they redrew. */}
      {value !== null && !replacing && (
        <div>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 12, marginBottom: 10,
              background: T.surface, border: `1px solid ${T.border}`,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "grid", placeItems: "center", flexShrink: 0,
                width: 28, height: 28, borderRadius: 999,
                background: T.successWash, border: `1px solid #B7E3CA`,
                color: T.success,
              }}
            >
              <Check size={15} />
            </span>
            <div style={{
              flex: 1, minWidth: 0, minHeight: 44,
              display: "flex", alignItems: "center", overflow: "hidden",
            }}>
              {value.method === "drawn"
                ? (
                  <img
                    src={`data:image/png;base64,${value.base64}`}
                    alt={`Your adopted ${noun}`}
                    style={{ maxWidth: "100%", maxHeight: 56, objectFit: "contain" }}
                  />
                )
                : (
                  <span style={{
                    fontFamily: "'Noto Sans', system-ui, sans-serif",
                    fontStyle: "italic", fontSize: 24, color: T.ink,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {value.method === "typed" ? value.text : ""}
                  </span>
                )}
            </div>
          </div>

          <p style={{
            ...GF, fontSize: 11.5, color: SILVER, margin: "0 0 10px", lineHeight: 1.5,
          }}>
            You can change this until you submit.
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setReplacing(true);
                // A drawn mark cannot be resumed, so replacing starts clean.
                // A typed one keeps its text — the restore effect re-seeds it.
                if (value.method === "drawn") { setHasInk(false); }
              }}
              style={{
                ...GF, flex: 1, display: "inline-flex", alignItems: "center",
                justifyContent: "center", gap: 7, minHeight: 44,
                borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: `1px solid ${AZURE}`, background: T.azureWash,
                color: T.azureDeep, cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw size={15} aria-hidden />
              Change
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setReplacing(false);
                setTyped("");
                setHasInk(false);
                clearCanvas();
                onChange(null);
              }}
              style={{
                ...GF, display: "inline-flex", alignItems: "center",
                justifyContent: "center", gap: 7, minHeight: 44,
                padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: `1px solid ${T.border}`, background: T.surface,
                color: T.danger, cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <Trash2 size={15} aria-hidden />
              Remove
            </button>
          </div>
        </div>
      )}

      {/* The saved mark, above the three ways to make a new one — for someone
          who saved one, this is the whole point of having done so. */}
      {picking && preparedPreview}

      {/* Three across even at 320px — a grid rather than wrapping flex, so a
          single card never drops alone onto a second row. */}
      {picking && (
      <div
        style={{
          display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: isMobileS ? 6 : 8, marginBottom: 12,
        }}
      >
        {tab("draw", "Draw", PenTool, "Draw your signature with a finger, stylus or mouse")}
        {tab("type", "Type", TypeIcon, "Type your name and we render it")}
        {tab("upload", "Upload", UploadIcon, "Upload a photo or scan of your signature")}
      </div>
      )}

      {picking && mode === "draw" && (
        <div ref={wrapRef}>
          <canvas
            ref={canvasRef}
            onPointerDown={startStroke}
            onPointerMove={extendStroke}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            aria-label={`Draw your ${noun}`}
            style={{
              width: "100%", display: "block", borderRadius: 12,
              border: `2px dashed ${hasInk ? T.azure : "#C3CEDA"}`,
              background: hasInk
                ? "#FFFFFF"
                // A faint ruled baseline, so the pad reads as somewhere to
                // sign rather than an empty grey rectangle.
                : "linear-gradient(to bottom, #FBFCFD 0%, #FBFCFD 72%, #E8EEF4 72%, #E8EEF4 calc(72% + 1px), #FBFCFD calc(72% + 1px))",
              // Without this a drag on a touch screen scrolls the page instead
              // of drawing, which makes the pad unusable on a phone.
              touchAction: "none",
              cursor: disabled ? "not-allowed" : "crosshair",
            }}
          />
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 8, gap: 8,
          }}>
            <span style={{
              ...GF, display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, minWidth: 0,
              color: hasInk ? T.success : SILVER,
            }}>
              {hasInk
                ? <Check size={14} aria-hidden style={{ flexShrink: 0 }} />
                : <PenTool size={14} aria-hidden style={{ flexShrink: 0 }} />}
              <span style={{
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {hasInk ? `Your ${noun} is ready` : `Draw your ${noun} above`}
              </span>
            </span>
            <button
              type="button"
              onClick={clearCanvas}
              disabled={disabled || !hasInk}
              style={{
                ...GF, display: "inline-flex", alignItems: "center", gap: 6,
                // 44px: clearing is destructive, and a fat-finger miss beside
                // a signature pad redraws over the mark.
                minHeight: 44, padding: "0 14px", borderRadius: 10,
                fontSize: 12.5, fontWeight: 700, flexShrink: 0,
                border: `1px solid ${BORDER}`, background: T.surface,
                color: hasInk ? NAVY : SILVER,
                cursor: hasInk && !disabled ? "pointer" : "not-allowed",
                opacity: hasInk ? 1 : 0.6,
              }}
            >
              <Eraser size={14} aria-hidden />
              Clear
            </button>
          </div>
        </div>
      )}

      {picking && mode === "type" && (
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
          <p style={{
            ...GF, display: "flex", alignItems: "center", gap: 6,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
            textTransform: "uppercase", color: SILVER, margin: "12px 0 6px",
          }}>
            <TypeIcon size={12} aria-hidden />
            Preview — this is how it will appear
          </p>
          <div
            aria-hidden="true"
            style={{
              minHeight: 64, display: "flex", alignItems: "center",
              padding: "10px 14px", borderRadius: 12, background: T.surface,
              border: `2px dashed ${typed.trim().length > 0 ? T.azure : "#C3CEDA"}`,
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

      {picking && mode === "upload" && (
        <div>
          {/* The input is wrapped in its own label so the whole zone is the
              target. A bare `<input type="file">` renders as a small,
              inconsistently-styled native button that is hard to hit on a
              phone and looks nothing like the rest of this control. */}
          <label
            style={{
              ...GF, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 6,
              minHeight: 120, padding: "16px 12px", textAlign: "center",
              position: "relative",
              borderRadius: 12, border: `2px dashed #C3CEDA`,
              background: "#FBFCFD",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <ImageUp size={22} aria-hidden style={{ color: T.azureDeep }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
              Choose a photo or scan
            </span>
            <span style={{ fontSize: 11.5, color: SILVER, maxWidth: 260, lineHeight: 1.45 }}>
              PNG or JPEG. It is converted to a PNG and trimmed to your mark
              before it is sent.
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              disabled={disabled}
              onChange={event => { void onUpload(event.target.files?.[0]); }}
              aria-label={`Upload an image of your ${noun}`}
              // Visually hidden, still focusable and still labelled.
              style={{
                position: "absolute", width: 1, height: 1,
                padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)",
                whiteSpace: "nowrap", border: 0,
              }}
            />
          </label>

          {uploadedFile !== null && uploadError === null && (
            <div style={{ width: "100%", maxWidth: 300, marginTop: 4 }}>
              <label
                htmlFor={sensitivityId}
                style={{ ...GF, display: "block", fontSize: 11.5, color: SILVER, marginBottom: 6 }}
              >
                Background removal
              </label>
              <input
                id={sensitivityId}
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={sensitivity}
                disabled={disabled}
                onChange={event => { onSensitivityChange(Number(event.target.value)); }}
                aria-describedby={`${sensitivityId}-hint`}
                style={{ width: "100%" }}
              />
              <p
                id={`${sensitivityId}-hint`}
                style={{ ...GF, margin: "4px 0 0", fontSize: 11, color: SILVER, lineHeight: 1.45 }}
              >
                Move right if part of your signature is missing, left if some of
                the paper is still showing.
              </p>
            </div>
          )}

          {uploadError !== null && (
            <p role="alert" style={{
              ...GF, display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: T.danger, margin: "8px 0 0",
            }}>
              <AlertTriangle size={13} aria-hidden style={{ flexShrink: 0 }} />
              {uploadError}
            </p>
          )}
          {value?.method === "drawn" && uploadError === null && (
            <p style={{
              ...GF, display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, color: T.success, margin: "8px 0 0",
            }}>
              <Check size={13} aria-hidden style={{ flexShrink: 0 }} />
              Image ready
            </p>
          )}
        </div>
      )}
    </div>
  );
}
