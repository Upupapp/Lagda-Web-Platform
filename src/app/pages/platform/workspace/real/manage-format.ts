// Date formatting shared by the Manage pages' real-backend views.

import { ApiError } from "../../../../services/api-client";

export function formatDate(ms: number | string | null | undefined): string {
  if (ms === null || ms === undefined || ms === "") return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

/** A failed request's message when the backend gave a readable one. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status !== 0 && err.status < 500 && err.message.trim() !== "") return err.message;
  return fallback;
}
