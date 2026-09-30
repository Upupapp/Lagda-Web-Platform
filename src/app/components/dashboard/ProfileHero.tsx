// The Home header: who you are, on the banner of the workspace you are in.
//
// ── What is whose ──────────────────────────────────────────────────────────
//
// The BANNER is the current workspace's: its brand colour, its logo (or its
// initials) and its name — everything below it on Home is that workspace's
// documents, so switching workspace switches the banner with them. The
// PERSON is yours: photo, full name, display name (or title), email. The
// check mark is the one thing LAGDA can vouch for: a session exists only for
// an account whose email address was verified.
//
// ── Changing the photo from here ───────────────────────────────────────────
//
// The camera button uses the same crop-to-square PNG as My Settings › Profile
// and saves at once (there is no form to submit here). The session is re-read
// before the new photo shows, so the header, the sidebar and everyone's
// contact cards for you all change together.

import { useWorkspacePlan, useMyPlan } from "../../hooks/usePlans";
import { TierCrystal, TierPill } from "./TierBadges";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { Camera, Mail, Pencil, BadgeCheck, Loader2 } from "lucide-react";
import { usePlatform, announceProfileChanged } from "../../context/PlatformContext";
import { useWorkspaceBrandingSnapshot } from "../../hooks/workspace-branding-store";
import { realAccountSettingsService } from "../../services/real/account-settings.service";
import { avatarFileProblem, toAvatarPng } from "../../utils/avatar-image";
import { PersonAvatar, brandGradient, BrandWaves } from "../../pages/platform/contacts/contacts-ui";

function initials(name: string): string {
  return name.split(/\s+/).filter(w => /^[\p{L}\p{N}]/u.test(w)).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "W";
}

export function ProfileHero() {
  const platform = usePlatform();
  const { user, currentWorkspace, refreshSessionFromBackend } = platform;
  const workspaceId = currentWorkspace?.id ?? null;
  const saved = useWorkspaceBrandingSnapshot(workspaceId);
  // 093. Branding is paid. On a Free owner's workspace the banner is LAGDA's
  // blue with the initials, and the saved colour and logo wait for an upgrade.
  const { plan, info } = useWorkspacePlan(workspaceId);
  // 093. The PERSON's paid plan, shown on their own banner.
  const { plan: myPlan } = useMyPlan();
  const tier = myPlan !== null && myPlan.plan !== "free" ? myPlan.plan : null;
  const free = plan === "free";
  const branding = free && saved !== null ? { ...saved, primaryColor: null, logoUrl: null } : saved;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workspaceName = branding?.displayName || currentWorkspace?.name || "Your workspace";
  const fullName = user?.fullName?.trim() || user?.displayName || "Your account";
  const displayName = user?.displayName?.trim() ?? "";
  // A second line that says something new: the display name when it differs,
  // otherwise the job title.
  const secondLine = displayName !== "" && displayName !== fullName ? displayName : user?.jobTitle?.trim() ?? "";

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const problem = avatarFileProblem(file);
    if (problem !== null) { setError(problem); return; }
    setBusy(true); setError(null);
    try {
      const { base64, preview: next } = await toAvatarPng(file);
      setPreview(next);
      await realAccountSettingsService.uploadAvatar(base64);
      await refreshSessionFromBackend();
      announceProfileChanged();
      setPreview(null);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error && err.message.trim() !== "" ? err.message : "Your photo could not be saved. Please try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className={tier !== null ? "ph-card ph-card-tiered" : "ph-card"} aria-label="Your profile" data-testid="profile-hero">
      <div className="ph-band" style={{ backgroundImage: brandGradient(branding?.primaryColor ?? null) }} data-testid="profile-hero-band">
        <BrandWaves />
        {tier !== null && <span className="ph-tier"><TierCrystal tier={tier} /></span>}
        <div className="ph-brand" title={workspaceName}>
          <span className="ph-brand-name">{workspaceName}</span>
          <span className="ph-logo" data-testid="profile-hero-logo">
            {branding?.logoUrl
              ? <img src={branding.logoUrl} alt={`${workspaceName} logo`} />
              : <span aria-hidden className="ph-logo-initials">{initials(workspaceName)}</span>}
          </span>
        </div>
      </div>

      <div className="ph-body">
        <div className="ph-avatar">
          <PersonAvatar name={fullName} avatarUrl={preview ?? user?.avatarUrl} size={128} ring />
          <button type="button" className="ph-camera" onClick={() => fileRef.current?.click()} disabled={busy}
            aria-label={busy ? "Saving your photo" : "Change your photo"} data-testid="profile-hero-camera">
            {busy ? <Loader2 size={17} className="ph-spin" aria-hidden /> : <Camera size={17} aria-hidden />}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
            onChange={e => { void pick(e.target.files?.[0]); }} data-testid="profile-hero-file" />
        </div>

        <div className="ph-text">
          <h1 className="ph-name">
            <span>{fullName}</span>
            <BadgeCheck size={24} strokeWidth={2.2} className="ph-verified" aria-label="Email verified" />
            {tier !== null && <TierPill tier={tier} />}
          </h1>
          {secondLine !== "" && <p className="ph-second">{secondLine}</p>}
          {user?.email && (
            <p className="ph-email"><Mail size={16} aria-hidden /> <span>{user.email}</span></p>
          )}
          {error && <p role="alert" className="ph-error">{error}</p>}
          {free && info?.ownerIsYou && (
            <p className="ph-hint" data-testid="profile-hero-plan-hint">
              <Link to="/app/settings/plan">Add your logo and colours: Personal plan</Link>
            </p>
          )}
        </div>

        <Link to="/app/settings/profile" className="ph-edit"><Pencil size={16} aria-hidden /> Edit Profile</Link>
      </div>
      <style>{CSS}</style>
    </section>
  );
}

const CSS = `
.ph-card { background: #FFFFFF; border: 1px solid #E6EBF2; border-radius: 20px; overflow: hidden; margin: 20px 0 8px;
  box-shadow: 0 1px 2px rgba(7,17,31,0.04), 0 16px 34px -26px rgba(7,17,31,0.4); }
.ph-band { position: relative; height: 112px; overflow: hidden; }
/* Room for the tier crystal above the photo. */
.ph-card-tiered .ph-band { height: 128px; }
.ph-tier { position: absolute; top: 14px; left: 16px; z-index: 1; }
.ph-brand { position: absolute; top: 12px; right: 16px; z-index: 1; display: flex; align-items: center; gap: 10px; max-width: 60%; }
.ph-brand-name { font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 700; color: #FFFFFF; text-shadow: 0 1px 2px rgba(7,17,31,0.35);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ph-logo { width: 84px; height: 84px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.95); background: rgba(255,255,255,0.18);
  display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; box-shadow: 0 6px 16px -8px rgba(7,17,31,0.5); }
.ph-logo img { width: 100%; height: 100%; object-fit: contain; background: #FFFFFF; padding: 8px; box-sizing: border-box; }
.ph-logo-initials { font-family: 'Geist', sans-serif; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.02em; }
.ph-body { display: flex; align-items: flex-end; gap: 20px; padding: 0 24px 20px; flex-wrap: wrap; }
.ph-avatar { position: relative; margin-top: -72px; flex-shrink: 0; line-height: 0; z-index: 1; }
.ph-camera { position: absolute; right: 4px; bottom: 6px; width: 38px; height: 38px; border-radius: 50%; border: 3px solid #FFFFFF; background: #0B63D1;
  color: #FFFFFF; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(7,17,31,0.3); padding: 0; }
.ph-camera:hover:not(:disabled) { background: #0A57B8; }
.ph-camera:focus-visible { outline: 3px solid rgba(0,120,212,0.45); outline-offset: 2px; }
.ph-camera:disabled { cursor: progress; }
.ph-spin { animation: ph-spin 900ms linear infinite; }
@keyframes ph-spin { to { transform: rotate(360deg); } }
.ph-text { flex: 1 1 260px; min-width: 0; padding-top: 14px; }
.ph-name { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 0; font-family: 'Geist', sans-serif; font-size: 26px; font-weight: 800; color: #0B1F4B; line-height: 1.2; }
.ph-name > span { min-width: 0; overflow-wrap: anywhere; }
.ph-verified { flex-shrink: 0; color: #FFFFFF; fill: #2F80ED; }
.ph-second { font-family: 'Geist', sans-serif; font-size: 16px; color: #7B8BA3; margin: 4px 0 0; }
.ph-email { display: flex; align-items: center; gap: 8px; font-family: 'Geist', sans-serif; font-size: 14px; color: #64748B; margin: 8px 0 0; min-width: 0; }
.ph-email span { overflow-wrap: anywhere; }
.ph-email svg { flex-shrink: 0; }
.ph-hint { font-family: 'Geist', sans-serif; font-size: 13px; margin: 8px 0 0; }
.ph-hint a { color: #005A9E; font-weight: 600; text-decoration: none; }
.ph-hint a:hover { text-decoration: underline; }
.ph-error { font-family: 'Geist', sans-serif; font-size: 13px; color: #B91C1C; margin: 8px 0 0; }
.ph-edit { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 20px; border-radius: 12px; border: 1.5px solid #D6DEE8;
  background: #FFFFFF; color: #334155; font-family: 'Geist', sans-serif; font-size: 14.5px; font-weight: 600; text-decoration: none; white-space: nowrap;
  align-self: center; margin-left: auto; box-shadow: 0 1px 2px rgba(7,17,31,0.05); }
.ph-edit:hover { border-color: #0078D4; color: #005A9E; }
.ph-edit:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 2px; }
@media (max-width: 640px) {
  .ph-card { border-radius: 16px; margin-top: 14px; }
  .ph-band { height: 92px; }
  .ph-card-tiered .ph-band { height: 106px; }
  .ph-brand { top: 10px; right: 12px; gap: 8px; }
  .ph-tier { top: 12px; left: 12px; }
  .ph-brand-name { display: none; }
  .ph-logo { width: 58px; height: 58px; }
  .ph-logo-initials { font-size: 18px; }
  .ph-body { padding: 0 16px 16px; gap: 12px; align-items: flex-start; flex-direction: column; }
  .ph-avatar { margin-top: -56px; }
  .ph-avatar > span:first-child { width: 104px !important; height: 104px !important; }
  .ph-text { padding-top: 0; flex: 0 0 auto; width: 100%; }
  .ph-name { font-size: 22px; }
  .ph-second { font-size: 14.5px; }
  .ph-edit { width: 100%; justify-content: center; margin-left: 0; box-sizing: border-box; }
}
@media (prefers-reduced-motion: reduce) { .ph-spin { animation: none; } }
`;
