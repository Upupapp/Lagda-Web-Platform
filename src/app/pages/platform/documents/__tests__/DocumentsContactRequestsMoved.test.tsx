// Contact requests (086) left Documents for Contacts → Requests From
// Contacts: no "Requests for you" block in Others, no "Requests you sent"
// tab, an Others badge that counts role documents only, and old deep links
// redirected to the new section.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Acme" } }),
}));
vi.mock("../../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return {
    ...actual,
    realMySigningService: {
      documentsToSign: () => Promise.resolve([
        entry("signer", "Lease"), entry("approver", "Budget"), entry("viewer", "Minutes"),
      ]),
      signedDocuments: () => Promise.resolve([]),
      completedOtherDocuments: () => Promise.resolve([]),
      continueSigning: vi.fn(),
    },
  };
});

function entry(recipientType: string, title: string) {
  return {
    signingRequestId: `sr_${title}`, recipientId: `r_${title}`, documentTitle: title, recipientType,
    senderName: "Paul", senderEmail: "paul@example.com", workspaceName: "Acme",
    invitedAt: "2026-09-25T00:00:00.000Z", expiresAt: "2026-10-25T00:00:00.000Z",
  };
}

import { DocumentsPage } from "../DocumentsPage";

let urls: string[] = [];
beforeEach(() => {
  urls = [];
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    urls.push(url);
    const body = url.includes("/me/contact-requests")
      ? { items: [{ requestId: "cr_1", status: "pending" }] }
      : { items: [], total: 0, page: 1, perPage: 50, hasNextPage: false };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
  }));
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

const renderAt = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/app/documents" element={<DocumentsPage />} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);

describe("Documents without contact requests", () => {
  it("has no Requests you sent tab, and Others counts role documents only", async () => {
    renderAt("/app/documents?list=others");
    const tabs = screen.getByRole("tablist", { name: "Document lists" });
    expect(within(tabs).queryByRole("tab", { name: /Requests you sent/ })).toBeNull();
    // Approver + viewer; the pending contact request is not counted.
    await waitFor(() => { expect(within(tabs).getByRole("tab", { name: /Others/ }).textContent?.trim()).toBe("Others2"); });
    expect(await screen.findByRole("table", { name: "Other documents I take part in" })).toBeTruthy();
    expect(screen.queryByText("Requests for you")).toBeNull();
    expect(screen.queryByRole("list", { name: "Requests for you" })).toBeNull();
    expect(urls.some(url => url.includes("/me/contact-requests"))).toBe(false);
  });

  it("redirects ?list=requests-sent to Requests From Contacts → Sent", async () => {
    renderAt("/app/documents?list=requests-sent");
    expect((await screen.findByTestId("where")).textContent).toBe("/app/contacts/requests?view=sent");
  });

  it("redirects a sent request link, keeping the request to focus", async () => {
    renderAt("/app/documents?list=requests-sent&request=cr_7");
    expect((await screen.findByTestId("where")).textContent).toBe("/app/contacts/requests?view=sent&request=cr_7");
  });

  it("redirects an old Others ?request=<id> link to Received", async () => {
    renderAt("/app/documents?list=others&request=cr_1");
    expect((await screen.findByTestId("where")).textContent).toBe("/app/contacts/requests?view=received&request=cr_1");
  });
});
