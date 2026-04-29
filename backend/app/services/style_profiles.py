import json
from pathlib import Path

from app.models.style_profile import StyleProfile

_CACHE: dict[str, StyleProfile] | None = None


def _load_profiles() -> dict[str, StyleProfile]:
    global _CACHE
    if _CACHE is None:
        path = Path(__file__).parent.parent / "data" / "style_profiles.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        _CACHE = {p["id"]: StyleProfile.model_validate(p) for p in data}
    return _CACHE


def get_profile(style: str) -> StyleProfile:
    profiles = _load_profiles()
    if style not in profiles:
        raise KeyError(f"Unknown style profile: {style}")
    return profiles[style]
