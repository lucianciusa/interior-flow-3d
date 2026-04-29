from app.models.catalog import CatalogItem
from app.routers.catalog import _load_catalog
from app.services.catalog_filter import MAX_CANDIDATES, filter_catalog


def _all() -> list[CatalogItem]:
    return _load_catalog().items


def test_filter_by_room_type_only_matching_returned() -> None:
    out = filter_catalog(_all(), "bedroom")
    assert out, "expected non-empty bedroom candidates"
    for item in out:
        assert "bedroom" in item.room_types


def test_filter_capped_at_max() -> None:
    out = filter_catalog(_all(), "living_room")
    assert len(out) <= MAX_CANDIDATES


def test_filter_deterministic_ordering() -> None:
    a = filter_catalog(_all(), "living_room")
    b = filter_catalog(_all(), "living_room")
    assert [i.id for i in a] == [i.id for i in b]
    assert [i.id for i in a] == sorted(i.id for i in a)


def test_filter_by_accepted_tags() -> None:
    out = filter_catalog(_all(), "living_room", accepted_tags=["seating"])
    assert out
    for item in out:
        assert set(item.tags) & {"seating"}


def test_filter_excludes_premium() -> None:
    full = filter_catalog(_all(), "living_room")
    no_prem = filter_catalog(_all(), "living_room", exclude_premium=True)
    assert all(not i.is_premium for i in no_prem)
    assert len(no_prem) <= len(full)
