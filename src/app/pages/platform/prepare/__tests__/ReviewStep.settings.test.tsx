// Review's Settings summary says what will happen, and nothing that will not.
//
// It used to end with "Verification record: Will be created", a line for a
// switch that changed nothing (the record is always created). It now states
// the one completion choice the sender has: whether participants are emailed
// the completed document.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const stable = vi.hoisted(() => ({
  draft: { id: "draft_1" } as { id: string; settings?: unknown },
  setStep: () => undefined,
  validate: () => ({ issues: [], readyForFieldPlacement: true, stepValidity: {} }),
  markReadyForFieldPlacement: () => undefined,
}));
vi.mock("../../../../context/PrepareContext", () => ({ usePrepare: () => stable }));

import { ReviewStep } from "../ReviewStep";
import { DEFAULT_PREP_SETTINGS } from "../../../../models/prepare";

const open = () => render(<MemoryRouter><ReviewStep /></MemoryRouter>);

beforeEach(() => { stable.draft = { id: "draft_1" }; });

describe("Review: the Settings summary", () => {
  it("says the completed document will be emailed, by default", () => {
    open();
    expect(screen.getByTestId("review-final-copy")).toHaveTextContent(
      "Completed document: Emailed to participants when everyone has finished");
  });

  it("says so when the sender switched it off", () => {
    stable.draft = { id: "draft_1", settings: { ...DEFAULT_PREP_SETTINGS, completion: { emailFinalCopy: false } } };
    open();
    expect(screen.getByTestId("review-final-copy")).toHaveTextContent(
      "Completed document: Not emailed to participants");
  });

  it("shows the expiration date beside it", () => {
    stable.draft = {
      id: "draft_1",
      settings: { ...DEFAULT_PREP_SETTINGS, expiration: { enabled: true, expiresAt: "2026-11-20" } },
    };
    open();
    expect(screen.getByText(/Expiration: November 20, 2026/)).toBeInTheDocument();
  });

  it("no longer reports a verification record, a notification or reminders", () => {
    open();
    expect(screen.queryByText(/Verification record:/)).toBeNull();
    expect(screen.queryByText(/Notify/)).toBeNull();
    expect(screen.queryByText(/Reminders:/)).toBeNull();
  });
});
