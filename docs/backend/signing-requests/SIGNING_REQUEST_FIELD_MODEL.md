# Request-scoped field identity

```
PreparationField        one preparation, MUTABLE — move, resize, delete, reassign
   │ snapshot
   ▼
SigningRequestField     one request, IMMUTABLE
```

## Why a new id

The same reasoning as the recipient, and one addition: a preparation field's id
is *reused across saves*. BACKEND-30's whole-layout `PUT` deletes and re-inserts
the field set, and a client supplies the id it already holds precisely so a
moved field keeps its identity.

That is the right behaviour for an editor and the wrong basis for a signature.
"Field `pf_7`" means one rectangle today and a different one after a drag; a
signature has to be against a rectangle that cannot move.

`SigningRequestFieldId` is a distinct brand, so a function taking one will not
accept a `PreparationFieldId`.

## The assignment remapping

During creation:

1. Every preparation recipient gets a new `SigningRequestRecipientId`, and the
   pair is put in a map.
2. Every field's `recipientId` is looked up in that map.
3. A miss is `PreparationIntegrityError` — never a silently unassigned field.

The map is **local to the function**. Nothing persists it: the request rows are
authoritative, and the provenance columns may become NULL.

```
preparation_fields.recipient_id  ──map──►  signing_request_fields.request_recipient_id
        (rcp_…)                                        (srr_…)
```

## Three columns, and the middle one is the point

```sql
foreign key (workspace_id, signing_request_id, request_recipient_id)
  references signing_request_recipients
    (workspace_id, signing_request_id, request_recipient_id)
  on delete restrict
```

Tenant isolation cannot make this check. Two requests in one workspace are both
legitimately visible to RLS, so nothing about tenancy stops a field of request A
naming a recipient of request B. A two-column key would look correct and permit
exactly that.

The integration suite asserts it directly, with two requests in one workspace.

This is the same shape BACKEND-31 needed for `preparation_fields → 
preparation_recipients`, and the second time LAGDA has needed a containment
check *below* the tenant. `TENANCY_MODEL.md` states it as a general rule.

## `request_recipient_id` is NOT NULL

Unlike `preparation_fields.recipient_id`, which is nullable.

An unassigned field is a legitimate **authoring** state — the editor places a
box before deciding who fills it — and an impossible **workflow** state: nobody
could ever complete it.

The readiness gate refuses to snapshot one, and the column makes that refusal
structural rather than a rule someone must remember. This is OD-127 resolved:
readiness belongs to the send flow, and creating the request is the send flow's
first step.

## Geometry

Copied exactly. Same canonical model as preparation and sealing: normalized 0–1,
**top-left** origin, `y` to the field's **TOP** edge, **1-based** pages.

Migration 019 restates the geometry CHECKs rather than assuming them, so a
writer that skipped the domain still cannot store a rectangle that falls off the
page.

No new coordinate convention is introduced, and an existing architecture guard
fails on `bottom-left`, `pixels`, `points` or `pageIndex` anywhere in the
contract.

## Provenance

`source_preparation_field_id`, nullable, `ON DELETE SET NULL
(source_preparation_field_id)`. Not exposed on the wire, never dereferenced.

Deleting the preparation field it came from is permitted and changes nothing
about the request — proven in integration by clearing the layout and re-reading
the snapshot.

## Order

Fields are returned page, then layer, then id — the same deterministic order
preparation uses, computed in SQL. PostgreSQL guarantees nothing otherwise, and
a layout whose z-order depended on physical row order would render differently
after a vacuum.

`signing_request_fields_recipient_idx` exists for the query BACKEND-34 and
BACKEND-37 will both make — "what is this signer being asked for". Added now
because the access pattern is certain and an index is cheaper than the plan that
finds out later.
