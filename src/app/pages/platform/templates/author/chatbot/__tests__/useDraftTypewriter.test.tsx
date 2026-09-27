// Writing the draft into a real TipTap editor: loader, typing, lock, skip,
// natural finish, append vs replace, reduced motion — and ONE undo step.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { flowDocumentExtensions } from "../../extensions";
import { flowDocumentToJSON } from "../../converter";
import { useDraftTypewriter } from "../useDraftTypewriter";
import { buildDraft } from "../draft";
import type { FlowDocument } from "../../../../../../models/templates";

const EMPTY: FlowDocument = { kind: "flowDocument", content: [] };
const EXISTING: FlowDocument = { kind: "flowDocument", content: [{ kind: "paragraph", content: [{ kind: "text", text: "My own notes." }] }] };

const draft = buildDraft({
  docId: "recruitment-and-hr--non-disclosure-agreement-nda", title: "Non-Disclosure Agreement (NDA)", clauseOnly: [],
  slots: { partyA: "Acme Inc.", partyB: "Juan Dela Cruz" }, clauses: [], rules: [], participants: [], placement: "replace",
}, []);
const draftText = new Editor({ extensions: flowDocumentExtensions(), content: flowDocumentToJSON(draft) }).getText();

let editor: Editor;

function setup(content: FlowDocument, reduced = false) {
  editor = new Editor({ element: document.createElement("div"), extensions: flowDocumentExtensions(), content: flowDocumentToJSON(content) });
  const host = document.createElement("div");
  return renderHook(() => useDraftTypewriter({ editor, scrollRef: { current: host }, badgeHostRef: { current: host }, badgeRef: { current: null }, reduced }));
}

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { editor.destroy(); vi.useRealTimers(); });

describe("typing the draft into the editor", () => {
  it("plays the loader for three seconds, then types with the editor locked", async () => {
    const { result } = setup(EMPTY);
    const onDone = vi.fn();
    act(() => { result.current.start(() => draft, "replace", onDone); });
    expect(result.current.phase).toBe("loading");
    expect(editor.isEditable).toBe(false);
    await tick(2990);
    expect(result.current.phase).toBe("loading");
    expect(editor.isEmpty).toBe(true);
    await tick(20);
    expect(result.current.phase).toBe("typing");
    await tick(1500);
    const partial = editor.getText();
    expect(partial.length).toBeGreaterThan(0);
    expect(partial.length).toBeLessThan(draftText.length);
    expect(draftText.startsWith(partial.trimEnd().slice(0, 20))).toBe(true);
    expect(editor.isEditable).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("headings and clauses arrive formatted, not as plain text", async () => {
    const { result } = setup(EMPTY);
    act(() => { result.current.start(() => draft, "replace", () => undefined); });
    await tick(3000);
    await tick(3000);
    const json = editor.getJSON();
    expect(json.content?.[0]?.type).toBe("heading");
  });

  it("Skip animation finishes instantly and unlocks", async () => {
    const { result } = setup(EMPTY);
    const onDone = vi.fn();
    act(() => { result.current.start(() => draft, "replace", onDone); });
    await tick(3000);
    await tick(800);
    act(() => { result.current.skip(); });
    expect(editor.getText()).toBe(draftText);
    expect(editor.isEditable).toBe(true);
    expect(result.current.phase).toBe("idle");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("skip during the loader still writes the whole draft", async () => {
    const { result } = setup(EMPTY);
    act(() => { result.current.start(() => draft, "replace", () => undefined); });
    await tick(10);
    act(() => { result.current.skip(); });
    expect(editor.getText()).toBe(draftText);
  });

  it("finishes by itself within the time cap", async () => {
    const { result } = setup(EMPTY);
    const onDone = vi.fn();
    act(() => { result.current.start(() => draft, "replace", onDone); });
    await tick(3000);
    for (let t = 0; t < 18000; t += 1000) await tick(1000);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(editor.getText()).toBe(draftText);
    expect(editor.isEditable).toBe(true);
  });

  it("the whole insertion is ONE undo step", async () => {
    const { result } = setup(EMPTY);
    act(() => { result.current.start(() => draft, "replace", () => undefined); });
    await tick(3000);
    await tick(2000);
    act(() => { result.current.skip(); });
    expect(editor.getText()).toBe(draftText);
    editor.commands.undo();
    expect(editor.isEmpty).toBe(true);
    editor.commands.redo();
    expect(editor.getText()).toBe(draftText);
  });

  it("'Add below' keeps the page's content above the draft, and one undo restores it", async () => {
    const { result } = setup(EXISTING);
    act(() => { result.current.start(() => draft, "append", () => undefined); });
    await tick(3000);
    await tick(1000);
    expect(editor.getText().startsWith("My own notes.")).toBe(true);
    act(() => { result.current.skip(); });
    expect(editor.getText().startsWith("My own notes.")).toBe(true);
    expect(editor.getText()).toContain("Non-Disclosure Agreement (NDA)");
    editor.commands.undo();
    expect(editor.getText()).toBe("My own notes.");
  });

  it("'Replace everything' replaces it", async () => {
    const { result } = setup(EXISTING);
    act(() => { result.current.start(() => draft, "replace", () => undefined); });
    await tick(3000);
    act(() => { result.current.skip(); });
    expect(editor.getText()).toBe(draftText);
    editor.commands.undo();
    expect(editor.getText()).toBe("My own notes.");
  });

  it("waits for an async preparation (the roles being saved) before typing", async () => {
    const { result } = setup(EMPTY);
    let resolve: (d: FlowDocument) => void = () => undefined;
    const prepared = new Promise<FlowDocument>(r => { resolve = r; });
    act(() => { result.current.start(() => prepared, "replace", () => undefined); });
    await tick(3500);
    expect(result.current.phase).toBe("loading");
    await act(async () => { resolve(draft); await Promise.resolve(); });
    await tick(50);
    expect(result.current.phase).toBe("typing");
  });

  it("reduced motion: a short spinner, then the text appears at once with a fade", async () => {
    const { result } = setup(EMPTY, true);
    const onDone = vi.fn();
    act(() => { result.current.start(() => draft, "replace", onDone); });
    await tick(990);
    expect(result.current.phase).toBe("loading");
    await tick(20);
    expect(editor.getText()).toBe(draftText);
    expect(result.current.fading).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
    editor.commands.undo();
    expect(editor.isEmpty).toBe(true);
  });
});
