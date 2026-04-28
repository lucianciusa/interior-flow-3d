# Interior Flow 3D — Product Requirements Document

**Version:** 1.0 (v1 in planning — MVP 0.1 shipped Phases 0–3)
**Status:** v1 plan locked
**Last Updated:** 2026-04-29
**Owner:** Lucian

---

## 0. Document History

| Version | Date | Notes |
|---|---|---|
| 0.1 (MVP) | 2026-04-27 | Initial spec. Phases 0–3 shipped: anon Generate, single living room, 3 styles, 10 items, save/load. |
| 1.0 (v1) | 2026-04-29 | Adds product hierarchy (Projects → Rooms → Layouts), 4 room types, 5 styles, ~40-item tagged catalog with glTF/Meshopt/KTX2 + HDRI/PBR, zones + two-pass LLM generation, design system pass, marketing landing, share links, soft Pro affordances. MVP wire contracts preserved as extensions; existing prod data wiped (dev/demo only). |

---

## 1. Executive Summary

Interior Flow 3D is an AI-powered web app that generates 3D interior design proposals across multiple residential room types. Users organize their work into **Projects** (a residence/engagement), each containing one or more **Rooms** (living, bedroom, dining, home office), each holding multiple named **Layouts** (sibling variants generated from wizard inputs). For each Layout, users enter approximate dimensions, pick a style (Scandinavian, Minimal, Industrial, Japandi, Mid-century), select up to two preferences, and receive a generated 3D scene: items placed via a slot-based pipeline, palette + materials, and a first-person designer rationale.

The product's value proposition is **commercial-SaaS feel with realistic scope**: it intentionally avoids the all-in-one CAD complexity of Planner 5D / Coohom and the photo-only flow of RoomGPT, sitting in the middle as a fast, opinionated copilot for non-designers. The AI never emits raw coordinates; it picks abstract zones and slots from a controlled vocabulary, and the server resolves them to positions. This separation keeps LLM output reliable and the 3D layer testable.

**v1 goal:** ship a polished, multi-room AI design copilot with a tagged catalog, two-pass zone-aware generation, project hierarchy, share links, and a real design system — all on the existing FastAPI + Supabase + Next.js + R3F + Azure OpenAI stack, without breaking the contracts established in the MVP.

---

## 2. Mission

> Make AI-generated interior design feel **intentional, explainable, and instantly visualizable** — without asking users to think like CAD operators.

### Core principles

1. **Constrained AI, free user.** LLM picks from a small slot/zone vocabulary and a tagged, room-type-filtered catalog; the user only makes high-level taste decisions.
2. **Trust through specificity.** Every layout decision is named ("I placed the sofa facing the window…") and tied to objects in the scene.
3. **Polish over breadth.** Four room types, five styles, ~40 items — done well — beats ten room types done shallowly.
4. **Reproducibility via persistence.** Saved Layout JSON is the source of truth; `seed` is a soft demo aid.
5. **Stack honesty.** Use the boring, productive stack (FastAPI, Supabase, Next.js, Azure) Lucian already knows; no novelty for novelty's sake.
6. **Extend, don't replace.** v1 adds tags/zones/projects on top of MVP contracts. Old schemas evolve via additive enums and optional fields.

---

## 3. Target Users

### Primary persona — "Curious homeowner"

- Non-designer adult planning to redecorate one or more rooms.
- Comfortable with web apps, not with CAD tools.
- Wants inspiration and a starting point, plus the ability to organize multiple rooms in a project and compare options.
- Pain points: text-only AI tools feel abstract; CAD tools feel like homework; image-only AI tools (RoomGPT-style) are pretty but un-actionable; multi-room planners (Planner 5D) overwhelming for a single residence.

### Secondary persona — "Live demo audience" (course / portfolio / hiring)

- Reviewer evaluating Lucian's full-stack + GenAI competence.
- Cares that it works, looks credible, demonstrates thoughtful architecture, and feels like a product someone would pay for.
- Pain points: demos that crash, demos that are clearly toys, demos that reveal no real engineering, demos that look like prototypes.

### Technical comfort level

- Users: low. Wizard with 3 steps, max 2 preferences, no jargon. Project/Room/Layout vocabulary mirrors mainstream interior tools (Houzz, Coohom, Planner 5D).
- Demo audience: high. Will scrutinize architecture diagram, schema, prompt strategy, and SaaS feel.

---

## 4. v1 Scope

### ✅ In Scope — Core Functionality

- ✅ **Project hierarchy**: Workspace (implicit, single per user) → Project → Room → Layout
- ✅ 4 room types: `living_room`, `bedroom`, `dining_room`, `home_office`
- ✅ Single rectangular room shape per room
- ✅ User-supplied dimensions (width, length, height) within bounded ranges per room type
- ✅ 5 styles: `scandinavian`, `minimal`, `industrial`, `japandi`, `mid_century`
- ✅ Up to 2 preference chips: `more_seating`, `more_open_space`, `more_storage` (extensible)
- ✅ Tagged furniture catalog (~40 items across room types and styles, mix of CC0 .glb + primitive fallbacks)
- ✅ AI-generated layout: zones + items + slots + palette + first-person rationale + per-item rationale
- ✅ 3D viewer in browser: orbit/zoom/pan, 3 preset cameras, click-to-select, A/B compare overlay
- ✅ Per-item rationale on click; project-level "design overview" mini-report
- ✅ Anonymous Generate (IP rate-limited 10/day); auth required to Save
- ✅ Save / list / load / delete user's own projects, rooms, layouts (named sibling variants)
- ✅ Read-only share links (signed token, revocable, 30-day default expiry)
- ✅ Curated template gallery for empty-state onboarding (5–10 example projects)
- ✅ Anonymous → first-project conversion on signup

### ✅ In Scope — Technical

- ✅ FastAPI backend with Pydantic v2 schemas as single source of truth (extended, MVP-compatible)
- ✅ Server-side slot resolver (pure function, unit-tested) — slot kinds shared, instance sets per room type
- ✅ Tag-based catalog: `{tags, room_types, placement: {surfaces, against, exclusive_with}}` replaces `allowedSlotKinds`
- ✅ Zone-aware two-pass LLM generation: Pass 1 picks zones/budget/style emphasis; Pass 2 fills items per zone in parallel
- ✅ AABB collision pass with wall margins + per-item front clearance + co-occupancy allow-list
- ✅ `StyleProfile` dataclass driving placement parameters (density, symmetry, clear-floor %)
- ✅ Azure OpenAI structured-output (JSON schema mode) calls
- ✅ Supabase Postgres + RLS + Auth, with new `projects`, `share_tokens` tables and FK migration on `rooms`/`layouts`
- ✅ Supabase JWT verification on FastAPI via JWKS
- ✅ Tagged catalog JSON server-side; .glb assets served from Azure Blob + Front Door CDN with content-hashed filenames
- ✅ glTF 2.0 / GLB only, compressed via `gltfpack -cc -tc` (Meshopt + KTX2/Basis); PBR per item; baked HDRI environment shared across scenes
- ✅ Client-side thumbnail capture via `canvas.toDataURL()` on Save, stored in Supabase Storage
- ✅ IP rate-limit middleware on `/generate-layout` (10/day per IP)
- ✅ Soft Pro affordances: lock icons on premium catalog items, quota badge, contextual upgrade modal (no billing wired)
- ✅ Layout records stamped with `catalog_version`
- ✅ Marketing landing page with autoplay 3D hero loop
- ✅ Design system pass: light primary + dark mode toggle, Geist Sans display + Inter body, locked spacing/motion/buttons
- ✅ Floating-panel app shell: thin left rail + floating top toolbar + collapsible right inspector over edge-to-edge viewport
- ✅ Azure Container Apps deployment for backend
- ✅ Vercel for frontend
- ✅ Azure Key Vault for backend secrets

### ❌ Out of Scope (v1)

- ❌ Multi-user collaboration / realtime cursors
- ❌ Floorplan drawing tools
- ❌ Non-rectangular rooms
- ❌ Doors / windows as constraints (door modeled only via `entry` slot)
- ❌ Photo-to-3D reconstruction
- ❌ Photorealistic rendering / ray tracing
- ❌ Drag-to-move furniture in viewer (item swap allowed; manual move not)
- ❌ Material / texture swap UI (palette swap only)
- ❌ Mobile + AR / VR
- ❌ Side-by-side synced multi-viewport 3D (use overlay toggle instead)
- ❌ Chat-style refinement
- ❌ Catalog beyond ~40 seeded items
- ❌ Cross-room style coherence enforcement (project-level palette default only)
- ❌ Style learning / per-user preference memory
- ❌ Payments / paywall / billing wired up
- ❌ Internationalization
- ❌ Admin dashboard / catalog management UI
- ❌ Production-grade observability stack (basic structured logging only)
- ❌ Service worker / IndexedDB persistent caching (browser HTTP cache only)
- ❌ LOD / dynamic detail reduction
- ❌ Backwards data compatibility with MVP saved layouts (existing prod data wiped during v1 migration)

---

## 5. User Stories

### Primary

1. **Quick start (anonymous).** *As a curious homeowner, I want to enter rough dimensions, pick a style, and get a 3D layout in under 10 seconds without signing up, so that I can evaluate the product before committing.*
   - Example: Maria lands on `/`, clicks "Try it free, no signup", enters 4×5m, picks "Scandinavian" + "More storage", clicks Generate; ~7s later sees a sofa, bookshelf, rug, plant, and lamp arranged in a 3D living room.

2. **Convert anon trial into first project.** *As a first-time user who likes my anon result, I want to sign up and have that result automatically saved as my first project's first layout, so that I don't lose work and don't have to re-generate.*
   - Example: Maria hits Save on her anon result; the login modal frames "Save this layout to your first project"; on signup, the system auto-creates `Project: "My first project"` + `Room: "Living room"` + Layout, and she lands on `/app/projects/.../layouts/...`.

3. **Organize multiple rooms.** *As a returning user planning a whole apartment, I want to add bedroom, dining, and home office rooms to my project, each with its own dimensions, so I can think about the whole residence in one place.*
   - Example: Maria opens her project, clicks "+ New Room", picks "Bedroom", enters 3.5×4m, generates a layout. Her project sidebar now shows Living + Bedroom; she switches between them in one click.

4. **Try alternatives via named variants.** *As a user, I want to generate multiple named layout variants of the same room and compare them, so that I can pick a result I like best.*
   - Example: For her living room, Maria clicks "+ New Layout", regenerates with the same inputs, names the result "Cozy edition". The room detail page shows both variants as thumbnail cards; she marks "Cozy edition" as primary.

5. **Compare two layouts.** *As a user with multiple variants, I want to A/B compare two layouts of the same room visually, so that small differences are easier to spot.*
   - Example: Maria selects two layout cards and clicks "Compare"; the viewer loads both and lets her fade between A and B with a single slider.

6. **Understand the design.** *As a non-designer, I want to read why each piece was placed where it was, plus a short overall design overview for the room, so the AI's suggestions feel intentional and educational.*
   - Example: Clicking the sofa shows "I placed the 3-seat sofa against the south wall to leave the window unobstructed and create a clear conversational zone with the armchair." A "Design overview" block summarizes the room: "I anchored the seating zone to the south wall, kept the north wall for storage, and used the sage accent to bridge the floor and the throw pillows."

7. **Swap an item.** *As a user, I want to swap a placed item for another compatible one without re-running a full generation, so that I can fine-tune one decision without losing the rest.*
   - Example: Maria clicks the floor lamp, opens "Replace…", and picks a different style-compatible lamp from a filtered list; the viewer updates immediately, the rest of the scene is untouched.

8. **Share with a partner.** *As a user, I want to send my partner a read-only link to a layout, so that they can see it without an account.*
   - Example: Maria clicks "Share" on a layout; gets a signed URL valid for 30 days; her partner opens it on his phone and sees the 3D scene + rationale, no login.

9. **Confidence in inputs.** *As a user, I want my inputs echoed back on the result screen, so that I can spot mistakes immediately.*
   - Example: Result page shows "4×5m · Scandinavian · More storage" as a chip row above the canvas.

### Technical

10. **Schema-validated output.** *As the backend, I want every LLM response (Pass 1 + Pass 2) to be schema-validated before placement, so that malformed model output never reaches the 3D scene.*

11. **Tenant isolation.** *As a logged-in user, I want strict guarantees that I can only see my own projects, rooms, layouts, and that share links only expose the single layout they reference, so that data is never accidentally cross-leaked.*
    - Implemented via Supabase RLS on `projects`, `rooms`, `layouts`, `share_tokens` keyed on `auth.uid()`; share-link reads use a security-definer SQL function scoped to one layout id.

12. **Anon protection.** *As the platform, I want anonymous Generate to be IP rate-limited so that runaway or hostile use can't drain Azure OpenAI quota.*
    - 10 generations per IP per rolling 24h window, enforced in FastAPI middleware via Postgres-backed counter.

---

## 6. Core Architecture & Patterns

### High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 14 (App Router) — Vercel                           │
│  ─ /                — marketing (autoplay 3D hero)          │
│  ─ /app             — dashboard (projects grid)             │
│  ─ /app/projects/[pid]                                      │
│  ─ /app/projects/[pid]/rooms/[rid]    — layout variants     │
│  ─ /app/projects/[pid]/rooms/[rid]/layouts/[lid]            │
│  ─ /share/[token]   — public read-only layout              │
│  ─ R3F + drei viewer (Suspense per item, useGLTF.preload)  │
│  ─ Supabase JS client (auth + RLS reads + storage thumbs)  │
│  ─ Geist Sans + Inter, light + dark mode                    │
└────────────┬────────────────────────────────────────────────┘
             │ HTTPS, JWT bearer
             ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI (Azure Container Apps)                            │
│  ─ /catalog, /generate-layout (Pass 1 + parallel Pass 2)    │
│  ─ /projects, /rooms, /layouts (CRUD), /share/{token}       │
│  ─ Pydantic v2 models = single source of truth              │
│  ─ JWT verify via Supabase JWKS (RS256/ES256)              │
│  ─ Tag-based catalog filter + zone-aware placement pipeline │
│  ─ IP rate-limit middleware (Postgres-backed counters)      │
│  ─ StyleProfile config drives placement params              │
└────┬────────────────────────────────────────────────┬───────┘
     │                                                │
     ▼                                                ▼
┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ Azure OpenAI     │  │ Supabase             │  │ Azure Blob+Front Door│
│ gpt-4o, JSON     │  │ Auth + Postgres + RLS│  │ Tagged catalog .glb  │
│ schema mode      │  │ projects/rooms/      │  │ HDRI environment     │
│ temp=0.7+seed    │  │ layouts/share_tokens │  │ Content-hashed,      │
│ 2 calls/gen      │  │ Storage (thumbnails) │  │ immutable cached     │
└──────────────────┘  └──────────────────────┘  └──────────────────────┘
```

### Repo structure (v1)

```
interior-flow-3d/
├── frontend/                      # Next.js 14
│   ├── app/
│   │   ├── (marketing)/page.tsx               # autoplay 3D hero
│   │   ├── app/
│   │   │   ├── page.tsx                       # dashboard / projects grid
│   │   │   ├── projects/[projectId]/page.tsx
│   │   │   ├── projects/[projectId]/rooms/[roomId]/page.tsx
│   │   │   └── projects/[projectId]/rooms/[roomId]/layouts/[layoutId]/page.tsx
│   │   ├── share/[token]/page.tsx             # public read-only
│   │   └── layout.tsx
│   ├── components/
│   │   ├── shell/                             # left rail, top toolbar, inspector
│   │   ├── wizard/                            # 3-step wizard, room-type aware
│   │   ├── viewer/                            # R3F scene + HDRI + PBR + compare overlay
│   │   ├── sidebar/                           # palette, rationale, item list, swap UI
│   │   ├── projects/                          # grid, empty state, template gallery
│   │   ├── share/                             # public layout view
│   │   └── ui/                                # design system primitives
│   ├── lib/{supabase.ts, api.ts, slot-mappings.ts, design-tokens.ts}
│   └── public/  (HDRI only; catalog GLBs live on CDN)
├── backend/                       # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/{catalog,generate,projects,rooms,layouts,share}.py
│   │   ├── models/{layout,room,project,catalog,share}.py     # Pydantic v2
│   │   ├── services/
│   │   │   ├── llm.py                         # Pass 1 + Pass 2 orchestration
│   │   │   ├── slot_resolver.py               # pure, room-type-aware
│   │   │   ├── placement.py                   # AABB + zone-aware drop
│   │   │   ├── catalog_filter.py              # tag + room-type filter
│   │   │   ├── style_profiles.py              # StyleProfile loader
│   │   │   ├── rate_limit.py                  # IP middleware
│   │   │   └── supabase.py
│   │   ├── data/
│   │   │   ├── catalog.json                   # tagged ~40 items
│   │   │   ├── style_profiles.json            # 5 StyleProfile entries
│   │   │   ├── room_types.json                # slot instance sets per type
│   │   │   └── templates.json                 # curated example projects
│   │   └── prompts/{system_pass1.md, system_pass2.md}
│   ├── tests/{test_resolver.py, test_placement.py, test_llm_mock.py,
│   │          test_zones.py, test_two_pass.py, test_catalog_filter.py,
│   │          test_rls_cross_user.py, test_share_tokens.py, test_rate_limit.py}
│   ├── pyproject.toml
│   └── Dockerfile
├── supabase/migrations/
│   ├── 0001_init.sql                          # MVP
│   ├── 0002_projects_and_variants.sql         # projects, room.project_id, layout.name/is_primary
│   ├── 0003_share_tokens.sql                  # share_tokens + security-definer fn
│   └── 0004_rate_limits.sql                   # IP counter table
├── infra/{main,containerapp,keyvault,blob_frontdoor}.bicep
└── .claude/
    ├── PRD.md                                 # this file
    ├── reference/{api.md, components.md}
    └── commands/, skills/
```

### Key design patterns

- **Slot abstraction.** LLM emits zone + slot from a closed enum; never coordinates. Server resolves to transforms via a pure function with room-type-conditional instance sets.
- **Tag-based catalog.** Items declare `{tags, room_types, placement: {surfaces, against, exclusive_with}}`. Slots declare accepted tags. Scales O(items + slots), not O(items × slots).
- **Pydantic-as-contract.** Backend Pydantic models are the canonical schema; frontend TypeScript types kept in lockstep (additive enums, optional fields for v1).
- **Two-pass LLM placement.** Pass 1 picks zones + item-budget-per-zone + style emphasis (small enum, ~500 tokens). Pass 2 emits items per zone in parallel, each prompt seeing only that zone's slot subset and tag-filtered catalog (~15 items per call).
- **Server-side catalog filtering.** Catalog never sent whole to the LLM; pre-filtered by `room_type` + tag intersection + style hint before prompt assembly.
- **Style as config.** `StyleProfile` dataclass drives resolver/placement (density, symmetry, clear-floor %, palette hints). Prompt gets a short emphasis hint, not free-form prose.
- **Generate-then-save split.** `/generate-layout` is anonymous (rate-limited) and stateless; persistence is a separate authenticated call.
- **Named sibling variants.** Layouts are siblings under a Room, not linear versions; AI generation produces explorations, not edits.
- **Project-level defaults, room-level overrides.** Project stores default style + palette; wizard pre-fills from project; user overrides freely per layout.
- **Catalog versioning.** Every Layout stamped with `catalog_version`. Saved Layout JSON is the reproducibility contract; `seed` is demo aid only.
- **Versioned migrations, no MVP-data carry-over.** v1 migration assumes existing prod data is wiped (dev/demo phase). New tables and FKs use NOT NULL where appropriate without nullable-then-backfill choreography.
- **First-person designer voice.** Enforced in both Pass 1 and Pass 2 system prompts; reinforced by per-item `rationale` strings tied to specific objects and a project-level "design overview".

---

## 7. Features

### F1 — Project & Room hierarchy

- **Dashboard `/app`**: thumbnail grid of projects, "+ New Project" tile as first cell, empty state with curated template gallery (5–10 example projects users can fork).
- **Project page `/app/projects/[pid]`**: project name, default style + palette, list of rooms (sidebar), "+ New Room" CTA.
- **Room page `/app/projects/[pid]/rooms/[rid]`**: room name, dimensions, thumbnail card grid of layout variants, "+ New Layout" CTA, primary-variant marker.
- **Layout page `/app/projects/[pid]/rooms/[rid]/layouts/[lid]`**: full viewer + sidebar + share/save/duplicate/delete actions.
- **Anon → first-project conversion**: Save on an anon layout opens login modal framed as "Save this layout to your first project"; on signup, system auto-creates `Project: "My first project"` + `Room: "<room type>"` + Layout.

### F2 — Wizard (3 steps, room-type aware)

- **Step 1 Dimensions:** numeric inputs for `width_m`, `length_m`, `height_m`, with bounds per room type.
  - Living room: 3–10 × 3–10 × 2.4–4 (default 4×5×2.6).
  - Bedroom: 2.5–6 × 2.5–6 × 2.4–4 (default 3.5×4×2.6).
  - Dining room: 2.5–6 × 3–8 × 2.4–4 (default 3.5×4.5×2.6).
  - Home office: 2–5 × 2–5 × 2.4–4 (default 3×3.5×2.6).
- **Step 2 Style:** 5 visual cards. Pre-filled from project default if applicable.
- **Step 3 Preferences:** chip group, max 2 selectable, "Pick up to 2" hint. Default chips are the existing 3 (`more_seating`, `more_open_space`, `more_storage`); v1 keeps the same set, v1.1 may extend.
- Progress bar, Back button always available, "Use project defaults" shortcut.

### F3 — Generate (two-pass, zone-aware)

- POST `/generate-layout` with the wizard payload + `roomType` + optional `seed` + optional `projectId` (to apply project defaults server-side).
- **Pass 1**: LLM picks `{zones, item_budget_per_zone, style_emphasis}` from a small enum scoped to the room type. Prompt under ~1 KB.
- **Pass 2**: parallel calls, one per zone. Each prompt includes only that zone's slot instances and the tag-filtered candidate catalog (~15 items max). Outputs schema-validated independently.
- Merge → AABB collision pass → drop-priority sort by zone-essentialness → enrich with `{position, rotation_y, footprint, model}` → return resolved Layout.
- Loading state: deterministic skeleton (wireframe of empty room) while LLM calls run; per-zone shimmer fills as Pass 2 zones return.
- Target p95 latency < 10s end-to-end (relaxed from MVP's 8s due to two-pass; budget 1.5s Pass 1 + 4s Pass 2 in parallel + 1.5s placement + 3s viewer warm).
- Anonymous Generate is IP rate-limited at 10/24h.

### F4 — 3D viewer

- R3F scene: `<Room>` (parameterized box with palette materials) + `<Furniture>` per item (.glb via `useGLTF`, primitive fallback for `primitive:*`).
- **HDRI environment**: shared neutral interior HDRI (~2 MB, content-hashed, cached). PBR materials per item respond correctly to the environment.
- **Compression pipeline**: glTF/GLB only; `gltfpack -cc -tc` (Meshopt geometry + KTX2/Basis textures). Per-item budget 300–600 KB on disk, 1 MB hard ceiling.
- **Loading**: `useGLTF.preload` for resolved layout items the moment Pass 2 returns. Suspense boundary per `<Furniture>` with AABB primitive placeholder. Background prefetch of style-likely items during wizard step 2.
- **Instancing**: drei `<Instances>` for repeat `catalogId` (dining chairs, paired nightstands).
- Controls: OrbitControls (orbit/zoom/pan), `maxDistance: 15`, sensible polar limits.
- 3 preset cameras: Top-down, 3-quarter, Eye-level.
- Click-to-select highlights item, opens `<ItemPopover>` with name, dimensions, per-item rationale, and **Replace…** action (lists tag-compatible items in the same slot).
- **Compare overlay**: when two layouts of the same room are selected, viewer loads both into the same scene and a slider fades between them. Single viewport, single OrbitControls instance.

### F5 — Result inspector

- Floating right inspector (collapsible) with three blocks:
  - **Layout** — item list with thumbnail, name, zone, slot.
  - **Palette** — three named swatches (wall / floor / accent) with hex.
  - **Why this works** — `designExplanation` (project-level "design overview") + each item's per-piece rationale revealed on hover/click.
- Above canvas: chip row echoing inputs ("4×5m · Scandinavian · More storage").
- Bottom action bar: `Regenerate`, `Adjust preferences`, `Save`, `Share`, `Duplicate`.

### F6 — Auth & save

- Supabase Auth (email magic link + Google OAuth).
- `Save` on a layout: if anon, open login modal framed "Save this layout to your first project"; on auth, POST `/layouts` (creates Project + Room on first save).
- "Projects" dashboard page lazily fetches user's projects with thumbnails. Drill-down to Room → Layouts.
- **Variants**: `+ New Layout` on a Room duplicates the wizard inputs and runs a new generation; result is a sibling layout under the same Room. Default name "Untitled — N"; user can rename.
- **Primary variant**: each Room has one designated primary layout, used as the room thumbnail and the default open.

### F7 — Slot resolver (server-side, pure, room-type-aware)

```python
def resolve_slot(
    room_type: RoomType,
    slot: SlotId,
    room: RoomDims,
    footprint: Footprint,
    facing: Facing = "auto",
) -> Transform: ...
```

- Slot kinds shared across room types: wall thirds, corners, floor zones.
- Instance sets selected per room type; e.g. bedroom adds a `bed_wall` constraint, dining room collapses floor zones to `table_center`.
- Wall slots use `t ∈ {0.2, 0.5, 0.8}` along wall length, inward offset = `footprint.d/2 + 0.07`, yaw from inward normal.
- Corner slots: position offset by `(footprint.w/2 + 0.05, footprint.d/2 + 0.05)` along both walls; yaw = 45° bisector toward room center.
- Floor slots: parameterized per room type (`center`, `center_front`, `entry`, `table_center`, `bed_center`, `desk_anchor`).
- `facing` override rotates yaw to a cardinal direction or `center`.

### F8 — Placement pipeline (server-side, zone-aware)

```
LLM Pass 1 JSON
  → Pydantic validate (zones + budget + style_emphasis)
  → for each zone in parallel: LLM Pass 2 JSON
      → Pydantic validate
      → catalogId lookup + tag check vs zone's accepted tags
      → slot exclusivity (with co-occupancy allow-list)
      → resolve_slot per item
  → AABB collision pass (StyleProfile.wall_flush_tolerance margin + per-item front clearance)
  → on conflict: try alternate t ∈ {0.15, 0.85}
                 → still conflict: drop lowest-priority item (drop priority sorted by zone essentialness)
                 → append warning to Layout.warnings
  → enrich items with {position, rotation_y, footprint, model, zone}
  → stamp catalog_version
  → return Layout
```

### F9 — Catalog (~40 items, tagged)

- Items: full living-room set carried over (`sofa_3seat`, `armchair`, `coffee_table`, `tv_stand`, `bookshelf`, `corner_shelf`, `floor_lamp`, `rug`, `side_table`, `plant_large`) plus expansions:
  - **Bedroom**: `bed_double`, `nightstand`, `wardrobe`, `dresser`, `vanity`, `bench_end_of_bed`.
  - **Dining**: `dining_table_4`, `dining_table_6`, `dining_chair`, `sideboard`, `bar_cart`, `pendant_light`.
  - **Home office**: `desk`, `office_chair`, `bookcase_tall`, `filing_cabinet`, `monitor_stand`, `desk_lamp`.
  - **Style-specific accents**: `floor_mirror`, `art_print_set`, `area_rug_round`, `pendant_minimal`, `industrial_pipe_shelf`, `mid_century_credenza`, `japandi_low_table`, etc.
- Per item: `{ id, name, tags, room_types, placement: {surfaces, against, exclusive_with}, footprint{w,d,h}, clearance{front,sides,back}, model, premium?: bool }`.
- Co-occupancy allow-list: `rug + coffee_table` (living), `rug + dining_table_*` (dining), `bed + nightstand pair` (bedroom).
- Drop-priority computed per zone-essentialness (bed in bedroom = top; plant in any room = bottom).
- ~5 items per style flagged `premium: true` for soft Pro lock affordance (preview-able, not generate-able for free tier).

### F10 — Slot vocabulary (room-type-conditional)

Slot kinds (shared):

- **Walls (12):** `{north,east,south,west}_wall_{left,center,right}`
- **Corners (4):** `corner_{NE,NW,SE,SW}`
- **Floor (parameterized by room type):**
  - Living: `center`, `center_front`, `entry`
  - Bedroom: `bed_center`, `entry`
  - Dining: `table_center`, `entry`
  - Home office: `desk_anchor`, `entry`

Each room type publishes its own `(kinds × instances)` set server-side. Coordinate convention unchanged: room centered at origin; +X east, +Z south, +Y up.

### F11 — Zones (first-class)

Zone enum (small, room-type-conditional):

- Living: `seating_zone`, `media_zone`, `reading_nook`, `accent_zone`
- Bedroom: `sleep_zone`, `dressing_zone`, `reading_nook`
- Dining: `dining_zone`, `serving_zone`
- Home office: `work_zone`, `storage_zone`, `accent_zone`

Pass 1 picks active zones + budget. Pass 2 fills items into each zone's slot subset. Style rules attach at the zone level (e.g. minimal = max 2 zones).

### F12 — Style as config

```python
class StyleProfile(BaseModel):
    id: Style
    density: float                 # 0.0–1.0; min count of optional items
    symmetry_bias: float           # 0.0–1.0; preference for paired placement
    min_clear_floor_pct: float     # constraint on placement
    allowed_zone_count: int        # max active zones
    wall_flush_tolerance: float    # collision margin
    palette_hints: list[str]       # named hints fed to LLM
```

Loaded from `data/style_profiles.json`. Drives resolver/placement and provides a short hint to the LLM ("Scandinavian: prefer symmetry, leave floor open"). Adding a 6th style = add a config row, no code change.

### F13 — Item swap (light interactivity)

- Click placed item → Replace… → server returns a tag-compatible list of catalog items that fit the same slot and accept the same tags.
- User picks → optimistic UI swap → backend re-runs only the placement check for that one item (AABB vs current scene). On conflict: nudge or revert with toast.
- No re-prompt of LLM. No re-generation. Per-item rationale is replaced by a generic "I swapped this for X." note unless the user clicks Regenerate.

### F14 — Share-as-link

- `POST /layouts/{id}/share` → returns `{ token, url, expires_at }`.
- `GET /share/{token}` → public, returns the Layout JSON if token valid + not expired.
- Frontend route `/share/[token]` renders a read-only viewer + sidebar (no edit/save controls).
- Token is signed (HMAC + secret in Key Vault), 30-day default expiry, revocable via `DELETE /layouts/{id}/share`.
- Reads bypass RLS via a `security definer` SQL function scoped to one layout id; threat model documented in `.claude/reference/security.md`.

### F15 — Marketing & onboarding

- `/` — autoplay 3D loop (4–6s, edge-to-edge), tight headline, single primary CTA "Try it free, no signup".
- Below-fold: 3-step "how it works" mini-render strip, logo strip placeholder, 3-card "what's included" (rooms, styles, catalog).
- Footer: "Pro coming soon — free during beta" pricing teaser (no link to billing).
- First-run anon flow: dashboard `/app` redirects anon to `/app/new` (instant wizard) without account-wall.

### F16 — Design system

- **Type**: Geist Sans (display) + Inter (body). h1–h6 scale defined once.
- **Spacing**: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Audit removes any odd values.
- **Buttons**: one filled primary per screen; ghost secondary; text tertiary. No competing primaries.
- **Motion**: 150–250 ms ease-out on hover/focus/state. Skeleton loaders, never spinners.
- **Empty states**: every list/grid gets illustration + copy + single CTA.
- **Color**: light primary (default) + dark mode toggle. Brand accent reserved for the active wizard step + primary CTA.

### F17 — Soft Pro affordances

- **Lock icons** on `premium: true` catalog items in any item picker. Preview allowed, generation excludes them for the free tier.
- **Quota badge** in top toolbar: "X/10 free generations today" (anon and free-tier users).
- **Contextual upgrade modal** only when user hits quota or clicks a locked item; copy frames "Pro coming soon — join the waitlist". No billing wired.

---

## 8. Technology Stack

### Frontend

- **Next.js** 14 (App Router) + TypeScript 5.x
- **React** 18
- **Tailwind CSS** 3.x with custom design tokens
- **React Three Fiber** + **@react-three/drei** (OrbitControls, Bounds, useGLTF, Html, PerspectiveCamera, Environment, Instances, Merged)
- **three.js** with `KTX2Loader`, `MeshoptDecoder`
- **Zustand** for wizard + selection state; **TanStack Query** for server state
- **Supabase JS client** for auth + reads + thumbnail uploads
- **Radix UI** primitives + **shadcn/ui** for forms/modals
- **next-themes** for light/dark mode
- **Geist Sans** + **Inter** via `next/font`

### Backend

- **Python** 3.12
- **FastAPI** + **uvicorn**
- **Pydantic** v2 (schemas + JSON Schema export)
- **httpx** for outbound calls
- **openai** SDK (Azure endpoint), used in JSON schema strict mode
- **PyJWT** + **cryptography** for Supabase JWT verification (RS256/ES256)
- **asyncio.gather** for Pass 2 zone parallelism
- **pytest** + **pytest-asyncio** for tests

### Data / Auth

- **Supabase** (Postgres 15, Auth, Storage)
- RLS on `profiles`, `projects`, `rooms`, `layouts`, `share_tokens`, `rate_limits`
- Storage bucket `thumbnails` (public read, owner write)

### LLM

- **Azure OpenAI** — `gpt-4o` deployment
- Structured output / JSON schema mode (strict)
- `temperature=0.7`, `seed` (random or user-provided)
- Two calls per generation: Pass 1 (zones) + N parallel Pass 2 (items per zone)

### Hosting / Ops

- **Frontend:** Vercel
- **Backend:** Azure Container Apps (containerized FastAPI, `minReplicas: 1` during demo periods)
- **Catalog assets:** Azure Blob Storage + Front Door CDN, content-hashed filenames, `Cache-Control: public, max-age=31536000, immutable`
- **Secrets:** Azure Key Vault, mounted as env vars
- **CI/CD:** GitHub Actions — frontend build to Vercel; backend image build → ACR → Container App revision

### Asset pipeline

- **Authoring:** Blender (low/mid-poly, PBR materials)
- **Compression:** `gltfpack -cc -tc` (Meshopt geometry + KTX2 textures, UASTC for normals, ETC1S for albedo/AO)
- **Validation:** `gltf-validator` in CI before upload
- **HDRI:** single neutral interior HDRI (Polyhaven CC0), KTX2 compressed, ~2 MB
- **Sourcing v1:** all CC0 (Quaternius, Poly Pizza, KayKit). Sketchfab Standard upgrades deferred to v1.1.

### Optional / future

- Application Insights / Logfire for tracing
- pnpm workspaces if monorepo discipline tightens
- Sketchfab Standard hero assets (~$300–500) deferred until paid tier exists

---

## 9. Security & Configuration

### Authentication

- Supabase Auth handles email magic link + Google OAuth.
- Frontend uses `SUPABASE_ANON_KEY` only.
- FastAPI receives JWT in `Authorization: Bearer <token>`, verifies via Supabase JWKS (RS256 + ES256 supported), extracts `sub` (user id).
- `/generate-layout` accepts unauthenticated calls (anon trial), gated by IP rate-limit.
- `/share/{token}` accepts unauthenticated calls; token verified via HMAC + DB lookup.
- All `/projects`, `/rooms`, `/layouts` write routes require valid JWT.

### Authorization / data isolation

- Postgres RLS on every user-owned table (`profiles`, `projects`, `rooms`, `layouts`, `share_tokens`) keyed on `auth.uid() = user_id`.
- `share_tokens` reads via `security definer` SQL function `get_shared_layout(token text)` that returns one layout row scoped by token validity; bypasses RLS only for that single layout id.
- Backend never uses Supabase service role for end-user requests; service role used only for offline admin scripts and the share-token lookup function.

### Rate limiting

- IP rate-limit on `POST /generate-layout`: 10 per 24h per IP, sliding window.
- Implemented as FastAPI dependency reading/writing a `rate_limits` Postgres table (no Redis dependency in v1).
- Authenticated users in good standing not subject to anon limit (separate per-user quota deferred to Pro tier).

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
| `SUPABASE_ANON_KEY` | Forwarded to PostgREST as `apikey` |
| `SUPABASE_SERVICE_ROLE_KEY` | Used only for share-token lookup function |
| `SHARE_TOKEN_SECRET` | HMAC signing secret for share tokens |
| `CDN_BASE_URL` | Azure Front Door endpoint for catalog assets |
| `CATALOG_VERSION` | String stamped on every generated Layout |
| `RATE_LIMIT_ANON_PER_DAY` | Default 10 |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `LOG_LEVEL` | `info` / `debug` |

Frontend env vars (Vercel):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI base URL |
| `NEXT_PUBLIC_CDN_BASE_URL` | Catalog asset CDN base |
| `NEXT_PUBLIC_HDRI_URL` | Shared HDRI environment URL |

### Security scope

**In scope (v1):**

- ✅ JWT verification (JWKS-based) on all authenticated routes
- ✅ RLS-enforced tenant isolation on all user-owned tables
- ✅ Strict CORS allow-list
- ✅ Pydantic input validation on every request body
- ✅ Output schema validation on every LLM Pass 1 + Pass 2 response
- ✅ HTTPS-only (Container Apps + Vercel default)
- ✅ Secrets in Key Vault, never in repo
- ✅ Share tokens HMAC-signed, expiring, revocable
- ✅ Anon IP rate-limit on generate
- ✅ Cross-user RLS test extended to projects + share tokens

**Out of scope (v1):**

- ❌ WAF / DDoS hardening beyond Container Apps defaults
- ❌ Pen-test
- ❌ SOC 2 / GDPR DPA (no PII beyond email collected)
- ❌ Audit logging
- ❌ Captcha on anon generate (rely on IP rate-limit)

### Deployment considerations

- Container App: `minReplicas: 1` for demo windows (avoid 2s cold start), revert to `0` for cost savings off-demo.
- CORS allow-list must include both Vercel preview + production domains.
- JWKS keys cached in-process for 10 minutes.
- Front Door + Blob: enable HTTPS-only, attach `Cache-Control: public, max-age=31536000, immutable` at upload time.
- Existing MVP prod data is wiped during the 0002 migration; tag a `pre-v1` git ref before applying.

---

## 10. API Specification

Base URL: `https://api.interior-flow-3d.example/v1`

### Public

#### `GET /catalog?room_type=<type>&style=<style>`

Returns catalog filtered by room type + style. Public, cacheable.

**Response 200:** items with `tags`, `placement`, `model`, `premium?`. Free tier omits `premium: true` items unless `?include_premium=true&preview=true`.

#### `POST /generate-layout`

Generates a layout. Anonymous OK (IP rate-limited 10/24h).

**Request:**
```json
{
  "roomType": "living_room",
  "width_m": 4.0,
  "length_m": 5.0,
  "height_m": 2.6,
  "style": "scandinavian",
  "preferences": ["more_storage"],
  "seed": 12345,
  "projectId": "uuid?"
}
```

**Response 200:** resolved `Layout` (zones + items + positions/rotations + `catalog_version`).

**Errors:**

- `422` — invalid input (Pydantic).
- `429` — IP rate-limit exceeded.
- `502` — LLM produced unrecoverable output after one retry.
- `503` — LLM upstream failure.

#### `GET /share/{token}`

Public read-only fetch of a shared layout. Returns 404 on expired/revoked token.

### Authenticated (JWT required)

#### Projects

- `POST /projects` → create
- `GET /projects` → list user's projects (with thumbnail of primary layout per project's first room)
- `GET /projects/{id}` → details (rooms list)
- `PATCH /projects/{id}` → rename, update default style/palette
- `DELETE /projects/{id}` → cascades to rooms + layouts + share tokens

#### Rooms

- `POST /projects/{pid}/rooms` → create
- `GET /projects/{pid}/rooms` → list
- `PATCH /rooms/{id}` → rename, update dimensions
- `DELETE /rooms/{id}` → cascades to layouts

#### Layouts

- `POST /layouts` body `{ roomId, layout, name? }` → persist a generated Layout as a new variant
- `GET /layouts` → list user's layouts (id, room ref, project ref, style, name, is_primary, created_at, thumbnail_url)
- `GET /layouts/{id}` → full Layout payload (RLS-enforced)
- `PATCH /layouts/{id}` → rename, set as primary
- `POST /layouts/{id}/duplicate` → clone (new variant under same room)
- `DELETE /layouts/{id}`

#### Sharing

- `POST /layouts/{id}/share` → `{ token, url, expires_at }`
- `DELETE /layouts/{id}/share` → revoke

### Layout JSON Schema (v1, LLM Pass 2 contract — items + final assembled Layout)

```json
{
  "type": "object",
  "required": ["style","palette","zones","items","designExplanation","catalogVersion"],
  "additionalProperties": false,
  "properties": {
    "style": {"type":"string","enum":["scandinavian","minimal","industrial","japandi","mid_century"]},
    "roomType": {"type":"string","enum":["living_room","bedroom","dining_room","home_office"]},
    "palette": {
      "type":"object","required":["wall","floor","accent"],"additionalProperties":false,
      "properties":{
        "wall":   {"type":"object","required":["name","hex"]},
        "floor":  {"type":"object","required":["name","hex"]},
        "accent": {"type":"object","required":["name","hex"]}
      }
    },
    "zones": {
      "type":"array","minItems":1,"maxItems":4,
      "items":{
        "type":"object","required":["id","kind","itemBudget"],"additionalProperties":false,
        "properties":{
          "id":{"type":"string"},
          "kind":{"type":"string"},
          "itemBudget":{"type":"integer","minimum":1,"maximum":6}
        }
      }
    },
    "items": {
      "type":"array","minItems":3,"maxItems":12,
      "items":{
        "type":"object","required":["catalogId","slot","zone"],"additionalProperties":false,
        "properties":{
          "catalogId":{"type":"string"},
          "zone":{"type":"string"},
          "slot":{"type":"string"},
          "facing":{"type":"string","enum":["auto","north","south","east","west","center"],"default":"auto"},
          "rationale":{"type":"string","maxLength":140}
        }
      }
    },
    "designExplanation":{"type":"string","minLength":80,"maxLength":600},
    "catalogVersion":{"type":"string"}
  }
}
```

Pass 1 schema (zones-only) is a subset emitting just `{zones, styleEmphasis}` from a small enum.

---

## 11. Success Criteria

### v1 success definition

A first-time visitor lands on the marketing page, completes the 3-step wizard anonymously, sees a credible 3D living room within ~10 seconds, hits Save, signs up via the contextual modal, and is dropped into a real Project containing their saved Layout. They can add a bedroom Room, generate variants, mark a primary, share a read-only link, and toggle dark mode. The app feels like a product, not a prototype, and never shows malformed output, floating furniture, hallucinated catalog ids, or cross-user data.

### Functional requirements

- ✅ All wizard inputs validated client- and server-side with room-type-aware bounds
- ✅ `/generate-layout` returns a Layout that renders cleanly across all 4 room types × 5 styles × 3 preference combos
- ✅ All LLM responses (Pass 1 + Pass 2) pass JSON schema validation
- ✅ All catalogIds in LLM output exist in the catalog and pass tag check vs zone
- ✅ All slots in LLM output are valid for the room type
- ✅ No two items overlap (post AABB pass)
- ✅ All wall items flush within `wall_flush_tolerance` and face inward
- ✅ Saved layouts reload and re-render identically
- ✅ Anon user can generate; only authed user can save
- ✅ Anon Generate IP rate-limit enforces 10/24h
- ✅ A user cannot read or delete another user's projects/rooms/layouts (RLS-verified test)
- ✅ Share tokens expire and revoke correctly; revoked token returns 404
- ✅ Each saved Layout carries a `catalog_version`
- ✅ Item swap respects tag and slot constraints; no AABB violation post-swap
- ✅ Compare overlay loads two layouts in the same scene and fades cleanly

### Quality indicators

- p95 latency for `/generate-layout` < 10 seconds (Pass 1 + parallel Pass 2 + placement)
- p95 viewer first-paint < 2.5 seconds (warm cache) / < 5 seconds (cold)
- 60 fps steady-state with 15 items on Iris Xe class GPU
- Per-room catalog cold download ≤ 8 MB (HDRI ~2 MB shared + items ~5 MB + JS ~1 MB)
- Per-item GLB on disk ≤ 1 MB hard cap, 300–600 KB target
- JS viewer route bundle < 300 KB gzipped
- Lighthouse performance ≥ 80 on `/share/[token]` and result page (desktop)
- Zero unhandled exceptions in 1 hour of demo use

### User experience goals

- 3 visible decisions max per wizard step
- Inputs echoed back on result screen
- Every furniture item has a clickable rationale; every layout has a project-level "design overview"
- Regenerate yields a visibly different result with same inputs (named sibling variant)
- "Save" is one click for authed users, one click + login modal for anon, with "save to your first project" framing
- Compare overlay is one click from any room with ≥2 layouts
- Share link is one click, copy-to-clipboard, with expiry visible
- Dark mode toggle persists per user

---

## 12. Implementation Phases

MVP Phases 0–3 are shipped (see version 0.1 history). v1 adds Phases 4–7.

### Phase 4 — Product hierarchy (3–4 days)

**Goal:** Projects + Rooms + Layout variants + share links + dashboard. No catalog or LLM changes.

**Deliverables:**

- ✅ Migration `0002_projects_and_variants.sql`: `projects` table + RLS, `rooms.project_id` FK, `layouts.name`/`is_primary`/`thumbnail_url`/`catalog_version`
- ✅ Migration `0003_share_tokens.sql`: `share_tokens` + `get_shared_layout()` security-definer fn
- ✅ Backend routes: `/projects` CRUD, `/rooms` extended, `/layouts` extended, `/layouts/{id}/share`, `/share/{token}`, `/layouts/{id}/duplicate`
- ✅ Frontend: dashboard `/app` (projects grid), project page, room page (variant grid), layout page reorganized
- ✅ Anon → first-project conversion on signup
- ✅ Share-link UI + public `/share/[token]` route
- ✅ Compare overlay (two-layout fade in single viewport)
- ✅ Item swap UI (tag-compatible alternatives)
- ✅ Existing prod data wiped, `pre-v1` git ref tagged

**Validation:** RLS cross-user test extended to projects + share; share token expiry/revoke tests pass; full anon → save → project → room → variants → share user journey green.

### Phase 5 — Design system & marketing (2–3 days)

**Goal:** Make it look like a product, not a prototype.

**Deliverables:**

- ✅ Design tokens locked: spacing scale, type pairing (Geist Sans + Inter), button hierarchy, motion values
- ✅ Light + dark mode via `next-themes`, persisted per user
- ✅ Floating-panel app shell (left rail, top toolbar, collapsible right inspector, edge-to-edge viewport)
- ✅ Marketing landing page with autoplay 3D loop hero, below-fold sections, footer pricing teaser
- ✅ Curated template gallery (5–10 example projects, generated + cleaned by hand, seeded into DB)
- ✅ Empty state illustrations for projects, rooms, layouts
- ✅ Soft Pro affordances: lock icons on `premium: true` items, quota badge in top toolbar, contextual upgrade modal

**Validation:** visual QA across both themes; Lighthouse ≥ 80 on landing + result; design system audit passes (no off-scale spacing, no competing primaries).

### Phase 6 — Catalog scaling & multi-room (5–7 days)

**Goal:** Tagged catalog, glTF pipeline, 4 room types live, zones-as-data introduced.

**Deliverables:**

- ✅ Hard-cut catalog migration: `allowedSlotKinds` removed, `tags` + `room_types` + `placement` added; `catalog.json` rewritten
- ✅ `services/catalog_filter.py`: tag + room-type filter
- ✅ Slot resolver extended with room-type-conditional instance sets (`data/room_types.json`)
- ✅ Asset pipeline: Blender → `gltfpack -cc -tc` → `gltf-validator` in CI → upload to Azure Blob with content hash
- ✅ Azure Blob + Front Door provisioned via Bicep; `CDN_BASE_URL` wired
- ✅ HDRI environment loaded shared across all rooms, KTX2 compressed
- ✅ PBR materials per item; `<Environment>` integration; instancing for repeats
- ✅ ~40 catalog items sourced (CC0) and processed through pipeline
- ✅ Bedroom, dining, home-office rooms wired in wizard + viewer + slot resolver
- ✅ `Layout.zones` schema introduced (still optional client-side; populated server-side)
- ✅ Per-room cold download budget verified ≤ 8 MB

**Validation:** integration test runs full pipeline 50× across `room_type × style × preference` combos and asserts no overlaps; per-asset budget test passes; visual QA across all 20 (room × style) combos.

### Phase 7 — Two-pass generation & style profiles (3–5 days)

**Goal:** Zone-aware two-pass LLM, StyleProfile config, 5 styles live.

**Deliverables:**

- ✅ `prompts/system_pass1.md` + `prompts/system_pass2.md`
- ✅ `services/llm.py` refactored to orchestrate Pass 1 (zones) + parallel Pass 2 (items per zone) via `asyncio.gather`
- ✅ `services/style_profiles.py` + `data/style_profiles.json` with 5 entries
- ✅ Placement pipeline integrated with `StyleProfile` (clear-floor %, symmetry bias)
- ✅ Drop-priority sorted by zone-essentialness
- ✅ Two new styles (`japandi`, `mid_century`) wired end-to-end with palette hints + style-specific accent items
- ✅ `tests/test_zones.py`, `tests/test_two_pass.py`, `tests/test_style_profiles.py`
- ✅ Latency budget verified: p95 < 10s end-to-end
- ✅ All Layouts stamped with `catalog_version`

**Validation:** generate 50+ layouts across all `room × style × preference` combos; assert zone coverage, no zone-essential drops, style-recognizable rationale text. Demo seed list (3–5 known-good seeds per style × room type) committed to `docs/demo-seeds.md`.

### Total v1 budget

~14–19 days of focused work across all four phases. Order is fixed: 4 → 5 → 6 → 7. v1 launches with all four shipped (no v1.1 split).

---

## 13. Future Considerations

### Post-v1 enhancements

- **Pro tier billing wired**: Stripe + soft-locked items → real-locked, per-user generation quota tiers.
- **Collaboration**: invite others to a project (read-only or edit), Supabase Realtime for cursors.
- **Custom Sketchfab Standard hero assets**: ~$300–500 of upgrades for top items per style; later commission custom for top 10.
- **More room types**: kitchen, kids' room, bathroom, entryway.
- **Non-rectangular rooms** (L-shape) with light floorplan drawing.
- **Doors and windows as constraints** affecting placement and palette.
- **More styles + sub-variants**: Boho, Industrial-loft, Coastal.
- **Drag-to-move furniture** with snap-to-slot inside the existing slot system.
- **Material/texture swap UI** (palette + finish pickers).
- **Side-by-side variant generation** ("here are 3 options at once") if the overlay-fade UX has strong adoption.
- **Chat-style refinement** ("make the seating area cozier") fed back into Pass 2 inputs.
- **Photorealistic render export** server-side (Blender headless or PathTracer in WebGPU).
- **Rate-limited per-user generation quotas** distinct from anon limit.

### Integration opportunities

- IKEA / Wayfair / catalog APIs for shoppable items.
- AR preview on mobile (WebXR or thin native shell).
- Pinterest-style mood-board ingestion as style inputs.
- Stripe billing for Pro and high-resolution exports.

### Advanced features

- Per-user style learning (with explicit override surface).
- Multi-residence per user (Workspace becomes plural).
- Lighting design with day-night sweep and shadow accuracy.
- Accessibility / ergonomics overlays (wheelchair clearances, child safety).
- Photo-to-3D room reconstruction.

---

## 14. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Two-pass latency exceeds 10s p95 budget | Medium | High | Parallelize Pass 2 with `asyncio.gather`; shrink Pass 1 prompt under 1 KB; pin Azure OpenAI region with lowest p50; warm cache via `/healthz` on demo days; fall back to single-pass for ≤25-item rooms. |
| R2 | LLM emits invalid catalogId, slot, or schema-violating JSON in either pass | Medium | High | Strict JSON schema mode + Pydantic validation; per-zone tag check vs catalog; reject and retry once with stricter prompt; never retry-loop forever. Per-zone retry isolates failures so one bad zone doesn't kill the whole layout. |
| R3 | Catalog growth pushes prompts past LLM enum reliability | Medium | High | Server-side filtering by `room_type` + `style` + `tags` before prompt assembly caps each Pass 2 prompt at ~15 candidates regardless of total catalog size. |
| R4 | Per-room download exceeds 8 MB ceiling | Medium | Medium | Enforce `gltfpack -cc -tc` + KTX2 in CI, fail build if any item > 1 MB; share single HDRI across all rooms; lazy-load only the resolved layout's items via `useGLTF.preload`. |
| R5 | RLS misconfiguration leaks projects/rooms/layouts/share tokens across users | Low | Critical | Cross-user pytest extended to all new tables + share tokens; share-token reads forced through `security definer` function scoped to single layout; CI gate on RLS test. |
| R6 | Share token leakage exposes unintended layouts | Low | Medium | HMAC-signed tokens, 30-day default expiry, revocable, single-layout scope; document threat model in `.claude/reference/security.md`. |
| R7 | Anon abuse drains Azure OpenAI quota | Medium | High | IP rate-limit (10/24h) in middleware; backup deployment in second region; `RATE_LIMIT_ANON_PER_DAY` env-toggleable for demo bursts. |
| R8 | Cold-start latency on Azure Container Apps spoils live demo | Low | High | `minReplicas: 1` during demo windows; pre-warm with `/healthz` ping; recorded demo seed fallback. |
| R9 | Style drift: japandi/mid_century don't visually distinguish | Medium | Medium | `StyleProfile` per style with concrete numeric placement params; style-specific accent items in catalog; QA-loop checklist per style during Phase 7. |
| R10 | Existing MVP layouts lost in migration since data is wiped | Low (current state) | Low | `pre-v1` git ref tagged before migration; explicit comms if any real users have saved data; v1 documented as a destructive migration. |

---

## 15. Locked Decisions (v1)

These are settled — do not relitigate without re-reading this section first.

- LLM = Azure OpenAI gpt-4o, JSON schema strict mode, `temperature=0.7` + seed.
- LLM generation = **two-pass**: Pass 1 zones + budget + style emphasis, Pass 2 items per zone in parallel.
- Catalog = **tag-based** schema (`tags`, `room_types`, `placement`); `allowedSlotKinds` removed in v1 (hard-cut).
- Catalog size = ~40 items v1, all CC0 sources (Quaternius / Poly Pizza / KayKit). Sketchfab Standard upgrades deferred to v1.1.
- Asset format = **glTF/GLB only**, compressed via `gltfpack -cc -tc` (Meshopt + KTX2). Per-item ≤ 1 MB hard, 300–600 KB target.
- Hosting = **Azure Blob + Front Door CDN** for catalog assets; content-hashed filenames; immutable cache.
- HDRI = single shared neutral interior environment (~2 MB), KTX2 compressed.
- Materials = **PBR per item**; lighting = **baked HDRI** (no real-time soft shadows in v1).
- Hierarchy = **Project → Room → Layout**; Workspace is implicit single per user.
- Layouts = **named sibling variants**, not linear versions. One designated primary per room.
- Auth = anonymous Generate (IP rate-limited 10/24h), login required to Save.
- Anon → first-project conversion = automatic on signup, project named "My first project".
- Share = signed token, revocable, 30-day default expiry, public read-only route.
- Comparison = **overlay fade in single viewport** (not synced multi-viewport 3D).
- Item interactivity = **swap** (tag-compatible) only; no manual move.
- Styles = **5 locked**: `scandinavian`, `minimal`, `industrial`, `japandi`, `mid_century`.
- Style influence = `StyleProfile` config (density, symmetry, clear-floor %, palette hints) drives placement; LLM gets short emphasis hint, not free-form prose.
- Slot vocabulary = **slot kinds shared, instance sets per room type**. Floor zones parameterized per room type.
- Zone vocabulary = small enum, room-type-conditional. First-class in schema starting Phase 6.
- Reproducibility = saved Layout JSON; `seed` is demo aid; every Layout stamped with `catalog_version` (single version field, not multi).
- Visual register = light primary + dark mode toggle.
- Type = **Geist Sans (display) + Inter (body)**.
- Voice = **first-person** ("I placed…").
- Marketing hero = **autoplay 3D loop** (4–6 s).
- Empty dashboard = **curated template gallery** (5–10 hand-built).
- Soft Pro affordances ship in Phase 5; billing not wired.
- Backend host = Azure Container Apps (`minReplicas: 1` for demo windows).
- Devices = desktop only.
- Latency target = **< 10 s p95** for `/generate-layout` (relaxed from MVP's 8s due to two-pass).
- Tone = first-person designer voice everywhere user-facing.
- Existing prod data = **wiped** during v1 migration (dev/demo phase, no real users to preserve).
- Phase order = **4 → 5 → 6 → 7**. v1 launches with all four shipped.
- Naming = "Interior Flow 3D" kept.

---

## 16. Notes / Gotchas

- **Read the matching reference doc first.** `.claude/reference/components.md` for any work in `frontend/`; `.claude/reference/api.md` for any work in `backend/`. They cover patterns this file does not.
- **Pydantic models are the contract.** When adding a field, update the Pydantic model first; mirror to TypeScript second; update the system prompt third (Pass 1 vs Pass 2 as appropriate). Never hand-write JSON the LLM should produce.
- **The LLM never sees footprints.** Prompt only contains item ids + names + tags + zone/slot enum. The footprint catalog is server-only.
- **Two-pass orchestration is the new latency hot spot.** Run Pass 2 zones with `asyncio.gather`; never sequentially.
- **`primitive:*` model ids** are not file paths — `Furniture.tsx` branches on the prefix and renders a primitive mesh.
- **Cold start.** Container Apps scale-to-zero takes ~2 s. Set `minReplicas: 1` before any live demo and ping `/healthz` to warm up.
- **Seed is hidden by default.** It's in the request payload but not in the wizard UI; expose only via a query param (`?seed=12345`) for repeatable demos. Reproducibility lives in saved Layout JSON, not seed.
- **Co-occupancy allow-list** lives in `placement.py`. v1 list: `{rug, coffee_table}` (living), `{rug, dining_table_*}` (dining), `{bed, nightstand pair}` (bedroom).
- **Slot enum drift.** If a slot or room-type slot set changes, four places must change in lockstep: Pydantic enum, system prompt (Pass 1 + Pass 2), resolver instance set, placement tests. Grep for `north_wall_center` to find them all.
- **Catalog tags drift.** When adding a tag, audit every slot's accepted-tags list and every room type's zone set. Tag drift silently breaks compatibility checks.
- **Asset filename hashing.** Every GLB upload to Azure Blob must be content-hashed; the catalog JSON's `model` field references the hashed URL. Cache busting is automatic; renames are explicit catalog edits.
- **Existing data is gone.** v1 migration is destructive. Tag `pre-v1` before applying. No backfill choreography.
- **Background research agents flagged that WebSearch/WebFetch were denied** in their environment. Any "research" claims in this PRD are synthesized from training data; verify before relying on specific external sources.
- **No emojis in code.** Tailwind / Pydantic / SQL only. UI emojis only if the user explicitly requests them.

---

## 17. Appendix

### Key dependencies

| Dependency | Purpose | Doc |
|---|---|---|
| FastAPI | Backend HTTP framework | https://fastapi.tiangolo.com |
| Pydantic v2 | Schemas / validation | https://docs.pydantic.dev |
| openai (Azure) | Azure OpenAI SDK | https://learn.microsoft.com/azure/ai-services/openai/ |
| Supabase | Auth + Postgres + RLS + Storage | https://supabase.com/docs |
| Next.js 14 | Frontend framework | https://nextjs.org/docs |
| React Three Fiber | React renderer for Three.js | https://docs.pmnd.rs/react-three-fiber |
| @react-three/drei | R3F helpers (Environment, Instances, useGLTF.preload) | https://github.com/pmndrs/drei |
| three.js (`KTX2Loader`, `MeshoptDecoder`) | Asset decoding | https://threejs.org |
| `gltfpack` (Meshopt) | Asset compression | https://meshoptimizer.org/gltf |
| Azure Container Apps | Backend hosting | https://learn.microsoft.com/azure/container-apps/ |
| Azure Blob Storage + Front Door | Catalog asset hosting | https://learn.microsoft.com/azure/storage/blobs/ |
| Azure Key Vault | Secrets | https://learn.microsoft.com/azure/key-vault/ |

### Research synthesis (v1)

- **UX research (SaaS for creative tools):** anon-first wizards beat login walls; single-primary-button rule; floating panels over edge-to-edge viewport beat three-column desktop-app layouts; design system tells (4/8 spacing, 150–250 ms motion, illustrated empty states) materially separate prototypes from products; Pro affordances (lock icons, quota badge, contextual modal) signal commercial product without billing wired.
- **3D catalog research:** glTF/GLB only; Meshopt + KTX2 is the production stack; 300–600 KB per item; PBR with shared HDRI; preload on layout return; instancing for repeats; LOD overkill at MVP scene scale; CC0 (Quaternius/Poly Pizza) for breadth, paid Sketchfab Standard for hero credibility later.
- **Multi-room IA:** convergent industry pattern is Project → Room → Layout; named sibling variants beat linear versions for AI-gen products; project-level default style/palette > mandatory style profile per generation; thumbnail-grid comparison > synced multi-viewport 3D; share-as-link is high priority for SaaS feel even pre-billing; "Project / Room / Layout" lexicon matches user vocabulary.
- **Slot/constraint scaling:** ~30 enum values is reliable, ~60 risky; tag-based catalog scales O(items+slots) vs O(items×slots); per-room-type slot instance sets push room semantics into the type system; two-pass (zones → items per zone) is worth it past ~25 items; style as numeric config > geometric prose to LLM; saved Layout JSON > seed for reproducibility under a moving catalog.

Both background agents flagged that their environment denied WebSearch/WebFetch; their findings are synthesized from training data, not live 2026 sources. Validate before relying on any specific external claim.
