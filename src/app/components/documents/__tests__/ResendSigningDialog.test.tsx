// Send again, two ways: new emails, or the same participants with anyone
// unticked left out.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const svc = vi.hoisted(() => ({
  currentParticipants: vi.fn(),
  resendToSame: vi.fn(),
  resend: vi.fn(),
}));
vi.mock("../../../services/real/resend-signing.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/resend-signing.service")>()),
  resendSigningService: svc,
}));

import { ResendSigningDialog } from "../ResendSigningDialog";

const person = (id: string, name: string, type: string, routingOrder = 1) => ({
  recipientId: id, name, email: `${id}@x.com`, organization: null, type,
  isRequired: true, orderIndex: 0, routingOrder, sourceContactId: null,
  createdAt: "", updatedAt: "",
});

function open(onSent = vi.fn()) {
  render(<ResendSigningDialog workspaceId="ws" documentId="doc" documentTitle="Lease"
    onClose={vi.fn()} onSent={onSent} />);
  return onSent;
}

beforeEach(() => {
  svc.currentParticipants.mockResolvedValue([
    person("ana", "Ana", "signer", 1), person("ben", "Ben", "approver", 2), person("val", "Val", "viewer", 2),
  ]);
  svc.resendToSame.mockResolvedValue({ signingRequestId: "sr_new", sentTo: 2 });
});

describe("ResendSigningDialog", () => {
  it("offers both options", () => {
    open();
    expect(screen.getByRole("tab", { name: /Send to new emails/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Re-send to same participants/ })).toBeTruthy();
  });

  it("lists the same participants, all ticked, with roles and steps", async () => {
    open();
    await userEvent.click(screen.getByRole("tab", { name: /Re-send to same participants/ }));
    expect(await screen.findByText("Ana")).toBeTruthy();
    expect(screen.getByText("Approver")).toBeTruthy();
    expect(screen.getAllByText(/Step \d/)).toHaveLength(3);
    for (const box of screen.getAllByRole("checkbox")) expect((box as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("3 of 3 will receive it.")).toBeTruthy();
  });

  it("sends only to those still ticked", async () => {
    const onSent = open();
    await userEvent.click(screen.getByRole("tab", { name: /Re-send to same participants/ }));
    await userEvent.click(await screen.findByRole("checkbox", { name: "Include Val" }));
    await userEvent.click(screen.getByRole("button", { name: /Send links/ }));
    await vi.waitFor(() => { expect(onSent).toHaveBeenCalledWith("sr_new", 2); });
    const kept = svc.resendToSame.mock.calls[0]![2] as { recipientId: string }[];
    expect(kept.map(p => p.recipientId)).toEqual(["ana", "ben"]);
  });

  it("refuses to send when nobody left can act", async () => {
    open();
    await userEvent.click(screen.getByRole("tab", { name: /Re-send to same participants/ }));
    await userEvent.click(await screen.findByRole("checkbox", { name: "Include Ana" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Include Ben" }));
    expect(screen.getByText(/Keep at least one person who signs/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Send links/ }).hasAttribute("disabled")).toBe(true);
  });
});
