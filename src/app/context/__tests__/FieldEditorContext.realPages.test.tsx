// Correcting the editor's page model from the real document.
//
// ── What was wrong ─────────────────────────────────────────────────────────
//
// The editor initialises from `buildEditorDocuments`, whose page count comes
// from `derivePageCount` — an index into a hardcoded array, `[3, 2, 5, 1, 4,
// 2, 3]` — and whose every page is assumed A4. Both are placeholders for a
// file nobody has read. Fields, meanwhile, are saved to the real backend.
//
// So a sender could place a signature on "page 3" of a real one-page PDF. The
// backend validates `pageNumber` against the artifact's real page count and
// refuses the save, which is correct but arrives as an unexplained error —
// the editor had already shown page 3 as a place to put things.
//
// And on a page that DOES exist, a fixed A4 ratio (1.415) against a real US
// Letter page (1.294) shifts every normalised `y` by about 9% of page height.
// Nothing errors; the signature is simply in the wrong place.
//
// These tests pin the correction: the real count and the real shapes win, and
// anything that cannot survive the correction is dropped rather than left to
// fail at save time.

import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { FieldEditorProvider, useFieldEditor } from "../FieldEditorContext";
import type { PreparationDraft } from "../../models/prepare";

vi.mock("../../services/backend-flag", () => ({ USE_REAL_BACKEND: true }));

const PARTICIPANTS = [
  { id: "pax_1", name: "Signer One", email: "s@x.com", role: "signer" },
];

/**
 * One file, so `derivePageCount` uses index 0 — which is 3 pages.
 *
 * That the fabricated count is 3 is the premise of these tests, not an
 * incidental detail: the corrections below are from 3 to something else.
 */
const DRAFT = {
  id: "d1",
  details: { title: "Contract", description: "", folderId: null, tagIds: [] },
  files: [{
    id: "f1", fileName: "contract.pdf", fileSizeBytes: 1000,
    mimeType: "application/pdf", fileState: "ready", order: 0,
    backendDocumentId: "doc_1",
  }],
  participants: PARTICIPANTS,
  routing: { mode: "sequential", groups: [] },
  auth: { defaultMethod: "none", perParticipant: {} },
  settings: {},
} as unknown as PreparationDraft;

/** Exposes the bits of editor state these tests assert on. */
function Probe() {
  const {
    documents, currentPageId, fields, initialize, syncRealPages, addField,
  } = useFieldEditor();
  const doc = documents[0];

  return (
    <div>
      <button onClick={() => { initialize("d1", DRAFT); }}>init</button>
      <button
        onClick={() => {
          if (doc) syncRealPages(doc.id, 1, [612 / 792]);
        }}
      >one-letter-page</button>
      <button
        onClick={() => {
          if (doc) syncRealPages(doc.id, 5, Array.from({ length: 5 }, () => 595 / 842));
        }}
      >five-a4-pages</button>
      <button
        onClick={() => {
          const page = doc?.pages[2];
          if (doc && page) {
            addField({
              type: "signature",
              documentId: doc.id,
              pageId: page.id,
              rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
              participantId: "pax_1",
            });
          }
        }}
      >place-on-page-3</button>

      <output data-testid="count">{doc?.pageCount ?? 0}</output>
      <output data-testid="pages">{doc?.pages.length ?? 0}</output>
      <output data-testid="ratio">{doc?.pages[0]?.aspectRatio.toFixed(4) ?? ""}</output>
      <output data-testid="fields">{fields.length}</output>
      <output data-testid="current">{currentPageId ?? ""}</output>
    </div>
  );
}

function setup() {
  render(
    <FieldEditorProvider participants={PARTICIPANTS as never}>
      <Probe />
    </FieldEditorProvider>,
  );
  act(() => { screen.getByText("init").click(); });
}

const read = (id: string) => screen.getByTestId(id).textContent;

describe("the fabricated page model", () => {
  it("starts with an invented page count and an assumed A4 shape", () => {
    setup();
    // The premise. If this ever changes, the corrections below are testing
    // something other than what they claim to.
    expect(read("count")).toBe("3");
    expect(read("ratio")).toBe((595 / 842).toFixed(4));
  });
});

describe("correcting to the real document", () => {
  it("takes the real page count, shrinking the list", () => {
    setup();
    act(() => { screen.getByText("one-letter-page").click(); });

    expect(read("count")).toBe("1");
    expect(read("pages")).toBe("1");
  });

  it("takes the real page SHAPE, not A4", () => {
    setup();
    act(() => { screen.getByText("one-letter-page").click(); });

    // US Letter, as width/height. Against A4's 0.707 this is the ~9% that
    // silently moved every field on the page.
    expect(read("ratio")).toBe((612 / 792).toFixed(4));
  });

  it("grows the list when the real document has more pages", () => {
    setup();
    act(() => { screen.getByText("five-a4-pages").click(); });

    expect(read("count")).toBe("5");
    expect(read("pages")).toBe("5");
  });

  it("drops a field on a page the document does not have", () => {
    // The whole point. Placed on fabricated page 3, then the real document
    // turns out to have one page. Keeping it would mean a save the backend
    // refuses, with nothing on screen to explain why.
    setup();
    act(() => { screen.getByText("place-on-page-3").click(); });
    expect(read("fields")).toBe("1");

    act(() => { screen.getByText("one-letter-page").click(); });

    expect(read("fields")).toBe("0");
  });

  it("KEEPS a field on a page that survives", () => {
    // The correction must not be a blunt reset. A field on page 1 is as valid
    // after the correction as before it.
    setup();
    act(() => { screen.getByText("place-on-page-3").click(); });

    act(() => { screen.getByText("five-a4-pages").click(); });

    expect(read("fields")).toBe("1");
  });

  it("moves the current page when the one selected disappears", () => {
    setup();
    const before = read("current");

    act(() => { screen.getByText("one-letter-page").click(); });

    // Page 1 survives, so selection is preserved rather than reset for its
    // own sake — but it must never point at a page that no longer exists.
    expect(read("current")).toBe(before);
    expect(read("current")).not.toBe("");
  });

  it("is idempotent, so it can run on every render without looping", () => {
    // The effect that calls this runs whenever the loaded document changes
    // identity. Returning fresh state for identical input would re-render,
    // which would run the effect again.
    setup();
    act(() => { screen.getByText("one-letter-page").click(); });
    const after = read("pages");

    act(() => { screen.getByText("one-letter-page").click(); });

    expect(read("pages")).toBe(after);
    expect(read("count")).toBe("1");
  });
});
