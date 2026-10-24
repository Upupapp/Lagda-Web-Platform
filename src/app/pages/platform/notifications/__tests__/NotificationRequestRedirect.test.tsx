// 131. An emailed eNotary notice to a notary leads to /app/notifications/request/<type>/<request>: the newest notice of
// that type about that request opens, with its two ways forward; with none, the desk opens filtered to the request.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

const list = vi.fn();
vi.mock("../../../../services/real/notification-feed.service", async (original) => ({
  ...(await original<typeof import("../../../../services/real/notification-feed.service")>()),
  realNotificationFeedService: { list: (...a: unknown[]) => list(...a) as unknown },
}));

import { NotificationRequestRedirect } from "../NotificationRequestRedirect";

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}
const notice = (id: string, type: string, requestId: string, createdAt: string) => ({ id, notificationType: type, enotaryRequestId: requestId, createdAt });

const open = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/app/notifications/request/:type/:requestId" element={<NotificationRequestRedirect />} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => { list.mockReset(); });

describe("an emailed notice to a notary", () => {
  it("opens the newest notice of that type about that request", async () => {
    list.mockResolvedValue([
      notice("ntf_old", "ENOTARY_SESSION_REOPEN_REQUESTED", "eni_1", "2026-10-22T03:00:00.000Z"),
      notice("ntf_new", "ENOTARY_SESSION_REOPEN_REQUESTED", "eni_1", "2026-10-24T04:46:00.000Z"),
      notice("ntf_other", "ENOTARY_SESSION_REOPEN_REQUESTED", "eni_2", "2026-10-24T05:00:00.000Z"),
      notice("ntf_kind", "ENOTARY_CTC_REQUESTED", "eni_1", "2026-10-24T06:00:00.000Z"),
    ]);
    open("/app/notifications/request/ENOTARY_SESSION_REOPEN_REQUESTED/eni_1");
    expect(await screen.findByTestId("where")).toHaveTextContent("/app/notifications/ntf_new");
  });

  it("opens the desk filtered to the request when the notice is not found, or the feed cannot be read", async () => {
    list.mockResolvedValue([]);
    const view = open("/app/notifications/request/ENOTARY_CTC_REQUESTED/eni_9");
    expect(await screen.findByTestId("where")).toHaveTextContent("/app/enotary/desk?request=eni_9");
    view.unmount();
    list.mockRejectedValue(new Error("offline"));
    open("/app/notifications/request/ENOTARY_CTC_REQUESTED/eni_9");
    expect(await screen.findByTestId("where")).toHaveTextContent("/app/enotary/desk?request=eni_9");
  });
});
