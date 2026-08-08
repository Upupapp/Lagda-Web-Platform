// Signature adoption dialog — typed, drawn, and from-library modes.
// No image is uploaded or persisted. Drawn canvas data stays in memory only.
// Library tab shows active library entries for the current target kind.
// IMPORTANT: "Adopt" does NOT constitute a legally binding signature.
// Burgundy (#67023B) is never used here — eNotary-only.

import React, { useRef, useEffect, useState } from "react";
import { useRecipient, TYPED_SIGNATURE_STYLES } from "../../context/RecipientContext";
import type { SignatureAdoptionMethod } from "../../models/recipient";
import { signatureLibraryService } from "../../services/mock/signature-library.service";
import type { SignatureLibraryEntry } from "../../models/signature-library";
import { Z } from "../../utils/z-index";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";

type DialogTab = "typed" | "drawn" | "library";

export function SignatureAdoptionDialog() {
  const {
    state,
    closeSignatureDialog,
    setSignatureMethod,
    setSignatureTypedText,
    setSignatureStyle,
    setSignatureDrawn,
    adoptSignature,
    adoptFromLibrary,
  } = useRecipient();

  const target = state.signatureTargetField ?? "signature";
  const adoption = target === "signature" ? state.signature : state.initials;

  const [activeTab, setActiveTab] = useState<DialogTab>("typed");

  // Library entries active for this target kind
  const [libraryEntries, setLibraryEntries] = useState<SignatureLibraryEntry[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);

  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  // Reset drawing state and load library entries when dialog opens for a new target
  useEffect(() => {
    setHasDrawing(false);
    setActiveTab("typed");
    setSelectedLibraryId(null);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    const kind = target === "signature" ? "signature" : "initials";
    setLibraryEntries(signatureLibraryService.getActiveEntries(kind));
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
    (activeTab === "typed"   && adoption.method === "typed" && adoption.typedText.trim().length >= 2) ||
    (activeTab === "drawn"   && adoption.method === "drawn" && hasDrawing) ||
    (activeTab === "library" && selectedLibraryId !== null);

  function handleAdopt() {
    if (activeTab === "library" && selectedLibraryId) {
      const entry = libraryEntries.find(e => e.id === selectedLibraryId);
      if (!entry) return;
      const rep = entry.representation;
      adoptFromLibrary(
        target,
        rep.method,
        rep.method === "typed" ? rep.typedText : "",
        rep.method === "typed" ? rep.styleIndex : 0,
        rep.method === "drawn" ? rep.dataUrl    : null,
      );
    } else {
      adoptSignature(target);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Adopt ${isTitle}`}
      style={{
        position:         "fixed",
        inset:            0,
        zIndex:           Z.modal,
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
          {([["typed", "Type"], ["drawn", "Draw"], ["library", "From Library"]] as [DialogTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "typed" || tab === "drawn") setSignatureMethod(tab as SignatureAdoptionMethod, target);
              }}
              style={{
                ...GF,
                flex:         1,
                padding:      "8px 0",
                borderRadius: 6,
                border:       "none",
                background:   activeTab === tab ? WHITE : "transparent",
                color:        activeTab === tab ? NAVY : SILVER,
                fontSize:     12,
                fontWeight:   activeTab === tab ? 700 : 500,
                cursor:       "pointer",
                boxShadow:    activeTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition:   "background 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Typed panel */}
        {activeTab === "typed" && (
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
        {activeTab === "drawn" && (
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

        {/* Library panel */}
        {activeTab === "library" && (
          <div style={{ marginBottom: 14 }}>
            {libraryEntries.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <div style={{ ...GF, fontSize: 13, color: SILVER, marginBottom: 8 }}>
                  No saved {target === "initials" ? "initials" : "signatures"} in your library.
                </div>
                <div style={{ ...GF, fontSize: 11, color: SILVER }}>
                  Add one in Settings → Signatures &amp; Initials.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                {libraryEntries.map(entry => {
                  const rep = entry.representation;
                  const isSelected = selectedLibraryId === entry.id;
                  const isDefault  = entry.defaultState !== "non-default";
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedLibraryId(entry.id)}
                      aria-pressed={isSelected}
                      aria-label={`Select ${entry.displayName}`}
                      style={{
                        ...GF,
                        display:      "flex",
                        alignItems:   "center",
                        gap:          12,
                        padding:      "10px 12px",
                        borderRadius: 8,
                        border:       `1.5px solid ${isSelected ? AZURE : "#E3E8EF"}`,
                        background:   isSelected ? "#EBF4FC" : WHITE,
                        cursor:       "pointer",
                        textAlign:    "left",
                        width:        "100%",
                      }}
                    >
                      {/* Preview area */}
                      <div style={{ width: 80, height: 36, flexShrink: 0, border: "1px solid #E3E8EF", borderRadius: 6, overflow: "hidden", background: "#FAFBFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {rep.method === "typed" ? (
                          <span style={{ fontFamily: TYPED_SIGNATURE_STYLES[rep.styleIndex]?.fontFamily, fontSize: 11, fontStyle: TYPED_SIGNATURE_STYLES[rep.styleIndex]?.fontStyle ?? "normal", color: NAVY, padding: "0 4px", textAlign: "center", wordBreak: "break-word" }}>
                            {rep.typedText}
                          </span>
                        ) : rep.dataUrl ? (
                          <img src={rep.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                          <span style={{ ...GF, fontSize: 9, color: SILVER }}>N/A</span>
                        )}
                      </div>
                      {/* Label */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.displayName}
                          {isDefault && <span style={{ marginLeft: 6, fontSize: 10, color: AZURE, fontWeight: 700, background: "#EBF4FC", borderRadius: 4, padding: "1px 5px" }}>default</span>}
                        </div>
                        <div style={{ ...GF, fontSize: 10, color: SILVER }}>{rep.method === "typed" ? "Typed" : "Drawn"}</div>
                      </div>
                      {/* Selection indicator */}
                      {isSelected && <span aria-hidden style={{ color: AZURE, fontSize: 16, flexShrink: 0 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <p style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 10, lineHeight: 1.5 }}>
              Selecting from your library still requires explicit adoption. It is not applied automatically.
            </p>
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
            onClick={handleAdopt}
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
