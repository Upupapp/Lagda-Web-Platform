// Review › "Continue to Authorization": it moves on exactly as Continue at the
// foot of the page does. It must not reload the draft on the way: doing so
// swapped the saved participants for a local copy with other ids, every field
// then read as "assigned to a participant that no longer exists", and Send
// was blocked.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("Review › Continue to Authorization", () => {
  it("opens Authorization without reloading the draft", async () => {
    render(
      <MemoryRouter initialEntries={["/app/prepare/review"]}>
        <Routes>
          <Route path="/app/prepare/review" element={<ReviewStep />} />
          <Route path="/app/prepare/authorization" element={<div>Authorization step</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Continue to Authorization/ }));
    expect(await screen.findByText("Authorization step")).toBeInTheDocument();
    expect(markReadyForFieldPlacement).not.toHaveBeenCalled();
  });
});
