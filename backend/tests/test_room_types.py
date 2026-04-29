import pytest

from app.services.room_types import all_profiles, get_profile

ROOM_TYPES = ["living_room", "bedroom", "dining_room", "home_office"]


def test_all_room_types_load() -> None:
    profiles = all_profiles()
    for rt in ROOM_TYPES:
        assert rt in profiles


@pytest.mark.parametrize("rt", ROOM_TYPES)
def test_slot_instances_non_empty(rt: str) -> None:
    p = get_profile(rt)  # type: ignore[arg-type]
    assert p.slot_instances


@pytest.mark.parametrize("rt", ROOM_TYPES)
def test_default_zone_in_allowed(rt: str) -> None:
    p = get_profile(rt)  # type: ignore[arg-type]
    assert p.default_zone in p.allowed_zones


@pytest.mark.parametrize("rt", ROOM_TYPES)
def test_dim_bounds_sane(rt: str) -> None:
    p = get_profile(rt)  # type: ignore[arg-type]
    assert p.dim_bounds.width_m[0] < p.dim_bounds.width_m[1]
    assert p.dim_bounds.length_m[0] < p.dim_bounds.length_m[1]
    assert p.dim_bounds.height_m[0] < p.dim_bounds.height_m[1]


@pytest.mark.parametrize("rt", ROOM_TYPES)
def test_slot_accepted_tags_covers_all_instances(rt: str) -> None:
    p = get_profile(rt)  # type: ignore[arg-type]
    for slot in p.slot_instances:
        assert slot in p.slot_accepted_tags, f"missing tags for {slot}"
        assert p.slot_accepted_tags[slot], f"empty tag list for {slot}"
