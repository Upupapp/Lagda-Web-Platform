// Signature capture, for the real signing ceremony.
//
// The properties that matter here are contract-shaped rather than cosmetic.
// The backend refuses a signature whose base64 carries a `data:` prefix, whose
// transport length is over budget, or whose shape is not one of the two
// members of `SignatureRepresentationSchema` — and a signer only discovers
// any of that after they believe they have signed. So these tests pin the
// wire shape, not the pixels.
//
// jsdom has no real canvas rasteriser, so `toDataURL` and `getImageData` are
// stubbed. That limits what can be asserted about DRAWING — the stroke maths
// is not meaningfully testable here — but it does not limit the assertions
// this file actually makes, which are about what leaves the component.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignatureCapture, type SignatureValue } from "../SignatureCapture";

/** A 1x1 PNG, as a canvas would hand it over: prefixed. */
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk"
  + "YAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * Makes a canvas behave as though it holds ink.
 *
 * `getImageData` returns one opaque pixel so the trim finds a bounding box,
 * and `toDataURL` returns a real PNG data URL so the prefix-stripping is
 * exercised on the shape a browser actually produces.
 */
function stubCanvas(): void {
  const context = {
    scale: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) }),
    lineWidth: 0, lineCap: "", lineJoin: "", strokeStyle: "",
  };
  HTMLCanvasElement.prototype.getContext =
    vi.fn(() => context) as unknown as HTMLCanvasElement["getContext"];
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => PNG_DATA_URL);
  // The trim reads width/height off the backing store; jsdom leaves them 0.
  Object.defineProperty(HTMLCanvasElement.prototype, "width",
    { configurable: true, get: () => 1, set: () => undefined });
  Object.defineProperty(HTMLCanvasElement.prototype, "height",
    { configurable: true, get: () => 1, set: () => undefined });
}

function setup(purpose: "signature" | "initials" = "signature") {
  const onChange = vi.fn<(value: SignatureValue | null) => void>();
  render(
    <SignatureCapture
      label="Signature (required)"
      purpose={purpose}
      value={null}
      onChange={onChange}
    />,
  );
  return { onChange, user: userEvent.setup() };
}

/** The last non-null value the component emitted. */
function lastValue(
  onChange: ReturnType<typeof vi.fn>,
): SignatureValue | null {
  const calls = onChange.mock.calls as unknown as [SignatureValue | null][];
  for (let index = calls.length - 1; index >= 0; index--) {
    const value = calls[index]?.[0];
    if (value != null) return value;
  }
  return null;
}

beforeEach(() => {
  vi.restoreAllMocks();
  stubCanvas();
});

describe("the three ways to sign", () => {
  it("offers Draw, Type and Upload", () => {
    setup();
    expect(screen.getByRole("button", { name: "Draw" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Type" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload" })).toBeTruthy();
  });

  it("starts on Draw, because that is the one the product was missing", () => {
    setup();
    expect(screen.getByRole("button", { name: "Draw" }).getAttribute("aria-pressed"))
      .toBe("true");
  });
});

describe("typed signatures", () => {
  it("emits the typed member of the union", async () => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByLabelText("Type your signature"), "Maria Santos");

    expect(lastValue(onChange)).toEqual({
      method: "typed", text: "Maria Santos", styleIndex: 0,
    });
  });

  it("always sends style 0, because the renderer draws all four the same", async () => {
    // `faceFor()` returns the italic face for every signature regardless of
    // `styleIndex`. Sending anything else would imply a choice the document
    // does not reflect.
    const { onChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByLabelText("Type your signature"), "A");

    const value = lastValue(onChange);
    expect(value?.method === "typed" ? value.styleIndex : -1).toBe(0);
  });

  it("trims, so what is stored is what gets drawn", async () => {
    // The backend checks renderability against the TRIMMED text, and stores
    // that. Sending untrimmed would make the two disagree about the value.
    const { onChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByLabelText("Type your signature"), "  Maria  ");

    const value = lastValue(onChange);
    expect(value?.method === "typed" ? value.text : null).toBe("Maria");
  });

  it("emits null for whitespace only, rather than an empty signature", async () => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByLabelText("Type your signature"), "   ");

    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("previews in the face the document is actually drawn with", async () => {
    // A preview in a decorative script would promise a signature the sealed
    // PDF will not contain. The server draws Noto Sans italic.
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByLabelText("Type your signature"), "Maria");

    const preview = screen.getByText("Maria");
    expect(preview.style.fontFamily).toContain("Noto Sans");
    expect(preview.style.fontStyle).toBe("italic");
  });

  it("bounds the input at the server's typed length", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Type" }));
    expect(screen.getByLabelText("Type your signature").getAttribute("maxLength"))
      .toBe("200");
  });
});

describe("drawn signatures", () => {
  it("emits RAW base64, never a data URL", async () => {
    // The server's pattern is `^[A-Za-z0-9+/]+={0,2}$` and it REFUSES a
    // prefixed payload rather than stripping it. A component that forwarded
    // `toDataURL()` unchanged would fail every drawn submission.
    const { onChange, user } = setup();
    const canvas = screen.getByLabelText("Draw your signature");

    // A real press-drag-release. `user.pointer` carries the coordinates React's
    // synthetic handlers read; a bare event without them would record the
    // stroke at NaN and let the assertions below pass without the drawing path
    // having run at all.
    await user.pointer([
      { keys: "[MouseLeft>]", target: canvas, coords: { clientX: 10, clientY: 10 } },
      { target: canvas, coords: { clientX: 40, clientY: 30 } },
      { keys: "[/MouseLeft]", target: canvas },
    ]);

    const value = lastValue(onChange);
    expect(value?.method).toBe("drawn");
    const base64 = value?.method === "drawn" ? value.base64 : "";
    expect(base64.startsWith("data:")).toBe(false);
    expect(base64).toMatch(/^[A-Za-z0-9+/]+={0,2}$/u);
  });

  it("does not let a touch drag scroll the page instead of drawing", () => {
    // Without `touch-action: none` the pad is unusable on a phone: the browser
    // claims the gesture for scrolling and no stroke is ever drawn.
    setup();
    expect(screen.getByLabelText("Draw your signature").style.touchAction)
      .toBe("none");
  });

  it("labels the pad for assistive technology", () => {
    setup("initials");
    expect(screen.getByLabelText("Draw your initials")).toBeTruthy();
  });
});

describe("switching modes", () => {
  it("clears the adopted value", async () => {
    // Carrying a drawn mark into typed mode would submit something the signer
    // is no longer looking at. The adopted representation must be the one they
    // last saw.
    const { onChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByLabelText("Type your signature"), "Maria");
    onChange.mockClear();

    await user.click(screen.getByRole("button", { name: "Upload" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("does not clear when the same mode is re-selected", async () => {
    const { onChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Type" }));
    await user.type(screen.getByLabelText("Type your signature"), "Maria");
    onChange.mockClear();

    await user.click(screen.getByRole("button", { name: "Type" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("wording follows the purpose", () => {
  it("says initials, not signature, for an initials field", async () => {
    const { user } = setup("initials");
    await user.click(screen.getByRole("button", { name: "Type" }));
    expect(screen.getByLabelText("Type your initials")).toBeTruthy();
  });
});
