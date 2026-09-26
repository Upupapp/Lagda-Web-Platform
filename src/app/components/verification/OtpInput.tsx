// Six single-digit boxes for an emailed access code. Paste fills every box,
// typing auto-advances, Backspace on an empty box steps back. Numeric
// keyboards on mobile via inputMode; one-time-code autofill on the first box.

import { useRef } from "react";

const LENGTH = 6;

export interface OtpInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** Accessible name for the group, e.g. "Verification code". */
  readonly label: string;
  readonly describedBy?: string;
  readonly autoFocus?: boolean;
  readonly onComplete?: (value: string) => void;
}

export function OtpInput({ value, onChange, disabled, invalid, label, describedBy, autoFocus, onComplete }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  function focusBox(index: number) {
    const target = refs.current[Math.max(0, Math.min(LENGTH - 1, index))];
    target?.focus();
    target?.select();
  }

  function commit(next: string[]) {
    const joined = next.join("").slice(0, LENGTH);
    onChange(joined);
    if (joined.length === LENGTH && !joined.includes(" ") && onComplete) onComplete(joined);
  }

  function fillFrom(index: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) return;
    const next = [...digits];
    let cursor = index;
    for (const ch of incoming) {
      if (cursor >= LENGTH) break;
      next[cursor] = ch;
      cursor += 1;
    }
    // Keep the value contiguous: a gap would make "123 56" look complete.
    const firstGap = next.findIndex((d) => d === "");
    const compact = firstGap === -1 ? next : next.slice(0, firstGap);
    commit(compact);
    focusBox(Math.min(cursor, LENGTH - 1));
  }

  return (
    <div role="group" aria-label={label} aria-describedby={describedBy}
      style={{ display: "flex", gap: "clamp(4px, 1.6vw, 10px)", flexWrap: "nowrap", maxWidth: "100%" }}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={LENGTH}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={digit}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const raw = e.currentTarget.value;
            if (raw === "") {
              const next = [...digits];
              next[i] = "";
              commit(next.slice(0, i));
              return;
            }
            // The box may now hold its old digit plus the new one; take what was typed.
            const typed = raw.length > 1 && digit !== "" ? raw.replace(digit, "") || raw : raw;
            fillFrom(i, typed);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && digit === "" && i > 0) {
              e.preventDefault();
              commit(digits.slice(0, i - 1));
              focusBox(i - 1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault(); focusBox(i - 1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault(); focusBox(i + 1);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            fillFrom(i, e.clipboardData.getData("text"));
          }}
          style={{
            width: "clamp(36px, 11vw, 48px)", height: "clamp(44px, 12vw, 54px)", minWidth: 0,
            boxSizing: "border-box", textAlign: "center",
            fontFamily: "'Geist Mono', monospace", fontSize: 22, fontWeight: 600, color: "#07111F",
            background: disabled ? "#F1F5F9" : "#FFFFFF",
            border: `1px solid ${invalid ? "rgba(220,38,38,0.55)" : "rgba(0,0,0,0.18)"}`,
            borderRadius: 8, outlineOffset: 2,
          }}
        />
      ))}
    </div>
  );
}
