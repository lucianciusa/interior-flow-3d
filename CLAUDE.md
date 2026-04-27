# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## On-Demand Reference Docs

Read the matching doc **before** starting work in that area. They contain the standards for naming, structure, error handling, performance, and pitfalls.

| When working on… | Read |
|---|---|
| Frontend components (`frontend/`) — wizard, R3F viewer, sidebar, forms, styling, state | [`.claude/reference/components.md`](.claude/reference/components.md) |
| API endpoints (`backend/`) — FastAPI routers, Pydantic models, services, auth, LLM, Supabase | [`.claude/reference/api.md`](.claude/reference/api.md) |
| Product scope, user stories, decisions, schemas | [`.claude/PRD.md`](.claude/PRD.md) |

---

## Project Overview

**Interior Flow 3D** — AI-powered 3D living-room design copilot. User enters dimensions, picks a style (Scandinavian / Minimal / Industrial), picks up to 2 preferences, and the app generates a 3D layout with furniture from a fixed catalog, a wall/floor/accent palette, and a first-person designer rationale. MVP scope: single rectangular room, ~10 catalog items, anonymous Generate, login required to Save. Full spec lives in `.claude/PRD.md` — read it when you need product or scope context before changing behaviour.

The codebase is a polyglot monorepo:

- `frontend/` — Next.js 14 App Router + React Three Fiber 3D viewer
- `backend/` — FastAPI + Pydantic v2, calls Azure OpenAI, talks to Supabase
- `supabase/` — SQL migrations (Postgres + RLS)
- `infra/` — Azure Bicep for Container Apps + Key Vault

The LLM never emits coordinates. It picks slot names from a closed enum (19 slots: 12 wall thirds + 4 corners + 3 floor zones). The backend resolves slots to `(position, rotation_y)` via a pure function and runs an AABB collision pass before returning the layout.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 (App Router) + TypeScript | Frontend framework |
| React 18 + Tailwind CSS | UI |
| React Three Fiber + @react-three/drei | 3D scene (`OrbitControls`, `useGLTF`, `Bounds`, `Html`) |
| Zustand | Wizard state |
| TanStack Query | Server state / API calls |
| FastAPI (Python 3.12) | Backend HTTP |
| Pydantic v2 | Schema validation, single source of truth |
| openai SDK (Azure endpoint) | LLM client (gpt-4o, JSON schema mode) |
| Supabase | Auth + Postgres + RLS + Storage |
| PyJWT + cryptography | JWT verification via Supabase JWKS |
| pytest | Backend tests |
| Azure Container Apps | Backend hosting |
| Azure Key Vault | Secrets |
| Vercel (or Azure Static Web Apps) | Frontend hosting |
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

---

## Project Structure

```
interior-flow-3d/
├── frontend/                      # Next.js 14
│   ├── app/
│   │   ├── (marketing)/page.tsx
│   │   └── app/
│   │       ├── page.tsx               # 3-step wizard
│   │       ├── result/[id]/page.tsx
│   │       └── layout.tsx
│   ├── components/
│   │   ├── wizard/                    # step 1/2/3 + chip group
│   │   ├── viewer/                    # R3F Room, Furniture, CameraPresets
│   │   └── sidebar/                   # palette, rationale, item list
│   ├── lib/
│   │   ├── supabase.ts                # client init
│   │   ├── api.ts                     # FastAPI fetch helpers
│   │   └── slot-mappings.ts           # client-side slot helpers (display only)
│   └── public/models/*.glb            # 8 CC0 furniture models, ≤10 MB total
├── backend/                       # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── catalog.py             # GET /catalog
│   │   │   ├── generate.py            # POST /generate-layout
│   │   │   ├── layouts.py             # CRUD for /layouts
│   │   │   └── rooms.py               # CRUD for /rooms
│   │   ├── models/                    # Pydantic v2 schemas (the contract)
│   │   │   ├── layout.py
│   │   │   ├── room.py
│   │   │   └── catalog.py
│   │   ├── services/
│   │   │   ├── llm.py                 # Azure OpenAI client + prompt
│   │   │   ├── slot_resolver.py       # PURE function, framework-free
│   │   │   ├── placement.py           # AABB pass, exclusivity, drop-priority
│   │   │   └── supabase.py            # JWT verify + DB writes
│   │   ├── data/catalog.json          # 10 furniture items (static)
│   │   └── prompts/system.md          # designer-persona system prompt
│   ├── tests/
│   │   ├── test_resolver.py           # every slot, edge dimensions
│   │   ├── test_placement.py          # exclusivity, AABB, drop
│   │   └── test_llm_mock.py           # mocked LLM, schema validation
│   ├── pyproject.toml
│   └── Dockerfile
├── supabase/migrations/0001_init.sql
├── infra/{main,containerapp,keyvault}.bicep
└── .claude/
    ├── PRD.md                         # full product spec — read first
    ├── CLAUDE-template.md
    ├── commands/
    └── skills/
```

---

## Architecture

Three-layer flow for the core `/generate-layout` request:

1. **Frontend** sends wizard payload (`roomType`, dims, style, preferences[], optional seed) to FastAPI.
2. **FastAPI** runs the placement pipeline:
   - Pydantic-validate input.
   - Build LLM prompt from `prompts/system.md` + catalog ids + slot enum + user inputs.
   - Call Azure OpenAI in JSON schema mode (`temperature=0.7`, `seed`).
   - Pydantic-validate LLM output against the Layout schema.
   - For each item: catalog lookup → `allowedSlotKinds` check → slot exclusivity (with `rug + coffee_table` co-occupancy allow-list) → `resolve_slot()` → AABB collision pass with margins/clearances → on conflict, nudge along wall t-parameter (`0.15`/`0.85`), else drop lowest-priority item and append a warning.
   - Enrich each item with `{position, rotation_y, footprint, model}`.
   - Return resolved Layout.
3. **Frontend** renders the Layout in an R3F scene.

Persistence is a separate authenticated call (`POST /layouts`). `/generate-layout` is anonymous.

**Coordinate convention:** room centered at origin, +X east, +Z south, +Y up. North wall = -Z face; south wall = +Z face. Wall items face inward, corner items face the room diagonal (45° bisector), floor items default to facing the entry.

---

## Code Patterns

### Naming Conventions

- Python: `snake_case` for files, functions, vars; `PascalCase` for Pydantic models and classes.
- TypeScript: `kebab-case` for files; `PascalCase` for React components and types; `camelCase` for vars and functions.
- Catalog ids: lowercase snake_case, e.g. `sofa_3seat`, `corner_shelf`.
- Slot ids: lowercase snake_case for walls/floor (`north_wall_center`, `center_front`), uppercase compass for corners (`corner_NE`).
- Style enum values: lowercase (`scandinavian`, `minimal`, `industrial`).
- Preference enum values: snake_case (`more_seating`, `more_open_space`, `more_storage`).

### File Organization

- **Pydantic models are the contract.** Backend `models/*.py` defines the canonical schema. Anything that crosses the wire is a Pydantic model. TypeScript types on the frontend mirror them — keep them in lockstep.
- **Pure resolver.** `services/slot_resolver.py` is framework-free, takes only primitives + dataclasses, returns `Transform`. No imports from `routers/`, `services/llm.py`, or any web layer. Test it directly.
- **One router file per resource.** `routers/{catalog,rooms,layouts,generate}.py`. Don't fan out to micro-routers.
- **Static catalog.** `backend/app/data/catalog.json` is checked in. No catalog DB table, no admin UI. To add an item: edit JSON, add `.glb` to `frontend/public/models/`.
- **R3F scene composition.** `<Room>` provides parameterized walls/floor with palette materials. `<Furniture>` accepts a resolved item and renders `useGLTF(model)` or a primitive fallback for `primitive:*` ids. Selection state lives in Zustand, not props.

### Error Handling

- **At system boundaries only.** Validate Pydantic on inbound; validate LLM JSON on outbound from `services/llm.py`. Don't validate again across internal calls.
- **LLM failures:** raise `LLMValidationError` (422 to client) for schema-violating output; raise `LLMUpstreamError` (502/503) for transport failures. One retry inside `services/llm.py` with a stricter system message; never retry-loop forever.
- **Placement failures:** never error. Drop the lowest-priority item per `placement.DROP_PRIORITY` and append a string to `Layout.warnings`. The user sees a complete (possibly smaller) layout.
- **Auth failures:** 401 from a single FastAPI dependency `require_user()` that verifies JWT via cached JWKS.
- **Frontend:** TanStack Query handles retries on transient errors. Show explicit empty/error states — no silent fallbacks.

### LLM Output Contract

- The Layout JSON schema (see `.claude/PRD.md` §10) is the source of truth.
- LLM **never** emits coordinates, footprints, model paths, or any field outside the schema.
- LLM **only** picks `catalogId` from the catalog and `slot` from the 19-slot enum.
- `additionalProperties: false` everywhere — strict mode.
- `designExplanation` and per-item `rationale` use first-person designer voice ("I placed…").

### RLS / Tenant Isolation

- Every user-owned table has an RLS policy `auth.uid() = user_id`.
- Backend never uses the Supabase service role for end-user requests.
- Cross-user RLS test (`tests/test_rls_cross_user.py`) authenticates as user A and asserts that user B's rows are inaccessible. This test must pass before shipping Phase 3.

---

## Testing

- **Run all backend tests:** `uv run pytest` from `backend/`.
- **Test location:** `backend/tests/`.
- **Patterns:**
  - Resolver tests cover every slot × representative footprint × edge dimensions (min 2×2×2.2, max 12×12×4).
  - Placement tests fixture LLM output and assert no overlapping AABBs, all wall items flush within 0.07 m, all `catalogId`s in catalog, all `slot`s in enum.
  - LLM tests mock the `openai` client; assert prompt contents and schema validation.
  - RLS test uses two real Supabase JWTs (test users) and hits the deployed API.
- **Frontend testing (when added):** Vitest + React Testing Library for components; Playwright for the full wizard → result happy path.

---

## Validation

Run before committing:

```bash
# backend
uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest

# frontend
pnpm lint && pnpm typecheck && pnpm test
```

CI runs the same on every PR.

---

## Key Files

| File | Purpose |
|------|---------|
| `.claude/PRD.md` | Full product spec — read before changing scope or behaviour |
| `backend/app/models/layout.py` | Layout Pydantic schema — the LLM contract |
| `backend/app/services/slot_resolver.py` | Pure slot → transform function |
| `backend/app/services/placement.py` | AABB collision + drop pipeline |
| `backend/app/services/llm.py` | Azure OpenAI client + prompt assembly |
| `backend/app/data/catalog.json` | The 10-item catalog with footprints + clearances |
| `backend/app/prompts/system.md` | Designer-persona system prompt |
| `frontend/components/viewer/Room.tsx` | Parameterized room mesh + palette materials |
| `frontend/components/viewer/Furniture.tsx` | .glb / primitive renderer |
| `frontend/components/wizard/*` | 3-step input flow |
| `supabase/migrations/0001_init.sql` | Schema + RLS policies |
| `infra/main.bicep` | Azure resource graph |

---

## Locked Decisions

These are settled — do not relitigate without reading `.claude/PRD.md` §15 first:

- LLM = Azure OpenAI gpt-4o, JSON schema mode, `temperature=0.7` + seed.
- Catalog = 8 CC0 `.glb` + 2 primitive fallbacks, 10 items total, includes corner pieces.
- Auth = anonymous Generate, login required to Save. Explicit Save button (no auto-save).
- Styles locked to 3: Scandinavian, Minimal, Industrial.
- Backend host = Azure Container Apps (`minReplicas: 1` for demo windows).
- Devices = desktop only, ≤10 MB total `.glb` budget.
- Slot vocabulary = 19 (12 walls + 4 corners + 3 floor). Do not add slots without updating the enum, the resolver, the placement tests, and the system prompt together.
- Tone = first-person designer voice everywhere user-facing.
- Latency target = <8 s p95 for `/generate-layout`.

---

## Notes / Gotchas

- **Read the matching reference doc first.** `.claude/reference/components.md` for any work in `frontend/`; `.claude/reference/api.md` for any work in `backend/`. They cover patterns this file does not.
- **Pydantic models are the contract.** When adding a field, update the Pydantic model first; mirror to TypeScript second; update the system prompt third. Never hand-write JSON the LLM should produce.
- **The LLM never sees footprints.** Prompt only contains item ids + names + `allowedSlotKinds`. The footprint catalog is server-only.
- **`primitive:*` model ids** are not file paths — `Furniture.tsx` branches on the prefix and renders a primitive mesh.
- **Cold start.** Container Apps scale-to-zero takes ~2 s. Set `minReplicas: 1` before any live demo and ping `/healthz` to warm up.
- **Seed is hidden by default.** It's in the request payload but not in the wizard UI; expose it only via a query param (`?seed=12345`) for repeatable demos.
- **Co-occupancy allow-list** lives in `placement.py`. As of MVP only `{rug, coffee_table}` may share `center`.
- **Slot enum drift.** If the slot enum changes, four places must change in lockstep: Pydantic enum, system prompt, resolver branch table, and placement tests. Grep for `north_wall_center` to find them all.
- **Background research agents flagged that WebSearch/WebFetch were denied** in their environment. Any "research" claims in the PRD are synthesized from training data; verify before relying on specific external sources.
- **No emojis in code.** Tailwind / Pydantic / SQL only. UI emojis only if the user explicitly requests them.
