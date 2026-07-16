// LAGDA-branded Toaster wrapper using Sonner.
// Does NOT depend on next-themes. Uses a fixed light theme matching
// the LAGDA platform shell (white cards, Azure accents, Navy text).
//
// Usage: mount <BrandToaster /> once in the root (main.tsx or PlatformLayout).
// Trigger from anywhere: import { toast } from "sonner"
//
// Branded helpers (re-exported for convenience):
//   toastSuccess("Document sent")
//   toastError("Failed to save")
//   toastInfo("Changes saved")
//   toastWarning("Signing link will expire soon")

import { Toaster } from "sonner";
export type { ExternalToast } from "sonner";

export function BrandToaster() {
  return (
    <Toaster
      position="bottom-right"
      expand={false}
      richColors={false}
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          fontFamily: "'Geist', sans-serif",
          fontSize: 14,
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.09)",
          boxShadow: "0 4px 16px rgba(7,17,31,0.10), 0 1px 4px rgba(7,17,31,0.05)",
          color: "#07111F",
          background: "#ffffff",
          padding: "12px 14px",
          gap: 10,
        },
        classNames: {
          toast: "lagda-toast",
          title: "lagda-toast-title",
          description: "lagda-toast-desc",
          actionButton: "lagda-toast-action",
          cancelButton: "lagda-toast-cancel",
          closeButton: "lagda-toast-close",
        },
      }}
    />
  );
}

// ── Typed toast helpers ───────────────────────────────────────────────────────
import { toast } from "sonner";

export function toastSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    style: {
      fontFamily: "'Geist', sans-serif",
      fontSize: 14,
      borderRadius: 10,
      border: "1px solid #86EFAC",
      background: "#DCFCE7",
      color: "#14532D",
      boxShadow: "0 4px 16px rgba(22,163,74,0.12)",
    },
  });
}

export function toastError(message: string, description?: string) {
  toast.error(message, {
    description,
    duration: 6000,
    style: {
      fontFamily: "'Geist', sans-serif",
      fontSize: 14,
      borderRadius: 10,
      border: "1px solid #FECACA",
      background: "#FEF2F2",
      color: "#7F1D1D",
      boxShadow: "0 4px 16px rgba(220,38,38,0.12)",
    },
  });
}

export function toastInfo(message: string, description?: string) {
  toast(message, {
    description,
    style: {
      fontFamily: "'Geist', sans-serif",
      fontSize: 14,
      borderRadius: 10,
      border: "1px solid #BAE0FA",
      background: "#EAF6FF",
      color: "#0A4A7A",
      boxShadow: "0 4px 16px rgba(0,120,212,0.10)",
    },
  });
}

export function toastWarning(message: string, description?: string) {
  toast.warning(message, {
    description,
    style: {
      fontFamily: "'Geist', sans-serif",
      fontSize: 14,
      borderRadius: 10,
      border: "1px solid #FDE68A",
      background: "#FFFBEB",
      color: "#78350F",
      boxShadow: "0 4px 16px rgba(217,119,6,0.10)",
    },
  });
}

export { toast };
