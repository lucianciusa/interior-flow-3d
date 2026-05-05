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
COOCCUPY_ALLOW_TAGS: set[str] = {"rug"}

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
    frozenset({"desk_compact", "office_chair"}),
    frozenset({"desk_compact", "chair"}),
    frozenset({"desk_compact", "seating"}),
    frozenset({"surface", "accent"}),
    frozenset({"surface", "media"}),
    frozenset({"media"}),
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
            "desk_chair",
            "dining_chair_N",
            "dining_chair_S",
            "dining_chair_E",
            "dining_chair_W",
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
    # ~45° corner items — use a slightly tighter fit than the full enclosing square
    # as most furniture isn't a perfect cylinder. 0.85 factor is a good heuristic.
    r = math.sqrt((fw / 2) ** 2 + (fd / 2) ** 2)
    return r * 0.85, r * 0.85


def _aabb_overlap(
    a: ResolvedItem,
    b: ResolvedItem,
    a_cat: CatalogItem,
    b_cat: CatalogItem,
    margin: float = 0.05,
    cooccupy_mode: bool = False,
) -> bool:
    """Check if two items' AABBs overlap.

    cooccupy_mode=True: strict physical overlap only (no dynamic buffer).
    Used for co-occupancy pairs like desk+chair that are intentionally adjacent.
    """
    # Rugs are flat on the floor; everything sits on top of them — no collision with non-rugs.
    # However, we allow collision detection between two rugs to handle stacking/layering.
    is_a_rug = "rug" in a_cat.tags
    is_b_rug = "rug" in b_cat.tags
    if (is_a_rug and not is_b_rug) or (is_b_rug and not is_a_rug):
        return False

    ahx, ahz = _half_extents(a)
    bhx, bhz = _half_extents(b)
    ax, ay, az = a.position
    bx, by, bz = b.position

    if cooccupy_mode:
        # Strict physical overlap only — no buffer. Allow intentional proximity.
        effective_margin = -0.02  # allow up to 2cm of physical tuck-in
    else:
        # 1. Base buffer: prevent items from being within 10cm of each other
        # For large items or seating, increase to 40cm to allow for "walking space"
        effective_margin = 0.1
        if ("large" in a_cat.tags or "seating" in a_cat.tags) and (
            "large" in b_cat.tags or "seating" in b_cat.tags
        ):
            effective_margin = 0.4

        # 2. Specific Sofa-Table separation
        # If one is seating and other is surface (table), ensure they aren't touching
        # This applies only when NOT in co-occupancy mode (e.g. Sofa vs Coffee Table)
        if ("seating" in a_cat.tags and "surface" in b_cat.tags) or (
            "surface" in a_cat.tags and "seating" in b_cat.tags
        ):
            effective_margin = 0.35

    overlap_x = abs(ax - bx) < (ahx + bhx + effective_margin)
    overlap_z = abs(az - bz) < (ahz + bhz + effective_margin)

    # 3. Y overlap: only if they are actually overlapping in vertical space.
    # We use a small epsilon to allow items to sit exactly on top of each other.
    ahy = a.footprint["h"] / 2
    bhy = b.footprint["h"] / 2
    overlap_y = abs(ay - by) < (ahy + bhy - 0.01)

    return overlap_x and overlap_z and overlap_y


def _wall_prefix(slot: str) -> str | None:
    """Return 'north_wall', 'south_wall', etc. or None if not a wall slot."""
    for wall in ("north_wall", "south_wall", "east_wall", "west_wall"):
        if slot.startswith(wall + "_"):
            return wall
    return None


# Catalog IDs that should always be placed ON TOP of a nearby surface.
# These are small decorative / desktop items that make no sense on the floor.
_DESKTOP_ITEMS: set[str] = {
    "desk_lamp",
    "bedside_lamp",
    "lamp_square_table",
    "laptop",
    "monitor",
    "computerKeyboard",
    "computerMouse",
    "radio",
    "speaker",
    "speakerSmall",
    "toaster",
    "kitchenBlender",
    "kitchenCoffeeMachine",
    "kitchenMicrowave",
    "small_plant",
    "plant_small_2",
    "plant_small_3",
    "books_decor",
    "tv_modern",
    "televisionVintage",
    "televisionAntenna",
    "bear_toy",
}

# Tags on the *existing* item that make it a valid surface to stack onto.
_STACKABLE_SURFACE_TAGS = {"desk", "surface", "nightstand", "storage"}


def _apply_vertical_stack(
    candidate: ResolvedItem,
    placed: list[ResolvedItem],
    catalog_item: CatalogItem,
    catalog_map: dict[str, CatalogItem],
    room_type: str = "living_room",
) -> bool:
    """Elevate desktop items so they sit on top of a nearby surface.

    Only items in _DESKTOP_ITEMS are elevated. First checks same-slot items,
    then searches all placed surfaces for the closest one in XZ.

    In home_office, plants are NOT allowed on desks.

    Returns True if the item was successfully stacked or didn't need stacking.
    Returns False if the item is a 'desktop item' but no valid surface was found.
    """
    if candidate.catalogId not in _DESKTOP_ITEMS:
        return True

    cx, _, cz = candidate.position
    is_plant = "plant" in catalog_item.tags or candidate.catalogId in {
        "small_plant", "plant_small_2", "plant_small_3", "plant_large",
    }

    # 1. Try same-slot surface first (most common case: desk_lamp on desk_anchor)
    for existing in placed:
        if existing.slot == candidate.slot:
            existing_item = catalog_map.get(existing.catalogId)
            if existing_item and set(existing_item.tags) & _STACKABLE_SURFACE_TAGS:
                # In office, don't put plants on desks
                if room_type == "home_office" and is_plant and "desk" in existing_item.tags:
                    continue

                candidate.position = (cx, existing.position[1] + existing_item.footprint.h, cz)
                return True

    # 2. Fallback: find the closest placed surface within 1.5m in XZ
    best_dist = 1.5
    best_surface: tuple[ResolvedItem, CatalogItem] | None = None
    for existing in placed:
        existing_item = catalog_map.get(existing.catalogId)
        if not existing_item:
            continue
        if not (set(existing_item.tags) & _STACKABLE_SURFACE_TAGS):
            continue

        # In office, don't put plants on desks
        if room_type == "home_office" and is_plant and "desk" in existing_item.tags:
            continue

        ex, _, ez = existing.position
        dist = math.sqrt((cx - ex) ** 2 + (cz - ez) ** 2)
        if dist < best_dist:
            best_dist = dist
            best_surface = (existing, existing_item)

    if best_surface:
        surf, surf_cat = best_surface
        # Move candidate on top of the surface, centered on it
        candidate.position = (
            surf.position[0],
            surf.position[1] + surf_cat.footprint.h,
            surf.position[2],
        )
        return True

    # If it's a desktop item but we found no surface to put it on, return False
    return False


def _try_place(
    item: LayoutItemLLM,
    slot: str,
    t_override: float | None,
    room: RoomDims,
    catalog_item: CatalogItem,
    placed: list[ResolvedItem],
    catalog_map: dict[str, CatalogItem],
    margin: float,
) -> ResolvedItem | str:
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

        # 2b. Redundant twins (same exact item)
        # The user wants NO duplicates of the same furniture in the same space.
        # We allow multiples ONLY for small items, chairs, and decor.
        if candidate.catalogId == existing.catalogId:
            c_tags = set(catalog_item.tags)
            # Narrowed down list of items that CAN be duplicated (e.g. set of 6 identical chairs)
            allow_tags = {"chair", "stool", "lighting", "plant", "accent", "decor", "media"}
            is_allowed = bool(c_tags & allow_tags)

            # Non-large seating (like armchairs) can be pairs
            if "seating" in c_tags and "large" not in c_tags:
                is_allowed = True

            if not is_allowed:
                return "DUPLICATE_CATALOG_ITEM"

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
        can_cooccupy = False
        c_tags = set(catalog_item.tags)
        e_tags = set(existing_item.tags)
        for allowed in COOCCUPY_ALLOW:
            allowed_list = list(allowed)
            if len(allowed_list) == 2:
                t1, t2 = allowed_list
                if (t1 in c_tags and t2 in e_tags) or (t2 in c_tags and t1 in e_tags):
                    can_cooccupy = True
                    break

        # 5. Tag-based co-occupancy (rugs)
        if not can_cooccupy and ((c_tags & COOCCUPY_ALLOW_TAGS) or (e_tags & COOCCUPY_ALLOW_TAGS)):
            can_cooccupy = True

        # Desktop items that will be stacked can skip AABB entirely
        if can_cooccupy and candidate.catalogId in _DESKTOP_ITEMS:
            continue

        # For non-stacking co-occupants, still check AABB to prevent overlap
        if not can_cooccupy:
            if _aabb_overlap(candidate, existing, catalog_item, existing_item, margin=margin):
                return "AABB_COLLISION"
        else:
            # Co-occupancy allowed but not a desktop item:
            # use strict physical-only overlap (no buffer) so desk+chair and
            # similar intentional pairings are never incorrectly rejected.
            if _aabb_overlap(candidate, existing, catalog_item, existing_item, cooccupy_mode=True):
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
        "tags_not_accepted": (
            "Las etiquetas de {id!r} ({tags!r}) no son aceptadas por {slot!r} — descartado"
        ),
        "occupied": "Descartado {id!r}: el espacio {slot!r} está ocupado por {other!r}",
        "replaced": ("Descartado {other!r}: reemplazado por {id!r} (prioridad mayor) en {slot!r}"),
        "collision": "Descartado {id!r}: {reason} en {slot!r}",
        "placement_invalid": (
            "El mueble {id!r} no está permitido en un espacio de tipo {kind} — descartado"
        ),
    },
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
            warnings.append(
                m["tags_not_accepted"].format(
                    id=item.catalogId, tags=catalog_item.tags, slot=item.slot
                )
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
                    if not can_cooccupy and (
                        (c_tags & COOCCUPY_ALLOW_TAGS) or (e_tags & COOCCUPY_ALLOW_TAGS)
                    ):
                        can_cooccupy = True

            if not can_cooccupy:
                # Try wall nudge before dropping
                prefix = _wall_prefix(slot)
                nudged = False
                if prefix:
                    for t_alt in _NUDGE_T:
                        res = _try_place(
                            item, slot, t_alt, room, catalog_item, placed, catalog_map, margin
                        )
                        if isinstance(res, ResolvedItem) and _apply_vertical_stack(
                            res, placed, catalog_item, catalog_map, request.roomType
                        ):
                            placed.append(res)
                            nudged = True
                            break
                if not nudged:
                    # Drop lower-priority item between new and occupant
                    new_pri = DROP_PRIORITY.get(item.catalogId, 0)
                    occ_pri = DROP_PRIORITY.get(existing_id, 0)
                    if new_pri <= occ_pri:
                        warnings.append(
                            m["occupied"].format(id=item.catalogId, slot=slot, other=existing_id)
                        )
                        continue  # Skip to next item
                    else:
                        # Remove existing from placed, replace with new
                        placed = [p for p in placed if p.catalogId != existing_id]
                        del occupied[slot]
                        warnings.append(
                            m["replaced"].format(other=existing_id, id=item.catalogId, slot=slot)
                        )
                        # Fall through to step 5-6

        # Step 5–6: resolve + AABB check
        result = _try_place(item, slot, None, room, catalog_item, placed, catalog_map, margin)
        if isinstance(result, ResolvedItem):
            if _apply_vertical_stack(result, placed, catalog_item, catalog_map, request.roomType):
                placed.append(result)
                occupied[slot] = item.catalogId
            else:
                msg = f"Dropped {item.catalogId}: no suitable surface found for stacking."
                warnings.append(msg)
        else:
            # Try wall nudge
            prefix = _wall_prefix(slot)
            nudged = False
            if prefix:
                for t_alt in _NUDGE_T:
                    res = _try_place(
                        item, slot, t_alt, room, catalog_item, placed, catalog_map, margin
                    )
                    if isinstance(res, ResolvedItem) and _apply_vertical_stack(
                        res, placed, catalog_item, catalog_map, request.roomType
                    ):
                        placed.append(res)
                        nudged = True
                        break
            if not nudged:
                reason = result if isinstance(result, str) else "UNKNOWN_COLLISION"
                warnings.append(m["collision"].format(id=item.catalogId, reason=reason, slot=slot))
    # Step 7: Final mandatory item check (Office Chair in Home Office)
    if request.roomType == "home_office":
        has_desk = any("desk" in catalog_map[p.catalogId].tags for p in placed)
        # office_chair item only has tags ["chair", "seating"] — match by catalogId
        has_chair = any(
            p.catalogId == "office_chair" or "office_chair" in catalog_map[p.catalogId].tags
            for p in placed
        )

        if has_desk and not has_chair:
            # Force-inject an office chair if missing
            office_chairs = [
                c for c in catalog if c.id == "office_chair" or "office_chair" in c.tags
            ]
            if office_chairs:
                chair_cat = office_chairs[0]
                # Create a mock LLM item for the chair
                mock_item = LayoutItemLLM(
                    catalogId=chair_cat.id,
                    slot="desk_chair",
                    facing="auto",
                    zone="work_zone",
                    rationale=(
                        "Mandatory office chair for desk."
                        if lang == "en"
                        else "Silla de despacho obligatoria para el escritorio."
                    ),
                )
                # Try to place it
                result = _try_place(
                    mock_item, "desk_chair", None, room, chair_cat, placed, catalog_map, margin
                )
                if isinstance(result, ResolvedItem):
                    placed.append(result)
                else:
                    warnings.append(f"Could not place mandatory office chair: {result}")

    # Step 8: Ensure Laptop is on Desk if both exist
    desks = [p for p in placed if "desk" in catalog_map[p.catalogId].tags]
    if desks:
        desk = desks[0]
        for p in placed:
            if p.catalogId == "laptop" and p.slot != desk.slot:
                # Move laptop to the same slot as the desk
                p.slot = desk.slot
                # Position will be updated by _apply_vertical_stack in a previous step?
                # No, we need to re-run vertical stack or manually adjust.
                desk_h = catalog_map[desk.catalogId].footprint.h
                p.position = (desk.position[0], desk.position[1] + desk_h, desk.position[2])
                warnings.append(f"Moved laptop to desk at {desk.slot}")

        # Step 8b: Remove any plant that ended up ON the desk (same position, elevated)
        desk_x, desk_y, desk_z = desk.position
        desk_h = catalog_map[desk.catalogId].footprint.h
        to_remove: list[ResolvedItem] = []
        for p in placed:
            p_cat = catalog_map.get(p.catalogId)
            if not p_cat:
                continue
            is_plant_item = "plant" in p_cat.tags or p.catalogId in {
                "small_plant", "plant_small_2", "plant_small_3",
            }
            if is_plant_item and request.roomType == "home_office":
                px, py, pz = p.position
                # Check if plant is elevated (on a surface) and near the desk
                if py > 0.1 and abs(px - desk_x) < 0.8 and abs(pz - desk_z) < 0.8:
                    to_remove.append(p)
                    warnings.append(
                        f"Removed {p.catalogId} from desk surface to avoid clutter."
                    )
        for item in to_remove:
            placed.remove(item)

    # Step 9: Ensure 4 Dining Chairs in Dining Room if table exists
    if request.roomType == "dining_room":
        tables = [
            p
            for p in placed
            if "dining" in catalog_map[p.catalogId].tags
            and "surface" in catalog_map[p.catalogId].tags
        ]
        if tables:
            table = tables[0]
            table_cat = catalog_map[table.catalogId]
            # Use world-space table dimensions based on rotation
            is_rotated = abs(math.cos(table.rotation_y)) < 0.707
            tw = table_cat.footprint.d if is_rotated else table_cat.footprint.w
            td = table_cat.footprint.w if is_rotated else table_cat.footprint.d
            
            chair_cat = next(
                (
                    c
                    for c in catalog
                    if "dining_chair" in c.id or ("dining" in c.tags and "chair" in c.tags)
                ),
                None,
            )
            if chair_cat:
                chw, chd = chair_cat.footprint.w, chair_cat.footprint.d
                # Offsets from table center to chair centers
                # We add 2cm clearance
                z_off = td / 2 + chd / 2 + 0.02
                x_off = tw / 2 + chd / 2 + 0.02 # chairs on E/W are rotated 90deg, so depth is on X
                
                # Positions and rotations for the 4 sides relative to table center
                side_configs = {
                    "dining_chair_N": ((0, 0, -z_off), 0.0),
                    "dining_chair_S": ((0, 0, z_off), math.pi),
                    "dining_chair_E": ((x_off, 0, 0), -math.pi / 2),
                    "dining_chair_W": ((-x_off, 0, 0), math.pi / 2),
                }

                for slot_name, (rel_pos, rot) in side_configs.items():
                    # Check if already placed in this slot
                    if not any(p.slot == slot_name for p in placed):
                        # World position = table center + relative position
                        wx = table.position[0] + rel_pos[0]
                        wz = table.position[2] + rel_pos[2]
                        
                        mock_chair = ResolvedItem(
                            catalogId=chair_cat.id,
                            slot=slot_name,
                            facing="center",
                            zone="dining_zone",
                            rationale=(
                                "Mandatory dining chair."
                                if lang == "en"
                                else "Silla de comedor obligatoria."
                            ),
                            position=(wx, 0.0, wz),
                            rotation_y=rot,
                            footprint={"w": chw, "d": chd, "h": chair_cat.footprint.h},
                            model=chair_cat.model,
                        )
                        
                        # Use a more lenient check for mandatory chairs — only check room bounds
                        hx, hz = _half_extents(mock_chair)
                        if (abs(wx) + hx <= room.width_m / 2 + 0.05) and (
                            abs(wz) + hz <= room.length_m / 2 + 0.05
                        ):
                            placed.append(mock_chair)

    # Step 10: Snap office chairs to face the desk's actual position
    if request.roomType == "home_office":
        desk_items = [
            p for p in placed
            if p.catalogId in catalog_map and "desk" in catalog_map[p.catalogId].tags
        ]
        chair_items = [
            p for p in placed
            if p.catalogId == "office_chair"
            or (
                p.slot == "desk_chair"
                and p.catalogId in catalog_map
                and (
                    "chair" in catalog_map[p.catalogId].tags
                    or "seating" in catalog_map[p.catalogId].tags
                )
            )
        ]
        if desk_items and chair_items:
            desk_p = desk_items[0]
            dx, dy, dz = desk_p.position
            desk_cat = catalog_map[desk_p.catalogId]
            desk_rot = desk_p.rotation_y
            # The desk faces inward; the chair sits on the user-facing side.
            # desk_rot=0 means desk faces +Z (south), chair should be south of desk
            # desk_rot=pi means desk faces -Z (north), chair should be north of desk
            # desk_rot=pi/2 means desk faces +X (east), chair should be east of desk
            # desk_rot=-pi/2 means desk faces -X (west), chair should be west of desk
            cos_r = math.cos(desk_rot)
            sin_r = math.sin(desk_rot)
            # offset = desk half-depth + chair half-depth + small gap
            for chair_p in chair_items:
                chair_cat = catalog_map.get(chair_p.catalogId)
                if not chair_cat:
                    continue
                offset = desk_cat.footprint.d / 2 + chair_cat.footprint.d / 2 + 0.05
                # Position chair in front of desk (the open/user side)
                # The desk's "front" is in the direction it faces (desk_rot)
                cx = dx + sin_r * offset
                cz = dz + cos_r * offset
                # Chair faces the desk = opposite direction
                chair_rot = desk_rot + math.pi
                chair_p.position = (cx, 0.0, cz)
                chair_p.rotation_y = chair_rot

    # Step 11: Handle rug stacking to prevent z-fighting
    rug_items = [
        p for p in placed
        if p.catalogId in catalog_map and "rug" in catalog_map[p.catalogId].tags
    ]
    if len(rug_items) > 1:
        # Sort rugs by footprint area (descending) so larger rugs stay at the bottom
        rug_items.sort(
            key=lambda r: (
                catalog_map[r.catalogId].footprint.w * catalog_map[r.catalogId].footprint.d
            ),
            reverse=True
        )
        
        for i, rug in enumerate(rug_items):
            if i == 0:
                continue
            
            # Check if this rug overlaps with any already processed (larger) rugs
            for j in range(i):
                other = rug_items[j]
                # Use a small margin to detect overlap even if they just touch
                if _aabb_overlap(
                    rug,
                    other,
                    catalog_map[rug.catalogId],
                    catalog_map[other.catalogId],
                    margin=0.0,
                    cooccupy_mode=True,
                ):
                    # Stack it slightly higher than the floor (2mm per layer)
                    # We use i to ensure each rug has a unique, deterministic height
                    new_y = 0.002 * i
                    rug.position = (rug.position[0], new_y, rug.position[2])
                    warnings.append(
                        f"Stacked rug {rug.catalogId} slightly higher to prevent z-fighting."
                    )
                    break

    return Layout(
        style=llm.style,
        palette=llm.palette,
        zones=list(llm.zones),
        items=placed,
        designExplanation=llm.designExplanation,
        seed=request.seed,
        warnings=warnings,
    )
