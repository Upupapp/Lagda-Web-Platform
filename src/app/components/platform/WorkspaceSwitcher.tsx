// Workspace switcher — shows current workspace, allows switching between workspaces.
// Frontend-only: switching updates in-memory context state only.
//
// "Join another workspace" opens JoinWorkspaceDialog (a join link someone
// shared). Opening the menu re-reads the workspace list, so a workspace whose
// join request was approved after sign-in appears here without a reload.
// Creating a workspace from here is deliberately not offered yet.

import { useMyPlan } from "../../hooks/usePlans";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, LogIn, Lock } from "lucide-react";
import { usePlatform } from "../../context/PlatformContext";
import { PLAN_LABELS } from "../../models";
import { WorkspaceBadge } from "./WorkspaceBadge";
import { JoinWorkspaceDialog } from "./JoinWorkspaceDialog";

const GF   = { fontFamily: "'Geist', sans-serif" };
const GM   = { fontFamily: "'Geist Mono', monospace" };
const BORDER = "rgba(0,0,0,0.08)";

interface WorkspaceSwitcherProps {
  collapsed: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { currentWorkspace, workspaces, switchWorkspace, refreshWorkspaceList } = usePlatform();
  // 093. Joining another workspace is part of Personal (the person's own plan).
  const { plan: myPlan } = useMyPlan();
  const joinLocked = myPlan?.plan === "free";
  const [open, setOpen] = useState(false);
  const [joining, setJoining] = useState(false);

  // Opening the menu is when someone looks for a newly approved workspace.
  useEffect(() => {
    if (open) void refreshWorkspaceList();
    // Only on opening; the function's identity changes with the list itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startJoin = () => { setOpen(false); setJoining(true); };
  const joinDialog = joining ? <JoinWorkspaceDialog onClose={() => { setJoining(false); triggerRef.current?.focus(); }} /> : null;
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

  const planLabel = PLAN_LABELS[currentWorkspace.plan];

  if (collapsed) {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={`Current workspace: ${currentWorkspace.name}. Click to switch.`}
          aria-expanded={open}
          style={{
            width: 32, height: 32, borderRadius: 8, padding: 0,
            background: "transparent",
            border: "none", color: "white",
            ...GM, fontSize: 11, fontWeight: 700,
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <WorkspaceBadge workspace={currentWorkspace} size={32} radius={8} fontSize={11} />
        </button>
        {open && (
          <WorkspaceMenu
            workspaces={workspaces}
            currentId={currentWorkspace.id}
            onSelect={(id) => { switchWorkspace(id); setOpen(false); }}
            onClose={() => { setOpen(false); triggerRef.current?.focus(); }}
            onJoin={startJoin}
          joinLocked={joinLocked}
            ref={menuRef}
            style={{ top: 0, left: 44 }}
          />
        )}
        {joinDialog}
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
          width: "100%", background: "#F8FAFB",
          border: `1px solid ${BORDER}`, borderRadius: 8,
          padding: "7px 10px", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <WorkspaceBadge workspace={currentWorkspace} size={26} radius={6} fontSize={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#07111F", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentWorkspace.name}
          </p>
          <p style={{ color: "#64748B", ...GM, fontSize: 9, margin: 0 }}>{planLabel}</p>
        </div>
        <ChevronDown size={12} style={{ color: "#64748B", flexShrink: 0, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} aria-hidden />
      </button>

      {open && (
        <WorkspaceMenu
          workspaces={workspaces}
          currentId={currentWorkspace.id}
          onSelect={(id) => { switchWorkspace(id); setOpen(false); triggerRef.current?.focus(); }}
          onClose={() => { setOpen(false); triggerRef.current?.focus(); }}
          onJoin={startJoin}
          joinLocked={joinLocked}
          ref={menuRef}
          style={{ top: "calc(100% + 4px)", left: 0, right: 0 }}
        />
      )}
      {joinDialog}
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
  onJoin: () => void;
  /** 093. On Free: shown, but not clickable, with the plan it needs. */
  joinLocked: boolean;
  style?: React.CSSProperties;
}

const WorkspaceMenu = forwardRef<HTMLDivElement, WorkspaceMenuProps>(
  ({ workspaces, currentId, onSelect, onJoin, joinLocked, style }, ref) => (
    <div
      ref={ref}
      role="listbox"
      aria-label="Select workspace"
      style={{
        position: "absolute",
        zIndex: Z.dropdown,
        background: "#ffffff",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "6px 6px",
        minWidth: 220,
        boxShadow: "0 8px 32px rgba(7,17,31,0.16)",
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
              width: "100%", border: "none", background: isCurrent ? "#EAF6FF" : "transparent",
              borderRadius: 7, padding: "8px 10px", cursor: "pointer",
              textAlign: "left", color: "#07111F",
            }}
          >
            <WorkspaceBadge workspace={ws} size={26} radius={6} fontSize={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ws.name}
              </p>
              <p style={{ ...GM, fontSize: 9, color: "#94A3B8", margin: 0 }}>
                {PLAN_LABELS[ws.plan]} · {ws.role.replace("_", " ")}
              </p>
            </div>
            {isCurrent && <Check size={13} style={{ color: "#0078D4", flexShrink: 0 }} aria-hidden />}
          </button>
        );
      })}

      <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 4, paddingTop: 4 }}>
        <button
          type="button"
          disabled={joinLocked}
          aria-disabled={joinLocked}
          title={joinLocked ? "Joining another workspace is part of the Personal plan" : undefined}
          data-testid="workspace-menu-join"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", border: "none", background: "transparent",
            borderRadius: 7, padding: "7px 10px", cursor: joinLocked ? "not-allowed" : "pointer",
            color: joinLocked ? "#94A3B8" : "#0F172A", ...GF, fontSize: 12, fontWeight: 500, textAlign: "left", minHeight: 34,
          }}
          onClick={joinLocked ? undefined : onJoin}
        >
          {joinLocked
            ? <Lock size={13} aria-hidden style={{ color: "#B45309", flexShrink: 0 }} />
            : <LogIn size={13} aria-hidden style={{ color: "#0078D4", flexShrink: 0 }} />}
          <span style={{ flex: 1, minWidth: 0 }}>Join another workspace</span>
          {joinLocked && (
            <span data-testid="workspace-menu-join-plan" style={{ fontSize: 10, fontWeight: 700, color: "#92400E", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>
              Personal
            </span>
          )}
        </button>
      </div>
    </div>
  )
);
WorkspaceMenu.displayName = "WorkspaceMenu";
