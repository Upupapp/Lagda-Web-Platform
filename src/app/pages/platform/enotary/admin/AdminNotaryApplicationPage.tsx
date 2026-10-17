// /app/admin/notary-applications/:userId — one application, for a LAGDA reviewer.
//
// Shows what the applicant wrote, their documents (opened through the API, never
// at a public address), and how the name on their verified ID compares with the
// legal name they gave. The reviewer approves (optionally tying the account to an
// entry of the Notary Directory) or rejects with a reason the applicant is told.
//
// The server decides who may review (404 for anyone else) and refuses an approval
// whose commission has already ended. Nothing here claims a notary is accredited:
// approving only lets the account answer requests.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { AlertTriangle, ArrowLeft, Check, ExternalLink, X } from "lucide-react";
import { ActionButton, ActionRow, GF, Notice, T, TAP } from "../../../../components/system/design-system";
import { useConfirm } from "../../../../components/platform/ConfirmDialog";
import { API_BASE_URL, USE_REAL_BACKEND } from "../../../../services/backend-flag";
import {
  FILE_KIND_LABEL, realNotaryApplicationsService, type AdminApplicationDetail, type NameMatch,
} from "../../../../services/real/notary-applications.service";
import { errorCode } from "../../../../services/real/enotary-invitations.service";
import { E, EnotaryFrame, EnotaryHeading } from "../EnotaryChrome";
import { EnotaryLoadError, EnotaryLoading, EnotaryNotOffered } from "../EnotaryStates";
import { OnrampNote, Panel, PanelTitle, bodyText, fieldStyle, hintStyle, labelStyle } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";
import { FIELDS, SCAN_WORDS, fileSizeLabel } from "../notary/application-form";
import { APPLICATION_STATUS_WORDS } from "./AdminNotaryApplicationsPage";
import { entryLabel, filterEntries, loadDirectoryEntries, type DirectoryEntry } from "./directory-entries";

export const NAME_MATCH_WORDS: Record<NameMatch, { label: string; tone: "ok" | "warn" | "bad"; text: string }> = {
  match: { label: "Names match", tone: "ok", text: "The name on the verified ID is the name on the applicant's LAGDA account." },
  close: { label: "Names are close", tone: "warn", text: "The names are nearly the same (a middle name, an initial or a spelling). Look at both before deciding." },
  mismatch: { label: "Names do not match", tone: "bad", text: "The name on the verified ID is different from the name on the applicant's LAGDA account. Do not approve unless the difference is explained." },
};

type Loaded =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "off" }
  | { kind: "ready"; detail: AdminApplicationDetail };

export function AdminNotaryApplicationPage() {
  const { userId = "" } = useParams<{ userId: string }>();
  const [loaded, setLoaded] = useState<Loaded>(USE_REAL_BACKEND ? { kind: "loading" } : { kind: "off" });
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [directoryId, setDirectoryId] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const alive = useRef(true);
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(() => {
    if (!USE_REAL_BACKEND) return;
    realNotaryApplicationsService.adminGet(userId).then(
      detail => { if (alive.current) setLoaded(detail === null ? { kind: "off" } : { kind: "ready", detail }); },
      () => { if (alive.current) setLoaded({ kind: "error" }); },
    );
  }, [userId]);

  useEffect(() => {
    alive.current = true;
    load();
    void loadDirectoryEntries().then(list => { if (alive.current) setEntries(list); });
    return () => { alive.current = false; };
  }, [load]);

  // An exactly equal listing that nobody else holds is suggested; the reviewer can change it.
  const candidate = loaded.kind === "ready" ? loaded.detail.candidate : null;
  useEffect(() => {
    if (candidate !== null && !candidate.taken) setDirectoryId(current => (current === "" ? candidate.directoryId : current));
  }, [candidate]);

  const shown = useMemo(() => filterEntries(entries, query).slice(0, 12), [entries, query]);

  if (loaded.kind === "loading") return <EnotaryLoading />;
  if (loaded.kind === "error") return <EnotaryLoadError onRetry={() => { setLoaded({ kind: "loading" }); load(); }} />;
  if (loaded.kind === "off") return <EnotaryNotOffered />;

  const { detail } = loaded;
  const app = detail.application;
  const decidable = app.status === "submitted";
  const match = detail.account.nameMatch;

  const decide = async (run: () => Promise<void>, done: string) => {
    setBusy(true);
    setProblem(null);
    try {
      await run();
      if (!alive.current) return;
      setSaid(done);
      setRejecting(false);
      load();
    } catch (error) {
      if (!alive.current) return;
      const code = errorCode(error);
      setProblem(code === "commission_expired" || code === "commission_not_valid"
        ? "The commission on this application has already ended, so it cannot be approved."
        : code === "directory_entry_taken" || code === "directory_id_taken"
          ? "That Notary Directory entry is already tied to another notary."
          : code === "review_own_application"
            ? "You cannot review your own application."
          : code === "enotary_notary_not_listed"
            ? "That entry is not in the Notary Directory."
            : "That could not be done right now. Please try again.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const approve = () => {
    const chosen = entries.find(entry => entry.id === directoryId);
    confirm({
      title: `Approve ${app.legalName ?? "this notary"}?`,
      body: `${chosen !== undefined ? `Their account will be tied to ${entryLabel(chosen)}. ` : "No Notary Directory entry is chosen, so requests for a listed notary cannot reach this account until one is. "}They are told, and can then answer requests. This does not make them accredited for online sessions.`,
      confirmLabel: "Approve",
      onConfirm: () => decide(() => realNotaryApplicationsService.approve(userId, { directoryId, note }), "Approved. The notary was told."),
    });
  };

  const reject = () => {
    if (reason.trim() === "") { setProblem("Write the reason the applicant will read."); return; }
    void decide(() => realNotaryApplicationsService.reject(userId, reason), "Not approved. The notary was told the reason.");
  };

  const fileHref = (fileId: string) => `${API_BASE_URL ?? ""}${realNotaryApplicationsService.adminFileUrl(userId, fileId)}`;

  return (
    <EnotaryFrame wide tone="attorney" badge="Reviewer" eyebrow="LAGDA review" description={`${app.legalName ?? "Name not on record yet"} · ${APPLICATION_STATUS_WORDS[app.status]}`}>
      {confirmDialog}
      <p style={{ ...GF, margin: "0 0 14px" }}>
        <Link to="/app/admin/notary-applications" style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: TAP, color: T.azureDeep, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={16} aria-hidden /> All applications
        </Link>
      </p>
      {said !== null && <div role="status" style={{ ...GF, margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: E.ok }}>{said}</div>}
      {problem !== null && <Notice icon={AlertTriangle} tone="danger">{problem}</Notice>}

      <Panel testId="name-comparison" tone={match === "mismatch" ? "maroon" : "plain"}>
        <PanelTitle>Name check</PanelTitle>
        <dl style={{ ...GF, margin: "0 0 8px", display: "grid", gap: 6 }}>
          <div><dt style={{ fontSize: 12.5, color: E.quiet }}>Verified ID</dt><dd data-testid="verified-name" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{detail.account.verifiedName ?? "Not verified"}</dd></div>
          <div><dt style={{ fontSize: 12.5, color: E.quiet }}>Name on the LAGDA account</dt><dd data-testid="legal-name" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{detail.account.profileName ?? "Not given"}</dd></div>
        </dl>
        {match !== null ? (
          <p data-testid="name-match" data-match={match} style={{ ...bodyText, margin: 0, color: NAME_MATCH_WORDS[match].tone === "ok" ? E.ok : NAME_MATCH_WORDS[match].tone === "warn" ? "#8A5A00" : "#B0182B" }}>
            <strong>{NAME_MATCH_WORDS[match].label}.</strong> {NAME_MATCH_WORDS[match].text}
          </p>
        ) : (
          <p data-testid="name-match" data-match="none" style={{ ...bodyText, margin: 0 }}>The server has no comparison for this account.</p>
        )}
      </Panel>

      <Panel testId="application-fields">
        <PanelTitle>Application</PanelTitle>
        <dl style={{ ...GF, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {FIELDS.map(field => (
            <div key={field.key}><dt style={{ fontSize: 12.5, color: E.quiet }}>{field.label}</dt><dd style={{ margin: 0, fontSize: 14.5, overflowWrap: "anywhere" }}>{app[field.key] === "" ? "—" : app[field.key]}</dd></div>
          ))}
          <div><dt style={{ fontSize: 12.5, color: E.quiet }}>Agreement</dt><dd style={{ margin: 0, fontSize: 14.5 }}>{app.agreementVersion !== null ? `Accepted (version ${app.agreementVersion})` : "Not accepted"}</dd></div>
          <div><dt style={{ fontSize: 12.5, color: E.quiet }}>Consent to be listed</dt><dd style={{ margin: 0, fontSize: 14.5 }}>{app.listingConsent ? "Yes" : "No"}</dd></div>
          {app.submittedAt !== null && <div><dt style={{ fontSize: 12.5, color: E.quiet }}>Sent</dt><dd style={{ margin: 0, fontSize: 14.5 }}>{stampLabel(app.submittedAt)}</dd></div>}
        </dl>
      </Panel>

      <Panel testId="application-files">
        <PanelTitle>Documents</PanelTitle>
        {detail.files.length === 0 ? <p style={{ ...bodyText, margin: 0 }}>None added.</p> : detail.files.map(file => (
          <div key={file.id} data-testid="admin-file" style={{ ...GF, display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${E.line}`, minHeight: TAP }}>
            <span style={{ minWidth: 0, flex: 1, fontSize: 14 }}>
              <strong>{FILE_KIND_LABEL[file.kind]}</strong>
              <small style={{ display: "block", color: file.scanState === "clean" ? E.ok : file.scanState === "pending" ? E.quiet : "#C0392B", fontSize: 12.5 }}>{file.filename} · {fileSizeLabel(file.sizeBytes)} · {SCAN_WORDS[file.scanState]}</small>
            </span>
            {file.scanState === "clean" && (
              <a href={fileHref(file.id)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: TAP, color: T.azureDeep, fontWeight: 700, fontSize: 14 }}>
                Open <ExternalLink size={14} aria-hidden />
              </a>
            )}
          </div>
        ))}
      </Panel>

      {detail.invitations.length > 0 && (
        <Panel testId="application-invitations">
          <PanelTitle>Requests bound to this account</PanelTitle>
          <ul style={{ margin: 0, paddingLeft: 18, ...bodyText }}>
            {detail.invitations.map(item => <li key={item.id}>{item.clientName ?? "A client"} → {item.notaryName} · {item.status} · {stampLabel(item.createdAt)}</li>)}
          </ul>
        </Panel>
      )}

      {app.reviewNote !== null && !decidable && (
        <Panel><PanelTitle>Reviewer&rsquo;s note</PanelTitle><p style={{ ...bodyText, margin: 0 }}>{app.reviewNote}</p></Panel>
      )}

      {decidable && !rejecting && (
        <Panel testId="approve-panel" tone="sky">
          <PanelTitle>Approve</PanelTitle>
          <label htmlFor="dir-search" style={labelStyle}>Tie to a Notary Directory entry (optional)</label>
          <input id="dir-search" value={query} onChange={event => { setQuery(event.target.value); }} placeholder="Search by name, firm or city" style={fieldStyle()} />
          <p style={hintStyle} data-testid="candidate-hint">
            {detail.candidate === null
              ? "No listing has exactly this name. Pick one if the applicant is listed, or leave it empty."
              : detail.candidate.taken
                ? `${detail.candidate.name} has exactly this name, but that listing is already held by another notary. Pick another or leave it empty.`
                : `${detail.candidate.name} has exactly this name and is suggested.`}
          </p>
          <label htmlFor="dir-pick" style={{ ...labelStyle, marginTop: 10 }}>Entry</label>
          <select id="dir-pick" value={directoryId} onChange={event => { setDirectoryId(event.target.value); }} style={fieldStyle()}>
            <option value="">No entry chosen</option>
            {shown.map(entry => <option key={entry.id} value={entry.id}>{entryLabel(entry)}</option>)}
            {directoryId !== "" && !shown.some(entry => entry.id === directoryId) && <option value={directoryId}>{entries.find(entry => entry.id === directoryId)?.name ?? directoryId}</option>}
          </select>
          <label htmlFor="approve-note" style={{ ...labelStyle, marginTop: 10 }}>Note (optional)</label>
          <input id="approve-note" value={note} maxLength={400} onChange={event => { setNote(event.target.value); }} style={fieldStyle()} />
          <ActionRow>
            <ActionButton icon={Check} disabled={busy} onClick={approve}>Approve</ActionButton>
            <ActionButton icon={X} kind="secondary" disabled={busy} onClick={() => { setRejecting(true); setProblem(null); }}>Do not approve</ActionButton>
          </ActionRow>
        </Panel>
      )}

      {decidable && rejecting && (
        <Panel testId="reject-panel" tone="maroon">
          <PanelTitle>Why is it not approved?</PanelTitle>
          <label htmlFor="reject-reason" style={labelStyle}>Reason the applicant will read</label>
          <textarea id="reject-reason" value={reason} maxLength={400} rows={4} onChange={event => { setReason(event.target.value); }} style={{ ...fieldStyle(), resize: "vertical" }} />
          <p style={hintStyle}>{reason.length} of 400 characters. Required.</p>
          <ActionRow>
            <ActionButton kind="danger" disabled={busy} onClick={reject}>Send: not approved</ActionButton>
            <ActionButton kind="secondary" disabled={busy} onClick={() => { setRejecting(false); }}>Back</ActionButton>
          </ActionRow>
        </Panel>
      )}

      {!decidable && <div style={{ marginTop: 6 }}><EnotaryHeading>{APPLICATION_STATUS_WORDS[app.status]}</EnotaryHeading></div>}
      <OnrampNote />
    </EnotaryFrame>
  );
}
