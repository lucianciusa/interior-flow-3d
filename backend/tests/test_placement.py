import math

import pytest

from app.models.catalog import CatalogItem
from app.models.layout import (
    GenerateLayoutRequest,
    LayoutItemLLM,
    MergedLayoutLLM,
    Palette,
    Zone,
)
from app.services.placement import SLOT_KINDS, _aabb_overlap, resolve
from app.services.style_profiles import get_profile

# ── Shared fixtures ───────────────────────────────────────────────────────────

_PALETTE = {
    "wall": Palette(name="White", hex="#FFFFFF"),
    "floor": Palette(name="Oak", hex="#D6BFA0"),
    "accent": Palette(name="Sage", hex="#A7B79A"),
}

STD_REQ = GenerateLayoutRequest(
    roomType="living_room",
    width_m=5.0,
    length_m=6.0,
    height_m=2.6,
    style="scandinavian",
    preferences=[],
)

SMALL_REQ = GenerateLayoutRequest(
    roomType="living_room",
    width_m=2.0,
    length_m=2.0,
    height_m=2.2,
    style="minimal",
    preferences=[],
)


def _llm(items: list[LayoutItemLLM]) -> MergedLayoutLLM:
    return MergedLayoutLLM(
        style="scandinavian",
        palette=_PALETTE,
        zones=[Zone(id="z1", kind="seating_zone", itemBudget=6)],
        items=items,
        designExplanation=(
            "I arranged this scandinavian living room to maximize openness and "
            "natural light, placing the sofa centrally to anchor the seating zone."
        ),
    )


def _item(catalog_id: str, slot: str, facing: str = "auto") -> LayoutItemLLM:
    return LayoutItemLLM(
        catalogId=catalog_id,
        slot=slot,
        facing=facing,
        rationale=f"placed {catalog_id} at {slot}",
    )


# ── SLOT_KINDS completeness ───────────────────────────────────────────────────


def test_slot_kinds_has_22_entries() -> None:
    # 12 wall + 4 corner + 6 floor (center, center_front, entry, bed_center,
    # table_center, desk_anchor) = 22
    assert len(SLOT_KINDS) == 22


# ── Happy path ────────────────────────────────────────────────────────────────


def test_happy_path_three_items(catalog_items: list[CatalogItem], living_profile) -> None:
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("tv_stand", "north_wall_center"),
            _item("rug", "center"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    assert len(layout.items) == 3
    assert layout.warnings == []
    for item in layout.items:
        x, y, z = item.position
        assert abs(x) <= STD_REQ.width_m / 2 + 0.01
        assert abs(z) <= STD_REQ.length_m / 2 + 0.01


# ── No AABB overlap in result ─────────────────────────────────────────────────


def test_no_aabb_overlap(catalog_items: list[CatalogItem], living_profile) -> None:
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("tv_stand", "north_wall_center"),
            _item("bookshelf", "north_wall_left"),
            _item("armchair", "west_wall_center"),
            _item("rug", "center"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    placed = layout.items
    for i, a in enumerate(placed):
        for b in placed[i + 1 :]:
            pair = frozenset({a.catalogId, b.catalogId})
            if pair == frozenset({"rug", "coffee_table"}):
                continue
            assert not _aabb_overlap(a, b, margin=0.0), (
                f"AABB overlap: {a.catalogId}@{a.slot} vs {b.catalogId}@{b.slot}"
            )


# ── Co-occupancy: rug + coffee_table share center ────────────────────────────


def test_cooccupancy_rug_coffee_table(catalog_items: list[CatalogItem], living_profile) -> None:
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("tv_stand", "north_wall_center"),
            _item("rug", "center"),
            _item("coffee_table", "center"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    ids = {item.catalogId for item in layout.items}
    assert "rug" in ids
    assert "coffee_table" in ids
    assert layout.warnings == []


# ── Slot exclusivity: two items at same slot → one dropped ───────────────────


def test_slot_exclusivity_drops_lower_priority(
    catalog_items: list[CatalogItem], living_profile
) -> None:
    # sofa (pri 8) and tv_stand (pri 7) both want south_wall_center
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("tv_stand", "south_wall_center"),
            _item("bookshelf", "north_wall_left"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    ids = [item.catalogId for item in layout.items]
    assert "sofa_3seat" in ids
    assert "tv_stand" not in ids
    assert any("tv_stand" in w for w in layout.warnings)


# ── accepted_tags violation → dropped with warning ────────────────────────


def test_wrong_slot_kind_dropped(catalog_items: list[CatalogItem], living_profile) -> None:
    # sofa only allows "wall" slots; corner_NE is a "corner" slot
    llm = _llm(
        [
            _item("tv_stand", "north_wall_center"),
            _item("bookshelf", "north_wall_left"),
            _item("sofa_3seat", "corner_NE"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    ids = {item.catalogId for item in layout.items}
    assert "sofa_3seat" not in ids
    assert any("not accepted" in w or "not allowed" in w for w in layout.warnings)


# ── Unknown catalogId → dropped with warning ─────────────────────────────────


def test_unknown_catalog_id(catalog_items: list[CatalogItem], living_profile) -> None:
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("ghost_chair", "north_wall_center"),
            _item("bookshelf", "north_wall_left"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    ids = {item.catalogId for item in layout.items}
    assert "ghost_chair" not in ids
    assert any("Unknown" in w for w in layout.warnings)


# ── Drop priority ordering ────────────────────────────────────────────────────


def test_drop_priority_floor_lamp_before_plant(
    catalog_items: list[CatalogItem], living_profile
) -> None:
    # Both want corner_NE. floor_lamp (pri 3) > plant_large (pri 1).
    # Corner slots have no nudge — lower priority item is dropped.
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("floor_lamp", "corner_NE"),
            _item("plant_large", "corner_NE"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    ids = {item.catalogId for item in layout.items}
    assert "floor_lamp" in ids
    assert "plant_large" not in ids


# ── Wall items face inward ────────────────────────────────────────────────────


def test_wall_items_face_inward(catalog_items: list[CatalogItem], living_profile) -> None:
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("tv_stand", "north_wall_center"),
            _item("bookshelf", "east_wall_center"),
            _item("armchair", "west_wall_center"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    item_map = {item.catalogId: item for item in layout.items}

    # south_wall → rotation_y ≈ π (faces north/-Z)
    assert pytest.approx(item_map["sofa_3seat"].rotation_y, abs=1e-6) == math.pi
    # north_wall → rotation_y ≈ 0 (faces south/+Z)
    assert pytest.approx(item_map["tv_stand"].rotation_y, abs=1e-6) == 0.0
    # east_wall → rotation_y ≈ -π/2 (faces west/-X)
    assert pytest.approx(item_map["bookshelf"].rotation_y, abs=1e-6) == -math.pi / 2
    # west_wall → rotation_y ≈ π/2 (faces east/+X)
    assert pytest.approx(item_map["armchair"].rotation_y, abs=1e-6) == math.pi / 2


# ── All result catalogIds exist in catalog ────────────────────────────────────


def test_all_result_catalog_ids_valid(
    catalog_items: list[CatalogItem],
    catalog_map: dict[str, CatalogItem],
    living_profile,
) -> None:
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("tv_stand", "north_wall_center"),
            _item("bookshelf", "north_wall_left"),
            _item("floor_lamp", "corner_NW"),
            _item("rug", "center"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    for item in layout.items:
        assert item.catalogId in catalog_map


# ── warnings always a list, even on success ───────────────────────────────────


def test_warnings_is_list_on_success(catalog_items: list[CatalogItem], living_profile) -> None:
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("tv_stand", "north_wall_center"),
            _item("rug", "center"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    assert isinstance(layout.warnings, list)


# ── Seed propagated from request ─────────────────────────────────────────────


def test_seed_propagated(catalog_items: list[CatalogItem], living_profile) -> None:
    req = GenerateLayoutRequest(
        roomType="living_room",
        width_m=5.0,
        length_m=6.0,
        height_m=2.6,
        style="scandinavian",
        preferences=[],
        seed=42,
    )
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("tv_stand", "north_wall_center"),
            _item("rug", "center"),
        ]
    )
    layout = resolve(llm, req, catalog_items, living_profile, get_profile(req.style))
    assert layout.seed == 42


# ── Resolved items have position, rotation_y, footprint, model ───────────────


def test_resolved_item_fields(catalog_items: list[CatalogItem], living_profile) -> None:
    llm = _llm(
        [
            _item("sofa_3seat", "south_wall_center"),
            _item("tv_stand", "north_wall_center"),
            _item("rug", "center"),
        ]
    )
    layout = resolve(llm, STD_REQ, catalog_items, living_profile, get_profile(STD_REQ.style))
    for item in layout.items:
        assert len(item.position) == 3
        assert isinstance(item.rotation_y, float)
        assert {"w", "d", "h"} == set(item.footprint.keys())
        assert item.model != ""


# ── Catalog route returns 10 items ───────────────────────────────────────────


def test_catalog_endpoint(client) -> None:
    r = client.get("/catalog")
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) >= 30
    ids = {i["id"] for i in data["items"]}
    assert "sofa_3seat" in ids
