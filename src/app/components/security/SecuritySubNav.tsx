import { useLocation } from "react-router";
import {
  LayoutDashboard, BadgeCheck, LockKeyhole, KeyRound, Fingerprint, ScrollText,
  FileCheck2, MapPin, Database, EyeOff, Shield,
  type LucideIcon,
} from "lucide-react";
import { SECURITY_SUBNAV } from "../../pages/public/security/content";
import { SectionTabs } from "../public/SectionTabs";

const ICONS: Record<string, LucideIcon> = {
  "/security": LayoutDashboard,
  "/security/trust-center": BadgeCheck,
  "/security/account-security": LockKeyhole,
  "/security/signer-authentication": KeyRound,
  "/security/identity-verification": Fingerprint,
  "/security/audit-trail": ScrollText,
  "/security/document-verification": FileCheck2,
  "/security/device-and-location-evidence": MapPin,
  "/security/secure-storage": Database,
  "/security/privacy-and-data-protection": EyeOff,
};

export function SecuritySubNav() {
  const { pathname } = useLocation();

  const isActive = (path: string) => {
    if (path === "/security") return pathname === "/security" || pathname === "/security/";
    return pathname.startsWith(path);
  };

  return (
    <SectionTabs
      label="Security pages"
      tabs={SECURITY_SUBNAV.map((item) => ({
        key: item.path,
        label: item.label,
        to: item.path,
        icon: ICONS[item.path] ?? Shield,
        active: isActive(item.path),
      }))}
    />
  );
}

export function SecurityPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SecuritySubNav />
      {children}
    </>
  );
}
