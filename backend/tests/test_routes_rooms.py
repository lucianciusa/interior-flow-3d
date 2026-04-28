import respx
from fastapi.testclient import TestClient
from httpx import Response

from app.config import Settings

VALID_ROOM = {
    "name": "My Living Room",
    "roomType": "living_room",
    "width_m": 5.0,
    "length_m": 6.0,
    "height_m": 2.6,
}


def test_create_room_missing_token_returns_401(
    client: TestClient, supabase_settings: Settings
) -> None:
    r = client.post("/rooms", json=VALID_ROOM)
    assert r.status_code == 401


def test_create_room_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    inserted = {
        "id": "room-1",
        "name": VALID_ROOM["name"],
        "room_type": "living_room",
        "width_m": 5.0,
        "length_m": 6.0,
        "height_m": 2.6,
        "created_at": "2026-04-28T00:00:00+00:00",
    }
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.post("/rest/v1/rooms").mock(return_value=Response(201, json=[inserted]))
        r = client.post("/rooms", json=VALID_ROOM, headers=auth_headers_user_a)
    assert r.status_code == 201
    assert r.json()["id"] == "room-1"
    assert r.json()["room_type"] == "living_room"


def test_create_room_validation_error_returns_422(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    bad = {
        "name": "x",
        "roomType": "living_room",
        "width_m": 1.0,
        "length_m": 6.0,
        "height_m": 2.6,
    }
    r = client.post("/rooms", json=bad, headers=auth_headers_user_a)
    assert r.status_code == 422


def test_list_rooms_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    rows = [
        {
            "id": "room-1",
            "name": "Living",
            "room_type": "living_room",
            "width_m": 5.0,
            "length_m": 6.0,
            "height_m": 2.6,
            "created_at": "2026-04-28T00:00:00+00:00",
        }
    ]
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/rooms").mock(return_value=Response(200, json=rows))
        r = client.get("/rooms", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == "room-1"


def test_list_rooms_missing_token_returns_401(
    client: TestClient, supabase_settings: Settings
) -> None:
    r = client.get("/rooms")
    assert r.status_code == 401
