# Interior Flow 3D — Product Requirements Document

**Version:** 0.1 (MVP)
**Status:** Draft
**Last Updated:** 2026-04-27
**Owner:** Lucian

---

## 1. Executive Summary

Interior Flow 3D is a focused, AI-powered web app that generates simple 3D interior design proposals for a single living room. Users enter approximate dimensions, pick a style (Scandinavian, Minimal, Industrial), select up to two preferences (more seating, more open space, more storage), and receive a generated layout: a rectangular 3D room rendered in the browser, 3–10 furniture pieces from a fixed catalog placed in sensible positions, a wall/floor/accent palette, and a short first-person designer rationale.

The product's value proposition is **demo-grade polish with realistic scope**: it intentionally avoids the all-in-one CAD complexity of Planner 5D / Coohom and the photo-only flow of RoomGPT, sitting in the middle as a fast, opinionated copilot for non-designers. The AI never emits raw coordinates; it picks abstract slots from a controlled vocabulary, and the frontend resolves slots to positions. This separation keeps LLM output reliable and the 3D layer testable.

**MVP goal:** ship a polished, single-room AI design copilot in days, not weeks, that looks credible in a live demo and exercises the full stack (FastAPI + Supabase + Next.js + R3F + Azure OpenAI) end-to-end.

---

## 2. Mission

> Make AI-generated interior design feel **intentional, explainable, and instantly visualizable** — without asking users to think like CAD operators.

### Core principles

1. **Constrained AI, free user.** LLM picks from a small slot vocabulary and a fixed catalog; the user only makes high-level taste decisions.
2. **Trust through specificity.** Every layout decision is named ("I placed the sofa facing the window…") and tied to objects in the scene.
3. **Polish over breadth.** One room, three styles, ten items — done well — beats ten rooms done shallowly.
4. **Reproducibility.** Hidden seed lets a good demo result be replayed exactly.
5. **Stack honesty.** Use the boring, productive stack (FastAPI, Supabase, Next.js, Azure) that Lucian already knows; no novelty for novelty's sake.

---

## 3. Target Users

### Primary persona — "Curious homeowner"

- Non-designer adult planning to redecorate a living room.
- Comfortable with web apps, not with CAD tools.
- Wants inspiration and a starting point, not a final blueprint.
- Pain points: text-only AI tools feel abstract; CAD tools feel like homework; image-only AI tools (RoomGPT-style) are pretty but un-actionable.

### Secondary persona — "Live demo audience" (course / portfolio)

- Reviewer evaluating Lucian's full-stack + GenAI competence.
- Cares that it works, looks credible, and demonstrates thoughtful architecture.
- Pain points: demos that crash, demos that are clearly toys, demos that reveal no real engineering.

### Technical comfort level

- Users: low. Wizard with 3 steps, max 2 preferences, no jargon.
- Demo audience: high. Will scrutinize architecture diagram, schema, and prompt strategy.

---

## 4. MVP Scope

### ✅ In Scope — Core Functionality

- ✅ Single room type: `living_room`
- ✅ Single rectangular room shape
- ✅ User-supplied dimensions (width, length, height) within bounded ranges
- ✅ 3 styles: Scandinavian, Minimal, Industrial
- ✅ Up to 2 preference chips: `more_seating`, `more_open_space`, `more_storage`
- ✅ Fixed furniture catalog (~10 items, mix of CC0 .glb + primitive fallbacks)
- ✅ AI-generated layout: items + slots + palette + first-person rationale
- ✅ 3D viewer in browser: orbit/zoom/pan, 3 preset cameras, click-to-select
- ✅ Per-item rationale shown on click
- ✅ Anonymous Generate; auth required to Save
- ✅ Save / list / load / delete user's own layouts
- ✅ Hidden seed for repeatable Regenerate

### ✅ In Scope — Technical

- ✅ FastAPI backend with Pydantic v2 schemas as single source of truth
- ✅ Server-side slot resolver (pure function, unit-tested)
- ✅ AABB collision pass with wall margins + per-item front clearance
- ✅ Azure OpenAI structured-output (JSON schema mode) call
- ✅ Supabase Postgres + RLS + Auth
- ✅ Supabase JWT verification on FastAPI via JWKS
- ✅ Static catalog JSON server-side; .glb assets served from frontend
- ✅ Azure Container Apps deployment for backend
- ✅ Vercel or Azure Static Web Apps for frontend
- ✅ Azure Key Vault for backend secrets

### ❌ Out of Scope — Functional

- ❌ Multi-room support
- ❌ Floorplan drawing tools
- ❌ Non-rectangular rooms
- ❌ Doors / windows as constraints (door modeled only via `entry` slot)
- ❌ Photo-to-3D reconstruction
- ❌ Photorealistic rendering
- ❌ Drag-to-move furniture in viewer
- ❌ Material / texture swap UI
- ❌ Multi-user collaboration / sharing links
- ❌ Mobile + AR / VR
- ❌ Side-by-side variant generation
- ❌ Chat-style refinement
- ❌ Catalog beyond the seeded ~10 items

### ❌ Out of Scope — Technical / Business

- ❌ Payments / paywall / billing
- ❌ Internationalization
- ❌ Admin dashboard
- ❌ Catalog management UI
- ❌ Auto-scaling tuning beyond defaults
- ❌ Production-grade observability stack (basic logging only)

---

## 5. User Stories

### Primary

1. **Quick start.** *As a curious homeowner, I want to enter rough dimensions, pick a style, and get a 3D layout in under 30 seconds, so that I can see a credible starting point without learning a CAD tool.*
   - Example: Maria enters 4×5m, picks "Scandinavian", picks "More storage", clicks Generate; ~7s later she sees a sofa, bookshelf, rug, plant, and lamp arranged in a 3D room.

2. **Understand the design.** *As a non-designer, I want to read why each piece was placed where it was, so that the AI's suggestions feel intentional and educational rather than random.*
   - Example: Clicking the sofa shows "3-seat sofa — placed against the south wall to leave the window unobstructed and create a clear conversational zone with the armchair."

3. **Try alternatives.** *As a user, I want to regenerate the layout with the same inputs, so that I can pick a result I like best.*
   - Example: First generation places the TV stand on the north wall; user hits Regenerate, gets a version with the TV stand on the east wall instead.

4. **Save what I like.** *As a logged-in user, I want to save layouts I like, so that I can come back and review them later.*
   - Example: Maria saves the result, names it "Living room v1", logs out, logs back in tomorrow, sees it in her list.

5. **Compare saved layouts.** *As a returning user, I want to list all my saved layouts and reopen any of them, so that I can compare proposals.*
   - Example: Maria has 3 saved layouts; clicking one reloads its 3D scene and rationale.

6. **Anonymous trial.** *As a first-time visitor, I want to generate a layout without creating an account, so that I can evaluate the product before committing.*
   - Example: New visitor lands on `/app`, completes the wizard, sees the result, only sees a login prompt when they hit Save.

7. **Confidence in inputs.** *As a user, I want my inputs echoed back on the result screen, so that I can spot mistakes immediately.*
   - Example: Result page shows "4×5m · Scandinavian · More storage" as a chip row above the canvas.

8. **Inspect items.** *As a user, I want to click any furniture piece and see its name, dimensions, and rationale, so that I can understand the proposal in detail.*
   - Example: Clicking the rug shows "Rug — 2.4×1.6m. Anchors the seating zone in the room center."

### Technical

9. **Reproducible demo.** *As the developer presenting this app, I want to lock a specific generation by seed, so that a good demo result can be replayed deterministically on stage.*

10. **Schema-validated output.** *As the backend, I want every LLM response to be schema-validated before placement, so that malformed model output never reaches the 3D scene.*

11. **Tenant isolation.** *As a logged-in user, I want strict guarantees that I can only see my own layouts, so that data is never accidentally cross-leaked.*
    - Implemented via Supabase RLS policies on `rooms` and `layouts` keyed on `auth.uid()`.

---

## 6. Core Architecture & Patterns

### High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 14 (App Router) — Vercel or Azure SWA             │
│  ─ /(marketing) landing                                     │
│  ─ /app wizard + 3D viewer                                  │
│  ─ React Three Fiber + drei                                 │
│  ─ Supabase JS client (auth, RLS reads/writes)             │
└────────────┬────────────────────────────────────────────────┘
             │ HTTPS, JWT bearer
             ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI (Azure Container Apps)                            │
│  ─ /catalog, /generate-layout, /layouts, /rooms            │
│  ─ Pydantic v2 models = single source of truth              │
│  ─ JWT verify via Supabase JWKS                            │
│  ─ Slot resolver + AABB collision pass                     │
└────┬────────────────────────────────────┬──────────────────┘
     │                                    │
     ▼                                    ▼
┌──────────────────┐              ┌──────────────────────┐
│ Azure OpenAI     │              │ Supabase             │
│ gpt-4o, JSON     │              │ Auth + Postgres + RLS│
│ schema mode      │              │ Storage (thumbnails) │
│ temp=0.7 + seed  │              │                      │
└──────────────────┘              └──────────────────────┘
```

### Repo structure

```
interior-flow-3d/
├── frontend/                      # Next.js 14
│   ├── app/
│   │   ├── (marketing)/page.tsx
│   │   └── app/
│   │       ├── page.tsx           # wizard
│   │       ├── result/[id]/page.tsx
│   │       └── layout.tsx
│   ├── components/
│   │   ├── wizard/
│   │   ├── viewer/                # R3F scene + controls
│   │   └── sidebar/
│   ├── lib/{supabase.ts, api.ts, slot-mappings.ts}
│   └── public/models/*.glb
├── backend/                       # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/{catalog,layouts,rooms,generate}.py
│   │   ├── models/{layout,room,catalog}.py     # Pydantic v2
│   │   ├── services/{llm,slot_resolver,placement,supabase}.py
│   │   ├── data/catalog.json
│   │   └── prompts/system.md
│   ├── tests/{test_resolver.py,test_placement.py,test_llm_mock.py}
│   ├── pyproject.toml
│   └── Dockerfile
├── infra/                         # Azure Bicep
│   ├── containerapp.bicep
│   ├── keyvault.bicep
│   └── main.bicep
├── supabase/
│   └── migrations/0001_init.sql
└── README.md
```

### Key design patterns

- **Slot abstraction.** LLM emits semantic slot names from a closed enum; never coordinates. Server resolves slots to transforms via a pure function.
- **Pydantic-as-contract.** Backend Pydantic models are the canonical schema; frontend TypeScript types are generated from them (or kept in lockstep manually for MVP).
- **Two-pass placement.** (1) LLM → schema validation; (2) slot exclusivity + AABB collision + nudge. LLM is never re-prompted on conflict — the placement layer degrades gracefully.
- **Generate-then-save split.** `/generate-layout` is anonymous and stateless; persistence is a separate authenticated call.
- **Static catalog.** Catalog is a checked-in JSON file; no admin UI, no DB table.
- **First-person designer voice.** Enforced in system prompt and reinforced by per-item `rationale` strings tied to specific objects.

---

## 7. Features

### F1 — Wizard (3 steps)

- **Step 1 Dimensions:** numeric inputs for `width_m` (2–12), `length_m` (2–12), `height_m` (2.2–4, default 2.6). Room type pre-selected to `living_room`.
- **Step 2 Style:** 3 visual cards. Each card = hero image + name + 1-line descriptor.
- **Step 3 Preferences:** chip group `[more_seating, more_open_space, more_storage]`, max 2 selectable, "Pick up to 2" hint.
- Progress bar, Back button always available.

### F2 — Generate

- POST `/generate-layout` with the wizard payload + optional seed.
- Loading state with deterministic skeleton (no spinner-roulette anxiety): show wireframe of empty room while LLM call runs.
- Target p95 latency < 8s.

### F3 — 3D viewer

- R3F scene: `<Room>` (parameterized box with palette materials) + `<Furniture>` per item (.glb via `useGLTF`, primitive fallback for `primitive:*`).
- Controls: OrbitControls (orbit/zoom/pan), `maxDistance: 15`, sensible polar limits.
- 3 preset camera buttons: Top-down · 3-quarter · Eye-level.
- Click-to-select: highlights item, opens `<ItemPopover>` with name, dimensions, per-item rationale.
- Subtle "click + drag to rotate" hint on first load.

### F4 — Result sidebar

- Sticky right panel, three labeled blocks:
  - **Layout** — item list with thumbnail, name, slot.
  - **Palette** — three named swatches (wall / floor / accent) with hex.
  - **Why this works** — `designExplanation` string (first-person designer voice).
- Above canvas: chip row echoing inputs ("4×5m · Scandinavian · More storage").
- Bottom: `Regenerate`, `Adjust preferences`, `Save`.

### F5 — Auth & save

- Supabase Auth (email + at least one OAuth — Google).
- `Save` on a layout: if anon, open login modal; on auth, POST `/layouts` with the current Layout and a `roomId` (creating a Room on first save).
- "My layouts" list page lazily fetches user's layouts; clicking one rehydrates the viewer.

### F6 — Slot resolver (server-side, pure)

```python
def resolve_slot(slot: str, room: RoomDims, footprint: Footprint, facing: str = "auto") -> Transform: ...
```

- Wall slots use `t ∈ {0.2, 0.5, 0.8}` along wall length, inward offset = `footprint.d/2 + 0.07`, yaw from inward normal.
- Corner slots: position offset by `(footprint.w/2 + 0.05, footprint.d/2 + 0.05)` along both walls; yaw = 45° bisector toward room center.
- Floor slots: `center` (origin), `center_front` (+Z quarter), `entry` (south wall center inside).
- `facing` override rotates yaw to point at a cardinal direction or `center`.

### F7 — Placement pipeline (server-side)

```
LLM JSON
  → Pydantic validate
  → catalogId lookup
  → allowedSlotKinds check
  → slot exclusivity (with co-occupancy allow-list)
  → resolve_slot per item
  → AABB collision pass (0.05m wall margin + per-item front clearance)
  → on conflict: try alternate t ∈ {0.15, 0.85}; if still conflict, drop lowest-priority item
  → enrich items with {position, rotation_y, footprint, model}
  → return Layout
```

### F8 — Catalog (10 items)

Items: `sofa_3seat`, `armchair`, `coffee_table`, `tv_stand`, `bookshelf`, `corner_shelf`, `floor_lamp`, `rug`, `side_table`, `plant_large`.

Per item: `{ id, name, footprint{w,d,h}, clearance{front,sides,back}, allowedSlotKinds[], model }`.

Co-occupancy: `rug + coffee_table` may share `center`.

Drop-priority (low → high): `plant_large < side_table < floor_lamp < bookshelf < armchair < coffee_table < tv_stand < sofa_3seat < rug`.

### F9 — Slot vocabulary (19)

- **Walls (12):** `{north,east,south,west}_wall_{left,center,right}`
- **Corners (4):** `corner_{NE,NW,SE,SW}`
- **Floor (3):** `center`, `center_front`, `entry`

Coordinate convention: room centered at origin; +X east, +Z south, +Y up.

---

## 8. Technology Stack

### Frontend

- **Next.js** 14 (App Router) + TypeScript 5.x
- **React** 18
- **Tailwind CSS** 3.x
- **React Three Fiber** + **@react-three/drei** (OrbitControls, Bounds, useGLTF, Html, PerspectiveCamera)
- **Zustand** for wizard state; **TanStack Query** for server state
- **Supabase JS client** for auth + reads
- **Radix UI** primitives + **shadcn/ui** for forms/modals

### Backend

- **Python** 3.12
- **FastAPI** + **uvicorn**
- **Pydantic** v2 (schemas + JSON Schema export)
- **httpx** for outbound calls
- **openai** SDK (Azure endpoint)
- **PyJWT** + **cryptography** for Supabase JWT verification
- **pytest** for tests

### Data / Auth

- **Supabase** (Postgres 15, Auth, Storage)
- RLS policies on `profiles`, `rooms`, `layouts`

### LLM

- **Azure OpenAI** — `gpt-4o` deployment
- Structured output / JSON schema mode (strict)
- `temperature=0.7`, `seed` (random or user-provided)

### Hosting / Ops

- **Frontend:** Vercel (or Azure Static Web Apps)
- **Backend:** Azure Container Apps (containerized FastAPI, `minReplicas: 1` during demo periods)
- **Secrets:** Azure Key Vault, mounted as env vars to Container App
- **CI/CD:** GitHub Actions — frontend build to Vercel; backend image build → ACR → Container App revision

### Optional / future

- Supabase Storage or Azure Blob for thumbnails
- Application Insights / Logfire for tracing
- pnpm workspaces if monorepo discipline is desired

---

## 9. Security & Configuration

### Authentication

- Supabase Auth handles email + OAuth (Google).
- Frontend uses `SUPABASE_ANON_KEY` only.
- FastAPI receives JWT in `Authorization: Bearer <token>`, verifies via Supabase JWKS, extracts `sub` (user id).
- `/generate-layout` accepts unauthenticated calls (anon trial).
- All `/layouts` and `/rooms` routes require valid JWT.

### Authorization / data isolation

- Postgres RLS on every user-owned table (`profiles`, `rooms`, `layouts`) keyed on `auth.uid() = user_id`.
- Backend never uses Supabase service role for end-user requests; service role used only for offline admin scripts.

### Configuration management

Backend env vars (sourced from Azure Key Vault):

| Variable | Purpose |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI base URL |
| `AZURE_OPENAI_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT` | Deployment name (e.g. `gpt-4o`) |
| `AZURE_OPENAI_API_VERSION` | API version (e.g. `2024-10-21`) |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_JWKS_URL` | JWKS endpoint for JWT verification |
| `SUPABASE_ANON_KEY` | Public anon key (for any server-side anon reads, optional) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `LOG_LEVEL` | `info` / `debug` |

Frontend env vars (Vercel):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI base URL |

### Security scope

**In scope:**

- ✅ JWT verification (JWKS-based) on all authenticated routes
- ✅ RLS-enforced tenant isolation
- ✅ Strict CORS allow-list
- ✅ Pydantic input validation on every request body
- ✅ Output schema validation on every LLM response
- ✅ HTTPS-only (Container Apps + Vercel default)
- ✅ Secrets in Key Vault, never in repo

**Out of scope (MVP):**

- ❌ Rate limiting beyond Container Apps defaults
- ❌ WAF / DDoS hardening
- ❌ Pen-test
- ❌ SOC 2 / GDPR DPA (no PII beyond email collected)
- ❌ Audit logging
- ❌ Captcha on anon generate (rely on Azure OpenAI quotas)

### Deployment considerations

- Container App: `minReplicas: 1` for demo windows (avoid 2s cold start), revert to `0` for cost savings off-demo.
- CORS allow-list must include both Vercel preview + production domains.
- JWKS keys cached in-process for 10 minutes.

---

## 10. API Specification

Base URL: `https://api.interior-flow-3d.example/v1`

### `GET /catalog`

Returns furniture catalog. Public, cacheable.

**Response 200:**
```json
{
  "items": [
    {
      "id": "sofa_3seat",
      "name": "3-seat sofa",
      "footprint": {"w": 2.10, "d": 0.95, "h": 0.85},
      "clearance": {"front": 0.70, "sides": 0.10, "back": 0.05},
      "allowedSlotKinds": ["wall"],
      "model": "/models/sofa_3seat.glb"
    }
  ]
}
```

### `POST /generate-layout`

Generates a layout. Anonymous OK.

**Request:**
```json
{
  "roomType": "living_room",
  "width_m": 4.0,
  "length_m": 5.0,
  "height_m": 2.6,
  "style": "scandinavian",
  "preferences": ["more_storage"],
  "seed": 12345
}
```

**Response 200:** `Layout` (resolved, with positions/rotations).

```json
{
  "style": "scandinavian",
  "palette": {
    "wall":   {"name": "Soft White",  "hex": "#F4F1EC"},
    "floor":  {"name": "Light Oak",   "hex": "#D6BFA0"},
    "accent": {"name": "Sage",        "hex": "#A7B79A"}
  },
  "items": [
    {
      "catalogId": "sofa_3seat",
      "slot": "south_wall_center",
      "facing": "auto",
      "rationale": "Anchors the seating zone facing the TV wall.",
      "position": [0.0, 0.0, 2.025],
      "rotation_y": 0,
      "footprint": {"w": 2.10, "d": 0.95, "h": 0.85},
      "model": "/models/sofa_3seat.glb"
    }
  ],
  "designExplanation": "I placed the 3-seat sofa against the south wall to anchor the conversational zone, leaving the north wall free for the TV stand and bookshelf so storage is concentrated where you'll use it most.",
  "seed": 12345,
  "warnings": []
}
```

**Errors:**

- `422` — invalid input (Pydantic).
- `502` — LLM produced unrecoverable output.
- `503` — LLM upstream failure.

### `POST /rooms`

**Auth:** JWT.

**Request:**
```json
{ "name": "Living room v1", "roomType": "living_room", "width_m": 4.0, "length_m": 5.0, "height_m": 2.6 }
```

**Response 201:** `Room`.

### `GET /rooms`

**Auth:** JWT. Returns list of user's rooms.

### `POST /layouts`

**Auth:** JWT.

**Request:**
```json
{ "roomId": "uuid", "layout": { /* Layout object */ } }
```

**Response 201:** `{ "id": "uuid" }`.

### `GET /layouts`

**Auth:** JWT. Returns list of user's layouts (id, room ref, style, created_at, thumbnail_url).

### `GET /layouts/{id}`

**Auth:** JWT (RLS enforces ownership).

**Response 200:** full `Layout` payload.

### `DELETE /layouts/{id}`

**Auth:** JWT.

**Response 204.**

### Layout JSON Schema (LLM contract)

```json
{
  "type": "object",
  "required": ["style","palette","items","designExplanation"],
  "additionalProperties": false,
  "properties": {
    "style": {"type":"string","enum":["scandinavian","minimal","industrial"]},
    "palette": {
      "type":"object","required":["wall","floor","accent"],"additionalProperties":false,
      "properties":{
        "wall":   {"type":"object","required":["name","hex"],"properties":{"name":{"type":"string"},"hex":{"type":"string","pattern":"^#[0-9a-fA-F]{6}$"}}},
        "floor":  {"type":"object","required":["name","hex"],"properties":{"name":{"type":"string"},"hex":{"type":"string","pattern":"^#[0-9a-fA-F]{6}$"}}},
        "accent": {"type":"object","required":["name","hex"],"properties":{"name":{"type":"string"},"hex":{"type":"string","pattern":"^#[0-9a-fA-F]{6}$"}}}
      }
    },
    "items": {
      "type":"array","minItems":3,"maxItems":10,
      "items":{
        "type":"object","required":["catalogId","slot"],"additionalProperties":false,
        "properties":{
          "catalogId":{"type":"string"},
          "slot":{"type":"string","enum":[
            "north_wall_left","north_wall_center","north_wall_right",
            "east_wall_left","east_wall_center","east_wall_right",
            "south_wall_left","south_wall_center","south_wall_right",
            "west_wall_left","west_wall_center","west_wall_right",
            "corner_NE","corner_NW","corner_SE","corner_SW",
            "center","center_front","entry"
          ]},
          "facing":{"type":"string","enum":["auto","north","south","east","west","center"],"default":"auto"},
          "rationale":{"type":"string","maxLength":140}
        }
      }
    },
    "designExplanation":{"type":"string","minLength":80,"maxLength":600}
  }
}
```

---

## 11. Success Criteria

### MVP success definition

A first-time visitor lands on the marketing page, completes the 3-step wizard, sees a credible 3D living room with placed furniture, named palette, and first-person rationale within ~10 seconds. A logged-in user can save, list, and reload layouts. The app never shows malformed output, floating furniture, or hallucinated catalog ids.

### Functional requirements

- ✅ All wizard inputs validated client- and server-side
- ✅ `/generate-layout` returns a Layout that renders cleanly in the 3D viewer
- ✅ All LLM responses pass JSON schema validation
- ✅ All catalogIds in LLM output exist in the catalog
- ✅ All slots in LLM output are in the 19-slot enum
- ✅ No two items overlap (post AABB pass)
- ✅ All wall items are flush (within 0.07m margin) and face inward
- ✅ Saved layouts reload and re-render identically
- ✅ Anon user can generate; only authed user can save
- ✅ A user cannot read or delete another user's layouts (RLS-verified test)
- ✅ Same `seed` + same inputs → same Layout (modulo LLM nondeterminism within seeded mode)

### Quality indicators

- p95 latency for `/generate-layout` < 8 seconds
- p95 viewer first-paint < 2 seconds after layout received
- Zero unhandled exceptions in 1 hour of demo use
- Catalog .glb total < 10 MB
- Lighthouse performance ≥ 80 on the result page (desktop)

### User experience goals

- 3 visible decisions max per wizard step
- Inputs echoed back on result screen
- Every furniture item has a clickable rationale
- Regenerate yields a visibly different result with same inputs
- "Save" is one click for authed users, one click + login modal for anon

---

## 12. Implementation Phases

### Phase 0 — Scaffolding (Day 0, ~0.5 day)

**Goal:** repos and infra ready, hello-world end to end.

**Deliverables:**

- ✅ Monorepo skeleton with `frontend/`, `backend/`, `supabase/`, `infra/`
- ✅ FastAPI app boots, returns `/healthz`
- ✅ Next.js app boots, fetches `/healthz` from FastAPI through deployed URL
- ✅ Supabase project created, `0001_init.sql` applied
- ✅ Azure resource group + Container Apps environment + Key Vault provisioned via Bicep
- ✅ GitHub Actions: frontend → Vercel, backend → ACR → Container App

**Validation:** end-to-end smoke test passes from production URLs.

### Phase 1 — Catalog, slot resolver, deterministic placement (Day 1)

**Goal:** non-AI parts work and are unit-tested.

**Deliverables:**

- ✅ `catalog.json` with 10 items + footprints + allowedSlotKinds
- ✅ `resolve_slot()` pure function with full unit test coverage (every slot, edge dimensions)
- ✅ Placement pipeline: schema validate → exclusivity → resolve → AABB → nudge → drop
- ✅ `GET /catalog` endpoint
- ✅ Frontend `<Room>` and `<Furniture>` R3F components rendering a hardcoded layout from a fixture
- ✅ 3 preset camera buttons + click-to-select popover

**Validation:** `pytest` green on resolver + placement; manual viewer test with a fixture layout looks correct from all 3 cameras.

### Phase 2 — LLM integration + wizard + result UX (Day 2)

**Goal:** full happy path live.

**Deliverables:**

- ✅ Azure OpenAI client with JSON schema mode, system prompt, seed support
- ✅ `POST /generate-layout` wired through full pipeline
- ✅ Wizard UI (3 steps, style cards, preference chips)
- ✅ Result page (3D viewer left, sidebar right, input chip row, Regenerate button)
- ✅ Style hero images + 1-line descriptors
- ✅ First-person designer voice enforced and visible

**Validation:** generate 10 layouts across all style × preference combinations; all render cleanly, no floating furniture, designExplanation reads naturally.

### Phase 3 — Auth, persistence, polish (Day 3)

**Goal:** save / list / reload + ship-ready.

**Deliverables:**

- ✅ Supabase Auth integrated (email + Google)
- ✅ JWT verification middleware in FastAPI
- ✅ `POST /rooms`, `POST /layouts`, `GET /layouts`, `GET /layouts/{id}`, `DELETE /layouts/{id}`
- ✅ Login modal triggered on Save when anon
- ✅ "My layouts" page
- ✅ RLS policies tested with cross-user attempt
- ✅ Loading states, error states, empty states
- ✅ Marketing landing page with screenshot + CTA
- ✅ README with run/deploy instructions
- ✅ Demo seed list (3–5 known-good seed values per style for stage demos)

**Validation:** full user journey (anon → generate → save → relog → reload → delete) completes without errors. Cross-user RLS test passes.

---

## 13. Future Considerations

### Post-MVP enhancements

- More room types: bedroom, kitchen, home office, dining room.
- Non-rectangular rooms (L-shape, with walls drawable).
- Doors and windows as constraints affecting placement and palette.
- More styles + style sub-variants (Japandi, Mid-century, Boho).
- Larger catalog with material and color variants.
- Drag-to-move furniture in viewer with snap-to-slot.
- Side-by-side variant generation ("here are 3 options").
- Chat-style refinement ("make the seating area cozier").
- Photorealistic render export (server-side, e.g. via Blender headless).

### Integration opportunities

- IKEA / Wayfair / catalog APIs for shoppable items.
- AR preview on mobile (WebXR or a thin native shell).
- Pinterest-style mood board ingestion as style inputs.
- Stripe billing for premium catalogs and high-resolution exports.

### Advanced features for later phases

- Per-user style learning: remember preferences across sessions.
- Multi-user collaboration with realtime cursors.
- Lighting design with day-night sweep and shadow accuracy.
- Accessibility / ergonomics overlays (wheelchair clearances, child safety).
- Photo-to-3D room reconstruction (mobile capture → mesh).

---

## 14. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | LLM emits invalid catalogId, slot, or schema-violating JSON | Medium | High (broken render) | Strict JSON schema mode + Pydantic validation + per-item `allowedSlotKinds` check; reject malformed output and retry once with a stricter prompt. |
| R2 | Style drift — generated layout doesn't feel like the chosen style | Medium | Medium (demo credibility) | Anchor each style with explicit palette ranges and material vocabulary in the system prompt; QA-loop against a checklist per style during Phase 2. |
| R3 | Furniture overlap or wall-clipping in 3D | Medium | High (visible bug) | Server-side AABB pass with margins + nudge + drop; integration test that runs the full pipeline 50× across style × dimension combos and asserts no overlaps. |
| R4 | Cold-start latency on Azure Container Apps spoils live demo | Low | High (bad first impression) | Set `minReplicas: 1` during demo windows; pre-warm with a `/healthz` ping before starting the demo; fall back to a recorded "demo seed" with cached result if needed. |
| R5 | Catalog .glb assets bloat the bundle / slow first paint | Medium | Medium (perf complaints) | Cap budget at 10 MB total; pick low-poly Kenney/Sketchfab CC0 models; use Draco compression on .glb; lazy-load model files only when the result page mounts. |
| R6 | RLS misconfiguration leaks layouts across users | Low | Critical (trust) | Write explicit cross-user pytest that authenticates as user A and attempts to read user B's layout via REST + direct PostgREST; block phase 3 sign-off until that test passes. |
| R7 | Azure OpenAI quota / regional availability blocks the demo | Low | High | Configure backup deployment in a second region; verify quotas in the chosen region a week before any high-stakes demo; have an Anthropic-Claude fallback adapter sketched (not implemented for MVP). |

---

## 15. Appendix

### Key dependencies

| Dependency | Purpose | Doc |
|---|---|---|
| FastAPI | Backend HTTP framework | https://fastapi.tiangolo.com |
| Pydantic v2 | Schemas / validation | https://docs.pydantic.dev |
| openai (Azure) | Azure OpenAI SDK | https://learn.microsoft.com/azure/ai-services/openai/ |
| Supabase | Auth + Postgres + RLS | https://supabase.com/docs |
| Next.js 14 | Frontend framework | https://nextjs.org/docs |
| React Three Fiber | React renderer for Three.js | https://docs.pmnd.rs/react-three-fiber |
| @react-three/drei | R3F helpers | https://github.com/pmndrs/drei |
| Azure Container Apps | Backend hosting | https://learn.microsoft.com/azure/container-apps/ |
| Azure Key Vault | Secrets | https://learn.microsoft.com/azure/key-vault/ |

### Locked decisions (from clarifying-question pass)

| # | Decision |
|---|---|
| A | LLM provider: Azure OpenAI gpt-4o, JSON schema mode |
| B | Catalog: 8 CC0 .glb + 2 primitives, includes corner pieces |
| C | Auth: anonymous Generate, login required to Save |
| D | Persistence: explicit Save button (no auto-save) |
| E | Styles: locked to 3 (Scandinavian, Minimal, Industrial) |
| F | Backend host: Azure Container Apps |
| G | Devices: desktop only, ~10 MB .glb budget |
| H | Regenerate: temperature 0.7 + hidden seed param, exposable for repeatable demos |
| I | Slot vocabulary: 19 (12 walls + 4 corners + 3 floor) |
| J | Tone: first-person designer voice in all rationale text |
| K | Latency target: < 8s p95 for `/generate-layout` |

### Research synthesis (from background sub-agents)

- **UX research:** 3-step wizards beat dense forms; visual style cards beat text labels; sidebar rationale beats modal rationale; first-person designer voice materially boosts trust; chips beat sliders for soft constraints.
- **Slot research:** ~15–20 slots is the LLM reliability ceiling; wall-relative naming beats egocentric; resolve via wall-anchor formula `wall_origin + t · wall_length + inward_normal · (depth/2 + margin)`; full physics is overkill for MVP — slot exclusivity + AABB + nudge is the sweet spot. Prior art: LayoutGPT, Holodeck, Yu et al. "Make It Home", 3D-FRONT footprint schema.

Both background agents flagged that their environment denied WebSearch / WebFetch; their findings are synthesized from training data, not live 2026 sources. Validate before relying on any specific external claim.
