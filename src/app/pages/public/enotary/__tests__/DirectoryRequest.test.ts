// The static Notary Directory (public/enotary-directory/js/app.js) after the
// identity step: where LAGDA takes requests to notaries it shows "Request this
// notary" and sends the person to the request's page; where that answers 404 the
// waitlist step is exactly what it was.
//
// The page is plain JavaScript with no build step, so it is run here as the
// browser runs it: the real index.html, lawyers.js and app.js in jsdom, with
// the API stubbed.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../../../../../public/enotary-directory");
const read = (name: string) => readFileSync(resolve(ROOT, name), "utf8");
const LAWYERS_JS = read("js/lawyers.js");
const APP_JS = read("js/app.js");
const BODY = /<body[^>]*>([\s\S]*)<\/body>/.exec(read("index.html"))?.[1]?.replace(/<script[\s\S]*?<\/script>/g, "") ?? "";
const ID = "aiyana-yasmin-a-cruz";

interface Answer { status: number; body: unknown }
let answers: Record<string, Answer | ((body: unknown) => Answer)>;
const asked: { method: string; path: string; body: unknown }[] = [];
let assigned: string[];

const json = (a: Answer) => new Response(JSON.stringify(a.body), { status: a.status, headers: { "content-type": "application/json" } });
const err = (status: number, code: string, more: Record<string, unknown> = {}): Answer => ({ status, body: { error: { code, message: code, ...more } } });
const IDENTITY: Answer = { status: 200, body: { available: true, status: "verified", verifiedName: "Ben Lim", pendingReview: false } };

async function pass(ms = 0) { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); }
const view = () => (document.getElementById("view")?.textContent ?? "").replace(/\s+/g, " ");
const click = (selector: string) => { (document.querySelector(selector) as HTMLElement).click(); };

type Listener = [EventTarget, string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined];
const listeners: Listener[] = [];
for (const target of [document, window] as EventTarget[]) {
  const add = target.addEventListener.bind(target);
  target.addEventListener = (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
    if (listener !== null) listeners.push([target, type, listener, options]);
    add(type, listener, options);
  };
}

async function openDirectory() {
  document.body.innerHTML = BODY;
  history.replaceState(null, "", `/enotary-directory/?select=${ID}`);
  // The page is a plain script; run it as the browser does.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  new Function(LAWYERS_JS).call(window);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  new Function(APP_JS).call(window);
  await pass(20);
}

beforeEach(() => {
  asked.length = 0;
  assigned = [];
  sessionStorage.clear();
  answers = {
    "GET /me": { status: 200, body: { email: "ben@example.ph", profile: { fullName: "Ben Lim" } } },
    "GET /me/identity": IDENTITY,
  };
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const path = url.replace(/^\/api/, "");
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as unknown : undefined;
    asked.push({ method, path, body });
    const hit = answers[`${method} ${path}`];
    const answer = hit === undefined ? err(404, "resource_not_found") : typeof hit === "function" ? hit(body) : hit;
    return Promise.resolve(json(answer));
  }));
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign: (url: string) => { assigned.push(url); }, replace: vi.fn(), pathname: "/enotary-directory/", search: `?select=${ID}`, hash: "", protocol: "http:", href: "http://localhost/enotary-directory/" },
  });
});

afterEach(() => {
  // The page registers listeners on document and window each time it is run; drop them so the next run is alone.
  for (const [target, type, listener, options] of listeners) target.removeEventListener(type, listener, options);
  listeners.length = 0;
  document.body.innerHTML = "";
});

describe("after the identity step, where requests to notaries are offered", () => {
  beforeEach(() => { answers["GET /me/enotary/invitations"] = { status: 200, body: { invitations: [] } }; });

  it("asks LAGDA, and shows Request this notary instead of the waitlist", async () => {
    await openDirectory();
    expect(view()).toContain("Identity verified");
    click("[data-step=interest]");
    await pass(20);
    expect(asked.some(a => a.method === "GET" && a.path === "/me/enotary/invitations")).toBe(true);
    expect(view()).toContain("Request this notary");
    expect(view()).toContain("Aiyana Yasmin A. Cruz");
    expect(view()).toContain("The notary's email (optional)");
    expect(view()).not.toContain("Register your interest");
    expect(view()).toMatch(/not currently available: LAGDA eNotary is subject to Supreme Court accreditation/);
    expect(view()).not.toMatch(/instant|book a notary session|notarize online today/i);
  });

  it("creates the invitation and takes the person to its page", async () => {
    answers["POST /me/enotary/invitations"] = { status: 201, body: { invitation: { id: "eni_77" } } };
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    const email = document.getElementById("req-email") as HTMLInputElement;
    email.value = "atty@example.ph";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    click("[data-request]");
    await pass(20);
    expect(asked.find(a => a.method === "POST")?.body).toEqual({ directoryId: ID, notaryEmail: "atty@example.ph" });
    expect(assigned).toEqual(["/app/enotary/requests/eni_77"]);
  });

  it("sends no email when none was typed", async () => {
    answers["POST /me/enotary/invitations"] = { status: 201, body: { invitation: { id: "eni_1" } } };
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    click("[data-request]");
    await pass(20);
    expect(asked.find(a => a.method === "POST")?.body).toEqual({ directoryId: ID });
  });

  it("retries without the email when LAGDA already has one for the notary", async () => {
    const posts: unknown[] = [];
    answers["POST /me/enotary/invitations"] = body => {
      posts.push(body);
      return (body as { notaryEmail?: string }).notaryEmail ? err(422, "notary_email_not_allowed") : { status: 201, body: { invitation: { id: "eni_5" } } };
    };
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    const email = document.getElementById("req-email") as HTMLInputElement;
    email.value = "x@example.ph";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    click("[data-request]");
    await pass(30);
    expect(posts).toEqual([{ directoryId: ID, notaryEmail: "x@example.ph" }, { directoryId: ID }]);
    expect(assigned).toEqual(["/app/enotary/requests/eni_5"]);
  });

  it("goes to the existing request on 409, whether the answer carries its id or the list does", async () => {
    answers["POST /me/enotary/invitations"] = err(409, "enotary_invitation_open", { invitationId: "eni_9" });
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    click("[data-request]");
    await pass(20);
    expect(assigned).toEqual(["/app/enotary/requests/eni_9"]);
  });

  it("finds the existing request in the list when the 409 does not say which", async () => {
    answers["POST /me/enotary/invitations"] = err(409, "enotary_invitation_open");
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    answers["GET /me/enotary/invitations"] = { status: 200, body: { invitations: [{ id: "eni_3", status: "awaiting", notary: { directoryId: ID } }] } };
    click("[data-request]");
    await pass(40);
    expect(assigned).toEqual(["/app/enotary/requests/eni_3"]);
  });

  it("offers the existing open request instead of a second one", async () => {
    answers["GET /me/enotary/invitations"] = { status: 200, body: { invitations: [{ id: "eni_3", status: "claimed", notary: { directoryId: ID } }] } };
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    expect(view()).toContain("You already asked this notary");
    expect((document.querySelector("a.btn.big") as HTMLAnchorElement).getAttribute("href")).toBe("/app/enotary/requests/eni_3");
    expect(document.querySelector("[data-request]")).toBeNull();
  });

  it.each([
    [err(409, "enotary_invitation_limit"), /3 open requests/],
    [err(404, "enotary_notary_not_listed"), /not listed/],
    [err(429, "rate_limited"), /Too many tries/],
  ])("says what went wrong: %#", async (answer, words) => {
    answers["POST /me/enotary/invitations"] = answer;
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    click("[data-request]");
    await pass(20);
    expect(view()).toMatch(words);
    expect(assigned).toEqual([]);
    expect(document.querySelector("[data-request]")).not.toBeNull();
  });

  it("sends a person whose identity LAGDA does not accept back to the identity step", async () => {
    answers["GET /me/enotary/invitations"] = err(403, "client_identity_required");
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    expect(view()).toContain("Verify your identity first");
  });
});

describe("where requests to notaries are not offered", () => {
  it("keeps the waitlist step as it was on a 404", async () => {
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    expect(view()).toContain("Register your interest");
    expect(view()).toContain("Online notarial sessions are not open yet");
    expect(view()).not.toContain("Request this notary");
    expect(document.querySelector("[data-register]")).not.toBeNull();
  });

  it("registers the interest through the public inquiry form, unchanged", async () => {
    answers["POST /public/inquiries"] = { status: 201, body: {} };
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    const box = document.getElementById("int-agree") as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    click("[data-register]");
    await pass(20);
    expect(asked.find(a => a.path === "/public/inquiries")?.body).toMatchObject({ kind: "waitlist", consent: true });
    expect(view()).toContain("Your interest is saved");
    expect(assigned).toEqual([]);
  });
});

describe("the menu", () => {
  it("points a signed-in person to their requests and to the notary application", async () => {
    answers["GET /me/enotary/invitations"] = { status: 200, body: { invitations: [] } };
    await openDirectory();
    click("#menu-btn");
    const hrefs = [...document.querySelectorAll("#menu a")].map(a => a.getAttribute("href"));
    expect(hrefs).toContain("/app/enotary/requests");
    expect(hrefs).toContain("/app/enotary/apply");
  });
});
