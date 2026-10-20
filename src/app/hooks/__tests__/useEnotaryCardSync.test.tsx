// The banner colour LAGDA eNotary keeps for the other party's card: sent when known and when it changes, never on a Free plan.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

let plan: string | null = "business";
let primaryColor: string | null = "#0a84d6";
const saveCard = vi.fn((_color: string | null) => Promise.resolve());
vi.mock("../../context/PlatformContext", () => ({ usePlatform: () => ({ currentWorkspace: { id: "w1" } }) }));
vi.mock("../usePlans", () => ({ useWorkspacePlan: () => ({ plan }) }));
vi.mock("../workspace-branding-store", () => ({ useWorkspaceBrandingSnapshot: () => ({ primaryColor }) }));
vi.mock("../../services/real/enotary-sessions.service", () => ({ realEnotarySessionsService: { saveCard: (color: string | null) => saveCard(color) } }));

import { useEnotaryCardSync } from "../useEnotaryCardSync";

beforeEach(() => { saveCard.mockClear(); plan = "business"; primaryColor = "#0a84d6"; });

describe("the eNotary card sync", () => {
  it("sends the workspace's banner colour once, and again only when it changes", () => {
    const { rerender } = renderHook(() => { useEnotaryCardSync(true); });
    rerender();
    expect(saveCard).toHaveBeenCalledTimes(1);
    expect(saveCard).toHaveBeenCalledWith("#0a84d6");
    primaryColor = "#112233";
    rerender();
    expect(saveCard).toHaveBeenLastCalledWith("#112233");
  });

  it("sends no colour on a Free plan, and nothing while the plan is unknown or signed out", () => {
    plan = "free";
    renderHook(() => { useEnotaryCardSync(true); });
    expect(saveCard).toHaveBeenCalledWith(null);
    saveCard.mockClear(); plan = null;
    renderHook(() => { useEnotaryCardSync(true); });
    plan = "business";
    renderHook(() => { useEnotaryCardSync(false); });
    expect(saveCard).not.toHaveBeenCalled();
  });
});
