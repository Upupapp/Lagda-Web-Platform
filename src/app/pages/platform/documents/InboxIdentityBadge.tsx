// The identity check, said on a document's inbox card before it is opened.
//
// A document that asks THIS person for "ID and face verification" carries a
// small round button on the card's top-right corner, half outside it, the way
// a notification dot sits. Pressing it opens a short note: that a check is
// coming and what to have ready, or that an earlier pass still counts, or
// that the check is waiting on the sender.
//
// The server says which, on the inbox row (`identityCheck`). No row field, no
// badge: an older server, and the demo build, show exactly what they showed.
//
// ── Why the corner, and why it covers nothing ──────────────────────────────
//
// The card's banner holds the sender's logo at its left and the date chip at
// its top right, 14px down and 16px in. The 28px disc is centred on the top
// edge and reaches 16px into the card at most, so it stops where the chip
// begins. The button around it is 44px for a finger, and grows INTO the card
// rather than out of it, so nothing new sticks out past a phone's edge.
//
// ── The note ───────────────────────────────────────────────────────────────
//
// The same note the "?" on a placed field opens (FieldStatusBadge): fixed to
// the viewport, measured from its button, shifted to stay on screen and
// flipped above when there is no room below. It is not a dialog. It takes no
// focus and traps none: the button says whether it is open (`aria-expanded`)
// and which element it opens (`aria-controls`), and the note follows the
// button in the page, so it is the next thing read. Escape closes it and
// returns to the button; so does a press anywhere else. Opening it moves
// nothing in the list.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { T, TONE, GF, type Tone } from "../../../components/system/design-system";
import { Z } from "../../../utils/z-index";
import { identityCheckValidity } from "../../../models/identity-check";
import type { InboxAction, InboxIdentityCheck } from "../../../services/real/my-signing.service";

const DISC = 28;
const HIT = 44;
const BUBBLE_W = 288;
const EDGE = 8;

/** What the person is asked to do with the document, as a verb. */
const VERB: Readonly<Record<InboxAction, string>> = {
  sign: "sign", approve: "approve", review: "review", acknowledge: "acknowledge",
};

export interface InboxIdentityNote {
  readonly title: string;
  readonly body: string;
  readonly tone: Tone;
}

/** True when the inbox row says this person must pass the check on this document. */
export function inboxIdentityCheckShown(check: InboxIdentityCheck | null | undefined): check is InboxIdentityCheck {
  return typeof check === "object" && check !== null && check.required === true && check.status !== "not-required";
}

/** The note for one row: what stands, in the participant's words. */
export function inboxIdentityNote(check: InboxIdentityCheck, action: InboxAction): InboxIdentityNote {
  switch (check.status) {
    case "passed": {
      const validity = identityCheckValidity(check.verifiedAt);
      return {
        title: "Identity already verified",
        body: validity === null
          ? "You have already verified your identity for this workspace's documents. You will not be asked again for now."
          : `You verified your identity on ${validity.verified}. You will not be asked again for this `
            + `workspace's documents until ${validity.until}.`,
        tone: "success",
      };
    }
    case "locked":
      return {
        title: "Identity check locked",
        body: "The identity check for this document was not passed after 3 attempts. "
          + "The sender has been told and can let you continue another way.",
        tone: "danger",
      };
    case "name-mismatch":
      return {
        title: "Name on your ID does not match",
        body: "Your identity was verified, but the name on your ID is different from the name on this "
          + "document. The sender has been told and can correct it or confirm it is you.",
        tone: "warn",
      };
    // `pending`, and any status this build does not know: a check is asked.
    default:
      return {
        title: "Identity check required",
        body: `Before you can ${VERB[action]} this document, you will verify your identity with a valid ID `
          + "and a face check. Have your ID and your phone ready. It takes about two minutes.",
        tone: "info",
      };
  }
}

/** The disc's colour for each tone: white on it meets 4.5:1 in every case. */
const DISC_COLOR: Readonly<Record<Tone, string>> = {
  neutral: T.inkSoft, info: T.azure, success: T.success, warn: T.warn, danger: T.danger,
};

const STYLES = `
  .inbox-id-badge {
    position: absolute; top: -${String(DISC / 2)}px; right: -12px; z-index: 1;
    width: ${String(HIT)}px; height: ${String(HIT)}px; padding: 0; margin: 0; border: none; background: transparent;
    display: flex; align-items: flex-start; justify-content: flex-end; cursor: pointer; touch-action: manipulation;
  }
  .inbox-id-badge:focus { outline: none; }
  .inbox-id-badge:focus-visible .inbox-id-disc { box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px ${T.ink}; }
  .inbox-id-disc {
    width: ${String(DISC)}px; height: ${String(DISC)}px; box-sizing: border-box; border-radius: 50%;
    border: 2px solid #FFFFFF; box-shadow: 0 1px 4px rgba(7,17,31,0.35); color: #FFFFFF;
    font-family: 'Geist', sans-serif; font-size: 15px; font-weight: 800; line-height: 1;
    display: flex; align-items: center; justify-content: center;
  }
  .inbox-id-bubble { animation: inbox-id-in 140ms ease both; }
  @keyframes inbox-id-in { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
  @media (max-width: 520px) { .inbox-id-badge { right: -8px; } }
  @media (prefers-reduced-motion: reduce) { .inbox-id-bubble { animation: none; } }
`;

export function InboxIdentityBadge({ check, action, documentTitle, open, onToggle, onClose }: {
  check: InboxIdentityCheck;
  /** Which inbox the card is in: the verb the note uses. */
  action: InboxAction;
  documentTitle: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const bubbleId = useId(), titleId = useId();
  const note = inboxIdentityNote(check, action);
  const tone = TONE[note.tone];
  // Read when something happens: the list hands a new function over on every render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Under the disc, right-aligned to it; shifted inside the viewport, and
  // above the disc where there is no room below.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const place = () => {
      const b = buttonRef.current?.getBoundingClientRect();
      if (!b) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const width = Math.min(BUBBLE_W, vw - EDGE * 2);
      const height = bubbleRef.current?.offsetHeight ?? 140;
      let left = b.right - width;
      left = Math.max(EDGE, Math.min(left, vw - width - EDGE));
      // The disc is the top 28px of the button.
      let top = b.top + DISC + 6;
      if (top + height > vh - EDGE && b.top - 6 - height >= EDGE) top = b.top - 6 - height;
      top = Math.max(EDGE, Math.min(top, vh - height - EDGE));
      setPos({ left, top });
    };
    place();
    // A second pass once the note has laid out and has a real height.
    const raf = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Escape, and a press anywhere but the button or the note, close it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeRef.current();
      buttonRef.current?.focus();
    };
    const onPress = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target) === true || bubbleRef.current?.contains(target) === true) return;
      closeRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPress, true);
    document.addEventListener("mousedown", onPress, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPress, true);
      document.removeEventListener("mousedown", onPress, true);
    };
  }, [open]);

  return (
    <>
      <style>{STYLES}</style>
      <button
        ref={buttonRef} type="button" className="inbox-id-badge"
        data-testid="inbox-identity-badge" data-status={check.status}
        aria-label={`Identity check for ${documentTitle}`}
        aria-expanded={open} aria-controls={bubbleId}
        onPointerDown={event => { event.stopPropagation(); }}
        onClick={event => { event.stopPropagation(); onToggle(); }}
      >
        <span aria-hidden className="inbox-id-disc" style={{ background: DISC_COLOR[note.tone] }}>
          {check.status === "passed" ? <Check size={15} strokeWidth={3.2} /> : "?"}
        </span>
      </button>
      {/* Always in the page, so the button always names what it opens. */}
      <div
        ref={bubbleRef} id={bubbleId} role="note" aria-labelledby={titleId} hidden={!open}
        className="inbox-id-bubble" data-testid="inbox-identity-bubble"
        onPointerDown={event => { event.stopPropagation(); }}
        onClick={event => { event.stopPropagation(); }}
        style={{
          ...GF, position: "fixed", zIndex: Z.dropdown,
          left: pos?.left ?? -9999, top: pos?.top ?? -9999,
          width: `min(${String(BUBBLE_W)}px, calc(100vw - ${String(EDGE * 2)}px))`, boxSizing: "border-box",
          visibility: pos ? "visible" : "hidden",
          background: T.surface, border: `1px solid ${tone.edge}`, borderTop: `3px solid ${DISC_COLOR[note.tone]}`,
          borderRadius: 10, boxShadow: "0 10px 28px rgba(7,17,31,0.20)", padding: "10px 12px 12px",
          textAlign: "left", cursor: "default",
        }}
      >
        {open && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div id={titleId} style={{ fontSize: 13, fontWeight: 700, color: T.ink, lineHeight: 1.35, overflowWrap: "anywhere" }}>
                {note.title}
              </div>
              <div data-testid="inbox-identity-bubble-body" style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5, marginTop: 3, overflowWrap: "anywhere" }}>
                {note.body}
              </div>
            </div>
            <button
              type="button" aria-label="Close" onClick={() => { onClose(); buttonRef.current?.focus(); }}
              style={{
                width: 28, height: 28, flexShrink: 0, marginTop: -4, marginRight: -6, border: "none",
                background: "transparent", color: T.inkSoft, fontSize: 18, lineHeight: 1, cursor: "pointer",
              }}
            >×</button>
          </div>
        )}
      </div>
    </>
  );
}
