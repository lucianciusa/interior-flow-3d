from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.models.layout import GenerateLayoutRequest, Layout
from app.routers.catalog import _load_catalog
from app.services import llm, placement

router = APIRouter(prefix="/generate-layout", tags=["generate"])


@router.post("", response_model=Layout, status_code=status.HTTP_200_OK)
async def generate_layout(
    body: GenerateLayoutRequest,
    settings: Settings = Depends(get_settings),
) -> Layout:
    catalog_items = _load_catalog().items
    try:
        raw = await llm.generate(body, settings, catalog_items)
    except llm.LLMValidationError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
    except llm.LLMUpstreamError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    return placement.resolve(raw, body, catalog_items)
