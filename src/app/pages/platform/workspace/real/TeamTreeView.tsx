// One team's people as a hierarchy: levels from the top down by workspace
// role — Owner, Administrator, Template Administrator, Sender, Reviewer,
// Auditor, New Comer (team-hierarchy.ts's ladder) — someone holding a title
// in the team leading their level. Each level is a centred row joined to the
// one above by a connector; each person a node: face, name, and their title
// in the team (or their role). A click opens the person's panel.
//
// The tree is always centred in its card. On a phone it does not turn into a
// list: the same tree, drawn small (the page can still be zoomed), rows that
// wrap rather than overlap and never scroll sideways.

import { buildLevels, ladderRole, type HierarchyPerson } from "./team-hierarchy";
import { MemberAvatar } from "../../../../components/platform/MemberAvatar";
import type { OrganizationUnitMember } from "../../../../models/organization";
import type { WorkspaceMemberSummary } from "../../../../models/workspace-admin";
import { REAL_ROLE_LABELS } from "../../../../services/real/workspace-admin.service";

export function TeamTreeView({ members, memberOf, photo, meId, onOpen, label }: {
  members: OrganizationUnitMember[];
  /** The workspace membership behind a user id, when this reader may see it. */
  memberOf: (userId: string) => WorkspaceMemberSummary | null;
  photo: (userId: string) => string | undefined;
  meId: string | null;
  onOpen: (userId: string) => void;
  label: string;
}) {
  const people: HierarchyPerson[] = members.map(m => {
    const member = memberOf(m.userId);
    return {
      id: m.userId,
      name: m.displayName,
      role: member ? ladderRole(member.roleId) : null,
      roleName: member ? REAL_ROLE_LABELS[ladderRole(member.roleId)] : null,
      roleTitle: member?.roleTitle ?? null,
      unitTitle: m.title,
    };
  });
  const levels = buildLevels(people);
  if (levels.length === 0) return null;

  return (
    <div className="tt" data-testid="team-tree-view">
      <style>{TREE_CSS}</style>
      <ol className="tt-levels" aria-label={`${label}: people by level`}>
        {levels.map((level, i) => (
          <li key={level.key} className="tt-level" data-first={i === 0 ? "true" : undefined} data-testid={`tree-level-${level.key}`}>
            <span className="tt-level-label">{level.title}</span>
            <ul className="tt-row" data-single={level.people.length === 1 ? "true" : undefined}>
              {level.people.map(p => (
                <li key={p.id} className="tt-slot">
                  <button type="button" className="tt-node" data-testid={`tree-node-${p.id}`} onClick={() => { onOpen(p.id); }}
                    aria-label={`${p.name}${p.id === meId ? " (you)" : ""}, ${p.unitTitle ?? p.roleTitle ?? p.roleName ?? level.title}`}>
                    <span className="tt-face">
                      <MemberAvatar name={p.name} url={photo(p.id)} size={44} ring />
                      {p.id === meId && <span className="tt-you" aria-hidden>You</span>}
                    </span>
                    <span className="tt-name">{p.name}</span>
                    <span className="tt-title">{p.unitTitle ?? p.roleTitle ?? p.roleName ?? level.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Node width is fixed per screen size so the rail between the first and last
// node can be drawn from their centres (half a node in from each end).
const TREE_CSS = `
.tt { --tt-node: 128px; --tt-gap: 14px; --tt-face: 44px; --tt-line: #CBD5E1;
  display: flex; justify-content: center; margin-top: 14px; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.tt::-webkit-scrollbar { display: none; }
.tt-levels { list-style: none; margin: 0 auto; padding: 0; display: flex; flex-direction: column; align-items: center; max-width: 100%; }
.tt-level { display: flex; flex-direction: column; align-items: center; position: relative; max-width: 100%; }
/* From the level above, down to this level's rail. */
.tt-level:not([data-first])::before { content: ""; width: 2px; height: 14px; background: var(--tt-line); border-radius: 1px; }
.tt-level-label { font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: #64748B; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 999px; padding: 2px 9px; position: relative; z-index: 1; white-space: nowrap; }
.tt-level-label::after { content: ""; position: absolute; left: 50%; top: 100%; width: 2px; height: 10px; background: var(--tt-line); transform: translateX(-1px); }
.tt-row { list-style: none; margin: 10px 0 0; padding: 10px 0 0; display: flex; flex-wrap: wrap; justify-content: center; gap: var(--tt-gap);
  position: relative; max-width: 100%; }
/* The rail joining this level's nodes, centre to centre. */
.tt-row:not([data-single])::before { content: ""; position: absolute; top: 0; height: 2px; background: var(--tt-line);
  left: calc(var(--tt-node) / 2); right: calc(var(--tt-node) / 2); border-radius: 1px; }
.tt-slot { width: var(--tt-node); display: flex; justify-content: center; position: relative; }
.tt-slot::before { content: ""; position: absolute; top: -10px; left: 50%; width: 2px; height: 10px; background: var(--tt-line); transform: translateX(-1px); }
.tt-node { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px 9px; box-sizing: border-box;
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; cursor: pointer; text-align: center; min-width: 0;
  box-shadow: 0 1px 2px rgba(7,17,31,0.05); transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease; }
.tt-node:hover { border-color: #93C5FD; box-shadow: 0 8px 18px -12px rgba(0,120,212,0.7); transform: translateY(-1px); }
.tt-node:focus-visible { outline: 3px solid rgba(0,120,212,0.4); outline-offset: 2px; }
.tt-face { position: relative; display: inline-flex; }
.tt-face > span:first-child { width: var(--tt-face) !important; height: var(--tt-face) !important; font-size: calc(var(--tt-face) * 0.36) !important; }
.tt-you { position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); font-family: 'Geist', sans-serif; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.04em; text-transform: uppercase; color: #FFFFFF; background: #0078D4; border: 1.5px solid #FFFFFF; border-radius: 999px; padding: 0 5px; line-height: 1.5; white-space: nowrap; }
.tt-name { font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 700; color: #07111F; line-height: 1.25; max-width: 100%;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; margin-top: 2px; }
.tt-title { font-family: 'Geist', sans-serif; font-size: 11px; color: #64748B; line-height: 1.25; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Phones: the same tree, small. */
@media (max-width: 640px) {
  .tt { --tt-node: 70px; --tt-gap: 6px; --tt-face: 28px; }
  .tt-level-label { font-size: 8px; padding: 1px 7px; }
  .tt-node { padding: 5px 3px 6px; border-radius: 10px; gap: 2px; }
  .tt-name { font-size: 9.5px; }
  .tt-title { font-size: 8px; }
  .tt-you { font-size: 6.5px; padding: 0 3px; bottom: -3px; }
}
@media (max-width: 360px) { .tt { --tt-node: 62px; --tt-gap: 5px; --tt-face: 26px; } }
@media (prefers-reduced-motion: reduce) { .tt-node { transition: none; } .tt-node:hover { transform: none; } }
`;
