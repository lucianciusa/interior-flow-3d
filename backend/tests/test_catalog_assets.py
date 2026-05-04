"""Catalog asset URL hygiene: every model is either primitive: or a content-hashed
CDN URL."""

import re

from app.routers.catalog import _load_catalog

_PRIM = re.compile(r"^primitive:[a-zA-Z0-9_]+$")
_CDN = re.compile(r"^https://[a-z0-9.\-]+/catalog/[a-f0-9]{64}\.glb$")


def test_every_model_url_is_primitive_or_cdn() -> None:
    bad: list[str] = []
    for item in _load_catalog().items:
        if _PRIM.match(item.model):
            continue
        if _CDN.match(item.model):
            continue
        bad.append(f"{item.id}: {item.model}")
    assert not bad, f"non-conforming model URLs: {bad}"
