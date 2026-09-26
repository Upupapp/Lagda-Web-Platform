// What the workspace shell tells the section rendered inside it.
//
// Kept apart from WorkspaceShell.tsx so that file exports components only
// (Fast Refresh), and so the section pages can import this without pulling
// the shell itself in.

import { createContext, useContext } from "react";
import type { OverviewData } from "../real/overview-data";

export interface WorkspaceShellValue {
  /**
   * Real backend only: the figures the shell already loaded for its header
   * and banners. The Overview section reads these instead of asking again.
   * `null` in the demo build.
   */
  realOverview: OverviewData | null;
  /** Re-read the banner counts, e.g. after a join request was decided. */
  refreshCounts: () => void;
  /**
   * The pathname whose section heading last took focus. The shell starts it
   * at the path it opened on, so arriving on a page does not steal focus;
   * every later change of path moves focus to the new section's heading.
   */
  focusedPath: { current: string };
}

export const WorkspaceShellContext = createContext<WorkspaceShellValue | null>(null);

/** The shell around this section, or null when rendered on its own. */
export function useWorkspaceShell(): WorkspaceShellValue | null {
  return useContext(WorkspaceShellContext);
}
