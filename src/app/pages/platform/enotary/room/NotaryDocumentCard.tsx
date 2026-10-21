// The notary's card for the document in step 6: the client's final document and the notary's own marks in one place.
// The page where the seal and the signature sit is drawn with them on it (their saved places, or their usual places
// when they have not been placed), the places in words, when they were saved, and one way to the page where they are
// placed. Only the notary sees the marks; the client sees the seal and the signature on the notarized document.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, Download, Eye, FileText, Lock, Stamp } from "lucide-react";
import { DocumentPageSurface, useRealDocument } from "../../../../components/pdf/DocumentPageSurface";
import { realEnotarySessionsService, saveBlobAs, type PagePoint, type Session } from "../../../../services/real/enotary-sessions.service";
import { E, SERIF } from "../EnotaryChrome";
import { stampLabel } from "../requests/expiry";
import { SEAL_POINTS, SIGNATURE_H, SIGNATURE_W, USUAL_PLACE } from "./SealPlacer";
import { placementsOf, whereOnPage } from "./seal-placements";

const CSS = `
  .nd { padding: 16px; display: grid; gap: 12px; border-top: 4px solid #C9A24A; min-width: 0; }
  .nd-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px 10px; flex-wrap: wrap; }
  .nd-head h2 { margin: 0 0 8px; font-family: ${SERIF}; font-weight: 700; font-size: 19px; color: ${E.navy}; }
  .nd-final { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: ${E.okWash}; color: ${E.ok}; font-size: 12px; font-weight: 800; }
  .nd-mine { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; background: ${E.maroonWash}; border: 1px solid ${E.maroonLine}; color: ${E.maroon}; font-size: 11.5px; font-weight: 800; }
  .nd-meta { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; background: #F7FAFD; border: 1px solid ${E.line}; min-width: 0; }
  .nd-meta-ic { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; background: ${E.maroonWash}; color: ${E.maroon}; }
  .nd-meta b { display: block; font-size: 13.5px; overflow-wrap: anywhere; }
  .nd-meta small { display: block; color: ${E.quiet}; font-size: 12px; margin-top: 1px; }
  .nd-meta code { display: block; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: ${E.quiet}; margin-top: 3px; }
  .nd-stage { position: relative; padding: 36px 12px 12px; border-radius: 12px; background: #E9EEF4; border: 1px solid ${E.line}; display: grid; justify-items: center; min-width: 0; }
  .nd-cap { position: absolute; left: 10px; top: 8px; margin: 0; display: inline-flex; align-items: center; gap: 6px; max-width: calc(100% - 20px); padding: 3px 10px; border-radius: 999px; background: rgba(10,26,43,0.72); color: #FFFFFF; font-size: 11px; font-weight: 700; box-sizing: border-box; }
  .nd-sheet { position: relative; background: #FFFFFF; box-shadow: 0 6px 18px -8px rgba(10,26,43,0.35); }
  .nd-mark { position: absolute; transform: translate(-50%, -50%); box-sizing: border-box; display: grid; place-items: center; pointer-events: none; }
  .nd-mark em { position: absolute; top: -19px; left: 50%; transform: translateX(-50%); padding: 1px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 800; font-style: normal; color: #FFFFFF; white-space: nowrap; }
  .nd-mark.seal { border-radius: 999px; border: 1.5px dashed ${E.maroon}; background: radial-gradient(circle at 40% 32%, rgba(176,24,43,0.88) 0%, rgba(111,22,50,0.88) 100%); box-shadow: inset 0 0 0 5px rgba(255,255,255,0.85); color: #FFFFFF; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; }
  .nd-mark.seal em { background: ${E.maroon}; }
  .nd-mark.sig { border-radius: 6px; border: 1.5px dashed ${E.sky}; background: rgba(10,132,214,0.07); color: ${E.skyDeep}; font-size: 10.5px; font-weight: 700; overflow: visible; }
  .nd-mark.sig em { background: ${E.sky}; }
  .nd-mark.sig img { max-width: 92%; max-height: 90%; object-fit: contain; }
  .nd-mark.usual { opacity: 0.55; }
  .nd-note { margin: 0; font-size: 13px; color: ${E.quiet}; text-align: center; padding: 18px 8px; }
  .nd-marks { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .nd-marks li { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 7px 10px; border-radius: 10px; border: 1px solid ${E.line}; background: #FBFCFE; font-size: 12.5px; color: ${E.text}; }
  .nd-marks li > span { flex: 1 1 160px; min-width: 0; }
  .nd-marks b { color: ${E.ink}; }
  .nd-dot { flex: 0 0 auto; width: 12px; height: 12px; border-radius: 999px; background: ${E.maroon}; }
  .nd-dot.sig { background: ${E.sky}; border-radius: 3px; }
  .nd-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 800; white-space: nowrap; }
  .nd-tag.placed { background: ${E.okWash}; color: ${E.ok}; }
  .nd-tag.usual { background: ${E.wash}; color: ${E.quiet}; border: 1px solid ${E.line}; }
  .nd-tag a { color: inherit; }
  .nd-saved { margin: 0; display: flex; align-items: flex-start; gap: 6px; font-size: 12px; font-weight: 700; color: ${E.ok}; line-height: 1.45; }
  .nd-saved.none { color: ${E.quiet}; font-weight: 600; }
  .nd-saved svg { flex: 0 0 auto; margin-top: 1px; }
  .nd-actions { display: grid; gap: 8px; }
  .nd-review { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 8px 14px; border-radius: 12px; background: linear-gradient(110deg, #7E1229 0%, #951A33 55%, #A81E36 100%); color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; text-align: center; box-shadow: 0 12px 24px -14px rgba(126,18,41,0.8); box-sizing: border-box; }
  .nd-review:hover { filter: brightness(1.06); }
  .nd-review:focus-visible { outline: 3px solid rgba(140,29,63,0.35); outline-offset: 2px; }
  .nd-dl { justify-self: end; display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #C5D2DF; background: #FFFFFF; color: ${E.ink}; font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; }
  .nd-dl:disabled { opacity: 0.6; cursor: default; }
  .nd-dl:focus-visible { outline: 3px solid rgba(10,132,214,0.35); outline-offset: 2px; }
  .nd-foot { margin: 0; font-size: 12px; color: ${E.quiet}; line-height: 1.5; }
  @media (max-width: 520px) { .nd { padding: 14px; } .nd-dl { justify-self: stretch; justify-content: center; } }
`;

const short = (sha: string): string => (sha.length > 20 ? `${sha.slice(0, 8)}…${sha.slice(-8)}` : sha);

export function NotaryDocumentCard({ s }: { s: Session }) {
  const doc = s.document;
  const placements = placementsOf(s);
  const savedAt = s.placements?.savedAt ?? null;
  const load = useCallback(() => realEnotarySessionsService.document(s.id), [s.id]);
  const state = useRealDocument(doc === null ? null : load);
  const [signature, setSignature] = useState<{ image: string; mediaType: string } | null | undefined>(undefined);
  const [width, setWidth] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    void Promise.resolve(realEnotarySessionsService.signature()).then(found => { if (alive) setSignature(found ?? null); }, () => { if (alive) setSignature(null); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const element = holder.current;
    if (element === null) return;
    const measure = () => { setWidth(Math.max(0, Math.floor(element.clientWidth) - 24)); };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { observer.disconnect(); };
  }, [state.status]);

  const ready = state.status === "ready";
  const lastPage = ready ? state.pageCount : 1;
  const hasSignature = signature !== null && signature !== undefined;
  // The page the marks sit on: the seal's, else the signature's, else the last page (where both go by default).
  const page = placements.seal?.page ?? placements.signature?.page ?? lastPage;
  const sealAt: { point: PagePoint; usual: boolean } = placements.seal !== undefined
    ? { point: placements.seal, usual: false } : { point: { page: lastPage, ...USUAL_PLACE.seal }, usual: true };
  const sigAt: { point: PagePoint; usual: boolean } | null = !hasSignature ? null : placements.signature !== undefined
    ? { point: placements.signature, usual: false } : { point: { page: lastPage, ...USUAL_PLACE.signature }, usual: true };

  const download = () => {
    if (doc === null) return;
    setDownloading(true);
    realEnotarySessionsService.document(s.id).then(blob => { saveBlobAs(blob, doc.name); }).catch(() => undefined).finally(() => { setDownloading(false); });
  };

  let sheet: React.ReactNode;
  if (doc === null) sheet = <p className="nd-note">The client has not added the document yet.</p>;
  else if (state.status === "error") sheet = <p className="nd-note" data-testid="nd-unavailable">The page could not be shown here. Review the document to see it with your marks.</p>;
  else if (!ready) sheet = <p className="nd-note" role="status">Opening the document…</p>;
  else {
    const size = state.pageSizes[page - 1] ?? state.pageSizes[0] ?? { width: 595, height: 842 };
    const pageWidth = Math.min(width, 520);
    const pageHeight = pageWidth === 0 ? 0 : Math.round((pageWidth * size.height) / size.width);
    const scale = pageWidth === 0 ? 0 : pageWidth / size.width;
    const mark = (which: "seal" | "sig", at: { point: PagePoint; usual: boolean } | null) => {
      if (at === null || at.point.page !== page || scale === 0) return null;
      const w = (which === "seal" ? SEAL_POINTS : SIGNATURE_W) * scale;
      const h = (which === "seal" ? SEAL_POINTS : SIGNATURE_H) * scale;
      return (
        <div key={which} className={`nd-mark ${which}${at.usual ? " usual" : ""}`} data-testid={`nd-mark-${which}`} aria-hidden="true"
          style={{ left: `${String(at.point.x * 100)}%`, top: `${String(at.point.y * 100)}%`, width: w, height: h }}>
          <em>{which === "seal" ? "Seal" : "Signature"}{at.usual ? " · usual place" : ""}</em>
          {which === "seal" ? <span>SEAL</span>
            : signature !== null && signature !== undefined ? <img src={`data:${signature.mediaType};base64,${signature.image}`} alt="" /> : <span>Signature</span>}
        </div>
      );
    };
    sheet = (
      <div className="nd-sheet" data-testid="nd-sheet" data-page={page} style={{ width: pageWidth, height: pageHeight }}>
        {pageWidth > 0 && <DocumentPageSurface doc={state.doc} pageNumber={page} width={pageWidth} height={pageHeight} />}
        {mark("seal", sealAt)}
        {mark("sig", sigAt)}
      </div>
    );
  }

  const caption = placements.seal !== undefined || placements.signature !== undefined
    ? `Page ${String(page)}, where your seal and signature sit`
    : `Page ${String(page)}: your marks go here unless you place them`;

  return (
    <section className="s6-card nd" data-testid="document-panel" aria-labelledby="nd-h">
      <style>{CSS}</style>
      <div className="nd-head">
        <div>
          <h2 id="nd-h">Document for notarization</h2>
          {s.finalizedAt != null && <span className="nd-final" data-testid="nd-finalized"><CheckCircle2 size={13} aria-hidden /> Finalized by the client · {stampLabel(s.finalizedAt)}</span>}
        </div>
        <span className="nd-mine"><Lock size={12} aria-hidden /> Your marks: only you see them</span>
      </div>

      {doc !== null && (
        <div className="nd-meta" data-testid="document-info">
          <span className="nd-meta-ic" aria-hidden="true"><FileText size={17} /></span>
          <span style={{ minWidth: 0 }}>
            <b>{doc.name}</b>
            <small>{(doc.size / 1024).toFixed(0)} KB · added {stampLabel(doc.addedAt)}</small>
            <code title={`SHA-256 ${doc.sha256}`}>SHA-256 {short(doc.sha256)}</code>
          </span>
        </div>
      )}

      <div ref={holder} className="nd-stage">
        {doc !== null && ready && <p className="nd-cap" data-testid="nd-caption"><Eye size={13} aria-hidden /> {caption}</p>}
        {sheet}
      </div>

      <ul className="nd-marks" aria-label="Your seal and signature">
        <li data-testid="nd-seal">
          <i className="nd-dot" aria-hidden="true" />
          <span><b>Seal</b> · {placements.seal !== undefined ? `page ${String(placements.seal.page)}, ${whereOnPage(placements.seal)}` : "the usual place, lower right of the last page"}</span>
          {placements.seal !== undefined ? <em className="nd-tag placed"><CheckCircle2 size={11} aria-hidden /> Placed</em> : <em className="nd-tag usual">Usual place</em>}
        </li>
        <li data-testid="nd-signature">
          <i className="nd-dot sig" aria-hidden="true" />
          {signature === null ? (
            <>
              <span><b>Signature</b> · no signature picture is saved, so none is drawn</span>
              <em className="nd-tag usual"><Link to="/app/enotary/seal">Add my signature</Link></em>
            </>
          ) : (
            <>
              <span><b>Signature</b> · {placements.signature !== undefined ? `page ${String(placements.signature.page)}, ${whereOnPage(placements.signature)}` : "the usual place, beside the seal"}</span>
              {placements.signature !== undefined ? <em className="nd-tag placed"><CheckCircle2 size={11} aria-hidden /> Placed</em> : <em className="nd-tag usual">Usual place</em>}
            </>
          )}
        </li>
      </ul>
      {savedAt !== null
        ? <p className="nd-saved" data-testid="nd-saved"><CheckCircle2 size={13} aria-hidden /> Saved with the session at {stampLabel(savedAt)} · kept even if the session is called off</p>
        : <p className="nd-saved none" data-testid="nd-saved">Not placed yet: your seal and signature go to their usual places unless you place them.</p>}

      <div className="nd-actions">
        <Link to={`/app/enotary/room/${encodeURIComponent(s.invitationId)}/place`} className="nd-review" data-testid="nd-review">
          <Stamp size={17} aria-hidden /> Review document &amp; place signature or seal
        </Link>
        <button type="button" className="nd-dl" data-testid="nd-download" disabled={doc === null || downloading} onClick={download}>
          <Download size={16} aria-hidden /> {downloading ? "Preparing…" : "Download"}
        </button>
      </div>
      <p className="nd-foot">The client sees your seal and signature only on the notarized document.</p>
    </section>
  );
}
