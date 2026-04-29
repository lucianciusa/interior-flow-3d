import respx
from fastapi.testclient import TestClient
from httpx import Response

from app.config import Settings


def _layout_with_sofa() -> dict[str, object]:
    return {
        "id": "layout-1",
        "user_id": "user-a",
        "room_id": "room-1",
        "name": "v1",
        "is_primary": True,
        "style": "minimal",
        "seed": 1,
        "thumbnail_url": None,
        "created_at": "2026-04-28T00:00:00+00:00",
        "layout": {
            "style": "minimal",
            "palette": {
                "wall": {"name": "White", "hex": "#FAFAFA"},
                "floor": {"name": "Grey", "hex": "#E5E5E5"},
                "accent": {"name": "Charcoal", "hex": "#1A1A1A"},
            },
            "items": [
                {
                    "catalogId": "sofa_3seat",
                    "slot": "south_wall_center",
                    "facing": "auto",
                    "rationale": "anchor",
                    "position": [0.0, 0.425, 2.5],
                    "rotation_y": 3.14159,
                    "footprint": {"w": 2.1, "d": 0.95, "h": 0.85},
                    "model": "primitive:sofa_3seat",
                }
            ],
            "designExplanation": "x" * 90,
            "seed": 1,
            "warnings": [],
        },
        "rooms": {"width_m": 5.0, "length_m": 6.0, "height_m": 2.6},
    }


def test_swap_replacement_not_in_catalog_returns_422(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    r = client.post(
        "/layouts/layout-1/swap",
        json={"catalogId": "sofa_3seat", "replacementId": "does_not_exist"},
        headers=auth_headers_user_a,
    )
    assert r.status_code == 422


def test_swap_item_not_in_layout_returns_404(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/layouts").mock(return_value=Response(200, json=[_layout_with_sofa()]))
        r = client.post(
            "/layouts/layout-1/swap",
            json={"catalogId": "armchair", "replacementId": "tv_stand"},
            headers=auth_headers_user_a,
        )
    assert r.status_code == 404


def test_swap_slot_kind_mismatch_returns_409(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    """Sofa is on a wall slot; coffee_table only accepts floor slots."""
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/layouts").mock(return_value=Response(200, json=[_layout_with_sofa()]))
        r = client.post(
            "/layouts/layout-1/swap",
            json={"catalogId": "sofa_3seat", "replacementId": "coffee_table"},
            headers=auth_headers_user_a,
        )
    assert r.status_code == 409


def test_swap_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    """Swap sofa for tv_stand — both wall-allowed."""
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/layouts").mock(return_value=Response(200, json=[_layout_with_sofa()]))
        updated = _layout_with_sofa()
        updated["layout"]["items"][0]["catalogId"] = "tv_stand"  # type: ignore[index]
        mock.patch("/rest/v1/layouts").mock(return_value=Response(200, json=[updated]))
        r = client.post(
            "/layouts/layout-1/swap",
            json={"catalogId": "sofa_3seat", "replacementId": "tv_stand"},
            headers=auth_headers_user_a,
        )
    assert r.status_code == 200
    assert r.json()["layout"]["items"][0]["catalogId"] == "tv_stand"
