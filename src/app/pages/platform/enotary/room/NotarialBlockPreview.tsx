// 127. The notarial block as the notarized page will carry it, drawn here in the measures the server uses (BLOCK_WIDTH
// design pixels across, the header 31 high, columns of 70, 402, 130 and 96) and scaled to the width it is shown at: the
// firm's initials, the notary's name and commission, where the register entry goes, the signature picture and the seal.
// What only the act knows (the register entry) is said as such. The server draws the real one.

import { useId } from "react";
import { E, SERIF } from "../EnotaryChrome";
import { BLOCK_HEIGHT, BLOCK_WIDTH, initialsOf, sealName } from "./notarial-block";

export interface BlockFacts {
  notaryName: string;
  /** The office's name, for its initials (the workspace's logo, when it has one, is printed in their place). */
  firm: string;
  /** "Commission No. 2026-0147 · until 31 Dec 2027 · Roll No. 58214", when the commission is known. */
  commissionLine: string | null;
  /** The act, as the header says it: "ACKNOWLEDGMENT". */
  actLabel: string;
  /** "21 OCT 2026". */
  dateLabel: string;
  /** The name on the seal. */
  sealName: string;
  signature: { mediaType: string; image: string } | null;
}

/** The app's own face: the server prints the block in Noto Sans, a face a computer may hold only in part. */
const SANS = "'Geist', system-ui, sans-serif";

/** The scalloped edge of the seal: 24 bumps around a circle of radius `r`. */
function scallops(r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 96; i += 1) {
    const angle = (i / 96) * Math.PI * 2;
    const radius = r * (1 - 0.12 * (0.5 - 0.5 * Math.cos(angle * 24)));
    points.push(`${(r + radius * Math.cos(angle)).toFixed(2)},${(r + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
}

function Seal({ d, name }: { d: number; name: string }) {
  const id = useId().replace(/:/g, "");
  const r = d / 2;
  return (
    <svg width={d} height={d} viewBox={`0 0 ${String(d)} ${String(d)}`} aria-hidden="true">
      <defs>
        <radialGradient id={`g${id}`} cx="40%" cy="32%" r="75%"><stop offset="0%" stopColor="#B0182B" /><stop offset="100%" stopColor="#6F1632" /></radialGradient>
        <path id={`p${id}`} d={`M ${String(r * 0.3)} ${String(r)} A ${String(r * 0.7)} ${String(r * 0.7)} 0 0 1 ${String(r * 1.7)} ${String(r)}`} />
      </defs>
      <path d={scallops(r)} fill={`url(#g${id})`} />
      <circle cx={r} cy={r} r={r * 0.74} fill="none" stroke="#FFFFFF" strokeWidth={Math.max(0.8, d * 0.018)} opacity={0.9} />
      <text fill="#FFFFFF" fontFamily={SANS} fontWeight={800} fontSize={d * 0.1} letterSpacing={d * 0.012}>
        <textPath href={`#p${id}`} startOffset="50%" textAnchor="middle">NOTARY PUBLIC</textPath>
      </text>
      <text x={r} y={r + d * 0.04} textAnchor="middle" fill="#FFFFFF" fontFamily={SANS} fontWeight={800} fontSize={Math.min(d * 0.1, (d * 1.1) / Math.max(8, name.length))}>{name}</text>
      <text x={r} y={r + d * 0.22} textAnchor="middle" fill="#FFFFFF" fontSize={d * 0.09} opacity={0.9}>★ ★ ★</text>
    </svg>
  );
}

/** The block, `width` pixels across on the screen. `ghost` draws it faded: where it goes when it is not placed. */
export function NotarialBlockPreview({ facts, width, ghost = false }: { facts: BlockFacts; width: number; ghost?: boolean }) {
  const s = width / BLOCK_WIDTH;
  const eyebrow = { fontFamily: SANS, fontSize: 9, fontWeight: 800, letterSpacing: 1.8, color: E.maroon, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const };
  const quiet = { fontFamily: SANS, fontSize: 9, lineHeight: "13px", color: E.quiet };
  return (
    <div data-testid="block-preview" style={{ width, height: BLOCK_HEIGHT * s, opacity: ghost ? 0.55 : 1, pointerEvents: "none" }}>
      <div style={{
        width: BLOCK_WIDTH, height: BLOCK_HEIGHT, transform: `scale(${String(s)})`, transformOrigin: "0 0", boxSizing: "border-box",
        borderRadius: 12, border: `1px solid ${E.line}`, background: "rgba(255,255,255,0.96)", overflow: "hidden", position: "relative",
        boxShadow: ghost ? "none" : "0 2px 10px rgba(10,26,43,0.12)",
      }}>
        <div style={{ height: 31, background: E.maroonWash, borderTop: `3px solid ${E.maroon}`, borderBottom: `1px solid ${E.maroonLine}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
          <span style={eyebrow}>Notarized through LAGDA eNotary</span>
          <span style={eyebrow}>{`${facts.actLabel} · ${facts.dateLabel}`}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "70px 402px 130px 96px", height: BLOCK_HEIGHT - 31 }}>
          <div style={{ display: "grid", placeItems: "center" }}>
            <span style={{ width: 46, height: 46, borderRadius: 10, display: "grid", placeItems: "center", background: "linear-gradient(160deg, #0B1F44, #163556)", color: "#FFFFFF", fontFamily: SERIF, fontWeight: 700, fontSize: 17 }}>{initialsOf(facts.firm)}</span>
          </div>
          <div style={{ borderLeft: `1px solid ${E.line}`, margin: "10px 0", padding: "0 12px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
            <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 14, lineHeight: "18px", color: E.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Atty. {facts.notaryName}</span>
            <span style={{ ...eyebrow, letterSpacing: 1.3, marginTop: 4 }}>Electronic notary public</span>
            {facts.commissionLine !== null && <span style={{ ...quiet, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{facts.commissionLine}</span>}
            <span style={quiet}>Register entry: given when the act is recorded</span>
          </div>
          <div style={{ borderLeft: `1px solid ${E.line}`, margin: "10px 0", padding: "0 12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "stretch" }}>
            <span style={{ height: 34, display: "grid", placeItems: "center" }}>
              {facts.signature !== null
                ? <img alt="" src={`data:${facts.signature.mediaType};base64,${facts.signature.image}`} style={{ maxHeight: 34, maxWidth: "100%", objectFit: "contain" }} />
                : <span style={{ fontFamily: SANS, fontSize: 8.5, color: E.faint }}>No signature picture</span>}
            </span>
            <span style={{ borderTop: `1px solid ${E.ink}`, marginTop: 4 }} />
            <span style={{ fontFamily: SANS, fontSize: 8.5, color: E.quiet, textAlign: "center", marginTop: 3 }}>Signature</span>
          </div>
          <div style={{ borderLeft: `1px solid ${E.line}`, margin: "10px 0", display: "grid", placeItems: "center" }}>
            <Seal d={Math.min(80, BLOCK_HEIGHT - 31 - 12)} name={sealName(facts.sealName)} />
          </div>
        </div>
      </div>
    </div>
  );
}
