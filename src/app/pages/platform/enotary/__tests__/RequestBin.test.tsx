// 132. The trash bin of requests: moving one in after asking, restoring and deleting one, restoring all and emptying.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const svc = { list: vi.fn(), trash: vi.fn(), restore: vi.fn(), remove: vi.fn(), restoreAll: vi.fn(), empty: vi.fn() };
vi.mock("../../../../services/real/enotary-bin.service", async (original) => ({
  ...(await original<typeof import("../../../../services/real/enotary-bin.service")>()),
  realEnotaryBinService: new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => (svc as Record<string, (...a: unknown[]) => unknown>)[name]?.(...args) }),
}));

import { RequestBinButton, RequestBinPanel, useMoveToTrash } from "../RequestBin";
import type { BinItem } from "../../../../services/real/enotary-bin.service";

const item = (over: Partial<BinItem> = {}): BinItem => ({
  id: "eni_1", reference: "EN-2026-000118", role: "client", otherParty: "Aiyana Yasmin A. Cruz", outcome: "cancelled",
  documentLabel: "Affidavit or sworn statement", createdAt: "2026-11-09T14:35:00.000Z", trashedAt: "2026-11-09T14:36:00.000Z", ...over,
});
const user = () => userEvent.setup({ pointerEventsCheck: 0 });
/** The result screen after each action, when it shows. */
const dismiss = async () => {
  const ok = await screen.findByRole("button", { name: /^OK/ }, { timeout: 4000 }).catch(() => null);
  if (ok !== null) await user().click(ok);
};

function Mover({ onMoved }: { onMoved: (id: string) => void }) {
  const mover = useMoveToTrash(onMoved);
  return <>{mover.button("eni_9", "Atty. Cruz")}{mover.confirmDialog}{mover.problem !== null && <p role="alert">{mover.problem}</p>}</>;
}

describe("the trash bin of requests", () => {
  beforeEach(() => { for (const fn of Object.values(svc)) fn.mockReset(); });

  it("counts what is in it on its button", () => {
    render(<RequestBinButton count={3} onClick={() => undefined} />);
    expect(screen.getByRole("button", { name: "Trash, 3 requests" })).toBeInTheDocument();
    expect(screen.getByTestId("bin-count")).toHaveTextContent("3");
  });

  it("asks before moving a request to the trash, and says nothing changes for the other party", async () => {
    svc.trash.mockResolvedValue(undefined);
    const onMoved = vi.fn();
    render(<Mover onMoved={onMoved} />);
    await user().click(screen.getByTestId("move-to-trash"));
    const ask = screen.getByRole("alertdialog");
    expect(ask).toHaveTextContent(/Nothing changes for Atty. Cruz/);
    await user().click(within(ask).getByRole("button", { name: "Move to trash" }));
    await dismiss();
    await waitFor(() => { expect(onMoved).toHaveBeenCalledWith("eni_9"); });
    expect(svc.trash).toHaveBeenCalledWith("eni_9");
  }, 15_000);

  it("restores one at once, and deletes one only after asking, saying the records are kept", async () => {
    svc.list.mockResolvedValueOnce([item(), item({ id: "eni_2", outcome: "notarized" })]).mockResolvedValue([item({ id: "eni_2", outcome: "notarized" })]);
    svc.restore.mockResolvedValue(1);
    svc.remove.mockResolvedValue(1);
    const onChanged = vi.fn();
    render(<RequestBinPanel role="client" onClose={() => undefined} onChanged={onChanged} />);
    expect(await screen.findAllByTestId("bin-item")).toHaveLength(2);
    expect(screen.getByTestId("bin-total")).toHaveTextContent("2 requests in the trash");
    await user().click(screen.getAllByTestId("bin-restore")[0]!);
    await dismiss();
    await waitFor(() => { expect(svc.restore).toHaveBeenCalledWith("eni_1", "client"); });
    await waitFor(() => { expect(onChanged).toHaveBeenCalled(); });
    expect(await screen.findAllByTestId("bin-item")).toHaveLength(1);
    await user().click(screen.getByTestId("bin-delete"));
    const ask = screen.getByRole("alertdialog");
    expect(ask).toHaveTextContent(/cannot be brought back/);
    expect(ask).toHaveTextContent(/notarized document and the notary's records are kept/);
    await user().click(within(ask).getByRole("button", { name: "Delete for good" }));
    await dismiss();
    await waitFor(() => { expect(svc.remove).toHaveBeenCalledWith("eni_2", "client"); });
  }, 30_000);

  it("restores all, and empties the trash, each after asking; the notary's note names their Notary Book", async () => {
    svc.list.mockResolvedValue([item({ role: "notary", otherParty: "Rosa Villanueva" }), item({ id: "eni_2", role: "notary", otherParty: "Ben Lim" })]);
    svc.restoreAll.mockResolvedValue(2);
    svc.empty.mockResolvedValue(2);
    render(<RequestBinPanel role="notary" onClose={() => undefined} onChanged={() => undefined} />);
    await screen.findAllByTestId("bin-item");
    expect(screen.getByText(/Your Notary Book entry, the notarized document and the audit trail are kept/)).toBeInTheDocument();
    await user().click(screen.getByTestId("bin-restore-all"));
    await user().click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Restore all" }));
    await dismiss();
    await waitFor(() => { expect(svc.restoreAll).toHaveBeenCalledWith("notary"); });
    await user().click(await screen.findByTestId("bin-empty"));
    await user().click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Empty the trash" }));
    await dismiss();
    await waitFor(() => { expect(svc.empty).toHaveBeenCalledWith("notary"); });
  }, 30_000);

  it("shows an empty trash plainly, and closes on Escape", async () => {
    svc.list.mockResolvedValue([]);
    const onClose = vi.fn();
    render(<RequestBinPanel role="client" onClose={onClose} onChanged={() => undefined} />);
    expect(await screen.findByTestId("bin-empty-state")).toHaveTextContent("The trash is empty.");
    expect(screen.queryByTestId("bin-restore-all")).toBeNull();
    await user().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
