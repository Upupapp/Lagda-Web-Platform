// The notary on-ramp's two service modules: what they ask, how a switched-off
// server reads (null, never an error) and how each refusal code is understood.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

import {
  realEnotaryInvitationsService as svc, errorCode, existingInvitationId, refusedState, describeInvitationError,
  invitationIsOpen,
} from "../enotary-invitations.service";
import { realNotaryApplicationsService as apps, missingFromRefusal, readFile } from "../notary-applications.service";
import { ApiError, resetHeldAnswers } from "../../api-client";

const calls: { url: string; method: string; body: unknown }[] = [];
let reply: (url: string) => { status: number; body: unknown };

beforeEach(() => {
  resetHeldAnswers();
  calls.length = 0;
  reply = () => ({ status: 200, body: {} });
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace("http://api.test", "");
    calls.push({ url, method: init?.method ?? "GET", body: typeof init?.body === "string" ? JSON.parse(init.body) as unknown : init?.body });
    const r = reply(url);
    return Promise.resolve(new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json" } }));
  }));
});

const refusal = (status: number, code: string, more: Record<string, unknown> = {}) =>
  ({ status, body: { error: { code, message: code, ...more } } });

describe("a switched-off server", () => {
  it.each([
    ["list", () => svc.list()], ["get", () => svc.get("eni_1")], ["desk", () => svc.desk()],
    ["application", () => apps.read()], ["admin list", () => apps.adminList()], ["admin detail", () => apps.adminGet("u1")],
  ])("answers null for %s", async (_name, call) => {
    reply = () => refusal(404, "resource_not_found");
    expect(await call()).toBeNull();
  });

  it("still throws a 404 that names an unlisted notary", async () => {
    reply = () => refusal(404, "enotary_notary_not_listed");
    await expect(svc.create("nobody")).rejects.toMatchObject({ status: 404 });
  });
});

describe("the client routes", () => {
  it("creates with the directory id, and sends an email only when there is one", async () => {
    reply = () => ({ status: 201, body: { invitation: { id: "eni_1" } } });
    expect((await svc.create("ana-cruz", "  atty@example.ph ")).id).toBe("eni_1");
    await svc.create("ana-cruz", "   ");
    await svc.create("ana-cruz");
    expect(calls.map(c => c.body)).toEqual([
      { directoryId: "ana-cruz", notaryEmail: "atty@example.ph" }, { directoryId: "ana-cruz" }, { directoryId: "ana-cruz" },
    ]);
    expect(calls[0]).toMatchObject({ url: "/me/enotary/invitations", method: "POST" });
  });

  it("reads the list, revokes, renews and sets the notary's email at the contract's paths", async () => {
    reply = () => ({ status: 200, body: { invitations: [{ id: "a" }], invitation: { id: "b" } } });
    expect(await svc.list()).toEqual([{ id: "a" }]);
    await svc.revoke("eni_1");
    await svc.renew("eni_1");
    await svc.setNotaryEmail("eni_1", " a@b.ph ");
    expect(calls.slice(1).map(c => `${c.method} ${c.url}`)).toEqual([
      "POST /me/enotary/invitations/eni_1/revoke", "POST /me/enotary/invitations/eni_1/renew",
      "PUT /me/enotary/invitations/eni_1/notary-email",
    ]);
    expect(calls[3]?.body).toEqual({ email: "a@b.ph" });
  });

  it("reads a single invitation whether or not it is wrapped", async () => {
    reply = () => ({ status: 200, body: { invitation: { id: "wrapped" } } });
    expect((await svc.get("x"))?.id).toBe("wrapped");
    reply = () => ({ status: 200, body: { id: "bare" } });
    expect((await svc.get("y"))?.id).toBe("bare");
  });

  it("finds the open invitation's id in whichever place the refusal puts it", () => {
    const make = (more: Record<string, unknown>) => new ApiError(409, { code: "enotary_invitation_open", message: "", ...more }, "");
    expect(existingInvitationId(make({ invitationId: "eni_9" }))).toBe("eni_9");
    expect(existingInvitationId(make({ details: [{ field: "invitationId", code: "x", message: "eni_8" }] }))).toBe("eni_8");
    expect(existingInvitationId(make({}))).toBeNull();
    expect(existingInvitationId(new Error("x"))).toBeNull();
  });
});

describe("the notary routes", () => {
  it("looks up by token, and claims with the token", async () => {
    reply = () => ({ status: 200, body: { state: "open", notaryName: "Ana Cruz" } });
    expect(await svc.lookup("a+b/c")).toEqual({ state: "open", notaryName: "Ana Cruz" });
    expect(calls[0]?.url).toBe("/public/enotary/invitations/lookup?token=a%2Bb%2Fc");
    reply = () => ({ status: 200, body: { invitation: { id: "eni_1" }, notary: { applicationStatus: "none", canAccept: false } } });
    expect((await svc.claim("tok")).notary.canAccept).toBe(false);
    expect(calls[1]).toMatchObject({ url: "/me/enotary/invitations/claim", method: "POST", body: { token: "tok" } });
  });

  it("accepts, and declines with a reason cut to 120 characters", async () => {
    await svc.accept("eni_1");
    await svc.decline("eni_1", "x".repeat(200));
    await svc.decline("eni_1", "  ");
    expect(calls.map(c => `${c.method} ${c.url}`)).toEqual([
      "POST /me/notary/requests/eni_1/accept", "POST /me/notary/requests/eni_1/decline", "POST /me/notary/requests/eni_1/decline",
    ]);
    expect((calls[1]?.body as { reason: string }).reason).toHaveLength(120);
    expect(calls[2]?.body).toEqual({});
  });

  it("reads the state a refused claim carries", () => {
    const make = (more: Record<string, unknown>) => new ApiError(410, { code: "enotary_invitation_unavailable", message: "", ...more }, "");
    expect(refusedState(make({ state: "expired" }))).toBe("expired");
    expect(refusedState(make({ details: [{ field: "state", code: "x", message: "used" }] }))).toBe("used");
    expect(refusedState(make({ state: "weird" }))).toBeNull();
    expect(errorCode(make({}))).toBe("enotary_invitation_unavailable");
  });
});

describe("plain words for each refusal", () => {
  it.each([
    [0, "", /Could not reach/], [401, "", /session has ended/], [429, "", /Too many/],
    [403, "client_identity_required", /Verify your identity/], [404, "enotary_notary_not_listed", /not listed/],
    [409, "enotary_invitation_open", /already have an open/], [409, "enotary_invitation_limit", /3 open/],
    [422, "notary_email_not_allowed", /already has a way to reach/], [422, "validation_error", /email address was not accepted/],
    [500, "", /could not be done/],
  ])("%s %s", (status, code, words) => {
    expect(describeInvitationError(new ApiError(status, code === "" ? undefined : { code, message: "" }, "x"))).toMatch(words);
  });

  it("knows which statuses are still open", () => {
    expect(["awaiting", "claimed"].every(s => invitationIsOpen(s as "awaiting"))).toBe(true);
    expect(["accepted", "declined", "expired", "revoked"].some(s => invitationIsOpen(s as "awaiting"))).toBe(false);
  });
});

describe("the application routes", () => {
  it("reads an application loosely and files under either spelling", async () => {
    reply = () => ({ status: 200, body: {
      application: { status: "draft", office: "Cruz Law", listingConsent: true },
      files: [{ fileId: "f1", kind: "roll", filename: "roll.pdf", mediaType: "application/pdf", sizeBytes: 5, scanStatus: "clean" }],
      agreement: { version: "1", text: "Terms" },
    } });
    const view = await apps.read();
    expect(view?.application).toMatchObject({ status: "draft", office: "Cruz Law", listingConsent: true, city: "" });
    expect(view?.files[0]).toMatchObject({ id: "f1", scanState: "clean" });
    expect(view?.agreement).toEqual({ version: "1", text: "Terms" });
    expect(readFile({ id: "z" }).scanState).toBe("pending");
  });

  it("reads no application as null inside a view", async () => {
    reply = () => ({ status: 200, body: { application: null, files: [], agreement: { version: "1", text: "T" } } });
    expect((await apps.read())?.application).toBeNull();
  });

  it("saves, submits and withdraws at the contract's paths", async () => {
    await apps.save({ office: "X" });
    await apps.submit();
    await apps.withdraw();
    await apps.removeFile("f 1");
    expect(calls.map(c => `${c.method} ${c.url}`)).toEqual([
      "PUT /me/notary/application", "POST /me/notary/application/submit", "POST /me/notary/application/withdraw",
      "DELETE /me/notary/application/files/f%201",
    ]);
  });

  it("uploads one file with its kind as multipart", async () => {
    reply = () => ({ status: 201, body: { file: { id: "f2", kind: "photo", filename: "me.png", scanState: "pending" } } });
    const file = await apps.upload("photo", new File(["x"], "me.png", { type: "image/png" }));
    expect(file).toMatchObject({ id: "f2", kind: "photo" });
    const form = calls[0]?.body as FormData;
    expect(form.get("kind")).toBe("photo");
    expect((form.get("file") as File).name).toBe("me.png");
    expect(calls[0]?.url).toBe("/me/notary/application/files");
  });

  it("reads the missing list of an incomplete submission in either shape", () => {
    const make = (more: Record<string, unknown>) => new ApiError(409, { code: "application_incomplete", message: "", ...more }, "");
    expect(missingFromRefusal(make({ missing: ["roll file", "phone"] }))).toEqual(["roll file", "phone"]);
    expect(missingFromRefusal(make({ details: [{ field: "phone", code: "x", message: "" }] }))).toEqual(["phone"]);
    expect(missingFromRefusal(make({}))).toEqual([]);
    expect(missingFromRefusal(new Error("x"))).toEqual([]);
  });

  it("asks the admin routes with their status filter and decision bodies", async () => {
    reply = () => ({ status: 200, body: { applications: [{ userId: "u1", legalName: "Ana Cruz", status: "submitted" }] } });
    expect((await apps.adminList("submitted"))?.[0]).toMatchObject({ userId: "u1", legalName: "Ana Cruz" });
    expect(calls[0]?.url).toBe("/admin/notary-applications?status=submitted");
    await apps.approve("u1", { directoryId: "ana-cruz", note: " ok " });
    await apps.approve("u1", {});
    await apps.reject("u1", "r".repeat(500));
    expect(calls[1]?.body).toEqual({ directoryId: "ana-cruz", note: "ok" });
    expect(calls[2]?.body).toEqual({});
    expect((calls[3]?.body as { reason: string }).reason).toHaveLength(400);
  });

  it("reads an admin detail with the name comparison", async () => {
    reply = () => ({ status: 200, body: {
      application: { status: "submitted", legalName: "Ana M. Cruz" }, files: [],
      account: { verifiedName: "Ana Maria Cruz", nameMatch: "close" }, invitations: [{ id: "eni_1", status: "claimed", clientName: "Ben" }],
    } });
    const detail = await apps.adminGet("u1");
    expect(detail?.account).toMatchObject({ verifiedName: "Ana Maria Cruz", nameMatch: "close" });
    expect(detail?.invitations).toHaveLength(1);
    expect(apps.adminFileUrl("u 1", "f1")).toBe("/admin/notary-applications/u%201/files/f1");
  });
});
