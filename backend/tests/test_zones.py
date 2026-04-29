from app.models.layout import Layout, Palette, ResolvedItem
from app.services.room_types import get_profile
from app.services.zones import stamp_default_zone


def _palette() -> dict[str, Palette]:
    return {
        "wall": Palette(name="W", hex="#FFFFFF"),
        "floor": Palette(name="F", hex="#D6BFA0"),
        "accent": Palette(name="A", hex="#A7B79A"),
    }


def _resolved(cid: str, slot: str) -> ResolvedItem:
    return ResolvedItem(
        catalogId=cid,
        slot=slot,  # type: ignore[arg-type]
        facing="auto",
        rationale="r",
        position=(0.0, 0.5, 0.0),
        rotation_y=0.0,
        footprint={"w": 1.0, "d": 1.0, "h": 1.0},
        model="primitive:" + cid,
    )


def test_stamps_default_zone_when_empty() -> None:
    profile = get_profile("living_room")
    layout = Layout(
        style="scandinavian",
        palette=_palette(),  # type: ignore[arg-type]
        items=[_resolved("sofa_3seat", "south_wall_center"), _resolved("rug", "center")],
        designExplanation="x" * 90,
    )
    out = stamp_default_zone(layout, profile)
    assert len(out.zones) == 1
    assert out.zones[0].id == "seating_zone"
    for item in out.items:
        assert item.zone == "seating_zone"


def test_preserves_existing_zones() -> None:
    profile = get_profile("bedroom")
    item = _resolved("bed_double", "bed_center").model_copy(update={"zone": "sleep_zone"})
    layout = Layout(
        style="minimal",
        palette=_palette(),  # type: ignore[arg-type]
        items=[item, _resolved("nightstand", "north_wall_left")],
        designExplanation="x" * 90,
    )
    out = stamp_default_zone(layout, profile)
    assert out.items[0].zone == "sleep_zone"
    assert out.items[1].zone == "sleep_zone"  # default stamped on the unzoned one
