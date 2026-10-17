/* eslint-disable testing-library/prefer-user-event, testing-library/no-unnecessary-act -- these files run on a held clock (fake timers), where userEvent waits on timers; fireEvent does not. */
// The reviewers' pages: the list by status, and one application with the name
// comparison, its documents, and Approve (with the directory picker) or Reject.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const adminList = vi.fn();
const adminGet = vi.fn();
const approve = vi.fn();
const reject = vi.fn();
vi.mock("../../../../../services/real/notary-applications.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/notary-applications.service")>()),
  realNotaryApplicationsService: {
    adminList: (...a: unknown[]) => adminList(...a) as unknown, adminGet: (...a: unknown[]) => adminGet(...a) as unknown,
    approve: (...a: unknown[]) => approve(...a) as unknown, reject: (...a: unknown[]) => reject(...a) as unknown,
    adminFileUrl: (u: string, f: string) => `/admin/notary-applications/${u}/files/${f}`,
  },
}));

import { AdminNotaryApplicationsPage } from "../AdminNotaryApplicationsPage";
import { AdminNotaryApplicationPage, NAME_MATCH_WORDS } from "../AdminNotaryApplicationPage";
import { filterEntries, parseDirectoryScript, entryLabel } from "../directory-entries";
import { ApiError } from "../../../../../services/api-client";
import {
  EMPTY_FIELDS, type AdminApplicationDetail, type NameMatch,
} from "../../../../../services/real/notary-applications.service";

const LAWYERS = [
  { id: "ana-cruz", kind: "lawyer", name: "Ana Maria Cruz", firm: "Cruz Law", city: "Makati City", province: "Metro Manila" },
  { id: "ben-lim", kind: "lawyer", name: "Ben Lim", firm: "Lim & Co", city: "Cebu City", province: "Cebu" },
  { id: "cruz-office", kind: "office", name: "Cruz Law Office", firm: "Cruz Law", city: "Makati City", province: "Metro Manila" },
];

const detail = (over: Partial<AdminApplicationDetail> = {}, status: AdminApplicationDetail["application"]["status"] = "submitted", match: NameMatch | null = "match"): AdminApplicationDetail => ({
  userId: "u1",
  application: {
    ...EMPTY_FIELDS, office: "Cruz Law", city: "Makati City", rollNo: "12345", listingConsent: true, agreementVersion: "2026-10",
    status, legalName: "Ana Maria Cruz", directoryId: null, agreementAcceptedAt: null, submittedAt: "2026-10-16T02:00:00.000Z", reviewedAt: null, reviewNote: null,
  },
  files: [
    { id: "f1", kind: "commission", filename: "commission.pdf", mediaType: "application/pdf", sizeBytes: 4096, scanState: "clean" },
    { id: "f2", kind: "photo", filename: "me.png", mediaType: "image/png", sizeBytes: 900, scanState: "pending" },
  ],
  account: { verifiedName: "Ana Maria Cruz", profileName: "Ana Cruz", nameMatch: match, email: null },
  candidate: null,
  invitations: [{ id: "eni_1", status: "claimed", clientName: "Ben Lim", notaryName: "Ana Maria Cruz", createdAt: "2026-10-16T05:00:00.000Z" }],
  ...over,
});

const settle = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const press = (el: HTMLElement) => { fireEvent.click(el); };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(`window.LAWYERS = ${JSON.stringify(LAWYERS)};`, { status: 200 }))));
});
afterEach(() => { vi.useRealTimers(); });

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/app/admin/notary-applications/u1"]}>
      <Routes><Route path="/app/admin/notary-applications/:userId" element={<AdminNotaryApplicationPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe("the list", () => {
  const rows = [
    { userId: "u1", legalName: "Ana Maria Cruz", office: "Cruz Law", city: "Makati City", status: "submitted", submittedAt: "2026-10-16T02:00:00.000Z", commissionValidUntil: null },
    { userId: "u2", legalName: null, office: "", city: "", status: "approved", submittedAt: null, commissionValidUntil: null },
  ];

  it("lists the applications to review first, each opening its own page", async () => {
    adminList.mockResolvedValue(rows);
    render(<MemoryRouter><AdminNotaryApplicationsPage /></MemoryRouter>);
    await settle();
    expect(adminList).toHaveBeenCalledWith("submitted");
    const links = within(screen.getByTestId("admin-list")).getAllByRole("link");
    expect(links.map(link => link.getAttribute("href"))).toEqual(["/app/admin/notary-applications/u1", "/app/admin/notary-applications/u2"]);
    expect(links[0]).toHaveTextContent("Ana Maria Cruz");
    expect(links[1]).toHaveTextContent("Name not on record yet");
    expect(screen.getAllByTestId("admin-status").map(item => item.textContent)).toEqual(["To review", "Approved"]);
  });

  it("filters by status with the tabs, and says when nothing is there", async () => {
    adminList.mockResolvedValue(rows);
    render(<MemoryRouter><AdminNotaryApplicationsPage /></MemoryRouter>);
    await settle();
    adminList.mockResolvedValue([]);
    press(screen.getByRole("tab", { name: "Approved" }));
    await settle();
    expect(adminList).toHaveBeenLastCalledWith("approved");
    expect(screen.getByRole("tab", { name: "Approved" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("admin-empty")).toBeInTheDocument();
    press(screen.getByRole("tab", { name: "All" }));
    await settle();
    expect(adminList).toHaveBeenLastCalledWith("");
  });

  it("says not available to anyone who is not a reviewer (the server's 404)", async () => {
    adminList.mockResolvedValue(null);
    render(<MemoryRouter><AdminNotaryApplicationsPage /></MemoryRouter>);
    await settle();
    expect(screen.getByText("Not available on this account yet.")).toBeInTheDocument();
  });

  it("offers a retry when it cannot be loaded", async () => {
    adminList.mockRejectedValueOnce(new ApiError(500, undefined, "x")).mockResolvedValue(rows);
    render(<MemoryRouter><AdminNotaryApplicationsPage /></MemoryRouter>);
    await settle();
    press(screen.getByRole("button", { name: "Try again" }));
    await settle();
    expect(screen.getByTestId("admin-list")).toBeInTheDocument();
  });
});

describe("one application", () => {
  it("shows the fields, the documents with their scan state, and the requests bound to the account", async () => {
    adminGet.mockResolvedValue(detail());
    renderDetail();
    await settle();
    expect(screen.getByTestId("application-fields")).toHaveTextContent("12345");
    const files = screen.getAllByTestId("admin-file");
    expect(files).toHaveLength(2);
    expect(within(files[0]!).getByRole("link", { name: /Open/ })).toHaveAttribute("href", "http://api.test/admin/notary-applications/u1/files/f1");
    // A file still being checked cannot be opened.
    expect(within(files[1]!).queryByRole("link")).toBeNull();
    expect(files[1]).toHaveTextContent("Checking for viruses…");
    expect(screen.getByTestId("application-invitations")).toHaveTextContent("Ben Lim");
  });

  it.each([
    ["match", "Names match"], ["close", "Names are close"], ["mismatch", "Names do not match"],
  ] as const)("compares the names: %s", async (match, words) => {
    adminGet.mockResolvedValue(detail({}, "submitted", match));
    renderDetail();
    await settle();
    expect(screen.getByTestId("verified-name")).toHaveTextContent("Ana Maria Cruz");
    expect(screen.getByTestId("legal-name")).toHaveTextContent("Ana Cruz");
    expect(screen.getByTestId("name-match")).toHaveTextContent(words);
    expect(NAME_MATCH_WORDS[match].label).toBe(words);
  });

  it("says when the server has no comparison", async () => {
    adminGet.mockResolvedValue(detail({}, "submitted", null));
    renderDetail();
    await settle();
    expect(screen.getByTestId("name-match")).toHaveAttribute("data-match", "none");
  });

  it("approves after a confirmation, with the directory entry that was picked", async () => {
    adminGet.mockResolvedValue(detail());
    approve.mockResolvedValue(undefined);
    renderDetail();
    await settle();
    fireEvent.change(screen.getByLabelText(/Tie to a Notary Directory entry/), { target: { value: "cruz" } });
    const picker = screen.getByLabelText("Entry");
    expect(within(picker).getAllByRole("option").map(option => option.textContent)).toEqual([
      "No entry chosen", "Ana Maria Cruz — Cruz Law, Makati City", "Cruz Law Office (office) — Cruz Law, Makati City",
    ]);
    fireEvent.change(picker, { target: { value: "ana-cruz" } });
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "Checked the roll." } });
    press(screen.getByRole("button", { name: "Approve" }));
    expect(approve).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Ana Maria Cruz — Cruz Law, Makati City");
    expect(dialog).toHaveTextContent("does not make them accredited");
    adminGet.mockResolvedValue(detail({}, "approved"));
    press(within(dialog).getByRole("button", { name: "Approve" }));
    await settle();
    expect(approve).toHaveBeenCalledWith("u1", { directoryId: "ana-cruz", note: "Checked the roll." });
    expect(screen.getByRole("status")).toHaveTextContent("Approved. The notary was told.");
    expect(screen.queryByTestId("approve-panel")).toBeNull();
  });

  it("suggests a listing that has exactly the applicant's name and nobody else holds", async () => {
    adminGet.mockResolvedValue(detail({ candidate: { directoryId: "ana-cruz", name: "Ana Maria Cruz", taken: false } }));
    approve.mockResolvedValue(undefined);
    renderDetail();
    await settle();
    expect(screen.getByTestId("candidate-hint")).toHaveTextContent("exactly this name and is suggested");
    expect(screen.getByLabelText("Entry")).toHaveValue("ana-cruz");
    press(screen.getByRole("button", { name: "Approve" }));
    press(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Approve" }));
    await settle();
    expect(approve).toHaveBeenCalledWith("u1", { directoryId: "ana-cruz", note: "" });
  });

  it("does not suggest a listing another notary already holds", async () => {
    adminGet.mockResolvedValue(detail({ candidate: { directoryId: "ana-cruz", name: "Ana Maria Cruz", taken: true } }));
    renderDetail();
    await settle();
    expect(screen.getByTestId("candidate-hint")).toHaveTextContent(/already held by another notary/);
    expect(screen.getByLabelText("Entry")).toHaveValue("");
  });

  it("approves with no entry when none was chosen", async () => {
    adminGet.mockResolvedValue(detail());
    approve.mockResolvedValue(undefined);
    renderDetail();
    await settle();
    press(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("No Notary Directory entry is chosen");
    press(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Approve" }));
    await settle();
    expect(approve).toHaveBeenCalledWith("u1", { directoryId: "", note: "" });
  });

  it.each([
    ["commission_expired", /already ended/], ["directory_entry_taken", /already tied to another notary/], ["other", /could not be done/],
  ])("says what an approval refusal (%s) means", async (code, words) => {
    adminGet.mockResolvedValue(detail());
    approve.mockRejectedValue(new ApiError(409, { code, message: code }, code));
    renderDetail();
    await settle();
    press(screen.getByRole("button", { name: "Approve" }));
    press(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Approve" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(words);
  });

  it("will not reject without a reason, and sends the reason when there is one", async () => {
    adminGet.mockResolvedValue(detail());
    reject.mockResolvedValue(undefined);
    renderDetail();
    await settle();
    press(screen.getByRole("button", { name: "Do not approve" }));
    press(screen.getByRole("button", { name: "Send: not approved" }));
    expect(reject).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Write the reason");
    fireEvent.change(screen.getByLabelText("Reason the applicant will read"), { target: { value: "The commission scan is unreadable." } });
    adminGet.mockResolvedValue(detail({}, "rejected"));
    press(screen.getByRole("button", { name: "Send: not approved" }));
    await settle();
    expect(reject).toHaveBeenCalledWith("u1", "The commission scan is unreadable.");
    expect(screen.getByRole("status")).toHaveTextContent("Not approved.");
  });

  it("offers no decision on an application that is not waiting", async () => {
    adminGet.mockResolvedValue(detail({}, "approved"));
    renderDetail();
    await settle();
    expect(screen.queryByTestId("approve-panel")).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("says not available when the server does not show it to this account", async () => {
    adminGet.mockResolvedValue(null);
    renderDetail();
    await settle();
    expect(screen.getByText("Not available on this account yet.")).toBeInTheDocument();
  });
});

describe("the directory picker's data", () => {
  it("reads the array out of the directory's script and ignores anything else", () => {
    const entries = parseDirectoryScript(`// header\nwindow.LAWYERS = ${JSON.stringify(LAWYERS)};`);
    expect(entries.map(entry => entry.id)).toEqual(["ana-cruz", "ben-lim", "cruz-office"]);
    expect(entries[2]?.kind).toBe("office");
    expect(parseDirectoryScript("nothing here")).toEqual([]);
    expect(parseDirectoryScript("window.LAWYERS = [oops];")).toEqual([]);
    expect(parseDirectoryScript('window.LAWYERS = [{"id": 1}, {"id": "x", "name": "X"}];').map(entry => entry.id)).toEqual(["x"]);
  });

  it("filters by every word typed, in the name, firm or city", () => {
    const entries = parseDirectoryScript(JSON.stringify(LAWYERS));
    expect(filterEntries(entries, "").length).toBe(3);
    expect(filterEntries(entries, "cruz makati").map(entry => entry.id)).toEqual(["ana-cruz", "cruz-office"]);
    expect(filterEntries(entries, "cebu").map(entry => entry.id)).toEqual(["ben-lim"]);
    expect(filterEntries(entries, "nobody")).toEqual([]);
    expect(entryLabel(entries[0]!)).toBe("Ana Maria Cruz — Cruz Law, Makati City");
  });
});
