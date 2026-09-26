import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useParams } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ API_BASE_URL: "/api", USE_REAL_BACKEND: true }));

import { VerificationSection } from "../VerificationSection";

function Dest() {
  const { verificationId } = useParams();
  return <div>Record page for {verificationId}</div>;
}

describe("Homepage VerificationSection (real mode)", () => {
  it("navigates to the dedicated record page with no mock results", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<VerificationSection />} />
          <Route path="/verify/:verificationId" element={<Dest />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText(/EXPLORE VERIFICATION STATES/)).toBeNull();
    await userEvent.type(screen.getByLabelText("Verification ID"), "  VRF-123 ");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText("Record page for VRF-123")).toBeTruthy();
  });

  it("requires an ID", async () => {
    render(<MemoryRouter><VerificationSection /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(screen.getByRole("alert").textContent).toContain("Enter a Verification ID.");
  });
});
