// A declined request, as the client reads it: who declined and when, the notary's reason set as a quotation, and the
// way on (another notary from the Notary Directory). One column on a phone, the actions under the quote.

import { ArrowLeft, ArrowRight, Quote, XCircle } from "lucide-react";
import { Link } from "react-router";
import { GF } from "../../../../components/system/design-system";
import { E, SERIF } from "../EnotaryChrome";
import { stampLabel } from "./expiry";

const STYLES = `
  .dc-card { position: relative; overflow: hidden; margin: 0 0 18px; border-radius: 16px; background: #FFFFFF; border: 1px solid ${E.maroonLine};
    box-shadow: 0 1px 2px rgba(10,26,43,0.04), 0 18px 36px -24px rgba(122,21,53,0.45); }
  .dc-card::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 4px; background: linear-gradient(90deg, #7A1535, #B0182B 55%, #C9960C); }
  .dc-head { display: flex; align-items: center; gap: 14px; padding: 20px 22px 0; }
  .dc-badge { flex: 0 0 auto; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; color: #FFFFFF;
    background: linear-gradient(160deg, #A3264B, #6F1632); box-shadow: 0 10px 18px -10px rgba(111,22,50,0.9), inset 0 1px 0 rgba(255,255,255,0.25); }
  .dc-eyebrow { margin: 0; font-size: 11.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${E.maroon}; }
  .dc-title { margin: 2px 0 0; font-family: ${SERIF}; font-size: clamp(19px, 4.6vw, 23px); font-weight: 700; line-height: 1.2; color: ${E.navy}; }
  .dc-when { margin: 3px 0 0; font-size: 13px; color: ${E.quiet}; }
  .dc-quote { position: relative; margin: 16px 22px 0; padding: 16px 18px 16px 52px; border-radius: 12px; background: linear-gradient(180deg, #FBF6EC 0%, #FFFBF3 100%);
    border: 1px solid #EADBBE; border-left: 4px solid #C9960C; }
  .dc-quote svg { position: absolute; left: 16px; top: 16px; color: #C9960C; }
  .dc-quote small { display: block; margin-bottom: 4px; font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #8A6A1C; }
  .dc-quote p { margin: 0; font-family: ${SERIF}; font-size: clamp(16px, 4.2vw, 18px); font-style: italic; line-height: 1.5; color: ${E.ink}; overflow-wrap: anywhere; }
  .dc-quote cite { display: block; margin-top: 6px; font-size: 13px; font-style: normal; color: ${E.quiet}; }
  .dc-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 16px; margin-top: 16px; padding: 14px 22px 18px; border-top: 1px solid ${E.line}; background: ${E.wash}; }
  .dc-foot p { margin: 0; flex: 1 1 260px; font-size: 14px; line-height: 1.5; color: ${E.text}; }
  .dc-go { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 18px; border-radius: 10px; background: ${E.maroon}; color: #FFFFFF;
    font-size: 14px; font-weight: 700; text-decoration: none; box-shadow: 0 8px 16px -10px rgba(111,22,50,0.9); transition: background 140ms ease, transform 100ms ease; }
  .dc-go:hover { background: ${E.maroonDeep}; }
  .dc-go:active { transform: scale(0.98); }
  .dc-go:focus-visible, .dc-back:focus-visible { outline: 3px solid rgba(201,150,12,0.6); outline-offset: 2px; }
  .dc-acts { display: flex; flex-wrap: wrap; gap: 10px; }
  .dc-back { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid ${E.line}; background: #FFFFFF;
    color: ${E.navy}; font-size: 14px; font-weight: 700; text-decoration: none; transition: background 140ms ease, border-color 140ms ease; }
  .dc-back:hover { background: ${E.wash}; border-color: #C5D2DF; }
  @media (max-width: 520px) {
    .dc-head { padding: 18px 16px 0; align-items: flex-start; }
    .dc-badge { width: 40px; height: 40px; border-radius: 12px; }
    .dc-quote { margin: 14px 16px 0; padding: 44px 14px 14px 16px; }
    .dc-quote svg { top: 14px; left: 14px; }
    .dc-foot { padding: 14px 16px 16px; }
    .dc-acts { flex: 1 1 100%; flex-direction: column-reverse; }
    .dc-go, .dc-back { justify-content: center; }
  }
  @media (prefers-reduced-motion: reduce) { .dc-go { transition: none; } }
`;

export function DeclinedCard({ notaryName, reason, decidedAt, directoryPath }: {
  notaryName: string; reason: string | null; decidedAt: string | null; directoryPath: string;
}) {
  return (
    <section className="dc-card" data-testid="declined-card" aria-labelledby="dc-title" style={GF}>
      <style>{STYLES}</style>
      <div className="dc-head">
        <span className="dc-badge" aria-hidden="true"><XCircle size={22} /></span>
        <div>
          <p className="dc-eyebrow">Request declined</p>
          <h2 className="dc-title" id="dc-title">Atty. {notaryName} declined this request</h2>
          {decidedAt !== null && <p className="dc-when">{stampLabel(decidedAt)}</p>}
        </div>
      </div>
      {reason !== null && reason.trim() !== "" && (
        <figure className="dc-quote" data-testid="declined-reason" style={{ marginBottom: 0 }}>
          <Quote size={22} aria-hidden="true" />
          <small>The notary&rsquo;s reason</small>
          <blockquote style={{ margin: 0 }}><p>{reason}</p></blockquote>
          <figcaption><cite>Atty. {notaryName}</cite></figcaption>
        </figure>
      )}
      <div className="dc-foot">
        <p>Nothing was charged or notarized. You can ask another notary from the Notary Directory.</p>
        <div className="dc-acts">
          <Link className="dc-back" to="/app/enotary/requests" data-testid="declined-back"><ArrowLeft size={16} aria-hidden="true" /> Return to My Requests</Link>
          <a className="dc-go" href={directoryPath} data-testid="declined-find">Find another notary <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
