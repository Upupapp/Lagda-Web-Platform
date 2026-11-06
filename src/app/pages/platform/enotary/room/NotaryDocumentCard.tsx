// The notary's card for the document in step 6: the client's final document and the notary's own mark in one place.
// The page where the notarial block sits (127: the seal and signature, with the notary's name and commission, drawn
// together) is shown with it on it (its saved place, or across the foot of the last page when it has not been placed),
// the place in words, when it was saved, and one way to the page where it is placed. Only the notary sees the mark; the
// client sees the block on the notarized document.
//
// Placed for the notary (auto-place.ts): once the client has finalized the document, a block the notary has not placed is
// put at the foot of the last page below its text, or on a page of its own when there is no room, and saved with the
// session. The notary only checks it and notarizes; they may still move it.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, Download, Eye, FileText, Lock, Stamp } from "lucide-react";
import { DocumentPageSurface, useRealDocument } from "../../../../components/pdf/DocumentPageSurface";
import { realEnotarySessionsService, saveBlobAs, type Session } from "../../../../services/real/enotary-sessions.service";
import { E, SERIF } from "../EnotaryChrome";
import { stampLabel } from "../requests/expiry";
import { NotarialBlockPreview } from "./NotarialBlockPreview";
import { blockBox, blockOf, blockWords, defaultBlockPoint } from "./notarial-block";
import { placementsOf, readPlacements, writePlacements } from "./seal-placements";
import { autoPlacement } from "./auto-place";
import { useBlockFacts } from "./useBlockFacts";

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
  .nd-mark { position: absolute; pointer-events: none; }
  .nd-mark em { position: absolute; top: -19px; left: 50%; transform: translateX(-50%); padding: 1px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 800; font-style: normal; color: #FFFFFF; white-space: nowrap; background: ${E.maroon}; }
  .nd-note { margin: 0; font-size: 13px; color: ${E.quiet}; text-align: center; padding: 18px 8px; }
  .nd-marks { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .nd-marks li { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 7px 10px; border-radius: 10px; border: 1px solid ${E.line}; background: #FBFCFE; font-size: 12.5px; color: ${E.text}; }
  .nd-marks li > span { flex: 1 1 160px; min-width: 0; }
  .nd-marks b { color: ${E.ink}; }
  .nd-dot { flex: 0 0 auto; width: 12px; height: 12px; border-radius: 999px; background: ${E.maroon}; }
  .nd-dot.sig { background: ${E.sky}; border-radius: 3px; }
  .nd-dot.block { border-radius: 3px; }
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

/** Sessions whose block this tab placed automatically: how it was placed, for the words under the page. */
const autoPlaced = new Map<string, "foot" | "own">();

const short = (sha: string): string => (sha.length > 20 ? `${sha.slice(0, 8)}…${sha.slice(-8)}` : sha);

export function NotaryDocumentCard({ s }: { s: Session }) {
  const doc = s.document;
  const placements = placementsOf(s);
  const savedAt = s.placements?.savedAt ?? null;
  const load = useCallback(() => realEnotarySessionsService.document(s.id), [s.id]);
  const state = useRealDocument(doc === null ? null : load);
  const { facts, signature } = useBlockFacts(s);
  const [width, setWidth] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

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
  // Placed for the notary once the document is final, when neither the session nor this tab holds a place.
  const [placing, setPlacing] = useState(false);
  const [placedHow, setPlacedHow] = useState<"foot" | "own" | null>(autoPlaced.get(s.id) ?? null);
  const finalized = s.finalizedAt != null;
  const unplaced = savedAt === null && Object.keys(readPlacements(s.id)).length === 0;
  const readyDoc = state.status === "ready" ? state.doc : null;
  useEffect(() => {
    if (readyDoc === null || !finalized || !unplaced || autoPlaced.has(s.id)) return;
    let live = true;
    setPlacing(true);
    autoPlacement(readyDoc)
      .then(async value => {
        const how = value.blockOwnPage === true ? "own" : "foot";
        autoPlaced.set(s.id, how);
        writePlacements(s.id, value);
        if (live) setPlacedHow(how);
        await realEnotarySessionsService.savePlacements(s.id, value);
      })
      .catch(() => { autoPlaced.delete(s.id); writePlacements(s.id, {}); if (live) setPlacedHow(null); })
      .finally(() => { if (live) setPlacing(false); });
    return () => { live = false; };
  }, [readyDoc, finalized, unplaced, s.id]);
  const lastPage = ready ? state.pageCount : 1;
  // The page the block sits on: its own place, else the last page (across its foot). On a page of its own, the last page
  // of the client's document is shown without it.
  const ownPage = placements.blockOwnPage === true;
  const placed = ownPage ? undefined : blockOf(placements);
  const page = Math.min(placed?.page ?? lastPage, lastPage);

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
    const box = ownPage || scale === 0 ? null : blockBox(placed ?? defaultBlockPoint(size.width, size.height), size.width, size.height);
    sheet = (
      <div className="nd-sheet" data-testid="nd-sheet" data-page={page} style={{ width: pageWidth, height: pageHeight }}>
        {pageWidth > 0 && <DocumentPageSurface doc={state.doc} pageNumber={page} width={pageWidth} height={pageHeight} />}
        {box !== null && facts !== null && (
          <div className="nd-mark" data-testid={placed === undefined ? "nd-mark-block-usual" : "nd-mark-block"} aria-hidden="true"
            style={{ left: box.left * scale, top: box.top * scale }}>
            <em>{placed === undefined ? "Notarial block · default place" : "Notarial block"}</em>
            <NotarialBlockPreview facts={facts} width={box.width * scale} ghost={placed === undefined} />
          </div>
        )}
      </div>
    );
  }

  const caption = ownPage ? "The last page: your notarial block goes on a page of its own after it"
    : placed !== undefined ? `Page ${String(page)}, where your notarial block sits`
      : `Page ${String(page)}: your notarial block goes here unless you place it`;

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

      <ul className="nd-marks" aria-label="Your notarial block">
        <li data-testid="nd-block">
          <i className="nd-dot block" aria-hidden="true" />
          <span><b>Notarial block</b> · {blockWords(placements)}</span>
          {ownPage || placed !== undefined ? <em className="nd-tag placed"><CheckCircle2 size={11} aria-hidden /> Placed</em> : <em className="nd-tag usual">Default place</em>}
        </li>
        {signature === null && (
          <li data-testid="nd-signature">
            <i className="nd-dot sig" aria-hidden="true" />
            <span><b>Signature</b> · no signature picture is saved, so the block shows none</span>
            <em className="nd-tag usual"><Link to="/app/enotary/seal">Add my signature</Link></em>
          </li>
        )}
      </ul>
      {placedHow !== null && (
        <p className="nd-saved" data-testid="nd-auto"><CheckCircle2 size={13} aria-hidden /> {placedHow === "foot"
          ? `Placed for you at the foot of page ${String(lastPage)}, below the document's text. Check it and notarize; move it only if you wish.`
          : "Placed for you on a page of its own at the end: the last page has no room below its text. Check it and notarize; move it only if you wish."}</p>
      )}
      {placing ? <p className="nd-saved none" role="status" data-testid="nd-saved">Placing your notarial block in the clear space…</p>
        : savedAt !== null
          ? <p className="nd-saved" data-testid="nd-saved"><CheckCircle2 size={13} aria-hidden /> Saved with the session at {stampLabel(savedAt)} · kept even if the session is called off</p>
          : placedHow !== null ? null
            : <p className="nd-saved none" data-testid="nd-saved">{finalized ? "Not placed yet: your notarial block goes across the foot of the last page unless you place it." : "Once the client finalizes the document, your notarial block is placed for you in the clear space at the foot of the last page."}</p>}

      <div className="nd-actions">
        <Link to={`/app/enotary/room/${encodeURIComponent(s.invitationId)}/place`} className="nd-review" data-testid="nd-review">
          <Stamp size={17} aria-hidden /> {ownPage || placed !== undefined ? "Review document, or move the notarial block" : "Review document & place the notarial block"}
        </Link>
        <button type="button" className="nd-dl" data-testid="nd-download" disabled={doc === null || downloading} onClick={download}>
          <Download size={16} aria-hidden /> {downloading ? "Preparing…" : "Download"}
        </button>
      </div>
      <p className="nd-foot">The client sees your notarial block only on the notarized document.</p>
    </section>
  );
}
