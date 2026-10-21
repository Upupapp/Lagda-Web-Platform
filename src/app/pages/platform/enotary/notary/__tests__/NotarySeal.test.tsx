// The notary's seal and signature page: the seal is drawn from the commission and reads as the notary sets it; the
// signature is drawn, typed or uploaded, as a signer makes one, and saved as a picture.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
const read = vi.fn();
vi.mock("../../../../../services/real/notary-applications.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/notary-applications.service")>()),
  realNotaryApplicationsService: { read: (...a: unknown[]) => read(...a) as unknown },
}));
const signature = vi.fn();
const saveSignature = vi.fn();
const removeSignature = vi.fn();
const seal = vi.fn();
const saveSeal = vi.fn();
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: {
    signature: (...a: unknown[]) => signature(...a) as unknown, saveSignature: (...a: unknown[]) => saveSignature(...a) as unknown,
    removeSignature: (...a: unknown[]) => removeSignature(...a) as unknown,
    seal: (...a: unknown[]) => seal(...a) as unknown, saveSeal: (...a: unknown[]) => saveSeal(...a) as unknown,
  },
}));
// The signer's own capture control (Draw, Type, Upload) has its own tests; here it hands back what a signer made.
vi.mock("../../../../../components/recipient/SignatureCapture", () => ({
  SignatureCapture: ({ onChange }: { onChange: (value: unknown) => void }) => (
    <div data-testid="capture">
      <button type="button" onClick={() => { onChange({ method: "drawn", base64: PNG_B64 }); }}>Use a drawn signature</button>
      <button type="button" onClick={() => { onChange({ method: "typed", text: "Aiyana Cruz", styleIndex: 0 }); }}>Use a typed signature</button>
    </div>
  ),
}));

import { NotarySealPage, signaturePngOf } from "../NotarySealPage";

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const application = { legalName: "Aiyana Yasmin A. Cruz", commissionNo: "2026-0147", commissionValidUntil: "2027-12-31", rollNo: "58214", notarialJurisdiction: "Naga City" };
const sealView = (over: Record<string, unknown> = {}) => ({
  sealName: "Aiyana Yasmin A. Cruz", jurisdictionLine: "Naga City", officeLine: null, commissionNo: "2026-0147",
  commissionValidUntil: "2027-12-31", rollNo: "58214", customised: false, updatedAt: null, ...over,
});

beforeEach(() => {
  for (const fn of [read, signature, saveSignature, removeSignature, seal, saveSeal]) fn.mockReset();
  read.mockResolvedValue({ application, files: [], agreement: { version: "v1", text: "" } });
  signature.mockResolvedValue(null);
  seal.mockResolvedValue(sealView());
});
const open = () => render(<MemoryRouter><NotarySealPage /></MemoryRouter>);

describe("the seal", () => {
  it("is drawn from the commission, says it is the notary's own, and lists what it carries", async () => {
    open();
    const preview = await screen.findByTestId("seal-preview");
    expect(preview).toHaveAccessibleName(/Notary Public.*Aiyana Yasmin A\. Cruz.*Naga City.*Commission No\. 2026-0147.*Until 2027-12-31.*Roll No\. 58214/);
    expect(screen.getByText(/never stands in for it/)).toBeInTheDocument();
    expect(screen.getByTestId("seal-panel")).toHaveTextContent("Generated from commission");
    expect(screen.getByTestId("seal-panel")).toHaveTextContent("Register place of the entry");
  });

  it("reads as the notary sets it, shown at once, and saved; the commission is not theirs to edit", async () => {
    const user = userEvent.setup();
    saveSeal.mockResolvedValue(sealView({ sealName: "Atty. Aiyana Y. A. Cruz", officeLine: "Cruz Law Office", customised: true, updatedAt: "2026-10-21T01:00:00.000Z" }));
    open();
    await screen.findByTestId("seal-preview");
    const save = screen.getByRole("button", { name: /Save my seal/ });
    expect(save).toBeDisabled();
    const name = screen.getByLabelText(/Name on the seal/);
    await user.clear(name);
    await user.type(name, "Atty. Aiyana Y. A. Cruz");
    await user.type(screen.getByLabelText(/Office line/), "Cruz Law Office");
    expect(screen.getByTestId("seal-preview")).toHaveAccessibleName(/Atty\. Aiyana Y\. A\. Cruz.*Cruz Law Office/);
    expect(screen.queryByLabelText(/Commission number/)).toBeNull();
    await user.click(save);
    await waitFor(() => { expect(saveSeal).toHaveBeenCalledWith({ sealName: "Atty. Aiyana Y. A. Cruz", jurisdictionLine: "Naga City", officeLine: "Cruz Law Office" }); });
    expect(await screen.findByRole("status")).toHaveTextContent(/Your seal is saved/);
    expect(screen.getByTestId("seal-panel")).toHaveTextContent("Set by you");
  });

  it("will not save a seal without a name", async () => {
    const user = userEvent.setup();
    open();
    await screen.findByTestId("seal-preview");
    await user.clear(screen.getByLabelText(/Name on the seal/));
    expect(screen.getByRole("button", { name: /Save my seal/ })).toBeDisabled();
  });
});

describe("the signature", () => {
  it("saves a drawn or uploaded signature as a PNG, previews it on a document, and removes it", async () => {
    const user = userEvent.setup();
    saveSignature.mockResolvedValue({ mediaType: "image/png", sizeBytes: 70, updatedAt: "2026-10-20T01:00:00.000Z", image: PNG_B64 });
    removeSignature.mockResolvedValue(undefined);
    open();
    await screen.findByTestId("seal-preview");
    expect(screen.getByTestId("signature-panel")).toHaveTextContent("Not yet saved");
    expect(screen.getByRole("button", { name: /Save my signature/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Use a drawn signature" }));
    expect(screen.getByTestId("signature-image")).toHaveAttribute("src", `data:image/png;base64,${PNG_B64}`);
    expect(screen.getByTestId("signature-preview")).toHaveTextContent("Notary Public");
    await user.click(screen.getByRole("button", { name: /Save my signature/ }));
    await waitFor(() => { expect(saveSignature).toHaveBeenCalledWith("image/png", PNG_B64); });
    await waitFor(() => { expect(screen.getByTestId("signature-panel")).toHaveTextContent("Saved"); });
    await user.click(screen.getByRole("button", { name: /Remove it/ }));
    await waitFor(() => { expect(removeSignature).toHaveBeenCalled(); });
    await waitFor(() => { expect(screen.queryByTestId("signature-image")).toBeNull(); });
  });

  it("turns a typed signature into a picture before saving it", async () => {
    const user = userEvent.setup();
    const ctx = { font: "", fillStyle: "", textBaseline: "", measureText: () => ({ width: 300 }), fillText: vi.fn() };
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,QUJD");
    saveSignature.mockResolvedValue({ mediaType: "image/png", sizeBytes: 3, updatedAt: "2026-10-20T01:00:00.000Z", image: "QUJD" });
    open();
    await screen.findByTestId("seal-preview");
    await user.click(screen.getByRole("button", { name: "Use a typed signature" }));
    expect(ctx.fillText).toHaveBeenCalledWith("Aiyana Cruz", 20, 72, expect.any(Number));
    await user.click(screen.getByRole("button", { name: /Save my signature/ }));
    await waitFor(() => { expect(saveSignature).toHaveBeenCalledWith("image/png", "QUJD"); });
    getContext.mockRestore(); toDataURL.mockRestore();
  });

  it("has nothing to save from an empty typed signature", () => {
    expect(signaturePngOf({ method: "typed", text: "  ", styleIndex: 0 })).toBeNull();
    expect(signaturePngOf({ method: "saved" })).toBeNull();
  });
});
