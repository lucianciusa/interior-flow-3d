import json
from pathlib import Path

from fastapi import APIRouter

from app.models.catalog import CatalogItem, CatalogResponse

router = APIRouter(prefix="/catalog", tags=["catalog"])


def _load_catalog() -> CatalogResponse:
    path = Path(__file__).parent.parent / "data" / "catalog.json"
    raw: list[dict[str, object]] = json.loads(path.read_text())
    return CatalogResponse(items=[CatalogItem.model_validate(i) for i in raw])


@router.get("", response_model=CatalogResponse, status_code=200)
async def get_catalog() -> CatalogResponse:
    return _load_catalog()
