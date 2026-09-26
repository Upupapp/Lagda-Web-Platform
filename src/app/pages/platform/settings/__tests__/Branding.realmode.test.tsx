// Workspace branding with a real backend (082): loads the current workspace's
// branding, saves only what changed, puts the result on the workspace badge at
// once, is read-only for non-editors, and never claims recipient screens use it.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.setConfig({ testTimeout: 15_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  currentWorkspace: { id: "ws_1", name: "Reyes Law Office" } as { id: string; name: string } | null,
  applyWorkspaceBranding: vi.fn(),
  applyWorkspaceRename: vi.fn(),
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { BrandingPage } from "../BrandingPage";
import { fitLogo } from "../../../../utils/brandingLogo";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

let stored: Record<string, unknown>;
const calls: { method: string; path: string; body: unknown }[] = [];

beforeEach(() => {
  calls.length = 0;
  platform.applyWorkspaceBranding.mockReset();
  platform.applyWorkspaceRename.mockReset();
  stored = {
    displayName: "Reyes Law Office", senderDisplayName: null, footerTagline: "Counsel since 1998",
    primaryColor: "#0A4B8C", logo: { version: "v1", width: 400, height: 120 }, updatedAt: 1, canEdit: true,
  };
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    const path = url.replace("http://api.test", "").replace(/\?.*$/, "");
    const body: unknown = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path, body });
    if (path === "/workspaces/ws_1/branding" && method === "GET") return Promise.resolve(json(200, stored));
    if (path === "/workspaces/ws_1/branding" && method === "PATCH") {
      const patch = body as Record<string, unknown>;
      stored = { ...stored, ...patch, updatedAt: 2 };
      return Promise.resolve(json(200, stored));
    }
    if (path === "/workspaces/ws_1/branding/logo" && method === "DELETE") {
      stored = { ...stored, logo: null };
      return Promise.resolve(json(200, stored));
    }
    return Promise.resolve(json(404, { error: { code: "resource_not_found", message: path } }));
  }));
});

const renderPage = () => render(<MemoryRouter><BrandingPage /></MemoryRouter>);

describe("branding with a real backend", () => {
  it("loads the current workspace's saved branding and says what it applies to", async () => {
    renderPage();
    expect(await screen.findByDisplayValue("Counsel since 1998")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Reyes Law Office")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("#0A4B8C").length).toBeGreaterThan(0);
    expect(screen.getByAltText("Workspace logo")).toHaveAttribute("src", "http://api.test/workspaces/ws_1/branding/logo?v=v1");
    expect(screen.getByText(/do not use custom branding yet/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/demonstration/i);
  });

  it("saves only the changed fields and puts the result on the badge at once", async () => {
    const user = userEvent.setup();
    renderPage();
    const tagline = await screen.findByDisplayValue("Counsel since 1998");
    await user.clear(tagline);
    await user.type(tagline, "Trusted counsel");
    await user.click(screen.getByRole("button", { name: "Save branding" }));
    await screen.findByText("Branding saved to this workspace.");
    const patch = calls.find(c => c.method === "PATCH");
    expect(patch?.body).toEqual({ footerTagline: "Trusted counsel" });
    expect(platform.applyWorkspaceBranding).toHaveBeenCalledWith("ws_1", {
      brandColor: "#0A4B8C", logoUrl: "http://api.test/workspaces/ws_1/branding/logo?v=v1",
    });
  });

  it("renames the workspace through the display name", async () => {
    const user = userEvent.setup();
    renderPage();
    const name = await screen.findByDisplayValue("Reyes Law Office");
    await user.clear(name);
    await user.type(name, "Reyes & Partners");
    await user.click(screen.getByRole("button", { name: "Save branding" }));
    await waitFor(() => expect(platform.applyWorkspaceRename).toHaveBeenCalledWith("ws_1", "Reyes & Partners"));
  });

  it("removes the logo on save", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Remove" }));
    expect(screen.getByText(/will be removed when you save/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save branding" }));
    await waitFor(() => expect(calls.some(c => c.method === "DELETE")).toBe(true));
    expect(platform.applyWorkspaceBranding).toHaveBeenLastCalledWith("ws_1", { brandColor: "#0A4B8C", logoUrl: null });
  });

  it("blocks saving an invalid colour", async () => {
    const user = userEvent.setup();
    renderPage();
    const hex = await screen.findByLabelText("Brand color hex value");
    await user.clear(hex);
    await user.type(hex, "#12");
    expect(screen.getByText(/six hex digits/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save branding" })).toBeDisabled();
  });

  it("is read-only for someone who cannot edit", async () => {
    stored = { ...stored, canEdit: false };
    renderPage();
    expect(await screen.findByText("Only owners and administrators can change branding.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Counsel since 1998")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save branding" })).toBeNull();
  });

  it("offers a reload when branding cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(500, { error: { code: "server_error", message: "x" } }))));
    renderPage();
    expect(await screen.findByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});

describe("fitLogo", () => {
  it("fits inside 800 x 400 without enlarging or cropping", () => {
    expect(fitLogo(1600, 400)).toEqual({ width: 800, height: 200 });
    expect(fitLogo(600, 1200)).toEqual({ width: 200, height: 400 });
    expect(fitLogo(300, 100)).toEqual({ width: 300, height: 100 });
  });
});
