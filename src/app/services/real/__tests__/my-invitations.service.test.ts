import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

import {
  myInvitationsService, invitationErrorMessage, invitationLogoUrl, invitationRoleLabel, invitationsPath, isInvitationExpired,
  type MyInvitation,
} from "../my-invitations.service";
import { ApiError } from "../../api-client";
import { mockSharingApi, reply } from "../../../components/document-sharing/__tests__/sharing-test-api";
import { invitation } from "../../../pages/platform/invitations/__tests__/invitation-fixtures";

beforeEach(() => { vi.unstubAllGlobals(); });

describe("my invitations service", () => {
  it("lists by status and posts accept / decline / withdraw-decline", async () => {
    const api = mockSharingApi({
      "GET /me/invitations?status=declined": { items: [invitation({ status: "declined" })] },
      "POST /me/invitations/inv_1/accept": { status: "accepted" },
      "POST /me/invitations/inv_1/decline": { status: "declined" },
      "POST /me/invitations/inv_1/withdraw-decline": reply(200, { status: "pending" }),
    });
    const items = await myInvitationsService.list("declined");
    expect(items[0]?.status).toBe("declined");
    await myInvitationsService.accept("inv_1");
    await myInvitationsService.decline("inv_1", "  Not for me  ");
    await myInvitationsService.withdrawDecline("inv_1");
    expect(api.calls.map(c => `${c.method} ${c.path}`)).toEqual([
      "GET /me/invitations?status=declined",
      "POST /me/invitations/inv_1/accept",
      "POST /me/invitations/inv_1/decline",
      "POST /me/invitations/inv_1/withdraw-decline",
    ]);
    expect(api.calls[2]?.body).toEqual({ reason: "Not for me" });
  });

  it("builds links, labels and logo URLs", () => {
    expect(invitationsPath()).toBe("/app/invitations");
    expect(invitationsPath("declined", "inv_9")).toBe("/app/invitations?status=declined&invitation=inv_9");
    expect(invitationRoleLabel("template_administrator")).toBe("Template Administrator");
    expect(invitationRoleLabel("member")).toBe("New Comer");
    expect(invitationRoleLabel("custom_role")).toBe("Custom Role");
    const item = invitation() as unknown as MyInvitation;
    expect(invitationLogoUrl(item)).toBe("http://api.test/me/invitations/inv_1/branding/logo?v=v2");
    expect(invitationLogoUrl({ ...item, branding: null })).toBeNull();
    expect(isInvitationExpired({ ...item, expiresAt: 1 })).toBe(true);
    expect(isInvitationExpired({ ...item, expiresAt: null })).toBe(false);
  });

  it("turns the backend's codes into sentences", () => {
    const err = (status: number, code?: string) => new ApiError(status, code ? { code, message: code } : undefined, "x");
    expect(invitationErrorMessage(err(403, "account_email_unverified"), "accept")).toMatch(/Confirm your account's email address/);
    expect(invitationErrorMessage(err(404), "accept")).toMatch(/no longer available/);
    expect(invitationErrorMessage(err(409), "withdraw")).toMatch(/can no longer be reopened/);
    expect(invitationErrorMessage(err(409), "accept")).toMatch(/changed in the meantime/);
    expect(invitationErrorMessage(err(422, "validation_failed"), "decline")).toBe("Enter a reason between 1 and 500 characters.");
    expect(invitationErrorMessage(new Error("boom"), "load")).toBe("Something went wrong. Please try again.");
  });
});
