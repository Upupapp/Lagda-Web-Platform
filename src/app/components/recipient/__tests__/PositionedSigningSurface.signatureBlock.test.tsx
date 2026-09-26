// Signature over name, on the signer's surface: they sign; the name is shown.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CeremonyField } from "../../../services/real/signing-access.service";

const page = {
  getViewport: ({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }),
  render: () => ({ promise: Promise.resolve(), cancel: () => undefined }),
};
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({
    promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve(page), destroy: () => Promise.resolve() }),
  }),
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "worker.js" }));

import { PositionedSigningSurface } from "../PositionedSigningSurface";

const block: CeremonyField = {
  fieldId: "f_block", type: "signature-block", pageNumber: 1,
  x: 0.1, y: 0.7, width: 0.34, height: 0.1, required: true,
  label: "Candidate signature", layer: 0,
  valueAuthority: "RECIPIENT_SUPPLIED", valueKind: "representation", maxLength: null,
};

const loadBlob = () => Promise.resolve({
  type: "application/pdf",
  arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
} as unknown as Blob);

function setup(signature: unknown = null) {
  const onSignature = vi.fn();
  render(
    <PositionedSigningSurface
      loadBlob={loadBlob}
      fields={[block]}
      signerName="Maria Santos"
      signature={signature as never}
      initials={null}
      textValues={{}}
      onSignature={onSignature}
      onInitials={vi.fn()}
      onTextValue={vi.fn()}
    />,
  );
  return { onSignature };
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 595 });
});

describe("signature over name on the signing surface", () => {
  it("asks only for a signature, with the signer's name already printed", async () => {
    setup();
    expect(await screen.findByRole("button", { name: /Add your signature — Candidate signature/ })).toBeTruthy();
    expect(screen.getByText("Maria Santos")).toBeTruthy();
    expect(screen.getByText(/1 field still need/)).toBeTruthy();
  });

  it("prints the name in the formal serif at the sealed 11pt size", async () => {
    setup();
    const name = await screen.findByText("Maria Santos");
    expect(name.style.fontFamily).toMatch(/Tinos/);
    // 595px shown for a 595pt page: 11pt is 11px.
    expect(name.style.fontSize).toBe("11px");
  });

  it("counts as done once a signature is adopted", async () => {
    setup({ method: "typed", text: "Maria Santos", styleIndex: 0 });
    expect(await screen.findByText("All your fields are complete")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Change your signature/ })).toBeTruthy();
  });

  it("opens the signature capture when tapped", async () => {
    setup();
    await userEvent.click(await screen.findByRole("button", { name: /Add your signature/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });
});
