// Real account-settings service — the profile half of `/me`.
//
// ── Why this adapts rather than replaces ──────────────────────────────────
//
// `UserProfile` (models/settings) was shaped by the mock, and carries fields
// the backend has no concept of: `timezone`, `locale`, `language`, `initials`,
// `demonstrationOnly`. The settings UI reads all of them.
//
// Replacing the model would mean touching every settings page at once. So this
// adapts `/me` into that shape and is explicit about which fields are real,
// because a field that silently reads as an empty string looks identical to a
// field the user cleared — and one of those is a bug.
//
// ── What is actually persisted ────────────────────────────────────────────
//
// Real, round-tripped through PATCH /me/profile:
//   fullName, displayName, jobTitle, department, preferredSenderName
//
// PATCH /me/profile is a true PATCH: a field left out of the body is left
// alone. (It was once a full replace, so any caller sending fewer than all
// five fields cleared the rest. This page always sends all five.)
//
// Derived on read, never sent:
//   initials — computed from the display name
//
// Not read or written HERE: timezone, locale, language. The backend DOES store
// them — they are preferences, served under `/me`'s `preferences` block and
// written by PATCH /me/preferences — but the Preferences page is not wired to
// the backend yet. They are surfaced as neutral values rather than invented.

import { apiRequest } from "../api-client";
import type { MeProfile } from "./auth.service";
import type { UserProfile, UserProfileId } from "../../models/settings";

/**
 * Initials for the avatar.
 *
 * First letter of the first and last words, which is what the rest of the
 * product shows. Falls back to the email's first character rather than
 * rendering an empty circle, and never returns more than two characters.
 */
function initialsFrom(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  const first = words[0];
  if (first === undefined) return (email.trim()[0] ?? "?").toUpperCase();
  const last = words[words.length - 1];
  if (last === undefined || words.length === 1) {
    return (first[0] ?? "?").toUpperCase();
  }
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function toUserProfile(me: MeProfile): UserProfile {
  const displayName = me.profile.displayName;
  return {
    id: me.userId as UserProfileId,
    // `fullName` is nullable on the backend and required by the UI model.
    // Falling back to the display name keeps the field populated with
    // something true rather than blank.
    fullName: me.profile.fullName ?? displayName,
    displayName,
    email: me.email,
    jobTitle: me.profile.jobTitle ?? "",
    department: me.profile.department ?? "",
    initials: initialsFrom(me.profile.fullName ?? displayName, me.email),
    preferredSenderName: me.profile.preferredSenderName ?? displayName,
    // Preferences, not profile — see the header. Neutral defaults so the
    // settings UI renders, and deliberately not editable through here.
    timezone: "",
    locale: "",
    language: "",
    // The shared `UserProfile` type requires the literal. This record is NOT
    // a demonstration — it is the account's own data, read from `/me` — and
    // nothing reads the flag for a profile.
    demonstrationOnly: true,
  };
}

export interface ProfileUpdate {
  readonly fullName?: string;
  readonly displayName?: string;
  readonly jobTitle?: string;
  readonly department?: string;
  readonly preferredSenderName?: string;
}

class RealAccountSettingsService {
  async getUserProfile(): Promise<UserProfile> {
    return toUserProfile(await apiRequest<MeProfile>("/me"));
  }

  /**
   * PATCH returns the updated user, so the caller renders what was actually
   * stored rather than what it hoped would be. If the backend normalises a
   * value — trimming, defaulting a blank display name — the UI shows the
   * normalised result immediately instead of drifting until the next reload.
   */
  async updateUserProfile(update: ProfileUpdate): Promise<UserProfile> {
    return toUserProfile(await apiRequest<MeProfile>("/me/profile", {
      method: "PATCH",
      body: update,
    }));
  }
}

export const realAccountSettingsService = new RealAccountSettingsService();
