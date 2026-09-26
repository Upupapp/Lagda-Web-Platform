// The branded card at the top of Manage → Overview. Built on the same
// BrandPreview the Branding settings page previews with, so what an owner
// sees here is exactly how the workspace presents itself to signers.

import type { ReactNode } from "react";
import { Link } from "react-router";
import { BrandPreview } from "../../settings/branding-preview";
import type { WorkspaceBrandingSnapshot } from "../../../../hooks/workspace-branding-store";
import { GF, GM, NAVY, AZURE, SLATE, SILVER } from "./manage-ui";

const DEFAULT_COLOR = "#0078D4";

export interface WorkspaceBrandCardProps {
  /** The latest branding, or null before it has loaded. */
  branding: WorkspaceBrandingSnapshot | null;
  /** Used until the branding has loaded. */
  fallbackName: string;
  fallbackColor?: string;
  createdAt: string | null;
  roleLabel: ReactNode;
  privilegesLine: string;
  /** Owners and administrators. */
  canEdit: boolean;
  compact: boolean;
}

function isCustomised(b: WorkspaceBrandingSnapshot | null): boolean {
  if (b === null) return true; // unknown yet: do not nag
  return b.primaryColor !== null || b.logoUrl !== null || Boolean(b.senderDisplayName) || Boolean(b.footerTagline);
}

function Fact({ label, children, testId }: { label: string; children: ReactNode; testId: string }) {
  return (
    <div data-testid={testId} style={{ minWidth: 0, flex: "1 1 180px" }} className="brand-card-fact">
      <dt style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</dt>
      <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: "3px 0 0", fontWeight: 500, overflowWrap: "anywhere", lineHeight: 1.45 }}>{children}</dd>
    </div>
  );
}

export function WorkspaceBrandCard({
  branding, fallbackName, fallbackColor, createdAt, roleLabel, privilegesLine, canEdit, compact,
}: WorkspaceBrandCardProps) {
  const displayName = branding?.displayName || fallbackName;
  const primaryColor = branding?.primaryColor ?? fallbackColor ?? DEFAULT_COLOR;
  const sender = branding?.senderDisplayName || "Each sender's own name";
  const showPrompt = canEdit && !isCustomised(branding);

  const editLink = canEdit ? (
    <Link to="/app/settings/branding" data-testid="edit-branding-link"
      style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#FFFFFF", textDecoration: "underline", textUnderlineOffset: 3, whiteSpace: "nowrap", flexShrink: 0 }}>
      Edit branding
    </Link>
  ) : undefined;

  return (
    <section aria-label="Workspace branding" data-testid="workspace-brand-card" style={{ marginBottom: 24 }}>
      <BrandPreview
        variant="card"
        compact={compact}
        testId="brand-card"
        subtitle="Workspace overview"
        headerAside={editLink}
        branding={{
          displayName,
          primaryColor,
          logoPreviewUrl: branding?.logoUrl ?? null,
          senderDisplayName: sender,
          footerTagline: branding?.footerTagline ?? "",
        }}
      >
        <dl className={compact ? "brand-card-facts--stacked" : undefined} style={{ margin: 0, display: "flex", flexDirection: compact ? "column" : "row", flexWrap: "wrap", gap: compact ? 12 : 20 }}>
          <Fact label="Sender" testId="brand-card-sender">{sender}</Fact>
          {createdAt !== null && <Fact label="Created" testId="brand-card-created">{createdAt}</Fact>}
          <Fact label="Your role" testId="brand-card-role">
            <span>{roleLabel}</span>
            <span data-testid="your-privileges" style={{ display: "block", color: SLATE, fontSize: 12, marginTop: 2 }}>{privilegesLine}</span>
            <Link to="/app/workspace/roles" style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none", display: "inline-block", marginTop: 4 }}>
              What your role can do →
            </Link>
          </Fact>
        </dl>
        {showPrompt && (
          <p data-testid="brand-card-prompt" style={{ ...GF, fontSize: 12, color: SLATE, margin: "14px 0 0" }}>
            <Link to="/app/settings/branding" style={{ color: AZURE, fontWeight: 600, textDecoration: "none" }}>Add your logo and colours</Link>
            {" "}so signers recognise documents from this workspace.
          </p>
        )}
      </BrandPreview>
      <style>{`.brand-card-facts--stacked > .brand-card-fact { flex: 0 0 auto !important; }`}</style>
    </section>
  );
}
