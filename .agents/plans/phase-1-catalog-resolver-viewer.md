# Feature: Phase 1 — Catalog, Slot Resolver, Placement Pipeline, R3F Viewer

The following plan should be complete, but validate documentation and codebase patterns and task sanity before starting implementation.

Pay special attention to naming of existing utils types and models. Import from the right files.

---

## Feature Description

Implement all non-AI parts of the Interior Flow 3D stack so they are independently unit-tested and visually validated before Phase 2 wires in the LLM. Delivers: a static furniture catalog, a pure slot-resolver function that converts 19 named slots to 3D transforms, an AABB placement pipeline, a `GET /catalog` endpoint, and a React Three Fiber viewer that renders a hardcoded fixture layout from all 3 preset cameras with click-to-select.

## User Story

As the developer (Lucian),
I want the catalog, slot math, placement pipeline, and 3D viewer all working with deterministic fixture data,
So that Phase 2 can drop in the LLM and know that everything upstream and downstream of it is correct.

## Problem Statement

Phase 0 delivered a bare skeleton with no business logic. We cannot start the LLM integration (Phase 2) until the slot resolver, placement pipeline, and 3D viewer are working and tested — otherwise a floating-furniture bug could be anywhere in the stack.

## Solution Statement

Build from the inside out: data model → pure services → router → frontend viewer. Every layer is independently testable. The frontend viewer in Phase 1 renders a hardcoded `FIXTURE_LAYOUT` constant (no API call). All 19 slots, AABB collision, and drop logic are exercised by pytest before any LLM involvement.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: `backend/app/models/`, `backend/app/services/`, `backend/app/routers/`, `backend/app/data/`, `backend/tests/`, `frontend/components/viewer/`, `frontend/lib/`
**Dependencies**: Already installed — fastapi, pydantic v2, pytest; @react-three/fiber, @react-three/drei, three, zustand

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `CLAUDE.md` (full) — naming conventions, locked decisions, coordinate system (+X east, +Z south, +Y up), slot enum, co-occupancy allow-list, drop priority list.
- `.claude/PRD.md` §7 F6/F7/F8/F9 (lines 269–310) — slot resolver math, placement pipeline steps, full catalog with 10 items, slot vocabulary. Primary spec for this phase.
- `.claude/PRD.md` §10 (lines 431–587) — `GET /catalog` response shape + Layout JSON schema (LLM contract, also the wire contract).
- `.claude/reference/api.md` §1–3 (lines 9–125) — layered layout, Pydantic models, router anatomy. Mirror exactly.
- `.claude/reference/api.md` §8 (lines 387–409) — error handling rules.
- `.claude/reference/api.md` §12 (lines 508–530) — test layout, which test files to create and their scope.
- `.claude/reference/components.md` §1–2 (lines 9–65) — file/folder conventions. Never barrel files.
- `.claude/reference/components.md` §4 (lines 128–143) — Zustand state placement rules.
- `.claude/reference/components.md` §6 (lines 205–257) — R3F Scene patterns, exact Canvas props, OrbitControls limits, shadow setup, GLTF pitfalls. Critical.
- `backend/app/main.py` — `create_app()` factory to update with router includes.
- `backend/app/config.py` — `get_settings()` lru_cache singleton pattern to mirror in catalog loader.
- `backend/tests/conftest.py` — existing `client` fixture. Add catalog fixtures here.
- `backend/tests/test_healthz.py` — test style: one function, positional `client` fixture arg.
- `frontend/lib/api.ts` — existing `authedFetch` and `ApiError`. Add `catalogQuery` here.
- `frontend/lib/types.ts` — currently `export {}` placeholder; replace entirely.
- `frontend/app/providers.tsx` — existing QueryClientProvider wrapper.
- `frontend/app/app/page.tsx` — currently shows healthz check; update to render viewer with fixture.

### New Files to Create

**Backend:**
- `backend/app/models/layout.py` — all Pydantic schemas: `SlotId`, `Style`, `Preference`, `Facing`, `GenerateLayoutRequest`, `LayoutItemLLM`, `Palette`, `LayoutLLM`, `ResolvedItem`, `Layout`
- `backend/app/models/catalog.py` — `Footprint`, `Clearance`, `CatalogItem`, `CatalogResponse`
- `backend/app/models/room.py` — `RoomCreate`, `Room` (stub models for Phase 3; leave empty except imports for now)
- `backend/app/data/catalog.json` — 10 items as a JSON array
- `backend/app/services/slot_resolver.py` — `RoomDims`, `Footprint`, `Transform` dataclasses + `resolve_slot()` pure function
- `backend/app/services/placement.py` — `PlacedItem`, `DROP_PRIORITY`, `COOCCUPY_ALLOW`, `resolve()` pipeline
- `backend/app/routers/catalog.py` — `GET /catalog`
- `backend/tests/test_resolver.py` — every slot × min/max room dims × representative footprints
- `backend/tests/test_placement.py` — exclusivity, AABB, co-occupancy, drop priority, allowedSlotKinds

**Frontend:**
- `frontend/lib/stores/viewer.ts` — Zustand viewer store (selectedItem, cameraPreset)
- `frontend/lib/slot-mappings.ts` — `SLOT_LABELS: Record<SlotId, string>`
- `frontend/components/viewer/Scene.tsx` — `<Canvas>` + lights + `<OrbitControls>` + `<Bounds>`
- `frontend/components/viewer/Room.tsx` — parameterized walls + floor planes with palette materials
- `frontend/components/viewer/Furniture.tsx` — `.glb` via `useGLTF` or `primitive:*` box fallback, click-to-select
- `frontend/components/viewer/CameraPresets.tsx` — 3 buttons setting camera position via `useThree`
- `frontend/components/viewer/ItemPopover.tsx` — selected item overlay (name, footprint dims, rationale)

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [Pydantic v2 — Literal & ConfigDict](https://docs.pydantic.dev/latest/concepts/types/#literal-type)
  — Section: Type checking with Literal. Why: `SlotId = Literal[...]` is the closed enum pattern.
- [FastAPI — APIRouter](https://fastapi.tiangolo.com/tutorial/bigger-applications/#apirouter)
  — Section: Including a Router. Why: `app.include_router(catalog.router)` pattern in `main.py`.
- [React Three Fiber — Canvas](https://docs.pmnd.rs/react-three-fiber/api/canvas)
  — Section: Canvas props (`dpr`, `shadows`, `gl`). Why: must match components.md §6 exactly.
- [drei — useGLTF](https://github.com/pmndrs/drei?tab=readme-ov-file#usegltf)
  — Section: cloning and preloading. Why: GLTF must be cloned or wrapped in `<group>` — mutating cached scene breaks re-renders.
- [drei — OrbitControls](https://github.com/pmndrs/drei?tab=readme-ov-file#orbitcontrols)
  — Section: `makeDefault`, `maxPolarAngle`. Why: `maxPolarAngle={Math.PI / 2.1}` prevents camera going under floor.
- [drei — Bounds](https://github.com/pmndrs/drei?tab=readme-ov-file#bounds)
  — Section: `clip observe margin`. Why: auto-frames the room scene.
- [Zustand — create](https://zustand.docs.pmnd.rs/getting-started/introduction)
  — Section: Defining a store. Why: viewer store pattern; use selectors not whole-store reads.

---

## Coordinate System (Critical — read before implementing slot resolver)

Room is centered at origin. Axes:
- `+X` = east (right wall)
- `-X` = west (left wall)
- `+Z` = south (front/entry wall)
- `-Z` = north (back wall)
- `+Y` = up

Wall positions:
- North wall face: `z = -length_m / 2`
- South wall face: `z = +length_m / 2`
- East wall face: `x = +width_m / 2`
- West wall face: `x = -width_m / 2`

**Model default facing convention (must be consistent):**
`rotation_y = 0` → model faces `+Z` direction.

Rotation math (`R_y(θ)` acting on the default `+Z` forward vector):
- `x = sin(θ)`, `z = cos(θ)`

Derived inward-facing rotations per wall:
| Wall | Inward direction | rotation_y |
|---|---|---|
| North | +Z (south) | `0` |
| South | -Z (north) | `math.pi` |
| East | -X (west) | `-math.pi / 2` |
| West | +X (east) | `math.pi / 2` |

Corner bisector rotations (facing toward room center diagonal):
| Corner | rotation_y |
|---|---|
| `corner_NE` (+X, -Z corner) → faces SW (-X, +Z) | `-math.pi / 4` |
| `corner_NW` (-X, -Z corner) → faces SE (+X, +Z) | `math.pi / 4` |
| `corner_SE` (+X, +Z corner) → faces NW (-X, -Z) | `-3 * math.pi / 4` |
| `corner_SW` (-X, +Z corner) → faces NE (+X, -Z) | `3 * math.pi / 4` |

Facing override `rotation_y` mapping:
```python
import math
FACING_ROTATIONS = {
    "south": 0.0,
    "north": math.pi,
    "east":  math.pi / 2,
    "west": -math.pi / 2,
}
# "center": atan2(-px, -pz) from item world position
# "auto": use slot default
```

---

## Slot Resolver Math (slot → Transform)

```
resolve_slot(slot, room_dims, footprint, facing="auto") → Transform(position, rotation_y)
```

**t-parameter for wall left/center/right:**
- `_left`   → `t = 0.2`
- `_center` → `t = 0.5`
- `_right`  → `t = 0.8`

**North / South walls** (wall runs east-west along X):
- `x = (t - 0.5) * room.width_m`
- `z_north = -(room.length_m / 2 - fp.d / 2 - 0.07)` (inward from -Z face)
- `z_south = +(room.length_m / 2 - fp.d / 2 - 0.07)` (inward from +Z face)
- `y = fp.h / 2`
- Default `rotation_y`: north=0, south=π

**East / West walls** (wall runs north-south along Z):
- `z = (t - 0.5) * room.length_m`
- `x_east = +(room.width_m / 2 - fp.d / 2 - 0.07)` (inward from +X face)
- `x_west = -(room.width_m / 2 - fp.d / 2 - 0.07)` (inward from -X face)
- `y = fp.h / 2`
- Default `rotation_y`: east=-π/2, west=π/2

**Corner slots:**
- `corner_NE`: `x = +(width/2 - fp.w/2 - 0.05)`, `z = -(length/2 - fp.d/2 - 0.05)`
- `corner_NW`: `x = -(width/2 - fp.w/2 - 0.05)`, `z = -(length/2 - fp.d/2 - 0.05)`
- `corner_SE`: `x = +(width/2 - fp.w/2 - 0.05)`, `z = +(length/2 - fp.d/2 - 0.05)`
- `corner_SW`: `x = -(width/2 - fp.w/2 - 0.05)`, `z = +(length/2 - fp.d/2 - 0.05)`
- `y = fp.h / 2`
- Default `rotation_y`: see corner table above.

**Floor slots:**
- `center`: `(0, fp.h/2, 0)`, `rotation_y = math.pi` (faces north by default)
- `center_front`: `(0, fp.h/2, room.length_m * 0.25)`, `rotation_y = math.pi`
- `entry`: `(0, fp.h/2, room.length_m * 0.4)`, `rotation_y = math.pi`

**Facing override:** if `facing != "auto"` and `facing != "center"`, replace `rotation_y` with `FACING_ROTATIONS[facing]`. If `facing == "center"`, compute `math.atan2(-px, -pz)` using final position.

---

## Placement Pipeline (placement.py)

```python
DROP_PRIORITY: dict[str, int] = {
    "plant_large": 1, "side_table": 2, "floor_lamp": 3,
    "bookshelf": 4, "armchair": 5, "coffee_table": 6,
    "tv_stand": 7, "sofa_3seat": 8, "rug": 9,
}

COOCCUPY_ALLOW: set[frozenset[str]] = {frozenset({"rug", "coffee_table"})}

SLOT_KINDS: dict[str, str] = {
    "north_wall_left": "wall", ..., "corner_NE": "corner", ..., "center": "floor", ...
}
```

Pipeline steps in `resolve(llm_layout: LayoutLLM, request: GenerateLayoutRequest, catalog: dict[str, CatalogItem]) -> Layout`:

1. **catalogId lookup** — build `catalog_map: dict[str, CatalogItem]` from catalog list. For each LLM item, if `catalogId` not in `catalog_map`, drop with warning `"Unknown catalogId: {id}"`.
2. **allowedSlotKinds check** — if `SLOT_KINDS[slot]` not in `item.allowedSlotKinds`, drop with warning `"Slot {slot} not allowed for {catalogId}"`.
3. **Sort by priority desc** — sort the validated items by `DROP_PRIORITY.get(catalogId, 0)` descending so high-priority items get placed first.
4. **Slot exclusivity** — maintain `occupied: dict[str, str]` (slot → catalogId). For each item, check if slot occupied. Exception: allow if `frozenset({new_item, occupant}) in COOCCUPY_ALLOW`. If occupied without exception, try alternate positions (wall items only: try shifting t to 0.15 or 0.85 → new slot name); if still blocked, drop lowest-priority conflicting item.
5. **resolve_slot** — call `resolve_slot(slot, room_dims, footprint, facing)` → `Transform`.
6. **AABB collision** — against all already-placed items. AABB in XZ plane (items always on floor; no Y-axis collision needed). For 0°/180° rotation: `half_xz = (fp.w/2, fp.d/2)`. For ±90°: `half_xz = (fp.d/2, fp.w/2)`. For ±45° (corners): `r = sqrt((fp.w/2)**2 + (fp.d/2)**2)` → `half_xz = (r, r)`. Collision margin: 0.05m. If collision, nudge wall items (try t=0.15 / t=0.85); if still colliding, mark conflicted.
7. **Conflict resolution** — of conflicting pair, drop the one with lower `DROP_PRIORITY`; append `"Dropped {catalogId}: collision with {other}"` to warnings.
8. **Enrich items** — for each placed item, build `ResolvedItem` by merging `LayoutItemLLM` fields with `{position, rotation_y, footprint: {w,d,h}, model}` from catalog.
9. **Return** `Layout(style, palette, items=placed, designExplanation, seed=request.seed, warnings)`.

---

## Catalog JSON (10 Items)

```json
[
  {
    "id": "sofa_3seat",
    "name": "3-seat sofa",
    "footprint": {"w": 2.10, "d": 0.95, "h": 0.85},
    "clearance": {"front": 0.70, "sides": 0.10, "back": 0.05},
    "allowedSlotKinds": ["wall"],
    "model": "/models/sofa_3seat.glb"
  },
  {
    "id": "armchair",
    "name": "Armchair",
    "footprint": {"w": 0.90, "d": 0.90, "h": 0.85},
    "clearance": {"front": 0.50, "sides": 0.15, "back": 0.05},
    "allowedSlotKinds": ["wall", "corner"],
    "model": "/models/armchair.glb"
  },
  {
    "id": "coffee_table",
    "name": "Coffee table",
    "footprint": {"w": 1.20, "d": 0.60, "h": 0.45},
    "clearance": {"front": 0.30, "sides": 0.20, "back": 0.20},
    "allowedSlotKinds": ["floor"],
    "model": "/models/coffee_table.glb"
  },
  {
    "id": "tv_stand",
    "name": "TV stand",
    "footprint": {"w": 1.60, "d": 0.45, "h": 0.55},
    "clearance": {"front": 0.50, "sides": 0.10, "back": 0.05},
    "allowedSlotKinds": ["wall"],
    "model": "/models/tv_stand.glb"
  },
  {
    "id": "bookshelf",
    "name": "Bookshelf",
    "footprint": {"w": 0.80, "d": 0.35, "h": 1.80},
    "clearance": {"front": 0.30, "sides": 0.05, "back": 0.05},
    "allowedSlotKinds": ["wall"],
    "model": "/models/bookshelf.glb"
  },
  {
    "id": "corner_shelf",
    "name": "Corner shelf",
    "footprint": {"w": 0.50, "d": 0.50, "h": 1.50},
    "clearance": {"front": 0.20, "sides": 0.05, "back": 0.05},
    "allowedSlotKinds": ["corner"],
    "model": "primitive:corner_shelf"
  },
  {
    "id": "floor_lamp",
    "name": "Floor lamp",
    "footprint": {"w": 0.35, "d": 0.35, "h": 1.60},
    "clearance": {"front": 0.30, "sides": 0.10, "back": 0.10},
    "allowedSlotKinds": ["wall", "corner"],
    "model": "/models/floor_lamp.glb"
  },
  {
    "id": "rug",
    "name": "Area rug",
    "footprint": {"w": 2.40, "d": 1.60, "h": 0.02},
    "clearance": {"front": 0.00, "sides": 0.00, "back": 0.00},
    "allowedSlotKinds": ["floor"],
    "model": "/models/rug.glb"
  },
  {
    "id": "side_table",
    "name": "Side table",
    "footprint": {"w": 0.50, "d": 0.50, "h": 0.55},
    "clearance": {"front": 0.10, "sides": 0.10, "back": 0.05},
    "allowedSlotKinds": ["wall", "corner"],
    "model": "primitive:side_table"
  },
  {
    "id": "plant_large",
    "name": "Large plant",
    "footprint": {"w": 0.60, "d": 0.60, "h": 1.60},
    "clearance": {"front": 0.20, "sides": 0.10, "back": 0.10},
    "allowedSlotKinds": ["corner", "wall"],
    "model": "/models/plant_large.glb"
  }
]
```

---

## Patterns to Follow

**Pydantic models** (`api.md` §2):
- `ConfigDict(extra="forbid")` on every wire model.
- `Literal[...]` not bare `str` for closed enums.
- `X | None` not `Optional[X]`.
- No `from pydantic import Optional` — use `from typing import Literal`.

**Router anatomy** (`api.md` §3):
```python
router = APIRouter(prefix="/catalog", tags=["catalog"])

@router.get("", response_model=CatalogResponse, status_code=200)
async def get_catalog() -> CatalogResponse: ...
```

**Catalog loader** — module-level singleton, not per-request:
```python
from functools import lru_cache
import json
from pathlib import Path

@lru_cache(maxsize=1)
def _load_catalog() -> CatalogResponse:
    path = Path(__file__).parent.parent / "data" / "catalog.json"
    raw = json.loads(path.read_text())
    return CatalogResponse(items=[CatalogItem.model_validate(i) for i in raw])
```

**Pure service** — `slot_resolver.py` imports only `math`, `dataclasses`, `typing`. Zero FastAPI, zero Pydantic.

**Zustand selector pattern** (`components.md` §4):
```ts
const selectedItem = useViewerStore((s) => s.selectedItem);
```
Not: `const { selectedItem } = useViewerStore()`.

**GLTF clone pattern** (`components.md` §6, §13):
```tsx
const { scene } = useGLTF(model);
return <primitive object={scene.clone()} />;
```
Never mutate `scene` directly.

**Click handler in R3F** (`components.md` §6):
```tsx
<group onClick={(e) => { e.stopPropagation(); setSelected(item); }}>
```
Always `e.stopPropagation()`.

**No barrel files** — import `from "@/components/viewer/Furniture"`, not from an index.

---

## IMPLEMENTATION PLAN

### Phase A: Backend Models

Build Pydantic schemas first — everything else imports from them.

**Tasks:**
- Create `models/layout.py` with all type aliases and models
- Create `models/catalog.py` with `Footprint`, `Clearance`, `CatalogItem`, `CatalogResponse`
- Create `models/room.py` as a stub (empty models for Phase 3)

### Phase B: Catalog Data + Loader

Static data in JSON; `lru_cache` loader that returns a validated `CatalogResponse`.

**Tasks:**
- Write `data/catalog.json` (10 items, exact schema above)
- Implement `_load_catalog()` in `routers/catalog.py`
- Implement `GET /catalog` router
- Register router in `main.py`

### Phase C: Slot Resolver (pure function)

No FastAPI, no Pydantic — pure Python dataclasses and math.

**Tasks:**
- Define `RoomDims`, `Footprint`, `Transform` frozen dataclasses
- Implement `resolve_slot()` covering all 19 slots + facing override
- Write `test_resolver.py` — every slot × min and max room dims

### Phase D: Placement Pipeline

Stateful algorithm that consumes sorted LLM items and returns a `Layout`.

**Tasks:**
- Implement `placement.py` with `DROP_PRIORITY`, `COOCCUPY_ALLOW`, `resolve()` pipeline
- Write `test_placement.py` — exclusivity, AABB, drop, co-occupancy

### Phase E: Frontend Types + Stores

TypeScript mirrors of backend models; Zustand viewer store.

**Tasks:**
- Populate `lib/types.ts` (full set of types mirroring Pydantic)
- Create `lib/slot-mappings.ts` with human labels for all 19 slots
- Create `lib/stores/viewer.ts` (selectedItem + cameraPreset)

### Phase F: R3F Viewer Components

Build viewer bottom-up: Room → Furniture → Scene → CameraPresets + ItemPopover.

**Tasks:**
- Implement `Room.tsx` — 5 planes (floor + 4 walls) with palette hex materials
- Implement `Furniture.tsx` — GLTF loader + primitive fallback + click handler
- Implement `Scene.tsx` — Canvas shell with lights, OrbitControls, Bounds, Suspense
- Implement `CameraPresets.tsx` — 3 buttons (Top-down / 3-Quarter / Eye-level)
- Implement `ItemPopover.tsx` — reads selectedItem from Zustand, overlay div
- Update `app/app/page.tsx` — render Scene with hardcoded `FIXTURE_LAYOUT`

---

## STEP-BY-STEP TASKS

### CREATE `backend/app/models/layout.py`

- **IMPLEMENT**: All types from `api.md` §2 (lines 46–124). Exact field names, constraints, and order. `SlotId` Literal with all 19 slots. `GenerateLayoutRequest` with `frozen=True`. `LayoutItemLLM`, `Palette`, `LayoutLLM`, `ResolvedItem`, `Layout`.
- **IMPORTS**: `from typing import Literal`, `from pydantic import BaseModel, Field, ConfigDict`.
- **PATTERN**: `api.md` §2 code block — copy verbatim, do not paraphrase.
- **GOTCHA**: `Preference` has only 3 values. `Facing` has 6 values. `LayoutLLM.items` has `min_length=3, max_length=10`. `Layout.warnings = Field(default_factory=list)`. `ResolvedItem` **extends** `LayoutItemLLM` (inheritance) and adds `position`, `rotation_y`, `footprint`, `model` — it does NOT have `extra="forbid"` explicitly (it inherits from parent which does).
- **GOTCHA**: `ResolvedItem.footprint` type is `dict[Literal["w", "d", "h"], float]`, not the `Footprint` dataclass.
- **VALIDATE**: `cd backend && uv run python -c "from app.models.layout import Layout, SlotId; print('ok')"`

### CREATE `backend/app/models/catalog.py`

- **IMPLEMENT**:
  ```python
  from typing import Literal
  from pydantic import BaseModel, ConfigDict

  class Footprint(BaseModel):
      model_config = ConfigDict(extra="forbid")
      w: float
      d: float
      h: float

  class Clearance(BaseModel):
      model_config = ConfigDict(extra="forbid")
      front: float
      sides: float
      back: float

  class CatalogItem(BaseModel):
      model_config = ConfigDict(extra="forbid")
      id: str
      name: str
      footprint: Footprint
      clearance: Clearance
      allowedSlotKinds: list[str]
      model: str

  class CatalogResponse(BaseModel):
      model_config = ConfigDict(extra="forbid")
      items: list[CatalogItem]
  ```
- **GOTCHA**: `allowedSlotKinds` values are `"wall"`, `"corner"`, `"floor"` — plain strings, not Literal, because the placement service maps them dynamically.
- **VALIDATE**: `cd backend && uv run python -c "from app.models.catalog import CatalogItem; print('ok')"`

### CREATE `backend/app/models/room.py`

- **IMPLEMENT**: Stub for Phase 3. Just:
  ```python
  from pydantic import BaseModel, ConfigDict
  # Room models populated in Phase 3.
  class RoomCreate(BaseModel):
      model_config = ConfigDict(extra="forbid")
  class Room(BaseModel):
      model_config = ConfigDict(extra="forbid")
  ```
- **VALIDATE**: `cd backend && uv run python -c "from app.models.room import Room; print('ok')"`

### CREATE `backend/app/data/catalog.json`

- **IMPLEMENT**: Paste the JSON array from the "Catalog JSON" section above exactly. 10 items. No wrapper object — raw array.
- **GOTCHA**: Models `corner_shelf` and `side_table` use `"primitive:corner_shelf"` and `"primitive:side_table"` (not paths). The other 8 use `/models/*.glb` paths.
- **VALIDATE**: `cd backend && python -c "import json; d=json.load(open('app/data/catalog.json')); assert len(d)==10; print('ok')"`

### CREATE `backend/app/routers/catalog.py`

- **IMPLEMENT**:
  ```python
  import json
  from functools import lru_cache
  from pathlib import Path

  from fastapi import APIRouter

  from app.models.catalog import CatalogItem, CatalogResponse

  router = APIRouter(prefix="/catalog", tags=["catalog"])

  @lru_cache(maxsize=1)
  def _load_catalog() -> CatalogResponse:
      path = Path(__file__).parent.parent / "data" / "catalog.json"
      raw: list[dict] = json.loads(path.read_text())
      return CatalogResponse(items=[CatalogItem.model_validate(i) for i in raw])

  @router.get("", response_model=CatalogResponse, status_code=200)
  async def get_catalog() -> CatalogResponse:
      return _load_catalog()
  ```
- **PATTERN**: `api.md` §3 router anatomy. `lru_cache` pattern from `config.py:21`.
- **GOTCHA**: `prefix="/catalog"` on the router, empty string `""` on the route. No `/` prefix on the route path.
- **VALIDATE**: `cd backend && uv run python -c "from app.routers.catalog import _load_catalog; r=_load_catalog(); assert len(r.items)==10; print(r.items[0].id)"`

### UPDATE `backend/app/main.py`

- **ADD**: Import and register the catalog router.
  ```python
  from app.routers import catalog

  # inside create_app(), after middleware:
  app.include_router(catalog.router)
  ```
- **PATTERN**: `api.md` §10 (lines 452–484) shows the full `main.py` pattern with all 4 routers. Add only `catalog` now; other routers come in Phase 2/3.
- **GOTCHA**: Keep `/healthz` inline — do not move it to a router file.
- **VALIDATE**: `cd backend && uv run uvicorn app.main:app --port 8001 &; sleep 2; curl -s http://localhost:8001/catalog | python -m json.tool | grep '"items"'; kill %1`

### CREATE `backend/app/services/slot_resolver.py`

- **IMPLEMENT**: Pure function module. No pydantic, no fastapi.
  ```python
  import math
  from dataclasses import dataclass

  @dataclass(frozen=True)
  class RoomDims:
      width_m: float
      length_m: float
      height_m: float

  @dataclass(frozen=True)
  class Footprint:
      w: float
      d: float
      h: float

  @dataclass(frozen=True)
  class Transform:
      position: tuple[float, float, float]
      rotation_y: float

  FACING_ROTATIONS: dict[str, float] = {
      "south": 0.0,
      "north": math.pi,
      "east": math.pi / 2,
      "west": -math.pi / 2,
  }

  def resolve_slot(
      slot: str,
      room: RoomDims,
      fp: Footprint,
      facing: str = "auto",
  ) -> Transform:
      """Resolve a named slot to a 3D transform.

      Coordinate convention: +X east, +Z south, +Y up. Room centered at origin.
      rotation_y=0 means model faces +Z direction.
      """
      pos, default_rot = _slot_position(slot, room, fp)
      rot = _apply_facing(facing, pos, default_rot)
      return Transform(position=pos, rotation_y=rot)
  ```
  
  Implement `_slot_position(slot, room, fp) -> tuple[pos, default_rot]` using the math from the "Slot Resolver Math" section above. Use a large if/elif chain or a dispatch dict keyed on slot.

  For the `t`-parameter logic, extract into a helper:
  ```python
  _T = {"left": 0.2, "center": 0.5, "right": 0.8}

  def _t_from_suffix(slot: str) -> float:
      for suffix, t in _T.items():
          if slot.endswith(f"_{suffix}"):
              return t
      raise ValueError(f"No t suffix in {slot}")
  ```

  Implement `_apply_facing(facing, pos, default_rot) -> float`:
  - If `facing == "auto"` or `facing not in FACING_ROTATIONS and facing != "center"`: return `default_rot`
  - If `facing in FACING_ROTATIONS`: return `FACING_ROTATIONS[facing]`
  - If `facing == "center"`: return `math.atan2(-pos[0], -pos[2])`

- **IMPORTS**: only `math`, `dataclasses`.
- **GOTCHA**: `y` position = `fp.h / 2` for ALL slots (items sit on the floor at y=0). Never set y=0.
- **GOTCHA**: The 0.07m wall margin is the gap between the back of the item and the wall face. Formula: `wall_face ∓ (fp.d/2 + 0.07)`. The `∓` is inward (toward room center).
- **GOTCHA**: The 0.05m corner margin is `wall_face ∓ (fp.w/2 + 0.05)` along each wall axis.
- **VALIDATE**: `cd backend && uv run python -c "from app.services.slot_resolver import resolve_slot, RoomDims, Footprint; t=resolve_slot('north_wall_center', RoomDims(4,5,2.6), Footprint(2.1,0.95,0.85)); print(t)"`

### CREATE `backend/app/services/placement.py`

- **IMPLEMENT**:
  ```python
  import math
  from app.models.catalog import CatalogItem
  from app.models.layout import GenerateLayoutRequest, Layout, LayoutLLM, ResolvedItem
  from app.services.slot_resolver import Footprint, RoomDims, resolve_slot

  DROP_PRIORITY: dict[str, int] = {
      "plant_large": 1, "side_table": 2, "floor_lamp": 3,
      "bookshelf": 4, "armchair": 5, "coffee_table": 6,
      "tv_stand": 7, "sofa_3seat": 8, "rug": 9,
  }

  COOCCUPY_ALLOW: set[frozenset[str]] = {frozenset({"rug", "coffee_table"})}

  SLOT_KINDS: dict[str, str] = {
      slot: kind
      for kind, slots in {
          "wall": [
              "north_wall_left", "north_wall_center", "north_wall_right",
              "east_wall_left", "east_wall_center", "east_wall_right",
              "south_wall_left", "south_wall_center", "south_wall_right",
              "west_wall_left", "west_wall_center", "west_wall_right",
          ],
          "corner": ["corner_NE", "corner_NW", "corner_SE", "corner_SW"],
          "floor": ["center", "center_front", "entry"],
      }.items()
      for slot in slots
  }

  def resolve(
      llm: LayoutLLM,
      request: GenerateLayoutRequest,
      catalog: list[CatalogItem],
  ) -> Layout: ...
  ```

  Pipeline steps inside `resolve()`:
  1. Build `catalog_map: dict[str, CatalogItem]`.
  2. Validate each item (catalogId in catalog, slot kind in allowedSlotKinds). Collect `valid` list, `warnings` list.
  3. Sort `valid` by `DROP_PRIORITY.get(item.catalogId, 0)` **descending**.
  4. Place items one by one; maintain `placed: list[ResolvedItem]` and `occupied: dict[str, str]`.
  5. For each item: check exclusivity → try nudge if wall item conflicts → resolve_slot → AABB check → resolve conflicts.
  6. Return `Layout(style=llm.style, palette=llm.palette, items=placed, designExplanation=llm.designExplanation, seed=request.seed, warnings=warnings)`.

  Helper `_aabb_overlap(a: ResolvedItem, b: ResolvedItem, margin: float = 0.05) -> bool`:
  - Compute `half_xz` for each item based on `rotation_y`:
    - `abs(cos(rot)) > 0.707` → axis-aligned: `(fp_w/2, fp_d/2)`
    - `abs(sin(rot)) > 0.707` → quarter-rotated: `(fp_d/2, fp_w/2)`
    - Otherwise (corner, ~45°): `r = sqrt((fp_w/2)**2 + (fp_d/2)**2)` → `(r, r)`
  - Overlap if `|ax - bx| < (ahx + bhx + margin)` AND `|az - bz| < (ahz + bhz + margin)`.

  Helper `_nudge_slot(slot: str, nudge_t: float) -> str | None`:
  - Only for wall slots. Extract wall prefix (e.g. `"north_wall"`), replace suffix with new t:
    - `0.15` → use suffix `"left"` at x offset scaled by 0.15 (no separate slot name — compute new position directly instead, or create a special alternate-slot string like `"north_wall_left_nudge"`).
    - **Simpler approach**: `nudge` doesn't create new slot names; instead, pass an override `t` to `resolve_slot`. Update `resolve_slot` signature to accept optional `t_override: float | None = None` that bypasses the `_T` lookup. This keeps slot names canonical.

- **IMPORTS**: `math`, `app.models.catalog`, `app.models.layout`, `app.services.slot_resolver`.
- **GOTCHA**: Do NOT import from `fastapi` or `routers`. Pure business logic.
- **GOTCHA**: Items not in `DROP_PRIORITY` get priority 0 (dropped first if conflict). Default handles future items gracefully.
- **GOTCHA**: `rug.h = 0.02` — rug sits practically at y=0. This means rug and coffee_table will both be at center with AABB overlap, but `COOCCUPY_ALLOW` bypasses the collision check for this pair.
- **VALIDATE**: `cd backend && uv run python -c "from app.services.placement import DROP_PRIORITY, SLOT_KINDS; print(len(SLOT_KINDS))"`  # should print 19

### UPDATE `backend/app/services/slot_resolver.py` — add `t_override`

- **ADD**: Optional `t_override: float | None = None` parameter to `resolve_slot`. When set, use it instead of `_t_from_suffix(slot)` for wall slots.
- **GOTCHA**: `t_override` only makes sense for wall slots. For corner/floor slots it is ignored.

### ADD to `backend/tests/conftest.py` — catalog fixture

- **ADD**:
  ```python
  import json
  from pathlib import Path
  import pytest
  from app.models.catalog import CatalogItem

  @pytest.fixture
  def catalog_items() -> list[CatalogItem]:
      from app.routers.catalog import _load_catalog
      return _load_catalog().items
  
  @pytest.fixture
  def catalog_map(catalog_items) -> dict[str, CatalogItem]:
      return {item.id: item for item in catalog_items}
  ```
- **VALIDATE**: `cd backend && uv run pytest tests/conftest.py -v` (no error on import)

### CREATE `backend/tests/test_resolver.py`

- **IMPLEMENT**: Pure unit tests, no FastAPI.
  ```python
  import math
  import pytest
  from app.services.slot_resolver import resolve_slot, RoomDims, Footprint, Transform

  ROOM_MIN = RoomDims(2.0, 2.0, 2.2)
  ROOM_MAX = RoomDims(12.0, 12.0, 4.0)
  ROOM_STD = RoomDims(4.0, 5.0, 2.6)

  FP_SOFA    = Footprint(2.10, 0.95, 0.85)
  FP_SMALL   = Footprint(0.35, 0.35, 1.60)  # floor_lamp
  FP_CORNER  = Footprint(0.50, 0.50, 1.50)  # corner_shelf
  FP_RUG     = Footprint(2.40, 1.60, 0.02)
  ```

  Test cases to cover (parametrize with `@pytest.mark.parametrize`):

  1. **y position** — `t.position[1] == fp.h / 2` for all 19 slots.
  2. **Within room bounds** — for all 19 slots and min/max room dims, `|x| <= width/2` and `|z| <= length/2`.
  3. **Wall margin** — for each wall slot, verify the back face of the item is within 0.07m of the wall face:
     - North wall: `abs(pos.z + length/2) - fp.d/2 <= 0.07 + 1e-9`
     - South wall: `abs(pos.z - length/2) - fp.d/2 <= 0.07 + 1e-9`
     - East wall: `abs(pos.x - width/2) - fp.d/2 <= 0.07 + 1e-9`
     - West wall: `abs(pos.x + width/2) - fp.d/2 <= 0.07 + 1e-9`
  4. **Wall rotations** — north=0, south=≈π, east=≈-π/2, west=≈π/2.
  5. **Corner rotations** — NE≈-π/4, NW≈π/4, SE≈-3π/4, SW≈3π/4.
  6. **Facing override** — `facing="north"` → `rotation_y ≈ π`; `facing="south"` → ≈0; `facing="center"` → points toward origin.
  7. **Floor slots** — center=(0, h/2, 0); center_front z > 0; entry z > center_front z.
  8. **t-parameter** — for `north_wall_left` with large room, x is significantly negative; `north_wall_right` x is significantly positive.
  9. **Min room + max footprint** — sofa (2.10m wide) in min 2m room doesn't crash; position might clip wall but no exception.

- **VALIDATE**: `cd backend && uv run pytest tests/test_resolver.py -v`

### CREATE `backend/tests/test_placement.py`

- **IMPLEMENT**: Tests for `placement.resolve()` using a minimal `LayoutLLM` fixture.

  ```python
  from app.models.layout import (
      GenerateLayoutRequest, LayoutItemLLM, LayoutLLM, Palette
  )
  from app.services.placement import resolve, DROP_PRIORITY

  PALETTE = {
      "wall":   {"name": "White", "hex": "#FFFFFF"},
      "floor":  {"name": "Oak",   "hex": "#D6BFA0"},
      "accent": {"name": "Sage",  "hex": "#A7B79A"},
  }
  STD_REQ = GenerateLayoutRequest(
      roomType="living_room", width_m=5.0, length_m=6.0,
      height_m=2.6, style="scandinavian", preferences=[]
  )
  ```

  Test cases:
  1. **Happy path** — sofa at south_wall_center, tv_stand at north_wall_center, rug at center → 3 items resolved, no warnings, positions within room bounds.
  2. **No AABB overlap** — assert no two items in result overlap (call `_aabb_overlap` on all pairs).
  3. **co-occupancy** — rug + coffee_table both at center → both placed, no warnings.
  4. **Slot exclusivity** — two sofas at south_wall_center → one placed, one dropped, warning contains "collision" or "occupied".
  5. **allowedSlotKinds** — sofa at corner_NE → dropped, warning contains "not allowed".
  6. **Unknown catalogId** — item with id "ghost_chair" → dropped, warning contains "Unknown".
  7. **Drop priority** — sofa (priority 8) vs plant_large (priority 1) both wanting same slot → plant_large dropped, sofa kept.
  8. **Wall items face inward** — every wall item in result has rotation_y corresponding to its wall's inward normal (within π/8 tolerance).
  9. **All catalogIds in result exist in catalog** — `all(item.catalogId in catalog_map for item in result.items)`.
  10. **Warnings is a list** — even on success, `result.warnings` is `[]` not `None`.

- **VALIDATE**: `cd backend && uv run pytest tests/test_placement.py -v`

### CREATE `frontend/lib/types.ts` — replace placeholder

- **IMPLEMENT**: Replace `export {}` with full TypeScript types mirroring Pydantic models.
  ```ts
  export type Style = "scandinavian" | "minimal" | "industrial";
  export type Preference = "more_seating" | "more_open_space" | "more_storage";
  export type SlotId =
    | "north_wall_left" | "north_wall_center" | "north_wall_right"
    | "east_wall_left"  | "east_wall_center"  | "east_wall_right"
    | "south_wall_left" | "south_wall_center" | "south_wall_right"
    | "west_wall_left"  | "west_wall_center"  | "west_wall_right"
    | "corner_NE" | "corner_NW" | "corner_SE" | "corner_SW"
    | "center" | "center_front" | "entry";
  export type Facing = "auto" | "north" | "south" | "east" | "west" | "center";

  export type Palette = { name: string; hex: string };
  export type PaletteMap = { wall: Palette; floor: Palette; accent: Palette };
  export type Footprint = { w: number; d: number; h: number };

  export type CatalogItem = {
    id: string;
    name: string;
    footprint: Footprint;
    clearance: { front: number; sides: number; back: number };
    allowedSlotKinds: string[];
    model: string;
  };
  export type CatalogResponse = { items: CatalogItem[] };

  export type ResolvedItem = {
    catalogId: string;
    slot: SlotId;
    facing: Facing;
    rationale?: string | null;
    position: [number, number, number];
    rotation_y: number;
    footprint: Footprint;
    model: string;
  };

  export type Layout = {
    style: Style;
    palette: PaletteMap;
    items: ResolvedItem[];
    designExplanation: string;
    seed?: number | null;
    warnings: string[];
  };

  export type GenerateRequest = {
    roomType: "living_room";
    width_m: number;
    length_m: number;
    height_m: number;
    style: Style;
    preferences: Preference[];
    seed?: number;
  };

  export type RoomDims = {
    width_m: number;
    length_m: number;
    height_m: number;
  };
  ```
- **VALIDATE**: `cd frontend && pnpm typecheck` (no errors from types.ts)

### CREATE `frontend/lib/slot-mappings.ts`

- **IMPLEMENT**:
  ```ts
  import type { SlotId } from "@/lib/types";

  export const SLOT_LABELS: Record<SlotId, string> = {
    north_wall_left:   "Back wall — left side",
    north_wall_center: "Back wall — centered",
    north_wall_right:  "Back wall — right side",
    east_wall_left:    "Right wall — far end",
    east_wall_center:  "Right wall — centered",
    east_wall_right:   "Right wall — near end",
    south_wall_left:   "Front wall — left side",
    south_wall_center: "Front wall — centered",
    south_wall_right:  "Front wall — right side",
    west_wall_left:    "Left wall — far end",
    west_wall_center:  "Left wall — centered",
    west_wall_right:   "Left wall — near end",
    corner_NE: "Back-right corner",
    corner_NW: "Back-left corner",
    corner_SE: "Front-right corner",
    corner_SW: "Front-left corner",
    center:       "Room center",
    center_front: "Center, toward the front",
    entry:        "Near the entryway",
  };
  ```
- **VALIDATE**: `cd frontend && pnpm typecheck`

### UPDATE `frontend/lib/api.ts` — add catalogQuery

- **ADD** (after `fetchHealth`):
  ```ts
  import type { CatalogResponse, Layout, GenerateRequest } from "@/lib/types";

  export const catalogQuery = () => ({
    queryKey: ["catalog"] as const,
    queryFn: () => authedFetch<CatalogResponse>("/catalog"),
    staleTime: 60 * 60 * 1000,
  });
  ```
- **GOTCHA**: `authedFetch` does not attach a Bearer token yet (no Supabase auth in Phase 1). That's correct — `/catalog` is public.
- **VALIDATE**: `cd frontend && pnpm typecheck`

### CREATE `frontend/lib/stores/viewer.ts`

- **IMPLEMENT**:
  ```ts
  import { create } from "zustand";
  import type { ResolvedItem } from "@/lib/types";

  export type CameraPreset = "top" | "quarter" | "eye";

  type ViewerStore = {
    selectedItem: ResolvedItem | null;
    setSelectedItem: (item: ResolvedItem | null) => void;
    cameraPreset: CameraPreset;
    setCameraPreset: (preset: CameraPreset) => void;
  };

  export const useViewerStore = create<ViewerStore>((set) => ({
    selectedItem: null,
    setSelectedItem: (item) => set({ selectedItem: item }),
    cameraPreset: "quarter",
    setCameraPreset: (preset) => set({ cameraPreset: preset }),
  }));
  ```
- **VALIDATE**: `cd frontend && pnpm typecheck`

### CREATE `frontend/components/viewer/Room.tsx`

- **IMPLEMENT**: Server-side it's pure geometry; must be `"use client"` because it uses R3F hooks inside the canvas.
  ```tsx
  "use client";
  import { useMemo } from "react";
  import type { PaletteMap, RoomDims } from "@/lib/types";

  type RoomProps = {
    dims: RoomDims;
    palette: PaletteMap;
  };

  export default function Room({ dims, palette }: RoomProps) {
    const { width_m: w, length_m: l, height_m: h } = dims;

    const wallMat = useMemo(() => ({ color: palette.wall.hex }), [palette.wall.hex]);
    const floorMat = useMemo(() => ({ color: palette.floor.hex }), [palette.floor.hex]);

    return (
      <group>
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[w, l]} />
          <meshStandardMaterial {...floorMat} />
        </mesh>
        {/* North wall (back, -Z face) */}
        <mesh position={[0, h / 2, -l / 2]} receiveShadow>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial {...wallMat} side={2} />
        </mesh>
        {/* South wall (+Z face) */}
        <mesh position={[0, h / 2, l / 2]} rotation={[0, Math.PI, 0]} receiveShadow>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial {...wallMat} side={2} />
        </mesh>
        {/* East wall (+X face) */}
        <mesh position={[w / 2, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[l, h]} />
          <meshStandardMaterial {...wallMat} side={2} />
        </mesh>
        {/* West wall (-X face) */}
        <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[l, h]} />
          <meshStandardMaterial {...wallMat} side={2} />
        </mesh>
      </group>
    );
  }
  ```
- **PATTERN**: `components.md` §6 — `useMemo` for materials, no inline `new THREE.Material()`.
- **GOTCHA**: `side={2}` is `THREE.DoubleSide` (value 2) — walls render from both sides so OrbitControls can see them from outside. Import `DoubleSide` from `three` or just use literal `2`.
- **GOTCHA**: No ceiling — allows top-down camera view without clipping.
- **VALIDATE**: Component renders without TS errors: `cd frontend && pnpm typecheck`

### CREATE `frontend/components/viewer/Furniture.tsx`

- **IMPLEMENT**:
  ```tsx
  "use client";
  import { useMemo } from "react";
  import { useGLTF } from "@react-three/drei";
  import { useViewerStore } from "@/lib/stores/viewer";
  import type { ResolvedItem } from "@/lib/types";

  type FurnitureProps = { item: ResolvedItem };

  function GltfMesh({ model }: { model: string }) {
    const { scene } = useGLTF(model);
    return <primitive object={scene.clone()} castShadow />;
  }

  function PrimitiveMesh({ footprint }: { footprint: ResolvedItem["footprint"] }) {
    const geometry = useMemo(
      () => [footprint.w, footprint.h, footprint.d] as [number, number, number],
      [footprint.w, footprint.h, footprint.d],
    );
    return (
      <mesh castShadow>
        <boxGeometry args={geometry} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>
    );
  }

  export default function Furniture({ item }: FurnitureProps) {
    const setSelected = useViewerStore((s) => s.setSelectedItem);
    const selected = useViewerStore((s) => s.selectedItem);
    const isSelected = selected?.catalogId === item.catalogId && selected?.slot === item.slot;

    const [px, py, pz] = item.position;
    const isPrimitive = item.model.startsWith("primitive:");

    return (
      <group
        position={[px, py, pz]}
        rotation={[0, item.rotation_y, 0]}
        onClick={(e) => { e.stopPropagation(); setSelected(isSelected ? null : item); }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}
      >
        {isPrimitive ? (
          <PrimitiveMesh footprint={item.footprint} />
        ) : (
          <GltfMesh model={item.model} />
        )}
        {isSelected && (
          <mesh>
            <boxGeometry args={[item.footprint.w + 0.05, item.footprint.h + 0.05, item.footprint.d + 0.05]} />
            <meshStandardMaterial color="#3B82F6" wireframe />
          </mesh>
        )}
      </group>
    );
  }
  ```
- **PATTERN**: `components.md` §6 — `scene.clone()`, `e.stopPropagation()`, cursor feedback, `<group>` for transforms.
- **GOTCHA**: `useGLTF` is called inside a child component (`GltfMesh`) so that the `if isPrimitive` branch doesn't violate React hooks rules. Hooks must not be called conditionally.
- **GOTCHA**: `isSelected` logic uses both `catalogId` and `slot` to handle the rug+coffee_table co-occupancy case (two items at same slot have different catalogIds).
- **GOTCHA**: GLTFs don't exist yet in Phase 1 (`public/models/` is empty). `GltfMesh` will throw in the browser for `.glb` items. Add a `Suspense` fallback. Until real GLBs are added, the fixture layout should use only `primitive:*` items for the Phase 1 visual test.
- **VALIDATE**: `cd frontend && pnpm typecheck`

### CREATE `frontend/components/viewer/CameraPresets.tsx`

- **IMPLEMENT**:
  ```tsx
  "use client";
  import { useThree } from "@react-three/fiber";
  import { useEffect } from "react";
  import { useViewerStore, type CameraPreset } from "@/lib/stores/viewer";
  import { cn } from "@/lib/utils";

  const PRESETS: { id: CameraPreset; label: string; position: [number, number, number]; target: [number, number, number] }[] = [
    { id: "top",     label: "Top",     position: [0, 12, 0],   target: [0, 0, 0] },
    { id: "quarter", label: "3/4",     position: [6, 5, 6],    target: [0, 0, 0] },
    { id: "eye",     label: "Eye",     position: [0, 1.6, 8],  target: [0, 1.0, 0] },
  ];

  function CameraController() {
    const { camera } = useThree();
    const preset = useViewerStore((s) => s.cameraPreset);

    useEffect(() => {
      const p = PRESETS.find((x) => x.id === preset);
      if (!p) return;
      camera.position.set(...p.position);
      camera.lookAt(...p.target);
    }, [preset, camera]);

    return null;
  }

  export function CameraController3D() {
    return <CameraController />;
  }

  type CameraPresetsProps = { className?: string };

  export default function CameraPresets({ className }: CameraPresetsProps) {
    const preset = useViewerStore((s) => s.cameraPreset);
    const setPreset = useViewerStore((s) => s.setCameraPreset);

    return (
      <div className={cn("flex gap-2", className)}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium transition",
              preset === p.id
                ? "bg-neutral-900 text-white"
                : "bg-white/80 text-neutral-700 hover:bg-white",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    );
  }
  ```
- **PATTERN**: `components.md` §6 — read from Zustand refs in R3F context. `CameraController3D` renders inside the `<Canvas>`; `CameraPresets` (buttons) renders outside.
- **GOTCHA**: `useThree` only works inside a `<Canvas>`. Export two components: `CameraController3D` (goes inside Canvas) and `CameraPresets` (UI buttons, goes outside Canvas).
- **VALIDATE**: `cd frontend && pnpm typecheck`

### CREATE `frontend/components/viewer/ItemPopover.tsx`

- **IMPLEMENT**:
  ```tsx
  "use client";
  import { useViewerStore } from "@/lib/stores/viewer";
  import { SLOT_LABELS } from "@/lib/slot-mappings";

  export default function ItemPopover() {
    const item = useViewerStore((s) => s.selectedItem);
    const clear = useViewerStore((s) => s.setSelectedItem);

    if (!item) return null;

    return (
      <div className="pointer-events-auto absolute bottom-4 left-4 w-72 rounded-xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
        <div className="mb-1 flex items-start justify-between">
          <p className="font-semibold leading-tight">{item.catalogId.replace(/_/g, " ")}</p>
          <button
            type="button"
            onClick={() => clear(null)}
            className="ml-2 text-neutral-400 hover:text-neutral-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mb-2 text-xs text-neutral-500">{SLOT_LABELS[item.slot]}</p>
        <p className="mb-2 text-xs text-neutral-500">
          {item.footprint.w}m × {item.footprint.d}m × {item.footprint.h}m
        </p>
        {item.rationale && (
          <p className="text-sm italic text-neutral-700">{item.rationale}</p>
        )}
      </div>
    );
  }
  ```
- **PATTERN**: `components.md` §3 — accessible close button, no inline style for static values.
- **GOTCHA**: `pointer-events-auto` needed inside a container that may have `pointer-events-none` for passthrough.
- **VALIDATE**: `cd frontend && pnpm typecheck`

### CREATE `frontend/components/viewer/Scene.tsx`

- **IMPLEMENT**:
  ```tsx
  "use client";
  import dynamic from "next/dynamic";
  import { Suspense } from "react";
  import { Canvas } from "@react-three/fiber";
  import { OrbitControls, PerspectiveCamera, Bounds } from "@react-three/drei";
  import Room from "@/components/viewer/Room";
  import Furniture from "@/components/viewer/Furniture";
  import { CameraController3D } from "@/components/viewer/CameraPresets";
  import type { Layout, RoomDims } from "@/lib/types";

  type SceneProps = {
    layout: Layout;
    dims: RoomDims;
  };

  export default function Scene({ layout, dims }: SceneProps) {
    return (
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        className="h-full w-full"
      >
        <PerspectiveCamera makeDefault position={[6, 5, 6]} fov={45} />
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          maxDistance={15}
          minDistance={2}
          maxPolarAngle={Math.PI / 2.1}
        />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 3]}
          intensity={1.0}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <CameraController3D />
        <Suspense fallback={null}>
          <Bounds clip observe margin={1.1}>
            <Room dims={dims} palette={layout.palette} />
            {layout.items.map((item) => (
              <Furniture
                key={`${item.catalogId}-${item.slot}`}
                item={item}
              />
            ))}
          </Bounds>
        </Suspense>
      </Canvas>
    );
  }
  ```
- **PATTERN**: `components.md` §6 Scene shape — mirror exactly.
- **GOTCHA**: `<Canvas>` must be inside a container with explicit height. The parent in `app/app/page.tsx` must give a height (e.g. `h-[70vh]`).
- **GOTCHA**: `Shadow-mapSize` JSX syntax for setting `shadow.mapSize` property: use `shadow-mapSize={[2048, 2048]}` (R3F auto-expands).
- **VALIDATE**: `cd frontend && pnpm typecheck`

### UPDATE `frontend/app/app/page.tsx` — render viewer with fixture

- **IMPLEMENT**: Replace the healthz query with a hardcoded fixture layout viewer.
  ```tsx
  "use client";
  import dynamic from "next/dynamic";
  import { Suspense } from "react";
  import CameraPresets from "@/components/viewer/CameraPresets";
  import ItemPopover from "@/components/viewer/ItemPopover";
  import type { Layout, RoomDims } from "@/lib/types";

  const Scene = dynamic(() => import("@/components/viewer/Scene"), { ssr: false });

  const FIXTURE_DIMS: RoomDims = { width_m: 5, length_m: 6, height_m: 2.6 };

  const FIXTURE_LAYOUT: Layout = {
    style: "scandinavian",
    palette: {
      wall:   { name: "Soft White", hex: "#F4F1EC" },
      floor:  { name: "Light Oak",  hex: "#D6BFA0" },
      accent: { name: "Sage",       hex: "#A7B79A" },
    },
    items: [
      {
        catalogId: "side_table",
        slot: "north_wall_center",
        facing: "auto",
        rationale: "I placed the side table along the back wall to keep the center open.",
        position: [0, 0.275, -(6 / 2 - 0.5 / 2 - 0.07)],
        rotation_y: 0,
        footprint: { w: 0.50, d: 0.50, h: 0.55 },
        model: "primitive:side_table",
      },
      {
        catalogId: "corner_shelf",
        slot: "corner_NW",
        facing: "auto",
        rationale: "Corner shelf fills dead space and adds storage.",
        position: [-(5 / 2 - 0.50 / 2 - 0.05), 0.75, -(6 / 2 - 0.50 / 2 - 0.05)],
        rotation_y: Math.PI / 4,
        footprint: { w: 0.50, d: 0.50, h: 1.50 },
        model: "primitive:corner_shelf",
      },
    ],
    designExplanation:
      "I created this Scandinavian layout to maximize openness while providing functional storage along the back wall.",
    seed: 42,
    warnings: [],
  };
  ```

  **Important**: Fixture items must use ONLY `primitive:*` models (since no GLBs exist in Phase 1). The positions in the fixture must be pre-computed — do NOT call `resolve_slot` from the frontend.

  Layout:
  ```tsx
  return (
    <main className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="font-semibold">Interior Flow 3D — Phase 1 Viewer</h1>
        <CameraPresets />
      </div>
      <div className="relative flex-1">
        <Suspense fallback={<div className="flex h-full items-center justify-center text-neutral-400">Loading…</div>}>
          <Scene layout={FIXTURE_LAYOUT} dims={FIXTURE_DIMS} />
        </Suspense>
        <ItemPopover />
      </div>
    </main>
  );
  ```
- **GOTCHA**: `next/dynamic` with `{ ssr: false }` is required for `<Canvas>` — WebGL is not available in SSR.
- **GOTCHA**: Fixture positions are hard-coded numbers (pre-resolved). If the slot resolver math changes, these must be updated manually. Comment as such.
- **VALIDATE**: `cd frontend && pnpm typecheck && pnpm build` (no errors)

---

## TESTING STRATEGY

### Unit Tests

**Resolver tests (`test_resolver.py`):**
- Pure Python, no fixtures needed (no DB, no network).
- Parametrize over all 19 slots with `@pytest.mark.parametrize`.
- Test at min (2×2×2.2) and max (12×12×4) room dims.
- Assert: y = fp.h/2, item within room bounds, wall margin ≤ 0.07m, correct rotation.
- Coverage target: all branches in `_slot_position` and `_apply_facing`.

**Placement tests (`test_placement.py`):**
- Use `catalog_items` fixture (from conftest) for real catalog data.
- Build minimal `LayoutLLM` fixtures inline per test.
- Assert: no AABB overlap in result, warnings list populated on conflict, priority ordering correct.
- Co-occupancy: rug + coffee_table share center, both placed.

### Integration Tests

Phase 1 has no integration tests (no Supabase, no LLM). The `/catalog` endpoint is tested via `TestClient`:
```python
def test_catalog_returns_10_items(client):
    r = client.get("/catalog")
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) == 10
    assert data["items"][0]["id"] == "sofa_3seat"
```
Add this to `test_resolver.py` or a new `test_routes_catalog.py`.

### Edge Cases

**Resolver:**
- Sofa (2.10m wide) in a minimum 2m room — position may clip wall bounds; no exception raised.
- All 4 facing overrides on a floor item.
- `facing="center"` on a corner item (should point toward origin).

**Placement:**
- All 10 items requested in a very small room (2×2m) — some must be dropped, warnings non-empty.
- Item with `DROP_PRIORITY` not in dict gets priority 0 (first to drop).
- Co-occupancy: three items trying to use `center` (only rug+coffee_table pair allowed).
- LLM emitting an item with a valid catalogId but in a slot with incompatible kind.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app
cd frontend && pnpm lint && pnpm typecheck
```

### Level 2: Unit Tests

```bash
cd backend && uv run pytest tests/test_resolver.py -v
cd backend && uv run pytest tests/test_placement.py -v
cd backend && uv run pytest -q   # all tests including healthz
```

### Level 3: Integration (local server)

```bash
cd backend && uv run uvicorn app.main:app --port 8000 &
curl -s http://localhost:8000/catalog | python -m json.tool
# Expect: {"items": [...10 items...]}
kill %1
```

### Level 4: Manual Visual Validation

1. `cd frontend && pnpm dev` — open http://localhost:3000/app
2. Verify 3D room renders (5×6m box, warm floor color)
3. Two primitive-box furniture items visible (side_table, corner_shelf)
4. Click side_table box → blue wireframe outline, popover appears with name + rationale
5. Click popover ✕ → selection clears
6. Camera preset buttons: Top → 3/4 → Eye — all 3 viewpoints work
7. OrbitControls: orbit / zoom / pan all functional
8. Camera never goes below floor plane

### Level 5: Build Verification

```bash
cd frontend && pnpm build   # no warnings, no errors
```

---

## ACCEPTANCE CRITERIA

- [ ] `catalog.json` has exactly 10 items matching the specified footprints and allowedSlotKinds
- [ ] `resolve_slot()` covers all 19 slots without exception on any valid room dims (2–12m range)
- [ ] Every resolved position has `y = footprint.h / 2`
- [ ] All wall items resolve within 0.07m of their wall face (back face constraint)
- [ ] All corner items resolve within 0.05m of both walls
- [ ] `pytest tests/test_resolver.py` passes with every slot covered
- [ ] `pytest tests/test_placement.py` passes, including co-occupancy and drop-priority cases
- [ ] `GET /catalog` returns 200 with all 10 items, no secrets in response
- [ ] `uv run ruff check . && uv run mypy app` green with zero errors
- [ ] `pnpm lint && pnpm typecheck && pnpm build` green with zero errors
- [ ] 3D viewer renders fixture layout in browser with Room geometry, 2 primitive furniture items
- [ ] Click-to-select works: popover shows catalogId, slot label, dimensions, rationale
- [ ] All 3 camera presets change view correctly
- [ ] OrbitControls cannot orbit below floor (`maxPolarAngle`)
- [ ] No business logic from Phase 2/3 introduced (no LLM client, no Supabase auth, no `/generate-layout` route)

---

## COMPLETION CHECKLIST

- [ ] All backend models created and importable
- [ ] `catalog.json` written, 10 items, passes `json.load` + Pydantic validation
- [ ] `slot_resolver.py` pure function, all 19 slots implemented
- [ ] `placement.py` full pipeline, COOCCUPY_ALLOW and DROP_PRIORITY correct
- [ ] `routers/catalog.py` + `main.py` updated, GET /catalog returns 200
- [ ] `test_resolver.py` + `test_placement.py` written and green
- [ ] `frontend/lib/types.ts` fully populated
- [ ] `frontend/lib/slot-mappings.ts` all 19 labels
- [ ] `frontend/lib/stores/viewer.ts` Zustand store
- [ ] `frontend/components/viewer/{Room,Furniture,Scene,CameraPresets,ItemPopover}.tsx` all created
- [ ] `frontend/app/app/page.tsx` shows viewer with fixture (no healthz)
- [ ] All Level 1–4 validation commands pass
- [ ] Manual browser test confirms visual + interaction correctness

---

## NOTES

**Why fixture layout uses primitives only:** Real `.glb` assets require sourcing CC0 models (Poly Haven, Sketchfab CC0 etc.) and Draco-compressing them — that's a manual asset pipeline task separate from code. The `useGLTF` branch in `Furniture.tsx` is implemented but won't render until real files land in `public/models/`. The `primitive:*` fallback path is the testable path for Phase 1.

**Why `placement.resolve()` takes `catalog` as a parameter:** Makes testing easy (inject catalog fixture directly, no file I/O in tests). The router will call it with `_load_catalog().items`.

**Why sort by DROP_PRIORITY descending before placing:** Ensures high-value items (sofa, TV stand) get their preferred slots; low-value items (plants, side tables) get nudged or dropped. Matches user expectations — the sofa should never be missing from the layout.

**Why `AABB` in XZ only:** All items rest on the floor (y = fp.h/2). Vertical overlap is impossible by construction. XZ-plane AABB is sufficient and much simpler.

**Why `side=2` (DoubleSide) on wall materials:** OrbitControls lets users orbit outside the room. Single-sided planes would disappear from the outside. DoubleSide ensures walls always render regardless of camera position.

**Why `next/dynamic({ ssr: false })` for Scene:** Three.js / WebGL requires `window` and `navigator` (browser globals). Next.js would try to SSR the `<Canvas>`, fail, and throw. This also improves TTFB since the large 3D runtime is deferred.

**t_override in slot_resolver:** The nudge behavior in placement.py requires moving a wall item to t=0.15 or t=0.85 without changing the canonical slot name (the slot string remains `north_wall_left` etc.). The `t_override` param in `resolve_slot` handles this cleanly without creating 38 extra virtual slot names.

**Confidence Score: 8.5/10.** Risks: (1) Three.js `DoubleSide` constant value — use `import { DoubleSide } from "three"` rather than the literal `2` for type safety. (2) `useGLTF` inside conditional → enforced by separating into `GltfMesh` component. (3) `CameraController3D` must render inside `<Canvas>` — verify import path at scene composition time. (4) Slot resolver floating-point rounding — use `pytest.approx` in tests.
