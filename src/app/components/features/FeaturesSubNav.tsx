import { useLocation } from "react-router";
import {
  LayoutDashboard, Workflow, ShieldCheck, Zap, Users, Layers,
  type LucideIcon,
} from "lucide-react";
import { FEATURES_GROUPS } from "../../pages/public/features/content";
import { SectionTabs } from "../public/SectionTabs";

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  core: Workflow,
  trust: ShieldCheck,
  productivity: Zap,
  team: Users,
};

export function FeaturesSubNav() {
  const { pathname } = useLocation();

  const activeGroup = FEATURES_GROUPS.find((g) =>
    g.paths.some((p) => {
      if (g.groupKey === "overview") return pathname === "/features" || pathname === "/features/";
      return pathname.startsWith(p);
    })
  );

  return (
    <SectionTabs
      label="Features sections"
      tabs={FEATURES_GROUPS.map((group) => ({
        key: group.groupKey,
        label: group.label,
        to: group.linkTo,
        icon: ICONS[group.groupKey] ?? Layers,
        active: activeGroup?.groupKey === group.groupKey,
      }))}
    />
  );
}

export function FeaturesPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FeaturesSubNav />
      {children}
    </>
  );
}
