// Reading a payment QR out of a picture: what is refused before the picture is
// read, what a readable one gives back, and the file name a saved QR gets.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const decode = vi.fn();
vi.mock("jsqr", () => ({ default: (...args: unknown[]) => decode(...args) as unknown }));

import { QR_PICTURE_MAX_BYTES, QrPictureError, decodeQrPicture, qrFileName, qrPictureProblemText } from "../payment-qr";

const picture = (type = "image/png", size = 1000) => {
  const file = new File(["x"], "qr.png", { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

/** A canvas that records what was drawn and hands back pixels. */
function stubCanvas(width = 800, height = 600) {
  const drawn: { width: number; height: number }[] = [];
  const context = {
    drawImage: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(4), width: w, height: h })),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as never);
  vi.stubGlobal("createImageBitmap", vi.fn(() => Promise.resolve({ width, height, close: vi.fn() })));
  return { context, drawn };
}

beforeEach(() => { decode.mockReset(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("decoding a picture of a payment QR", () => {
  it("refuses a file that is not a PNG, JPG or WebP picture, and one that is too large, without reading it", async () => {
    stubCanvas();
    await expect(decodeQrPicture(picture("application/pdf"))).rejects.toMatchObject({ problem: "type" });
    await expect(decodeQrPicture(picture("image/gif"))).rejects.toMatchObject({ problem: "type" });
    await expect(decodeQrPicture(picture("image/png", QR_PICTURE_MAX_BYTES + 1))).rejects.toMatchObject({ problem: "size" });
    expect(decode).not.toHaveBeenCalled();
  });

  it("returns the text the decoder found", async () => {
    stubCanvas();
    decode.mockReturnValue({ data: "000201010211…6304ABCD" });
    await expect(decodeQrPicture(picture())).resolves.toBe("000201010211…6304ABCD");
    expect(decode).toHaveBeenCalledWith(expect.anything(), 800, 600, { inversionAttempts: "attemptBoth" });
  });

  it("scales a large photograph down before reading it", async () => {
    stubCanvas(4000, 3000);
    decode.mockReturnValue({ data: "code" });
    await decodeQrPicture(picture("image/jpeg"));
    const [, width, height] = decode.mock.calls[0] as [unknown, number, number];
    expect(Math.max(width, height)).toBe(1600);
    expect(width / height).toBeCloseTo(4 / 3, 1);
  });

  it("says so when there is no code in the picture", async () => {
    stubCanvas();
    decode.mockReturnValue(null);
    await expect(decodeQrPicture(picture())).rejects.toMatchObject({ problem: "no_code" });
    decode.mockReturnValue({ data: "" });
    await expect(decodeQrPicture(picture())).rejects.toBeInstanceOf(QrPictureError);
  });

  it("says so when the picture cannot be opened", async () => {
    stubCanvas();
    vi.stubGlobal("createImageBitmap", vi.fn(() => Promise.reject(new Error("bad image"))));
    await expect(decodeQrPicture(picture())).rejects.toMatchObject({ problem: "unreadable" });
  });

  it("has a plain sentence for each problem", () => {
    for (const problem of ["type", "size", "unreadable", "no_code"] as const) {
      expect(qrPictureProblemText(problem).length).toBeGreaterThan(20);
    }
  });
});

describe("the file name of a saved QR", () => {
  it("names the payee and keeps to safe characters", () => {
    expect(qrFileName("ATTY AMADOR SIMANDO")).toBe("lagda-payment-qr-ATTY-AMADOR-SIMANDO.png");
    expect(qrFileName("  Ana/María  ")).toBe("lagda-payment-qr-Ana-Mar-a.png");
    expect(qrFileName("???")).toBe("lagda-payment-qr-payee.png");
    expect(qrFileName("x".repeat(100)).length).toBeLessThan(70);
  });
});
