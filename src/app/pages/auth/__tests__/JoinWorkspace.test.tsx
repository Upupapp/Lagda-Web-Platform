// /join/:token — the join page (078). Real-backend mode with fetch stubbed.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

vi.setConfig({ testTimeout: 15_000 });

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

interface FakePlatform {
  sessionStatus: "initializing" | "authenticated" | "unauthenticated";
  user: { id: string; email: string; displayName: string; fullName?: string; role: "owner" } | null;
}
const platform: FakePlatform = { sessionStatus: "authenticated", user: null };
vi.mock("../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { JoinWorkspace } from "../JoinWorkspace";

const TOKEN = "tokABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn"; // 43 chars

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const calls: { path: string; body: unknown }[] = [];
let preview: () => Response;
let submit: () => Response;

beforeEach(() => {
  calls.length = 0;
  platform.sessionStatus = "authenticated";
  platform.user = { id: "usr_1", email: "ana@example.com", displayName: "Ana", fullName: "Ana Reyes", role: "owner" };
  preview = () => json(200, { workspaceName: "Mabini Legal Solutions", invitedByName: "Paul Reyes" });
  submit = () => json(201, { requestId: "jr_1", workspaceName: "Mabini Legal Solutions", state: "pending" });
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const path = url.replace("http://api.test", "");
    calls.push({ path, body: init?.body ? JSON.parse(init.body as string) : undefined });
    if (path === "/workspace-join/preview") return Promise.resolve(preview());
    if (path === "/workspace-join/requests") return Promise.resolve(submit());
    return Promise.resolve(json(404, { error: { code: "not_found", message: "nope" } }));
  }));
});

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

function renderJoin(entries: string[] = [`/join/${TOKEN}`], index?: number) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={index ?? entries.length - 1}>
      <Routes>
        <Route path="/join/:token" element={<JoinWorkspace />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const WAIT = { timeout: 4000 };

describe("JoinWorkspace", () => {
  it("shows the branded loader for at least 1.5 seconds, then the form", async () => {
    renderJoin();
    expect(screen.getByRole("status", { name: /Opening your join link/ })).toBeInTheDocument();
    // Preview has resolved well before 1.5 s; the loader must still be up.
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.queryByText("Mabini Legal Solutions")).toBeNull();

    expect(await screen.findByText("Mabini Legal Solutions", {}, WAIT)).toBeInTheDocument();
    expect(screen.getByText("Paul Reyes")).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/)).toHaveValue("Ana Reyes");
    const email = screen.getByLabelText(/^Email/);
    expect(email).toHaveValue("ana@example.com");
    expect(email).toHaveAttribute("readonly");
    expect(calls[0]).toEqual({ path: "/workspace-join/preview", body: { token: TOKEN } });
  });

  it("explains an invalid or withdrawn link", async () => {
    preview = () => json(404, { error: { code: "join_link_invalid", message: "x" } });
    renderJoin();
    expect(await screen.findByText("This link isn't valid", {}, WAIT)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to dashboard" })).toBeInTheDocument();
  });

  it("tells later visitors that someone already used the link", async () => {
    preview = () => json(410, { error: { code: "join_link_used", message: "x" } });
    renderJoin();
    expect(await screen.findByText(/Someone already used this link\. Ask the workspace owner for a new one\./, {}, WAIT)).toBeInTheDocument();
  });

  it("sends the request and shows the pending outcome", async () => {
    const user = userEvent.setup();
    renderJoin();
    await screen.findByText("Mabini Legal Solutions", {}, WAIT);
    await user.type(screen.getByLabelText(/Reason for joining/), "Finance team");
    expect(screen.getByText("12/500")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Join Now" }));

    expect(await screen.findByText("Request sent")).toBeInTheDocument();
    expect(screen.getByText(/will review it/)).toBeInTheDocument();
    expect(calls.find((c) => c.path === "/workspace-join/requests")?.body).toEqual({
      token: TOKEN, fullName: "Ana Reyes", reason: "Finance team",
    });
    await user.click(screen.getByRole("button", { name: "Go to dashboard" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/app/dashboard");
  });

  it("shows the email-not-verified state", async () => {
    const user = userEvent.setup();
    submit = () => json(403, { error: { code: "join_email_unverified", message: "x" } });
    renderJoin();
    await screen.findByText("Mabini Legal Solutions", {}, WAIT);
    await user.click(screen.getByRole("button", { name: "Join Now" }));
    expect(await screen.findByText("Verify your email first")).toBeInTheDocument();
  });

  it("shows the already-pending state", async () => {
    const user = userEvent.setup();
    submit = () => json(409, { error: { code: "join_request_pending", message: "x" } });
    renderJoin();
    await screen.findByText("Mabini Legal Solutions", {}, WAIT);
    await user.click(screen.getByRole("button", { name: "Join Now" }));
    expect(await screen.findByText("Request already waiting")).toBeInTheDocument();
  });

  it("Cancel shows a confirmation with a way to the dashboard", async () => {
    const user = userEvent.setup();
    renderJoin();
    await screen.findByText("Mabini Legal Solutions", {}, WAIT);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Request not sent")).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/workspace-join/requests")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Go to dashboard" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/app/dashboard");
  });

  it("Back returns to the previous page", async () => {
    const user = userEvent.setup();
    renderJoin(["/previous-page", `/join/${TOKEN}`]);
    await screen.findByText("Mabini Legal Solutions", {}, WAIT);
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/previous-page");
  });

  it("Back falls back to the home page with no history", async () => {
    const user = userEvent.setup();
    renderJoin();
    await screen.findByText("Mabini Legal Solutions", {}, WAIT);
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByTestId("where").textContent).toBe("/");
  });

  it("sends a signed-out visitor to sign in and back to this link", async () => {
    platform.sessionStatus = "unauthenticated";
    platform.user = null;
    const user = userEvent.setup();
    // Its own link: what is typed here is kept (in memory) for after sign-in.
    const other = "otherTOKENabcdefghijklmnopqrstuvwxyz0123456";
    renderJoin([`/join/${other}`]);
    await screen.findByText("Mabini Legal Solutions", {}, WAIT);
    expect(screen.getByLabelText(/^Email/)).toHaveValue("");
    await user.type(screen.getByLabelText(/Full name/), "Ana Reyes");
    await user.click(screen.getByRole("button", { name: "Join Now" }));
    expect(screen.getByTestId("where")).toHaveTextContent(`/sign-in?returnTo=${encodeURIComponent(`/join/${other}`)}`);
    expect(calls.some((c) => c.path === "/workspace-join/requests")).toBe(false);
  });

  it("requires a full name", async () => {
    const user = userEvent.setup();
    platform.user = { id: "usr_1", email: "ana@example.com", displayName: "", role: "owner" };
    renderJoin();
    await screen.findByText("Mabini Legal Solutions", {}, WAIT);
    await user.click(screen.getByRole("button", { name: "Join Now" }));
    expect(screen.getByText("Enter your full name.")).toBeInTheDocument();
  });
});
