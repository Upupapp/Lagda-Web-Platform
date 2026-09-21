// The account-binding handoff, client side.
//
// The property worth testing is which CLIENT each half uses. Minting is a
// recipient-realm request and claiming is a workspace-realm request; they
// carry different cookies and different CSRF tokens, and sending either
// through the other's client would not merely be untidy — it would fail, for
// exactly the reason the two realms are kept apart.

import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
const recipientApiRequest = vi.fn();

vi.mock("../../api-client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args) as unknown,
}));
vi.mock("../../recipient-api-client", () => ({
  recipientApiRequest: (...args: unknown[]) => recipientApiRequest(...args) as unknown,
}));

const PASSWORD = "correct horse battery staple";

const { realSigningAccountLinkService } =
  await import("../signing-account-link.service");

beforeEach(() => {
  apiRequest.mockReset();
  recipientApiRequest.mockReset();
});

describe("minting", () => {
  it("goes through the RECIPIENT client", async () => {
    recipientApiRequest.mockResolvedValue({ code: "abc", expiresAt: "2026-01-01T00:02:00Z" });

    await realSigningAccountLinkService.mintHandoff();

    expect(recipientApiRequest).toHaveBeenCalledWith(
      "/signing/ceremony/link-intent", { method: "POST" });
    // The workspace client must not be involved: it carries a different
    // cookie and a CSRF token derived under a different domain.
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("sends no body — there is nothing a caller could usefully say", async () => {
    recipientApiRequest.mockResolvedValue({ code: "abc", expiresAt: "x" });
    await realSigningAccountLinkService.mintHandoff();
    const [, init] = recipientApiRequest.mock.calls[0] as [string, Record<string, unknown>];
    expect(init).not.toHaveProperty("body");
  });
});

describe("claiming", () => {
  it("goes through the WORKSPACE client", async () => {
    apiRequest.mockResolvedValue({ signingRequestId: "sr_1", recipientId: "rcp_1" });

    await realSigningAccountLinkService.claimHandoff("abc", PASSWORD);

    expect(apiRequest).toHaveBeenCalledWith(
      "/me/signing-links",
      { method: "POST", body: { code: "abc", currentPassword: PASSWORD } });
    expect(recipientApiRequest).not.toHaveBeenCalled();
  });

  it("sends the code and the password, and nothing else", async () => {
    // The contract is closed; an extra property is a 400. It carries no
    // address and no id — the server resolves both from the code, so a client
    // cannot steer which recipient it is claiming.
    apiRequest.mockResolvedValue({ signingRequestId: "sr_1", recipientId: "rcp_1" });
    await realSigningAccountLinkService.claimHandoff("abc", PASSWORD);
    const [, init] = apiRequest.mock.calls[0] as [string, { body: unknown }];
    expect(init.body).toEqual({ code: "abc", currentPassword: PASSWORD });
  });

  it("lets the caller see a refusal", async () => {
    apiRequest.mockRejectedValue(new Error("nope"));
    await expect(realSigningAccountLinkService.claimHandoff("abc", PASSWORD)).rejects.toThrow();
  });
});
