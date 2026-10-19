// "Choose a completed document": the signed documents of this workspace, as a list to pick one from, so a
// person does not have to download a PDF only to upload it again into the notary session.
//
// The picker only chooses. The page fetches the signed PDF and adds it behind the same loading screen as an
// uploaded file, so the two ways end the same way and the same checks (size, scan) apply.

import { useEffect, useState } from "react";
import { FileCheck, Search } from "lucide-react";
import { ActionButton, GF, TAP } from "../../../../components/system/design-system";
import { realSigningRequestService, type SigningRequestListItem } from "../../../../services/real/signing-request.service";
import { E } from "../EnotaryChrome";
import { bodyText, fieldStyle, labelStyle } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";

/** The most the session takes, as for an uploaded file. */
export const SESSION_FILE_MAX_BYTES = 20 * 1024 * 1024;

/** A refusal the person can read as it is (a file that is too big or empty), not a server answer. */
export class PickProblem extends Error {}

export type CompletedChoice = Pick<SigningRequestListItem, "signingRequestId" | "documentTitle" | "completedAt">;

/** The signed PDF as a file for the session, or a PickProblem saying what is wrong with it. */
export async function completedDocumentFile(workspaceId: string, choice: CompletedChoice): Promise<File> {
  const blob = await realSigningRequestService.completedDocumentBlob(workspaceId, choice.signingRequestId);
  if (blob.size === 0) throw new PickProblem("That document is empty.");
  if (blob.size > SESSION_FILE_MAX_BYTES) throw new PickProblem("That document is larger than 20 MB, which is the most a session takes.");
  const base = choice.documentTitle.replace(/\.pdf$/i, "").trim() || "completed-document";
  return new File([blob], `${base}.pdf`, { type: "application/pdf" });
}

export function CompletedDocumentPicker({ workspaceId, onPick, busy, replace = false }: {
  workspaceId: string; busy: boolean; replace?: boolean;
  onPick: (choice: CompletedChoice) => Promise<void>;
}) {
  const [items, setItems] = useState<SigningRequestListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      realSigningRequestService.list(workspaceId, { states: ["completed"], perPage: 30, q: query })
        .then(result => { if (!cancelled) { setItems(result.items); setFailed(false); } })
        .catch(() => { if (!cancelled) { setItems([]); setFailed(true); } });
    }, query === "" ? 0 : 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [workspaceId, query]);

  const picked = items?.find(item => item.signingRequestId === chosen) ?? null;
  return (
    <div data-testid="completed-picker">
      {!replace && <p style={bodyText}>Pick one of your completed (signed) documents. Only you and the notary can see it in the session.</p>}
      <label htmlFor="completed-search" style={labelStyle}>Find a completed document</label>
      <div style={{ position: "relative" }}>
        <Search size={16} aria-hidden style={{ position: "absolute", left: 12, top: 14, color: E.quiet }} />
        <input
          id="completed-search" type="search" value={query} placeholder="Search by name" autoComplete="off"
          onChange={event => { setQuery(event.target.value); }} style={{ ...fieldStyle(false), paddingLeft: 36 }}
        />
      </div>
      {items === null && <p role="status" style={{ ...bodyText, margin: "10px 0 0" }}>Loading your completed documents…</p>}
      {failed && <p role="alert" style={{ ...GF, color: "#B0182B", fontSize: 13.5 }}>Your completed documents could not be loaded. Try again, or upload a PDF instead.</p>}
      {items !== null && !failed && items.length === 0 && (
        <p data-testid="completed-empty" style={{ ...bodyText, margin: "10px 0 0" }}>
          {query === "" ? "You have no completed documents yet. Upload a PDF instead." : "No completed document matches that search."}
        </p>
      )}
      {items !== null && items.length > 0 && (
        <ul role="radiogroup" aria-label="Completed documents" style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 8, maxHeight: 280, overflowY: "auto" }}>
          {items.map(item => {
            const on = item.signingRequestId === chosen;
            return (
              <li key={item.signingRequestId}>
                <label style={{ ...GF, display: "flex", gap: 10, alignItems: "flex-start", minHeight: TAP, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${on ? E.maroon : E.maroonLine}`, background: on ? "#FFF7F8" : "#FFFFFF" }}>
                  <input type="radio" name="completed-document" data-testid="completed-option" checked={on}
                    onChange={() => { setChosen(item.signingRequestId); }} style={{ marginTop: 3, accentColor: E.maroon }} />
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 14.5, color: E.ink, overflowWrap: "anywhere" }}>{item.documentTitle}</strong>
                    <small style={{ color: E.quiet }}>Completed {item.completedAt === null ? "" : stampLabel(item.completedAt)} · {item.participantCount} {item.participantCount === 1 ? "person" : "people"}</small>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ marginTop: 10 }}>
        <ActionButton
          icon={FileCheck} disabled={busy || picked === null}
          onClick={() => { if (picked !== null) void onPick(picked).then(() => { setChosen(null); }); }}
        >
          {busy ? "Adding…" : replace ? "Use this document instead" : "Use this document"}
        </ActionButton>
        {picked === null && <span style={{ ...GF, marginLeft: 10, fontSize: 13, color: E.quiet }}>Pick a document first.</span>}
      </div>
    </div>
  );
}
