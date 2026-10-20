// "Choose a shared document": the signed documents other people have shared with this person and that they accepted.
// Like the completed-document picker it only chooses; the page fetches the PDF and adds it behind the same loading
// screen as an uploaded file, so the same checks (size, scan) apply.

import { useEffect, useState } from "react";
import { FileCheck } from "lucide-react";
import { ActionButton, GF, TAP } from "../../../../components/system/design-system";
import { documentSharingService, type SharedDocument } from "../../../../services/real/document-sharing.service";
import { E } from "../EnotaryChrome";
import { bodyText } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";
import { PickProblem, SESSION_FILE_MAX_BYTES } from "./CompletedDocumentPicker";

export type SharedChoice = Pick<SharedDocument, "id" | "documentTitle" | "completedAt" | "owner">;

/** The signed PDF of a shared document as a file for the session, or a PickProblem saying what is wrong with it. */
export async function sharedDocumentAsFile(choice: SharedChoice): Promise<File> {
  const blob = await documentSharingService.sharedDocumentFile(choice.id);
  if (blob.size === 0) throw new PickProblem("That document is empty.");
  if (blob.size > SESSION_FILE_MAX_BYTES) throw new PickProblem("That document is larger than 20 MB, which is the most a session takes.");
  const base = choice.documentTitle.replace(/\.pdf$/i, "").trim() || "shared-document";
  return new File([blob], `${base}.pdf`, { type: "application/pdf" });
}

export function SharedDocumentPicker({ onPick, busy, replace = false }: {
  busy: boolean; replace?: boolean; onPick: (choice: SharedChoice) => Promise<void>;
}) {
  const [items, setItems] = useState<SharedDocument[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    documentSharingService.sharedWithMe("accepted")
      .then(result => { if (!cancelled) { setItems(result.filter(item => item.completedAt !== null && item.actions.includes("open"))); setFailed(false); } })
      .catch(() => { if (!cancelled) { setItems([]); setFailed(true); } });
    return () => { cancelled = true; };
  }, []);

  const picked = items?.find(item => item.id === chosen) ?? null;
  return (
    <div data-testid="shared-picker">
      {!replace && <p style={bodyText}>Pick a signed document that someone shared with you. Only you and the notary can see it in the session.</p>}
      {items === null && <p role="status" style={{ ...bodyText, margin: "10px 0 0" }}>Loading the documents shared with you…</p>}
      {failed && <p role="alert" style={{ ...GF, color: "#B0182B", fontSize: 13.5 }}>The documents shared with you could not be loaded. Try again, or upload a PDF instead.</p>}
      {items !== null && !failed && items.length === 0 && (
        <p data-testid="shared-empty" style={{ ...bodyText, margin: "10px 0 0" }}>No signed document has been shared with you yet. Upload a PDF instead.</p>
      )}
      {items !== null && items.length > 0 && (
        <ul role="radiogroup" aria-label="Shared documents" style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 8, maxHeight: 280, overflowY: "auto" }}>
          {items.map(item => {
            const on = item.id === chosen;
            return (
              <li key={item.id}>
                <label style={{ ...GF, display: "flex", gap: 10, alignItems: "flex-start", minHeight: TAP, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${on ? E.maroon : E.maroonLine}`, background: on ? "#FFF7F8" : "#FFFFFF" }}>
                  <input type="radio" name="shared-document" data-testid="shared-option" checked={on}
                    onChange={() => { setChosen(item.id); }} style={{ marginTop: 3, accentColor: E.maroon }} />
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: 14.5, color: E.ink, overflowWrap: "anywhere" }}>{item.documentTitle}</strong>
                    <small style={{ color: E.quiet }}>Shared by {item.sharedBy?.displayName ?? item.owner.displayName}{item.completedAt === null ? "" : ` · completed ${stampLabel(item.completedAt)}`}</small>
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
