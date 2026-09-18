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

function setup(
  purpose: "signature" | "initials" = "signature",
  value: SignatureValue | null = null,
) {
  const onChange = vi.fn<(value: SignatureValue | null) => void>();
  render(
    <SignatureCapture
      label="Signature (required)"
      purpose={purpose}
      value={value}
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

describe("changing a signature already adopted", () => {
  // Nothing is final until the submission is sent, and a signer who believes
  // their first attempt is binding will not try to improve it. A wobbly
  // signature they are stuck with is a worse outcome than one they redrew.

  it("shows what was adopted instead of an empty pad", async () => {
    setup("signature", { method: "typed", text: "Maria Santos", styleIndex: 0 });

    expect(await screen.findByText("Maria Santos")).toBeTruthy();
    // The picker is hidden: the sheet answers one question at a time.
    expect(screen.queryByRole("button", { name: "Draw" })).toBeNull();
  });

  it("says the signature can still be changed", async () => {
    setup("signature", { method: "drawn", base64: "aGVsbG8=" });

    expect(await screen.findByText("You can change this until you submit."))
      .toBeTruthy();
  });

  it("shows a DRAWN signature as the image it is", () => {
    setup("signature", { method: "drawn", base64: "aGVsbG8=" });

    const image = screen.getByAltText("Your adopted signature");
    expect(image.getAttribute("src")).toBe("data:image/png;base64,aGVsbG8=");
  });

  it("reveals the picker on Change", async () => {
    const { user } = setup("signature", {
      method: "typed", text: "Maria Santos", styleIndex: 0,
    });

    await user.click(screen.getByRole("button", { name: /Change/ }));

    expect(screen.getByRole("button", { name: "Draw" })).toBeTruthy();
  });

  it("restores the typed text so a change starts from what is there", async () => {
    // A drawn mark is kept as a PNG, not as strokes, so it genuinely cannot
    // be resumed — but a typed one is fully recoverable, and reopening it
    // blank would read as having lost the signer's work.
    const { user } = setup("signature", {
      method: "typed", text: "Maria Santos", styleIndex: 0,
    });

    await user.click(screen.getByRole("button", { name: /Change/ }));

    expect(screen.getByLabelText("Type your signature").getAttribute("value"))
      .toBe("Maria Santos");
  });

  it("clears the adopted value on Remove", async () => {
    const { onChange, user } = setup("signature", {
      method: "typed", text: "Maria Santos", styleIndex: 0,
    });

    await user.click(screen.getByRole("button", { name: /Remove/ }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("offers no Change or Remove when nothing is adopted yet", () => {
    setup();

    expect(screen.queryByRole("button", { name: /Change/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  });
});

describe("wording follows the purpose", () => {
  it("says initials, not signature, for an initials field", async () => {
    const { user } = setup("initials");
    await user.click(screen.getByRole("button", { name: "Type" }));
    expect(screen.getByLabelText("Type your initials")).toBeTruthy();
  });
});
