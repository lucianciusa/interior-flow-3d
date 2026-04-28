from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Style = Literal["scandinavian", "minimal", "industrial"]
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
]
Facing = Literal["auto", "north", "south", "east", "west", "center"]


class GenerateLayoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    roomType: Literal["living_room"]
    width_m: float = Field(ge=2, le=12)
    length_m: float = Field(ge=2, le=12)
    height_m: float = Field(ge=2.2, le=4, default=2.6)
    style: Style
    preferences: list[Preference] = Field(default_factory=list, max_length=2)
    seed: int | None = None


class LayoutItemLLM(BaseModel):
    """What the LLM emits per item — no coordinates."""

    model_config = ConfigDict(extra="forbid")

    catalogId: str
    slot: SlotId
    facing: Facing
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


class LayoutLLM(BaseModel):
    """Raw LLM output, pre-resolution."""

    model_config = ConfigDict(extra="forbid")

    style: Style
    palette: PaletteMap
    items: list[LayoutItemLLM] = Field(min_length=3, max_length=10)
    designExplanation: str = Field(min_length=80, max_length=600)


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
    items: list[ResolvedItem]
    designExplanation: str
    seed: int | None = None
    warnings: list[str] = Field(default_factory=list)


class LayoutCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    roomId: str
    layout: Layout


class LayoutSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    user_id: str
    room_id: str
    style: Style
    seed: int | None = None
    thumbnail_url: str | None = None
    created_at: str


class RoomDims(BaseModel):
    model_config = ConfigDict(extra="forbid")

    width_m: float
    length_m: float
    height_m: float


class LayoutRecord(LayoutSummary):
    layout: Layout
    rooms: RoomDims
