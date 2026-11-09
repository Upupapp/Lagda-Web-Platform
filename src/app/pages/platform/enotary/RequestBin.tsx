// 132. The trash bin of eNotary requests, for the client ("Notarial Request History") and for the notary (the desk).
//
//   RequestBinButton   the "Trash" button with how many are in it
//   MoveToTrash        the small button on a request that is over
//   RequestBinPanel    the panel in the centre of the page: each request with Restore and Delete, and Restore all and
//                      Empty the trash at the top
//
// Deleting takes a request out of this person's own lists for good. The notarial record is never erased: the request,
// the notarized document, the Notary Book entry and the audit trail are kept, and the other party sees no change.
// Every action asks first, then runs behind its own loading panel.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArchiveRestore, CalendarDays, FileText, Info, Trash2, X } from "lucide-react";
import { GF } from "../../../components/system/design-system";
import { useConfirm } from "../../../components/platform/ConfirmDialog";
import { withProcess } from "../../../config/process-screens";
import { ApiError } from "../../../services/api-client";
import { BIN_OUTCOME_LABELS, realEnotaryBinService, type BinItem, type BinRole } from "../../../services/real/enotary-bin.service";
import { Z } from "../../../utils/z-index";
import { E, SERIF } from "./EnotaryChrome";
import { stampLabel } from "./requests/expiry";

const CSS = `
  .rb-btn { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid ${E.line};
    background: #FFFFFF; color: ${E.navy}; font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 140ms ease, border-color 140ms ease; }
  .rb-btn:hover { background: ${E.wash}; border-color: #C5D2DF; }
  .rb-btn:focus-visible, .rb-act:focus-visible, .rb-x:focus-visible, .rb-move:focus-visible { outline: 3px solid rgba(140,29,63,0.35); outline-offset: 2px; }
  .rb-count { min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; border-radius: 999px; display: inline-grid; place-items: center;
    background: ${E.maroon}; color: #FFFFFF; font-size: 11.5px; font-weight: 800; }
  .rb-move { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid ${E.line};
    background: #FFFFFF; color: ${E.quiet}; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
  .rb-move:hover { color: #B0182B; border-color: #F1C7CE; background: #FFF7F8; }
  .rb-move:disabled { opacity: 0.6; cursor: default; }
  .rb-veil { position: fixed; inset: 0; display: grid; place-items: center; padding: clamp(0px, 3vw, 24px); background: rgba(10,26,43,0.55); }
  .rb-panel { width: min(760px, 100%); height: min(680px, 100%); display: flex; flex-direction: column; background: ${E.ground}; border-radius: 18px; overflow: hidden;
    box-shadow: 0 30px 80px -30px rgba(10,26,43,0.6); }
  .rb-top { position: relative; padding: 18px 20px 16px; background: linear-gradient(110deg, #6E0F24 0%, #84152E 48%, #9A1B36 100%); color: #FFFFFF; }
  .rb-top h2 { margin: 0; display: flex; align-items: center; gap: 10px; font-family: ${SERIF}; font-size: 23px; font-weight: 700; }
  .rb-top p { margin: 6px 52px 0 0; font-size: 13.5px; line-height: 1.5; color: rgba(255,255,255,0.9); }
  .rb-x { position: absolute; top: 14px; right: 14px; width: 40px; height: 40px; border-radius: 999px; border: 1.5px solid rgba(255,255,255,0.55);
    background: transparent; color: #FFFFFF; display: grid; place-items: center; cursor: pointer; }
  .rb-x:hover { background: rgba(255,255,255,0.12); }
  .rb-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 20px; border-bottom: 1px solid ${E.line}; background: #FFFFFF; }
  .rb-bar span { font-size: 13.5px; font-weight: 700; color: ${E.ink}; }
  .rb-bar div { display: flex; flex-wrap: wrap; gap: 8px; }
  .rb-list { flex: 1 1 auto; overflow-y: auto; list-style: none; margin: 0; padding: 14px 20px 18px; display: grid; gap: 12px; align-content: start; }
  .rb-item { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px 14px; align-items: center; padding: 14px 16px 14px 20px;
    border-radius: 14px; background: #FFFFFF; border: 1px solid ${E.line}; box-shadow: 0 1px 2px rgba(10,26,43,0.05); overflow: hidden; }
  .rb-item::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #9AA6B2; }
  .rb-item[data-outcome="notarized"]::before { background: ${E.ok}; }
  .rb-name { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
  .rb-name strong { font-family: ${SERIF}; font-size: 17px; color: ${E.navy}; overflow-wrap: anywhere; }
  .rb-pill { display: inline-flex; align-items: center; min-height: 24px; padding: 0 10px; border-radius: 999px; font-size: 11.5px; font-weight: 800; background: ${E.wash}; color: ${E.quiet}; border: 1px solid ${E.line}; }
  .rb-item[data-outcome="notarized"] .rb-pill { background: ${E.okWash}; color: ${E.ok}; border-color: #B7E3CA; }
  .rb-meta { margin: 6px 0 0; display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12.5px; color: ${E.quiet}; }
  .rb-meta span { display: inline-flex; align-items: center; gap: 5px; }
  .rb-ref { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 700; color: ${E.ink}; }
  .rb-acts { display: flex; gap: 8px; }
  .rb-act { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 12px; border-radius: 10px; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; }
  .rb-act.restore { border: 1px solid ${E.maroonLine}; background: #FFFFFF; color: ${E.maroon}; }
  .rb-act.restore:hover { background: ${E.maroonWash}; }
  .rb-act.delete { border: 1px solid #F1C7CE; background: #FFFFFF; color: #B0182B; }
  .rb-act.delete:hover { background: #FFF5F6; }
  .rb-act:disabled { opacity: 0.55; cursor: default; }
  .rb-empty { margin: auto; padding: 36px 20px; text-align: center; color: ${E.text}; font-size: 14px; line-height: 1.6; }
  .rb-empty span { display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 999px; background: #FFFFFF; border: 1px solid ${E.line}; color: ${E.quiet}; margin-bottom: 10px; }
  .rb-note { margin: 0; padding: 10px 20px 14px; display: flex; gap: 8px; font-size: 12.5px; line-height: 1.5; color: ${E.quiet}; border-top: 1px solid ${E.line}; background: #FFFFFF; }
  .rb-note svg { flex: 0 0 auto; margin-top: 2px; }
  .rb-problem { margin: 10px 20px 0; padding: 10px 12px; border-radius: 10px; background: #FFF5F6; border: 1px solid #F1C7CE; color: #B0182B; font-size: 13px; font-weight: 600; }
  @media (max-width: 600px) {
    .rb-veil { padding: 0; }
    .rb-panel { height: 100%; border-radius: 0; }
    .rb-item { grid-template-columns: minmax(0, 1fr); }
    .rb-acts .rb-act { flex: 1 1 0; justify-content: center; }
    .rb-bar div { width: 100%; }
    .rb-bar div .rb-btn { flex: 1 1 0; justify-content: center; }
  }
  @media (prefers-reduced-motion: reduce) { .rb-btn { transition: none; } }
`;

/** A refusal the server explains (a request back in play, one already gone) in its own words. */
const whyNot = (error: unknown): string => {
  if (error instanceof ApiError && error.body?.message !== undefined && error.body.message !== "" && error.status === 409) return error.body.message;
  if (error instanceof ApiError && error.status === 404) return "That request is no longer in your trash.";
  return "That could not be done right now. Please try again.";
};

/** How many requests this person has in the trash, read again whenever `reload` changes. */
export function useBinCount(role: BinRole, reload: unknown): [number | null, () => void] {
  const [count, setCount] = useState<number | null>(null);
  const read = useCallback(() => {
    realEnotaryBinService.list(role).then(items => { setCount(items.length); }, () => { setCount(null); });
  }, [role]);
  useEffect(() => { read(); }, [read, reload]);
  return [count, read];
}

export function RequestBinButton({ count, onClick }: { count: number | null; onClick: () => void }) {
  const label = count !== null && count > 0 ? `Trash, ${String(count)} ${count === 1 ? "request" : "requests"}` : "Trash";
  return (
    <button type="button" className="rb-btn" data-testid="bin-button" aria-label={label} onClick={onClick} style={GF}>
      <style>{CSS}</style>
      <Trash2 size={16} aria-hidden /> Trash
      {count !== null && count > 0 && <span className="rb-count" aria-hidden="true" data-testid="bin-count">{count > 99 ? "99+" : count}</span>}
    </button>
  );
}

/**
 * Moves one request that is over to the trash, after asking. `who` names the other party in the question.
 * Returns the button and the dialog it asks with.
 */
export function useMoveToTrash(onMoved: (id: string) => void) {
  const { confirm, confirmDialog } = useConfirm();
  const [problem, setProblem] = useState<string | null>(null);
  const button = (id: string, who: string, what = "request") => (
    <button type="button" className="rb-move" data-testid="move-to-trash" style={GF}
      onClick={event => {
        event.preventDefault(); event.stopPropagation(); setProblem(null);
        confirm({
          title: `Move this ${what} to the trash?`,
          body: `The ${what} with ${who} leaves your list. You can restore it from the trash, or delete it there for good. Nothing changes for ${who}.`,
          confirmLabel: "Move to trash", cancelLabel: "Keep it",
          onConfirm: async () => {
            try {
              await withProcess("enotary-bin-trash", who, () => realEnotaryBinService.trash(id), whyNot);
              onMoved(id);
            } catch (error) { setProblem(whyNot(error)); }
          },
        });
      }}>
      <style>{CSS}</style>
      <Trash2 size={14} aria-hidden /> Move to trash
    </button>
  );
  return { button, confirmDialog, problem, clearProblem: () => { setProblem(null); } };
}

export function RequestBinPanel({ role, onClose, onChanged }: { role: BinRole; onClose: () => void; onChanged: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState<BinItem[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(() => {
    realEnotaryBinService.list(role).then(setItems, () => { setItems([]); setProblem("The trash could not be opened. Please try again."); });
  }, [role]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && document.querySelector("[role=alertdialog]") === null) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const run = (work: () => Promise<unknown>) => async () => {
    setBusy(true); setProblem(null);
    try { await work(); } catch (error) { setProblem(whyNot(error)); } finally { setBusy(false); load(); onChanged(); }
  };
  const forGood = role === "client"
    ? "The notarized document and the notary's records are kept, as the law requires."
    : "Your Notary Book entry, the notarized document and the audit trail are kept, as the law requires.";

  const restore = (item: BinItem) => {
    void run(() => withProcess("enotary-bin-restore", item.otherParty, () => realEnotaryBinService.restore(item.id, role), whyNot))();
  };
  const remove = (item: BinItem) => {
    confirm({
      title: "Delete this request for good?",
      body: `The request with ${item.otherParty} leaves your trash and your lists, and cannot be brought back. ${forGood}`,
      confirmLabel: "Delete for good", cancelLabel: "Keep it", destructive: true,
      onConfirm: run(() => withProcess("enotary-bin-delete", item.otherParty, () => realEnotaryBinService.remove(item.id, role), whyNot)),
    });
  };
  const restoreAll = () => {
    confirm({
      title: `Restore all ${String(items?.length ?? 0)} requests?`,
      body: "Every request in the trash goes back to your list.",
      confirmLabel: "Restore all", cancelLabel: "Not now",
      onConfirm: run(() => withProcess("enotary-bin-restore-all", "", () => realEnotaryBinService.restoreAll(role), whyNot)),
    });
  };
  const empty = () => {
    confirm({
      title: "Empty the trash?",
      body: `All ${String(items?.length ?? 0)} requests in the trash are deleted from your lists for good, and cannot be brought back. ${forGood}`,
      confirmLabel: "Empty the trash", cancelLabel: "Keep them", destructive: true,
      onConfirm: run(() => withProcess("enotary-bin-empty", "", () => realEnotaryBinService.empty(role), whyNot)),
    });
  };

  const count = items?.length ?? 0;
  return (
    <div className="rb-veil" style={{ ...GF, zIndex: Z.modal }} data-testid="bin-overlay"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <style>{CSS}</style>
      <section className="rb-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="bin-panel">
        <header className="rb-top">
          <h2 id={titleId}><Trash2 size={22} aria-hidden /> Trash</h2>
          <p>{role === "client" ? "Requests you moved here from your Notarial Request History." : "Requests you moved here from your Notary Desk."} Restore one to bring it back, or delete it for good.</p>
          <button ref={closeRef} type="button" className="rb-x" aria-label="Close the trash" data-testid="bin-close" onClick={onClose}><X size={18} aria-hidden /></button>
        </header>
        {count > 0 && (
          <div className="rb-bar">
            <span data-testid="bin-total">{count} {count === 1 ? "request" : "requests"} in the trash</span>
            <div>
              <button type="button" className="rb-btn" data-testid="bin-restore-all" disabled={busy} onClick={restoreAll}><ArchiveRestore size={15} aria-hidden /> Restore all</button>
              <button type="button" className="rb-btn" data-testid="bin-empty" disabled={busy} onClick={empty} style={{ color: "#B0182B", borderColor: "#F1C7CE" }}><Trash2 size={15} aria-hidden /> Empty the trash</button>
            </div>
          </div>
        )}
        {problem !== null && <p className="rb-problem" role="alert" data-testid="bin-problem">{problem}</p>}
        {items === null ? (
          <p className="rb-empty">Opening the trash…</p>
        ) : count === 0 ? (
          <p className="rb-empty" data-testid="bin-empty-state"><span aria-hidden="true"><Trash2 size={24} /></span><br />The trash is empty.<br />A request that is over can be moved here from its card.</p>
        ) : (
          <ul className="rb-list" data-testid="bin-list">
            {items.map(item => (
              <li key={item.id} className="rb-item" data-testid="bin-item" data-outcome={item.outcome}>
                <div style={{ minWidth: 0 }}>
                  <p className="rb-name"><strong>{role === "client" ? `Atty. ${item.otherParty.replace(/^atty\.?\s+/i, "")}` : item.otherParty}</strong>
                    <span className="rb-pill">{BIN_OUTCOME_LABELS[item.outcome]}</span></p>
                  <p className="rb-meta">
                    {item.reference !== null && <span className="rb-ref">{item.reference}</span>}
                    {item.documentLabel !== null && <span><FileText size={13} aria-hidden /> {item.documentLabel}</span>}
                    <span><CalendarDays size={13} aria-hidden /> Sent {stampLabel(item.createdAt)}</span>
                    <span><Trash2 size={13} aria-hidden /> Moved here {stampLabel(item.trashedAt)}</span>
                  </p>
                </div>
                <div className="rb-acts">
                  <button type="button" className="rb-act restore" data-testid="bin-restore" disabled={busy} onClick={() => { restore(item); }}><ArchiveRestore size={14} aria-hidden /> Restore</button>
                  <button type="button" className="rb-act delete" data-testid="bin-delete" disabled={busy} onClick={() => { remove(item); }}><Trash2 size={14} aria-hidden /> Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="rb-note"><Info size={14} aria-hidden /> Deleting only removes a request from your own lists. {forGood}</p>
      </section>
      {confirmDialog}
    </div>
  );
}
