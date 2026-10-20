// The notary's register page: what the server lists, in the order of its entries, and what is said when there is none.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";

const register = vi.fn();
vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true }));
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: { register: (...a: unknown[]) => register(...a) as unknown },
}));

import { NotaryRegisterPage } from "../NotaryRegisterPage";
import type { NotaryRegister, RegisterEntry } from "../../../../../services/real/enotary-sessions.service";

const entry = (over: Partial<RegisterEntry> = {}): RegisterEntry => ({
  sessionId: "ens_1", invitationId: "eni_1", reference: "EN-2026-000001", docNo: 1, pageNo: 1, bookNo: "I", series: 2026, registerRef: "2026-0001",
  notarizedAt: "2026-10-13T00:57:00.000Z", clientName: "Angela Ramos", documentName: "Deed of Absolute Sale - Lot 14", actLabel: "Acknowledgment",
  feeCentavos: 60_000, copy: null, ...over,
});
const book = (entries: RegisterEntry[]): NotaryRegister => ({
  notaryName: "Miguel Fernandez", commissionNo: "2026-0147", commissionValidUntil: "2027-12-31", place: "Cebu City, Cebu", entries,
});
const open = () => render(<MemoryRouter><NotaryRegisterPage /></MemoryRouter>);

beforeEach(() => { register.mockReset(); });

describe("the notarial register", () => {
  it("lists every notarized document with its numbers, client, act, fee and the state of its copy", async () => {
    register.mockResolvedValue(book([
      entry(),
      entry({ sessionId: "ens_2", invitationId: "eni_2", docNo: 2, reference: "EN-2026-000002", documentName: "Special Power of Attorney", copy: { status: "received", mode: "physical", stage: "delivered", trackingNo: "123456789012" } }),
    ]));
    open();
    expect(await screen.findByRole("heading", { level: 1, name: "Notary Book" })).toBeInTheDocument();
    expect(screen.getByTestId("register-commission")).toHaveTextContent("Commission No. 2026-0147, until 31 December 2027 · Cebu City, Cebu");
    const rows = screen.getAllByTestId("register-entry");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Angela Ramos");
    expect(rows[0]).toHaveTextContent("Deed of Absolute Sale - Lot 14");
    expect(rows[0]).toHaveTextContent("PHP 600.00");
    expect(rows[0]).toHaveTextContent("None asked for");
    expect(within(rows[1]!).getByTestId("register-copy")).toHaveTextContent("Copy received by the client");
    expect(within(rows[1]!).getByTestId("register-copy")).toHaveTextContent("123456789012");
    expect(within(rows[1]!).getByRole("link", { name: "Special Power of Attorney" })).toHaveAttribute("href", "/app/enotary/desk/eni_2");
  });

  it("finds an entry by what a person would type, and by year, and offers the spreadsheet and the monthly report", async () => {
    const user = userEvent.setup();
    register.mockResolvedValue(book([
      entry({ clientPlace: "Naga City, Camarines Sur", clientIdType: "Passport", documentKindLabel: "Affidavit or sworn statement", remarks: "Read aloud" }),
      entry({ sessionId: "ens_2", invitationId: "eni_2", docNo: 1, series: 2025, clientName: "Dan Uy", documentName: "Lease", reference: "EN-2025-000009", notarizedAt: "2025-03-02T01:00:00.000Z" }),
    ]));
    open();
    expect(await screen.findAllByTestId("register-entry")).toHaveLength(2);
    expect(screen.getAllByTestId("register-entry")[0]).toHaveTextContent("Naga City, Camarines Sur · Passport");
    expect(screen.getAllByTestId("register-entry")[0]).toHaveTextContent("Read aloud");
    await user.type(screen.getByLabelText("Find an entry"), "dan lease");
    expect(screen.getAllByTestId("register-entry")).toHaveLength(1);
    expect(screen.getByTestId("register-count")).toHaveTextContent("1 of 2 entries");
    await user.clear(screen.getByLabelText("Find an entry"));
    await user.selectOptions(screen.getByLabelText("Year"), "2026");
    expect(screen.getAllByTestId("register-entry")).toHaveLength(1);
    await user.type(screen.getByLabelText("Find an entry"), "nobody");
    expect(screen.getByTestId("register-none")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export as a spreadsheet/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Prepare the report/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Month of the report")).toBeInTheDocument();
  });

  it("says plainly that nothing is in the register yet", async () => {
    register.mockResolvedValue(book([]));
    open();
    expect(await screen.findByTestId("register-empty")).toHaveTextContent(/entered here when you seal it/);
  });

  it("says it is not offered to someone who is not a notary, and offers a retry when the server fails", async () => {
    register.mockRejectedValueOnce(Object.assign(new Error("no"), { status: 404 }));
    const view = open();
    expect(await screen.findByText("Not available on this account yet.")).toBeInTheDocument();
    view.unmount();
    register.mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 500 }));
    open();
    await waitFor(() => { expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument(); });
  });
});
