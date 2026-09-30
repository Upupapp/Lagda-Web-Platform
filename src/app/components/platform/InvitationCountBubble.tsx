// The pop-up bubble on the Invitations navigation row: a mail icon and the
// number of invitations still waiting for an answer. Hidden at zero.
//
// It is an image with a name ("3 pending invitations"), so it becomes part of
// the link's accessible name — "Invitations, 3 pending invitations" — rather
// than a bare "3" a screen reader would read without context. White on
// #B42318 is 6.1:1.

import { Mail, FileText, Share2, UserPlus, type LucideIcon } from "lucide-react";

const GM = { fontFamily: "'Geist Mono', monospace" };

export function pendingInvitationsLabel(count: number): string {
  return `${String(count)} pending ${count === 1 ? "invitation" : "invitations"}`;
}

/**
 * The navigation rows that carry a pop-up count, each with its own icon so
 * the rows can be told apart at a glance: Invitations (mail), Documents
 * (document), Shared Documents (share) and Contacts (person).
 */
export const NAV_BUBBLES = {
  invitations: { icon: Mail, testId: "invitation-bubble", label: pendingInvitationsLabel },
  documents: { icon: FileText, testId: "documents-bubble", label: (n: number) => `${String(n)} ${n === 1 ? "document" : "documents"} to sign` },
  shared: { icon: Share2, testId: "shared-bubble", label: (n: number) => `${String(n)} pending shared ${n === 1 ? "document" : "documents"}` },
  contacts: { icon: UserPlus, testId: "contacts-bubble", label: (n: number) => `${String(n)} pending contact ${n === 1 ? "request" : "requests"}` },
} as const satisfies Record<string, { icon: LucideIcon; testId: string; label: (n: number) => string }>;

export type NavBubbleKind = keyof typeof NAV_BUBBLES;

export function InvitationCountBubble({ count, variant = "pill" }: { count: number; variant?: "pill" | "dot" }) {
  return <NavCountBubble kind="invitations" count={count} variant={variant} />;
}

export function NavCountBubble({ kind, count, variant = "pill" }: { kind: NavBubbleKind; count: number; variant?: "pill" | "dot" }) {
  if (count <= 0) return null;
  const spec = NAV_BUBBLES[kind];
  const Icon = spec.icon;
  const label = spec.label(count);
  const text = count > 99 ? "99+" : String(count);
  if (variant === "dot") {
    // Collapsed sidebar: no room for the pill, so a small numbered badge on
    // the icon's corner. The link itself carries the label in that mode.
    return (
      <span aria-hidden data-testid={`${spec.testId}-dot`} className="inv-bubble-pop" style={{
        position: "absolute", top: 1, right: 3, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999,
        background: "#B42318", color: "#FFFFFF", border: "2px solid #FFFFFF", boxSizing: "content-box",
        ...GM, fontSize: 9.5, fontWeight: 700, lineHeight: "16px", textAlign: "center",
      }}>{text}</span>
    );
  }
  return (
    <span role="img" aria-label={label} title={label} data-testid={spec.testId} className="inv-bubble-pop" style={{
      marginLeft: "auto", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4,
      background: "#B42318", color: "#FFFFFF", borderRadius: 999, padding: "2px 7px 2px 6px",
      boxShadow: "0 2px 6px -1px rgba(180,35,24,0.45)", ...GM, fontSize: 10.5, fontWeight: 700, lineHeight: "16px",
    }}>
      <Icon size={11} aria-hidden strokeWidth={2.5} />
      {text}
    </span>
  );
}

/** The pop-in keyframes; rendered once by each navigation surface. */
export const INVITATION_BUBBLE_STYLES = `
  @keyframes inv-bubble-pop { 0% { transform: scale(0.4); opacity: 0; } 70% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
  .inv-bubble-pop { animation: inv-bubble-pop 0.32s ease-out both; transform-origin: center; }
  @media (prefers-reduced-motion: reduce) { .inv-bubble-pop { animation: none; } }
`;
