// The client's address for the notarial record: where they are while the act is done, typed by them in the room, as
// their own disclosure. (The device's location is checked apart from it, by the location card: 128.) The client gives it
// (in the waiting room or the open room) and may correct it until the act is recorded; the notary sees it in the room,
// and it goes into the notarial register entry and the notarized document's information sheet. Only the client and the
// notary of the request see it.

import { useState } from "react";
import { CheckCircle2, MapPin, Pencil, XCircle } from "lucide-react";
import { ActionButton, ActionRow, GF, Notice } from "../../../../components/system/design-system";
import { withProcess } from "../../../../config/process-screens";
import { formatClientAddress, type ClientAddressInput, type Session } from "../../../../services/real/enotary-sessions.service";
import { E } from "../EnotaryChrome";
import { Panel, PanelTitle, TextField, bodyText, hintStyle } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";

export const STREET_MAX = 160;
export const CITY_MAX = 80;
export const PROVINCE_MAX = 80;

/** Letters (with the accents of Filipino place names), digits and the punctuation of an address: what the server takes. */
const ADDRESS_TEXT = /^[A-Za-z0-9À-ÖØ-öø-ÿ .,#'’\-/()&:;"°]+$/;

const tidy = (value: string): string => value.replace(/\s+/g, " ").trim();

function problemOf(value: string, label: string): string | null {
  const text = tidy(value);
  if (text === "") return `Enter ${label}.`;
  if (!ADDRESS_TEXT.test(text)) return "Use letters, numbers and the punctuation of an address only.";
  return null;
}

/** The client's form: three fields, saved together. */
export function ClientAddressPanel({ session, onSave, onSaved }: {
  session: Session;
  onSave: (address: ClientAddressInput) => Promise<Session>;
  onSaved: (next: Session) => void;
}) {
  const given = session.clientAddress ?? null;
  const [editing, setEditing] = useState(given === null);
  const [street, setStreet] = useState(given?.street ?? "");
  const [city, setCity] = useState(given?.city ?? "");
  const [province, setProvince] = useState(given?.province ?? "");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  const problems = {
    street: problemOf(street, "the street or barangay"),
    city: problemOf(city, "the city or municipality"),
    province: problemOf(province, "the province"),
  };
  const valid = problems.street === null && problems.city === null && problems.province === null;

  const save = async () => {
    setTried(true);
    setSaid(null);
    if (!valid) return;
    setSaving(true);
    setProblem(null);
    try {
      const next = await withProcess("enotary-address", "", () => onSave({ street: tidy(street), city: tidy(city), province: tidy(province) }),
        () => "The address could not be saved. Check each part, then try again.");
      onSaved(next);
      setEditing(false);
      setSaid("Your address is saved. The notary sees it in the room.");
    } catch {
      setProblem("The address could not be saved. Check each part, then try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing && given !== null) {
    return (
      <section data-testid="address-panel" aria-labelledby="address-given-h"
        style={{ ...GF, display: "grid", gridTemplateColumns: "38px minmax(0, 1fr)", gap: 12, alignItems: "start", padding: "14px 16px", borderRadius: 16, background: "#FFFFFF", border: `1px solid ${E.line}`, boxShadow: "0 1px 2px rgba(10,26,43,0.05), 0 18px 44px -28px rgba(10,26,43,0.3)", boxSizing: "border-box" }}>
        <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: E.skyWash, color: E.skyDeep }}><MapPin size={18} /></span>
        <div style={{ minWidth: 0 }}>
          <h3 id="address-given-h" style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: E.navy }}>Your address for the notarial record</h3>
          <p data-testid="address-given" style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.45, color: E.ink, overflowWrap: "anywhere" }}>
            <strong>{formatClientAddress(given)}</strong>
            <small style={{ display: "block", marginTop: 3, fontSize: 12, color: E.quiet, fontWeight: 400 }}>Given {stampLabel(given.givenAt)}. Only you and the notary see it.</small>
          </p>
          {said !== null && <p role="status" style={{ margin: "10px 0 0", fontSize: 13.5, fontWeight: 600, color: E.ok, display: "flex", gap: 6, alignItems: "center" }}><CheckCircle2 size={15} aria-hidden /> {said}</p>}
          <div style={{ marginTop: 10 }}>
            <ActionButton kind="secondary" icon={Pencil} onClick={() => { setEditing(true); setSaid(null); setTried(false); }}>Change the address</ActionButton>
          </div>
        </div>
      </section>
    );
  }

  return (
    <Panel testId="address-panel" tone="maroon">
      <PanelTitle>Where are you during the notarization?</PanelTitle>
      <p style={bodyText}>
        The notarial record states where you are while the act is done, in your own words: type the street or barangay, city or municipality, and province. It is recorded beside the city LAGDA&rsquo;s location verification finds. Only you and the notary see it.
      </p>
      <TextField label="Street or barangay" value={street} onChange={setStreet} maxLength={STREET_MAX} required autoComplete="address-line1"
        placeholder="e.g. 12 Rizal St., Brgy. San Jose" error={tried ? problems.street : null} />
      <div style={{ display: "grid", gap: "0 12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <TextField label="City or municipality" value={city} onChange={setCity} maxLength={CITY_MAX} required autoComplete="address-level2"
          placeholder="e.g. Naga City" error={tried ? problems.city : null} />
        <TextField label="Province" value={province} onChange={setProvince} maxLength={PROVINCE_MAX} required autoComplete="address-level1"
          placeholder="e.g. Camarines Sur" error={tried ? problems.province : null} />
      </div>
      <p style={{ ...hintStyle, margin: 0 }}>The notary cannot record the act until you give it. You can correct it until then.</p>
      {problem !== null && <Notice icon={XCircle} tone="danger">{problem}</Notice>}
      <ActionRow align="end">
        {given !== null && <ActionButton kind="secondary" disabled={saving} onClick={() => { setEditing(false); setStreet(given.street); setCity(given.city); setProvince(given.province); setTried(false); }}>Keep the saved address</ActionButton>}
        <ActionButton icon={MapPin} disabled={saving} onClick={() => { void save(); }}>{saving ? "Saving…" : given === null ? "Save my address" : "Save the new address"}</ActionButton>
      </ActionRow>
    </Panel>
  );
}

/** What the notary sees: the address as the client gave it, or that it is still to come. */
export function ClientAddressView({ session }: { session: Session }) {
  const given = session.clientAddress ?? null;
  return (
    <section data-testid="address-view" aria-labelledby="address-view-h"
      style={{ ...GF, display: "grid", gridTemplateColumns: "38px minmax(0, 1fr)", gap: 12, alignItems: "start", padding: "14px 16px", borderRadius: 16, background: "#FFFFFF", border: `1px solid ${E.line}`, boxShadow: "0 1px 2px rgba(10,26,43,0.05), 0 18px 44px -28px rgba(10,26,43,0.3)", boxSizing: "border-box" }}>
      <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: E.skyWash, color: E.skyDeep }}><MapPin size={18} /></span>
      <div style={{ minWidth: 0 }}>
        <h3 id="address-view-h" style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: E.navy }}>Client&rsquo;s address for the notarial record</h3>
        {given === null ? (
          <p data-testid="address-missing" style={{ margin: "4px 0 0", fontSize: 13.5, lineHeight: 1.5, color: E.text }}>{session.clientName} has not given it yet. They type it in the room, and you cannot record the act without it.</p>
        ) : (
          <>
            <p data-testid="address-given" style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.45, color: E.ink, overflowWrap: "anywhere" }}>
              <strong>{formatClientAddress(given)}</strong>
              <small style={{ display: "block", marginTop: 3, fontSize: 12, color: E.quiet, fontWeight: 400 }}>Typed by the client {stampLabel(given.givenAt)}. It goes into your register entry and the information sheet.</small>
            </p>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, padding: "3px 9px", borderRadius: 999, background: E.okWash, color: E.ok, fontSize: 11.5, fontWeight: 800 }}><CheckCircle2 size={12} aria-hidden /> Given</span>
          </>
        )}
      </div>
    </section>
  );
}
