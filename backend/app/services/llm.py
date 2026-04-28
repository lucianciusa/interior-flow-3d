import json
import logging
from pathlib import Path
from typing import Any

from openai import APIError, AsyncAzureOpenAI, BadRequestError
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
) -> list[dict[str, Any]]:
    prefs_str = (
        ", ".join(p.replace("_", " ") for p in req.preferences)
        if req.preferences
        else "none specified"
    )

    catalog_lines = "\n".join(f"  {item.id}: {item.name}" for item in catalog_items)

    slots = [
        "north_wall_left",
        "north_wall_center",
        "north_wall_right",
        "east_wall_left",
        "east_wall_center",
        "east_wall_right",
        "south_wall_left",
        "south_wall_center",
        "south_wall_right",
        "west_wall_left",
        "west_wall_center",
        "west_wall_right",
        "corner_NE",
        "corner_NW",
        "corner_SE",
        "corner_SW",
        "center",
        "center_front",
        "entry",
    ]
    slots_str = ", ".join(slots)

    schema = LayoutLLM.model_json_schema()

    user_message = f"""Design a {req.style} living room.

Room: {req.width_m}m wide x {req.length_m}m long x {req.height_m}m high
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
            resp = await client.chat.completions.create(  # type: ignore[call-overload]
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
