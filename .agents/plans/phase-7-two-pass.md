# Feature: Phase 7 Two-Pass Generation & Style Profiles

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement the final Phase 7 architecture for `interior-flow-3d`. This transitions the LLM generation from a single monolithic pass into a sophisticated two-pass pipeline, parallelized per zone via `asyncio.gather()`, and driven by a config-based `StyleProfile`. 

The core transition involves moving from a single prompt that requests `zones`, `palette`, `designExplanation`, and `items` in one enormous token payload, to a highly controlled and deterministic approach:
- **Pass 1** handles high-level spatial planning. It selects the active zones, allocates an item budget per zone, picks the palette, and provides a stylistic explanation.
- **Pass 2** handles concrete furniture placement. It runs in parallel for each zone selected in Pass 1. The LLM only sees filtered catalog items specifically tagged for that zone, dramatically reducing context size, token usage, and hallucination rates.

Simultaneously, we introduce `StyleProfile`, a configuration-based rule engine that dictates physical layout properties based on the user's chosen style (e.g., Scandinavian vs. Industrial). This configures strict physical constraints such as `wall_flush_tolerance`, `min_clear_floor_pct`, and `density`, directly influencing the mathematical AABB checks in `placement.py` rather than hoping the LLM gets the math right.

## User Story

As a curious homeowner
I want my generated room to feel mathematically precise and deeply consistent with my chosen design style
So that the AI result feels realistic, intentionally designed, uncrowded, and immediately actionable without floating or colliding furniture.

## Problem Statement

Currently, the application attempts to solve the entire interior design layout mathematically and conceptually in one single Azure OpenAI call. This creates several structural issues:
1. **Token Exhaustion & Context Dilution**: Feeding the entire catalog (even filtered) alongside all slot possibilities for every zone overloads the LLM, leading to decreased adherence to instructions.
2. **Hallucination Risk**: In a single pass, the LLM sometimes places items in invalid slots or uses tags that don't match the zone it assigned them to.
3. **Rigid Mathematics**: The `placement.py` AABB collision logic uses a hardcoded margin (e.g., `0.05` meters). Different styles require different spacing. A "Minimalist" room needs wider aisles and stricter wall flushing than a "Japandi" room.
4. **Error Fragility**: If the LLM makes a schema mistake on one item, the entire generation fails or is rejected, instead of gracefully failing just one zone while the rest of the layout survives.

## Solution Statement

We will solve these issues by breaking the monolithic generation process into modular, parallelized stages backed by a data-driven configuration:

1. **Introduce `StyleProfile`**: Create a JSON-backed configuration (`style_profiles.json`) and a Python loader (`services/style_profiles.py`) to govern placement parameters like `density`, `min_clear_floor_pct`, and collision margin (`wall_flush_tolerance`) for each of the 5 supported styles.
2. **Split the LLM Prompts**: Replace `system.md` with `system_pass1.md` and `system_pass2.md` to segregate spatial planning from item detailing.
3. **Refactor Pydantic Models**: Update `models/layout.py` to replace the single `LayoutLLM` with `Pass1LLM` and `Pass2ZoneLLM` models, enforcing strict output schemas natively.
4. **Implement Two-Pass Orchestration**: Rewrite `services/llm.py` to execute Pass 1, extract the selected zones, and then execute Pass 2 for each zone in parallel via `asyncio.gather`. Each Pass 2 call is wrapped in its own retry loop.
5. **Update Placement Engine**: Update `services/placement.py` to utilize `StyleProfile.wall_flush_tolerance` in the AABB collision pass instead of hardcoded floats.

## Feature Metadata

**Feature Type**: Enhancement / Major Architecture Refactor
**Estimated Complexity**: High
**Primary Systems Affected**: 
- `backend/app/services/llm.py`
- `backend/app/models/layout.py`
- `backend/app/services/placement.py`
- `backend/app/routers/generate.py`
**Dependencies**: 
- `asyncio` (Standard Library)
- `openai` (Azure OpenAI SDK, existing)
- `pydantic` (v2, existing)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `backend/app/services/llm.py` (lines 1-160)
  - **Why**: This is the current single-pass logic. You will need to tear down `_build_messages` and `generate` and reconstruct them as `_build_pass1_messages`, `_build_pass2_messages`, `generate_pass1`, `generate_pass2_zone`, and an overarching `generate` orchestrator. 
  - **Pattern to keep**: The strict JSON schema retry loop (catching `ValidationError` and sending a correction).

- `backend/app/services/placement.py` (lines 94-100)
  - **Why**: The `_aabb_overlap` function currently hardcodes `margin = 0.05`. It must accept a dynamic `margin` passed down from the `StyleProfile.wall_flush_tolerance`.

- `backend/app/models/layout.py` (lines 83-93)
  - **Why**: The `LayoutLLM` class represents the current monolithic schema. It must be cleanly deleted and replaced with `Pass1LLM` and `Pass2ZoneLLM`.

- `backend/app/routers/generate.py` (lines 11-49)
  - **Why**: The FastAPI router entry point for `/generate-layout`. You must wire the `StyleProfile` fetching here using the incoming `body.style` and pass the profile into `llm.generate` and `placement.resolve`.

- `.claude/PRD.md` (lines 375-392, 431-445)
  - **Why**: Section F8 defines the exact two-pass pipeline algorithm. Section F12 defines the exact `StyleProfile` Pydantic model specification.

### New Files to Create

- `backend/app/models/style_profile.py` - Pydantic schemas representing the style configuration constraints.
- `backend/app/data/style_profiles.json` - Static data layer holding the 5 JSON entries mapping to the 5 app styles (`scandinavian`, `minimal`, `industrial`, `japandi`, `mid_century`).
- `backend/app/services/style_profiles.py` - Loader service that reads, parses, and caches the JSON file into Pydantic models.
- `backend/app/prompts/system_pass1.md` - The system prompt governing the high-level spatial planning agent.
- `backend/app/prompts/system_pass2.md` - The system prompt governing the granular zone-level furniture placement agent.
- `backend/tests/test_style_profiles.py` - Unit tests for the new loader.
- `backend/tests/test_two_pass.py` - Unit tests mocking Azure OpenAI to guarantee parallel execution.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Pydantic v2 JSON Schema Generation](https://docs.pydantic.dev/latest/concepts/json_schema/)
  - **Specific section**: Ensuring `additionalProperties: False` natively via `model_config`.
  - **Why**: Azure OpenAI strict mode demands exact schema adherence. Our internal `_prepare_schema` recursive function needs valid base generation.
- [Asyncio Gather Documentation](https://docs.python.org/3/library/asyncio-task.html#asyncio.gather)
  - **Specific section**: Error handling and `return_exceptions`.
  - **Why**: We want the entire layout to fail gracefully or selectively if one Pass 2 zone catastrophically fails after retries.

### Patterns to Follow

**JSON Schema Strict Mode Compilation:**
The codebase uses `model.model_json_schema()` passed through `_prepare_schema(obj)` to recursively enforce `additionalProperties: false`. This pattern must be preserved for both new models (`Pass1LLM` and `Pass2ZoneLLM`).

```python
# Existing Pattern to Mirror
schema = _prepare_schema(LayoutLLM.model_json_schema())
```

**Retry Loop Pattern in `llm.py`:**
The generation functions must execute a 2-attempt `for attempt in (1, 2):` loop, catching `ValidationError`, formatting a correction prompt via `_add_correction`, and trying again before raising `LLMValidationError`. This must be replicated identically in `generate_pass1` and `generate_pass2_zone`.

**Error Handling & Bubbling:**
Do not return bare `HTTPException` inside services. Use the custom domain exceptions `LLMValidationError` and `LLMUpstreamError` defined in `llm.py`. Let the router (`generate.py`) catch these and translate them to HTTP status codes (`502` and `503`).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Style Profiles Data Layer
Before altering the LLM logic, we must establish the ground truth for style-based constraints. This involves creating the configuration schema, the JSON data file, and the service loader. This layer sits below the LLM and placement engine and must be highly unit-testable.

**Tasks:**
- Define `StyleProfile` Pydantic model with strict validation bounds (`density` between `0.0` and `1.0`, etc.).
- Draft the exact `data/style_profiles.json` content for the 5 mandated styles.
- Create a synchronous `get_profile(style: str) -> StyleProfile` caching loader service.

### Phase 2: Schema Split & Restructuring
The LLM output contract must be cleanly divided. `LayoutLLM` is currently massive. We will replace it with distinct contracts that map directly to Azure OpenAI's structured output requirement for each pass.

**Tasks:**
- Remove `LayoutLLM` from `models/layout.py`.
- Create `Pass1Zone` and `Pass1LLM`. Pass 1 is responsible for `style`, `palette`, `zones`, `designExplanation`, and a short `styleEmphasis`.
- Create `Pass2ZoneLLM`. Pass 2 is solely responsible for a `list[LayoutItemLLM]` belonging to a specific zone.
- Update `models/layout.py` to ensure imports across the app (like `placement.py` which currently expects `LayoutLLM`) don't crash, perhaps by creating a synthetic/merged `LayoutLLM` class that we assemble manually post-Pass 2.

### Phase 3: Prompts & Two-Pass Orchestration
This is the core refactor. We delete the monolithic prompt and replace it with two separate behaviors. The Pass 1 agent is a spatial planner. The Pass 2 agent is an interior detailer.

**Tasks:**
- Write `prompts/system_pass1.md`.
- Write `prompts/system_pass2.md`.
- In `services/llm.py`, separate message building logic into `_build_pass1_messages` and `_build_pass2_messages`.
- Extract Azure OpenAI client initialization so it can be reused.
- Implement `generate_pass1` returning `Pass1LLM`.
- Implement `generate_pass2_zone` returning `Pass2ZoneLLM`.
- Rewrite the main `generate()` orchestrator to run Pass 1, then execute Pass 2 calls in parallel using `asyncio.gather(*tasks)`.
- Merge the resulting items, palette, and explanations into a unified output object for the placement engine.

### Phase 4: Placement Engine Integration & Router Wire-up
Finally, we apply the `StyleProfile` constraints strictly in the mathematical layer to ensure the 3D rendering obeys the config (like flush wall tolerances).

**Tasks:**
- Modify `services/placement.py` -> `_aabb_overlap` to accept a dynamic `margin`.
- Modify `_try_place` to receive `margin` and pass it down.
- Update `placement.resolve` to extract `profile.wall_flush_tolerance` and pipe it into placement checks.
- Connect the router in `routers/generate.py` to fetch the `StyleProfile` and pass it down the execution chain.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable. Do not combine tasks.

### Task Format Guidelines

- **CREATE**: New files or components
- **UPDATE**: Modify existing files
- **ADD**: Insert new functionality into existing code
- **REMOVE**: Delete deprecated code
- **REFACTOR**: Restructure without changing behavior
- **MIRROR**: Copy pattern from elsewhere in codebase

---

### CREATE `backend/app/models/style_profile.py`

- **IMPLEMENT**: Define the `StyleProfile` Pydantic model. It must exactly match the PRD spec:
  ```python
  from pydantic import BaseModel, ConfigDict, Field
  from app.models.layout import Style

  class StyleProfile(BaseModel):
      model_config = ConfigDict(extra="forbid", frozen=True)

      id: Style
      density: float = Field(ge=0.0, le=1.0)
      symmetry_bias: float = Field(ge=0.0, le=1.0)
      min_clear_floor_pct: float = Field(ge=0.0, le=1.0)
      allowed_zone_count: int = Field(ge=1, le=4)
      wall_flush_tolerance: float = Field(ge=0.0)
      palette_hints: list[str]
  ```
- **GOTCHA**: Ensure `Style` is imported correctly from `app.models.layout`.
- **VALIDATE**: `uv run mypy app/models/style_profile.py`

### CREATE `backend/app/data/style_profiles.json`

- **IMPLEMENT**: Create the static JSON list containing 5 profile entries.
  ```json
  [
    {
      "id": "scandinavian",
      "density": 0.5,
      "symmetry_bias": 0.3,
      "min_clear_floor_pct": 0.6,
      "allowed_zone_count": 3,
      "wall_flush_tolerance": 0.05,
      "palette_hints": ["light wood", "white", "muted sage", "soft grey"]
    },
    {
      "id": "minimal",
      "density": 0.2,
      "symmetry_bias": 0.8,
      "min_clear_floor_pct": 0.8,
      "allowed_zone_count": 2,
      "wall_flush_tolerance": 0.02,
      "palette_hints": ["white", "black", "monochrome", "cool grey"]
    },
    {
      "id": "industrial",
      "density": 0.7,
      "symmetry_bias": 0.4,
      "min_clear_floor_pct": 0.5,
      "allowed_zone_count": 4,
      "wall_flush_tolerance": 0.10,
      "palette_hints": ["exposed brick", "matte black", "warm wood", "leather"]
    },
    {
      "id": "japandi",
      "density": 0.3,
      "symmetry_bias": 0.5,
      "min_clear_floor_pct": 0.7,
      "allowed_zone_count": 3,
      "wall_flush_tolerance": 0.03,
      "palette_hints": ["bamboo", "stone", "beige", "charcoal"]
    },
    {
      "id": "mid_century",
      "density": 0.6,
      "symmetry_bias": 0.6,
      "min_clear_floor_pct": 0.5,
      "allowed_zone_count": 4,
      "wall_flush_tolerance": 0.08,
      "palette_hints": ["teak", "mustard yellow", "teal", "walnut"]
    }
  ]
  ```
- **VALIDATE**: `python -c "import json; json.load(open('backend/app/data/style_profiles.json'))"`

### CREATE `backend/app/services/style_profiles.py`

- **IMPLEMENT**: Create the loader service.
  ```python
  import json
  from pathlib import Path
  from app.models.style_profile import StyleProfile

  _CACHE: dict[str, StyleProfile] | None = None

  def _load_profiles() -> dict[str, StyleProfile]:
      global _CACHE
      if _CACHE is None:
          path = Path(__file__).parent.parent / "data" / "style_profiles.json"
          data = json.loads(path.read_text(encoding="utf-8"))
          _CACHE = {p["id"]: StyleProfile.model_validate(p) for p in data}
      return _CACHE

  def get_profile(style: str) -> StyleProfile:
      profiles = _load_profiles()
      if style not in profiles:
          raise KeyError(f"Unknown style profile: {style}")
      return profiles[style]
  ```
- **GOTCHA**: Use global caching so we don't read the file system on every API request.
- **VALIDATE**: `uv run mypy app/services/style_profiles.py`

### UPDATE `backend/app/models/layout.py` (Part 1 - Remove Old)

- **REMOVE**: Completely delete the `LayoutLLM` class.
- **GOTCHA**: This will temporarily break `placement.py` and `generate.py` until later steps, which is expected during a refactor.

### UPDATE `backend/app/models/layout.py` (Part 2 - Pass 1 Models)

- **ADD**: Insert the new models for Pass 1.
  ```python
  class Pass1Zone(BaseModel):
      model_config = ConfigDict(extra="forbid")
      id: str
      kind: str
      itemBudget: int = Field(ge=1, le=6)

  class Pass1LLM(BaseModel):
      model_config = ConfigDict(extra="forbid")
      style: Style
      palette: PaletteMap
      zones: list[Pass1Zone] = Field(default_factory=list, max_length=4)
      styleEmphasis: str = Field(min_length=10, max_length=140)
      designExplanation: str = Field(min_length=80, max_length=600)
  ```
- **GOTCHA**: Notice `Pass1Zone` is identical to `Zone` but we keep it distinct or reuse `Zone`. It's better to just reuse `Zone` if it's identical! Let's reuse `Zone`. So `Pass1LLM` just uses `zones: list[Zone]`.

### UPDATE `backend/app/models/layout.py` (Part 3 - Pass 2 & Synthetic Merge)

- **ADD**: Insert the Pass 2 models and a synthetic merge model.
  ```python
  class Pass2ZoneLLM(BaseModel):
      model_config = ConfigDict(extra="forbid")
      items: list[LayoutItemLLM] = Field(min_length=1, max_length=10)

  class MergedLayoutLLM(BaseModel):
      """Synthetic object assembling Pass 1 and Pass 2 results for placement.py."""
      model_config = ConfigDict(extra="forbid")
      style: Style
      palette: PaletteMap
      zones: list[Zone]
      items: list[LayoutItemLLM]
      designExplanation: str
  ```
- **VALIDATE**: `uv run mypy app/models/layout.py`

### CREATE `backend/app/prompts/system_pass1.md`

- **IMPLEMENT**: Write the prompt guiding the Pass 1 agent.
  ```markdown
  You are an expert interior design spatial planner.
  Speak in first-person voice: "I planned...", "I chose..."

  Your task: Analyze the room dimensions and user preferences, then define the spatial zones, item budget per zone, the color palette, and the overall design intent.

  ## Rules
  - You must output valid JSON matching the exact schema provided.
  - Choose 1 to 4 zones from the allowed zones list.
  - Assign an `itemBudget` (1-6) per zone indicating how many furniture pieces belong there.
  - Select three palette swatches (wall, floor, accent) appropriate to the requested style. Use 6-digit hex colours.
  - `styleEmphasis` should be a short 1-sentence summary of the aesthetic rules applied.
  - `designExplanation` should be a 80-600 character first-person overview of your zoning and color strategy.
  ```

### CREATE `backend/app/prompts/system_pass2.md`

- **IMPLEMENT**: Write the prompt guiding the Pass 2 agent.
  ```markdown
  You are an expert interior design detailer.
  Speak in first-person voice: "I placed...", "I selected..."

  Your task: Populate a specific zone with furniture pieces.

  ## Rules
  - You must output valid JSON matching the exact schema provided.
  - Use ONLY catalog IDs listed in the user message. Do not hallucinate IDs.
  - Use ONLY slot names listed in the user message.
  - Select between 1 and 10 items for this zone.
  - Each slot holds one item (allowed co-occupancies: rug + coffee_table; rug + dining_table; bed_double + nightstand).
  - Provide a short `rationale` (max 140 chars) for why you chose each piece and location.
  - No coordinates, no extra fields.
  ```

### REFACTOR `backend/app/services/llm.py` (Part 1 - Globals & Loaders)

- **UPDATE**: Change the global prompt loader to handle two files.
  ```python
  _SYSTEM_PROMPT_PASS1: str | None = None
  _SYSTEM_PROMPT_PASS2: str | None = None

  def _load_pass1_prompt() -> str:
      global _SYSTEM_PROMPT_PASS1
      if _SYSTEM_PROMPT_PASS1 is None:
          path = Path(__file__).parent.parent / "prompts" / "system_pass1.md"
          _SYSTEM_PROMPT_PASS1 = path.read_text(encoding="utf-8")
      return _SYSTEM_PROMPT_PASS1

  def _load_pass2_prompt() -> str:
      global _SYSTEM_PROMPT_PASS2
      if _SYSTEM_PROMPT_PASS2 is None:
          path = Path(__file__).parent.parent / "prompts" / "system_pass2.md"
          _SYSTEM_PROMPT_PASS2 = path.read_text(encoding="utf-8")
      return _SYSTEM_PROMPT_PASS2
  ```
- **REMOVE**: `_load_system_prompt()`
- **IMPORTS**: Make sure `MergedLayoutLLM`, `Pass1LLM`, `Pass2ZoneLLM` are imported.

### REFACTOR `backend/app/services/llm.py` (Part 2 - Message Builders)

- **REFACTOR**: Replace `_build_messages` with two specialized functions.
  ```python
  from app.models.style_profile import StyleProfile

  def _build_pass1_messages(
      req: GenerateLayoutRequest, profile: RoomTypeProfile, style_prof: StyleProfile
  ) -> list[dict[str, Any]]:
      prefs_str = ", ".join(p.replace("_", " ") for p in req.preferences) if req.preferences else "none"
      zones_str = ", ".join(profile.allowed_zones)
      schema = Pass1LLM.model_json_schema()
      
      user_message = f"""Plan a {req.style} {req.roomType.replace("_", " ")}.
      Dimensions: {req.width_m}m x {req.length_m}m x {req.height_m}m.
      Preferences: {prefs_str}
      Allowed Zones: {zones_str}
      Style Palette Hints: {", ".join(style_prof.palette_hints)}
      Output JSON matching this schema:
      {json.dumps(schema, indent=2)}"""
      
      return [
          {"role": "system", "content": _load_pass1_prompt()},
          {"role": "user", "content": user_message},
      ]

  def _build_pass2_messages(
      req: GenerateLayoutRequest, 
      zone_id: str, 
      budget: int, 
      catalog_items: list[CatalogItem], 
      profile: RoomTypeProfile
  ) -> list[dict[str, Any]]:
      candidates = filter_catalog(catalog_items, req.roomType, zone_id=zone_id)
      cat_lines = "\n".join(f"  {item.id}: {item.name}" for item in candidates)
      slots_str = ", ".join(profile.slot_instances)
      schema = Pass2ZoneLLM.model_json_schema()
      
      user_message = f"""Detail the '{zone_id}' zone for a {req.style} room.
      Item Budget target: {budget} items.
      Available Catalog Items for this zone:
      {cat_lines}
      Available Slots:
      {slots_str}
      Output JSON matching this schema:
      {json.dumps(schema, indent=2)}"""
      
      return [
          {"role": "system", "content": _load_pass2_prompt()},
          {"role": "user", "content": user_message},
      ]
  ```
- **GOTCHA**: Ensure `filter_catalog` supports the `zone_id` kwarg (it should based on Phase 6 specifications).

### REFACTOR `backend/app/services/llm.py` (Part 3 - Generation Methods)

- **IMPLEMENT**: Create `_generate_pass1` and `_generate_pass2_zone`.
  ```python
  async def _generate_pass1(
      client: AsyncAzureOpenAI, req: GenerateLayoutRequest, settings: Settings, 
      profile: RoomTypeProfile, style_prof: StyleProfile
  ) -> Pass1LLM:
      messages = _build_pass1_messages(req, profile, style_prof)
      schema = _prepare_schema(Pass1LLM.model_json_schema())
      # Wrap in 2-attempt retry loop mirroring existing generate() logic
      for attempt in (1, 2):
          try:
              resp = await client.chat.completions.create(
                  model=settings.AZURE_OPENAI_DEPLOYMENT, messages=messages,
                  temperature=0.7, seed=req.seed,
                  response_format={"type": "json_schema", "json_schema": {"name": "Pass1", "schema": schema, "strict": True}},
                  timeout=15.0,
              )
              raw = resp.choices[0].message.content or ""
              return Pass1LLM.model_validate_json(raw)
          except ValidationError as e:
              if attempt == 2: raise LLMValidationError(f"Pass 1 mismatch: {e}") from e
              messages = _add_correction(messages, raw, str(e))
          except Exception as e:
              raise LLMUpstreamError(str(e)) from e
      raise LLMValidationError("unreachable")

  async def _generate_pass2_zone(
      client: AsyncAzureOpenAI, req: GenerateLayoutRequest, zone_id: str, budget: int,
      settings: Settings, catalog_items: list[CatalogItem], profile: RoomTypeProfile
  ) -> Pass2ZoneLLM:
      messages = _build_pass2_messages(req, zone_id, budget, catalog_items, profile)
      schema = _prepare_schema(Pass2ZoneLLM.model_json_schema())
      for attempt in (1, 2):
          try:
              resp = await client.chat.completions.create(
                  model=settings.AZURE_OPENAI_DEPLOYMENT, messages=messages,
                  temperature=0.7, seed=req.seed,
                  response_format={"type": "json_schema", "json_schema": {"name": "Pass2", "schema": schema, "strict": True}},
                  timeout=15.0,
              )
              raw = resp.choices[0].message.content or ""
              # Hard-inject the zone into the items so they don't lose context
              data = json.loads(raw)
              for item in data.get("items", []):
                  item["zone"] = zone_id
              return Pass2ZoneLLM.model_validate(data)
          except ValidationError as e:
              if attempt == 2:
                  logger.warning(f"Zone {zone_id} failed after 2 attempts, dropping.")
                  return Pass2ZoneLLM(items=[]) # Graceful degradation
              messages = _add_correction(messages, raw, str(e))
          except Exception as e:
              logger.warning(f"Zone {zone_id} upstream error, dropping: {e}")
              return Pass2ZoneLLM(items=[]) # Graceful degradation
      return Pass2ZoneLLM(items=[])
  ```
- **GOTCHA**: Pass 2 zones failing gracefully (returning empty items) is crucial so one halluncinated zone doesn't kill the entire layout.

### REFACTOR `backend/app/services/llm.py` (Part 4 - Main Orchestrator)

- **IMPLEMENT**: Rewrite `generate()` to tie it all together using `asyncio.gather`.
  ```python
  import asyncio

  async def generate(
      req: GenerateLayoutRequest, settings: Settings,
      catalog_items: list[CatalogItem], profile: RoomTypeProfile, style_prof: StyleProfile
  ) -> MergedLayoutLLM:
      client = AsyncAzureOpenAI(
          api_key=settings.AZURE_OPENAI_KEY, azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
          api_version=settings.AZURE_OPENAI_API_VERSION,
      )
      
      # 1. Execute Pass 1
      pass1_res = await _generate_pass1(client, req, settings, profile, style_prof)
      
      # 2. Parallelize Pass 2
      tasks = [
          _generate_pass2_zone(client, req, z.id, z.itemBudget, settings, catalog_items, profile)
          for z in pass1_res.zones
      ]
      pass2_results = await asyncio.gather(*tasks, return_exceptions=True)
      
      # 3. Assemble and Merge
      all_items = []
      for res in pass2_results:
          if isinstance(res, Pass2ZoneLLM):
              all_items.extend(res.items)
              
      return MergedLayoutLLM(
          style=pass1_res.style,
          palette=pass1_res.palette,
          zones=pass1_res.zones,
          items=all_items,
          designExplanation=pass1_res.designExplanation,
      )
  ```
- **VALIDATE**: `uv run mypy app/services/llm.py`

### UPDATE `backend/app/services/placement.py`

- **REFACTOR**: Update `_aabb_overlap` to use `margin` correctly (which it already does structurally, we just need to pass it in).
- **REFACTOR**: Update `_try_place` to accept `margin` and pass it to `_aabb_overlap`:
  ```python
  def _try_place(
      item: LayoutItemLLM, slot: str, t_override: float | None, room: RoomDims,
      catalog_item: CatalogItem, placed: list[ResolvedItem], margin: float
  ) -> ResolvedItem | None:
      # ... [existing resolution logic] ...
      for existing in placed:
          # ... [co-occupancy check] ...
          if _aabb_overlap(candidate, existing, margin=margin):
              return None
      return candidate
  ```
- **REFACTOR**: Update `resolve()` signature to accept `style_prof: StyleProfile` and `llm: MergedLayoutLLM`.
- **UPDATE**: Inside `resolve()`, extract `margin = style_prof.wall_flush_tolerance`. Pass `margin` into every call of `_try_place`.
  ```python
  def resolve(
      llm: MergedLayoutLLM, request: GenerateLayoutRequest,
      catalog: list[CatalogItem], profile: RoomTypeProfile, style_prof: StyleProfile
  ) -> Layout:
      # ...
      margin = style_prof.wall_flush_tolerance
      # ...
      result = _try_place(item, slot, t_alt, room, catalog_item, placed, margin)
  ```
- **VALIDATE**: `uv run mypy app/services/placement.py`

### UPDATE `backend/app/routers/generate.py`

- **IMPLEMENT**: Update the `/generate-layout` endpoint to fetch the style profile and pass it to LLM and Placement.
  ```python
  from app.services import style_profiles

  @router.post("", response_model=Layout, status_code=status.HTTP_200_OK)
  async def generate_layout(
      body: GenerateLayoutRequest, settings: Settings = Depends(get_settings),
  ) -> Layout:
      catalog_items = _load_catalog().items
      # ... [existing validation] ...
      
      try:
          style_prof = style_profiles.get_profile(body.style)
      except KeyError as e:
          raise HTTPException(status_code=422, detail=str(e)) from e

      try:
          raw_merged = await llm.generate(body, settings, catalog_items, profile, style_prof)
      except llm.LLMValidationError as e:
          raise HTTPException(status_code=502, detail=str(e)) from e
      except llm.LLMUpstreamError as e:
          raise HTTPException(status_code=503, detail=str(e)) from e

      layout = placement.resolve(raw_merged, body, catalog_items, profile, style_prof)
      # ... [return layout] ...
  ```
- **VALIDATE**: `uv run mypy app/routers/generate.py`

### CREATE `backend/tests/test_style_profiles.py`

- **IMPLEMENT**: Write simple unit tests verifying that all 5 styles parse correctly and limits (e.g. `density` floats) are honored.
  ```python
  from app.services.style_profiles import get_profile

  def test_style_profiles_load():
      styles = ["scandinavian", "minimal", "industrial", "japandi", "mid_century"]
      for s in styles:
          prof = get_profile(s)
          assert prof.id == s
          assert 0.0 <= prof.density <= 1.0
          assert prof.wall_flush_tolerance > 0.0
  ```

### UPDATE `backend/tests/test_placement.py` & `test_routes_layouts.py`

- **REFACTOR**: You must update existing tests to pass the `style_prof` object into `placement.resolve`. In test files, instantiate a dummy `StyleProfile(id="minimal", density=0.5, symmetry_bias=0.5, min_clear_floor_pct=0.5, allowed_zone_count=2, wall_flush_tolerance=0.05, palette_hints=[])` wherever `placement.resolve` is called directly.

---

## TESTING STRATEGY

### Unit Tests
- **Style Profiles:** Ensure the JSON parser successfully inflates Pydantic models and enforces float limits (`ge=0.0`, `le=1.0`).
- **Placement Margin Testing:** Specifically target `_aabb_overlap` in `test_placement.py`. Create two items that are exactly `0.04m` apart. With `industrial` (tolerance 0.10) it should collide. With `minimal` (tolerance 0.02) it should pass.
- **Two Pass Mocks:** If `test_two_pass.py` exists, rewrite it to heavily mock `AsyncAzureOpenAI.chat.completions.create`. Use `pytest.mark.asyncio`. Simulate Pass 1 returning 2 zones, and ensure the mock is called exactly 3 times (1 for pass 1, 2 for pass 2).

### Integration Tests
- **Graceful Zone Degradation:** Mock one of the Pass 2 zones to throw an `APIError` constantly. Ensure the final `MergedLayoutLLM` successfully returns items from the *other* zones, avoiding complete layout failure.
- **Strict Mode Validation:** Ensure that Azure OpenAI's requirement for `additionalProperties: False` does not raise an exception inside `_prepare_schema`. 

### Edge Cases
- **Zero Items Returned:** What if Pass 2 returns an empty items array? The schemas set `min_length=1`. If it fails, the retry loop kicks in, and ultimately returns empty gracefully.
- **Unknown Zone:** Pass 1 returns a hallucinated zone name. `generate_pass2_zone` should just accept it and filter candidates; if `filter_catalog` throws, catch it gracefully.

---

## VALIDATION COMMANDS

Execute every command sequentially. Treat failures as blockers. Do not proceed until the command succeeds.

### Level 1: Syntax & Style (Project Standards)
```bash
uv run ruff check .
uv run ruff format .
uv run mypy app
```

### Level 2: Unit Tests (Specific Logic Boundaries)
```bash
uv run pytest backend/tests/test_style_profiles.py
uv run pytest backend/tests/test_placement.py
```

### Level 3: Integration Tests
```bash
uv run pytest backend/tests/
```

### Level 4: Manual Validation
1. Start the backend (`uv run uvicorn app.main:app`).
2. `curl -X POST "http://localhost:8000/generate-layout"` passing a valid `GenerateLayoutRequest` JSON payload.
3. Observe the server logs to see Pass 1 execute, followed immediately by multiple Pass 2 executions happening simultaneously.
4. Verify the JSON response contains items mapped exactly to the zones specified in Pass 1.

---

## ACCEPTANCE CRITERIA

- [ ] `data/style_profiles.json` contains exactly 5 fully valid style configurations.
- [ ] `StyleProfile` Pydantic model enforces float bounds and schema correctness.
- [ ] LLM pipeline uses `_generate_pass1` followed by parallel `asyncio.gather` for Pass 2.
- [ ] No `LayoutLLM` is used anywhere for LLM output binding; it is fully replaced by `Pass1LLM` and `Pass2ZoneLLM` logic.
- [ ] `StyleProfile.wall_flush_tolerance` is actively passed down to `placement.py` collision checks.
- [ ] Graceful degradation works: If one zone fails Pass 2 retry limits, the layout generates with the remaining zones instead of returning a 502 HTTP error.
- [ ] All FastAPI endpoints pass type checking (`mypy`).
- [ ] Unit tests are updated to inject a mock `StyleProfile`.
- [ ] End-to-end `/generate-layout` completes within the 10-second SLA constraint.
- [ ] Azure OpenAI payload validates perfectly without `additionalProperties` missing errors.
- [ ] `system_pass1.md` and `system_pass2.md` properly enforce first-person rationale and strict catalog inclusion.

---

## COMPLETION CHECKLIST

- [ ] All 21 tasks completed in top-to-bottom dependency order.
- [ ] All `GOTCHA` warnings successfully circumvented.
- [ ] `mypy` throws zero errors related to the `MergedLayoutLLM` type changes.
- [ ] `pytest` suite passes with no regressions in the placement engine.
- [ ] Manual CURL validation confirms parallel execution timing (Pass 2 zones run synchronously).
- [ ] `models/layout.py` is perfectly clean with no monolithic leftovers.

---

## NOTES

**Architectural Trade-off**: By moving `designExplanation` into Pass 1, we are asking the LLM to explain the design *before* it actually selects the exact items in Pass 2. This is a deliberate trade-off for speed and token efficiency. Since the Pass 1 agent assigns the budget, sets the zones, and picks the palette, its explanation of the "intent" is accurate enough, while the Pass 2 per-item `rationale` handles the granular "Why did I put the chair here" logic. This avoids needing a 3rd sequential LLM pass just to summarize the output.

**Error Handling**: The decision to swallow Pass 2 validation errors and return `Pass2ZoneLLM(items=[])` is critical. It turns a fragile pipeline into a resilient one. A living room with a missing "accent zone" is better than a 502 Bad Gateway screen for the user.
