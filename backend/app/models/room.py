from pydantic import BaseModel, ConfigDict

# Room models populated in Phase 3.


class RoomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Room(BaseModel):
    model_config = ConfigDict(extra="forbid")
