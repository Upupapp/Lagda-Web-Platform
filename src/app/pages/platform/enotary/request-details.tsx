// What the client asked for, as the notary and the client read it: the act, the kind of document and where the client
// will be, with the notice a kind of document may carry.

import { Info } from "lucide-react";
import { GF } from "../../../components/system/design-system";
import type { RequestDetails } from "../../../services/real/enotary-invitations.service";
import { E } from "./EnotaryChrome";
import type { PartyRow } from "./CaseFrame";

/** Rows for a party card; none for a request made before these were asked. */
export function detailRows(details: RequestDetails | null | undefined): PartyRow[] {
  if (details === null || details === undefined) return [];
  return [
    { label: "Asked for", value: details.actWantedLabel, testId: "party-act" },
    { label: "Kind of document", value: details.documentLabel, testId: "party-kind" },
    { label: "Client will be in", value: `${details.city}, ${details.province}`, testId: "party-place" },
  ];
}

/** One line for a desk row: the act, the kind of document and the place. */
export function detailsLine(details: RequestDetails | null | undefined): string {
  if (details === null || details === undefined) return "";
  return `${details.actWantedLabel} · ${details.documentLabel} · ${details.city}, ${details.province}`;
}

/** The notices that go with a request: a kind of document that may need more, and a document for use abroad. */
export function DetailNotes({ details }: { details: RequestDetails | null | undefined }) {
  if (details === null || details === undefined) return null;
  const notes = [
    details.documentNote,
    details.usedAbroad ? "The document is for use outside the Philippines, so it may need an apostille after it is notarized." : null,
  ].filter((note): note is string => note !== null);
  if (notes.length === 0) return null;
  return (
    <ul data-testid="detail-notes" style={{ ...GF, listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 6 }}>
      {notes.map(note => (
        <li key={note} style={{ display: "flex", gap: 8, fontSize: 13, color: "#7A5200", background: "#FFF8E6", border: "1px solid #F0DCA8", borderRadius: 8, padding: "7px 10px" }}>
          <Info size={15} aria-hidden style={{ flex: "0 0 auto", marginTop: 2, color: E.maroon }} /><span>{note}</span>
        </li>
      ))}
    </ul>
  );
}
