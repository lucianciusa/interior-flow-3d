import asyncio
import json
import logging
from pathlib import Path
from typing import Any

from openai import APIError, AsyncAzureOpenAI, BadRequestError
from pydantic import ValidationError

from app.config import Settings
from app.models.catalog import CatalogItem
from app.models.layout import GenerateLayoutRequest, MergedLayoutLLM, Pass1LLM, Pass2ZoneLLM
from app.models.room_type import RoomTypeProfile
from app.models.style_profile import StyleProfile
from app.services.catalog_filter import filter_catalog

logger = logging.getLogger(__name__)

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


class LLMError(Exception): ...


class LLMValidationError(LLMError): ...


class LLMUpstreamError(LLMError): ...


def _build_pass1_messages(
    req: GenerateLayoutRequest, profile: RoomTypeProfile, style_prof: StyleProfile
) -> list[dict[str, Any]]:
    prefs_str = (
        ", ".join(p.replace("_", " ") for p in req.preferences)
        if req.preferences
        else "none specified"
    )
    zones_str = ", ".join(profile.allowed_zones)
    schema = Pass1LLM.model_json_schema()

    user_message = f"""Plan a {req.style} {req.roomType.replace("_", " ")}.

Dimensions: {req.width_m}m x {req.length_m}m x {req.height_m}m.
Preferences: {prefs_str}
Allowed Zones: {zones_str}
Style Palette Hints: {", ".join(style_prof.palette_hints)}

Output JSON matching this schema exactly:
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
    profile: RoomTypeProfile,
) -> list[dict[str, Any]]:
    # Filter candidates for this room
    candidates = filter_catalog(catalog_items, req.roomType)
    cat_lines = "\n".join(
        f"  {item.id}: {item.name} (tags: {', '.join(item.tags)})" for item in candidates
    )
    slots_str = ", ".join(profile.slot_instances)
    schema = Pass2ZoneLLM.model_json_schema()

    user_message = f"""Detail the '{zone_id}' zone for a {req.style} room.

Item Budget target: {budget} items.

Available Catalog Items for this zone (use these exact IDs):
{cat_lines}

Available slots (use these exact names; only these are valid for this room type):
{slots_str}

Output JSON matching this schema exactly:
{json.dumps(schema, indent=2)}"""

    return [
        {"role": "system", "content": _load_pass2_prompt()},
        {"role": "user", "content": user_message},
    ]


def _add_correction(
    messages: list[dict[str, Any]], bad_json: str, error: str
) -> list[dict[str, Any]]:
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


def _prepare_schema(obj: Any) -> Any:
    """Recursively set additionalProperties: false for OpenAI strict mode."""
    if isinstance(obj, dict):
        if obj.get("type") == "object":
            obj["additionalProperties"] = False
        return {k: _prepare_schema(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_prepare_schema(i) for i in obj]
    return obj


async def _generate_pass1(
    client: AsyncAzureOpenAI,
    req: GenerateLayoutRequest,
    settings: Settings,
    profile: RoomTypeProfile,
    style_prof: StyleProfile,
) -> Pass1LLM:
    messages = _build_pass1_messages(req, profile, style_prof)
    schema = _prepare_schema(Pass1LLM.model_json_schema())

    for attempt in (1, 2):
        try:
            resp = await client.chat.completions.create(  # type: ignore[call-overload]
                model=settings.AZURE_OPENAI_DEPLOYMENT,
                messages=messages,
                temperature=0.7,
                seed=req.seed,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "Pass1",
                        "schema": schema,
                        "strict": True,
                    },
                },
                timeout=15.0,
            )
            raw = resp.choices[0].message.content or ""
            logger.info(
                "Pass 1 attempt=%d tokens=%d",
                attempt,
                resp.usage.total_tokens if resp.usage else -1,
            )
            return Pass1LLM.model_validate_json(raw)
        except ValidationError as e:
            if attempt == 2:
                raise LLMValidationError(f"Pass 1 schema mismatch after retry: {e}") from e
            logger.warning("Pass 1 validation failed attempt=1, retrying: %s", e)
            messages = _add_correction(messages, raw, str(e))
        except (APIError, BadRequestError) as e:
            logger.error("Pass 1 upstream error attempt=%d: %s", attempt, e)
            raise LLMUpstreamError(str(e)) from e
        except Exception as e:
            raise LLMUpstreamError(str(e)) from e

    raise LLMValidationError("unreachable")


async def _generate_pass2_zone(
    client: AsyncAzureOpenAI,
    req: GenerateLayoutRequest,
    zone_id: str,
    budget: int,
    settings: Settings,
    catalog_items: list[CatalogItem],
    profile: RoomTypeProfile,
) -> Pass2ZoneLLM:
    messages = _build_pass2_messages(req, zone_id, budget, catalog_items, profile)
    schema = _prepare_schema(Pass2ZoneLLM.model_json_schema())

    for attempt in (1, 2):
        try:
            resp = await client.chat.completions.create(  # type: ignore[call-overload]
                model=settings.AZURE_OPENAI_DEPLOYMENT,
                messages=messages,
                temperature=0.7,
                seed=req.seed,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "Pass2",
                        "schema": schema,
                        "strict": True,
                    },
                },
                timeout=15.0,
            )
            raw = resp.choices[0].message.content or ""
            data = json.loads(raw)
            # Inject zone id so items don't lose context
            for item in data.get("items", []):
                item["zone"] = zone_id
            return Pass2ZoneLLM.model_validate(data)
        except ValidationError as e:
            if attempt == 2:
                logger.warning("Zone %s failed after 2 attempts, dropping.", zone_id)
                return Pass2ZoneLLM(items=[])
            messages = _add_correction(messages, raw, str(e))
        except Exception as e:
            logger.warning("Zone %s upstream error, dropping: %s", zone_id, e)
            return Pass2ZoneLLM(items=[])

    return Pass2ZoneLLM(items=[])


async def generate(
    req: GenerateLayoutRequest,
    settings: Settings,
    catalog_items: list[CatalogItem],
    profile: RoomTypeProfile,
    style_prof: StyleProfile,
) -> MergedLayoutLLM:
    client = AsyncAzureOpenAI(
        api_key=settings.AZURE_OPENAI_KEY,
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        api_version=settings.AZURE_OPENAI_API_VERSION,
    )

    pass1_res = await _generate_pass1(client, req, settings, profile, style_prof)

    tasks = [
        _generate_pass2_zone(client, req, z.id, z.itemBudget, settings, catalog_items, profile)
        for z in pass1_res.zones
    ]
    pass2_results = await asyncio.gather(*tasks, return_exceptions=True)

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
