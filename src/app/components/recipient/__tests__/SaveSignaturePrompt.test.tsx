import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const list = vi.fn();
const save = vi.fn();
vi.mock("../../../services/real/user-signatures.service", () => ({
  realUserSignatureService: { list: () => list(), save: (...a: unknown[]) => save(...a) },
}));

import { SaveSignaturePrompt, savableMark } from "../SaveSignaturePrompt";

const typed = { method: "typed" as const, text: "Maria Santos", styleIndex: 0, provenance: "typed-live" as const };
const drawn = { method: "drawn" as const, base64: "iVBORw0KGgo=", provenance: "drawn-live" as const };
const savedRow = (purpose: "signature" | "initials") => ({
  purpose, method: "typed", text: "M", styleIndex: 0, digest: "d", validatedAt: "x", updatedAt: "x",
});

beforeEach(() => { list.mockReset(); save.mockReset(); });

describe("SaveSignaturePrompt", () => {
  it("asks a linked signer with nothing saved", async () => {
    list.mockResolvedValue([]);
    render(<SaveSignaturePrompt eligible signature={typed} initials={null} />);
    expect(await screen.findByText("Save this signature as your default signature?")).toBeTruthy();
    expect(screen.getByText("Maria Santos")).toBeTruthy();
  });

  it("saves the mark without its capture provenance, then confirms", async () => {
    list.mockResolvedValue([]);
    save.mockResolvedValue({});
    render(<SaveSignaturePrompt eligible signature={typed} initials={null} />);
    await userEvent.click(await screen.findByRole("button", { name: "Yes, save it" }));
    expect(save).toHaveBeenCalledWith("signature", { method: "typed", text: "Maria Santos", styleIndex: 0 });
    expect(await screen.findByText(/Saved as your default signature/)).toBeTruthy();
  });

  it("also saves initials when those are missing too", async () => {
    list.mockResolvedValue([]);
    save.mockResolvedValue({});
    render(<SaveSignaturePrompt eligible signature={typed} initials={drawn} />);
    await userEvent.click(await screen.findByRole("button", { name: "Yes, save it" }));
    expect(save).toHaveBeenCalledWith("initials", { method: "drawn", base64: "iVBORw0KGgo=" });
    expect(await screen.findByText(/signature and initials/)).toBeTruthy();
  });

  it("leaves existing initials alone", async () => {
    list.mockResolvedValue([savedRow("initials")]);
    save.mockResolvedValue({});
    render(<SaveSignaturePrompt eligible signature={typed} initials={drawn} />);
    await userEvent.click(await screen.findByRole("button", { name: "Yes, save it" }));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does nothing on No", async () => {
    list.mockResolvedValue([]);
    render(<SaveSignaturePrompt eligible signature={typed} initials={null} />);
    await userEvent.click(await screen.findByRole("button", { name: "No, thanks" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText(/it wasn.t saved/)).toBeTruthy();
  });

  it("reports a failed save without undoing the signing, and lets them retry", async () => {
    list.mockResolvedValue([]);
    save.mockRejectedValueOnce(new Error("opaque")).mockResolvedValueOnce({});
    render(<SaveSignaturePrompt eligible signature={drawn} initials={null} />);
    await userEvent.click(await screen.findByRole("button", { name: "Yes, save it" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("still signed"));
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/Saved as your default signature/)).toBeTruthy();
  });

  it("stays hidden when a signature is already saved", async () => {
    list.mockResolvedValue([savedRow("signature")]);
    const { container } = render(<SaveSignaturePrompt eligible signature={typed} initials={null} />);
    await vi.waitFor(() => expect(list).toHaveBeenCalled());
    await Promise.resolve();
    expect(container.textContent).toBe("");
  });

  it("stays hidden without a session (the list call fails)", async () => {
    list.mockRejectedValue(new Error("401"));
    const { container } = render(<SaveSignaturePrompt eligible signature={typed} initials={null} />);
    await vi.waitFor(() => expect(list).toHaveBeenCalled());
    await Promise.resolve();
    expect(container.textContent).toBe("");
  });

  it("never checks for an unlinked signer or an applied saved mark", () => {
    const view = render(<SaveSignaturePrompt eligible={false} signature={typed} initials={null} />);
    expect(view.container.textContent).toBe("");
    view.unmount();
    const { container } = render(<SaveSignaturePrompt eligible signature={{ method: "saved" }} initials={null} />);
    expect(container.textContent).toBe("");
    expect(list).not.toHaveBeenCalled();
  });

  it("strips provenance and refuses a saved-reference mark", () => {
    expect(savableMark(drawn)).toEqual({ method: "drawn", base64: "iVBORw0KGgo=" });
    expect(savableMark({ method: "saved" })).toBeNull();
    expect(savableMark(null)).toBeNull();
  });
});
