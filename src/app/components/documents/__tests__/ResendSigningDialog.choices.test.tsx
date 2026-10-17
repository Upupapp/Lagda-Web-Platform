// Send again says what it keeps, and hands it to the send.
//
// The new request used to forget whether participants were emailed the
// completed document and what the reminders were. The dialog reads them from
// the request it repeats, says so in one line, and passes them on; where they
// cannot be read it says nothing and sends as it always did.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const svc = vi.hoisted(() => ({ currentParticipants: vi.fn(), resendToSame: vi.fn(), resend: vi.fn() }));
vi.mock("../../../services/real/resend-signing.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/resend-signing.service")>()),
  resendSigningService: svc,
}));

const read = vi.hoisted(() => vi.fn());
vi.mock("../../../services/real/resend-choices", async (original) => ({
  ...(await original<typeof import("../../../services/real/resend-choices")>()),
  readPreviousChoices: (...args: unknown[]) => read(...args) as unknown,
}));

const identity = vi.hoisted(() => ({ availability: vi.fn(), requirements: vi.fn(), checks: vi.fn(), replaceRequirements: vi.fn() }));
vi.mock("../../../services/real/identity-check.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/identity-check.service")>()),
  realIdentityCheckService: identity,
}));
vi.mock("../../../services/real/document.service", () => ({ realDocumentService: { titleSuggestion: vi.fn() } }));
vi.mock("../../brand/BrandToast", () => ({ toastSuccess: vi.fn() }));
vi.mock("../../../config/process-screens", () => ({
  withProcess: (_kind: string, _who: string, work: () => Promise<unknown>) => work(),
}));

import { ResendSigningDialog } from "../ResendSigningDialog";

const open = (signingRequestId: string | null = "sr_old") => {
  const onSent = vi.fn();
  render(<ResendSigningDialog workspaceId="ws" documentId="doc" documentTitle="Lease" onClose={vi.fn()} onSent={onSent}
    {...(signingRequestId === null ? {} : { signingRequestId })} />);
  return onSent;
};
const sendTo = async (address: string) => {
  await userEvent.type(screen.getByLabelText("Email addresses"), address);
  await userEvent.click(screen.getByRole("button", { name: /Send links/ }));
  await waitFor(() => { expect(svc.resend).toHaveBeenCalledTimes(1); });
};

beforeEach(() => {
  vi.clearAllMocks();
  svc.currentParticipants.mockResolvedValue([]);
  svc.resend.mockResolvedValue({ signingRequestId: "sr_new", sentTo: 1, documentTitle: "Lease (2)" });
  identity.availability.mockResolvedValue({ available: false });
  identity.requirements.mockResolvedValue([]);
  identity.checks.mockResolvedValue([]);
});

describe("Send again keeps the earlier choices", () => {
  it("says what is kept, and passes it to the send, when both were switched off", async () => {
    const choices = { emailFinalCopy: false, reminders: { enabled: false, firstAfterDays: 3, everyDays: 3 } };
    read.mockResolvedValue(choices);
    open();
    expect(await screen.findByTestId("resend-kept-choices")).toHaveTextContent(
      "Same as before: participants are not emailed the completed document; reminders are off.");
    expect(read).toHaveBeenCalledWith("ws", "sr_old");
    await sendTo("new@x.com");
    expect(svc.resend.mock.calls[0]![3]).toEqual({ choices });
  });

  it("says custom reminder days in plain words", async () => {
    read.mockResolvedValue({ emailFinalCopy: true, reminders: { enabled: true, firstAfterDays: 1, everyDays: 7 } });
    open();
    expect(await screen.findByTestId("resend-kept-choices")).toHaveTextContent(
      "Same as before: participants are emailed the completed document; reminders first after 1 day, then every 7 days.");
  });

  it("says nothing and sends as it always did when they cannot be read", async () => {
    read.mockResolvedValue(null);
    open();
    await waitFor(() => { expect(read).toHaveBeenCalled(); });
    expect(screen.queryByTestId("resend-kept-choices")).toBeNull();
    await sendTo("new@x.com");
    expect(svc.resend.mock.calls[0]).toHaveLength(3);
  });

  it("reads nothing for a draft, which has no earlier request", () => {
    open(null);
    expect(read).not.toHaveBeenCalled();
    expect(screen.queryByTestId("resend-kept-choices")).toBeNull();
  });
});
