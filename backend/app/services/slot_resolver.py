import math
from dataclasses import dataclass, field

FACING_ROTATIONS: dict[str, float] = {
    "south": 0.0,
    "north": math.pi,
    "east": math.pi / 2,
    "west": -math.pi / 2,
}

_T_SUFFIX: dict[str, float] = {
    "left": 0.2,
    "center": 0.5,
    "right": 0.8,
}


@dataclass(frozen=True)
class RoomDims:
    width_m: float
    length_m: float
    height_m: float


@dataclass(frozen=True)
class Footprint:
    w: float
    d: float
    h: float
    tags: list[str] = field(default_factory=list)
    surfaces: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class Transform:
    position: tuple[float, float, float]
    rotation_y: float


def _t_from_suffix(slot: str) -> float:
    for suffix, t in _T_SUFFIX.items():
        if slot.endswith(f"_{suffix}"):
            return t
    raise ValueError(f"No left/center/right suffix in slot: {slot!r}")


def _slot_position(
    slot: str,
    room: RoomDims,
    fp: Footprint,
    t_override: float | None,
) -> tuple[tuple[float, float, float], float]:
    """Return (position_xyz, default_rotation_y) for a slot."""
    room_w, room_l = room.width_m, room.length_m
    y = fp.h / 2

    # ── Wall slots ───────────────────────────────────────────────────────────
    if slot.startswith("north_wall_"):
        t = t_override if t_override is not None else _t_from_suffix(slot)
        x = (t - 0.5) * room_w
        z = -(room_l / 2 - fp.d / 2 - 0.02)
        return (x, y, z), 0.0

    if slot.startswith("south_wall_"):
        t = t_override if t_override is not None else _t_from_suffix(slot)
        x = (t - 0.5) * room_w
        z = room_l / 2 - fp.d / 2 - 0.02
        return (x, y, z), math.pi

    if slot.startswith("east_wall_"):
        t = t_override if t_override is not None else _t_from_suffix(slot)
        x = room_w / 2 - fp.d / 2 - 0.02
        z = (t - 0.5) * room_l
        return (x, y, z), -math.pi / 2

    if slot.startswith("west_wall_"):
        t = t_override if t_override is not None else _t_from_suffix(slot)
        x = -(room_w / 2 - fp.d / 2 - 0.02)
        z = (t - 0.5) * room_l
        return (x, y, z), math.pi / 2

    # ── Corner slots ─────────────────────────────────────────────────────────
    if slot == "corner_NE":
        x = room_w / 2 - fp.w / 2 - 0.02
        z = -(room_l / 2 - fp.d / 2 - 0.02)
        return (x, y, z), -math.pi / 4

    if slot == "corner_NW":
        x = -(room_w / 2 - fp.w / 2 - 0.02)
        z = -(room_l / 2 - fp.d / 2 - 0.02)
        return (x, y, z), math.pi / 4

    if slot == "corner_SE":
        x = room_w / 2 - fp.w / 2 - 0.02
        z = room_l / 2 - fp.d / 2 - 0.02
        return (x, y, z), -3 * math.pi / 4

    if slot == "corner_SW":
        x = -(room_w / 2 - fp.w / 2 - 0.02)
        z = room_l / 2 - fp.d / 2 - 0.02
        return (x, y, z), 3 * math.pi / 4

    # ── Floor slots ──────────────────────────────────────────────────────────
    if slot == "center":
        return (0.0, y, 0.0), 0.0

    if slot == "center_front":
        # Target ~1.1m from center for typical sofa clearance (0.5m half-depth + 0.6m gap)
        # Scale slightly with room size but keep it anchored to the center seating
        z = max(0.9, min(1.2, room_l * 0.25))
        return (0.0, y, z), 0.0

    if slot == "entry":
        return (0.0, y, room_l * 0.4), math.pi

    if slot == "bed_center":
        # Headboard against north wall, bed extends into room
        return (0.0, y, -(room_l / 2 - fp.d / 2 - 0.02)), math.pi

    if slot == "table_center":
        return (0.0, y, 0.0), 0.0

    if slot == "desk_anchor":
        # If it's a chair, redirect to desk_chair for the user's sanity
        if "chair" in fp.tags or "seating" in fp.tags:
            x = room_w / 6
            z = -(room_l / 2 - 0.7)
            return (x, y, z), math.pi

        # Against north wall, offset toward east third
        x = room_w / 6
        z = -(room_l / 2 - fp.d / 2 - 0.02)
        return (x, y, z), 0.0

    if slot == "desk_chair":
        # In front of the desk_anchor
        x = room_w / 6
        # Offset from north wall: desk depth (approx 0.7) + chair space (approx 0.4 
        # center-to-center). 1.1m ensures no collision with a 0.7m deep desk 
        # and 0.65m deep chair.
        z = -(room_l / 2 - 1.1)
        return (x, y, z), math.pi

    raise ValueError(f"Unknown slot: {slot!r}")


def _apply_facing(
    facing: str,
    pos: tuple[float, float, float],
    default_rot: float,
) -> float:
    if facing == "auto":
        return default_rot
    if facing in FACING_ROTATIONS:
        return FACING_ROTATIONS[facing]
    if facing == "center":
        px, _, pz = pos
        return math.atan2(-px, -pz)
    return default_rot


def resolve_slot(
    slot: str,
    room: RoomDims,
    fp: Footprint,
    facing: str = "auto",
    t_override: float | None = None,
) -> Transform:
    """Resolve a named slot to a 3D transform.

    Coordinate convention: +X east, +Z south, +Y up. Room centered at origin.
    rotation_y=0 means model faces +Z direction.
    """
    pos, default_rot = _slot_position(slot, room, fp, t_override)
    rot = _apply_facing(facing, pos, default_rot)
    return Transform(position=pos, rotation_y=rot)
