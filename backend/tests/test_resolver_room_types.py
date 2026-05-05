"""Resolver smoke test across every (room_type × slot) pair."""

from __future__ import annotations

import pytest

from app.services.room_types import all_profiles
from app.services.slot_resolver import Footprint, RoomDims, resolve_slot

ROOM_DIMS = {
    "living_room": RoomDims(width_m=5.0, length_m=6.0, height_m=2.6),
    "bedroom": RoomDims(width_m=4.0, length_m=4.5, height_m=2.6),
    "dining_room": RoomDims(width_m=4.0, length_m=5.0, height_m=2.6),
    "home_office": RoomDims(width_m=3.5, length_m=3.5, height_m=2.6),
}

FP = Footprint(w=0.6, d=0.6, h=0.8)


def _all_pairs() -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for rt, profile in all_profiles().items():
        for slot in profile.slot_instances:
            pairs.append((rt, slot))
    return pairs


@pytest.mark.parametrize("rt,slot", _all_pairs())
def test_every_slot_resolves_within_bounds(rt: str, slot: str) -> None:
    room = ROOM_DIMS[rt]
    t = resolve_slot(slot, room, FP)
    x, y, z = t.position
    assert pytest.approx(y, abs=1e-6) == 0.0
    assert abs(x) <= room.width_m / 2 + 0.01
    assert abs(z) <= room.length_m / 2 + 0.01


def test_new_floor_slots_present() -> None:
    bed = resolve_slot("bed_center", ROOM_DIMS["bedroom"], Footprint(w=1.5, d=2.0, h=0.5))
    assert bed.position[1] == pytest.approx(0.0)
    table = resolve_slot("table_center", ROOM_DIMS["dining_room"], Footprint(w=1.4, d=0.9, h=0.75))
    assert table.position == (0.0, pytest.approx(0.0), 0.0)
    desk = resolve_slot("desk_anchor", ROOM_DIMS["home_office"], Footprint(w=1.4, d=0.7, h=0.75))
    assert desk.position[2] < 0  # against north wall
