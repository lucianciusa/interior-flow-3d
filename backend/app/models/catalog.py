from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RoomType = Literal["living_room", "bedroom", "dining_room", "home_office"]
Surface = Literal["wall", "corner", "floor"]
Against = Literal["wall", "none"]


class Footprint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    w: float
    d: float
    h: float


class Clearance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    front: float
    sides: float
    back: float


class PlacementSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    surfaces: list[Surface] = Field(min_length=1)
    against: list[Against] = Field(default_factory=list)
    exclusive_with: list[str] = Field(default_factory=list)


class CatalogItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    tags: list[str] = Field(min_length=1)
    room_types: list[RoomType] = Field(min_length=1)
    placement: PlacementSpec
    footprint: Footprint
    clearance: Clearance
    model: str
    is_premium: bool = False


class CatalogResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[CatalogItem]
