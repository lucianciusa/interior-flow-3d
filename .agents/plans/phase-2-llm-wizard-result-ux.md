# Feature: Phase 2 — LLM Integration + Wizard + Result UX

The following plan should be complete, but validate documentation and codebase patterns and task sanity before starting implementation.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

---

## Feature Description

Wire the Azure OpenAI LLM into the `/generate-layout` endpoint, implement the 3-step wizard UI, and build the result view (3D viewer + sidebar). After Phase 2, a user can enter room dimensions + style + preferences, click Generate, wait ~7 s, and see a real AI-generated 3D furniture layout with palette and first-person rationale. The viewer, placement pipeline, slot resolver, and catalog router are already complete from Phase 1.

## User Story

As a curious homeowner,
I want to complete a 3-step wizard and get a 3D layout in under 30 seconds,
So that I can see a credible AI-generated starting point without learning a CAD tool.

## Problem Statement

Phase 1 proves the 3D viewer and placement pipeline work with fixture data, but there is no way to generate a real layout. The LLM service, the `/generate-layout` endpoint, the wizard UI, and the result view all need to be built.

## Solution Statement

Build the LLM service (Azure OpenAI, JSON schema mode, one-retry) → wire it into a new `/generate-layout` router → build a client-side 3-step wizard state machine → on Generate, call the API and render the result via the existing `<Scene>` and a new sidebar. No routing change: the wizard and result live on the same `/app` page, driven by a `phase` field in a Zustand wizard store.

## Feature Metadata

**Feature Type**: New Capability  
**Estimated Complexity**: High  
**Primary Systems Affected**: `backend/app/services/llm.py`, `backend/app/routers/generate.py`, `frontend/components/wizard/`, `frontend/components/sidebar/`, `frontend/lib/stores/wizard.ts`, `frontend/app/app/page.tsx`  
**Dependencies**:
- Backend (already installed): `openai>=1.54`, `pydantic>=2.9`, `pydantic-settings>=2.6`, `orjson`
- Frontend (must install): `react-hook-form`, `zod`, `@hookform/resolvers`

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `backend/app/models/layout.py` (full) — `GenerateLayoutRequest`, `LayoutLLM`, `Layout`, `SlotId`, `Style`, `Preference`. The LLM schema is derived from `LayoutLLM.model_json_schema()`. Never hand-write it.
- `backend/app/models/catalog.py` (full) — `CatalogItem`, `CatalogResponse`. The LLM prompt lists `id` + `name` only — footprints are server-only.
- `backend/app/services/placement.py` (full) — `resolve(llm: LayoutLLM, request: GenerateLayoutRequest, catalog: list[CatalogItem]) -> Layout`. This is what the generate router calls after the LLM.
- `backend/app/routers/catalog.py` — `_load_catalog()` pattern. The generate router calls this same function to get catalog items for placement.
- `backend/app/config.py` — `Settings` with `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`. `get_settings()` is `lru_cache`.
- `backend/app/main.py` — only `catalog.router` wired. Needs `generate.router` added.
- `backend/app/deps.py` — placeholder comment only; `optional_user` and `require_user` are Phase 3. The generate endpoint uses `Depends(get_settings)` only in Phase 2.
- `backend/tests/conftest.py` — `client` fixture. Add `mock_llm_response` and `std_request` fixtures.
- `backend/tests/test_healthz.py` — test style reference: `def test_name(client):`.
- `backend/tests/test_placement.py` — fixture-building pattern for `LayoutLLM` and `GenerateLayoutRequest`.
- `frontend/lib/types.ts` — `Layout`, `GenerateRequest`, `Style`, `Preference`, `RoomDims` all complete.
- `frontend/lib/api.ts` — `authedFetch<T>()` and `ApiError` exist. Add `useGenerateLayout` mutation here.
- `frontend/app/providers.tsx` — `QueryClientProvider` already wraps the app.
- `frontend/app/app/page.tsx` — currently renders Phase 1 fixture viewer. Replace entirely with wizard shell.
- `frontend/components/viewer/Scene.tsx` — `<Scene layout={Layout} dims={RoomDims} />`. Already complete.
- `frontend/components/viewer/ItemPopover.tsx` — reads from `useViewerStore`. Already complete.
- `frontend/components/viewer/CameraPresets.tsx` — `<CameraPresets />` and `<CameraController3D />`. Already complete.
- `frontend/lib/stores/viewer.ts` — `useViewerStore` with `setSelectedItem`. Wizard store is separate.
- `.claude/reference/api.md` §7 — full `llm.py` code template, error types, retry pattern, build_messages signature.
- `.claude/reference/api.md` §3 — router anatomy for `generate.py`.
- `.claude/reference/api.md` §8 — error mapping: `LLMValidationError` → 502, `LLMUpstreamError` → 503.
- `.claude/reference/components.md` §3 — component anatomy (props type, `cn()`, native buttons, `aria-pressed`).
- `.claude/reference/components.md` §4 — Zustand selector pattern, wizard store reset on result mount.
- `.claude/reference/components.md` §5 — `useMutation`, `ApiError` usage.
- `.claude/reference/components.md` §8 — wizard form: `react-hook-form + zod`. Chip groups: `role="checkbox"` + `aria-checked`.
- `.claude/PRD.md` §7 F1 — wizard 3 steps spec. §7 F2 — generate loading state. §7 F4 — result sidebar spec.

### New Files to Create

**Backend:**
- `backend/app/services/llm.py` — Azure OpenAI client, prompt assembly, schema validation, retry
- `backend/app/prompts/system.md` — designer persona system prompt (static)
- `backend/app/routers/generate.py` — `POST /generate-layout`
- `backend/tests/test_llm_mock.py` — mocked openai client, schema validation, retry
- `backend/tests/test_routes_generate.py` — `TestClient` + mocked LLM service

**Frontend:**
- `frontend/lib/stores/wizard.ts` — Zustand wizard store (`dims`, `style`, `preferences`, `phase`, `layout`)
- `frontend/components/wizard/WizardShell.tsx` — state machine orchestrator
- `frontend/components/wizard/DimensionsStep.tsx` — step 1: numeric inputs
- `frontend/components/wizard/StyleStep.tsx` — step 2: 3 style cards
- `frontend/components/wizard/PreferencesStep.tsx` — step 3: preference chips
- `frontend/components/sidebar/ResultSidebar.tsx` — sticky right panel
- `frontend/components/sidebar/PaletteBlock.tsx` — 3 named swatches
- `frontend/components/sidebar/ExplanationBlock.tsx` — designExplanation text

**Frontend updates:**
- `frontend/lib/api.ts` — add `useGenerateLayout` mutation, `GenerateError` handling
- `frontend/app/app/page.tsx` — replace fixture viewer with `<WizardShell />`

### Patterns to Follow

**LLM service** (`api.md` §7):
```python
class LLMError(Exception): ...
class LLMValidationError(LLMError): ...
class LLMUpstreamError(LLMError): ...

async def generate(req: GenerateLayoutRequest, settings: Settings) -> LayoutLLM:
    client = AsyncAzureOpenAI(...)
    schema = LayoutLLM.model_json_schema()
    messages = _build_messages(req, catalog_items)
    for attempt in (1, 2):
        try:
            resp = await client.chat.completions.create(...)
        except (APIError, BadRequestError) as e:
            raise LLMUpstreamError(str(e)) from e
        try:
            return LayoutLLM.model_validate_json(raw)
        except ValidationError as e:
            if attempt == 2:
                raise LLMValidationError(...) from e
            messages = _add_correction(messages, raw, str(e))
```

**Router anatomy** (`api.md` §3):
```python
router = APIRouter(prefix="/generate-layout", tags=["generate"])

@router.post("", response_model=Layout, status_code=200)
async def generate_layout(body: GenerateLayoutRequest, settings=Depends(get_settings)) -> Layout:
    try:
        raw = await llm.generate(body, settings)
    except llm.LLMValidationError as e:
        raise HTTPException(502, detail=str(e)) from e
    except llm.LLMUpstreamError as e:
        raise HTTPException(503, detail=str(e)) from e
    return placement.resolve(raw, body, _load_catalog().items)
```

**Wizard Zustand store** (`components.md` §4):
```ts
export const useWizardStore = create<WizardStore>((set) => ({
  phase: "step1",
  dims: { width_m: 4, length_m: 5, height_m: 2.6 },
  style: null,
  preferences: [],
  layout: null,
  setPhase: (phase) => set({ phase }),
  setDims: (dims) => set({ dims }),
  setStyle: (style) => set({ style }),
  setPreferences: (preferences) => set({ preferences }),
  setLayout: (layout) => set({ layout }),
  reset: () => set({ phase: "step1", style: null, preferences: [], layout: null }),
}));
```

**Mutation hook** (`components.md` §5):
```ts
export function useGenerateLayout() {
  return useMutation({
    mutationFn: (body: GenerateRequest) =>
      authedFetch<Layout>("/generate-layout", { method: "POST", body: JSON.stringify(body) }),
  });
}
```

**Zustand selectors** — always use selectors, not whole-store destructure:
```ts
const phase = useWizardStore((s) => s.phase);    // correct
const { phase } = useWizardStore();               // wrong
```

**cn() for conditional classes:**
```ts
import { cn } from "@/lib/utils";
className={cn("base classes", isActive && "active classes")}
```

**Naming conventions:**
- Python: `snake_case` files/functions, `PascalCase` models
- TS: `kebab-case` files (except components), `PascalCase` components, `camelCase` vars

---

## IMPLEMENTATION PLAN

### Phase A: Backend LLM Service

Build `llm.py` + system prompt. No router yet — test the service in isolation.

**Tasks:**
- Write `backend/app/prompts/system.md` (designer persona, slot rules, style guidance)
- Implement `backend/app/services/llm.py` (`generate()`, `_build_messages()`, `_add_correction()`, error classes)
- Write `backend/tests/test_llm_mock.py` (mock openai client, assert schema validation, retry behavior)

### Phase B: Generate Router + Wire

Connect LLM → placement → HTTP response.

**Tasks:**
- Implement `backend/app/routers/generate.py` (`POST /generate-layout`, error mapping)
- Update `backend/app/main.py` to include generate router
- Write `backend/tests/test_routes_generate.py` (TestClient + mocked LLM service)
- Validate: `uv run pytest -q` and manual `curl` test

### Phase C: Frontend Dependencies + Wizard Store

Install missing packages, build the state layer.

**Tasks:**
- Install `react-hook-form`, `zod`, `@hookform/resolvers`
- Create `frontend/lib/stores/wizard.ts`
- Add `useGenerateLayout` to `frontend/lib/api.ts`

### Phase D: Wizard Components

Build 3 steps bottom-up.

**Tasks:**
- `DimensionsStep.tsx` — react-hook-form + zod, 3 numeric inputs
- `StyleStep.tsx` — 3 style cards with gradient hero backgrounds
- `PreferencesStep.tsx` — chip group, max 2 enforced by disabling

### Phase E: Result Sidebar

Build the right-panel components.

**Tasks:**
- `PaletteBlock.tsx` — 3 swatches with hex badge
- `ExplanationBlock.tsx` — designExplanation prose
- `ResultSidebar.tsx` — input chips + item list + PaletteBlock + ExplanationBlock + buttons

### Phase F: Orchestration

Wire wizard and result into the page.

**Tasks:**
- `WizardShell.tsx` — state machine, progress bar, Back/Next/Generate/Regenerate
- Update `app/app/page.tsx` — replace fixture viewer with `<WizardShell />`

---

## STEP-BY-STEP TASKS

---

### CREATE `backend/app/prompts/system.md`

- **IMPLEMENT**: Static system prompt. This file is read at boot and cached. Do not hardcode room dims or catalog here — those go in the user message.

```markdown
You are a professional interior designer creating living room layouts.
Speak in first-person voice: "I placed…", "I chose…", "I selected…"

Your task: select furniture from the catalog and assign each to a named slot.

## Rules
- Use only catalog IDs listed in the user message. No other IDs.
- Use only slot names from the 19-slot vocabulary listed in the user message.
- Select 3–10 items. More is not always better — respect room scale.
- Each slot holds one item (exception: "rug" and "coffee_table" may share "center").
- Rationale per item: first-person, ≤ 140 characters.
- designExplanation: first-person overview of design intent, 80–600 characters.
- Output valid JSON matching the exact schema provided. No extra fields, no coordinates.

## Style guidance

### scandinavian
Light woods, soft textiles, natural warmth. Palette: warm whites (#F4F1EC), light oak (#D6BFA0), sage accents (#A7B79A). Prefer sofa + armchair + rug + plant combination. Leave open floor space.

### minimal
Calm surfaces, intentional negative space. Palette: white (#FAFAFA), light grey (#E5E5E5), near-black accents (#1A1A1A). Use fewer items — every piece must earn its place. Avoid clutter.

### industrial
Raw materials feel. Palette: concrete grey (#C4C0BA), charcoal (#3A3A3A), warm amber (#C8943A). TV stand prominent on north wall. Bookshelf adds structure. Metal + dark wood combinations.
```

- **GOTCHA**: Do not include JSON schema or catalog list in this file — those are injected in the user message by `_build_messages()`.
- **VALIDATE**: File exists and is readable: `python -c "from pathlib import Path; print(Path('backend/app/prompts/system.md').read_text()[:80])"`

---

### CREATE `backend/app/services/llm.py`

- **IMPLEMENT**:

```python
import json
import logging
from pathlib import Path

from openai import AsyncAzureOpenAI, APIError, BadRequestError
from pydantic import ValidationError

from app.config import Settings
from app.models.catalog import CatalogItem
from app.models.layout import GenerateLayoutRequest, LayoutLLM

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT: str | None = None


def _load_system_prompt() -> str:
    global _SYSTEM_PROMPT
    if _SYSTEM_PROMPT is None:
        path = Path(__file__).parent.parent / "prompts" / "system.md"
        _SYSTEM_PROMPT = path.read_text(encoding="utf-8")
    return _SYSTEM_PROMPT


class LLMError(Exception): ...
class LLMValidationError(LLMError): ...
class LLMUpstreamError(LLMError): ...


def _build_messages(
    req: GenerateLayoutRequest,
    catalog_items: list[CatalogItem],
) -> list[dict]:
    prefs_str = (
        ", ".join(p.replace("_", " ") for p in req.preferences)
        if req.preferences
        else "none specified"
    )

    catalog_lines = "\n".join(
        f"  {item.id}: {item.name}" for item in catalog_items
    )

    slots = [
        "north_wall_left", "north_wall_center", "north_wall_right",
        "east_wall_left", "east_wall_center", "east_wall_right",
        "south_wall_left", "south_wall_center", "south_wall_right",
        "west_wall_left", "west_wall_center", "west_wall_right",
        "corner_NE", "corner_NW", "corner_SE", "corner_SW",
        "center", "center_front", "entry",
    ]
    slots_str = ", ".join(slots)

    schema = LayoutLLM.model_json_schema()

    user_message = f"""Design a {req.style} living room.

Room: {req.width_m}m wide × {req.length_m}m long × {req.height_m}m high
Preferences: {prefs_str}

Available catalog items (use these exact IDs):
{catalog_lines}

Available slots (use these exact names):
  {slots_str}

Output JSON matching this schema exactly:
{json.dumps(schema, indent=2)}"""

    return [
        {"role": "system", "content": _load_system_prompt()},
        {"role": "user", "content": user_message},
    ]


def _add_correction(
    messages: list[dict], bad_json: str, error: str
) -> list[dict]:
    return [
        *messages,
        {"role": "assistant", "content": bad_json},
        {
            "role": "user",
            "content": (
                f"That response failed schema validation: {error}\n"
                "Please output valid JSON matching the schema exactly. "
                "No extra fields, no coordinates."
            ),
        },
    ]


async def generate(
    req: GenerateLayoutRequest,
    settings: Settings,
    catalog_items: list[CatalogItem],
) -> LayoutLLM:
    client = AsyncAzureOpenAI(
        api_key=settings.AZURE_OPENAI_KEY,
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        api_version=settings.AZURE_OPENAI_API_VERSION,
    )
    schema = LayoutLLM.model_json_schema()
    messages = _build_messages(req, catalog_items)

    for attempt in (1, 2):
        try:
            resp = await client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT,
                messages=messages,
                temperature=0.7,
                seed=req.seed,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "Layout",
                        "schema": schema,
                        "strict": True,
                    },
                },
                timeout=20.0,
            )
        except (APIError, BadRequestError) as e:
            logger.error("LLM upstream error attempt=%d: %s", attempt, e)
            raise LLMUpstreamError(str(e)) from e

        raw = resp.choices[0].message.content or ""
        logger.info(
            "LLM attempt=%d tokens=%d",
            attempt,
            resp.usage.total_tokens if resp.usage else -1,
        )
        try:
            return LayoutLLM.model_validate_json(raw)
        except ValidationError as e:
            if attempt == 2:
                raise LLMValidationError(f"schema mismatch after retry: {e}") from e
            logger.warning("LLM validation failed attempt=1, retrying: %s", e)
            messages = _add_correction(messages, raw, str(e))

    raise LLMValidationError("unreachable")
```

- **IMPORTS**: `openai`, `pydantic`, `app.config`, `app.models.catalog`, `app.models.layout`
- **GOTCHA**: `generate()` now takes `catalog_items` as a param (injected by router). This keeps the service testable without file I/O.
- **GOTCHA**: `seed=req.seed` — if `req.seed is None`, pass `None` and the openai SDK omits the param. Do not use `**({'seed': req.seed} if req.seed else {})` — just pass it directly; None is handled.
- **GOTCHA**: `response_format` with `json_schema` requires API version `2024-10-21` or later. Confirm `settings.AZURE_OPENAI_API_VERSION`.
- **GOTCHA**: Never log `raw` at INFO level — can be 600+ chars and contains user PII-adjacent content.
- **VALIDATE**: `cd backend && uv run python -c "from app.services.llm import generate, LLMValidationError; print('ok')"`

---

### CREATE `backend/app/routers/generate.py`

- **IMPLEMENT**:

```python
from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.models.layout import GenerateLayoutRequest, Layout
from app.routers.catalog import _load_catalog
from app.services import llm, placement

router = APIRouter(prefix="/generate-layout", tags=["generate"])


@router.post("", response_model=Layout, status_code=status.HTTP_200_OK)
async def generate_layout(
    body: GenerateLayoutRequest,
    settings: Settings = Depends(get_settings),
) -> Layout:
    catalog_items = _load_catalog().items
    try:
        raw = await llm.generate(body, settings, catalog_items)
    except llm.LLMValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)
        ) from e
    except llm.LLMUpstreamError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        ) from e
    return placement.resolve(raw, body, catalog_items)
```

- **PATTERN**: `api.md` §3 router anatomy. One `APIRouter` per file, prefix on router, empty string on route.
- **GOTCHA**: `_load_catalog()` is `lru_cache` — safe to call on every request (returns same object).
- **GOTCHA**: `placement.resolve` is synchronous but fast (pure CPU). Running it inside an async handler is fine for MVP.
- **VALIDATE**: `cd backend && uv run python -c "from app.routers.generate import router; print(router.prefix)"`

---

### UPDATE `backend/app/main.py`

- **ADD** generate router import and `app.include_router(generate.router)`:

```python
from app.routers import catalog, generate

# inside create_app(), after catalog router:
app.include_router(generate.router)
```

- **PATTERN**: Mirrors `catalog.router` include. Keep `/healthz` inline as-is.
- **VALIDATE**: `cd backend && uv run python -c "from app.main import app; routes=[r.path for r in app.routes]; assert '/generate-layout' in routes; print(routes)"`

---

### CREATE `backend/tests/test_llm_mock.py`

- **IMPLEMENT**: Mock the `openai.AsyncAzureOpenAI` client at the class level using `pytest-mock` or `unittest.mock`.

```python
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import ValidationError

from app.models.catalog import CatalogItem, Footprint, Clearance
from app.models.layout import GenerateLayoutRequest, LayoutLLM
from app.services.llm import generate, LLMValidationError, LLMUpstreamError

VALID_LLM_RESPONSE = {
    "style": "scandinavian",
    "palette": {
        "wall":   {"name": "Soft White", "hex": "#F4F1EC"},
        "floor":  {"name": "Light Oak",  "hex": "#D6BFA0"},
        "accent": {"name": "Sage",       "hex": "#A7B79A"},
    },
    "items": [
        {"catalogId": "sofa_3seat",  "slot": "south_wall_center", "facing": "auto", "rationale": "I placed the sofa to anchor the seating zone facing the TV wall."},
        {"catalogId": "tv_stand",    "slot": "north_wall_center", "facing": "auto", "rationale": "I centered the TV stand on the back wall opposite the sofa."},
        {"catalogId": "rug",         "slot": "center",            "facing": "auto", "rationale": "I used a rug to ground the seating zone in the center."},
    ],
    "designExplanation": "I designed this Scandinavian room to maximize calm and openness. The sofa and TV stand face each other across a central rug, leaving the east and west walls free for breathing room.",
}

CATALOG_ITEMS = [
    CatalogItem(
        id="sofa_3seat", name="3-seat sofa",
        footprint=Footprint(w=2.10, d=0.95, h=0.85),
        clearance=Clearance(front=0.70, sides=0.10, back=0.05),
        allowedSlotKinds=["wall"], model="/models/sofa_3seat.glb",
    ),
    CatalogItem(
        id="tv_stand", name="TV stand",
        footprint=Footprint(w=1.60, d=0.45, h=0.55),
        clearance=Clearance(front=0.50, sides=0.10, back=0.05),
        allowedSlotKinds=["wall"], model="/models/tv_stand.glb",
    ),
    CatalogItem(
        id="rug", name="Area rug",
        footprint=Footprint(w=2.40, d=1.60, h=0.02),
        clearance=Clearance(front=0.0, sides=0.0, back=0.0),
        allowedSlotKinds=["floor"], model="/models/rug.glb",
    ),
]

STD_REQUEST = GenerateLayoutRequest(
    roomType="living_room", width_m=5.0, length_m=6.0,
    height_m=2.6, style="scandinavian", preferences=[], seed=42,
)


def _make_mock_response(content: str):
    choice = MagicMock()
    choice.message.content = content
    resp = MagicMock()
    resp.choices = [choice]
    resp.usage.total_tokens = 500
    return resp


@pytest.fixture
def mock_settings():
    from app.config import Settings
    return Settings(
        AZURE_OPENAI_ENDPOINT="https://test.openai.azure.com",
        AZURE_OPENAI_KEY="test-key",
        AZURE_OPENAI_DEPLOYMENT="gpt-4o",
        AZURE_OPENAI_API_VERSION="2024-10-21",
        SUPABASE_URL="", SUPABASE_JWKS_URL="", SUPABASE_ANON_KEY="",
    )


@pytest.mark.asyncio
async def test_generate_happy_path(mock_settings):
    raw = json.dumps(VALID_LLM_RESPONSE)
    with patch("app.services.llm.AsyncAzureOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.chat.completions.create = AsyncMock(
            return_value=_make_mock_response(raw)
        )
        result = await generate(STD_REQUEST, mock_settings, CATALOG_ITEMS)
    assert isinstance(result, LayoutLLM)
    assert result.style == "scandinavian"
    assert len(result.items) == 3


@pytest.mark.asyncio
async def test_generate_retry_on_invalid_json(mock_settings):
    bad_json = '{"style": "scandinavian", "items": []}'  # fails min_length=3
    raw = json.dumps(VALID_LLM_RESPONSE)
    call_count = 0

    async def side_effect(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return _make_mock_response(bad_json)
        return _make_mock_response(raw)

    with patch("app.services.llm.AsyncAzureOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.chat.completions.create = AsyncMock(side_effect=side_effect)
        result = await generate(STD_REQUEST, mock_settings, CATALOG_ITEMS)
    assert call_count == 2
    assert isinstance(result, LayoutLLM)


@pytest.mark.asyncio
async def test_generate_raises_validation_error_after_two_failures(mock_settings):
    bad_json = '{"style": "scandinavian", "items": []}'
    with patch("app.services.llm.AsyncAzureOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.chat.completions.create = AsyncMock(
            return_value=_make_mock_response(bad_json)
        )
        with pytest.raises(LLMValidationError):
            await generate(STD_REQUEST, mock_settings, CATALOG_ITEMS)


@pytest.mark.asyncio
async def test_generate_raises_upstream_error(mock_settings):
    from openai import APIError
    with patch("app.services.llm.AsyncAzureOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.chat.completions.create = AsyncMock(
            side_effect=APIError("upstream", response=MagicMock(status_code=500), body={})
        )
        with pytest.raises(LLMUpstreamError):
            await generate(STD_REQUEST, mock_settings, CATALOG_ITEMS)


def test_build_messages_contains_catalog_ids(mock_settings):
    from app.services.llm import _build_messages
    msgs = _build_messages(STD_REQUEST, CATALOG_ITEMS)
    user_content = msgs[1]["content"]
    assert "sofa_3seat" in user_content
    assert "tv_stand" in user_content
    assert "rug" in user_content
    assert "north_wall_center" in user_content
    assert "center" in user_content


def test_build_messages_does_not_include_footprints(mock_settings):
    from app.services.llm import _build_messages
    msgs = _build_messages(STD_REQUEST, CATALOG_ITEMS)
    user_content = msgs[1]["content"]
    assert "footprint" not in user_content
    assert "clearance" not in user_content
```

- **GOTCHA**: `pytest-asyncio` is in dev deps; `asyncio_mode = "auto"` set in `pyproject.toml`. No `@pytest.mark.asyncio` decorator needed — but add it anyway for clarity and forward-compat.
- **GOTCHA**: `APIError` constructor signature: `APIError(message, response, body)`. Use `MagicMock()` for the response arg.
- **VALIDATE**: `cd backend && uv run pytest tests/test_llm_mock.py -v`

---

### CREATE `backend/tests/test_routes_generate.py`

- **IMPLEMENT**: TestClient hitting `POST /generate-layout` with a mocked LLM service.

```python
import json
from unittest.mock import AsyncMock, patch

import pytest

from app.models.layout import LayoutLLM

VALID_LLM_JSON = {
    "style": "minimal",
    "palette": {
        "wall":   {"name": "White",     "hex": "#FAFAFA"},
        "floor":  {"name": "Grey",      "hex": "#E5E5E5"},
        "accent": {"name": "Charcoal",  "hex": "#1A1A1A"},
    },
    "items": [
        {"catalogId": "sofa_3seat", "slot": "south_wall_center", "facing": "auto", "rationale": "I anchored the sofa on the south wall for a clean sightline."},
        {"catalogId": "tv_stand",   "slot": "north_wall_center", "facing": "auto", "rationale": "I placed the TV stand centered on the back wall."},
        {"catalogId": "coffee_table","slot": "center",            "facing": "auto", "rationale": "I centered the coffee table to serve the seating zone."},
    ],
    "designExplanation": "I designed this minimal room with restraint and purpose — three pieces, each earning its place, creating a calm space free from visual noise.",
}


def test_generate_layout_success(client):
    raw = LayoutLLM.model_validate(VALID_LLM_JSON)
    with patch("app.routers.generate.llm.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = raw
        resp = client.post("/generate-layout", json={
            "roomType": "living_room",
            "width_m": 5.0, "length_m": 6.0, "height_m": 2.6,
            "style": "minimal", "preferences": [], "seed": 1,
        })
    assert resp.status_code == 200
    data = resp.json()
    assert data["style"] == "minimal"
    assert len(data["items"]) >= 1
    for item in data["items"]:
        assert "position" in item
        assert "rotation_y" in item
        assert len(item["position"]) == 3


def test_generate_layout_validation_error_returns_422(client):
    resp = client.post("/generate-layout", json={"roomType": "living_room"})
    assert resp.status_code == 422


def test_generate_layout_llm_upstream_error_returns_503(client):
    from app.services.llm import LLMUpstreamError
    with patch("app.routers.generate.llm.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = LLMUpstreamError("network error")
        resp = client.post("/generate-layout", json={
            "roomType": "living_room",
            "width_m": 5.0, "length_m": 6.0, "height_m": 2.6,
            "style": "minimal", "preferences": [],
        })
    assert resp.status_code == 503


def test_generate_layout_llm_validation_error_returns_502(client):
    from app.services.llm import LLMValidationError
    with patch("app.routers.generate.llm.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.side_effect = LLMValidationError("bad schema")
        resp = client.post("/generate-layout", json={
            "roomType": "living_room",
            "width_m": 5.0, "length_m": 6.0, "height_m": 2.6,
            "style": "minimal", "preferences": [],
        })
    assert resp.status_code == 502
```

- **GOTCHA**: `client` fixture is in `conftest.py` and uses `TestClient(app)`. The mock patches `app.routers.generate.llm.generate` — the fully qualified import path that the router uses, not the service module directly.
- **VALIDATE**: `cd backend && uv run pytest tests/test_routes_generate.py -v`

---

### INSTALL frontend dependencies

- **RUN** from `frontend/`:

```bash
pnpm add react-hook-form zod @hookform/resolvers
```

- **VALIDATE**: `cd frontend && pnpm typecheck` (no new errors from package additions)

---

### CREATE `frontend/lib/stores/wizard.ts`

- **IMPLEMENT**:

```ts
import { create } from "zustand";
import type { Layout, Style, Preference, RoomDims } from "@/lib/types";

export type WizardPhase = "step1" | "step2" | "step3" | "generating" | "result";

type WizardStore = {
  phase: WizardPhase;
  dims: RoomDims;
  style: Style | null;
  preferences: Preference[];
  layout: Layout | null;
  seed: number | null;
  setPhase: (phase: WizardPhase) => void;
  setDims: (dims: RoomDims) => void;
  setStyle: (style: Style) => void;
  setPreferences: (prefs: Preference[]) => void;
  setLayout: (layout: Layout) => void;
  setSeed: (seed: number | null) => void;
  reset: () => void;
};

const DEFAULT_DIMS: RoomDims = { width_m: 4, length_m: 5, height_m: 2.6 };

export const useWizardStore = create<WizardStore>((set) => ({
  phase: "step1",
  dims: DEFAULT_DIMS,
  style: null,
  preferences: [],
  layout: null,
  seed: null,
  setPhase: (phase) => set({ phase }),
  setDims: (dims) => set({ dims }),
  setStyle: (style) => set({ style }),
  setPreferences: (prefs) => set({ preferences: prefs }),
  setLayout: (layout) => set({ layout }),
  setSeed: (seed) => set({ seed }),
  reset: () => set({
    phase: "step1",
    style: null,
    preferences: [],
    layout: null,
    seed: null,
    dims: DEFAULT_DIMS,
  }),
}));
```

- **PATTERN**: `components.md` §4 — one store per domain, selectors pattern.
- **GOTCHA**: `seed` in the store is what was used for the last generation. When user hits Regenerate, increment or randomize it client-side to get a different result from the same inputs.
- **VALIDATE**: `cd frontend && pnpm typecheck`

---

### UPDATE `frontend/lib/api.ts`

- **ADD** `useGenerateLayout` mutation after `catalogQuery`:

```ts
import { useMutation } from "@tanstack/react-query";
import type { Layout, GenerateRequest } from "@/lib/types";

export function useGenerateLayout() {
  return useMutation({
    mutationFn: (body: GenerateRequest) =>
      authedFetch<Layout>("/generate-layout", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}
```

- **IMPORTS**: Add `useMutation` from `@tanstack/react-query`. Types already in `types.ts`.
- **GOTCHA**: No `onSuccess` invalidation needed — generate is stateless (not stored). Save is Phase 3.
- **VALIDATE**: `cd frontend && pnpm typecheck`

---

### CREATE `frontend/components/wizard/DimensionsStep.tsx`

- **IMPLEMENT**: Step 1 — 3 numeric inputs with react-hook-form + zod validation.

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { RoomDims } from "@/lib/types";

const schema = z.object({
  width_m:  z.number().min(2).max(12),
  length_m: z.number().min(2).max(12),
  height_m: z.number().min(2.2).max(4),
});

type DimensionsStepProps = {
  initial: RoomDims;
  onNext: (dims: RoomDims) => void;
};

export default function DimensionsStep({ initial, onNext }: DimensionsStepProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<RoomDims>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Room dimensions</h2>
        <p className="mt-1 text-sm text-neutral-500">Enter approximate measurements in metres.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            { name: "width_m",  label: "Width",  hint: "2 – 12 m" },
            { name: "length_m", label: "Length", hint: "2 – 12 m" },
            { name: "height_m", label: "Height", hint: "2.2 – 4 m", step: "0.1" },
          ] as const
        ).map(({ name, label, hint, step = "0.5" }) => (
          <div key={name} className="flex flex-col gap-1">
            <label htmlFor={name} className="text-sm font-medium">{label}</label>
            <input
              id={name}
              type="number"
              inputMode="decimal"
              step={step}
              {...register(name, { valueAsNumber: true })}
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                errors[name] ? "border-red-500" : "border-neutral-300",
              )}
            />
            <span className="text-xs text-neutral-400">{hint}</span>
            {errors[name] && (
              <span className="text-xs text-red-500">{errors[name]?.message}</span>
            )}
          </div>
        ))}
      </div>
      <button
        type="submit"
        className="self-end rounded-lg bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Next
      </button>
    </form>
  );
}
```

- **GOTCHA**: `valueAsNumber: true` in `register()` is required for numeric inputs — otherwise you get strings.
- **GOTCHA**: `step="0.5"` on width/length prevents non-sensical precision. Height uses `"0.1"`.
- **VALIDATE**: `cd frontend && pnpm typecheck`

---

### CREATE `frontend/components/wizard/StyleStep.tsx`

- **IMPLEMENT**: Step 2 — 3 style cards with gradient backgrounds (no image files needed).

```tsx
"use client";
import { cn } from "@/lib/utils";
import type { Style } from "@/lib/types";

type StyleStepProps = {
  value: Style | null;
  onChange: (style: Style) => void;
  onNext: () => void;
  onBack: () => void;
};

const STYLES: ReadonlyArray<{
  id: Style;
  label: string;
  tagline: string;
  gradient: string;
  swatches: [string, string, string];
}> = [
  {
    id: "scandinavian",
    label: "Scandinavian",
    tagline: "Light woods, soft textiles, cozy warmth",
    gradient: "from-[#F4F1EC] via-[#D6BFA0] to-[#A7B79A]",
    swatches: ["#F4F1EC", "#D6BFA0", "#A7B79A"],
  },
  {
    id: "minimal",
    label: "Minimal",
    tagline: "Calm surfaces, intentional negative space",
    gradient: "from-[#FAFAFA] via-[#E5E5E5] to-[#1A1A1A]",
    swatches: ["#FAFAFA", "#E5E5E5", "#1A1A1A"],
  },
  {
    id: "industrial",
    label: "Industrial",
    tagline: "Raw metal, concrete, exposed structure",
    gradient: "from-[#C4C0BA] via-[#3A3A3A] to-[#C8943A]",
    swatches: ["#C4C0BA", "#3A3A3A", "#C8943A"],
  },
];

export default function StyleStep({ value, onChange, onNext, onBack }: StyleStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Choose a style</h2>
        <p className="mt-1 text-sm text-neutral-500">The AI will honour this aesthetic throughout.</p>
      </div>
      <div role="radiogroup" aria-label="Design style" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={value === s.id}
            onClick={() => onChange(s.id)}
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border-2 text-left transition",
              value === s.id
                ? "border-neutral-900 ring-2 ring-neutral-900/20"
                : "border-neutral-200 hover:border-neutral-400",
            )}
          >
            <div className={cn("h-28 w-full bg-gradient-to-br", s.gradient)} />
            <div className="p-3">
              <p className="font-semibold">{s.label}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{s.tagline}</p>
              <div className="mt-2 flex gap-1">
                {s.swatches.map((hex) => (
                  <span
                    key={hex}
                    className="h-4 w-4 rounded-full border border-neutral-200"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-sm text-neutral-500 hover:text-neutral-800">
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!value}
          className="rounded-lg bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

- **PATTERN**: `components.md` §3 — `role="radiogroup"` + `role="radio"` + `aria-checked`. Native `<button>` with `type="button"`.
- **GOTCHA**: Gradient backgrounds use Tailwind arbitrary values — ensure `tailwind.config.ts` has `content` globbing `components/**/*.tsx`.
- **GOTCHA**: `disabled:opacity-40` on Next button makes the disabled state visually distinct (not just cursor).
- **VALIDATE**: `cd frontend && pnpm typecheck`

---

### CREATE `frontend/components/wizard/PreferencesStep.tsx`

- **IMPLEMENT**: Step 3 — chip group, max 2, disable unselected when 2 are active.

```tsx
"use client";
import { cn } from "@/lib/utils";
import type { Preference } from "@/lib/types";

type PreferencesStepProps = {
  value: Preference[];
  onChange: (prefs: Preference[]) => void;
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
};

const PREFERENCES: ReadonlyArray<{ id: Preference; label: string }> = [
  { id: "more_seating",    label: "More seating" },
  { id: "more_open_space", label: "More open space" },
  { id: "more_storage",    label: "More storage" },
];

export default function PreferencesStep({
  value,
  onChange,
  onGenerate,
  onBack,
  isGenerating,
}: PreferencesStepProps) {
  const toggle = (pref: Preference) => {
    if (value.includes(pref)) {
      onChange(value.filter((p) => p !== pref));
    } else if (value.length < 2) {
      onChange([...value, pref]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Any preferences?</h2>
        <p className="mt-1 text-sm text-neutral-500">Pick up to 2. Skip to let the AI decide.</p>
      </div>
      <fieldset>
        <legend className="sr-only">Design preferences</legend>
        <div className="flex flex-wrap gap-3">
          {PREFERENCES.map((p) => {
            const isSelected = value.includes(p.id);
            const isDisabled = !isSelected && value.length >= 2;
            return (
              <button
                key={p.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                disabled={isDisabled}
                onClick={() => toggle(p.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  isSelected
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500",
                  isDisabled && "cursor-not-allowed opacity-40",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-sm text-neutral-500 hover:text-neutral-800">
          Back
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="rounded-lg bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {isGenerating ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
```

- **PATTERN**: `components.md` §8 — `<fieldset>`, `<legend className="sr-only">`, `role="checkbox"`, `aria-checked`, disable when max reached.
- **GOTCHA**: Preferences are optional — user can hit Generate with 0 preferences selected.
- **VALIDATE**: `cd frontend && pnpm typecheck`

---

### CREATE `frontend/components/sidebar/PaletteBlock.tsx`

- **IMPLEMENT**:

```tsx
import type { PaletteMap } from "@/lib/types";

type PaletteBlockProps = { palette: PaletteMap };

const LABELS: Record<keyof PaletteMap, string> = {
  wall: "Wall",
  floor: "Floor",
  accent: "Accent",
};

export default function PaletteBlock({ palette }: PaletteBlockProps) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Palette</h3>
      <div className="flex flex-col gap-2">
        {(Object.keys(palette) as Array<keyof PaletteMap>).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span
              className="h-8 w-8 flex-none rounded-md border border-neutral-200"
              style={{ backgroundColor: palette[key].hex }}
            />
            <div>
              <p className="text-xs text-neutral-400">{LABELS[key]}</p>
              <p className="text-sm font-medium">{palette[key].name}</p>
            </div>
            <span className="ml-auto font-mono text-xs text-neutral-400">{palette[key].hex}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- **GOTCHA**: `style={{ backgroundColor: hex }}` is correct here — runtime-derived value from the layout, not a static class. Per `components.md` §3, inline style is allowed for runtime-derived values only.
- **VALIDATE**: `cd frontend && pnpm typecheck`

---

### CREATE `frontend/components/sidebar/ExplanationBlock.tsx`

- **IMPLEMENT**:

```tsx
type ExplanationBlockProps = { text: string };

export default function ExplanationBlock({ text }: ExplanationBlockProps) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Why this works
      </h3>
      <p className="text-sm leading-relaxed text-neutral-700 italic">{text}</p>
    </div>
  );
}
```

- **VALIDATE**: `cd frontend && pnpm typecheck`

---

### CREATE `frontend/components/sidebar/ResultSidebar.tsx`

- **IMPLEMENT**:

```tsx
"use client";
import { useWizardStore } from "@/lib/stores/wizard";
import { SLOT_LABELS } from "@/lib/slot-mappings";
import PaletteBlock from "@/components/sidebar/PaletteBlock";
import ExplanationBlock from "@/components/sidebar/ExplanationBlock";
import type { Layout, Style, Preference } from "@/lib/types";

type ResultSidebarProps = {
  layout: Layout;
  style: Style;
  preferences: Preference[];
  onRegenerate: () => void;
  onAdjust: () => void;
};

const STYLE_LABELS: Record<Style, string> = {
  scandinavian: "Scandinavian",
  minimal: "Minimal",
  industrial: "Industrial",
};

const PREF_LABELS: Record<Preference, string> = {
  more_seating:    "More seating",
  more_open_space: "More open space",
  more_storage:    "More storage",
};

export default function ResultSidebar({
  layout,
  style,
  preferences,
  onRegenerate,
  onAdjust,
}: ResultSidebarProps) {
  return (
    <aside className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {/* Input chips */}
      <div className="flex flex-wrap gap-2">
        {[STYLE_LABELS[style], ...preferences.map((p) => PREF_LABELS[p])].map((label) => (
          <span
            key={label}
            className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700"
          >
            {label}
          </span>
        ))}
        {layout.warnings.length > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            {layout.warnings.length} warning{layout.warnings.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Item list */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Layout</h3>
        <ul className="flex flex-col gap-2">
          {layout.items.map((item) => (
            <li key={`${item.catalogId}-${item.slot}`} className="flex flex-col">
              <span className="text-sm font-medium capitalize">{item.catalogId.replace(/_/g, " ")}</span>
              <span className="text-xs text-neutral-400">{SLOT_LABELS[item.slot]}</span>
            </li>
          ))}
        </ul>
      </div>

      <PaletteBlock palette={layout.palette} />
      <ExplanationBlock text={layout.designExplanation} />

      {/* Action buttons */}
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={onRegenerate}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={onAdjust}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Adjust preferences
        </button>
        <button
          type="button"
          disabled
          title="Save requires login — coming soon"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </aside>
  );
}
```

- **GOTCHA**: Save button is `disabled` in Phase 2 (no auth yet). Show it but prevent action — Phase 3 enables it.
- **GOTCHA**: `SLOT_LABELS` from `@/lib/slot-mappings` covers all 19 slots. If an item has an unknown slot (shouldn't happen post-Phase 1), TypeScript will catch it at compile time.
- **VALIDATE**: `cd frontend && pnpm typecheck`

---

### CREATE `frontend/components/wizard/WizardShell.tsx`

- **IMPLEMENT**: The state machine orchestrator. This is the largest component — controls phase transitions, calls the API, and renders either the wizard or the result view.

```tsx
"use client";
import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";

import { useWizardStore } from "@/lib/stores/wizard";
import { useGenerateLayout } from "@/lib/api";
import { useViewerStore } from "@/lib/stores/viewer";

import DimensionsStep from "@/components/wizard/DimensionsStep";
import StyleStep from "@/components/wizard/StyleStep";
import PreferencesStep from "@/components/wizard/PreferencesStep";
import ResultSidebar from "@/components/sidebar/ResultSidebar";
import CameraPresets from "@/components/viewer/CameraPresets";
import ItemPopover from "@/components/viewer/ItemPopover";

import type { RoomDims, Style, Preference } from "@/lib/types";

const Scene = dynamic(() => import("@/components/viewer/Scene"), { ssr: false });

const PHASE_LABELS = ["Dimensions", "Style", "Preferences"];
const PHASE_INDEX: Record<string, number> = { step1: 0, step2: 1, step3: 2 };

export default function WizardShell() {
  const phase = useWizardStore((s) => s.phase);
  const dims = useWizardStore((s) => s.dims);
  const style = useWizardStore((s) => s.style);
  const preferences = useWizardStore((s) => s.preferences);
  const layout = useWizardStore((s) => s.layout);
  const seed = useWizardStore((s) => s.seed);
  const setPhase = useWizardStore((s) => s.setPhase);
  const setDims = useWizardStore((s) => s.setDims);
  const setStyle = useWizardStore((s) => s.setStyle);
  const setPreferences = useWizardStore((s) => s.setPreferences);
  const setLayout = useWizardStore((s) => s.setLayout);
  const setSeed = useWizardStore((s) => s.setSeed);
  const reset = useWizardStore((s) => s.reset);
  const clearSelection = useViewerStore((s) => s.setSelectedItem);

  const { mutate: generate, isPending } = useGenerateLayout();

  useEffect(() => {
    if (phase === "result") {
      clearSelection(null);
    }
  }, [phase, clearSelection]);

  const handleGenerate = (newSeed?: number) => {
    if (!style) return;
    const useSeed = newSeed ?? Math.floor(Math.random() * 1_000_000);
    setSeed(useSeed);
    setPhase("generating");
    generate(
      { roomType: "living_room", ...dims, style, preferences, seed: useSeed },
      {
        onSuccess: (data) => {
          setLayout(data);
          setPhase("result");
        },
        onError: () => {
          setPhase("step3");
        },
      },
    );
  };

  const handleRegenerate = () => {
    handleGenerate(Math.floor(Math.random() * 1_000_000));
  };

  const handleAdjust = () => {
    setPhase("step3");
  };

  // Result view
  if (phase === "result" && layout && style) {
    return (
      <div className="flex h-screen">
        <div className="relative flex-1">
          <div className="absolute left-4 top-4 z-10">
            <CameraPresets />
          </div>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-neutral-400">
                Loading 3D scene…
              </div>
            }
          >
            <Scene layout={layout} dims={dims} />
          </Suspense>
          <ItemPopover />
        </div>
        <div className="w-80 shrink-0 border-l border-neutral-200">
          <ResultSidebar
            layout={layout}
            style={style}
            preferences={preferences}
            onRegenerate={handleRegenerate}
            onAdjust={handleAdjust}
          />
        </div>
      </div>
    );
  }

  // Generating loading state
  if (phase === "generating") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
        <p className="text-sm text-neutral-500">Designing your room…</p>
      </div>
    );
  }

  // Wizard steps
  const stepIndex = PHASE_INDEX[phase] ?? 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-neutral-400">
            {PHASE_LABELS.map((label, i) => (
              <span key={label} className={i <= stepIndex ? "text-neutral-900" : ""}>
                {label}
              </span>
            ))}
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all"
              style={{ width: `${((stepIndex + 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        {phase === "step1" && (
          <DimensionsStep
            initial={dims}
            onNext={(d: RoomDims) => {
              setDims(d);
              setPhase("step2");
            }}
          />
        )}
        {phase === "step2" && (
          <StyleStep
            value={style}
            onChange={(s: Style) => setStyle(s)}
            onNext={() => setPhase("step3")}
            onBack={() => setPhase("step1")}
          />
        )}
        {phase === "step3" && (
          <PreferencesStep
            value={preferences}
            onChange={(p: Preference[]) => setPreferences(p)}
            onGenerate={() => handleGenerate()}
            onBack={() => setPhase("step2")}
            isGenerating={isPending}
          />
        )}
      </div>
    </div>
  );
}
```

- **GOTCHA**: `isPending` from `useMutation` tracks the in-flight state. `phase === "generating"` in the store is redundant but gives a persistent loading state that survives component remounts.
- **GOTCHA**: `handleGenerate()` with no arg uses a random seed. `handleRegenerate()` always uses a new random seed. This guarantees a different result.
- **GOTCHA**: On `onError`, revert to `"step3"` so the user can see their preferences and retry.
- **GOTCHA**: `dynamic(() => import("@/components/viewer/Scene"), { ssr: false })` — same SSR bypass as Phase 1.
- **VALIDATE**: `cd frontend && pnpm typecheck`

---

### UPDATE `frontend/app/app/page.tsx`

- **IMPLEMENT**: Replace entire file with a thin shell that renders `<WizardShell />`.

```tsx
import WizardShell from "@/components/wizard/WizardShell";

export default function AppPage() {
  return <WizardShell />;
}
```

- **GOTCHA**: This is a **Server Component** (no `"use client"`). It simply imports `WizardShell` which has its own `"use client"` boundary. This keeps the page itself lean.
- **GOTCHA**: `WizardShell` is marked `"use client"` so it will be the boundary. The server component can import it safely.
- **VALIDATE**: `cd frontend && pnpm build` (no errors)

---

## TESTING STRATEGY

### Unit Tests

**`test_llm_mock.py`** — pure unit, no FastAPI:
- Happy path: valid LLM JSON → `LayoutLLM` returned
- Retry: invalid JSON on attempt 1, valid on attempt 2 → success, `call_count == 2`
- Double failure: invalid JSON both attempts → `LLMValidationError` raised
- Upstream error: `APIError` → `LLMUpstreamError` raised
- `_build_messages`: asserts catalog IDs in user message, asserts footprints NOT in user message

**`test_routes_generate.py`** — `TestClient` + mocked LLM:
- Happy path: mocked `LayoutLLM` → 200 + `Layout` with `position`, `rotation_y` in items
- Pydantic validation failure (missing fields) → 422
- `LLMUpstreamError` → 503
- `LLMValidationError` → 502

### Integration Tests (manual, no new pytest files)

Generate 10 layouts via `curl` covering all style × preference combinations. Verify:
- Response is valid JSON
- All `catalogId`s exist in catalog
- All `slot`s are in the 19-slot enum
- No two items overlap (manual spot-check)
- `designExplanation` is first-person prose

### Edge Cases

- Width or length at minimum (2m) — sofa may be dropped due to AABB; `warnings` populated
- All 3 preferences selected at the API level → Pydantic rejects (`max_length=2`) → 422
- `seed=999999` — deterministic repeat gives same placement (modulo LLM nondeterminism)
- LLM emits `additionalProperties` in item → `extra="forbid"` on `LayoutLLM` → retry → `LLMValidationError`

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app
cd frontend && pnpm lint && pnpm typecheck
```

### Level 2: Unit Tests

```bash
cd backend && uv run pytest tests/test_llm_mock.py -v
cd backend && uv run pytest tests/test_routes_generate.py -v
cd backend && uv run pytest -q   # full suite (healthz + catalog + resolver + placement + llm + generate)
```

### Level 3: Integration (local server)

```bash
# Requires real AZURE_OPENAI_* in backend/.env
cd backend && uv run uvicorn app.main:app --port 8000 &
curl -s -X POST http://localhost:8000/generate-layout \
  -H "Content-Type: application/json" \
  -d '{"roomType":"living_room","width_m":5,"length_m":6,"height_m":2.6,"style":"scandinavian","preferences":["more_storage"],"seed":42}' \
  | python -m json.tool
kill %1
```

Expected: 200 with `items` array containing `position`, `rotation_y`, `model` fields.

### Level 4: Manual UI Validation

1. `cd frontend && pnpm dev` → open http://localhost:3000/app
2. Step 1: Enter `5 × 6 × 2.6` → Next
3. Step 2: Click "Scandinavian" → Next
4. Step 3: Select "More storage" → Generate
5. Loading spinner appears for ~5–8 seconds
6. Result view: 3D room renders with AI-placed furniture
7. Click a furniture item → `ItemPopover` shows name + rationale
8. Sidebar shows: style chip, palette swatches, design explanation
9. Click "Regenerate" → new layout renders (different from first)
10. Click "Adjust preferences" → returns to step 3 with same dims/style
11. Camera presets: Top / 3/4 / Eye all work

### Level 5: Stress Generation (10 layouts)

```bash
for style in scandinavian minimal industrial; do
  for seed in 1 2 3; do
    echo "--- $style seed=$seed ---"
    curl -s -X POST http://localhost:8000/generate-layout \
      -H "Content-Type: application/json" \
      -d "{\"roomType\":\"living_room\",\"width_m\":5,\"length_m\":6,\"height_m\":2.6,\"style\":\"$style\",\"preferences\":[],\"seed\":$seed}" \
      | python -m json.tool | grep -E '"style"|"catalogId"|"slot"|"warnings"'
  done
done
```

All 9 should return 200 with no 502/503 errors. `warnings` may be non-empty (drops) but should not be alarming.

---

## ACCEPTANCE CRITERIA

- [ ] `POST /generate-layout` returns 200 with a valid `Layout` (items have `position`, `rotation_y`, `footprint`, `model`)
- [ ] All `catalogId`s in the response exist in `GET /catalog`
- [ ] All `slot`s in the response are in the 19-slot enum
- [ ] `designExplanation` is first-person voice (starts with "I")
- [ ] Same `seed` + same inputs → same layout on repeat calls
- [ ] LLM schema violations trigger one retry; two failures → 502
- [ ] LLM network failure → 503
- [ ] `uv run ruff check . && uv run mypy app` passes with zero errors
- [ ] `uv run pytest -q` passes (all 5+ test files green)
- [ ] 3-step wizard renders and navigates correctly (forward and back)
- [ ] Style cards show 3 distinct gradient designs with swatch dots
- [ ] Preferences step enforces max-2 by disabling extra chips
- [ ] Generate button triggers API call; loading state shows during fetch
- [ ] On success: 3D viewer renders with AI layout + sidebar with palette + explanation
- [ ] Regenerate generates a new layout; result updates in-place
- [ ] Adjust preferences → returns to step 3 with current values preserved
- [ ] `pnpm lint && pnpm typecheck && pnpm build` passes with zero errors
- [ ] No Phase 3 code introduced (no Supabase auth, no `/layouts` POST, no JWT logic)

---

## COMPLETION CHECKLIST

- [ ] `backend/app/prompts/system.md` written with persona, rules, style guidance
- [ ] `backend/app/services/llm.py` implemented with `generate()`, error classes, `_build_messages()`, `_add_correction()`
- [ ] `backend/app/routers/generate.py` implemented, error mapping correct
- [ ] `backend/app/main.py` updated to include generate router
- [ ] `backend/tests/test_llm_mock.py` written, all tests green
- [ ] `backend/tests/test_routes_generate.py` written, all tests green
- [ ] `pnpm add react-hook-form zod @hookform/resolvers` done
- [ ] `frontend/lib/stores/wizard.ts` created, Zustand store complete
- [ ] `frontend/lib/api.ts` updated with `useGenerateLayout`
- [ ] `frontend/components/wizard/DimensionsStep.tsx` created
- [ ] `frontend/components/wizard/StyleStep.tsx` created
- [ ] `frontend/components/wizard/PreferencesStep.tsx` created
- [ ] `frontend/components/sidebar/PaletteBlock.tsx` created
- [ ] `frontend/components/sidebar/ExplanationBlock.tsx` created
- [ ] `frontend/components/sidebar/ResultSidebar.tsx` created
- [ ] `frontend/components/wizard/WizardShell.tsx` created
- [ ] `frontend/app/app/page.tsx` replaced with `<WizardShell />`
- [ ] All Level 1–4 validation commands pass
- [ ] 10-layout stress test passes without 5xx errors

---

## NOTES

**Why `catalog_items` passed to `generate()` instead of loaded inside:** Keeps the service free of file I/O and trivially testable — inject the catalog fixture in tests, no `lru_cache` side-effects. The router already has `_load_catalog()` available.

**Why gradient backgrounds instead of hero images:** No asset-sourcing dependency during implementation. The gradient uses the actual palette hex colors from the style guide, which reinforces the aesthetic. Real photography can be added in Phase 3 polish without code changes — just swap the `<div className="h-28 bg-gradient-to-br ...">` for `<Image>`.

**Why wizard state machine on same page instead of separate route:** Phase 2 has no persistence — there is no URL to link to a generated layout. Routing to `/app/result` would require passing the Layout through URL params or session storage. State machine keeps everything in Zustand, which is fast and clean. Phase 3 will add `result/[id]` for *saved* layouts.

**Why `seed` is randomized on each Generate/Regenerate:** The PRD says "hidden seed for repeatable demos" (via `?seed=12345` query param). For regular users, each Generate should produce a fresh result. The wizard store exposes `seed` so the URL-param override can be wired in Phase 3.

**Why Save button is disabled but rendered:** Users see it and understand the flow. The disabled + tooltip pattern sets expectations: "log in to save". Phase 3 enables it by checking Supabase session and triggering auth modal.

**`asyncio_mode = "auto"` in pyproject.toml:** Already set. All async tests run without `@pytest.mark.asyncio` decorator, but add it anyway for code clarity.

**Missing `.env` for integration tests:** The LLM calls need real Azure credentials in `backend/.env`. Tests that call `generate()` directly are mocked. Only the Level 3 manual test and Level 5 stress test require a real `.env`. The plan assumes credentials exist in `backend/.env` (gitignored).

**Confidence Score: 8/10**

Risks:
1. `response_format: json_schema` with `strict: True` requires Azure OpenAI API version `2024-10-21+` and a `gpt-4o` deployment that supports structured outputs — verify in Azure portal before testing.
2. `tailwind.config.ts` must glob `components/sidebar/**/*.tsx` — check `content` array.
3. `APIError` constructor in openai SDK v1.54 takes `(message, response, body)` — mock accordingly; the exact signature may differ from the test template above. Run the mock tests to verify.
4. `isPending` vs `isLoading` — in TanStack Query v5, `useMutation` uses `isPending` (not `isLoading`). The plan uses `isPending` correctly for v5.
