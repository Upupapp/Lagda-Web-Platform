// 128. The location check, out of the page's way: a round button just above the audit trail's at the bottom right of the
// window, and the check itself in a dialog in the middle of the page, closed until the party opens it. The button says
// where the party stands in a small bubble, and wiggles while something is asked of them (share the location, check
// again, or a check that did not pass). The card stays mounted while the dialog is closed, so the checks it makes by
// itself (on entering the room, and when the notary asks again before the act) go on.
//
// The dialog also explains, formally, how LAGDA's automatic location verification establishes that the client and the
// notary are both within Philippine territory (Rule III, Sec. 2(c) of the Rules on Electronic Notarization).

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, MapPin, ShieldAlert, X } from "lucide-react";
import { GF } from "../../../../components/system/design-system";
import type { Session } from "../../../../services/real/enotary-sessions.service";
import { Z } from "../../../../utils/z-index";
import { E } from "../EnotaryChrome";
import { LocationPanel } from "./LocationPanel";
import { OPEN_LOCATION_EVENT, standingOf, type LocatorTone } from "./location-check";

const TONE: Record<LocatorTone, { fill: string; ring: string; text: string }> = {
  ok: { fill: E.ok, ring: "#BFE0C8", text: E.ok },
  wait: { fill: "#B7791F", ring: "#F0D9A8", text: "#7A4B00" },
  bad: { fill: "#B0182B", ring: "#F2C4CB", text: "#B0182B" },
};

const STYLES = `
@keyframes eno-loc-wiggle { 0%, 100% { transform: rotate(0); } 4% { transform: rotate(-14deg) scale(1.06); } 8% { transform: rotate(12deg) scale(1.06); }
  12% { transform: rotate(-9deg); } 16% { transform: rotate(6deg); } 20% { transform: rotate(0); } }
@keyframes eno-loc-pop { from { opacity: 0; transform: translateY(6px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes eno-loc-pulse { 0% { box-shadow: 0 0 0 0 var(--eno-loc-ring); } 70% { box-shadow: 0 0 0 12px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
.eno-loc-fab.is-asking { animation: eno-loc-wiggle 3.2s ease-in-out 0.6s infinite; }
.eno-loc-fab.is-asking::after { content: ""; position: absolute; inset: 0; border-radius: 999px; animation: eno-loc-pulse 1.6s ease-out infinite; }
.eno-loc-fab.is-new { animation: eno-loc-wiggle 1.6s ease-in-out 0.3s 1; }
.eno-loc-fab:focus-visible, .eno-loc-bubble button:focus-visible, .eno-loc-close:focus-visible { outline: 3px solid ${E.skyDeep}; outline-offset: 2px; }
.eno-loc-bubble { animation: eno-loc-pop 0.22s ease-out; }
@media (prefers-reduced-motion: reduce) { .eno-loc-fab.is-asking, .eno-loc-fab.is-new, .eno-loc-fab.is-asking::after, .eno-loc-bubble { animation: none; } }
`;

/** The corner the audit trail's button sits in, and the room this button keeps above it. */
const EDGE = "clamp(12px, 3vw, 24px)";
const ABOVE_TRAIL = `calc(${EDGE} + 58px)`;

export function LocationLocator({ session: s, onChanged }: { session: Session; onChanged: (next: Session) => void }) {
  const [open, setOpen] = useState(false);
  const standing = standingOf(s);
  const asking = standing.tone !== "ok";
  const [bubble, setBubble] = useState(true);
  const [fresh, setFresh] = useState(false);
  const fab = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const seen = useRef(standing.key);

  // A new standing (shared, verified, refused, asked again) shows the bubble again, with one wiggle when nothing is asked.
  useEffect(() => {
    if (seen.current === standing.key) return;
    seen.current = standing.key;
    setBubble(true);
    setFresh(true);
    const done = setTimeout(() => { setFresh(false); }, 2200);
    return () => { clearTimeout(done); };
  }, [standing.key]);
  // A verified location needs nothing more: its bubble goes after a while. One that asks something stays until opened.
  useEffect(() => {
    if (!bubble || asking) return;
    const gone = setTimeout(() => { setBubble(false); }, 8000);
    return () => { clearTimeout(gone); };
  }, [bubble, asking, standing.key]);

  useEffect(() => {
    const show = () => { setOpen(true); setBubble(false); };
    window.addEventListener(OPEN_LOCATION_EVENT, show);
    return () => { window.removeEventListener(OPEN_LOCATION_EVENT, show); };
  }, []);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); fab.current?.focus(); } };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); };
  }, [open]);
  const close = () => { setOpen(false); fab.current?.focus(); };
  const tone = TONE[standing.tone];

  return (
    <>
      <style>{STYLES}</style>
      {bubble && !open && (
        <div className="eno-loc-bubble" data-testid="locator-bubble" role="status"
          style={{ ...GF, position: "fixed", right: `calc(${EDGE} + 60px)`, bottom: ABOVE_TRAIL, zIndex: Z.sticky, width: "max-content", maxWidth: "min(300px, calc(100vw - 96px))",
            display: "flex", alignItems: "flex-start", gap: 6, padding: "9px 8px 9px 12px", borderRadius: 12, background: "#FFFFFF", border: `1px solid ${tone.ring}`,
            boxShadow: "0 14px 34px -14px rgba(10,26,43,0.45)", boxSizing: "border-box" }}>
          <button type="button" onClick={() => { setOpen(true); setBubble(false); }}
            style={{ ...GF, flex: "1 1 auto", minWidth: 0, padding: 0, border: 0, background: "transparent", textAlign: "left", cursor: "pointer", color: E.ink }}>
            <strong style={{ display: "block", fontSize: 13, color: tone.text }}>{standing.title}</strong>
            <span style={{ display: "block", marginTop: 2, fontSize: 12.5, lineHeight: 1.4, color: E.text, overflowWrap: "anywhere" }}>{standing.detail}</span>
          </button>
          <button type="button" onClick={() => { setBubble(false); }} aria-label="Hide this message" data-testid="locator-bubble-close"
            style={{ flex: "0 0 auto", width: 24, height: 24, display: "grid", placeItems: "center", padding: 0, border: 0, borderRadius: 6, background: "transparent", color: E.quiet, cursor: "pointer" }}>
            <X size={14} aria-hidden />
          </button>
        </div>
      )}
      <button ref={fab} type="button" data-testid="locator-toggle" data-tone={standing.tone} aria-haspopup="dialog" aria-expanded={open}
        aria-label={`Location verification: ${standing.title}`} title="Location verification"
        className={`eno-loc-fab${asking ? " is-asking" : fresh ? " is-new" : ""}`}
        onClick={() => { setOpen(true); setBubble(false); }}
        style={{ ["--eno-loc-ring" as string]: tone.ring, position: "fixed", right: EDGE, bottom: ABOVE_TRAIL, zIndex: Z.sticky, width: 48, height: 48, padding: 0, borderRadius: 999,
          display: "grid", placeItems: "center", border: `2px solid ${tone.fill}`, background: "#FFFFFF", color: tone.fill, cursor: "pointer", boxShadow: "0 10px 26px -10px rgba(10,26,43,0.55)" }}>
        <MapPin size={21} aria-hidden />
        <span aria-hidden="true" style={{ position: "absolute", right: -2, top: -2, width: 18, height: 18, borderRadius: 999, display: "grid", placeItems: "center", background: tone.fill, color: "#FFFFFF", border: "2px solid #FFFFFF" }}>
          {standing.tone === "ok" ? <CheckCircle2 size={11} /> : standing.tone === "bad" ? <ShieldAlert size={11} /> : <span style={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>!</span>}
        </span>
      </button>

      <div data-testid="locator-overlay" aria-hidden={!open} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}
        style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: open ? "grid" : "none", placeItems: "center", padding: "clamp(10px, 3vw, 24px)", background: "rgba(10,26,43,0.5)" }}>
        <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="locator-h" tabIndex={-1} data-testid="locator-dialog"
          style={{ ...GF, position: "relative", width: "min(660px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", borderRadius: 16, background: E.paper,
            boxShadow: "0 30px 80px -20px rgba(10,26,43,0.6)", outline: "none", padding: "20px clamp(14px, 3vw, 24px) 22px", boxSizing: "border-box" }}>
          <button type="button" onClick={close} aria-label="Close the location verification" data-testid="locator-close" className="eno-loc-close"
            style={{ position: "absolute", right: 10, top: 10, zIndex: 1, width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 10, border: `1px solid ${E.line}`, background: "#FFFFFF", color: E.navy, cursor: "pointer" }}>
            <X size={18} aria-hidden />
          </button>
          <p style={{ margin: "0 48px 4px 0", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: E.maroon }}>Rule III, Sec. 2(c) &middot; <span style={{ whiteSpace: "nowrap" }}>A.M. No. 24-10-14-SC</span></p>
          <h2 id="locator-h" style={{ margin: "0 48px 14px 0", fontSize: 20, color: E.navy }}>Location verification</h2>
          <LocationPanel session={s} onChanged={onChanged} />
          <LocatorExplainer session={s} />
        </div>
      </div>
    </>
  );
}

/** How LAGDA's automatic location verification works, and why: formally, for both parties. */
export function LocatorExplainer({ session: s }: { session: Session }) {
  const connection = s.location?.connectionChecked === true;
  const steps: { title: string; text: string }[] = [
    { title: "Device position", text: "With your permission, your browser provides the position of your device from its location services (GPS, Wi-Fi or mobile network), together with its accuracy." },
    { title: "Philippine territory", text: "LAGDA's own server places that position against the official boundaries of the cities and municipalities of the Philippines (administrative boundaries of NAMRIA and the Philippine Statistics Authority). A position outside Philippine territory is not accepted, and no external map service receives your position." },
    { title: "Your declaration", text: "Once your location is verified, you confirm a short statement that you are physically present at that place in the Philippines, as Rule III, Sec. 2(c) requires every party to disclose their actual physical location. The notarial act can be recorded only when both parties have declared." },
    ...(connection ? [{ title: "Internet connection", text: "LAGDA also screens each party's internet connection for virtual private networks (VPNs) and other technology that alters a user's apparent location, as Rule VII, Sec. 2(i) of the Rules requires of an electronic notarization facility, and confirms that the connection itself comes from the Philippines. A connection from abroad is not accepted, even when the device's position is in the Philippines." }] : []),
    { title: "Automatic re-verification", text: "Once allowed, the verification runs by itself when you enter the session room, and both parties' locations are verified again immediately before the notarial act. The session cannot proceed while either party is outside the Philippines." },
    { title: "Notarial record", text: "The verified city or municipality and province of the client and of the notary public, with the accuracy and time of each verification, are stated in the notarized document and entered in the notary public's electronic notarial book (Rule VIII, Sec. 2(a)(viii))." },
  ];
  return (
    <section data-testid="locator-explainer" aria-labelledby="locator-how-h" style={{ marginTop: 16, padding: "16px 16px 14px", borderRadius: 14, background: E.wash, border: `1px solid ${E.line}` }}>
      <h3 id="locator-how-h" style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: E.navy }}>How LAGDA verifies the location of the parties</h3>
      <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.6, color: E.text }}>
        Under Rule III, Section 2(c) of the Rules on Electronic Notarization (A.M. No. 24-10-14-SC), the notary public must ascertain that all parties
        are present in the Philippines through the geolocation function of the electronic notarization facility. LAGDA performs this verification
        with an automatic location verification tool, for the client and for the notary public alike.
      </p>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
        {steps.map((step, index) => (
          <li key={step.title} style={{ display: "grid", gridTemplateColumns: "26px minmax(0, 1fr)", gap: 10, alignItems: "start" }}>
            <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", background: E.navy, color: "#FFFFFF", fontSize: 12, fontWeight: 800 }}>{index + 1}</span>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: E.text }}><strong style={{ color: E.ink }}>{step.title}.</strong> {step.text}</p>
          </li>
        ))}
      </ol>
      <p style={{ margin: "12px 0 0", fontSize: 12.5, lineHeight: 1.55, color: E.quiet }}>
        Only the other party sees your city or municipality and province. Your exact position is kept with the notarial record and shown to no one.{" "}
        <Link to="/legal/privacy" style={{ color: "inherit", fontWeight: 700 }}>Privacy Policy</Link>
      </p>
    </section>
  );
}
