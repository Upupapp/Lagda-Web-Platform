// Signature adoption dialog — typed and drawn modes.
// No image is uploaded or persisted. Drawn canvas data stays in memory only.
// IMPORTANT: "Adopt" does NOT constitute a legally binding signature.
// Burgundy (#67023B) is never used here — eNotary-only.

import React, { useRef, useEffect, useState } from "react";
import { useRecipient, TYPED_SIGNATURE_STYLES } from "../../context/RecipientContext";
import type { SignatureAdoptionMethod } from "../../models/recipient";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";

export function SignatureAdoptionDialog() {
  const {
    state,
    closeSignatureDialog,
    setSignatureMethod,
    setSignatureTypedText,
    setSignatureStyle,
    setSignatureDrawn,
    adoptSignature,
  } = useRecipient();

  const target = state.signatureTargetField ?? "signature";
  const adoption = target === "signature" ? state.signature : state.initials;

  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  // Reset drawing state when dialog opens for a new target
  useEffect(() => {
    setHasDrawing(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [target, state.showSignatureDialog]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!canvasRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = NAVY;
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    setHasDrawing(true);
  }

  function handlePointerUp() {
    if (!canvasRef.current) return;
    setDrawing(false);
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSignatureDrawn(dataUrl, target);
  }

  function clearCanvas() {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawing(false);
    setSignatureDrawn("", target);
  }

  const isTitle    = target === "initials" ? "Initials" : "Signature";
  const canAdopt   =
    (adoption.method === "typed" && adoption.typedText.trim().length >= 2) ||
    (adoption.method === "drawn" && hasDrawing);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Adopt ${isTitle}`}
      style={{
        position:         "fixed",
        inset:            0,
        zIndex:           200,
        background:       "rgba(7, 17, 31, 0.55)",
        display:          "flex",
        alignItems:       "center",
        justifyContent:   "center",
        padding:          "20px",
      }}
      onClick={e => { if (e.target === e.currentTarget) closeSignatureDialog(); }}
    >
      <div
        style={{
          background:   WHITE,
          borderRadius: 14,
          border:       "1px solid #E3E8EF",
          padding:      "28px",
          width:        "100%",
          maxWidth:     480,
          boxShadow:    "0 8px 32px rgba(7,17,31,0.14)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ ...GF, fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>
            Adopt {isTitle}
          </h2>
          <button
            onClick={closeSignatureDialog}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: SILVER, fontSize: 18, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Method tabs */}
        <div
          style={{
            display:      "flex",
            gap:          4,
            background:   "#F5F7FA",
            borderRadius: 8,
            padding:      4,
            marginBottom: 20,
          }}
          role="tablist"
          aria-label="Signature method"
        >
          {(["typed", "drawn"] as SignatureAdoptionMethod[]).map(method => (
            <button
              key={method}
              role="tab"
              aria-selected={adoption.method === method}
              onClick={() => setSignatureMethod(method, target)}
              style={{
                ...GF,
                flex:         1,
                padding:      "8px 0",
                borderRadius: 6,
                border:       "none",
                background:   adoption.method === method ? WHITE : "transparent",
                color:        adoption.method === method ? NAVY : SILVER,
                fontSize:     13,
                fontWeight:   adoption.method === method ? 700 : 500,
                cursor:       "pointer",
                boxShadow:    adoption.method === method ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition:   "background 0.15s",
              }}
            >
              {method === "typed" ? "Type" : "Draw"}
            </button>
          ))}
        </div>

        {/* Typed panel */}
        {adoption.method === "typed" && (
          <div>
            {/* Name input */}
            <label
              htmlFor="sig-typed-text"
              style={{ ...GF, display: "block", fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}
            >
              Your {target === "initials" ? "Initials" : "Full Name"}
            </label>
            <input
              id="sig-typed-text"
              type="text"
              autoFocus
              value={adoption.typedText}
              onChange={e => setSignatureTypedText(e.target.value, target)}
              placeholder={target === "initials" ? "e.g. M.S." : "Your full name"}
              style={{
                ...GF,
                display:      "block",
                width:        "100%",
                padding:      "10px 14px",
                fontSize:     14,
                borderRadius: 7,
                border:       "1px solid #D1D9E0",
                outline:      "none",
                boxSizing:    "border-box",
                marginBottom: 14,
                color:        NAVY,
              }}
            />

            {/* Style selector */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Style
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {TYPED_SIGNATURE_STYLES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSignatureStyle(i, target)}
                    aria-label={`Signature style: ${s.label}`}
                    aria-pressed={adoption.styleIndex === i}
                    style={{
                      ...GF,
                      padding:      "10px 14px",
                      borderRadius: 7,
                      border:       `1.5px solid ${adoption.styleIndex === i ? AZURE : "#E3E8EF"}`,
                      background:   adoption.styleIndex === i ? "#EBF4FC" : WHITE,
                      cursor:       "pointer",
                      textAlign:    "left",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: s.fontFamily,
                        fontSize:   s.fontSize,
                        fontStyle:  s.fontStyle,
                        color:      NAVY,
                        display:    "block",
                        lineHeight: 1.3,
                        minHeight:  36,
                      }}
                    >
                      {adoption.typedText || (target === "initials" ? "M.S." : "Your Signature")}
                    </span>
                    <span style={{ ...GF, fontSize: 10, color: SILVER, display: "block", marginTop: 3 }}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Drawn panel */}
        {adoption.method === "drawn" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Draw your {isTitle.toLowerCase()}
              </div>
              <button
                onClick={clearCanvas}
                style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: SILVER, fontSize: 12, fontWeight: 600, padding: 0 }}
              >
                Clear
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={420}
              height={120}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              aria-label={`Drawing canvas for ${isTitle.toLowerCase()}`}
              style={{
                display:      "block",
                width:        "100%",
                height:       120,
                borderRadius: 8,
                border:       "1.5px dashed #D1D9E0",
                background:   "#FAFBFC",
                cursor:       "crosshair",
                touchAction:  "none",
                marginBottom: 6,
              }}
            />
            {!hasDrawing && (
              <p style={{ ...GF, fontSize: 11, color: SILVER, margin: "0 0 12px", textAlign: "center" }}>
                Draw your {isTitle.toLowerCase()} above with your mouse or finger
              </p>
            )}
          </div>
        )}

        {/* Global dialog error */}
        {state.globalError && (
          <p role="alert" style={{ ...GF, fontSize: 12, color: "#C0392B", margin: "0 0 12px" }}>
            {state.globalError}
          </p>
        )}

        {/* Disclosure */}
        <p style={{ ...GF, fontSize: 11, color: SILVER, lineHeight: 1.6, margin: "0 0 16px" }}>
          By clicking Adopt, you are creating a demonstration {isTitle.toLowerCase()} for this
          simulation. No legally binding signature is created. Your {isTitle.toLowerCase()} data
          remains in memory only and is never stored or transmitted.
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={closeSignatureDialog}
            style={{
              ...GF,
              padding:      "10px 16px",
              borderRadius: 7,
              border:       "1px solid #D1D9E0",
              background:   WHITE,
              color:        SILVER,
              fontSize:     13,
              fontWeight:   600,
              cursor:       "pointer",
              flex:         "0 0 auto",
            }}
          >
            Cancel
          </button>
          <button
            disabled={!canAdopt}
            onClick={() => adoptSignature(target)}
            style={{
              ...GF,
              flex:         1,
              padding:      "10px 16px",
              borderRadius: 7,
              border:       "none",
              background:   canAdopt ? AZURE : "#8AB8D8",
              color:        WHITE,
              fontSize:     13,
              fontWeight:   700,
              cursor:       canAdopt ? "pointer" : "not-allowed",
            }}
          >
            Adopt {isTitle}
          </button>
        </div>
      </div>
    </div>
  );
}
