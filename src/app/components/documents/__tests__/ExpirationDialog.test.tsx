// Setting, changing and removing a sent document's expiration.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setExpiry = vi.fn();
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: { setExpiry: (...args: unknown[]) => setExpiry(...args) },
}));

import { ExpirationDialog } from "../ExpirationDialog";

function openDialog(expiresAt: string | null) {
  const onSaved = vi.fn();
  render(
    <ExpirationDialog workspaceId="ws_1" signingRequestId="sr_1" documentTitle="Office Lease"
      expiresAt={expiresAt} onClose={vi.fn()} onSaved={onSaved} />,
  );
  return onSaved;
}

beforeEach(() => { setExpiry.mockReset(); });

describe("ExpirationDialog", () => {
  it("says there is none, and saves the end of the chosen day in Manila", async () => {
    const user = userEvent.setup();
    setExpiry.mockResolvedValue({ expiresAt: "2099-10-20T15:59:59.000Z" });
    const onSaved = openDialog(null);
    expect(screen.getByText(/has no expiration/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Remove expiration/ })).toBeNull();

    await user.type(screen.getByLabelText("Signing closes at the end of"), "2099-10-20");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => { expect(onSaved).toHaveBeenCalledWith("2099-10-20T15:59:59.000Z"); });
    expect(setExpiry).toHaveBeenCalledWith("ws_1", "sr_1", "2099-10-20T15:59:59.000Z");
  });

  it("refuses a day that has already ended, without calling the server", async () => {
    const user = userEvent.setup();
    openDialog(null);
    await user.type(screen.getByLabelText("Signing closes at the end of"), "2020-01-01");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert").textContent).toContain("today or a later date");
    expect(setExpiry).not.toHaveBeenCalled();
  });

  it("shows the current date and removes it", async () => {
    const user = userEvent.setup();
    setExpiry.mockResolvedValue({ expiresAt: null });
    const onSaved = openDialog("2099-10-20T15:59:59.000Z");
    expect(screen.getByText("October 20, 2099")).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>("Signing closes at the end of").value).toBe("2099-10-20");

    await user.click(screen.getByRole("button", { name: /Remove expiration/ }));
    await waitFor(() => { expect(onSaved).toHaveBeenCalledWith(null); });
    expect(setExpiry).toHaveBeenCalledWith("ws_1", "sr_1", null);
  });

  it("stays open and says so when the save fails", async () => {
    const user = userEvent.setup();
    setExpiry.mockRejectedValue(new Error("offline"));
    const onSaved = openDialog(null);
    await user.type(screen.getByLabelText("Signing closes at the end of"), "2099-10-20");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not be saved");
    expect(onSaved).not.toHaveBeenCalled();
  });
});
