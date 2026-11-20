# Trash, Recycle Bin and audit trail fixes — 20 November 2026

Fixes for the bugs found while recording the testers' guide on live (10 November 2026). Backend and frontend together: the backend goes first, with two database updates.

## Behavior changes

- **Recycle Bin, "Delete forever".** A request that had sent reminders could not be deleted forever (the server answered 500: the app role had no right to remove its reminder rows). Database update 133 lets the erasure remove them, behind the same erasure guard as the rest. Backend.
- **eNotary trash bin.** A notarized request whose digital certified copy was already issued counted as still open, so neither the client nor the notary could move it to the trash. An issued digital copy now ends the request; a printed copy still keeps it open until it is received. Backend.
- **The Trash button.** The server now tells the client's view whether a request can go to the trash, and the button appears on the client's history and the notary's desk only when it can, instead of showing and then answering with an error. Backend and frontend.
- **Audit trail names the member.** Events by a workspace member showed "Workspace user". Database update 134 records the member's name as it was when they acted; older events keep the old label. Backend.
- **Review step.** No longer suggests "Email Code", a sign-in method the live service does not offer (it is still shown in the demonstration build). Frontend. The Review wording itself was already corrected in the 18 November release.

## Deployment and rollback

Backend first: take a full database backup (`sudo -u postgres pg_dump lagda_prod`, with `pipefail`), deploy, apply migrations 133 and 134, restart the API and worker. Then the frontend through the usual single push to `main`.

Rollback: restore the previous Netlify deploy for the frontend; for the backend, reset to `cb3c3b0`, rebuild and restart. Migration 134 only adds a column and 133 only widens a grant, so the previous backend runs against the migrated database.
