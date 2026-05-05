from app.models.catalog import CatalogItem, RoomType

MAX_CANDIDATES = 150


def filter_catalog(
    catalog: list[CatalogItem],
    room_type: RoomType,
    accepted_tags: list[str] | None = None,
    exclude_premium: bool = False,
) -> list[CatalogItem]:
    """Pure tag + room-type filter. Deterministic. Returns ≤ MAX_CANDIDATES items."""
    out: list[CatalogItem] = []
    for item in catalog:
        if room_type not in item.room_types:
            continue
        if exclude_premium and item.is_premium:
            continue
        if accepted_tags is not None and not (set(item.tags) & set(accepted_tags)):
            continue
        # Exclude items with 'primitive:' models as they lack high-quality renders
        if item.model.startswith("primitive:"):
            continue
        out.append(item)
    out.sort(key=lambda i: i.id)
    return out[:MAX_CANDIDATES]
