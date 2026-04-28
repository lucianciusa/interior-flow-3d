# Feature: Phase 4 — Product Hierarchy (Projects → Rooms → Layouts), Share Links, Compare, Item Swap

The following plan should be complete, but validate documentation and codebase patterns and task sanity before starting implementation.

Pay special attention to naming of existing utils, types, and models. Import from the right files. Phase 0–3 already shipped the SQL migration with `profiles`, `rooms`, `layouts` tables and RLS policies — re-read `supabase/migrations/0001_init.sql` and `backend/app/services/supabase.py` before adding any DB or REST work. Phase 4 is purely additive on existing MVP contracts: catalog and LLM are NOT touched (those are Phases 6 and 7).

Before applying migrations, **tag the `pre-v1` git ref** so the destructive wipe is reversible (locked decision, PRD §15: "Existing prod data wiped during v1 migration").

---

## Feature Description

Replace the flat MVP shape (`User → Room → Layout`) with the v1 product hierarchy: `Project → Room → Layout`. Layouts become **named sibling variants** with a designated `is_primary` per Room. Rooms belong to Projects. Add public **share links** (HMAC token + 30-day expiry, revocable) reading via a security-definer function. Add a **dashboard** at `/app` with a project grid + curated empty state. Add a **compare overlay** (single viewport fade between two layouts). Add **item swap** (slot-compatible swap on the existing MVP catalog — full tag-based behaviour lands in Phase 6). Convert anonymous trial layouts to a real first project on signup.

After Phase 4, a user can: anonymously generate → sign up → land in a real Project containing their layout → add Rooms → generate named variants → mark primary → compare two variants → swap an item → share a read-only link with their partner.

## User Story

As a returning user planning a whole apartment,
I want to organize my work as Projects with multiple Rooms and named Layout variants per Room, share read-only links, compare alternatives, and swap individual items,
So that the app feels like a real design tool rather than a one-shot generator.

Plus the technical user story (PRD §5 #11 *Tenant isolation* extended):

As a logged-in user,
I want strict guarantees that I can only see my own projects, rooms, layouts, and share tokens, and that share links only expose the single layout they reference,
So that data is never accidentally cross-leaked.

## Problem Statement

Phase 3 shipped a flat shape: `auth.users → rooms → layouts`. There is no Project layer (`backend/app/routers/rooms.py`, `supabase/migrations/0001_init.sql`). Layouts are unnamed and have no concept of primary/sibling variants (`backend/app/models/layout.py`). There are no share tokens, no compare UI, no swap UI, no projects dashboard. The frontend dashboard at `frontend/app/app/page.tsx` immediately drops users into the wizard. PRD §5 user stories 3 (multi-room org), 4 (named variants), 5 (compare), 7 (swap), 8 (share) are all unaddressed.

## Solution Statement

Three layers, in order:

1. **DB layer.** Migration `0002_projects_and_variants.sql` adds `projects` table with RLS, adds `rooms.project_id` FK (NOT NULL, no backfill — wipe is allowed per PRD §15), adds `layouts.name`, `layouts.is_primary`, `layouts.catalog_version`, plus a partial unique index `(room_id) where is_primary` so each room has at most one primary. Migration `0003_share_tokens.sql` adds `share_tokens(token_hash, layout_id, expires_at, revoked_at)` plus a `security definer` function `public.get_shared_layout(token_hash text)` returning the single layout row by valid token. RLS denies all direct reads on `share_tokens` from the user role; the function is the only read path.

2. **Backend layer.** New `routers/projects.py` (CRUD). Extend `routers/rooms.py` with project-scoped POST/list and room-level PATCH/DELETE. Extend `routers/layouts.py` with `PATCH` (rename, set primary), `POST /{id}/duplicate`, `POST /{id}/share`, `DELETE /{id}/share`. New `routers/share.py` with public `GET /share/{token}`. New `services/share_tokens.py` (HMAC sign/verify + expiry, secret from `Settings.SHARE_TOKEN_SECRET`). Extend `services/supabase.py` with project + share-token + duplicate methods, including a service-role-only path for the `get_shared_layout` RPC (the only legitimate use of the service role per `.claude/reference/api.md` §15). New Pydantic models: `Project`, `ProjectCreate`, `ProjectRecord`, `ShareTokenResponse`, `LayoutPatch`. Update `Layout` JSON to carry an optional `catalogVersion` field (cleanly null on existing rows).

3. **Frontend layer.** Replace `frontend/app/app/page.tsx` with a projects dashboard (grid + curated empty state; *the* curated 5–10 templates are deferred to Phase 5, so empty-state CTA in Phase 4 is just "Create your first project"). New routes: `/app/projects/[projectId]`, `/app/projects/[projectId]/rooms/[roomId]` (variant grid), `/app/projects/[projectId]/rooms/[roomId]/layouts/[layoutId]`. Move the wizard from `/app` to `/app/new` (anonymous wizard preserved). Update `LoginModal` so the anon-save path POSTs `{ projectName: "My first project", roomName: "Living room", layout }` to `/projects/conversion` (a single endpoint that creates Project + Room + Layout in one transaction). New components: `<ProjectGrid>`, `<RoomCard>`, `<LayoutCard>`, `<ShareDialog>`, `<CompareOverlay>`, `<SwapPopover>`. New public route `/share/[token]/page.tsx` rendering a read-only `<ResultView>` with no Save / no LoginModal / no edit affordances.

Phase 4 explicitly does **not** touch `services/llm.py`, `data/catalog.json`, `services/slot_resolver.py`, or `services/placement.py`. Item swap uses the existing MVP `allowedSlotKinds` field — Phase 6 swaps the catalog model to tag-based and Phase 4's swap endpoint must be re-tested then.

## Feature Metadata

**Feature Type**: New Capability (additive on MVP contracts)
**Estimated Complexity**: High
**Primary Systems Affected**:
- `supabase/migrations/0002_projects_and_variants.sql` — new
- `supabase/migrations/0003_share_tokens.sql` — new
- `backend/app/models/project.py` — new
- `backend/app/models/share.py` — new
- `backend/app/models/layout.py` — extend (`name`, `is_primary`, `catalog_version`, `LayoutPatch`)
- `backend/app/models/room.py` — extend (`project_id`, `RoomPatch`)
- `backend/app/services/supabase.py` — extend (project + variant + share methods + service-role RPC client)
- `backend/app/services/share_tokens.py` — new (HMAC sign/verify)
- `backend/app/routers/projects.py` — new
- `backend/app/routers/share.py` — new
- `backend/app/routers/rooms.py` — extend
- `backend/app/routers/layouts.py` — extend (PATCH, duplicate, share, swap)
- `backend/app/routers/swap.py` — new (`POST /layouts/{id}/swap`)
- `backend/app/main.py` — register new routers
- `backend/app/config.py` — add `SHARE_TOKEN_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SHARE_LINK_BASE_URL`
- `backend/tests/test_routes_projects.py`, `test_routes_share.py`, `test_routes_swap.py`, `test_share_tokens.py`, `test_routes_layouts_variants.py` — new
- `backend/tests/test_rls_cross_user.py` — extend to projects + share
- `frontend/lib/types.ts` — extend (`Project`, `ProjectRecord`, `ShareTokenResponse`, `LayoutSummary` with `name`/`is_primary`)
- `frontend/lib/api.ts` — extend (project hooks, variant hooks, share hooks, swap hook, public-share hook)
- `frontend/app/app/page.tsx` — rewrite (projects grid)
- `frontend/app/app/new/page.tsx` — new (relocated anonymous wizard)
- `frontend/app/app/projects/[projectId]/page.tsx` — new
- `frontend/app/app/projects/[projectId]/rooms/[roomId]/page.tsx` — new
- `frontend/app/app/projects/[projectId]/rooms/[roomId]/layouts/[layoutId]/page.tsx` — new
- `frontend/app/share/[token]/page.tsx` — new (public read-only)
- `frontend/components/projects/ProjectGrid.tsx` — new
- `frontend/components/projects/ProjectCard.tsx` — new
- `frontend/components/projects/EmptyProjects.tsx` — new
- `frontend/components/rooms/RoomCard.tsx` — new
- `frontend/components/rooms/NewRoomDialog.tsx` — new
- `frontend/components/layouts/LayoutCard.tsx` — new
- `frontend/components/layouts/LayoutVariantGrid.tsx` — new
- `frontend/components/share/ShareDialog.tsx` — new
- `frontend/components/share/PublicLayoutView.tsx` — new
- `frontend/components/compare/CompareOverlay.tsx` — new
- `frontend/components/compare/CompareToolbar.tsx` — new
- `frontend/components/swap/SwapPopover.tsx` — new
- `frontend/components/auth/LoginModal.tsx` — extend (anon → first-project conversion copy + redirect)
- `frontend/components/result/ResultView.tsx` — extend (Share + Swap entry points; saved-layout mode hides regenerate)
- `frontend/components/sidebar/ResultSidebar.tsx` — extend (Share + Compare buttons)

**Dependencies**:
- Backend: no new pip deps (`cryptography` already pulled in by `pyjwt[crypto]>=2.9`).
- Frontend: no new npm deps. `clsx` + `tailwind-merge` already in for `cn()`. Use plain Radix-style modal pattern from `LoginModal.tsx` for new dialogs (do not introduce `@radix-ui/*` packages in Phase 4 — design system pass is Phase 5).
- Infra: `SHARE_TOKEN_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` must be added to Azure Key Vault and pulled into Container Apps env vars (`infra/keyvault.bicep`).
- External: live Supabase project for migration apply + RLS test.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: READ THESE BEFORE IMPLEMENTING

- `.claude/PRD.md` §4 in-scope checklist, §5 user stories 3–8 + 11, §7 F4 (project hierarchy), F5 (anon → first-project), F13 (item swap), F14 (share-as-link), F15 (marketing & onboarding wizard relocation), §9 (security — RLS, service role used only for `get_shared_layout`), §10 (full API spec for every Phase 4 endpoint), §11 (success criteria — share expiry/revoke, RLS, item swap respects tag/slot constraints), §12 Phase 4 deliverables list, §14 R5/R6 (RLS + share-token risks).
- `.claude/reference/api.md` §1 (layering — never import `fastapi` from `services/`), §3 (router anatomy), §4 (endpoint catalogue), §5 (`require_user`/`optional_user` template), §6 (httpx async Supabase REST pattern), §8 (RLS miss → 404 not 403; share-token failure also 404 to avoid existence oracles), §12 (cross-user RLS test pattern), §14 (security checklist per route), §15 (pitfalls — service-role bypass, `extra="forbid"`, raw REST JSON).
- `.claude/reference/components.md` §1 (server vs client split), §4 (Zustand for selection, TanStack Query for server state), §5 (`authedFetch` pattern, mutation invalidation), §10 (modal a11y), §11 (loading/error/empty triad).
- `supabase/migrations/0001_init.sql` (full) — existing schema. Note: existing rows are wiped on Phase 4 migration; the `pre-v1` git tag is the rollback safety net.
- `backend/app/config.py` (full) — `Settings` is `BaseSettings` with `model_config=SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")`. Add `SHARE_TOKEN_SECRET: str = ""`, `SUPABASE_SERVICE_ROLE_KEY: str = ""`, `SHARE_LINK_BASE_URL: str = ""` here. `get_settings()` is `lru_cache(maxsize=1)`.
- `backend/app/deps.py` (full) — `require_user` already verifies RS256/ES256 via cached `PyJWKClient`; `AuthUser` carries `id` + `email` + `jwt`. Reuse as-is — `optional_user` is also implemented and works for `/share` and `/generate-layout` paths that may or may not have a token.
- `backend/app/services/supabase.py` (full) — `SupabaseRest` is the existing pattern: `async with` context manager wrapping `httpx.AsyncClient` with `apikey` + bearer headers + `prefer: return=representation`. New methods MUST follow this shape. Service-role calls (only legitimate Phase 4 case: `rpc/get_shared_layout`) need a separate small client because the auth header differs; do NOT add a service-role bearer to the user `SupabaseRest`.
- `backend/app/routers/layouts.py` (full) — existing CRUD. Extend, do not rewrite. Pay attention to error mapping: 404 on `SupabaseNotFound`, 502 on generic `SupabaseError`.
- `backend/app/routers/rooms.py` (full) — currently flat `POST /rooms` + `GET /rooms`. Re-shape per PRD §10: `POST /projects/{pid}/rooms`, `GET /projects/{pid}/rooms`, plus standalone `PATCH /rooms/{id}` and `DELETE /rooms/{id}`. Keep backwards-incompatible — frontend changes in lockstep.
- `backend/app/models/layout.py` (full) — `Layout` schema has `extra="forbid"`. Add the new optional `catalogVersion: str | None = None` field carefully to not break the LLM strict-mode contract; since Phase 4 does not change the LLM, the safer move is to add `catalogVersion` to `Layout` (the wire/persisted shape) but leave `LayoutLLM` untouched, and stamp `catalogVersion = settings.CATALOG_VERSION or "v1.mvp"` server-side in `routers/generate.py` after the existing pipeline.
- `backend/app/models/room.py` (full) — extend with `project_id: str` (required on create) and a `RoomPatch` model (`name?: str`, dims?). Keep `roomType: Literal["living_room"]` literal — extending the Literal is Phase 6.
- `backend/app/main.py` (full) — register the new routers in the same `include_router` block; CORS already covers GET/POST/DELETE/OPTIONS but **add `PATCH`** to `allow_methods` since several new endpoints use it.
- `backend/app/routers/generate.py` — does NOT change behaviorally, but must accept the (already optional) `projectId` field on the request. Defer applying project defaults until the project model has `default_style` / `default_palette` (PRD §10 mentions update via `PATCH /projects/{id}` — implement field plumbing only, skip the smart-defaults logic itself in Phase 4 to keep scope tight).
- `backend/tests/test_rls_cross_user.py` (full) — existing pattern. Extend with project + share-token assertions in the same file.
- `frontend/lib/api.ts` (full) — existing `authedFetch` + TanStack hooks. Mirror exactly for new resources. `useGenerateLayout` is already a `useMutation`; the new project/room hooks follow the same shape.
- `frontend/lib/types.ts` (full) — keep adding TS types as additive mirrors of Pydantic models. Existing `LayoutSummary` and `LayoutRecord` need extension with `name`, `is_primary`, `project_id` (joined via the `rooms` PostgREST embed).
- `frontend/components/result/ResultView.tsx` (full) — already accepts `onSave`, `onRegenerate`, `onAdjust`. Extend with `onShare`, `onCompare`, `mode: "live" | "saved" | "shared"`. The `mode === "shared"` branch must hide all action buttons; the `mode === "saved"` branch must hide regenerate/adjust and show Share + Compare.
- `frontend/components/auth/LoginModal.tsx` (full) — `signInWithOtp` redirects to `${origin}/app`; on Phase 4 conversion path the post-login redirect needs to be `${origin}/app?convert=1` so the dashboard can pick up the cached anonymous layout from sessionStorage and POST it to the new conversion endpoint.
- `frontend/app/app/page.tsx` (full) — currently renders the wizard inline. Move that body to `frontend/app/app/new/page.tsx` verbatim (keeping the `<SeedReader>` Suspense pattern), then rewrite `frontend/app/app/page.tsx` as the projects grid.

### New Files to Create

See **Primary Systems Affected** above for full list. Group order for implementation:

1. `supabase/migrations/0002_*.sql`, `supabase/migrations/0003_*.sql`
2. `backend/app/models/{project.py,share.py}` + extensions to `room.py` + `layout.py`
3. `backend/app/services/share_tokens.py`, extend `services/supabase.py`
4. `backend/app/routers/{projects.py,share.py,swap.py}` + extend `rooms.py`, `layouts.py`
5. `backend/tests/test_*` (one per new router + share-token unit + RLS extension)
6. `frontend/lib/types.ts` extensions, `frontend/lib/api.ts` extensions
7. `frontend/app/app/new/page.tsx` (move wizard), rewrite `frontend/app/app/page.tsx`
8. `frontend/app/app/projects/...` route tree
9. `frontend/components/{projects,rooms,layouts,share,compare,swap}/...`
10. `frontend/app/share/[token]/page.tsx`

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [Supabase RLS — Security Definer Functions](https://supabase.com/docs/guides/database/postgres/row-level-security#security-definer-functions)
  - Why: required pattern for `get_shared_layout()` so the share path can return one row under a different identity without lifting RLS.
- [PostgREST — Calling RPC](https://docs.postgrest.org/en/stable/references/api/functions.html)
  - Section: invoking functions via `POST /rpc/<name>`.
  - Why: the service-role client uses this shape to call `get_shared_layout`.
- [Supabase Auth — `signInWithOtp`](https://supabase.com/docs/reference/javascript/auth-signinwithotp) and [`onAuthStateChange`](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
  - Why: the conversion flow listens for `SIGNED_IN` then POSTs the cached anon layout.
- [PyJWT — Verifying Tokens with JWKS](https://pyjwt.readthedocs.io/en/stable/usage.html#retrieve-rsa-signing-keys-from-a-jwks-endpoint)
  - Why: existing `_jwks` cache already works — do not change.
- [Python `hmac` + `secrets` modules](https://docs.python.org/3/library/hmac.html)
  - Why: `services/share_tokens.py` uses `hmac.compare_digest` and `secrets.token_urlsafe`.
- [TanStack Query v5 — `useQuery` `enabled` flag](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries)
  - Why: project/room/layout queries gate on `useAuthStore.session` — same pattern as `useListLayouts`.
- [Next.js 14 App Router — Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
  - Why: `[projectId]/rooms/[roomId]/layouts/[layoutId]` triple-nested params; use `useParams<{ projectId, roomId, layoutId }>()`.

### Patterns to Follow

**Naming Conventions (project-wide, from `CLAUDE.md`):**

- Python files / functions / vars: `snake_case`. Pydantic models: `PascalCase`.
- TS files: `kebab-case` (frontend uses `PascalCase.tsx` for components — keep that — but library files like `share-tokens.ts` if added would be `kebab-case`). Components: `PascalCase`. Vars: `camelCase`.
- Pydantic field naming: existing code mixes `snake_case` (DB columns: `room_id`, `is_primary`, `created_at`) and `camelCase` (LLM/wire: `catalogId`, `roomType`, `designExplanation`). Match the existing convention: persisted-row models use `snake_case`, request/response wire models that mirror LLM output use `camelCase`.

**Router Pattern (mirror `backend/app/routers/layouts.py`):**

```python
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.config import Settings, get_settings
from app.deps import AuthUser, require_user
from app.models.project import ProjectCreate, ProjectRecord
from app.services.supabase import SupabaseError, SupabaseNotFound, SupabaseRest

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectRecord, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> ProjectRecord:
    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            row = await sb.insert_project({"user_id": user.id, "name": body.name})
    except SupabaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return ProjectRecord.model_validate(row)
```

**Pydantic Pattern (mirror `backend/app/models/room.py`):**

```python
from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(min_length=1, max_length=80)


class ProjectRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    user_id: str
    name: str
    default_style: str | None = None
    created_at: str
```

**Error Handling (per `.claude/reference/api.md` §8):**

- `SupabaseNotFound` → 404 (also covers RLS-hidden rows).
- `SupabaseError` (anything else from REST) → 502.
- Bad share token (invalid HMAC, expired, revoked) → 404 (NOT 403). Same status for missing token, to avoid leaking token existence.
- Pydantic input → 422 automatically.
- Auth failure → 401 from `require_user`.

**Frontend Hook Pattern (mirror `frontend/lib/api.ts`):**

```ts
export function useListProjects() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: ["projects"] as const,
    queryFn: () => authedFetch<ProjectRecord[]>("/projects"),
    enabled: !!session,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectCreate) =>
      authedFetch<ProjectRecord>("/projects", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
```

**Modal Pattern (mirror `frontend/components/auth/LoginModal.tsx`):**

- Self-contained `role="dialog" aria-modal="true"`.
- Escape key closes.
- Click on backdrop closes; clicks inside don't.
- Focus the first interactive element on open.

**Loading / Error / Empty Pattern (per `.claude/reference/components.md` §11):**

```tsx
if (!ready) return <FullPageSpinner />;
if (!session) return <SignedOutCTA />;
if (isLoading) return <SkeletonGrid />;
if (isError) return <ErrorCard error={error} />;
if (data?.length === 0) return <EmptyState ctaHref="..." />;
return <Grid items={data!} />;
```

**Co-occupancy / drop-priority** is not touched in Phase 4. Item swap respects only the existing `allowedSlotKinds` field and an AABB re-check via the existing `placement.py`.

**Migrations:** name with sequential prefixes; one feature per file; never edit a shipped migration. Verify with `supabase db reset` locally before pushing.

---

## IMPLEMENTATION PLAN

### Phase A: Database

Migrations + RLS + security-definer share function. No code changes possible until this is shaped.

**Tasks:**
- Tag `pre-v1` git ref before applying.
- Write `0002_projects_and_variants.sql`: create `projects` table (`id`, `user_id`, `name`, `default_style`, `default_palette jsonb`, `created_at`); add `rooms.project_id uuid not null references projects(id) on delete cascade`; add `layouts.name text not null default 'Untitled'`, `layouts.is_primary bool not null default false`, `layouts.catalog_version text`; add `create unique index layouts_one_primary_per_room on public.layouts (room_id) where is_primary` to enforce one primary per room; add RLS policies on `projects` mirroring the existing `rooms` style.
- Write `0003_share_tokens.sql`: create `share_tokens` table (`token_hash text primary key`, `layout_id uuid not null references layouts(id) on delete cascade`, `user_id uuid not null references auth.users(id) on delete cascade`, `expires_at timestamptz not null`, `revoked_at timestamptz`, `created_at timestamptz not null default now()`); RLS denies all SELECT to authenticated role except `auth.uid() = user_id` for the owner's own tokens (so the owner can revoke); create `public.get_shared_layout(p_token_hash text) returns table(...) language sql security definer set search_path = public ...` returning the joined layout + room dims if the token is valid (`now() < expires_at and revoked_at is null`).
- Apply locally (`supabase db reset`); apply to staging Supabase with `supabase db push`.

### Phase B: Backend models + services

**Tasks:**
- Add `models/project.py` (`ProjectCreate`, `ProjectPatch`, `ProjectRecord`).
- Add `models/share.py` (`ShareTokenResponse` with `token`, `url`, `expires_at`).
- Extend `models/room.py`: add `project_id: str` to `RoomCreate` and `RoomRecord`; add `RoomPatch`.
- Extend `models/layout.py`: add `name`, `is_primary` to `LayoutSummary`, `LayoutRecord`; add `catalogVersion: str | None = None` to `Layout`; add `LayoutPatch` (`name?`, `is_primary?`).
- Add `services/share_tokens.py`: `sign(layout_id: str, expires_at: datetime, secret: str) -> str` returns `b64url(payload).b64url(hmac_sha256(payload))`; `verify(token: str, secret: str) -> tuple[str, datetime]` raises `InvalidToken` on bad HMAC or expiry. Use `hmac.compare_digest`.
- Extend `services/supabase.py`: add `insert_project`, `list_projects`, `get_project`, `update_project`, `delete_project`; `insert_room` already exists — add `list_rooms_for_project`, `update_room`, `delete_room`; for layouts add `update_layout`, `duplicate_layout` (server-side select + insert), `unset_other_primaries(room_id)` and `set_primary(layout_id)` chained inside `update_layout` when `is_primary=True`. Add `insert_share_token`, `revoke_share_token`. Add a separate small `SupabaseServiceRoleRpc` class (service-role client) used ONLY for `rpc/get_shared_layout`; document loudly that this is the single sanctioned service-role usage.
- Add `SHARE_TOKEN_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SHARE_LINK_BASE_URL` to `Settings`.

### Phase C: Backend routers + tests

**Tasks:**
- Add `routers/projects.py` (CRUD, all auth-required).
- Rewrite `routers/rooms.py` to: `POST /projects/{pid}/rooms`, `GET /projects/{pid}/rooms`, `PATCH /rooms/{id}`, `DELETE /rooms/{id}`. Enforce `pid` membership server-side via the JWT-scoped insert (RLS does the cross-user enforcement; the path `pid` is the one written into `project_id`).
- Extend `routers/layouts.py`: add `PATCH /layouts/{id}` (rename / set primary — when `is_primary=true`, run `unset_other_primaries` first inside one logical operation), `POST /layouts/{id}/duplicate`, `POST /layouts/{id}/share`, `DELETE /layouts/{id}/share`.
- Add `routers/swap.py`: `POST /layouts/{id}/swap` body `{ catalogId: str, replacementId: str }`. Load the layout via RLS-scoped read, find item by `catalogId`, look up replacement in `data/catalog.json`, assert `replacement.allowedSlotKinds` covers the existing slot's kind, run `resolve_slot()` for the replacement footprint at the same slot, run AABB collision against the rest of the layout via `placement.py`, on conflict return 409 with a hint, on success persist updated `layout` jsonb + return updated `LayoutRecord`. NOTE: this uses the MVP `allowedSlotKinds` field; Phase 6 must rewrite for tag-based.
- Add `routers/share.py`: `GET /share/{token}` — verify HMAC + decode, on success call the service-role RPC `get_shared_layout(token_hash)`, on any failure return 404. Public route, no auth dep.
- Wire all routers in `main.py`; add `PATCH` to CORS `allow_methods`.
- Tests:
  - `test_routes_projects.py` — 201 create, 200 list, 200 get, 200 patch, 204 delete; 404 on cross-user.
  - `test_routes_rooms_v2.py` — project-scoped POST, project-scoped list, room-level PATCH/DELETE.
  - `test_routes_layouts_variants.py` — duplicate creates a new row with `name="<original>-copy"`; setting `is_primary=true` flips the old primary to false; the unique partial index prevents two primaries per room (assert via direct REST).
  - `test_share_tokens.py` — unit tests: sign roundtrips through verify; expired token raises; tampered HMAC raises.
  - `test_routes_share.py` — POST share returns `{token, url, expires_at}`; GET `/share/{token}` returns the layout; DELETE share + GET → 404; expired token → 404; tampered token → 404.
  - `test_routes_swap.py` — successful swap when `allowedSlotKinds` matches; 409 when AABB overlaps; 422 when `replacementId` not in catalog; 404 when item `catalogId` not in layout.
  - Extend `test_rls_cross_user.py` — user B cannot read user A's project, cannot list user A's rooms via `/projects/{pid}/rooms`, cannot read user A's share tokens; user B's share token doesn't accidentally surface user A's layout.

### Phase D: Frontend types + hooks

**Tasks:**
- Extend `lib/types.ts` with `Project`, `ProjectCreate`, `ProjectRecord`, `ProjectPatch`, `RoomPatch`, `LayoutPatch`, `ShareTokenResponse`. Extend `LayoutSummary` + `LayoutRecord` with `name`, `is_primary`, `project_id` (the last one comes from a PostgREST embed `rooms(project_id, ...)`, so place it under `rooms` in `LayoutRecord`).
- Extend `lib/api.ts`:
  - `useListProjects`, `useGetProject`, `useCreateProject`, `useUpdateProject`, `useDeleteProject`.
  - `useListRoomsForProject(projectId)`, `useCreateRoom(projectId)`, `useUpdateRoom`, `useDeleteRoom` — note: the existing `useCreateRoom` must be replaced; grep all callers.
  - `useListLayoutsForRoom(roomId)`, `useUpdateLayout`, `useDuplicateLayout`, `useShareLayout`, `useRevokeShare`, `useSwapItem`.
  - `useGetSharedLayout(token)` — public, no auth, `enabled: !!token`. Use a separate plain `fetch` (not `authedFetch`) so the public path doesn't accidentally attach a token.
  - `useConvertAnonLayout` — POSTs `{ projectName, roomName, layout }` to `/projects/conversion`.
- Add a server endpoint `POST /projects/conversion` (in `routers/projects.py`) that wraps Project + Room + Layout creation in one logical operation (sequential REST calls under user JWT — no atomicity, but order Project → Room → Layout and on Room failure rollback the Project; document the lack of true atomicity).

### Phase E: Frontend route restructure

**Tasks:**
- Create `frontend/app/app/new/page.tsx` containing the existing wizard body from `frontend/app/app/page.tsx`. Keep the `<Suspense>` + `<SeedReader>` pattern.
- Rewrite `frontend/app/app/page.tsx` as the projects dashboard: signed-in users see `<ProjectGrid>`; signed-out users see a marketing-style CTA pointing to `/app/new`.
- Add `frontend/app/app/projects/[projectId]/page.tsx`: project header (rename inline) + rooms grid (`<RoomCard>` per room) + "+ New Room" button (`<NewRoomDialog>`).
- Add `frontend/app/app/projects/[projectId]/rooms/[roomId]/page.tsx`: room header + variant grid (`<LayoutVariantGrid>`) + "+ New Layout" button (re-runs the wizard with the room's stored dims pre-filled and on success POSTs a new layout to the same room) + "Compare" multi-select toggle.
- Add `frontend/app/app/projects/[projectId]/rooms/[roomId]/layouts/[layoutId]/page.tsx`: full-screen `<ResultView mode="saved">` with Share + Swap + (optional) Compare toolbar.
- Add `frontend/app/share/[token]/page.tsx`: public read-only `<PublicLayoutView>` rendering `<ResultView mode="shared">`. No `<AuthProvider>` requirement on this route — wrap only `app/app/*` in the provider via `app/app/layout.tsx` if not already.
- Update `LoginModal` post-login redirect: when invoked from the anon save path, set sessionStorage `pendingAnonLayout` before opening login; on the dashboard `/app`, an effect reads `pendingAnonLayout` and calls `useConvertAnonLayout`, then `router.push` to the new layout's URL.

### Phase F: Frontend new components

**Tasks:**
- `<ProjectGrid>` — TanStack `useListProjects`; renders `<ProjectCard>` cells; loading/error/empty triad.
- `<ProjectCard>` — title + thumbnail (primary layout's `thumbnail_url` from the project's first room — Phase 4 punts on the actual thumbnail capture; placeholder gradient is fine until Phase 5).
- `<EmptyProjects>` — single CTA "Create your first project" → opens `<NewProjectDialog>` (small modal, mirrors `LoginModal` shape).
- `<RoomCard>` — name + dims + last-modified.
- `<NewRoomDialog>` — name + roomType (locked to `living_room` in Phase 4; Phase 6 unlocks the rest) + dims sliders.
- `<LayoutCard>` — name + style chip + "Primary" badge if `is_primary` + checkbox in compare mode.
- `<LayoutVariantGrid>` — multi-select state in local component state; "Compare (2)" button enabled when exactly two selected.
- `<ShareDialog>` — POSTs share, shows `{url, expires_at}` with copy-to-clipboard; revoke button calls `useRevokeShare`.
- `<CompareOverlay>` — single `<Canvas>` rendering both layouts as nested groups; opacity slider drives `groupA.material.opacity` / `groupB.material.opacity` with `transparent: true`. (Acceptable Phase 4 simplification: opacity at the group level via a `<MeshFadeProvider>`; full per-material crossfade can wait.)
- `<CompareToolbar>` — slider 0..1 + close button, sits over the Canvas like `<CameraPresets>`.
- `<SwapPopover>` — opens from `<ItemPopover>`; lists catalog items whose `allowedSlotKinds` cover the current slot's kind; on click calls `useSwapItem` mutation; optimistic update on the local layout; revert on error.

### Phase G: Wiring + polish

**Tasks:**
- Add Share + Compare buttons to `<ResultSidebar>` for `mode="saved"` (saved-layout result page). Hide for `mode="live"` (anon result before save) and `mode="shared"` (public view).
- Anon → first-project conversion: on `LoginModal` close after successful sign-in, the dashboard at `/app` reads `sessionStorage.pendingAnonLayout`, calls `useConvertAnonLayout`, clears the key, and pushes to the new layout URL. If conversion fails, show a non-blocking toast and keep the layout in sessionStorage.
- Update `frontend/app/app/layouts/page.tsx` (the existing "My Layouts" flat list) — keep it but make every row a deep-link to the new nested URL `/app/projects/{project_id}/rooms/{room_id}/layouts/{id}`. Mark this page deprecated in a comment; it can be deleted in Phase 5 when the project dashboard fully replaces it.
- `infra/keyvault.bicep`: add `SHARE_TOKEN_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` secrets.
- README + `.env.example` updates for the new env vars.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order. Each task is atomic and validates before the next.

### 1. CREATE `supabase/migrations/0002_projects_and_variants.sql`
- **IMPLEMENT**: `projects` table (`id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null check (char_length(name) between 1 and 80), default_style text, default_palette jsonb, created_at timestamptz not null default now()`); index on `user_id`; RLS policies (`auth.uid() = user_id` for select/insert/update/delete) mirroring `rooms`. Add `rooms.project_id uuid not null references projects(id) on delete cascade` (no backfill — assumes prod is wiped per PRD §15). Add `layouts.name text not null default 'Untitled'`, `layouts.is_primary bool not null default false`, `layouts.catalog_version text`. Add `create unique index layouts_one_primary_per_room on public.layouts (room_id) where is_primary;`.
- **PATTERN**: `supabase/migrations/0001_init.sql` (existing RLS shape).
- **GOTCHA**: do not edit `0001_init.sql`. New migration only. The `rooms.project_id NOT NULL` requires either an existing default or wiping data first.
- **VALIDATE**: `cd supabase && supabase db reset` runs cleanly with no errors.

### 2. CREATE `supabase/migrations/0003_share_tokens.sql`
- **IMPLEMENT**: `share_tokens` table (`token_hash text primary key, layout_id uuid not null references layouts(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now()`); RLS enabled; SELECT/INSERT/UPDATE/DELETE policies scoped to `auth.uid() = user_id` (so owner can revoke). Create `public.get_shared_layout(p_token_hash text)` as `language sql security definer set search_path = public` returning the layout + room dims joined, but only when `now() < expires_at and revoked_at is null`. `revoke execute on function get_shared_layout(text) from public; grant execute on function get_shared_layout(text) to service_role;`.
- **PATTERN**: Supabase docs link in references.
- **GOTCHA**: `set search_path = public` is mandatory on `security definer` functions to avoid search-path attacks.
- **VALIDATE**: `supabase db reset` clean; `psql` smoke: insert a row, call the function with the token_hash, confirm one row returned; advance `now()` past `expires_at` (use `revoked_at = now()` for the revoke check), confirm zero rows.

### 3. UPDATE `backend/app/config.py`
- **IMPLEMENT**: add `SHARE_TOKEN_SECRET: str = ""`, `SUPABASE_SERVICE_ROLE_KEY: str = ""`, `SHARE_LINK_BASE_URL: str = ""`.
- **PATTERN**: existing `Settings` shape (`config.py:6-23`).
- **VALIDATE**: `uv run python -c "from app.config import get_settings; s=get_settings(); print(s.SHARE_TOKEN_SECRET)"` prints empty string, no error.

### 4. CREATE `backend/app/models/project.py`
- **IMPLEMENT**: `ProjectCreate(name: str, default_style: str | None = None)`; `ProjectPatch(name?: str, default_style?: str)`; `ProjectRecord(id, user_id, name, default_style, created_at)`. All `extra="forbid"`.
- **PATTERN**: `backend/app/models/room.py` (full).
- **VALIDATE**: `uv run python -c "from app.models.project import ProjectCreate; ProjectCreate(name='x')"` succeeds.

### 5. CREATE `backend/app/models/share.py`
- **IMPLEMENT**: `ShareTokenResponse(token: str, url: str, expires_at: str)`. `extra="forbid"`.
- **VALIDATE**: import succeeds.

### 6. UPDATE `backend/app/models/room.py`
- **IMPLEMENT**: add `project_id: str` to `RoomCreate` and `RoomRecord`. Add `RoomPatch(name?: str, width_m?: float, length_m?: float, height_m?: float)` with the same numeric bounds as `RoomCreate`.
- **GOTCHA**: keep `roomType: Literal["living_room"]` — extending the literal is Phase 6.
- **VALIDATE**: `uv run pytest tests/test_routes_rooms.py` (existing, will fail because `project_id` now required — update test fixture accordingly in step 13).

### 7. UPDATE `backend/app/models/layout.py`
- **IMPLEMENT**: add `catalogVersion: str | None = None` to `Layout` (NOT to `LayoutLLM`); add `name: str`, `is_primary: bool`, `project_id: str | None = None` to `LayoutSummary` and `LayoutRecord`; add `LayoutPatch(name?: str, is_primary?: bool)`.
- **GOTCHA**: `LayoutLLM` is the strict-mode JSON-schema contract for the LLM — leave it alone. Stamp `catalogVersion` server-side after generation.
- **VALIDATE**: `uv run mypy app/models` clean.

### 8. CREATE `backend/app/services/share_tokens.py`
- **IMPLEMENT**: `sign(layout_id: str, expires_at: datetime, secret: str) -> str` returning `f"{b64u(payload)}.{b64u(hmac_sha256)}"` where payload is `{layout_id}.{int(expires_at.timestamp())}`. `verify(token: str, secret: str) -> SignedToken` returns `SignedToken(layout_id, expires_at)` and raises `InvalidToken` on tamper or expiry. `token_hash(token: str) -> str` returns `sha256(token).hex()` for DB storage.
- **IMPORTS**: `import hmac, hashlib, base64, secrets` from stdlib; `from datetime import datetime, timezone`.
- **GOTCHA**: use `hmac.compare_digest` for the comparison; never `==`. Store only the SHA-256 of the raw token in the DB so a DB leak does not yield valid tokens.
- **VALIDATE**: round-trip unit test in step 14 passes.

### 9. UPDATE `backend/app/services/supabase.py`
- **IMPLEMENT**: add `insert_project`, `list_projects`, `get_project(id)`, `update_project(id, payload)`, `delete_project(id)`; add `list_rooms_for_project(pid)`, `update_room(id, payload)`, `delete_room(id)`; for layouts add `update_layout(id, payload)`, `unset_other_primaries(room_id)`, `duplicate_layout(id, new_name)`, `list_layouts_for_room(room_id)`; for share add `insert_share_token(payload)`, `revoke_share_token(layout_id)`, `find_share_token_by_user(user_id, layout_id)`. Add a separate small class `SupabaseServiceRoleClient` constructed with `SUPABASE_SERVICE_ROLE_KEY` whose only method is `get_shared_layout(token_hash: str) -> dict | None` calling `POST /rest/v1/rpc/get_shared_layout`.
- **PATTERN**: existing `SupabaseRest` (`services/supabase.py` full).
- **GOTCHA**: never instantiate `SupabaseServiceRoleClient` from a router that has a user JWT in scope — only the public `/share/{token}` route uses it. RLS bypass is intentional and scoped to one row.
- **VALIDATE**: `uv run mypy app/services/supabase.py` clean.

### 10. CREATE `backend/app/routers/projects.py`
- **IMPLEMENT**: `POST /projects`, `GET /projects`, `GET /projects/{id}`, `PATCH /projects/{id}`, `DELETE /projects/{id}`, `POST /projects/conversion` (anon → first-project conversion; body `{ projectName, roomName, layout }`; runs three sequential JWT-scoped REST calls; on Room failure deletes Project; on Layout failure deletes Room + Project).
- **PATTERN**: `backend/app/routers/layouts.py`.
- **VALIDATE**: `uv run pytest tests/test_routes_projects.py -v`.

### 11. UPDATE `backend/app/routers/rooms.py`
- **IMPLEMENT**: replace flat routes with `POST /projects/{pid}/rooms`, `GET /projects/{pid}/rooms`, `PATCH /rooms/{id}`, `DELETE /rooms/{id}`. Two routers in one file with different prefixes (or one router with explicit paths). The simpler shape: single `APIRouter(tags=["rooms"])` with no prefix and explicit paths on every decorator.
- **VALIDATE**: `uv run pytest tests/test_routes_rooms.py -v` after fixture updates.

### 12. UPDATE `backend/app/routers/layouts.py`
- **IMPLEMENT**: add `PATCH /layouts/{id}` (rename / set primary — when `is_primary=true`, run `unset_other_primaries(room_id)` first, then `update_layout`); add `POST /layouts/{id}/duplicate` (load → strip id + created_at + is_primary → insert with `name=f"{name} copy"`); add `POST /layouts/{id}/share` (generate raw token via `secrets.token_urlsafe(32)`, sign with HMAC, hash with sha256, persist `{token_hash, layout_id, user_id, expires_at}`, return `ShareTokenResponse`); add `DELETE /layouts/{id}/share` (sets `revoked_at = now()`).
- **VALIDATE**: `uv run pytest tests/test_routes_layouts_variants.py -v`.

### 13. CREATE `backend/app/routers/share.py`
- **IMPLEMENT**: public `GET /share/{token}` — verify HMAC + decode expiry; on success compute `token_hash`, call `SupabaseServiceRoleClient.get_shared_layout(token_hash)`, return the joined layout + room dims; on any failure (bad HMAC, expired, missing, revoked) return 404 with detail `"not found or expired"`. **No `Depends(require_user)`.**
- **PATTERN**: `backend/app/routers/catalog.py` (anonymous route).
- **GOTCHA**: must return 404 (NOT 403) for all failure modes to avoid token-existence oracles.
- **VALIDATE**: `uv run pytest tests/test_routes_share.py -v`.

### 14. CREATE `backend/app/routers/swap.py`
- **IMPLEMENT**: `POST /layouts/{id}/swap` body `{ catalogId: str, replacementId: str }` (Pydantic model `SwapRequest`). Load layout RLS-scoped; find item by `catalogId` (404 if missing); look up replacement in `data/catalog.json` (422 if missing); assert replacement `allowedSlotKinds` covers existing slot's kind family (parsed from slot prefix — `north_wall_*` → `wall`, `corner_*` → `corner`, `center*`/`entry` → `floor`); call `slot_resolver.resolve_slot()` for replacement footprint at the same slot/facing; rebuild layout items list with the replacement; run `placement.collide()` against the rest; on AABB conflict return 409 `{detail: "swap_collides"}`; on success persist updated `layout` jsonb via `update_layout` and return updated `LayoutRecord`.
- **PATTERN**: `backend/app/routers/generate.py` for the slot_resolver+placement dance.
- **GOTCHA**: Phase 6 will rewrite this for tag-based catalog. Add a docstring linking to the Phase 6 plan.
- **VALIDATE**: `uv run pytest tests/test_routes_swap.py -v`.

### 15. UPDATE `backend/app/main.py`
- **IMPLEMENT**: import + include `projects`, `share`, `swap` routers. Add `"PATCH"` to `allow_methods`.
- **VALIDATE**: `uv run uvicorn app.main:app --reload` starts; `curl localhost:8000/healthz` returns `{"status":"ok"}`.

### 16. UPDATE `backend/app/routers/generate.py`
- **IMPLEMENT**: stamp `layout.catalogVersion = settings.CATALOG_VERSION or "v1.mvp"` on the returned `Layout` after the existing pipeline. No other behaviour change.
- **VALIDATE**: existing `test_routes_generate.py` still passes.

### 17. CREATE backend tests
- **IMPLEMENT**: one file per router as listed in Phase C; one `test_share_tokens.py` for the HMAC unit; extend `test_rls_cross_user.py` with project + share + token scenarios.
- **PATTERN**: existing `backend/tests/test_routes_layouts.py`, `test_rls_cross_user.py`.
- **VALIDATE**: `uv run pytest -v` (full suite) green; cross-user test skipped locally without env vars (existing pattern preserved).

### 18. UPDATE `backend/.env.example`
- **IMPLEMENT**: add `SHARE_TOKEN_SECRET=`, `SUPABASE_SERVICE_ROLE_KEY=`, `SHARE_LINK_BASE_URL=http://localhost:3000`.
- **VALIDATE**: `cp .env.example .env && uv run uvicorn app.main:app` works.

### 19. UPDATE `frontend/lib/types.ts`
- **IMPLEMENT**: add `Project`, `ProjectCreate`, `ProjectPatch`, `ProjectRecord`, `RoomPatch`, `LayoutPatch`, `ShareTokenResponse`. Extend `LayoutSummary` (`name`, `is_primary`) and `LayoutRecord` (`name`, `is_primary`, `rooms.project_id`).
- **VALIDATE**: `pnpm typecheck` clean.

### 20. UPDATE `frontend/lib/api.ts`
- **IMPLEMENT**: all hooks listed in Phase D.
- **GOTCHA**: `useGetSharedLayout(token)` does plain `fetch` to `${API}/share/${token}`, not `authedFetch`.
- **VALIDATE**: `pnpm typecheck` clean.

### 21. CREATE `frontend/app/app/new/page.tsx`
- **IMPLEMENT**: copy the body of the current `frontend/app/app/page.tsx` verbatim. This is now the anonymous wizard route.
- **VALIDATE**: `pnpm dev` and visit `http://localhost:3000/app/new` — wizard renders.

### 22. REWRITE `frontend/app/app/page.tsx`
- **IMPLEMENT**: render `<ProjectGrid>` for signed-in users; for signed-out users show a CTA → `/app/new`. Read `sessionStorage.pendingAnonLayout` once per mount; if present, call `useConvertAnonLayout` and `router.push` to the new layout URL.
- **VALIDATE**: signed-in user sees grid; signed-out sees CTA.

### 23. CREATE `frontend/components/projects/{ProjectGrid,ProjectCard,EmptyProjects,NewProjectDialog}.tsx`
- **PATTERN**: `frontend/components/auth/LoginModal.tsx` (modal); `frontend/app/app/layouts/page.tsx` (list).
- **VALIDATE**: signed-in user with no projects sees empty state + CTA; creating a project navigates into it.

### 24. CREATE `frontend/app/app/projects/[projectId]/page.tsx`
- **IMPLEMENT**: project header with rename + rooms grid + "+ New Room" button.
- **VALIDATE**: navigate from dashboard to project; rooms list renders empty state.

### 25. CREATE `frontend/components/rooms/{RoomCard,NewRoomDialog}.tsx`
- **VALIDATE**: creating a room appears in the grid.

### 26. CREATE `frontend/app/app/projects/[projectId]/rooms/[roomId]/page.tsx`
- **IMPLEMENT**: room header + variant grid + "+ New Layout" button (opens wizard with dims pre-filled, on success POSTs `/layouts` with `roomId`); compare multi-select toggle; "Compare (2)" button enabled with exactly two selected → routes to `compare` query mode on the layout page (or opens an inline overlay).
- **VALIDATE**: generating a second layout creates a sibling variant; primary toggle moves the badge.

### 27. CREATE `frontend/components/layouts/{LayoutCard,LayoutVariantGrid}.tsx`
- **VALIDATE**: clicking a card opens the layout page; checkbox enters compare mode.

### 28. CREATE `frontend/app/app/projects/[projectId]/rooms/[roomId]/layouts/[layoutId]/page.tsx`
- **IMPLEMENT**: full-screen `<ResultView mode="saved">` with Share + Swap + Compare toolbar. Pull dims from the joined `rooms` field.
- **VALIDATE**: saved layout reload renders; Share button opens dialog.

### 29. CREATE `frontend/components/share/{ShareDialog,PublicLayoutView}.tsx`
- **IMPLEMENT**: `<ShareDialog>` calls `useShareLayout`, shows URL + expiry, copy-to-clipboard, revoke button. `<PublicLayoutView>` renders `<ResultView mode="shared">` with no edit affordances.
- **VALIDATE**: copying URL + opening it in incognito renders the layout without auth.

### 30. CREATE `frontend/app/share/[token]/page.tsx`
- **IMPLEMENT**: server-fetch (or client-fetch with `useGetSharedLayout`) the layout; render `<PublicLayoutView>`; on 404 show "This share link is no longer available".
- **VALIDATE**: revoked or expired token shows the 404 copy.

### 31. CREATE `frontend/components/compare/{CompareOverlay,CompareToolbar}.tsx`
- **IMPLEMENT**: single `<Canvas>` rendering both layouts; opacity slider drives a fade. Phase 4 acceptable: render both layouts in the same scene with `<group>` opacity drivers; full per-material crossfade is a Phase 5 polish.
- **VALIDATE**: select two variants → Compare → slider moves smoothly between A and B.

### 32. CREATE `frontend/components/swap/SwapPopover.tsx`
- **IMPLEMENT**: from the existing `<ItemPopover>`, add "Replace…" entry that lists catalog items whose `allowedSlotKinds` cover the current slot's kind. On select, call `useSwapItem`; optimistic update; revert on error toast.
- **VALIDATE**: swap a sofa for another sofa-like item; AABB-conflicting swap (e.g. swap small chair for huge sofa) yields 409 + revert.

### 33. UPDATE `frontend/components/auth/LoginModal.tsx`
- **IMPLEMENT**: when invoked from the anon save path (caller passes a `pendingLayout` prop), persist it to `sessionStorage.pendingAnonLayout` before sending the magic link / Google redirect. Frame the modal copy: "Sign in to save this layout to your first project."
- **VALIDATE**: anon user → Save → sign in → lands on the new layout URL with the layout persisted server-side.

### 34. UPDATE `frontend/components/result/ResultView.tsx`
- **IMPLEMENT**: add `mode: "live" | "saved" | "shared"` prop. `live` shows existing buttons; `saved` adds Share + Swap + Compare, hides Regenerate; `shared` hides every action. Default `mode="live"`.
- **VALIDATE**: each mode visually distinct; signed-out share view has zero auth affordances.

### 35. UPDATE `infra/keyvault.bicep` + `.env.example` files
- **IMPLEMENT**: add `SHARE_TOKEN_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` Key Vault secrets; reference them in the Container App env via `infra/containerapp.bicep`.
- **VALIDATE**: `az deployment group what-if` clean against staging RG.

### 36. UPDATE `frontend/app/app/layouts/page.tsx`
- **IMPLEMENT**: keep the page; rewrite each row's link to `/app/projects/{project_id}/rooms/{room_id}/layouts/{id}`. Add a top-of-file deprecation comment scheduled for removal in Phase 5.
- **VALIDATE**: clicks still resolve.

### 37. RUN full validation (Level 1–4 in Validation Commands).

### 38. Pre-deploy sanity
- Tag `pre-v1` git ref before applying migrations to staging.
- Apply `0002` + `0003` to staging via `supabase db push`.
- Run extended `test_rls_cross_user.py` against staging with two test JWTs.

---

## TESTING STRATEGY

### Unit Tests

- `backend/tests/test_share_tokens.py` — sign/verify roundtrip; tampered HMAC raises; expired token raises; `token_hash` deterministic.
- `backend/tests/test_routes_swap.py` — table-driven cases: ok / mismatched-slot / aabb-conflict / not-in-catalog / item-not-in-layout. Uses `respx` to mock Supabase REST.

### Integration Tests

- `backend/tests/test_routes_projects.py` — 201 / 200 / 200 / 200 / 204 happy path; 404 cross-user (mocked).
- `backend/tests/test_routes_rooms_v2.py` — project-scoped POST/list; room-level PATCH/DELETE.
- `backend/tests/test_routes_layouts_variants.py` — duplicate creates sibling; setting `is_primary=true` flips the previous primary; the unique partial index prevents two primaries; PATCH name persists.
- `backend/tests/test_routes_share.py` — POST share returns valid `{token, url, expires_at}`; GET `/share/{token}` returns the layout; DELETE share + GET → 404; tampered token → 404; expired token → 404.
- `backend/tests/test_rls_cross_user.py` — extend: user B cannot read user A's project, cannot list user A's project's rooms, cannot read user A's share tokens; user B's GET on A's `/share/{token}` works *only* if user A actually shared (verifying share is the only legitimate cross-user read).

### Edge Cases

- Two layouts simultaneously set `is_primary=true` on the same room → second insert hits the unique partial index → 409 → router translates to a clear error.
- `POST /layouts/{id}/share` called twice without revoking → return the existing un-expired token (idempotent) OR rotate (locked decision: rotate, replacing the old token; document in router).
- Anon → first-project conversion fails partway (Project created, Room creation fails) → router rolls back the Project; sessionStorage layout untouched so the user can retry.
- Swap on a layout that the user has a stale local copy of (ETag drift): out of scope for Phase 4; Phase 6 may add `If-Match` headers.
- Compare overlay on layouts with different room dimensions (impossible normally — variants share the room) → defensive: if dims diverge by more than 1 cm, refuse the compare with a toast.
- Share link to a layout that gets deleted → CASCADE drops the share token; `/share/{token}` returns 404. ✓

---

## VALIDATION COMMANDS

Execute every command. Zero regressions; 100% feature correctness.

### Level 1: Syntax & Style

Backend:
```bash
cd backend
uv run ruff check .
uv run ruff format --check .
uv run mypy app
```

Frontend:
```bash
cd frontend
pnpm lint
pnpm typecheck
```

### Level 2: Unit + Integration Tests

Backend:
```bash
cd backend
uv run pytest -v
```

Specifically the new files:
```bash
uv run pytest tests/test_share_tokens.py tests/test_routes_share.py tests/test_routes_projects.py tests/test_routes_swap.py tests/test_routes_layouts_variants.py -v
```

### Level 3: Cross-user RLS

```bash
INTERIOR_FLOW_API_URL=https://staging.api.interior-flow-3d.example \
SUPABASE_TEST_USER_A_JWT=<…> \
SUPABASE_TEST_USER_B_JWT=<…> \
uv run pytest tests/test_rls_cross_user.py -v
```

### Level 4: Manual Validation

Anonymous → first-project conversion:
1. Open `/app/new` in incognito; complete wizard; click Save.
2. Sign in via magic link.
3. Land on `/app/projects/<id>/rooms/<id>/layouts/<id>` with the previously-generated layout intact.

Multi-room + variants:
1. From the dashboard, open the auto-created project.
2. "+ New Room" → bedroom (still locked to `living_room` in Phase 4 — verify the dropdown is disabled).
3. Generate two variants for the same room. Mark the second primary. Confirm the badge moves.

Compare:
1. Select two variants on the room page → "Compare (2)".
2. Move the slider; verify a smooth fade.

Swap:
1. Click a placed item; "Replace…"; pick another; verify viewer updates.
2. Force a conflict by swapping a small item for a large one; verify the toast and revert.

Share:
1. From a saved layout: Share → copy URL.
2. Open in incognito → renders without auth.
3. Revoke from owner → public URL returns "no longer available".
4. Wait past `expires_at` (or set a 10-second expiry in dev): public URL returns 404.

### Level 5: Optional Additional Validation

```bash
cd frontend
pnpm dev
# in another shell
npx playwright test e2e/phase4.spec.ts   # if Playwright is added later
```

---

## ACCEPTANCE CRITERIA

- [ ] Migrations `0002` + `0003` apply cleanly via `supabase db reset`.
- [ ] `pre-v1` git ref tagged before applying to any non-local environment.
- [ ] All Phase 4 endpoints in PRD §10 implemented and Pydantic-validated.
- [ ] Cross-user RLS test extended to projects + share tokens; passes against staging.
- [ ] Each Room enforces ≤1 primary layout via the partial unique index.
- [ ] Anon → first-project conversion produces `Project: "My first project"` + `Room: "Living room"` + the layout in one flow.
- [ ] Share link is a single-click copy; revoking it 404s the public URL within one request.
- [ ] Compare overlay renders two layouts in one viewport with smooth fade.
- [ ] Item swap respects existing `allowedSlotKinds`; AABB conflict returns 409 and reverts in UI.
- [ ] No Phase 4 endpoint mistakenly returns 403 where 404 is required (RLS miss, share-token miss).
- [ ] Service role used only inside `/share/{token}` path.
- [ ] Frontend type-checks (`pnpm typecheck`) with zero errors.
- [ ] Backend ruff + mypy + pytest all green.
- [ ] No new pip or npm dependencies added.
- [ ] Existing flat `/app/layouts` page redirects to nested URLs (deprecation comment in place).
- [ ] All `mode="shared"` `<ResultView>` instances expose zero auth-gated controls.

---

## COMPLETION CHECKLIST

- [ ] All 38 STEP-BY-STEP tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All Level 1–4 validation commands executed successfully
- [ ] Manual journey (anon → save → sign in → project → variants → compare → swap → share → revoke) green end-to-end
- [ ] `test_rls_cross_user.py` extended scenarios pass against staging
- [ ] No linting / type / test errors
- [ ] `infra/keyvault.bicep` updated and `az deployment group what-if` clean
- [ ] README + `.env.example` updated for new env vars
- [ ] PRD §12 Phase 4 deliverables checklist all checked

---

## NOTES

**Why item swap uses MVP `allowedSlotKinds` here, not tags.** PRD §12.4 explicitly says "No catalog or LLM changes" in Phase 4. Tag-based catalog ships in Phase 6. The Phase 4 swap endpoint is therefore intentionally provisional and `routers/swap.py` carries a docstring pointing to Phase 6.

**Why `0002` does NOT backfill `rooms.project_id`.** PRD §15 locks "Existing prod data wiped during v1 migration." A `pre-v1` git ref is the only rollback. This is a dev/demo phase decision, not appropriate for any phase that has real users.

**Service-role usage is intentional and scoped.** The `get_shared_layout` SQL function is the only path that bypasses RLS, and it bypasses for one row identified by token hash. The `SupabaseServiceRoleClient` Python class exists solely to call that one RPC. Any other use of `SUPABASE_SERVICE_ROLE_KEY` in Phase 4 is a bug.

**Compare overlay simplification.** Phase 4 ships group-level opacity, not per-material crossfade. Per-material crossfade may land in Phase 5 (design system pass) when the viewer renders `<Environment>` HDRI shared lighting; doing it earlier would require touching `Furniture.tsx` materials, which is out-of-scope.

**Anon → conversion atomicity.** Sequential Project → Room → Layout via three REST calls under the user JWT. No DB transaction. Server compensates by deleting earlier rows on later failure. Acceptable for Phase 4; if it proves flaky in practice, Phase 5 can replace with a single `security definer` SQL function.

**Confidence**: 7/10 for one-pass success. Risks: (a) the security-definer function and service-role client need careful auth-header isolation; (b) the `is_primary` partial unique index combined with Postgres' lack of deferrable unique-on-partial requires the `unset_other_primaries` step to run inside the same logical operation (router-level retry compensates if a race appears); (c) compare overlay correctness depends on R3F group-opacity behavior, which can be brittle for `<Environment>` HDRI scenes — verify visually before declaring done.
