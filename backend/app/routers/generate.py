from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.models.layout import GenerateLayoutRequest, Layout
from app.routers.catalog import _load_catalog
from app.services import llm, placement, room_types, style_profiles, zones

router = APIRouter(prefix="/generate-layout", tags=["generate"])


@router.post("", response_model=Layout, status_code=status.HTTP_200_OK)
async def generate_layout(
    body: GenerateLayoutRequest,
    settings: Settings = Depends(get_settings),
) -> Layout:
    catalog_items = _load_catalog().items
    try:
        profile = room_types.get_profile(body.roomType)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e

    bounds = profile.dim_bounds
    if not (bounds.width_m[0] <= body.width_m <= bounds.width_m[1]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"width_m out of range for {body.roomType}: {bounds.width_m}",
        )
    if not (bounds.length_m[0] <= body.length_m <= bounds.length_m[1]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"length_m out of range for {body.roomType}: {bounds.length_m}",
        )
    if not (bounds.height_m[0] <= body.height_m <= bounds.height_m[1]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"height_m out of range for {body.roomType}: {bounds.height_m}",
        )

    try:
        style_prof = style_profiles.get_profile(body.style)
    except KeyError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    try:
        raw = await llm.generate(body, settings, catalog_items, profile, style_prof)
    except llm.LLMValidationError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    except llm.LLMUpstreamError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e

    layout = placement.resolve(raw, body, catalog_items, profile, style_prof)
    layout = zones.stamp_default_zone(layout, profile)
    return layout.model_copy(update={"catalogVersion": settings.CATALOG_VERSION or "v1.phase6"})
