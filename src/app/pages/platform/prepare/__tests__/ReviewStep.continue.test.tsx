// Review has no button of its own for moving on. Continue at the foot of the
// page is the one way to Authorization; a second "Continue to Authorization"
// button here was two primary buttons for one action. (That button once
// reloaded the draft on the way and broke Send, which is one more reason it
// is gone rather than kept in step.)

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";

const markReadyForFieldPlacement = vi.fn();
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PrepareContext", () => ({
  usePrepare: () => ({
    draft: { id: "draft_1" },
    setStep: () => undefined,
    validate: () => ({ issues: [], readyForFieldPlacement: true, stepValidity: {} }),
    markReadyForFieldPlacement,
  }),
}));

import { ReviewStep } from "../ReviewStep";

describe("Review", () => {
  it("offers no way on of its own, and never marks the draft ready", () => {
    render(
      <MemoryRouter initialEntries={["/app/prepare/review"]}>
        <Routes>
          <Route path="/app/prepare/review" element={<ReviewStep />} />
          <Route path="/app/prepare/authorization" element={<div>Authorization step</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /Continue to Authorization|Not ready yet/ })).toBeNull();
    expect(screen.queryByText("Authorization step")).toBeNull();
    expect(markReadyForFieldPlacement).not.toHaveBeenCalled();
  });
});
