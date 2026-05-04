import math

from app.models.catalog import CatalogItem
from app.models.layout import (
    GenerateLayoutRequest,
    Layout,
    LayoutItemLLM,
    MergedLayoutLLM,
    ResolvedItem,
)
from app.models.room_type import RoomTypeProfile
from app.models.style_profile import StyleProfile
from app.services.slot_resolver import Footprint, RoomDims, resolve_slot

DROP_PRIORITY: dict[str, int] = {
    # Living
    "plant_large": 1,
    "side_table": 2,
    "floor_lamp": 3,
    "bookshelf": 4,
    "armchair": 5,
    "coffee_table": 6,
    "tv_stand": 7,
    "sofa_3seat": 8,
    "loveseat": 8,
    "sectional_sofa": 9,
    "rug": 10,
    # Bedroom
    "bedside_lamp": 1,
    "accent_chair": 2,
    "nightstand": 5,
    "dresser": 6,
    "wardrobe": 7,
    "bed_queen": 10,
    "bed_double": 10,
    "bed_single": 10,
    # Dining
    "dining_chair": 5,
    "sideboard": 6,
    "dining_table_4": 10,
    "dining_table_6": 10,
    # Office
    "desk_lamp": 1,
    "office_chair": 6,
    "desk": 10,
    "desk_compact": 10,
    "filing_cabinet": 5,
    "ottoman": 5,
    "china_cabinet": 6,
    "console_table": 4,
    # Misc
    "corner_shelf": 2,
    "mirror_wall": 1,
}

# Items that can share a slot/space without being dropped
COOCCUPY_ALLOW_TAGS: set[str] = {"lighting", "accent", "plant", "rug", "shelf", "media"}

COOCCUPY_ALLOW: set[frozenset[str]] = {
    frozenset({"rug", "coffee_table"}),
    frozenset({"rug", "dining_table_4"}),
    frozenset({"rug", "dining_table_6"}),
    frozenset({"bed_double", "nightstand"}),
    frozenset({"bed_queen", "nightstand"}),
    frozenset({"bed_single", "nightstand"}),
    frozenset({"bed_double", "ottoman"}),
    frozenset({"bed_queen", "ottoman"}),
    frozenset({"bed_single", "ottoman"}),
    frozenset({"rug", "sofa_3seat"}),
    frozenset({"rug", "loveseat"}),
    frozenset({"rug", "sectional_sofa"}),
    frozenset({"rug", "bed_double"}),
    frozenset({"rug", "bed_queen"}),
    frozenset({"rug", "bed_single"}),
    frozenset({"desk", "office_chair"}),
    frozenset({"desk", "chair"}),
    frozenset({"desk", "seating"}),
    frozenset({"desk", "lighting"}),
    frozenset({"desk", "accent"}),
    frozenset({"desk", "media"}),
    frozenset({"surface", "accent"}),
    frozenset({"surface", "media"}),
    frozenset({"media", "media"}),
    frozenset({"media", "storage"}),
    frozenset({"lighting", "storage"}),
    frozenset({"dining", "chair"}),
}

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
        "floor": [
            "center",
            "center_front",
            "entry",
            "bed_center",
            "table_center",
            "desk_anchor",
        ],
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


def _aabb_overlap(
    a: ResolvedItem, 
    b: ResolvedItem, 
    a_cat: CatalogItem, 
    b_cat: CatalogItem,
    margin: float = 0.05
) -> bool:
    ahx, ahz = _half_extents(a)
    bhx, bhz = _half_extents(b)
    ax, _, az = a.position
    bx, _, bz = b.position

    # 1. Base buffer: prevent items from being within 10cm of each other
    # For large items or seating, increase to 40cm to allow for "walking space"
    dynamic_margin = 0.1
    if ("large" in a_cat.tags or "seating" in a_cat.tags) and \
       ("large" in b_cat.tags or "seating" in b_cat.tags):
        dynamic_margin = 0.4
    
    # 2. Specific Sofa-Table separation
    # If one is seating and other is surface (table), ensure they aren't touching
    if ("seating" in a_cat.tags and "surface" in b_cat.tags) or \
       ("surface" in a_cat.tags and "seating" in b_cat.tags):
        dynamic_margin = 0.35

    overlap_x = abs(ax - bx) < (ahx + bhx + dynamic_margin)
    overlap_z = abs(az - bz) < (ahz + bhz + dynamic_margin)
    
    return overlap_x and overlap_z


def _wall_prefix(slot: str) -> str | None:
    """Return 'north_wall', 'south_wall', etc. or None if not a wall slot."""
    for wall in ("north_wall", "south_wall", "east_wall", "west_wall"):
        if slot.startswith(wall + "_"):
            return wall
    return None


def _apply_vertical_stack(
    candidate: ResolvedItem,
    placed: list[ResolvedItem],
    catalog_item: CatalogItem,
    catalog_map: dict[str, CatalogItem],
) -> None:
    """Apply vertical offset if the candidate should sit on top of an existing item."""
    # But DO NOT stack rugs or floor lamps on tables.
    c_tags = set(catalog_item.tags)
    if "rug" in c_tags or "floor_lamp" in c_tags:
        return

    for existing in placed:
        if existing.slot == candidate.slot:
            existing_item = catalog_map.get(existing.catalogId)
            if existing_item:
                e_tags = set(existing_item.tags)
                # Elevate if the existing item is a surface/desk/stand
                if any(t in e_tags for t in ("desk", "surface", "media", "storage")):
                    new_pos = (candidate.position[0], existing_item.footprint.h, candidate.position[2])
                    candidate.position = new_pos
                    break


def _try_place(
    item: LayoutItemLLM,
    slot: str,
    t_override: float | None,
    room: RoomDims,
    catalog_item: CatalogItem,
    placed: list[ResolvedItem],
    catalog_map: dict[str, CatalogItem],
    margin: float,
) -> ResolvedItem | None:
    """Attempt to resolve slot and check AABB. Returns ResolvedItem or None on collision."""
    fp = Footprint(
        w=catalog_item.footprint.w,
        d=catalog_item.footprint.d,
        h=catalog_item.footprint.h,
        tags=catalog_item.tags,
    )
    transform = resolve_slot(slot, room, fp, item.facing, t_override)
    candidate = ResolvedItem(
        catalogId=item.catalogId,
        slot=item.slot,  # keep original slot name in response
        facing=item.facing,
        zone=item.zone,
        rationale=item.rationale,
        position=transform.position,
        rotation_y=transform.rotation_y,
        footprint={"w": fp.w, "d": fp.d, "h": fp.h},
        model=catalog_item.model,
    )
    # 1. Room boundary check — ensure item fits inside walls
    hx, hz = _half_extents(candidate)
    cx, _, cz = candidate.position
    # Allow 1cm tolerance for rounding
    if (abs(cx) + hx > room.width_m / 2 + 0.01) or (abs(cz) + hz > room.length_m / 2 + 0.01):
        return "OUT_OF_BOUNDS"

    for existing in placed:
        existing_item = catalog_map.get(existing.catalogId)
        if not existing_item:
            continue

        # 2. Exact same item in same slot — drop as redundant
        if candidate.catalogId == existing.catalogId and candidate.slot == existing.slot:
            return "DUPLICATE_ITEM"

        # 2b. Redundant twins in same zone (e.g. two floor lamps)
        # Allow multiples for chairs, stools, decor, and small items
        if candidate.catalogId == existing.catalogId and candidate.zone == existing.zone:
            c_tags = set(catalog_item.tags)
            allow_tags = {"chair", "stool", "lighting", "plant", "accent", "surface"}
            is_allowed = bool(c_tags & allow_tags)
            # Also allow non-large seating (like armchairs)
            if "seating" in c_tags and "large" not in c_tags:
                is_allowed = True
            
            if not is_allowed:
                return "REDUNDANT_ZONE_ITEM"

        # 3. Hero item exclusivity (e.g., only one bed per layout)
        hero_tags = {"bed", "seating", "dining"}
        c_hero = set(catalog_item.tags) & hero_tags
        e_hero = set(existing_item.tags) & hero_tags
        if c_hero and e_hero and c_hero == e_hero:
            # For seating, only enforce exclusivity on LARGE items (sofas)
            if "seating" in c_hero:
                if "large" in catalog_item.tags and "large" in existing_item.tags:
                    return "HERO_COLLISION"
            else:
                if "chair" not in catalog_item.tags and "chair" not in existing_item.tags:
                    return "HERO_COLLISION"

        # 4. Hardcoded co-occupancy rules (Tag based)
        can_ignore = False
        c_tags = set(catalog_item.tags)
        e_tags = set(existing_item.tags)
        for allowed in COOCCUPY_ALLOW:
            allowed_list = list(allowed)
            if len(allowed_list) == 2:
                t1, t2 = allowed_list
                if (t1 in c_tags and t2 in e_tags) or (t2 in c_tags and t1 in e_tags):
                    can_ignore = True
                    break
        if can_ignore:
            continue

        # 5. Tag-based co-occupancy
        if (c_tags & COOCCUPY_ALLOW_TAGS) or (e_tags & COOCCUPY_ALLOW_TAGS):
            continue

        if _aabb_overlap(candidate, existing, catalog_item, existing_item, margin=margin):
            return "AABB_COLLISION"
            
    return candidate


_MSGS = {
    "en": {
        "unknown_id": "Unknown catalogId: {id!r} — dropped",
        "slot_invalid": "Slot {slot!r} not in room type {type!r} — dropped",
        "item_not_allowed": "Item {id!r} not allowed in room type {type!r} — dropped",
        "tags_not_accepted": "Item {id!r} tags {tags!r} not accepted by slot {slot!r} — dropped",
        "occupied": "Dropped {id!r}: slot {slot!r} occupied by {other!r}",
        "replaced": "Dropped {other!r}: replaced by higher-priority {id!r} in slot {slot!r}",
        "collision": "Dropped {id!r}: {reason} at {slot!r}",
        "placement_invalid": "Item {id!r} placement in a {kind} slot is not allowed — dropped",
    },
    "es": {
        "unknown_id": "CatalogId desconocido: {id!r} — descartado",
        "slot_invalid": "El espacio {slot!r} no es válido para {type!r} — descartado",
        "item_not_allowed": "El mueble {id!r} no está permitido en {type!r} — descartado",
        "tags_not_accepted": "Las etiquetas de {id!r} ({tags!r}) no son aceptadas por {slot!r} — descartado",
        "occupied": "Descartado {id!r}: el espacio {slot!r} está ocupado por {other!r}",
        "replaced": "Descartado {other!r}: reemplazado por {id!r} (prioridad mayor) en {slot!r}",
        "collision": "Descartado {id!r}: {reason} en {slot!r}",
        "placement_invalid": "El mueble {id!r} no está permitido en un espacio de tipo {kind} — descartado",
    }
}


def resolve(
    llm: MergedLayoutLLM,
    request: GenerateLayoutRequest,
    catalog: list[CatalogItem],
    profile: RoomTypeProfile,
    style_prof: StyleProfile,
) -> Layout:
    lang = request.language if request.language in _MSGS else "en"
    m = _MSGS[lang]

    catalog_map: dict[str, CatalogItem] = {item.id: item for item in catalog}
    warnings: list[str] = []
    valid: list[LayoutItemLLM] = []
    instances = set(profile.slot_instances)

    # Step 1 + 2: catalogId + room-type slot validity + tag intersection
    for item in llm.items:
        if item.catalogId not in catalog_map:
            warnings.append(m["unknown_id"].format(id=item.catalogId))
            continue
        if item.slot not in instances:
            warnings.append(m["slot_invalid"].format(slot=item.slot, type=request.roomType))
            continue
        catalog_item = catalog_map[item.catalogId]
        if request.roomType not in catalog_item.room_types:
            warnings.append(m["item_not_allowed"].format(id=item.catalogId, type=request.roomType))
            continue
        # 2. Check slot kind (wall, corner, floor) vs item placement rules
        slot_kind = SLOT_KINDS.get(item.slot)
        allowed_kinds = catalog_item.placement.surfaces
        if slot_kind not in allowed_kinds:
            warnings.append(m["placement_invalid"].format(id=item.catalogId, kind=slot_kind))
            continue

        # 3. Check tag intersection
        accepted = profile.slot_accepted_tags.get(item.slot, [])
        if not (set(catalog_item.tags) & set(accepted)):
            warnings.append(m["tags_not_accepted"].format(id=item.catalogId, tags=catalog_item.tags, slot=item.slot))
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
    margin = style_prof.wall_flush_tolerance

    for item in valid:
        slot = item.slot
        catalog_item = catalog_map[item.catalogId]

        # Step 4: slot exclusivity
        if slot in occupied:
            existing_id = occupied[slot]
            
            # Check if current item can co-occupy with existing
            can_cooccupy = False
            if item.catalogId == existing_id:
                can_cooccupy = True
            else:
                existing_item = catalog_map.get(existing_id)
                if existing_item:
                    c_tags = set(catalog_item.tags)
                    e_tags = set(existing_item.tags)
                    
                    # 1. Check hardcoded tag pairs in COOCCUPY_ALLOW
                    for allowed in COOCCUPY_ALLOW:
                        if any(t in c_tags for t in allowed) and any(t in e_tags for t in allowed):
                            can_cooccupy = True
                            break
                    
                    # 2. Check general co-occupancy tags
                    if not can_cooccupy:
                        if (c_tags & COOCCUPY_ALLOW_TAGS) or (e_tags & COOCCUPY_ALLOW_TAGS):
                            can_cooccupy = True

            if not can_cooccupy:
                # Try wall nudge before dropping
                prefix = _wall_prefix(slot)
                nudged = False
                if prefix:
                    for t_alt in _NUDGE_T:
                        res = _try_place(item, slot, t_alt, room, catalog_item, placed, catalog_map, margin)
                        if isinstance(res, ResolvedItem):
                            placed.append(res)
                            nudged = True
                            break
                if not nudged:
                    # Drop lower-priority item between new and occupant
                    new_pri = DROP_PRIORITY.get(item.catalogId, 0)
                    occ_pri = DROP_PRIORITY.get(existing_id, 0)
                    if new_pri <= occ_pri:
                        warnings.append(m["occupied"].format(id=item.catalogId, slot=slot, other=existing_id))
                        continue # Skip to next item
                    else:
                        # Remove existing from placed, replace with new
                        placed = [p for p in placed if p.catalogId != existing_id]
                        del occupied[slot]
                        warnings.append(m["replaced"].format(other=existing_id, id=item.catalogId, slot=slot))
                        # Fall through to step 5-6

        # Step 5–6: resolve + AABB check
        result = _try_place(item, slot, None, room, catalog_item, placed, catalog_map, margin)
        if isinstance(result, ResolvedItem):
            _apply_vertical_stack(result, placed, catalog_item, catalog_map)
            placed.append(result)
            occupied[slot] = item.catalogId
        else:
            # Try wall nudge
            prefix = _wall_prefix(slot)
            nudged = False
            if prefix:
                for t_alt in _NUDGE_T:
                    res = _try_place(item, slot, t_alt, room, catalog_item, placed, catalog_map, margin)
                    if isinstance(res, ResolvedItem):
                        _apply_vertical_stack(res, placed, catalog_item, catalog_map)
                        placed.append(res)
                        nudged = True
                        break
            if not nudged:
                reason = result if isinstance(result, str) else "UNKNOWN_COLLISION"
                warnings.append(m["collision"].format(id=item.catalogId, reason=reason, slot=slot))

    return Layout(
        style=llm.style,
        palette=llm.palette,
        zones=list(llm.zones),
        items=placed,
        designExplanation=llm.designExplanation,
        seed=request.seed,
        warnings=warnings,
    )
