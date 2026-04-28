import respx
from fastapi.testclient import TestClient
from httpx import Response

from app.config import Settings

VALID_LAYOUT = {
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
            "rationale": "I anchored the sofa.",
            "position": [0.0, 0.0, 2.5],
            "rotation_y": 0.0,
            "footprint": {"w": 2.1, "d": 0.95, "h": 0.85},
            "model": "/models/sofa_3seat.glb",
        }
    ],
    "designExplanation": (
        "I designed this minimal room with restraint and purpose,"
        " three pieces, each earning its place in the space."
    ),
    "seed": 42,
    "warnings": [],
}


def _layout_row(layout_id: str = "layout-1") -> dict:
    return {
        "id": layout_id,
        "room_id": "room-1",
        "style": "minimal",
        "seed": 42,
        "thumbnail_url": None,
        "created_at": "2026-04-28T00:00:00+00:00",
        "layout": VALID_LAYOUT,
        "rooms": {"width_m": 5.0, "length_m": 6.0, "height_m": 2.6},
    }


def test_create_layout_missing_token_returns_401(
    client: TestClient, supabase_settings: Settings
) -> None:
    r = client.post("/layouts", json={"roomId": "room-1", "layout": VALID_LAYOUT})
    assert r.status_code == 401


def test_create_layout_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.post("/rest/v1/layouts").mock(return_value=Response(201, json=[{"id": "layout-1"}]))
        r = client.post(
            "/layouts",
            json={"roomId": "room-1", "layout": VALID_LAYOUT},
            headers=auth_headers_user_a,
        )
    assert r.status_code == 201
    assert r.json() == {"id": "layout-1"}


def test_list_layouts_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    summaries = [
        {
            "id": "layout-1",
            "room_id": "room-1",
            "style": "minimal",
            "seed": 42,
            "thumbnail_url": None,
            "created_at": "2026-04-28T00:00:00+00:00",
        }
    ]
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/layouts").mock(return_value=Response(200, json=summaries))
        r = client.get("/layouts", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert "layout" not in r.json()[0]


def test_get_layout_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/layouts").mock(return_value=Response(200, json=[_layout_row()]))
        r = client.get("/layouts/layout-1", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert r.json()["id"] == "layout-1"
    assert r.json()["layout"]["style"] == "minimal"


def test_get_layout_not_found_returns_404(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/layouts").mock(return_value=Response(200, json=[]))
        r = client.get("/layouts/missing", headers=auth_headers_user_a)
    assert r.status_code == 404


def test_delete_layout_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.delete("/rest/v1/layouts").mock(return_value=Response(200, json=[{"id": "layout-1"}]))
        r = client.delete("/layouts/layout-1", headers=auth_headers_user_a)
    assert r.status_code == 204


def test_delete_layout_not_found_returns_404(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.delete("/rest/v1/layouts").mock(return_value=Response(200, json=[]))
        r = client.delete("/layouts/missing", headers=auth_headers_user_a)
    assert r.status_code == 404


def test_create_layout_validation_error_returns_422(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    r = client.post(
        "/layouts",
        json={"roomId": "room-1"},
        headers=auth_headers_user_a,
    )
    assert r.status_code == 422
