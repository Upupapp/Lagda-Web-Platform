// The notary application: the form's steps and what it says is missing, the
// uploads and their scan states, the refusals on submit, and the status pages
// that follow.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const read = vi.fn();
const save = vi.fn();
const submit = vi.fn();
const withdraw = vi.fn();
const upload = vi.fn();
const removeFile = vi.fn();
vi.mock("../../../../../services/real/notary-applications.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/notary-applications.service")>()),
  realNotaryApplicationsService: {
    read: (...a: unknown[]) => read(...a) as unknown, save: (...a: unknown[]) => save(...a) as unknown,
    submit: (...a: unknown[]) => submit(...a) as unknown, withdraw: (...a: unknown[]) => withdraw(...a) as unknown,
    upload: (...a: unknown[]) => upload(...a) as unknown, removeFile: (...a: unknown[]) => removeFile(...a) as unknown,
    fileUrl: (id: string) => `/me/notary/application/files/${id}`,
  },
}));

import { NotaryApplyPage } from "../NotaryApplyPage";
import { ApiError } from "../../../../../services/api-client";
import {
  EMPTY_FIELDS, type ApplicationFile, type ApplicationView, type NotaryApplication,
} from "../../../../../services/real/notary-applications.service";
import {
  describeSubmitError, fieldErrorsFromRefusal, fileProblem, missingLabel, todayIso, validateStep, firstIncompleteStep, type FormValues,
} from "../application-form";

const AGREEMENT = { version: "2026-10", text: "LAGDA notary agreement.\nYou agree to be honest." };
const FILLED = {
  office: "Cruz Law", city: "Makati City", province: "Metro Manila", phone: "0917 000 0000", rollNo: "12345", ibpNo: "IBP-9", ptrNo: "PTR-1",
  commissionNo: "C-77", commissionCourt: "Executive Judge, Makati RTC", commissionValidFrom: "2026-01-01", commissionValidUntil: "2027-12-31",
  notarialJurisdiction: "Makati City",
};
const file = (kind: ApplicationFile["kind"], over: Partial<ApplicationFile> = {}): ApplicationFile =>
  ({ id: `f_${kind}`, kind, filename: `${kind}.pdf`, mediaType: "application/pdf", sizeBytes: 2048, scanState: "clean", ...over });
const application = (over: Partial<NotaryApplication> = {}): NotaryApplication => ({
  ...EMPTY_FIELDS, status: "draft", legalName: null, directoryId: null, agreementAcceptedAt: null, submittedAt: null, reviewedAt: null, reviewNote: null, ...over,
});
const viewOf = (app: NotaryApplication | null, files: ApplicationFile[] = []): ApplicationView => ({ application: app, files, agreement: AGREEMENT });
const complete = (over: Partial<NotaryApplication> = {}) => application({ ...FILLED, listingConsent: true, agreementVersion: AGREEMENT.version, ...over });
const allFiles = () => [file("commission"), file("roll"), file("photo")];

const settle = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const press = (el: HTMLElement) => { fireEvent.click(el); };
const type = (label: string | RegExp, value: string) => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };
const open = async (view: ApplicationView | null) => {
  read.mockResolvedValue(view);
  render(<MemoryRouter><NotaryApplyPage /></MemoryRouter>);
  await settle();
};
const text = (id: string) => (screen.getByTestId(id).textContent ?? "").replace(/\s+/g, " ");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-10-17T02:00:00.000Z"));
  save.mockImplementation((patch: Partial<NotaryApplication>) => Promise.resolve(viewOf(application(patch))));
});
afterEach(() => { vi.useRealTimers(); });

describe("the form's rules", () => {
  const values = (over: Partial<FormValues> = {}): FormValues => ({ ...EMPTY_FIELDS, ...FILLED, agreementAccepted: true, listingConsent: true, ...over });
  const today = "2026-10-17";

  it("asks for what is required on each step and nothing else", () => {
    expect(Object.keys(validateStep("personal", values({ office: " ", phone: "" }), [], today)).sort()).toEqual(["office", "phone"]);
    expect(validateStep("personal", values(), [], today)).toEqual({});
    expect(validateStep("credentials", values({ ibpChapter: "", mclePeriod: "" }), [], today)).toEqual({});
    expect(validateStep("credentials", values({ rollNo: "" }), [], today).rollNo).toMatch(/Enter the roll of Attorneys number/);
  });

  it("checks the commission dates: still valid, and not ending before it starts", () => {
    expect(validateStep("credentials", values({ commissionValidUntil: "2026-10-17" }), [], today).commissionValidUntil).toMatch(/future/);
    expect(validateStep("credentials", values({ commissionValidUntil: "2025-01-01" }), [], today).commissionValidUntil).toMatch(/future/);
    expect(validateStep("credentials", values({ commissionValidFrom: "2028-01-01" }), [], today).commissionValidUntil).toMatch(/before/);
    expect(validateStep("credentials", values({ ptrYear: "26" }), [], today).ptrYear).toMatch(/four-digit/);
  });

  it("needs a commission, a roll and a photo that were not rejected by the virus check", () => {
    expect(validateStep("documents", values(), [], today).files).toMatch(/notarial commission, roll of attorneys, your photo/);
    expect(validateStep("documents", values(), allFiles(), today)).toEqual({});
    expect(validateStep("documents", values(), [file("commission"), file("roll"), file("photo", { scanState: "infected" })], today).files).toMatch(/your photo/);
  });

  it("needs both ticks on the agreement step, and finds the first incomplete step", () => {
    expect(Object.keys(validateStep("agreement", values({ agreementAccepted: false, listingConsent: false }), [], today)).sort()).toEqual(["agreement", "listing"]);
    expect(firstIncompleteStep(values(), allFiles(), today)).toBeNull();
    expect(firstIncompleteStep(values({ city: "" }), allFiles(), today)).toBe("personal");
    expect(firstIncompleteStep(values(), [], today)).toBe("documents");
  });

  it("refuses a file before it is sent: wrong type, over 10 MB, empty", () => {
    expect(fileProblem({ name: "a.pdf", size: 10, type: "application/pdf" }, "roll")).toBeNull();
    expect(fileProblem({ name: "a.png", size: 10, type: "image/png" }, "roll")).toBeNull();
    expect(fileProblem({ name: "a.gif", size: 10, type: "image/gif" }, "roll")).toMatch(/PDF, JPEG or PNG/);
    expect(fileProblem({ name: "a.pdf", size: 10 * 1024 * 1024 + 1, type: "application/pdf" }, "roll")).toMatch(/10 MB/);
    expect(fileProblem({ name: "a.pdf", size: 0, type: "application/pdf" }, "roll")).toMatch(/empty/);
  });

  it("reads what the server says is missing in the form's own words", () => {
    expect(missingLabel("roll_no")).toBe("Roll of Attorneys number");
    expect(missingLabel("commissionValidUntil")).toBe("Commission valid until");
    expect(missingLabel("photo file")).toBe("Your photo");
    expect(missingLabel("roll file")).toBe("Roll of Attorneys document");
    expect(missingLabel("mystery")).toBe("mystery");
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("describes each refusal of a submission", () => {
    const make = (status: number, code: string, more: Record<string, unknown> = {}) => new ApiError(status, { code, message: code, ...more }, code);
    expect(describeSubmitError(make(409, "application_incomplete", { missing: ["phone"] }))).toMatchObject({ kind: "incomplete", missing: ["Phone number"] });
    expect(describeSubmitError(make(409, "file_scan_pending")).kind).toBe("scanning");
    expect(describeSubmitError(make(409, "identity_required")).kind).toBe("identity");
    expect(describeSubmitError(new ApiError(0, undefined, "x")).text).toMatch(/Could not reach/);
    expect(describeSubmitError(make(429, "x")).text).toMatch(/Too many/);
    expect(describeSubmitError(make(500, "x")).kind).toBe("other");
    expect(fieldErrorsFromRefusal(make(422, "validation_error", { details: [{ field: "phone", code: "x", message: "Too short" }, { field: "nope", code: "x", message: "" }] }))).toEqual({ phone: "Too short" });
  });
});

describe("the form, step by step", () => {
  it("starts a first application at Personal & office and saves the step before moving on", async () => {
    await open(viewOf(null));
    expect(screen.getByRole("heading", { level: 2, name: "Personal & office" })).toBeInTheDocument();
    press(screen.getByRole("button", { name: "Save and continue" }));
    await settle();
    expect(save).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(4);
    type(/Office or law firm/, " Cruz Law ");
    type(/City or municipality/, "Makati City");
    type(/Province/, "Metro Manila");
    type(/Phone number/, "0917 000 0000");
    press(screen.getByRole("button", { name: "Save and continue" }));
    await settle();
    expect(save).toHaveBeenCalledWith({ office: "Cruz Law", city: "Makati City", province: "Metro Manila", phone: "0917 000 0000" });
    expect(screen.getByRole("heading", { level: 2, name: "Credentials" })).toBeInTheDocument();
  });

  it("shows a refused save next to its field and stays on the step", async () => {
    save.mockRejectedValue(new ApiError(422, { code: "validation_error", message: "x", details: [{ field: "phone", code: "x", message: "That phone number is not valid." }] }, "x"));
    await open(viewOf(application({ ...FILLED })));
    // Complete, so it opens on the review; go back to the first step.
    await settle();
    for (let i = 0; i < 2; i++) press(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 2, name: "Personal & office" })).toBeInTheDocument();
    press(screen.getByRole("button", { name: "Save and continue" }));
    await settle();
    expect(screen.getByText("That phone number is not valid.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Personal & office" })).toBeInTheDocument();
  });

  it("opens a draft on the first step that is not complete", async () => {
    await open(viewOf(application({ office: "Cruz Law", city: "Makati", province: "Metro Manila", phone: "1" })));
    expect(screen.getByRole("heading", { level: 2, name: "Credentials" })).toBeInTheDocument();
  });

  it("lists the five steps with the current one marked", async () => {
    await open(viewOf(null));
    const rail = screen.getByRole("list", { name: "Application steps" });
    expect(within(rail).getAllByRole("listitem")).toHaveLength(5);
    expect(rail.querySelector('[aria-current="step"]')).toHaveTextContent("Personal & office");
  });
});

describe("documents", () => {
  const onDocuments = async (files: ApplicationFile[]) => {
    await open(viewOf(complete(), files));
    // A complete draft opens at the review (or at documents when files are missing).
  };

  it("opens at Documents when only the files are missing, and marks the required ones", async () => {
    await onDocuments([]);
    expect(screen.getByRole("heading", { level: 2, name: "Documents" })).toBeInTheDocument();
    expect(within(screen.getByTestId("slot-commission")).getByText(/\*/)).toBeInTheDocument();
    expect(within(screen.getByTestId("slot-ibp")).queryByText("*")).toBeNull();
  });

  it("uploads a file with its kind and shows it as being checked, then as checked", async () => {
    await onDocuments([]);
    upload.mockResolvedValue(file("commission", { scanState: "pending" }));
    const input = screen.getByLabelText("Add a file: Notarial commission");
    await act(async () => { fireEvent.change(input, { target: { files: [new File(["x"], "commission.pdf", { type: "application/pdf" })] } }); await vi.advanceTimersByTimeAsync(0); });
    expect(upload).toHaveBeenCalledWith("commission", expect.any(File));
    const row = within(screen.getByTestId("slot-commission")).getByTestId("file-row");
    expect(row).toHaveAttribute("data-scan", "pending");
    expect(row).toHaveTextContent("Checking for viruses…");
    expect(row.querySelector("a")).toHaveAttribute("href", "http://api.test/me/notary/application/files/f_commission");
    // The page asks again every 3 seconds while a file is being checked.
    read.mockResolvedValue(viewOf(complete(), [file("commission", { scanState: "clean" })]));
    await settle(3000);
    expect(within(screen.getByTestId("slot-commission")).getByTestId("file-row")).toHaveAttribute("data-scan", "clean");
    expect(within(screen.getByTestId("slot-commission")).getByTestId("file-row")).toHaveTextContent("Checked");
  });

  it("says why a file was refused without sending it", async () => {
    await onDocuments([]);
    const input = screen.getByLabelText("Add a file: Your photo");
    await act(async () => { fireEvent.change(input, { target: { files: [new File(["x"], "me.gif", { type: "image/gif" })] } }); await vi.advanceTimersByTimeAsync(0); });
    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("me.gif is not a PDF, JPEG or PNG file.");
  });

  it("shows a file the virus check rejected, and removes it", async () => {
    await onDocuments([file("commission", { scanState: "infected" }), file("roll"), file("photo")]);
    const row = within(screen.getByTestId("slot-commission")).getByTestId("file-row");
    expect(row).toHaveTextContent(/Rejected: a virus was found/);
    removeFile.mockResolvedValue(undefined);
    press(screen.getByRole("button", { name: "Remove commission.pdf" }));
    await settle();
    expect(removeFile).toHaveBeenCalledWith("f_commission");
    expect(within(screen.getByTestId("slot-commission")).queryByTestId("file-row")).toBeNull();
  });

  it("will not continue while a file is still being checked, or while one is missing", async () => {
    await onDocuments([file("commission", { scanState: "pending" }), file("roll"), file("photo")]);
    // It opens at the review, where sending waits for the check; go back to Documents.
    expect(screen.getByRole("button", { name: "Waiting for the document check…" })).toBeDisabled();
    press(screen.getByRole("button", { name: "Back" }));
    press(screen.getByRole("button", { name: "Back" }));
    press(screen.getByRole("button", { name: "Save and continue" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(/still being checked/);
    expect(screen.getByRole("heading", { level: 2, name: "Documents" })).toBeInTheDocument();
  });
});

describe("agreement and review", () => {
  it("shows the server's agreement text and needs both ticks", async () => {
    await open(viewOf(complete({ listingConsent: false, agreementVersion: null }), allFiles()));
    expect(screen.getByRole("heading", { level: 2, name: "Agreement & listing" })).toBeInTheDocument();
    expect(screen.getByTestId("agreement-text")).toHaveTextContent("You agree to be honest.");
    press(screen.getByRole("button", { name: "Save and continue" }));
    await settle();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    fireEvent.click(screen.getByLabelText(/I have read the agreement/));
    fireEvent.click(screen.getByLabelText(/may be listed in the LAGDA Notary Directory/));
    press(screen.getByRole("button", { name: "Save and continue" }));
    await settle();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ listingConsent: true, agreementVersion: "2026-10" }));
    expect(screen.getByRole("heading", { level: 2, name: "Review & submit" })).toBeInTheDocument();
  });

  it("submits a complete application and shows it as waiting for a reviewer", async () => {
    submit.mockResolvedValue(viewOf(complete({ status: "submitted", submittedAt: "2026-10-17T02:00:00.000Z" }), allFiles()));
    await open(viewOf(complete(), allFiles()));
    expect(screen.getByRole("heading", { level: 2, name: "Review & submit" })).toBeInTheDocument();
    expect(text("apply-review")).toContain("Cruz Law");
    press(screen.getByRole("button", { name: "Send my application" }));
    await settle();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(text("apply-submitted")).toContain("with a LAGDA reviewer");
  });

  it.each([
    ["application_incomplete", { missing: ["phone", "photo file"] }, /still missing/, ["Phone number", "Your photo"]],
    ["file_scan_pending", {}, /still being checked for viruses/, []],
    ["identity_required", {}, /Verify your identity first/, []],
  ] as const)("%s on submit", async (code, more, words, listed) => {
    submit.mockRejectedValue(new ApiError(409, { code, message: code, ...more }, code));
    await open(viewOf(complete(), allFiles()));
    press(screen.getByRole("button", { name: "Send my application" }));
    await settle();
    const problem = screen.getByTestId("submit-problem");
    expect(problem).toHaveTextContent(words);
    for (const item of listed) expect(within(problem).getByText(item)).toBeInTheDocument();
    if (code === "identity_required") expect(within(problem).getByRole("link", { name: "Verify my identity" })).toHaveAttribute("href", "/app/settings/identity");
  });

  it("sends the person back to a step that is not complete instead of asking the server", async () => {
    await open(viewOf(complete({ commissionNo: "" }), allFiles()));
    expect(screen.getByRole("heading", { level: 2, name: "Credentials" })).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("after submitting", () => {
  it("withdraws only after a confirmation", async () => {
    withdraw.mockResolvedValue(viewOf(complete({ status: "withdrawn" }), allFiles()));
    await open(viewOf(complete({ status: "submitted" }), allFiles()));
    press(screen.getByRole("button", { name: "Withdraw my application" }));
    expect(withdraw).not.toHaveBeenCalled();
    press(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Withdraw it" }));
    await settle();
    expect(withdraw).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.queryByTestId("apply-submitted")).toBeNull();
  });

  it("an approved application says when the commission ends and links to the desk", async () => {
    await open(viewOf(complete({ status: "approved" }), allFiles()));
    expect(text("apply-approved")).toContain("31 Dec");
    expect(text("apply-approved")).toContain("can no longer accept requests");
    expect(screen.getByRole("link", { name: "Go to your notary desk" })).toHaveAttribute("href", "/app/enotary/desk");
  });

  it("a rejected one shows the reviewer's reason and lets the notary correct it", async () => {
    await open(viewOf(complete({ status: "rejected", reviewNote: "The photo is not clear." }), allFiles()));
    expect(screen.getByTestId("review-note")).toHaveTextContent("The photo is not clear.");
    press(screen.getByRole("button", { name: "Update my application" }));
    expect(screen.getByRole("heading", { level: 2, name: "Review & submit" })).toBeInTheDocument();
  });

  it("every page of it carries the honest note", async () => {
    await open(viewOf(complete({ status: "submitted" }), allFiles()));
    expect(screen.getByTestId("onramp-note")).toHaveTextContent(/not currently available.*Supreme Court accreditation/);
  });
});

describe("the page around it", () => {
  it("says so when applications are not offered", async () => {
    await open(null);
    expect(screen.getByText("Not available on this account yet.")).toBeInTheDocument();
  });

  it("offers a retry when it cannot be loaded", async () => {
    read.mockRejectedValueOnce(new ApiError(500, undefined, "x")).mockResolvedValue(viewOf(null));
    render(<MemoryRouter><NotaryApplyPage /></MemoryRouter>);
    await settle();
    press(screen.getByRole("button", { name: "Try again" }));
    await settle();
    expect(screen.getByRole("heading", { level: 2, name: "Personal & office" })).toBeInTheDocument();
  });
});
