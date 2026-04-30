# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## On-Demand Reference Docs

Read the matching doc **before** starting work in that area. They contain the standards for naming, structure, error handling, performance, and pitfalls.

| When working on… | Read |
|---|---|
| Frontend components (`frontend/`) — shell, wizard, R3F viewer, sidebar, projects/rooms/layouts pages, design tokens | [`.claude/reference/components.md`](.claude/reference/components.md) |
| API endpoints (`backend/`) — FastAPI routers, Pydantic models, services, auth, two-pass LLM, Supabase, share tokens, rate limit | [`.claude/reference/api.md`](.claude/reference/api.md) |
| Product scope, user stories, decisions, schemas, phase status | [`.claude/PRD.md`](.claude/PRD.md) |

---

## Project Overview

**Interior Flow 3D** — AI-powered 3D interior design copilot. Users organize work as **Projects → Rooms → Layouts**. For each Layout, user enters dimensions, picks a style, picks up to 2 preferences, and the app generates a 3D scene with furniture from a tagged catalog, a wall/floor/accent palette, and a first-person designer rationale.

**v1 scope:** 4 room types (`living_room`, `bedroom`, `dining_room`, `home_office`), 5 styles (`scandinavian`, `minimal`, `industrial`, `japandi`, `mid_century`), ~40-item tagged catalog, anonymous Generate (IP rate-limited 10/24h), login required to Save, named sibling layout variants, signed read-only share links, soft Pro affordances (no billing wired). Full spec lives in `.claude/PRD.md` — read it when you need product or scope context before changing behaviour.

The codebase is a polyglot monorepo:

- `frontend/` — Next.js 14 App Router + R3F 3D viewer + light/dark design system
- `backend/` — FastAPI + Pydantic v2, calls Azure OpenAI (two-pass), talks to Supabase
- `supabase/` — SQL migrations (Postgres + RLS)
- `infra/` — Azure Bicep for Container Apps + Key Vault + Blob/Front Door

The LLM never emits coordinates. **Generation is two-pass**: Pass 1 picks zones + item budget + style emphasis from a small enum; Pass 2 runs in parallel per zone, picking `catalogId + slot` from a server-filtered tag-compatible candidate list. The backend resolves slots to `(position, rotation_y)` via a pure room-type-aware function and runs an AABB collision pass with `StyleProfile`-driven margins before returning the Layout.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 (App Router) + TypeScript | Frontend framework |
| React 18 + Tailwind CSS | UI |
| React Three Fiber + @react-three/drei | 3D scene (`OrbitControls`, `useGLTF`, `Environment`, `Instances`, `Bounds`, `Html`) |
| three.js (`KTX2Loader`, `MeshoptDecoder`) | Asset decoding |
| Geist Sans (display) + Inter (body) via `next/font` | Type pairing |
| `next-themes` | Light + dark mode |
| Zustand | Wizard + selection state |
| TanStack Query | Server state / API calls |
| Radix + shadcn/ui | Form/modal primitives |
| FastAPI (Python 3.12) | Backend HTTP |
| Pydantic v2 | Schema validation, single source of truth |
| openai SDK (Azure endpoint) | LLM client (gpt-4o, JSON schema strict mode) |
| `asyncio.gather` | Pass 2 parallelism |
| Supabase | Auth + Postgres + RLS + Storage (thumbnails) |
| PyJWT + cryptography | JWT verification via Supabase JWKS (RS256/ES256) |
| pytest + pytest-asyncio | Backend tests |
| Azure Container Apps | Backend hosting |
| Azure Blob + Front Door CDN | Catalog assets (.glb, HDRI) |
| Azure Key Vault | Secrets |
| Vercel | Frontend hosting |
| `gltfpack` (Meshopt + KTX2) | GLB compression pipeline |
| `gltf-validator` | CI asset validation |
| GitHub Actions | CI/CD |

---

## Commands

### Frontend (`frontend/`)

```bash
pnpm install
pnpm dev          # Next.js dev server on :3000
pnpm build
pnpm lint
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest (when added)
```

### Backend (`backend/`)

```bash
uv sync                              # or: pip install -e .
uv run uvicorn app.main:app --reload # FastAPI on :8000
uv run pytest                        # all backend tests
uv run pytest tests/test_resolver.py # slot resolver tests only
uv run pytest tests/test_two_pass.py # two-pass orchestration tests
uv run ruff check .
uv run ruff format .
uv run mypy app
```

### Supabase

```bash
supabase start                          # local stack
supabase db reset                       # re-apply migrations
supabase migration new <name>           # new migration file
```

### Infra (Azure Bicep)

```bash
az deployment group create -g <rg> -f infra/main.bicep -p @infra/params.json
```

### Asset pipeline (catalog GLBs)

```bash
# from raw Blender export
gltfpack -i raw.glb -o packed.glb -cc -tc
gltf-validator packed.glb
# upload to Azure Blob with content-hashed filename + immutable cache
```

---

## Project Structure

```
interior-flow-3d/
├── frontend/                      # Next.js 14
│   ├── app/
│   │   ├── (marketing)/page.tsx              # autoplay 3D hero
│   │   ├── share/[token]/page.tsx            # public read-only
│   │   └── app/
│   │       ├── page.tsx                      # dashboard / projects grid
│   │       ├── projects/[projectId]/page.tsx
│   │       ├── projects/[projectId]/rooms/[roomId]/page.tsx        # variant grid
│   │       └── projects/[projectId]/rooms/[roomId]/layouts/[layoutId]/page.tsx
│   ├── components/
│   │   ├── shell/                            # left rail, top toolbar, inspector
│   │   ├── wizard/                           # 3 steps, room-type aware
│   │   ├── viewer/                           # R3F + Environment + PBR + compare overlay
│   │   ├── sidebar/                          # palette, rationale, item swap UI
│   │   ├── projects/                         # grid, empty state, template gallery
│   │   ├── share/                            # public layout view
│   │   └── ui/                               # design system primitives
│   ├── lib/
│   │   ├── supabase.ts                       # client init
│   │   ├── api.ts                            # FastAPI fetch helpers
│   │   ├── slot-mappings.ts                  # client-side slot helpers (display only)
│   │   └── design-tokens.ts                  # spacing scale, motion, type scale
│   └── public/                               # only HDRI lives here; catalog GLBs on CDN
├── backend/                       # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── catalog.py                    # GET /catalog (room_type + style filter)
│   │   │   ├── generate.py                   # POST /generate-layout (two-pass)
│   │   │   ├── projects.py                   # CRUD
│   │   │   ├── rooms.py                      # CRUD
│   │   │   ├── layouts.py                    # CRUD + duplicate + share
│   │   │   └── share.py                      # GET /share/{token}
│   │   ├── models/                           # Pydantic v2 schemas (the contract)
│   │   │   ├── layout.py                     # zones + items + catalog_version
│   │   │   ├── room.py
│   │   │   ├── project.py
│   │   │   ├── catalog.py                    # tag-based
│   │   │   └── share.py
│   │   ├── services/
│   │   │   ├── llm.py                        # Pass 1 + parallel Pass 2 orchestration
│   │   │   ├── slot_resolver.py              # PURE function, room-type-aware
│   │   │   ├── placement.py                  # AABB pass, exclusivity, drop-priority
│   │   │   ├── catalog_filter.py             # tag + room-type pre-prompt filter
│   │   │   ├── style_profiles.py             # StyleProfile loader
│   │   │   ├── rate_limit.py                 # IP middleware (Postgres-backed)
│   │   │   └── supabase.py                   # JWT verify + DB writes + share-fn calls
│   │   ├── data/
│   │   │   ├── catalog.json                  # ~40 tagged items
│   │   │   ├── style_profiles.json           # 5 entries
│   │   │   ├── room_types.json               # slot instance sets per room type
│   │   │   └── templates.json                # curated example projects (Phase 5)
│   │   └── prompts/
│   │       ├── system_pass1.md               # zones + budget + style emphasis
│   │       └── system_pass2.md               # items per zone
│   ├── tests/
│   │   ├── test_resolver.py                  # every slot, edge dimensions, all 4 room types
│   │   ├── test_placement.py                 # exclusivity, AABB, drop, zone essentialness
│   │   ├── test_zones.py                     # zone schema + room-type compat
│   │   ├── test_two_pass.py                  # mocked LLM, both passes, parallel exec
│   │   ├── test_catalog_filter.py            # tag/room-type filter correctness
│   │   ├── test_style_profiles.py
│   │   ├── test_share_tokens.py              # HMAC, expiry, revoke
│   │   ├── test_rate_limit.py                # IP counter
│   │   └── test_rls_cross_user.py            # extended to projects + share
│   ├── pyproject.toml
│   └── Dockerfile
├── supabase/migrations/
│   ├── 0001_init.sql                          # MVP
│   ├── 0002_projects_and_variants.sql         # projects + room.project_id + layout.name/is_primary
│   ├── 0003_share_tokens.sql                  # share_tokens + get_shared_layout() security definer fn
│   └── 0004_rate_limits.sql
├── infra/{main,containerapp,keyvault,blob_frontdoor}.bicep
└── .claude/
    ├── PRD.md                                 # full product spec — read first
    ├── reference/{api.md, components.md}
    └── commands/, skills/
```

---

## Architecture

Three-layer flow for the core `/generate-layout` request:

1. **Frontend** sends wizard payload (`roomType`, dims, style, preferences[], optional `seed`, optional `projectId` to apply project defaults) to FastAPI.
2. **FastAPI** runs the two-pass placement pipeline:
   - Pydantic-validate input.
   - Apply IP rate-limit (anon path).
   - Apply project defaults if `projectId` provided.
   - **Pass 1**: build small Pass 1 prompt (room type, style, preferences, zone enum, item budget hints from `StyleProfile`); call Azure OpenAI in JSON schema strict mode (`temperature=0.7`, `seed`); validate `{zones, item_budget_per_zone, style_emphasis}`.
   - **Pass 2 (parallel via `asyncio.gather`)**: per zone, build Pass 2 prompt with that zone's slot instances + tag-filtered candidate catalog (~15 items max); call Azure OpenAI; validate items.
   - Merge → catalog lookup → tag check vs zone accepted-tags → slot exclusivity (with co-occupancy allow-list) → `resolve_slot()` per room type → AABB collision pass with `StyleProfile.wall_flush_tolerance` margin → on conflict, nudge along wall t-parameter (`0.15`/`0.85`); else drop lowest-priority item by zone-essentialness and append a warning.
   - Enrich each item with `{position, rotation_y, footprint, model, zone}`.
   - Stamp `catalog_version`.
   - Return resolved Layout.
3. **Frontend** renders the Layout in an R3F scene with shared HDRI environment + PBR materials per item.

Persistence is a separate authenticated call (`POST /layouts`). `/generate-layout` is anonymous (rate-limited).

**Coordinate convention:** room centered at origin, +X east, +Z south, +Y up. North wall = -Z face; south wall = +Z face. Wall items face inward, corner items face the room diagonal (45° bisector), floor items default to facing the entry. Convention unchanged from MVP.

---

## Code Patterns

### Naming Conventions

- Python: `snake_case` for files, functions, vars; `PascalCase` for Pydantic models and classes.
- TypeScript: `kebab-case` for files; `PascalCase` for React components and types; `camelCase` for vars and functions.
- Catalog ids: lowercase snake_case, e.g. `sofa_3seat`, `dining_chair`, `bed_double`.
- Tag values: lowercase snake_case, single-word where possible (`seating`, `upholstered`, `large`, `media`, `storage`, `lighting`, `accent`).
- Slot ids: lowercase snake_case for walls/floor (`north_wall_center`, `bed_center`), uppercase compass for corners (`corner_NE`).
- Zone ids: lowercase snake_case (`seating_zone`, `media_zone`, `sleep_zone`, `work_zone`).
- Style enum values: lowercase (`scandinavian`, `minimal`, `industrial`, `japandi`, `mid_century`).
- Room-type enum values: snake_case (`living_room`, `bedroom`, `dining_room`, `home_office`).
- Preference enum values: snake_case (`more_seating`, `more_open_space`, `more_storage`).
- Project / Room / Layout names: free-form user strings, trimmed, ≤80 chars.

### File Organization

- **Pydantic models are the contract.** Backend `models/*.py` defines the canonical schema. Anything that crosses the wire is a Pydantic model. TypeScript types on the frontend mirror them — keep them in lockstep.
- **Pure resolver.** `services/slot_resolver.py` is framework-free, takes only primitives + dataclasses + a `RoomType` enum, returns `Transform`. No imports from `routers/`, `services/llm.py`, or any web layer. Test it directly across all 4 room types.
- **Pure catalog filter.** `services/catalog_filter.py` is framework-free; takes `(catalog, room_type, style, zone?)` and returns a tag-filtered candidate list. The LLM only ever sees filtered candidates.
- **One router file per resource.** `routers/{catalog,generate,projects,rooms,layouts,share}.py`. Don't fan out to micro-routers.
- **Static catalog.** `backend/app/data/catalog.json` is checked in. No catalog DB table, no admin UI. To add an item: edit JSON, add `.glb` (run through `gltfpack -cc -tc`, validate, upload to Azure Blob with content hash), reference the hashed CDN URL in `model`.
- **Static style profiles.** `backend/app/data/style_profiles.json` holds the 5 `StyleProfile` entries. Add a 6th style by adding a row + tagging style-specific accent items in catalog. No code change.
- **Static room types.** `backend/app/data/room_types.json` declares each room type's slot instance sets, allowed zones, and dimension bounds.
- **R3F scene composition.** `<Room>` provides parameterized walls/floor with palette materials. `<Furniture>` accepts a resolved item and renders `useGLTF(model)` with PBR materials, or a primitive fallback for `primitive:*` ids. Shared `<Environment>` HDRI lights every scene. Selection state lives in Zustand, not props.
- **Design tokens.** `frontend/lib/design-tokens.ts` is the single source for spacing scale, motion durations, type scale. Tailwind config reads from it. No raw spacing literals in components.

### Error Handling

- **At system boundaries only.** Validate Pydantic on inbound; validate LLM JSON on outbound from `services/llm.py` for both Pass 1 and Pass 2. Don't validate again across internal calls.
- **LLM failures:** raise `LLMValidationError` (422 to client) for schema-violating output; raise `LLMUpstreamError` (502/503) for transport failures. Per-pass retry: one retry inside `services/llm.py` with a stricter system message; never retry-loop forever. Pass 2 retries are scoped per zone — one bad zone doesn't kill the whole layout.
- **Placement failures:** never error. Drop the lowest-priority item (sorted by zone-essentialness) per `placement.DROP_PRIORITY` and append a string to `Layout.warnings`. The user sees a complete (possibly smaller) layout.
- **Auth failures:** 401 from a single FastAPI dependency `require_user()` that verifies JWT via cached JWKS.
- **Rate-limit failures:** 429 from `rate_limit` middleware on `/generate-layout` for anon path only. Auth path bypasses anon limit.
- **Share-token failures:** 404 (not 403) on expired/revoked token to avoid token-existence oracles.
- **Frontend:** TanStack Query handles retries on transient errors. Show explicit empty/error states — no silent fallbacks. Per-zone shimmer reveals as Pass 2 zones return.

### LLM Output Contract

- The Layout JSON schema (see `.claude/PRD.md` §10) is the source of truth.
- LLM **never** emits coordinates, footprints, model paths, or any field outside the schema.
- LLM **only** picks `catalogId` from the (server-filtered) candidate catalog and `{zone, slot}` from the room-type-conditional enums.
- `additionalProperties: false` everywhere — strict mode.
- `designExplanation` and per-item `rationale` use first-person designer voice ("I placed…").
- Pass 1 emits only `{zones, item_budget_per_zone, style_emphasis}`; Pass 2 emits items + per-item rationale; final `designExplanation` is composed server-side from Pass 1 emphasis + Pass 2 rationales (or emitted by Pass 2 of the highest-essentialness zone — see `services/llm.py`).

### RLS / Tenant Isolation

- Every user-owned table (`projects`, `rooms`, `layouts`, `share_tokens`) has an RLS policy `auth.uid() = user_id`.
- Backend never uses the Supabase service role for end-user requests. Service role is used only for offline admin scripts and the share-token security-definer function.
- Share-token reads bypass RLS only via `get_shared_layout(token text)` security-definer SQL function, scoped to one layout id.
- Cross-user RLS test (`tests/test_rls_cross_user.py`) authenticates as user A and asserts user B's projects, rooms, layouts, and share tokens are inaccessible. Test must pass before shipping any phase that touches RLS.

### Design system

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. No raw `p-5`, `gap-7`, etc.
- Type: Geist Sans (display) + Inter (body). h1–h6 scale defined in `design-tokens.ts`.
- Buttons: one filled primary per screen. Ghost secondary. Text tertiary. No competing primaries.
- Motion: 150–250 ms ease-out on hover/focus/state. Skeleton loaders, never spinners.
- Empty states: every list/grid gets illustration + copy + single CTA.
- Theme: light primary + dark mode toggle via `next-themes`, persisted per user.
- Brand accent reserved for the active wizard step + primary CTA.

---

## Testing

- **Run all backend tests:** `uv run pytest` from `backend/`.
- **Test location:** `backend/tests/`.
- **Patterns:**
  - Resolver tests cover every slot × representative footprint × edge dimensions (per room type) (min 2×2×2.2, max 12×12×4 living; tighter bounds bedroom/dining/office).
  - Placement tests fixture LLM output and assert no overlapping AABBs, all wall items flush within `StyleProfile.wall_flush_tolerance`, all `catalogId`s in catalog, all `slot`s in enum for the room type, all items' tags accepted by their assigned zone.
  - Two-pass tests mock both Pass 1 and Pass 2 calls; assert prompt contents (zone enum scoped to room type, candidate catalog filtered, no full catalog leak), schema validation per pass, parallel execution via `asyncio.gather`, per-zone retry isolation.
  - Catalog filter tests assert filter is deterministic, returns ≤15 items per `(room_type, style, zone)`, never returns mismatched-room-type items.
  - Share-token tests cover HMAC validity, expiry, revocation, and 404-on-bad-token (no leakage of token existence).
  - Rate-limit tests cover anon 10/24h enforcement, sliding window, auth bypass.
  - RLS test uses two real Supabase JWTs (test users) and hits the deployed API across projects + rooms + layouts + share tokens.
- **Frontend testing (when added):** Vitest + React Testing Library for components; Playwright for the full anon-wizard → result → save → project-creation happy path, plus the share-link public-view path.

---

## Validation

Run before committing:

```bash
# backend
uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest

# frontend
pnpm lint && pnpm typecheck && pnpm test
```

CI runs the same on every PR plus `gltf-validator` on any GLB asset added.

---

## Key Files

| File | Purpose |
|------|---------|
| `.claude/PRD.md` | Full product spec — read before changing scope or behaviour |
| `backend/app/models/layout.py` | Layout Pydantic schema — the LLM contract (zones + items + catalog_version) |
| `backend/app/models/project.py` | Project schema |
| `backend/app/services/slot_resolver.py` | Pure room-type-aware slot → transform function |
| `backend/app/services/placement.py` | AABB collision + zone-essentialness drop pipeline |
| `backend/app/services/llm.py` | Two-pass Azure OpenAI orchestration |
| `backend/app/services/catalog_filter.py` | Tag + room-type pre-prompt filter |
| `backend/app/services/style_profiles.py` | StyleProfile loader |
| `backend/app/data/catalog.json` | The ~40-item tagged catalog with footprints + clearances |
| `backend/app/data/style_profiles.json` | 5 StyleProfile entries |
| `backend/app/data/room_types.json` | Slot instance sets per room type |
| `backend/app/prompts/system_pass1.md` | Pass 1 zones-emphasis prompt |
| `backend/app/prompts/system_pass2.md` | Pass 2 items-per-zone prompt |
| `frontend/components/viewer/Room.tsx` | Parameterized room mesh + palette materials |
| `frontend/components/viewer/Furniture.tsx` | .glb / primitive renderer with PBR |
| `frontend/components/viewer/Scene.tsx` | R3F scene with shared `<Environment>` HDRI |
| `frontend/components/wizard/*` | 3-step input flow (room-type aware) |
| `frontend/components/shell/*` | Floating-panel app shell |
| `frontend/lib/design-tokens.ts` | Spacing / motion / type scale |
| `supabase/migrations/0001_init.sql` | MVP schema + RLS policies |
| `supabase/migrations/0002_projects_and_variants.sql` | v1 hierarchy migration |
| `supabase/migrations/0003_share_tokens.sql` | Share tokens + security-definer fn |
| `supabase/migrations/0004_rate_limits.sql` | IP rate-limit table |
| `infra/main.bicep` | Azure resource graph (Container Apps + Key Vault + Blob + Front Door) |

---

## Locked Decisions

These are settled — do not relitigate without reading `.claude/PRD.md` §15 first:

- LLM = Azure OpenAI gpt-4o, JSON schema strict mode, `temperature=0.7` + seed.
- Generation = **two-pass**: Pass 1 zones + budget + style emphasis, Pass 2 items per zone in parallel via `asyncio.gather`.
- Catalog = **tag-based** schema (`tags`, `room_types`, `placement: {surfaces, against, exclusive_with}`); `allowedSlotKinds` removed. ~40 items v1, all CC0.
- Asset format = **glTF/GLB only**, compressed via `gltfpack -cc -tc` (Meshopt + KTX2). Per-item ≤ 1 MB hard, 300–600 KB target.
- Hosting = **Azure Blob + Front Door CDN** for catalog assets; content-hashed filenames; immutable cache.
- HDRI = single shared neutral interior environment (~2 MB), KTX2 compressed.
- Materials = **PBR per item**; lighting = **baked HDRI** (no real-time soft shadows).
- Hierarchy = **Project → Room → Layout**; Workspace is implicit single per user.
- Layouts = **named sibling variants**, one designated primary per Room.
- Auth = anonymous Generate (IP rate-limited 10/24h), login required to Save.
- Anon → first-project conversion = automatic on signup.
- Share = signed token (HMAC + Key Vault secret), revocable, 30-day default expiry, public read-only `/share/{token}`.
- Comparison = **overlay fade in single viewport** (not synced multi-viewport 3D).
- Item interactivity = **swap** (tag-compatible) only; no manual move.
- Room types = **4 locked**: `living_room`, `bedroom`, `dining_room`, `home_office`.
- Styles = **5 locked**: `scandinavian`, `minimal`, `industrial`, `japandi`, `mid_century`.
- Style influence = `StyleProfile` config drives placement; LLM gets short emphasis hint, not free-form prose.
- Slot vocabulary = **slot kinds shared, instance sets per room type**. Floor zones parameterized per room type.
- Zone vocabulary = small enum, room-type-conditional, first-class in Layout schema.
- Reproducibility = saved Layout JSON; `seed` is demo aid; every Layout stamped with `catalog_version`.
- Visual register = light primary + dark mode toggle.
- Type = **Geist Sans (display) + Inter (body)**.
- Voice = **first-person** ("I placed…").
- Marketing hero = **autoplay 3D loop** (4–6 s).
- Empty dashboard = **curated template gallery** (5–10 hand-built).
- Soft Pro affordances ship in Phase 5; billing not wired.
- Backend host = Azure Container Apps (`minReplicas: 1` for demo windows).
- Devices = desktop only.
- Latency target = **< 10 s p95** for `/generate-layout` (relaxed from MVP's 8s due to two-pass).
- Existing prod data = **wiped** during v1 migration (dev/demo phase). Tag `pre-v1` git ref before applying.
- Phase order = **4 → 5 → 6 → 7**. v1 launches with all four shipped.

---

## Phase Status

- **Phase 0–3 (MVP)**: shipped. Anon Generate, single living room, 3 styles, 10 items, save/load, RLS, marketing stub.
- **Phase 4 (Product hierarchy)**: shipped. Projects + Rooms + Layout variants + share links + dashboard + compare overlay + item swap.
- **Phase 5 (Design system & marketing)**: shipped. Light/dark mode, Geist+Inter, floating-panel shell, autoplay landing, curated template gallery, soft Pro affordances.
- **Phase 6 (Catalog scaling & multi-room)**: shipped. Tag-based catalog, glTF/Meshopt/KTX2 pipeline, Azure Blob+Front Door, HDRI+PBR, 4 room types, ~40 items, zones-as-data.
- **Phase 7 (Two-pass & style profiles)**: shipped. Pass 1 + parallel Pass 2, `StyleProfile`, 5 styles end-to-end, demo seeds.

v1 feature-complete. All locked-decision phases ✅.

---

## Notes / Gotchas

- **Read the matching reference doc first.** `.claude/reference/components.md` for any work in `frontend/`; `.claude/reference/api.md` for any work in `backend/`. They cover patterns this file does not.
- **Pydantic models are the contract.** When adding a field, update the Pydantic model first; mirror to TypeScript second; update the system prompt third (Pass 1 vs Pass 2 as appropriate). Never hand-write JSON the LLM should produce.
- **Two-pass orchestration is the latency hot spot.** Run Pass 2 zones with `asyncio.gather`; never sequentially. Per-pass retry must be scoped per zone — one bad zone shouldn't fail the whole generation.
- **The LLM never sees footprints or the full catalog.** Prompt only contains item ids + names + tags + zone/slot enum, filtered to ~15 candidates per Pass 2 call. The footprint catalog is server-only.
- **`primitive:*` model ids** are not file paths — `Furniture.tsx` branches on the prefix and renders a primitive mesh.
- **Cold start.** Container Apps scale-to-zero takes ~2 s. Set `minReplicas: 1` before any live demo and ping `/healthz` to warm up.
- **Seed is hidden by default.** It's in the request payload but not in the wizard UI; expose only via a query param (`?seed=12345`) for repeatable demos. Reproducibility lives in saved Layout JSON, not seed.
- **Co-occupancy allow-list** lives in `placement.py`. v1 list: `{rug, coffee_table}` (living), `{rug, dining_table_*}` (dining), `{bed, nightstand pair}` (bedroom).
- **Slot enum drift.** If a slot or room-type slot set changes, four places must change in lockstep: Pydantic enum, `room_types.json`, system prompts (Pass 1 + Pass 2), placement tests. Grep for `north_wall_center` to find them all.
- **Catalog tags drift.** Adding a tag = audit every slot's accepted-tags list and every zone's accepted-tags list. Tag drift silently breaks compatibility checks.
- **Asset filenames are content-hashed.** Every GLB upload to Azure Blob must be content-hashed; the catalog JSON's `model` field references the hashed CDN URL. Cache busting is automatic; renames are explicit catalog edits.
- **HDRI is shared.** One `Environment` per scene, single HDRI URL from `NEXT_PUBLIC_HDRI_URL`. Don't duplicate per item.
- **Existing data is gone.** v1 migration is destructive. Tag `pre-v1` before applying. No backfill choreography.
- **Share-token error code is 404, not 403.** Avoid leaking token existence.
- **Background research agents flagged that WebSearch/WebFetch were denied** in their environment. Any "research" claims in the PRD are synthesized from training data; verify before relying on specific external sources.
- **No emojis in code.** Tailwind / Pydantic / SQL only. UI emojis only if the user explicitly requests them.
