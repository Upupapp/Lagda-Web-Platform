// What is left before the seal, for both parties at once: the six things the act needs, each ticked when done, and
// whose turn the rest are. Nothing here decides anything: it reads the session as the server last said it, so the
// notary and the client see the same list. Some can happen in any order (the address, the identity), so it is a
// checklist, not a step counter.

import { CheckCircle2, Circle, MapPin } from "lucide-react";
import { GF } from "../../../../components/system/design-system";
import { BLOCK_WORDS, type Session } from "../../../../services/real/enotary-sessions.service";
import { E } from "../EnotaryChrome";

type Who = "client" | "notary";
interface Item { key: string; label: string; who: Who; done: boolean }

export function whatsLeftOf(s: Session): Item[] {
  const statement = s.statement ?? null;
  return [
    { key: "document", label: "Document finalized", who: "client", done: (s.finalizedAt ?? null) !== null },
    { key: "identity", label: "Identity confirmed", who: "notary", done: (s.identityConfirmedAt ?? null) !== null },
    { key: "act", label: "Act and fee stated", who: "notary", done: statement !== null },
    { key: "approve", label: "Approved by the client", who: "client", done: statement !== null && statement.approvedAt !== null },
    { key: "address", label: "Address given", who: "client", done: (s.clientAddress ?? null) !== null },
    { key: "seal", label: "Seal applied", who: "notary", done: s.status === "notarized" },
  ];
}

const CSS = `
  .wl { box-sizing: border-box; padding: 14px 16px; border-radius: 16px; background: #FFFFFF; border: 1px solid ${E.line};
    box-shadow: 0 1px 2px rgba(10,26,43,0.05), 0 18px 44px -30px rgba(10,26,43,0.3); }
  .wl-top { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 14px; }
  .wl-top h3 { margin: 0; font-size: 14.5px; font-weight: 800; color: ${E.navy}; }
  .wl-top span { font-size: 13px; font-weight: 700; color: ${E.quiet}; }
  .wl-bar { margin: 10px 0 12px; height: 6px; border-radius: 999px; background: #EDF1F6; overflow: hidden; }
  .wl-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #0A84D6, #1F9D57); transition: width 300ms ease; }
  .wl-list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
  .wl-list li { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 700; line-height: 1.3;
    border: 1px solid ${E.line}; color: ${E.text}; background: #FBFCFE; }
  .wl-list li.done { border-color: #BFE0C8; background: ${E.okWash}; color: ${E.ok}; }
  .wl-list li.mine { border-color: ${E.maroon}; background: #FFF7F9; color: ${E.maroon}; }
  .wl-list li svg { flex: 0 0 auto; }
  .wl-next { margin: 12px 0 0; font-size: 13.5px; line-height: 1.5; color: ${E.ink}; }
  .wl-hold { margin: 8px 0 0; display: flex; gap: 6px; align-items: flex-start; font-size: 13px; line-height: 1.45; color: #8A5A00; }
  .wl-hold svg { flex: 0 0 auto; margin-top: 2px; }
  @media (prefers-reduced-motion: reduce) { .wl-bar i { transition: none; } }
`;

export function WhatsLeft({ s, partner }: { s: Session; partner: string }) {
  const items = whatsLeftOf(s);
  const done = items.filter(item => item.done).length;
  const me: Who = s.role === "client" ? "client" : "notary";
  const mine = items.filter(item => !item.done && item.who === me);
  const theirs = items.filter(item => !item.done && item.who !== me);
  const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
  // Only the notary is told what else holds the seal (a location check, the client away from the room).
  const block = s.notarizeBlock ?? null;
  const hold = block === "client_location" || block === "notary_location" || block === "client_absent" ? BLOCK_WORDS[block] : null;
  return (
    <section className="wl" data-testid="whats-left" aria-labelledby="wl-h" style={GF}>
      <style>{CSS}</style>
      <div className="wl-top">
        <h3 id="wl-h">What is left before the seal</h3>
        <span data-testid="whats-left-count">{done} of {items.length} done</span>
      </div>
      <div className="wl-bar" role="progressbar" aria-label="Done before the seal" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done}>
        <i style={{ width: `${String(Math.round((done / items.length) * 100))}%` }} />
      </div>
      <ul className="wl-list">
        {items.map(item => (
          <li key={item.key} data-testid={`wl-${item.key}`} data-done={item.done || undefined}
            className={item.done ? "done" : item.who === me ? "mine" : undefined}>
            {item.done ? <CheckCircle2 size={14} aria-hidden /> : <Circle size={14} aria-hidden />}
            {item.label}
            <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              {item.done ? " (done)" : item.who === me ? " (your part)" : ` (${partner})`}
            </span>
          </li>
        ))}
      </ul>
      {(mine.length > 0 || theirs.length > 0) && (
        <p className="wl-next" data-testid="whats-left-next">
          {mine.length > 0 && <><strong>Your part:</strong> {mine.map(item => lower(item.label)).join(", ")}.</>}
          {mine.length > 0 && theirs.length > 0 && " "}
          {theirs.length > 0 && <><strong>{partner}:</strong> {theirs.map(item => lower(item.label)).join(", ")}.</>}
        </p>
      )}
      {hold !== null && <p className="wl-hold" data-testid="whats-left-hold"><MapPin size={14} aria-hidden /> {hold}</p>}
    </section>
  );
}
