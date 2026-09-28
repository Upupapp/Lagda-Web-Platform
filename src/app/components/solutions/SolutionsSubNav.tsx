import { useLocation } from "react-router";
import {
  Scale, Gavel, Briefcase, UserPlus, Banknote, PackageCheck, House, Landmark,
  GraduationCap, HeartPulse, Layers,
  type LucideIcon,
} from "lucide-react";
import { SOLUTIONS_NAV } from "../../pages/public/solutions/content";
import { SectionTabs } from "../public/SectionTabs";

const GROUPS = ["Legal", "Business", "Property & Services", "Public & Institutional"] as const;
const GROUP_COLORS: Record<string, string> = {
  "Legal": "#0284C7",
  "Business": "#0078D4",
  "Property & Services": "#16A34A",
  "Public & Institutional": "#7C3AED",
};

const ICONS: Record<string, LucideIcon> = {
  "/solutions/lawyers": Scale,
  "/solutions/law-firms": Gavel,
  "/solutions/business-teams": Briefcase,
  "/solutions/hr-and-recruitment": UserPlus,
  "/solutions/finance": Banknote,
  "/solutions/procurement": PackageCheck,
  "/solutions/real-estate": House,
  "/solutions/government-and-lgu": Landmark,
  "/solutions/education": GraduationCap,
  "/solutions/healthcare-and-wellness": HeartPulse,
};

export function SolutionsSubNav() {
  const { pathname } = useLocation();

  // Grouped order: Legal → Business → Property & Services → Public & Institutional.
  const items = GROUPS.flatMap((group) => SOLUTIONS_NAV.filter((n) => n.group === group));

  return (
    <SectionTabs
      label="Solutions navigation"
      groupColors={GROUP_COLORS}
      tabs={items.map((item) => ({
        key: item.path,
        label: item.label,
        to: item.path,
        group: item.group,
        icon: ICONS[item.path] ?? Layers,
        active: pathname === item.path || pathname.startsWith(item.path + "/"),
      }))}
    />
  );
}

export function SolPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SolutionsSubNav />
      {children}
    </>
  );
}
