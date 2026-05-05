"""Item swap endpoint.

Phase 6: tag-based catalog. Replacement is accepted iff some room-type profile
declares the target slot AND the replacement's tags intersect that slot's
accepted tags.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.deps import AuthUser, require_user
from app.models.catalog import CatalogItem
from app.models.layout import Layout, LayoutRecord, ResolvedItem, SwapRequest
from app.routers.catalog import _load_catalog
from app.services import placement
from app.services.room_types import all_profiles
from app.services.slot_resolver import Footprint, RoomDims, resolve_slot
from app.services.supabase import SupabaseError, SupabaseNotFound, SupabaseRest

router = APIRouter(prefix="/layouts", tags=["swap"])


def _build_resolved(
    target: ResolvedItem, replacement: CatalogItem, dims: dict[str, float]
) -> ResolvedItem:
    fp = Footprint(
        w=replacement.footprint.w,
        d=replacement.footprint.d,
        h=replacement.footprint.h,
        tags=replacement.tags,
        surfaces=list(replacement.placement.surfaces),
    )
    transform = resolve_slot(
        target.slot,
        RoomDims(
            width_m=dims["width_m"],
            length_m=dims["length_m"],
            height_m=dims["height_m"],
        ),
        fp,
        target.facing,
    )
    return ResolvedItem(
        catalogId=replacement.id,
        slot=target.slot,
        facing=target.facing,
        zone=target.zone,
        rationale=target.rationale,
        position=transform.position,
        rotation_y=transform.rotation_y,
        footprint={"w": fp.w, "d": fp.d, "h": fp.h},
        model=replacement.model,
    )


@router.post("/{layout_id}/swap", response_model=LayoutRecord)
async def swap_item(
    layout_id: str,
    body: SwapRequest,
    user: AuthUser = Depends(require_user),
    settings: Settings = Depends(get_settings),
) -> LayoutRecord:
    catalog = {item.id: item for item in _load_catalog().items}
    replacement = catalog.get(body.replacementId)
    if replacement is None:
        raise HTTPException(status_code=422, detail="replacement not in catalog")

    try:
        async with SupabaseRest(settings, user.jwt) as sb:
            row = await sb.get_layout(layout_id)
            current = Layout.model_validate(row["layout"])
            target_idx = next(
                (i for i, it in enumerate(current.items) if it.catalogId == body.catalogId),
                None,
            )
            if target_idx is None:
                raise HTTPException(status_code=404, detail="item not in layout")

            target = current.items[target_idx]
            slot_kind = placement.SLOT_KINDS.get(target.slot)
            if slot_kind is None:
                raise HTTPException(status_code=409, detail="slot_kind_mismatch")
            tags = set(replacement.tags)
            compatible = False
            for profile in all_profiles().values():
                if target.slot not in profile.slot_instances:
                    continue
                accepted = set(profile.slot_accepted_tags.get(target.slot, []))
                if tags & accepted:
                    compatible = True
                    break
            if not compatible:
                raise HTTPException(status_code=409, detail="slot_kind_mismatch")

            new_item = _build_resolved(target, replacement, row["rooms"])

            others = [it for i, it in enumerate(current.items) if i != target_idx]
            for existing in others:
                pair = frozenset({new_item.catalogId, existing.catalogId})
                if pair in placement.COOCCUPY_ALLOW and new_item.slot == existing.slot:
                    continue
                existing_cat = catalog.get(existing.catalogId)
                if existing_cat and placement._aabb_overlap(
                    new_item, existing, replacement, existing_cat
                ):
                    raise HTTPException(status_code=409, detail="swap_collides")

            new_items = list(current.items)
            new_items[target_idx] = new_item
            updated = current.model_copy(update={"items": new_items})

            updated_row = await sb.update_layout(
                layout_id,
                {
                    "layout": updated.model_dump(),
                    "style": updated.style,
                },
            )
    except SupabaseNotFound as e:
        raise HTTPException(status_code=404, detail="layout not found") from e
    except SupabaseError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    return LayoutRecord.model_validate(updated_row)
