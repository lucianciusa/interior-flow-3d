"""Run the full router across (room_type × style × prefs) combos with a mocked
LLM. Assert no AABB overlaps and zones are stamped on every item."""

from __future__ import annotations

import itertools
from unittest.mock import AsyncMock, patch

import pytest

from app.models.catalog import RoomType
from app.services.placement import COOCCUPY_ALLOW, _aabb_overlap

ROOM_TYPES: list[RoomType] = ["living_room", "bedroom", "dining_room", "home_office"]
STYLES = ["scandinavian", "minimal", "industrial"]

# Tag-compatible LLM fixtures per room type. Use only ids known to be in the
# catalog and slots known to be in each room's instance set.
_FIXTURES: dict[str, list[dict]] = {
    "living_room": [
        {
            "catalogId": "sofa_3seat",
            "slot": "south_wall_center",
            "facing": "auto",
            "rationale": "anchor",
        },
        {
            "catalogId": "tv_stand",
            "slot": "north_wall_center",
            "facing": "auto",
            "rationale": "media",
        },
        {"catalogId": "rug", "slot": "center", "facing": "auto", "rationale": "ground"},
    ],
    "bedroom": [
        {"catalogId": "bed_double", "slot": "bed_center", "facing": "auto", "rationale": "sleep"},
        {
            "catalogId": "nightstand",
            "slot": "north_wall_left",
            "facing": "auto",
            "rationale": "side",
        },
        {
            "catalogId": "dresser",
            "slot": "south_wall_center",
            "facing": "auto",
            "rationale": "storage",
        },
    ],
    "dining_room": [
        {
            "catalogId": "dining_table_4",
            "slot": "table_center",
            "facing": "auto",
            "rationale": "table",
        },
        {
            "catalogId": "sideboard",
            "slot": "north_wall_center",
            "facing": "auto",
            "rationale": "serve",
        },
        {"catalogId": "rug", "slot": "entry", "facing": "auto", "rationale": "soften"},
    ],
    "home_office": [
        {"catalogId": "desk", "slot": "desk_anchor", "facing": "auto", "rationale": "work"},
        {"catalogId": "office_chair", "slot": "center", "facing": "auto", "rationale": "sit"},
        {
            "catalogId": "bookshelf_tall",
            "slot": "east_wall_center",
            "facing": "auto",
            "rationale": "ref",
        },
    ],
}

_PALETTE = {
    "wall": {"name": "W", "hex": "#FAFAFA"},
    "floor": {"name": "F", "hex": "#D6BFA0"},
    "accent": {"name": "A", "hex": "#A7B79A"},
}

_ROOM_DIMS = {
    "living_room": (5.0, 6.0),
    "bedroom": (4.0, 4.5),
    "dining_room": (4.5, 5.5),
    "home_office": (3.5, 3.5),
}


def _llm_payload(rt: str, style: str) -> dict:
    return {
        "style": style,
        "palette": _PALETTE,
        "zones": [],
        "items": _FIXTURES[rt],
        "designExplanation": (
            f"I shaped this {style} {rt.replace('_', ' ')} around its anchor piece "
            "while leaving room for breathing space and natural circulation."
        ),
    }


@pytest.mark.parametrize("rt,style", list(itertools.product(ROOM_TYPES, STYLES)))
def test_combo_resolves_cleanly(client, rt: str, style: str) -> None:
    from app.models.layout import LayoutLLM

    raw = LayoutLLM.model_validate(_llm_payload(rt, style))
    w, length = _ROOM_DIMS[rt]
    with patch("app.routers.generate.llm.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = raw
        resp = client.post(
            "/generate-layout",
            json={
                "roomType": rt,
                "width_m": w,
                "length_m": length,
                "height_m": 2.6,
                "style": style,
                "preferences": [],
            },
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["zones"], f"empty zones for {rt}/{style}"
    items = data["items"]
    assert items, f"no items placed for {rt}/{style}"
    for it in items:
        assert it["zone"] is not None
    # AABB sanity: synthesise ResolvedItems for overlap check
    from app.models.layout import ResolvedItem

    placed = [ResolvedItem.model_validate(i) for i in items]
    for i, a in enumerate(placed):
        for b in placed[i + 1 :]:
            pair = frozenset({a.catalogId, b.catalogId})
            if pair in COOCCUPY_ALLOW:
                continue
            assert not _aabb_overlap(a, b, margin=0.0), (
                f"{rt}/{style}: overlap {a.catalogId}@{a.slot} vs {b.catalogId}@{b.slot}"
            )
