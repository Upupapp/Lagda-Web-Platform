// Privacy-safe development logger for the LAGDA frontend.
// Development mode only — all methods are no-ops in production-facing builds.
// NEVER log: passwords, OTPs, MFA codes, signatures, field values, card numbers,
// integration credentials, full email addresses, or personal names.

const IS_DEV = import.meta.env.DEV;

type LogLevel = "debug" | "info" | "warn" | "error";

function shouldLog(): boolean {
  return IS_DEV;
}

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Redact anything that looks like an email
    return obj.replace(/\S+@\S+\.\S+/g, "[redacted-email]");
  }
  if (typeof obj !== "object" || Array.isArray(obj)) return obj;

  const SENSITIVE_KEYS = new Set([
    "password", "otp", "code", "token", "secret", "signature", "initials",
    "card", "cardNumber", "cvv", "credential", "apiKey", "webhook",
  ]);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[redacted]" : redact(v);
  }
  return out;
}

function emit(level: LogLevel, message: string, data?: unknown): void {
  if (!shouldLog()) return;
  const prefix = `[LAGDA:${level.toUpperCase()}]`;
  const safe = data !== undefined ? redact(data) : undefined;
  if (level === "error") {
     
    console.error(prefix, message, safe ?? "");
  } else if (level === "warn") {
     
    console.warn(prefix, message, safe ?? "");
  } else {
    // eslint-disable-next-line no-console
    console.log(prefix, message, safe ?? "");
  }
}

export const log = {
  debug: (message: string, data?: unknown) => emit("debug", message, data),
  info:  (message: string, data?: unknown) => emit("info",  message, data),
  warn:  (message: string, data?: unknown) => emit("warn",  message, data),
  error: (message: string, data?: unknown) => emit("error", message, data),
};
