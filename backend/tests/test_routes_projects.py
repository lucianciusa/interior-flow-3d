import respx
from fastapi.testclient import TestClient
from httpx import Response

from app.config import Settings


def _project_row(pid: str = "proj-1", name: str = "Apartment") -> dict[str, object]:
    return {
        "id": pid,
        "user_id": "user-1",
        "name": name,
        "default_style": None,
        "default_palette": None,
        "created_at": "2026-04-28T00:00:00+00:00",
    }


def test_create_project_missing_token_returns_401(
    client: TestClient, supabase_settings: Settings
) -> None:
    r = client.post("/projects", json={"name": "Apartment"})
    assert r.status_code == 401


def test_create_project_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.post("/rest/v1/projects").mock(return_value=Response(201, json=[_project_row()]))
        r = client.post("/projects", json={"name": "Apartment"}, headers=auth_headers_user_a)
    assert r.status_code == 201
    assert r.json()["id"] == "proj-1"


def test_create_project_validation_error_returns_422(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    r = client.post("/projects", json={"name": ""}, headers=auth_headers_user_a)
    assert r.status_code == 422


def test_list_projects_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/projects").mock(return_value=Response(200, json=[_project_row()]))
        r = client.get("/projects", headers=auth_headers_user_a)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_get_project_not_found_returns_404(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/projects").mock(return_value=Response(200, json=[]))
        r = client.get("/projects/missing", headers=auth_headers_user_a)
    assert r.status_code == 404


def test_patch_project_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    updated = {**_project_row(), "name": "Renamed"}
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.patch("/rest/v1/projects").mock(return_value=Response(200, json=[updated]))
        r = client.patch("/projects/proj-1", json={"name": "Renamed"}, headers=auth_headers_user_a)
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed"


def test_delete_project_happy_path(
    client: TestClient,
    supabase_settings: Settings,
    auth_headers_user_a: dict[str, str],
) -> None:
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.delete("/rest/v1/projects").mock(return_value=Response(200, json=[{"id": "proj-1"}]))
        r = client.delete("/projects/proj-1", headers=auth_headers_user_a)
    assert r.status_code == 204


def test_conversion_happy_path(
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
    body = {
        "projectName": "Apartment",
        "roomName": "Living",
        "width_m": 5.0,
        "length_m": 6.0,
        "height_m": 2.6,
        "layout": layout,
    }
    with respx.mock(base_url=supabase_settings.SUPABASE_URL) as mock:
        mock.get("/rest/v1/projects").mock(return_value=Response(200, json=[]))
        mock.post("/rest/v1/projects").mock(return_value=Response(201, json=[_project_row()]))
        mock.post("/rest/v1/rooms").mock(
            return_value=Response(
                201,
                json=[
                    {
                        "id": "room-1",
                        "user_id": "user-1",
                        "project_id": "proj-1",
                        "name": "Living",
                        "room_type": "living_room",
                        "width_m": 5.0,
                        "length_m": 6.0,
                        "height_m": 2.6,
                        "created_at": "2026-04-28T00:00:00+00:00",
                    }
                ],
            )
        )
        mock.post("/rest/v1/layouts").mock(return_value=Response(201, json=[{"id": "layout-1"}]))
        r = client.post("/projects/conversion", json=body, headers=auth_headers_user_a)
    assert r.status_code == 201
    j = r.json()
    assert j["project_id"] == "proj-1"
    assert j["room_id"] == "room-1"
    assert j["layout_id"] == "layout-1"
