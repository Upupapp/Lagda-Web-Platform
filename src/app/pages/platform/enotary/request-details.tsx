// What the client asked for, as the notary and the client read it: the act, the kind of document and where the client
// will be, with the notice a kind of document may carry.

import { Info } from "lucide-react";
import { GF } from "../../../components/system/design-system";
import type { RequestBooking, RequestDetails } from "../../../services/real/enotary-invitations.service";
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

// ── When the client wants the notary (130) ─────────────────────────────────
// Always in Philippine time, where the notary keeps office hours, whatever the reader's own clock says.
const ZONE = "Asia/Manila";
const LONG_DAY = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, weekday: "long", month: "long", day: "numeric" });
const SHORT_DAY = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, weekday: "short", month: "short", day: "numeric" });
const CLOCK = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", minute: "2-digit" });
const SLOT_MS = 30 * 60_000;

/** A booking in words: `short` for a card's fact, `long` for a summary row. Null for a request with neither. */
export function bookingWords(booking: RequestBooking | null | undefined): { short: string; long: string } | null {
  if (booking === null || booking === undefined) return null;
  if (booking.kind === "now") {
    const by = booking.answerBy === null ? null : CLOCK.format(Date.parse(booking.answerBy));
    return {
      short: by === null ? "Right now" : `Right now · answer by ${by}`,
      long: by === null ? "Right now" : `Right now: the notary is asked to answer by ${by} (Philippine time)`,
    };
  }
  if (booking.kind === "scheduled" && booking.at !== null) {
    const at = Date.parse(booking.at);
    return {
      short: `${SHORT_DAY.format(at)}, ${CLOCK.format(at)}`,
      long: `${LONG_DAY.format(at)}, ${CLOCK.format(at)} to ${CLOCK.format(at + SLOT_MS)} (Philippine time)`,
    };
  }
  return null;
}

/** A booked time that has not passed: true while the slot has not ended. */
export function isUpcomingBooking(booking: RequestBooking | null | undefined, now: number): boolean {
  return booking?.kind === "scheduled" && booking.at !== null && Date.parse(booking.at) + SLOT_MS > now;
}

/** The "When" row of a party card; none for a request made without one. */
export function bookingRows(booking: RequestBooking | null | undefined): PartyRow[] {
  const words = bookingWords(booking);
  return words === null ? [] : [{ label: booking?.kind === "now" ? "When" : "Booked for", value: words.long, testId: "party-booking" }];
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
