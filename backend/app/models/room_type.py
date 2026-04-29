from pydantic import BaseModel, ConfigDict, Field

from app.models.catalog import RoomType

__all__ = ["RoomType", "RoomTypeProfile", "DimBounds"]


class DimBounds(BaseModel):
    model_config = ConfigDict(extra="forbid")

    width_m: tuple[float, float]
    length_m: tuple[float, float]
    height_m: tuple[float, float]


class RoomTypeProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slot_kinds: list[str] = Field(min_length=1)
    slot_instances: list[str] = Field(min_length=1)
    slot_accepted_tags: dict[str, list[str]]
    allowed_zones: list[str] = Field(min_length=1)
    default_zone: str
    dim_bounds: DimBounds
