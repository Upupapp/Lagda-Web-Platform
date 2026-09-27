// Writes a chatbot draft into the editor as if it were being typed.
//
// Rhythm: every character has a weight — longer at full stops, a little at
// commas, a beat at each new line — scaled so a short draft types at a
// comfortable ~28ms a character and a long one speeds up to finish in about
// seventeen seconds. The editor is read-only while it types, the page
// follows the caret, and a small bot badge rides beside it.
//
// ONE UNDO STEP. Every animation frame is dispatched with
// `addToHistory: false`. At the end the document is put back exactly as it
// was (still outside history) and the finished draft goes in with a single
// history-recorded transaction — so Ctrl+Z removes the whole draft at once,
// and never half of it.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { FlowDocument } from "../../../../../models/templates";
import { flowDocumentToJSON } from "../converter";
import { draftLength, draftStream, truncateDraft } from "./frames";
import { LOADER_MS, LOADER_MS_REDUCED } from "./chatbot-theme";

/** The upper bound on the typed reveal, however long the draft. */
export const TYPING_MAX_MS = 17000;
/** Per-weight-unit pace for short drafts. */
export const TYPING_BASE_MS = 28;
export const TYPING_TICK_MS = 30;
const BADGE = 26;

export type TypewriterPhase = "idle" | "loading" | "typing";


/** Cumulative time weights, one per character of `draftStream`. */
export function typingWeights(stream: string): number[] {
  const cum: number[] = [];
  let total = 0;
  for (let i = 0; i < stream.length; i++) {
    const ch = stream[i]!;
    let w = 1;
    if (ch === "." || ch === "!" || ch === "?") w = 7;
    else if (ch === "," || ch === ";" || ch === ":") w = 3.5;
    else if (ch === "\n") w = 6;
    else if (ch === " ") w = 1.3;
    // Deterministic jitter, so the rhythm feels human but tests are stable.
    w *= 0.75 + ((i * 7919) % 11) / 20;
    total += w;
    cum.push(total);
  }
  return cum;
}

export function typingUnitMs(totalWeight: number): number {
  if (totalWeight <= 0) return TYPING_BASE_MS;
  return Math.min(TYPING_BASE_MS, TYPING_MAX_MS / totalWeight);
}

function nodesOf(editor: Editor, json: JSONContent): PMNode {
  return editor.schema.nodeFromJSON(json);
}

function lastTextPos(doc: PMNode): number {
  let pos = 0;
  doc.descendants((node, p) => {
    if (node.isTextblock) pos = p + 1 + node.content.size;
    return true;
  });
  return pos;
}

interface Job {
  draft: FlowDocument | null;
  draftJSON: JSONContent | null;
  original: JSONContent;
  from: number;
  onDone: () => void;
  loader?: ReturnType<typeof setTimeout>;
  ticker?: ReturnType<typeof setInterval>;
  loaderDone: boolean;
  skipRequested: boolean;
}

export interface TypewriterOptions {
  editor: Editor | null;
  /** The scrolling canvas, followed as the caret moves. */
  scrollRef: React.RefObject<HTMLElement | null>;
  /** The positioned wrapper the badge is placed in. */
  badgeHostRef: React.RefObject<HTMLElement | null>;
  /** The badge itself. Moved directly, in the same tick as the text, rather
   *  than through React state — a re-render of the page lags the caret. */
  badgeRef: React.RefObject<HTMLElement | null>;
  reduced: boolean;
}

export function useDraftTypewriter({ editor, scrollRef, badgeHostRef, badgeRef, reduced }: TypewriterOptions) {
  const [phase, setPhase] = useState<TypewriterPhase>("idle");
  const [fading, setFading] = useState(false);
  const job = useRef<Job | null>(null);

  const replaceTail = useCallback((ed: Editor, from: number, json: JSONContent, history: boolean) => {
    const node = nodesOf(ed, json);
    const tr = ed.state.tr.replaceWith(from, ed.state.doc.content.size, node.content);
    if (!history) tr.setMeta("addToHistory", false);
    ed.view.dispatch(tr);
  }, []);

  const follow = useCallback((ed: Editor) => {
    const scroller = scrollRef.current;
    const host = badgeHostRef.current;
    if (!scroller || !host) return;
    try {
      const pos = lastTextPos(ed.state.doc);
      const c = ed.view.coordsAtPos(pos);
      const hostRect = host.getBoundingClientRect();
      // Just left of the caret, lifted a little above the line so it never
      // hides the letters it has just written.
      const badge = badgeRef.current;
      if (badge) {
        badge.style.left = `${String(Math.max(2, c.left - hostRect.left - BADGE + 4))}px`;
        badge.style.top = `${String(c.top - hostRect.top - BADGE + 8)}px`;
        badge.style.opacity = "1";
      }
      const view = scroller.getBoundingClientRect();
      if (c.bottom > view.bottom - 90) scroller.scrollTop += c.bottom - (view.bottom - 170);
      else if (c.top < view.top + 10) scroller.scrollTop -= (view.top + 60) - c.top;
    } catch {
      // No layout (tests, a detached view): typing works, the badge waits.
    }
  }, [scrollRef, badgeHostRef, badgeRef]);

  const finish = useCallback(() => {
    const j = job.current;
    if (!j) return;
    // Still preparing the draft: finish the moment it is ready.
    if (j.draftJSON === null) { j.skipRequested = true; return; }
    job.current = null;
    if (j.loader) clearTimeout(j.loader);
    if (j.ticker) clearInterval(j.ticker);
    if (editor && !editor.isDestroyed) {
      // Back to exactly where we started, outside history…
      replaceTail(editor, 0, j.original, false);
      // …then the whole draft as one undoable step.
      const node = nodesOf(editor, j.draftJSON);
      const tr = editor.state.tr.replaceWith(j.from, editor.state.doc.content.size, node.content);
      editor.view.dispatch(tr);
      editor.setEditable(true, false);
    }
    setPhase("idle");
    j.onDone();
  }, [editor, replaceTail]);

  const beginTyping = useCallback(() => {
    const j = job.current;
    if (!j || !editor || j.draft === null) return;
    const draft = j.draft;
    const stream = draftStream(draft);
    const total = draftLength(draft);
    const cum = typingWeights(stream);
    const unit = typingUnitMs(cum[cum.length - 1] ?? 0);
    const started = Date.now();
    let written = 0;
    const originalTail = j.from === 0 ? null : j.original;
    setPhase("typing");
    j.ticker = setInterval(() => {
      if (!job.current || editor.isDestroyed) return;
      const budget = (Date.now() - started) / unit;
      let n = written;
      while (n < total && (cum[n] ?? Infinity) <= budget) n += 1;
      if (n === written) return;
      written = n;
      if (n >= total) { finish(); return; }
      const partial = flowDocumentToJSON(truncateDraft(draft, n));
      if (originalTail === null) replaceTail(editor, 0, partial, false);
      else replaceTail(editor, j.from, partial, false);
      follow(editor);
    }, TYPING_TICK_MS);
  }, [editor, finish, follow, replaceTail]);

  /**
   * Plays the page loader while `prepare` builds the draft (it may save the
   * template's roles first), then types it in. "append" adds it below the
   * existing content; "replace" replaces everything.
   */
  const start = useCallback((
    prepare: () => FlowDocument | Promise<FlowDocument>,
    placement: "append" | "replace",
    onDone: () => void,
  ) => {
    if (!editor || job.current) return;
    const original = editor.getJSON();
    const from = placement === "append" && !editor.isEmpty ? editor.state.doc.content.size : 0;
    const current: Job = {
      draft: null, draftJSON: null, original, from, onDone, loaderDone: false, skipRequested: false,
    };
    job.current = current;
    editor.setEditable(false, false);
    setPhase("loading");

    const go = () => {
      if (job.current !== current || current.draft === null || !current.loaderDone) return;
      if (reduced || current.skipRequested) {
        // Reduced motion: no typing — the draft appears at once, with a fade.
        if (reduced) { setFading(true); setTimeout(() => setFading(false), 700); }
        finish();
        return;
      }
      beginTyping();
    };
    void Promise.resolve()
      .then(prepare)
      .then(draft => {
        current.draft = draft;
        current.draftJSON = flowDocumentToJSON(draft);
        if (current.skipRequested) current.loaderDone = true;
        go();
      })
      .catch(() => {
        // Nothing to write: put the editor back as it was.
        if (job.current !== current) return;
        job.current = null;
        if (current.loader) clearTimeout(current.loader);
        editor.setEditable(true, false);
        setPhase("idle");
      });
    current.loader = setTimeout(() => { current.loaderDone = true; go(); }, reduced ? LOADER_MS_REDUCED : LOADER_MS);
  }, [editor, reduced, beginTyping, finish]);

  /** "Skip animation": the finished draft, now. */
  const skip = useCallback(() => { finish(); }, [finish]);

  useEffect(() => () => {
    const j = job.current;
    if (!j) return;
    if (j.loader) clearTimeout(j.loader);
    if (j.ticker) clearInterval(j.ticker);
    job.current = null;
  }, []);

  return { phase, fading, start, skip, busy: phase !== "idle" };
}
