// A re-send and the identity check.
//
// Who must pass "ID and face verification" is kept by the participant's
// email on the document. Replace the addresses and the requirement stays
// behind on the old ones. So the set for the NEW list is saved after the
// recipients are replaced and before the new request is created, and a set
// that cannot be saved stops the send.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { replaceAll, list, create, markReadyToSend, send, replaceRequirements, requirements, calls } = vi.hoisted(() => ({
  replaceAll: vi.fn(), list: vi.fn(), create: vi.fn(), markReadyToSend: vi.fn(), send: vi.fn(),
  replaceRequirements: vi.fn(), requirements: vi.fn(), calls: [] as string[],
}));
vi.mock("../recipient.service", () => ({ realRecipientService: { replaceAll, list } }));
vi.mock("../signing-request.service", () => ({ realSigningRequestService: { create, markReadyToSend, send } }));
vi.mock("../identity-check.service", async (original) => ({
  ...(await original<typeof import("../identity-check.service")>()),
  realIdentityCheckService: { replaceRequirements, requirements },
}));

import { resendSigningService, ResendIdentityNotSavedError } from "../resend-signing.service";
import { ApiError } from "../../api-client";
import type { RealRecipient } from "../recipient.service";

const person = (id: string, type: RealRecipient["type"] = "signer"): RealRecipient => ({
  recipientId: id, name: id, email: `${id}@x.com`, organization: null, type,
  isRequired: true, orderIndex: 0, routingOrder: 1, sourceContactId: null, createdAt: "", updatedAt: "",
});
const held = (email: string) => ({ email, requiredAt: "2026-10-08T01:00:00.000Z", waivedAt: null });

beforeEach(() => {
  calls.length = 0;
  replaceAll.mockImplementation(() => { calls.push("recipients"); return Promise.resolve([]); });
  replaceRequirements.mockImplementation((_ws: string, _doc: string, emails: string[]) => {
    calls.push(`identity:${emails.join(",")}`);
    return Promise.resolve(emails.map(held));
  });
  create.mockImplementation(() => {
    calls.push("create");
    // As the server answers a re-send: the document renamed, and its new title.
    return Promise.resolve({ signingRequestId: "sr_new", documentId: "doc", state: "draft", documentTitle: "Lease (2)", titleAdjusted: true });
  });
  markReadyToSend.mockImplementation(() => { calls.push("ready"); return Promise.resolve({ state: "ready-to-send" }); });
  send.mockImplementation(() => { calls.push("send"); return Promise.resolve({ signingRequestId: "sr_new", state: "sent" }); });
});

describe("re-sending to new emails", () => {
  it("saves the set for the new list after the recipients and before the request is created", async () => {
    await resendSigningService.resend("ws", "doc", [{ name: "", email: "New@x.com" }], { identity: { emails: ["New@x.com"] } });
    expect(calls).toEqual(["recipients", "identity:new@x.com", "create", "ready", "send"]);
    expect(replaceRequirements).toHaveBeenCalledWith("ws", "doc", ["new@x.com"]);
  });

  it("saves an EMPTY set too, which clears what was left on addresses no longer listed", async () => {
    await resendSigningService.resend("ws", "doc", [{ name: "", email: "new@x.com" }], { identity: { emails: [] } });
    expect(calls).toEqual(["recipients", "identity:", "create", "ready", "send"]);
  });

  it("does not send when the set cannot be saved", async () => {
    replaceRequirements.mockRejectedValue(new ApiError(0, undefined, "Network error"));
    const attempt = resendSigningService.resend("ws", "doc", [{ name: "", email: "new@x.com" }], { identity: { emails: ["new@x.com"] } });
    await expect(attempt).rejects.toBeInstanceOf(ResendIdentityNotSavedError);
    await expect(attempt).rejects.toThrow(
      "ID and face verification could not be saved, so nothing was sent. Your change could not be saved. Check your connection and try again.");
    expect(create).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("saves nothing where the check is not offered, exactly as before", async () => {
    await resendSigningService.resend("ws", "doc", [{ name: "", email: "new@x.com" }]);
    expect(replaceRequirements).not.toHaveBeenCalled();
    expect(calls).toEqual(["recipients", "create", "ready", "send"]);
  });

  it("reports the title the server gave the new request", async () => {
    const result = await resendSigningService.resend("ws", "doc", [{ name: "", email: "new@x.com" }]);
    expect(result).toEqual({ signingRequestId: "sr_new", sentTo: 1, documentTitle: "Lease (2)" });
  });

  it("reports no title from a server that does not say", async () => {
    create.mockResolvedValue({ signingRequestId: "sr_new", documentId: "doc", state: "ready-to-send" });
    const result = await resendSigningService.resend("ws", "doc", [{ name: "", email: "new@x.com" }]);
    expect(result.documentTitle).toBeNull();
  });
});

describe("re-sending to the same participants", () => {
  it("saves the set before the request is created", async () => {
    await resendSigningService.resendToSame("ws", "doc", [person("ana"), person("ben", "approver")], { identity: { emails: ["ana@x.com"] } });
    expect(calls).toEqual(["recipients", "identity:ana@x.com", "create", "ready", "send"]);
  });

  it("asks a waived participant again by taking them out and putting them back", async () => {
    await resendSigningService.resendToSame("ws", "doc", [person("ana"), person("ben")], {
      identity: { emails: ["ana@x.com", "ben@x.com"], askAgain: ["ben@x.com"] },
    });
    expect(calls).toEqual(["recipients", "identity:ana@x.com", "identity:ana@x.com,ben@x.com", "create", "ready", "send"]);
  });

  it("does not send when the set cannot be saved", async () => {
    replaceRequirements.mockRejectedValue(new ApiError(403, { code: "forbidden", message: "No." }, "Forbidden"));
    await expect(resendSigningService.resendToSame("ws", "doc", [person("ana")], { identity: { emails: ["ana@x.com"] } }))
      .rejects.toThrow("ID and face verification could not be saved, so nothing was sent. You do not have permission to change this.");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("a server that will not change the set once the last request has ended", () => {
  const closed = () => new ApiError(409, {
    code: "identity_requirement_not_editable",
    message: "Signing of this document has ended, so its identity checks can no longer be changed.",
  }, "Conflict");

  it("still sends when what it already holds for these people is what was asked for", async () => {
    replaceRequirements.mockRejectedValue(closed());
    // `old@x.com` is no longer on the document; what is left on it asks nothing of anyone.
    requirements.mockResolvedValue([held("ana@x.com"), held("old@x.com")]);
    await resendSigningService.resendToSame("ws", "doc", [person("ana"), person("ben")], { identity: { emails: ["ana@x.com"] } });
    expect(create).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not send when a check that was asked for would be missing", async () => {
    replaceRequirements.mockRejectedValue(closed());
    requirements.mockResolvedValue([held("old@x.com")]);
    await expect(resendSigningService.resend("ws", "doc", [{ name: "", email: "new@x.com" }], { identity: { emails: ["new@x.com"] } }))
      .rejects.toThrow("ID and face verification could not be saved, so nothing was sent. "
        + "Signing of this document has ended, so who must pass the check can no longer be changed.");
    expect(create).not.toHaveBeenCalled();
  });

  it("does not send when a check that was switched off would still apply", async () => {
    replaceRequirements.mockRejectedValue(closed());
    requirements.mockResolvedValue([held("ana@x.com")]);
    await expect(resendSigningService.resendToSame("ws", "doc", [person("ana")], { identity: { emails: [] } }))
      .rejects.toBeInstanceOf(ResendIdentityNotSavedError);
    expect(create).not.toHaveBeenCalled();
  });

  it("does not send when what it holds cannot be read", async () => {
    replaceRequirements.mockRejectedValue(closed());
    requirements.mockRejectedValue(new Error("offline"));
    await expect(resendSigningService.resendToSame("ws", "doc", [person("ana")], { identity: { emails: ["ana@x.com"] } }))
      .rejects.toBeInstanceOf(ResendIdentityNotSavedError);
    expect(create).not.toHaveBeenCalled();
  });
});
