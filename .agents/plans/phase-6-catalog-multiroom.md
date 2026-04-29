# Feature: Phase 6 — Catalog Scaling & Multi-Room

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Phase 6 promotes the v1 codebase from "single living room with 10 primitives" to "four room types, ~40 tagged catalog items, real GLB assets served from a CDN with PBR + shared HDRI." It is the structural substrate Phase 7's two-pass LLM will sit on top of: catalog becomes tag-driven, slots become room-type-conditional, `Layout.zones` lands as a first-class (server-populated) field, and the viewer learns to load actual GLB models with PBR materials lit by a shared HDRI environment.

This phase intentionally keeps the **single-pass** LLM path (`services/llm.py` as it stands today). Pass 1/Pass 2 orchestration, `StyleProfile`, and the new styles (`japandi`, `mid_century`) all belong to Phase 7. Phase 6 just makes sure that when Phase 7 lands, every supporting data structure (tags, room types, zones, slot instance sets, catalog filter) already exists and is tested.

The catalog migration is **hard-cut** per locked PRD decision: `allowedSlotKinds` is removed, replaced by `{tags, room_types, placement: {surfaces, against, exclusive_with}}`. Existing dev/demo data is wiped (tag `pre-v1` git ref before applying the JSON swap). All existing tests must be adjusted in lockstep.

## User Story

As a homeowner planning more than just a living room
I want to design bedrooms, dining rooms, and home offices with style-appropriate furniture rendered as real 3D models
So that the tool feels like a multi-room interior copilot, not a one-room demo.

## Problem Statement

After Phases 4 + 5 the product hierarchy and design system look right, but the substance underneath is still MVP-shaped:

- `roomType` is a `Literal["living_room"]` (`backend/app/models/layout.py:34`). The wizard cannot pick a bedroom.
- `CatalogItem.allowedSlotKinds` (`backend/app/models/catalog.py:27`) is the only compatibility signal — there is no way to say "this nightstand belongs only in a bedroom" or "this dining chair pairs with `dining_table_*`".
- The catalog has 10 items, all `primitive:*` boxes (`backend/app/data/catalog.json`). No real geometry, no materials.
- `services/slot_resolver.py` knows one set of 19 slots (`backend/app/services/slot_resolver.py:111`); there is no concept of room-type-conditional slot instances (`bed_center`, `table_center`, `desk_anchor`).
- `Layout` has no `zones` field. The Pass 1/Pass 2 split that Phase 7 needs has nowhere to put its zone metadata.
- The viewer renders `boxGeometry` with `meshStandardMaterial color="#8B7355"` (`frontend/components/viewer/Furniture.tsx:24`). No HDRI, no PBR, no `<Environment>`.
- No asset pipeline exists. There is no script that takes a `.glb`, runs `gltfpack`, validates with `gltf-validator`, and uploads to Azure Blob with a content-hashed filename. There is no Bicep for Blob + Front Door.

Without this phase, Phase 7 has no catalog breadth to motivate the two-pass split, no zones to fill, and no real geometry to make the result look credible in a demo.

## Solution Statement

1. **Catalog schema migration (hard-cut).**
   - Replace `allowedSlotKinds: list[str]` with `tags: list[str]`, `room_types: list[RoomType]`, and `placement: PlacementSpec` (`surfaces`, `against`, `exclusive_with`) on `CatalogItem`.
   - Bump `CATALOG_VERSION` env default from `v1.mvp` to `v1.phase6`.
   - Rewrite `data/catalog.json` to ~40 entries spanning all 4 room types and 5 styles, each with the new shape. Preserve `is_premium` flag from Phase 5.
   - Delete every reference to `allowedSlotKinds` across backend (`placement.py`, tests) and frontend (`lib/types.ts`, `SwapPopover.tsx`).

2. **Catalog filter service.**
   - New `services/catalog_filter.py` — pure function `filter_catalog(catalog, room_type, style?, zone?, accepted_tags?) -> list[CatalogItem]`. Deterministic. Returns ≤15 items per call. Reused by `placement.py` (validity checks) and by Phase 7's Pass 2 prompt builder.

3. **Room types as data.**
   - New `data/room_types.json`: `{ living_room: { slot_kinds, slot_instances, allowed_zones, dim_bounds }, bedroom: {...}, dining_room: {...}, home_office: {...} }`.
   - New `services/room_types.py` loader (LRU-cached). Exposes typed `RoomTypeProfile`.
   - Widen `RoomType` literal to all four types in `models/layout.py`. Update `GenerateLayoutRequest` per-type dim bounds via `model_validator` (Pydantic v2).

4. **Slot resolver extension.**
   - Add new floor slots (`bed_center`, `table_center`, `desk_anchor`) to `_slot_position()`.
   - Take `room_type` as a parameter (or a `RoomTypeProfile`) so the resolver rejects slot ids not in that room type's instance set with a clear error. Keep the function pure (no I/O).
   - Update `SLOT_KINDS` map in `placement.py` so the new slots resolve to the `floor` kind.

5. **Layout.zones as data (still server-populated in this phase).**
   - Add `Zone` Pydantic model: `{ id: str, kind: str, itemBudget: int }`.
   - Add `zones: list[Zone] = Field(default_factory=list)` to `LayoutLLM` (optional — single-pass LLM omits it; Phase 7 starts populating) and to `Layout` (server fills with a single synthetic zone in this phase so the field is non-empty in saved layouts).
   - Add per-item `zone: str | None = None` to `LayoutItemLLM` and `ResolvedItem`. Server stamps `zone` on every resolved item using a default `seating_zone` / `sleep_zone` / `dining_zone` / `work_zone` mapping per room type until Phase 7 wires Pass 1.

6. **Asset pipeline + Azure Blob + Front Door.**
   - New `scripts/process_asset.py` (Python): takes a raw `.glb`, runs `gltfpack -cc -tc`, runs `gltf-validator`, content-hashes the output, uploads to Azure Blob with `Cache-Control: public, max-age=31536000, immutable`, prints the resulting CDN URL.
   - New Bicep modules: `infra/storage.bicep` (Storage Account + container `catalog`), `infra/frontdoor.bicep` (Front Door profile + endpoint + origin pointing at the blob). Wire into `infra/main.bicep`.
   - New env vars: backend `CDN_BASE_URL`, frontend `NEXT_PUBLIC_CDN_BASE_URL`, frontend `NEXT_PUBLIC_HDRI_URL`. `.env.example` updated.
   - GitHub Actions step: install `gltf-validator`; on PRs touching `.glb` files (rare — usually committed once), validate them.
   - Source ~40 CC0 GLBs (Quaternius / Poly Pizza / Polyhaven). Process each via the script. Reference the resulting CDN URL in `catalog.json#model`.
   - Source one neutral interior HDRI (Polyhaven CC0), KTX2-compress (`gltfpack` does HDRIs too via `-hdr`, or use `toktx`), upload to Blob, set `NEXT_PUBLIC_HDRI_URL`.

7. **Viewer: HDRI + PBR + GLB instancing.**
   - Add `<Environment files={hdriUrl} background={false}>` from drei to `Scene.tsx`.
   - `Furniture.tsx`: keep the `primitive:*` branch as a fallback; make the GLB branch real — load via `useGLTF(model)` (already there) but apply scene-graph cleanup (clone, traverse, set `castShadow`/`receiveShadow`, do NOT mutate the cached GLTF). Add `useGLTF.preload(item.model)` for every item in the resolved layout via a top-level effect in `Scene.tsx`.
   - Configure `KTX2Loader` + `MeshoptDecoder` on the loader manager (drei exposes a hook).
   - Replace the `meshStandardMaterial color={floorColor}` in `Room.tsx` with a PBR material that respects the HDRI ambient — keep the palette as base color, but boost roughness/metalness defaults so it reads as plausibly lit.
   - Use `<Instances>` from drei when ≥3 items share the same `model` (Phase 6's catalog has multi-instance candidates: dining chairs ×4–6, nightstands ×2). Compute groupings client-side from the resolved layout.

8. **Wizard / frontend support for 4 room types.**
   - `WizardShell` and `DimensionsStep` learn a `roomType` step (new first step or a top-level pill row) with the 4 options + per-type dim bound hints.
   - `frontend/lib/types.ts` widens `RoomType` literal.
   - Templates in `data/templates.json` may now reference all 4 room types (Phase 5 capped them at `living_room`; loosen now if helpful).

9. **Tests + validation.**
   - `test_catalog_filter.py`: deterministic, ≤15 result cap, never returns mismatched-room-type items.
   - `test_room_types.py`: each room type's slot instance set is a subset of the union of `SLOT_KINDS` mapping; each `allowed_zones` is non-empty.
   - `test_resolver_room_types.py`: every (room_type × slot_instance × representative footprint × edge dim) combo produces a `Transform` with positions inside room bounds and y = footprint.h/2.
   - `test_placement.py`: extend with bedroom + dining + office fixtures; assert no overlap, all wall items flush, all items' tags accepted.
   - `test_zones.py`: assert default zone is stamped per room type when LLM omits zones.
   - `test_catalog_assets.py`: every catalog `model` field is either `primitive:*` or starts with `https://<CDN_BASE_URL host>/`. No raw `/public/models/` paths leak.
   - Integration: `test_pipeline_combos.py` — 50 mocked LLM runs across `room_type × style × preferences` combos; assert no overlaps, all valid layouts.
   - Per-asset budget script: walk all GLB URLs in `catalog.json`, HEAD each, assert `Content-Length ≤ 1_048_576`.

## Feature Metadata

**Feature Type**: Enhancement + structural migration (catalog schema swap, infra additions, viewer rework).
**Estimated Complexity**: High — touches Pydantic contract (cross-wire), the LLM prompt, the placement pipeline, the slot resolver, the viewer, the wizard, and adds new infra. Blast radius is the entire backend + viewer; mitigation is that Phase 7 features (two-pass, StyleProfile, new styles) stay out of scope.
**Primary Systems Affected**:
- `backend/app/models/catalog.py`, `models/layout.py`, `models/room_type.py` (new)
- `backend/app/data/{catalog.json,room_types.json}`
- `backend/app/services/{slot_resolver.py,placement.py,catalog_filter.py(new),room_types.py(new),llm.py}`
- `backend/app/prompts/system.md`
- `backend/app/routers/{catalog.py,generate.py}` (signature widening only)
- `backend/app/config.py` (`CDN_BASE_URL`)
- `backend/tests/*` (every test that constructs a `CatalogItem` or `Layout`)
- `frontend/lib/types.ts`, `frontend/lib/api.ts`
- `frontend/components/viewer/{Scene.tsx,Furniture.tsx,Room.tsx}`
- `frontend/components/wizard/{WizardShell.tsx,DimensionsStep.tsx}`
- `frontend/components/swap/SwapPopover.tsx` (tag-based candidate list)
- `infra/{main,storage(new),frontdoor(new)}.bicep`
- `scripts/process_asset.py` (new), `.github/workflows/backend.yml` (gltf-validator step)
**Dependencies**:
- New backend Python deps: `azure-storage-blob ^12.20`, `azure-identity ^1.17` (script-only; not runtime).
- New CLI tools (developer machines + CI): `gltfpack` (Meshopt), `gltf-validator`, optional `toktx` for HDRI.
- No new frontend npm deps beyond what drei already exposes (`Environment`, `useGLTF`, `Instances`, `KTX2Loader`, `MeshoptDecoder` are all reachable through `@react-three/drei` + `three/examples/jsm/...`).
- Azure: new Storage Account + Front Door profile in the existing resource group.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `CLAUDE.md` — "Locked Decisions" section pins catalog = tag-based, asset format = glTF/GLB only via `gltfpack -cc -tc`, hosting = Azure Blob + Front Door, HDRI shared, PBR per item, slot kinds shared / instances per room type, zones first-class. Phase 6 implements those rules.
- `.claude/PRD.md` §F8 (placement pipeline), §F9 (~40 tagged catalog items + per-room composition), §F10 (slot vocab room-type-conditional), §F11 (zones), §10 (Layout JSON Schema — note `zones` + per-item `zone` already in the v1 contract), §12 Phase 6 deliverables (lines 846–864). The PRD's catalog items list at §F9 is the canonical inventory to author.
- `.claude/reference/api.md` §1 (layered layout — `services/` may not import `routers/`), §2 (Pydantic = contract; `extra="forbid"` everywhere), §7 (LLM service contract — schema export must be JSON-Schema-strict-compatible after `_prepare_schema`).
- `.claude/reference/components.md` §6 (R3F patterns — `<Environment>`, `useGLTF.preload`, `<Instances>`, no `Vector3` literals, memoize materials).
- `backend/app/models/catalog.py` (full file — 36 lines) — current `CatalogItem` with `allowedSlotKinds`. The migration target is on lines 20–29.
- `backend/app/models/layout.py` (lines 1–151) — current `RoomType` is hard-coded to `Literal["living_room"]` on line 34; `LayoutItemLLM` (43–51), `LayoutLLM` (69–77), `Layout` (89–100), `ResolvedItem` (80–86), `RoomDims` (133–138). All five widen.
- `backend/app/services/slot_resolver.py` — the pure function `_slot_position()` (lines 45–111) is where new floor slots land. `_T_SUFFIX` (lines 11–15) and `FACING_ROTATIONS` (lines 4–9) are reused as-is.
- `backend/app/services/placement.py` — `SLOT_KINDS` map (lines 21–42), `DROP_PRIORITY` (lines 7–17), `COOCCUPY_ALLOW` (line 19), step pipeline (lines 116–224). After migration, the `allowedSlotKinds` check on line 132 becomes a tag check against the slot's accepted tags (declared in `room_types.json`).
- `backend/app/services/llm.py` — `_build_messages()` (lines 35–89) currently hard-codes the slot list and dumps the entire catalog into the prompt. Phase 6 must swap the catalog dump to use `catalog_filter.filter_catalog()` and the slot list to come from `room_types.py` per the request's `roomType`. **Pass 2 / Pass 1 split is Phase 7** — keep single-pass here, just narrow the inputs.
- `backend/app/prompts/system.md` — currently hard-codes "living room" + 3 styles. Generalise: parameterise the system prompt by room type, drop style-specific palette dumps (style profile lives in catalog tags + Phase 7's `StyleProfile`).
- `backend/app/routers/generate.py` — already loads catalog via `_load_catalog()`. After this phase: also load `room_types.py`, pass `RoomTypeProfile` into `llm.generate()` and `placement.resolve()`.
- `backend/app/data/catalog.json` — the entire 10-item file is replaced. Use it as the format reference for the new shape (header keys, indentation, footprint/clearance dicts).
- `backend/tests/test_resolver.py` (full file — 257 lines) — the resolver test pattern: `@pytest.mark.parametrize` matrices over slot × room. Mirror this for the new room-type-conditional slots.
- `backend/tests/test_placement.py` — fixture LLM output + assertions. Extend with bedroom / dining / office fixtures.
- `backend/tests/test_llm_mock.py` — mocks the openai client; serves as the template for the new prompt-content assertion (catalog filter actually narrows what's in the user message).
- `backend/tests/test_routes_generate.py` — full FastAPI TestClient path; extend with one happy path per room type.
- `frontend/components/viewer/Scene.tsx` (full file — 53 lines) — add `<Environment>`, install KTX2 + Meshopt loaders, add `useGLTF.preload` effect.
- `frontend/components/viewer/Furniture.tsx` (full file — 69 lines) — `GltfMesh` already calls `useGLTF(model).scene.clone()` (line 13) — that's the right pattern; what's missing is `traverse` to set shadows + ensure materials are PBR (drei's `useGLTF` doesn't enforce that — your assets must export PBR). Add the `<Instances>` branch for high-multiplicity items.
- `frontend/components/viewer/Room.tsx` (full file — 52 lines) — switch the four wall + floor materials to PBR-friendly defaults (`roughness=0.85, metalness=0.05`, `envMapIntensity=0.6`), keep `color={palette.wall.hex}` driven from layout.
- `frontend/components/wizard/{WizardShell,DimensionsStep,StyleStep,PreferencesStep}.tsx` — the 3-step wizard. Add a room-type pill or step. Validate dim bounds per room type.
- `frontend/components/swap/SwapPopover.tsx` — currently filters by `allowedSlotKinds`; rewrite to filter by tag intersection against the swapped item's slot's accepted tags (data from `room_types.json` mirrored to TS).
- `infra/main.bicep` — current resource graph (Container Apps + Key Vault). Append the storage + Front Door modules.

### New Files to Create

Backend
- `backend/app/models/room_type.py` — `RoomType` enum literal, `RoomTypeProfile` Pydantic model (slot_kinds, slot_instances, allowed_zones, default_zone, dim_bounds).
- `backend/app/services/catalog_filter.py` — pure tag/room-type filter.
- `backend/app/services/room_types.py` — LRU-cached loader for `data/room_types.json`.
- `backend/app/services/zones.py` — pure helper that stamps a default zone per item when LLM omits zones (Phase 6 single-pass mode).
- `backend/app/data/room_types.json` — 4-entry config.
- `backend/tests/test_catalog_filter.py`
- `backend/tests/test_room_types.py`
- `backend/tests/test_resolver_room_types.py`
- `backend/tests/test_zones.py`
- `backend/tests/test_catalog_assets.py`
- `backend/tests/test_pipeline_combos.py`

Scripts / infra
- `scripts/process_asset.py` — gltfpack + gltf-validator + content-hash + Azure Blob upload.
- `scripts/check_asset_budget.py` — HEAD every CDN URL in catalog, assert ≤ 1 MB.
- `infra/storage.bicep` — Storage Account + `catalog` container (public read, immutable cache headers via lifecycle policy or set per-blob in the upload script).
- `infra/frontdoor.bicep` — Front Door profile + endpoint + origin = the blob.

Frontend
- `frontend/lib/room-types.ts` — TS mirror of the room types data (small, hand-maintained; mirrors Pydantic side).
- `frontend/lib/loaders.ts` — single module that wires `KTX2Loader` + `MeshoptDecoder` into drei's `useGLTF` manager (call once, top of `Scene.tsx`).
- `frontend/components/wizard/RoomTypeStep.tsx` — new step or controller for the 4 room types.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [glTF 2.0 spec — PBR materials](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#metallic-roughness-material)
  - Why: confirm asset authoring requirements (baseColorTexture sRGB, metallicRoughnessTexture linear, normal map +Y up).
- [meshoptimizer — `gltfpack` flags](https://meshoptimizer.org/gltf/)
  - Specific flags: `-cc` (compress + Meshopt), `-tc` (KTX2 textures), `-hdr` (HDRI), `-noq` (skip quantization for already-tuned assets).
  - Why: pipeline command must be exact; `-cc -tc` is the locked decision.
- [glTF Validator README](https://github.com/KhronosGroup/glTF-Validator)
  - Specific: CLI install + JSON report format. CI step parses the report and fails on `errors > 0`.
- [drei — `<Environment>`](https://github.com/pmndrs/drei#environment)
  - Why: exact prop names (`files`, `background`, `preset` vs custom URL, `environmentIntensity` only available on r3f ≥ 8.16).
- [drei — `useGLTF` + KTX2 + Meshopt setup](https://github.com/pmndrs/drei#usegltf)
  - Why: drei provides `useGLTF.setDecoderPath`, but KTX2 + Meshopt require manual loader plumbing; the README has a snippet.
- [drei — `<Instances>` + `<Instance>`](https://github.com/pmndrs/drei#instances)
  - Why: pattern for multi-instance dining chairs / nightstands.
- [Azure Storage Blob — content-hashed names + immutable cache](https://learn.microsoft.com/azure/storage/blobs/storage-blob-immutable-storage)
  - Why: upload script sets `Cache-Control: public, max-age=31536000, immutable` and writes blobs with hashed names; cache busting is automatic.
- [Azure Front Door — origin to Blob](https://learn.microsoft.com/azure/frontdoor/standard-premium/how-to-create-frontdoor-portal#configure-an-origin-group)
  - Why: Bicep needs the origin group + route + caching configuration.
- [Polyhaven HDRIs (CC0)](https://polyhaven.com/hdris/indoor)
  - Why: source the single shared neutral interior HDRI.
- [Quaternius furniture pack (CC0)](https://quaternius.com/packs/ultimatefurniture.html) and [Poly Pizza](https://poly.pizza/)
  - Why: source ~40 GLBs.

External docs evolve. Verify before adopting any specific API surface from training-data memory.

### Patterns to Follow

**Catalog schema** — current `CatalogItem` has `allowedSlotKinds`. Replace with:

```python
# backend/app/models/catalog.py
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

RoomType = Literal["living_room", "bedroom", "dining_room", "home_office"]


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


class PlacementSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    surfaces: list[Literal["wall", "corner", "floor"]] = Field(min_length=1)
    against: list[Literal["wall", "none"]] = Field(default_factory=list)
    exclusive_with: list[str] = Field(default_factory=list)


class CatalogItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str
    tags: list[str] = Field(min_length=1)
    room_types: list[RoomType] = Field(min_length=1)
    placement: PlacementSpec
    footprint: Footprint
    clearance: Clearance
    model: str
    is_premium: bool = False
```

`allowedSlotKinds` is **gone**. Anything that imports it must change.

**Room types config** — `data/room_types.json` shape:

```json
{
  "living_room": {
    "slot_kinds": ["wall", "corner", "floor"],
    "slot_instances": [
      "north_wall_left", "north_wall_center", "north_wall_right",
      "east_wall_left", "east_wall_center", "east_wall_right",
      "south_wall_left", "south_wall_center", "south_wall_right",
      "west_wall_left", "west_wall_center", "west_wall_right",
      "corner_NE", "corner_NW", "corner_SE", "corner_SW",
      "center", "center_front", "entry"
    ],
    "slot_accepted_tags": {
      "north_wall_center": ["seating", "media", "storage"],
      "center": ["surface", "rug"],
      "...": ["..."]
    },
    "allowed_zones": ["seating_zone", "media_zone", "reading_nook", "accent_zone"],
    "default_zone": "seating_zone",
    "dim_bounds": { "width_m": [3, 8], "length_m": [3, 10], "height_m": [2.2, 3.5] }
  },
  "bedroom": { "...": "..." },
  "dining_room": { "...": "..." },
  "home_office": { "...": "..." }
}
```

`slot_accepted_tags` is the new compatibility check (replaces `allowedSlotKinds`).

**Catalog filter** — pure, deterministic, ≤15 results:

```python
# backend/app/services/catalog_filter.py
from app.models.catalog import CatalogItem, RoomType

MAX_CANDIDATES = 15


def filter_catalog(
    catalog: list[CatalogItem],
    room_type: RoomType,
    accepted_tags: list[str] | None = None,
    exclude_premium: bool = False,
) -> list[CatalogItem]:
    out: list[CatalogItem] = []
    for item in catalog:
        if room_type not in item.room_types:
            continue
        if exclude_premium and item.is_premium:
            continue
        if accepted_tags is not None and not (set(item.tags) & set(accepted_tags)):
            continue
        out.append(item)
    out.sort(key=lambda i: i.id)  # deterministic
    return out[:MAX_CANDIDATES]
```

**Slot resolver extension** — add the new floor slots; keep the function signature additive (`room_type` is **not** a resolver concern; the resolver still takes a slot string, room dims, footprint. Validation that the slot belongs to the room type happens in `placement.py` against `RoomTypeProfile`):

```python
# backend/app/services/slot_resolver.py — additions inside _slot_position
if slot == "bed_center":
    return (0.0, y, -room_l * 0.15), 0.0   # facing south (into room)
if slot == "table_center":
    return (0.0, y, 0.0), math.pi          # facing entry
if slot == "desk_anchor":
    # against north wall, slightly offset toward east third
    return ((room_w / 6), y, -(room_l / 2 - fp.d / 2 - 0.07)), 0.0
```

**Layout schema** — `Layout` and `LayoutLLM` get `zones` and per-item `zone`:

```python
class Zone(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    kind: str
    itemBudget: int = Field(ge=1, le=6)


class LayoutItemLLM(BaseModel):
    model_config = ConfigDict(extra="forbid")
    catalogId: str
    slot: SlotId
    facing: Facing
    zone: str | None = None       # NEW — Phase 7 will require, Phase 6 optional
    rationale: str = Field(max_length=140)


class LayoutLLM(BaseModel):
    model_config = ConfigDict(extra="forbid")
    style: Style
    palette: PaletteMap
    zones: list[Zone] = Field(default_factory=list, max_length=4)  # NEW — empty in Phase 6
    items: list[LayoutItemLLM] = Field(min_length=3, max_length=12)
    designExplanation: str = Field(min_length=80, max_length=600)
```

**SlotId** widens to include the new floor slots — every `Literal[...]` enum that names slots updates in lockstep.

**Asset URL pattern** — every catalog `model` is either `primitive:<name>` (still legal as a fallback) or `https://<CDN_BASE_URL host>/catalog/<sha256>.glb`. The script writes the SHA-256 of the post-`gltfpack` bytes as the filename.

**Viewer wiring** — `Scene.tsx` mounts one `<Environment files={hdriUrl} background={false}>` inside `<Suspense>`; loaders module is imported once per app load:

```ts
// frontend/lib/loaders.ts
import { useGLTF } from "@react-three/drei";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { WebGLRenderer } from "three";

export function configureLoaders(gl: WebGLRenderer) {
  const ktx2 = new KTX2Loader().setTranscoderPath("https://www.gstatic.com/basis-universal/versioned/2021-04-15-ba1c3e4/").detectSupport(gl);
  useGLTF.preload = useGLTF.preload.bind(useGLTF);
  // Apply via the GLTFLoader instance drei uses internally:
  (useGLTF as unknown as { setDecoderConfig: (opts: object) => void }).setDecoderConfig?.({ ktx2, meshopt: MeshoptDecoder });
}
```

(Verify the exact drei API — at the time of writing, drei's `useGLTF` accepts a third `extendLoader` arg; prefer that path if available. Read the drei README before adopting.)

**Bicep — new modules registered from `main.bicep`**:

```bicep
module storage 'storage.bicep' = {
  name: 'storage'
  params: { location: location, name: '${prefix}stor' }
}

module frontDoor 'frontdoor.bicep' = {
  name: 'frontdoor'
  params: {
    profileName: '${prefix}-fd'
    endpointName: '${prefix}-cdn'
    originHost: storage.outputs.blobHost
  }
}

output cdnBaseUrl string = frontDoor.outputs.endpointHostName
```

---

## IMPLEMENTATION PLAN

### Phase 1: Schema + data foundations

Land Pydantic + JSON shape changes first; nothing later compiles without them.

**Tasks:**
- Add `RoomType` literal and `PlacementSpec` to `models/catalog.py`. Remove `allowedSlotKinds`. Add `tags`, `room_types`, `placement`. Bump file with `is_premium` preserved.
- Widen `RoomType` in `models/layout.py` (was `Literal["living_room"]`). Add new floor slots to `SlotId`. Add `Zone` model. Add `zone` to `LayoutItemLLM`/`ResolvedItem`. Add `zones` to `LayoutLLM`/`Layout`.
- Author `data/room_types.json` (4 entries). Validate it loads via `model_validate` against `RoomTypeProfile`.
- Author `models/room_type.py` (`RoomTypeProfile`).
- Author `services/room_types.py` (LRU-cached loader).

### Phase 2: Service-layer migrations

Make the placement pipeline tag-aware and room-type-conditional without breaking the resolver's purity.

**Tasks:**
- Extend `services/slot_resolver.py` with the 3 new floor slots (`bed_center`, `table_center`, `desk_anchor`). Keep the function pure.
- Update `services/placement.py`:
  - Take `room_type_profile: RoomTypeProfile` as a new parameter on `resolve()`.
  - Replace the `allowedSlotKinds` check (line 132) with a tag-intersection check against `profile.slot_accepted_tags[item.slot]`.
  - Update `SLOT_KINDS` to map the 3 new floor slots to `floor`.
  - Reject slots not in `profile.slot_instances` with a warning, not an exception.
- Author `services/catalog_filter.py` (`filter_catalog`).
- Author `services/zones.py` (`stamp_default_zone(layout, profile) -> Layout` — used in single-pass mode to stamp `zone` on every item from `profile.default_zone` and synthesise a single `Zone` entry).

### Phase 3: LLM service + prompt

Single-pass LLM stays. Just shrink its inputs.

**Tasks:**
- Update `services/llm.py` `_build_messages()`: take `RoomTypeProfile` + `filter_catalog()` output instead of the full catalog + hard-coded slot list. Drop the `living room` literal in the user message; parameterise on room type.
- Generalise `prompts/system.md`: drop the per-style palette block (Phase 7's `StyleProfile` will inject style emphasis). Keep first-person voice + slot/catalog-id rules. Reference `{{ room_type }}` placeholder filled in `_build_messages`.
- Update `routers/generate.py`: load `RoomTypeProfile` per request's `roomType`, pass into both `llm.generate` and `placement.resolve`. After resolution, run `zones.stamp_default_zone()` so every saved Layout has a non-empty `zones` field.

### Phase 4: Catalog content + asset pipeline

Author the ~40-item catalog and the script that converts raw GLBs into CDN-ready assets.

**Tasks:**
- Write `scripts/process_asset.py`. CLI: `python scripts/process_asset.py <raw.glb> [--no-upload]`. Output: prints the final CDN URL and content hash.
- Write `scripts/check_asset_budget.py`. Walks `catalog.json` and HEADs each non-`primitive:` URL.
- Provision storage + Front Door via Bicep (modules + main wire-up). Capture `CDN_BASE_URL` output; set in Container App + Vercel env.
- Source ~40 GLBs (CC0); run each through the script. Source HDRI; KTX2-compress; upload.
- Rewrite `data/catalog.json` end-to-end with the new shape: per item, fill `tags`, `room_types`, `placement`, real CDN URL (or `primitive:*` for any items still awaiting authoring). Mark Phase 5's 3 premium items + ~12 more (PRD targets ~5/style).

### Phase 5: Viewer + frontend wiring

Make the 3D scene render actual GLBs lit by the HDRI.

**Tasks:**
- Add `frontend/lib/loaders.ts`. Wire KTX2 + Meshopt into drei's `useGLTF`.
- Add `<Environment files={hdriUrl} background={false}>` into `Scene.tsx`. Read URL from `process.env.NEXT_PUBLIC_HDRI_URL`.
- In `Scene.tsx`, add a `useEffect` that calls `useGLTF.preload(item.model)` for every non-`primitive:` item in the resolved layout.
- Update `Furniture.tsx` `GltfMesh`: `traverse` the cloned scene, set `castShadow=true` and `receiveShadow=true` on every mesh; do not mutate the cached source.
- Compute multi-instance groupings in `Scene.tsx`: when ≥3 items share the same `model`, render via drei `<Instances>`; otherwise per-item `<Furniture>`.
- Update `Room.tsx` PBR defaults: `roughness=0.85, metalness=0.05, envMapIntensity=0.6`. Keep `color={palette.*.hex}`.
- Mirror `RoomType` literal + `RoomTypeProfile` in `frontend/lib/types.ts` + `frontend/lib/room-types.ts`.
- Add `RoomTypeStep` to the wizard. Default to `living_room`. Wizard's `DimensionsStep` reads per-type bounds.
- Update `SwapPopover` to filter candidates via tag intersection against the swapped slot's accepted tags (data from `room-types.ts`).

### Phase 6: Tests, CI, validation

Lock everything down.

**Tasks:**
- Author the 6 new tests listed under "New Files to Create" → Backend.
- Update every existing test that constructs a `CatalogItem` (drop `allowedSlotKinds`, add `tags`/`room_types`/`placement`). Grep for `allowedSlotKinds` to find them all.
- Update `test_routes_generate.py` with one happy path per room type.
- CI: add `gltf-validator` install step in `.github/workflows/backend.yml`; only validate GLBs in `infra/` or wherever raw assets land (most live on Blob now — validate-on-upload is the script's job).
- CI: add `pnpm exec next build` size check on the viewer route bundle (must stay < 300 KB gzipped per PRD §11 quality indicators).
- Manual validation: visit each (room_type × style) combo (4 × 3 = 12 in this phase, since styles are still 3) in the wizard end-to-end. Capture screenshots in PR.
- Update `CLAUDE.md` Phase Status: tick Phase 6 as shipped.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 1. UPDATE `backend/app/models/catalog.py`

- **IMPLEMENT**: Replace the file with the new shape (see "Patterns to Follow" — `RoomType`, `PlacementSpec`, new `CatalogItem` fields). Remove `allowedSlotKinds`.
- **PATTERN**: `backend/app/models/catalog.py:20-29` is the migration target.
- **GOTCHA**: `is_premium` default `False` must stay — Phase 5's catalog rows omit the key.
- **VALIDATE**: `cd backend && uv run mypy app/models/catalog.py`.

### 2. CREATE `backend/app/models/room_type.py`

- **IMPLEMENT**: `RoomTypeProfile` Pydantic model: `slot_kinds: list[str]`, `slot_instances: list[str]`, `slot_accepted_tags: dict[str, list[str]]`, `allowed_zones: list[str]`, `default_zone: str`, `dim_bounds: dict[str, tuple[float, float]]`. Re-export `RoomType` from `catalog.py`.
- **PATTERN**: `models/catalog.py` for `extra="forbid"` + `Field` constraints.
- **VALIDATE**: `uv run mypy app/models/room_type.py`.

### 3. UPDATE `backend/app/models/layout.py`

- **IMPLEMENT**: Import `RoomType` from `models.catalog`. Replace `roomType: Literal["living_room"]` with `roomType: RoomType`. Add `bed_center`, `table_center`, `desk_anchor` to `SlotId`. Add `Zone` model. Add `zone: str | None = None` to `LayoutItemLLM`. Add `zones: list[Zone] = Field(default_factory=list, max_length=4)` to `LayoutLLM` and `Layout`. Bump `LayoutItemLLM.items.max_length` and `LayoutLLM.items.max_length` from 10 to 12 (per PRD §10 schema).
- **PATTERN**: `backend/app/models/layout.py:1-100`.
- **GOTCHA**: `model_validator` for `GenerateLayoutRequest` per-room-type dim bounds — read `dim_bounds` from `RoomTypeProfile` at validation time. Use a `model_validator(mode="after")` that pulls the profile via the loader (one-time LRU cache; no DI needed since the loader is module-scoped).
- **VALIDATE**: `uv run mypy app/models/layout.py && uv run pytest tests/test_routes_generate.py -k "not llm" -q` (existing happy-path test should still parse the request).

### 4. CREATE `backend/app/data/room_types.json`

- **IMPLEMENT**: 4 entries — `living_room`, `bedroom`, `dining_room`, `home_office`. Each carries the existing 19 wall + corner + floor slots **plus** the room-specific floor instances (`bed_center` for bedroom, `table_center` for dining, `desk_anchor` for office). `slot_accepted_tags` per slot: declare which catalog tags each slot accepts (e.g. `north_wall_center: ["seating", "media", "storage"]`, `center: ["surface", "rug"]`). `dim_bounds` per PRD F4: bedroom 2.5–6 × 2.5–6 m, dining 3–6 × 3–8, office 2.2–5 × 2.2–5, living 3–8 × 3–10.
- **GOTCHA**: Validate the JSON loads cleanly via `RoomTypeProfile.model_validate` for every key.
- **VALIDATE**: `python -c "import json; from app.models.room_type import RoomTypeProfile; [RoomTypeProfile.model_validate(v) for v in json.load(open('app/data/room_types.json')).values()]"`.

### 5. CREATE `backend/app/services/room_types.py`

- **IMPLEMENT**: `@lru_cache` loader returning `dict[RoomType, RoomTypeProfile]`. Single function `get_profile(room_type: RoomType) -> RoomTypeProfile`.
- **PATTERN**: `routers/catalog.py:12-16` LRU pattern.
- **VALIDATE**: `uv run pytest tests/test_room_types.py -q` (created in step 19).

### 6. CREATE `backend/app/services/catalog_filter.py`

- **IMPLEMENT**: `filter_catalog()` per "Patterns to Follow". Pure. Deterministic (sort by `id`). `MAX_CANDIDATES = 15`.
- **VALIDATE**: `uv run pytest tests/test_catalog_filter.py -q` (created in step 18).

### 7. UPDATE `backend/app/services/slot_resolver.py`

- **IMPLEMENT**: Inside `_slot_position()`, before the final `raise ValueError`, add the 3 new floor slot branches (`bed_center`, `table_center`, `desk_anchor`) per "Patterns to Follow". Do NOT change the function signature (no `room_type` param — purity).
- **PATTERN**: `services/slot_resolver.py:101-111` for floor slot conventions.
- **GOTCHA**: `bed_center` faces +Z (south, into room) so `default_rot=0.0`; `table_center` faces entry like other center slots (`math.pi`); `desk_anchor` is a wall-anchored floor slot — yaw=0.0 facing south.
- **VALIDATE**: `uv run pytest tests/test_resolver.py tests/test_resolver_room_types.py -q`.

### 8. UPDATE `backend/app/services/placement.py`

- **IMPLEMENT**:
  - Extend `SLOT_KINDS` (lines 21–42) so the 3 new floor slots map to `"floor"`.
  - Change `resolve()` signature to `resolve(llm, request, catalog, profile: RoomTypeProfile)`.
  - Replace the `allowedSlotKinds` block (lines 130–137) with: `accepted = profile.slot_accepted_tags.get(item.slot, [])` then `if not (set(catalog_map[item.catalogId].tags) & set(accepted)): warn + drop`.
  - Add a guard before the tag check: if `item.slot not in profile.slot_instances`, warn + drop.
  - Update `DROP_PRIORITY` to be a function of `(item, profile)` — for now keep the existing list as a default; add per-room essential items (e.g. `bed_double` highest in bedroom, `dining_table_*` highest in dining).
  - Extend `COOCCUPY_ALLOW` per PRD §F9: add `{"rug", "dining_table_4"}`, `{"rug", "dining_table_6"}`, `{"bed_double", "nightstand"}`.
- **PATTERN**: `services/placement.py:116-224`.
- **GOTCHA**: every call site of `placement.resolve` must update — `routers/generate.py`, every test that mocks placement input. Grep for `placement.resolve(`.
- **VALIDATE**: `uv run pytest tests/test_placement.py -q`.

### 9. CREATE `backend/app/services/zones.py`

- **IMPLEMENT**: `stamp_default_zone(layout: Layout, profile: RoomTypeProfile) -> Layout`. If `layout.zones` is empty, set it to `[Zone(id=profile.default_zone, kind=profile.default_zone, itemBudget=len(layout.items))]`. For each item with `zone is None`, set `zone = profile.default_zone`.
- **GOTCHA**: pure function; no I/O. Returns a new `Layout` (use `model_copy(update=...)`).
- **VALIDATE**: `uv run pytest tests/test_zones.py -q`.

### 10. UPDATE `backend/app/services/llm.py`

- **IMPLEMENT**:
  - Change `generate()` signature to `generate(req, settings, catalog, profile: RoomTypeProfile)`.
  - In `_build_messages`: call `filter_catalog(catalog, req.roomType)` and pass the result (≤15 items) into the `catalog_lines` block. Pull `slots` from `profile.slot_instances` (drop the hard-coded list at lines 47–67). Replace `f"Design a {req.style} living room."` with `f"Design a {req.style} {req.roomType.replace('_', ' ')}."`.
  - Schema is still `LayoutLLM.model_json_schema()`. New `zones` field is `default_factory=list` so single-pass output is valid even if the LLM omits it.
- **PATTERN**: `services/llm.py:35-89`.
- **VALIDATE**: `uv run pytest tests/test_llm_mock.py -q`.

### 11. UPDATE `backend/app/prompts/system.md`

- **IMPLEMENT**: Generalise. Drop the `## Style guidance` block (Phase 7 will inject style emphasis from `StyleProfile`). Replace `living room layouts` with `interior layouts`. Add a sentence: "The user message specifies the room type and the slot vocabulary scoped to that room type — use only those slots."
- **GOTCHA**: keep the first-person voice rule and the "no coordinates, no extra fields" rule.
- **VALIDATE**: prompt loads via `_load_system_prompt()` — covered by existing tests.

### 12. UPDATE `backend/app/routers/generate.py`

- **IMPLEMENT**: Load `profile = room_types.get_profile(body.roomType)`. Call `llm.generate(body, settings, catalog_items, profile)`, then `placement.resolve(raw, body, catalog_items, profile)`, then `zones.stamp_default_zone(layout, profile)`. Stamp `catalogVersion` last.
- **PATTERN**: `backend/app/routers/generate.py:11-25`.
- **VALIDATE**: `uv run pytest tests/test_routes_generate.py -q`.

### 13. UPDATE `backend/app/config.py`

- **IMPLEMENT**: Add `CDN_BASE_URL: str = ""`. Bump `CATALOG_VERSION` default to `"v1.phase6"`.
- **VALIDATE**: `uv run pytest -q`.

### 14. UPDATE `backend/.env.example`

- **IMPLEMENT**: Document `CDN_BASE_URL=https://<your-frontdoor>.azurefd.net`.

### 15. CREATE `scripts/process_asset.py`

- **IMPLEMENT**: argparse CLI. Steps: `subprocess.run(["gltfpack", "-i", raw, "-o", tmp, "-cc", "-tc"], check=True)`; `subprocess.run(["gltf_validator", tmp, "-r", "-o", tmp_report], check=True)`; parse report — fail if `errors > 0`; SHA-256 the bytes; upload to Blob via `azure-storage-blob` with `content_settings=ContentSettings(content_type="model/gltf-binary", cache_control="public, max-age=31536000, immutable")`; print `https://<CDN_BASE_URL>/catalog/<hash>.glb`.
- **GOTCHA**: auth via `DefaultAzureCredential` (azure-identity). Skip upload if `--no-upload`. Local file copy in `dist/catalog/<hash>.glb` for inspection.
- **VALIDATE**: dry-run on a sample GLB: `python scripts/process_asset.py raw_chair.glb --no-upload`; confirm hash + validator pass.

### 16. CREATE `scripts/check_asset_budget.py`

- **IMPLEMENT**: Read `backend/app/data/catalog.json`; for every `model` not starting with `primitive:`, HEAD it; assert `Content-Length <= 1_048_576`; aggregate per-room-type total and assert ≤ 8 MB minus 2 MB HDRI minus 1 MB JS = 5 MB hard.
- **VALIDATE**: `python scripts/check_asset_budget.py` on the populated catalog.

### 17. CREATE `infra/storage.bicep` and `infra/frontdoor.bicep`; UPDATE `infra/main.bicep`

- **IMPLEMENT**: Storage Account (StorageV2, LRS, HTTPS-only); blob container `catalog` with public read access. Front Door Standard profile + endpoint + origin group pointing at `<storage>.blob.core.windows.net` + a default route caching `*.glb` for 1 year. Output `cdnBaseUrl`.
- **PATTERN**: `infra/main.bicep` for the module wire-up convention.
- **GOTCHA**: container public access is required for browser fetch from R3F; do NOT enable public access on the Storage Account itself, just the container.
- **VALIDATE**: `az deployment group what-if -g <rg> -f infra/main.bicep -p @infra/params.json` shows the new resources.

### 18. CREATE `backend/tests/test_catalog_filter.py`

- **IMPLEMENT**: assert `filter_catalog(catalog, "bedroom")` returns only items with `"bedroom"` in `room_types`; assert ≤15 results; assert deterministic (same input → same order); assert `accepted_tags=["seating"]` filters by tag intersection; assert `exclude_premium=True` removes premium items.
- **PATTERN**: `tests/test_resolver.py` for parametrize patterns.
- **VALIDATE**: `uv run pytest tests/test_catalog_filter.py -q`.

### 19. CREATE `backend/tests/test_room_types.py`

- **IMPLEMENT**: assert all 4 room types load; assert each `slot_instances` is non-empty; assert each `default_zone` ∈ `allowed_zones`; assert `dim_bounds` lower ≤ upper for every dim.
- **VALIDATE**: `uv run pytest tests/test_room_types.py -q`.

### 20. CREATE `backend/tests/test_resolver_room_types.py`

- **IMPLEMENT**: parametrize over `(room_type, slot)` pairs from `RoomTypeProfile.slot_instances`; assert `resolve_slot()` returns `Transform` with `position[1] == fp.h/2` and `|x|, |z|` within room bounds + 0.01.
- **PATTERN**: `tests/test_resolver.py:73-82`.
- **VALIDATE**: `uv run pytest tests/test_resolver_room_types.py -q`.

### 21. CREATE `backend/tests/test_zones.py`

- **IMPLEMENT**: build a `Layout` with `zones=[]` and items with `zone=None`; call `stamp_default_zone(layout, living_profile)`; assert `len(zones) == 1`, `zones[0].id == "seating_zone"`, every item's `zone == "seating_zone"`.
- **VALIDATE**: `uv run pytest tests/test_zones.py -q`.

### 22. CREATE `backend/tests/test_catalog_assets.py`

- **IMPLEMENT**: load catalog; assert every `model` is `primitive:*` or matches `re.compile(r"^https://[a-z0-9.\-]+/catalog/[a-f0-9]{64}\.glb$")`.
- **VALIDATE**: `uv run pytest tests/test_catalog_assets.py -q`.

### 23. CREATE `backend/tests/test_pipeline_combos.py`

- **IMPLEMENT**: parametrize `(room_type, style, prefs)` across 50 combos; mock `llm.generate` to return a deterministic `LayoutLLM` per `(room_type, style)`; run the full router; assert `Layout.items` has no overlapping AABBs (reuse `placement._aabb_overlap`); assert `len(zones) >= 1`; assert every `item.zone` is non-None.
- **PATTERN**: `tests/test_routes_generate.py` for FastAPI TestClient + LLM mock.
- **VALIDATE**: `uv run pytest tests/test_pipeline_combos.py -q`.

### 24. UPDATE every existing test that constructs `CatalogItem` or `Layout`

- **IMPLEMENT**: grep for `allowedSlotKinds` and for `CatalogItem(`; replace fixture data with new shape (`tags`, `room_types`, `placement`). Add `zone` to any `LayoutItemLLM`/`ResolvedItem` construction.
- **VALIDATE**: `uv run pytest -q` (whole suite green).

### 25. CREATE `frontend/lib/loaders.ts`

- **IMPLEMENT**: configure KTX2 + Meshopt loaders for drei's `useGLTF`. Verify the exact drei API in the README (it has changed across versions); prefer the `extendLoader` option on `useGLTF` over global mutation.
- **VALIDATE**: `pnpm typecheck`.

### 26. UPDATE `frontend/components/viewer/Scene.tsx`

- **IMPLEMENT**: import and call `configureLoaders(gl)` inside the `<Canvas onCreated>` callback. Add `<Environment files={process.env.NEXT_PUBLIC_HDRI_URL!} background={false}>` inside `<Suspense>`. Add a `useEffect` that calls `useGLTF.preload(item.model)` for every non-`primitive:` item in `layout.items`. When ≥3 items share `model`, render via drei `<Instances>`; else per-item `<Furniture>`.
- **PATTERN**: `frontend/components/viewer/Scene.tsx:1-53`.
- **GOTCHA**: do NOT preload `primitive:*` URLs (they aren't real). Filter first.
- **VALIDATE**: `pnpm dev`, generate a layout that uses real GLBs; confirm no console errors and HDRI lighting visible.

### 27. UPDATE `frontend/components/viewer/Furniture.tsx`

- **IMPLEMENT**: in `GltfMesh`, after `scene.clone()`, `traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } })`. Memoize the cloned scene with `useMemo` keyed on `model`.
- **PATTERN**: `frontend/components/viewer/Furniture.tsx:11-14`.
- **GOTCHA**: never mutate `useGLTF()`'s returned scene directly — clone it first (line 13 already does this).
- **VALIDATE**: visual QA + no React warnings about prop mutation.

### 28. UPDATE `frontend/components/viewer/Room.tsx`

- **IMPLEMENT**: every `meshStandardMaterial` gets `roughness={0.85} metalness={0.05} envMapIntensity={0.6}`. Keep `color={…}` driven from palette.
- **VALIDATE**: visual QA — walls + floor pick up HDRI lighting.

### 29. UPDATE `frontend/lib/types.ts` and CREATE `frontend/lib/room-types.ts`

- **IMPLEMENT**: widen `RoomType` to all 4 values. Mirror `RoomTypeProfile` shape. `room-types.ts` exports a hand-maintained TS copy of `room_types.json` (or a fetch helper if `GET /room-types` is added — defer the route, keep the constant for v1).
- **VALIDATE**: `pnpm typecheck`.

### 30. CREATE `frontend/components/wizard/RoomTypeStep.tsx`; UPDATE `WizardShell.tsx`, `DimensionsStep.tsx`

- **IMPLEMENT**: `RoomTypeStep` renders a 4-card row (radio group). Wizard becomes 4 steps (or fold room-type selection into a top pill above the existing 3 steps). `DimensionsStep` reads `dim_bounds` from `room-types.ts` for the current room type and validates accordingly.
- **PATTERN**: `frontend/components/wizard/StyleStep.tsx` for card grid pattern.
- **VALIDATE**: end-to-end wizard run for each of the 4 room types.

### 31. UPDATE `frontend/components/swap/SwapPopover.tsx`

- **IMPLEMENT**: candidates filter by tag intersection: `candidates = catalog.filter(c => c.room_types.includes(roomType) && intersect(c.tags, profile.slot_accepted_tags[swappedSlot]).length > 0)`.
- **GOTCHA**: respect the lock-badge path from Phase 5 — premium items still render with a `LockBadge` and trigger `UpgradeModal`.
- **VALIDATE**: pick an item, swap → only tag-compatible candidates appear.

### 32. UPDATE `frontend/.env.example`

- **IMPLEMENT**: Document `NEXT_PUBLIC_CDN_BASE_URL` and `NEXT_PUBLIC_HDRI_URL`.

### 33. UPDATE `.github/workflows/backend.yml`

- **IMPLEMENT**: install `gltf-validator` (`npm i -g gltf-validator` works in CI). Add a step on PRs that touch `infra/raw_assets/**` (if you commit raw assets there) running validation.
- **VALIDATE**: CI green on a no-asset PR; fails on a deliberately-bad GLB.

### 34. RUN asset pipeline; populate `data/catalog.json`

- **IMPLEMENT**: source the ~40 CC0 GLBs (Quaternius / Poly Pizza). Run each through `process_asset.py`. Author `data/catalog.json` per-item with the new shape. Keep at least 5 `primitive:*` rows as fallbacks for any item whose GLB is still pending.
- **GOTCHA**: every CDN URL must be content-hashed; renames are explicit catalog edits. Once a hash is referenced, that blob is immutable forever.
- **VALIDATE**: `python scripts/check_asset_budget.py` passes; full backend suite green.

### 35. UPDATE `CLAUDE.md` Phase Status

- **IMPLEMENT**: tick Phase 6 as shipped. Note any deferred items (e.g. items still on `primitive:*`).

---

## TESTING STRATEGY

### Unit Tests

Backend (pure):
- `test_catalog_filter.py` — room-type filter, tag filter, premium exclusion, ≤15 cap, deterministic order.
- `test_room_types.py` — config loads, default_zone ∈ allowed_zones, dim_bounds sanity.
- `test_resolver_room_types.py` — every (room_type × slot_instance) resolves; y == fp.h/2; positions in bounds; new floor slots return correct rotations.
- `test_zones.py` — default zone stamping when LLM omits zones.
- `test_placement.py` (extended) — bedroom + dining + office fixtures; tag-based compatibility check; new co-occupancy pairs.

Backend (router-level):
- `test_routes_generate.py` (extended) — one happy path per room type; mocked LLM returns a representative LayoutLLM.

Frontend (Vitest, optional):
- `RoomTypeStep` renders 4 cards; selecting one updates the wizard store.

### Integration Tests

- `test_pipeline_combos.py` — 50 mocked-LLM runs across `(room_type × style × preferences)`; assert no overlaps, all valid layouts, all items zoned.
- Manual: full wizard end-to-end for each of the 4 room types × 3 styles (12 combos in this phase; the 5-style matrix lands in Phase 7).

### Edge Cases

- LLM picks a slot that exists in the global SlotId enum but NOT in the current room type's `slot_instances` (e.g. `bed_center` in a living room) → placement warns and drops.
- LLM picks a `catalogId` whose `room_types` doesn't include the requested one → placement warns and drops (catalog filter should have prevented it, but defence-in-depth).
- Item with `model: primitive:*` mixed with GLB items in the same scene — both render; preload skips primitives.
- HDRI URL missing → `<Environment>` fails gracefully (drei renders no env map; scene is dim but functional). Console warning visible.
- All 4 dining chairs in one layout share `model` → `<Instances>` path activates; one draw call instead of four.
- Pre-Phase-6 saved Layout (no `zones`, no per-item `zone`) loaded from DB → backwards compat: `Layout.zones` defaults to `[]`, viewer ignores; `stamp_default_zone` is only invoked at generation, not at read.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# backend
cd backend
uv run ruff check .
uv run ruff format --check .
uv run mypy app

# frontend
cd ../frontend
pnpm lint
pnpm typecheck
```

### Level 2: Unit Tests

```bash
# backend
cd backend
uv run pytest

# frontend
cd ../frontend
pnpm test
```

### Level 3: Asset + Integration

```bash
cd backend
uv run pytest tests/test_pipeline_combos.py tests/test_catalog_assets.py -q

# At project root
python scripts/check_asset_budget.py
```

### Level 4: Manual Validation

1. `cd backend && uv run uvicorn app.main:app --reload`
2. `cd frontend && pnpm dev`
3. For each of the 4 room types: visit `/app/new`, pick the room type, pick a style (any), generate. Confirm: layout returns < 10 s; viewer renders real GLBs (not boxes) for items with non-`primitive:` models; HDRI light is visible on walls; selection click works; sidebar shows zone names.
4. Inspect Network tab on a fresh session: total 3D payload (HDRI + GLBs) ≤ 8 MB; every GLB has `Cache-Control: public, max-age=31536000, immutable` and a 200 from the CDN host.
5. Swap an item: candidate list contains only tag-compatible items, premium items are locked.
6. Save a layout; reload; confirm `zones` round-trips and viewer renders identically.

### Level 5: Additional Validation (Optional)

- `microsoft_docs_search` for the latest Front Door caching policy syntax if Bicep validation flags an unfamiliar property.
- Bundle analyzer (`@next/bundle-analyzer`) on the viewer route — confirm < 300 KB gzipped.
- `next build` Lighthouse on a saved layout — assert ≥ 80.

---

## ACCEPTANCE CRITERIA

- [ ] `CatalogItem` is tag-based (`tags`, `room_types`, `placement`); `allowedSlotKinds` is removed everywhere.
- [ ] `data/catalog.json` has ~40 entries spanning all 4 room types and 5 styles, with real CDN-hosted GLBs (or documented `primitive:*` fallbacks).
- [ ] `data/room_types.json` defines slot instance sets, accepted tags per slot, allowed zones, and dim bounds for all 4 room types.
- [ ] `services/catalog_filter.py` is pure, deterministic, returns ≤15 items.
- [ ] `services/slot_resolver.py` resolves the 3 new floor slots (`bed_center`, `table_center`, `desk_anchor`) and remains a pure function.
- [ ] `services/placement.py` checks tag intersection against per-slot accepted tags and rejects out-of-room slots.
- [ ] `Layout.zones` is non-empty in every generated Layout (single-pass mode synthesises a default zone).
- [ ] Every resolved item carries a non-null `zone`.
- [ ] Wizard supports all 4 room types with per-type dim bound validation.
- [ ] R3F viewer mounts a shared HDRI `<Environment>`; GLBs load via Meshopt + KTX2; multi-instance items render via drei `<Instances>`.
- [ ] Per-asset GLB ≤ 1 MB; per-room cold download ≤ 8 MB total.
- [ ] Bicep provisions the Storage Account + Front Door; `CDN_BASE_URL` is wired into both backend and frontend env.
- [ ] `scripts/process_asset.py` runs end-to-end on a sample GLB and emits a content-hashed CDN URL.
- [ ] All Level 1–4 validation commands pass.
- [ ] Existing Phase 4/5 tests + flows still pass.
- [ ] `CLAUDE.md` Phase Status updated.

---

## COMPLETION CHECKLIST

- [ ] All 35 tasks completed in order.
- [ ] Each task validation passed immediately.
- [ ] Backend `uv run pytest` green (existing + 6 new test files).
- [ ] Frontend `pnpm typecheck && pnpm lint && pnpm test` green.
- [ ] `python scripts/check_asset_budget.py` exits 0 against the populated catalog.
- [ ] Manual end-to-end run for all 4 room types × 3 styles (12 combos) verified visually.
- [ ] No `allowedSlotKinds` references anywhere (`grep -r allowedSlotKinds .` returns nothing).
- [ ] No raw `/public/models/` paths in any catalog entry (must be `primitive:*` or CDN URL).
- [ ] PR description includes screenshots of all 12 combos and the Network panel showing the cold-download budget.
- [ ] CLAUDE.md Phase Status ticked.

---

## NOTES

- **Scope discipline.** Two-pass LLM, `StyleProfile`, the new styles (`japandi`, `mid_century`), parallel Pass 2 with `asyncio.gather`, and `tests/test_two_pass.py` are **all Phase 7**. Resist any urge to land them here — Phase 6 is wide enough already.
- **Existing data wipe.** Per CLAUDE.md "Existing prod data is gone" — tag a `pre-v1` git ref before applying the catalog migration. Saved Layouts in dev DBs that reference the old shape will not deserialise.
- **`allowedSlotKinds` removal is hard-cut.** No backwards-compat shim. Any third-party code (none expected) breaks loudly.
- **Catalog versioning.** `CATALOG_VERSION` bumps to `v1.phase6`. Saved Layouts stamped before this phase keep their old version string; only NEW generations get the new stamp. Reading old layouts still works because the schema additions are all defaulted.
- **Asset sourcing realism.** ~40 high-quality CC0 GLBs across 4 room types is a real authoring effort. If sourcing blocks the phase, ship the schema + pipeline + 12 GLBs + 28 `primitive:*` fallbacks; tag a follow-up to backfill. The schema is what matters — Phase 7 doesn't care whether `nightstand` is a GLB or a primitive.
- **HDRI budget.** Single ~2 MB shared HDRI is the locked decision. Do not introduce per-room HDRIs in this phase.
- **Co-occupancy creep.** New pairs (`rug + dining_table_*`, `bed + nightstand`) must be added to `COOCCUPY_ALLOW`; otherwise valid layouts get items dropped.
- **Slot enum drift checklist.** Adding the 3 new floor slots touches: `models/layout.py` (`SlotId`), `services/slot_resolver.py` (`_slot_position`), `services/placement.py` (`SLOT_KINDS`), `data/room_types.json` (slot_instances + slot_accepted_tags), `prompts/system.md` (no longer hard-coded — good), and every test that hard-codes a slot list. Grep for `north_wall_center` to find them.
- **Tag taxonomy discipline.** Every new tag added to a catalog item silently changes which slots accept it. Maintain the tag list in a comment at the top of `data/room_types.json` so additions go through `slot_accepted_tags` review.
- **Confidence: 6/10** for one-pass implementation. Risks:
  - (a) Asset sourcing is the long pole — 40 CC0 GLBs is a real artefact authoring task that doesn't show up in the code diff. Have the artefacts in hand before starting Task 34.
  - (b) drei + Meshopt + KTX2 wiring varies by drei version — read the drei README of the installed version, not training-data memory.
  - (c) Front Door + Blob caching surprises — set `Cache-Control` at upload time AND verify Front Door doesn't strip/override it.
  - (d) Test fixture migration is wide — every existing `CatalogItem(...)` constructor in tests needs to gain `tags`/`room_types`/`placement`. Budget time for the find-and-fix sweep.
  - (e) Per-room-type dim bounds in `GenerateLayoutRequest` need a `model_validator` that pulls from the room types loader — careful with import order to avoid circulars (`models/layout.py` imports `services/room_types.py` is forbidden by the layering rule from `api.md` §1; resolve by moving `RoomTypeProfile` and the loader into `models/` so the request model can import it cleanly).
