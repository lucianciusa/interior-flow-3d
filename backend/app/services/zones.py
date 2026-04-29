from app.models.layout import Layout, ResolvedItem, Zone
from app.models.room_type import RoomTypeProfile


def stamp_default_zone(layout: Layout, profile: RoomTypeProfile) -> Layout:
    """Single-pass mode: stamp profile.default_zone on every item lacking a zone,
    and synthesise a single Zone entry if layout.zones is empty.
    Pure — returns a new Layout."""
    default = profile.default_zone
    new_items: list[ResolvedItem] = []
    for item in layout.items:
        if item.zone is None:
            new_items.append(item.model_copy(update={"zone": default}))
        else:
            new_items.append(item)

    new_zones = layout.zones
    if not new_zones:
        budget = max(1, min(6, len(new_items)))
        new_zones = [Zone(id=default, kind=default, itemBudget=budget)]

    return layout.model_copy(update={"items": new_items, "zones": new_zones})
