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


def _room_row(room_id: str = "room-1") -> dict[str, object]:
    return {
        "id": room_id,
        "user_id": "user-1",
        "project_id": "proj-1",
        "name": "Living",
        "room_type": "living_room",
        "width_m": 5.0,
        "length_m": 6.0,
        "height_m": 2.6,
        "created_at": "2026-04-28T00:00:00+00:00",
    }


def test_create_room_missing_token_returns_401(
    client: TestClient, supabase_settings: Settings
) -> None:
    r = client.post("/projects/proj-1/rooms", json=VALID_ROOM)
    assert r.status_code == 401


def test_create_room_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.post("/rest/v1/rooms").mock(return_value=Response(201, json=[_room_row()]))
        r = client.post("/projects/proj-1/rooms", json=VALID_ROOM, headers=auth_headers_user_a)
    assert r.status_code == 201
    assert r.json()["id"] == "room-1"
    assert r.json()["project_id"] == "proj-1"


def test_create_room_validation_error_returns_422(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    bad = {**VALID_ROOM, "width_m": 1.0}
    r = client.post("/projects/proj-1/rooms", json=bad, headers=auth_headers_user_a)
    assert r.status_code == 422


def test_list_rooms_for_project_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/rooms").mock(return_value=Response(200, json=[_room_row()]))
        r = client.get("/projects/proj-1/rooms", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_patch_room_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    updated = {**_room_row(), "name": "Renamed"}
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.patch("/rest/v1/rooms").mock(return_value=Response(200, json=[updated]))
        r = client.patch(
            "/rooms/room-1",
            json={"name": "Renamed"},
            headers=auth_headers_user_a,
        )
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed"


def test_patch_room_no_fields_returns_422(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    r = client.patch("/rooms/room-1", json={}, headers=auth_headers_user_a)
    assert r.status_code == 422


def test_delete_room_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.delete("/rest/v1/rooms").mock(return_value=Response(200, json=[{"id": "room-1"}]))
        r = client.delete("/rooms/room-1", headers=auth_headers_user_a)
    assert r.status_code == 204


def test_delete_room_not_found_returns_404(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.delete("/rest/v1/rooms").mock(return_value=Response(200, json=[]))
        r = client.delete("/rooms/missing", headers=auth_headers_user_a)
    assert r.status_code == 404
