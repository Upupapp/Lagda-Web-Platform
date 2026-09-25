import { describe, it, expect, vi, beforeEach } from "vitest";

const recipients = vi.hoisted(() => ({ replaceAll: vi.fn(), list: vi.fn() }));
const requests = vi.hoisted(() => ({ create: vi.fn(), markReadyToSend: vi.fn(), send: vi.fn() }));
vi.mock("../real/recipient.service", () => ({ realRecipientService: recipients }));
vi.mock("../real/signing-request.service", () => ({ realSigningRequestService: requests }));

import { resendSigningService, canResendTo } from "../real/resend-signing.service";

const person = (type: string) => ({
  recipientId: `r_${type}`, name: type, email: `${type}@x.com`, organization: "Acme", type,
  isRequired: true, orderIndex: 0, routingOrder: 2, sourceContactId: null, createdAt: "", updatedAt: "",
}) as never;

beforeEach(() => {
  vi.clearAllMocks();
  requests.create.mockResolvedValue({ signingRequestId: "sr_2", state: "draft" });
});

describe("re-send to the same participants", () => {
  it("keeps each person's role and step, and REMOVES a left-out person's fields", async () => {
    await resendSigningService.resendToSame("ws", "doc", [person("approver")]);
    expect(recipients.replaceAll).toHaveBeenCalledWith("ws", "doc", [{
      name: "approver", email: "approver@x.com", organization: "Acme",
      type: "approver", isRequired: true, routingOrder: 2,
    }], { departingFields: "remove" });
    expect(requests.send).toHaveBeenCalled();
  });

  it("will not send to nobody who can act", async () => {
    await expect(resendSigningService.resendToSame("ws", "doc", [person("viewer")])).rejects.toThrow();
    expect(recipients.replaceAll).not.toHaveBeenCalled();
    expect(canResendTo([person("carbon-copy")])).toBe(false);
  });
});
