// The three public forms, the status page and the website-messages inbox
// against a real backend.
//
// The forms used to validate their input and then throw it away, the contact
// and waitlist ones failing at random; the status page showed a fixed
// "Operational" and an invented incident.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("../../../services/backend-flag", () => ({
  USE_REAL_BACKEND: true,
  API_BASE_URL: "https://example.test/api",
}));

import { BookADemo } from "../demo/BookADemo";
import { ContactPage } from "../resources/ContactPage";
import { EnotaryWaitlist } from "../enotary/EnotaryWaitlist";
import { ServiceStatus } from "../resources/ServiceStatus";
import { InquiriesPage, InquiryPage } from "../../platform/inquiries/InquiriesPage";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

interface Call { method: string; path: string; body: unknown }
const calls: Call[] = [];
let answer: (call: Call) => Response;

beforeEach(() => {
  calls.length = 0;
  answer = () => json(201, { inquiryId: "pin_1", kind: "contact", receivedAt: "2026-10-02T09:00:00.000Z" });
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const call: Call = {
      method: init?.method ?? "GET",
      path: url.pathname.replace(/^\/api/, "") + url.search,
      body: typeof init?.body === "string" ? JSON.parse(init.body) as unknown : undefined,
    };
    calls.push(call);
    return Promise.resolve(answer(call));
  }));
});

function renderPage(element: React.ReactElement, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>);
}
const field = (container: HTMLElement, id: string) => container.querySelector(`#${id}`) as HTMLElement;
const posted = () => calls.filter(c => c.method === "POST");

describe("the contact form with a backend", () => {
  async function fill(container: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
    await user.type(field(container, "c-name"), "Maria Santos");
    await user.type(field(container, "c-email"), "maria@example.ph");
    await user.selectOptions(field(container, "c-category"), "Sales");
    await user.type(field(container, "c-subject"), "Pricing for a law office");
    await user.type(field(container, "c-message"), "We are twelve lawyers. How does Business work?");
    await user.click(field(container, "c-consent"));
  }

  it("sends the message to the server and says where the reply will go", async () => {
    const user = userEvent.setup();
    const { container } = renderPage(<ContactPage />);
    await fill(container, user);
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByTestId("contact-received")).toHaveTextContent("We will reply to maria@example.ph.");
    expect(posted()).toEqual([{
      method: "POST", path: "/public/inquiries",
      body: {
        kind: "contact", name: "Maria Santos", email: "maria@example.ph", topic: "Sales",
        subject: "Pricing for a law office", message: "We are twelve lawyers. How does Business work?",
        consent: true,
      },
    }]);
    // Never the old wording: something really was sent.
    expect(screen.queryByText(/frontend demonstration/i)).toBeNull();
    expect(screen.queryByText(/No message has been transmitted/)).toBeNull();
  });

  it("shows the server's refusal and keeps what was typed", async () => {
    const user = userEvent.setup();
    answer = () => json(429, { error: { code: "RATE_LIMITED", message: "Too many requests." } });
    const { container } = renderPage(<ContactPage />);
    await fill(container, user);
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many messages were sent from this connection");
    expect(screen.queryByTestId("contact-received")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(field(container, "c-message")).toHaveValue("We are twelve lawyers. How does Business work?");
  });

  it("sends nothing while the form is incomplete", async () => {
    const user = userEvent.setup();
    renderPage(<ContactPage />);
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(posted()).toEqual([]);
  });
});

describe("the demo request form with a backend", () => {
  it("sends the request with readable labels and promises a reply, not a booking", async () => {
    const user = userEvent.setup();
    answer = () => json(201, { inquiryId: "pin_2", kind: "demo", receivedAt: "2026-10-02T09:00:00.000Z" });
    const { container } = renderPage(<BookADemo />, "/book-a-demo?topic=esignature");
    await user.type(field(container, "demo-name"), "Jose Cruz");
    await user.type(field(container, "demo-email"), "jose@example.ph");
    await user.type(field(container, "demo-org"), "Cruz & Partners");
    await user.click(field(container, "demo-consent"));
    await user.click(screen.getByRole("button", { name: "Request a Demo" }));

    expect(await screen.findByTestId("demo-received")).toHaveTextContent("We will reply to jose@example.ph");
    expect(screen.getByTestId("demo-received")).toHaveTextContent("No demo is booked until we do.");
    const [call] = posted();
    expect(call?.path).toBe("/public/inquiries");
    expect(call?.body).toMatchObject({
      kind: "demo", name: "Jose Cruz", email: "jose@example.ph", organization: "Cruz & Partners", consent: true,
    });
    // The interest travels as words a person can read, not as an internal id.
    expect((call?.body as { topic: string }).topic).not.toBe("esignature");
    expect((call?.body as { topic: string }).topic.length).toBeGreaterThan(3);
  });

  it("shows a connection failure as an error, not as a success", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    const { container } = renderPage(<BookADemo />, "/book-a-demo?topic=esignature");
    await user.type(field(container, "demo-name"), "Jose Cruz");
    await user.type(field(container, "demo-email"), "jose@example.ph");
    await user.type(field(container, "demo-org"), "Cruz & Partners");
    await user.click(field(container, "demo-consent"));
    await user.click(screen.getByRole("button", { name: "Request a Demo" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByTestId("demo-received")).toBeNull();
  });
});

describe("the eNotary waitlist form with a backend", () => {
  it("stores the sign-up and keeps the accreditation disclaimer beside the confirmation", async () => {
    const user = userEvent.setup();
    answer = () => json(201, { inquiryId: "pin_3", kind: "waitlist", receivedAt: "2026-10-02T09:00:00.000Z" });
    const { container } = renderPage(<EnotaryWaitlist />);
    await user.type(field(container, "wl-name"), "Lea Ramos");
    await user.type(field(container, "wl-email"), "lea@example.ph");
    await user.selectOptions(field(container, "wl-audience"), "notary");
    await user.click(field(container, "wl-consent"));
    await user.click(container.querySelector('form button[type="submit"]') as HTMLElement);

    expect(await screen.findByTestId("waitlist-received")).toHaveTextContent("We will email lea@example.ph");
    expect(posted()).toEqual([{
      method: "POST", path: "/public/inquiries",
      body: { kind: "waitlist", name: "Lea Ramos", email: "lea@example.ph", topic: "Notary Public", consent: true },
    }]);
    // Being on the list promises nothing about the service.
    expect(container.textContent).toContain("Subject to Supreme Court Accreditation");
    expect(container.textContent).toContain("does not create a LAGDA account");
  });
});

describe("the service status page with a backend", () => {
  it("asks the server and reports it operational when both probes answer", async () => {
    answer = call => call.path === "/health" ? json(200, { status: "ok" }) : json(200, { status: "ready" });
    renderPage(<ServiceStatus />);
    await waitFor(() => expect(screen.getByTestId("status-headline")).toHaveAttribute("data-status", "operational"));
    expect(calls.map(c => c.path).sort()).toEqual(["/health", "/ready"]);
    expect(screen.getByTestId("status-account-access")).toHaveAttribute("data-status", "operational");
    expect(screen.getByTestId("status-doc-verification")).toHaveAttribute("data-status", "operational");
  });

  it("reports not responding when the server is up but not ready", async () => {
    answer = call => call.path === "/health" ? json(200, { status: "ok" }) : json(503, { status: "not-ready" });
    renderPage(<ServiceStatus />);
    await waitFor(() => expect(screen.getByTestId("status-headline")).toHaveAttribute("data-status", "unavailable"));
    expect(screen.getByTestId("status-headline")).toHaveTextContent("LAGDA is not responding");
    expect(screen.getByTestId("status-recipient-signing")).toHaveAttribute("data-status", "unavailable");
  });

  it("reports not responding when the server cannot be reached, and checks again on request", async () => {
    const user = userEvent.setup();
    let reachable = false;
    vi.stubGlobal("fetch", vi.fn(() => reachable ? Promise.resolve(json(200, {})) : Promise.reject(new TypeError("Failed to fetch"))));
    renderPage(<ServiceStatus />);
    await waitFor(() => expect(screen.getByTestId("status-headline")).toHaveAttribute("data-status", "unavailable"));
    reachable = true;
    await user.click(screen.getByTestId("status-recheck"));
    await waitFor(() => expect(screen.getByTestId("status-headline")).toHaveAttribute("data-status", "operational"));
  });

  it("invents nothing: no incident, no fixed timestamp, and the unbuilt marked as such", async () => {
    answer = () => json(200, {});
    const { container } = renderPage(<ServiceStatus />);
    await waitFor(() => expect(screen.getByTestId("status-headline")).toHaveAttribute("data-status", "operational"));
    expect(container.textContent).not.toContain("Scheduled maintenance");
    expect(container.textContent).not.toContain("15 Jul 2026");
    expect(container.textContent).not.toContain("DEMONSTRATION DATA");
    expect(screen.getByTestId("status-no-history")).toHaveTextContent("does not publish an incident history yet");
    expect(screen.getByTestId("status-api-integrations")).toHaveAttribute("data-status", "planned");
    expect(screen.getByTestId("status-enotary")).toHaveAttribute("data-status", "future-product");
    expect(screen.getByTestId("status-enotary")).toHaveTextContent("Subject to Supreme Court Accreditation");
  });
});

describe("the website messages inbox", () => {
  const inquiry = {
    inquiryId: "pin_1", kind: "contact", kindLabel: "Contact message", name: "Maria Santos",
    email: "maria@example.ph", organization: null, role: null, organizationSize: null, industry: null,
    phone: null, topic: "Sales", subject: "Pricing for a law office",
    message: "We are twelve lawyers.\n\nHow does Business work?", createdAt: "2026-10-02T09:00:00.000Z",
  };
  const renderInbox = (path: string) => render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/inquiries" element={<InquiriesPage />} />
        <Route path="/app/inquiries/:inquiryId" element={<InquiryPage />} />
      </Routes>
    </MemoryRouter>,
  );

  it("lists the messages with their counts and filters by kind", async () => {
    const user = userEvent.setup();
    answer = () => json(200, { inquiries: [inquiry], counts: { demo: 2, contact: 1, waitlist: 4 } });
    renderInbox("/app/inquiries");
    expect(await screen.findByTestId("inquiry-pin_1")).toHaveAttribute("href", "/app/inquiries/pin_1");
    expect(screen.getByRole("button", { name: "All (7)" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByTestId("inquiries-tab-waitlist"));
    await waitFor(() => expect(calls.at(-1)?.path).toBe("/public-inquiries?kind=waitlist"));
    expect(screen.getByTestId("inquiries-tab-waitlist")).toHaveAttribute("aria-pressed", "true");
  });

  it("opens one message, with a reply-by-email link to the visitor", async () => {
    answer = () => json(200, inquiry);
    renderInbox("/app/inquiries/pin_1");
    expect(await screen.findByTestId("inquiry-message")).toHaveTextContent("We are twelve lawyers.");
    expect(calls.map(c => c.path)).toEqual(["/public-inquiries/pin_1"]);
    expect(screen.getByTestId("inquiry-reply").getAttribute("href"))
      .toBe("mailto:maria@example.ph?subject=Re%3A%20Pricing%20for%20a%20law%20office");
  });

  it("is not found for an account that does not read the website's messages", async () => {
    answer = () => json(404, { error: { code: "NOT_FOUND", message: "Not found." } });
    renderInbox("/app/inquiries");
    expect(await screen.findByTestId("inquiries-missing")).toBeInTheDocument();
    expect(screen.queryByTestId("inquiry-list")).toBeNull();
  });
});
