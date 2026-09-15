// Whether real-backend services are wired up at all. Empty/unset
// VITE_API_BASE_URL means Lagda-Backend isn't configured for this build —
// every service must fall back to its mock implementation rather than
// throwing on every request.
//
// Per-domain services check this once at module load, not per-call, so a
// domain that has been migrated behaves consistently for the whole session.
export const API_BASE_URL: string | null =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || null;

export const USE_REAL_BACKEND = API_BASE_URL !== null;
