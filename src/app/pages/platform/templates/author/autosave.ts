// The author page's draft autosave, as a plain controller — no React — so its
// timing rules can be tested with fake timers and nothing else.
//
// ── The rules ──────────────────────────────────────────────────────────────
//
//   DEBOUNCE   a save ~2s after the typing stops;
//   MAX WAIT   and at least every 30s while it never stops, so a long burst
//              of writing is never all at risk at once;
//   FLUSH      at once on demand — the page going hidden, the chatbot having
//              finished typing a draft, Generate & Save about to run.
//
//   ONE REQUEST IN FLIGHT. A save asked for while one is running is QUEUED,
//   not sent alongside: two concurrent PUTs carrying the same baseRevision
//   would make the second a guaranteed conflict with the first. When the
//   running one lands, the queued one goes with the new revision and whatever
//   the content is BY THEN — the latest, never a stale snapshot.
//
//   CONFLICT (409) stops everything. Another tab saved a newer revision; any
//   save from here would either fail again or, without a revision, silently
//   overwrite that work. The page offers Reload instead.
//
//   FAILURE retries with backoff and keeps the changes marked unsaved — the
//   page's leave prompts read `hasUnsavedChanges()`. Offline, no request is
//   attempted at all; the save goes the moment the browser says it is back.
//
// Content is read through `getContent` at SEND time, not captured at change
// time, and never stored anywhere but the editor — in particular never in
// localStorage/sessionStorage (private document text; the lint rule forbids
// it).

import type { FlowDocument } from "../../../../models/templates";

export type AutosaveStatus =
  /** Nothing typed since the last save (or since load). */
  | "idle"
  /** Changes waiting for the debounce. */
  | "pending"
  | "saving"
  | "saved"
  /** The last attempt failed; a retry is scheduled. */
  | "error"
  /** The browser is offline; saving resumes on reconnect. */
  | "offline"
  /** Another tab saved a newer revision. Nothing more is sent. */
  | "conflict";

export interface AutosaveState {
  status: AutosaveStatus;
  /** ISO-8601 of the last successful save (or the one the page loaded with). */
  savedAt: string | null;
  /** The server revision this tab is editing on top of. */
  revision: number | undefined;
  /** The server's revision, when a 409 reported it. */
  conflictRevision: number | undefined;
  /** How many consecutive attempts have failed. */
  failures: number;
}

export interface AutosaveSaveResult {
  contentRevision: number;
  contentSavedAt: string;
  contentGenerated: boolean;
}

export interface AutosaveOptions {
  getContent: () => FlowDocument;
  save: (
    content: FlowDocument, baseRevision: number | undefined, options: { keepalive: boolean },
  ) => Promise<AutosaveSaveResult>;
  isConflict: (err: unknown) => boolean;
  conflictRevision?: (err: unknown) => number | undefined;
  onChange: (state: AutosaveState) => void;
  /** Told of every successful save, e.g. to track `contentGenerated`. */
  onSaved?: (result: AutosaveSaveResult) => void;
  initialRevision?: number | undefined;
  initialSavedAt?: string | null | undefined;
  debounceMs?: number;
  maxWaitMs?: number;
  /** Delay before retry n (the last entry repeats). */
  retryDelaysMs?: readonly number[];
  /** The event target for online/offline — `window` in the page. */
  connectivity?: Pick<Window, "addEventListener" | "removeEventListener"> | null;
  isOnline?: () => boolean;
}

export const AUTOSAVE_DEBOUNCE_MS = 2000;
export const AUTOSAVE_MAX_WAIT_MS = 30000;
export const AUTOSAVE_RETRY_DELAYS_MS: readonly number[] = [2000, 5000, 10000, 20000, 30000];

export class AutosaveController {
  private readonly o: AutosaveOptions;
  private readonly debounceMs: number;
  private readonly maxWaitMs: number;
  private readonly retryDelays: readonly number[];

  private state: AutosaveState;
  /** Bumped on every change; a save is "for" the value it started with. */
  private editSeq = 0;
  private savedSeq = 0;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  private inFlight: Promise<void> | null = null;
  private queued = false;
  private queuedKeepalive = false;
  private disposed = false;

  constructor(options: AutosaveOptions) {
    this.o = options;
    this.debounceMs = options.debounceMs ?? AUTOSAVE_DEBOUNCE_MS;
    this.maxWaitMs = options.maxWaitMs ?? AUTOSAVE_MAX_WAIT_MS;
    this.retryDelays = options.retryDelaysMs ?? AUTOSAVE_RETRY_DELAYS_MS;
    this.state = {
      status: "idle",
      savedAt: options.initialSavedAt ?? null,
      revision: options.initialRevision,
      conflictRevision: undefined,
      failures: 0,
    };
    const target = this.connectivity();
    target?.addEventListener("online", this.handleOnline);
    target?.addEventListener("offline", this.handleOffline);
  }

  getState(): AutosaveState { return this.state; }

  /** Changes typed that no successful save has covered yet. */
  isDirty(): boolean { return this.editSeq > this.savedSeq; }

  /** What the leave prompts ask: is there anything a refresh would lose? */
  hasUnsavedChanges(): boolean {
    return this.isDirty() || this.inFlight !== null;
  }

  /** The editor changed. Schedules the debounced save. */
  change(): void {
    if (this.disposed) return;
    this.editSeq += 1;
    if (this.state.status === "conflict") return;

    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => { this.debounceTimer = null; this.trigger(false); }, this.debounceMs);
    // The ceiling runs from the FIRST unsaved change, so continuous typing
    // (which keeps resetting the debounce) still saves every `maxWaitMs`.
    if (this.maxWaitTimer === null) {
      this.maxWaitTimer = setTimeout(() => { this.maxWaitTimer = null; this.trigger(false); }, this.maxWaitMs);
    }

    if (!this.isOnline()) { this.set({ status: "offline" }); return; }
    // An error stays visible until a save actually succeeds.
    if (this.state.status === "idle" || this.state.status === "saved") this.set({ status: "pending" });
  }

  /**
   * Saves now. Resolves once nothing is dirty or in flight — or once saving
   * has stopped (failure, offline, conflict); the result says which.
   * `keepalive` for a page that may be about to go away.
   */
  async flush(options: { keepalive?: boolean } = {}): Promise<boolean> {
    const keepalive = options.keepalive === true;
    this.clearScheduled();
    // A page being hidden may never get the next tick: send the retry now.
    if (this.retryTimer !== null) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    for (let guard = 0; guard < 5 && !this.disposed; guard++) {
      if (this.state.status === "conflict") return false;
      if (this.inFlight !== null) {
        if (this.isDirty()) { this.queued = true; this.queuedKeepalive ||= keepalive; }
        await this.inFlight;
        continue;
      }
      if (!this.isDirty()) return true;
      if (!this.isOnline()) { this.set({ status: "offline" }); return false; }
      await this.run(keepalive);
      if (this.state.status === "error") return false;
    }
    return !this.isDirty() && this.inFlight === null;
  }

  /** The page adopted a revision from elsewhere (Generate & Save). */
  adoptRevision(revision: number | undefined, savedAt?: string | null): void {
    if (revision === undefined) return;
    this.set({ revision, ...(savedAt === undefined ? {} : { savedAt }) });
  }

  dispose(): void {
    this.disposed = true;
    this.clearScheduled();
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const target = this.connectivity();
    target?.removeEventListener("online", this.handleOnline);
    target?.removeEventListener("offline", this.handleOffline);
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private connectivity() {
    if (this.o.connectivity !== undefined) return this.o.connectivity;
    return typeof window === "undefined" ? null : window;
  }

  private isOnline(): boolean {
    if (this.o.isOnline) return this.o.isOnline();
    return typeof navigator === "undefined" || navigator.onLine !== false;
  }

  private readonly handleOnline = () => {
    if (this.disposed || this.state.status === "conflict") return;
    if (this.isDirty()) this.trigger(false);
    else if (this.state.status === "offline") this.set({ status: this.state.savedAt === null ? "idle" : "saved" });
  };

  private readonly handleOffline = () => {
    if (this.disposed || this.state.status === "conflict") return;
    if (this.isDirty()) this.set({ status: "offline" });
  };

  private clearScheduled(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    if (this.maxWaitTimer !== null) clearTimeout(this.maxWaitTimer);
    this.debounceTimer = null;
    this.maxWaitTimer = null;
  }

  private trigger(keepalive: boolean): void {
    if (this.disposed || this.state.status === "conflict") return;
    this.clearScheduled();
    if (this.inFlight !== null) {
      this.queued = true;
      this.queuedKeepalive ||= keepalive;
      return;
    }
    if (!this.isDirty()) return;
    if (!this.isOnline()) { this.set({ status: "offline" }); return; }
    void this.run(keepalive);
  }

  private run(keepalive: boolean): Promise<void> {
    if (this.retryTimer !== null) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    const seq = this.editSeq;
    const content = this.o.getContent();
    this.set({ status: "saving" });

    const attempt = (async () => {
      try {
        const result = await this.o.save(content, this.state.revision, { keepalive });
        if (this.disposed) return;
        this.savedSeq = Math.max(this.savedSeq, seq);
        this.o.onSaved?.(result);
        this.set({
          status: this.isDirty() ? "pending" : "saved",
          revision: result.contentRevision,
          savedAt: result.contentSavedAt,
          failures: 0,
        });
      } catch (err) {
        if (this.disposed) return;
        if (this.o.isConflict(err)) {
          this.clearScheduled();
          this.queued = false;
          this.set({ status: "conflict", conflictRevision: this.o.conflictRevision?.(err) });
          return;
        }
        const failures = this.state.failures + 1;
        this.set({ status: this.isOnline() ? "error" : "offline", failures });
        if (this.isOnline()) this.scheduleRetry(failures);
      }
    })();

    this.inFlight = attempt.finally(() => {
      this.inFlight = null;
      if (this.disposed || this.state.status === "conflict") return;
      if (this.queued) {
        const queuedKeepalive = this.queuedKeepalive;
        this.queued = false;
        this.queuedKeepalive = false;
        // A failed attempt already has its retry booked; a queued save
        // sent now would just skip the backoff.
        if (this.state.status !== "error" && this.isDirty()) this.trigger(queuedKeepalive);
      } else if (this.isDirty() && this.state.status === "pending"
        && this.debounceTimer === null && this.maxWaitTimer === null) {
        // Typed during the save, and nothing booked to cover it.
        this.trigger(false);
      }
    });
    return this.inFlight;
  }

  private scheduleRetry(failures: number): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    const delays = this.retryDelays;
    const delay = delays[Math.min(failures - 1, delays.length - 1)] ?? AUTOSAVE_MAX_WAIT_MS;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.disposed || this.state.status === "conflict") return;
      if (this.inFlight !== null) { this.queued = true; return; }
      if (!this.isOnline()) { this.set({ status: "offline" }); return; }
      if (this.isDirty()) void this.run(false);
    }, delay);
  }

  private set(patch: Partial<AutosaveState>): void {
    this.state = { ...this.state, ...patch };
    if (!this.disposed) this.o.onChange(this.state);
  }
}

/** "HH:MM", 24-hour, local time — the pill's timestamp. */
export function formatSavedTime(iso: string | null): string | null {
  if (iso === null) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
