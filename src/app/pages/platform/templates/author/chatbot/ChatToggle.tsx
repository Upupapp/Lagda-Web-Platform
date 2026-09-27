// The round LAGDA Chatbot button at the bottom-right of the editor.
//
// It wiggles every three seconds to say "I can help" — but only while the
// page is still blank and nobody has opened the chat yet, and never under
// reduced motion. A tooltip names it; the very first visit in a browser
// also gets a small greeting bubble, once.

import { forwardRef, useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { Z } from "../../../../../utils/z-index";
import { AZURE, BLUE_DEEP, GF, NAVY, SILVER, BOT_IMAGE } from "./chatbot-theme";
import { hasSeenGreeting, markGreetingSeen } from "./chat-store";

export const TOOLTIP_TEXT = "Need help writing? Ask LAGDA Chatbot";
const GREETING_TEXT = "Hi! I'm LAGDA Chatbot. Tell me what you need and I'll write the first draft with you.";
const GREETING_MS = 9000;

export interface ChatToggleProps {
  /** The page has no content yet. */
  documentEmpty: boolean;
  /** The chat has been opened at least once on this visit. */
  everOpened: boolean;
  reduced: boolean;
  right: number;
  bottom: string;
  onOpen: () => void;
}

export const ChatToggle = forwardRef<HTMLButtonElement, ChatToggleProps>(function ChatToggle(
  { documentEmpty, everOpened, reduced, right, bottom, onOpen }, ref,
) {
  const tipId = useId();
  const [hover, setHover] = useState(false);
  const [greeting, setGreeting] = useState(false);

  useEffect(() => {
    if (hasSeenGreeting()) return;
    markGreetingSeen();
    setGreeting(true);
    const t = setTimeout(() => setGreeting(false), GREETING_MS);
    return () => clearTimeout(t);
  }, []);

  const wiggle = documentEmpty && !everOpened && !reduced;
  const size = 58;

  return (
    <div style={{ position: "fixed", right, bottom, zIndex: Z.sticky, display: "flex", alignItems: "flex-end", gap: 10, pointerEvents: "none" }}>
      {(greeting || hover) && (
        <div
          role={greeting ? "status" : undefined}
          className="lagda-cb-bubble-in"
          style={{
            pointerEvents: "auto", maxWidth: "min(260px, calc(100vw - 110px))", marginBottom: 8,
            background: "#FFFFFF", color: NAVY, border: "1px solid #BFDBFE", borderRadius: 14,
            borderBottomRightRadius: 4, boxShadow: "0 10px 28px rgba(7,17,31,0.16)",
            padding: greeting ? "10px 30px 10px 12px" : "7px 11px", position: "relative", ...GF,
          }}
        >
          {greeting ? (
            <>
              <span style={{ fontSize: 13, lineHeight: 1.45, display: "block" }}>{GREETING_TEXT}</span>
              <button
                type="button"
                aria-label="Dismiss the greeting"
                onClick={() => setGreeting(false)}
                className="lagda-cb-focus"
                style={{ position: "absolute", top: 6, right: 6, border: "none", background: "none", color: SILVER, cursor: "pointer", padding: 2, borderRadius: 6 }}
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <span id={tipId} role="tooltip" style={{ fontSize: 12.5, fontWeight: 600, color: BLUE_DEEP, whiteSpace: "nowrap" }}>
              {TOOLTIP_TEXT}
            </span>
          )}
        </div>
      )}
      <button
        ref={ref}
        type="button"
        aria-label="Open LAGDA Chatbot"
        aria-describedby={hover ? tipId : undefined}
        aria-haspopup="dialog"
        title={TOOLTIP_TEXT}
        data-testid="lagda-chatbot-toggle"
        data-wiggle={wiggle ? "true" : "false"}
        onClick={() => { setGreeting(false); onOpen(); }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        className={`lagda-cb-focus${wiggle ? " lagda-cb-wiggle" : ""}`}
        style={{
          pointerEvents: "auto", width: size, height: size, borderRadius: "50%", flexShrink: 0,
          border: "2px solid #FFFFFF", background: "linear-gradient(145deg, #EAF4FF 0%, #CFE6FF 100%)",
          boxShadow: `0 8px 22px rgba(0,120,212,0.35), 0 0 0 1px ${AZURE}33`, cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0,
        }}
      >
        <img src={BOT_IMAGE} alt="" aria-hidden width={46} height={46} draggable={false}
          style={{ width: 46, height: 46, objectFit: "contain", display: "block" }} />
      </button>
    </div>
  );
});
