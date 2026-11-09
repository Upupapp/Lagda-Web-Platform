// The static Notary Directory (public/enotary-directory/js/app.js) after the
// identity step: where LAGDA takes requests to notaries it shows "Request this
// notary" and sends the person to the request's page; where that answers 404 the
// waitlist step is exactly what it was. A request is "right now" or a booked
// time (130), and only while the notary is online (Mon–Fri, 8 AM–5 PM, Manila).
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

/** What a client says before a request is sent: the act, the kind of document, and where they will be. */
async function fillDetails(over: { kind?: string } = {}) {
  const set = (id: string, value: string) => {
    const field = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
    field.value = value;
    field.dispatchEvent(new Event(field.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  };
  set("rd-act", "acknowledgment");
  await pass(5);
  set("rd-kind", over.kind ?? "affidavit");
  await pass(5);
  set("rd-city", "Naga City");
  set("rd-province", "Camarines Sur");
}
const DETAILS = { actWanted: "acknowledgment", documentKind: "affidavit", inPhilippines: true, city: "Naga City", province: "Camarines Sur", usedAbroad: false };
const NOW = { kind: "now" };
/** Thursday, November 5, 2026, 10:00 AM in Manila: the notary is online. */
const OPEN_HOURS = new Date("2026-11-05T02:00:00.000Z");
/** Saturday, November 7, 2026, 10:00 AM in Manila: offline. */
const WEEKEND = new Date("2026-11-07T02:00:00.000Z");

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
  // Only the date is faked: the page's own timers run as they do in a browser.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(OPEN_HOURS);
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
  vi.useRealTimers();
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
    await fillDetails();
    click("[data-request]");
    await pass(20);
    expect(asked.find(a => a.method === "POST")?.body).toEqual({ directoryId: ID, notaryEmail: "atty@example.ph", details: DETAILS, booking: NOW });
    expect(assigned).toEqual(["/app/enotary/requests/eni_77"]);
  });

  it("asks what is needed first: no choice of being abroad, a will cannot be chosen, a deed carries its notice, and the request waits", async () => {
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    expect(document.getElementById("rd-abroad")).toBeNull();
    expect(view()).not.toContain("Outside the Philippines");
    expect((document.querySelector("#rd-kind option[value=will]") as HTMLOptionElement).disabled).toBe(true);
    expect((document.querySelector("[data-request]") as HTMLButtonElement).disabled).toBe(true);
    await fillDetails({ kind: "deed_of_sale" });
    await pass(5);
    expect(view()).toContain("Registry of Deeds");
    expect((document.querySelector("[data-request]") as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows only the email field, and explains why, when the notary has no LAGDA account", async () => {
    answers[`GET /me/enotary/listings/${ID}/contact`] = { status: 200, body: { directoryId: ID, accountKnown: false, maskedEmail: null } };
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    expect(document.getElementById("req-email")).not.toBeNull();
    expect(view()).toContain("has no LAGDA account yet");
    expect(view()).not.toContain("has a LAGDA account");
  });

  it("says LAGDA will email a notary who has an account, shows only the masked address, and asks for no email", async () => {
    answers[`GET /me/enotary/listings/${ID}/contact`] = { status: 200, body: { directoryId: ID, accountKnown: true, maskedEmail: "a***@example.ph" } };
    answers["POST /me/enotary/invitations"] = { status: 201, body: { invitation: { id: "eni_9" } } };
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    expect(document.getElementById("req-email")).toBeNull();
    expect(view()).toContain("This notary has a LAGDA account.");
    expect(view()).toContain("a***@example.ph");
    expect(view()).toContain("limited number of requests a day");
    await fillDetails();
    click("[data-request]");
    await pass(20);
    expect(asked.find(a => a.method === "POST")?.body).toEqual({ directoryId: ID, details: DETAILS, booking: NOW });
    expect(assigned).toEqual(["/app/enotary/requests/eni_9"]);
  });

  it("keeps the email field when the lookup is not available (an older server)", async () => {
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    expect(document.getElementById("req-email")).not.toBeNull();
  });

  it("says plainly when the client has made the day's requests", async () => {
    answers["POST /me/enotary/invitations"] = err(409, "enotary_request_rate_limit");
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    await fillDetails();
    click("[data-request]");
    await pass(20);
    expect(view()).toContain("most requests allowed in a day");
    expect(assigned).toEqual([]);
  });

  it("sends no email when none was typed", async () => {
    answers["POST /me/enotary/invitations"] = { status: 201, body: { invitation: { id: "eni_1" } } };
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    await fillDetails();
    click("[data-request]");
    await pass(20);
    expect(asked.find(a => a.method === "POST")?.body).toEqual({ directoryId: ID, details: DETAILS, booking: NOW });
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
    await fillDetails();
    click("[data-request]");
    await pass(30);
    expect(posts).toEqual([{ directoryId: ID, notaryEmail: "x@example.ph", details: DETAILS, booking: NOW }, { directoryId: ID, details: DETAILS, booking: NOW }]);
    expect(assigned).toEqual(["/app/enotary/requests/eni_5"]);
  });

  it("goes to the existing request on 409, whether the answer carries its id or the list does", async () => {
    answers["POST /me/enotary/invitations"] = err(409, "enotary_invitation_open", { invitationId: "eni_9" });
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    await fillDetails();
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
    await fillDetails();
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
    await fillDetails();
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

describe("when: right now, or a booked time (130)", () => {
  const SLOTS = { slotMinutes: 30, timeZone: "Asia/Manila", slots: [
    { at: "2026-11-05T04:00:00.000Z", taken: false }, // Thu 12:00 PM
    { at: "2026-11-05T04:30:00.000Z", taken: true }, // Thu 12:30 PM, booked by someone else
    { at: "2026-11-06T01:00:00.000Z", taken: false }, // Fri 9:00 AM
  ] };
  const pickTime = (iso: string) => {
    const list = document.getElementById("rb-time") as HTMLSelectElement;
    list.value = iso;
    list.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const choose = (id: string) => {
    const radio = document.getElementById(id) as HTMLInputElement;
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
  };
  beforeEach(() => {
    answers["GET /me/enotary/invitations"] = { status: 200, body: { invitations: [] } };
    answers[`GET /me/enotary/listings/${ID}/slots`] = { status: 200, body: SLOTS };
  });

  it("asks for right now by default, and says the notary has 15 minutes to answer", async () => {
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    expect(view()).toContain("When do you need the notary?");
    expect((document.getElementById("rb-now") as HTMLInputElement).checked).toBe(true);
    expect(view()).toContain("15 minutes to answer");
    expect(document.querySelector("[data-request]")?.textContent).toBe("Request this notary now");
  });

  it("books a free time: the days and times come from LAGDA, a booked one cannot be chosen, and the time is sent", async () => {
    answers["POST /me/enotary/invitations"] = { status: 201, body: { invitation: { id: "eni_44" } } };
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    choose("rb-later");
    await pass(20);
    expect(asked.some(a => a.path === `/me/enotary/listings/${ID}/slots`)).toBe(true);
    expect((document.getElementById("rb-day") as HTMLSelectElement).selectedOptions[0]?.textContent).toBe("Thursday, November 5");
    const booked = document.querySelector('#rb-time option[value="2026-11-05T04:30:00.000Z"]') as HTMLOptionElement;
    expect(booked.disabled).toBe(true);
    expect(booked.textContent).toBe("12:30 PM to 1:00 PM (booked)");
    await fillDetails();
    // No time chosen yet: nothing can be sent.
    expect((document.querySelector("[data-request]") as HTMLButtonElement).disabled).toBe(true);
    pickTime("2026-11-05T04:00:00.000Z");
    await pass(5);
    expect(view()).toContain("Your booking: Thursday, November 5, 12:00 PM to 12:30 PM");
    expect(document.querySelector("[data-request]")?.textContent).toBe("Book this time");
    click("[data-request]");
    await pass(20);
    expect(asked.find(a => a.method === "POST")?.body).toEqual({ directoryId: ID, details: DETAILS, booking: { kind: "scheduled", at: "2026-11-05T04:00:00.000Z" } });
    expect(assigned).toEqual(["/app/enotary/requests/eni_44"]);
  });

  it("asks for another time when the one chosen was just booked", async () => {
    answers["POST /me/enotary/invitations"] = err(409, "enotary_slot_taken", { message: "That time was just booked. Choose another time." });
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    choose("rb-later");
    await pass(20);
    await fillDetails();
    pickTime("2026-11-05T04:00:00.000Z");
    await pass(5);
    const reads = asked.filter(a => a.path === `/me/enotary/listings/${ID}/slots`).length;
    click("[data-request]");
    await pass(30);
    expect(view()).toContain("That time was just booked");
    expect(assigned).toEqual([]);
    // The free times are read again, and nothing stays chosen.
    expect(asked.filter(a => a.path === `/me/enotary/listings/${ID}/slots`).length).toBe(reads + 1);
    expect((document.querySelector("[data-request]") as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows a notary in a session, and offers only a booked time", async () => {
    answers["GET /public/enotary/availability"] = { status: 200, body: { listings: [{ directoryId: ID, status: "in_session", until: "2026-11-05T02:30:00.000Z" }] } };
    await openDirectory();
    click("[data-step=interest]");
    await pass(30);
    expect(view()).toContain("In a session");
    expect(view()).toContain("Free again at about 10:30 AM");
    expect((document.getElementById("rb-now") as HTMLInputElement).disabled).toBe(true);
    expect((document.getElementById("rb-later") as HTMLInputElement).checked).toBe(true);
  });

  it("moves to a booked time when LAGDA says the notary just went into a session", async () => {
    answers["POST /me/enotary/invitations"] = err(409, "enotary_notary_busy", { message: "This notary is in a session right now. Book a time instead, or try again shortly." });
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    await fillDetails();
    click("[data-request]");
    await pass(30);
    expect(view()).toContain("This notary is in a session right now");
    expect((document.getElementById("rb-later") as HTMLInputElement).checked).toBe(true);
    expect(assigned).toEqual([]);
  });

  it("sends nothing while the notary is offline", async () => {
    vi.setSystemTime(WEEKEND);
    answers["POST /me/enotary/invitations"] = { status: 201, body: { invitation: { id: "eni_x" } } };
    await openDirectory();
    click("[data-step=interest]");
    await pass(20);
    expect(view()).toContain("This notary is offline.");
    await fillDetails();
    expect((document.querySelector("[data-request]") as HTMLButtonElement).disabled).toBe(true);
    expect(asked.some(a => a.method === "POST")).toBe(false);
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
