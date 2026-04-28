# Feature: Phase 3 — Auth, Persistence, Polish

The following plan should be complete, but validate documentation and codebase patterns and task sanity before starting implementation.

Pay special attention to naming of existing utils, types, and models. Import from the right files. Phase 0 already shipped the SQL migration with `profiles`, `rooms`, `layouts` tables and RLS policies — re-read `supabase/migrations/0001_init.sql` before adding any DB work.

---

## Feature Description

Wire Supabase Auth into the frontend, add JWT verification + persistence routes to the FastAPI backend, and finish the user journey: anonymous Generate → click Save → login modal → persisted layout → "My Layouts" list → reload an old result → delete it. Plus a cross-user RLS pytest that gates Phase 3 sign-off, polish on the marketing landing, README run/deploy notes, and a hidden seed query param for repeatable demos.

After Phase 3, MVP is feature-complete per `.claude/PRD.md` §11 success criteria.

## User Story

As a curious homeowner,
I want to save layouts I like and come back later to compare them,
So that I can iterate across sessions without losing my work.

Plus the technical user story (`.claude/PRD.md` §5 #11 — *Tenant isolation*):

As a logged-in user,
I want strict guarantees that I can only see my own layouts,
So that data is never accidentally cross-leaked.

## Problem Statement

Phase 2 ships the full anonymous happy path (wizard → generate → 3D viewer + sidebar). Save is a disabled stub (`ResultSidebar.tsx:96-101`). There is no auth, no persistence, no "My Layouts" page, no cross-user isolation test. Without persistence the demo cannot tell the multi-session story (PRD §5 #4–5). Without an RLS test the multi-tenant claim in PRD §11 / §14 R6 is unverified.

## Solution Statement

Three layers, in order:

1. **Backend auth + persistence layer.** Implement `require_user` / `optional_user` JWT deps via Supabase JWKS (PyJWT). Add `services/supabase.py` (httpx wrapper around Supabase REST that forwards the user JWT so RLS enforces ownership). Add `routers/rooms.py` and `routers/layouts.py` with the endpoint catalogue from `.claude/reference/api.md` §4. Add `models/room.py` + extend `models/layout.py` with persisted variants.
2. **Frontend auth UX.** Add `lib/supabase.ts` browser client. Add `useSession` hook. Add `<LoginModal>` triggered on Save. Wire `useSaveLayout`, `useListLayouts`, `useGetLayout`, `useDeleteLayout`. Add `/app/layouts` listing page and `/app/result/[id]` reload page. Hidden seed via `?seed=...` query param.
3. **Tests + polish.** Cross-user RLS pytest against a real Supabase project (two test users). Marketing page screenshot + CTA. Root README with run + deploy. Demo seed list checked into `docs/`.

Persistence is its own authenticated call (`POST /layouts`) — `/generate-layout` stays anonymous (locked decision PRD §15 D).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**:
- `backend/app/deps.py` — JWT verification deps (currently stub)
- `backend/app/services/supabase.py` — new (REST wrapper)
- `backend/app/routers/rooms.py`, `backend/app/routers/layouts.py` — new
- `backend/app/models/room.py` — currently stub
- `backend/app/models/layout.py` — add persisted-row models
- `backend/app/main.py` — register new routers
- `frontend/lib/supabase.ts` — new (browser client)
- `frontend/lib/stores/auth.ts` — new (session state)
- `frontend/lib/api.ts` — extend with authed mutations + queries
- `frontend/components/auth/LoginModal.tsx` — new
- `frontend/components/sidebar/ResultSidebar.tsx` — wire Save button
- `frontend/app/app/layouts/page.tsx` — new (My Layouts list)
- `frontend/app/app/result/[id]/page.tsx` — new (reload saved layout)
- `frontend/app/(marketing)/page.tsx` — polish
- `backend/tests/test_routes_layouts.py`, `test_routes_rooms.py`, `test_rls_cross_user.py` — new

**Dependencies**:
- Backend (already installed): `pyjwt[crypto]>=2.9`, `httpx>=0.27`, `respx>=0.21` (dev). No new pip deps.
- Frontend (already installed): `@supabase/supabase-js@^2.45`. No new deps.
- External: live Supabase project (URL + anon key + JWKS endpoint) for integration tests.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `.claude/PRD.md` §5 (user stories 4, 5, 6, 11), §7 F5, §9 (security), §10 (API spec — every persistence endpoint), §11 (success criteria), §12 Phase 3, §14 R6.
- `.claude/reference/api.md` §1 (layering rules — services NEVER import fastapi), §3 (router anatomy), §4 (endpoint catalogue with status codes), §5 (auth dep template — exact code for `require_user` / `optional_user` / `_jwks` / `_decode`), §6 (Supabase REST pattern with `httpx.AsyncClient`), §8 (error mapping — esp. RLS miss → 404 not 403), §12 (test layout, cross-user RLS test), §14 (security checklist per route), §15 (common pitfalls — `extra="forbid"`, service-role bypass, raw REST JSON).
- `.claude/reference/components.md` §1 (server vs client split — auth status hook is client-only), §4 (Zustand vs server state — auth in Zustand, layouts in TanStack), §5 (`authedFetch` pattern, mutation invalidation), §10 (a11y on modals), §11 (loading/error/empty states triad).
- `supabase/migrations/0001_init.sql` (full) — `profiles`, `rooms`, `layouts` tables already exist with all RLS policies. **Do not re-create.** Columns: `rooms(id, user_id, name, room_type, width_m, length_m, height_m, created_at)`, `layouts(id, user_id, room_id, style, layout jsonb, seed bigint, thumbnail_url, created_at)`.
- `backend/app/config.py` (full) — `Settings` already has `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_ANON_KEY`. `get_settings()` is `lru_cache`.
- `backend/app/deps.py` — currently a one-line stub. This is where `require_user` / `optional_user` go.
- `backend/app/main.py` (full) — only `catalog.router` and `generate.router` wired; needs `rooms.router` and `layouts.router`.
- `backend/app/models/layout.py` (full) — already has `Layout`, `GenerateLayoutRequest`, `LayoutLLM`, `ResolvedItem`. Add `LayoutCreate`, `LayoutSummary`, `LayoutRecord` for persistence (see Patterns below).
- `backend/app/models/room.py` (full) — placeholder `RoomCreate` / `Room` exist with no fields; flesh out.
- `backend/app/routers/catalog.py` (full) — pattern for static module-level router + `_load_catalog` `lru_cache`.
- `backend/app/routers/generate.py` (full) — pattern for service-error → HTTPException mapping.
- `backend/tests/conftest.py` (full) — `client` fixture (FastAPI `TestClient`). Add `auth_headers_user_a`, `auth_headers_user_b`, `mock_supabase` fixtures.
- `backend/tests/test_routes_generate.py` (full) — pattern for `unittest.mock.patch` + `AsyncMock` on a service module to bypass external calls.
- `backend/pyproject.toml` — `pyjwt[crypto]>=2.9`, `httpx>=0.27`, `respx>=0.21` (dev) already declared. No new deps.
- `frontend/package.json` — `@supabase/supabase-js@^2.45` already installed.
- `frontend/lib/api.ts` (full) — `authedFetch` already accepts custom headers but does not pull a Supabase token. Needs: read session token from Supabase client, attach `Authorization: Bearer <jwt>` when present.
- `frontend/lib/types.ts` (full) — already mirrors `Layout`. Add `LayoutSummary`, `RoomCreate`, `RoomRecord` to mirror new Pydantic models.
- `frontend/lib/stores/wizard.ts` (full) — pattern for `create((set) => ({...}))`. Auth store mirrors this shape.
- `frontend/components/wizard/WizardShell.tsx:96-101` — `Save` button is currently `disabled`. This is where the Save flow integrates.
- `frontend/components/sidebar/ResultSidebar.tsx:79-103` — exact button container; replace the disabled Save with a real handler + login modal trigger.
- `frontend/app/providers.tsx` (full) — `QueryClientProvider` only. Wrap with auth provider here, not in `RootLayout`.
- `frontend/app/app/page.tsx` — currently always renders `WizardShell`. After Phase 3 still does — `result/[id]` is a separate route.

### New Files to Create

**Backend:**
- `backend/app/services/supabase.py` — `SupabaseRest` async httpx wrapper that forwards the user JWT
- `backend/app/routers/rooms.py` — `POST /rooms`, `GET /rooms`
- `backend/app/routers/layouts.py` — `POST /layouts`, `GET /layouts`, `GET /layouts/{id}`, `DELETE /layouts/{id}`
- `backend/tests/test_auth_deps.py` — JWT verify happy / expired / wrong-aud / no-bearer
- `backend/tests/test_routes_rooms.py` — `TestClient` + `respx` mocked Supabase REST
- `backend/tests/test_routes_layouts.py` — same, full CRUD
- `backend/tests/test_rls_cross_user.py` — integration, **real** Supabase project, two test users

**Frontend:**
- `frontend/lib/supabase.ts` — browser-side `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)`
- `frontend/lib/stores/auth.ts` — Zustand session/user state synced from `supabase.auth.onAuthStateChange`
- `frontend/lib/hooks/useSession.ts` — hook that subscribes the auth store on mount
- `frontend/components/auth/AuthProvider.tsx` — wraps children in a `useEffect` that wires `onAuthStateChange`
- `frontend/components/auth/LoginModal.tsx` — Radix `Dialog`-style modal with email magic-link + Google OAuth buttons
- `frontend/app/app/layouts/page.tsx` — "My Layouts" list (auth-gated)
- `frontend/app/app/result/[id]/page.tsx` — reload a saved layout into the viewer
- `docs/demo-seeds.md` — 3–5 known-good seed values per style for stage demos

**Frontend updates:**
- `frontend/lib/api.ts` — add `useSaveLayout`, `useListLayouts`, `useGetLayout`, `useDeleteLayout`, `useCreateRoom`. Make `authedFetch` read the Supabase session token automatically.
- `frontend/app/providers.tsx` — wrap children with `<AuthProvider>` inside the existing `<QueryClientProvider>`.
- `frontend/components/sidebar/ResultSidebar.tsx` — replace disabled Save with `onSave` handler that opens login modal if anon, otherwise calls the save mutation.
- `frontend/components/wizard/WizardShell.tsx` — pass an `onSave` callback to `<ResultSidebar>`; orchestrates create-room → save-layout → toast.
- `frontend/app/(marketing)/page.tsx` — hero screenshot, CTA to `/app`, brief feature list.
- `frontend/app/app/page.tsx` — read `?seed=` query param, pre-fill in wizard store.
- `README.md` (root) — add run/deploy section.

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [Supabase JWT verification (server-side)](https://supabase.com/docs/guides/auth/server-side) — section "Verifying with the JWT secret" / JWKS. Backend uses `JWKS_URL` to verify RS256 tokens with `aud=authenticated`.
  - Why: `_decode()` config in `.claude/reference/api.md` §5 must match what Supabase emits.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) — section "JWT-based policies".
  - Why: confirm policies in `0001_init.sql` are correct as-written and that forwarding the JWT through Supabase REST is sufficient (it is — PostgREST sets `request.jwt.claims` from the bearer).
- [Supabase REST (PostgREST) reference](https://supabase.com/docs/guides/api) — section "Authentication", "Inserts" with `Prefer: return=representation`.
  - Why: `services/supabase.py` headers and insert response shape.
- [PyJWT JWKS client](https://pyjwt.readthedocs.io/en/stable/usage.html#retrieve-rsa-signing-keys-from-a-jwks-endpoint) — `PyJWKClient.get_signing_key_from_jwt()`.
  - Why: signing key resolution + caching.
- [supabase-js auth API](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) — `signInWithOtp` (magic link), `signInWithOAuth({ provider: 'google' })`, `onAuthStateChange`, `getSession`.
  - Why: login modal + session hook.
- [Next.js App Router dynamic routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes) — `[id]` segments and `params` typing.
  - Why: `/app/result/[id]/page.tsx`.
- [TanStack Query mutation invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations).
  - Why: invalidate `["layouts"]` on save / delete.

### Patterns to Follow

**JWT auth dep (mirror `.claude/reference/api.md` §5 line-for-line):**

```python
# app/deps.py
from typing import Annotated
from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel
import jwt
from jwt import PyJWKClient
from app.config import Settings, get_settings

_jwks_clients: dict[str, PyJWKClient] = {}

def _jwks(settings: Settings) -> PyJWKClient:
    if settings.SUPABASE_JWKS_URL not in _jwks_clients:
        _jwks_clients[settings.SUPABASE_JWKS_URL] = PyJWKClient(
            settings.SUPABASE_JWKS_URL, cache_keys=True, lifespan=600
        )
    return _jwks_clients[settings.SUPABASE_JWKS_URL]


class AuthUser(BaseModel):
    id: str
    email: str | None = None
    jwt: str


def require_user(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthUser:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = auth.removeprefix("Bearer ")
    try:
        signing_key = _jwks(settings).get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token, signing_key,
            algorithms=["RS256"], audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="invalid token") from e
    return AuthUser(id=claims["sub"], email=claims.get("email"), jwt=token)


def optional_user(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthUser | None:
    if "authorization" not in request.headers:
        return None
    return require_user(request, settings)
```

Note: `AuthUser.jwt` carries the raw token so services can forward it to Supabase REST. Routers do not log it.

**Supabase REST wrapper** (mirror `.claude/reference/api.md` §6):

```python
# app/services/supabase.py
import httpx
from app.config import Settings


class SupabaseError(Exception): ...
class SupabaseNotFound(SupabaseError): ...


class SupabaseRest:
    def __init__(self, settings: Settings, user_jwt: str) -> None:
        self._client = httpx.AsyncClient(
            base_url=f"{settings.SUPABASE_URL}/rest/v1",
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "authorization": f"Bearer {user_jwt}",
                "content-type": "application/json",
                "prefer": "return=representation",
            },
            timeout=10.0,
        )

    async def __aenter__(self) -> "SupabaseRest": return self
    async def __aexit__(self, *exc) -> None: await self._client.aclose()

    async def insert_room(self, row: dict) -> dict: ...
    async def list_rooms(self) -> list[dict]: ...
    async def insert_layout(self, row: dict) -> dict: ...
    async def list_layouts(self) -> list[dict]: ...
    async def get_layout(self, layout_id: str) -> dict: ...   # raises SupabaseNotFound on 0 rows
    async def delete_layout(self, layout_id: str) -> None: ...
```

Each method: `r = await self._client.<method>(...)`; `if r.status_code == 404 or no rows: raise SupabaseNotFound(...)`; otherwise `r.raise_for_status()`; return parsed JSON.

**Pydantic persistence models** (extend `app/models/layout.py` and `app/models/room.py`):

```python
# app/models/room.py
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class RoomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    name: str = Field(min_length=1, max_length=80)
    roomType: Literal["living_room"]
    width_m: float = Field(ge=2, le=12)
    length_m: float = Field(ge=2, le=12)
    height_m: float = Field(ge=2.2, le=4)


class RoomRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str
    room_type: str
    width_m: float
    length_m: float
    height_m: float
    created_at: str
```

```python
# additions to app/models/layout.py
class LayoutCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    roomId: str
    layout: Layout


class LayoutSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    room_id: str
    style: Style
    seed: int | None = None
    thumbnail_url: str | None = None
    created_at: str


class LayoutRecord(LayoutSummary):
    layout: Layout
```

**Router** (mirror `app/routers/generate.py`):

```python
# app/routers/layouts.py
from fastapi import APIRouter, Depends, HTTPException, status
from app.deps import require_user, AuthUser
from app.config import Settings, get_settings
from app.models.layout import LayoutCreate, LayoutRecord, LayoutSummary, Layout
from app.services.supabase import SupabaseRest, SupabaseNotFound

router = APIRouter(prefix="/layouts", tags=["layouts"])


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_layout(
    body: LayoutCreate,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    async with SupabaseRest(settings, user.jwt) as sb:
        try:
            row = await sb.insert_layout({
                "user_id": user.id,
                "room_id": body.roomId,
                "style": body.layout.style,
                "layout": body.layout.model_dump(),
                "seed": body.layout.seed,
            })
        except SupabaseNotFound as e:
            raise HTTPException(status_code=404, detail="room not found") from e
    return {"id": row["id"]}
```

Repeat shape for GET / DELETE / list. All 404s on not-found, never 403, never "exists but not yours" (`.claude/reference/api.md` §4 + §15).

**Frontend Supabase client + auth hook** (mirror existing Zustand pattern in `frontend/lib/stores/wizard.ts`):

```ts
// frontend/lib/supabase.ts
"use client";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

```ts
// frontend/lib/stores/auth.ts
import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

type AuthStore = {
  session: Session | null;
  user: User | null;
  setSession: (s: Session | null) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  setSession: (session) => set({ session, user: session?.user ?? null }),
}));
```

```tsx
// frontend/components/auth/AuthProvider.tsx
"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/stores/auth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [setSession]);
  return <>{children}</>;
}
```

**Authed fetch token attach** (update `frontend/lib/api.ts`):

```ts
import { supabase } from "@/lib/supabase";

export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.status === 204 ? (undefined as T) : res.json();
}
```

The 204 handling is required for `DELETE /layouts/{id}`.

**Cross-user RLS test** (gates Phase 3 sign-off — `.claude/PRD.md` §14 R6):

```python
# backend/tests/test_rls_cross_user.py
import os
import pytest
import httpx

# Skip when test creds missing — CI runs with them set as secrets
pytestmark = pytest.mark.skipif(
    not os.getenv("SUPABASE_TEST_USER_A_JWT"),
    reason="cross-user RLS test requires SUPABASE_TEST_USER_{A,B}_JWT env vars",
)

API = os.environ["INTERIOR_FLOW_API_URL"]
JWT_A = os.environ["SUPABASE_TEST_USER_A_JWT"]
JWT_B = os.environ["SUPABASE_TEST_USER_B_JWT"]

async def test_user_b_cannot_read_user_a_layout():
    async with httpx.AsyncClient(base_url=API, timeout=10.0) as c:
        # User A creates room + layout
        room = (await c.post("/rooms", headers={"authorization": f"Bearer {JWT_A}"}, json={...})).json()
        layout = (await c.post("/layouts", headers={"authorization": f"Bearer {JWT_A}"}, json={"roomId": room["id"], "layout": {...}})).json()

        # User B tries to read it — must be 404, NOT 403, NOT 200
        r = await c.get(f"/layouts/{layout['id']}", headers={"authorization": f"Bearer {JWT_B}"})
        assert r.status_code == 404
```

**Common pitfalls** (`.claude/reference/api.md` §15):
- Forgetting `extra="forbid"` on `LayoutCreate` / `RoomCreate`. Adding fields silently passes; Supabase rejects on unknown column. Forbid extras everywhere on wire models.
- Returning raw Supabase REST JSON. `services/supabase.py` returns `dict`; routers parse into Pydantic before returning. Never `return r.json()` from a router.
- Using the service-role key from a request handler. Never. Always forward the user JWT — RLS is the gate.
- Returning 403 instead of 404 on RLS miss. Leaks existence. RLS misses produce 0 rows from PostgREST → `SupabaseNotFound` → 404.
- Logging the JWT or full prompt. `AuthUser.jwt` is for forwarding only; never log it.

---

## IMPLEMENTATION PLAN

### Phase 1: Backend Auth Foundation

Goal: routes can identify a user via JWT before any persistence is wired.

- Implement `require_user`, `optional_user`, `AuthUser` in `app/deps.py`.
- Configure JWKS client with 10-minute cache.
- Unit-test happy path + expired + wrong-audience + missing-header.

### Phase 2: Backend Persistence

Goal: full `/rooms` + `/layouts` CRUD against Supabase REST with RLS.

- Add `SupabaseRest` httpx wrapper, typed errors (`SupabaseError`, `SupabaseNotFound`).
- Flesh out `models/room.py`; extend `models/layout.py` with `LayoutCreate`, `LayoutSummary`, `LayoutRecord`.
- Build `routers/rooms.py` and `routers/layouts.py` per endpoint catalogue (`api.md` §4).
- Register both in `main.py`.
- Unit-test routers with `respx`-mocked Supabase REST.

### Phase 3: Frontend Auth Plumbing

Goal: app knows whether the user is signed in; token attaches to API calls automatically.

- Add `lib/supabase.ts`, `lib/stores/auth.ts`, `components/auth/AuthProvider.tsx`.
- Wrap `<Providers>` so auth is available everywhere.
- Update `authedFetch` to attach `Authorization: Bearer <jwt>` from the Supabase session.
- Mirror new backend models in `lib/types.ts`.

### Phase 4: Frontend Save / Login Flow

Goal: clicking Save persists, prompting login if anon.

- Build `<LoginModal>` with magic-link + Google OAuth (Radix-style dialog, native focus management).
- Wire `useSaveLayout` + `useCreateRoom` mutations.
- Replace disabled Save in `ResultSidebar.tsx` with a real handler:
  - if no session → open `<LoginModal>` (post-login: re-trigger save).
  - if session → create room (or reuse) → save layout → toast.
- After save: navigate to `/app/result/{id}` (so URL is shareable across sessions of the same user).

### Phase 5: My Layouts + Reload

Goal: a user can list, open, and delete their saved layouts.

- `/app/layouts/page.tsx` — auth-gated; lists `LayoutSummary[]` with style + created_at + delete button.
- `/app/result/[id]/page.tsx` — auth-gated; fetches `LayoutRecord` and rehydrates the existing `<Scene>` + `<ResultSidebar>` (no wizard).
- `useDeleteLayout` invalidates `["layouts"]` and navigates back to the list.

### Phase 6: Polish + Demo Hooks

Goal: ship-ready demo surface.

- Hidden seed: `/app/page.tsx` reads `?seed=12345` from `useSearchParams`; pre-populates wizard store seed.
- Marketing landing: `/(marketing)/page.tsx` gets a hero shot (placeholder PNG until a real screenshot exists), CTA → `/app`, 3-bullet feature list.
- Loading/error/empty states on every new page (`.claude/reference/components.md` §11).
- Root `README.md` run/deploy section.
- `docs/demo-seeds.md` with 3 known-good seeds per style.

### Phase 7: Cross-User RLS Integration Test (gates sign-off)

Goal: prove tenant isolation against a real Supabase project.

- Provision two test users in the Supabase project (manual one-time, or seed script).
- Capture their access tokens via `supabase.auth.signInWithPassword` for the test fixture.
- Implement `tests/test_rls_cross_user.py` per the pattern above.
- Hit the deployed (or `uvicorn`-running) API, not just `TestClient` — verifies the JWKS round-trip too.
- This test passing is the gate for closing Phase 3.

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 1. UPDATE `backend/app/deps.py`
- **IMPLEMENT**: `require_user`, `optional_user`, `AuthUser` (with `jwt: str` field), `_jwks()` cache helper.
- **PATTERN**: `.claude/reference/api.md` §5 (verbatim, plus `jwt` field on `AuthUser`).
- **IMPORTS**: `jwt`, `jwt.PyJWKClient`, `pydantic.BaseModel`, `fastapi.{Depends, HTTPException, Request, status}`, `app.config.{Settings, get_settings}`, `typing.Annotated`.
- **GOTCHA**: `audience="authenticated"` is what Supabase emits; `algorithms=["RS256"]`; `options={"require": ["exp", "sub"]}`. Never accept `none` / HMAC.
- **GOTCHA**: cache JWKS clients keyed on `SUPABASE_JWKS_URL`, lifespan=600. Don't refetch keys per request.
- **VALIDATE**: `cd backend && uv run mypy app && uv run ruff check app/deps.py`

### 2. CREATE `backend/tests/test_auth_deps.py`
- **IMPLEMENT**: 4 tests — happy path (mock signing key + valid claims), missing bearer → 401, expired → 401, wrong audience → 401. Use `unittest.mock.patch` on `app.deps._jwks` to inject a fake `PyJWKClient`. Test via `TestClient` mounting a tiny test route that depends on `require_user`.
- **PATTERN**: `backend/tests/test_routes_generate.py` for the patch pattern; `backend/tests/conftest.py` for the `client` fixture.
- **IMPORTS**: `unittest.mock.patch`, `jwt`, `pytest`.
- **GOTCHA**: Don't talk to a real JWKS endpoint in unit tests. Use `jwt.encode(..., key=fake_rsa_priv)` to mint test tokens.
- **VALIDATE**: `cd backend && uv run pytest tests/test_auth_deps.py -v`

### 3. UPDATE `backend/app/models/room.py`
- **IMPLEMENT**: `RoomCreate(BaseModel, frozen=True, extra="forbid")` with `name`, `roomType: Literal["living_room"]`, `width_m`, `length_m`, `height_m` (matching `0001_init.sql` constraints). `RoomRecord` with `id`, `name`, `room_type`, `width_m`, `length_m`, `height_m`, `created_at`.
- **PATTERN**: `backend/app/models/layout.py:31-41` for `Field(ge=..., le=...)`.
- **GOTCHA**: column names use snake_case (`room_type`); request field is `roomType` (camelCase). Map at the service boundary, not the model.
- **VALIDATE**: `cd backend && uv run mypy app/models/room.py`

### 4. UPDATE `backend/app/models/layout.py`
- **ADD**: `LayoutCreate(BaseModel, frozen=True, extra="forbid")` with `roomId: str`, `layout: Layout`. `LayoutSummary(BaseModel, extra="forbid")` with `id`, `room_id`, `style`, `seed`, `thumbnail_url`, `created_at`. `LayoutRecord(LayoutSummary)` adds `layout: Layout`.
- **PATTERN**: existing models in same file.
- **GOTCHA**: do not import anything from `services/`; models stay framework-free.
- **VALIDATE**: `cd backend && uv run mypy app/models/layout.py && uv run ruff check app/models/`

### 5. CREATE `backend/app/services/supabase.py`
- **IMPLEMENT**: `SupabaseError`, `SupabaseNotFound` exceptions. `SupabaseRest(settings, user_jwt)` async context manager wrapping `httpx.AsyncClient` with the headers from §6. Methods: `insert_room`, `list_rooms`, `insert_layout`, `list_layouts(select=summary)`, `get_layout`, `delete_layout`.
- **PATTERN**: `.claude/reference/api.md` §6.
- **IMPORTS**: `httpx`, `app.config.Settings`. **Never** `fastapi`.
- **GOTCHA**: `.eq.` filter syntax is PostgREST's. Use `params={"id": f"eq.{layout_id}"}`. Empty result list → raise `SupabaseNotFound`.
- **GOTCHA**: list-layouts query selects only summary columns: `select=id,room_id,style,seed,thumbnail_url,created_at` so we don't ship full layout JSON for the list view.
- **GOTCHA**: `delete_layout` returns 200 with `[]` when RLS hides the row → also raise `SupabaseNotFound`.
- **VALIDATE**: `cd backend && uv run mypy app/services/supabase.py && uv run ruff check app/services/supabase.py`

### 6. CREATE `backend/app/routers/rooms.py`
- **IMPLEMENT**: `APIRouter(prefix="/rooms", tags=["rooms"])`. `POST ""` → `201` returning `RoomRecord`. `GET ""` → `200` returning `list[RoomRecord]`. Both depend on `require_user` and `get_settings`.
- **PATTERN**: `backend/app/routers/generate.py`.
- **IMPORTS**: `fastapi.{APIRouter, Depends, HTTPException, status}`, `app.deps.{require_user, AuthUser}`, `app.config.{Settings, get_settings}`, `app.models.room.{RoomCreate, RoomRecord}`, `app.services.supabase.{SupabaseRest, SupabaseNotFound}`.
- **GOTCHA**: pass `body.model_dump()` plus `"user_id": user.id`. Even though RLS would also enforce ownership via `with check (auth.uid() = user_id)`, set it explicitly so insert returns the correct row.
- **GOTCHA**: catch `SupabaseNotFound` → 404; let other `httpx.HTTPStatusError` bubble (FastAPI logs trace and returns 500).
- **VALIDATE**: `cd backend && uv run mypy app/routers/rooms.py`

### 7. CREATE `backend/app/routers/layouts.py`
- **IMPLEMENT**: `POST ""` → `201` returning `{"id": "..."}`. `GET ""` → `200` returning `list[LayoutSummary]`. `GET "/{layout_id}"` → `200` returning `LayoutRecord`. `DELETE "/{layout_id}"` → `204` no body.
- **PATTERN**: same as `rooms.py`.
- **IMPORTS**: as in §6 plus the new layout models.
- **GOTCHA**: `response_model` always set, even on 204 — use `response_model=None, status_code=204` and return `Response(status_code=204)`.
- **GOTCHA**: parse Supabase row into `LayoutRecord.model_validate(row)` before returning. Don't ship the raw dict.
- **GOTCHA**: 404 on every "not found" path (RLS miss or true miss). Never 403 (`api.md` §4).
- **VALIDATE**: `cd backend && uv run mypy app/routers/layouts.py`

### 8. UPDATE `backend/app/main.py`
- **ADD**: `from app.routers import layouts, rooms` and `app.include_router(layouts.router); app.include_router(rooms.router)`.
- **PATTERN**: existing `include_router` calls.
- **VALIDATE**: `cd backend && uv run uvicorn app.main:app --port 8000 &  curl -s http://127.0.0.1:8000/openapi.json | python -c "import sys,json;d=json.load(sys.stdin);print(sorted(d['paths']))"` — confirms `/layouts` and `/rooms` are registered.

### 9. CREATE `backend/tests/test_routes_rooms.py`
- **IMPLEMENT**: `respx`-mocked Supabase REST. Tests: missing token → 401; valid token + create → 201 + body shape; valid token + list → 200 + array.
- **PATTERN**: `backend/tests/test_routes_generate.py` for `TestClient`; `respx` docs for mocking httpx.
- **IMPORTS**: `respx`, `pytest`, `unittest.mock.patch` for `_jwks`.
- **GOTCHA**: also patch `_jwks` so JWT verify uses a stub signing key. Treat the JWT happy-path scaffolding as a `conftest.py` fixture (`auth_headers_user_a`) so it's reused across `test_routes_layouts.py`.
- **VALIDATE**: `cd backend && uv run pytest tests/test_routes_rooms.py -v`

### 10. CREATE `backend/tests/test_routes_layouts.py`
- **IMPLEMENT**: full CRUD coverage: create / list / get / delete happy path; missing token → 401 each; missing layout → 404 (mock Supabase REST returning empty list).
- **PATTERN**: §9 above.
- **VALIDATE**: `cd backend && uv run pytest tests/test_routes_layouts.py -v`

### 11. UPDATE `backend/tests/conftest.py`
- **ADD**: `auth_headers_user_a` and `auth_headers_user_b` fixtures producing valid bearer headers signed by a fake RSA key, paired with a `_jwks` patch fixture so `require_user` accepts them.
- **PATTERN**: existing `client` and `catalog_items` fixtures.
- **VALIDATE**: tests in §9–10 pass.

### 12. UPDATE `frontend/lib/types.ts`
- **ADD**: `LayoutSummary`, `LayoutRecord`, `RoomCreate`, `RoomRecord` types mirroring the backend Pydantic models.
- **PATTERN**: existing `Layout`, `GenerateRequest` types.
- **VALIDATE**: `cd frontend && pnpm typecheck`

### 13. CREATE `frontend/lib/supabase.ts`
- **IMPLEMENT**: `export const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)`.
- **PATTERN**: see Patterns above.
- **GOTCHA**: file is `"use client"`. Never import in a Server Component path.
- **VALIDATE**: `cd frontend && pnpm typecheck`

### 14. CREATE `frontend/lib/stores/auth.ts`
- **IMPLEMENT**: Zustand store with `session`, `user`, `setSession`. Selectors only — no async actions.
- **PATTERN**: `frontend/lib/stores/wizard.ts`.
- **VALIDATE**: `cd frontend && pnpm typecheck`

### 15. CREATE `frontend/components/auth/AuthProvider.tsx`
- **IMPLEMENT**: `"use client"` component that on mount calls `supabase.auth.getSession()` and subscribes to `onAuthStateChange`, pushing into `useAuthStore`. Returns `<>{children}</>`.
- **PATTERN**: see Patterns above.
- **GOTCHA**: unsubscribe in cleanup; otherwise hot reload duplicates listeners.
- **VALIDATE**: `cd frontend && pnpm typecheck && pnpm lint`

### 16. UPDATE `frontend/app/providers.tsx`
- **ADD**: import `AuthProvider`; wrap children: `<QueryClientProvider><AuthProvider>{children}</AuthProvider></QueryClientProvider>`.
- **PATTERN**: existing file.
- **VALIDATE**: `cd frontend && pnpm dev` and confirm no console errors when loading `/app`.

### 17. UPDATE `frontend/lib/api.ts`
- **MODIFY**: `authedFetch` reads token from `supabase.auth.getSession()`, attaches `Authorization` header when present. Handle 204 (return undefined). Add `useCreateRoom`, `useSaveLayout`, `useListLayouts(opts)`, `useGetLayout(id)`, `useDeleteLayout` hooks.
- **PATTERN**: existing `useGenerateLayout`; `.claude/reference/components.md` §5.
- **GOTCHA**: invalidate `["layouts"]` on save and delete via `useQueryClient`.
- **GOTCHA**: `useListLayouts` `enabled: !!session` so unauthenticated callers don't fire the request.
- **VALIDATE**: `cd frontend && pnpm typecheck && pnpm lint`

### 18. CREATE `frontend/components/auth/LoginModal.tsx`
- **IMPLEMENT**: controlled modal (open/onOpenChange props). Buttons: "Continue with Google" (`supabase.auth.signInWithOAuth({ provider: 'google' })`) and "Send magic link" (form with email → `signInWithOtp`). Show success/error states inline. Trap focus, ESC closes, click-outside closes.
- **PATTERN**: `.claude/reference/components.md` §3 (component anatomy, `cn()`, `aria-*`); §10 (a11y).
- **GOTCHA**: redirect URL on OAuth must match Supabase Auth allow-list (project setting). Note in README.
- **VALIDATE**: `cd frontend && pnpm dev`; manually test: open modal, magic link sends email, OAuth round-trips back into a session.

### 19. UPDATE `frontend/components/sidebar/ResultSidebar.tsx`
- **REPLACE**: disabled Save button at lines 96–101 with `<button onClick={onSave}>Save</button>`. Add `onSave` prop. Show loading + saved states.
- **PATTERN**: existing Regenerate button styling.
- **VALIDATE**: `cd frontend && pnpm typecheck`

### 20. UPDATE `frontend/components/wizard/WizardShell.tsx`
- **ADD**: `onSave` callback. If `useAuthStore.session` is null → set local state `loginOpen=true`. Else → run `useCreateRoom` mutation (or reuse a per-session room id) → on success run `useSaveLayout` mutation → on success navigate to `/app/result/{id}`. Show toast on error.
- **PATTERN**: existing `handleGenerate` pattern with `mutate` + `onSuccess`/`onError`.
- **GOTCHA**: stash a `pendingSave` ref so a Save click that triggered the modal re-fires automatically once the user signs in.
- **VALIDATE**: `cd frontend && pnpm dev`; full flow: anon generate → Save → login modal → magic link → save → redirect.

### 21. CREATE `frontend/app/app/layouts/page.tsx`
- **IMPLEMENT**: `"use client"`. Reads `useAuthStore`. If no session → render "Sign in to view your layouts" + login button. Else `useListLayouts()` and render a list of cards (style, created_at, delete button). Empty state: "No saved layouts yet — go design one" + CTA to `/app`.
- **PATTERN**: `.claude/reference/components.md` §11 (loading/error/empty triad).
- **VALIDATE**: `cd frontend && pnpm typecheck`

### 22. CREATE `frontend/app/app/result/[id]/page.tsx`
- **IMPLEMENT**: `"use client"`. Reads `params.id`. `useGetLayout(id)`. Renders the same `<Scene>` + `<ResultSidebar>` composition as `WizardShell.tsx:75-103`, but with no Adjust/Generate path — instead a "Design another" CTA back to `/app`. Auth-gated via redirect on missing session.
- **PATTERN**: `WizardShell.tsx:75-103`.
- **GOTCHA**: extract the result view from `WizardShell` into a shared `<ResultView>` component to avoid duplication. Update `WizardShell` to use it.
- **VALIDATE**: manual: save a layout, copy the URL, hit it directly — page rehydrates the 3D scene.

### 23. UPDATE `frontend/app/app/page.tsx`
- **ADD**: `useSearchParams()`; if `?seed=` present and parseable as int, call `useWizardStore.setSeed(...)` on mount.
- **PATTERN**: Next.js `useSearchParams` docs.
- **GOTCHA**: must be `"use client"` for hooks. Wrap the call in `<Suspense>` if it triggers SSR-bailout warnings.
- **VALIDATE**: `pnpm dev`; visit `/app?seed=12345` → state shows seed pre-loaded.

### 24. UPDATE `frontend/app/(marketing)/page.tsx`
- **IMPLEMENT**: hero (title, 1-line value prop, CTA → `/app`), 3-bullet feature list ("Pick a style. Pick preferences. See it in 3D."), placeholder hero image. No auth gate.
- **PATTERN**: `.claude/reference/components.md` §1 (Server Components for marketing).
- **GOTCHA**: do NOT bundle `<Scene>` here — it's heavy. Use a static screenshot instead.
- **VALIDATE**: `pnpm build`; check `/` output is small.

### 25. CREATE `docs/demo-seeds.md`
- **IMPLEMENT**: Markdown table of `style → seed → 1-line description` for 3 known-good seeds per style (9 total). Generate them by running the wizard locally and recording seeds whose layouts look great.
- **PATTERN**: doc-only.
- **VALIDATE**: each seed reproduces its layout when used via `?seed=...`.

### 26. UPDATE `README.md`
- **ADD**: "Run locally" (frontend + backend), "Environment variables" pointers to `.env.example`, "Supabase setup" (run `0001_init.sql`, configure OAuth redirect URLs, copy URL + anon + JWKS keys), "Deploy" (Vercel + Container Apps Bicep), "Demo seeds" link.
- **PATTERN**: existing scaffolding READMEs in similar repos.
- **VALIDATE**: a fresh checkout + `pnpm install` + `uv sync` + `.env` populated → both servers run from README instructions alone.

### 27. CREATE `backend/tests/test_rls_cross_user.py`
- **IMPLEMENT**: pattern from §Patterns. Skip when env vars absent. User A creates a layout; User B GET / DELETE on that id → both 404. User A GET → 200.
- **PATTERN**: see Patterns.
- **GOTCHA**: this test runs against a real (test) Supabase project. Local dev devs without the secrets will see it skipped. CI runs it with secrets configured.
- **GOTCHA**: target the running API URL (`INTERIOR_FLOW_API_URL`) — TestClient bypasses JWKS network round-trip.
- **VALIDATE**: `INTERIOR_FLOW_API_URL=... SUPABASE_TEST_USER_A_JWT=... SUPABASE_TEST_USER_B_JWT=... uv run pytest tests/test_rls_cross_user.py -v`

### 28. ADD test secrets to CI
- **UPDATE**: `.github/workflows/backend.yml` to inject `SUPABASE_TEST_USER_{A,B}_JWT` and `INTERIOR_FLOW_API_URL` from repo secrets, gated to PRs against `main`.
- **PATTERN**: existing workflow.
- **GOTCHA**: tokens expire — use a refresh token + a small step to mint fresh access tokens at job start, OR use long-lived service-role-issued JWTs from a script. Prefer the refresh-token approach so RLS still applies.
- **VALIDATE**: PR CI run shows `test_rls_cross_user.py` as `passed` (not `skipped`).

---

## TESTING STRATEGY

### Unit Tests

- `test_auth_deps.py` — JWT verify happy + 4 failure modes.
- `test_routes_rooms.py` — POST + GET happy + auth-failure + validation-failure.
- `test_routes_layouts.py` — full CRUD happy + auth-failure + 404 for missing/foreign + validation-failure.
- Frontend: minimal Vitest tests on `<LoginModal>` (renders, magic link form valid email gating). Vitest infra is post-MVP per `CLAUDE.md` — defer if frontend test infra not yet wired.

### Integration Tests

- `test_rls_cross_user.py` — real Supabase, two users, must return 404 on cross-read.
- Manual end-to-end: anon generate → Save → login → reload → list → delete.

### Edge Cases

- Save click → login modal → user closes modal → no save fires; reopens → save fires once.
- Save with stale session (token expired between page load and click) → 401 → frontend refreshes session and retries once.
- `?seed=NaN` or `?seed=-1` → ignore, fall through to default (random) seed.
- DELETE on a layout the current user does not own → 404 (RLS, not 403).
- DELETE on an already-deleted id → 404 (idempotent on the API surface).
- List layouts when user has none → empty array (200), frontend shows empty state.
- Create layout referencing a `roomId` the user doesn't own → 404 (RLS hides FK target row).

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
# backend
cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app

# frontend
cd frontend && pnpm lint && pnpm typecheck
```

### Level 2: Unit Tests

```bash
cd backend && uv run pytest -v --ignore=tests/test_rls_cross_user.py
```

### Level 3: Integration Tests

```bash
# requires deployed (or locally running) API + two test users in Supabase
INTERIOR_FLOW_API_URL=http://localhost:8000 \
SUPABASE_TEST_USER_A_JWT=... \
SUPABASE_TEST_USER_B_JWT=... \
cd backend && uv run pytest tests/test_rls_cross_user.py -v
```

### Level 4: Manual Validation

1. Anon flow: open `/`, click CTA → `/app`, fill wizard, generate, see result, click Save → login modal opens.
2. Auth flow: send magic link to a real inbox, click link, return to app, Save fires automatically, redirected to `/app/result/{uuid}`.
3. List flow: visit `/app/layouts`, see the saved entry with correct style + date.
4. Reload flow: click an entry → `/app/result/{id}` reloads the 3D scene.
5. Delete flow: click delete → entry disappears from list; navigating directly to its old id returns 404.
6. Cross-user (manual): sign in as user B, paste user A's `/app/result/{id}` URL → 404 not 200.
7. Seed flow: visit `/app?seed=12345`, generate, note seed in result. Re-visit same URL → same seed shown in wizard pre-fill.
8. WebGL fallback: disable WebGL in DevTools → result page degrades to sidebar list, doesn't crash.

### Level 5: Additional Validation

```bash
# Lighthouse on result page (perf budget per PRD §11: ≥80 desktop)
npx lighthouse http://localhost:3000/app/result/<id> --only-categories=performance --view

# .glb budget check
du -sh frontend/public/models/   # must be ≤10 MB total
```

---

## ACCEPTANCE CRITERIA

- [ ] Anonymous user can complete wizard + see result (no regression from Phase 2).
- [ ] Save click on anon opens login modal; on auth saves directly.
- [ ] Magic link + Google OAuth both produce a usable session.
- [ ] `POST /rooms`, `POST /layouts`, `GET /layouts`, `GET /layouts/{id}`, `DELETE /layouts/{id}` all return per `.claude/reference/api.md` §4 status codes.
- [ ] Saved layouts appear in `/app/layouts`.
- [ ] Visiting `/app/result/{id}` rehydrates the same scene.
- [ ] User B receives 404 (not 403, not 200) on User A's layout via REST.
- [ ] `test_rls_cross_user.py` passes in CI.
- [ ] All Level 1 + Level 2 commands return zero errors.
- [ ] Marketing page loads in <1 s on desktop and shows hero + CTA + 3 bullets.
- [ ] README has a copy-paste runbook that brings up the full stack locally.
- [ ] `docs/demo-seeds.md` lists 3 known-good seeds per style.

---

## COMPLETION CHECKLIST

- [ ] All 28 tasks completed in order.
- [ ] Each task validation passed immediately.
- [ ] All Level 1–4 validation commands executed successfully.
- [ ] `test_rls_cross_user.py` passes against deployed API.
- [ ] No `mypy` / `ruff` / `pnpm lint` / `pnpm typecheck` errors.
- [ ] Manual flow #1–8 verified.
- [ ] No raw JWTs, full prompts, or Supabase service-role keys logged anywhere (grep `services/`, `routers/`).
- [ ] `extra="forbid"` on every wire model added in this phase.
- [ ] No `from fastapi import` inside `services/`.
- [ ] PRD §11 success criteria all met.

---

## NOTES

**Trade-offs:**

- **Magic link + Google OAuth, not email/password.** Magic link is simpler (no password reset UI), Google OAuth is one-click. Skipping email/password keeps the UI surface minimal.
- **No room reuse heuristic in MVP.** Each Save creates a fresh `Room` row; the user does not see "rooms" as a concept. Post-MVP we can group layouts under a single named room.
- **`thumbnail_url` is reserved but unused.** PRD lists it; rendering thumbnails is a post-MVP enhancement (server-side R3F or `<Detailed>`-style snapshot). The column exists; the value stays `null`.
- **Session token in `AuthUser`** is mildly icky but lets the service layer forward it to PostgREST without re-parsing the request. Keep it private (`repr=False` on the field if `pydantic` is verbose; never log).
- **Cross-user test in CI** depends on long-lived test users. Document rotation: every 90 days, regenerate test-user passwords via the Supabase admin UI; CI secret refresh is a 5-minute task.

**Risks:**

- **R6 (PRD §14):** RLS misconfiguration. Mitigation: `test_rls_cross_user.py` blocks Phase 3 sign-off.
- **JWKS endpoint outage** during cold-start would 500 every authed request. Mitigation: 10-minute in-process cache + `minReplicas: 1` for demo windows. Post-MVP: add a stale-cache fallback (return a recent-but-expired key for ~5 more minutes if JWKS is unreachable).
- **OAuth redirect drift** between Vercel preview deploys and Supabase Auth allow-list. Mitigation: README documents the allow-list pattern; configure once with the `*-vercel.app` wildcard if Supabase supports it (verify against current docs before relying on it — they may not).
- **PostgREST 404 vs empty-list ambiguity.** Some PostgREST versions return 200 + `[]` for "row not found via RLS" and others 404. `services/supabase.py` normalizes both into `SupabaseNotFound` to ensure consistent 404 mapping in routers.

**Locked decisions to honor (PRD §15):**

- Anon Generate, login required to Save (decision C).
- Explicit Save button, no auto-save (decision D).
- Service role never used for end-user requests (api.md §5).

**Confidence Score**: 7/10 for one-pass success.

Risks against the score: the cross-user RLS test depends on real Supabase test users that don't exist yet; OAuth redirect URLs require manual Supabase project config that the executing agent can't do. The agent should call out both as preconditions before starting and stop if blocked.
