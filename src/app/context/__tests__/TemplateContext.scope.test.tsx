// The refresh bug, at the context level: a template page must not read until
// the session bootstrap has produced a workspace (real mode), must read again
// when the workspace changes, and a read for an old workspace that lands late
// must never overwrite the current one.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

const platform = vi.hoisted(() => {
  type Value = { sessionStatus: string; workspaceStatus: string; currentWorkspace: { id: string } | null };
  const listeners = new Set<() => void>();
  const store = {
    value: { sessionStatus: "initializing", workspaceStatus: "initializing", currentWorkspace: null } as Value,
    set(patch: Partial<Value>) { store.value = { ...store.value, ...patch }; listeners.forEach(l => l()); },
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  };
  return store;
});
const getTemplate = vi.hoisted(() => ({ fn: null as null | ((ws: string | undefined, id: string) => Promise<unknown>) }));

vi.mock("../../services/backend-flag", () => ({ API_BASE_URL: "https://api.test", USE_REAL_BACKEND: true }));
vi.mock("../PlatformContext", async () => {
  const React = await import("react");
  return { usePlatform: () => React.useSyncExternalStore(platform.subscribe, () => platform.value) };
});
vi.mock("../../services/templates-source", () => ({
  listTemplates: () => Promise.resolve({ items: [] }),
  getTemplate: (ws: string | undefined, id: string) => getTemplate.fn!(ws, id),
  duplicateTemplate: () => Promise.reject(new Error("unused")),
  realTemplatesAvailable: (ws: string | undefined) => ws !== undefined && ws !== "",
}));

import { TemplateProvider, templateScopeOf, useActiveTemplateLoader, useTemplates } from "../TemplateContext";

function Probe({ id }: { id: string }) {
  const scope = useActiveTemplateLoader(id);
  const { state } = useTemplates();
  return (
    <div>
      <span data-testid="scope">{scope.status}</span>
      <span data-testid="name">{(state.activeTemplate as { name?: string } | null)?.name ?? ""}</span>
      <span data-testid="error">{state.activeError ?? ""}</span>
    </div>
  );
}

function tpl(name: string) {
  return { id: "tpl_1", name, placeholders: [], documents: [], fields: [], variables: [], status: "draft",
    routing: { mode: "sequential", groups: [] }, content: { kind: "flowDocument", content: [] } };
}

const text = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => {
  platform.value = { sessionStatus: "initializing", workspaceStatus: "initializing", currentWorkspace: null };
});

describe("templateScopeOf", () => {
  const cases: [string, Parameters<typeof templateScopeOf>[0], boolean, string][] = [
    ["fixture mode never waits", { sessionStatus: "initializing", workspaceStatus: "initializing", currentWorkspace: null }, false, "ready"],
    ["bootstrapping", { sessionStatus: "initializing", workspaceStatus: "initializing", currentWorkspace: null }, true, "pending"],
    ["signed in, workspaces still loading", { sessionStatus: "authenticated", workspaceStatus: "initializing", currentWorkspace: null }, true, "pending"],
    ["ready but no workspace set yet", { sessionStatus: "authenticated", workspaceStatus: "ready", currentWorkspace: null }, true, "pending"],
    ["ready with a workspace", { sessionStatus: "authenticated", workspaceStatus: "ready", currentWorkspace: { id: "ws_1" } as never }, true, "ready"],
    ["no workspaces at all", { sessionStatus: "authenticated", workspaceStatus: "empty", currentWorkspace: null }, true, "ready"],
    ["signed out", { sessionStatus: "unauthenticated", workspaceStatus: "initializing", currentWorkspace: null }, true, "signed-out"],
    ["expired", { sessionStatus: "expired", workspaceStatus: "ready", currentWorkspace: null }, true, "signed-out"],
  ];
  it.each(cases)("%s", (_label, inputs, real, expected) => {
    expect(templateScopeOf(inputs as never, real).status).toBe(expected);
  });
});

describe("useActiveTemplateLoader", () => {
  it("does not read before the workspace is known — the refresh case — then reads once it is", async () => {
    const calls: (string | undefined)[] = [];
    getTemplate.fn = ws => { calls.push(ws); return Promise.resolve(ws === "ws_1" ? tpl("Offer") : null); };
    render(<TemplateProvider><Probe id="tpl_1" /></TemplateProvider>);
    expect(text("scope")).toBe("pending");
    expect(calls).toEqual([]);
    expect(text("error")).toBe("");

    act(() => { platform.set({ sessionStatus: "authenticated", workspaceStatus: "ready", currentWorkspace: { id: "ws_1" } }); });
    expect(await screen.findByText("Offer")).toBeTruthy();
    expect(calls).toEqual(["ws_1"]);
  });

  it("reads again when the workspace changes", async () => {
    platform.value = { sessionStatus: "authenticated", workspaceStatus: "ready", currentWorkspace: { id: "ws_1" } };
    getTemplate.fn = ws => Promise.resolve(tpl(ws === "ws_1" ? "One" : "Two"));
    render(<TemplateProvider><Probe id="tpl_1" /></TemplateProvider>);
    expect(await screen.findByText("One")).toBeTruthy();
    act(() => { platform.set({ currentWorkspace: { id: "ws_2" } }); });
    expect(await screen.findByText("Two")).toBeTruthy();
  });

  it("a late answer for the previous workspace never overwrites the current one", async () => {
    platform.value = { sessionStatus: "authenticated", workspaceStatus: "ready", currentWorkspace: { id: "ws_1" } };
    let releaseOld!: () => void;
    getTemplate.fn = ws => ws === "ws_1"
      ? new Promise(r => { releaseOld = () => r(tpl("Stale")); })
      : Promise.resolve(tpl("Current"));
    render(<TemplateProvider><Probe id="tpl_1" /></TemplateProvider>);
    act(() => { platform.set({ currentWorkspace: { id: "ws_2" } }); });
    expect(await screen.findByText("Current")).toBeTruthy();
    await act(async () => { releaseOld(); await Promise.resolve(); });
    expect(text("name")).toBe("Current");
  });

  it("signed out: no read at all", () => {
    platform.value = { sessionStatus: "unauthenticated", workspaceStatus: "initializing", currentWorkspace: null };
    const spy = vi.fn(() => Promise.resolve(null));
    getTemplate.fn = spy;
    render(<TemplateProvider><Probe id="tpl_1" /></TemplateProvider>);
    expect(text("scope")).toBe("signed-out");
    expect(spy).not.toHaveBeenCalled();
  });
});
