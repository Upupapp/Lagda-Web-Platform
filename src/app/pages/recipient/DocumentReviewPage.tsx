// Main document review workspace for recipients.
// Shows fictional CSS page previews (no real PDF), field overlays, field list panel,
// doc/page navigation, and role-aware action panel.
// Other participants' fields are shown as read-only overlays — cannot be interacted with.

import React, { useState } from "react";
import { useRecipient, TYPED_SIGNATURE_STYLES } from "../../context/RecipientContext";
import { RECIPIENT_ROLE_LABELS } from "../../models/recipient";
import { SignatureAdoptionDialog } from "./SignatureAdoptionDialog";
import type { RecipientField } from "../../models/recipient";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";
const GOLD   = "#C9960C";

// A4 proportions
const PAGE_WIDTH  = 595;
const PAGE_ASPECT = 842 / 595;

// ── Fictional page content (CSS only, no real PDF) ────────────────────────────

function FictionPageContent({ pageNumber }: { pageNumber: number }) {
  const lines = pageNumber === 1 ? [0.9, 0.7, 0.85, 0.75, 0.8] : [0.85, 0.7, 0.9, 0.65, 0.8, 0.75];
  return (
    <>
      {/* Letterhead block */}
      <div style={{ height: 48, background: "#F0F4F8", borderRadius: 4, marginBottom: 16, display: "flex", alignItems: "center", padding: "0 14px" }}>
        <div style={{ width: 28, height: 28, background: "#C8DCEE", borderRadius: 4, marginRight: 10 }} />
        <div>
          <div style={{ width: 80, height: 8, background: "#C8DCEE", borderRadius: 3, marginBottom: 5 }} />
          <div style={{ width: 120, height: 6, background: "#DDE6EF", borderRadius: 3 }} />
        </div>
      </div>
      {/* Title */}
      {pageNumber === 1 && (
        <div style={{ width: "70%", height: 12, background: "#B8CAD9", borderRadius: 3, marginBottom: 8, marginLeft: "15%" }} />
      )}
      {/* Paragraphs */}
      {lines.map((w, i) => (
        <div key={i} style={{ width: `${w * 100}%`, height: 7, background: "#E3E8EF", borderRadius: 3, marginBottom: 6 }} />
      ))}
      <div style={{ width: "40%", height: 7, background: "#E3E8EF", borderRadius: 3, marginBottom: 16 }} />
      {/* Second paragraph */}
      {[0.88, 0.72, 0.80, 0.65].map((w, i) => (
        <div key={`b${i}`} style={{ width: `${w * 100}%`, height: 7, background: "#E3E8EF", borderRadius: 3, marginBottom: 6 }} />
      ))}
      <div style={{ width: "55%", height: 7, background: "#E3E8EF", borderRadius: 3, marginBottom: 20 }} />
      {/* Page number */}
      <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", width: 20, height: 6, background: "#D1D9E0", borderRadius: 3 }} />
    </>
  );
}

// ── Field overlay on page ─────────────────────────────────────────────────────

function FieldOverlay({
  field,
  pagePixelWidth,
  pagePixelHeight,
  value,
  onInteract,
  signatureAdopted,
  initialsAdopted,
  signatureDataUrl,
  initialsDataUrl,
  signatureTypedText,
  initialsTypedText,
  signatureStyle,
  initialsStyle,
}: {
  field: RecipientField;
  pagePixelWidth: number;
  pagePixelHeight: number;
  value: string | boolean | null | undefined;
  onInteract: (field: RecipientField) => void;
  signatureAdopted: boolean;
  initialsAdopted: boolean;
  signatureDataUrl: string | null;
  initialsDataUrl: string | null;
  signatureTypedText: string;
  initialsTypedText: string;
  signatureStyle: number;
  initialsStyle: number;
}) {
  const { rect } = field;
  const left   = rect.x * pagePixelWidth;
  const top    = rect.y * pagePixelHeight;
  const width  = rect.width  * pagePixelWidth;
  const height = rect.height * pagePixelHeight;

  const isMine      = field.assignedToMe && !field.isSenderText;
  const isSenderTxt = field.isSenderText;
  const isSignature = field.type === "signature";
  const isInitials  = field.type === "initials";

  // Sender text: read-only with content
  if (isSenderTxt) {
    return (
      <div
        aria-label={`Sender note: ${field.senderText ?? ""}`}
        style={{
          position:   "absolute",
          left, top, width, height,
          background: "rgba(235, 244, 252, 0.85)",
          border:     "1px solid #C8E1F5",
          borderRadius: 3,
          padding:    "3px 6px",
          fontSize:   Math.max(8, Math.round(height * 0.45)),
          color:      "#2C5F8A",
          overflow:   "hidden",
          display:    "flex",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {field.senderText}
      </div>
    );
  }

  // Other participants' field: greyed out, not interactive
  if (!isMine) {
    return (
      <div
        aria-label={`${field.label} — assigned to another participant`}
        style={{
          position:   "absolute",
          left, top, width, height,
          background: "rgba(200, 210, 220, 0.35)",
          border:     "1px dashed #C8D2DC",
          borderRadius: 3,
          cursor:     "not-allowed",
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize:   Math.max(7, Math.round(height * 0.38)),
          color:      "#A0B0BE",
        }}
      >
        {field.label}
      </div>
    );
  }

  // Adopted signature display
  if (isSignature && signatureAdopted) {
    const typedStyle = TYPED_SIGNATURE_STYLES[signatureStyle] ?? TYPED_SIGNATURE_STYLES[0];
    const fontFamily = typedStyle.fontFamily;
    const fontStyleStr = typedStyle.fontStyle;
    return (
      <div
        aria-label={`Signature: ${signatureTypedText}`}
        style={{
          position:   "absolute",
          left, top, width, height,
          border:     "1.5px solid #A8D5B5",
          borderRadius: 3,
          background: "#F8FFF9",
          display:    "flex",
          alignItems: "center",
          padding:    "2px 6px",
          overflow:   "hidden",
          cursor:     "pointer",
        }}
        onClick={() => onInteract(field)}
      >
        <span style={{ fontFamily, fontStyle: fontStyleStr, fontSize: Math.max(10, height * 0.5), color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {signatureTypedText || "Signature"}
        </span>
      </div>
    );
  }

  if (isInitials && initialsAdopted) {
    const initTypedStyle = TYPED_SIGNATURE_STYLES[initialsStyle] ?? TYPED_SIGNATURE_STYLES[0];
    const fontFamily = initTypedStyle.fontFamily;
    const fontStyleStr = initTypedStyle.fontStyle;
    return (
      <div
        aria-label={`Initials: ${initialsTypedText}`}
        style={{
          position:   "absolute",
          left, top, width, height,
          border:     "1.5px solid #A8D5B5",
          borderRadius: 3,
          background: "#F8FFF9",
          display:    "flex",
          alignItems: "center",
          padding:    "2px 6px",
          overflow:   "hidden",
          cursor:     "pointer",
        }}
        onClick={() => onInteract(field)}
      >
        <span style={{ fontFamily, fontStyle: fontStyleStr, fontSize: Math.max(9, height * 0.55), color: NAVY }}>
          {initialsTypedText || "I"}
        </span>
      </div>
    );
  }

  // My field — interactive
  const isEmpty = value === undefined || value === null || value === "" || value === false;
  const bgColor = isEmpty
    ? (field.required ? "rgba(255, 243, 215, 0.9)" : "rgba(235, 244, 252, 0.85)")
    : "rgba(232, 248, 237, 0.9)";
  const borderColor = isEmpty
    ? (field.required ? GOLD : AZURE)
    : "#4CAF50";

  return (
    <button
      aria-label={`${field.label}${field.required ? " (required)" : ""}: ${isEmpty ? "empty" : "filled"}`}
      onClick={() => onInteract(field)}
      style={{
        position:   "absolute",
        left, top, width, height,
        background: bgColor,
        border:     `1.5px solid ${borderColor}`,
        borderRadius: 3,
        cursor:     "pointer",
        display:    "flex",
        alignItems: "center",
        padding:    "2px 6px",
        overflow:   "hidden",
        fontSize:   Math.max(8, Math.round(height * 0.4)),
        color:      isEmpty ? "#8A6F1E" : "#2E7D32",
        fontFamily: "'Geist', sans-serif",
      }}
    >
      {isEmpty ? field.label : (
        typeof value === "boolean" ? (value ? "✓" : "") : String(value).slice(0, 40)
      )}
    </button>
  );
}

// ── Field interaction panel (right sidebar) ───────────────────────────────────

function FieldPanel({ activeField, onClose }: { activeField: RecipientField | null; onClose: () => void }) {
  const {
    state, setFieldValue, openSignatureDialog, goToSummary,
    allRequiredComplete, myFields, role, setStep,
  } = useRecipient();

  if (!activeField) {
    // Field list
    const myRequired = myFields.filter(f => f.required);
    const myOptional = myFields.filter(f => !f.required);

    return (
      <div style={{ padding: "16px 14px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Your Fields ({myFields.length})
        </div>
        {myRequired.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: SILVER, marginBottom: 6 }}>Required</div>
            {myRequired.map(f => {
              const val = state.fieldValues[f.id];
              const isFilled = val !== undefined && val !== null && val !== "" && val !== false;
              const isSig = f.type === "signature";
              const isInit = f.type === "initials";
              const adopted = isSig ? state.signature.adopted : isInit ? state.initials.adopted : false;
              const done = isFilled || adopted;
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid #F0F2F5", fontSize: 12 }}>
                  <span style={{ color: done ? "#4CAF50" : GOLD, fontSize: 10 }}>{done ? "✓" : "○"}</span>
                  <span style={{ color: NAVY, flex: 1 }}>{f.label}</span>
                </div>
              );
            })}
          </>
        )}
        {myOptional.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: SILVER, marginBottom: 6, marginTop: 10 }}>Optional</div>
            {myOptional.map(f => {
              const val = state.fieldValues[f.id];
              const done = val !== undefined && val !== null && val !== "" && val !== false;
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid #F0F2F5", fontSize: 12 }}>
                  <span style={{ color: done ? "#4CAF50" : SILVER, fontSize: 10 }}>{done ? "✓" : "–"}</span>
                  <span style={{ color: SILVER, flex: 1 }}>{f.label}</span>
                </div>
              );
            })}
          </>
        )}
        {myFields.length === 0 && (
          <p style={{ fontSize: 12, color: SILVER, margin: 0 }}>No fields assigned to you.</p>
        )}
        {/* Continue button */}
        <button
          onClick={goToSummary}
          disabled={!allRequiredComplete}
          style={{
            ...GF, marginTop: 16, width: "100%", padding: "10px", borderRadius: 7,
            border: "none", background: allRequiredComplete ? AZURE : "#8AB8D8",
            color: WHITE, fontSize: 13, fontWeight: 700, cursor: allRequiredComplete ? "pointer" : "not-allowed",
          }}
        >
          {role === "viewer" || role === "copy-recipient" ? "Continue →" : "Review & Submit →"}
        </button>
        {role === "signer" && !state.signature.adopted && (
          <button
            onClick={() => openSignatureDialog("signature")}
            style={{ ...GF, marginTop: 8, width: "100%", padding: "9px", borderRadius: 7, border: `1.5px solid ${AZURE}`, background: WHITE, color: AZURE, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            ✍ Adopt Signature
          </button>
        )}
      </div>
    );
  }

  // Active field editor
  const f   = activeField;
  const val = state.fieldValues[f.id];
  const isSig  = f.type === "signature";
  const isInit = f.type === "initials";
  const isCb   = f.type === "checkbox";

  return (
    <div style={{ padding: "16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{f.label}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: SILVER, fontSize: 16, lineHeight: 1 }}>×</button>
      </div>

      {(isSig || isInit) && (
        <button
          onClick={() => { openSignatureDialog(isSig ? "signature" : "initials"); }}
          style={{ ...GF, width: "100%", padding: "10px", borderRadius: 7, border: `1.5px solid ${AZURE}`, background: WHITE, color: AZURE, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          ✍ {isSig ? (state.signature.adopted ? "Change Signature" : "Adopt Signature") : (state.initials.adopted ? "Change Initials" : "Adopt Initials")}
        </button>
      )}

      {isCb && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={val === true}
            onChange={e => setFieldValue(f.id, e.target.checked)}
            style={{ width: 16, height: 16, accentColor: AZURE }}
          />
          <span style={{ ...GF, fontSize: 13, color: NAVY }}>{f.label}</span>
        </label>
      )}

      {!isSig && !isInit && !isCb && (
        <div>
          {f.multiline ? (
            <textarea
              value={val as string ?? ""}
              onChange={e => setFieldValue(f.id, e.target.value)}
              placeholder={f.placeholder ?? f.label}
              rows={3}
              style={{ ...GF, display: "block", width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 7, border: "1px solid #D1D9E0", outline: "none", boxSizing: "border-box", resize: "vertical", color: NAVY }}
            />
          ) : (
            <input
              type={f.type === "date" ? "date" : "text"}
              value={val as string ?? ""}
              onChange={e => setFieldValue(f.id, e.target.value)}
              placeholder={f.placeholder ?? f.label}
              style={{ ...GF, display: "block", width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 7, border: "1px solid #D1D9E0", outline: "none", boxSizing: "border-box", color: NAVY }}
            />
          )}
        </div>
      )}

      {f.required && (
        <p style={{ fontSize: 11, color: GOLD, marginTop: 6 }}>Required field</p>
      )}
    </div>
  );
}

// ── Main document review page ─────────────────────────────────────────────────

export function DocumentReviewPage() {
  const {
    request, state, currentDocument, currentPage,
    currentPageFields, setDocument, setPage, setStep,
    openSignatureDialog, goToSummary, allRequiredComplete,
  } = useRecipient();

  const [activeField, setActiveField] = useState<RecipientField | null>(null);
  const [containerWidth, setContainerWidth] = useState(PAGE_WIDTH);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? PAGE_WIDTH;
      setContainerWidth(Math.min(w - 4, PAGE_WIDTH));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (!request || !currentDocument || !currentPage) return null;

  const pageWidth  = containerWidth;
  const pageHeight = pageWidth * PAGE_ASPECT;
  const role = request.participant.role;

  function handleFieldInteract(field: RecipientField) {
    if (!field.assignedToMe || field.isSenderText) return;
    if (field.type === "signature") { openSignatureDialog("signature"); return; }
    if (field.type === "initials")  { openSignatureDialog("initials");  return; }
    setActiveField(field);
  }

  return (
    <>
      {/* Signature dialog (portal-style overlay) */}
      {state.showSignatureDialog && <SignatureAdoptionDialog />}

      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          height:        "calc(100dvh - 52px - 40px)",
          minHeight:     500,
          overflow:      "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display:       "flex",
            alignItems:    "center",
            gap:           12,
            padding:       "10px 20px",
            background:    WHITE,
            borderBottom:  "1px solid #E3E8EF",
            flexShrink:    0,
            flexWrap:      "wrap",
          }}
        >
          <button
            onClick={() => setStep("consent")}
            style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: SILVER, fontSize: 12, padding: 0 }}
          >
            ← Back
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {request.transactionTitle}
            </div>
            <div style={{ fontSize: 11, color: SILVER }}>
              {RECIPIENT_ROLE_LABELS[role]} · {currentDocument.displayName}
            </div>
          </div>
          <button
            onClick={goToSummary}
            disabled={!allRequiredComplete}
            style={{
              ...GF, padding: "8px 16px", borderRadius: 7, border: "none",
              background: allRequiredComplete ? AZURE : "#8AB8D8",
              color: WHITE, fontSize: 13, fontWeight: 700,
              cursor: allRequiredComplete ? "pointer" : "not-allowed",
            }}
          >
            {role === "viewer" || role === "copy-recipient" ? "Continue →" : "Review & Submit →"}
          </button>
        </div>

        {/* Body: doc nav | page canvas | field panel */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Left: doc + page nav */}
          <div
            style={{
              width:        168,
              flexShrink:   0,
              borderRight:  "1px solid #E3E8EF",
              background:   "#F5F7FA",
              overflowY:    "auto",
              padding:      "12px 8px",
            }}
          >
            {request.documents.map(doc => (
              <div key={doc.id} style={{ marginBottom: 12 }}>
                <button
                  onClick={() => setDocument(doc.id)}
                  style={{
                    ...GF, display: "block", width: "100%", textAlign: "left",
                    padding: "6px 8px", borderRadius: 6, border: "none",
                    background: currentDocument.id === doc.id ? "#EBF4FC" : "transparent",
                    color: currentDocument.id === doc.id ? AZURE : NAVY,
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                    marginBottom: 4,
                  }}
                >
                  📄 {doc.displayName}
                </button>
                {doc.pages.map(pg => (
                  <button
                    key={pg.id}
                    onClick={() => setPage(pg.id)}
                    style={{
                      ...GF, display: "block", width: "100%", textAlign: "left",
                      padding: "4px 8px 4px 16px", borderRadius: 5, border: "none",
                      background: currentPage.id === pg.id ? "#D6EAFB" : "transparent",
                      color: currentPage.id === pg.id ? "#0057A0" : SILVER,
                      fontSize: 11, cursor: "pointer",
                    }}
                  >
                    {pg.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Center: page canvas */}
          <div
            ref={containerRef}
            style={{
              flex:       1,
              overflowY:  "auto",
              padding:    "20px",
              display:    "flex",
              justifyContent: "center",
              background: "#E8ECF0",
            }}
          >
            <div
              aria-label={`Document page: ${currentPage.label}`}
              style={{
                position:     "relative",
                width:        pageWidth,
                height:       pageHeight,
                background:   WHITE,
                borderRadius: 4,
                boxShadow:    "0 2px 12px rgba(0,0,0,0.10)",
                overflow:     "hidden",
                flexShrink:   0,
              }}
            >
              {/* Fictional page content */}
              <div style={{ position: "absolute", inset: "24px 28px", pointerEvents: "none" }}>
                <FictionPageContent pageNumber={currentPage.pageNumber} />
              </div>

              {/* Page watermark */}
              <div
                aria-hidden="true"
                style={{
                  position:    "absolute",
                  top:         "50%",
                  left:        "50%",
                  transform:   "translate(-50%, -50%) rotate(-35deg)",
                  fontSize:    Math.round(pageWidth * 0.065),
                  color:       "rgba(200, 210, 220, 0.35)",
                  fontWeight:  900,
                  letterSpacing: "0.15em",
                  pointerEvents: "none",
                  userSelect:  "none",
                  whiteSpace:  "nowrap",
                  textTransform: "uppercase",
                }}
              >
                Demo Preview
              </div>

              {/* Field overlays */}
              {currentPageFields.map(field => (
                <FieldOverlay
                  key={field.id}
                  field={field}
                  pagePixelWidth={pageWidth}
                  pagePixelHeight={pageHeight}
                  value={state.fieldValues[field.id]}
                  onInteract={handleFieldInteract}
                  signatureAdopted={state.signature.adopted}
                  initialsAdopted={state.initials.adopted}
                  signatureDataUrl={state.signature.drawnDataUrl}
                  initialsDataUrl={state.initials.drawnDataUrl}
                  signatureTypedText={state.signature.typedText}
                  initialsTypedText={state.initials.typedText}
                  signatureStyle={state.signature.styleIndex}
                  initialsStyle={state.initials.styleIndex}
                />
              ))}
            </div>
          </div>

          {/* Right: field panel */}
          <div
            style={{
              width:       220,
              flexShrink:  0,
              borderLeft:  "1px solid #E3E8EF",
              background:  WHITE,
              overflowY:   "auto",
            }}
          >
            <FieldPanel
              activeField={activeField}
              onClose={() => setActiveField(null)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
