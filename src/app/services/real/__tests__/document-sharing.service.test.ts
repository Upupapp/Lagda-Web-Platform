// The 087 sharing client: paths, bodies, the logo URL and the error wording.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../backend-flag", () => ({ API_BASE_URL: "http://api.test", USE_REAL_BACKEND: true }));

import {
  documentSharingService as svc, sharingErrorMessage, sharedLogoUrl, sharedByMePath, sharedWithMePath,
} from "../document-sharing.service";
import { ApiError } from "../../api-client";
import { mockSharingApi, reply, sharedDoc } from "../../../components/document-sharing/__tests__/sharing-test-api";

beforeEach(() => { vi.unstubAllGlobals(); });

describe("documentSharingService", () => {
  it("speaks the owner, recipient and requester routes", async () => {
    const api = mockSharingApi({
      "GET /workspaces/ws%201/documents/doc_1/shares?status=accepted": { document: {}, shares: [] },
      "POST /workspaces/ws%201/documents/doc_1/shares": reply(201, {}),
      "PATCH /workspaces/ws%201/documents/doc_1/shares/shr_1": { share: {}, previous: null },
      "DELETE /workspaces/ws%201/documents/doc_1/shares/shr_1": {},
      "GET /workspaces/ws%201/access-requests?status=pending": { items: [] },
      "POST /workspaces/ws%201/access-requests/req_1/withdraw-rejection": {},
      "DELETE /workspaces/ws%201/access-requests/req_1": reply(204),
      "GET /workspaces/ws%201/shared-by-me?scope=workspace": { items: [] },
      "GET /me/shared-documents?status=rejected": { items: [] },
      "POST /me/shared-documents/shd_1/accept": {},
      "POST /me/shared-documents/shd_1/remove-access": reply(204),
      "DELETE /me/shared-documents/shd_1": reply(204),
      "GET /me/shared-documents/shd_1/details": { details: { participants: [] } },
      "GET /verifications/LAGDA-1/my-access": { relation: "none" },
      "POST /verifications/LAGDA-1/access-requests": reply(201, {}),
    });
    await svc.listShares("ws 1", "doc_1", "accepted");
    await svc.createShare("ws 1", "doc_1", { email: "  a@b.co ", fullName: "  " });
    await svc.updateShare("ws 1", "doc_1", "shr_1", { fullName: "" });
    await svc.removeShare("ws 1", "doc_1", "shr_1");
    await svc.listAccessRequests("ws 1", "pending");
    await svc.decideAccessRequest("ws 1", "req_1", "withdraw-rejection");
    await svc.deleteAccessRequest("ws 1", "req_1");
    await svc.sharedByMe("ws 1", "workspace");
    await svc.sharedWithMe("rejected");
    await svc.actOnShared("shd_1", "accept");
    await svc.removeMyAccess("shd_1");
    await svc.deleteShared("shd_1");
    expect(await svc.sharedDetails("shd_1")).toEqual({ participants: [] });
    expect(await svc.myAccess("LAGDA-1")).toEqual({ relation: "none" });
    await svc.requestAccess("LAGDA-1", "   ");
    await svc.requestAccess("LAGDA-1", " Please ");

    expect(api.calls.map(c => c.body)).toEqual([
      undefined, { email: "a@b.co" }, { fullName: null }, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, {}, { note: "Please" },
    ]);
    expect(api.fetchMock.mock.calls.every(([, init]) => (init as RequestInit).credentials === "include")).toBe(true);
  });

  it("fetches the signed PDF as a blob and turns a failure into an ApiError", async () => {
    mockSharingApi({ "GET /me/shared-documents/shd_1/document": reply(404, { error: { code: "resource_not_found", message: "x" } }) });
    await expect(svc.sharedDocumentFile("shd_1")).rejects.toMatchObject({ status: 404 });
  });

  it("prefixes the logo route with the API base", () => {
    expect(sharedLogoUrl(sharedDoc() as never)).toBe("http://api.test/me/shared-documents/shd_1/branding/logo?v=v3");
    expect(sharedLogoUrl(sharedDoc({ branding: { displayName: "X", primaryColor: null, logo: null } }) as never)).toBeNull();
  });

  it("knows where each section lives", () => {
    expect(sharedByMePath("pending")).toBe("/app/shared-documents/by-me?section=pending");
    expect(sharedWithMePath()).toBe("/app/shared-documents/with-me");
  });
});

describe("sharingErrorMessage", () => {
  const err = (status: number, code?: string) => new ApiError(status, code ? { code, message: code } : undefined, "x");
  it.each([
    [err(409, "document_share_exists"), "share", /already shared with that email/],
    [err(409, "document_share_recipient_has_access"), "share", /already has access/],
    [err(409, "sharing_state_conflict"), "decide", /changed in the meantime/],
    [err(409, "document_not_completed"), "share", /Only a completed document/],
    [err(409, "document_access_already_granted"), "request", /already have access/],
    [err(409, "document_access_already_pending"), "request", /already asked for access/],
    [err(409, "document_access_already_rejected"), "request", /was not approved/],
    [err(403, "account_email_unverified"), "request", /verified email address/],
    [err(404), "request", /No completed document was found/],
    [err(404), "respond", /no longer available/],
    [err(422, "validation_failed"), "request", /500 characters/],
    [err(422, "validation_failed"), "share", /valid email address/],
    [err(0), "load", /couldn't reach LAGDA/],
    [err(401), "load", /session has ended/],
    [new Error("boom"), "load", /Something went wrong/],
  ] as const)("%#", (error, op, text) => {
    expect(sharingErrorMessage(error, op)).toMatch(text);
  });
});
