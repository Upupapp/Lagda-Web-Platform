// "Send again" keeps what the sender chose the first time.
//
// The new request used to go out with an empty body, so it always emailed
// participants the completed document and always had reminders on (3 days,
// then every 3). It now inherits both from the request it repeats, read from
// that request's progress view; where that cannot be read it is sent with the
// defaults, as before.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { replaceAll, list, create, markReadyToSend, send, signatures } = vi.hoisted(() => ({
  replaceAll: vi.fn(), list: vi.fn(), create: vi.fn(), markReadyToSend: vi.fn(), send: vi.fn(), signatures: vi.fn(),
}));
vi.mock("../recipient.service", () => ({ realRecipientService: { replaceAll, list } }));
vi.mock("../signing-request.service", () => ({ realSigningRequestService: { create, markReadyToSend, send, signatures } }));

import { resendSigningService } from "../resend-signing.service";
import { readPreviousChoices, sendOptionsFor } from "../resend-choices";
import { ApiError } from "../../api-client";

const view = (over: Record<string, unknown> = {}) => ({
  signingRequestId: "sr_1", state: "sent", signedCount: 0, requiredCount: 1, signatories: [],
  shareFinalCopy: true,
  reminders: { enabled: true, firstAfterDays: 3, everyDays: 3, maxAutomatic: 3, maxManualPerTurn: 10 },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  replaceAll.mockResolvedValue([]);
  create.mockResolvedValue({ signingRequestId: "sr_new", documentId: "doc", state: "draft" });
  markReadyToSend.mockResolvedValue({ state: "ready-to-send" });
  send.mockResolvedValue({ signingRequestId: "sr_new", state: "sent" });
});

describe("reading the request being repeated", () => {
  it("reads both choices from its progress view", async () => {
    signatures.mockResolvedValue(view({
      shareFinalCopy: false,
      reminders: { enabled: false, firstAfterDays: 5, everyDays: 7, maxAutomatic: 3, maxManualPerTurn: 10 },
    }));
    expect(await readPreviousChoices("ws", "sr_1")).toEqual({
      emailFinalCopy: false, reminders: { enabled: false, firstAfterDays: 5, everyDays: 7 },
    });
    expect(signatures).toHaveBeenCalledWith("ws", "sr_1");
  });

  it("gives nothing when it cannot be read, silently", async () => {
    signatures.mockRejectedValue(new ApiError(404, undefined, "x"));
    expect(await readPreviousChoices("ws", "sr_1")).toBeNull();
    signatures.mockRejectedValue(new ApiError(0, undefined, "offline"));
    expect(await readPreviousChoices("ws", "sr_1")).toBeNull();
  });

  it("gives nothing from an older server that reports neither", async () => {
    signatures.mockResolvedValue({ signingRequestId: "sr_1", state: "sent", signedCount: 0, requiredCount: 1, signatories: [] });
    expect(await readPreviousChoices("ws", "sr_1")).toBeNull();
  });

  it("reads the copy as on from a server that reports only reminders", async () => {
    signatures.mockResolvedValue(view({ shareFinalCopy: undefined }));
    expect((await readPreviousChoices("ws", "sr_1"))?.emailFinalCopy).toBe(true);
  });
});

describe("what is sent for those choices", () => {
  const defaults = { emailFinalCopy: true, reminders: { enabled: true, firstAfterDays: 3, everyDays: 3 } };

  it("is nothing for the defaults, and for no choices", () => {
    expect(sendOptionsFor(defaults)).toEqual({});
    expect(sendOptionsFor(undefined)).toEqual({});
  });

  it("is only what differs", () => {
    expect(sendOptionsFor({ ...defaults, emailFinalCopy: false })).toEqual({ shareFinalCopy: false });
    expect(sendOptionsFor({ ...defaults, reminders: { enabled: true, firstAfterDays: 2, everyDays: 3 } }))
      .toEqual({ reminders: { enabled: true, firstAfterDays: 2, everyDays: 3 } });
  });
});

describe("sending again", () => {
  const to = [{ name: "", email: "new@x.com" }];
  const lastSendOptions = () => send.mock.calls[0]!.slice(3);

  it("inherits the copy off and reminders off", async () => {
    await resendSigningService.resend("ws", "doc", to, {
      choices: { emailFinalCopy: false, reminders: { enabled: false, firstAfterDays: 3, everyDays: 3 } },
    });
    expect(lastSendOptions()).toEqual([{ shareFinalCopy: false, reminders: { enabled: false, firstAfterDays: 3, everyDays: 3 } }]);
  });

  it("inherits custom reminder days", async () => {
    await resendSigningService.resend("ws", "doc", to, {
      choices: { emailFinalCopy: true, reminders: { enabled: true, firstAfterDays: 1, everyDays: 10 } },
    });
    expect(lastSendOptions()).toEqual([{ reminders: { enabled: true, firstAfterDays: 1, everyDays: 10 } }]);
  });

  it("inherits for the same participants too", async () => {
    await resendSigningService.resendToSame("ws", "doc", [{
      recipientId: "r1", name: "Ana", email: "ana@x.com", organization: null, type: "signer",
      isRequired: true, orderIndex: 0, routingOrder: 1, sourceContactId: null, createdAt: "", updatedAt: "",
    }], { choices: { emailFinalCopy: false, reminders: { enabled: true, firstAfterDays: 3, everyDays: 3 } } });
    expect(lastSendOptions()).toEqual([{ shareFinalCopy: false }]);
  });

  it("sends the empty body for the defaults, as it always did", async () => {
    await resendSigningService.resend("ws", "doc", to, {
      choices: { emailFinalCopy: true, reminders: { enabled: true, firstAfterDays: 3, everyDays: 3 } },
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]).toHaveLength(3);
  });

  it("sends the empty body when the choices could not be read", async () => {
    await resendSigningService.resend("ws", "doc", to);
    expect(send.mock.calls[0]).toHaveLength(3);
  });
});
