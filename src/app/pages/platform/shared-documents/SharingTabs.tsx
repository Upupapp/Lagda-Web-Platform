// An accessible tab strip (WAI-ARIA tabs, automatic activation): Left/Right
// and Home/End move between tabs, only the active tab is in the Tab order,
// and each tab names the panel it controls. Counts are part of the name.

import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { GF } from "../../../components/document-sharing/SharingPrimitives";

export interface SharingTab<T extends string> {
  id: T;
  label: string;
  count?: number | null;
  icon?: LucideIcon;
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

export function SharingTabs<T extends string>({ label, tabs, active, onChange, idPrefix, size = "major" }: {
  label: string;
  tabs: readonly SharingTab<T>[];
  active: T;
  onChange: (id: T) => void;
  idPrefix: string;
  size?: "major" | "minor";
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex(t => t.id === active);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    const tab = tabs[next];
    if (tab === undefined) return;
    onChange(tab.id);
    refs.current.get(tab.id)?.focus();
  }

  const major = size === "major";
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown}
      className={major ? "sharing-tabs sharing-tabs-major" : "sharing-tabs sharing-tabs-minor"}>
      {tabs.map(tab => {
        const selected = tab.id === active;
        const Icon = tab.icon;
        return (
          <button key={tab.id} type="button" role="tab" id={tabId(idPrefix, tab.id)}
            ref={el => { if (el) refs.current.set(tab.id, el); else refs.current.delete(tab.id); }}
            aria-selected={selected} aria-controls={panelId(idPrefix, tab.id)} tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)} className="sharing-tab" style={GF}>
            {Icon && <Icon size={major ? 16 : 14} aria-hidden />}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
              <span className="sharing-tab-count">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const SHARING_STYLES = `
  .sharing-tabs { display: flex; gap: 4px; flex-wrap: wrap; min-width: 0; }
  .sharing-tabs-major { border-bottom: 1px solid #E2E8F0; margin: 0 0 16px; }
  .sharing-tabs-minor { margin: 0 0 14px; padding: 4px; background: #F1F5F9; border-radius: 10px; width: fit-content; max-width: 100%; box-sizing: border-box; }
  .sharing-tab { display: inline-flex; align-items: center; gap: 7px; border: none; background: none; cursor: pointer; color: #475569; font-weight: 600; white-space: nowrap; }
  .sharing-tabs-major .sharing-tab { font-size: 14.5px; padding: 12px 14px; min-height: 44px; border-bottom: 3px solid transparent; margin-bottom: -1px; }
  .sharing-tabs-major .sharing-tab[aria-selected="true"] { color: #005A9E; border-bottom-color: #0078D4; }
  .sharing-tabs-minor .sharing-tab { font-size: 13px; padding: 7px 12px; min-height: 36px; border-radius: 8px; }
  .sharing-tabs-minor .sharing-tab[aria-selected="true"] { background: #FFFFFF; color: #07111F; box-shadow: 0 1px 2px rgba(7,17,31,0.12); }
  .sharing-tab:hover { color: #07111F; }
  .sharing-tab:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
  .sharing-tab-count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: #E2E8F0; color: #1E293B; font-size: 11.5px; font-weight: 700; box-sizing: border-box; }
  .sharing-tab[aria-selected="true"] .sharing-tab-count { background: #DBEAFE; color: #1E3A8A; }
  .sharing-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
  .sharing-row { border: 1px solid #E2E8F0; border-radius: 12px; background: #FFFFFF; padding: 14px 16px; display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-start; min-width: 0; box-sizing: border-box; }
  .sharing-row-main { flex: 1 1 260px; min-width: 0; }
  .sharing-row-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .sharing-toolbar { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  @media (max-width: 480px) {
    .sharing-tabs-major .sharing-tab { padding: 10px 10px; font-size: 14px; }
    .sharing-tabs-minor { width: 100%; }
    .sharing-tabs-minor .sharing-tab { flex: 1 1 auto; justify-content: center; padding: 7px 8px; }
    .sharing-row-actions { width: 100%; }
    .sharing-row-actions > * { flex: 1 1 auto; }
  }
`;
