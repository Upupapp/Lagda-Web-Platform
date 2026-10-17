// /app/enotary/apply — a notary's application, first time only.
//
// Five steps: personal and office details, credentials, documents (each file
// is scanned for viruses on the server before it counts), the agreement and
// consent to be listed, and a review that submits. After that it is a status
// page: waiting for a LAGDA reviewer, approved (with the date the commission
// ends), or not approved (with the reviewer's reason).
//
// The server decides everything: when the application is complete, when a file
// has been scanned, whether the account's verified identity stands. The form
// only says what is missing before it asks, and shows the server's answer.
//
// It ends at approval. Nothing here promises video, payment or notarization.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { AlertTriangle, BadgeCheck, Check, FileUp, Hourglass, Loader2, Trash2, XCircle } from "lucide-react";
import { ActionButton, ActionRow, GF, Notice, T, TAP } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import { API_BASE_URL, USE_REAL_BACKEND } from "../../../../services/backend-flag";
import {
  realNotaryApplicationsService, FILE_KIND_LABEL, REQUIRED_FILE_KINDS, EMPTY_FIELDS,
  type ApplicationFile, type ApplicationFileKind, type ApplicationView,
} from "../../../../services/real/notary-applications.service";
import { E, EnotaryFrame, EnotaryHeading, EnotaryRail } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, PanelTitle, TextField, bodyText, linkButton } from "../onramp-ui";
import { expiryLabel } from "../requests/expiry";
import {
  APPLY_STEPS, SCAN_WORDS, describeSubmitError, fieldErrorsFromRefusal, fieldsOf, fileProblem, fileSizeLabel,
  firstIncompleteStep, todayIso, validateStep, type ApplyStep, type FieldErrors, type FormValues, type SubmitProblem,
} from "./application-form";

type Loaded =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "off" }
  | { kind: "ready"; view: ApplicationView };

const SCAN_POLL_MS = 3000;

function dateWords(iso: string): string {
  const stamp = Date.parse(`${iso}T00:00:00`);
  return Number.isFinite(stamp) ? expiryLabel(new Date(stamp).toISOString()).replace(/, .*$/, "") : iso;
}

function valuesOf(view: ApplicationView): FormValues {
  const application = view.application;
  const { version } = view.agreement;
  return {
    ...EMPTY_FIELDS,
    ...(application ?? {}),
    agreementAccepted: application !== null && application.agreementVersion !== null && application.agreementVersion === version,
  };
}

export function NotaryApplyPage() {
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const alive = useRef(true);

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    realNotaryApplicationsService.read().then(
      view => { if (alive.current) setLoaded(view === null ? { kind: "off" } : { kind: "ready", view }); },
      () => { if (alive.current) setLoaded({ kind: "error" }); },
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { setLoaded({ kind: "loading" }); load(); }} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;
  return <ApplyView initial={loaded.view} />;
}

function ApplyView({ initial }: { initial: ApplicationView }) {
  const [view, setView] = useState(initial);
  const status = view.application?.status ?? "none";
  const [editing, setEditing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const canEdit = status === "none" || status === "draft" || status === "withdrawn" || status === "expired" || editing;

  if (canEdit) {
    return <ApplicationForm view={view} onView={setView} onSubmitted={next => { setView(next); setEditing(false); }} />;
  }

  const application = view.application;
  const withdraw = () => {
    confirm({
      title: "Withdraw your application?",
      body: "A reviewer will no longer look at it. You can edit it and send it again later.",
      confirmLabel: "Withdraw it",
      cancelLabel: "Keep it",
      destructive: true,
      onConfirm: async () => {
        setWithdrawing(true);
        setProblem(null);
        try {
          const next = await realNotaryApplicationsService.withdraw();
          if (alive.current) setView(next);
        } catch {
          if (alive.current) setProblem("That could not be done right now. Please try again.");
        } finally {
          if (alive.current) setWithdrawing(false);
        }
      },
    });
  };

  return (
    <EnotaryFrame wide tone="attorney" badge="Notary" eyebrow="Notary application" description="Your application to receive requests from LAGDA clients.">
      {confirmDialog}
      {status === "submitted" && (
        <div data-testid="apply-submitted">
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Hourglass size={22} aria-hidden style={{ color: E.maroon, marginTop: 4, flex: "0 0 auto" }} />
            <EnotaryHeading>Your application is with a LAGDA reviewer</EnotaryHeading>
          </div>
          <p style={bodyText}>
            A reviewer checks your documents and the name on your ID. You will be told here in LAGDA, and by email, when it is decided.
            {application?.submittedAt != null && <> Sent {expiryLabel(application.submittedAt).replace(/^\w+ /, "")}.</>}
          </p>
          {problem !== null && <Notice icon={XCircle} tone="danger">{problem}</Notice>}
          <ActionRow>
            <ActionButton kind="secondary" disabled={withdrawing} onClick={withdraw}>{withdrawing ? "Withdrawing…" : "Withdraw my application"}</ActionButton>
          </ActionRow>
        </div>
      )}
      {status === "approved" && (
        <div data-testid="apply-approved">
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <BadgeCheck size={22} aria-hidden style={{ color: E.ok, marginTop: 4, flex: "0 0 auto" }} />
            <EnotaryHeading>Your application was approved</EnotaryHeading>
          </div>
          <p style={bodyText}>
            You can accept or decline requests that clients send you.
            {application !== null && application.commissionValidUntil !== "" && (
              <> Your commission is on record until <strong>{dateWords(application.commissionValidUntil)}</strong>; after that date you can no longer accept requests, and you will need to apply again with your renewed commission.</>
            )}
          </p>
          <Link to="/app/enotary/desk" style={linkButton("maroon")}>Go to your notary desk</Link>
        </div>
      )}
      {status === "rejected" && (
        <div data-testid="apply-rejected">
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <XCircle size={22} aria-hidden style={{ color: "#B0182B", marginTop: 4, flex: "0 0 auto" }} />
            <EnotaryHeading>Your application was not approved</EnotaryHeading>
          </div>
          {application?.reviewNote != null && (
            <Panel tone="maroon"><PanelTitle>The reviewer wrote</PanelTitle><p data-testid="review-note" style={{ ...bodyText, margin: 0 }}>{application.reviewNote}</p></Panel>
          )}
          <p style={bodyText}>You can correct what was wrong and send the application again.</p>
          <ActionRow>
            <ActionButton onClick={() => { setEditing(true); }}>Update my application</ActionButton>
          </ActionRow>
        </div>
      )}
      <OnrampNote />
    </EnotaryFrame>
  );
}

// ── The form ────────────────────────────────────────────────────────────────

function ApplicationForm({ view, onView, onSubmitted }: {
  view: ApplicationView; onView: (view: ApplicationView) => void; onSubmitted: (view: ApplicationView) => void;
}) {
  const [values, setValues] = useState<FormValues>(() => valuesOf(view));
  const [files, setFiles] = useState<ApplicationFile[]>(view.files);
  const today = todayIso();
  const [step, setStep] = useState<ApplyStep>(() => {
    const first = firstIncompleteStep(valuesOf(view), view.files, today);
    return view.application === null ? "personal" : first ?? "review";
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [submit, setSubmit] = useState<SubmitProblem | null>(null);
  const [saveProblem, setSaveProblem] = useState<string | null>(null);
  const alive = useRef(true);
  const headingRef = useRef<HTMLDivElement>(null);
  const agreementId = useId();
  const listingId = useId();
  useEffect(() => () => { alive.current = false; }, []);

  const set = (patch: Partial<FormValues>) => { setValues(current => ({ ...current, ...patch })); };
  const text = (key: keyof FormValues) => String(values[key] ?? "");

  // Keep checking files that are still being scanned.
  const pending = files.some(file => file.scanState === "pending");
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => {
      realNotaryApplicationsService.read().then(next => { if (alive.current && next !== null) setFiles(next.files); }, () => undefined);
    }, SCAN_POLL_MS);
    return () => { clearInterval(timer); };
  }, [pending]);

  const go = (next: ApplyStep) => {
    setStep(next);
    setErrors({});
    setSaveProblem(null);
    setSubmit(null);
    setTimeout(() => { headingRef.current?.focus({ preventScroll: true }); }, 0);
  };

  const persist = async (patch: Parameters<typeof realNotaryApplicationsService.save>[0]): Promise<boolean> => {
    setBusy(true);
    setSaveProblem(null);
    try {
      const next = await realNotaryApplicationsService.save(patch);
      if (!alive.current) return false;
      onView({ ...next, files: files });
      return true;
    } catch (error) {
      if (!alive.current) return false;
      const fieldErrors = fieldErrorsFromRefusal(error);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else setSaveProblem("Your answers could not be saved. Check your connection and try again.");
      return false;
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const next = async () => {
    const found = validateStep(step, values, files, today);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (pending && step === "documents") {
      setErrors({ files: "A document is still being checked for viruses. Wait a moment, then continue." });
      return;
    }
    const patch: Record<string, string | boolean | null> = {};
    for (const field of fieldsOf(step)) patch[field.key] = text(field.key).trim();
    if (step === "agreement") {
      patch.listingConsent = values.listingConsent;
      patch.agreementVersion = values.agreementAccepted ? view.agreement.version : null;
    }
    // Documents are saved as they are added; nothing else changes on that step.
    if (Object.keys(patch).length > 0 && !(await persist(patch))) return;
    const index = APPLY_STEPS.findIndex(item => item.id === step);
    go(APPLY_STEPS[Math.min(APPLY_STEPS.length - 1, index + 1)]!.id);
  };

  const back = () => {
    const index = APPLY_STEPS.findIndex(item => item.id === step);
    if (index > 0) go(APPLY_STEPS[index - 1]!.id);
  };

  const sendApplication = async () => {
    const first = firstIncompleteStep(values, files, today);
    if (first !== null) { go(first); setErrors(validateStep(first, values, files, today)); return; }
    setBusy(true);
    setSubmit(null);
    try {
      const done = await realNotaryApplicationsService.submit();
      if (alive.current) onSubmitted(done);
    } catch (error) {
      if (alive.current) setSubmit(describeSubmitError(error));
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const upload = async (kind: ApplicationFileKind, picked: File) => {
    const refused = fileProblem(picked, kind);
    if (refused !== null) { setErrors({ files: refused }); return; }
    setErrors({});
    setBusy(true);
    try {
      const added = await realNotaryApplicationsService.upload(kind, picked);
      if (alive.current) setFiles(current => [...current, added]);
    } catch {
      if (alive.current) setErrors({ files: `${picked.name} could not be added. Check your connection and try again.` });
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const remove = async (file: ApplicationFile) => {
    setBusy(true);
    try {
      await realNotaryApplicationsService.removeFile(file.id);
      if (alive.current) setFiles(current => current.filter(item => item.id !== file.id));
    } catch {
      if (alive.current) setErrors({ files: `${file.filename} could not be removed. Try again.` });
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const index = APPLY_STEPS.findIndex(item => item.id === step);
  const stepLabel = APPLY_STEPS[index]!.label;

  return (
    <EnotaryFrame wide tone="attorney" badge="Notary" eyebrow="Notary application" description="Apply once to receive requests from LAGDA clients. A LAGDA reviewer checks every application.">
      <EnotaryRail steps={APPLY_STEPS} current={step} label="Application steps" />
      <div ref={headingRef} tabIndex={-1} style={{ outline: "none" }}><EnotaryHeading>{stepLabel}</EnotaryHeading></div>

      {step === "personal" && (
        <div data-testid="apply-personal">
          <p style={bodyText}>Your legal name is taken from your verified ID when you submit. Make sure your account is verified before you send the application.</p>
          {fieldsOf("personal").map(field => (
            <TextField key={field.key} label={field.label} value={text(field.key)} onChange={value => { set({ [field.key]: value }); }}
              hint={field.hint} error={errors[field.key]} maxLength={field.max} required={field.required}
              type={field.type} inputMode={field.type === "tel" ? "tel" : undefined} />
          ))}
        </div>
      )}

      {step === "credentials" && (
        <div data-testid="apply-credentials">
          {fieldsOf("credentials").map(field => (
            <TextField key={field.key} label={field.label} value={text(field.key)} onChange={value => { set({ [field.key]: value }); }}
              hint={field.hint} error={errors[field.key]} maxLength={field.max} required={field.required}
              type={field.type} inputMode={field.key === "ptrYear" ? "numeric" : undefined} />
          ))}
        </div>
      )}

      {step === "documents" && (
        <div data-testid="apply-documents">
          <p style={bodyText}>Add a clear PDF, JPEG or PNG of each document, up to 10 MB each. Every file is checked for viruses before it counts.</p>
          {errors.files !== undefined && <Notice icon={AlertTriangle} tone="danger">{errors.files}</Notice>}
          {(["commission", "roll", "photo", "ibp", "ptr", "mcle", "other"] as const).map(kind => (
            <FileSlot key={kind} kind={kind} required={REQUIRED_FILE_KINDS.includes(kind)} files={files.filter(file => file.kind === kind)}
              busy={busy} onPick={picked => { void upload(kind, picked); }} onRemove={file => { void remove(file); }} />
          ))}
        </div>
      )}

      {step === "agreement" && (
        <div data-testid="apply-agreement">
          <Panel>
            <PanelTitle>Notary agreement</PanelTitle>
            <div data-testid="agreement-text" style={{ ...bodyText, maxHeight: 260, overflowY: "auto", whiteSpace: "pre-wrap", margin: 0 }}>{view.agreement.text}</div>
          </Panel>
          <label htmlFor={agreementId} style={checkRow}>
            <input id={agreementId} type="checkbox" checked={values.agreementAccepted} onChange={event => { set({ agreementAccepted: event.target.checked }); }} style={checkBox} />
            <span>I have read the agreement and I accept it.</span>
          </label>
          {errors.agreement !== undefined && <p role="alert" style={errText}>{errors.agreement}</p>}
          <label htmlFor={listingId} style={checkRow}>
            <input id={listingId} type="checkbox" checked={values.listingConsent} onChange={event => { set({ listingConsent: event.target.checked }); }} style={checkBox} />
            <span>I agree that my name, office and city may be listed in the LAGDA Notary Directory once I am approved.</span>
          </label>
          {errors.listing !== undefined && <p role="alert" style={errText}>{errors.listing}</p>}
        </div>
      )}

      {step === "review" && (
        <div data-testid="apply-review">
          <p style={bodyText}>Check everything, then send the application. A LAGDA reviewer will look at it; you cannot change it while it is being reviewed, but you can withdraw it.</p>
          <Panel>
            <dl style={{ ...GF, margin: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
              {[...fieldsOf("personal"), ...fieldsOf("credentials")].filter(field => text(field.key).trim() !== "").map(field => (
                <div key={field.key}><dt style={{ fontSize: 12.5, color: E.quiet }}>{field.label}</dt><dd style={{ margin: 0, fontSize: 14.5, color: E.ink, overflowWrap: "anywhere" }}>{text(field.key)}</dd></div>
              ))}
              <div><dt style={{ fontSize: 12.5, color: E.quiet }}>Documents</dt><dd style={{ margin: 0, fontSize: 14.5 }}>{files.length === 0 ? "None added" : files.map(file => `${FILE_KIND_LABEL[file.kind]}: ${file.filename}`).join("; ")}</dd></div>
              <div><dt style={{ fontSize: 12.5, color: E.quiet }}>Agreement and listing</dt><dd style={{ margin: 0, fontSize: 14.5 }}>{values.agreementAccepted ? "Agreement accepted" : "Agreement not accepted"}; {values.listingConsent ? "agreed to be listed" : "not agreed to be listed"}</dd></div>
            </dl>
          </Panel>
          {submit !== null && (
            <div data-testid="submit-problem" data-kind={submit.kind}>
              <Notice icon={AlertTriangle} tone={submit.kind === "scanning" ? "warn" : "danger"}>
                {submit.text}
                {submit.missing.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{submit.missing.map(item => <li key={item}>{item}</li>)}</ul>}
                {submit.kind === "identity" && <> <Link to="/app/settings/identity" style={{ color: "inherit", fontWeight: 700 }}>Verify my identity</Link></>}
              </Notice>
            </div>
          )}
        </div>
      )}

      {saveProblem !== null && <Notice icon={AlertTriangle} tone="danger">{saveProblem}</Notice>}
      <ActionRow>
        {step === "review" ? (
          <ActionButton icon={busy ? Loader2 : Check} disabled={busy || pending} onClick={() => { void sendApplication(); }}>
            {busy ? "Sending…" : pending ? "Waiting for the document check…" : "Send my application"}
          </ActionButton>
        ) : (
          <ActionButton disabled={busy} onClick={() => { void next(); }}>{busy ? "Saving…" : "Save and continue"}</ActionButton>
        )}
        {index > 0 && <ActionButton kind="secondary" disabled={busy} onClick={back}>Back</ActionButton>}
      </ActionRow>
      <OnrampNote />
    </EnotaryFrame>
  );
}

const checkRow = { ...GF, display: "flex", alignItems: "flex-start", gap: 12, minHeight: TAP, padding: "10px 0", fontSize: 14.5, color: E.ink, lineHeight: 1.5, cursor: "pointer" } as const;
const checkBox = { width: 24, height: 24, margin: 0, flex: "0 0 auto", accentColor: E.maroon } as const;
const errText = { ...GF, margin: "0 0 10px", fontSize: 13, color: "#C0392B" } as const;

function FileSlot({ kind, required, files, busy, onPick, onRemove }: {
  kind: ApplicationFileKind; required: boolean; files: ApplicationFile[]; busy: boolean;
  onPick: (file: File) => void; onRemove: (file: ApplicationFile) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const label = FILE_KIND_LABEL[kind];
  return (
    <Panel testId={`slot-${kind}`}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <PanelTitle>{label}{required && <span style={{ color: "#C0392B" }}> *</span>}</PanelTitle>
        <button
          type="button" disabled={busy} onClick={() => { input.current?.click(); }}
          style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 8, minHeight: TAP, padding: "0 16px", borderRadius: 10, border: `1px solid ${T.borderStrong}`, background: "#FFFFFF", color: T.ink, fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}
        >
          <FileUp size={16} aria-hidden /> {files.length === 0 ? "Add a file" : "Add another"}
        </button>
        <input
          ref={input} id={id} type="file" accept="application/pdf,image/jpeg,image/png" aria-label={`Add a file: ${label}`}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} tabIndex={-1}
          onChange={event => { const picked = event.target.files?.[0]; if (picked !== undefined) onPick(picked); event.target.value = ""; }}
        />
      </div>
      {files.map(file => (
        <div key={file.id} data-testid="file-row" data-scan={file.scanState} style={{ ...GF, display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${E.line}`, fontSize: 14 }}>
          <span style={{ minWidth: 0, flex: 1 }}>
            <a href={`${API_BASE_URL ?? ""}${realNotaryApplicationsService.fileUrl(file.id)}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: T.azureDeep, fontWeight: 600, overflowWrap: "anywhere" }}>{file.filename}</a>
            <small style={{ display: "block", color: file.scanState === "clean" ? E.ok : file.scanState === "pending" ? E.quiet : "#C0392B", fontSize: 12.5 }}>
              {fileSizeLabel(file.sizeBytes)} · {SCAN_WORDS[file.scanState]}
            </small>
          </span>
          <button type="button" aria-label={`Remove ${file.filename}`} disabled={busy} onClick={() => { onRemove(file); }}
            style={{ minWidth: TAP, minHeight: TAP, display: "grid", placeItems: "center", border: "none", background: "transparent", color: E.quiet, cursor: "pointer" }}>
            <Trash2 size={18} aria-hidden />
          </button>
        </div>
      ))}
    </Panel>
  );
}
