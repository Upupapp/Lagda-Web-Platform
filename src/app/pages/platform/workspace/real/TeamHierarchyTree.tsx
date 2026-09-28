// A team's people as a hierarchy diagram.
//
//                    ┌──────────── Team (brand colour) ────────────┐
//                    └───────────────────────┬──────────────────────┘
//                                     [ Owner · 1 ]
//                                      ┌ Ana Reyes ┐
//                                  [ Senders · 2 ]
//                        ┌──────────────┴──────────────┐
//                   ┌ Jose Cruz ┐                 ┌ Rita Lim ┐
//                                   [ Sub-teams · 1 ]
//                                    ┌ Cebu Office ┐
//
// Three layouts, one tree:
//   wide     (≥1024px)  a centred top-down chart; if it is wider than the
//                       space it scales down to fit, with "Actual size" to
//                       scroll it at 100% instead.
//   compact  (768–1023) smaller nodes; a level too wide for the row wraps.
//   vertical (<768)     an indented outline with elbow connectors — nothing
//                       ever wider than the phone.
//
// It is a WAI-ARIA tree: one Tab stop, Up/Down move through visible items,
// Right opens a level (or moves into it), Left closes it (or moves to its
// parent), Home/End jump, Enter/Space open and close a level or open a
// person's profile. Connectors are CSS borders; they carry no meaning a
// screen reader needs, because the nesting is in the tree structure itself.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronRight, Users, Maximize2, ZoomIn } from "lucide-react";
import { useViewport } from "../../../../hooks/useViewport";
import { initialsOfName, personRoleLine, type HierarchyLevel, type HierarchyPerson, type HierarchySubTeam } from "./team-hierarchy";

const NAVY = "#07111F";
const SLATE = "#475569";

export type TreeLayout = "wide" | "compact" | "vertical";

export interface TeamHierarchyTreeProps {
  teamName: string;
  teamKind: string;
  brandColor: string;
  logoUrl: string | null;
  levels: HierarchyLevel[];
  subTeams: HierarchySubTeam[];
  /** Shown under the diagram when roles could not be read. */
  rolesUnavailable?: boolean;
  /** Forces a layout (tests, screenshots); otherwise it follows the viewport. */
  layout?: TreeLayout;
}

const ROOT = "root";
const levelId = (key: string) => `level:${key}`;
const personId = (id: string) => `person:${id}`;
const subId = (id: string) => `sub:${id}`;
const SUBTEAMS = "level:__subteams";

function countSubTeams(list: HierarchySubTeam[]): number {
  return list.reduce((n, s) => n + 1 + countSubTeams(s.children), 0);
}

export function TeamHierarchyTree({
  teamName, teamKind, brandColor, logoUrl, levels, subTeams, rolesUnavailable = false, layout: forced,
}: TeamHierarchyTreeProps) {
  const { isNarrow, isMedium } = useViewport();
  const layout: TreeLayout = forced ?? (isNarrow ? "vertical" : isMedium ? "compact" : "wide");
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [focused, setFocused] = useState<string>(ROOT);
  const treeRef = useRef<HTMLUListElement>(null);
  const people = levels.reduce((n, l) => n + l.people.length, 0);

  const isOpen = useCallback((id: string) => !collapsed.has(id), [collapsed]);
  const setOpen = useCallback((id: string, open: boolean) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (open) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandable = useMemo(() => {
    const ids = [ROOT, ...levels.map(l => levelId(l.key))];
    if (subTeams.length > 0) ids.push(SUBTEAMS);
    const walk = (list: HierarchySubTeam[]) => { for (const s of list) { if (s.children.length > 0) { ids.push(subId(s.id)); walk(s.children); } } };
    walk(subTeams);
    return ids;
  }, [levels, subTeams]);

  const focusItem = (el: HTMLElement | null | undefined) => {
    if (!el) return;
    const id = el.dataset.treeId;
    if (id) setFocused(id);
    el.focus();
  };

  // If the focused item disappears (its level was closed from a button
  // outside the tree), keep the single Tab stop on something that exists.
  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) return;
    const present = Array.from(tree.querySelectorAll<HTMLElement>("[role=treeitem]")).some(el => el.dataset.treeId === focused);
    if (!present) setFocused(ROOT);
  }, [focused, collapsed]);

  function onKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const tree = treeRef.current;
    const current = (e.target as HTMLElement).closest<HTMLElement>("[role=treeitem]");
    if (!tree || !current) return;
    const items = Array.from(tree.querySelectorAll<HTMLElement>("[role=treeitem]"));
    const i = items.indexOf(current);
    const id = current.dataset.treeId ?? "";
    const canOpen = current.getAttribute("aria-expanded") !== null;
    const open = current.getAttribute("aria-expanded") === "true";
    switch (e.key) {
      case "ArrowDown": focusItem(items[i + 1]); break;
      case "ArrowUp": focusItem(items[i - 1]); break;
      case "Home": focusItem(items[0]); break;
      case "End": focusItem(items[items.length - 1]); break;
      case "ArrowRight":
        if (canOpen && !open) setOpen(id, true);
        else if (canOpen && open) focusItem(current.querySelector<HTMLElement>("[role=group] > [role=treeitem]"));
        else return;
        break;
      case "ArrowLeft":
        if (canOpen && open) setOpen(id, false);
        else focusItem(current.parentElement?.closest<HTMLElement>("[role=treeitem]"));
        break;
      case "Enter":
      case " ": {
        const href = current.dataset.href;
        if (canOpen) setOpen(id, !open);
        else if (href) void navigate(href);
        else return;
        break;
      }
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  const itemProps = (id: string, level: number, label: string, opts: { expandable?: boolean; href?: string | null; setSize?: number; pos?: number } = {}) => ({
    role: "treeitem" as const,
    "data-tree-id": id,
    "data-href": opts.href ?? undefined,
    "aria-level": level,
    "aria-label": label,
    "aria-expanded": opts.expandable ? isOpen(id) : undefined,
    "aria-setsize": opts.setSize,
    "aria-posinset": opts.pos,
    tabIndex: focused === id ? 0 : -1,
    onFocus: (e: React.FocusEvent<HTMLElement>) => { if (e.target === e.currentTarget) setFocused(id); },
  });

  const toggle = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(id, !isOpen(id));
    setFocused(id);
    e.currentTarget.closest<HTMLElement>("[role=treeitem]")?.focus();
  };

  // ── Zoom to fit (wide only) ──────────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(true);
  const [box, setBox] = useState({ scale: 1, natural: 0, available: 0, height: 0 });

  useLayoutEffect(() => {
    if (layout !== "wide") return;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;
    const measure = () => {
      const natural = canvas.scrollWidth;
      const available = viewport.clientWidth;
      const scale = fit && natural > available && natural > 0 ? Math.max(0.4, available / natural) : 1;
      const height = canvas.offsetHeight * scale;
      setBox(prev => (prev.scale === scale && prev.natural === natural && prev.available === available && prev.height === height
        ? prev : { scale, natural, available, height }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [layout, fit, collapsed, levels, subTeams]);

  const tooWide = layout === "wide" && box.natural > box.available + 1 && box.available > 0;

  // ── Nodes ────────────────────────────────────────────────────────────────
  // Render helpers, called as functions rather than mounted as components:
  // a component declared inside this one would remount on every render and
  // take keyboard focus with it.
  function personNode(p: HierarchyPerson) {
    const roleLine = personRoleLine(p);
    return (
      <div className={`tht-node${p.href ? " tht-node--link" : ""}`} data-testid={`tree-node-${p.id}`}
        onClick={p.href ? () => { void navigate(p.href as string); } : undefined}>
        <span aria-hidden className="tht-avatar">{initialsOfName(p.name)}</span>
        <span className="tht-node-text">
          <span className="tht-name">{p.name}</span>
          {roleLine && <span className="tht-role">{roleLine}</span>}
          {p.unitTitle && <span className="tht-title">{p.unitTitle}</span>}
        </span>
      </div>
    );
  }

  function levelLabel(id: string, title: string, count: number, icon?: ReactNode) {
    const open = isOpen(id);
    return (
      <div className="tht-level-label" onClick={toggle(id)} aria-hidden>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        <span>{title}</span>
        <span className="tht-count">{count}</span>
      </div>
    );
  }

  function personLabel(p: HierarchyPerson): string {
    return [p.name, personRoleLine(p), p.unitTitle ? `team title ${p.unitTitle}` : null].filter(Boolean).join(", ");
  }

  function subTeamItem(s: HierarchySubTeam, level: number, pos: number, size: number): ReactNode {
    const id = subId(s.id);
    const hasChildren = s.children.length > 0;
    const count = s.memberCount === null ? "" : `, ${String(s.memberCount)} ${s.memberCount === 1 ? "member" : "members"}`;
    return (
      <li key={s.id} {...itemProps(id, level, `${s.name}, ${s.kindLabel}${count}${s.archived ? ", archived" : ""}`, { expandable: hasChildren, href: s.href, setSize: size, pos })}
        className="tht-item">
        <div className={`tht-node tht-node--sub tht-node--link${s.archived ? " tht-node--archived" : ""}`} data-testid={`tree-subteam-${s.id}`}
          onClick={() => { void navigate(s.href); }}>
          <span aria-hidden className="tht-avatar tht-avatar--sub"><Users size={15} /></span>
          <span className="tht-node-text">
            <span className="tht-name">{s.name}</span>
            <span className="tht-role">{s.kindLabel}{s.archived ? " · Archived" : ""}</span>
            {s.memberCount !== null && <span className="tht-meta">{s.memberCount} {s.memberCount === 1 ? "member" : "members"}</span>}
          </span>
          {hasChildren && (
            <span aria-hidden className="tht-subtoggle" onClick={toggle(id)}>
              {isOpen(id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </div>
        {hasChildren && isOpen(id) && (
          <ul role="group" className="tht-row">
            {s.children.map((c, i) => subTeamItem(c, level + 1, i + 1, s.children.length))}
          </ul>
        )}
      </li>
    );
  }

  const groups = levels.length + (subTeams.length > 0 ? 1 : 0);
  const cls = layout === "vertical" ? "tht tht--v" : layout === "compact" ? "tht tht--h tht--c" : "tht tht--h tht--w";

  const tree = (
    <ul ref={treeRef} role="tree" aria-label={`Hierarchy of ${teamName}`} className="tht-tree" onKeyDown={onKeyDown} data-testid="team-tree">
      <li {...itemProps(ROOT, 1, `${teamName}, ${teamKind}, ${String(people)} ${people === 1 ? "person" : "people"}`, { expandable: true })}
        className="tht-item tht-root-item">
        <div className="tht-node tht-node--root" style={{ background: brandColor }} onClick={toggle(ROOT)}>
          {logoUrl
            ? <img src={logoUrl} alt="" className="tht-root-logo" />
            : <span aria-hidden className="tht-avatar tht-avatar--root">{initialsOfName(teamName)}</span>}
          <span className="tht-node-text">
            <span className="tht-name">{teamName}</span>
            <span className="tht-role">{teamKind} · {people} {people === 1 ? "person" : "people"}</span>
          </span>
        </div>
        {isOpen(ROOT) && groups > 0 && (
          <ul role="group" className="tht-levels">
            {levels.map((level, li) => {
              const id = levelId(level.key);
              return (
                <li key={level.key} {...itemProps(id, 2, `${level.title}, ${String(level.people.length)}`, { expandable: true, setSize: groups, pos: li + 1 })}
                  className="tht-item tht-level" data-testid={`tree-level-${level.key}`}>
                  {levelLabel(id, level.title, level.people.length)}
                  {isOpen(id) && (
                    <ul role="group" className="tht-row">
                      {level.people.map((p, pi) => (
                        <li key={p.id} {...itemProps(personId(p.id), 3, personLabel(p), { href: p.href, setSize: level.people.length, pos: pi + 1 })}
                          className="tht-item">
                          {personNode(p)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {subTeams.length > 0 && (
              <li {...itemProps(SUBTEAMS, 2, `Sub-teams, ${String(countSubTeams(subTeams))}`, { expandable: true, setSize: groups, pos: groups })}
                className="tht-item tht-level tht-level--sub" data-testid="tree-level-subteams">
                {levelLabel(SUBTEAMS, "Sub-teams", countSubTeams(subTeams), <Users size={13} />)}
                {isOpen(SUBTEAMS) && (
                  <ul role="group" className="tht-row">
                    {subTeams.map((s, i) => subTeamItem(s, 3, i + 1, subTeams.length))}
                  </ul>
                )}
              </li>
            )}
          </ul>
        )}
      </li>
    </ul>
  );

  const allOpen = expandable.every(id => isOpen(id));
  const noneOpen = expandable.every(id => !isOpen(id));

  return (
    <div className={cls} data-layout={layout} data-testid="team-hierarchy" style={{ ["--tht-brand" as string]: brandColor }}>
      <div className="tht-toolbar">
        <p className="tht-help" id="tht-help">
          {layout === "vertical" ? "Tap a level to open or close it." : "Highest workspace role at the top."}
          <span className="tht-sr"> Use the arrow keys to move through the diagram, Enter to open a level or a person.</span>
        </p>
        <div className="tht-tools">
          <button type="button" className="tht-tool" disabled={allOpen} onClick={() => setCollapsed(new Set())}>Expand all</button>
          <button type="button" className="tht-tool" disabled={noneOpen}
            onClick={() => setCollapsed(new Set(expandable.filter(id => id !== ROOT)))}>Collapse all</button>
          {tooWide && (
            <button type="button" className="tht-tool" aria-pressed={!fit} onClick={() => setFit(f => !f)}
              title={fit ? "Show the diagram at 100% and scroll it" : "Scale the diagram to fit the page"}>
              {fit ? <><ZoomIn size={13} aria-hidden /> Actual size</> : <><Maximize2 size={13} aria-hidden /> Fit to width</>}
            </button>
          )}
          {tooWide && fit && <span className="tht-zoom" data-testid="tree-zoom">{Math.round(box.scale * 100)}%</span>}
        </div>
      </div>
      {layout === "wide" ? (
        <div ref={viewportRef} className="tht-viewport" data-testid="tree-viewport"
          style={{ height: box.height > 0 ? box.height : undefined, overflowX: fit && box.natural * box.scale <= box.available + 1 ? "hidden" : "auto" }}>
          <div ref={canvasRef} className="tht-canvas"
            style={{
              transform: box.scale !== 1 ? `scale(${String(box.scale)})` : undefined,
              marginLeft: fit || box.natural <= box.available ? Math.max(0, (box.available - box.natural * box.scale) / 2) : 0,
            }}>
            {tree}
          </div>
        </div>
      ) : tree}
      {rolesUnavailable && (
        <p className="tht-note">Workspace roles are visible to owners and administrators, so this diagram shows team titles only.</p>
      )}
      <style>{TREE_STYLES}</style>
    </div>
  );
}

const LINE = "#64748B";

const TREE_STYLES = `
  .tht { min-width: 0; }
  .tht-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .tht-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; margin-bottom: 12px; }
  .tht-help { margin: 0; font-family: 'Geist', sans-serif; font-size: 12.5px; color: ${SLATE}; }
  .tht-tools { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .tht-tool { display: inline-flex; align-items: center; gap: 5px; min-height: 32px; padding: 0 10px; border-radius: 7px; border: 1px solid #CBD5E1; background: #FFFFFF;
    font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 600; color: #0F172A; cursor: pointer; }
  .tht-tool:disabled { color: #64748B; background: #F8FAFC; cursor: default; }
  .tht-tool:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
  .tht-zoom { font-family: 'Geist Mono', monospace; font-size: 11.5px; color: ${SLATE}; }
  .tht-note { margin: 12px 0 0; font-family: 'Geist', sans-serif; font-size: 12.5px; color: ${SLATE}; }
  .tht-tree, .tht-tree ul { list-style: none; margin: 0; padding: 0; }
  .tht-item { outline: none; }
  .tht-item:focus-visible > .tht-node, .tht-item:focus-visible > .tht-level-label { outline: 3px solid #0078D4; outline-offset: 2px; }

  .tht-node { position: relative; display: flex; align-items: center; gap: 10px; box-sizing: border-box; background: #FFFFFF; border: 1px solid #CBD5E1;
    border-radius: 10px; padding: 9px 11px; box-shadow: 0 1px 2px rgba(7,17,31,0.06); text-align: left; min-width: 0; }
  .tht-node--link { cursor: pointer; }
  .tht-node--link:hover { border-color: #0078D4; }
  .tht-node--archived { opacity: 0.8; border-style: dashed; }
  .tht-node--root { border: none; color: #FFFFFF; padding: 12px 16px; box-shadow: 0 6px 16px -8px rgba(7,17,31,0.45); cursor: pointer; }
  .tht-node--root .tht-name { color: #FFFFFF; font-size: 15px; }
  .tht-node--root .tht-role { color: #FFFFFF; }
  .tht-root-logo { height: 32px; max-width: 96px; object-fit: contain; background: #FFFFFF; border-radius: 4px; padding: 2px; flex-shrink: 0; }
  .tht-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
    background: #F0F7FF; color: #005A9E; border: 1px solid #BFDBFE; font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 700; }
  .tht-avatar--root { background: rgba(7,17,31,0.22); color: #FFFFFF; border: none; border-radius: 8px; }
  .tht-avatar--sub { background: #F1F5F9; color: #334155; border-color: #CBD5E1; border-radius: 8px; }
  .tht-node-text { display: flex; flex-direction: column; min-width: 0; gap: 1px; }
  .tht-name { font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 700; color: ${NAVY}; line-height: 1.3; overflow-wrap: anywhere; }
  .tht-role { font-family: 'Geist', sans-serif; font-size: 12px; color: ${SLATE}; line-height: 1.35; overflow-wrap: anywhere; }
  .tht-meta { font-family: 'Geist', sans-serif; font-size: 11.5px; color: ${SLATE}; }
  .tht-title { align-self: flex-start; margin-top: 3px; font-family: 'Geist', sans-serif; font-size: 11px; font-weight: 700; color: #1E3A8A;
    background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 999px; padding: 1px 7px; overflow-wrap: anywhere; }
  .tht-subtoggle { margin-left: auto; color: ${SLATE}; display: inline-flex; padding: 4px; border-radius: 6px; }
  .tht-level-label { display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist', sans-serif; font-size: 12px; font-weight: 700;
    letter-spacing: 0.04em; text-transform: uppercase; color: #1E293B; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 999px;
    padding: 4px 10px 4px 8px; cursor: pointer; user-select: none; white-space: nowrap; }
  .tht-level--sub > .tht-level-label { background: #FFFFFF; border-style: dashed; }
  .tht-count { font-family: 'Geist Mono', monospace; font-size: 11px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 999px; padding: 0 6px; color: ${NAVY}; }

  /* ── Horizontal (wide + compact) ───────────────────────────────────── */
  .tht-viewport { position: relative; overflow-y: hidden; max-width: 100%; }
  .tht-canvas { width: max-content; min-width: 100%; transform-origin: top left; padding: 4px 4px 8px; box-sizing: border-box; }
  .tht--h .tht-tree { display: flex; justify-content: center; }
  .tht--h .tht-root-item { display: flex; flex-direction: column; align-items: center; }
  .tht--h .tht-node--root { min-width: 220px; max-width: 320px; }
  .tht--h .tht-levels { display: flex; flex-direction: column; align-items: center; }
  .tht--h .tht-level { position: relative; display: flex; flex-direction: column; align-items: center; padding-top: 24px; }
  .tht--h .tht-level::before { content: ""; position: absolute; top: 0; left: 50%; height: 24px; border-left: 2px solid ${LINE}; }
  .tht--h .tht-row { position: relative; display: flex; justify-content: center; padding-top: 14px; }
  .tht--h .tht-row::before { content: ""; position: absolute; top: 0; left: 50%; height: 14px; border-left: 2px solid ${LINE}; }
  .tht--h .tht-row > .tht-item { position: relative; display: flex; flex-direction: column; align-items: center; padding: 14px 6px 0; }
  .tht--h .tht-row > .tht-item::before, .tht--h .tht-row > .tht-item::after {
    content: ""; position: absolute; top: 0; right: 50%; width: 50%; height: 14px; border-top: 2px solid ${LINE}; }
  .tht--h .tht-row > .tht-item::after { right: auto; left: 50%; border-left: 2px solid ${LINE}; }
  .tht--h .tht-row > .tht-item:first-child::before, .tht--h .tht-row > .tht-item:last-child::after { border-top: none; }
  .tht--h .tht-row > .tht-item:last-child::before { border-right: 2px solid ${LINE}; border-radius: 0 6px 0 0; right: calc(50% - 2px); }
  .tht--h .tht-row > .tht-item:first-child::after { border-radius: 6px 0 0 0; }
  .tht--h .tht-row > .tht-item:only-child::before { display: none; }
  .tht--h .tht-row > .tht-item:only-child::after { border-top: none; border-radius: 0; }
  .tht--w .tht-row > .tht-item > .tht-node { width: 200px; }
  .tht--c .tht-row > .tht-item > .tht-node { width: 164px; padding: 8px 9px; gap: 8px; }
  .tht--c .tht-avatar { width: 28px; height: 28px; font-size: 10.5px; }
  .tht--c .tht-name { font-size: 12.5px; }
  /* Compact: a level too wide for the row wraps under a bracket instead of shrinking. */
  .tht--c .tht-tree { display: block; }
  .tht--c .tht-root-item, .tht--c .tht-levels, .tht--c .tht-levels > .tht-level { width: 100%; }
  .tht--c .tht-node--root { width: auto; }
  .tht--c .tht-levels > .tht-level > .tht-row { flex-wrap: wrap; row-gap: 12px; max-width: 100%; border-top: 2px solid ${LINE}; margin-top: 14px; padding-top: 0; border-radius: 6px 6px 0 0; }
  .tht--c .tht-levels > .tht-level > .tht-row::before { top: -16px; height: 14px; }
  .tht--c .tht-levels > .tht-level > .tht-row > .tht-item::before { display: none; }
  .tht--c .tht-levels > .tht-level > .tht-row > .tht-item::after { border-top: none; border-radius: 0; }
  /* One person on a level: a straight drop, no bracket. */
  .tht--c .tht-levels > .tht-level > .tht-row:has(> .tht-item:only-child) { border-top-color: transparent; }
  .tht--c .tht-levels > .tht-level > .tht-row:has(> .tht-item:only-child)::before { height: 16px; }

  /* ── Vertical (phones): an indented outline with elbows ────────────── */
  .tht--v .tht-node--root { width: 100%; }
  .tht--v .tht-levels, .tht--v .tht-row { margin-left: 16px; padding-left: 14px; border-left: 2px solid ${LINE}; }
  .tht--v .tht-levels > .tht-item, .tht--v .tht-row > .tht-item { position: relative; padding-top: 10px; }
  .tht--v .tht-levels > .tht-item::before, .tht--v .tht-row > .tht-item::before {
    content: ""; position: absolute; left: -16px; top: 29px; width: 14px; border-top: 2px solid ${LINE}; }
  .tht--v .tht-levels > .tht-item:last-child::after, .tht--v .tht-row > .tht-item:last-child::after {
    content: ""; position: absolute; left: -17px; top: 31px; bottom: 0; width: 4px; background: #FFFFFF; }
  .tht--v .tht-row > .tht-item::before { top: 36px; }
  .tht--v .tht-row > .tht-item:last-child::after { top: 38px; }
  .tht--v .tht-level > .tht-level-label { margin: 4px 0 2px; min-height: 32px; box-sizing: border-box; }
  .tht--v .tht-level > .tht-row { margin-top: 2px; }
  .tht--v .tht-row > .tht-item > .tht-node { width: 100%; }
  .tht--v .tht-levels { margin-top: 0; }
  @media (prefers-reduced-motion: no-preference) { .tht-node { transition: border-color 0.12s; } }
`;
