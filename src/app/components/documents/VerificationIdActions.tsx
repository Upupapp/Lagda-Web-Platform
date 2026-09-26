import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Copy, Check, ShieldCheck } from "lucide-react";

/**
 * A completed document's Verification ID, with Copy and Verify actions.
 *
 * `id` null or empty renders a dash, so every row in a column reads the same.
 * The "Copied" announcement goes through an aria-live region, so a screen
 * reader hears the result of a control whose visible change is only an icon.
 */
export function VerificationIdActions({
  id, variant = "cell", label,
}: {
  id: string | null | undefined;
  variant?: "cell" | "line";
  /** Optional visible caption before the id (the phone and tablet lines). */
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!id) {
    return (
      <span aria-label="No Verification ID" style={{ fontSize: 12, color: "#94A3B8" }}>—</span>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const btn: React.CSSProperties = {
    width: 24, height: 24, flexShrink: 0, display: "inline-flex", alignItems: "center",
    justifyContent: "center", border: "1px solid #E2E8F0", borderRadius: 5,
    background: "#FFFFFF", color: "#64748B", cursor: "pointer", padding: 0,
  };

  return (
    <span
      className={`doc-vid doc-vid-${variant}`}
      style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, maxWidth: "100%", flexWrap: "wrap", rowGap: 4 }}
    >
      {label && (
        <span style={{ fontSize: 11, color: "#94A3B8", flexShrink: 0, fontFamily: "'Geist', sans-serif" }}>{label}</span>
      )}
      <code
        title={id}
        style={{
          fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: 11, color: "#07111F",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
          maxWidth: "100%", flexShrink: 0,
        }}
      >
        {id}
      </code>
      <span style={{ display: "inline-flex", gap: 4, flexShrink: 0 }}>
        <button type="button" aria-label="Copy Verification ID" title="Copy Verification ID" onClick={() => { void copy(); }} style={btn}>
          {copied ? <Check size={12} aria-hidden color="#15803D" /> : <Copy size={12} aria-hidden />}
        </button>
        <Link
          to={`/app/verify/${encodeURIComponent(id)}`}
          aria-label="Verify document"
          title="Verify document"
          style={{ ...btn, textDecoration: "none" }}
        >
          <ShieldCheck size={12} aria-hidden />
        </Link>
      </span>
      <span aria-live="polite" style={{ fontSize: 11, color: "#15803D", fontFamily: "'Geist', sans-serif", ...(copied ? {} : { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }) }}>
        {copied ? "Copied" : ""}
      </span>
    </span>
  );
}
