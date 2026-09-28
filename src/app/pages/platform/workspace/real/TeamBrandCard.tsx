// One team on Manage → Teams, topped by the workspace's branding banner —
// the same BrandBand the Completed document cards and the Overview card
// draw, fed by the shared branding store, so a colour or logo saved in
// Settings shows here at once. The whole card is one link to the team's
// hierarchy.
//
//   ┌──────────── brand colour ────────────┐
//   │ [logo] Reyes Law Office               │
//   │        Department                     │
//   └───────────────────────────────────────┘
//     Finance
//     Department · in Head Office · 2 sub-teams
//     (AR)(JC)(+3)  5 members
//     View hierarchy →

import { Link } from "react-router";
import { ArrowRight, GitBranch, Users } from "lucide-react";
import { BrandBand } from "../../settings/branding-preview";
import type { CardBranding } from "../../documents/CompletedDocumentCards";

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const GM = { fontFamily: "'Geist Mono', monospace" } as const;
const NAVY = "#07111F";
const SLATE = "#475569";

export function TeamBrandCard({
  to, testId, name, kind, parentName, archived, membersLabel, initials, extraCount, subCount, branding, description,
}: {
  to: string; testId: string; name: string; kind: string; parentName: string | null; archived: boolean;
  membersLabel: string; initials: string[]; extraCount: number; subCount: number; branding: CardBranding;
  description?: string | null;
}) {
  return (
    <li className={`team-card${archived ? " team-card--archived" : ""}`} style={{ listStyle: "none", minWidth: 0 }}>
      <Link to={to} data-testid={testId} className="team-card-link" aria-label={`${name}, ${kind}${parentName ? `, in ${parentName}` : ""}, ${membersLabel}${archived ? ", archived" : ""}. View hierarchy`}>
        <div style={{ borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
          <BrandBand variant="card" compact testId={`${testId}-banner`} subtitle={kind}
            branding={{ displayName: branding.displayName, primaryColor: branding.primaryColor, logoPreviewUrl: branding.logoUrl }}
            headerAside={archived ? (
              <span style={{ ...GM, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "#FFFFFF", color: "#334155", flexShrink: 0 }}>Archived</span>
            ) : undefined} />
        </div>
        <div className="team-card-body">
          <h3 className="team-card-name">{name}</h3>
          <div style={{ ...GF, fontSize: 12.5, color: SLATE, display: "flex", flexWrap: "wrap", gap: "4px 12px", minWidth: 0, marginTop: -4 }}>
            <span style={{ fontWeight: 600, color: "#1E293B" }}>{kind}</span>
            {parentName && <span style={{ overflowWrap: "anywhere" }}>in {parentName}</span>}
            {subCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <GitBranch size={12} aria-hidden /> {subCount} {subCount === 1 ? "sub-team" : "sub-teams"}
              </span>
            )}
          </div>
          {description && <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: 0, lineHeight: 1.5, overflowWrap: "anywhere" }}>{description}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {initials.length > 0 ? (
              <span aria-hidden style={{ display: "inline-flex", flexShrink: 0 }}>
                {initials.map((i, n) => (
                  <span key={`${i}-${String(n)}`} className="team-card-avatar" style={{ marginLeft: n === 0 ? 0 : -8, zIndex: initials.length - n }}>{i}</span>
                ))}
                {extraCount > 0 && <span className="team-card-avatar team-card-avatar--more" style={{ marginLeft: -8 }}>+{extraCount}</span>}
              </span>
            ) : (
              <span aria-hidden className="team-card-avatar team-card-avatar--empty"><Users size={13} /></span>
            )}
            <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>{membersLabel}</span>
          </div>
          <span className="team-card-cta">View hierarchy <ArrowRight size={14} aria-hidden /></span>
        </div>
      </Link>
    </li>
  );
}

export const TEAM_CARD_STYLES = `
  .team-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 560px) { .team-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (min-width: 1180px) { .team-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (min-width: 1560px) { .team-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  .team-card-link { display: flex; flex-direction: column; height: 100%; text-decoration: none; background: #FFFFFF; border: 1px solid #E2E8F0;
    border-radius: 12px; box-shadow: 0 1px 2px rgba(7,17,31,0.05); transition: box-shadow 0.15s, border-color 0.15s; min-width: 0; }
  .team-card-link:hover { border-color: #0078D4; box-shadow: 0 8px 22px -12px rgba(7,17,31,0.35); }
  .team-card-link:focus-visible { outline: 3px solid #0078D4; outline-offset: 2px; }
  .team-card--archived .team-card-link { background: #F8FAFC; }
  .team-card-name { margin: 0; font-family: 'Geist', sans-serif; font-size: 16px; font-weight: 700; color: #07111F; line-height: 1.3; overflow-wrap: anywhere; }
  .team-card-body { padding: 12px 16px 14px; display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; }
  .team-card-avatar { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; position: relative;
    background: #F0F7FF; color: #005A9E; border: 2px solid #FFFFFF; box-shadow: 0 0 0 1px #BFDBFE; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 700; box-sizing: border-box; }
  .team-card-avatar--more { background: #F1F5F9; color: #334155; box-shadow: 0 0 0 1px #CBD5E1; }
  .team-card-avatar--empty { background: #F8FAFC; color: #64748B; box-shadow: 0 0 0 1px #E2E8F0; }
  .team-card-cta { margin-top: auto; display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 600; color: #005A9E; }
  .team-card-link:hover .team-card-cta { text-decoration: underline; text-underline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { .team-card-link { transition: none; } }
`;
