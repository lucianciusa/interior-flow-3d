from app.models.catalog import RoomType
from pydantic import BaseModel, ConfigDict, Field


class RoomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(min_length=1, max_length=80)
    roomType: RoomType
    width_m: float = Field(ge=2, le=12)
    length_m: float = Field(ge=2, le=12)
    height_m: float = Field(ge=2.2, le=4)
    thumbnail_url: str | None = None


class RoomPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str | None = Field(default=None, min_length=1, max_length=80)
    width_m: float | None = Field(default=None, ge=2, le=12)
    length_m: float | None = Field(default=None, ge=2, le=12)
    height_m: float | None = Field(default=None, ge=2.2, le=4)
    thumbnail_url: str | None = None


class RoomRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    user_id: str
    project_id: str
    name: str
    room_type: str
    width_m: float
    length_m: float
    height_m: float
    thumbnail_url: str | None = None
    created_at: str
