export { PlatformSidebar } from "./PlatformSidebar";
export { MobileNav } from "./MobileNav";
export { PlatformHeader } from "./PlatformHeader";
export { WorkspaceSwitcher } from "./WorkspaceSwitcher";
export { UserMenu } from "./UserMenu";
export { NotificationMenu } from "./NotificationMenu";
// CommandPalette is deliberately NOT re-exported here. It reaches the global
// search service, which indexes every domain and therefore imports the
// transaction, template, contact, workflow, collaboration and automation
// fixtures. A barrel makes that graph arrive for anyone importing anything from
// this directory. Its only consumer is PlatformHeader, which loads it lazily
// when the palette is actually opened — import it from "./CommandPalette".
export { PageHeader } from "./PageHeader";
export type { PageHeaderProps, BreadcrumbItem } from "./PageHeader";
export {
  AppContent,
  AppContentFull,
  SettingsContent,
  TwoColumnLayout,
  DashboardGrid,
  StatCard,
  EmptyStateLayout,
  SkeletonBlock,
  SKELETON_STYLE,
  FormCard,
  FormCardHeading,
  FormCardDivider,
  FormField,
} from "./AppContentLayout";
export { ConfirmDialog, useConfirm } from "./ConfirmDialog";
export type { ConfirmRequest } from "./ConfirmDialog";
export { CapabilityUnavailable, CapabilityGuard } from "./CapabilityUnavailable";
export { PageError, SectionError } from "./PageError";
