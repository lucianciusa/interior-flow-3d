import json
from functools import lru_cache
from pathlib import Path
from typing import cast

from app.models.catalog import RoomType
from app.models.room_type import RoomTypeProfile

_DATA_PATH = Path(__file__).parent.parent / "data" / "room_types.json"


@lru_cache(maxsize=1)
def _load_profiles() -> dict[RoomType, RoomTypeProfile]:
    raw: dict[str, object] = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    return {
        cast(RoomType, k): RoomTypeProfile.model_validate(v)
        for k, v in raw.items()
        if not k.startswith("_")
    }


def get_profile(room_type: RoomType) -> RoomTypeProfile:
    profiles = _load_profiles()
    if room_type not in profiles:
        raise KeyError(f"Unknown room type: {room_type!r}")
    return profiles[room_type]


def all_profiles() -> dict[RoomType, RoomTypeProfile]:
    return _load_profiles()
