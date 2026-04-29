from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.catalog import RoomType

Style = Literal["scandinavian", "minimal", "industrial", "japandi", "mid_century"]
Preference = Literal["more_seating", "more_open_space", "more_storage"]
SlotId = Literal[
    "north_wall_left",
    "north_wall_center",
    "north_wall_right",
    "east_wall_left",
    "east_wall_center",
    "east_wall_right",
    "south_wall_left",
    "south_wall_center",
    "south_wall_right",
    "west_wall_left",
    "west_wall_center",
    "west_wall_right",
    "corner_NE",
    "corner_NW",
    "corner_SE",
    "corner_SW",
    "center",
    "center_front",
    "entry",
    "bed_center",
    "table_center",
    "desk_anchor",
]
Facing = Literal["auto", "north", "south", "east", "west", "center"]


class GenerateLayoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    roomType: RoomType
    width_m: float = Field(ge=2, le=12)
    length_m: float = Field(ge=2, le=12)
    height_m: float = Field(ge=2.2, le=4, default=2.6)
    style: Style
    preferences: list[Preference] = Field(default_factory=list, max_length=2)
    seed: int | None = None


class Zone(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    kind: str
    itemBudget: int = Field(ge=1, le=6)


class LayoutItemLLM(BaseModel):
    """What the LLM emits per item — no coordinates."""

    model_config = ConfigDict(extra="forbid")

    catalogId: str
    slot: SlotId
    facing: Facing
    zone: str | None = None
    rationale: str = Field(max_length=140)


class Palette(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    hex: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class PaletteMap(BaseModel):
    model_config = ConfigDict(extra="forbid")

    wall: Palette
    floor: Palette
    accent: Palette


class Pass1LLM(BaseModel):
    model_config = ConfigDict(extra="forbid")

    style: Style
    palette: PaletteMap
    zones: list[Zone] = Field(default_factory=list, max_length=4)
    styleEmphasis: str = Field(min_length=10, max_length=140)
    designExplanation: str = Field(min_length=80, max_length=600)


class Pass2ZoneLLM(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[LayoutItemLLM] = Field(min_length=1, max_length=10)


class MergedLayoutLLM(BaseModel):
    """Synthetic object assembling Pass 1 and Pass 2 results for placement.py."""

    model_config = ConfigDict(extra="forbid")

    style: Style
    palette: PaletteMap
    zones: list[Zone]
    items: list[LayoutItemLLM]
    designExplanation: str


class ResolvedItem(LayoutItemLLM):
    """LayoutItemLLM enriched server-side after slot resolution."""

    position: tuple[float, float, float]
    rotation_y: float
    footprint: dict[Literal["w", "d", "h"], float]
    model: str


class Layout(BaseModel):
    """Final wire response from /generate-layout."""

    model_config = ConfigDict(extra="forbid")

    style: Style
    palette: PaletteMap
    zones: list[Zone] = Field(default_factory=list, max_length=4)
    items: list[ResolvedItem]
    designExplanation: str
    seed: int | None = None
    warnings: list[str] = Field(default_factory=list)
    catalogVersion: str | None = None


class LayoutCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    roomId: str
    name: str | None = Field(default=None, min_length=1, max_length=80)
    is_primary: bool = False
    layout: Layout


class LayoutPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str | None = Field(default=None, min_length=1, max_length=80)
    is_primary: bool | None = None


class LayoutSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    user_id: str
    room_id: str
    name: str = "Untitled"
    is_primary: bool = False
    style: Style
    seed: int | None = None
    thumbnail_url: str | None = None
    created_at: str


class RoomDims(BaseModel):
    model_config = ConfigDict(extra="forbid")

    width_m: float
    length_m: float
    height_m: float
    room_type: str


class LayoutRecord(LayoutSummary):
    layout: Layout
    rooms: RoomDims


class SwapRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    catalogId: str
    replacementId: str
