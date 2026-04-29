from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.layout import Layout


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(min_length=1, max_length=80)
    default_style: str | None = None


class ProjectPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str | None = Field(default=None, min_length=1, max_length=80)
    default_style: str | None = None
    default_palette: dict[str, Any] | None = None


class ProjectRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    user_id: str
    name: str
    default_style: str | None = None
    default_palette: dict[str, Any] | None = None
    created_at: str


class ConversionRequest(BaseModel):
    """Anon → first-project conversion: create Project + Room + Layout in one call."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    projectName: str = Field(min_length=1, max_length=80)
    roomName: str = Field(min_length=1, max_length=80)
    width_m: float = Field(ge=2, le=12)
    length_m: float = Field(ge=2, le=12)
    height_m: float = Field(ge=2.2, le=4)
    layout: Layout


class ConversionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    room_id: str
    layout_id: str
