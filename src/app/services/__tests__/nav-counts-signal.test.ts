// The services that change what is waiting on an account tell the side
// panel's counts to re-read — after success and after failure alike.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

import { onNavCountsChanged } from "../nav-counts-signal";
import { documentSharingService } from "../real/document-sharing.service";
import { contactConnectionsService } from "../real/contact-connections.service";
import { myInvitationsService } from "../real/my-invitations.service";

let status = 200;
const heard = vi.fn();

beforeEach(() => {
  status = 200;
  heard.mockReset();
  vi.stubGlobal("BroadcastChannel", class { postMessage() {} close() {} onmessage = null; });
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(status >= 400 ? { error: { code: "conflict", message: "x" } } : {}), { status, headers: { "content-type": "application/json" } }))));
});

describe("actions that change the side panel's counts", () => {
  const ACTIONS: [string, () => Promise<unknown>][] = [
    ["accepting a shared document", () => documentSharingService.actOnShared("sh_1", "accept")],
    ["removing my access", () => { status = 204; return documentSharingService.removeMyAccess("sh_1"); }],
    ["deciding an access request", () => documentSharingService.decideAccessRequest("ws_1", "ar_1", "approve")],
    ["accepting a contact request", () => contactConnectionsService.accept("cc_1", "ws_1")],
    ["declining a contact request", () => { status = 204; return contactConnectionsService.decline("cc_1"); }],
    ["accepting an invitation", () => myInvitationsService.accept("inv_1")],
  ];
  for (const [label, act] of ACTIONS) {
    it(`${label} re-reads the counts`, async () => {
      const off = onNavCountsChanged(heard);
      await act();
      off();
      expect(heard).toHaveBeenCalledTimes(1);
    });
  }

  it("a failed action re-reads too (it may have been done elsewhere)", async () => {
    status = 409;
    const off = onNavCountsChanged(heard);
    await expect(documentSharingService.actOnShared("sh_1", "accept")).rejects.toBeTruthy();
    off();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("reading does not", async () => {
    const off = onNavCountsChanged(heard);
    await contactConnectionsService.list().catch(() => undefined);
    off();
    expect(heard).not.toHaveBeenCalled();
  });
});
