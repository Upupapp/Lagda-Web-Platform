// The profile, carried on the session (072): every page that shows the
// signed-in person reads it from ONE place, so a saved change shows up
// everywhere — including the photo, which is a versioned URL.

vi.mock("../../backend-flag", () => ({ API_BASE_URL: "/api", USE_REAL_BACKEND: true }));

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { buildRealUser } from "../session-bootstrap";
import { UserAvatar } from "../../../components/platform/UserAvatar";
import type { MeProfile } from "../auth.service";

const me = (over: Partial<MeProfile> = {}): MeProfile => ({
  userId: "usr_1", email: "ana@example.test", emailVerified: true,
  profile: {
    fullName: "Ana Reyes", displayName: "Ana", jobTitle: "Counsel",
    department: "Legal", preferredSenderName: "Ana R. (Legal)",
  },
  avatar: null, createdAt: "2026-09-25T00:00:00Z",
  ...over,
});

describe("buildRealUser", () => {
  it("carries every profile field the app renders", () => {
    const user = buildRealUser(me());
    expect(user).toMatchObject({
      displayName: "Ana", fullName: "Ana Reyes", jobTitle: "Counsel",
      department: "Legal", preferredSenderName: "Ana R. (Legal)",
    });
    expect(user.avatarUrl).toBeUndefined();
  });

  it("versions the photo URL, so a new photo is a new URL", () => {
    const a = buildRealUser(me({ avatar: { version: "aaa" } })).avatarUrl;
    const b = buildRealUser(me({ avatar: { version: "bbb" } })).avatarUrl;
    expect(a).toBe("/api/me/avatar?v=aaa");
    expect(a).not.toBe(b);
  });

  it("never leaves the sender name blank", () => {
    const user = buildRealUser(me({
      profile: { ...me().profile, preferredSenderName: null },
    }));
    expect(user.preferredSenderName).toBe("Ana Reyes");
  });
});

describe("UserAvatar", () => {
  it("shows the photo when there is one", () => {
    const { container } = render(
      <UserAvatar user={{ displayName: "Ana Reyes", avatarUrl: "/api/me/avatar?v=a" }} size={30} fontSize={11} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/me/avatar?v=a");
  });

  it("shows initials otherwise", () => {
    render(<UserAvatar user={{ displayName: "Ana Reyes" }} size={30} fontSize={11} />);
    expect(screen.getByText("AR")).toBeTruthy();
  });
});
