// In-App Notifications and Alerts Center — detail page.
// Route: /app/notifications/:notificationId
// Command 28. Frontend demonstration only. No real delivery, persistence, or sync.

import { useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  ArrowLeft, Bell, AlertCircle, FileText, ShieldAlert,
  CreditCard, BarChart2, Puzzle, Settings, Megaphone, Inbox,
  CheckCheck, EyeOff, X, RotateCcw, ChevronRight, Info,
} from "lucide-react";
import { useNotificationCenter } from "../../../context/NotificationCenterContext";
import type { NotificationRecord, NotificationCategory } from "../../../models/notifications";
import { NOTIFICATION_CATEGORY_LABELS } from "../../../models/notifications";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const GREEN = "#16A34A";
const RED   = "#DC2626";
const AMBER = "#D97706";

function severityColor(s: NotificationRecord["severity"]): string {
  switch (s) {
    case "critical": return RED;
    case "warning":  return AMBER;
    case "success":  return GREEN;
    default:         return AZURE;
  }
}

function severityLabel(s: NotificationRecord["severity"]): string {
  switch (s) {
    case "critical": return "Critical";
    case "warning":  return "Warning";
    case "success":  return "Resolved";
    default:         return "Informational";
  }
}

function priorityLabel(p: NotificationRecord["priority"]): string {
  switch (p) {
    case "high":   return "High Priority";
    case "normal": return "Normal";
    case "low":    return "Low Priority";
  }
}

function deliveryClassLabel(d: NotificationRecord["deliveryClass"]): string {
  switch (d) {
    case "in-app-only":      return "In-app only";
    case "email-and-in-app": return "Email + In-app";
    case "sms-and-in-app":   return "SMS + In-app";
    case "all-channels":     return "All channels";
  }
}

function deliveryClassDescription(d: NotificationRecord["deliveryClass"]): string {
  switch (d) {
    case "in-app-only":
      return "This notification type is configured to appear in your LAGDA Notifications Center only. No email or SMS is sent for this category.";
    case "email-and-in-app":
      return "This notification type is configured for both in-app delivery and email. Email delivery is subject to your notification preferences and email deliverability.";
    case "sms-and-in-app":
      return "This notification type is configured for both in-app delivery and SMS. SMS delivery is subject to your notification preferences and carrier availability.";
    case "all-channels":
      return "This notification type is configured for all available delivery channels — in-app, email, and SMS — based on your notification preferences.";
  }
}

function getCategoryIcon(cat: NotificationCategory, severity: NotificationRecord["severity"]) {
  const color = severityColor(severity);
  const s = 20;
  switch (cat) {
    case "my-actions":   return <Inbox size={s} style={{ color }} aria-hidden />;
    case "documents":    return <FileText size={s} style={{ color }} aria-hidden />;
    case "workspace":    return <Settings size={s} style={{ color: SLATE }} aria-hidden />;
    case "security":     return <ShieldAlert size={s} style={{ color }} aria-hidden />;
    case "billing":      return <CreditCard size={s} style={{ color }} aria-hidden />;
    case "usage":        return <BarChart2 size={s} style={{ color }} aria-hidden />;
    case "integrations": return <Puzzle size={s} style={{ color: SLATE }} aria-hidden />;
    case "system":       return <Settings size={s} style={{ color: SLATE }} aria-hidden />;
    case "promotional":  return <Megaphone size={s} style={{ color: SLATE }} aria-hidden />;
    default:             return <Bell size={s} style={{ color: SLATE }} aria-hidden />;
  }
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

// ── Not-found state ───────────────────────────────────────────────────────────
function NotifNotFound() {
  return (
    <div style={{ maxWidth: 540, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
      <Bell size={36} style={{ color: "#CBD5E1", marginBottom: 16 }} aria-hidden />
      <h1 style={{ ...GF, fontSize: 18, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>
        Notification not found
      </h1>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 20px" }}>
        This notification may have been removed or the link may be incorrect. Notification links do not grant access to any underlying resource.
      </p>
      <Link
        to="/app/notifications"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, ...GF, fontSize: 13, color: AZURE, textDecoration: "none" }}
      >
        <ArrowLeft size={14} aria-hidden />
        Back to Notifications
      </Link>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function NotificationDetailPage() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const { items, markRead, markUnread, dismiss, restore } = useNotificationCenter();

  const notification = items.find((n) => n.id === notificationId);

  // Mark as read on mount
  useEffect(() => {
    if (notification && notification.status === "unread") {
      markRead(notification.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.id]);

  if (!notification) return <NotifNotFound />;

  const n            = notification;
  const severityCol  = severityColor(n.severity);
  const isDismissed  = n.status === "dismissed";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 48px" }}>
      {/* Back */}
      <div style={{ padding: "20px 0 0" }}>
        <Link
          to="/app/notifications"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, ...GF, fontSize: 13, color: SLATE, textDecoration: "none" }}
          className="notif-detail-back"
        >
          <ArrowLeft size={14} aria-hidden />
          Back to Notifications
        </Link>
      </div>

      {/* Demo notice */}
      <div
        role="note"
        aria-label="Demonstration data notice"
        style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, margin: "16px 0" }}
      >
        <AlertCircle size={13} style={{ color: SLATE, flexShrink: 0, marginTop: 1 }} aria-hidden />
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
          This notification and its read state are fictional frontend demonstration data. No notification was delivered, synchronized, or persisted.
        </p>
      </div>

      {/* Card */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        {/* Priority accent */}
        {n.priority === "high" && !isDismissed && (
          <div style={{ height: 3, background: severityCol }} aria-hidden />
        )}

        <div style={{ padding: "20px 24px" }}>
          {/* Header row */}
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `${severityCol}14`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {getCategoryIcon(n.category, n.severity)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ ...GF, fontSize: 17, fontWeight: 700, color: NAVY, margin: "0 0 4px", lineHeight: 1.3 }}>
                {n.title}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ ...GF, fontSize: 11, fontWeight: 500, color: SLATE, background: "#F1F5F9", borderRadius: 4, padding: "2px 7px" }}>
                  {NOTIFICATION_CATEGORY_LABELS[n.category]}
                </span>
                <span style={{ ...GF, fontSize: 11, fontWeight: 500, color: severityCol, background: `${severityCol}12`, borderRadius: 4, padding: "2px 7px" }}>
                  {severityLabel(n.severity)}
                </span>
                <span style={{ ...GF, fontSize: 11, color: SILVER }}>
                  {priorityLabel(n.priority)}
                </span>
                {isDismissed && (
                  <span style={{ ...GF, fontSize: 11, fontWeight: 500, color: SILVER, background: "#F1F5F9", borderRadius: 4, padding: "2px 7px" }}>
                    Dismissed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <p style={{ ...GF, fontSize: 14, color: SLATE, lineHeight: 1.6, margin: "0 0 12px" }}>
            {n.body}
          </p>

          {/* Detail body */}
          {n.detailBody && (
            <p style={{ ...GF, fontSize: 13, color: SLATE, lineHeight: 1.65, margin: "0 0 16px", padding: "12px 14px", background: "#F8FAFC", borderRadius: 8, borderLeft: `3px solid ${severityCol}` }}>
              {n.detailBody}
            </p>
          )}

          {/* Metadata */}
          <div style={{ ...GM, fontSize: 11, color: SILVER, marginBottom: 16 }}>
            Received: {formatFullDate(n.createdAt)} · Workspace: {n.workspaceName}
          </div>

          {/* Action button */}
          {n.hasAction && n.actionPath && !isDismissed && (
            <Link
              to={n.actionPath}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: AZURE, color: "white",
                ...GF, fontSize: 13, fontWeight: 600,
                padding: "9px 16px", borderRadius: 8, textDecoration: "none",
                marginBottom: 16,
              }}
              className="notif-detail-action"
            >
              {n.actionLabel ?? "View"} <ChevronRight size={14} aria-hidden />
            </Link>
          )}

          {/* Controls */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isDismissed ? (
              <button
                onClick={() => restore(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", background: "white", border: "1px solid #E2E8F0", borderRadius: 8, ...GF, fontSize: 12, color: SLATE, cursor: "pointer" }}
                className="notif-detail-ctrl"
              >
                <RotateCcw size={12} aria-hidden />
                Restore notification
              </button>
            ) : (
              <>
                <button
                  onClick={() => n.status === "unread" ? markRead(n.id) : markUnread(n.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", background: "white", border: "1px solid #E2E8F0", borderRadius: 8, ...GF, fontSize: 12, color: SLATE, cursor: "pointer" }}
                  className="notif-detail-ctrl"
                >
                  {n.status === "unread"
                    ? <><CheckCheck size={12} aria-hidden /> Mark as read</>
                    : <><EyeOff size={12} aria-hidden /> Mark as unread</>
                  }
                </button>
                {n.isDismissible && (
                  <button
                    onClick={() => dismiss(n.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", background: "white", border: "1px solid #E2E8F0", borderRadius: 8, ...GF, fontSize: 12, color: SLATE, cursor: "pointer" }}
                    className="notif-detail-ctrl"
                  >
                    <X size={12} aria-hidden /> Dismiss
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Why you received this */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 24px", marginBottom: 16 }}>
        <h2 style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
          <Info size={15} style={{ color: AZURE }} aria-hidden />
          Why you received this
        </h2>
        <p style={{ ...GF, fontSize: 13, color: SLATE, lineHeight: 1.65, margin: 0 }}>
          {n.whyReceivedReason}
        </p>
      </div>

      {/* Delivery class summary */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 24px", marginBottom: 16 }}>
        <h2 style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>
          Delivery
        </h2>
        <p style={{ ...GF, fontSize: 12, color: SILVER, margin: "0 0 10px" }}>
          Configured delivery class: <strong style={{ color: SLATE }}>{deliveryClassLabel(n.deliveryClass)}</strong>
        </p>
        <p style={{ ...GF, fontSize: 13, color: SLATE, lineHeight: 1.6, margin: 0 }}>
          {deliveryClassDescription(n.deliveryClass)}
        </p>
        <p style={{ ...GF, fontSize: 11, color: SILVER, margin: "10px 0 0", fontStyle: "italic" }}>
          This is reference information only. No delivery status is tracked in this frontend demonstration. Never assume a notification was delivered, synchronized, or received.
        </p>
      </div>

      {/* Preference link */}
      <div style={{ padding: "14px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
          To change when you receive these notifications, visit Notification Preferences.
        </p>
        <Link
          to="/app/settings/notifications"
          style={{ ...GF, fontSize: 12, color: AZURE, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
          className="notif-detail-pref"
        >
          Notification Preferences <ChevronRight size={12} aria-hidden />
        </Link>
      </div>

      <style>{`
        .notif-detail-back:hover { color: #0078D4 !important; }
        .notif-detail-back:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; border-radius: 4px; }
        .notif-detail-action:hover { background: #0065b3 !important; }
        .notif-detail-action:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .notif-detail-ctrl:hover { background: #F1F5F9 !important; }
        .notif-detail-ctrl:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .notif-detail-pref:hover { text-decoration: underline !important; }
      `}</style>
    </div>
  );
}
