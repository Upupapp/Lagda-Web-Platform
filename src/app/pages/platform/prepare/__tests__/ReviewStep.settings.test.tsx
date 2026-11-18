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
  it("describes current in-app completed-document access", () => {
    open();
    expect(screen.getByTestId("review-final-copy")).toHaveTextContent(
      "Completed document: Available in LAGDA under Records");
  });

  it("keeps accurate access wording for old saved email settings", () => {
    stable.draft = { id: "draft_1", settings: { ...DEFAULT_PREP_SETTINGS, completion: { emailFinalCopy: false } } };
    open();
    expect(screen.getByTestId("review-final-copy")).toHaveTextContent(
      "Completed document: Available in LAGDA under Records");
  });

  it("shows the expiration date beside it", () => {
    stable.draft = {
      id: "draft_1",
      settings: { ...DEFAULT_PREP_SETTINGS, expiration: { enabled: true, expiresAt: "2026-11-20" } },
    };
    open();
    expect(screen.getByText(/Expiration: November 20, 2026/)).toBeInTheDocument();
  });

  it("no longer reports a verification record or a notification", () => {
    open();
    expect(screen.queryByText(/Verification record:/)).toBeNull();
    expect(screen.queryByText(/Notify/)).toBeNull();
  });

  it("states the reminders, by default and as chosen", () => {
    const { unmount } = open();
    expect(screen.getByTestId("review-reminders")).toHaveTextContent("Reminders: First after 3 days, then every 3 days");
    unmount();
    stable.draft = { id: "draft_1", settings: { ...DEFAULT_PREP_SETTINGS, reminders: { ...DEFAULT_PREP_SETTINGS.reminders, firstReminderDays: 1, repeatIntervalDays: 7 } } };
    const view = open();
    expect(screen.getByTestId("review-reminders")).toHaveTextContent("Reminders: First after 1 day, then every 7 days");
    view.unmount();
    stable.draft = { id: "draft_1", settings: { ...DEFAULT_PREP_SETTINGS, reminders: { ...DEFAULT_PREP_SETTINGS.reminders, enabled: false } } };
    open();
    expect(screen.getByTestId("review-reminders")).toHaveTextContent("Reminders: Off");
  });
});
