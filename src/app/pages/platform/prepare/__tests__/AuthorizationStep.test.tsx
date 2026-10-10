// Authorization shows what is about to be sent and carries no buttons of its
// own: Previous and Authorize are in the footer, as on every other step.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../../context/PrepareContext", () => ({
  usePrepare: () => ({
    draft: {
      details: { title: "Receipt Signature" },
      participants: [
        { id: "p1", name: "Bruce Wayne", email: "bruce@example.ph", role: "signer" },
        { id: "p2", name: "", email: "copy@example.ph", role: "copy-recipient" },
      ],
    },
  }),
}));

import { AuthorizationStep } from "../AuthorizationStep";

describe("Authorization", () => {
  it("says what is about to be sent and to whom", () => {
    render(<MemoryRouter><AuthorizationStep /></MemoryRouter>);
    expect(screen.getByText("Receipt Signature")).toBeInTheDocument();
    expect(screen.getByText("Bruce Wayne (Signer)")).toBeInTheDocument();
    // Only people who act are emailed a link.
    expect(screen.getByText("1 person")).toBeInTheDocument();
  });

  it("has no Back to Review and no Authorize of its own", () => {
    render(<MemoryRouter><AuthorizationStep /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: /Back to Review/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Authorize/ })).toBeNull();
    expect(screen.getByText(/press Authorize below/)).toBeInTheDocument();
  });
});
