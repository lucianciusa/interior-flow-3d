import math

import pytest

from app.services.slot_resolver import (
    FACING_ROTATIONS,
    Footprint,
    RoomDims,
    Transform,
    resolve_slot,
)

# ── Fixtures ─────────────────────────────────────────────────────────────────

ROOM_MIN = RoomDims(2.0, 2.0, 2.2)
ROOM_MAX = RoomDims(12.0, 12.0, 4.0)
ROOM_STD = RoomDims(4.0, 5.0, 2.6)

FP_SOFA = Footprint(2.10, 0.95, 0.85)
FP_SMALL = Footprint(0.35, 0.35, 1.60)
FP_CORNER = Footprint(0.50, 0.50, 1.50)
FP_RUG = Footprint(2.40, 1.60, 0.02)

ALL_SLOTS = [
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

WALL_SLOTS = [s for s in ALL_SLOTS if "_wall_" in s]
CORNER_SLOTS = [s for s in ALL_SLOTS if s.startswith("corner_")]
FLOOR_SLOTS = ["center", "center_front", "entry"]


# ── Helpers ───────────────────────────────────────────────────────────────────


def approx_eq(a: float, b: float, tol: float = 1e-9) -> bool:
    return abs(a - b) < tol


# ── y = fp.h / 2 for every slot ───────────────────────────────────────────────


@pytest.mark.parametrize("slot", ALL_SLOTS)
@pytest.mark.parametrize("room", [ROOM_MIN, ROOM_MAX, ROOM_STD])
def test_y_is_zero(slot: str, room: RoomDims) -> None:
    fp = FP_SMALL
    t = resolve_slot(slot, room, fp)
    assert pytest.approx(t.position[1], abs=1e-9) == fp.h / 2


# ── Position within room bounds ───────────────────────────────────────────────


@pytest.mark.parametrize("slot", ALL_SLOTS)
@pytest.mark.parametrize("room", [ROOM_MIN, ROOM_MAX, ROOM_STD])
def test_position_within_room_bounds(slot: str, room: RoomDims) -> None:
    # Use small footprint so it always fits
    fp = FP_SMALL
    t = resolve_slot(slot, room, fp)
    x, _, z = t.position
    # Allow a small overshoot for edge cases (e.g. large item in tiny room)
    assert abs(x) <= room.width_m / 2 + 0.01
    assert abs(z) <= room.length_m / 2 + 0.01


# ── Wall margin: back face ≤ 0.07 m from wall ────────────────────────────────


@pytest.mark.parametrize("slot", WALL_SLOTS)
@pytest.mark.parametrize("room", [ROOM_STD, ROOM_MAX])
def test_wall_margin(slot: str, room: RoomDims) -> None:
    fp = FP_SMALL
    t = resolve_slot(slot, room, fp)
    x, _, z = t.position

    if slot.startswith("north_wall"):
        # back face = z - fp.d/2; wall face = -length/2
        gap = abs(z - fp.d / 2 - (-room.length_m / 2))
        assert gap <= 0.07 + 1e-6, f"north_wall gap {gap:.4f}"

    elif slot.startswith("south_wall"):
        gap = abs(room.length_m / 2 - (z + fp.d / 2))
        assert gap <= 0.07 + 1e-6, f"south_wall gap {gap:.4f}"

    elif slot.startswith("east_wall"):
        gap = abs(room.width_m / 2 - (x + fp.d / 2))
        assert gap <= 0.07 + 1e-6, f"east_wall gap {gap:.4f}"

    elif slot.startswith("west_wall"):
        gap = abs(x - fp.d / 2 - (-room.width_m / 2))
        assert gap <= 0.07 + 1e-6, f"west_wall gap {gap:.4f}"


# ── Wall inward-facing rotations ──────────────────────────────────────────────


@pytest.mark.parametrize(
    "slot,expected_rot",
    [
        ("north_wall_center", 0.0),
        ("north_wall_left", 0.0),
        ("north_wall_right", 0.0),
        ("south_wall_center", math.pi),
        ("south_wall_left", math.pi),
        ("east_wall_center", -math.pi / 2),
        ("west_wall_center", math.pi / 2),
    ],
)
def test_wall_default_rotation(slot: str, expected_rot: float) -> None:
    t = resolve_slot(slot, ROOM_STD, FP_SMALL)
    assert pytest.approx(t.rotation_y, abs=1e-9) == expected_rot


# ── Corner bisector rotations ─────────────────────────────────────────────────


@pytest.mark.parametrize(
    "slot,expected_rot",
    [
        ("corner_NE", -math.pi / 4),
        ("corner_NW", math.pi / 4),
        ("corner_SE", -3 * math.pi / 4),
        ("corner_SW", 3 * math.pi / 4),
    ],
)
def test_corner_rotation(slot: str, expected_rot: float) -> None:
    t = resolve_slot(slot, ROOM_STD, FP_CORNER)
    assert pytest.approx(t.rotation_y, abs=1e-9) == expected_rot


# ── Corner margin: back faces ≤ 0.05 m from both walls ───────────────────────


@pytest.mark.parametrize("slot", CORNER_SLOTS)
def test_corner_margin(slot: str) -> None:
    fp = FP_CORNER
    room = ROOM_STD
    t = resolve_slot(slot, room, fp)
    x, _, z = t.position

    if "NE" in slot or "SE" in slot:
        gap_x = room.width_m / 2 - (x + fp.w / 2)
        assert gap_x <= 0.05 + 1e-6, f"{slot} east margin {gap_x:.4f}"
    if "NW" in slot or "SW" in slot:
        gap_x = (-room.width_m / 2) - (x - fp.w / 2)
        assert abs(gap_x) <= 0.05 + 1e-6, f"{slot} west margin {abs(gap_x):.4f}"
    if "N" in slot:
        gap_z = abs(z - fp.d / 2 - (-room.length_m / 2))
        assert gap_z <= 0.05 + 1e-6, f"{slot} north margin {gap_z:.4f}"
    if "S" in slot:
        gap_z = room.length_m / 2 - (z + fp.d / 2)
        assert gap_z <= 0.05 + 1e-6, f"{slot} south margin {gap_z:.4f}"


# ── Floor slots ───────────────────────────────────────────────────────────────


def test_center_at_origin() -> None:
    t = resolve_slot("center", ROOM_STD, FP_SMALL)
    x, _, z = t.position
    assert pytest.approx(x, abs=1e-9) == 0.0
    assert pytest.approx(z, abs=1e-9) == 0.0


def test_center_front_positive_z() -> None:
    t = resolve_slot("center_front", ROOM_STD, FP_SMALL)
    assert t.position[2] > 0


def test_entry_further_than_center_front() -> None:
    t_cf = resolve_slot("center_front", ROOM_STD, FP_SMALL)
    t_e = resolve_slot("entry", ROOM_STD, FP_SMALL)
    assert t_e.position[2] > t_cf.position[2]


# ── t-parameter directionality ────────────────────────────────────────────────


def test_north_wall_left_right_x_direction() -> None:
    t_left = resolve_slot("north_wall_left", ROOM_MAX, FP_SMALL)
    t_right = resolve_slot("north_wall_right", ROOM_MAX, FP_SMALL)
    assert t_left.position[0] < 0
    assert t_right.position[0] > 0


def test_east_wall_left_right_z_direction() -> None:
    t_left = resolve_slot("east_wall_left", ROOM_MAX, FP_SMALL)
    t_right = resolve_slot("east_wall_right", ROOM_MAX, FP_SMALL)
    assert t_left.position[2] < 0
    assert t_right.position[2] > 0


# ── Facing overrides ──────────────────────────────────────────────────────────


@pytest.mark.parametrize("facing,expected_rot", list(FACING_ROTATIONS.items()))
def test_facing_override_cardinal(facing: str, expected_rot: float) -> None:
    t = resolve_slot("center", ROOM_STD, FP_SMALL, facing=facing)
    assert pytest.approx(t.rotation_y, abs=1e-9) == expected_rot


def test_facing_center_points_toward_origin() -> None:
    # Item at north_wall_center faces +Z by default (auto). With facing=center,
    # should still point toward room center (origin), which from a north wall position
    # is also roughly +Z. Use a corner item at NE to get a meaningful non-trivial angle.
    t = resolve_slot("corner_NE", ROOM_STD, FP_CORNER, facing="center")
    x, _, z = t.position
    expected = math.atan2(-x, -z)
    assert pytest.approx(t.rotation_y, abs=1e-6) == expected


# ── t_override ────────────────────────────────────────────────────────────────


def test_t_override_shifts_position() -> None:
    t_normal = resolve_slot("north_wall_left", ROOM_STD, FP_SMALL)
    t_nudge = resolve_slot("north_wall_left", ROOM_STD, FP_SMALL, t_override=0.15)
    # t=0.15 → x = (0.15-0.5)*w = -0.35*w; t=0.2 → x = (0.2-0.5)*w = -0.3*w
    # t=0.15 is further from center (more negative) than t=0.2
    assert t_nudge.position[0] < t_normal.position[0]


# ── Large footprint in min room (no crash, just may clip) ────────────────────


@pytest.mark.parametrize("slot", WALL_SLOTS)
def test_large_footprint_min_room_no_exception(slot: str) -> None:
    resolve_slot(slot, ROOM_MIN, FP_SOFA)  # must not raise


# ── Return type ───────────────────────────────────────────────────────────────


def test_returns_transform() -> None:
    t = resolve_slot("center", ROOM_STD, FP_SMALL)
    assert isinstance(t, Transform)
    assert len(t.position) == 3
    assert isinstance(t.rotation_y, float)
