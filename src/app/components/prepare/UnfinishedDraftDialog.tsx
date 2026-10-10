// Asked before a draft in progress is replaced.
//
// There is one draft slot. Starting a preparation, launching a template and
// reopening another draft each fill it, and each used to replace what was
// there without asking. This is the question, in the same family as the
// Documents confirmations (LifecycleConfirmDialog): centred at every width,
// said plainly, the safe choice focused first.
//
// Three choices, because "replace" hid two different things:
//
//   Continue that one    nothing changes; go back to it.
//   Keep it as a draft   it stays on the server and in Drafts; only this
//                        browser moves on to the new one.
//   Discard it           it is deleted, as "Discard draft" deletes it.
//
// A draft that never reached the server cannot be kept anywhere, so that
// choice is not offered for it and the dialog says why.

import { useEffect, useId, useRef } from "react";
import { FileQuestion } from "lucide-react";
import { Z } from "../../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const DANGER = "#B91C1C";

/** What the sender was about to do when the unfinished draft was found. */
export type UnfinishedDraftIntent = "start" | "template" | "resume";

export type UnfinishedDraftChoice = "continue" | "keep" | "discard";

const LABELS: Record<UnfinishedDraftIntent, { keep: string; discard: string; lead: string }> = {
  start: {
    keep: "Start a new one and keep that as a draft",
    discard: "Discard it and start a new one",
    lead: "Starting a new one takes its place on this screen.",
  },
  template: {
    keep: "Start a new one and keep that as a draft",
    discard: "Discard it and start a new one",
    lead: "Using this template starts a new one, which takes its place on this screen.",
  },
  resume: {
    keep: "Open the other one and keep that as a draft",
    discard: "Discard it and open the other one",
    lead: "Opening another draft takes its place on this screen.",
  },
};

export function UnfinishedDraftDialog({
  title, intent, canKeep, busy = null, error = null, onChoose, onCancel,
}: {
  /** The unfinished draft's title, or what stands in for one. */
  title: string;
  intent: UnfinishedDraftIntent;
  /** False when the draft has nothing on the server to be kept as. */
  canKeep: boolean;
  /** The choice being carried out. Every button is off while one is. */
  busy?: UnfinishedDraftChoice | null;
  /** Why the last attempt failed, shown inside the dialog. */
  error?: string | null;
  onChoose: (choice: UnfinishedDraftChoice) => void;
  /** Closing without choosing: nothing changes. */
  onCancel: () => void;
}) {
  const titleId = useId(), bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const labels = LABELS[intent];
  const working = busy !== null;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    firstRef.current?.focus();
    return () => { opener?.focus(); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); if (!working) onCancel(); return; }
      if (e.key !== "Tab" || panelRef.current === null) return;
      // Keep Tab inside the dialog.
      const stops = [...panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (stops.length === 0) return;
      const first = stops[0]!, last = stops[stops.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); };
  }, [working, onCancel]);

  const choice = (
    which: UnfinishedDraftChoice, label: string, kind: "primary" | "plain" | "danger",
  ) => (
    <button
      ref={which === "continue" ? firstRef : undefined}
      type="button"
      data-testid={`unfinished-draft-${which}`}
      disabled={working}
      onClick={() => { if (!working) onChoose(which); }}
      style={{
        ...GF, width: "100%", minHeight: 44, padding: "10px 14px", borderRadius: 9,
        fontSize: 14, fontWeight: kind === "primary" ? 700 : 600, lineHeight: 1.3, textAlign: "center",
        cursor: working ? "not-allowed" : "pointer", opacity: working && busy !== which ? 0.6 : 1,
        border: kind === "primary" ? "none" : `1px solid ${kind === "danger" ? "#F3B5B5" : "#CBD5E1"}`,
        background: kind === "primary" ? AZURE : "#FFFFFF",
        color: kind === "primary" ? "#FFFFFF" : kind === "danger" ? DANGER : NAVY,
      }}
    >
      {busy === which ? "Working…" : label}
    </button>
  );

  return (
    <div
      data-testid="unfinished-draft-scrim"
      onClick={e => { if (e.target === e.currentTarget && !working) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(7, 17, 31, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box",
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}
        data-testid="unfinished-draft-dialog"
        style={{
          ...GF, background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 460,
          maxHeight: "calc(100dvh - 32px)", overflowY: "auto", boxSizing: "border-box",
          boxShadow: "0 12px 40px rgba(7, 17, 31, 0.30)",
        }}
      >
        <div style={{ padding: "22px 22px 6px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span aria-hidden style={{
            flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: "#EBF4FC",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileQuestion size={20} color={AZURE} />
          </span>
          <h2 id={titleId} style={{ ...GF, fontSize: 17, fontWeight: 800, color: NAVY, margin: "7px 0 0", lineHeight: 1.3 }}>
            You have an unfinished document
          </h2>
        </div>

        <div id={bodyId} style={{ padding: "10px 22px 4px" }}>
          <p style={{ ...GF, fontSize: 14, color: "#1F2937", margin: "0 0 8px", lineHeight: 1.55, overflowWrap: "anywhere" }}>
            You have an unfinished document: &ldquo;{title}&rdquo;.
          </p>
          <p style={{ ...GF, fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.55 }}>
            {labels.lead}{" "}
            {canKeep
              ? "Kept as a draft, it stays in Documents › Draft, where you can open it again."
              : "It has not been uploaded yet, so it cannot be kept as a draft: continue it, or discard it."}
          </p>
        </div>

        {error !== null && (
          <p role="alert" style={{
            ...GF, margin: "12px 22px 0", padding: "9px 12px", borderRadius: 9, background: "#FEF2F2",
            border: "1px solid #FECACA", color: "#7F1D1D", fontSize: 13, lineHeight: 1.45,
          }}>
            {error}
          </p>
        )}

        <div style={{ padding: "16px 22px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
          {choice("continue", "Continue that one", "primary")}
          {canKeep && choice("keep", labels.keep, "plain")}
          {choice("discard", error !== null ? "Try again" : labels.discard, "danger")}
        </div>
      </div>
    </div>
  );
}
