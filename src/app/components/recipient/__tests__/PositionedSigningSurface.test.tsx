// The signer's positioned view of the document.
//
// What matters here is that the boxes land where the SENDER put them, and
// that only the signer's own fields are fillable. Both are properties of the
// overlay's arithmetic and filtering, which is testable in jsdom; the page
// raster underneath is not, so pdf.js is stubbed.
//
// The geometry assertions are the point. A field is stored as a normalised
// 0-1 rect and drawn by the merge against the real page box — so if this
// overlay placed a box using a different convention (percent vs fraction, or
// `y` from the bottom rather than the top), the signer would sign in one place
// and the sealed document would show the mark in another, with nothing failing
// anywhere.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CeremonyField } from "../../../services/real/signing-access.service";

// ── pdf.js, stubbed ────────────────────────────────────────────────────────
//
// Two A4-shaped pages. jsdom has no rasteriser, so `render` resolves without
// drawing; every assertion below is about the overlay, not the pixels.
const page = {
  getViewport: ({ scale }: { scale: number }) => ({
    width: 595 * scale, height: 842 * scale,
  }),
  render: () => ({ promise: Promise.resolve(), cancel: () => undefined }),
};
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: () => Promise.resolve(page),
      destroy: () => Promise.resolve(),
    }),
  }),
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "worker.js" }));

import { PositionedSigningSurface } from "../PositionedSigningSurface";

const field = (over: Partial<CeremonyField> = {}): CeremonyField => ({
  fieldId: "f_sig",
  type: "signature",
  pageNumber: 1,
  x: 0.12, y: 0.74, width: 0.3, height: 0.08,
  required: true,
  label: "Signer signature",
  layer: 0,
  valueAuthority: "RECIPIENT_SUPPLIED",
  valueKind: "representation",
  maxLength: null,
  ...over,
});

function setup(fields: CeremonyField[], over: Partial<{
  signature: unknown; initials: unknown; textValues: Record<string, string | boolean>;
}> = {}) {
  const onSignature = vi.fn();
  const onInitials = vi.fn();
  const onTextValue = vi.fn();
  // jsdom's `Blob` has no `arrayBuffer()`, which is what the loader calls —
  // so this supplies one rather than relying on the environment.
  const loadBlob = () => Promise.resolve({
    type: "application/pdf",
    arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
  } as unknown as Blob);

  render(
    <PositionedSigningSurface
      loadBlob={loadBlob}
      fields={fields}
      signature={(over.signature ?? null) as never}
      initials={(over.initials ?? null) as never}
      textValues={over.textValues ?? {}}
      onSignature={onSignature}
      onInitials={onInitials}
      onTextValue={onTextValue}
    />,
  );
  return { onSignature, onInitials, onTextValue, user: userEvent.setup() };
}

/** The positioned box for a field, found by its accessible name. */
async function boxFor(name: RegExp): Promise<HTMLElement> {
  const control = await screen.findByRole("button", { name });
  // The button fills the positioned wrapper; the wrapper carries the geometry.
  const wrapper = control.parentElement;
  if (wrapper === null) throw new Error("field box has no wrapper");
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom lays nothing out, so every element reports `clientWidth: 0` and the
  // surface would correctly decline to draw a zero-width page. Give it a real
  // width so the geometry below is exercised.
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true, get: () => 600,
  });
});

describe("where the boxes land", () => {
  it("places a field at the sender's normalised rect", async () => {
    setup([field()]);

    const box = await boxFor(/Add your signature/);

    // The exact numbers the sender stored, as percentages. `top` is measured
    // from the page TOP, matching `y`'s definition in the preparation
    // contract — "0-1 from the TOP edge, to the field's TOP".
    expect(box.style.left).toBe("12%");
    expect(box.style.top).toBe("74%");
    expect(box.style.width).toBe("30%");
    expect(box.style.height).toBe("8%");
  });

  it("puts each field on its own page", async () => {
    setup([
      field({ fieldId: "f_p1", pageNumber: 1, label: "First" }),
      field({ fieldId: "f_p2", pageNumber: 2, label: "Second", type: "initials" }),
    ]);

    await screen.findByText("Page 1 of 2");
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();

    // Each page renders its own fields and no others.
    const first = await boxFor(/First/);
    const second = await boxFor(/Second/);
    expect(first.parentElement).not.toBe(second.parentElement);
  });
});

describe("whose fields are fillable", () => {
  it("shows only the signer's own fields", async () => {
    setup([
      field({ fieldId: "f_mine", label: "Mine" }),
      field({
        fieldId: "f_server", label: "Date signed", type: "date",
        valueAuthority: "SERVER_DERIVED",
      }),
    ]);

    await boxFor(/Mine/);
    // A server-derived field is filled by LAGDA and a client cannot express a
    // value for it at all — offering an input would be a control that does
    // nothing.
    expect(screen.queryByLabelText("Date signed")).toBeNull();
  });

  it("offers a text input for a text field, not a signature box", async () => {
    setup([field({
      fieldId: "f_txt", type: "text", label: "Address",
      valueKind: "text", maxLength: 120,
    })]);

    const input = await screen.findByLabelText("Address");
    expect(input.getAttribute("maxLength")).toBe("120");
  });
});

describe("adopting a signature", () => {
  it("opens the capture sheet from the box on the page", async () => {
    // Opened FROM the box, so the signer sees where the mark is going before
    // they make it — which is the whole reason this view exists.
    const { user } = setup([field()]);

    await user.click(await screen.findByRole("button", { name: /Add your signature/ }));

    const sheet = await screen.findByRole("dialog", { name: /Add your signature/ });
    expect(sheet).toBeTruthy();
    expect(screen.getByRole("button", { name: "Draw" })).toBeTruthy();
  });

  it("shows one adopted signature in EVERY signature box", async () => {
    // `SubmitSigningInput` carries one signature for the whole submission, so
    // adopting once must fill every box rather than only the one clicked.
    setup(
      [
        field({ fieldId: "f_a", label: "First" }),
        field({ fieldId: "f_b", label: "Second", pageNumber: 2 }),
      ],
      { signature: { method: "typed", text: "Maria Santos", styleIndex: 0 } },
    );

    await waitFor(() => {
      expect(screen.getAllByText("Maria Santos")).toHaveLength(2);
    });
  });

  it("renders a drawn signature as the image it is", async () => {
    setup([field()], {
      signature: { method: "drawn", base64: "aGVsbG8=" },
    });

    // `alt=""` deliberately — the mark is decorative beside the field's own
    // accessible name, so there is no role to query. Assert the src, which is
    // the part that has to be right: raw base64 wrapped into a data URL for
    // DISPLAY only. What goes to the server stays prefix-free.
    await waitFor(() => {
      const image = document.querySelector("img");
      expect(image?.getAttribute("src")).toBe("data:image/png;base64,aGVsbG8=");
    });
  });

  it("previews a typed signature in the face the server draws with", async () => {
    setup([field()], {
      signature: { method: "typed", text: "Maria Santos", styleIndex: 0 },
    });

    const mark = await screen.findByText("Maria Santos");
    expect(mark.style.fontFamily).toContain("Noto Sans");
    expect(mark.style.fontStyle).toBe("italic");
  });
});

describe("what still needs doing", () => {
  it("counts outstanding fields, so a field on page 9 is not missed", async () => {
    setup([
      field({ fieldId: "f_sig" }),
      field({ fieldId: "f_ini", type: "initials", pageNumber: 2, label: "Initials" }),
    ]);

    expect(await screen.findByText("2 fields still need your input.")).toBeTruthy();
  });

  it("reports completion once everything is filled", async () => {
    setup([field()], {
      signature: { method: "typed", text: "Maria", styleIndex: 0 },
    });

    expect(await screen.findByText("All your fields are complete.")).toBeTruthy();
  });

  it("does not count an OPTIONAL empty text field as outstanding", async () => {
    setup([field({
      fieldId: "f_opt", type: "text", label: "Notes",
      required: false, valueKind: "text",
    })]);

    expect(await screen.findByText("All your fields are complete.")).toBeTruthy();
  });
});
