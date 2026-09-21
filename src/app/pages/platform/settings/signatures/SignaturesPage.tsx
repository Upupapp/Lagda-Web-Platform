// Signatures & Initials — the real one.
//
// ── What replaced what ────────────────────────────────────────────────────
//
// This replaces four routed pages backed by an in-memory mock that reset on
// reload and was never connected to the signing ceremony. Someone could draw a
// signature here, name it, see it listed, and it would be gone on refresh —
// and would never have been used to sign anything even if it had persisted.
//
// Four pages became one because the mock modelled a LIBRARY of arbitrarily
// many entries, and the product has exactly two slots: a signature and a set
// of initials. With two slots there is nothing to browse, nothing to page
// through, and no detail view worth navigating to — the list IS the detail.
//
// ── Layout ────────────────────────────────────────────────────────────────
//
// Two cards, side by side where there is room and stacked where there is not,
// via `repeat(auto-fit, minmax(...))` rather than a breakpoint — so the reflow
// happens when the content needs it rather than at a width someone guessed.
// Everything inside is fluid `clamp()`, which is this design system's stated
// philosophy, and the whole page is usable at 320px.

import { useCallback, useEffect, useState } from "react";
import { Trash2, PenLine, Check } from "lucide-react";
import {
  realUserSignatureService, toPreviewDataUrl,
  type SavedSignature, type SignaturePurpose,
} from "../../../../services/real/user-signatures.service";
import { USE_REAL_BACKEND } from "../../../../services/backend-flag";
import { SignatureCapture, type SignatureValue }
  from "../../../../components/recipient/SignatureCapture";
import { useProcessing } from "../../../../services/processing.service";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import { GF, T, TAP, useViewport } from "../../../../components/system/design-system";
import { ApiError } from "../../../../services/api-client";

const SLOTS: { purpose: SignaturePurpose; title: string; hint: string }[] = [
  {
    purpose: "signature",
    title: "Signature",
    hint: "Used wherever a document asks you to sign.",
  },
  {
    purpose: "initials",
    title: "Initials",
    hint: "Used where a document asks you to initial a page or a clause.",
  },
];

function Preview({ saved }: { saved: SavedSignature }) {
  const dataUrl = toPreviewDataUrl(saved);
  const frame = {
    display: "grid",
    placeItems: "center",
    // Fluid rather than fixed: at 320px a 120px-tall box is a third of the
    // viewport, and at desktop width a small one looks lost.
    minHeight: "clamp(96px, 22vw, 132px)",
    padding: "clamp(14px, 4vw, 20px)",
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    background: T.canvas,
  } as const;

  if (dataUrl !== null) {
    return (
      <div style={frame}>
        <img
          src={dataUrl}
          alt={`Your saved ${saved.purpose}`}
          style={{ maxWidth: "100%", maxHeight: "clamp(68px, 17vw, 100px)", objectFit: "contain" }}
        />
      </div>
    );
  }
  return (
    <div style={frame}>
      <span style={{
        ...GF,
        fontSize: "clamp(18px, 5.4vw, 26px)",
        color: T.ink,
        // The four typed styles render identically today, so this shows the
        // text rather than pretending to preview a face it will not use.
        fontStyle: "italic",
        textAlign: "center",
        wordBreak: "break-word",
      }}>
        {saved.text ?? ""}
      </span>
    </div>
  );
}

function SlotCard({
  purpose, title, hint, saved, onSave, onRemove,
}: {
  purpose: SignaturePurpose;
  title: string;
  hint: string;
  saved: SavedSignature | null;
  onSave: (purpose: SignaturePurpose, value: SignatureValue) => Promise<void>;
  onRemove: (purpose: SignaturePurpose) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SignatureValue | null>(null);
  const { isCompact } = useViewport();

  return (
    <section
      aria-labelledby={`slot-${purpose}`}
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        background: T.surface,
        // Was clamp(14px, 4vw, 20px) — tight enough that the preview and the
        // buttons sat almost against the card edge. The two slots are the
        // whole page; they can afford the room.
        padding: "clamp(18px, 4.5vw, 26px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(12px, 3vw, 16px)",
        minWidth: 0,
        boxShadow: "0 1px 2px rgba(7,17,31,0.04)",
      }}
    >
      <div style={{ minWidth: 0, paddingBottom: 2 }}>
        <h2 id={`slot-${purpose}`} style={{
          ...GF, margin: 0, fontSize: "clamp(14px, 3.8vw, 16px)",
          fontWeight: 700, color: T.ink,
        }}>
          {title}
        </h2>
        <p style={{
          ...GF, margin: "4px 0 0", fontSize: "clamp(11.5px, 3.2vw, 12.5px)",
          color: T.inkSoft, lineHeight: 1.5,
        }}>
          {hint}
        </p>
      </div>

      {editing ? (
        <>
          <SignatureCapture
            label={title}
            purpose={purpose}
            value={draft}
            onChange={setDraft}
          />
          <div style={{
            display: "flex", gap: 8,
            flexDirection: isCompact ? "column" : "row",
          }}>
            <button
              type="button"
              disabled={draft === null}
              onClick={() => {
                if (draft === null) return;
                void onSave(purpose, draft).then(() => {
                  setEditing(false);
                  setDraft(null);
                });
              }}
              style={{
                ...GF, minHeight: TAP, flex: 1, borderRadius: 8, border: "none",
                background: draft === null ? "#8AB8D8" : T.azure,
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: draft === null ? "not-allowed" : "pointer",
              }}
            >
              Save {title.toLowerCase()}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setDraft(null); }}
              style={{
                ...GF, minHeight: TAP, flex: 1, borderRadius: 8,
                border: `1px solid ${T.borderStrong}`, background: "transparent",
                color: T.inkSoft, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : saved !== null ? (
        <>
          <Preview saved={saved} />
          {saved.validatedAt === null && (
            <p role="alert" style={{
              ...GF, margin: 0, fontSize: 11.5, color: T.warn, lineHeight: 1.5,
            }}>
              This entry could not be checked, so it will not be offered for
              signing. Replace it to try again.
            </p>
          )}
          <div style={{
            display: "flex", gap: 8,
            flexDirection: isCompact ? "column" : "row",
          }}>
            <button
              type="button"
              onClick={() => { setEditing(true); }}
              style={{
                ...GF, minHeight: TAP, flex: 1, borderRadius: 8,
                border: `1px solid ${T.borderStrong}`, background: "transparent",
                color: T.ink, fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "inline-flex", alignItems: "center",
                justifyContent: "center", gap: 6,
              }}
            >
              <PenLine size={15} aria-hidden /> Replace
            </button>
            <button
              type="button"
              onClick={() => { onRemove(purpose); }}
              aria-label={`Remove your saved ${title.toLowerCase()}`}
              style={{
                ...GF, minHeight: TAP, flex: 1, borderRadius: 8,
                border: `1px solid ${T.border}`, background: "transparent",
                color: T.danger, fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "inline-flex", alignItems: "center",
                justifyContent: "center", gap: 6,
              }}
            >
              <Trash2 size={15} aria-hidden /> Remove
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{
            display: "grid", placeItems: "center",
            minHeight: "clamp(96px, 22vw, 132px)",
            border: `1px dashed ${T.borderStrong}`, borderRadius: 12,
            padding: "clamp(14px, 4vw, 20px)",
          }}>
            <span style={{ ...GF, fontSize: 12, color: T.silver, textAlign: "center" }}>
              Nothing saved yet
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(true); }}
            style={{
              ...GF, minHeight: TAP, borderRadius: 8, border: "none",
              background: T.azure, color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "inline-flex", alignItems: "center",
              justifyContent: "center", gap: 6,
            }}
          >
            <PenLine size={15} aria-hidden /> Add {title.toLowerCase()}
          </button>
        </>
      )}
    </section>
  );
}

export function SignaturesPage() {
  const [saved, setSaved] = useState<SavedSignature[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<SignaturePurpose | null>(null);
  const { run } = useProcessing();
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    if (!USE_REAL_BACKEND) { setLoadState("ready"); return; }
    try {
      setSaved(await realUserSignatureService.list());
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = useCallback(async (
    purpose: SignaturePurpose, value: SignatureValue,
  ) => {
    setError(null);
    try {
      await run(
        {
          message: "Saving your signature",
          detail: "Checking it can be used on a document.",
        },
        async () => {
          const result = await realUserSignatureService.save(purpose, value);
          setSaved(current => [
            ...current.filter(entry => entry.purpose !== purpose), result,
          ]);
        },
      );
      setJustSaved(purpose);
    } catch (err) {
      // The server's message is the useful one here — it knows whether the
      // image was unreadable or merely opaque, and those need different fixes.
      setError(err instanceof ApiError
        ? err.message
        : "That could not be saved. Please try again.");
      throw err;
    }
  }, [run]);

  const handleRemove = useCallback((purpose: SignaturePurpose) => {
    confirm({
      title: `Remove your saved ${purpose}?`,
      body: "Documents you have already signed are unaffected — they keep their "
        + "own copy of the mark you signed with. This only removes it from here.",
      confirmLabel: "Remove",
      cancelLabel: "Keep it",
      destructive: true,
      onConfirm: async () => {
        await run({ message: "Removing" }, async () => {
          await realUserSignatureService.remove(purpose);
          setSaved(current => current.filter(entry => entry.purpose !== purpose));
        });
      },
    });
  }, [confirm, run]);

  const find = (purpose: SignaturePurpose) =>
    saved.find(entry => entry.purpose === purpose) ?? null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "clamp(18px, 4vw, 28px)",
      // The page had no horizontal padding, so on a phone the cards ran into
      // both edges of the screen and the heading sat flush against the glass.
      // 16px is the floor because that is the gutter the rest of the product
      // uses at Mobile S; it grows with the viewport rather than switching.
      padding: "clamp(16px, 4vw, 32px) clamp(16px, 4vw, 28px) clamp(40px, 8vw, 64px)",
      // Capped and centred. Two cards stretched across an ultrawide monitor
      // read as a banner rather than a form, and the measure below keeps the
      // prose legible at the same time.
      maxWidth: 880,
      width: "100%",
      marginInline: "auto",
      boxSizing: "border-box",
    }}>
      <header style={{
        paddingBottom: "clamp(4px, 1.5vw, 10px)",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <h1 style={{
          ...GF, margin: 0, fontSize: "clamp(18px, 5vw, 22px)",
          fontWeight: 800, color: T.ink,
        }}>
          Signatures &amp; Initials
        </h1>
        <p style={{
          ...GF, margin: "6px 0 0", fontSize: "clamp(12px, 3.4vw, 13px)",
          color: T.inkSoft, lineHeight: 1.6, maxWidth: "62ch",
        }}>
          Keep a signature here and you will not have to draw it again on every
          document. It is stored on your account, never shared with a workspace,
          and a document you have already signed keeps its own copy of the mark
          you signed with.
        </p>
      </header>

      {error !== null && (
        <p role="alert" style={{
          ...GF, margin: 0, padding: "10px 12px", borderRadius: 8,
          background: T.dangerWash, border: `1px solid ${TONEDANGER}`,
          color: T.danger, fontSize: 12.5, lineHeight: 1.5,
        }}>
          {error}
        </p>
      )}

      {justSaved !== null && (
        <p role="status" style={{
          ...GF, margin: 0, display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12.5, color: T.success,
        }}>
          <Check size={15} aria-hidden /> Saved. It will be offered next time you sign.
        </p>
      )}

      {loadState === "loading" ? (
        <p style={{ ...GF, fontSize: 13, color: T.silver }}>Loading your signatures…</p>
      ) : loadState === "error" ? (
        <div role="alert" style={{ ...GF, fontSize: 13, color: T.inkSoft }}>
          <p style={{ margin: "0 0 8px" }}>Your saved signatures could not be loaded.</p>
          <button
            type="button"
            onClick={() => { setLoadState("loading"); void load(); }}
            style={{
              ...GF, minHeight: TAP, padding: "0 16px", borderRadius: 8,
              border: `1px solid ${T.borderStrong}`, background: "transparent",
              color: T.ink, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          // Reflows when the content needs it, not at a guessed breakpoint.
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
          gap: "clamp(14px, 3.5vw, 22px)",
          alignItems: "stretch",
        }}>
          {SLOTS.map(slot => (
            <SlotCard
              key={slot.purpose}
              purpose={slot.purpose}
              title={slot.title}
              hint={slot.hint}
              saved={find(slot.purpose)}
              onSave={handleSave}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

const TONEDANGER = "#F3C4BF";
