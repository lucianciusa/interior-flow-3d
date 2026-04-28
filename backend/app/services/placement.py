import math

from app.models.catalog import CatalogItem
from app.models.layout import GenerateLayoutRequest, Layout, LayoutItemLLM, LayoutLLM, ResolvedItem
from app.services.slot_resolver import Footprint, RoomDims, resolve_slot

DROP_PRIORITY: dict[str, int] = {
    "plant_large": 1,
    "side_table": 2,
    "floor_lamp": 3,
    "bookshelf": 4,
    "armchair": 5,
    "coffee_table": 6,
    "tv_stand": 7,
    "sofa_3seat": 8,
    "rug": 9,
}

COOCCUPY_ALLOW: set[frozenset[str]] = {frozenset({"rug", "coffee_table"})}

SLOT_KINDS: dict[str, str] = {
    slot: kind
    for kind, slots in {
        "wall": [
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
        ],
        "corner": ["corner_NE", "corner_NW", "corner_SE", "corner_SW"],
        "floor": ["center", "center_front", "entry"],
    }.items()
    for slot in slots
}

# t values to try when nudging a conflicting wall item
_NUDGE_T = [0.15, 0.85]

# Prefix → wall axis for building a nudged slot name
_WALL_SUFFIX_FOR_T: dict[float, str] = {0.15: "left", 0.5: "center", 0.85: "right"}


def _half_extents(item: ResolvedItem) -> tuple[float, float]:
    """Return (half_x, half_z) of the item's world AABB footprint."""
    fw = item.footprint["w"]
    fd = item.footprint["d"]
    rot = item.rotation_y
    cos_abs = abs(math.cos(rot))
    if cos_abs > 0.707:  # 0° or 180° — axis-aligned
        return fw / 2, fd / 2
    if cos_abs < 0.293:  # ±90° — quarter-turn
        return fd / 2, fw / 2
    # ~45° corner items — conservative enclosing square
    r = math.sqrt((fw / 2) ** 2 + (fd / 2) ** 2)
    return r, r


def _aabb_overlap(a: ResolvedItem, b: ResolvedItem, margin: float = 0.05) -> bool:
    ahx, ahz = _half_extents(a)
    bhx, bhz = _half_extents(b)
    ax, _, az = a.position
    bx, _, bz = b.position
    return abs(ax - bx) < (ahx + bhx + margin) and abs(az - bz) < (ahz + bhz + margin)


def _wall_prefix(slot: str) -> str | None:
    """Return 'north_wall', 'south_wall', etc. or None if not a wall slot."""
    for wall in ("north_wall", "south_wall", "east_wall", "west_wall"):
        if slot.startswith(wall + "_"):
            return wall
    return None


def _try_place(
    item: LayoutItemLLM,
    slot: str,
    t_override: float | None,
    room: RoomDims,
    catalog_item: CatalogItem,
    placed: list[ResolvedItem],
) -> ResolvedItem | None:
    """Attempt to resolve slot and check AABB. Returns ResolvedItem or None on collision."""
    fp = Footprint(
        w=catalog_item.footprint.w,
        d=catalog_item.footprint.d,
        h=catalog_item.footprint.h,
    )
    transform = resolve_slot(slot, room, fp, item.facing, t_override)
    candidate = ResolvedItem(
        catalogId=item.catalogId,
        slot=item.slot,  # keep original slot name in response
        facing=item.facing,
        rationale=item.rationale,
        position=transform.position,
        rotation_y=transform.rotation_y,
        footprint={"w": fp.w, "d": fp.d, "h": fp.h},
        model=catalog_item.model,
    )
    for existing in placed:
        pair = frozenset({candidate.catalogId, existing.catalogId})
        if pair in COOCCUPY_ALLOW and candidate.slot == existing.slot:
            continue
        if _aabb_overlap(candidate, existing):
            return None
    return candidate


def resolve(
    llm: LayoutLLM,
    request: GenerateLayoutRequest,
    catalog: list[CatalogItem],
) -> Layout:
    catalog_map: dict[str, CatalogItem] = {item.id: item for item in catalog}
    warnings: list[str] = []
    valid: list[LayoutItemLLM] = []

    # Step 1 + 2: catalogId lookup + allowedSlotKinds check
    for item in llm.items:
        if item.catalogId not in catalog_map:
            warnings.append(f"Unknown catalogId: {item.catalogId!r} — dropped")
            continue
        slot_kind = SLOT_KINDS.get(item.slot, "")
        allowed = catalog_map[item.catalogId].allowedSlotKinds
        if slot_kind not in allowed:
            warnings.append(
                f"Slot {item.slot!r} not allowed for {item.catalogId!r} "
                f"(allowed: {allowed}) — dropped"
            )
            continue
        valid.append(item)

    # Step 3: sort by priority descending (highest first)
    valid.sort(key=lambda i: DROP_PRIORITY.get(i.catalogId, 0), reverse=True)

    room = RoomDims(
        width_m=request.width_m,
        length_m=request.length_m,
        height_m=request.height_m,
    )
    placed: list[ResolvedItem] = []
    occupied: dict[str, str] = {}  # slot → catalogId

    for item in valid:
        slot = item.slot
        catalog_item = catalog_map[item.catalogId]

        # Step 4: slot exclusivity
        if slot in occupied:
            existing_id = occupied[slot]
            pair = frozenset({item.catalogId, existing_id})
            if pair not in COOCCUPY_ALLOW:
                # Try wall nudge before dropping
                prefix = _wall_prefix(slot)
                nudged = False
                if prefix:
                    for t_alt in _NUDGE_T:
                        result = _try_place(item, slot, t_alt, room, catalog_item, placed)
                        if result is not None:
                            placed.append(result)
                            # Don't mark occupied with original slot (it's a nudge)
                            nudged = True
                            break
                if not nudged:
                    # Drop lower-priority item between new and occupant
                    new_pri = DROP_PRIORITY.get(item.catalogId, 0)
                    occ_pri = DROP_PRIORITY.get(existing_id, 0)
                    if new_pri <= occ_pri:
                        warnings.append(
                            f"Dropped {item.catalogId!r}: slot {slot!r} occupied by {existing_id!r}"
                        )
                    else:
                        # Remove existing from placed, replace with new
                        placed = [p for p in placed if p.catalogId != existing_id]
                        del occupied[slot]
                        warnings.append(
                            f"Dropped {existing_id!r}: replaced by higher-priority "
                            f"{item.catalogId!r} in slot {slot!r}"
                        )
                        result = _try_place(item, slot, None, room, catalog_item, placed)
                        if result is not None:
                            placed.append(result)
                            occupied[slot] = item.catalogId
                        else:
                            warnings.append(
                                f"Dropped {item.catalogId!r}: AABB collision after "
                                f"displacing {existing_id!r}"
                            )
                continue

        # Step 5–6: resolve + AABB check
        result = _try_place(item, slot, None, room, catalog_item, placed)
        if result is not None:
            placed.append(result)
            occupied[slot] = item.catalogId
        else:
            # Try wall nudge
            prefix = _wall_prefix(slot)
            nudged = False
            if prefix:
                for t_alt in _NUDGE_T:
                    result = _try_place(item, slot, t_alt, room, catalog_item, placed)
                    if result is not None:
                        placed.append(result)
                        nudged = True
                        break
            if not nudged:
                warnings.append(f"Dropped {item.catalogId!r}: AABB collision at {slot!r}")

    return Layout(
        style=llm.style,
        palette=llm.palette,
        items=placed,
        designExplanation=llm.designExplanation,
        seed=request.seed,
        warnings=warnings,
    )
