from pydantic import BaseModel, ConfigDict, Field

from app.models.layout import Style


class StyleProfile(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: Style
    density: float = Field(ge=0.0, le=1.0)
    symmetry_bias: float = Field(ge=0.0, le=1.0)
    min_clear_floor_pct: float = Field(ge=0.0, le=1.0)
    allowed_zone_count: int = Field(ge=1, le=4)
    wall_flush_tolerance: float = Field(ge=0.0)
    palette_hints: list[str]
