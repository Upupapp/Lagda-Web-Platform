// Real settings expose reminders and expiry; completed copies are accessed in Records.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const { updateSettings, stable, platform } = vi.hoisted(() => {
  const updateSettings = vi.fn();
  const stable: { draft: { id: string; settings?: unknown }; [key: string]: unknown } = {
    draft: { id: "draft_1" },
    updateSettings,
    setStep: () => undefined,
    validate: () => ({ errors: [], warnings: [] }),
  };
  const platform: { user: { preferredSenderName?: string } } = { user: { preferredSenderName: "Reyes Law Office" } };
  return { updateSettings, stable, platform };
});
vi.mock("../../../../context/PrepareContext", () => ({ usePrepare: () => stable }));
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { SettingsStep } from "../SettingsStep";
import { DEFAULT_PREP_SETTINGS, COMPLETED_DOCUMENT_ACCESS_NOTE } from "../../../../models/prepare";

const open = () => render(<MemoryRouter><SettingsStep /></MemoryRouter>);

beforeEach(() => {
  updateSettings.mockReset();
  stable.draft = { id: "draft_1" };
  platform.user = { preferredSenderName: "Reyes Law Office" };
});

describe("Settings: the controls that reached nothing are gone", () => {
  it.each([
    ["the invitation subject", /Subject line/],
    ["the personal note", /^Message/],
    ["the per-document sender name", /Sender display name/],
    ["notify me when complete", /Notify me when complete/],
    ["create a verification record", /Create a verification record/],
  ])("does not offer %s", (_what, label) => {
    open();
    expect(screen.queryByLabelText(label)).toBeNull();
    expect(screen.queryByText(label)).toBeNull();
  });

  it("has no text box left to type an invitation into", () => {
    open();
    expect(screen.queryAllByRole("textbox")).toEqual([]);
    expect(screen.queryByPlaceholderText(/personal note/i)).toBeNull();
  });

  it("still says whose name recipients see, and where to change it", () => {
    open();
    const note = screen.getByTestId("sender-display-note");
    expect(note).toHaveTextContent(
      "Recipients see Reyes Law Office as the sender — your profile's Sender Display name. Change it in Settings › Profile.");
  });

  it("says the same without a name to show", () => {
    platform.user = {};
    open();
    expect(screen.getByTestId("sender-display-note")).toHaveTextContent(
      "Recipients see your profile's Sender Display name as the sender. Change it in Settings › Profile.");
  });

  it("describes what is left: reminders, expiration and the completed copy", () => {
    open();
    expect(screen.getByText(
      "Choose when participants are reminded and set an optional expiration date. Completed copies are available in LAGDA under Records.")).toBeInTheDocument();
    expect(screen.getByText("Reminders on · No expiration · Completed copy in Records")).toBeInTheDocument();
    expect(screen.queryByText(/Configure how invitations are sent/)).toBeNull();
  });

  it("does not say the sender is told when a document expires", () => {
    open();
    expect(screen.queryByText(/you are told in LAGDA/)).toBeNull();
  });
});

describe("Settings: reminders (live build)", () => {
  const remindersSwitch = () => screen.getByRole("checkbox", { name: /Remind participants who have not acted/ });

  it("are on by default, 3 days then every 3, with the fixed rule beside them", () => {
    open();
    expect(remindersSwitch()).toBeChecked();
    expect(screen.getByLabelText("First reminder after")).toHaveValue(3);
    expect(screen.getByLabelText("Then every")).toHaveValue(3);
    expect(screen.getByTestId("reminder-rule")).toHaveTextContent(
      "Up to 3 reminders, until they act. Reminders stop when the document is completed, declined, cancelled or expires.");
    expect(screen.getByTestId("rail-reminders")).toHaveTextContent("Reminders: first after 3 days, then every 3 days.");
  });

  it("saves the switch and the days", async () => {
    open();
    await userEvent.click(remindersSwitch());
    expect(updateSettings).toHaveBeenLastCalledWith(expect.objectContaining({
      reminders: expect.objectContaining({ enabled: false }),
    }));
  });

  it("shows a draft with reminders off as off, its days disabled", () => {
    stable.draft = { id: "draft_1", settings: { ...DEFAULT_PREP_SETTINGS, reminders: { ...DEFAULT_PREP_SETTINGS.reminders, enabled: false } } };
    open();
    expect(remindersSwitch()).not.toBeChecked();
    expect(screen.getByLabelText("First reminder after")).toBeDisabled();
    expect(screen.getByTestId("rail-reminders")).toHaveTextContent("Reminders are off.");
    expect(screen.getByText("Reminders off · No expiration · Completed copy in Records")).toBeInTheDocument();
  });

  it("reads a draft with no reminder settings as on", () => {
    stable.draft = { id: "draft_1", settings: { expiration: { enabled: false, expiresAt: null } } };
    open();
    expect(remindersSwitch()).toBeChecked();
  });
});

describe("Settings: current completed-document access", () => {
  it("explains Records access instead of offering an ineffective email switch", () => {
    open();
    expect(screen.queryByRole("checkbox", { name: /Email participants/ })).toBeNull();
    expect(screen.getByTestId("completed-document-access")).toHaveTextContent(COMPLETED_DOCUMENT_ACCESS_NOTE);
    expect(screen.getByTestId("rail-final-copy")).toHaveTextContent("Completed document available in RecordsOn");
    expect(updateSettings).not.toHaveBeenCalled();
  });
  it("does not repeat an email promise from an old saved setting", () => {
    stable.draft = { id: "draft_1", settings: { ...DEFAULT_PREP_SETTINGS, completion: { emailFinalCopy: false } } };
    open();
    expect(screen.getByTestId("completed-document-access")).toHaveTextContent(COMPLETED_DOCUMENT_ACCESS_NOTE);
    expect(screen.queryByRole("checkbox", { name: /Email participants/ })).toBeNull();
  });
});
