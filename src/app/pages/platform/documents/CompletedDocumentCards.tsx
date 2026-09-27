// The Completed section of Documents, as cards.
//
// Each card is topped by the workspace's own branding banner — the same
// BrandBand the Branding settings preview and the Manage Overview card draw —
// read from the shared branding store. With a backend the store is kept
// current by useWorkspaceBrandingSync (and by publishWorkspaceBranding right
// after a save), so a change saved in Settings shows on these cards at once.
// The demo build reads the demo branding the same way the Manage card does.
//
// Below the banner: the name, a Completed badge, the Verification ID with its
// Copy / Verify actions, signing progress and when it was created. The card's
// other actions live behind a menu button in the banner's top-right corner;
// a card given `onShare` also has a Share button in its bottom-right corner.
//
// Shared Documents (087) reuses the same card: Shared By Me with the current
// workspace's branding, Shared With Me with the OWNER workspace's (`branding`).

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { Menu, X, CircleCheck, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandBand } from "../settings/branding-preview";
import { VerificationIdActions } from "../../../components/documents/VerificationIdActions";
import { usePlatform } from "../../../context/PlatformContext";
import { useWorkspaceMode } from "../../../hooks/useWorkspaceAccess";
import {
  DEMO_BRANDING_KEY, getWorkspaceBrandingSnapshot, publishDemoBranding, useWorkspaceBrandingSnapshot,
} from "../../../hooks/workspace-branding-store";
import { mockBrandingSettingsService } from "../../../services/mock/settings.service";
import { Z } from "../../../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SLATE = "#475569";
const BORDER = "#E2E8F0";
const DEFAULT_COLOR = "#0078D4";

export interface CardBranding { displayName: string; primaryColor: string; logoUrl: string | null }

/** The current workspace's branding for the card banners, live from the shared store. */
export function useDocumentCardBranding(): CardBranding {
  const platform = usePlatform();
  const { isReal, workspaceId } = useWorkspaceMode();
  const key = isReal ? workspaceId : DEMO_BRANDING_KEY;
  const snapshot = useWorkspaceBrandingSnapshot(key);

  // The demo has no sync hook; seed the store from the demo branding once,
  // exactly as the Manage Overview card does.
  useEffect(() => {
    if (isReal || getWorkspaceBrandingSnapshot(DEMO_BRANDING_KEY) !== null) return;
    let cancelled = false;
    void mockBrandingSettingsService.getWorkspaceBranding().then(b => { if (!cancelled) publishDemoBranding(b); });
    return () => { cancelled = true; };
  }, [isReal]);

  const ws = platform.currentWorkspace;
  return {
    displayName: snapshot?.displayName || ws?.name || "Workspace",
    primaryColor: snapshot?.primaryColor ?? ws?.brandColor ?? ws?.accentColor ?? DEFAULT_COLOR,
    logoUrl: snapshot?.logoUrl ?? null,
  };
}

export interface CardAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** A link, or… */
  href?: string;
  /** …a handler. */
  onSelect?: () => void;
}

export interface CompletedCardData {
  key: string;
  title: string;
  verificationId: string | null;
  done: number;
  total: number;
  /** ISO date-time. */
  createdAt: string;
  actions: CardAction[];
  /** Shows a "Share" button in the card's bottom-right corner. */
  onShare?: () => void;
  /** Another workspace's branding (a document shared WITH me); defaults to the current workspace's. */
  branding?: CardBranding;
  /** The banner's second line. Defaults to "Completed document". */
  bannerSubtitle?: string;
  /** The label before the date. Defaults to "Created". */
  dateLabel?: string;
  /** Extra lines under the progress bar (who it is shared with, and so on). */
  extra?: React.ReactNode;
}

function formatCreated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function ActionsMenu({ title, actions }: { title: string; actions: CardAction[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); close(true); } };
    const onPointer = (e: PointerEvent | MouseEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, close]);

  const onMenuKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    const i = items.findIndex(el => el === document.activeElement);
    let next: number | null = null;
    if (e.key === "ArrowDown") next = (i + 1) % items.length;
    else if (e.key === "ArrowUp") next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "Tab") { close(false); return; }
    if (next === null) return;
    e.preventDefault();
    items[next]?.focus();
  };

  if (actions.length === 0) return null;
  const itemStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 40, padding: "0 14px",
    border: "none", background: "none", cursor: "pointer", textAlign: "left", textDecoration: "none",
    ...GF, fontSize: 13.5, fontWeight: 500, color: NAVY, boxSizing: "border-box",
  };

  return (
    <div ref={wrapRef} style={{ position: "absolute", top: 8, right: 8, zIndex: open ? Z.dropdown : Z.raised }}>
      <button ref={buttonRef} type="button" className="doc-card-menu-btn"
        aria-expanded={open} aria-controls={panelId} aria-haspopup="menu"
        aria-label={`${open ? "Hide" : "Show"} actions for ${title}`}
        onClick={() => { setOpen(o => !o); }}
        style={{
          width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.94)", color: NAVY, border: "1px solid rgba(7,17,31,0.14)",
          boxShadow: "0 1px 3px rgba(7,17,31,0.25)", cursor: "pointer",
        }}>
        {open ? <X size={17} aria-hidden /> : <Menu size={17} aria-hidden />}
      </button>
      <div ref={panelRef} id={panelId} role="menu" aria-label={`Actions for ${title}`} hidden={!open} onKeyDown={onMenuKey}
        data-testid="doc-card-menu"
        style={{
          position: "absolute", top: 42, right: 0, width: "max-content", minWidth: 190, maxWidth: "min(260px, calc(100vw - 48px))",
          background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "4px 0",
          boxShadow: "0 12px 28px -8px rgba(7,17,31,0.3)",
        }}>
        {actions.map(a => {
          const Icon = a.icon;
          const content = <>{Icon && <Icon size={15} aria-hidden color={SLATE} />}<span>{a.label}</span></>;
          return a.href ? (
            <Link key={a.id} to={a.href} role="menuitem" tabIndex={-1} className="doc-card-menu-item" style={itemStyle}
              onClick={() => { close(false); }}>{content}</Link>
          ) : (
            <button key={a.id} type="button" role="menuitem" tabIndex={-1} className="doc-card-menu-item" style={itemStyle}
              onClick={() => { close(false); a.onSelect?.(); }}>{content}</button>
          );
        })}
      </div>
    </div>
  );
}

export function CompletedDocumentCard({ card, branding: workspaceBranding }: { card: CompletedCardData; branding: CardBranding }) {
  const pct = card.total > 0 ? Math.round((card.done / card.total) * 100) : 0;
  const branding = card.branding ?? workspaceBranding;
  return (
    <li className="doc-completed-card" data-testid="completed-card" style={{
      position: "relative", listStyle: "none", minWidth: 0, display: "flex", flexDirection: "column",
      background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "visible",
      boxShadow: "0 1px 2px rgba(7,17,31,0.05)",
    }}>
      <div style={{ borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
        <BrandBand variant="card" compact testId="completed-card-banner" subtitle={card.bannerSubtitle ?? "Completed document"}
          branding={{ displayName: branding.displayName, primaryColor: branding.primaryColor, logoPreviewUrl: branding.logoUrl }}
          style={{ paddingRight: 56 }} />
      </div>
      <ActionsMenu title={card.title} actions={card.actions} />
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10, minWidth: 0, flex: 1 }}>
        <h3 title={card.title} style={{
          ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1.35, overflowWrap: "anywhere",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{card.title}</h3>
        <div>
          <span style={{
            ...GF, fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
            background: "#DCFCE7", color: "#166534", border: "1px solid #BBF7D0",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <CircleCheck size={12} aria-hidden /> Completed
          </span>
        </div>
        {card.verificationId && (
          <div style={{ minWidth: 0 }}>
            <VerificationIdActions id={card.verificationId} variant="line" label="Verification ID" />
          </div>
        )}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", ...GF, fontSize: 12.5, color: SLATE, marginBottom: 5 }}>
            <span data-testid="completed-card-progress">{card.done} of {card.total} signed</span>
            <span>{pct}%</span>
          </div>
          <div role="meter" aria-valuenow={card.done} aria-valuemin={0} aria-valuemax={card.total}
            aria-label={`${String(card.done)} of ${String(card.total)} signed`}
            style={{ height: 6, background: BORDER, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${String(pct)}%`, height: "100%", background: pct === 100 ? "#15803D" : DEFAULT_COLOR, borderRadius: 999 }} />
          </div>
        </div>
        {card.extra}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
          <div style={{ ...GF, fontSize: 12.5, color: SLATE }}>
            {card.dateLabel ?? "Created"} <time dateTime={card.createdAt}>{formatCreated(card.createdAt)}</time>
          </div>
          {card.onShare && (
            <button type="button" className="doc-card-share-btn" onClick={card.onShare}
              aria-label={`Share ${card.title}`} data-testid="completed-card-share"
              style={{
                ...GF, marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 14px",
                borderRadius: 8, border: "1px solid #0078D4", background: "#FFFFFF", color: "#005A9E",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
              <Share2 size={14} aria-hidden /> Share
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function CompletedDocumentGrid({ cards, label = "Completed documents" }: { cards: CompletedCardData[]; label?: string }) {
  const branding = useDocumentCardBranding();
  return (
    <>
      <ul className="doc-completed-grid" data-testid="completed-grid" aria-label={label} style={{ margin: "12px 0 0", padding: 0 }}>
        {cards.map(c => <CompletedDocumentCard key={c.key} card={c} branding={branding} />)}
      </ul>
      <style>{`
        .doc-completed-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
        @media (min-width: 600px) { .doc-completed-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (min-width: 1100px) { .doc-completed-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (min-width: 1500px) { .doc-completed-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        .doc-card-menu-btn:focus-visible { outline: 3px solid #FFFFFF; outline-offset: 1px; box-shadow: 0 0 0 5px rgba(0,120,212,0.7) !important; }
        .doc-card-menu-item:hover, .doc-card-menu-item:focus { background: #F1F5F9 !important; outline: none; }
        .doc-card-share-btn:hover { background: #EFF6FF !important; }
        .doc-card-share-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
      `}</style>
    </>
  );
}
