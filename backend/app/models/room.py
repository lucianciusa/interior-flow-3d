from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RoomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(min_length=1, max_length=80)
    roomType: Literal["living_room"]
    width_m: float = Field(ge=2, le=12)
    length_m: float = Field(ge=2, le=12)
    height_m: float = Field(ge=2.2, le=4)


class RoomRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    user_id: str
    name: str
    room_type: str
    width_m: float
    length_m: float
    height_m: float
    created_at: str
