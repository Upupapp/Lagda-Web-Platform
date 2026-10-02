// Messages from the public website (backend 095).
//
//   POST /public/inquiries              a demo request, contact message or
//                                       eNotary waitlist sign-up — no account
//   GET  /public-inquiries[?kind=]      the inbox (the LAGDA owner's account only)
//   GET  /public-inquiries/:inquiryId   one message
//
// The server stores the message and tells the LAGDA owner. To any other
// account the two reads answer "not found".

import { apiRequest } from "../api-client";

export type InquiryKind = "demo" | "contact" | "waitlist";

export interface InquiryInput {
  kind: InquiryKind;
  name: string;
  email: string;
  organization?: string;
  role?: string;
  organizationSize?: string;
  industry?: string;
  phone?: string;
  /** Demo: the interest. Contact: the category. Waitlist: who is asking. */
  topic?: string;
  subject?: string;
  message?: string;
  consent: true;
}

export interface InquiryReceipt {
  inquiryId: string;
  kind: InquiryKind;
  receivedAt: string;
}

export interface Inquiry {
  inquiryId: string;
  kind: InquiryKind;
  kindLabel: string;
  name: string;
  email: string;
  organization: string | null;
  role: string | null;
  organizationSize: string | null;
  industry: string | null;
  phone: string | null;
  topic: string | null;
  subject: string | null;
  message: string | null;
  createdAt: string;
}

export interface InquiryInbox {
  inquiries: Inquiry[];
  counts: Record<InquiryKind, number>;
}

/** Empty optional fields are left out: the server's body is closed and bounded. */
function compact(input: InquiryInput): InquiryInput {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "") out[key] = trimmed;
    } else {
      out[key] = value;
    }
  }
  return out as unknown as InquiryInput;
}

export const publicInquiriesService = {
  submit(input: InquiryInput): Promise<InquiryReceipt> {
    return apiRequest<InquiryReceipt>("/public/inquiries", { method: "POST", body: compact(input) });
  },
  inbox(kind?: InquiryKind): Promise<InquiryInbox> {
    return apiRequest<InquiryInbox>(`/public-inquiries${kind === undefined ? "" : `?kind=${kind}`}`);
  },
  one(inquiryId: string): Promise<Inquiry> {
    return apiRequest<Inquiry>(`/public-inquiries/${encodeURIComponent(inquiryId)}`);
  },
};

/** What a form shows when the server refuses or cannot be reached. */
export function inquiryErrorMessage(error: unknown): string {
  const status = typeof error === "object" && error !== null && "status" in error ? (error).status : null;
  if (status === 429) return "Too many messages were sent from this connection. Please try again in an hour.";
  if (status === 422 || status === 400) {
    const message = error instanceof Error ? error.message : "";
    return message !== "" ? message : "Some of what you entered was not accepted. Check it and try again.";
  }
  return "Your message could not be sent. Check your connection and try again.";
}
