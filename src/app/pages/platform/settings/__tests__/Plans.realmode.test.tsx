// Plans with a real backend (093): My Settings › Plan & Billing shows the plan
// and the Free document; choosing a plan opens the TEST MODE form whose sample
// account can be copied or filled in, and only that is sent; a pending
// request can be cancelled. Paid features on a Free owner's workspace show an
// upgrade card (with "See plans" for the owner only), the approver decides a
// request, and "You've used your free document" leads to the plans.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

vi.setConfig({ testTimeout: 15_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  currentWorkspace: { id: "ws_1", name: "Reyes Law Office" } as { id: string; name: string } | null,
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { PlanBillingPage } from "../PlanBillingPage";
import { PlanGate, JoinNeedsPersonalNotice } from "../../../../components/platform/PlanGate";
import { FreeDocumentUsedNotice } from "../../../../components/platform/FreeDocumentUsedNotice";
import { PlanRequestPage } from "../../plans/PlanRequestsPage";
import { resetPlanStore } from "../../../../hooks/usePlans";
import { SAMPLE_BANK_ACCOUNT } from "../../../../services/real/plans.service";

function json(status: number, body: unknown): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

let mine: Record<string, unknown>;
let workspacePlan: Record<string, unknown>;
let review: Record<string, unknown>;
const calls: { method: string; path: string; body: unknown }[] = [];

const FREE = {
  plan: "free", storedPlan: "free", paidUntil: null, autoRenew: false,
  freeDocumentsUsed: 1, freeDocumentLimit: 1, pendingRequest: null, approver: false, upgradesAvailable: true,
};
const PENDING = {
  requestId: "pur_1", plan: "business", amountPesos: 799, status: "pending",
  createdAt: "2026-09-30T09:00:00.000Z", expiresAt: "2026-10-07T09:00:00.000Z", decidedAt: null,
};

beforeEach(() => {
  resetPlanStore();
  calls.length = 0;
  mine = { ...FREE };
  workspacePlan = { plan: "free", ownerIsYou: true, ownerName: "Ana Reyes", paidUntil: null };
  review = { ...PENDING, requesterName: "Ana Reyes", requesterEmail: "ana@example.com", currentPlan: "free" };
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    const path = url.replace("http://api.test", "").replace(/\?.*$/, "");
    const body: unknown = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path, body });
    if (path === "/me/plan") return Promise.resolve(json(200, mine));
    if (path === "/workspaces/ws_1/plan") return Promise.resolve(json(200, workspacePlan));
    if (path === "/me/plan/upgrade-requests" && method === "POST") {
      const bank = (body as { bank: Record<string, string> }).bank;
      if (bank.accountNumber !== SAMPLE_BANK_ACCOUNT.accountNumber) {
        return Promise.resolve(json(422, { error: {
          code: "test_bank_account_required", message: "Test mode: please use the sample account shown.",
          details: [{ field: "accountNumber", code: "sample_only", message: "x" }],
        } }));
      }
      mine = { ...mine, pendingRequest: PENDING };
      return Promise.resolve(json(201, PENDING));
    }
    if (path === "/me/plan/upgrade-requests/cancel") { mine = { ...mine, pendingRequest: null }; return Promise.resolve(json(204, null)); }
    if (path === "/plan-requests/pur_1" && method === "GET") return Promise.resolve(json(200, review));
    if (path === "/plan-requests/pur_1/approve") {
      review = { ...review, status: "approved", decidedAt: "2026-09-30T10:00:00.000Z" };
      return Promise.resolve(json(200, review));
    }
    return Promise.resolve(json(404, { error: { code: "resource_not_found", message: path } }));
  }));
  vi.stubGlobal("BroadcastChannel", class { postMessage() {} close() {} onmessage = null; });
});

const renderPlan = (path = "/app/settings/plan") => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/app/settings/plan" element={<PlanBillingPage />} /></Routes>
  </MemoryRouter>,
);

describe("My Settings › Plan & Billing", () => {
  it("shows Free and the used free document", async () => {
    renderPlan();
    expect(await screen.findByTestId("my-plan-name")).toHaveTextContent("FREE");
    expect(screen.getByTestId("my-plan-free-usage")).toHaveTextContent("1 of 1 used");
    expect(screen.getByTestId("plan-choose-free")).toBeDisabled();
  });

  it("opens the TEST MODE form with the sample account, and sends only the sample", async () => {
    const user = userEvent.setup();
    renderPlan();
    await user.click(await screen.findByTestId("plan-choose-business"));
    const dialog = screen.getByTestId("upgrade-dialog");
    expect(within(dialog).getByTestId("test-mode-banner")).toHaveTextContent("TEST MODE: no money is moved");
    const sample = within(dialog).getByTestId("sample-account");
    for (const value of Object.values(SAMPLE_BANK_ACCOUNT)) expect(sample).toHaveTextContent(value);
    expect(within(sample).getAllByRole("button", { name: /^Copy / })).toHaveLength(5);

    // Something else is refused, and the field is marked.
    for (const [key, value] of Object.entries(SAMPLE_BANK_ACCOUNT)) {
      await user.type(within(dialog).getByTestId(`bank-${key}`), key === "accountNumber" ? "1234-5678-9999" : value);
    }
    await user.click(within(dialog).getByTestId("upgrade-submit"));
    expect(await within(dialog).findByTestId("upgrade-error")).toHaveTextContent("please use the sample account");
    expect(within(dialog).getByTestId("bank-accountNumber")).toHaveAttribute("aria-invalid", "true");

    await user.click(within(dialog).getByTestId("fill-sample"));
    await user.click(within(dialog).getByTestId("upgrade-submit"));
    await waitFor(() => { expect(screen.queryByTestId("upgrade-dialog")).toBeNull(); });
    const sent = calls.filter(c => c.path === "/me/plan/upgrade-requests").at(-1);
    expect(sent?.body).toEqual({ plan: "business", bank: { ...SAMPLE_BANK_ACCOUNT } });
    expect(await screen.findByTestId("my-plan-pending")).toHaveTextContent("Waiting for approval: Business");
  });

  it("opens the form from ?choose=, and a pending request can be cancelled", async () => {
    const user = userEvent.setup();
    const view = renderPlan("/app/settings/plan?choose=personal");
    expect(await screen.findByRole("heading", { name: "Upgrade to Personal" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    view.unmount();
    mine = { ...mine, pendingRequest: PENDING };
    resetPlanStore();
    renderPlan();
    await user.click(await screen.findByTestId("my-plan-cancel-request"));
    await waitFor(() => { expect(calls.some(c => c.path === "/me/plan/upgrade-requests/cancel")).toBe(true); });
    expect(await screen.findByText("Your request was cancelled.")).toBeInTheDocument();
  });
});

describe("paid features on a Free owner's workspace", () => {
  it("shows the upgrade card, with See plans for the owner", async () => {
    render(<MemoryRouter><PlanGate minimum="business" feature="Teams"><p>teams page</p></PlanGate></MemoryRouter>);
    const card = await screen.findByTestId("plan-upgrade-card");
    expect(card).toHaveTextContent("Teams is part of the Business plan");
    expect(screen.getByTestId("plan-upgrade-cta")).toHaveAttribute("href", "/app/settings/plan?choose=business");
    expect(screen.queryByText("teams page")).toBeNull();
  });

  it("marks the tile that unlocks it, and dims Personal when only Business will do", async () => {
    render(<MemoryRouter><PlanGate minimum="business" feature="Teams"><p>teams page</p></PlanGate></MemoryRouter>);
    const business = await screen.findByTestId("plan-tile-business");
    expect(business).toHaveTextContent("Unlocks this");
    expect(business.querySelector(".pt-lit")?.textContent).toContain("Teams, roles and join links");
    const personal = screen.getByTestId("plan-tile-personal");
    expect(personal.className).toContain("pt-tile-shut");
    expect(personal).toHaveTextContent("Doesn't include teams");
    // See plans sits in the footer, after the tiles.
    const cta = screen.getByTestId("plan-upgrade-cta");
    expect(cta.closest(".pp-foot")).not.toBeNull();
  });

  it("asks a member to ask the owner", async () => {
    workspacePlan = { ...workspacePlan, ownerIsYou: false };
    render(<MemoryRouter><PlanGate minimum="personal" feature="Branding"><p>branding</p></PlanGate></MemoryRouter>);
    expect(await screen.findByTestId("plan-upgrade-card")).toHaveTextContent("Ask the owner to upgrade to Personal");
    expect(screen.queryByTestId("plan-upgrade-cta")).toBeNull();
  });

  it("shows the page on a paid workspace", async () => {
    workspacePlan = { ...workspacePlan, plan: "business" };
    render(<MemoryRouter><PlanGate minimum="business" feature="Teams"><p>teams page</p></PlanGate></MemoryRouter>);
    expect(await screen.findByText("teams page")).toBeInTheDocument();
  });

  it("says the free document is used, and leads to the plans", async () => {
    render(<MemoryRouter><FreeDocumentUsedNotice /></MemoryRouter>);
    expect(screen.getByTestId("free-document-used")).toHaveTextContent("You've used your free document");
    expect(await screen.findByTestId("free-document-see-plans")).toHaveAttribute("href", "/app/settings/plan");
  });
});

describe("joining another workspace", () => {
  it("is part of Personal, with See plans", () => {
    render(<MemoryRouter><JoinNeedsPersonalNotice /></MemoryRouter>);
    expect(screen.getByTestId("join-needs-personal")).toHaveTextContent("Joining another workspace is part of the Personal plan");
    expect(screen.getByTestId("join-needs-personal-cta")).toHaveAttribute("href", "/app/settings/plan?choose=personal");
  });
});

describe("the approver", () => {
  it("approves a request", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/app/plan-requests/pur_1"]}>
        <Routes><Route path="/app/plan-requests/:requestId" element={<PlanRequestPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("plan-request")).toHaveTextContent("Ana Reyes");
    expect(screen.getByTestId("plan-request")).toHaveTextContent("No money was moved");
    await user.click(screen.getByTestId("plan-request-approve"));
    await waitFor(() => { expect(screen.getByTestId("plan-request-status")).toHaveTextContent("Approved"); });
    expect(screen.queryByTestId("plan-request-approve")).toBeNull();
  });

  it("says not found to anyone else", async () => {
    review = {};
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(404, { error: { code: "resource_not_found", message: "x" } }))));
    render(
      <MemoryRouter initialEntries={["/app/plan-requests/pur_1"]}>
        <Routes><Route path="/app/plan-requests/:requestId" element={<PlanRequestPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("not the plan approver");
  });
});
