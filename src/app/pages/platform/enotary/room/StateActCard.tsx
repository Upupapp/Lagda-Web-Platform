// The step-6 console's card for the notary to state the notarial act and the fee: the client's identity confirmed on the
// call, the kind of act as three choices with what each means, what the document is about, the fee (or none) and the QR
// it is paid to, and what follows once it is sent. The state and the call stay the room's (NotaryFlow); this only draws them.

import { useId } from "react";
import { Link } from "react-router";
import { CheckCircle2, QrCode, Send, Stamp, X } from "lucide-react";
import { Notice } from "../../../../components/system/design-system";
import { formatPesos } from "../../../../services/real/enotary-invitations.service";
import type { ActType, Session } from "../../../../services/real/enotary-sessions.service";
import { E, SERIF } from "../EnotaryChrome";
import { hintStyle } from "../onramp-ui";
import { stampLabel } from "../requests/expiry";

export const ACT_CHOICES: { value: ActType; label: string; hint: string }[] = [
  { value: "acknowledgment", label: "Acknowledgment", hint: "The client says the signature on the document is theirs, freely given." },
  { value: "jurat", label: "Jurat", hint: "The client swears to the contents and signs before the notary." },
  { value: "signature_witnessing", label: "Signature witnessing", hint: "The notary witnesses the client signing." },
];

const pesos = (centavos: number) => `PHP ${formatPesos(centavos)}`;

const CSS = `
  .sa-ok { margin: 0; display: flex; gap: 8px; align-items: center; padding: 9px 11px; border-radius: 10px; background: ${E.okWash}; color: ${E.ok}; font-size: 12.5px; font-weight: 700; line-height: 1.4; }
  .sa-ok svg { flex: 0 0 auto; }
  .sa-lbl { display: block; margin: 0 0 6px; padding: 0; font-size: 12.5px; font-weight: 800; color: ${E.ink}; }
  .sa-acts { display: grid; gap: 8px; border: 0; margin: 0; padding: 0; min-width: 0; }
  .sa-act { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; border: 1.5px solid ${E.maroonLine}; background: #FFFFFF; cursor: pointer; }
  .sa-act input { width: 18px; height: 18px; margin: 1px 0 0; accent-color: ${E.maroon}; flex: 0 0 auto; }
  .sa-act b { display: block; font-size: 13.5px; color: ${E.ink}; }
  .sa-act small { display: block; margin-top: 1px; font-size: 12px; color: ${E.quiet}; line-height: 1.4; }
  .sa-act.on { border-color: ${E.maroon}; background: #FFF7F9; box-shadow: 0 0 0 3px rgba(140,29,63,0.08); }
  .sa-act:focus-within { outline: 3px solid rgba(140,29,63,0.25); outline-offset: 1px; }
  .sa-field { display: block; width: 100%; box-sizing: border-box; min-height: 64px; padding: 9px 12px; border-radius: 10px; border: 1.5px solid #C5D2DF; background: #FFFFFF; font: inherit; font-size: 13.5px; line-height: 1.45; color: ${E.ink}; resize: vertical; }
  .sa-field:focus { outline: 3px solid rgba(140,29,63,0.2); border-color: ${E.maroon}; }
  .sa-fee { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: stretch; }
  .sa-amount { display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 12px; border-radius: 10px; border: 1.5px solid ${E.maroon}; box-shadow: 0 0 0 3px rgba(140,29,63,0.08); background: #FFFFFF; min-width: 0; }
  .sa-amount.off { border-color: #C5D2DF; box-shadow: none; background: #F3F4F6; }
  .sa-amount span { font-size: 12px; font-weight: 800; color: ${E.quiet}; }
  .sa-amount input { flex: 1 1 auto; min-width: 0; border: 0; outline: 0; background: transparent; font-family: ${SERIF}; font-weight: 700; font-size: 22px; color: ${E.navy}; }
  .sa-nofee { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 12px; border-radius: 10px; border: 1.5px dashed #C5D2DF; font-size: 13px; font-weight: 700; color: ${E.text}; cursor: pointer; white-space: nowrap; box-sizing: border-box; }
  .sa-nofee input { width: 18px; height: 18px; margin: 0; accent-color: ${E.maroon}; }
  .sa-paid { margin: 0; display: flex; align-items: flex-start; gap: 7px; font-size: 12.5px; color: ${E.quiet}; line-height: 1.45; }
  .sa-paid svg { flex: 0 0 auto; margin-top: 2px; }
  .sa-paid span { flex: 1 1 auto; min-width: 0; }
  .sa-paid b { color: ${E.ink}; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .sa-send { width: 100%; min-height: 48px; border: 0; border-radius: 12px; background: linear-gradient(110deg, #7E1229 0%, #951A33 55%, #A81E36 100%); color: #FFFFFF; font: 800 15px 'Geist', sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 8px 14px; cursor: pointer; box-shadow: 0 12px 24px -14px rgba(126,18,41,0.8); }
  .sa-send:disabled { opacity: 0.55; cursor: not-allowed; }
  .sa-send:focus-visible { outline: 3px solid rgba(140,29,63,0.35); outline-offset: 2px; }
  .sa-keep { justify-self: start; min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #C5D2DF; background: #FFFFFF; font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; }
  .sa-next { padding: 12px 12px 4px; border-radius: 12px; background: #FBFCFE; border: 1px solid ${E.line}; }
  .sa-next p { margin: 0 0 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${E.quiet}; }
  .sa-next ol { list-style: none; margin: 0; padding: 0; }
  .sa-next li { display: flex; gap: 10px; align-items: center; padding: 0 0 10px; font-size: 13px; color: ${E.text}; line-height: 1.45; }
  .sa-next li span { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 999px; display: grid; place-items: center; font-size: 11px; font-weight: 800; border: 1.5px solid ${E.maroonLine}; color: ${E.maroon}; background: #FFFFFF; }
  @media (max-width: 420px) { .sa-fee { grid-template-columns: minmax(0, 1fr); } .sa-nofee { justify-content: center; } }
`;

export function StateActCard({
  s, actType, setActType, note, setNote, fee, setFee, noFee, setNoFee, feeCentavos, feeProblem, ready, problem, busy, payee, onSend, onKeep, identity,
}: {
  s: Session; actType: ActType; setActType: (value: ActType) => void; note: string; setNote: (value: string) => void;
  fee: string; setFee: (value: string) => void; noFee: boolean; setNoFee: (value: boolean) => void; feeCentavos: number | null;
  feeProblem: string | null; ready: boolean; problem: string | null; busy: string | null; payee: string | null; onSend: () => void; onKeep?: () => void;
  /** 132. Before the identity is confirmed, this card confirms it too, in the same step. */
  identity?: { checked: boolean; setChecked: (value: boolean) => void; clientHere: boolean };
}) {
  const ids = useId();
  const charged = !noFee && feeCentavos !== null && feeCentavos > 0;
  return (
    <section className="s6-card s6-act" data-testid="state-panel" aria-labelledby={`${ids}-h`}>
      <style>{CSS}</style>
      <span className="s6-eyebrow"><Stamp size={14} aria-hidden /> Step 6 · Act and fee</span>
      <h3 id={`${ids}-h`}>State the notarial act and your fee</h3>
      {identity !== undefined && (
        <label className={`sa-act${identity.checked ? " on" : ""}`} data-testid="express-identity">
          <input type="checkbox" checked={identity.checked} disabled={!identity.clientHere} onChange={event => { identity.setChecked(event.target.checked); }} />
          <span><b>I confirmed {s.clientName}&rsquo;s identity on the call</b>
            <small>{identity.clientHere ? "LAGDA verified their ID and face. Compare a valid government ID with the person you see before you tick this." : `${s.clientName} is not in the room yet. You confirm their identity with them on the call.`}</small></span>
        </label>
      )}
      {s.identityConfirmedAt != null && (
        <p className="sa-ok" data-testid="sa-identity"><CheckCircle2 size={16} aria-hidden /> You confirmed the client&rsquo;s identity on the call · {stampLabel(s.identityConfirmedAt)}</p>
      )}
      <fieldset className="sa-acts">
        <legend className="sa-lbl">Kind of act</legend>
        {ACT_CHOICES.map(option => (
          <label key={option.value} className={`sa-act${actType === option.value ? " on" : ""}`}>
            <input type="radio" name={`${ids}-act`} value={option.value} checked={actType === option.value} onChange={() => { setActType(option.value); }} />
            <span><b>{option.label}</b><small>{option.hint}</small></span>
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor={`${ids}-note`} className="sa-lbl">What it is about</label>
        <textarea id={`${ids}-note`} className="sa-field" value={note} maxLength={300} onChange={event => { setNote(event.target.value); }}
          placeholder="e.g. Witnessing her signature on the affidavit of undertaking." />
      </div>
      <div>
        <label htmlFor={`${ids}-fee`} className="sa-lbl">Your fee</label>
        <div className="sa-fee">
          <div className={`sa-amount${noFee ? " off" : ""}`}>
            <span aria-hidden="true">PHP</span>
            <input id={`${ids}-fee`} data-testid="fee-input" inputMode="decimal" autoComplete="off" maxLength={12} placeholder="e.g. 600"
              value={noFee ? "0.00" : fee} readOnly={noFee} aria-readonly={noFee || undefined} aria-invalid={feeProblem !== null ? true : undefined}
              onChange={event => { if (!noFee) setFee(event.target.value); }} />
          </div>
          <label className="sa-nofee"><input type="checkbox" data-testid="no-fee" checked={noFee} onChange={event => { setNoFee(event.target.checked); }} /> No fee on LAGDA</label>
        </div>
        {feeProblem !== null && <p role="alert" style={{ ...hintStyle, color: "#B0182B" }}>{feeProblem}</p>}
      </div>
      {noFee ? (
        <p data-testid="no-fee-notice" role="status" className="sa-paid" style={{ color: E.ok, fontWeight: 600 }}>
          No fee on LAGDA: {s.clientName} is not asked to pay here. If you charge them, you settle it with them directly. This cannot be changed once they approve.
        </p>
      ) : (
        <p className="sa-paid" data-testid="sa-payee">
          <QrCode size={14} aria-hidden />
          {payee === null
            ? <span>A fee is paid to your saved payment QR. <Link to="/app/enotary/payment" style={{ color: "inherit", fontWeight: 700 }}>My payment QR</Link></span>
            : <span>Paid to your GCash QR: <b>{payee}</b></span>}
        </p>
      )}
      {problem !== null && <Notice icon={X} tone="danger">{problem}</Notice>}
      <button type="button" className="sa-send" disabled={busy !== null || !ready} onClick={onSend}>
        <Send size={17} aria-hidden /> {busy === "act" ? "Sending…" : identity !== undefined ? "Confirm and send to the client" : "Send to the client for approval"}
      </button>
      {onKeep !== undefined && <button type="button" className="sa-keep" onClick={onKeep}>Keep what I stated</button>}
      <div className="sa-next" data-testid="sa-next">
        <p>After you send it</p>
        <ol>
          <li><span>1</span>{s.clientName} approves the act and the fee.</li>
          {noFee ? (
            <li><span>2</span>You apply your seal and the document is notarized.</li>
          ) : (
            <>
              <li><span>2</span>You apply your seal and the document is notarized.</li>
              <li><span>3</span>They pay {charged && feeCentavos !== null ? pesos(feeCentavos) : "your fee"} to your GCash QR, before or after the seal.</li>
              <li><span>4</span>You confirm the payment from your own app.</li>
            </>
          )}
        </ol>
      </div>
    </section>
  );
}
