// The feature-flag route guard.
//
// These assertions are about reachability, not appearance. The surfaces behind
// these flags are demonstrations that look finished and do nothing, so "the
// nav link is hidden" is not the property worth testing — someone with an old
// bookmark never sees the nav.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { FeatureGuard } from "../FeatureGuard";
import type { PlatformFeatureFlag } from "../../../models";

const hasFlag = vi.fn<(flag: PlatformFeatureFlag) => boolean>();

vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({ hasFlag }),
}));

beforeEach(() => { hasFlag.mockReset(); });

function renderAt(path: string, flag: PlatformFeatureFlag) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <FeatureGuard flag={flag}>
              <p>the gated page</p>
            </FeatureGuard>
          }
        />
        <Route path="/app/dashboard" element={<p>the dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FeatureGuard", () => {
  it("renders the page when the flag is on", () => {
    hasFlag.mockReturnValue(true);
    renderAt("/app/inbox", "recipientInboxEnabled");
    expect(screen.getByText("the gated page")).toBeTruthy();
  });

  it("does not render the page when the flag is off", () => {
    hasFlag.mockReturnValue(false);
    renderAt("/app/inbox", "recipientInboxEnabled");
    // Not merely hidden — the component never mounts, so its mock service is
    // never called and its fixtures are never shown.
    expect(screen.queryByText("the gated page")).toBeNull();
  });

  it("sends the visitor somewhere real instead of a blank screen", () => {
    hasFlag.mockReturnValue(false);
    renderAt("/app/inbox", "recipientInboxEnabled");
    expect(screen.getByText("the dashboard")).toBeTruthy();
  });

  it("asks about the flag it was given, not some other one", () => {
    hasFlag.mockReturnValue(false);
    renderAt("/app/reports", "reportsEnabled");
    expect(hasFlag).toHaveBeenCalledWith("reportsEnabled");
  });

  it("honours a custom fallback", () => {
    hasFlag.mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={["/app/inbox"]}>
        <Routes>
          <Route
            path="/app/inbox"
            element={
              <FeatureGuard flag="recipientInboxEnabled" fallback="/app/documents">
                <p>the gated page</p>
              </FeatureGuard>
            }
          />
          <Route path="/app/documents" element={<p>documents</p>} />
          <Route path="/app/dashboard" element={<p>the dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("documents")).toBeTruthy();
    expect(screen.queryByText("the dashboard")).toBeNull();
  });
});
