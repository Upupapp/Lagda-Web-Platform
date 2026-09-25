// The /copy page (073): a valid link downloads, a dead one says so plainly.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

const download = vi.fn();
vi.mock("../../../services/real/final-copy.service", () => ({
  downloadFinalCopy: (...args: unknown[]) => download(...args),
}));

import { FinalCopyPage } from "../FinalCopyPage";

const TOKEN = "t".repeat(43);

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/copy/:token" element={<FinalCopyPage />} />
        <Route path="/copy" element={<FinalCopyPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  download.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
  // jsdom cannot navigate; the download click itself is not under test.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

describe("FinalCopyPage", () => {
  it("exchanges the link for the document and offers it again", async () => {
    download.mockResolvedValue({ kind: "ok", blob: new Blob(["%PDF"]), filename: "Lease (signed).pdf" });
    renderAt(`/copy/${TOKEN}`);
    expect(await screen.findByText("Your signed document is downloading")).toBeTruthy();
    expect(download).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByRole("button", { name: /Download again/ })).toBeTruthy();
  });

  it("says a dead link can't be used, and who to ask", async () => {
    download.mockResolvedValue({ kind: "invalid" });
    renderAt(`/copy/${TOKEN}`);
    expect(await screen.findByText("This download link can't be used")).toBeTruthy();
    expect(screen.getByText(/Contact the sender/)).toBeTruthy();
  });

  it("offers a retry when something else went wrong", async () => {
    download.mockResolvedValue({ kind: "error" });
    renderAt(`/copy/${TOKEN}`);
    expect(await screen.findByRole("button", { name: /Try again/ })).toBeTruthy();
  });

  it("treats a missing link as unusable without calling the server", async () => {
    renderAt("/copy");
    expect(await screen.findByText("This download link can't be used")).toBeTruthy();
    expect(download).not.toHaveBeenCalled();
  });
});
