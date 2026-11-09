// 128. Where the parties are: the location check of Rule III of the Rules on Electronic Notarization (A.M. No.
// 24-10-14-SC). Each party's card says why the check is made, who sees what, and that it is kept with the notarial record;
// "Share my location" asks the browser, and the server places the position on the map of the Philippines and checks the
// connection. The card then says what the check found, and what to do when it did not pass: allow the location, turn off
// a VPN, move to land, and check again. It also says where the other party stands.
//
// A device that has already been allowed checks without asking when its party enters the room; and when the notary asks
// both devices to check again (just before recording the act), the client's device does so by itself.

import { Link } from "react-router";
import { useState } from "react";
import { CheckCircle2, FileSignature, Loader2, LocateFixed, MapPin, ShieldAlert, XCircle } from "lucide-react";
import { ActionButton, GF } from "../../../../components/system/design-system";
import { describeSessionError, realEnotarySessionsService, type PartyLocation, type Session } from "../../../../services/real/enotary-sessions.service";
import { withProcess } from "../../../../config/process-screens";
import { E } from "../EnotaryChrome";
import { hintStyle } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";
import { checkedSince } from "./device-location";
import { locationWanted, remedyFor, useLocationCheck } from "./location-check";

const HOW_TO_ALLOW = [
  "On a computer: click the lock or settings icon at the left of the address bar, set Location to Allow, and reload if asked.",
  "On an iPhone: Settings, Privacy & Security, Location Services: turn it on, and set Safari Websites (or your browser) to While Using.",
  "On Android: turn on Location in quick settings; in Chrome, tap the icon at the left of the address bar, then Permissions, Location, Allow.",
];

const partyLine = (party: PartyLocation): string =>
  `${party.accuracyM === null ? "" : `±${party.accuracyM >= 1000 ? `${(party.accuracyM / 1000).toFixed(1)} km` : `${String(party.accuracyM)} m`} · `}checked ${stampLabel(party.at)}`;

export function LocationPanel({ session: s, onChanged }: { session: Session; onChanged: (next: Session) => void }) {
  const { check, checking, problem } = useLocationCheck(s, onChanged);
  // 129. The party's own declaration of the place the check found (Rule III, Sec. 2(c)).
  const [declaring, setDeclaring] = useState(false);
  const [declareProblem, setDeclareProblem] = useState<string | null>(null);
  if (!locationWanted(s)) return null;
  const location = s.location!;
  const mine = location[s.role];
  const theirs = location[s.role === "client" ? "notary" : "client"];
  const other = s.role === "client" ? `Atty. ${s.notaryName}` : s.clientName;
  const passed = mine !== null && mine.outcome === "within";
  const asked = s.role === "client" && location.recheckRequestedAt !== null && checkedSince(mine, location.recheckRequestedAt) === null;

  return (
    <section data-testid="location-panel" aria-labelledby="location-h"
      style={{ ...GF, display: "grid", gridTemplateColumns: "38px minmax(0, 1fr)", gap: 12, alignItems: "start", padding: "14px 16px", borderRadius: 16, background: "#FFFFFF",
        border: `1px solid ${mine === null ? "#F0D9A8" : passed ? "#BFE0C8" : "#F2C4CB"}`, boxShadow: "0 1px 2px rgba(10,26,43,0.05), 0 18px 44px -28px rgba(10,26,43,0.3)", boxSizing: "border-box" }}>
      <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: passed ? E.okWash : mine === null ? "#FFF8EC" : "#FDECEE", color: passed ? E.ok : mine === null ? "#7A4B00" : "#B0182B" }}>
        {passed ? <CheckCircle2 size={18} /> : mine === null ? <MapPin size={18} /> : <ShieldAlert size={18} />}
      </span>
      <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
        <h3 id="location-h" style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: E.navy, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          Your location
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: E.maroon, background: E.maroonWash, border: `1px solid ${E.maroonLine}`, borderRadius: 999, padding: "2px 8px" }}>Required by the Rules</span>
        </h3>
        {/* One plain sentence; the legal reference is the footnote at the foot of the card (client's request, 30 October). */}
        <p data-testid="location-notice" style={{ ...hintStyle, margin: 0 }}>
          Every party must be in the Philippines during the notarization.<sup aria-hidden="true">1</sup>{" "}
          LAGDA checks your device&rsquo;s location{location.connectionChecked === true ? " and your internet connection" : ""} to confirm it. Only {other} sees where you are: your city or municipality and province.
        </p>

        {asked && (
          <p data-testid="location-asked" role="status" style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#7A4B00" }}>
            {other} asked to check your location again before recording the act.
          </p>
        )}

        {mine === null ? (
          <p data-testid="location-mine" style={{ margin: 0, fontSize: 14, color: E.ink }}>You have not shared your location yet.</p>
        ) : passed ? (
          <p data-testid="location-mine" style={{ margin: 0, fontSize: 14, color: E.ink }}>
            <strong style={{ color: E.ok }}>{mine.words}</strong>
            <small style={{ display: "block", marginTop: 2, fontSize: 12, color: E.quiet }}>{partyLine(mine)}</small>
          </p>
        ) : (
          <div data-testid="location-mine" role="alert" style={{ fontSize: 14, color: E.ink }}>
            <strong style={{ display: "flex", gap: 6, alignItems: "center", color: "#B0182B" }}><XCircle size={16} aria-hidden /> {mine.words}</strong>
            <p data-testid="location-remedy" style={{ margin: "4px 0 0", fontSize: 13.5, color: E.text }}>{remedyFor(mine)}</p>
            {mine.reason === "denied" && (
              <ul data-testid="location-how" style={{ margin: "6px 0 0", paddingLeft: 18, listStyle: "disc", fontSize: 13, color: E.text, lineHeight: 1.55 }}>
                {HOW_TO_ALLOW.map(line => <li key={line}>{line}</li>)}
              </ul>
            )}
          </div>
        )}

        {passed && mine.declaredAt !== undefined && (mine.declaredAt === null ? (
          <div data-testid="location-declaration" style={{ padding: "12px 14px", borderRadius: 12, background: E.skyWash, border: `1px solid ${E.line}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: E.navy }}>Your declaration</p>
            <p data-testid="declaration-text" style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.55, color: E.ink }}>
              I declare that I am physically present in <strong>{mine.place}</strong>, Philippines, during this notarization, and that this is my actual location.
            </p>
            {declareProblem !== null && <p role="alert" style={{ margin: "0 0 8px", fontSize: 13.5, color: "#B0182B" }}>{declareProblem}</p>}
            <ActionButton icon={declaring ? Loader2 : FileSignature} disabled={declaring} onClick={() => {
              setDeclaring(true); setDeclareProblem(null);
              void withProcess("enotary-location-declare", "", () => realEnotarySessionsService.declareLocation(s.id), describeSessionError).then(onChanged, (error: unknown) => { setDeclareProblem(describeSessionError(error)); })
                .finally(() => { setDeclaring(false); });
            }}>
              {declaring ? "Recording your declaration…" : "I confirm this statement"}
            </ActionButton>
          </div>
        ) : (
          <p data-testid="location-declared" style={{ margin: 0, display: "flex", gap: 6, alignItems: "center", fontSize: 13.5, fontWeight: 700, color: E.ok }}>
            <FileSignature size={15} aria-hidden /> You declared this location on {stampLabel(mine.declaredAt)}.
          </p>
        ))}

        {problem !== null && <p role="alert" style={{ margin: 0, fontSize: 13.5, color: "#B0182B" }}>{problem}</p>}

        <div>
          <ActionButton icon={checking ? Loader2 : LocateFixed} kind={passed ? "secondary" : "primary"} disabled={checking} onClick={() => { void withProcess("enotary-location-check", "", () => check()); }}>
            {checking ? "Checking your location…" : mine === null ? "Share my location" : "Check again"}
          </ActionButton>
        </div>

        <p data-testid="location-theirs" style={{ margin: 0, paddingTop: 8, borderTop: `1px solid ${E.line}`, fontSize: 13, color: E.text }}>
          {theirs === null ? `${other} has not shared their location yet.`
            : theirs.outcome === "within" ? <><strong>{other}:</strong> {theirs.words.replace(/^Within/, "within")} <span style={{ color: E.quiet }}>({partyLine(theirs)}{theirs.declaredAt === undefined ? "" : theirs.declaredAt === null ? " · not yet declared" : " · declared"})</span></>
              : <><strong style={{ color: "#B0182B" }}>{other}&rsquo;s location check did not pass:</strong> {theirs.words.charAt(0).toLowerCase()}{theirs.words.slice(1)}.
                {s.role === "notary" && theirs.reason === "denied" ? " Their screen shows them how to allow it; you can also guide them on the call." : " The session waits until it passes."}</>}
        </p>

        <p data-testid="location-footnote" style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: E.quiet }}>
          <sup>1</sup> Rule III, Sec. 2(c), Rules on Electronic Notarization (A.M. No. 24-10-14-SC). Your exact position is kept with the
          notarial record and shown to no one. <Link to="/legal/privacy" style={{ color: "inherit", fontWeight: 700 }}>Privacy Policy</Link>
        </p>
      </div>
    </section>
  );
}
