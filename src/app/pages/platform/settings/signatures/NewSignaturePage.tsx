// /app/settings/signatures/new — Create a signature or initials library entry.
// Reuses the same typed-style registry and canvas drawing pattern as Command 20.
// No second drawing engine. No localStorage. No upload. No identity verification.
// No eNotary. No Burgundy.

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  SettingsPage, SCard, DEMO_NOTICE, BTN_PRIMARY, BTN_SECONDARY, INPUT_STYLE,
} from "../SettingsShell";
import { signatureLibraryService } from "../../../../services/mock/signature-library.service";
import { TYPED_SIGNATURE_STYLES } from "../../../../models/recipient";
import type { SignatureLibraryEntryKind, SignatureRepresentationMethod } from "../../../../models/signature-library";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SLATE  = "#64748B";
const SILVER = "#8A9BAE";
const RED    = "#DC2626";

// ── Live typed preview ────────────────────────────────────────────────────────

function TypedPreview({ text, styleIndex }: { text: string; styleIndex: number }) {
  const style = TYPED_SIGNATURE_STYLES[styleIndex] ?? TYPED_SIGNATURE_STYLES[0];
  return (
    <div
      aria-label={`Preview: ${text || "Enter your name above"}`}
      style={{
        height: 64, border: "1px solid #E3E8EF", borderRadius: 8,
        background: "#FAFBFC", display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <span style={{
        fontFamily: style.fontFamily,
        fontSize:   Math.min(style.fontSize, 28),
        fontStyle:  style.fontStyle,
        color:      text ? NAVY : SILVER,
        padding:    "0 16px",
      }}>
        {text || "Your signature preview"}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function NewSignaturePage() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const kindParam = searchParams.get("kind");
  const initialKind: SignatureLibraryEntryKind =
    kindParam === "initials" ? "initials" : kindParam === "signature" ? "signature" : "signature";

  // Multi-step state
  const [step, setStep]       = useState<1 | 2 | 3>(1);
  const [kind, setKind]       = useState<SignatureLibraryEntryKind>(initialKind);
  const [method, setMethod]   = useState<SignatureRepresentationMethod>("typed");

  // Skip step 1 if kind is pre-selected from query param
  useEffect(() => {
    if (kindParam === "signature" || kindParam === "initials") setStep(2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [typedText,   setTypedText]   = useState("");
  const [styleIndex,  setStyleIndex]  = useState(0);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving,       setSaving]     = useState(false);
  const [errors,       setErrors]     = useState<Record<string, string>>({});
  const [globalError,  setGlobalError] = useState<string | null>(null);

  // Canvas state — in-memory only, never stored outside this component
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const [drawing,    setDrawing]    = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);

  // Clear canvas data on unmount
  useEffect(() => {
    return () => { setDrawnDataUrl(null); };
  }, []);

  // Clear canvas when switching to draw method
  useEffect(() => {
    if (method === "drawn") {
      setDrawnDataUrl(null);
      setHasDrawing(false);
    }
  }, [method]);

  // ── Canvas handlers ──────────────────────────────────────────────────────────

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width  / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
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
    if (hasDrawing || drawing) {
      // Capture canvas to in-memory data URL — never stored outside component state
      const url = canvasRef.current.toDataURL("image/png");
      setDrawnDataUrl(url);
    }
  }

  function clearCanvas() {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawing(false);
    setDrawnDataUrl(null);
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!displayName.trim()) errs.displayName = "Entry name is required.";
    else if (displayName.trim().length > 60) errs.displayName = "Entry name must be 60 characters or fewer.";

    if (method === "typed") {
      if (!typedText.trim()) errs.typedText = "This field is required.";
    } else {
      if (!hasDrawing || !drawnDataUrl) errs.drawing = "Please draw your signature above.";
    }
    if (!acknowledged) errs.acknowledged = "Please acknowledge this before continuing.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [displayName, method, typedText, hasDrawing, drawnDataUrl, acknowledged]);

  // ── Submit ───────────────────────────────────────────────────────────────────

  function handleCreate() {
    if (!validate()) return;
    setSaving(true);
    setGlobalError(null);

    let result;
    if (method === "typed") {
      result = signatureLibraryService.createTyped({
        kind, displayName: displayName.trim(), typedText: typedText.trim(),
        styleIndex, setAsDefault,
      });
    } else {
      result = signatureLibraryService.createDrawn({
        kind, displayName: displayName.trim(), dataUrl: drawnDataUrl!,
        setAsDefault,
      });
    }

    setSaving(false);
    if (result.ok) {
      navigate("/app/settings/signatures", { replace: false });
    } else {
      setGlobalError("Could not create entry. Please try again.");
    }
  }

  const kindLabel   = kind === "signature" ? "Signature" : "Initials";
  const kindArticle = kind === "signature" ? "a signature"  : "initials";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SettingsPage title={`Create ${kindLabel}`} breadcrumb={`Signatures and Initials › Create ${kindLabel}`}>
      {DEMO_NOTICE}

      {/* Step 1 — Choose kind */}
      {step === 1 && (
        <SCard>
          <h2 style={{ ...GF, fontSize: 16, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>
            What would you like to create?
          </h2>
          <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 20px" }}>
            You can create separate Signature and Initials entries. Both remain in frontend demonstration state only.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {(["signature", "initials"] as SignatureLibraryEntryKind[]).map(k => (
              <button
                key={k}
                onClick={() => { setKind(k); setStep(2); }}
                aria-label={`Create ${k}`}
                style={{
                  ...GF, fontSize: 14, fontWeight: 700, color: kind === k ? AZURE : NAVY,
                  background: kind === k ? "#EBF4FC" : "#FAFBFC",
                  border: `2px solid ${kind === k ? AZURE : "#E3E8EF"}`,
                  borderRadius: 10, padding: "18px 32px", cursor: "pointer",
                  minWidth: 160,
                }}
              >
                {k === "signature" ? "Signature" : "Initials"}
                <div style={{ ...GF, fontSize: 12, fontWeight: 400, color: SLATE, marginTop: 4 }}>
                  {k === "signature" ? "Full name or stylized signing representation" : "Abbreviated identifier for initials fields"}
                </div>
              </button>
            ))}
          </div>
        </SCard>
      )}

      {/* Step 2 — Choose method */}
      {step === 2 && (
        <SCard>
          <h2 style={{ ...GF, fontSize: 16, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>
            How would you like to create {kindArticle}?
          </h2>
          <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 8px" }}>
            Neither method verifies your identity. Your representation is retained only in frontend demonstration state.
          </p>
          <p style={{ ...GF, fontSize: 12, color: SILVER, margin: "0 0 20px" }}>
            You must still explicitly adopt this representation for each signing request.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <button
              onClick={() => { setMethod("typed"); setStep(3); }}
              style={{
                ...GF, fontSize: 14, fontWeight: 700, color: AZURE,
                background: "#EBF4FC", border: `2px solid ${AZURE}`,
                borderRadius: 10, padding: "18px 28px", cursor: "pointer", minWidth: 160,
              }}
            >
              Type
              <div style={{ ...GF, fontSize: 12, fontWeight: 400, color: SLATE, marginTop: 4 }}>
                Enter your name or initials with a chosen style
              </div>
            </button>
            <button
              onClick={() => { setMethod("drawn"); setStep(3); }}
              style={{
                ...GF, fontSize: 14, fontWeight: 700, color: NAVY,
                background: "#FAFBFC", border: "2px solid #E3E8EF",
                borderRadius: 10, padding: "18px 28px", cursor: "pointer", minWidth: 160,
              }}
            >
              Draw
              <div style={{ ...GF, fontSize: 12, fontWeight: 400, color: SLATE, marginTop: 4 }}>
                Draw with your mouse, finger, or stylus
              </div>
            </button>
          </div>

          {step === 2 && kindParam !== "signature" && kindParam !== "initials" && (
            <button onClick={() => setStep(1)} style={{ ...GF, background: "none", border: "none", color: AZURE, fontSize: 13, cursor: "pointer", padding: 0 }}>
              ← Back
            </button>
          )}
        </SCard>
      )}

      {/* Step 3 — Form */}
      {step === 3 && (
        <>
          <SCard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ ...GF, fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>
                Create {kindLabel} — {method === "typed" ? "Type" : "Draw"}
              </h2>
              <button onClick={() => setStep(2)} style={{ ...GF, background: "none", border: "none", color: AZURE, fontSize: 13, cursor: "pointer", padding: 0 }}>
                ← Change method
              </button>
            </div>

            {/* Entry name */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="entry-name" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                Entry name <span aria-label="required" style={{ color: RED }}>*</span>
              </label>
              <input
                id="entry-name"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={kind === "signature" ? "e.g. Full Signature, Contract Signature" : "e.g. Default Initials"}
                maxLength={60}
                style={{ ...INPUT_STYLE, borderColor: errors.displayName ? RED : undefined }}
                aria-describedby={errors.displayName ? "entry-name-error" : undefined}
                aria-invalid={!!errors.displayName}
              />
              {errors.displayName && (
                <div id="entry-name-error" role="alert" style={{ ...GF, fontSize: 12, color: RED, marginTop: 4 }}>
                  {errors.displayName}
                </div>
              )}
              <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 4 }}>
                A label to identify this entry in your library.
              </div>
            </div>

            {/* Typed panel */}
            {method === "typed" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="typed-text" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                    {kind === "initials" ? "Initials" : "Name to display"} <span aria-label="required" style={{ color: RED }}>*</span>
                  </label>
                  <input
                    id="typed-text"
                    type="text"
                    value={typedText}
                    onChange={e => setTypedText(e.target.value)}
                    placeholder={kind === "initials" ? "e.g. M.R., MR, J.G.S." : "e.g. Maria Reyes"}
                    style={{ ...INPUT_STYLE, borderColor: errors.typedText ? RED : undefined }}
                    aria-invalid={!!errors.typedText}
                    aria-describedby={errors.typedText ? "typed-text-error" : undefined}
                  />
                  {errors.typedText && (
                    <div id="typed-text-error" role="alert" style={{ ...GF, fontSize: 12, color: RED, marginTop: 4 }}>
                      {errors.typedText}
                    </div>
                  )}
                  <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 4 }}>
                    International names, hyphens, apostrophes, accents, and periods are supported.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 8 }}>
                    Style
                  </div>
                  <div role="group" aria-label="Signature style" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {TYPED_SIGNATURE_STYLES.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setStyleIndex(i)}
                        aria-pressed={styleIndex === i}
                        aria-label={`Style: ${s.label}`}
                        style={{
                          padding: "10px 14px", borderRadius: 8,
                          border: `1.5px solid ${styleIndex === i ? AZURE : "#E3E8EF"}`,
                          background: styleIndex === i ? "#EBF4FC" : "#FAFBFC",
                          cursor: "pointer", textAlign: "left",
                        }}
                      >
                        <span style={{
                          fontFamily: s.fontFamily, fontSize: s.fontSize,
                          fontStyle:  s.fontStyle,  color: NAVY,
                          display: "block", lineHeight: 1.3, minHeight: 36,
                        }}>
                          {typedText || (kind === "initials" ? "M.R." : "Your Signature")}
                        </span>
                        <span style={{ ...GF, fontSize: 10, color: SILVER, display: "block", marginTop: 2 }}>
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Preview</div>
                  <TypedPreview text={typedText} styleIndex={styleIndex} />
                  <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 4 }}>
                    Plain text: <strong>{typedText || "(no text entered)"}</strong>
                  </div>
                </div>
              </>
            )}

            {/* Drawn panel */}
            {method === "drawn" && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>
                      Draw your {kindLabel.toLowerCase()} <span aria-label="required" style={{ color: RED }}>*</span>
                    </div>
                    <button onClick={clearCanvas} style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: SLATE, fontSize: 12, fontWeight: 600 }}>
                      Clear
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={kind === "initials" ? 100 : 140}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    aria-label={`Drawing surface — draw your ${kindLabel.toLowerCase()} with your mouse or finger`}
                    style={{
                      display: "block", width: "100%",
                      height: kind === "initials" ? 100 : 140,
                      border: `1.5px dashed ${errors.drawing ? RED : "#D1D9E0"}`,
                      borderRadius: 8, background: "#FAFBFC",
                      cursor: "crosshair", touchAction: "none",
                    }}
                  />
                  {!hasDrawing && (
                    <p style={{ ...GF, fontSize: 12, color: SILVER, textAlign: "center", margin: "6px 0 0" }}>
                      Draw above with your mouse or finger
                    </p>
                  )}
                  {errors.drawing && (
                    <div role="alert" style={{ ...GF, fontSize: 12, color: RED, marginTop: 4 }}>{errors.drawing}</div>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <button
                    onClick={() => { setMethod("typed"); clearCanvas(); }}
                    style={{ ...GF, background: "none", border: "none", color: AZURE, fontSize: 13, cursor: "pointer", padding: 0, fontWeight: 600 }}
                  >
                    Type instead →
                  </button>
                  <span style={{ ...GF, fontSize: 12, color: SILVER, marginLeft: 8 }}>
                    Typing is always available as an alternative.
                  </span>
                </div>
              </>
            )}

            {/* Set as default */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ ...GF, fontSize: 13, color: NAVY, display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={e => setSetAsDefault(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <span>
                  Set as my default {kindLabel.toLowerCase()}
                  <span style={{ ...GF, fontSize: 11, color: SILVER, display: "block", marginTop: 2 }}>
                    Your default is suggested during signing but you must still explicitly adopt it for each request.
                  </span>
                </span>
              </label>
            </div>

            {/* Acknowledgment — must not be pre-selected */}
            <div style={{ marginBottom: 14, padding: "12px 14px", background: "#F8FAFC", border: `1.5px solid ${errors.acknowledged ? RED : "#E3E8EF"}`, borderRadius: 8 }}>
              <label style={{ ...GF, fontSize: 13, color: NAVY, display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={e => setAcknowledged(e.target.checked)}
                  aria-required="true"
                  aria-invalid={!!errors.acknowledged}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <span>
                  I understand that this is a reusable signature representation. I must still explicitly adopt it for each signing request.
                </span>
              </label>
              {errors.acknowledged && (
                <div role="alert" style={{ ...GF, fontSize: 12, color: RED, marginTop: 6 }}>{errors.acknowledged}</div>
              )}
            </div>

            {/* Legal note */}
            <p style={{ ...GF, fontSize: 11, color: SILVER, lineHeight: 1.6, margin: "0 0 16px" }}>
              This representation is retained only in frontend demonstration state. It is not uploaded, encrypted, synchronized, or stored by a backend.
              It does not verify identity or determine the legal effect of any document.
            </p>

            {/* Global error */}
            {globalError && (
              <div role="alert" style={{ ...GF, fontSize: 12, color: RED, marginBottom: 12 }}>{globalError}</div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={handleCreate}
                disabled={saving}
                style={{ ...BTN_PRIMARY, opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "Creating…" : `Create ${kindLabel}`}
              </button>
              <Link to="/app/settings/signatures" style={{ ...BTN_SECONDARY, textDecoration: "none", display: "inline-block" }}>
                Cancel
              </Link>
            </div>
          </SCard>
        </>
      )}
    </SettingsPage>
  );
}
