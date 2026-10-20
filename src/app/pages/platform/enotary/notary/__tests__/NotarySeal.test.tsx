// The notary's seal and signature page: the seal is drawn from the commission, the signature is a picture saved once.

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
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: {
    signature: (...a: unknown[]) => signature(...a) as unknown, saveSignature: (...a: unknown[]) => saveSignature(...a) as unknown,
    removeSignature: (...a: unknown[]) => removeSignature(...a) as unknown,
  },
}));

import { NotarySealPage } from "../NotarySealPage";

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const application = { legalName: "Aiyana Yasmin A. Cruz", commissionNo: "2026-0147", commissionValidUntil: "2027-12-31", rollNo: "58214" };

beforeEach(() => {
  for (const fn of [read, signature, saveSignature, removeSignature]) fn.mockReset();
  read.mockResolvedValue({ application, files: [], agreement: { version: "v1", text: "" } });
  signature.mockResolvedValue(null);
});
const open = () => render(<MemoryRouter><NotarySealPage /></MemoryRouter>);

describe("the seal and signature page", () => {
  it("draws the seal from the commission, and says it is the notary's own", async () => {
    open();
    const seal = await screen.findByTestId("seal-preview");
    expect(seal).toHaveAccessibleName(/Notary Public.*Aiyana Yasmin A\. Cruz.*Commission No\. 2026-0147.*Until 2027-12-31.*Roll No\. 58214/);
    expect(screen.getByText(/never stands in for it/)).toBeInTheDocument();
  });

  it("saves a PNG or JPEG signature, shows it, and removes it", async () => {
    const user = userEvent.setup();
    saveSignature.mockResolvedValue({ mediaType: "image/png", sizeBytes: 70, updatedAt: "2026-10-20T01:00:00.000Z", image: PNG_B64 });
    removeSignature.mockResolvedValue(undefined);
    open();
    await screen.findByTestId("seal-preview");
    expect(screen.getByRole("button", { name: /Save my signature/ })).toBeDisabled();
    await user.upload(screen.getByLabelText("Picture of your signature"), new File([Uint8Array.from(atob(PNG_B64), c => c.charCodeAt(0))], "sig.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: /Save my signature/ }));
    await waitFor(() => { expect(saveSignature).toHaveBeenCalledWith("image/png", PNG_B64); });
    expect(await screen.findByTestId("signature-image")).toHaveAttribute("src", `data:image/png;base64,${PNG_B64}`);
    await user.click(screen.getByRole("button", { name: /Remove it/ }));
    await waitFor(() => { expect(removeSignature).toHaveBeenCalled(); });
    await waitFor(() => { expect(screen.queryByTestId("signature-image")).toBeNull(); });
  });

  it("refuses a file that is not a picture, or is too big, before sending it", async () => {
    const user = userEvent.setup({ applyAccept: false });
    open();
    await screen.findByTestId("seal-preview");
    await user.upload(screen.getByLabelText("Picture of your signature"), new File(["text"], "notes.txt", { type: "text/plain" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a PNG or JPEG picture.");
    expect(screen.getByRole("button", { name: /Save my signature/ })).toBeDisabled();
    await user.upload(screen.getByLabelText("Picture of your signature"), new File([new Uint8Array(300_001)], "big.png", { type: "image/png" }));
    expect(screen.getByRole("alert")).toHaveTextContent("at most 300 KB");
    expect(saveSignature).not.toHaveBeenCalled();
  });
});
