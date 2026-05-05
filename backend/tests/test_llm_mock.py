import json
from unittest.mock import AsyncMock, patch

import pytest

from app.models.catalog import CatalogItem, Clearance, Footprint, PlacementSpec
from app.models.layout import GenerateLayoutRequest, MergedLayoutLLM
from app.services.llm import generate
from app.services.room_types import get_profile as get_room_profile
from app.services.style_profiles import get_profile as get_style_profile

PASS1_RESP = {
    "style": "scandinavian",
    "palette": {
        "wall": {"name": "Soft White", "hex": "#F4F1EC"},
        "floor": {"name": "Light Oak", "hex": "#D6BFA0"},
        "accent": {"name": "Sage", "hex": "#A7B79A"},
    },
    "zones": [{"id": "seating", "kind": "seating_zone", "itemBudget": 3}],
    "styleEmphasis": "Scandinavian minimalism",
    "designExplanation": (
        "I designed this Scandinavian room to maximize calm and openness. The sofa and TV "
        "stand face each other, leaving the walls free for breathing room."
    ),
}

PASS2_RESP = {
    "items": [
        {
            "catalogId": "sofa_3seat",
            "slot": "south_wall_center",
            "facing": "auto",
            "rationale": "I placed the sofa to anchor the seating zone.",
        }
    ]
}


def _ci(cid: str) -> CatalogItem:
    return CatalogItem(
        id=cid,
        name=cid,
        tags=["seating"],
        room_types=["living_room"],  # type: ignore
        placement=PlacementSpec(surfaces=["wall"], against=[], exclusive_with=[]),  # type: ignore
        footprint=Footprint(w=1.0, d=1.0, h=1.0),
        clearance=Clearance(front=0.5, sides=0.1, back=0.05),
        model=f"primitive:{cid}",
    )


CATALOG_ITEMS = [_ci("sofa_3seat")]
LIVING_PROFILE = get_room_profile("living_room")
STYLE_PROFILE = get_style_profile("scandinavian")

STD_REQUEST = GenerateLayoutRequest(
    roomType="living_room",
    width_m=5.0,
    length_m=6.0,
    height_m=2.6,
    style="scandinavian",
    preferences=[],
    seed=42,
)


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


def _make_mock_response(content: str):
    from unittest.mock import MagicMock

    resp = MagicMock()
    resp.output_text = content
    resp.usage.total_tokens = 500
    return resp


@pytest.mark.asyncio
async def test_generate_happy_path(mock_settings):
    call_count = 0

    async def side_effect(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return _make_mock_response(json.dumps(PASS1_RESP))
        return _make_mock_response(json.dumps(PASS2_RESP))

    with patch("app.services.llm.AsyncAzureOpenAI") as MockClient:
        instance = MockClient.return_value
        instance.responses.create = AsyncMock(side_effect=side_effect)
        result = await generate(
            STD_REQUEST, mock_settings, CATALOG_ITEMS, LIVING_PROFILE, STYLE_PROFILE
        )

    assert isinstance(result, MergedLayoutLLM)
    assert result.style == "scandinavian"
    assert len(result.items) == 1
    assert result.items[0].zone == "seating"
