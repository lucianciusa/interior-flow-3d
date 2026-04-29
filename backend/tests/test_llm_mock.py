import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.catalog import CatalogItem, Clearance, Footprint, PlacementSpec
from app.models.layout import GenerateLayoutRequest, LayoutLLM
from app.services.llm import LLMUpstreamError, LLMValidationError, generate
from app.services.room_types import get_profile

VALID_LLM_RESPONSE = {
    "style": "scandinavian",
    "palette": {
        "wall": {"name": "Soft White", "hex": "#F4F1EC"},
        "floor": {"name": "Light Oak", "hex": "#D6BFA0"},
        "accent": {"name": "Sage", "hex": "#A7B79A"},
    },
    "zones": [],
    "items": [
        {
            "catalogId": "sofa_3seat",
            "slot": "south_wall_center",
            "facing": "auto",
            "zone": None,
            "rationale": "I placed the sofa to anchor the seating zone.",
        },
        {
            "catalogId": "tv_stand",
            "slot": "north_wall_center",
            "facing": "auto",
            "zone": None,
            "rationale": "I centered the TV stand on the back wall.",
        },
        {
            "catalogId": "rug",
            "slot": "center",
            "facing": "auto",
            "zone": None,
            "rationale": "I used a rug to ground the seating zone.",
        },
    ],
    "designExplanation": (
        "I designed this Scandinavian room to maximize calm and openness."
        " The sofa and TV stand face each other across a central rug,"
        " leaving the east and west walls free for breathing room."
    ),
}


def _ci(
    cid: str,
    name: str,
    tags: list[str],
    rooms: list[str],
    surfaces: list[str],
    fp: tuple[float, float, float],
) -> CatalogItem:
    return CatalogItem(
        id=cid,
        name=name,
        tags=tags,
        room_types=rooms,  # type: ignore[arg-type]
        placement=PlacementSpec(surfaces=surfaces, against=[], exclusive_with=[]),  # type: ignore[arg-type]
        footprint=Footprint(w=fp[0], d=fp[1], h=fp[2]),
        clearance=Clearance(front=0.5, sides=0.1, back=0.05),
        model=f"primitive:{cid}",
    )


CATALOG_ITEMS = [
    _ci(
        "sofa_3seat",
        "3-seat sofa",
        ["seating", "upholstered", "large"],
        ["living_room"],
        ["wall"],
        (2.10, 0.95, 0.85),
    ),
    _ci(
        "tv_stand", "TV stand", ["media", "storage"], ["living_room"], ["wall"], (1.60, 0.45, 0.55)
    ),
    _ci("rug", "Area rug", ["rug"], ["living_room"], ["floor"], (2.40, 1.60, 0.02)),
]

LIVING_PROFILE = get_profile("living_room")

STD_REQUEST = GenerateLayoutRequest(
    roomType="living_room",
    width_m=5.0,
    length_m=6.0,
    height_m=2.6,
    style="scandinavian",
    preferences=[],
    seed=42,
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
        SUPABASE_URL="",
        SUPABASE_JWKS_URL="",
        SUPABASE_ANON_KEY="",
    )


@pytest.mark.asyncio
async def test_generate_happy_path(mock_settings):
    raw = json.dumps(VALID_LLM_RESPONSE)
    with patch("app.services.llm.AsyncAzureOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.chat.completions.create = AsyncMock(return_value=_make_mock_response(raw))
        result = await generate(STD_REQUEST, mock_settings, CATALOG_ITEMS, LIVING_PROFILE)
    assert isinstance(result, LayoutLLM)
    assert result.style == "scandinavian"
    assert len(result.items) == 3


@pytest.mark.asyncio
async def test_generate_retry_on_invalid_json(mock_settings):
    bad_json = '{"style": "scandinavian", "items": []}'
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
        result = await generate(STD_REQUEST, mock_settings, CATALOG_ITEMS, LIVING_PROFILE)
    assert call_count == 2
    assert isinstance(result, LayoutLLM)


@pytest.mark.asyncio
async def test_generate_raises_validation_error_after_two_failures(
    mock_settings,
):
    bad_json = '{"style": "scandinavian", "items": []}'
    with patch("app.services.llm.AsyncAzureOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.chat.completions.create = AsyncMock(return_value=_make_mock_response(bad_json))
        with pytest.raises(LLMValidationError):
            await generate(STD_REQUEST, mock_settings, CATALOG_ITEMS, LIVING_PROFILE)


@pytest.mark.asyncio
async def test_generate_raises_upstream_error(mock_settings):
    from openai import APIError

    with patch("app.services.llm.AsyncAzureOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.chat.completions.create = AsyncMock(
            side_effect=APIError(
                "upstream",
                request=MagicMock(),
                body={},
            )
        )
        with pytest.raises(LLMUpstreamError):
            await generate(STD_REQUEST, mock_settings, CATALOG_ITEMS, LIVING_PROFILE)


def test_build_messages_contains_catalog_ids(mock_settings):
    from app.services.llm import _build_messages

    msgs = _build_messages(STD_REQUEST, CATALOG_ITEMS, LIVING_PROFILE)
    user_content = msgs[1]["content"]
    assert "sofa_3seat" in user_content
    assert "tv_stand" in user_content
    assert "rug" in user_content
    assert "north_wall_center" in user_content
    assert "center" in user_content


def test_build_messages_does_not_include_footprints(mock_settings):
    from app.services.llm import _build_messages

    msgs = _build_messages(STD_REQUEST, CATALOG_ITEMS, LIVING_PROFILE)
    user_content = msgs[1]["content"]
    assert '"footprint"' not in user_content
    assert '"clearance"' not in user_content


def test_build_messages_uses_room_type_in_user_msg(mock_settings):
    from app.services.llm import _build_messages

    msgs = _build_messages(STD_REQUEST, CATALOG_ITEMS, LIVING_PROFILE)
    user_content = msgs[1]["content"]
    assert "living room" in user_content
