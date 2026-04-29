import respx
from fastapi.testclient import TestClient
from httpx import Response

from app.config import Settings


def _layout_full_row(
    layout_id: str = "layout-1",
    name: str = "v1",
    is_primary: bool = False,
) -> dict[str, object]:
    return {
        "id": layout_id,
        "user_id": "user-a",
        "room_id": "room-1",
        "name": name,
        "is_primary": is_primary,
        "style": "minimal",
        "seed": 42,
        "thumbnail_url": None,
        "created_at": "2026-04-28T00:00:00+00:00",
        "layout": {
            "style": "minimal",
            "palette": {
                "wall": {"name": "White", "hex": "#FAFAFA"},
                "floor": {"name": "Grey", "hex": "#E5E5E5"},
                "accent": {"name": "Charcoal", "hex": "#1A1A1A"},
            },
            "items": [],
            "designExplanation": "x" * 90,
            "seed": 42,
            "warnings": [],
        },
        "rooms": {"width_m": 5.0, "length_m": 6.0, "height_m": 2.6, "room_type": "living_room"},
    }


def test_patch_layout_rename(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    updated = _layout_full_row(name="renamed")
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.patch("/rest/v1/layouts").mock(return_value=Response(200, json=[updated]))
        r = client.patch("/layouts/layout-1", json={"name": "renamed"}, headers=auth_headers_user_a)
    assert r.status_code == 200
    assert r.json()["name"] == "renamed"


def test_patch_layout_set_primary_clears_others(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    """Setting is_primary=true must call unset_other_primaries before the update."""
    updated = _layout_full_row(is_primary=True)
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        get_route = mock.get("/rest/v1/layouts").mock(
            return_value=Response(200, json=[_layout_full_row()])
        )
        patch_route = mock.patch("/rest/v1/layouts").mock(
            return_value=Response(200, json=[updated])
        )
        r = client.patch(
            "/layouts/layout-1",
            json={"is_primary": True},
            headers=auth_headers_user_a,
        )
    assert r.status_code == 200
    assert r.json()["is_primary"] is True
    assert get_route.called
    # Two PATCH calls expected: unset_other_primaries + update_layout.
    assert patch_route.call_count == 2


def test_duplicate_creates_sibling(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/layouts").mock(
            return_value=Response(200, json=[_layout_full_row(name="Original")])
        )
        mock.post("/rest/v1/layouts").mock(return_value=Response(201, json=[{"id": "layout-2"}]))
        r = client.post("/layouts/layout-1/duplicate", headers=auth_headers_user_a)
    assert r.status_code == 201
    assert r.json()["id"] == "layout-2"


def test_patch_layout_no_fields_returns_422(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    r = client.patch("/layouts/layout-1", json={}, headers=auth_headers_user_a)
    assert r.status_code == 422


def test_create_layout_with_primary_unsets_others(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    layout = {
        "style": "minimal",
        "palette": {
            "wall": {"name": "White", "hex": "#FAFAFA"},
            "floor": {"name": "Grey", "hex": "#E5E5E5"},
            "accent": {"name": "Charcoal", "hex": "#1A1A1A"},
        },
        "items": [],
        "designExplanation": "x" * 90,
        "seed": 1,
        "warnings": [],
    }
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        patch_route = mock.patch("/rest/v1/layouts").mock(return_value=Response(200, json=[]))
        mock.post("/rest/v1/layouts").mock(return_value=Response(201, json=[{"id": "layout-x"}]))
        r = client.post(
            "/layouts",
            json={"roomId": "room-1", "is_primary": True, "layout": layout},
            headers=auth_headers_user_a,
        )
    assert r.status_code == 201
    assert patch_route.called
