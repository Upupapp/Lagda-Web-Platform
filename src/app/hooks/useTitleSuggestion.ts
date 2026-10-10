// "That title is already used here, so it will be saved as …", said while
// the sender is still typing rather than after the fact.
//
// The server numbers a title that is already taken in the workspace
// ("Lease", "Lease (2)", "Lease (3)"…). This asks it what a title WOULD be
// saved as, a moment after the typing pauses, and returns a hint only when
// the answer differs from what was typed.
//
// It never gets in the way: nothing is asked in the demo build, for an empty
// title, or while `enabled` is false; an answer that arrives after the title
// has changed again is dropped; and an older server (404) or any failure
// simply means no hint.

import { useEffect, useRef, useState } from "react";
import { realDocumentService } from "../services/real/document.service";
import { USE_REAL_BACKEND } from "../services/backend-flag";

export interface TitleHint {
  /** What was typed, trimmed. */
  readonly typed: string;
  /** What the server would save it as. */
  readonly title: string;
}

export const TITLE_SUGGESTION_DELAY_MS = 500;

export function useTitleSuggestion({ workspaceId, title, excludeDocumentId, enabled = true }: {
  workspaceId: string | undefined;
  title: string;
  /** The draft's own document, whose title must not count against it. */
  excludeDocumentId?: string;
  enabled?: boolean;
}): TitleHint | null {
  const typed = title.trim();
  const [hint, setHint] = useState<TitleHint | null>(null);
  /** Each question's number; only the newest one's answer is used. */
  const latestRef = useRef(0);

  const active = USE_REAL_BACKEND && enabled && workspaceId !== undefined && typed !== "";

  useEffect(() => {
    const asked = ++latestRef.current;
    if (!active || workspaceId === undefined) { setHint(null); return; }
    const timer = window.setTimeout(() => {
      realDocumentService.titleSuggestion(workspaceId, typed, excludeDocumentId)
        .then(suggestion => {
          if (asked !== latestRef.current) return;
          setHint(suggestion !== null && suggestion.changed && suggestion.title !== typed
            ? { typed, title: suggestion.title }
            : null);
        })
        .catch(() => { if (asked === latestRef.current) setHint(null); });
    }, TITLE_SUGGESTION_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      // Whatever was asked is now out of date, answered or not.
      latestRef.current += 1;
    };
  }, [active, workspaceId, typed, excludeDocumentId]);

  // A hint is about one exact title. The moment the field says something
  // else it is no longer true, whether or not the next answer has arrived.
  return hint !== null && active && hint.typed === typed ? hint : null;
}
