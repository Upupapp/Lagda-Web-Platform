// What Send puts on the wire for the completed document.
//
// The server emails every participant the completed document unless the
// request says `shareFinalCopy: false`. Absent means yes, and the value joins
// the server's idempotency fingerprint only when it is false — so the default
// send must stay an empty body, exactly as it was before the sender could
// choose.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("../../api-client", async (original) => ({
  ...(await original<typeof import("../../api-client")>()),
  apiRequest,
}));

import { realSigningRequestService } from "../signing-request.service";

beforeEach(() => {
  apiRequest.mockReset().mockResolvedValue({ signingRequestId: "sr_1", state: "sent" });
});

const sentBody = (): unknown => (apiRequest.mock.calls[0]?.[1] as { body?: unknown } | undefined)?.body;

describe("send and the completed document", () => {
  it("asks the server to withhold the copy only when told to", async () => {
    await realSigningRequestService.send("ws_1", "sr_1", "key_1", { shareFinalCopy: false });
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest.mock.calls[0]?.[0]).toBe("/workspaces/ws_1/signing-requests/sr_1/send");
    expect(sentBody()).toEqual({ shareFinalCopy: false });
  });

  it.each([
    ["no options", undefined],
    ["an empty choice", {}],
    ["an explicit yes", { shareFinalCopy: true }],
  ])("sends an empty body with %s, leaving the server's default", async (_name, options) => {
    await realSigningRequestService.send("ws_1", "sr_1", "key_1", options);
    expect(sentBody()).toEqual({});
  });
});

describe("send and the reminders (111)", () => {
  it("passes reminders only when given, beside a withheld copy", async () => {
    await realSigningRequestService.send("ws_1", "sr_1", "key_1", {
      shareFinalCopy: false, reminders: { enabled: true, firstAfterDays: 2, everyDays: 5 },
    });
    expect(sentBody()).toEqual({ shareFinalCopy: false, reminders: { enabled: true, firstAfterDays: 2, everyDays: 5 } });
  });
});

describe("the request's progress calls", () => {
  const call = () => apiRequest.mock.calls[0] as [string, { method?: string; body?: unknown }];

  it("retries a stopped finalization with an empty POST", async () => {
    await realSigningRequestService.retryCompletion("ws_1", "sr_1");
    expect(call()[0]).toBe("/workspaces/ws_1/signing-requests/sr_1/completion/retry");
    expect(call()[1]).toMatchObject({ method: "POST", body: {} });
  });

  it("changes reminders with PUT", async () => {
    await realSigningRequestService.setReminders("ws_1", "sr_1", { enabled: false });
    expect(call()[0]).toBe("/workspaces/ws_1/signing-requests/sr_1/reminders");
    expect(call()[1]).toMatchObject({ method: "PUT", body: { enabled: false } });
  });

  it("reminds one participant with an empty POST", async () => {
    await realSigningRequestService.remind("ws_1", "sr_1", "srr_1");
    expect(call()[0]).toBe("/workspaces/ws_1/signing-requests/sr_1/recipients/srr_1/remind");
    expect(call()[1]).toMatchObject({ method: "POST", body: {} });
  });
});
