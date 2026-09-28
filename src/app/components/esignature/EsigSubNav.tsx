import { useLocation } from "react-router";
import {
  LayoutDashboard, Workflow, ShieldCheck, Sparkles, Palette, Building2, FileText,
  type LucideIcon,
} from "lucide-react";
import { ESIG_SUBNAV } from "../../pages/public/esignature/content";
import { SectionTabs } from "../public/SectionTabs";

const ICONS: Record<string, LucideIcon> = {
  "/esignature": LayoutDashboard,
  "/esignature/core-workflow": Workflow,
  "/esignature/verification-and-audit": ShieldCheck,
  "/esignature/advanced-capabilities": Sparkles,
  "/esignature/templates-and-branding": Palette,
  "/esignature/team-and-enterprise": Building2,
};

export function EsigSubNav() {
  const { pathname } = useLocation();

  // Active match: exact for overview, startsWith for subroutes
  const isActive = (path: string) => {
    if (path === "/esignature") return pathname === "/esignature" || pathname === "/esignature/";
    return pathname.startsWith(path);
  };

  return (
    <SectionTabs
      label="eSignature pages"
      tabs={ESIG_SUBNAV.map((item) => ({
        key: item.path,
        label: item.label,
        to: item.path,
        icon: ICONS[item.path] ?? FileText,
        active: isActive(item.path),
      }))}
    />
  );
}
