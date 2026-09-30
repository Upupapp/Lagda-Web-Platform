// "You've used your free document" (backend 093): shown where a Free owner's
// workspace would send a second document. The owner upgrades; anyone else
// asks the owner.

import { Link } from "react-router";
import { FileLock2, ArrowRight } from "lucide-react";
import { useWorkspacePlan } from "../../hooks/usePlans";

export function FreeDocumentUsedNotice() {
  const { info } = useWorkspacePlan();
  const owner = info?.ownerIsYou ?? true;
  return (
    <div role="alert" data-testid="free-document-used" style={{
      display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 18px", borderRadius: 12,
      background: "#FFFBEB", border: "1px solid #FDE68A", marginBottom: 24, fontFamily: "'Geist', sans-serif",
    }}>
      <FileLock2 size={20} aria-hidden color="#92400E" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#92400E" }}>You&apos;ve used your free document</div>
        <p style={{ fontSize: 13, color: "#78350F", margin: "4px 0 0", lineHeight: 1.55 }}>
          {owner
            ? "Choose Personal or Business to send more. Your draft is kept, so you can send it once your plan is active."
            : "This workspace is on its owner's Free plan. Ask the owner to choose Personal or Business to send more."}
        </p>
        {owner && (
          <Link to="/app/settings/plan" data-testid="free-document-see-plans" style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, minHeight: 38, padding: "0 16px",
            borderRadius: 9, background: "#0B63D1", color: "#FFFFFF", fontWeight: 700, fontSize: 13.5, textDecoration: "none",
          }}>
            See plans <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
