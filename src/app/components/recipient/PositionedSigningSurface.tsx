// The document a signer actually signs, with their fields where the sender
// put them.
//
// ── What this replaces ─────────────────────────────────────────────────────
//
// An `<iframe>` of the PDF, plus a separate list of inputs underneath it. The
// signer could read the document and could fill fields, but the two were
// unrelated: nothing showed WHERE a signature would land, and a document with
// three signature blocks looked exactly like one with none.
//
// ── Why the source PDF is not modified ─────────────────────────────────────
//
// A reasonable expectation is that placing fields edits the file, and that the
// edited file is what the signer opens. It does not work that way, and the
// reason is integrity rather than convenience:
//
//   - the source artifact's SHA-256 is its identity, and `sourceArtifactId` is
//     frozen onto the signing request;
//   - fields live in the database as normalised 0-1 rects;
//   - the merge draws them onto the source only at completion, producing a
//     NEW sealed artifact.
//
// So the signer is shown the original document plus a positioned overlay —
// visually what an edited file would look like, while the bytes everyone
// signed against stay provably unchanged. This component is that overlay.
//
// ── One adopted signature, many boxes ──────────────────────────────────────
//
// `SubmitSigningInput` carries ONE `signature` and ONE `initials` for the
// whole submission; a signature field's value is `{ kind: "signature",
// fieldId }` with no per-field representation. So a signer adopts a signature
// once and it applies to every signature box that is theirs — which is also
// how people expect signing to work. Text fields do carry per-field values.

import React, { useMemo, useRef, useState } from "react";
import {
  useRealDocument, DocumentPageSurface,
} from "../pdf/DocumentPageSurface";
import {
  SignatureCapture, type SignatureValue, type PreparedMark,
} from "./SignatureCapture";
import type { CeremonyField } from "../../services/real/signing-access.service";
import { Z } from "../../utils/z-index";
import { T } from "./signer-ui";
import {
  CheckCircle2, ListChecks, FileText, AlertTriangle, Loader2, X,
} from "lucide-react";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SILVER = "#8A9BAE";
const AMBER = "#B8860B";

export interface PositionedSigningSurfaceProps {
  /** Memoised by the caller — see `useRealDocument`. */
  readonly loadBlob: () => Promise<Blob>;
  /** Every field on the request; this filters to the signer's own. */
  readonly fields: readonly CeremonyField[];
  readonly signature: SignatureValue | null;
  readonly initials: SignatureValue | null;
  readonly textValues: Record<string, string | boolean>;
  readonly onSignature: (value: SignatureValue | null) => void;
  readonly onInitials: (value: SignatureValue | null) => void;
  readonly onTextValue: (fieldId: string, value: string | boolean) => void;
  readonly disabled?: boolean;
  /** Marks the server holds for this session, offered before the three ways. */
  readonly prepared?: readonly PreparedMark[];
  /** Printed under a signature-over-name field, as the sealed page will. */
  readonly signerName?: string;
}

/** Where the rule sits in a signature-over-name box, matching the sealer. */
const BLOCK_RULE_AT = 0.66;
/** The printed name's size on the sealed page, in points. */
const BLOCK_NAME_PT = 11;

/** What a field box shows when it has been filled. */
function FilledMark({ value, prepared }: {
  value: SignatureValue;
  /** The mark the server holds, so "saved" can be previewed like any other. */
  prepared?: PreparedMark | null;
}) {
  // A saved mark carries no content — the server has it. Rendering it means
  // rendering what was prepared, so the box shows the same thing the document
  // will, rather than a placeholder that says nothing.
  const shown: SignatureValue | null = value.method !== "saved"
    ? value
    : prepared == null
      ? null
      : prepared.method === "drawn" && prepared.base64 !== undefined
        ? { method: "drawn", base64: prepared.base64 }
        : { method: "typed", text: prepared.text ?? "", styleIndex: prepared.styleIndex ?? 0 };

  if (shown === null) return null;
  value = shown;

  if (value.method === "drawn") {
    return (
      <img
        src={`data:image/png;base64,${value.base64}`}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    );
  }
  return (
    <span
      style={{
        // The face the server draws with, so the box previews the document
        // rather than something prettier than the document.
        fontFamily: "'Noto Sans', system-ui, sans-serif",
        fontStyle: "italic",
        color: NAVY,
        fontSize: "min(2.2vw, 18px)",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {value.method === "typed" ? value.text : ""}
    </span>
  );
}

export function PositionedSigningSurface({
  loadBlob, fields, signature, initials, textValues,
  onSignature, onInitials, onTextValue, disabled = false, prepared, signerName = "",
}: PositionedSigningSurfaceProps) {
  const document_ = useRealDocument(loadBlob);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  /** Which purpose the capture sheet is currently collecting. */
  const [capturing, setCapturing] = useState<"signature" | "initials" | null>(null);

  // Only the signer's own fields are shown as fillable. Server-derived ones
  // (`date-signed`, `full-name`, `email`) are filled by LAGDA and a client
  // cannot express a value for them at all.
  const mine = useMemo(
    () => fields.filter(field => field.valueAuthority === "RECIPIENT_SUPPLIED"),
    [fields],
  );

  // ── Measuring the surface ─────────────────────────────────────────────────
  //
  // A `ResizeObserver` rather than a window-resize listener, because the box
  // can change size without the window doing so: a sidebar opening, a font
  // loading, a parent that starts collapsed. A one-shot measure taken while
  // the container happened to be zero-width would leave the document blank
  // permanently, which on a signing surface is the worst possible failure.
  React.useEffect(() => {
    const element = wrapRef.current;
    if (element === null) return;

    const measure = () => { setWidth(element.clientWidth); };
    measure();

    if (typeof ResizeObserver === "undefined") {
      // Older browsers, and jsdom. The window listener is strictly weaker —
      // it misses container-only changes — but it is better than nothing.
      window.addEventListener("resize", measure);
      return () => { window.removeEventListener("resize", measure); };
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { observer.disconnect(); };
  }, [document_.status]);

  if (document_.status === "loading" || document_.status === "idle") {
    return (
      <div style={{
        ...GF, display: "flex", flexDirection: "column", alignItems: "center",
        gap: 10, padding: "40px 20px", color: SILVER,
      }}>
        <Loader2 size={22} aria-hidden />
        <span style={{ fontSize: 13 }}>Loading your document…</span>
      </div>
    );
  }
  if (document_.status === "error") {
    return (
      <div role="alert" style={{
        ...GF, display: "flex", gap: 10, alignItems: "flex-start",
        padding: "13px 15px", borderRadius: 12,
        background: T.dangerWash, border: `1px solid #F3C4BF`,
        color: T.danger, fontSize: 13, lineHeight: 1.5,
      }}>
        <AlertTriangle size={16} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{document_.message}</span>
      </div>
    );
  }

  const valueFor = (field: CeremonyField): SignatureValue | null =>
    field.type === "initials" ? initials : signature;

  const remaining = mine.filter(field => {
    if (field.type === "signature" || field.type === "signature-block") return signature === null;
    if (field.type === "initials") return initials === null;
    if (!field.required) return false;
    if (field.type === "checkbox") return textValues[field.fieldId] !== true;
    const text = textValues[field.fieldId];
    return typeof text !== "string" || text.trim() === "";
  }).length;

  return (
    <div>
      {/* A running count, because a signer on page 1 of a 12-page contract
          otherwise has no way to know something is waiting on page 9. */}
      <div
        aria-live="polite"
        style={{
          ...GF, display: "flex", alignItems: "center", gap: 10,
          fontSize: "clamp(12.5px, 3.3vw, 13.5px)", fontWeight: 700,
          marginBottom: 12, padding: "10px 13px", borderRadius: 12,
          background: remaining === 0 ? T.successWash : T.warnWash,
          border: `1px solid ${remaining === 0 ? "#B7E3CA" : "#EBD9A6"}`,
          color: remaining === 0 ? T.success : "#9A6B00",
          // Sticks under the header so the count follows the signer down a
          // long document — the one number they need while scrolling.
          position: "sticky", top: 56, zIndex: 2,
        }}
      >
        {remaining === 0
          ? <CheckCircle2 size={17} aria-hidden style={{ flexShrink: 0 }} />
          : <ListChecks size={17} aria-hidden style={{ flexShrink: 0 }} />}
        <span style={{ minWidth: 0 }}>
          {remaining === 0
            ? "All your fields are complete"
            : `${String(remaining)} field${remaining === 1 ? "" : "s"} still need your input`}
        </span>
      </div>

      <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Array.from({ length: document_.pageCount }, (_, index) => {
          const pageNumber = index + 1;
          const size = document_.pageSizes[index];
          if (size === undefined || width === 0) return null;
          const height = width * (size.height / size.width);
          const onPage = mine.filter(field => field.pageNumber === pageNumber);

          return (
            <div key={pageNumber}>
              <p style={{
                ...GF, display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                textTransform: "uppercase", color: SILVER, margin: "0 0 5px",
              }}>
                <FileText size={12} aria-hidden />
                Page {pageNumber} of {document_.pageCount}
              </p>
              <div
                style={{
                  position: "relative", width: "100%", height,
                  border: "1px solid #E3E8EF", borderRadius: 6,
                  background: "#FFFFFF", overflow: "hidden",
                }}
              >
                <DocumentPageSurface
                  doc={document_.doc}
                  pageNumber={pageNumber}
                  width={width}
                  height={height}
                />

                {onPage.map(field => {
                  const isBlock = field.type === "signature-block";
                  const isMark = field.type === "signature" || field.type === "initials" || isBlock;
                  const mark = isMark ? valueFor(field) : null;
                  const filled = isMark
                    ? mark !== null
                    : field.type === "checkbox"
                      ? textValues[field.fieldId] === true
                      : typeof textValues[field.fieldId] === "string"
                        && (textValues[field.fieldId] as string).trim() !== "";

                  return (
                    <div
                      key={field.fieldId}
                      style={{
                        position: "absolute",
                        // The SAME normalised rect the sender placed and the
                        // merge will draw. `y` is from the page top, which is
                        // what `top` means here too.
                        left: `${String(field.x * 100)}%`,
                        top: `${String(field.y * 100)}%`,
                        width: `${String(field.width * 100)}%`,
                        height: `${String(field.height * 100)}%`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: filled ? `1px solid ${AZURE}` : `2px dashed ${AMBER}`,
                        background: filled ? "rgba(0,120,212,0.06)" : "rgba(184,134,11,0.10)",
                        borderRadius: 3,
                        // NOT `overflow: hidden` — it would clip the expanded
                        // tap target back to the visual box and undo the fix
                        // above. The mark itself is constrained by its own
                        // `object-fit`/`overflow` instead.
                        overflow: "visible",
                      }}
                    >
                      {isMark
                        ? isBlock
                          ? (
                            <>
                              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: `${String(BLOCK_RULE_AT * 100)}%` }}>
                                <button
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                setCapturing(field.type === "initials" ? "initials" : "signature");
                              }}
                              aria-label={
                                mark === null
                                  ? `Add your ${field.type === "initials" ? "initials" : "signature"} — ${field.label}`
                                  : `Change your ${field.type === "initials" ? "initials" : "signature"} — ${field.label}`
                              }
                              style={{
                                // ── The tap target, expanded past the box ──
                                //
                                // A field is drawn at its TRUE size, because it
                                // has to match what the merge will render. At
                                // 320px a 8%-tall box on an A4 page is about
                                // 35px — under the 44px a finger hits reliably.
                                //
                                // So the visual box stays exactly where the
                                // sender put it, and the BUTTON grows around
                                // its centre to reach 44px. The mark still
                                // renders at the box's real size; only the
                                // area that accepts a tap is larger.
                                position: "absolute",
                                left: "50%", top: "50%",
                                transform: "translate(-50%, -50%)",
                                width: "max(100%, 44px)", height: "max(100%, 44px)",
                                border: "none",
                                background: "transparent", cursor: disabled ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                padding: 2,
                              }}
                            >
                              {mark === null
                                ? (
                                  <span style={{
                                    ...GF, fontWeight: 800, whiteSpace: "nowrap",
                                    // A floor as well as a ceiling: `min(1.6vw, …)`
                                    // alone renders ~5px at 320px, which is not
                                    // a legible prompt.
                                    fontSize: "clamp(9px, 1.9vw, 12px)",
                                    color: AMBER, letterSpacing: "0.02em",
                                  }}>
                                    {field.type === "initials" ? "Initials" : "Sign"}
                                  </span>
                                )
                                : (
                                  <FilledMark
                                    value={mark}
                                    prepared={prepared?.find(
                                      entry => entry.purpose === (
                                        field.type === "initials" ? "initials" : "signature"
                                      )) ?? null}
                                  />
                                )}
                            </button>
                              </div>
                              <div aria-hidden style={{
                                position: "absolute", left: "6%", right: "6%",
                                top: `${String(BLOCK_RULE_AT * 100)}%`, borderTop: `1px solid ${NAVY}`,
                              }} />
                              <div style={{
                                position: "absolute", left: 0, right: 0,
                                top: `calc(${String(BLOCK_RULE_AT * 100)}% + 2px)`,
                                textAlign: "center", color: NAVY, lineHeight: 1.1,
                                // The face and size the sealed page prints the name in.
                                fontFamily: "Tinos, 'Times New Roman', Times, serif",
                                fontSize: `${String(width * (BLOCK_NAME_PT / size.width))}px`,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                pointerEvents: "none",
                              }}>
                                {signerName}
                              </div>
                            </>
                          )
                          : (
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              setCapturing(field.type === "initials" ? "initials" : "signature");
                            }}
                            aria-label={
                              mark === null
                                ? `Add your ${field.type === "initials" ? "initials" : "signature"} — ${field.label}`
                                : `Change your ${field.type === "initials" ? "initials" : "signature"} — ${field.label}`
                            }
                            style={{
                              // ── The tap target, expanded past the box ──
                              //
                              // A field is drawn at its TRUE size, because it
                              // has to match what the merge will render. At
                              // 320px a 8%-tall box on an A4 page is about
                              // 35px — under the 44px a finger hits reliably.
                              //
                              // So the visual box stays exactly where the
                              // sender put it, and the BUTTON grows around
                              // its centre to reach 44px. The mark still
                              // renders at the box's real size; only the
                              // area that accepts a tap is larger.
                              position: "absolute",
                              left: "50%", top: "50%",
                              transform: "translate(-50%, -50%)",
                              width: "max(100%, 44px)", height: "max(100%, 44px)",
                              border: "none",
                              background: "transparent", cursor: disabled ? "not-allowed" : "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              padding: 2,
                            }}
                          >
                            {mark === null
                              ? (
                                <span style={{
                                  ...GF, fontWeight: 800, whiteSpace: "nowrap",
                                  // A floor as well as a ceiling: `min(1.6vw, …)`
                                  // alone renders ~5px at 320px, which is not
                                  // a legible prompt.
                                  fontSize: "clamp(9px, 1.9vw, 12px)",
                                  color: AMBER, letterSpacing: "0.02em",
                                }}>
                                  {field.type === "initials" ? "Initials" : "Sign"}
                                </span>
                              )
                              : (
                                <FilledMark
                                  value={mark}
                                  prepared={prepared?.find(
                                    entry => entry.purpose === (
                                      field.type === "initials" ? "initials" : "signature"
                                    )) ?? null}
                                />
                              )}
                          </button>
                        )
                        : field.type === "checkbox"
                          ? (
                            <input
                              type="checkbox"
                              disabled={disabled}
                              aria-label={field.label}
                              checked={textValues[field.fieldId] === true}
                              onChange={event => { onTextValue(field.fieldId, event.target.checked); }}
                              style={{
                                // The same reasoning as the signature button
                                // above, which this had been left out of. A
                                // checkbox rect on an A4 page is often ~14px
                                // at 320px — a browser default checkbox is
                                // ~13px and the box around it does not help.
                                //
                                // The INPUT grows to 44px around the centre
                                // while the visual field box stays exactly
                                // where the sender placed it, so what is
                                // tappable is larger than what is drawn.
                                position: "absolute",
                                left: "50%", top: "50%",
                                transform: "translate(-50%, -50%)",
                                width: "max(100%, 44px)",
                                height: "max(100%, 44px)",
                                margin: 0,
                                cursor: disabled ? "not-allowed" : "pointer",
                              }}
                            />
                          )
                          : (
                            <input
                              disabled={disabled}
                              aria-label={field.label}
                              maxLength={field.maxLength ?? undefined}
                              value={typeof textValues[field.fieldId] === "string"
                                ? (textValues[field.fieldId] as string) : ""}
                              onChange={event => { onTextValue(field.fieldId, event.target.value); }}
                              style={{
                                ...GF, width: "100%", height: "100%", border: "none",
                                background: "transparent", padding: "0 4px",
                                // A FLOOR as well as a ceiling. `min(1.6vw,
                                // 13px)` alone computes to ~5px at 320px,
                                // which is not readable — the signature
                                // prompt above already carries a clamp for
                                // exactly this reason and this input was
                                // simply missed.
                                fontSize: "clamp(11px, 1.6vw, 13px)", color: NAVY,
                              }}
                            />
                          )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* The capture sheet. Opened from a box on the page, so the signer sees
          where the mark is going before they make it. */}
      {capturing !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Add your ${capturing}`}
          style={{
            position: "fixed", inset: 0, zIndex: Z.modal,
            background: "rgba(7,17,31,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
          onClick={event => {
            if (event.target === event.currentTarget) setCapturing(null);
          }}
        >
          <div style={{
            background: "#FFFFFF", borderRadius: 16,
            padding: "clamp(14px, 4vw, 20px)",
            width: "100%", maxWidth: 460, maxHeight: "90dvh", overflowY: "auto",
            boxShadow: "0 18px 48px rgba(7,17,31,0.28)",
          }}>
            <div style={{
              display: "flex", justifyContent: "flex-end", marginBottom: 2,
            }}>
              <button
                type="button"
                onClick={() => { setCapturing(null); }}
                aria-label="Close"
                style={{
                  display: "grid", placeItems: "center",
                  width: 36, height: 36, borderRadius: 999,
                  border: "none", background: "transparent",
                  color: T.silver, cursor: "pointer",
                }}
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <SignatureCapture
              label={capturing === "initials" ? "Your initials" : "Your signature"}
              purpose={capturing}
              value={capturing === "initials" ? initials : signature}
              onChange={capturing === "initials" ? onInitials : onSignature}
              disabled={disabled}
              prepared={prepared?.find(mark => mark.purpose === capturing) ?? null}
            />
            <button
              type="button"
              onClick={() => { setCapturing(null); }}
              style={{
                ...GF, display: "inline-flex", alignItems: "center",
                justifyContent: "center", gap: 8,
                width: "100%", marginTop: 10, minHeight: 44,
                borderRadius: 10, border: "none", background: AZURE,
                color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              <CheckCircle2 size={16} aria-hidden />
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
