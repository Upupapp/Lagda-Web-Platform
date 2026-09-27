// Binds `AutosaveController` to the author page: the editor's content, the
// real content endpoint, and the page lifecycle (hidden / pagehide flush with
// keepalive, and a last flush on unmount).
//
// Real mode only. With `enabled: false` (fixture mode) nothing is created and
// the draft stays in memory exactly as before.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  saveTemplateContent, isTemplateContentConflict, conflictRevisionOf,
} from "../../../../services/templates-source";
import { jsonToFlowDocument } from "./converter";
import { AutosaveController, type AutosaveSaveResult, type AutosaveState } from "./autosave";

export interface UseTemplateAutosaveOptions {
  enabled: boolean;
  editor: Editor | null;
  workspaceId: string | undefined;
  templateId: string;
  initialRevision: number | undefined;
  initialSavedAt: string | null | undefined;
  onSaved?: (result: AutosaveSaveResult) => void;
}

export interface TemplateAutosave {
  state: AutosaveState;
  /** Something a refresh or a navigation would lose right now. */
  unsaved: boolean;
  change: () => void;
  flush: (options?: { keepalive?: boolean }) => Promise<boolean>;
  adoptRevision: (revision: number | undefined, savedAt?: string | null) => void;
  /** The status right now — `state` is a render behind inside an await. */
  getStatus: () => AutosaveState["status"];
}

const UNSAVED_STATUSES: ReadonlySet<AutosaveState["status"]> =
  new Set(["pending", "saving", "error", "offline", "conflict"]);

export function useTemplateAutosave({
  enabled, editor, workspaceId, templateId, initialRevision, initialSavedAt, onSaved,
}: UseTemplateAutosaveOptions): TemplateAutosave {
  const [state, setState] = useState<AutosaveState>(() => ({
    status: "idle", savedAt: initialSavedAt ?? null, revision: initialRevision,
    conflictRevision: undefined, failures: 0,
  }));
  const controller = useRef<AutosaveController | null>(null);
  const onSavedRef = useRef(onSaved);
  useEffect(() => { onSavedRef.current = onSaved; });
  // The revision the NEXT controller should start from — a remount of the
  // controller (e.g. the editor instance changing) must not rewind it.
  const latest = useRef({ revision: initialRevision, savedAt: initialSavedAt ?? null });

  useEffect(() => {
    if (!enabled || !editor || !workspaceId) return;
    const c = new AutosaveController({
      getContent: () => jsonToFlowDocument(editor.getJSON()),
      save: (content, baseRevision, { keepalive }) =>
        saveTemplateContent(workspaceId, templateId, { content, baseRevision }, { keepalive }),
      isConflict: isTemplateContentConflict,
      conflictRevision: conflictRevisionOf,
      initialRevision: latest.current.revision,
      initialSavedAt: latest.current.savedAt,
      onChange: s => {
        latest.current = { revision: s.revision, savedAt: s.savedAt };
        setState(s);
      },
      onSaved: r => onSavedRef.current?.(r),
    });
    controller.current = c;

    // The last save of a page that is going away. `visibilitychange` is the
    // one a mobile browser reliably fires before it may discard the tab;
    // `pagehide` covers a desktop close/refresh.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void c.flush({ keepalive: true });
    };
    const onPageHide = () => { void c.flush({ keepalive: true }); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // Leaving the page in-app: send what is left (the request is issued
      // synchronously, before the editor goes), then stop listening for it.
      if (c.isDirty()) void c.flush({ keepalive: true });
      c.dispose();
      if (controller.current === c) controller.current = null;
    };
  }, [enabled, editor, workspaceId, templateId]);

  const change = useCallback(() => { controller.current?.change(); }, []);
  const flush = useCallback(
    (options?: { keepalive?: boolean }) => controller.current?.flush(options) ?? Promise.resolve(true), []);
  const adoptRevision = useCallback((revision: number | undefined, savedAt?: string | null) => {
    controller.current?.adoptRevision(revision, savedAt);
  }, []);

  const getStatus = useCallback(() => controller.current?.getState().status ?? "idle", []);

  return { state, unsaved: enabled && UNSAVED_STATUSES.has(state.status), change, flush, adoptRevision, getStatus };
}
