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
import { SignatureCapture, type SignatureValue } from "./SignatureCapture";
import type { CeremonyField } from "../../services/real/signing-access.service";
import { Z } from "../../utils/z-index";

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
}

/** What a field box shows when it has been filled. */
function FilledMark({ value }: { value: SignatureValue }) {
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
      {value.text}
    </span>
  );
}

export function PositionedSigningSurface({
  loadBlob, fields, signature, initials, textValues,
  onSignature, onInitials, onTextValue, disabled = false,
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
      <p style={{ ...GF, fontSize: 13, color: SILVER, textAlign: "center", padding: 24 }}>
        Loading your document…
      </p>
    );
  }
  if (document_.status === "error") {
    return (
      <p role="alert" style={{ ...GF, fontSize: 13, color: "#C0392B", padding: 16 }}>
        {document_.message}
      </p>
    );
  }

  const valueFor = (field: CeremonyField): SignatureValue | null =>
    field.type === "initials" ? initials : signature;

  const remaining = mine.filter(field => {
    if (field.type === "signature") return signature === null;
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
          ...GF, fontSize: 13, fontWeight: 600, marginBottom: 12, padding: "8px 12px",
          borderRadius: 8, background: remaining === 0 ? "#EAF7EF" : "#FFF8E6",
          color: remaining === 0 ? "#1E7F4F" : AMBER,
        }}
      >
        {remaining === 0
          ? "All your fields are complete."
          : `${String(remaining)} field${remaining === 1 ? "" : "s"} still need your input.`}
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
              <p style={{ ...GF, fontSize: 11, color: SILVER, margin: "0 0 4px" }}>
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
                  const isMark = field.type === "signature" || field.type === "initials";
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
                        borderRadius: 3, overflow: "hidden",
                      }}
                    >
                      {isMark
                        ? (
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              setCapturing(field.type === "initials" ? "initials" : "signature");
                            }}
                            aria-label={
                              mark === null
                                ? `Add your ${field.type} — ${field.label}`
                                : `Change your ${field.type} — ${field.label}`
                            }
                            style={{
                              width: "100%", height: "100%", border: "none",
                              background: "transparent", cursor: disabled ? "not-allowed" : "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              padding: 2,
                            }}
                          >
                            {mark === null
                              ? (
                                <span style={{
                                  ...GF, fontSize: "min(1.6vw, 12px)", fontWeight: 700,
                                  color: AMBER, whiteSpace: "nowrap",
                                }}>
                                  {field.type === "initials" ? "Initials" : "Sign"}
                                </span>
                              )
                              : <FilledMark value={mark} />}
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
                                fontSize: "min(1.6vw, 13px)", color: NAVY,
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
            background: "#FFFFFF", borderRadius: 12, padding: 20,
            width: "100%", maxWidth: 460, maxHeight: "90dvh", overflowY: "auto",
          }}>
            <SignatureCapture
              label={capturing === "initials" ? "Your initials" : "Your signature"}
              purpose={capturing}
              value={capturing === "initials" ? initials : signature}
              onChange={capturing === "initials" ? onInitials : onSignature}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => { setCapturing(null); }}
              style={{
                ...GF, width: "100%", marginTop: 8, padding: "10px 0",
                borderRadius: 8, border: "none", background: AZURE,
                color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
