from pydantic import BaseModel, ConfigDict


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


class CatalogItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    footprint: Footprint
    clearance: Clearance
    allowedSlotKinds: list[str]
    model: str


class CatalogResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[CatalogItem]
