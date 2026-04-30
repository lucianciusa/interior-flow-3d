import json
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict


class TemplateDims(BaseModel):
    model_config = ConfigDict(extra="forbid")

    width_m: float
    length_m: float
    height_m: float


class Template(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    room_type: str
    style: str
    dims: TemplateDims
    thumbnail_url: str | None = None


class TemplatesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[Template]


router = APIRouter(prefix="/templates", tags=["templates"])


def _load_templates() -> TemplatesResponse:
    path = Path(__file__).parent.parent / "data" / "templates.json"
    raw: list[dict[str, object]] = json.loads(path.read_text())
    return TemplatesResponse(items=[Template.model_validate(t) for t in raw])


@router.get("", response_model=TemplatesResponse, status_code=200)
async def get_templates() -> TemplatesResponse:
    return _load_templates()
