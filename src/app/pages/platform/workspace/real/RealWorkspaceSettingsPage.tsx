// /app/workspace/settings with a real backend.
//
// The backend stores exactly one editable workspace setting today: the
// name (PATCH /workspaces/:id, 1–200 characters, owners and administrators).
// Only that is shown. No slug, billing email, default role, MFA or session
// toggles — the backend keeps none of them, and a switch that saves nowhere
// would mislead the person using it.

import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { usePlatform } from "../../../../context/PlatformContext";
import { useWorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { realWorkspaceService } from "../../../../services/real/workspace.service";
import { buttonStyle, inputStyle, labelStyle, hintStyle } from "../join/join-styles";
import { ErrorNote } from "../join/join-ui";
import { ManagePage, GF, GM, NAVY, AZURE, SLATE, SILVER } from "./manage-ui";
import { cardStyle, sectionHeadingStyle } from "./manage-styles";
import { errorMessage, formatDate } from "./manage-format";

const WORKSPACE_NAME_MAX = 200;
const CRUMBS = [{ label: "Manage", to: "/app/workspace" }, { label: "Workspace settings" }];

export function RealWorkspaceSettingsPage({ workspaceId }: { workspaceId: string }) {
  const platform = usePlatform();
  const access = useWorkspaceAccess();
  const canEdit = access.can("workspace.update");
  const sessionName = platform.currentWorkspace?.name ?? "";
  const [saved, setSaved] = useState<{ name: string; createdAt: number | null }>({ name: sessionName, createdAt: null });
  const [name, setName] = useState(sessionName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    realWorkspaceService.get(workspaceId)
      .then(ws => {
        if (cancelled) return;
        setSaved({ name: ws.name, createdAt: ws.createdAt });
        setName(ws.name);
      })
      .catch(() => { /* the session's name stands in */ });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const trimmed = name.trim();
  const dirty = trimmed !== saved.name;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (trimmed === "") { setError("Enter a name for the workspace."); return; }
    if (trimmed.length > WORKSPACE_NAME_MAX) { setError(`Keep the name under ${String(WORKSPACE_NAME_MAX)} characters.`); return; }
    setBusy(true);
    setError(null);
    try {
      const result = await realWorkspaceService.rename(workspaceId, trimmed);
      setSaved(s => ({ ...s, name: result.name }));
      setName(result.name);
      platform.applyWorkspaceRename(workspaceId, result.name);
      setStatus("Workspace name saved.");
    } catch (err) {
      setError(errorMessage(err, "We couldn't rename the workspace. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ManagePage crumbs={CRUMBS} title="Workspace settings" maxWidth={700}>
      <section aria-labelledby="identity-heading" style={{ ...cardStyle, padding: "20px 24px" }}>
        <h2 id="identity-heading" style={sectionHeadingStyle}>Workspace name</h2>
        {canEdit ? (
          <form onSubmit={e => void submit(e)} noValidate>
            {error && <ErrorNote>{error}</ErrorNote>}
            <label htmlFor="workspace-name" style={labelStyle}>Name</label>
            <input id="workspace-name" value={name} maxLength={WORKSPACE_NAME_MAX}
              onChange={e => { setName(e.target.value); setStatus(null); }}
              aria-invalid={error !== null} style={inputStyle(error !== null)} />
            <p style={hintStyle}>Shown to everyone in the workspace, and in the emails people receive from it.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              <button type="submit" disabled={!dirty || busy} style={buttonStyle("primary", !dirty || busy)}>
                {busy ? "Saving…" : "Save name"}
              </button>
              {status && <span role="status" style={{ ...GF, fontSize: 13, color: "#15803D" }}>{status}</span>}
            </div>
          </form>
        ) : (
          <>
            <p data-testid="workspace-name-readonly" style={{ ...GF, fontSize: 15, fontWeight: 600, color: NAVY, margin: 0, overflowWrap: "anywhere" }}>{saved.name}</p>
            <p style={hintStyle}>Only the workspace's owner and administrators can rename it.</p>
          </>
        )}
        {saved.createdAt !== null && (
          <p style={{ ...GM, fontSize: 11, color: SILVER, margin: "16px 0 0" }}>Created {formatDate(saved.createdAt)}</p>
        )}
      </section>

      {canEdit && (
        <section style={{ ...cardStyle, padding: "16px 24px", marginTop: 16 }}>
          <h2 style={sectionHeadingStyle}>Elsewhere</h2>
          <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0, lineHeight: 1.7 }}>
            How documents and emails look: <Link to="/app/settings/branding" style={{ color: AZURE, fontWeight: 600, textDecoration: "none" }}>Logo &amp; colours</Link>.
            {" "}Who can do what: <Link to="/app/workspace/roles" style={{ color: AZURE, fontWeight: 600, textDecoration: "none" }}>Roles</Link>.
          </p>
        </section>
      )}
    </ManagePage>
  );
}
