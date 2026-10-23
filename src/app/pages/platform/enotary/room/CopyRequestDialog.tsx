// The client's request for certified true copies, in a panel in the middle of the page: two choice buttons (a digital
// copy, or printed copies sent by courier), the delivery details printed copies need, and the button that asks the
// notary. It opens from the step-7 prompt, from step 8 on the rail and from the copies panel itself.

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { FileDown, Info, Minus, Plus, Send, ShieldAlert, Truck, X } from "lucide-react";
import { ActionButton, GF, Notice } from "../../../../components/system/design-system";
import {
  describeSessionError, realEnotarySessionsService, type CertifiedCopy, type CopyRequestInput, type CtcMode,
} from "../../../../services/real/enotary-sessions.service";
import { withProcess } from "../../../../config/process-screens";
import { Z } from "../../../../utils/z-index";
import { E } from "../EnotaryChrome";
import { TextField, labelStyle, fieldStyle } from "../onramp-ui";

const MODES = [
  { value: "digital", title: "Digital certified copy", text: "A PDF with the notary's certification and a verification code, to download here.", icon: FileDown },
  { value: "physical", title: "Printed copies by courier", text: "Signed and sealed paper copies, sent to the address you give.", icon: Truck },
] as const;

const STYLES = `
.eno-ctc-choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0 0 16px; }
.eno-ctc-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
.eno-ctc-choice { position: relative; display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 10px; align-items: start; padding: 14px 40px 13px 14px; border: 1.5px solid ${E.line}; border-radius: 14px; background: #FFFFFF; text-align: left; cursor: pointer; }
.eno-ctc-choice:hover { border-color: ${E.skyLine}; }
.eno-ctc-choice.is-on { border-color: ${E.sky}; background: #F5FAFE; box-shadow: 0 0 0 3px rgba(10,132,214,0.14); }
.eno-ctc-choice:focus-visible, .eno-ctc-close:focus-visible, .eno-ctc-step:focus-visible { outline: 3px solid ${E.skyDeep}; outline-offset: 2px; }
@media (max-width: 560px) { .eno-ctc-choices, .eno-ctc-pair { grid-template-columns: minmax(0, 1fr); } }
`;

const STEP_BUTTON = { width: 44, minHeight: 44, display: "grid", placeItems: "center", padding: 0, border: 0, background: "#FFFFFF", color: E.navy, cursor: "pointer" } as const;

export function CopyRequestDialog({ sessionId, notaryName, onClose, onDone }: {
  sessionId: string; notaryName?: string | undefined; onClose: () => void; onDone: (copy: CertifiedCopy) => void;
}) {
  const [mode, setMode] = useState<CtcMode>("digital");
  const [copies, setCopies] = useState("1");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const choices = useRef<(HTMLButtonElement | null)[]>([]);
  const working = useRef(false);
  const closing = useRef(onClose);
  closing.current = onClose;

  // Focus moves into the panel and goes back where it came from; Esc closes it, unless the request is on its way.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && !working.current) closing.current(); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); if (opener?.isConnected === true) opener.focus(); };
  }, []);

  const count = Number(copies);
  const countOk = Number.isInteger(count) && count >= 1 && count <= 10;
  const ready = mode === "digital" || (countOk && name.trim() !== "" && phone.trim() !== "" && address.trim() !== "");
  const step = (by: number) => { setCopies(String(Math.min(10, Math.max(1, (countOk ? count : 1) + by)))); };
  const send = async () => {
    setBusy(true);
    working.current = true;
    setProblem(null);
    const input: CopyRequestInput = mode === "digital" ? { mode } : { mode, copies: count, deliveryName: name.trim(), deliveryPhone: phone.trim(), deliveryAddress: address.trim() };
    try {
      onDone(await withProcess("enotary-copy-request", "", () => realEnotarySessionsService.requestCopy(sessionId, input), describeSessionError));
    } catch (error) {
      setProblem(describeSessionError(error));
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  // The arrow keys move between the two choices, as in any group of radio buttons.
  const arrows = (index: number) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const by = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (by === 0) return;
    event.preventDefault();
    const next = (index + by + MODES.length) % MODES.length;
    const target = MODES[next];
    if (target === undefined) return;
    setMode(target.value);
    choices.current[next]?.focus();
  };
  const notary = notaryName === undefined || notaryName.trim() === "" ? "The notary" : /^atty\.?\s/i.test(notaryName) ? notaryName : `Atty. ${notaryName}`;

  return (
    <div data-testid="copy-dialog-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !working.current) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "grid", placeItems: "center", padding: "clamp(10px, 3vw, 24px)", background: "rgba(10,26,43,0.5)" }}>
      <style>{STYLES}</style>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="copy-dialog-h" tabIndex={-1} data-testid="copy-dialog"
        style={{ ...GF, position: "relative", width: "min(620px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", borderRadius: 16, background: E.paper,
          boxShadow: "0 30px 80px -20px rgba(10,26,43,0.6)", outline: "none", padding: "22px clamp(14px, 3vw, 26px)", boxSizing: "border-box" }}>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close" data-testid="copy-dialog-close" className="eno-ctc-close"
          style={{ position: "absolute", right: 10, top: 10, zIndex: 1, width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 10, border: `1px solid ${E.line}`, background: "#FFFFFF", color: E.navy, cursor: "pointer" }}>
          <X size={18} aria-hidden />
        </button>
        <p style={{ margin: "0 48px 4px 0", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: E.maroon }}>Step 8 &middot; Certified True Copy</p>
        <h2 id="copy-dialog-h" style={{ margin: "0 48px 8px 0", fontSize: 21, color: E.navy }}>Certified true copies</h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.55, color: E.text }}>
          A certified true copy is a copy {notary === "The notary" ? "the notary" : notary} certifies as a true copy of your notarized document. Choose a digital copy, or printed copies sent to you.
        </p>
        {problem !== null && <Notice icon={ShieldAlert} tone="danger"><span data-testid="copy-dialog-problem">{problem}</span></Notice>}

        <p id="copy-mode-label" style={labelStyle}>What do you need?</p>
        <div role="radiogroup" aria-labelledby="copy-mode-label" className="eno-ctc-choices">
          {MODES.map((choice, index) => {
            const on = mode === choice.value;
            const Icon = choice.icon;
            return (
              <button key={choice.value} ref={element => { choices.current[index] = element; }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
                aria-labelledby={`copy-mode-${choice.value}-t`} aria-describedby={`copy-mode-${choice.value}-d`} data-testid={`copy-mode-${choice.value}`}
                className={on ? "eno-ctc-choice is-on" : "eno-ctc-choice"} onClick={() => { setMode(choice.value); }} onKeyDown={arrows(index)} style={GF}>
                <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: on ? E.skyWash : E.wash, color: on ? E.skyDeep : E.quiet }}><Icon size={20} /></span>
                <span style={{ minWidth: 0 }}>
                  <span id={`copy-mode-${choice.value}-t`} style={{ display: "block", margin: "1px 0 3px", fontSize: 14.5, fontWeight: 800, color: E.navy }}>{choice.title}</span>
                  <span id={`copy-mode-${choice.value}-d`} style={{ display: "block", fontSize: 12.5, lineHeight: 1.45, color: E.quiet }}>{choice.text}</span>
                </span>
                <span aria-hidden="true" style={{ position: "absolute", right: 10, top: 10, width: 20, height: 20, borderRadius: 999, boxSizing: "border-box", display: "grid", placeItems: "center",
                  border: `1.5px solid ${on ? E.sky : "#C9D4E0"}`, background: on ? E.sky : "#FFFFFF", color: "#FFFFFF", fontSize: 12, fontWeight: 900 }}>{on ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>

        {mode === "physical" && (
          <div data-testid="copy-delivery-fields">
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="copy-count" style={labelStyle}>How many copies (1 to 10)</label>
              <div style={{ display: "inline-flex", alignItems: "stretch", border: `1.5px solid ${countOk ? "#C9D4E0" : "#B0182B"}`, borderRadius: 10, overflow: "hidden" }}>
                <button type="button" className="eno-ctc-step" aria-label="One copy fewer" disabled={countOk && count <= 1} onClick={() => { step(-1); }} style={STEP_BUTTON}><Minus size={16} aria-hidden /></button>
                <input id="copy-count" inputMode="numeric" value={copies} onChange={event => { setCopies(event.target.value); }}
                  style={{ ...fieldStyle(false), width: 56, minHeight: 44, border: 0, borderLeft: `1px solid ${E.line}`, borderRight: `1px solid ${E.line}`, borderRadius: 0, textAlign: "center", fontWeight: 700 }} />
                <button type="button" className="eno-ctc-step" aria-label="One copy more" disabled={countOk && count >= 10} onClick={() => { step(1); }} style={STEP_BUTTON}><Plus size={16} aria-hidden /></button>
              </div>
            </div>
            <div className="eno-ctc-pair">
              <TextField label="Send to (name)" value={name} onChange={setName} maxLength={200} autoComplete="name" required />
              <TextField label="Phone number for the courier" value={phone} onChange={setPhone} maxLength={50} inputMode="tel" autoComplete="tel" required />
            </div>
            <TextField label="Delivery address" value={address} onChange={setAddress} maxLength={500} autoComplete="street-address" required />
          </div>
        )}

        <p style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "4px 0 16px", padding: "10px 12px", borderRadius: 12, background: E.wash, border: `1px solid ${E.line}`, fontSize: 12.5, lineHeight: 1.5, color: E.text }}>
          <Info size={15} aria-hidden style={{ flex: "0 0 auto", marginTop: 2, color: E.skyDeep }} />
          <span>{notary} tells you the fee, if any, and you pay them directly by their QR. Your request then moves on to step 8, where you can follow it until the copy is in your hands.</span>
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <ActionButton kind="secondary" disabled={busy} onClick={onClose}>Cancel</ActionButton>
          <ActionButton icon={Send} disabled={busy || !ready} onClick={() => { void send(); }}>{busy ? "Asking…" : "Ask the notary for copies"}</ActionButton>
        </div>
      </div>
    </div>
  );
}
