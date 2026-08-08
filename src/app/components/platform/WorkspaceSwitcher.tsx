// Workspace switcher — shows current workspace, allows switching between workspaces.
// Frontend-only: switching updates in-memory context state only.

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Building2, Plus } from "lucide-react";
import { usePlatform } from "../../context/PlatformContext";
import { PLAN_LABELS } from "../../models";

const GF   = { fontFamily: "'Geist', sans-serif" };
const GM   = { fontFamily: "'Geist Mono', monospace" };
const BORDER = "rgba(255,255,255,0.07)";

interface WorkspaceSwitcherProps {
  collapsed: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { currentWorkspace, workspaces, switchWorkspace } = usePlatform();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  if (!currentWorkspace) return null;

  const initials = currentWorkspace.initials;
  const planLabel = PLAN_LABELS[currentWorkspace.plan];

  if (collapsed) {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={`Current workspace: ${currentWorkspace.name}. Click to switch.`}
          aria-expanded={open}
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: currentWorkspace.accentColor,
            border: "none", color: "white",
            ...GM, fontSize: 11, fontWeight: 700,
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >
          {initials}
        </button>
        {open && (
          <WorkspaceMenu
            workspaces={workspaces}
            currentId={currentWorkspace.id}
            onSelect={(id) => { switchWorkspace(id); setOpen(false); }}
            onClose={() => { setOpen(false); triggerRef.current?.focus(); }}
            ref={menuRef}
            style={{ top: 0, left: 44 }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Current workspace: ${currentWorkspace.name}. Click to switch.`}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          width: "100%", background: "rgba(255,255,255,0.04)",
          border: `1px solid ${BORDER}`, borderRadius: 8,
          padding: "7px 10px", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: currentWorkspace.accentColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          ...GM, fontSize: 10, color: "white", fontWeight: 700, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentWorkspace.name}
          </p>
          <p style={{ color: "#475569", ...GM, fontSize: 9, margin: 0 }}>{planLabel}</p>
        </div>
        <ChevronDown size={12} style={{ color: "#475569", flexShrink: 0, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} aria-hidden />
      </button>

      {open && (
        <WorkspaceMenu
          workspaces={workspaces}
          currentId={currentWorkspace.id}
          onSelect={(id) => { switchWorkspace(id); setOpen(false); triggerRef.current?.focus(); }}
          onClose={() => { setOpen(false); triggerRef.current?.focus(); }}
          ref={menuRef}
          style={{ top: "calc(100% + 4px)", left: 0, right: 0 }}
        />
      )}
    </div>
  );
}

// ── Workspace menu panel ──────────────────────────────────────────────────────

import { forwardRef } from "react";
import { Z } from "../../utils/z-index";

interface WorkspaceMenuProps {
  workspaces: ReturnType<typeof usePlatform>["workspaces"];
  currentId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

const WorkspaceMenu = forwardRef<HTMLDivElement, WorkspaceMenuProps>(
  ({ workspaces, currentId, onSelect, style }, ref) => (
    <div
      ref={ref}
      role="listbox"
      aria-label="Select workspace"
      style={{
        position: "absolute",
        zIndex: Z.dropdown,
        background: "#0B1929",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "6px 6px",
        minWidth: 220,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      {workspaces.map((ws) => {
        const isCurrent = ws.id === currentId;
        return (
          <button
            key={ws.id}
            role="option"
            aria-selected={isCurrent}
            onClick={() => onSelect(ws.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", border: "none", background: isCurrent ? "rgba(0,120,212,0.12)" : "transparent",
              borderRadius: 7, padding: "8px 10px", cursor: "pointer",
              textAlign: "left", color: "white",
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              background: ws.accentColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              ...GM, fontSize: 10, color: "white", fontWeight: 700, flexShrink: 0,
            }}>
              {ws.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ws.name}
              </p>
              <p style={{ ...GM, fontSize: 9, color: "#475569", margin: 0 }}>
                {PLAN_LABELS[ws.plan]} · {ws.role.replace("_", " ")}
              </p>
            </div>
            {isCurrent && <Check size={13} style={{ color: "#0078D4", flexShrink: 0 }} aria-hidden />}
          </button>
        );
      })}

      <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 4, paddingTop: 4 }}>
        <button
          style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", border: "none", background: "transparent",
            borderRadius: 7, padding: "7px 10px", cursor: "pointer",
            color: "#64748b", ...GF, fontSize: 12,
          }}
          onClick={() => {}}
          aria-label="Create or join workspace — coming in a future release"
          title="Coming in a future release"
        >
          <Plus size={13} aria-hidden />
          <span>Create or join workspace</span>
          <span style={{ ...GM, fontSize: 9, color: "#334155", marginLeft: "auto" }}>SOON</span>
        </button>
      </div>
    </div>
  )
);
WorkspaceMenu.displayName = "WorkspaceMenu";
